import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Book } from '@/lib/database.types'

export interface PublicLibraryStats {
  availableBooks: number
  teamMembers: number
  categoriesCount: number
  averageRating: number
  totalReviews: number
}

export function usePublicLibraryStats() {
  return useQuery<PublicLibraryStats>({
    queryKey: ['public-library-stats'],
    queryFn: async () => {
      const [booksRes, empsRes, reviewsRes] = await Promise.all([
        supabase.from('books').select('category, status, archived_at'),
        supabase.from('employees').select('id', { count: 'exact' }).eq('is_active', true),
        supabase.from('reviews').select('rating'),
      ])

      const books = (booksRes.data as Array<{ category: string | null; status: string; archived_at: string | null }>) ?? []
      const activeBooks = books.filter(b => !b.archived_at)
      const availableBooks = activeBooks.filter(b => b.status === 'Available').length

      const distinctCategories = new Set(
        activeBooks.map(b => b.category).filter(Boolean)
      )

      const teamMembers = empsRes.count ?? empsRes.data?.length ?? 0

      const reviews = (reviewsRes.data as Array<{ rating: number }>) ?? []
      const totalReviews = reviews.length
      const avgRating = totalReviews > 0
        ? Math.round((reviews.reduce((acc, r) => acc + (r.rating || 0), 0) / totalReviews) * 10) / 10
        : 4.8 // friendly baseline

      return {
        availableBooks,
        teamMembers,
        categoriesCount: distinctCategories.size,
        averageRating: avgRating,
        totalReviews,
      }
    },
    staleTime: 30_000,
  })
}
