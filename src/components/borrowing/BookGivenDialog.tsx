import { useState, useEffect } from 'react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { BookCover } from '@/components/ui/book-cover'
import { useBookGiven } from '@/hooks/use-requests'
import { useAuth } from '@/contexts/AuthContext'
import { formatDate, today, addDays } from '@/lib/utils'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { CheckCircle2, BookOpen, Calendar, User, Tag, Layers } from 'lucide-react'
import type { BookRequestWithDetails } from '@/lib/database.types'

interface BookGivenDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  request: BookRequestWithDetails | null
  onSuccess?: () => void
}

export function BookGivenDialog({
  open,
  onOpenChange,
  request,
  onSuccess,
}: BookGivenDialogProps) {
  const { user } = useAuth()
  const bookGivenMutation = useBookGiven()

  // Load default loan days from settings
  const { data: settings } = useQuery({
    queryKey: ['app-settings'],
    queryFn: async () => {
      const { data } = await supabase.from('app_settings').select('*').eq('id', 1).single()
      return data
    },
  })

  const defaultLoanDays = settings?.default_loan_days ?? 14

  const [issueDate, setIssueDate] = useState(today())
  const [dueDate, setDueDate] = useState(() => addDays(today(), defaultLoanDays))
  const [remarks, setRemarks] = useState('')

  // Reset when dialog opens with a new request
  useEffect(() => {
    if (open) {
      const curToday = today()
      setIssueDate(curToday)
      setDueDate(addDays(curToday, defaultLoanDays))
      setRemarks('')
    }
  }, [open, defaultLoanDays])

  // Recalculate default due date when issue date changes
  function handleIssueDateChange(newIssueDate: string) {
    setIssueDate(newIssueDate)
    if (newIssueDate) {
      setDueDate(addDays(newIssueDate, defaultLoanDays))
    }
  }

  if (!request) return null

  const book = request.book
  const reader = request.employee
  const physicalCopyId = (book as any)?.shelf_number
    ? `${book?.book_code} (Shelf ${(book as any).shelf_number})`
    : `${book?.book_code || 'Copy 1'} · Standard Physical Copy`

  async function handleConfirm() {
    if (!request) return

    try {
      await bookGivenMutation.mutateAsync({
        requestId: request.id,
        bookId: request.book_id,
        employeeId: request.employee_id,
        readerName: reader?.full_name || 'Reader',
        issueDate,
        dueDate,
        remarks: remarks.trim() || undefined,
        actorUserId: user?.id,
      })
      onOpenChange(false)
      onSuccess?.()
    } catch {
      // Toast error is handled inside mutation onError
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2 text-forest">
            <BookOpen className="h-5 w-5" />
            <DialogTitle className="text-lg font-serif">
              Book Given / Issue Book
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs">
            Confirm the physical handover of this book to the reader. This will create an active loan and fulfill their waiting list request.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          {/* Book & Reader Summary Card */}
          <div className="rounded-xl border bg-muted/30 p-3.5 space-y-3">
            <div className="flex items-start gap-3">
              <BookCover src={book?.cover_image_url} title={book?.title ?? ''} size="md" />
              <div className="flex-1 min-w-0 space-y-1">
                <h4 className="font-serif font-bold text-sm text-foreground leading-snug">
                  {book?.title}
                </h4>
                <div className="flex items-center gap-2 flex-wrap text-muted-foreground text-[11px]">
                  <span className="font-mono font-medium bg-background px-1.5 py-0.5 rounded border">
                    ID: {book?.book_code}
                  </span>
                  <span>·</span>
                  <span className="text-foreground font-medium">
                    {book?.condition || 'Good'} Condition
                  </span>
                </div>

                <div className="pt-1.5 border-t border-border/50 grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-muted-foreground block text-[10px]">Reader:</span>
                    <strong className="text-foreground">{reader?.full_name}</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px]">Department:</span>
                    <span className="text-foreground">{reader?.department || '—'}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/50 text-[11px]">
              <div>
                <span className="text-muted-foreground block text-[10px]">Request Date:</span>
                <span className="font-medium text-foreground">{formatDate(request.request_date)}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px]">Physical Copy:</span>
                <span className="font-mono text-foreground truncate block">{physicalCopyId}</span>
              </div>
            </div>
          </div>

          {/* Issue Parameters Form */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="handover-issue-date" className="text-xs font-semibold flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-forest" />
                Issue Date *
              </Label>
              <Input
                id="handover-issue-date"
                type="date"
                value={issueDate}
                onChange={e => handleIssueDateChange(e.target.value)}
                className="h-8 text-xs"
              />
              <p className="text-[10px] text-muted-foreground">Defaulted to today's date</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="handover-due-date" className="text-xs font-semibold flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-amber-600" />
                Expected Return Date *
              </Label>
              <Input
                id="handover-due-date"
                type="date"
                min={issueDate}
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                className="h-8 text-xs"
              />
              <p className="text-[10px] text-muted-foreground">{defaultLoanDays} days standard loan period</p>
            </div>
          </div>

          {/* Remarks */}
          <div className="space-y-1.5">
            <Label htmlFor="handover-remarks" className="text-xs text-muted-foreground">
              Handover Remarks (optional)
            </Label>
            <Textarea
              id="handover-remarks"
              placeholder="e.g. Verified library card, handed over copy 1 in good condition..."
              rows={2}
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
              className="text-xs resize-none"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={bookGivenMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            id="confirm-book-given-btn"
            type="button"
            size="sm"
            onClick={handleConfirm}
            loading={bookGivenMutation.isPending}
            disabled={bookGivenMutation.isPending || !issueDate || !dueDate || dueDate < issueDate}
            className="bg-forest hover:bg-forest-dark text-white font-medium"
          >
            <CheckCircle2 className="h-4 w-4 mr-1.5" />
            Confirm Book Given
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

