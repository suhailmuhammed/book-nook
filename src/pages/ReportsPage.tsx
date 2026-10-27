import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Download, FileSpreadsheet, BarChart3, Upload } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { PageLoader } from '@/components/ui/states'
import { supabase } from '@/lib/supabase'
import { formatDate, isOverdue } from '@/lib/utils'
import { toast } from '@/hooks/use-toast'
import { ImportWizardDialog } from '@/components/import/ImportWizardDialog'

// ─── Report generators ────────────────────────────────────────

async function generateBookCatalog() {
  const { data: books } = await supabase.from('books').select('*').is('archived_at', null).order('book_code')
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Book Nook'
  const ws = wb.addWorksheet('Book Catalog')

  ws.columns = [
    { header: 'Book ID',       key: 'book_code',      width: 10 },
    { header: 'Title',         key: 'title',           width: 40 },
    { header: 'Author',        key: 'author',          width: 25 },
    { header: 'Category',      key: 'category',        width: 18 },
    { header: 'ISBN',          key: 'isbn',            width: 17 },
    { header: 'Publisher',     key: 'publisher',       width: 22 },
    { header: 'Year',          key: 'published_year',  width: 8  },
    { header: 'Status',        key: 'status',          width: 14 },
    { header: 'Condition',     key: 'condition',       width: 12 },
    { header: 'Owned By',      key: 'owned_by',        width: 16 },
    { header: 'Shelf',         key: 'shelf_number',    width: 10 },
    { header: 'Date Added',    key: 'date_added',      width: 14 },
    { header: 'Language',      key: 'language',        width: 12 },
    { header: 'Pages',         key: 'page_count',      width: 8  },
  ]

  // Style header row
  ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
  ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } }

  for (const book of books ?? []) {
    ws.addRow(book)
  }

  ws.autoFilter = { from: 'A1', to: 'N1' }

  const buf = await wb.xlsx.writeBuffer()
  saveAs(new Blob([buf]), `book-catalog-${new Date().toISOString().slice(0,10)}.xlsx`)
}

async function generateBorrowingHistory() {
  const { data } = await supabase.from('borrowings').select(`
    *, book:books(book_code, title), employee:employees(employee_code, full_name, department)
  `).order('issue_date', { ascending: false })

  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Borrowing History')

  ws.columns = [
    { header: 'Book ID',      key: 'book_code',       width: 10 },
    { header: 'Title',        key: 'title',            width: 35 },
    { header: 'Reader',       key: 'employee_name',    width: 22 },
    { header: 'Department',   key: 'department',       width: 16 },
    { header: 'Issue Date',   key: 'issue_date',       width: 14 },
    { header: 'Due Date',     key: 'due_date',         width: 14 },
    { header: 'Return Date',  key: 'return_date',      width: 14 },
    { header: 'Status',       key: 'loan_status',      width: 12 },
    { header: 'Remarks',      key: 'issue_remarks',    width: 30 },
  ]

  ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
  ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } }

  for (const loan of data ?? []) {
    const l = loan as {
      issue_date: string; due_date: string; return_date: string | null;
      issue_remarks: string | null;
      book: {book_code: string; title: string};
      employee: {employee_code: string | null; full_name: string; department: string | null};
    }
    const overdue = isOverdue(l.due_date, l.return_date)
    ws.addRow({
      book_code:     l.book?.book_code,
      title:         l.book?.title,
      employee_name: l.employee?.full_name,
      department:    l.employee?.department,
      issue_date:    l.issue_date,
      due_date:      l.due_date,
      return_date:   l.return_date ?? '',
      loan_status:   l.return_date ? 'Returned' : overdue ? 'Overdue' : 'Active',
      issue_remarks: l.issue_remarks ?? '',
    })
  }

  ws.autoFilter = { from: 'A1', to: 'I1' }

  const buf = await wb.xlsx.writeBuffer()
  saveAs(new Blob([buf]), `borrowing-history-${new Date().toISOString().slice(0,10)}.xlsx`)
}

// ─── Reports Page ─────────────────────────────────────────────

interface ReportCard {
  id: string
  title: string
  description: string
  icon: React.ElementType
  action: () => Promise<void>
}

export default function ReportsPage() {
  const [searchParams] = useSearchParams()
  const [loading, setLoading] = useState<string | null>(null)
  const [importOpen, setImportOpen] = useState(false)

  useEffect(() => {
    if (searchParams.get('tab') === 'import') {
      setImportOpen(true)
    }
  }, [searchParams])

  async function run(id: string, action: () => Promise<void>) {
    setLoading(id)
    try {
      await action()
      toast({ title: 'Report exported', variant: 'success' as never })
    } catch (err: unknown) {
      toast({ title: 'Export failed', description: err instanceof Error ? err.message : 'Unknown error', variant: 'destructive' })
    } finally {
      setLoading(null)
    }
  }

  const reports: ReportCard[] = [
    {
      id: 'book-catalog',
      title: 'Full Book Catalog',
      description: 'All active books with their details, status, and condition.',
      icon: FileSpreadsheet,
      action: generateBookCatalog,
    },
    {
      id: 'borrowing-history',
      title: 'Borrowing History',
      description: 'Complete loan records with issue dates, due dates, and return status.',
      icon: BarChart3,
      action: generateBorrowingHistory,
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Reports & Exports</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Download Excel reports for the office library.</p>
      </div>

      {/* Export Reports */}
      <div>
        <h2 className="text-base font-semibold mb-3">Export Reports</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {reports.map(report => (
            <Card key={report.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                    <report.icon className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-sm">{report.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-xs mb-4">{report.description}</CardDescription>
                <Button
                  id={`export-${report.id}-btn`}
                  variant="outline"
                  size="sm"
                  className="w-full"
                  loading={loading === report.id}
                  onClick={() => run(report.id, report.action)}
                >
                  <Download className="h-4 w-4" />
                  Export Excel
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Import section placeholder */}
      <div>
        <h2 className="text-base font-semibold mb-3">Import Data</h2>
        <Card className="border-dashed">
          <CardContent className="py-10 text-center">
            <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="font-medium mb-1">Excel Import Wizard</p>
            <p className="text-sm text-muted-foreground mb-4">
              Import books, readers, and borrowing history from your existing Excel workbook.
            </p>
            <Button id="import-wizard-btn" variant="outline" size="sm" onClick={() => setImportOpen(true)}>
              <Upload className="h-4 w-4" />
              Start Import Wizard
            </Button>
          </CardContent>
        </Card>
      </div>

      <ImportWizardDialog open={importOpen} onOpenChange={setImportOpen} />
    </div>
  )
}
