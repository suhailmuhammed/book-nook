import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { BookRequest, BookRequestWithDetails, RequestStatus } from '@/lib/database.types'

// Fetch all active requests for a specific book (ordered by queue_position)
export function useBookWaitingList(bookId: string | undefined) {
  return useQuery({
    queryKey: ['book-waiting-list', bookId],
    enabled: !!bookId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('book_requests')
        .select(`*, employee:employees(id, full_name, department, employee_code)`)
        .eq('book_id', bookId)
        .in('status', ['Waiting', 'Ready for Pickup'])
        .order('queue_position', { ascending: true })

      if (error) throw error
      return (data ?? []) as unknown as BookRequestWithDetails[]
    },
  })
}

// Fetch all requests for an employee (for the Employee Portal)
export function useEmployeeRequests(employeeId: string | undefined) {
  return useQuery({
    queryKey: ['employee-requests', employeeId],
    enabled: !!employeeId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('book_requests')
        .select(`*, book:books(id, book_code, title, cover_image_url, status, condition)`)
        .eq('employee_id', employeeId)
        .order('created_at', { ascending: false })

      if (error) throw error
      return (data ?? []) as unknown as BookRequestWithDetails[]
    },
  })
}

// Fetch all requests across all books (for Admin Book Requests tab)
export function useAllRequests(filterStatus: string = 'all') {
  return useQuery({
    queryKey: ['all-book-requests', filterStatus],
    queryFn: async () => {
      let query = supabase
        .from('book_requests')
        .select(`*, book:books(id, book_code, title, cover_image_url, status, condition), employee:employees(id, full_name, department, employee_code)`)
        .order('created_at', { ascending: false })

      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus)
      }

      const { data, error } = await query
      if (error) throw error
      return (data ?? []) as unknown as BookRequestWithDetails[]
    },
  })
}

// Fetch requests grouped by books that have active waiting lists (for Admin Waiting Lists Management)
export function useAllWaitingLists() {
  return useQuery({
    queryKey: ['all-waiting-lists'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('book_requests')
        .select(`*, book:books(id, book_code, title, cover_image_url, status, condition), employee:employees(id, full_name, department, employee_code)`)
        .in('status', ['Waiting', 'Ready for Pickup'])
        .order('queue_position', { ascending: true })

      if (error) throw error
      return (data ?? []) as unknown as BookRequestWithDetails[]
    },
  })
}

// Submit a request for an available book or join waiting list for an on-loan book
export function useRequestBook() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({
      bookId,
      employeeId,
      notes,
      actionType = 'REQUEST',
      performedBy = 'User',
      customReason,
    }: {
      bookId: string
      employeeId: string
      notes?: string
      actionType?: 'REQUEST' | 'WAITLIST'
      performedBy?: string
      customReason?: string
    }) => {
      // 1. Check if employee already has active request for this book
      const { data: existing } = await supabase
        .from('book_requests')
        .select('id, status, queue_position')
        .eq('book_id', bookId)
        .eq('employee_id', employeeId)
        .in('status', ['Waiting', 'Ready for Pickup'])

      if (existing && existing.length > 0) {
        throw new Error(
          actionType === 'REQUEST'
            ? 'You have already submitted an active request for this book.'
            : 'You are already in the waiting list queue for this book.'
        )
      }

      // 2. Determine next queue position
      const { data: currentQueue } = await supabase
        .from('book_requests')
        .select('queue_position')
        .eq('book_id', bookId)
        .in('status', ['Waiting', 'Ready for Pickup'])
        .order('queue_position', { ascending: false })
        .limit(1)

      const highestPos = currentQueue && currentQueue.length > 0 ? currentQueue[0].queue_position : 0
      const nextPos = highestPos + 1

      // 3. Insert request
      const { data, error } = await supabase
        .from('book_requests')
        .insert({
          book_id: bookId,
          employee_id: employeeId,
          status: 'Waiting',
          queue_position: nextPos,
          notes: notes || null,
          request_date: new Date().toISOString().split('T')[0],
          is_demo: false,
        })
        .select()
        .single()

      if (error) throw error

      // 4. Log in queue audit
      const auditReason =
        customReason ||
        (performedBy !== 'User'
          ? `Request manually created by ${performedBy}`
          : actionType === 'REQUEST'
          ? 'Requested available book via catalogue'
          : 'Joined waiting list via catalogue / portal')

      await supabase.from('queue_audit_logs').insert({
        book_id: bookId,
        request_id: data.id,
        employee_id: employeeId,
        action: 'ADDED',
        new_position: nextPos,
        reason: auditReason,
        performed_by: performedBy,
      })

      return data
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['book-waiting-list', vars.bookId] })
      qc.invalidateQueries({ queryKey: ['employee-requests', vars.employeeId] })
      qc.invalidateQueries({ queryKey: ['all-waiting-lists'] })
      qc.invalidateQueries({ queryKey: ['all-book-requests'] })
    },
  })
}

// Backward-compatible alias for existing imports
export const useJoinWaitingList = useRequestBook


