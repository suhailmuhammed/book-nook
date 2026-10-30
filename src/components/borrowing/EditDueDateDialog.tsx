import { useState, useEffect } from 'react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { BookCover } from '@/components/ui/book-cover'
import { useUpdateDueDate } from '@/hooks/use-borrowings'
import { formatDate } from '@/lib/utils'
import { Calendar, Clock } from 'lucide-react'
import type { BorrowingWithDetails } from '@/lib/database.types'

interface EditDueDateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  loan: BorrowingWithDetails | null
}

export function EditDueDateDialog({
  open,
  onOpenChange,
  loan,
}: EditDueDateDialogProps) {
  const updateDueDate = useUpdateDueDate()
  const [newDueDate, setNewDueDate] = useState('')
  const [remarks, setRemarks] = useState('')

  useEffect(() => {
    if (loan && open) {
      setNewDueDate(loan.due_date || '')
      setRemarks('')
    }
  }, [loan, open])

  if (!loan) return null

  async function handleConfirm() {
    if (!loan || !newDueDate) return
    try {
      await updateDueDate.mutateAsync({
        loanId: loan.id,
        dueDate: newDueDate,
        remarks: remarks.trim() || undefined,
      })
      onOpenChange(false)
    } catch {
      // Handled in mutation
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 text-forest">
            <Calendar className="h-5 w-5" />
            <DialogTitle className="text-base font-serif">Edit Expected Return Date</DialogTitle>
          </div>
          <DialogDescription className="text-xs">
            Adjust the loan duration or extend the expected return date for this borrower.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          <div className="flex items-center gap-3 p-3 rounded-xl border bg-muted/30">
            <BookCover src={loan.book?.cover_image_url} title={loan.book?.title} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-sm truncate text-foreground">{loan.book?.title}</p>
              <p className="text-[11px] text-muted-foreground font-mono">{loan.book?.book_code}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Borrower: <strong className="text-foreground">{loan.employee?.full_name}</strong>
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 p-2.5 rounded-lg bg-muted/20 border text-[11px]">
            <div>
              <span className="text-muted-foreground block text-[10px]">Issued Date:</span>
              <span className="font-medium text-foreground">{formatDate(loan.issue_date)}</span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[10px]">Current Due Date:</span>
              <span className="font-semibold text-amber-700">{formatDate(loan.due_date)}</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-new-due-date" className="text-xs font-semibold">
              New Expected Return Date *
            </Label>
            <Input
              id="edit-new-due-date"
              type="date"
              min={loan.issue_date}
              value={newDueDate}
              onChange={e => setNewDueDate(e.target.value)}
              className="h-9 text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-due-date-reason" className="text-xs text-muted-foreground">
              Reason for Adjustment (optional)
            </Label>
            <Textarea
              id="edit-due-date-reason"
              placeholder="e.g. Reader requested extension for exam study..."
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
            disabled={updateDueDate.isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleConfirm}
            loading={updateDueDate.isPending}
            disabled={updateDueDate.isPending || !newDueDate || newDueDate < loan.issue_date}
            className="bg-forest hover:bg-forest-dark text-white font-medium"
          >
            Save Due Date
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

