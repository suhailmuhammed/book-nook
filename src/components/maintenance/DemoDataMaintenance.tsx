import { useState, useRef } from 'react'
import {
  Download, Upload, RotateCcw, AlertTriangle, ShieldCheck, CheckCircle2,
  Trash2, Database, ShieldAlert, FileText, FlaskConical, Layers
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

type ResetTarget =
  | 'demo_catalogue'
  | 'demo_borrowings'
  | 'demo_requests'
  | 'demo_all'
  | 'purge_catalogue'
  | 'purge_borrowings'
  | 'purge_requests'
  | 'purge_all'

export function DemoDataMaintenance() {
  const qc = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [resetModalOpen, setResetModalOpen] = useState(false)
  const [resetTarget, setResetTarget] = useState<ResetTarget>('demo_all')
  const [typedConfirm, setTypedConfirm] = useState('')
  const [isResetting, setIsResetting] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [isRestoring, setIsRestoring] = useState(false)

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
        totalBooks: books.length,
        demoLoans: loans.filter((l: any) => l.is_demo).length,
        realLoans: loans.filter((l: any) => !l.is_demo).length,
        totalLoans: loans.length,
        demoReqs: reqs.filter((r: any) => r.is_demo).length,
        realReqs: reqs.filter((r: any) => !r.is_demo).length,
        totalReqs: reqs.length,
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
        description: `Exported ${(booksRes.data || []).length} books, ${(loansRes.data || []).length} loans, and ${(empsRes.data || []).length} readers.`,
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

  // Restore from backup JSON
  async function handleRestoreBackup(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setIsRestoring(true)
    try {
      const text = await file.text()
      const json = JSON.parse(text)

      if (!json.data || (!json.data.books && !json.data.employees)) {
        throw new Error('Invalid backup file. Missing standard library records format.')
      }

      const books = json.data.books || []
      const emps = json.data.employees || []
      const loans = json.data.borrowings || []
      const reqs = json.data.book_requests || []

      // Upsert employees
      if (emps.length > 0) {
        await supabase.from('employees').upsert(emps)
      }

      // Upsert books
      if (books.length > 0) {
        await supabase.from('books').upsert(books)
      }

      // Upsert borrowings
      if (loans.length > 0) {
        await supabase.from('borrowings').upsert(loans)
      }

      // Upsert requests
      if (reqs.length > 0) {
        await supabase.from('book_requests').upsert(reqs)
      }

      await qc.invalidateQueries()
      await refetchCounts()

      toast({
        title: 'Backup Restored Successfully',
        description: `Restored ${books.length} books, ${loans.length} loans, and ${emps.length} readers.`,
      })
    } catch (err: any) {
      toast({
        title: 'Restore Failed',
        description: err?.message || 'Could not parse or restore backup file.',
        variant: 'destructive',
      })
    } finally {
      setIsRestoring(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // Open reset dialog
  function openResetDialog(target: ResetTarget) {
    setResetTarget(target)
    setTypedConfirm('')
    setResetModalOpen(true)
  }

  // Required confirmation phrase helper
  const requiredPhrase =
    resetTarget === 'purge_catalogue'
      ? 'PURGE BOOKS'
      : resetTarget === 'purge_all'
      ? 'PURGE ALL'
      : resetTarget === 'demo_all'
      ? 'RESET DEMO DATA'
      : null

  const isConfirmDisabled =
    isResetting ||
    (requiredPhrase ? typedConfirm.trim().toUpperCase() !== requiredPhrase : false)

  // Execute demo data reset or real records purge
  async function handleExecuteReset() {
    if (requiredPhrase && typedConfirm.trim().toUpperCase() !== requiredPhrase) {
      toast({
        title: 'Confirmation Phrase Mismatch',
        description: `Please type ${requiredPhrase} to confirm.`,
        variant: 'destructive',
      })
      return
    }

    setIsResetting(true)
    try {
      // 1. PURGE ALL BOOKS (Real + Demo)
      if (resetTarget === 'purge_catalogue' || resetTarget === 'purge_all') {
        // Clear dependent borrowings and requests first to respect relations
        await supabase.from('book_requests').delete().neq('id', '00000000-0000-0000-0000-000000000000')
        await supabase.from('borrowings').delete().neq('id', '00000000-0000-0000-0000-000000000000')
        await supabase.from('books').delete().neq('id', '00000000-0000-0000-0000-000000000000')

        // Also reset book sequence generator for fresh import testing
        try {
          localStorage.removeItem('booknook_mock_db_seq_book')
        } catch {}
      }

      // 2. PURGE ALL BORROWINGS (Real + Demo)
      if (resetTarget === 'purge_borrowings' || resetTarget === 'purge_all') {
        await supabase.from('borrowings').delete().neq('id', '00000000-0000-0000-0000-000000000000')
        // Restore book statuses to Available if they were borrowed
        const { data: allBooks } = await supabase.from('books').select('id, status')
        if (allBooks) {
          for (const b of allBooks) {
            if (b.status === 'Borrowed') {
              await supabase.from('books').update({ status: 'Available' }).eq('id', b.id)
            }
          }
        }
      }

      // 3. PURGE ALL REQUESTS (Real + Demo)
      if (resetTarget === 'purge_requests' || resetTarget === 'purge_all') {
        await supabase.from('book_requests').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      }

      // 4. DEMO ONLY RESETS
      if (resetTarget === 'demo_requests' || resetTarget === 'demo_all') {
        await supabase.from('book_requests').delete().eq('is_demo', true)
      }

      if (resetTarget === 'demo_borrowings' || resetTarget === 'demo_all') {
        await supabase.from('borrowings').delete().eq('is_demo', true)
      }

      if (resetTarget === 'demo_catalogue' || resetTarget === 'demo_all') {
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
        action: resetTarget.toUpperCase(),
        entity_type: 'SYSTEM_MAINTENANCE',
        details: { resetTarget, timestamp: new Date().toISOString() },
      })

      // Invalidate queries & refetch
      await qc.invalidateQueries()
      await refetchCounts()

      setResetModalOpen(false)
      const successTitle = resetTarget.startsWith('purge_')
        ? 'Catalogue Records Cleared'
        : 'Demo Data Cleared Successfully'
      const successDesc =
        resetTarget === 'purge_catalogue'
          ? 'All books cleared. Catalogue is now empty and ready for fresh import.'
          : resetTarget === 'purge_all'
          ? 'Entire library reset (0 books, 0 loans, 0 requests). Readers and settings preserved.'
          : 'Records removed successfully.'

      toast({
        title: successTitle,
        description: successDesc,
      })
    } catch (err: any) {
      toast({
        title: 'Operation Error',
        description: err?.message || 'Failed to complete reset operation.',
        variant: 'destructive',
      })
    } finally {
      setIsResetting(false)
    }
  }

  const totalBooks = recordCounts?.totalBooks ?? (recordCounts?.realBooks ?? 0) + (recordCounts?.demoBooks ?? 0)
  const totalLoans = recordCounts?.totalLoans ?? (recordCounts?.realLoans ?? 0) + (recordCounts?.demoLoans ?? 0)
  const totalReqs = recordCounts?.totalReqs ?? (recordCounts?.realReqs ?? 0) + (recordCounts?.demoReqs ?? 0)

  return (
    <Card className="border-amber-200/80 bg-gradient-to-b from-amber-50/40 to-card">
      <CardHeader>
        <div className="flex items-center gap-2 text-amber-900 dark:text-amber-400">
          <Database className="h-5 w-5" />
          <CardTitle>Library Maintenance & Testing Controls</CardTitle>
        </div>
        <CardDescription>
          Export complete JSON backups, restore previous archives, or purge catalog records to test spreadsheet imports and workflows.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Record Summary Box */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded-lg border bg-background/80 shadow-2xs">
            <span className="text-muted-foreground block font-medium">Books Catalogue</span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <strong className="text-foreground text-sm font-bold">{totalBooks} total</strong>
              <span className="text-[11px] text-muted-foreground">({recordCounts?.realBooks ?? 0} real / {recordCounts?.demoBooks ?? 0} demo)</span>
            </div>
          </div>

          <div className="p-3 rounded-lg border bg-background/80 shadow-2xs">
            <span className="text-muted-foreground block font-medium">Borrowing History</span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <strong className="text-foreground text-sm font-bold">{totalLoans} total</strong>
              <span className="text-[11px] text-muted-foreground">({recordCounts?.realLoans ?? 0} real / {recordCounts?.demoLoans ?? 0} demo)</span>
            </div>
          </div>

          <div className="p-3 rounded-lg border bg-background/80 shadow-2xs sm:col-span-1 col-span-2">
            <span className="text-muted-foreground block font-medium">Waiting Lists & Requests</span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <strong className="text-foreground text-sm font-bold">{totalReqs} total</strong>
              <span className="text-[11px] text-muted-foreground">({recordCounts?.realReqs ?? 0} real / {recordCounts?.demoReqs ?? 0} demo)</span>
            </div>
          </div>
        </div>

        {/* Backup & Restore Controls */}
        <div className="rounded-xl border bg-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Database className="h-3.5 w-3.5 text-forest" />
              Full Library Backup & Restore (JSON)
            </h4>
            <span className="text-[11px] text-muted-foreground">Recommended before running purges</span>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <Button
              id="export-backup-btn"
              variant="outline"
              size="sm"
              onClick={handleExportBackup}
              disabled={isExporting}
              className="text-xs font-semibold gap-1.5 border-forest/30 text-forest hover:bg-forest/5"
            >
              <Download className="h-4 w-4 text-forest" />
              {isExporting ? 'Exporting…' : 'Export & Backup Library Records (JSON)'}
            </Button>

            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleRestoreBackup}
              className="hidden"
            />

            <Button
              id="restore-backup-btn"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isRestoring}
              className="text-xs font-semibold gap-1.5 border-forest/30 text-forest hover:bg-forest/5"
            >
              <Upload className="h-4 w-4 text-forest" />
              {isRestoring ? 'Restoring…' : 'Restore Library from Backup (JSON)'}
            </Button>
          </div>
        </div>

        {/* Testing Purge Section (For Real + Demo Books) */}
        <div className="rounded-xl border border-rose-200/80 bg-rose-50/40 p-4 space-y-3">
          <div className="flex items-start gap-2.5">
            <FlaskConical className="h-4 w-4 text-rose-700 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold text-rose-950">
                Testing Stage & Catalogue Purge Tools (Real + Demo)
              </h4>
              <p className="text-[11px] text-rose-800/90 leading-relaxed mt-0.5">
                Use these tools to clear real and imported test books, reset loan history, or empty the catalog completely so you can test import templates and backup files from scratch. Reader accounts and app settings will <strong>never</strong> be deleted.
              </p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-2.5 pt-1">
            <Button
              id="purge-catalogue-btn"
              variant="outline"
              size="sm"
              onClick={() => openResetDialog('purge_catalogue')}
              className="text-xs text-rose-900 border-rose-300 hover:bg-rose-100/70 justify-start"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1.5 text-rose-700" />
              Purge All Books (Reset Catalogue to 0)
            </Button>

            <Button
              id="purge-borrowings-btn"
              variant="outline"
              size="sm"
              onClick={() => openResetDialog('purge_borrowings')}
              className="text-xs text-rose-900 border-rose-300 hover:bg-rose-100/70 justify-start"
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1.5 text-rose-700" />
              Clear All Borrowing History
            </Button>

            <Button
              id="purge-requests-btn"
              variant="outline"
              size="sm"
              onClick={() => openResetDialog('purge_requests')}
              className="text-xs text-rose-900 border-rose-300 hover:bg-rose-100/70 justify-start"
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1.5 text-rose-700" />
              Clear All Requests & Waiting Lists
            </Button>

            <Button
              id="purge-all-btn"
              variant="destructive"
              size="sm"
              onClick={() => openResetDialog('purge_all')}
              className="text-xs justify-start bg-rose-600 hover:bg-rose-700"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              Full Library Reset (Purge All Books, Loans & Requests)
            </Button>
          </div>
        </div>

        {/* Demo-Only Cleanup Section */}
        <div className="rounded-xl border bg-background/60 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-amber-700" />
                Sample Demo Data Only (Preserves Real Books)
              </h4>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Only affects records marked with <code className="font-mono bg-muted px-1 py-0.5 rounded text-[10px]">is_demo = true</code>. Real books are strictly protected.
              </p>
            </div>
            <span className="text-[11px] font-semibold text-amber-800 bg-amber-100/70 px-2 py-0.5 rounded-full">
              {recordCounts?.demoBooks ?? 0} demo books
            </span>
          </div>

          <div className="grid sm:grid-cols-2 gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => openResetDialog('demo_catalogue')}
              disabled={(recordCounts?.demoBooks ?? 0) === 0}
              className="text-xs justify-start"
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
              Reset Demo Book Catalogue Only
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => openResetDialog('demo_borrowings')}
              disabled={(recordCounts?.demoLoans ?? 0) === 0}
              className="text-xs justify-start"
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
              Clear Demo Borrowings Only
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => openResetDialog('demo_requests')}
              disabled={(recordCounts?.demoReqs ?? 0) === 0}
              className="text-xs justify-start"
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
              Clear Demo Requests Only
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => openResetDialog('demo_all')}
              disabled={(recordCounts?.demoBooks ?? 0) === 0 && (recordCounts?.demoLoans ?? 0) === 0 && (recordCounts?.demoReqs ?? 0) === 0}
              className="text-xs justify-start text-amber-900 border-amber-300 hover:bg-amber-100/60"
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1.5 text-amber-700" />
              Clear All Demo Records (Keep Real Books)
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
              <DialogTitle>
                {resetTarget.startsWith('purge_') ? 'Confirm Data Purge' : 'Confirm Demo Data Reset'}
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs pt-1">
              {resetTarget === 'purge_catalogue'
                ? 'This action will delete ALL books from the catalogue (both real and demo).'
                : resetTarget === 'purge_all'
                ? 'This action will completely wipe all books, loans, and requests to test fresh imports.'
                : resetTarget === 'purge_borrowings'
                ? 'This action will clear all borrowing and return history.'
                : resetTarget === 'purge_requests'
                ? 'This action will clear all waiting lists and requests.'
                : 'This action will only remove sample records tagged with is_demo = true.'}
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 text-xs space-y-3">
            <div className="p-3 bg-muted rounded-lg text-muted-foreground space-y-1">
              <p className="font-semibold text-foreground">Records affected by this operation:</p>
              <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                {resetTarget === 'purge_catalogue' && (
                  <>
                    <li className="font-semibold text-destructive">
                      All {totalBooks} books will be permanently deleted ({recordCounts?.realBooks ?? 0} real, {recordCounts?.demoBooks ?? 0} demo)
                    </li>
                    <li>Any active loans and waiting lists linked to these books will also be cleared.</li>
                    <li>Book code sequence will reset to BK001 for clean import testing.</li>
                  </>
                )}

                {resetTarget === 'purge_all' && (
                  <>
                    <li className="font-semibold text-destructive">
                      All {totalBooks} books, {totalLoans} loan records, and {totalReqs} requests will be deleted.
                    </li>
                    <li>Catalogue will be completely empty (0 books).</li>
                    <li>Book code sequence will reset to BK001.</li>
                  </>
                )}

                {resetTarget === 'purge_borrowings' && (
                  <li className="font-semibold text-destructive">All {totalLoans} borrowing and return records will be cleared.</li>
                )}

                {resetTarget === 'purge_requests' && (
                  <li className="font-semibold text-destructive">All {totalReqs} book requests and waiting list queues will be cleared.</li>
                )}

                {resetTarget === 'demo_catalogue' && (
                  <li>{recordCounts?.demoBooks ?? 0} demo books (preserving {recordCounts?.realBooks ?? 0} real books)</li>
                )}
                {resetTarget === 'demo_borrowings' && (
                  <li>{recordCounts?.demoLoans ?? 0} demo loans (preserving {recordCounts?.realLoans ?? 0} real loans)</li>
                )}
                {resetTarget === 'demo_requests' && (
                  <li>{recordCounts?.demoReqs ?? 0} demo requests (preserving {recordCounts?.realReqs ?? 0} real requests)</li>
                )}
                {resetTarget === 'demo_all' && (
                  <li>All demo books, loans, and requests (preserving {recordCounts?.realBooks ?? 0} real books)</li>
                )}
                <li className="pt-1 text-foreground">
                  Reader Directory (Employees) & System Settings: <strong>Strictly Preserved</strong>
                </li>
              </ul>
            </div>

            {/* If phrase confirmation is required */}
            {requiredPhrase && (
              <div className="space-y-1.5 pt-1">
                <Label htmlFor="type-confirm-input" className="text-xs font-semibold text-foreground">
                  Type <strong className="text-destructive font-mono">{requiredPhrase}</strong> to confirm:
                </Label>
                <Input
                  id="type-confirm-input"
                  value={typedConfirm}
                  onChange={e => setTypedConfirm(e.target.value.toUpperCase())}
                  placeholder={requiredPhrase}
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
              id="confirm-execute-reset-btn"
              variant="destructive"
              size="sm"
              disabled={isConfirmDisabled}
              onClick={handleExecuteReset}
            >
              {isResetting ? 'Processing…' : resetTarget.startsWith('purge_') ? 'Execute Purge' : 'Execute Reset'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
