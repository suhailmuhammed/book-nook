import { useState } from 'react'
import {
  BookMarked, Calendar, Clock, AlertTriangle, CheckCircle2,
  XCircle, ArrowRight, ShieldAlert, Sparkles, BookOpen, AlertCircle
} from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { BookCover } from '@/components/ui/book-cover'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { formatDate, isOverdue, daysOverdue } from '@/lib/utils'
import { useEmployeeRequests, useCancelRequest } from '@/hooks/use-requests'
import { toast } from '@/hooks/use-toast'
import type { Employee, BorrowingWithDetails, BookRequestWithDetails } from '@/lib/database.types'

interface EmployeePortalDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  employee: Employee | null
  onExploreCatalogue?: () => void
}

export function EmployeePortalDialog({
  open,
  onOpenChange,
  employee,
  onExploreCatalogue,
}: EmployeePortalDialogProps) {
  const cancelMutation = useCancelRequest()

  // 1. Fetch active borrowings for this employee
  const { data: myLoans = [], isLoading: loansLoading } = useQuery({
    queryKey: ['my-borrowings', employee?.id],
    enabled: open && !!employee?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('borrowings')
        .select(`*, book:books(id, book_code, title, cover_image_url, status)`)
        .eq('employee_id', employee!.id)
        .order('issue_date', { ascending: false })

      if (error) throw error
      return (data ?? []) as unknown as BorrowingWithDetails[]
    },
  })

  // 2. Fetch active requests / waiting lists for this employee
  const { data: myRequests = [], isLoading: reqsLoading } = useEmployeeRequests(employee?.id)

  const activeLoans = myLoans.filter(l => !l.return_date)
  const pastLoans = myLoans.filter(l => !!l.return_date)
  const activeRequests = myRequests.filter(r => r.status === 'Waiting' || r.status === 'Ready for Pickup')

  async function handleCancelRequest(req: BookRequestWithDetails) {
    if (!confirm(`Are you sure you want to cancel your waiting list request for "${req.book?.title}"?`)) {
      return
    }

    try {
      await cancelMutation.mutateAsync({
        requestId: req.id,
        bookId: req.book_id,
        reason: 'Cancelled by reader from Reader Portal',
        cancelledBy: employee?.full_name || 'Reader',
      })
      toast({
        title: 'Request Cancelled',
        description: `Your waiting list request for "${req.book?.title}" was removed.`,
      })
    } catch (err: any) {
      toast({
        title: 'Could not cancel',
        description: err?.message || 'Failed to cancel request.',
        variant: 'destructive',
      })
    }
  }

  if (!employee) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-forest/10 border border-forest/20 flex items-center justify-center text-forest font-serif font-bold text-base">
              {employee.full_name.charAt(0)}
            </div>
            <div>
              <DialogTitle className="text-xl font-serif">
                {employee.full_name}’s Reader Portal
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                <span>{employee.department || 'General'}</span>
                {employee.employee_code && <span>· Reader Code: {employee.employee_code}</span>}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Lightweight Security Notice */}
        <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-2.5 flex items-start gap-2 text-xs text-amber-900 dark:text-amber-300">
          <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="leading-snug">
            <strong>Internal Office Mode:</strong> Browsing as <em>{employee.full_name}</em> without a password. This convenient view allows you to review your loans and waiting list spots in our trusted office.
          </p>
        </div>

        {/* Notifications: Ready for Pickup Alert */}
        {activeRequests.some(r => r.status === 'Ready for Pickup') && (
          <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-emerald-950 flex items-start gap-3">
            <Sparkles className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5 animate-bounce" />
            <div>
              <h4 className="font-semibold text-sm text-emerald-900">
                🎉 Your book is ready for pickup!
              </h4>
              <p className="text-xs text-emerald-800 mt-1 leading-relaxed">
                The librarian has set aside the following title for you at the library desk:
              </p>
              <ul className="mt-2 space-y-1">
                {activeRequests.filter(r => r.status === 'Ready for Pickup').map(r => (
                  <li key={r.id} className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                    <span>•</span> {r.book?.title}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        <div className="space-y-6 pt-1">
          {/* Section 1: Books Currently Borrowed */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-serif font-bold text-base text-foreground flex items-center gap-2">
                <BookMarked className="h-4 w-4 text-forest" />
                Books Currently Borrowed ({activeLoans.length})
              </h3>
              {activeLoans.length === 0 && onExploreCatalogue && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    onOpenChange(false)
                    onExploreCatalogue()
                  }}
                  className="text-xs text-forest hover:text-forest-dark p-0 h-auto"
                >
                  Explore books <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              )}
            </div>

            {activeLoans.length === 0 ? (
              <div className="rounded-xl border border-dashed p-6 text-center text-xs text-muted-foreground bg-muted/20">
                You have no active loans right now. Explore the library catalog to find your next read!
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-3">
                {activeLoans.map(loan => {
                  const overdue = isOverdue(loan.due_date, null)
                  return (
                    <div
                      key={loan.id}
                      className={`rounded-xl border p-3 flex gap-3 text-xs ${
                        overdue ? 'border-red-300 bg-red-50/60' : 'border-border bg-card'
                      }`}
                    >
                      <BookCover src={loan.book?.cover_image_url} title={loan.book?.title} size="sm" />
                      <div className="flex-1 min-w-0 flex flex-col justify-between">
                        <div>
                          <p className="font-semibold text-sm leading-tight text-foreground truncate">
                            {loan.book?.title}
                          </p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            Issued: {formatDate(loan.issue_date)}
                          </p>
                        </div>

                        <div className="mt-2 pt-2 border-t border-border/50 flex items-center justify-between">
                          <span className="text-muted-foreground">Due Date:</span>
                          <span className={`font-semibold ${overdue ? 'text-red-700' : 'text-foreground'}`}>
                            {formatDate(loan.due_date)} {overdue && `(${daysOverdue(loan.due_date)}d overdue)`}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Section 2: Active Waiting Lists & Requests */}
          <div>
            <h3 className="font-serif font-bold text-base text-foreground mb-3 flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-600" />
              My Waiting Lists & Requests ({activeRequests.length})
            </h3>

            {activeRequests.length === 0 ? (
              <div className="rounded-xl border border-dashed p-6 text-center text-xs text-muted-foreground bg-muted/20">
                You are not on any waiting lists. When a book you want is on loan, join the queue to be notified!
              </div>
            ) : (
              <div className="space-y-2">
                {activeRequests.map(req => (
                  <div
                    key={req.id}
                    className="rounded-xl border border-border bg-card p-3.5 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <BookCover src={req.book?.cover_image_url} title={req.book?.title} size="sm" />
                      <div className="min-w-0">
                        <p className="font-semibold text-sm text-foreground truncate">
                          {req.book?.title}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Requested: {formatDate(req.request_date)}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            req.status === 'Ready for Pickup'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {req.status === 'Ready for Pickup' ? 'Ready for Pickup' : `Queue Position #${req.queue_position}`}
                          </span>
                          {req.notes && (
                            <span className="text-[10px] text-muted-foreground italic truncate">
                              "{req.notes}"
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCancelRequest(req)}
                      disabled={cancelMutation.isPending}
                      className="text-xs text-destructive hover:bg-destructive/10 shrink-0"
                    >
                      Cancel Request
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 3: Completed Reading History */}
          {pastLoans.length > 0 && (
            <div>
              <h3 className="font-serif font-bold text-sm text-muted-foreground mb-2 flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                Reader Borrowing History ({pastLoans.length})
              </h3>
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {pastLoans.map(loan => (
                  <div
                    key={loan.id}
                    className="rounded-lg bg-muted/40 p-2.5 flex items-center justify-between text-xs"
                  >
                    <span className="font-medium text-foreground truncate max-w-[240px]">
                      {loan.book?.title}
                    </span>
                    <span className="text-muted-foreground text-[11px]">
                      Returned {formatDate(loan.return_date)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
