import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { RotateCcw, Plus, Filter, AlertTriangle, CheckCircle2, Trash2, Calendar, User, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { BookCover } from '@/components/ui/book-cover'
import { EmptyState, LoadingRows, ErrorMessage } from '@/components/ui/states'
import { useBorrowings, useDeleteBorrowing } from '@/hooks/use-borrowings'
import { formatDate, isOverdue, daysOverdue, daysBorrowed } from '@/lib/utils'
import { IssueBookDialog } from '@/components/borrowing/IssueBookDialog'
import { ReturnBookDialog } from '@/components/borrowing/ReturnBookDialog'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog'
import type { BorrowingWithDetails } from '@/lib/database.types'

type LoanStatus = 'active' | 'returned' | 'overdue' | 'all'

export default function BorrowingPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [status, setStatus] = useState<LoanStatus>((searchParams.get('status') as LoanStatus) ?? 'all')
  const [page, setPage]     = useState(1)
  const [issueOpen, setIssueOpen]   = useState(false)
  const [returnLoan, setReturnLoan] = useState<BorrowingWithDetails | null>(null)
  const [deleteLoanTarget, setDeleteLoanTarget] = useState<BorrowingWithDetails | null>(null)
  const deleteBorrowing = useDeleteBorrowing()

  const { data, isLoading, error } = useBorrowings({ status, page, pageSize: 20 })
  const loans = data?.borrowings ?? []
  const total = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / 20))

  function handleStatusChange(val: string) {
    setStatus(val as LoanStatus)
    setPage(1)
    const p = new URLSearchParams(searchParams)
    p.set('status', val)
    setSearchParams(p, { replace: true })
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="page-header flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-serif text-foreground">Borrowing & Returns</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {total} loan record{total !== 1 ? 's' : ''} in library system
          </p>
        </div>
        <Button
          id="issue-book-page-btn"
          onClick={() => setIssueOpen(true)}
          size="sm"
          className="bg-forest hover:bg-forest-dark text-white font-medium h-9 shadow-xs self-start sm:self-auto"
        >
          <Plus className="h-4 w-4 mr-1" />
          Issue Book
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap items-center">
        <Select value={status} onValueChange={handleStatusChange}>
          <SelectTrigger id="loan-status-filter" className="w-[160px] h-9 text-xs">
            <Filter className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">All Loans</SelectItem>
            <SelectItem value="active" className="text-xs">Active Loans</SelectItem>
            <SelectItem value="overdue" className="text-xs">Overdue Loans</SelectItem>
            <SelectItem value="returned" className="text-xs">Returned</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Content Container */}
      <div className="rounded-xl border bg-card overflow-hidden shadow-2xs">
        {error ? (
          <div className="p-6"><ErrorMessage message="Failed to load loans." /></div>
        ) : isLoading ? (
          <div className="p-6">
            <LoadingRows columns={8} rows={8} />
          </div>
        ) : loans.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon={RotateCcw}
              title="No loans found"
              description="No records match the selected filter."
              action={
                <Button size="sm" onClick={() => setIssueOpen(true)} className="bg-forest hover:bg-forest-dark text-white">
                  <Plus className="h-4 w-4 mr-1" />Issue Book
                </Button>
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
                    <th>Book</th>
                    <th>Employee</th>
                    <th>Issue Date</th>
                    <th>Due Date</th>
                    <th>Return Date</th>
                    <th>Days</th>
                    <th>Status</th>
                    <th className="w-28 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loans.map(loan => {
                    const overdue = isOverdue(loan.due_date, loan.return_date)
                    const days    = daysBorrowed(loan.issue_date, loan.return_date)
                    const active  = !loan.return_date

                    return (
                      <tr key={loan.id} className={overdue ? 'bg-red-50/50' : 'hover:bg-muted/30 transition-colors'}>
                        <td>
                          <BookCover src={loan.book?.cover_image_url} title={loan.book?.title ?? ''} size="sm" />
                        </td>
                        <td>
                          <p className="font-medium text-sm leading-tight">{loan.book?.title}</p>
                          <p className="text-xs font-mono text-primary">{loan.book?.book_code}</p>
                        </td>
                        <td>
                          <p className="text-sm font-medium">{loan.employee?.full_name}</p>
                          <p className="text-xs text-muted-foreground">{loan.employee?.department}</p>
                        </td>
                        <td className="text-sm text-muted-foreground">{formatDate(loan.issue_date)}</td>
                        <td className={`text-sm ${overdue ? 'font-semibold text-red-600' : 'text-muted-foreground'}`}>
                          {formatDate(loan.due_date)}
                          {overdue && (
                            <span className="block text-xs font-normal text-red-600">{daysOverdue(loan.due_date)}d late</span>
                          )}
                        </td>
                        <td className="text-sm text-muted-foreground">
                          {loan.return_date ? formatDate(loan.return_date) : <span className="text-blue-600 text-xs font-medium">Active</span>}
                        </td>
                        <td className="text-sm text-muted-foreground">{days}d</td>
                        <td>
                          {active ? (
                            overdue ? (
                              <div className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 bg-red-100/60 px-2 py-0.5 rounded-full">
                                <AlertTriangle className="h-3 w-3" /> Overdue
                              </div>
                            ) : (
                              <div className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                                Active
                              </div>
                            )
                          ) : (
                            <div className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                              <CheckCircle2 className="h-3 w-3" /> Returned
                            </div>
                          )}
                        </td>
                        <td className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {active && (
                              <Button
                                id={`return-loan-${loan.id}`}
                                size="sm"
                                variant="outline"
                                className="text-xs h-8 gap-1 border-forest/30 text-forest hover:bg-forest/5"
                                onClick={() => setReturnLoan(loan)}
                              >
                                <RotateCcw className="h-3.5 w-3.5" />
                                Return
                              </Button>
                            )}
                            <button
                              id={`delete-loan-${loan.id}-btn`}
                              className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                              onClick={() => setDeleteLoanTarget(loan)}
                              aria-label="Delete loan record"
                              title="Delete loan record"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View */}
            <div className="md:hidden divide-y divide-border/60">
              {loans.map(loan => {
                const overdue = isOverdue(loan.due_date, loan.return_date)
                const days    = daysBorrowed(loan.issue_date, loan.return_date)
                const active  = !loan.return_date

                return (
                  <div
                    key={loan.id}
                    className={`p-4 flex items-start gap-3 transition-colors ${overdue ? 'bg-red-50/40' : 'hover:bg-muted/20'}`}
                  >
                    <div className="flex-shrink-0">
                      <BookCover src={loan.book?.cover_image_url} title={loan.book?.title ?? ''} size="sm" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-mono text-[11px] font-bold text-forest bg-forest/5 px-1.5 py-0.5 rounded border border-forest/15">
                          {loan.book?.book_code}
                        </span>
                        {active ? (
                          overdue ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-100/70 px-2 py-0.5 rounded-full">
                              <AlertTriangle className="h-2.5 w-2.5" /> {daysOverdue(loan.due_date)}d Overdue
                            </span>
                          ) : (
                            <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                              Active Loan
                            </span>
                          )
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                            <CheckCircle2 className="h-2.5 w-2.5" /> Returned
                          </span>
                        )}
                      </div>

                      <h3 className="font-medium text-sm text-foreground line-clamp-1 leading-tight">
                        {loan.book?.title}
                      </h3>

                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <User className="h-3 w-3 text-muted-foreground/70" />
                        <span className="font-medium text-foreground">{loan.employee?.full_name}</span>
                        {loan.employee?.department && (
                          <span className="text-[11px]">({loan.employee?.department})</span>
                        )}
                      </p>

                      <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-border/40 text-[11px] text-muted-foreground">
                        <div>
                          <span className="block text-[10px] uppercase font-semibold text-muted-foreground/70">Issued</span>
                          <span>{formatDate(loan.issue_date)}</span>
                        </div>
                        <div>
                          <span className="block text-[10px] uppercase font-semibold text-muted-foreground/70">
                            {active ? 'Due Date' : 'Returned'}
                          </span>
                          <span className={overdue ? 'font-semibold text-red-600' : ''}>
                            {active ? formatDate(loan.due_date) : formatDate(loan.return_date)}
                          </span>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center justify-between gap-2 mt-3 pt-2 border-t border-border/40">
                        <span className="text-[11px] text-muted-foreground">
                          {days} day{days !== 1 ? 's' : ''} total
                        </span>
                        <div className="flex items-center gap-2">
                          {active && (
                            <Button
                              id={`mobile-return-loan-${loan.id}`}
                              size="sm"
                              variant="outline"
                              className="text-xs h-8 gap-1.5 border-forest text-forest hover:bg-forest hover:text-white"
                              onClick={() => setReturnLoan(loan)}
                            >
                              <RotateCcw className="h-3 w-3" />
                              Record Return
                            </Button>
                          )}
                          <button
                            id={`mobile-delete-loan-${loan.id}-btn`}
                            className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                            onClick={() => setDeleteLoanTarget(loan)}
                            aria-label="Delete loan record"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
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
              id="loan-prev-btn"
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
              className="h-8 text-xs"
            >
              Previous
            </Button>
            <Button
              id="loan-next-btn"
              variant="outline"
              size="sm"
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
      <IssueBookDialog open={issueOpen} onOpenChange={setIssueOpen} />
      {returnLoan && (
        <ReturnBookDialog
          open={!!returnLoan}
          onOpenChange={open => !open && setReturnLoan(null)}
          loan={returnLoan}
        />
      )}

      {/* Delete Borrowing Record Confirmation Dialog */}
      <Dialog open={!!deleteLoanTarget} onOpenChange={open => !open && setDeleteLoanTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              <DialogTitle>Delete Borrowing Record</DialogTitle>
            </div>
            <DialogDescription className="pt-2">
              Are you sure you want to delete the borrowing record for <strong className="text-foreground">{deleteLoanTarget?.book?.title}</strong> borrowed by <strong className="text-foreground">{(deleteLoanTarget?.employee as any)?.full_name}</strong>?
              {!deleteLoanTarget?.return_date && (
                <span className="block mt-2 font-medium text-amber-600">
                  ⚠ Note: This loan is currently active. Deleting this record will automatically restore the book's status back to Available.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setDeleteLoanTarget(null)}
              disabled={deleteBorrowing.isPending}
            >
              Cancel
            </Button>
            <Button
              id="confirm-delete-loan-btn"
              variant="destructive"
              loading={deleteBorrowing.isPending}
              onClick={async () => {
                if (deleteLoanTarget) {
                  await deleteBorrowing.mutateAsync(deleteLoanTarget.id)
                  setDeleteLoanTarget(null)
                }
              }}
            >
              <Trash2 className="h-4 w-4 mr-1.5" />
              Delete Record
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
