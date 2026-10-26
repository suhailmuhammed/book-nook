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
import { BookCover } from '@/components/ui/book-cover'
import { useReturnBook } from '@/hooks/use-borrowings'
import { useBookWaitingList } from '@/hooks/use-requests'
import { formatDate, today } from '@/lib/utils'
import { Bookmark, Users } from 'lucide-react'
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
}

export function ReturnBookDialog({ open, onOpenChange, loan }: ReturnBookDialogProps) {
  const returnBook = useReturnBook()
  const { data: waitingList = [] } = useBookWaitingList(open ? loan.book_id : undefined)
  const nextRequester = waitingList.length > 0 ? waitingList[0] : null

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      returnDate:      today(),
      returnRemarks:   '',
      returnCondition: 'Good',
    },
  })

  async function onSubmit(data: FormData) {
    await returnBook.mutateAsync({
      borrowingId:     loan.id,
      returnDate:      data.returnDate,
      returnRemarks:   data.returnRemarks,
      returnCondition: data.returnCondition,
    })
    form.reset()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Record Return</DialogTitle>
          <DialogDescription>Confirm the return of this book loan.</DialogDescription>
        </DialogHeader>

        {/* Loan summary */}
        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 border">
          <BookCover src={loan.book?.cover_image_url} title={loan.book?.title ?? ''} size="sm" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{loan.book?.title}</p>
            <p className="text-xs text-muted-foreground">{loan.book?.book_code}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Borrowed by {loan.employee?.full_name} · Due {formatDate(loan.due_date)}
            </p>
          </div>
        </div>

        {/* Waiting List Alert for Librarian */}
        {nextRequester && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs space-y-1.5">
            <div className="flex items-center gap-1.5 font-semibold text-amber-900">
              <Bookmark className="h-4 w-4 text-amber-700 flex-shrink-0" />
              <span>Next in Waiting List: {nextRequester.employee?.full_name} (#{nextRequester.queue_position})</span>
            </div>
            <p className="text-[11px] text-amber-800 leading-relaxed">
              Upon confirming return, this book can be reserved and marked &ldquo;Ready for Pickup&rdquo; for {nextRequester.employee?.full_name} in Operations &gt; Waiting Lists.
            </p>
          </div>
        )}

        <form id="return-book-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Return Date */}
          <div className="space-y-1.5">
            <Label htmlFor="return-date-input">Return Date *</Label>
            <Input
              id="return-date-input"
              type="date"
              {...form.register('returnDate')}
            />
            {form.formState.errors.returnDate && (
              <p className="text-xs text-destructive">{form.formState.errors.returnDate.message}</p>
            )}
          </div>

          {/* Return Condition */}
          <div className="space-y-1.5">
            <Label htmlFor="return-condition-select">Returned Condition</Label>
            <Controller
              name="returnCondition"
              control={form.control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="return-condition-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {['Excellent', 'Good', 'Fair', 'Poor'].map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {/* Return Remarks */}
          <div className="space-y-1.5">
            <Label htmlFor="return-remarks-input">Return Remarks <span className="text-muted-foreground">(optional)</span></Label>
            <Textarea
              id="return-remarks-input"
              placeholder="Any notes about the return…"
              rows={2}
              {...form.register('returnRemarks')}
            />
          </div>
        </form>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            id="return-book-submit-btn"
            form="return-book-form"
            type="submit"
            loading={returnBook.isPending}
          >
            Confirm Return
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
