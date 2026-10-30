import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { BorrowingWithDetails } from '@/lib/database.types'
import { toast } from '@/hooks/use-toast'

export const BORROWINGS_QUERY_KEY = ['borrowings'] as const

export function useBorrowings(options?: {
  status?: 'active' | 'returned' | 'overdue' | 'all'
  employeeId?: string
  bookId?: string
  page?: number
  pageSize?: number
}) {
  const { status = 'all', employeeId, bookId, page = 1, pageSize = 20 } = options ?? {}
  const today = new Date().toISOString().split('T')[0]

  return useQuery({
    queryKey: [...BORROWINGS_QUERY_KEY, { status, employeeId, bookId, page, pageSize }],
    queryFn: async () => {
      let q = supabase
        .from('borrowings')
        .select(`
          *,
          book:books(id, book_code, title, cover_image_url, status),
          employee:employees(id, full_name, department, employee_code)
        `, { count: 'exact' })

      if (status === 'active')   q = q.is('return_date', null)
      if (status === 'returned') q = q.not('return_date', 'is', null)
      if (status === 'overdue')  q = q.is('return_date', null).lt('due_date', today)
      if (employeeId)            q = q.eq('employee_id', employeeId)
      if (bookId)                q = q.eq('book_id', bookId)

      const from = (page - 1) * pageSize
      q = q.order('created_at', { ascending: false }).range(from, from + pageSize - 1)

      const { data, error, count } = await q
      if (error) throw error

      return { borrowings: (data as unknown as BorrowingWithDetails[]) ?? [], total: count ?? 0 }
    },
  })
}

export function useRecentActivity() {
  return useQuery({
    queryKey: ['recent-activity'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0]
      const [recent, returns, overdue] = await Promise.all([
        supabase.from('borrowings').select(`
          *,
          book:books(id, book_code, title, cover_image_url),
          employee:employees(id, full_name, department)
        `).is('return_date', null).order('created_at', { ascending: false }).limit(5),

        supabase.from('borrowings').select(`
          *,
          book:books(id, book_code, title, cover_image_url),
          employee:employees(id, full_name, department)
        `).not('return_date', 'is', null).order('return_date', { ascending: false }).limit(5),

        supabase.from('borrowings').select(`
          *,
          book:books(id, book_code, title, cover_image_url),
          employee:employees(id, full_name, department)
        `).is('return_date', null).lt('due_date', today).order('due_date').limit(10),
      ])

      return {
        recentBorrowings: (recent.data ?? []) as unknown as BorrowingWithDetails[],
        recentReturns: (returns.data ?? []) as unknown as BorrowingWithDetails[],
        overdueLoans: (overdue.data ?? []) as unknown as BorrowingWithDetails[],
      }
    },
    refetchInterval: 60_000,
  })
}

export function useIssueBook() {
  const qc = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (params: {
      bookId: string
      employeeId: string
      issueDate: string
      dueDate: string
      remarks?: string
      requestId?: string
    }) => {
      const { data, error } = await supabase.rpc('issue_book', {
        p_book_id: params.bookId,
        p_employee_id: params.employeeId,
        p_issue_date: params.issueDate,
        p_due_date: params.dueDate,
        p_remarks: params.remarks ?? null,
        p_actor_user_id: user?.id ?? '',
        p_request_id: params.requestId ?? null,
      })
      if (error) throw new Error(error.message)
      return data as string
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: BORROWINGS_QUERY_KEY })
      qc.invalidateQueries({ queryKey: ['books'] })
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] })
      qc.invalidateQueries({ queryKey: ['recent-activity'] })
      qc.invalidateQueries({ queryKey: ['book-waiting-list'] })
      qc.invalidateQueries({ queryKey: ['all-waiting-lists'] })
      qc.invalidateQueries({ queryKey: ['all-book-requests'] })
      qc.invalidateQueries({ queryKey: ['employee-requests'] })
      qc.invalidateQueries({ queryKey: ['my-borrowings'] })
      qc.invalidateQueries({ queryKey: ['public-stats'] })
      qc.invalidateQueries({ queryKey: ['book-borrowings'] })
      toast({ title: 'Book issued', description: 'The loan has been recorded.', variant: 'success' as never })
    },
    onError: (err: Error) => {
      toast({ title: 'Failed to issue book', description: err.message, variant: 'destructive' })
    },
  })
}