// Cancel a request and recompact subsequent queue positions
export function useCancelRequest() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({
      requestId,
      bookId,
      reason,
      cancelledBy = 'User',
    }: {
      requestId: string
      bookId: string
      reason?: string
      cancelledBy?: string
    }) => {
      // 1. Get current request details
      const { data: targetReq } = await supabase
        .from('book_requests')
        .select('id, queue_position, employee_id')
        .eq('id', requestId)
        .single()

      if (!targetReq) throw new Error('Request not found.')

      const cancelledPos = targetReq.queue_position

      // 2. Mark request Cancelled
      const { error } = await supabase
        .from('book_requests')
        .update({ status: 'Cancelled' })
        .eq('id', requestId)

      if (error) throw error

      // 3. Recompact positions of remaining waiting/ready requests behind this one
      const { data: subsequent } = await supabase
        .from('book_requests')
        .select('id, queue_position')
        .eq('book_id', bookId)
        .in('status', ['Waiting', 'Ready for Pickup'])
        .gt('queue_position', cancelledPos)
        .order('queue_position', { ascending: true })

      if (subsequent && subsequent.length > 0) {
        for (const req of subsequent) {
          await supabase
            .from('book_requests')
            .update({ queue_position: req.queue_position - 1 })
            .eq('id', req.id)
        }
      }

      // 4. Queue audit log
      await supabase.from('queue_audit_logs').insert({
        book_id: bookId,
        request_id: requestId,
        employee_id: targetReq.employee_id,
        action: 'CANCELLED',
        prev_position: cancelledPos,
        reason: reason || 'Request cancelled by user or librarian',
        performed_by: cancelledBy,
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['book-waiting-list'] })
      qc.invalidateQueries({ queryKey: ['employee-requests'] })
      qc.invalidateQueries({ queryKey: ['all-waiting-lists'] })
      qc.invalidateQueries({ queryKey: ['all-book-requests'] })
    },
  })
}

// Reorder a request position in the queue (Admin manual override)
export function useReorderQueue() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({
      requestId,
      bookId,
      direction, // 'up' | 'down' | 'top' | 'bottom'
      reason,
      performedBy = 'Admin',
    }: {
      requestId: string
      bookId: string
      direction: 'up' | 'down' | 'top' | 'bottom'
      reason: string
      performedBy?: string
    }) => {
      if (!reason || reason.trim().length === 0) {
        throw new Error('A reason is required to manually override FIFO waiting list order.')
      }

      // Fetch all active queue items for this book
      const { data: queue } = await supabase
        .from('book_requests')
        .select('id, queue_position, employee_id')
        .eq('book_id', bookId)
        .in('status', ['Waiting', 'Ready for Pickup'])
        .order('queue_position', { ascending: true })

      if (!queue || queue.length <= 1) return

      const idx = queue.findIndex((q: any) => q.id === requestId)
      if (idx === -1) return

      const target = queue[idx]
      const oldPos = target.queue_position

      let newIdx = idx
      if (direction === 'up' && idx > 0) newIdx = idx - 1
      else if (direction === 'down' && idx < queue.length - 1) newIdx = idx + 1
      else if (direction === 'top') newIdx = 0
      else if (direction === 'bottom') newIdx = queue.length - 1

      if (newIdx === idx) return

      // Rearrange array
      const reordered = [...queue]
      const [removed] = reordered.splice(idx, 1)
      reordered.splice(newIdx, 0, removed)

      // Update all positions sequentially 1..N
      for (let i = 0; i < reordered.length; i++) {
        const newPos = i + 1
        if (reordered[i].queue_position !== newPos) {
          await supabase
            .from('book_requests')
            .update({ queue_position: newPos })
            .eq('id', reordered[i].id)
        }
      }

      // Record audit
      await supabase.from('queue_audit_logs').insert({
        book_id: bookId,
        request_id: requestId,
        employee_id: target.employee_id,
        action: 'REORDERED',
        prev_position: oldPos,
        new_position: newIdx + 1,
        reason: `Reordered (${direction.toUpperCase()}): ${reason}`,
        performed_by: performedBy,
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['book-waiting-list'] })
      qc.invalidateQueries({ queryKey: ['all-waiting-lists'] })
      qc.invalidateQueries({ queryKey: ['all-book-requests'] })
      qc.invalidateQueries({ queryKey: ['employee-requests'] })
    },
  })
}

// Mark a request as Ready for Pickup or release/expire
export function useUpdateRequestStatus() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({
      requestId,
      bookId,
      status,
      reason,
      performedBy = 'Librarian',
    }: {
      requestId: string
      bookId: string
      status: RequestStatus
      reason?: string
      performedBy?: string
    }) => {
      const { data, error } = await supabase
        .from('book_requests')
        .update({
          status,
          notified_at: status === 'Ready for Pickup' ? new Date().toISOString() : null,
        })
        .eq('id', requestId)
        .select()
        .single()

      if (error) throw error

      await supabase.from('queue_audit_logs').insert({
        book_id: bookId,
        request_id: requestId,
        action: status.toUpperCase().replace(/\s+/g, '_'),
        reason: reason || `Request status updated to ${status}`,
        performed_by: performedBy,
      })

      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['book-waiting-list'] })
      qc.invalidateQueries({ queryKey: ['all-waiting-lists'] })
      qc.invalidateQueries({ queryKey: ['all-book-requests'] })
      qc.invalidateQueries({ queryKey: ['employee-requests'] })
    },
  })
}
