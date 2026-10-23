import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import {
  Plus, Search, Filter, Download, Upload, BookOpen, MoreHorizontal,
  Archive, Edit, Eye, ArrowLeftRight, Trash2, AlertTriangle, X
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { StatusBadge, ConditionBadge } from '@/components/ui/badge'
import { BookCover } from '@/components/ui/book-cover'
import { EmptyState, LoadingRows, ErrorMessage } from '@/components/ui/states'
import { useBooks, useBookCategories, useArchiveBook, useDeleteBook } from '@/hooks/use-books'
import { formatDate } from '@/lib/utils'
import { BookFormDialog } from '@/components/books/BookFormDialog'
import { BookDetailDialog } from '@/components/books/BookDetailDialog'
import { IssueBookDialog } from '@/components/borrowing/IssueBookDialog'
import { ImportWizardDialog } from '@/components/import/ImportWizardDialog'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import type { Book } from '@/lib/database.types'

const STATUSES = ['all', 'Available', 'Borrowed', 'Reserved', 'Lost', 'Under Repair']
const CONDITIONS = ['all', 'Excellent', 'Good', 'Fair', 'Poor']

export default function BooksPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const archiveBook = useArchiveBook()
  const deleteBook = useDeleteBook()

  const [search, setSearch]                 = useState(searchParams.get('search') ?? '')
  const [status, setStatus]                 = useState(searchParams.get('status') ?? 'all')
  const [category, setCategory]             = useState(searchParams.get('category') ?? 'all')
  const [condition, setCondition]           = useState(searchParams.get('condition') ?? 'all')
  const [page, setPage]                     = useState(1)
  const [addOpen, setAddOpen]               = useState(searchParams.get('action') === 'add')
  const [importOpen, setImportOpen]         = useState(false)
  const [editBook, setEditBook]             = useState<Book | null>(null)
  const [viewBook, setViewBook]             = useState<Book | null>(null)
  const [deleteBookTarget, setDeleteBookTarget] = useState<Book | null>(null)
  const [issueBookId, setIssueBookId]       = useState<string | undefined>()
  const [menuBookId, setMenuBookId]         = useState<string | null>(null)

  const { data, isLoading, error } = useBooks({ search, status, category, condition, page, pageSize: 20 })
  const { data: categories = [] } = useBookCategories()

  // Clear action param after opening
  useEffect(() => {
    if (searchParams.get('action') === 'add') {
      setAddOpen(true)
      const p = new URLSearchParams(searchParams)
      p.delete('action')
      setSearchParams(p, { replace: true })
    }
  }, [searchParams, setSearchParams])

  const books = data?.books ?? []
  const total = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / 20))

  const isFiltered = !!search || status !== 'all' || category !== 'all' || condition !== 'all'

  function handleSearch(val: string) {
    setSearch(val)
    setPage(1)
  }

  function handleClearFilters() {
    setSearch('')
    setStatus('all')
    setCategory('all')
    setCondition('all')
    setPage(1)
  }

  async function handleArchive(bookId: string) {
    if (confirm('Archive this book? It will be hidden from the active catalog.')) {
      await archiveBook.mutateAsync(bookId)
      setMenuBookId(null)
    }
  }

  function renderActionMenu(book: Book) {
    return (
      <div className="relative">
        <button
          className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          onClick={e => {
            e.stopPropagation()
            setMenuBookId(menuBookId === book.id ? null : book.id)
          }}
          aria-label="Book actions"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
        {menuBookId === book.id && (
          <>
            <div className="fixed inset-0 z-30" onClick={e => { e.stopPropagation(); setMenuBookId(null) }} />
            <div
              className="absolute right-0 top-full mt-1 w-44 rounded-xl border bg-popover shadow-xl z-40 py-1.5 animate-fade-in text-foreground text-left"
              onClick={e => e.stopPropagation()}
            >
              <button
                className="flex items-center gap-2.5 w-full px-3.5 py-2 text-xs font-medium hover:bg-muted transition-colors text-left"
                onClick={() => { setViewBook(book); setMenuBookId(null) }}
              >
                <Eye className="h-4 w-4 text-muted-foreground" /> View Details
              </button>
              <button
                className="flex items-center gap-2.5 w-full px-3.5 py-2 text-xs font-medium hover:bg-muted transition-colors text-left"
                onClick={() => { setEditBook(book); setMenuBookId(null) }}
              >
                <Edit className="h-4 w-4 text-muted-foreground" /> Edit Book
              </button>
              {book.status === 'Available' && (
                <button
                  className="flex items-center gap-2.5 w-full px-3.5 py-2 text-xs font-medium hover:bg-muted transition-colors text-emerald-700 dark:text-emerald-400 text-left"
                  onClick={() => { setIssueBookId(book.id); setMenuBookId(null) }}
                >
                  <ArrowLeftRight className="h-4 w-4" /> Issue Book
                </button>
              )}
              <div className="border-t my-1" />
              <button
                className="flex items-center gap-2.5 w-full px-3.5 py-2 text-xs font-medium hover:bg-amber-500/10 transition-colors text-amber-600 dark:text-amber-400 text-left"
                onClick={() => handleArchive(book.id)}
              >
                <Archive className="h-4 w-4" /> Archive Book
              </button>
              <button
                id={`delete-book-${book.id}-btn`}
                className="flex items-center gap-2.5 w-full px-3.5 py-2 text-xs font-medium hover:bg-destructive/10 transition-colors text-destructive text-left"
                onClick={() => { setDeleteBookTarget(book); setMenuBookId(null) }}
              >
                <Trash2 className="h-4 w-4" /> Delete Book
              </button>
            </div>
          </>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="page-header flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-serif text-foreground">Book Catalog</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {total > 0 ? `${total} book${total !== 1 ? 's' : ''} in the catalog` : 'Manage your office library'}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <Button id="import-books-btn" variant="outline" size="sm" onClick={() => setImportOpen(true)} className="h-9">
            <Upload className="h-4 w-4 mr-1.5 sm:mr-1" />
            <span>Import</span>
          </Button>
          <Button id="export-books-btn" variant="outline" size="sm" onClick={() => navigate('/reports?tab=export')} className="h-9">
            <Download className="h-4 w-4 mr-1.5 sm:mr-1" />
            <span>Export</span>
          </Button>
          <Button id="add-book-btn" onClick={() => setAddOpen(true)} size="sm" className="bg-forest hover:bg-forest-dark text-white font-medium h-9 shadow-xs">
            <Plus className="h-4 w-4 mr-1" />
            Add Book
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="book-search-input"
            placeholder="Search by title, author, ISBN, Book ID…"
            className="pl-9 h-9 text-sm"
            value={search}
            onChange={e => handleSearch(e.target.value)}
          />
        </div>

        <Select value={status} onValueChange={v => { setStatus(v); setPage(1) }}>
          <SelectTrigger id="status-filter" className="w-[140px] h-9 text-xs">
            <Filter className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUSES.map(s => (
              <SelectItem key={s} value={s} className="text-xs">{s === 'all' ? 'All Statuses' : s}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={category} onValueChange={v => { setCategory(v); setPage(1) }}>
          <SelectTrigger id="category-filter" className="w-[140px] h-9 text-xs">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">All Categories</SelectItem>
            {categories.map(c => <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={condition} onValueChange={v => { setCondition(v); setPage(1) }}>
          <SelectTrigger id="condition-filter" className="w-[130px] h-9 text-xs">
            <SelectValue placeholder="Condition" />
          </SelectTrigger>
          <SelectContent>
            {CONDITIONS.map(c => (
              <SelectItem key={c} value={c}>{c === 'all' ? 'All Conditions' : c}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {isFiltered && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearFilters}
            className="text-xs text-muted-foreground hover:text-foreground h-9 px-2.5"
          >
            <X className="h-3.5 w-3.5 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {/* Listing (Responsive Table for Desktop, Compact Cards for Mobile) */}
      <div className="rounded-xl border bg-card overflow-hidden shadow-2xs">
        {error ? (
          <div className="p-6"><ErrorMessage message="Failed to load books." /></div>
        ) : isLoading ? (
          <div className="p-6">
            <LoadingRows columns={6} rows={6} />
          </div>
        ) : books.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon={BookOpen}
              title="No books found"
              description={search ? 'Try adjusting your search or filters.' : 'Add your first book to get started.'}
              action={
                !search && (
                  <Button onClick={() => setAddOpen(true)} size="sm" className="bg-forest hover:bg-forest-dark text-white">
                    <Plus className="h-4 w-4 mr-1" />Add Book
                  </Button>
                )
              }
            />
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th className="w-12">Cover</th>
                    <th>Book ID</th>
                    <th>Title / Author</th>
                    <th>Category</th>
                    <th>Status</th>
                    <th>Condition</th>
                    <th>Date Added</th>
                    <th className="w-16 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {books.map(book => (
                    <tr key={book.id} className="cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => setViewBook(book)}>
                      <td onClick={e => e.stopPropagation()}>
                        <BookCover src={book.cover_image_url} title={book.title} size="sm" />
                      </td>
                      <td>
                        <span className="font-mono text-xs font-semibold text-primary">{book.book_code}</span>
                      </td>
                      <td>
                        <p className="font-medium text-sm leading-tight">{book.title}</p>
                        {book.author && <p className="text-xs text-muted-foreground">{book.author}</p>}
                      </td>
                      <td>
                        {book.category ? (
                          <span className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded font-medium">
                            {book.category}
                          </span>
                        ) : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td><StatusBadge status={book.status} /></td>
                      <td><ConditionBadge condition={book.condition} /></td>
                      <td className="text-sm text-muted-foreground">{formatDate(book.date_added)}</td>
                      <td onClick={e => e.stopPropagation()} className="text-right">
                        {renderActionMenu(book)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View */}
            <div className="md:hidden divide-y divide-border/60">
              {books.map(book => (
                <div
                  key={book.id}
                  className="p-3.5 flex items-start gap-3 hover:bg-muted/20 transition-colors"
                >
                  {/* Small cover thumbnail */}
                  <div
                    onClick={() => setViewBook(book)}
                    className="cursor-pointer flex-shrink-0"
                  >
                    <BookCover src={book.cover_image_url} title={book.title} size="sm" />
                  </div>

                  {/* Book Details */}
                  <div
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={() => setViewBook(book)}
                  >
                    <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                      <span className="font-mono text-[11px] font-bold text-forest bg-forest/5 px-1.5 py-0.5 rounded border border-forest/15">
                        {book.book_code}
                      </span>
                      <StatusBadge status={book.status} />
                    </div>

                    <h3 className="font-medium text-sm leading-tight text-foreground line-clamp-1">
                      {book.title}
                    </h3>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {book.author || 'Unknown Author'}
                    </p>

                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      {book.category && (
                        <span className="text-[10px] bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full font-medium">
                          {book.category}
                        </span>
                      )}
                      <ConditionBadge condition={book.condition} />
                      {book.shelf_number && (
                        <span className="text-[10px] text-muted-foreground font-mono">
                          Shelf {book.shelf_number}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions Overflow Menu */}
                  <div className="flex-shrink-0 pt-0.5" onClick={e => e.stopPropagation()}>
                    {renderActionMenu(book)}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground text-xs">
            Showing {(page - 1) * 20 + 1}–{Math.min(page * 20, total)} of {total}
          </span>
          <div className="flex gap-1">
            <Button
              id="prev-page-btn"
              variant="outline" size="sm"
              disabled={page === 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="h-8 text-xs"
            >
              Previous
            </Button>
            <Button
              id="next-page-btn"
              variant="outline" size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage(p => p + 1)}
              className="h-8 text-xs"
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Dialogs */}
      {addOpen && (
        <BookFormDialog open={addOpen} onOpenChange={setAddOpen} />
      )}

      {editBook && (
        <BookFormDialog
          open={!!editBook}
          onOpenChange={open => !open && setEditBook(null)}
          book={editBook}
        />
      )}

      {viewBook && (
        <BookDetailDialog
          open={!!viewBook}
          onOpenChange={open => !open && setViewBook(null)}
          book={viewBook}
          onEdit={() => {
            setEditBook(viewBook)
            setViewBook(null)
          }}
          onIssue={() => {
            setIssueBookId(viewBook.id)
            setViewBook(null)
          }}
          onDelete={() => {
            setDeleteBookTarget(viewBook)
            setViewBook(null)
          }}
        />
      )}

      {issueBookId && (
        <IssueBookDialog
          open={!!issueBookId}
          onOpenChange={open => !open && setIssueBookId(undefined)}
          defaultBookId={issueBookId}
        />
      )}

      {importOpen && (
        <ImportWizardDialog
          open={importOpen}
          onOpenChange={setImportOpen}
        />
      )}

      {/* Delete Confirmation Dialog */}
      {deleteBookTarget && (
        <Dialog open={!!deleteBookTarget} onOpenChange={open => !open && setDeleteBookTarget(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <div className="w-10 h-10 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mb-2">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <DialogTitle>Delete Book</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete <strong className="text-foreground">"{deleteBookTarget.title}"</strong> ({deleteBookTarget.book_code})?
                This action cannot be undone if the book has no borrowing history.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex gap-2 sm:justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteBookTarget(null)}
                disabled={deleteBook.isPending}
              >
                Cancel
              </Button>
              <Button
                id="confirm-delete-book-btn"
                variant="destructive"
                size="sm"
                loading={deleteBook.isPending}
                onClick={async () => {
                  try {
                    await deleteBook.mutateAsync(deleteBookTarget.id)
                    setDeleteBookTarget(null)
                  } catch (e) {
                    // error handled in mutation
                  }
                }}
              >
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
