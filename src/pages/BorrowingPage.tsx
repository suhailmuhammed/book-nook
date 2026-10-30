import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  RotateCcw, Plus, Filter, AlertTriangle, CheckCircle2, Trash2, Calendar,
  User, Clock, Users, ArrowUp, ArrowDown, ArrowUpToLine, ArrowDownToLine,
  Search, Check, ShieldCheck, Bookmark, Eye, BookOpen, History, Undo2
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
import { BookGivenDialog } from '@/components/borrowing/BookGivenDialog'
import { EditDueDateDialog } from '@/components/borrowing/EditDueDateDialog'
import { LoanDetailDialog } from '@/components/borrowing/LoanDetailDialog'
import { RequestHistoryDialog } from '@/components/borrowing/RequestHistoryDialog'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { toast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase'
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
  const [detailLoan, setDetailLoan] = useState<BorrowingWithDetails | null>(null)
  const [editDueLoan, setEditDueLoan] = useState<BorrowingWithDetails | null>(null)
  const [bookGivenTarget, setBookGivenTarget] = useState<BookRequestWithDetails | null>(null)
  const [historyRequest, setHistoryRequest] = useState<BookRequestWithDetails | null>(null)
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

  // View borrowing record linked to a fulfilled request
  async function handleViewBorrowingRecord(req: BookRequestWithDetails) {
    const { data: loan, error } = await supabase
      .from('borrowings')
      .select(`
        *,
        book:books(id, book_code, title, cover_image_url, status),
        employee:employees(id, full_name, department, employee_code)
      `)
      .eq('book_id', req.book_id)
      .eq('employee_id', req.employee_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (loan) {
      setDetailLoan(loan as unknown as BorrowingWithDetails)
    } else {
      toast({
        title: 'Borrowing Record',
        description: `This request for "${req.book?.title}" by ${req.employee?.full_name} is marked Fulfilled.`,
      })
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
          id="tab-btn-loans"
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
          id="tab-btn-overdue"
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
          id="tab-btn-waiting-lists"
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
          id="tab-btn-requests"
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
          id="tab-btn-returned"
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
        <div className="rounded-xl border bg-card overflow-hidden shadow-2xs space-y-4">
          {loansQuery.error ? (
            <div className="p-6"><ErrorMessage message="Failed to load loan records." /></div>
          ) : loansQuery.isLoading ? (
            <div className="p-6"><LoadingRows columns={8} rows={6} /></div>
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
                    <th className="py-3 px-3 w-12 text-center">Book Cover</th>
                    <th className="py-3 px-4">Book Title</th>
                    <th className="py-3 px-4">Book ID</th>
                    <th className="py-3 px-4">Reader Name</th>
                    <th className="py-3 px-4">Department</th>
                    <th className="py-3 px-4">Issue Date</th>
                    <th className="py-3 px-4">{activeTab === 'returned' ? 'Return Date' : 'Expected Return Date'}</th>
                    <th className="py-3 px-4">Loan Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {loans.map(loan => {
                    const overdue = isOverdue(loan.due_date, loan.return_date)
                    return (
                      <tr key={loan.id} className="hover:bg-muted/25 transition-colors">
                        {/* 1. Book Cover */}
                        <td className="py-3 px-3 text-center">
                          <BookCover src={loan.book?.cover_image_url} title={loan.book?.title} size="sm" />
                        </td>
                        {/* 2. Book Title */}
                        <td className="py-3 px-4 font-semibold text-foreground">
                          {loan.book?.title}
                        </td>
                        {/* 3. Book ID */}
                        <td className="py-3 px-4">
                          <span className="font-mono text-[11px] bg-muted px-1.5 py-0.5 rounded border border-border/60 text-muted-foreground">
                            {loan.book?.book_code}
                          </span>
                        </td>
                        {/* 4. Reader Name */}
                        <td className="py-3 px-4 font-medium text-foreground">
                          {loan.employee?.full_name}
                        </td>
                        {/* 5. Department */}
                        <td className="py-3 px-4 text-muted-foreground">
                          {loan.employee?.department || '—'}
                        </td>
                        {/* 6. Issue Date */}
                        <td className="py-3 px-4 text-muted-foreground">
                          {formatDate(loan.issue_date)}
                        </td>
                        {/* 7. Expected Return Date */}
                        <td className="py-3 px-4">
                          {activeTab === 'returned' ? (
                            <span className="text-muted-foreground font-medium">{formatDate(loan.return_date)}</span>
                          ) : (
                            <span className={overdue ? 'text-red-600 font-bold' : 'text-foreground font-medium'}>
                              {formatDate(loan.due_date)} {overdue && `(${daysOverdue(loan.due_date)}d overdue)`}
                            </span>
                          )}
                        </td>
                        {/* 8. Loan Status */}
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
                        {/* 9. Actions */}
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setDetailLoan(loan)}
                              className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                              title="View Details"
                            >
                              <Eye className="h-3.5 w-3.5 mr-1" />
                              View Details
                            </Button>

                            {!loan.return_date && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setReturnLoan(loan)}
                                  className="h-7 px-2 text-xs bg-forest/5 hover:bg-forest/10 text-forest border-forest/20 font-medium"
                                  title="Mark as Returned"
                                >
                                  <RotateCcw className="h-3 w-3 mr-1" />
                                  Mark as Returned
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setEditDueLoan(loan)}
                                  className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                                  title="Edit Due Date"
                                >
                                  <Calendar className="h-3.5 w-3.5 mr-1" />
                                  Edit Due Date
                                </Button>
                              </>
                            )}

                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setDeleteLoanTarget(loan)}
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                              title="Delete Record"
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

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="p-3 border-t flex items-center justify-between text-xs text-muted-foreground">
              <span>Showing Page {page} of {totalPages} ({total} records total)</span>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="h-7 text-xs"
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="h-7 text-xs"
                >
                  Next
                </Button>
              </div>
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
              <p className="text-xs text-muted-foreground mt-1">There are currently no readers queued for books.</p>
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
                      <p className="text-xs text-muted-foreground font-mono">
                        {group.book?.book_code} · Current Book Status: <strong>{group.book?.status === 'Borrowed' ? 'On Loan' : group.book?.status}</strong>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-900 border border-amber-200">
                      {group.requests.length} {group.requests.length === 1 ? 'reader waiting' : 'readers waiting'}
                    </span>
                  </div>
                </div>

                {/* Queue Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-muted-foreground text-left border-b border-border/40">
                        <th className="py-2 pr-2 font-medium">Pos</th>
                        <th className="py-2 px-2 font-medium">Reader</th>
                        <th className="py-2 px-2 font-medium">Department</th>
                        <th className="py-2 px-2 font-medium">Request Date</th>
                        <th className="py-2 px-2 font-medium">Status</th>
                        <th className="py-2 pl-2 text-right font-medium">Available Admin Action & Controls</th>
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
                                ? 'bg-emerald-100 text-emerald-800 font-bold border border-emerald-300'
                                : 'bg-amber-100 text-amber-800'
                            }`}>
                              {req.status}
                            </span>
                          </td>
                          <td className="py-2.5 pl-2 text-right">
                            <div className="flex items-center justify-end gap-1.5 flex-wrap">
                              {/* 1. Action: Waiting -> Mark Pickup */}
                              {req.status === 'Waiting' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => statusMutation.mutate({
                                    requestId: req.id,
                                    bookId: req.book_id,
                                    status: 'Ready for Pickup',
                                    reason: 'Marked ready for pickup by librarian',
                                  })}
                                  className="h-7 text-[11px] bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200 font-medium"
                                >
                                  Mark Pickup
                                </Button>
                              )}

                              {/* 2. Action: Ready for Pickup -> Book Given / Issue Book */}
                              {req.status === 'Ready for Pickup' && (
                                <>
                                  <Button
                                    size="sm"
                                    onClick={() => setBookGivenTarget(req)}
                                    className="h-7 text-xs bg-forest hover:bg-forest-dark text-white font-medium shadow-2xs flex items-center gap-1"
                                    id={`book-given-btn-${req.id}`}
                                  >
                                    <CheckCircle2 className="h-3.5 w-3.5 mr-0.5" />
                                    Book Given / Issue Book
                                  </Button>

                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      statusMutation.mutate({
                                        requestId: req.id,
                                        bookId: req.book_id,
                                        status: 'Waiting',
                                        reason: 'Reservation released by librarian (reader did not collect)',
                                      })
                                      toast({
                                        title: 'Reservation Released',
                                        description: `${req.employee?.full_name}'s request reverted to Waiting. Copy released.`,
                                      })
                                    }}
                                    className="h-7 text-[11px] text-amber-800 hover:bg-amber-50 border-amber-300"
                                    title="Release reservation if reader did not collect"
                                  >
                                    <Undo2 className="h-3 w-3 mr-1" />
                                    Release
                                  </Button>
                                </>
                              )}

                              {/* 3. Manual Reorder Controls */}
                              <div className="flex items-center border rounded-md overflow-hidden bg-background">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  title="Move up one position"
                                  disabled={idx === 0}
                                  onClick={() => {
                                    setReorderTarget(req)
                                    setReorderDirection('up')
                                  }}
                                  className="h-7 w-7 p-0 rounded-none border-r"
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
                                  className="h-7 w-7 p-0 rounded-none border-r"
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
                                  className="h-7 w-7 p-0 rounded-none text-amber-700"
                                >
                                  <ArrowUpToLine className="h-3.5 w-3.5" />
                                </Button>
                              </div>

                              {/* 4. Cancel Request Button */}
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
                                className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
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
                placeholder="Search by book, reader, department…"
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
                  <th className="py-3 px-4 font-medium">Reader</th>
                  <th className="py-3 px-4 font-medium">Department</th>
                  <th className="py-3 px-4 font-medium">Queue Position</th>
                  <th className="py-3 px-4 font-medium">Request Date</th>
                  <th className="py-3 px-4 font-medium">Status</th>
                  <th className="py-3 px-4 font-medium text-right">Available Admin Action</th>
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
                        req.status === 'Ready for Pickup' ? 'bg-emerald-100 text-emerald-800 font-semibold' :
                        req.status === 'Fulfilled' ? 'bg-blue-100 text-blue-800' :
                        req.status === 'Cancelled' ? 'bg-gray-100 text-gray-700' :
                        'bg-amber-100 text-amber-800'
                      }`}>
                        {req.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Waiting: Mark Pickup */}
                        {req.status === 'Waiting' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => statusMutation.mutate({
                              requestId: req.id,
                              bookId: req.book_id,
                              status: 'Ready for Pickup',
                              reason: 'Marked ready for pickup from requests history',
                            })}
                            className="h-7 text-[11px] bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200"
                          >
                            Mark Pickup
                          </Button>
                        )}

                        {/* Ready for Pickup: Book Given */}
                        {req.status === 'Ready for Pickup' && (
                          <Button
                            size="sm"
                            onClick={() => setBookGivenTarget(req)}
                            className="h-7 text-xs bg-forest hover:bg-forest-dark text-white font-medium"
                          >
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Book Given
                          </Button>
                        )}

                        {/* Fulfilled: View Borrowing Record */}
                        {req.status === 'Fulfilled' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewBorrowingRecord(req)}
                            className="h-7 text-xs text-forest hover:bg-forest/5 border-forest/20"
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            View Borrowing Record
                          </Button>
                        )}

                        {/* Cancelled: View Request History */}
                        {req.status === 'Cancelled' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setHistoryRequest(req)}
                            className="h-7 text-xs text-muted-foreground hover:text-foreground"
                          >
                            <History className="h-3 w-3 mr-1" />
                            View Request History
                          </Button>
                        )}
                      </div>
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

      {/* All Dialogs */}
      <IssueBookDialog open={issueOpen} onOpenChange={setIssueOpen} />
      <AddRequestDialog open={addRequestOpen} onOpenChange={setAddRequestOpen} />

      {bookGivenTarget && (
        <BookGivenDialog
          open={!!bookGivenTarget}
          onOpenChange={open => !open && setBookGivenTarget(null)}
          request={bookGivenTarget}
        />
      )}

      {returnLoan && (
        <ReturnBookDialog
          open={!!returnLoan}
          onOpenChange={open => !open && setReturnLoan(null)}
          loan={returnLoan}
        />
      )}

      {detailLoan && (
        <LoanDetailDialog
          open={!!detailLoan}
          onOpenChange={open => !open && setDetailLoan(null)}
          loan={detailLoan}
          onMarkReturn={loan => setReturnLoan(loan)}
          onEditDueDate={loan => setEditDueLoan(loan)}
        />
      )}

      {editDueLoan && (
        <EditDueDateDialog
          open={!!editDueLoan}
          onOpenChange={open => !open && setEditDueLoan(null)}
          loan={editDueLoan}
        />
      )}

      {historyRequest && (
        <RequestHistoryDialog
          open={!!historyRequest}
          onOpenChange={open => !open && setHistoryRequest(null)}
          request={historyRequest}
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
