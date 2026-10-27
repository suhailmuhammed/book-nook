import { useState, useRef } from 'react'
import {
  Upload, FileSpreadsheet, Download, CheckCircle2, AlertCircle,
  ArrowRight, ArrowLeft, RefreshCw, BookOpen, Users, FileText, Check
} from 'lucide-react'
import ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'
import { useQueryClient } from '@tanstack/react-query'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { toast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase'
import { BOOKS_QUERY_KEY } from '@/hooks/use-books'
import { EMPLOYEES_QUERY_KEY } from '@/hooks/use-employees'
import type { BookInsert, EmployeeInsert, BookStatus, BookCondition } from '@/lib/database.types'

interface ImportWizardDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultType?: 'books' | 'employees'
}

type ImportType = 'books' | 'employees'
type Step = 'upload' | 'preview' | 'success'

interface ParsedBookRow {
  book_code?: string
  title: string
  author?: string
  category?: string
  isbn?: string
  publisher?: string
  published_year?: number
  language?: string
  shelf_number?: string
  status?: BookStatus
  condition?: BookCondition
  owned_by?: string
  page_count?: number
  isValid: boolean
  errors: string[]
}

interface ParsedEmployeeRow {
  employee_code: string
  full_name: string
  department: string
  email: string
  is_active: boolean
  isValid: boolean
  errors: string[]
}

