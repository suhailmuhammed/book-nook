import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Book, BookInsert, BookUpdate } from '@/lib/database.types'
import { toast } from '@/hooks/use-toast'

export const BOOKS_QUERY_KEY = ['books'] as const

// ─── Fetch all active books ───────────────────────────────────
export function useBooks(options?: {
  search?: string
  status?: string
  category?: string
  condition?: string
  ownedBy?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  page?: number
  pageSize?: number
  includeArchived?: boolean
}) {
  const {
    search,
    status,
    category,
    condition,
    ownedBy,
    sortBy = 'created_at',
    sortOrder = 'desc',
    page = 1,
    pageSize = 20,
    includeArchived = false,
  } = options ?? {}

  return useQuery({
    queryKey: [...BOOKS_QUERY_KEY, { search, status, category, condition, ownedBy, sortBy, sortOrder, page, pageSize, includeArchived }],
    queryFn: async () => {
      let q = supabase.from('books').select('*', { count: 'exact' })

      if (!includeArchived) q = q.is('archived_at', null)

      if (search) {
        q = q.or(`title.ilike.%${search}%,author.ilike.%${search}%,book_code.ilike.%${search}%,isbn.ilike.%${search}%,category.ilike.%${search}%,owned_by.ilike.%${search}%`)
      }
      if (status && status !== 'all') q = q.eq('status', status)
      if (category && category !== 'all') q = q.eq('category', category)
      if (condition && condition !== 'all') q = q.eq('condition', condition)
      if (ownedBy && ownedBy !== 'all') q = q.eq('owned_by', ownedBy)

      const from = (page - 1) * pageSize
      q = q.order(sortBy, { ascending: sortOrder === 'asc' }).range(from, from + pageSize - 1)

      const { data, error, count } = await q
      if (error) throw error

      return { books: (data as Book[]) ?? [], total: count ?? 0 }
    },
  })
}

// ─── Fetch single book ────────────────────────────────────────
export function useBook(id: string | undefined) {
  return useQuery({
    queryKey: [...BOOKS_QUERY_KEY, id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('books')
        .select('*')
        .eq('id', id!)
        .single()
      if (error) throw error
      return data as Book
    },
  })
}

// ─── Fetch dashboard stats ────────────────────────────────────
export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const [booksResult, activeBorrowings, overdueResult, reviewsResult, employeesResult] = await Promise.all([
        supabase.from('books').select('status, archived_at'),
        supabase.from('borrowings').select('id, due_date').is('return_date', null),
        supabase.from('borrowings').select('id').is('return_date', null).lt('due_date', new Date().toISOString().split('T')[0]),
        supabase.from('reviews').select('id', { count: 'exact', head: true }),
        supabase.from('employees').select('id', { count: 'exact', head: true }).eq('is_active', true),
      ])

      const books = booksResult.data ?? []
      const active = books.filter((b: any) => !b.archived_at)

      const stats = {
        total:        active.length,
        available:    active.filter((b: any) => b.status === 'Available').length,
        borrowed:     active.filter((b: any) => b.status === 'Borrowed').length,
        reserved:     active.filter((b: any) => b.status === 'Reserved').length,
        lost:         active.filter((b: any) => b.status === 'Lost').length,
        underRepair:  active.filter((b: any) => b.status === 'Under Repair').length,
        activeLoans:  activeBorrowings.data?.length ?? 0,
        overdueLoans: overdueResult.data?.length ?? 0,
        totalEmployees: employeesResult.count ?? 0,
        totalReviews: reviewsResult.count ?? 0,
        statusDistribution: [
          { name: 'Available',   value: active.filter((b: any) => b.status === 'Available').length,   color: '#059669' },
          { name: 'Borrowed',    value: active.filter((b: any) => b.status === 'Borrowed').length,    color: '#2563eb' },
          { name: 'Reserved',    value: active.filter((b: any) => b.status === 'Reserved').length,    color: '#7c3aed' },
          { name: 'Lost',        value: active.filter((b: any) => b.status === 'Lost').length,        color: '#dc2626' },
          { name: 'Under Repair',value: active.filter((b: any) => b.status === 'Under Repair').length,color: '#d97706' },
        ].filter(s => s.value > 0),
      }

      return stats
    },
    refetchInterval: 60_000, // auto-refresh every minute
  })
}

export function useGenerateBookCode() {
  return useQuery({
    queryKey: ['next-book-code'],
    queryFn: async () => {
      // First try peeking so we don't advance the sequence counter simply by opening the form
      const { data: peekData, error: peekError } = await supabase.rpc('peek_next_book_code')
      if (!peekError && peekData) {
        return peekData as string
      }

      const { data, error } = await supabase.rpc('generate_book_code')
      if (error) {
        console.warn('generate_book_code error, fallback to BK016', error)
        return 'BK016'
      }
      return data as string
    },
    staleTime: 0,
  })
}

