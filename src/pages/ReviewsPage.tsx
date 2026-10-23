import { useState } from 'react'
import { Star, Plus, Trash2 } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { BookCover } from '@/components/ui/book-cover'
import { EmptyState, LoadingRows, ErrorMessage } from '@/components/ui/states'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog'
import { supabase } from '@/lib/supabase'
import { useBooks } from '@/hooks/use-books'
import { useEmployees } from '@/hooks/use-employees'
import { formatDate } from '@/lib/utils'
import { toast } from '@/hooks/use-toast'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { today } from '@/lib/utils'

const reviewSchema = z.object({
  book_id:     z.string().min(1, 'Book is required'),
  employee_id: z.string().min(1, 'Employee is required'),
  rating:      z.number().int().min(1).max(5),
  comment:     z.string().optional(),
  review_date: z.string().min(1),
})

type ReviewForm = z.infer<typeof reviewSchema>

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0)
  return (
    <div className="flex gap-1">
      {[1,2,3,4,5].map(s => (
        <button
          key={s}
          type="button"
          className="transition-transform hover:scale-110"
          onMouseEnter={() => setHover(s)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(s)}
        >
          <Star
            className={`h-6 w-6 ${s <= (hover || value) ? 'text-amber-400 fill-amber-400' : 'text-gray-300'}`}
          />
        </button>
      ))}
    </div>
  )
}

function AddReviewDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const qc = useQueryClient()
  const { data: booksData } = useBooks({ pageSize: 200 })
  const { data: empsData }  = useEmployees({ isActive: true, pageSize: 200 })

  const form = useForm<ReviewForm>({
    resolver: zodResolver(reviewSchema),
    defaultValues: { book_id: '', employee_id: '', rating: 5, comment: '', review_date: today() },
  })

  const add = useMutation({
    mutationFn: async (data: ReviewForm) => {
      const { error } = await supabase.from('reviews').insert({
        book_id: data.book_id,
        employee_id: data.employee_id,
        rating: data.rating,
        comment: data.comment || null,
        review_date: data.review_date,
      })
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reviews'] })
      toast({ title: 'Review added', variant: 'success' as never })
      form.reset()
      onOpenChange(false)
    },
    onError: (err: Error) => toast({ title: 'Failed to add review', description: err.message, variant: 'destructive' }),
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Review</DialogTitle>
          <DialogDescription>Record a book review from an employee.</DialogDescription>
        </DialogHeader>

        <form id="review-form" onSubmit={form.handleSubmit(d => add.mutate(d))} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Book *</Label>
            <Controller
              name="book_id"
              control={form.control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="review-book-select"><SelectValue placeholder="Select book…" /></SelectTrigger>
                  <SelectContent>
                    {(booksData?.books ?? []).map(b => (
                      <SelectItem key={b.id} value={b.id}>{b.book_code} – {b.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Employee *</Label>
            <Controller
              name="employee_id"
              control={form.control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="review-employee-select"><SelectValue placeholder="Select employee…" /></SelectTrigger>
                  <SelectContent>
                    {(empsData?.employees ?? []).map(e => (
                      <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Rating *</Label>
            <Controller
              name="rating"
              control={form.control}
              render={({ field }) => <StarRating value={field.value} onChange={field.onChange} />}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="review-comment-input">Comment <span className="text-muted-foreground">(optional)</span></Label>
            <Textarea id="review-comment-input" {...form.register('comment')} placeholder="Write a review…" rows={3} />
          </div>
        </form>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button id="review-submit-btn" form="review-form" type="submit" loading={add.isPending}>Save Review</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function ReviewsPage() {
  const qc = useQueryClient()
  const [addOpen, setAddOpen] = useState(false)

  const { data: reviews = [], isLoading, error } = useQuery({
    queryKey: ['reviews'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reviews')
        .select(`*, book:books(id, book_code, title, cover_image_url), employee:employees(id, full_name)`)
        .order('review_date', { ascending: false })
      if (error) throw error
      return data ?? []
    },
  })

  const deleteReview = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('reviews').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reviews'] })
      toast({ title: 'Review deleted', variant: 'success' as never })
    },
  })

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold">Reviews</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{reviews.length} review{reviews.length !== 1 ? 's' : ''}</p>
        </div>
        <Button id="add-review-btn" onClick={() => setAddOpen(true)} size="sm">
          <Plus className="h-4 w-4" />Add Review
        </Button>
      </div>

      <div className="rounded-xl border bg-card overflow-hidden">
        {error ? (
          <div className="p-6"><ErrorMessage message="Failed to load reviews." /></div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th className="w-12">Cover</th>
                <th>Book</th>
                <th>Employee</th>
                <th>Rating</th>
                <th>Comment</th>
                <th>Date</th>
                <th className="w-12"></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <LoadingRows columns={7} rows={5} />
              ) : reviews.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-0">
                    <EmptyState icon={Star} title="No reviews yet" description="Add reviews to track employee feedback on books." action={<Button size="sm" onClick={() => setAddOpen(true)}><Plus className="h-4 w-4" />Add Review</Button>} />
                  </td>
                </tr>
              ) : (
                reviews.map((review: {id: string; rating: number; comment: string | null; review_date: string; book: {id: string; book_code: string; title: string; cover_image_url: string | null} | null; employee: {id: string; full_name: string} | null}) => (
                  <tr key={review.id}>
                    <td>
                      <BookCover src={review.book?.cover_image_url} title={review.book?.title ?? ''} size="sm" />
                    </td>
                    <td>
                      <p className="font-medium text-sm">{review.book?.title}</p>
                      <p className="text-xs font-mono text-primary">{review.book?.book_code}</p>
                    </td>
                    <td className="text-sm">{review.employee?.full_name}</td>
                    <td>
                      <div className="flex gap-0.5">
                        {[1,2,3,4,5].map(s => (
                          <Star key={s} className={`h-3.5 w-3.5 ${s <= review.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-200'}`} />
                        ))}
                      </div>
                    </td>
                    <td className="text-sm text-muted-foreground max-w-xs truncate-2">{review.comment ?? '—'}</td>
                    <td className="text-sm text-muted-foreground">{formatDate(review.review_date)}</td>
                    <td>
                      <button
                        className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-destructive transition-colors"
                        onClick={() => {
                          if (confirm('Delete this review?')) deleteReview.mutate(review.id)
                        }}
                        aria-label="Delete review"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      <AddReviewDialog open={addOpen} onOpenChange={setAddOpen} />
    </div>
  )
}
