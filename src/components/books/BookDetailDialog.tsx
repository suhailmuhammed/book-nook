import { useQuery } from '@tanstack/react-query'
import { Edit, ArrowLeftRight, BookOpen, Star, Calendar, Hash, Building, BookMarked, Trash2 } from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { StatusBadge, ConditionBadge } from '@/components/ui/badge'
import { BookCover } from '@/components/ui/book-cover'
import { supabase } from '@/lib/supabase'
import { formatDate, isOverdue, daysOverdue } from '@/lib/utils'
import type { Book, BorrowingWithDetails } from '@/lib/database.types'

interface BookDetailDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  book: Book
  onEdit?: () => void
  onIssue?: () => void
  onDelete?: () => void
}

export function BookDetailDialog({ open, onOpenChange, book, onEdit, onIssue, onDelete }: BookDetailDialogProps) {
  const { data: borrowings = [] } = useQuery({
    queryKey: ['book-borrowings', book.id],
    enabled: open,
    queryFn: async () => {
      const { data } = await supabase
        .from('borrowings')
        .select(`*, employee:employees(id, full_name, department)`)
        .eq('book_id', book.id)
        .order('issue_date', { ascending: false })
        .limit(20)
      return (data ?? []) as unknown as BorrowingWithDetails[]
    },
  })

  const { data: reviews = [] } = useQuery({
    queryKey: ['book-reviews', book.id],
    enabled: open,
    queryFn: async () => {
      const { data } = await supabase
        .from('reviews')
        .select(`*, employee:employees(id, full_name)`)
        .eq('book_id', book.id)
        .order('review_date', { ascending: false })
      return data ?? []
    },
  })

  const avgRating = reviews.length
    ? reviews.reduce((sum: number, r: {rating: number}) => sum + r.rating, 0) / reviews.length
    : null

  const activeLoan = borrowings.find(b => !b.return_date)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start gap-4">
            <BookCover src={book.cover_image_url} title={book.title} size="lg" />
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-xl leading-snug">{book.title}</DialogTitle>
              {book.author && <p className="text-sm text-muted-foreground mt-1">{book.author}</p>}
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                <StatusBadge status={book.status} />
                <ConditionBadge condition={book.condition} />
                <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded">{book.book_code}</span>
              </div>
              {avgRating !== null && (
                <div className="flex items-center gap-1 mt-2">
                  {[1,2,3,4,5].map(s => (
                    <Star key={s} className={`h-3.5 w-3.5 ${s <= Math.round(avgRating) ? 'text-amber-400 fill-amber-400' : 'text-gray-300'}`} />
                  ))}
                  <span className="text-xs text-muted-foreground ml-1">{avgRating.toFixed(1)} ({reviews.length} review{reviews.length !== 1 ? 's' : ''})</span>
                </div>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* Actions */}
        {(onEdit || onIssue || onDelete) && (
          <div className="flex gap-2 flex-wrap items-center">
            {onEdit && (
              <Button id="detail-edit-btn" variant="outline" size="sm" onClick={onEdit}>
                <Edit className="h-4 w-4" /> Edit
              </Button>
            )}
            {onIssue && book.status === 'Available' && (
              <Button id="detail-issue-btn" size="sm" onClick={onIssue}>
                <ArrowLeftRight className="h-4 w-4" /> Issue Book
              </Button>
            )}
            {onDelete && (
              <Button
                id="detail-delete-btn"
                variant="outline"
                size="sm"
                className="text-destructive hover:bg-destructive/10 hover:text-destructive sm:ml-auto"
                onClick={onDelete}
              >
                <Trash2 className="h-4 w-4" /> Delete Book
              </Button>
            )}
          </div>
        )}

        {/* Active Loan Alert */}
        {activeLoan && (
          <div className={`rounded-lg border p-3 text-sm ${isOverdue(activeLoan.due_date, null) ? 'border-red-200 bg-red-50' : 'border-blue-200 bg-blue-50'}`}>
            <p className="font-medium">
              {isOverdue(activeLoan.due_date, null) ? '⚠ Overdue — ' : '📖 Currently borrowed by '}
              {(activeLoan.employee as {full_name: string})?.full_name}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Issued {formatDate(activeLoan.issue_date)} · Due {formatDate(activeLoan.due_date)}
              {isOverdue(activeLoan.due_date, null) && ` · ${daysOverdue(activeLoan.due_date)} days overdue`}
            </p>
          </div>
        )}

        {/* Details grid */}
        <div className="grid sm:grid-cols-2 gap-3 text-sm">
          {[
            { icon: BookOpen, label: 'ISBN', value: book.isbn },
            { icon: Building, label: 'Publisher', value: book.publisher },
            { icon: Calendar, label: 'Published', value: book.published_year?.toString() },
            { icon: Hash, label: 'Pages', value: book.page_count?.toString() },
            { icon: BookMarked, label: 'Category', value: book.category },
            { icon: BookOpen, label: 'Language', value: book.language },
            { icon: Building, label: 'Owned By', value: book.owned_by },
            { icon: Hash, label: 'Shelf', value: book.shelf_number },
            { icon: Calendar, label: 'Date Added', value: formatDate(book.date_added) },
            { icon: Calendar, label: 'Last Updated', value: formatDate(book.updated_at) },
          ].filter(i => i.value).map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-center gap-2">
              <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="text-muted-foreground min-w-[80px]">{label}</span>
              <span className="font-medium">{value}</span>
            </div>
          ))}
        </div>

        {/* Description */}
        {book.description && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Description</p>
            <p className="text-sm leading-relaxed text-muted-foreground line-clamp-4">{book.description}</p>
          </div>
        )}

        {/* Borrowing History */}
        {borrowings.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Borrowing History</p>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {borrowings.map(loan => (
                <div key={loan.id} className="flex items-center gap-3 text-xs p-2 rounded bg-muted/40">
                  <div className="flex-1">
                    <span className="font-medium">{(loan.employee as {full_name: string})?.full_name}</span>
                    <span className="text-muted-foreground"> · {formatDate(loan.issue_date)} → {loan.return_date ? formatDate(loan.return_date) : <span className="text-blue-600">Active</span>}</span>
                  </div>
                  {!loan.return_date && isOverdue(loan.due_date, null) && (
                    <span className="text-red-600 font-semibold">OVERDUE</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
