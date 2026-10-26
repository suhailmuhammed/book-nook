import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  RotateCcw, Plus, Filter, AlertTriangle, CheckCircle2, Trash2, Calendar,
  User, Clock, Users, ArrowUp, ArrowDown, ArrowUpToLine, ArrowDownToLine,
  Search, Check, ShieldCheck, Bookmark
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { BookCover } from '@/components/ui/book-cover'
import { EmptyState, LoadingRows, ErrorMessage } from '@/components/ui/states'
import { useBorrowings, useDeleteBorrowing } from '@/hooks/use-borrowings'
import {
  useAllRequests, useAllWaitingLists, useReorderQueue,
  useUpdateRequestStatus, useCancelRequest
} from '@/hooks/use-requests'
import { formatDate, isOverdue, daysOverdue, daysBorrowed } from '@/lib/utils'
import { IssueBookDialog } from '@/components/borrowing/IssueBookDialog'
import { ReturnBookDialog } from '@/components/borrowing/ReturnBookDialog'
import { AddRequestDialog } from '@/components/borrowing/AddRequestDialog'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { toast } from '@/hooks/use-toast'
import type { BorrowingWithDetails, BookRequestWithDetails } from '@/lib/database.types'

type OpsTab = 'loans' | 'overdue' | 'requests' | 'waiting-lists' | 'returned'

