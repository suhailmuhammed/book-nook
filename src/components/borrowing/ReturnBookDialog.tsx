import { useState, useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { BookCover } from '@/components/ui/book-cover'
import { useReturnBook } from '@/hooks/use-borrowings'
import { useBookWaitingList } from '@/hooks/use-requests'
import { formatDate, today } from '@/lib/utils'
import { Bookmark, RotateCcw, User, Calendar, CheckCircle2 } from 'lucide-react'
import type { BorrowingWithDetails } from '@/lib/database.types'

const schema = z.object({
  returnDate:      z.string().min(1, 'Return date is required'),
  returnRemarks:   z.string().optional(),
  returnCondition: z.enum(['Excellent', 'Good', 'Fair', 'Poor']).optional(),
})

type FormData = z.infer<typeof schema>

interface ReturnBookDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  loan: BorrowingWithDetails
  onSuccess?: () => void
}

export function ReturnBookDialog({ open, onOpenChange, loan, onSuccess }: ReturnBookDialogProps) {
  const returnBook = useReturnBook()
  const { data: waitingList = [] } = useBookWaitingList(open ? loan?.book_id : undefined)
  const nextRequester = waitingList.find(r => r.status === 'Waiting') ?? null
  const [markNextReady, setMarkNextReady] = useState(false)

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      returnDate:      today(),
      returnRemarks:   '',
      returnCondition: 'Good',
    },
  })

  useEffect(() => {
    if (open) {
      form.reset({
        returnDate: today(),
        returnRemarks: '',
        returnCondition: (loan.book as any)?.condition || 'Good',
      })
      setMarkNextReady(false)
    }
  }, [open, loan, form])

  if (!loan) return null

  async function onSubmit(data: FormData) {
    await returnBook.mutateAsync({
      borrowingId:      loan.id,
      returnDate:       data.returnDate,
      returnRemarks:    data.returnRemarks,
      returnCondition:  data.returnCondition,
      nextRequestReady: markNextReady,
    })
    form.reset()
    onOpenChange(false)
    onSuccess?.()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 text-forest">
            <RotateCcw className="h-5 w-5" />
            <DialogTitle className="text-base font-serif">Mark Book as Returned</DialogTitle>
          </div>
          <DialogDescription className="text-xs">
            Confirm physical return of this book. The loan transaction will move to Recently Returned.
          </DialogDescription>
        </DialogHeader>

        {/* Loan summary */}
        <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 border text-xs">
          <BookCover src={loan.book?.cover_image_url} title={loan.book?.title ?? ''} size="sm" />
          <div className="flex-1 min-w-0 space-y-0.5">
            <p className="text-sm font-semibold truncate text-foreground">{loan.book?.title}</p>
            <p className="text-[11px] text-muted-foreground font-mono">{loan.book?.book_code}</p>
            <p className="text-[11px] text-muted-foreground">
              Borrower: <strong className="text-foreground">{loan.employee?.full_name}</strong> ({loan.employee?.department || '—'})
            </p>
            <p className="text-[10px] text-muted-foreground">
              Issued: {formatDate(loan.issue_date)} · Due: {formatDate(loan.due_date)}
            </p>
          </div>
        </div>

        {/* Next Waiting List Alert & Option to Mark Ready for Pickup */}
        {nextRequester ? (
          <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs space-y-2">
            <div className="flex items-center gap-2 font-semibold text-amber-900 dark:text-amber-200">
              <Bookmark className="h-4 w-4 text-amber-600 flex-shrink-0" />
              <span>Next Reader Waiting: {nextRequester.employee?.full_name} (Pos #{nextRequester.queue_position})</span>
            </div>
            <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed">
              Another reader is currently queued for this book. You can immediately mark their request as &ldquo;Ready for Pickup&rdquo; to reserve this returned copy.
            </p>
            <div className="pt-1 flex items-center space-x-2">
              <Checkbox
                id="mark-next-ready-checkbox"
                checked={markNextReady}
                onCheckedChange={(checked: boolean | 'indeterminate') => setMarkNextReady(Boolean(checked))}
              />
              <label
                htmlFor="mark-next-ready-checkbox"
                className="text-xs font-medium text-foreground cursor-pointer select-none"
              >
                Mark {nextRequester.employee?.full_name}&rsquo;s request as <strong>Ready for Pickup</strong>
              </label>
            </div>
            <p className="text-[10px] text-muted-foreground italic pl-6">
              (Note: The book will be reserved for them, but not automatically issued until handover)
            </p>
          </div>
        ) : (
          <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>No readers currently waiting. The book status will revert to <strong>Available</strong>.</span>
          </div>
        )}

        <form id="return-book-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-3.5 text-xs">
          {/* Return Date */}
          <div className="space-y-1.5">
            <Label htmlFor="return-date-input" className="text-xs font-semibold">Return Date *</Label>
            <Input
              id="return-date-input"
              type="date"
              className="h-8 text-xs"
              {...form.register('returnDate')}
            />
            {form.formState.errors.returnDate && (
              <p className="text-[11px] text-destructive">{form.formState.errors.returnDate.message}</p>
            )}
          </div>

          {/* Return Condition */}
          <div className="space-y-1.5">
            <Label htmlFor="return-condition-select" className="text-xs font-semibold">Returned Condition</Label>
            <Controller
              name="returnCondition"
              control={form.control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="return-condition-select" className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {['Excellent', 'Good', 'Fair', 'Poor'].map(c => (
                      <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {/* Return Remarks */}
          <div className="space-y-1.5">
            <Label htmlFor="return-remarks-input" className="text-xs text-muted-foreground">
              Return Remarks (optional)
            </Label>
            <Textarea
              id="return-remarks-input"
              placeholder="e.g. Returned on time in good condition..."
              rows={2}
              className="text-xs resize-none"
              {...form.register('returnRemarks')}
            />
          </div>
        </form>

        <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={returnBook.isPending}>
            Cancel
          </Button>
          <Button
            id="return-book-submit-btn"
            form="return-book-form"
            type="submit"
            size="sm"
            loading={returnBook.isPending}
            disabled={returnBook.isPending}
            className="bg-forest hover:bg-forest-dark text-white font-medium"
          >
            Confirm Return
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