export function useReturnBook() {
  const qc = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (params: {
      borrowingId: string
      returnDate: string
      returnRemarks?: string
      returnCondition?: string
      nextRequestReady?: boolean
    }) => {
      const { error } = await supabase.rpc('return_book', {
        p_borrowing_id: params.borrowingId,
        p_return_date: params.returnDate,
        p_return_remarks: params.returnRemarks ?? null,
        p_return_condition: params.returnCondition ?? null,
        p_actor_user_id: user?.id ?? '',
        p_next_request_ready: params.nextRequestReady ?? false,
      })
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: BORROWINGS_QUERY_KEY })
      qc.invalidateQueries({ queryKey: ['books'] })
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] })
      qc.invalidateQueries({ queryKey: ['recent-activity'] })
      qc.invalidateQueries({ queryKey: ['book-waiting-list'] })
      qc.invalidateQueries({ queryKey: ['all-waiting-lists'] })
      qc.invalidateQueries({ queryKey: ['all-book-requests'] })
      qc.invalidateQueries({ queryKey: ['employee-requests'] })
      qc.invalidateQueries({ queryKey: ['my-borrowings'] })
      qc.invalidateQueries({ queryKey: ['public-stats'] })
      qc.invalidateQueries({ queryKey: ['book-borrowings'] })
      toast({ title: 'Return recorded', description: 'The book has been returned.', variant: 'success' as never })
    },
    onError: (err: Error) => {
      toast({ title: 'Failed to record return', description: err.message, variant: 'destructive' })
    },
  })
}

export function useUpdateDueDate() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ loanId, dueDate, remarks }: { loanId: string; dueDate: string; remarks?: string }) => {
      const { error } = await supabase
        .from('borrowings')
        .update({ due_date: dueDate })
        .eq('id', loanId)

      if (error) throw error

      await supabase.from('audit_logs').insert({
        action: 'DUE_DATE_UPDATED',
        entity_type: 'borrowings',
        entity_id: loanId,
        details: { dueDate, remarks },
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: BORROWINGS_QUERY_KEY })
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] })
      qc.invalidateQueries({ queryKey: ['recent-activity'] })
      toast({ title: 'Due Date Updated', description: 'Expected return date has been updated.', variant: 'success' as never })
    },
    onError: (err: Error) => {
      toast({ title: 'Failed to update due date', description: err.message, variant: 'destructive' })
    },
  })
}

export function useDeleteBorrowing() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      // Find the borrowing to check if it's currently active
      const { data: borrowing, error: fetchErr } = await supabase
        .from('borrowings')
        .select('id, book_id, return_date')
        .eq('id', id)
        .single()

      if (fetchErr) throw fetchErr

      // If loan was active, restore the book status back to Available
      if (borrowing && !borrowing.return_date && borrowing.book_id) {
        await supabase
          .from('books')
          .update({ status: 'Available' })
          .eq('id', borrowing.book_id)
      }

      const { error: delErr } = await supabase
        .from('borrowings')
        .delete()
        .eq('id', id)

      if (delErr) throw delErr

      await supabase.from('audit_logs').insert({
        action: 'BORROWING_DELETED',
        entity_type: 'borrowings',
        entity_id: id,
        details: {},
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: BORROWINGS_QUERY_KEY })
      qc.invalidateQueries({ queryKey: ['books'] })
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] })
      qc.invalidateQueries({ queryKey: ['recent-activity'] })
      toast({ title: 'Loan record deleted', description: 'The borrowing record has been removed.', variant: 'success' as never })
    },
    onError: (err: Error) => {
      toast({ title: 'Failed to delete record', description: err.message, variant: 'destructive' })
    },
  })
}