export default function BorrowingPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const tabFromUrl = searchParams.get('tab') as OpsTab
  const [activeTab, setActiveTab] = useState<OpsTab>(
    ['loans', 'overdue', 'requests', 'waiting-lists', 'returned'].includes(tabFromUrl) ? tabFromUrl : 'loans'
  )
  const [page, setPage] = useState(1)
  const [issueOpen, setIssueOpen] = useState(false)
  const [addRequestOpen, setAddRequestOpen] = useState(false)
  const [returnLoan, setReturnLoan] = useState<BorrowingWithDetails | null>(null)
  const [deleteLoanTarget, setDeleteLoanTarget] = useState<BorrowingWithDetails | null>(null)
  const deleteBorrowing = useDeleteBorrowing()

  useEffect(() => {
    if (tabFromUrl && tabFromUrl !== activeTab && ['loans', 'overdue', 'requests', 'waiting-lists', 'returned'].includes(tabFromUrl)) {
      setActiveTab(tabFromUrl)
    }
  }, [tabFromUrl])

  // Queries for Loans
  const loansQuery = useBorrowings({
    status: activeTab === 'overdue' ? 'overdue' : activeTab === 'returned' ? 'returned' : 'active',
    page,
    pageSize: 20
  })

  // Queries for Requests & Waiting Lists
  const [reqStatusFilter, setReqStatusFilter] = useState('all')
  const [reqSearch, setReqSearch] = useState('')
  const allRequestsQuery = useAllRequests(reqStatusFilter)
  const waitingListsQuery = useAllWaitingLists()

  // Reorder Modal State
  const [reorderTarget, setReorderTarget] = useState<BookRequestWithDetails | null>(null)
  const [reorderDirection, setReorderDirection] = useState<'up' | 'down' | 'top' | 'bottom'>('up')
  const [reorderReason, setReorderReason] = useState('')
  const reorderMutation = useReorderQueue()
  const statusMutation = useUpdateRequestStatus()
  const cancelReqMutation = useCancelRequest()

  const loans = loansQuery.data?.borrowings ?? []
  const total = loansQuery.data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / 20))

  // Group waiting lists by book
  const waitingListsByBook = (waitingListsQuery.data ?? []).reduce((acc, req) => {
    const bookId = req.book_id
    if (!acc[bookId]) {
      acc[bookId] = {
        book: req.book,
        requests: [] as BookRequestWithDetails[],
      }
    }
    acc[bookId].requests.push(req)
    return acc
  }, {} as Record<string, { book: any; requests: BookRequestWithDetails[] }>)

  // Filter requests
  const filteredAllRequests = (allRequestsQuery.data ?? []).filter(r => {
    const term = reqSearch.toLowerCase()
    return (
      (r.book?.title && r.book.title.toLowerCase().includes(term)) ||
      (r.employee?.full_name && r.employee.full_name.toLowerCase().includes(term)) ||
      (r.employee?.department && r.employee.department.toLowerCase().includes(term))
    )
  })

  async function handleConfirmReorder() {
    if (!reorderTarget) return
    if (!reorderReason.trim()) {
      toast({ title: 'Reason Required', description: 'Please provide a justification for manual queue override.', variant: 'destructive' })
      return
    }

    try {
      await reorderMutation.mutateAsync({
        requestId: reorderTarget.id,
        bookId: reorderTarget.book_id,
        direction: reorderDirection,
        reason: reorderReason,
        performedBy: 'Librarian',
      })
      toast({ title: 'Queue Reordered', description: `Successfully adjusted position for ${reorderTarget.employee?.full_name}.` })
      setReorderTarget(null)
      setReorderReason('')
    } catch (err: any) {
      toast({ title: 'Reorder Failed', description: err?.message, variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="page-header flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-serif text-foreground">Library Operations</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage physical book loans, returns, and waiting list queues.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            id="add-request-page-btn"
            variant="outline"
            size="sm"
            onClick={() => setAddRequestOpen(true)}
            className="h-9 text-xs border-forest/30 text-forest hover:bg-forest/5"
          >
            <Bookmark className="h-4 w-4 mr-1.5 text-forest" />
            Add Request
          </Button>
          <Button
            id="issue-book-page-btn"
            onClick={() => setIssueOpen(true)}
            size="sm"
            className="bg-forest hover:bg-forest-dark text-white font-medium h-9 shadow-xs"
          >
            <Plus className="h-4 w-4 mr-1" />
            Issue Book
          </Button>
        </div>
      </div>

      {/* Operations Navigation Tabs */}
      <div className="flex border-b border-border gap-2 overflow-x-auto pb-px">
        <button
          onClick={() => { setActiveTab('loans'); setPage(1); setSearchParams({ tab: 'loans' }); }}
          className={`px-4 py-2 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors ${
            activeTab === 'loans'
              ? 'border-forest text-forest'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Current Active Loans
        </button>
        <button
          onClick={() => { setActiveTab('overdue'); setPage(1); setSearchParams({ tab: 'overdue' }); }}
          className={`px-4 py-2 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors ${
            activeTab === 'overdue'
              ? 'border-red-600 text-red-600'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Overdue Books
        </button>
        <button
          onClick={() => { setActiveTab('waiting-lists'); setSearchParams({ tab: 'waiting-lists' }); }}
          className={`px-4 py-2 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors ${
            activeTab === 'waiting-lists'
              ? 'border-amber-600 text-amber-700'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Waiting Lists by Book ({Object.keys(waitingListsByBook).length})
        </button>
        <button
          onClick={() => { setActiveTab('requests'); setSearchParams({ tab: 'requests' }); }}
          className={`px-4 py-2 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors ${
            activeTab === 'requests'
              ? 'border-forest text-forest'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          All Requests History
        </button>
        <button
          onClick={() => { setActiveTab('returned'); setPage(1); setSearchParams({ tab: 'returned' }); }}
          className={`px-4 py-2 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors ${
            activeTab === 'returned'
              ? 'border-forest text-forest'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Recently Returned
        </button>
      </div>

      {/* ─── TAB: Current Loans / Overdue / Returned ─────────────── */}
      {(activeTab === 'loans' || activeTab === 'overdue' || activeTab === 'returned') && (
        <div className="rounded-xl border bg-card overflow-hidden shadow-2xs">
          {loansQuery.error ? (
            <div className="p-6"><ErrorMessage message="Failed to load loan records." /></div>
          ) : loansQuery.isLoading ? (
            <div className="p-6"><LoadingRows columns={7} rows={6} /></div>
          ) : loans.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={RotateCcw}
                title="No records found"
                description={
                  activeTab === 'overdue'
                    ? 'No books are currently overdue.'
                    : activeTab === 'returned'
                    ? 'No return records yet.'
                    : 'No active loans in the library.'
                }
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/70 bg-muted/40 text-muted-foreground text-left font-medium">
                    <th className="py-3 px-4">Book Title</th>
                    <th className="py-3 px-4">Borrower</th>
                    <th className="py-3 px-4">Department</th>
                    <th className="py-3 px-4">Issue Date</th>
                    <th className="py-3 px-4">{activeTab === 'returned' ? 'Return Date' : 'Due Date'}</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {loans.map(loan => {
                    const overdue = isOverdue(loan.due_date, loan.return_date)
                    return (
                      <tr key={loan.id} className="hover:bg-muted/25 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <BookCover src={loan.book?.cover_image_url} title={loan.book?.title} size="sm" />
                            <div>
                              <p className="font-semibold text-foreground">{loan.book?.title}</p>
                              <span className="text-[10px] font-mono text-muted-foreground">{loan.book?.book_code}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-medium text-foreground">
                          {loan.employee?.full_name}
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">
                          {loan.employee?.department || '—'}
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">
                          {formatDate(loan.issue_date)}
                        </td>
                        <td className="py-3 px-4">
                          {activeTab === 'returned' ? (
                            <span className="text-muted-foreground">{formatDate(loan.return_date)}</span>
                          ) : (
                            <span className={overdue ? 'text-red-600 font-bold' : 'text-foreground font-medium'}>
                              {formatDate(loan.due_date)} {overdue && `(${daysOverdue(loan.due_date)}d overdue)`}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {loan.return_date ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] bg-gray-100 text-gray-700 font-medium">
                              Returned
                            </span>
                          ) : overdue ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] bg-red-100 text-red-800 font-semibold">
                              Overdue
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] bg-blue-100 text-blue-800 font-medium">
                              On Loan
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {!loan.return_date && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setReturnLoan(loan)}
                                className="h-7 text-xs bg-forest/5 hover:bg-forest/10 text-forest border-forest/20"
                              >
                                Return
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setDeleteLoanTarget(loan)}
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ─── TAB: Waiting Lists Grouped by Book ─────────────────── */}
      {activeTab === 'waiting-lists' && (
        <div className="space-y-4">
          {Object.keys(waitingListsByBook).length === 0 ? (
            <div className="p-12 text-center rounded-2xl border border-dashed bg-card">
              <Users className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50" />
              <h3 className="font-serif font-semibold text-base text-foreground">No active waiting lists</h3>
              <p className="text-xs text-muted-foreground mt-1">There are currently no employees queued for books.</p>
            </div>
          ) : (
            Object.entries(waitingListsByBook).map(([bookId, group]) => (
              <div key={bookId} className="rounded-xl border bg-card p-4 shadow-2xs space-y-3">
                {/* Book Header Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-border/70 gap-3">
                  <div className="flex items-center gap-3">
                    <BookCover src={group.book?.cover_image_url} title={group.book?.title} size="sm" />
                    <div>
                      <h3 className="font-serif font-bold text-sm text-foreground">{group.book?.title}</h3>
                      <p className="text-xs text-muted-foreground font-mono">{group.book?.book_code} · Status: {group.book?.status}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-900 border border-amber-200">
                      {group.requests.length} {group.requests.length === 1 ? 'person waiting' : 'people waiting'}
                    </span>
                  </div>
                </div>

                {/* Queue Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-muted-foreground text-left border-b border-border/40">
                        <th className="py-2 pr-2 font-medium">Pos</th>
                        <th className="py-2 px-2 font-medium">Employee</th>
                        <th className="py-2 px-2 font-medium">Department</th>
                        <th className="py-2 px-2 font-medium">Request Date</th>
                        <th className="py-2 px-2 font-medium">Status</th>
                        <th className="py-2 pl-2 text-right font-medium">Queue Controls</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/30">
                      {group.requests.map((req, idx) => (
                        <tr key={req.id} className="hover:bg-muted/30">
                          <td className="py-2.5 pr-2 font-bold text-forest">#{req.queue_position}</td>
                          <td className="py-2.5 px-2 font-semibold text-foreground">{req.employee?.full_name}</td>
                          <td className="py-2.5 px-2 text-muted-foreground">{req.employee?.department || '—'}</td>
                          <td className="py-2.5 px-2 text-muted-foreground">{formatDate(req.request_date)}</td>
                          <td className="py-2.5 px-2">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${
                              req.status === 'Ready for Pickup'
                                ? 'bg-emerald-100 text-emerald-800 font-bold'
                                : 'bg-amber-100 text-amber-800'
                            }`}>
                              {req.status}
                            </span>
                          </td>
                          <td className="py-2.5 pl-2 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {/* Ready for Pickup Action */}
                              {req.status === 'Waiting' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => statusMutation.mutate({
                                    requestId: req.id,
                                    bookId: req.book_id,
                                    status: 'Ready for Pickup',
                                    reason: 'Notified member that book is ready for pickup',
                                  })}
                                  className="h-7 text-[11px] bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200"
                                >
                                  Mark Pickup
                                </Button>
                              )}

                              {/* Manual Reorder Buttons */}
                              <Button
                                size="sm"
                                variant="ghost"
                                title="Move up one position"
                                disabled={idx === 0}
                                onClick={() => {
                                  setReorderTarget(req)
                                  setReorderDirection('up')
                                }}
                                className="h-7 w-7 p-0"
                              >
                                <ArrowUp className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                title="Move down one position"
                                disabled={idx === group.requests.length - 1}
                                onClick={() => {
                                  setReorderTarget(req)
                                  setReorderDirection('down')
                                }}
                                className="h-7 w-7 p-0"
                              >
                                <ArrowDown className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                title="Move to first position (Override FIFO)"
                                disabled={idx === 0}
                                onClick={() => {
                                  setReorderTarget(req)
                                  setReorderDirection('top')
                                }}
                                className="h-7 w-7 p-0 text-amber-700"
                              >
                                <ArrowUpToLine className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                title="Cancel Request"
                                onClick={() => {
                                  if (confirm(`Cancel waiting list spot for ${req.employee?.full_name}?`)) {
                                    cancelReqMutation.mutate({
                                      requestId: req.id,
                                      bookId: req.book_id,
                                      reason: 'Cancelled by Librarian',
                                      cancelledBy: 'Librarian',
                                    })
                                  }
                                }}
                                className="h-7 w-7 p-0 text-destructive"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ─── TAB: All Book Requests (Searchable & Filterable) ────── */}
      {activeTab === 'requests' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-2 justify-between">
            <div className="relative flex-1 max-w-sm">
              <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by book, employee, department…"
                value={reqSearch}
                onChange={e => setReqSearch(e.target.value)}
                className="pl-8 h-9 text-xs"
              />
            </div>
            <Select value={reqStatusFilter} onValueChange={setReqStatusFilter}>
              <SelectTrigger className="w-[160px] h-9 text-xs">
                <SelectValue placeholder="Filter status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">All Statuses</SelectItem>
                <SelectItem value="Waiting" className="text-xs">Waiting</SelectItem>
                <SelectItem value="Ready for Pickup" className="text-xs">Ready for Pickup</SelectItem>
                <SelectItem value="Fulfilled" className="text-xs">Fulfilled</SelectItem>
                <SelectItem value="Cancelled" className="text-xs">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-xl border bg-card overflow-hidden shadow-2xs">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b bg-muted/40 text-muted-foreground text-left">
                  <th className="py-3 px-4 font-medium">Book</th>
                  <th className="py-3 px-4 font-medium">Employee</th>
                  <th className="py-3 px-4 font-medium">Department</th>
                  <th className="py-3 px-4 font-medium">Queue Position</th>
                  <th className="py-3 px-4 font-medium">Request Date</th>
                  <th className="py-3 px-4 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {filteredAllRequests.map(req => (
                  <tr key={req.id} className="hover:bg-muted/20">
                    <td className="py-3 px-4 font-semibold text-foreground">{req.book?.title}</td>
                    <td className="py-3 px-4 text-foreground">{req.employee?.full_name}</td>
                    <td className="py-3 px-4 text-muted-foreground">{req.employee?.department || '—'}</td>
                    <td className="py-3 px-4 font-mono font-medium">
                      {req.status === 'Waiting' || req.status === 'Ready for Pickup' ? `#${req.queue_position}` : '—'}
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">{formatDate(req.request_date)}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${
                        req.status === 'Ready for Pickup' ? 'bg-emerald-100 text-emerald-800' :
                        req.status === 'Fulfilled' ? 'bg-blue-100 text-blue-800' :
                        req.status === 'Cancelled' ? 'bg-gray-100 text-gray-700' :
                        'bg-amber-100 text-amber-800'
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

      {/* Manual Queue Reordering Modal (Requires Audit Justification) */}
      <Dialog open={!!reorderTarget} onOpenChange={open => !open && setReorderTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-serif">
              Manual Queue Reorder Override
            </DialogTitle>
            <DialogDescription className="text-xs">
              Manually moving <strong>{reorderTarget?.employee?.full_name}</strong> in the waiting list for <em>{reorderTarget?.book?.title}</em>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="space-y-1.5">
              <Label className="text-xs">Selected Movement Direction</Label>
              <div className="grid grid-cols-4 gap-1.5">
                {(['up', 'down', 'top', 'bottom'] as const).map(dir => (
                  <Button
                    key={dir}
                    type="button"
                    size="sm"
                    variant={reorderDirection === dir ? 'default' : 'outline'}
                    onClick={() => setReorderDirection(dir)}
                    className="capitalize text-xs h-8"
                  >
                    {dir}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="override-reason-input" className="text-xs font-semibold">
                Reason for Manual FIFO Override *
              </Label>
              <Input
                id="override-reason-input"
                placeholder="e.g. Urgent client presentation, manager approval…"
                value={reorderReason}
                onChange={e => setReorderReason(e.target.value)}
                className="text-xs h-9"
                autoFocus
              />
              <p className="text-[11px] text-muted-foreground">
                Manual overrides are tracked in the library administrative audit log.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setReorderTarget(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmReorder}
              disabled={reorderMutation.isPending || !reorderReason.trim()}
              className="bg-forest hover:bg-forest-dark text-white"
            >
              Confirm Reorder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialogs */}
      <IssueBookDialog open={issueOpen} onOpenChange={setIssueOpen} />
      <AddRequestDialog open={addRequestOpen} onOpenChange={setAddRequestOpen} />
      {returnLoan && (
        <ReturnBookDialog
          open={!!returnLoan}
          onOpenChange={open => !open && setReturnLoan(null)}
          loan={returnLoan}
        />
      )}

      {/* Delete Loan Record Confirmation Dialog */}
      <Dialog open={!!deleteLoanTarget} onOpenChange={open => !open && setDeleteLoanTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              <DialogTitle>Delete Borrowing Record</DialogTitle>
            </div>
            <DialogDescription className="pt-2 text-xs">
              Are you sure you want to delete the borrowing record for <strong>{deleteLoanTarget?.book?.title}</strong> borrowed by <strong>{deleteLoanTarget?.employee?.full_name}</strong>?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setDeleteLoanTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={async () => {
                if (deleteLoanTarget) {
                  await deleteBorrowing.mutateAsync(deleteLoanTarget.id)
                  setDeleteLoanTarget(null)
                }
              }}
            >
              Delete Record
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
