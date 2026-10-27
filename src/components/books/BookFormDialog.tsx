import { useState, useEffect, useRef } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Search, Loader2, ExternalLink, ChevronDown, Check, User } from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { BookCover } from '@/components/ui/book-cover'
import { useCreateBook, useUpdateBook, useGenerateBookCode } from '@/hooks/use-books'
import { useEmployees } from '@/hooks/use-employees'
import { searchGoogleBooks, type GoogleBooksSearchResult, today } from '@/lib/utils'
import type { Book } from '@/lib/database.types'

const CATEGORIES = [
  'Technology', 'Business', 'Self-Help', 'Psychology', 'History',
  'Biography', 'Memoir', 'Leadership', 'Strategy', 'Fiction',
  'Science', 'Philosophy', 'Economics', 'Design', 'Other',
]

const bookSchema = z.object({
  book_code:             z.string().optional(),
  title:                 z.string().min(1, 'Title is required'),
  author:                z.string().optional(),
  category:              z.string().optional(),
  isbn:                  z.string().optional(),
  publisher:             z.string().optional(),
  published_year:        z.coerce.number().int().min(1000).max(2100).optional().or(z.literal('')),
  edition:               z.string().optional(),
  language:              z.string().optional(),
  page_count:            z.coerce.number().int().min(1).optional().or(z.literal('')),
  description:           z.string().optional(),
  owned_by:              z.string().optional(),
  shelf_number:          z.string().optional(),
  date_added:            z.string().optional(),
  status:                z.enum(['Available', 'Borrowed', 'Reserved', 'Lost', 'Under Repair']),
  condition:             z.enum(['Excellent', 'Good', 'Fair', 'Poor']),
  cover_image_url:       z.string().optional(),
  google_books_volume_id:z.string().optional(),
})

type FormData = z.infer<typeof bookSchema>

interface BookFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  book?: Book
}

