import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useBooks } from '@/hooks/use-books'
import { useEmployees } from '@/hooks/use-employees'
import { useRequestBook } from '@/hooks/use-requests'
import { toast } from '@/hooks/use-toast'

const schema = z.object({
  bookId:     z.string().min(1, 'Please select a book'),
  employeeId: z.string().min(1, 'Please select a reader'),
  notes:      z.string().optional(),
})

type FormData = z.infer<typeof schema>

interface AddRequestDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultBookId?: string
}

export function AddRequestDialog({ open, onOpenChange, defaultBookId }: AddRequestDialogProps) {
  const requestBook = useRequestBook()
  const booksResult = useBooks({ pageSize: 150 })
  const employeesResult = useEmployees({ isActive: true, pageSize: 200 })

  const books = booksResult.data?.books ?? []
  const employees = employeesResult.data?.employees ?? []

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      bookId: defaultBookId ?? '',
      employeeId: '',
      notes: '',
    },
  })

  const selectedBookId = form.watch('bookId')
  const selectedBook = books.find(b => b.id === selectedBookId)

  async function onSubmit(data: FormData) {
    try {
      const isAvailable = selectedBook?.status === 'Available'
      await requestBook.mutateAsync({
        bookId: data.bookId,
        employeeId: data.employeeId,
        notes: data.notes,
        actionType: isAvailable ? 'REQUEST' : 'WAITLIST',
        performedBy: 'Librarian (Admin Manual Entry)',
        customReason: 'Manual entry added by library administrator',
      })
      toast({
        title: isAvailable ? 'Request Recorded' : 'Added to Waiting List',
        description: `Successfully added request for ${selectedBook?.title || 'the selected book'}.`,
      })
      form.reset()
      onOpenChange(false)
    } catch (err: any) {
      toast({
        title: 'Could Not Add Request',
        description: err?.message || 'Failed to submit request.',
        variant: 'destructive',
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif">Manual Book Request / Waitlist</DialogTitle>
          <DialogDescription className="text-xs">
            Add a book request or queue entry on behalf of a reader.
          </DialogDescription>
        </DialogHeader>

        <form id="admin-add-request-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Reader */}
          <div className="space-y-1.5">
            <Label htmlFor="req-emp-select">Reader *</Label>
            <Controller
              name="employeeId"
              control={form.control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="req-emp-select" className="text-xs">
                    <SelectValue placeholder="Select reader…" />
                  </SelectTrigger>
                  <SelectContent className="max-h-56">
                    {employees.map(emp => (
                      <SelectItem key={emp.id} value={emp.id} className="text-xs">
                        {emp.full_name} {emp.department ? `(${emp.department})` : ''} · {emp.employee_code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {form.formState.errors.employeeId && (
              <p className="text-xs text-destructive">{form.formState.errors.employeeId.message}</p>
            )}
          </div>

          {/* Book */}
          <div className="space-y-1.5">
            <Label htmlFor="req-book-select">Book *</Label>
            <Controller
              name="bookId"
              control={form.control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange} disabled={!!defaultBookId}>
                  <SelectTrigger id="req-book-select" className="text-xs">
                    <SelectValue placeholder="Select book…" />
                  </SelectTrigger>
                  <SelectContent className="max-h-56">
                    {books.map(b => (
                      <SelectItem key={b.id} value={b.id} className="text-xs">
                        {b.book_code} – {b.title} [{b.status}]
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {form.formState.errors.bookId && (
              <p className="text-xs text-destructive">{form.formState.errors.bookId.message}</p>
            )}
          </div>

          {/* Book status indicator */}
          {selectedBook && (
            <div className={`p-2.5 rounded-lg text-xs border ${
              selectedBook.status === 'Available'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-amber-50 text-amber-800 border-amber-200'
            }`}>
              Book Status: <strong>{selectedBook.status}</strong> —{' '}
              {selectedBook.status === 'Available'
                ? 'This entry will create an active book request.'
                : 'This book is currently loaned out. Reader will be appended to the FIFO waiting list.'}
            </div>
          )}

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="req-notes-input">Administrative Notes <span className="text-muted-foreground">(optional)</span></Label>
            <Textarea
              id="req-notes-input"
              placeholder="e.g. Requested via Slack or in person…"
              rows={2}
              className="text-xs"
              {...form.register('notes')}
            />
          </div>
        </form>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} className="text-xs">
            Cancel
          </Button>
          <Button
            id="admin-add-request-submit-btn"
            form="admin-add-request-form"
            type="submit"
            size="sm"
            disabled={requestBook.isPending}
            className="bg-forest hover:bg-forest-dark text-white text-xs"
          >
            {requestBook.isPending ? 'Recording…' : 'Add to Queue'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
