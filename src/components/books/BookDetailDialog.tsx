import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Edit, ArrowLeftRight, Calendar, Hash, User, Trash2, Users,
  Clock, CheckCircle, Sparkles, AlertCircle, BookOpen, Bookmark
} from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { StatusBadge, ConditionBadge } from '@/components/ui/badge'
import { BookCover } from '@/components/ui/book-cover'
import { supabase } from '@/lib/supabase'
import { formatDate, isOverdue, daysOverdue } from '@/lib/utils'
import { useBookWaitingList, useJoinWaitingList } from '@/hooks/use-requests'
import { toast } from '@/hooks/use-toast'
import type { Book, BorrowingWithDetails } from '@/lib/database.types'

interface BookDetailDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  book: Book
  onEdit?: () => void
  onIssue?: () => void
  onDelete?: () => void
  visitorEmpId?: string
  visitorName?: string
  isAdmin?: boolean
  onPromptSelectVisitor?: () => void
}

export function BookDetailDialog({
  open,
  onOpenChange,
  book,
  onEdit,
  onIssue,
  onDelete,
  visitorEmpId,
  visitorName,
  isAdmin,
  onPromptSelectVisitor,
}: BookDetailDialogProps) {
  const [showQueueDetails, setShowQueueDetails] = useState(false)
  const joinMutation = useJoinWaitingList()

  // 1. Fetch active borrowing details
  const { data: borrowings = [] } = useQuery({
    queryKey: ['book-borrowings', book.id],
    enabled: open,
    queryFn: async () => {
      const { data } = await supabase
        .from('borrowings')
        .select(`*, employee:employees(id, full_name, department)`)
        .eq('book_id', book.id)
        .order('issue_date', { ascending: false })
        .limit(10)
      return (data ?? []) as unknown as BorrowingWithDetails[]
    },
  })

  // 2. Fetch waiting list for this book
  const { data: waitingList = [] } = useBookWaitingList(open ? book.id : undefined)

  const activeLoan = borrowings.find(b => !b.return_date)
  const activeCount = waitingList.length
  const isCurrentBorrower = Boolean(visitorEmpId && activeLoan && activeLoan.employee_id === visitorEmpId)
  const visitorActiveRequest = visitorEmpId
    ? waitingList.find(r => r.employee_id === visitorEmpId)
    : null
  const isVisitorInQueue = !!visitorActiveRequest
  const queuePos = visitorActiveRequest
    ? waitingList.findIndex(r => r.id === visitorActiveRequest.id) + 1
    : 0

  async function handleRequestBook(actionType: 'REQUEST' | 'WAITLIST') {
    if (!visitorEmpId) {
      toast({
        title: 'Please Select Your Name',
        description: 'Please select your name from the reader dropdown to submit a request.',
        variant: 'destructive',
      })
      if (onPromptSelectVisitor) {
        onPromptSelectVisitor()
      }
      return
    }

    try {
      await joinMutation.mutateAsync({
        bookId: book.id,
        employeeId: visitorEmpId,
        actionType,
      })
      toast({
        title: actionType === 'REQUEST' ? 'Book Requested Successfully!' : 'Joined Waiting List!',
        description: actionType === 'REQUEST'
          ? `Your request for "${book.title}" has been registered.`
          : `You are #${activeCount + 1} in line for "${book.title}".`,
      })
    } catch (err: any) {
      toast({
        title: 'Request Failed',
        description: err?.message || 'Could not submit book request.',
        variant: 'destructive',
      })
    }
  }

  // Derive display status
  const displayStatus = book.status === 'Borrowed' ? 'On Loan' : book.status

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start gap-4">
            <BookCover src={book.cover_image_url} title={book.title} size="lg" />
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-xl font-serif leading-snug">{book.title}</DialogTitle>
              {book.author && <p className="text-sm text-muted-foreground mt-0.5">{book.author}</p>}

              {/* Exact Status & Badges */}
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                <StatusBadge status={book.status} />
                <ConditionBadge condition={book.condition} />
                <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded text-foreground font-semibold">
                  {book.book_code}
                </span>

                {/* Waiting list count badge */}
                {activeCount > 0 && (
                  <span className="inline-flex items-center gap-1 text-xs font-medium bg-amber-50 text-amber-900 border border-amber-200/80 px-2.5 py-0.5 rounded-full">
                    <Users className="h-3 w-3 text-amber-700" />
                    Waiting list: {activeCount} {activeCount === 1 ? 'reader' : 'readers'}
                  </span>
                )}
              </div>

              {/* Active visitor context indication */}
              <div className="mt-2 text-xs text-muted-foreground">
                {visitorName ? (
                  <span>Browsing as: <strong className="text-foreground">{visitorName}</strong></span>
                ) : (
                  <button
                    onClick={onPromptSelectVisitor}
                    className="text-forest hover:underline inline-flex items-center gap-1 font-medium"
                  >
                    <User className="h-3 w-3" /> Select your name to request this book
                  </button>
                )}
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Action Toolbar */}
        <div className="flex gap-2 flex-wrap items-center pt-2">
          {/* 1. If currently borrowed by this visitor */}
          {isCurrentBorrower ? (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-900 border border-blue-200 text-xs font-semibold">
              <BookOpen className="h-4 w-4 text-blue-700 shrink-0" />
              <span>Currently Borrowed by You (Due {formatDate(activeLoan?.due_date)})</span>
            </div>
          ) : isVisitorInQueue ? (
            /* 2. If visitor already has an active request / spot in queue */
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-medium">
              <CheckCircle className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
              <span>
                {visitorActiveRequest?.status === 'Ready for Pickup'
                  ? '🎉 Ready for Pickup at Library Desk!'
                  : `Request Submitted · Queue Position #${queuePos}`}
              </span>
            </div>
          ) : book.status === 'Available' ? (
            /* 3. Book is Available: Show Request This Book */
            <div className="flex items-center gap-2">
              <Button
                id="request-book-btn"
                size="sm"
                onClick={() => handleRequestBook('REQUEST')}
                disabled={joinMutation.isPending}
                className="bg-forest hover:bg-forest-dark text-white font-medium"
              >
                <Bookmark className="h-4 w-4 mr-1.5" />
                {joinMutation.isPending ? 'Requesting…' : 'Request This Book'}
              </Button>
              {onIssue && (
                <Button id="detail-issue-btn" size="sm" variant="outline" onClick={onIssue} className="text-xs">
                  <ArrowLeftRight className="h-3.5 w-3.5 mr-1" /> Issue Book
                </Button>
              )}
            </div>
          ) : (
            /* 4. Book is On Loan / Unavailable: Show Join Waiting List */
            <Button
              id="join-waitlist-btn"
              size="sm"
              onClick={() => handleRequestBook('WAITLIST')}
              disabled={joinMutation.isPending}
              className="bg-amber-600 hover:bg-amber-700 text-white font-medium"
            >
              <Users className="h-4 w-4 mr-1.5" />
              {joinMutation.isPending ? 'Joining…' : 'Join Waiting List'}
            </Button>
          )}

          {/* Authorized View Waiting List */}
          {activeCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowQueueDetails(v => !v)}
              className="text-xs"
            >
              <Users className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
              {showQueueDetails ? 'Hide Waiting List' : 'View Waiting List'}
            </Button>
          )}

          {/* Admin Actions */}
          {onEdit && (
            <Button id="detail-edit-btn" variant="outline" size="sm" onClick={onEdit} className="text-xs">
              <Edit className="h-3.5 w-3.5 mr-1" /> Edit
            </Button>
          )}
          {onDelete && (
            <Button
              id="detail-delete-btn"
              variant="outline"
              size="sm"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive sm:ml-auto text-xs"
              onClick={onDelete}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
            </Button>
          )}
        </div>

        {/* Current Borrower Info when On Loan */}
        {activeLoan && (
          <div className={`rounded-xl border p-4 text-sm ${
            isOverdue(activeLoan.due_date, null) ? 'border-red-200 bg-red-50/70 text-red-950' : 'border-blue-200 bg-blue-50/70 text-blue-950'
          }`}>
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold text-sm flex items-center gap-1.5">
                  <User className="h-4 w-4 text-muted-foreground" />
                  Currently borrowed by: {(activeLoan.employee as any)?.full_name || 'Reader'}
                </p>
                {(activeLoan.employee as any)?.department && (
                  <p className="text-xs text-muted-foreground mt-0.5 ml-5">
                    Department: <span className="font-medium text-foreground">{(activeLoan.employee as any)?.department}</span>
                  </p>
                )}
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                isOverdue(activeLoan.due_date, null) ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
              }`}>
                {isOverdue(activeLoan.due_date, null) ? `${daysOverdue(activeLoan.due_date)}d overdue` : 'On Loan'}
              </span>
            </div>
            <div className="mt-2.5 pt-2 border-t border-border/40 grid grid-cols-2 text-xs">
              <div>
                <span className="text-muted-foreground">Issued: </span>
                <span className="font-medium">{formatDate(activeLoan.issue_date)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Expected Return: </span>
                <span className="font-medium">{formatDate(activeLoan.due_date)}</span>
              </div>
            </div>
          </div>
        )}

        {/* REQUIRED EXACT FIELDS ONLY (Per User Specification) */}
        <div className="bg-muted/30 rounded-xl p-4 border border-border/70 space-y-2.5 text-sm">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
            Book Information
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className="flex items-center justify-between sm:justify-start gap-2">
              <span className="text-muted-foreground text-xs font-medium min-w-[110px]">Status:</span>
              <span className="font-semibold text-xs">
                {displayStatus}
              </span>
            </div>

            <div className="flex items-center justify-between sm:justify-start gap-2">
              <span className="text-muted-foreground text-xs font-medium min-w-[110px]">Condition:</span>
              <span className="font-medium text-xs">{book.condition}</span>
            </div>

            <div className="flex items-center justify-between sm:justify-start gap-2">
              <span className="text-muted-foreground text-xs font-medium min-w-[110px]">Book ID:</span>
              <span className="font-mono font-semibold text-xs">{book.book_code}</span>
            </div>

            <div className="flex items-center justify-between sm:justify-start gap-2">
              <span className="text-muted-foreground text-xs font-medium min-w-[110px]">Owned By:</span>
              <span className="font-medium text-xs">{book.owned_by || '—'}</span>
            </div>

            <div className="flex items-center justify-between sm:justify-start gap-2">
              <span className="text-muted-foreground text-xs font-medium min-w-[110px]">Date Added:</span>
              <span className="font-medium text-xs">{formatDate(book.date_added)}</span>
            </div>
          </div>
        </div>

        {/* Description */}
        {book.description && (
          <div className="space-y-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">About this book</p>
            <p className="text-sm leading-relaxed text-muted-foreground">{book.description}</p>
          </div>
        )}

        {/* Authorized Waiting List View */}
        {showQueueDetails && waitingList.length > 0 && (
          <div className="border rounded-xl p-4 bg-amber-50/30 border-amber-200/70 space-y-3 animate-fade-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-amber-700" />
                <h4 className="text-sm font-serif font-bold text-foreground">
                  {book.title} — Waiting List
                </h4>
              </div>
              <span className="text-xs font-medium text-muted-foreground">
                Total: {waitingList.length} in queue
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/60 text-muted-foreground text-left">
                    <th className="py-1.5 pr-2 font-medium">Position</th>
                    <th className="py-1.5 px-2 font-medium">Reader</th>
                    <th className="py-1.5 px-2 font-medium">Department</th>
                    <th className="py-1.5 px-2 font-medium">Request Date</th>
                    <th className="py-1.5 pl-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {waitingList.map((req, idx) => (
                    <tr key={req.id} className={req.employee_id === visitorEmpId ? 'bg-forest/10 font-medium' : ''}>
                      <td className="py-2 pr-2 font-semibold text-forest">
                         #{idx + 1}
                      </td>
                      <td className="py-2 px-2">
                        {(req.employee as any)?.full_name || 'Reader'}
                        {req.employee_id === visitorEmpId && (
                          <span className="ml-1 text-[10px] text-forest font-bold">(You)</span>
                        )}
                      </td>
                      <td className="py-2 px-2 text-muted-foreground">
                        {(req.employee as any)?.department || '—'}
                      </td>
                      <td className="py-2 px-2 text-muted-foreground">
                        {formatDate(req.request_date)}
                      </td>
                      <td className="py-2 pl-2">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${
                          req.status === 'Ready for Pickup'
                            ? 'bg-emerald-100 text-emerald-800 font-bold'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {req.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
