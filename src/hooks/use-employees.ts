import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Employee, EmployeeInsert, EmployeeUpdate } from '@/lib/database.types'
import { toast } from '@/hooks/use-toast'

export const EMPLOYEES_QUERY_KEY = ['employees'] as const

export function useEmployees(options?: {
  search?: string
  isActive?: boolean
  department?: string
  page?: number
  pageSize?: number
  includeArchived?: boolean
}) {
  const { search, isActive, department, page = 1, pageSize = 20, includeArchived = false } = options ?? {}

  return useQuery({
    queryKey: [...EMPLOYEES_QUERY_KEY, { search, isActive, department, page, pageSize, includeArchived }],
    queryFn: async () => {
      let q = supabase.from('employees').select('*', { count: 'exact' })

      if (!includeArchived) q = q.is('archived_at', null)

      if (search) {
        q = q.or(`full_name.ilike.%${search}%,employee_code.ilike.%${search}%,email.ilike.%${search}%`)
      }
      if (isActive !== undefined) q = q.eq('is_active', isActive)
      if (department && department !== 'all') q = q.eq('department', department)

      const from = (page - 1) * pageSize
      q = q.order('full_name').range(from, from + pageSize - 1)

      const { data, error, count } = await q
      if (error) throw error

      return { employees: (data as Employee[]) ?? [], total: count ?? 0 }
    },
  })
}

export function useEmployee(id: string | undefined) {
  return useQuery({
    queryKey: [...EMPLOYEES_QUERY_KEY, id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('id', id!)
        .single()
      if (error) throw error
      return data as Employee
    },
  })
}

export function useGenerateEmployeeCode() {
  return useQuery({
    queryKey: ['next-employee-code'],
    queryFn: async () => {
      // First try peeking so we don't advance the sequence counter simply by opening the form
      const { data: peekData, error: peekError } = await supabase.rpc('peek_next_employee_code')
      if (!peekError && peekData) {
        return peekData as string
      }

      const { data, error } = await supabase.rpc('generate_employee_code')
      if (error) {
        console.warn('generate_employee_code error, fallback to EMP008', error)
        return 'EMP008'
      }
      return data as string
    },
    staleTime: 30_000,
  })
}

export function useCreateEmployee() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (data: EmployeeInsert) => {
      let employee_code = data.employee_code?.trim() || null

      if (!employee_code) {
        const { data: code, error: codeErr } = await supabase.rpc('generate_employee_code')
        if (!codeErr && code) {
          employee_code = code as string
        }
      }

      const { data: emp, error } = await supabase
        .from('employees')
        .insert({ ...data, employee_code })
        .select()
        .single()
      if (error) throw error

      await supabase.from('audit_logs').insert({
        action: 'EMPLOYEE_CREATED',
        entity_type: 'employees',
        entity_id: (emp as Employee).id,
        details: { full_name: data.full_name, employee_code },
      })

      return emp as Employee
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: EMPLOYEES_QUERY_KEY })
      qc.invalidateQueries({ queryKey: ['next-employee-code'] })
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] })
      toast({ title: 'Reader added', description: 'Added successfully to the Readers list.', variant: 'success' as never })
    },
    onError: (err: Error) => {
      toast({ title: 'Failed to add reader', description: err.message, variant: 'destructive' })
    },
  })
}

export function useUpdateEmployee() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...data }: EmployeeUpdate & { id: string }) => {
      const { data: emp, error } = await supabase
        .from('employees')
        .update(data)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error

      await supabase.from('audit_logs').insert({
        action: 'EMPLOYEE_UPDATED',
        entity_type: 'employees',
        entity_id: id,
        details: { changes: data },
      })

      return emp as Employee
    },
    onSuccess: (_emp, vars) => {
      qc.invalidateQueries({ queryKey: EMPLOYEES_QUERY_KEY })
      qc.invalidateQueries({ queryKey: [...EMPLOYEES_QUERY_KEY, vars.id] })
      toast({ title: 'Reader updated', variant: 'success' as never })
    },
    onError: (err: Error) => {
      toast({ title: 'Failed to update reader', description: err.message, variant: 'destructive' })
    },
  })
}

export function useDeleteEmployee() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      // Check if employee has active borrowings
      const { data: activeBorrowings, error: checkError } = await supabase
        .from('borrowings')
        .select('id')
        .eq('employee_id', id)
        .is('return_date', null)

      if (checkError) throw checkError
      if (activeBorrowings && activeBorrowings.length > 0) {
        throw new Error('Cannot remove reader with active borrowed books. Please return all borrowed books first.')
      }

      // Check for any historical loans
      const { data: allBorrowings } = await supabase
        .from('borrowings')
        .select('id')
        .eq('employee_id', id)

      if (allBorrowings && allBorrowings.length > 0) {
        // Soft-delete to preserve borrowing audit history
        const { error: archiveError } = await supabase
          .from('employees')
          .update({ is_active: false, archived_at: new Date().toISOString() })
          .eq('id', id)
        if (archiveError) throw archiveError
      } else {
        // Hard-delete if no loan history
        const { error: deleteError } = await supabase
          .from('employees')
          .delete()
          .eq('id', id)
        if (deleteError) throw deleteError
      }

      await supabase.from('audit_logs').insert({
        action: 'EMPLOYEE_DELETED',
        entity_type: 'employees',
        entity_id: id,
        details: {},
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: EMPLOYEES_QUERY_KEY })
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] })
      toast({ title: 'Reader removed', description: 'The reader has been successfully removed.', variant: 'success' as never })
    },
    onError: (err: Error) => {
      toast({ title: 'Failed to remove reader', description: err.message, variant: 'destructive' })
    },
  })
}

export function useEmployeeDepartments() {
  return useQuery({
    queryKey: ['employee-departments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employees')
        .select('department')
        .not('department', 'is', null)
        .order('department')
      if (error) throw error
      return [...new Set((data ?? []).map((r: any) => r.department).filter(Boolean))] as string[]
    },
  })
}

// ─── Fetch counts of books owned by employees ─────────────────
export function useEmployeeBookCounts() {
  return useQuery({
    queryKey: ['employee-book-counts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('books')
        .select('owned_by')
        .is('archived_at', null)

      if (error) throw error

      const counts: Record<string, number> = {}
      ;(data ?? []).forEach((b: any) => {
        if (b.owned_by) {
          const key = String(b.owned_by).trim().toLowerCase()
          counts[key] = (counts[key] || 0) + 1
        }
      })
      return counts
    },
    staleTime: 30_000,
  })
}

export function getEmployeeBookCount(
  emp: Employee,
  counts: Record<string, number> | undefined
): number {
  if (!counts) return 0
  const nameKey = emp.full_name.trim().toLowerCase()
  const codeKey = (emp.employee_code || '').trim().toLowerCase()

  let count = counts[nameKey] || 0
  if (codeKey && codeKey !== nameKey && counts[codeKey]) {
    count += counts[codeKey]
  }
  return count
}


