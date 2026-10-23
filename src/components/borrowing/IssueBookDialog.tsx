import { useEffect } from 'react'
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
import { useIssueBook } from '@/hooks/use-borrowings'
import { useBooks } from '@/hooks/use-books'
import { useEmployees } from '@/hooks/use-employees'
import { today, addDays } from '@/lib/utils'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

const schema = z.object({
  bookId:      z.string().min(1, 'Please select a book'),
  employeeId:  z.string().min(1, 'Please select an employee'),
  issueDate:   z.string().min(1, 'Issue date is required'),
  dueDate:     z.string().min(1, 'Due date is required'),
  remarks:     z.string().optional(),
}).refine(d => d.dueDate >= d.issueDate, {
  message: 'Due date must be on or after the issue date',
  path: ['dueDate'],
})

type FormData = z.infer<typeof schema>

interface IssueBookDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultBookId?: string
}

export function IssueBookDialog({ open, onOpenChange, defaultBookId }: IssueBookDialogProps) {
  const issueBook = useIssueBook()

  // Load default loan days from settings
  const { data: settings } = useQuery({
    queryKey: ['app-settings'],
    queryFn: async () => {
      const { data } = await supabase.from('app_settings').select('*').eq('id', 1).single()
      return data
    },
  })

  const defaultLoanDays = settings?.default_loan_days ?? 14

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      bookId:     defaultBookId ?? '',
      employeeId: '',
      issueDate:  today(),
      dueDate:    addDays(today(), defaultLoanDays),
      remarks:    '',
    },
  })

  const issueDate = form.watch('issueDate')

  useEffect(() => {
    if (issueDate) {
      form.setValue('dueDate', addDays(issueDate, defaultLoanDays))
    }
  }, [issueDate, defaultLoanDays, form])

  const booksResult = useBooks({ status: 'Available', pageSize: 100 })
  const employeesResult = useEmployees({ isActive: true, pageSize: 200 })

  const availableBooks = booksResult.data?.books ?? []
  const activeEmployees = employeesResult.data?.employees ?? []

  async function onSubmit(data: FormData) {
    await issueBook.mutateAsync({
      bookId: data.bookId,
      employeeId: data.employeeId,
      issueDate: data.issueDate,
      dueDate: data.dueDate,
      remarks: data.remarks,
    })
    form.reset()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Issue Book</DialogTitle>
          <DialogDescription>Record a new book loan for an employee.</DialogDescription>
        </DialogHeader>

        <form id="issue-book-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Book */}
          <div className="space-y-1.5">
            <Label htmlFor="issue-book-select">Book *</Label>
            <Controller
              name="bookId"
              control={form.control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange} disabled={!!defaultBookId}>
                  <SelectTrigger id="issue-book-select">
                    <SelectValue placeholder="Select an available book…" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableBooks.map(b => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.book_code} – {b.title}
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

          {/* Employee */}
          <div className="space-y-1.5">
            <Label htmlFor="issue-employee-select">Employee *</Label>
            <Controller
              name="employeeId"
              control={form.control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="issue-employee-select">
                    <SelectValue placeholder="Select an employee…" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeEmployees.map(e => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.full_name}{e.department ? ` (${e.department})` : ''}
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

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="issue-date-input">Issue Date *</Label>
              <Input
                id="issue-date-input"
                type="date"
                {...form.register('issueDate')}
              />
              {form.formState.errors.issueDate && (
                <p className="text-xs text-destructive">{form.formState.errors.issueDate.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="due-date-input">Due Date *</Label>
              <Input
                id="due-date-input"
                type="date"
                {...form.register('dueDate')}
              />
              {form.formState.errors.dueDate && (
                <p className="text-xs text-destructive">{form.formState.errors.dueDate.message}</p>
              )}
            </div>
          </div>

          {/* Remarks */}
          <div className="space-y-1.5">
            <Label htmlFor="issue-remarks-input">Remarks <span className="text-muted-foreground">(optional)</span></Label>
            <Textarea
              id="issue-remarks-input"
              placeholder="Any notes about this loan…"
              rows={2}
              {...form.register('remarks')}
            />
          </div>
        </form>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            id="issue-book-submit-btn"
            form="issue-book-form"
            type="submit"
            loading={issueBook.isPending}
          >
            Issue Book
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
