import { useState } from 'react'
import {
  Download, RotateCcw, AlertTriangle, ShieldCheck, CheckCircle2,
  Trash2, Database, ShieldAlert, FileText, ArrowRight
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { toast } from '@/hooks/use-toast'

type ResetTarget = 'catalogue' | 'borrowings' | 'requests' | 'all'

export function DemoDataMaintenance() {
  const qc = useQueryClient()
  const [resetModalOpen, setResetModalOpen] = useState(false)
  const [resetTarget, setResetTarget] = useState<ResetTarget>('all')
  const [typedConfirm, setTypedConfirm] = useState('')
  const [isResetting, setIsResetting] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  // Query counts of demo records vs real records
  const { data: recordCounts, refetch: refetchCounts } = useQuery({
    queryKey: ['demo-maintenance-counts'],
    queryFn: async () => {
      const [booksRes, loansRes, reqsRes] = await Promise.all([
        supabase.from('books').select('id, is_demo'),
        supabase.from('borrowings').select('id, is_demo'),
        supabase.from('book_requests').select('id, is_demo'),
      ])

      const books = booksRes.data || []
      const loans = loansRes.data || []
      const reqs = reqsRes.data || []

      return {
        demoBooks: books.filter((b: any) => b.is_demo).length,
        realBooks: books.filter((b: any) => !b.is_demo).length,
        demoLoans: loans.filter((l: any) => l.is_demo).length,
        realLoans: loans.filter((l: any) => !l.is_demo).length,
        demoReqs: reqs.filter((r: any) => r.is_demo).length,
        realReqs: reqs.filter((r: any) => !r.is_demo).length,
      }
    },
  })

  // Export full backup JSON
  async function handleExportBackup() {
    setIsExporting(true)
    try {
      const [booksRes, empsRes, loansRes, reqsRes, settingsRes] = await Promise.all([
        supabase.from('books').select('*'),
        supabase.from('employees').select('*'),
        supabase.from('borrowings').select('*'),
        supabase.from('book_requests').select('*'),
        supabase.from('app_settings').select('*'),
      ])

      const backup = {
        exportedAt: new Date().toISOString(),
        system: 'Book Nook Office Library System',
        data: {
          books: booksRes.data || [],
          employees: empsRes.data || [],
          borrowings: loansRes.data || [],
          book_requests: reqsRes.data || [],
          settings: settingsRes.data || [],
        },
      }

      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `booknook_backup_${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast({
        title: 'Library Records Exported',
        description: 'Complete backup JSON downloaded safely.',
      })
    } catch (e: any) {
      toast({
        title: 'Export Failed',
        description: e?.message || 'Failed generating library backup.',
        variant: 'destructive',
      })
    } finally {
      setIsExporting(false)
    }
  }

  // Open reset dialog
  function openResetDialog(target: ResetTarget) {
    setResetTarget(target)
    setTypedConfirm('')
    setResetModalOpen(true)
  }

  // Execute demo data reset
  async function handleExecuteReset() {
    if (resetTarget === 'all' && typedConfirm !== 'RESET DEMO DATA') {
      toast({ title: 'Confirmation Phrase Mismatch', description: 'Please type RESET DEMO DATA exactly.', variant: 'destructive' })
      return
    }

    setIsResetting(true)
    try {
      if (resetTarget === 'requests' || resetTarget === 'all') {
        await supabase.from('book_requests').delete().eq('is_demo', true)
      }

      if (resetTarget === 'borrowings' || resetTarget === 'all') {
        await supabase.from('borrowings').delete().eq('is_demo', true)
      }

      if (resetTarget === 'catalogue' || resetTarget === 'all') {
        // Also safely clear borrowings/requests on those demo books first
        const { data: demoBooks } = await supabase.from('books').select('id').eq('is_demo', true)
        const demoBookIds = (demoBooks || []).map((b: any) => b.id)

        for (const bId of demoBookIds) {
          await supabase.from('book_requests').delete().eq('book_id', bId)
          await supabase.from('borrowings').delete().eq('book_id', bId)
        }

        await supabase.from('books').delete().eq('is_demo', true)
      }

      // Record audit
      await supabase.from('audit_logs').insert({
        action: 'RESET_DEMO_DATA',
        entity_type: 'SYSTEM_MAINTENANCE',
        details: { resetTarget, timestamp: new Date().toISOString() },
      })

      // Invalidate queries
      await qc.invalidateQueries()
      await refetchCounts()

      setResetModalOpen(false)
      toast({
        title: 'Demo Data Cleared Successfully',
        description: 'Demo records removed. All real books, employees, and accounts remain intact.',
      })
    } catch (err: any) {
      toast({
        title: 'Reset Error',
        description: err?.message || 'Failed to complete demo reset.',
        variant: 'destructive',
      })
    } finally {
      setIsResetting(false)
    }
  }

  return (
    <Card className="border-amber-200/80 bg-gradient-to-b from-amber-50/40 to-card">
      <CardHeader>
        <div className="flex items-center gap-2 text-amber-900 dark:text-amber-400">
          <Database className="h-5 w-5" />
          <CardTitle>Demo Data & Maintenance</CardTitle>
        </div>
        <CardDescription>
          Safely clear sample records before entering real office library data. Real books, actual loans, employee accounts, and app configuration will never be deleted.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Record Summary Box */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded-lg border bg-background/80">
            <span className="text-muted-foreground block">Books Catalogue</span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <strong className="text-amber-700 font-semibold">{recordCounts?.demoBooks ?? 0} demo</strong>
              <span className="text-muted-foreground">/ {recordCounts?.realBooks ?? 0} real</span>
            </div>
          </div>

          <div className="p-3 rounded-lg border bg-background/80">
            <span className="text-muted-foreground block">Borrowing History</span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <strong className="text-amber-700 font-semibold">{recordCounts?.demoLoans ?? 0} demo</strong>
              <span className="text-muted-foreground">/ {recordCounts?.realLoans ?? 0} real</span>
            </div>
          </div>

          <div className="p-3 rounded-lg border bg-background/80 sm:col-span-1 col-span-2">
            <span className="text-muted-foreground block">Waiting Lists & Requests</span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <strong className="text-amber-700 font-semibold">{recordCounts?.demoReqs ?? 0} demo</strong>
              <span className="text-muted-foreground">/ {recordCounts?.realReqs ?? 0} real</span>
            </div>
          </div>
        </div>

        {/* Safety Guarantee Banner */}
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3.5 flex items-start gap-2.5 text-xs text-emerald-950">
          <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong>Protection Guarantee:</strong> Reset operations only affect records tagged with <code className="font-mono bg-emerald-100/80 px-1 py-0.5 rounded text-[11px]">is_demo = true</code>. When you add or import real books, they default to real records and are strictly preserved.
          </p>
        </div>

        {/* Action Controls Grid */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportBackup}
              disabled={isExporting}
              className="text-xs font-semibold gap-1.5"
            >
              <Download className="h-4 w-4 text-forest" />
              {isExporting ? 'Exporting…' : 'Export & Backup Library Records (JSON)'}
            </Button>
          </div>

          <div className="grid sm:grid-cols-2 gap-2.5 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => openResetDialog('catalogue')}
              className="text-xs text-amber-900 border-amber-300 hover:bg-amber-100/60 justify-start"
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1.5 text-amber-700" />
              Reset Demo Book Catalogue
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => openResetDialog('borrowings')}
              className="text-xs text-amber-900 border-amber-300 hover:bg-amber-100/60 justify-start"
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1.5 text-amber-700" />
              Clear Demo Borrowing & Return History
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => openResetDialog('requests')}
              className="text-xs text-amber-900 border-amber-300 hover:bg-amber-100/60 justify-start"
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1.5 text-amber-700" />
              Clear Demo Requests & Waiting Lists
            </Button>

            <Button
              variant="destructive"
              size="sm"
              onClick={() => openResetDialog('all')}
              className="text-xs justify-start"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              Reset All Demo Library Data
            </Button>
          </div>
        </div>
      </CardContent>

      {/* Confirmation Dialog */}
      <Dialog open={resetModalOpen} onOpenChange={setResetModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              <DialogTitle>Confirm Demo Data Reset</DialogTitle>
            </div>
            <DialogDescription className="text-xs pt-1">
              {resetTarget === 'all'
                ? 'This action will delete all sample books, demo borrowings, and demo waiting list requests.'
                : resetTarget === 'catalogue'
                ? 'This action will delete sample demo books from the catalogue.'
                : resetTarget === 'borrowings'
                ? 'This action will clear all demo borrowing and return transactions.'
                : 'This action will clear all demo waiting list and book requests.'}
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 text-xs space-y-3">
            <div className="p-3 bg-muted rounded-lg text-muted-foreground space-y-1">
              <p className="font-semibold text-foreground">Records affected by this reset:</p>
              <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                {(resetTarget === 'catalogue' || resetTarget === 'all') && (
                  <li>{recordCounts?.demoBooks ?? 0} demo books (preserving {recordCounts?.realBooks ?? 0} real books)</li>
                )}
                {(resetTarget === 'borrowings' || resetTarget === 'all') && (
                  <li>{recordCounts?.demoLoans ?? 0} demo loan records (preserving {recordCounts?.realLoans ?? 0} real loans)</li>
                )}
                {(resetTarget === 'requests' || resetTarget === 'all') && (
                  <li>{recordCounts?.demoReqs ?? 0} demo waiting list requests (preserving {recordCounts?.realReqs ?? 0} real requests)</li>
                )}
                <li>Administrator accounts, employee directory, and system settings: <strong>Preserved</strong></li>
              </ul>
            </div>

            {/* If resetting all, require typing RESET DEMO DATA */}
            {resetTarget === 'all' && (
              <div className="space-y-1.5 pt-1">
                <Label htmlFor="type-confirm-input" className="text-xs font-semibold text-foreground">
                  Type <strong className="text-destructive font-mono">RESET DEMO DATA</strong> to confirm:
                </Label>
                <Input
                  id="type-confirm-input"
                  value={typedConfirm}
                  onChange={e => setTypedConfirm(e.target.value)}
                  placeholder="RESET DEMO DATA"
                  className="font-mono text-xs h-9 uppercase"
                  autoFocus
                />
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setResetModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={isResetting || (resetTarget === 'all' && typedConfirm !== 'RESET DEMO DATA')}
              onClick={handleExecuteReset}
            >
              {isResetting ? 'Resetting…' : 'Execute Reset'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
