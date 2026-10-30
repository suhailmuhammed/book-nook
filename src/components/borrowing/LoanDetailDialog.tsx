import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { BookCover } from '@/components/ui/book-cover'
import { formatDate, isOverdue, daysOverdue, daysBorrowed } from '@/lib/utils'
import { BookOpen, User, Calendar, RotateCcw, ShieldCheck, CheckCircle2, Clock } from 'lucide-react'
import type { BorrowingWithDetails } from '@/lib/database.types'

interface LoanDetailDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  loan: BorrowingWithDetails | null
  onMarkReturn?: (loan: BorrowingWithDetails) => void
  onEditDueDate?: (loan: BorrowingWithDetails) => void
}

export function LoanDetailDialog({
  open,
  onOpenChange,
  loan,
  onMarkReturn,
  onEditDueDate,
}: LoanDetailDialogProps) {
  if (!loan) return null

  const overdue = isOverdue(loan.due_date, loan.return_date)
  const isReturned = Boolean(loan.return_date)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 text-forest">
            <BookOpen className="h-5 w-5" />
            <DialogTitle className="text-base font-serif">Borrowing Transaction Details</DialogTitle>
          </div>
          <DialogDescription className="text-xs">
            Official record for this book loan transaction.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          {/* Book Header Card */}
          <div className="flex items-start gap-3 p-3.5 rounded-xl border bg-muted/30">
            <BookCover src={loan.book?.cover_image_url} title={loan.book?.title} size="md" />
            <div className="min-w-0 flex-1 space-y-1">
              <h4 className="font-serif font-bold text-sm text-foreground leading-snug">
                {loan.book?.title}
              </h4>
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-mono">
                <span className="bg-background px-1.5 py-0.5 rounded border">
                  ID: {loan.book?.book_code}
                </span>
                <span>·</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                  isReturned
                    ? 'bg-gray-100 text-gray-800'
                    : overdue
                    ? 'bg-red-100 text-red-800'
                    : 'bg-blue-100 text-blue-800'
                }`}>
                  {isReturned ? 'Returned' : overdue ? 'Overdue' : 'On Loan'}
                </span>
              </div>
            </div>
          </div>

          {/* Reader Information */}
          <div className="rounded-xl border p-3 space-y-2 bg-card">
            <h5 className="font-semibold text-xs text-foreground flex items-center gap-1.5 border-b pb-1.5">
              <User className="h-3.5 w-3.5 text-muted-foreground" />
              Reader Details
            </h5>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <span className="text-muted-foreground block text-[10px]">Full Name:</span>
                <strong className="text-foreground">{loan.employee?.full_name}</strong>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px]">Department:</span>
                <span className="text-foreground">{loan.employee?.department || '—'}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px]">Reader Code:</span>
                <span className="font-mono text-foreground">{loan.employee?.employee_code || '—'}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px]">Borrowing Duration:</span>
                <span className="text-foreground">
                  {daysBorrowed(loan.issue_date, loan.return_date)} days {isReturned ? 'total' : 'so far'}
                </span>
              </div>
            </div>
          </div>

          {/* Dates & Status */}
          <div className="rounded-xl border p-3 space-y-2 bg-card">
            <h5 className="font-semibold text-xs text-foreground flex items-center gap-1.5 border-b pb-1.5">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
              Loan Timeline
            </h5>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <span className="text-muted-foreground block text-[10px]">Issue Date:</span>
                <span className="font-medium text-foreground">{formatDate(loan.issue_date)}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px]">Expected Return Date:</span>
                <span className={`font-semibold ${overdue ? 'text-red-600' : 'text-foreground'}`}>
                  {formatDate(loan.due_date)} {overdue && `(${daysOverdue(loan.due_date)}d overdue)`}
                </span>
              </div>
              {loan.return_date && (
                <div>
                  <span className="text-muted-foreground block text-[10px]">Actual Return Date:</span>
                  <span className="font-semibold text-emerald-700">{formatDate(loan.return_date)}</span>
                </div>
              )}
              {loan.return_condition && (
                <div>
                  <span className="text-muted-foreground block text-[10px]">Returned Condition:</span>
                  <span className="font-medium text-foreground">{loan.return_condition}</span>
                </div>
              )}
            </div>

            {loan.issue_remarks && (
              <div className="pt-2 border-t text-[11px]">
                <span className="text-muted-foreground block text-[10px]">Issue Remarks:</span>
                <p className="text-foreground italic mt-0.5">"{loan.issue_remarks}"</p>
              </div>
            )}

            {loan.return_remarks && (
              <div className="pt-2 border-t text-[11px]">
                <span className="text-muted-foreground block text-[10px]">Return Remarks:</span>
                <p className="text-foreground italic mt-0.5">"{loan.return_remarks}"</p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t">
          {!isReturned && onEditDueDate && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                onOpenChange(false)
                onEditDueDate(loan)
              }}
              className="mr-auto text-xs"
            >
              <Calendar className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
              Edit Due Date
            </Button>
          )}

          {!isReturned && onMarkReturn && (
            <Button
              type="button"
              size="sm"
              onClick={() => {
                onOpenChange(false)
                onMarkReturn(loan)
              }}
              className="bg-forest hover:bg-forest-dark text-white text-xs"
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1" />
              Mark as Returned
            </Button>
          )}

          <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

