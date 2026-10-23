import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, parseISO, differenceInDays, isAfter, startOfDay } from 'date-fns'

// ─── Tailwind class merging ───────────────────────────────────
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ─── Date utilities ───────────────────────────────────────────

export function formatDate(date: string | Date | null | undefined, fmt = 'dd MMM yyyy'): string {
  if (!date) return '—'
  try {
    const d = typeof date === 'string' ? parseISO(date) : date
    return format(d, fmt)
  } catch {
    return '—'
  }
}

export function today(): string {
  return format(new Date(), 'yyyy-MM-dd')
}

export function addDays(dateStr: string, days: number): string {
  const d = parseISO(dateStr)
  d.setDate(d.getDate() + days)
  return format(d, 'yyyy-MM-dd')
}

export function isOverdue(dueDateStr: string, returnDate: string | null): boolean {
  if (returnDate) return false
  const due = startOfDay(parseISO(dueDateStr))
  const now = startOfDay(new Date())
  return isAfter(now, due)
}

export function daysOverdue(dueDateStr: string): number {
  const due = startOfDay(parseISO(dueDateStr))
  const now = startOfDay(new Date())
  return Math.max(0, differenceInDays(now, due))
}

export function daysBorrowed(issueDateStr: string, returnDateStr: string | null): number {
  const issue = parseISO(issueDateStr)
  const end = returnDateStr ? parseISO(returnDateStr) : new Date()
  return Math.max(0, differenceInDays(end, issue))
}

// ─── Book Code utilities ──────────────────────────────────────

export function formatBookCode(n: number): string {
  return `BK${String(n).padStart(3, '0')}`
}

// ─── Status badge colors ──────────────────────────────────────

export type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'purple'

export function getStatusVariant(status: string): BadgeVariant {
  switch (status) {
    case 'Available':   return 'success'
    case 'Borrowed':    return 'info'
    case 'Reserved':    return 'purple'
    case 'Lost':        return 'error'
    case 'Under Repair': return 'warning'
    default:            return 'neutral'
  }
}

export function getConditionVariant(condition: string): BadgeVariant {
  switch (condition) {
    case 'Excellent': return 'success'
    case 'Good':      return 'info'
    case 'Fair':      return 'warning'
    case 'Poor':      return 'error'
    default:          return 'neutral'
  }
}

// ─── Error formatting ─────────────────────────────────────────

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  return 'An unexpected error occurred'
}

// ─── Google Books API ─────────────────────────────────────────

export interface GoogleBooksVolume {
  id: string
  volumeInfo: {
    title: string
    authors?: string[]
    publisher?: string
    publishedDate?: string
    description?: string
    industryIdentifiers?: Array<{ type: string; identifier: string }>
    pageCount?: number
    categories?: string[]
    language?: string
    imageLinks?: {
      thumbnail?: string
      smallThumbnail?: string
    }
  }
}

export interface GoogleBooksSearchResult {
  id: string
  title: string
  authors: string
  publisher: string
  publishedDate: string
  isbn: string | null
  pageCount: number | null
  categories: string
  language: string
  description: string
  coverUrl: string | null
  volumeId: string
}

export async function getGoogleBooksApiKey(): Promise<string | undefined> {
  const envKey = import.meta.env.VITE_GOOGLE_BOOKS_API_KEY
  if (envKey && envKey.trim()) return envKey.trim()

  try {
    const raw = localStorage.getItem('booknook_mock_db_app_settings')
    if (raw) {
      const parsed = JSON.parse(raw)
      const key = parsed[0]?.google_books_api_key
      if (key && typeof key === 'string' && key.trim()) return key.trim()
    }
  } catch (e) {
    // ignore
  }
  return undefined
}

export async function testGoogleBooksApiKey(apiKey: string): Promise<{ success: boolean; message: string }> {
  try {
    const params = new URLSearchParams({
      q: 'intitle:Clean Code',
      maxResults: '1',
      ...(apiKey.trim() ? { key: apiKey.trim() } : {}),
    })

    const res = await fetch(
      `https://www.googleapis.com/books/v1/volumes?${params}`,
      { signal: AbortSignal.timeout(8000) }
    )

    if (!res.ok) {
      const err = await res.json().catch(() => null)
      const msg = err?.error?.message || `${res.status} ${res.statusText}`
      return { success: false, message: msg }
    }

    const data = await res.json()
    return {
      success: true,
      message: `Connection successful! Google Books returned ${data.totalItems || 0} results.`,
    }
  } catch (err: unknown) {
    return {
      success: false,
      message: err instanceof Error ? err.message : 'Connection failed',
    }
  }
}

export async function searchGoogleBooks(
  query: string,
  searchType: 'isbn' | 'title' | 'author' = 'title',
  maxResults = 10,
  overrideApiKey?: string
): Promise<GoogleBooksSearchResult[]> {
  const apiKey = overrideApiKey || await getGoogleBooksApiKey()
  
  let q = query
  if (searchType === 'isbn') q = `isbn:${query}`
  else if (searchType === 'author') q = `inauthor:${query}`

  const params = new URLSearchParams({
    q,
    maxResults: String(maxResults),
    printType: 'books',
    ...(apiKey ? { key: apiKey } : {}),
  })

  const res = await fetch(
    `https://www.googleapis.com/books/v1/volumes?${params}`,
    { signal: AbortSignal.timeout(8000) }
  )

  if (!res.ok) {
    throw new Error(`Google Books API error: ${res.status} ${res.statusText}`)
  }

  const data = await res.json()

  if (!data.items || data.totalItems === 0) return []

  return (data.items as GoogleBooksVolume[]).map(vol => {
    const vi = vol.volumeInfo
    const isbn = vi.industryIdentifiers?.find(i => i.type === 'ISBN_13')?.identifier
      ?? vi.industryIdentifiers?.find(i => i.type === 'ISBN_10')?.identifier
      ?? null

    // Upgrade thumbnail to larger size
    const coverUrl = vi.imageLinks?.thumbnail
      ? vi.imageLinks.thumbnail.replace('http://', 'https://').replace('&zoom=1', '&zoom=2')
      : null

    return {
      id: vol.id,
      title: vi.title ?? '',
      authors: vi.authors?.join(', ') ?? '',
      publisher: vi.publisher ?? '',
      publishedDate: vi.publishedDate ?? '',
      isbn,
      pageCount: vi.pageCount ?? null,
      categories: vi.categories?.join(', ') ?? '',
      language: vi.language ?? '',
      description: vi.description ?? '',
      coverUrl,
      volumeId: vol.id,
    }
  })
}

// ─── Number formatting ────────────────────────────────────────

export function pluralize(count: number, singular: string, plural?: string): string {
  return count === 1 ? `${count} ${singular}` : `${count} ${plural ?? singular + 's'}`
}
