import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { BookCover } from '@/components/ui/book-cover'
import { formatDate } from '@/lib/utils'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { History, User, Calendar, BookOpen, AlertCircle } from 'lucide-react'
import type { BookRequestWithDetails } from '@/lib/database.types'

interface RequestHistoryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  request: BookRequestWithDetails | null
}

export function RequestHistoryDialog({
  open,
  onOpenChange,
  request,
}: RequestHistoryDialogProps) {
  // Query audit logs for this specific request
  const { data: auditLogs = [], isLoading } = useQuery({
    queryKey: ['request-audit', request?.id],
    enabled: open && !!request?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from('queue_audit_logs')
        .select('*')
        .eq('request_id', request!.id)
        .order('created_at', { ascending: false })

      return (data ?? []) as any[]
    },
  })

  if (!request) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 text-forest">
            <History className="h-5 w-5" />
            <DialogTitle className="text-base font-serif">Request History & Audit Log</DialogTitle>
          </div>
          <DialogDescription className="text-xs">
            Lifecycle history for this reader's book request.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          <div className="flex items-center gap-3 p-3 rounded-xl border bg-muted/30">
            <BookCover src={request.book?.cover_image_url} title={request.book?.title} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-sm truncate text-foreground">{request.book?.title}</p>
              <p className="text-[11px] text-muted-foreground font-mono">{request.book?.book_code}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Reader: <strong className="text-foreground">{request.employee?.full_name}</strong> ({request.employee?.department || '—'})
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 p-2.5 rounded-lg bg-muted/20 border text-[11px]">
            <div>
              <span className="text-muted-foreground block text-[10px]">Request Date:</span>
              <span className="font-medium text-foreground">{formatDate(request.request_date)}</span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[10px]">Current Status:</span>
              <span className="font-semibold text-foreground">{request.status}</span>
            </div>
          </div>

          {request.notes && (
            <div className="p-2.5 rounded-lg border bg-card text-[11px]">
              <span className="text-muted-foreground block text-[10px]">Reader Notes:</span>
              <p className="text-foreground italic mt-0.5">"{request.notes}"</p>
            </div>
          )}

          <div className="space-y-2">
            <h5 className="font-semibold text-xs text-foreground flex items-center gap-1.5 border-b pb-1">
              <History className="h-3.5 w-3.5 text-muted-foreground" />
              Event Timeline
            </h5>

            {isLoading ? (
              <p className="text-xs text-muted-foreground py-2 text-center">Loading audit events…</p>
            ) : auditLogs.length === 0 ? (
              <div className="p-3 text-center rounded-lg bg-muted/20 text-muted-foreground text-[11px]">
                Request originally logged on {formatDate(request.request_date)}. Current status: {request.status}.
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {auditLogs.map((log: any) => (
                  <div key={log.id} className="p-2.5 rounded-lg border bg-card text-[11px] space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-foreground uppercase tracking-wider text-[10px]">
                        {log.action}
                      </span>
                      <span className="text-muted-foreground text-[10px]">
                        {new Date(log.created_at).toLocaleString()}
                      </span>
                    </div>
                    {log.reason && <p className="text-muted-foreground">{log.reason}</p>}
                    <p className="text-[10px] text-muted-foreground">Action by: {log.performed_by || 'System'}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="pt-2 border-t">
          <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