// ─── Create book ──────────────────────────────────────────────
export function useCreateBook() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (data: Omit<BookInsert, 'book_code'> & { book_code?: string }) => {
      let book_code = data.book_code

      if (!book_code) {
        // Generate a safe book code via DB function
        const { data: code, error: codeError } = await supabase
          .rpc('generate_book_code')
        if (codeError) throw codeError
        book_code = code as string
      }

      const { data: book, error } = await supabase
        .from('books')
        .insert({ ...data, book_code })
        .select()
        .single()

      if (error) throw error

      // Audit log
      await supabase.from('audit_logs').insert({
        action: 'BOOK_CREATED',
        entity_type: 'books',
        entity_id: (book as Book).id,
        details: { title: data.title, book_code },
      })

      return book as Book
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: BOOKS_QUERY_KEY })
      qc.invalidateQueries({ queryKey: ['next-book-code'] })
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] })
      qc.invalidateQueries({ queryKey: ['book-owners'] })
      qc.invalidateQueries({ queryKey: ['employee-book-counts'] })
      toast({ title: 'Book added', description: 'The book has been added to the catalog.', variant: 'success' as never })
    },
    onError: (err: Error) => {
      toast({ title: 'Failed to add book', description: err.message, variant: 'destructive' })
    },
  })
}

// ─── Update book ──────────────────────────────────────────────
export function useUpdateBook() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...data }: BookUpdate & { id: string }) => {
      const { data: book, error } = await supabase
        .from('books')
        .update(data)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      await supabase.from('audit_logs').insert({
        action: 'BOOK_UPDATED',
        entity_type: 'books',
        entity_id: id,
        details: { changes: data },
      })

      return book as Book
    },
    onSuccess: (book) => {
      qc.invalidateQueries({ queryKey: BOOKS_QUERY_KEY })
      qc.invalidateQueries({ queryKey: [...BOOKS_QUERY_KEY, book.id] })
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] })
      qc.invalidateQueries({ queryKey: ['book-owners'] })
      qc.invalidateQueries({ queryKey: ['employee-book-counts'] })
      toast({ title: 'Book updated', variant: 'success' as never })
    },
    onError: (err: Error) => {
      toast({ title: 'Failed to update book', description: err.message, variant: 'destructive' })
    },
  })
}

// ─── Archive book ─────────────────────────────────────────────
export function useArchiveBook() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('books')
        .update({ archived_at: new Date().toISOString() })
        .eq('id', id)

      if (error) throw error

      await supabase.from('audit_logs').insert({
        action: 'BOOK_ARCHIVED',
        entity_type: 'books',
        entity_id: id,
        details: {},
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: BOOKS_QUERY_KEY })
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] })
      qc.invalidateQueries({ queryKey: ['book-owners'] })
      qc.invalidateQueries({ queryKey: ['employee-book-counts'] })
      toast({ title: 'Book archived', variant: 'success' as never })
    },
    onError: (err: Error) => {
      toast({ title: 'Failed to archive book', description: err.message, variant: 'destructive' })
    },
  })
}

// ─── Fetch distinct categories ────────────────────────────────
export function useBookCategories() {
  return useQuery({
    queryKey: ['book-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('books')
        .select('category')
        .is('archived_at', null)
        .not('category', 'is', null)
        .order('category')

      if (error) throw error
      const cats = [...new Set((data ?? []).map((r: any) => r.category).filter(Boolean))] as string[]
      return cats
    },
  })
}

// ─── Fetch distinct book owners ───────────────────────────────
export function useBookOwners() {
  return useQuery({
    queryKey: ['book-owners'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('books')
        .select('owned_by')
        .is('archived_at', null)
        .not('owned_by', 'is', null)

      if (error) throw error
      const rawOwners = (data ?? []).map((r: any) => (r.owned_by ? String(r.owned_by).trim() : '')).filter(Boolean) as string[]
      const owners = [...new Set(rawOwners)].sort((a: string, b: string) => a.localeCompare(b))
      return owners
    },
  })
}

// ─── Delete book ──────────────────────────────────────────────
export function useDeleteBook() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      // Check if book has active borrowings
      const { data: activeBorrowings, error: checkError } = await supabase
        .from('borrowings')
        .select('id')
        .eq('book_id', id)
        .is('return_date', null)

      if (checkError) throw checkError
      if (activeBorrowings && activeBorrowings.length > 0) {
        throw new Error('Cannot delete book while it is actively borrowed. Please record its return first.')
      }

      // Check for historical loans
      const { data: allBorrowings } = await supabase
        .from('borrowings')
        .select('id')
        .eq('book_id', id)

      if (allBorrowings && allBorrowings.length > 0) {
        // Soft delete / archive to keep historical loan records
        const { error: archiveError } = await supabase
          .from('books')
          .update({ archived_at: new Date().toISOString() })
          .eq('id', id)
        if (archiveError) throw archiveError
      } else {
        // Clean delete if never borrowed
        await supabase.from('reviews').delete().eq('book_id', id)
        const { error: deleteError } = await supabase
          .from('books')
          .delete()
          .eq('id', id)
        if (deleteError) throw deleteError
      }

      await supabase.from('audit_logs').insert({
        action: 'BOOK_DELETED',
        entity_type: 'books',
        entity_id: id,
        details: {},
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: BOOKS_QUERY_KEY })
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] })
      qc.invalidateQueries({ queryKey: ['book-owners'] })
      qc.invalidateQueries({ queryKey: ['employee-book-counts'] })
      toast({ title: 'Book deleted', description: 'The book was removed from the catalog.', variant: 'success' as never })
    },
    onError: (err: Error) => {
      toast({ title: 'Failed to delete book', description: err.message, variant: 'destructive' })
    },
  })
}