export function BookFormDialog({ open, onOpenChange, book }: BookFormDialogProps) {
  const isEdit = !!book
  const createBook = useCreateBook()
  const updateBook = useUpdateBook()
  const { data: autoBookCode, refetch: refetchBookCode } = useGenerateBookCode()
  const { data: empsData } = useEmployees({ isActive: true, pageSize: 200 })
  const employees = empsData?.employees ?? []
  const [showOwnedBySuggestions, setShowOwnedBySuggestions] = useState(false)
  const ownedByRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ownedByRef.current && !ownedByRef.current.contains(e.target as Node)) {
        setShowOwnedBySuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const [gbSearch, setGbSearch]       = useState('')
  const [gbType, setGbType]           = useState<'isbn' | 'title' | 'author'>('title')
  const [gbResults, setGbResults]     = useState<GoogleBooksSearchResult[]>([])
  const [gbLoading, setGbLoading]     = useState(false)
  const [gbError, setGbError]         = useState<string | null>(null)

  const form = useForm<FormData>({
    resolver: zodResolver(bookSchema),
    defaultValues: book ? {
      book_code:              book.book_code,
      title:                  book.title,
      author:                 book.author ?? '',
      category:               book.category ?? '',
      isbn:                   book.isbn ?? '',
      publisher:              book.publisher ?? '',
      published_year:         book.published_year ?? '',
      edition:                book.edition ?? '',
      language:               book.language ?? 'English',
      page_count:             book.page_count ?? '',
      description:            book.description ?? '',
      owned_by:               book.owned_by ?? '',
      shelf_number:           book.shelf_number ?? '',
      date_added:             book.date_added ?? today(),
      status:                 book.status,
      condition:              book.condition,
      cover_image_url:        book.cover_image_url ?? '',
      google_books_volume_id: book.google_books_volume_id ?? '',
    } : {
      book_code: autoBookCode || '',
      title: '', author: '', category: '', isbn: '', publisher: '',
      published_year: '', edition: '', language: 'English', page_count: '',
      description: '', owned_by: '', shelf_number: '',
      date_added: today(),
      status: 'Available', condition: 'Good',
      cover_image_url: '', google_books_volume_id: '',
    },
  })

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (open) {
      if (!isEdit) {
        refetchBookCode().then((res) => {
          if (res.data && !form.getValues('book_code')) {
            form.setValue('book_code', res.data)
          }
        })
      }
      form.reset(book ? {
        book_code: book.book_code,
        title: book.title,
        author: book.author ?? '',
        category: book.category ?? '',
        isbn: book.isbn ?? '',
        publisher: book.publisher ?? '',
        published_year: book.published_year ?? '',
        edition: book.edition ?? '',
        language: book.language ?? 'English',
        page_count: book.page_count ?? '',
        description: book.description ?? '',
        owned_by: book.owned_by ?? '',
        shelf_number: book.shelf_number ?? '',
        date_added: book.date_added ?? today(),
        status: book.status,
        condition: book.condition,
        cover_image_url: book.cover_image_url ?? '',
        google_books_volume_id: book.google_books_volume_id ?? '',
      } : {
        book_code: autoBookCode || '',
        title: '', author: '', category: '', isbn: '', publisher: '',
        published_year: '', edition: '', language: 'English', page_count: '',
        description: '', owned_by: '', shelf_number: '',
        date_added: today(),
        status: 'Available', condition: 'Good',
        cover_image_url: '', google_books_volume_id: '',
      })
      setGbResults([])
      setGbSearch('')
      setGbError(null)
    }
  }, [open, book, isEdit, autoBookCode, form, refetchBookCode])

  useEffect(() => {
    if (open && !isEdit && autoBookCode && !form.getValues('book_code')) {
      form.setValue('book_code', autoBookCode)
    }
  }, [open, isEdit, autoBookCode, form])

  async function handleGoogleSearch() {
    if (!gbSearch.trim()) return
    setGbLoading(true)
    setGbError(null)
    try {
      const results = await searchGoogleBooks(gbSearch, gbType)
      setGbResults(results)
      if (results.length === 0) setGbError('No results found. Try a different search term.')
    } catch (err) {
      setGbError('Google Books is unavailable. You can still add the book manually.')
      setGbResults([])
    } finally {
      setGbLoading(false)
    }
  }

  function applyGoogleResult(result: GoogleBooksSearchResult) {
    // Only populate metadata fields — never touch book_code, status, condition, owned_by, date_added
    form.setValue('title',                  result.title || form.getValues('title'))
    form.setValue('author',                 result.authors || form.getValues('author'))
    form.setValue('isbn',                   result.isbn ?? form.getValues('isbn'))
    form.setValue('publisher',              result.publisher || form.getValues('publisher'))
    form.setValue('description',            result.description || form.getValues('description'))
    form.setValue('cover_image_url',        result.coverUrl ?? form.getValues('cover_image_url'))
    form.setValue('google_books_volume_id', result.volumeId)

    if (result.pageCount) form.setValue('page_count', result.pageCount)
    if (result.categories) form.setValue('category', result.categories.split(',')[0].trim() || form.getValues('category'))
    if (result.language) form.setValue('language', result.language)

    const year = parseInt(result.publishedDate?.slice(0, 4) ?? '')
    if (!isNaN(year)) form.setValue('published_year', year)

    setGbResults([])
    setGbSearch('')
  }

  async function onSubmit(data: FormData) {
    const payload = {
      title:                  data.title,
      author:                 data.author || null,
      category:               data.category || null,
      isbn:                   data.isbn || null,
      publisher:              data.publisher || null,
      published_year:         data.published_year ? Number(data.published_year) : null,
      edition:                data.edition || null,
      language:               data.language || null,
      page_count:             data.page_count ? Number(data.page_count) : null,
      description:            data.description || null,
      owned_by:               data.owned_by || null,
      shelf_number:           data.shelf_number || null,
      date_added:             data.date_added || today(),
      status:                 data.status,
      condition:              data.condition,
      cover_image_url:        data.cover_image_url || null,
      google_books_volume_id: data.google_books_volume_id || null,
      metadata_source:        data.google_books_volume_id ? 'google_books' as const : 'manual' as const,
      metadata_updated_at:    new Date().toISOString(),
    }

    if (isEdit) {
      await updateBook.mutateAsync({ id: book.id, ...payload })
    } else {
      await createBook.mutateAsync({
        ...payload,
        book_code: data.book_code || undefined,
      })
    }

    onOpenChange(false)
  }

  const isPending = createBook.isPending || updateBook.isPending
  const coverPreview = form.watch('cover_image_url')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Book' : 'Add New Book'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Update the book details. Book ID cannot be changed.' : 'Fill in the details or search Google Books to pre-fill.'}
          </DialogDescription>
        </DialogHeader>

        {/* Google Books Search */}
        {!isEdit && (
          <div className="rounded-lg border bg-muted/40 p-4 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Search Google Books</p>
            <div className="flex gap-2">
              <Select value={gbType} onValueChange={v => setGbType(v as typeof gbType)}>
                <SelectTrigger className="w-24 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="title">Title</SelectItem>
                  <SelectItem value="author">Author</SelectItem>
                  <SelectItem value="isbn">ISBN</SelectItem>
                </SelectContent>
              </Select>
              <Input
                id="gb-search-input"
                placeholder="Search title, author, or ISBN…"
                value={gbSearch}
                onChange={e => setGbSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleGoogleSearch()}
                className="flex-1 text-sm"
              />
              <Button
                id="gb-search-btn"
                type="button"
                variant="outline"
                size="default"
                onClick={handleGoogleSearch}
                disabled={gbLoading}
              >
                {gbLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </Button>
            </div>

            {gbError && <p className="text-xs text-amber-600">{gbError}</p>}

            {gbResults.length > 0 && (
              <div className="space-y-2 max-h-56 overflow-y-auto">
                {gbResults.map(r => (
                  <button
                    key={r.volumeId}
                    type="button"
                    className="w-full flex items-center gap-3 p-2.5 rounded-lg border bg-background hover:bg-primary/5 hover:border-primary/30 transition-colors text-left"
                    onClick={() => applyGoogleResult(r)}
                  >
                    <BookCover src={r.coverUrl} title={r.title} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{r.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{r.authors}</p>
                      <p className="text-xs text-muted-foreground">{r.publisher} · {r.publishedDate?.slice(0, 4)}{r.isbn ? ` · ${r.isbn}` : ''}</p>
                    </div>
                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Book Form */}
        <form id="book-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Cover preview */}
          {coverPreview && (
            <div className="flex items-center gap-3">
              <BookCover src={coverPreview} title={form.watch('title') || 'Preview'} size="md" />
              <div>
                <p className="text-xs font-medium">Cover Preview</p>
                <button
                  type="button"
                  className="text-xs text-destructive hover:underline"
                  onClick={() => form.setValue('cover_image_url', '')}
                >
                  Remove
                </button>
              </div>
            </div>
          )}

          <div className="grid sm:grid-cols-2 gap-4">
            {/* Book ID */}
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="book-code-input" className="flex items-center justify-between">
                <span>Book Code / ID</span>
                <span className="text-xs text-muted-foreground font-normal">
                  {isEdit ? 'Read-only' : 'Auto-generated (can be edited)'}
                </span>
              </Label>
              <Input
                id="book-code-input"
                {...form.register('book_code')}
                placeholder={autoBookCode || 'e.g. BK016'}
                disabled={isEdit}
                className="font-mono"
              />
              {!isEdit && (
                <p className="text-[11px] text-muted-foreground">
                  Sequential ID: {autoBookCode || 'Auto-assigning'}. Generated automatically, or you can type a custom ID to override.
                </p>
              )}
            </div>

            {/* Title */}
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="book-title-input">Title *</Label>
              <Input id="book-title-input" {...form.register('title')} placeholder="Book title" />
              {form.formState.errors.title && (
                <p className="text-xs text-destructive">{form.formState.errors.title.message}</p>
              )}
            </div>

            {/* Author */}
            <div className="space-y-1.5">
              <Label htmlFor="book-author-input">Author</Label>
              <Input id="book-author-input" {...form.register('author')} placeholder="Author name" />
            </div>

            {/* Category */}
            <div className="space-y-1.5">
              <Label htmlFor="book-category-select">Category</Label>
              <Controller
                name="category"
                control={form.control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="book-category-select">
                      <SelectValue placeholder="Select category…" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            {/* ISBN */}
            <div className="space-y-1.5">
              <Label htmlFor="book-isbn-input">ISBN</Label>
              <Input id="book-isbn-input" {...form.register('isbn')} placeholder="978-0-000-00000-0" />
            </div>

            {/* Publisher */}
            <div className="space-y-1.5">
              <Label htmlFor="book-publisher-input">Publisher</Label>
              <Input id="book-publisher-input" {...form.register('publisher')} placeholder="Publisher name" />
            </div>

            {/* Published Year */}
            <div className="space-y-1.5">
              <Label htmlFor="book-year-input">Published Year</Label>
              <Input id="book-year-input" type="number" {...form.register('published_year')} placeholder="2024" />
            </div>

            {/* Edition */}
            <div className="space-y-1.5">
              <Label htmlFor="book-edition-input">Edition</Label>
              <Input id="book-edition-input" {...form.register('edition')} placeholder="2nd Edition" />
            </div>

            {/* Language */}
            <div className="space-y-1.5">
              <Label htmlFor="book-language-input">Language</Label>
              <Input id="book-language-input" {...form.register('language')} placeholder="English" />
            </div>

            {/* Page Count */}
            <div className="space-y-1.5">
              <Label htmlFor="book-pages-input">Page Count</Label>
              <Input id="book-pages-input" type="number" {...form.register('page_count')} placeholder="350" />
            </div>

            {/* Status */}
            <div className="space-y-1.5">
              <Label htmlFor="book-status-select">Status *</Label>
              <Controller
                name="status"
                control={form.control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="book-status-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {['Available', 'Borrowed', 'Reserved', 'Lost', 'Under Repair'].map(s => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            {/* Condition */}
            <div className="space-y-1.5">
              <Label htmlFor="book-condition-select">Condition *</Label>
              <Controller
                name="condition"
                control={form.control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="book-condition-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {['Excellent', 'Good', 'Fair', 'Poor'].map(c => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            {/* Owned By with Reader Suggestions */}
            <div className="space-y-1.5 relative" ref={ownedByRef}>
              <div className="flex items-center justify-between">
                <Label htmlFor="book-owned-input">Owned By</Label>
                <span className="text-[11px] text-muted-foreground">Select reader or custom</span>
              </div>
              <div className="relative">
                <Input
                  id="book-owned-input"
                  {...form.register('owned_by')}
                  onFocus={() => setShowOwnedBySuggestions(true)}
                  placeholder="Select reader or enter custom owner"
                  autoComplete="off"
                  className="pr-8"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowOwnedBySuggestions(v => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
                  title="Show reader suggestions"
                >
                  <ChevronDown className={`h-4 w-4 transition-transform ${showOwnedBySuggestions ? 'rotate-180' : ''}`} />
                </button>
              </div>

              {/* Suggestions Dropdown */}
              {showOwnedBySuggestions && (
                <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-popover border rounded-xl shadow-xl p-1.5 max-h-56 overflow-y-auto text-xs space-y-0.5 animate-fade-in">
                  {/* Default / Common Option */}
                  <button
                    type="button"
                    onClick={() => {
                      form.setValue('owned_by', 'Office Collection')
                      setShowOwnedBySuggestions(false)
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded flex items-center justify-between font-medium transition-colors ${
                      (form.watch('owned_by') || '') === 'Office Collection' ? 'bg-forest/10 text-forest font-semibold' : 'hover:bg-muted text-forest'
                    }`}
                  >
                    <span>🏢 Office Collection (Default)</span>
                    {(form.watch('owned_by') || '') === 'Office Collection' && <Check className="h-3.5 w-3.5 shrink-0" />}
                  </button>

                  <div className="border-t my-1 opacity-50" />
                  <p className="px-2.5 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Office Readers ({employees.length})
                  </p>

                  {employees.filter(e => {
                    const q = (form.watch('owned_by') || '').toLowerCase()
                    return e.full_name.toLowerCase().includes(q) ||
                      (e.department && e.department.toLowerCase().includes(q)) ||
                      (e.employee_code && e.employee_code.toLowerCase().includes(q))
                  }).length === 0 ? (
                    <p className="px-2.5 py-2 text-muted-foreground text-center">
                      No matching readers. Custom owner will be saved.
                    </p>
                  ) : (
                    employees.filter(e => {
                      const q = (form.watch('owned_by') || '').toLowerCase()
                      return e.full_name.toLowerCase().includes(q) ||
                        (e.department && e.department.toLowerCase().includes(q)) ||
                        (e.employee_code && e.employee_code.toLowerCase().includes(q))
                    }).map(emp => {
                      const isSelected = (form.watch('owned_by') || '').toLowerCase() === emp.full_name.toLowerCase()
                      return (
                        <button
                          key={emp.id}
                          type="button"
                          onClick={() => {
                            form.setValue('owned_by', emp.full_name)
                            setShowOwnedBySuggestions(false)
                          }}
                          className={`w-full text-left px-2.5 py-1.5 rounded flex items-center justify-between transition-colors ${
                            isSelected ? 'bg-forest/10 text-forest font-semibold' : 'hover:bg-muted text-foreground'
                          }`}
                        >
                          <div>
                            <p className="font-medium text-foreground">{emp.full_name}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {emp.department || 'General'} · <span className="font-mono">{emp.employee_code}</span>
                            </p>
                          </div>
                          {isSelected && <Check className="h-3.5 w-3.5 text-forest shrink-0" />}
                        </button>
                      )
                    })
                  )}
                </div>
              )}
            </div>

            {/* Shelf Number */}
            <div className="space-y-1.5">
              <Label htmlFor="book-shelf-input">Shelf Number</Label>
              <Input id="book-shelf-input" {...form.register('shelf_number')} placeholder="A-12" />
            </div>

            {/* Date Added */}
            <div className="space-y-1.5">
              <Label htmlFor="book-date-input">Date Added</Label>
              <Input id="book-date-input" type="date" {...form.register('date_added')} />
            </div>

            {/* Cover Image URL */}
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="book-cover-input">Cover Image URL</Label>
              <Input
                id="book-cover-input"
                {...form.register('cover_image_url')}
                placeholder="https://books.google.com/books/content?id=..."
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="book-description-input">Description</Label>
              <Textarea id="book-description-input" {...form.register('description')} placeholder="Book synopsis or notes…" rows={3} />
            </div>
          </div>
        </form>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            id="book-form-submit-btn"
            form="book-form"
            type="submit"
            loading={isPending}
          >
            {isEdit ? 'Save Changes' : 'Add Book'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