export function ImportWizardDialog({
  open,
  onOpenChange,
  defaultType = 'books',
}: ImportWizardDialogProps) {
  const qc = useQueryClient()
  const [importType, setImportType] = useState<ImportType>(defaultType)
  const [step, setStep] = useState<Step>('upload')
  const [fileName, setFileName] = useState<string>('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [bookRows, setBookRows] = useState<ParsedBookRow[]>([])
  const [employeeRows, setEmployeeRows] = useState<ParsedEmployeeRow[]>([])
  const [importedCount, setImportedCount] = useState(0)

  const fileInputRef = useRef<HTMLInputElement>(null)

  function resetState() {
    setStep('upload')
    setFileName('')
    setBookRows([])
    setEmployeeRows([])
    setImportedCount(0)
    setIsProcessing(false)
    setIsImporting(false)
  }

  function handleClose(isOpen: boolean) {
    if (!isOpen) {
      resetState()
    }
    onOpenChange(isOpen)
  }

  // ─── Download Template ──────────────────────────────────────
  async function downloadTemplate(type: ImportType) {
    const wb = new ExcelJS.Workbook()
    wb.creator = 'Book Nook'

    if (type === 'books') {
      const ws = wb.addWorksheet('Books_Template')
      ws.columns = [
        { header: 'Book Code (Optional)', key: 'book_code', width: 22 },
        { header: 'Title *', key: 'title', width: 35 },
        { header: 'Author', key: 'author', width: 25 },
        { header: 'Category', key: 'category', width: 18 },
        { header: 'ISBN', key: 'isbn', width: 18 },
        { header: 'Publisher', key: 'publisher', width: 22 },
        { header: 'Published Year', key: 'published_year', width: 16 },
        { header: 'Language', key: 'language', width: 14 },
        { header: 'Shelf Number', key: 'shelf_number', width: 15 },
        { header: 'Status', key: 'status', width: 14 },
        { header: 'Condition', key: 'condition', width: 14 },
        { header: 'Owned By', key: 'owned_by', width: 22 },
        { header: 'Page Count', key: 'page_count', width: 14 },
      ]

      // Format header
      ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
      ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } }

      // Sample data
      ws.addRow({
        book_code: 'BK020',
        title: 'Refactoring: Improving the Design of Existing Code',
        author: 'Martin Fowler',
        category: 'Technology',
        isbn: '9780134757599',
        publisher: 'Addison-Wesley',
        published_year: 2018,
        language: 'English',
        shelf_number: 'TECH-02',
        status: 'Available',
        condition: 'Good',
        owned_by: 'Aisha Rao',
        page_count: 448,
      })
      ws.addRow({
        book_code: '',
        title: 'Sprint: How to Solve Big Problems',
        author: 'Jake Knapp',
        category: 'Business',
        isbn: '9781501121746',
        publisher: 'Simon & Schuster',
        published_year: 2016,
        language: 'English',
        shelf_number: 'MGMT-01',
        status: 'Available',
        condition: 'Excellent',
        owned_by: 'Office Collection',
        page_count: 288,
      })

      const buffer = await wb.xlsx.writeBuffer()
      saveAs(new Blob([buffer]), 'book_nook_books_template.xlsx')
    } else {
      const ws = wb.addWorksheet('Readers_Template')
      ws.columns = [
        { header: 'Reader Code *', key: 'employee_code', width: 20 },
        { header: 'Full Name *', key: 'full_name', width: 28 },
        { header: 'Department *', key: 'department', width: 20 },
        { header: 'Email *', key: 'email', width: 30 },
        { header: 'Active (TRUE/FALSE)', key: 'is_active', width: 20 },
      ]

      ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
      ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } }

      ws.addRow({
        employee_code: 'RDR101',
        full_name: 'Anita Roy',
        department: 'Engineering',
        email: 'anita.roy@example.com',
        is_active: 'TRUE',
      })
      ws.addRow({
        employee_code: 'RDR102',
        full_name: 'Vikram Joshi',
        department: 'Product',
        email: 'vikram.j@example.com',
        is_active: 'TRUE',
      })

      const buffer = await wb.xlsx.writeBuffer()
      saveAs(new Blob([buffer]), 'book_nook_readers_template.xlsx')
    }
  }

  // ─── File Parsing ──────────────────────────────────────────
  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setFileName(file.name)
    setIsProcessing(true)

    try {
      const arrayBuffer = await file.arrayBuffer()
      const wb = new ExcelJS.Workbook()

      if (file.name.endsWith('.csv')) {
        const text = new TextDecoder('utf-8').decode(arrayBuffer)
        parseCsv(text)
      } else {
        await wb.xlsx.load(arrayBuffer)
        const ws = wb.worksheets[0]
        if (!ws) throw new Error('Excel workbook contains no sheets.')
        parseWorksheet(ws)
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to parse file'
      toast({ title: 'Error reading file', description: msg, variant: 'destructive' })
      resetState()
    } finally {
      setIsProcessing(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  function parseWorksheet(ws: ExcelJS.Worksheet) {
    const headers: string[] = []
    const rawRows: Record<string, any>[] = []

    ws.eachRow((row, rowNumber) => {
      if (rowNumber === 1) {
        row.eachCell((cell, colNumber) => {
          headers[colNumber] = String(cell.value || '').trim().toLowerCase()
        })
      } else {
        const rowData: Record<string, any> = {}
        row.eachCell((cell, colNumber) => {
          const header = headers[colNumber]
          if (header) {
            let val = cell.value
            // Handle formula or rich text
            if (val && typeof val === 'object') {
              if ('result' in val) val = (val as any).result
              else if ('text' in val) val = (val as any).text
            }
            rowData[header] = val
          }
        })
        if (Object.keys(rowData).length > 0) {
          rawRows.push(rowData)
        }
      }
    })

    processExtractedData(rawRows)
  }

  function parseCsv(csvText: string) {
    const lines = csvText.split(/\r?\n/).filter(line => line.trim().length > 0)
    if (lines.length < 2) throw new Error('CSV file is empty or missing headers')

    const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, '').toLowerCase())
    const rawRows: Record<string, any>[] = []

    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(',').map(p => p.trim().replace(/^["']|["']$/g, ''))
      const rowData: Record<string, any> = {}
      headers.forEach((h, idx) => {
        if (h && parts[idx] !== undefined) {
          rowData[h] = parts[idx]
        }
      })
      rawRows.push(rowData)
    }

    processExtractedData(rawRows)
  }

  function processExtractedData(rawRows: Record<string, any>[]) {
    if (rawRows.length === 0) {
      toast({ title: 'No data found', description: 'The file contains no records to import.', variant: 'destructive' })
      return
    }

    if (importType === 'books') {
      const parsed: ParsedBookRow[] = rawRows.map(r => {
        const titleKey = Object.keys(r).find(k => k.includes('title')) || 'title'
        const authorKey = Object.keys(r).find(k => k.includes('author')) || 'author'
        const codeKey = Object.keys(r).find(k => k.includes('code') || k.includes('id')) || 'book_code'
        const isbnKey = Object.keys(r).find(k => k.includes('isbn')) || 'isbn'
        const catKey = Object.keys(r).find(k => k.includes('category') || k.includes('genre')) || 'category'
        const pubKey = Object.keys(r).find(k => k.includes('publisher')) || 'publisher'
        const yearKey = Object.keys(r).find(k => k.includes('year')) || 'published_year'
        const shelfKey = Object.keys(r).find(k => k.includes('shelf')) || 'shelf_number'
        const ownedKey = Object.keys(r).find(k => k.includes('owned') || k.includes('owner') || k.includes('dept')) || 'owned_by'
        const statusKey = Object.keys(r).find(k => k.includes('status')) || 'status'
        const condKey = Object.keys(r).find(k => k.includes('condition')) || 'condition'

        const title = String(r[titleKey] || '').trim()
        const errors: string[] = []

        if (!title) {
          errors.push('Title is required')
        }

        const validStatuses: BookStatus[] = ['Available', 'Borrowed', 'Reserved', 'Lost', 'Under Repair']
        let status: BookStatus = 'Available'
        if (r[statusKey] && validStatuses.includes(String(r[statusKey]).trim() as BookStatus)) {
          status = String(r[statusKey]).trim() as BookStatus
        }

        const validConditions: BookCondition[] = ['Excellent', 'Good', 'Fair', 'Poor']
        let condition: BookCondition = 'Good'
        if (r[condKey] && validConditions.includes(String(r[condKey]).trim() as BookCondition)) {
          condition = String(r[condKey]).trim() as BookCondition
        }

        return {
          title,
          author: r[authorKey] ? String(r[authorKey]).trim() : undefined,
          book_code: r[codeKey] ? String(r[codeKey]).trim() : undefined,
          isbn: r[isbnKey] ? String(r[isbnKey]).trim() : undefined,
          category: r[catKey] ? String(r[catKey]).trim() : undefined,
          publisher: r[pubKey] ? String(r[pubKey]).trim() : undefined,
          published_year: r[yearKey] ? parseInt(String(r[yearKey]), 10) || undefined : undefined,
          shelf_number: r[shelfKey] ? String(r[shelfKey]).trim() : undefined,
          owned_by: r[ownedKey] ? String(r[ownedKey]).trim() : undefined,
          status,
          condition,
          isValid: errors.length === 0,
          errors,
        }
      })

      setBookRows(parsed)
      setStep('preview')
    } else {
      const parsed: ParsedEmployeeRow[] = rawRows.map(r => {
        const codeKey = Object.keys(r).find(k => k.includes('code') || k.includes('id')) || 'employee_code'
        const nameKey = Object.keys(r).find(k => k.includes('name')) || 'full_name'
        const deptKey = Object.keys(r).find(k => k.includes('dept') || k.includes('department')) || 'department'
        const emailKey = Object.keys(r).find(k => k.includes('email') || k.includes('mail')) || 'email'
        const activeKey = Object.keys(r).find(k => k.includes('active')) || 'is_active'

        const employee_code = String(r[codeKey] || '').trim()
        const full_name = String(r[nameKey] || '').trim()
        const department = String(r[deptKey] || '').trim()
        const email = String(r[emailKey] || '').trim()
        const is_active = r[activeKey] !== undefined ? String(r[activeKey]).toLowerCase() !== 'false' : true

        const errors: string[] = []
        if (!full_name) errors.push('Full name required')
        if (!department) errors.push('Department required')
        if (!email) errors.push('Email required')

        return {
          employee_code,
          full_name,
          department,
          email,
          is_active,
          isValid: errors.length === 0,
          errors,
        }
      })

      setEmployeeRows(parsed)
      setStep('preview')
    }
  }

  // ─── Execute Import ────────────────────────────────────────
  async function executeImport() {
    setIsImporting(true)
    try {
      if (importType === 'books') {
        const validBooks = bookRows.filter(r => r.isValid)
        if (validBooks.length === 0) {
          toast({ title: 'No valid rows', description: 'Please fix errors before importing.', variant: 'destructive' })
          return
        }

        const booksToInsert: BookInsert[] = []
        for (const b of validBooks) {
          let code: string = b.book_code || ''
          if (!code) {
            const { data: generated } = await supabase.rpc('generate_book_code')
            code = (generated as string) || `BK${Date.now()}`
          }
          booksToInsert.push({
            book_code: code,
            title: b.title,
            author: b.author || null,
            category: b.category || 'General',
            isbn: b.isbn || null,
            publisher: b.publisher || null,
            published_year: b.published_year || null,
            shelf_number: b.shelf_number || null,
            status: b.status || 'Available',
            condition: b.condition || 'Good',
            owned_by: b.owned_by || 'Office Collection',
            date_added: new Date().toISOString().split('T')[0],
            metadata_source: 'import',
          })
        }

        const { error } = await supabase.from('books').insert(booksToInsert)
        if (error) throw error

        // Audit log
        await supabase.from('audit_logs').insert({
          action: 'BULK_IMPORT',
          entity_type: 'books',
          details: { count: booksToInsert.length, source_file: fileName },
        })

        qc.invalidateQueries({ queryKey: BOOKS_QUERY_KEY })
        qc.invalidateQueries({ queryKey: ['book-owners'] })
        qc.invalidateQueries({ queryKey: ['book-categories'] })
        qc.invalidateQueries({ queryKey: ['employee-book-counts'] })
        qc.invalidateQueries({ queryKey: ['next-book-code'] })
        qc.invalidateQueries({ queryKey: ['dashboard-stats'] })
        setImportedCount(booksToInsert.length)
        setStep('success')
        toast({ title: 'Import successful', description: `Imported ${booksToInsert.length} books.` })
      } else {
        const validEmployees = employeeRows.filter(r => r.isValid)
        if (validEmployees.length === 0) {
          toast({ title: 'No valid rows', description: 'Please fix errors before importing.', variant: 'destructive' })
          return
        }

        const employeesToInsert: EmployeeInsert[] = []
        for (const e of validEmployees) {
          let code: string | null = e.employee_code || null
          if (!code) {
            const { data: generated } = await supabase.rpc('generate_employee_code')
            code = (generated as unknown as string) || null
          }
          employeesToInsert.push({
            employee_code: code,
            full_name: e.full_name,
            department: e.department,
            email: e.email,
            is_active: e.is_active,
          })
        }

        const { error } = await supabase.from('employees').insert(employeesToInsert)
        if (error) throw error

        await supabase.from('audit_logs').insert({
          action: 'BULK_IMPORT',
          entity_type: 'employees',
          details: { count: employeesToInsert.length, source_file: fileName },
        })

        qc.invalidateQueries({ queryKey: EMPLOYEES_QUERY_KEY })
        qc.invalidateQueries({ queryKey: ['next-employee-code'] })
        qc.invalidateQueries({ queryKey: ['dashboard-stats'] })
        setImportedCount(employeesToInsert.length)
        setStep('success')
        toast({ title: 'Import successful', description: `Imported ${employeesToInsert.length} readers.` })
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Import failed'
      toast({ title: 'Import error', description: msg, variant: 'destructive' })
    } finally {
      setIsImporting(false)
    }
  }

  const validCount = importType === 'books'
    ? bookRows.filter(r => r.isValid).length
    : employeeRows.filter(r => r.isValid).length
  const totalCount = importType === 'books' ? bookRows.length : employeeRows.length

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-6">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-xl">Import Wizard</DialogTitle>
              <DialogDescription>
                Import your existing library catalog or reader directory from Excel (.xlsx) or CSV.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Content based on step */}
        {step === 'upload' && (
          <div className="space-y-6 py-4">
            {/* Type selector */}
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">Select Import Type:</span>
              <div className="flex rounded-lg border bg-muted/40 p-1">
                <button
                  type="button"
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    importType === 'books' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
                  }`}
                  onClick={() => setImportType('books')}
                >
                  <BookOpen className="h-3.5 w-3.5" />
                  Books Catalog
                </button>
                <button
                  type="button"
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    importType === 'employees' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
                  }`}
                  onClick={() => setImportType('employees')}
                >
                  <Users className="h-3.5 w-3.5" />
                  Readers Directory
                </button>
              </div>
            </div>

            {/* Template download card */}
            <div className="flex items-center justify-between p-4 rounded-xl border bg-muted/30">
              <div className="space-y-0.5">
                <p className="text-sm font-medium">Download Sample Template</p>
                <p className="text-xs text-muted-foreground">
                  Get a pre-formatted Excel file with the correct headers and example rows.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => downloadTemplate(importType)}
              >
                <Download className="h-4 w-4" />
                Download {importType === 'books' ? 'Books' : 'Readers'} Template
              </Button>
            </div>

            {/* Drag and Drop Zone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-all"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={handleFileSelect}
              />
              <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3">
                {isProcessing ? <RefreshCw className="h-6 w-6 animate-spin" /> : <Upload className="h-6 w-6" />}
              </div>
              <p className="font-semibold text-base mb-1">
                {isProcessing ? 'Analyzing workbook…' : 'Click to upload or drag & drop'}
              </p>
              <p className="text-xs text-muted-foreground">
                Supports Excel (.xlsx, .xls) and CSV files
              </p>
            </div>
          </div>
        )}

        {step === 'preview' && (
          <div className="space-y-4 py-2 flex-1 flex flex-col min-h-0">
            {/* Header / Stats */}
            <div className="flex items-center justify-between bg-muted/30 p-3 rounded-lg text-sm border">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium truncate max-w-[200px]">{fileName}</span>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="text-emerald-600 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {validCount} ready to import
                </span>
                {totalCount - validCount > 0 && (
                  <span className="text-destructive font-semibold flex items-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5" />
                    {totalCount - validCount} invalid
                  </span>
                )}
              </div>
            </div>

            {/* Preview Table */}
            <div className="border rounded-lg overflow-y-auto max-h-[340px] flex-1 text-xs">
              {importType === 'books' ? (
                <table className="w-full text-left border-collapse">
                  <thead className="bg-muted sticky top-0 border-b">
                    <tr>
                      <th className="p-2.5 font-semibold">Status</th>
                      <th className="p-2.5 font-semibold">Code</th>
                      <th className="p-2.5 font-semibold">Title</th>
                      <th className="p-2.5 font-semibold">Author</th>
                      <th className="p-2.5 font-semibold">Category</th>
                      <th className="p-2.5 font-semibold">ISBN</th>
                      <th className="p-2.5 font-semibold">Department</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {bookRows.map((row, idx) => (
                      <tr key={idx} className={row.isValid ? 'hover:bg-muted/30' : 'bg-destructive/5'}>
                        <td className="p-2.5">
                          {row.isValid ? (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                              Valid
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-destructive/10 text-destructive">
                              {row.errors[0]}
                            </span>
                          )}
                        </td>
                        <td className="p-2.5 font-mono text-muted-foreground">{row.book_code || '(Auto)'}</td>
                        <td className="p-2.5 font-medium max-w-[180px] truncate">{row.title || '—'}</td>
                        <td className="p-2.5 text-muted-foreground truncate max-w-[120px]">{row.author || '—'}</td>
                        <td className="p-2.5 text-muted-foreground">{row.category || 'General'}</td>
                        <td className="p-2.5 font-mono text-muted-foreground">{row.isbn || '—'}</td>
                        <td className="p-2.5 text-muted-foreground">{row.owned_by || 'General'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead className="bg-muted sticky top-0 border-b">
                    <tr>
                      <th className="p-2.5 font-semibold">Status</th>
                      <th className="p-2.5 font-semibold">Reader Code</th>
                      <th className="p-2.5 font-semibold">Full Name</th>
                      <th className="p-2.5 font-semibold">Department</th>
                      <th className="p-2.5 font-semibold">Email</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {employeeRows.map((row, idx) => (
                      <tr key={idx} className={row.isValid ? 'hover:bg-muted/30' : 'bg-destructive/5'}>
                        <td className="p-2.5">
                          {row.isValid ? (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                              Valid
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-destructive/10 text-destructive">
                              {row.errors[0]}
                            </span>
                          )}
                        </td>
                        <td className="p-2.5 font-mono font-medium">{row.employee_code}</td>
                        <td className="p-2.5 font-medium">{row.full_name}</td>
                        <td className="p-2.5 text-muted-foreground">{row.department}</td>
                        <td className="p-2.5 text-muted-foreground">{row.email}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {step === 'success' && (
          <div className="py-12 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
              <Check className="h-8 w-8 stroke-[3]" />
            </div>
            <div>
              <h3 className="text-xl font-bold">Import Completed!</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Successfully added <span className="font-semibold text-foreground">{importedCount}</span> {importType === 'books' ? 'books' : 'readers'} to your database.
              </p>
            </div>
          </div>
        )}

        {/* Dialog Footer Actions */}
        <DialogFooter className="mt-4 pt-3 border-t flex items-center justify-between sm:justify-between w-full">
          {step === 'upload' && (
            <>
              <Button variant="ghost" size="sm" onClick={() => handleClose(false)}>
                Cancel
              </Button>
              <div className="text-xs text-muted-foreground">
                Step 1 of 2: Upload Workbook
              </div>
            </>
          )}

          {step === 'preview' && (
            <>
              <Button variant="outline" size="sm" onClick={() => setStep('upload')} disabled={isImporting}>
                <ArrowLeft className="h-4 w-4 mr-1.5" />
                Change File
              </Button>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => handleClose(false)} disabled={isImporting}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={executeImport}
                  loading={isImporting}
                  disabled={validCount === 0 || isImporting}
                >
                  Confirm Import ({validCount})
                  <ArrowRight className="h-4 w-4 ml-1.5" />
                </Button>
              </div>
            </>
          )}

          {step === 'success' && (
            <div className="w-full flex justify-end">
              <Button size="sm" onClick={() => handleClose(false)}>
                Done
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
