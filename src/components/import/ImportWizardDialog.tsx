import { useState, useRef } from 'react'
import {
  Upload, FileSpreadsheet, Download, CheckCircle2, AlertCircle,
  ArrowRight, ArrowLeft, RefreshCw, BookOpen, Users, Check,
  User, Sparkles, SlidersHorizontal, HelpCircle
} from 'lucide-react'
import ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'
import { useQueryClient } from '@tanstack/react-query'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'
import { toast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase'
import { BOOKS_QUERY_KEY } from '@/hooks/use-books'
import { useEmployees, EMPLOYEES_QUERY_KEY } from '@/hooks/use-employees'
import { searchGoogleBooks } from '@/lib/utils'
import type { BookInsert, EmployeeInsert, BookStatus, BookCondition } from '@/lib/database.types'

interface ImportWizardDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultType?: 'books' | 'employees'
}

type ImportType = 'books' | 'employees'
type Step = 'upload' | 'mapping' | 'preview' | 'success'

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
  owned_by: string
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

interface FieldDef {
  key: string
  label: string
  required: boolean
  description: string
  autoKeywords: string[]
}

const BOOK_FIELDS: FieldDef[] = [
  {
    key: 'title',
    label: 'Book Title',
    required: true,
    description: 'Title of the book',
    autoKeywords: ['title', 'book_title', 'book title', 'name'],
  },
  {
    key: 'owned_by',
    label: 'Owned By (Reader)',
    required: false,
    description: 'Reader who owns or contributed the book',
    autoKeywords: ['owned_by', 'owned by', 'owner', 'reader', 'reader name', 'owner name', 'book owner', 'borrower', 'belongs to', 'contributor'],
  },
  {
    key: 'author',
    label: 'Author',
    required: false,
    description: 'Author or primary creator',
    autoKeywords: ['author', 'writer', 'by'],
  },
  {
    key: 'category',
    label: 'Category',
    required: false,
    description: 'Genre or subject matter',
    autoKeywords: ['category', 'genre', 'topic', 'subject'],
  },
  {
    key: 'isbn',
    label: 'ISBN',
    required: false,
    description: '10 or 13-digit ISBN',
    autoKeywords: ['isbn', 'isbn13', 'isbn10', 'barcode'],
  },
  {
    key: 'book_code',
    label: 'Book Code (ID)',
    required: false,
    description: 'Optional ID (e.g. BK020). Auto-generated if omitted.',
    autoKeywords: ['book_code', 'book code', 'code', 'book_id', 'id'],
  },
  {
    key: 'shelf_number',
    label: 'Shelf Number',
    required: false,
    description: 'Physical shelf or location (e.g. A-12)',
    autoKeywords: ['shelf', 'shelf_number', 'shelf number', 'location'],
  },
  {
    key: 'condition',
    label: 'Condition',
    required: false,
    description: 'Excellent, Good, Fair, or Poor',
    autoKeywords: ['condition', 'state'],
  },
  {
    key: 'status',
    label: 'Status',
    required: false,
    description: 'Available, Borrowed, Reserved, etc.',
    autoKeywords: ['status', 'availability'],
  },
  {
    key: 'publisher',
    label: 'Publisher',
    required: false,
    description: 'Publishing house',
    autoKeywords: ['publisher', 'press'],
  },
  {
    key: 'published_year',
    label: 'Published Year',
    required: false,
    description: '4-digit publication year',
    autoKeywords: ['published_year', 'year', 'date', 'published'],
  },
  {
    key: 'language',
    label: 'Language',
    required: false,
    description: 'Book language (e.g. English)',
    autoKeywords: ['language', 'lang'],
  },
  {
    key: 'page_count',
    label: 'Page Count',
    required: false,
    description: 'Total number of pages',
    autoKeywords: ['page_count', 'pages', 'page count'],
  },
]

const EMPLOYEE_FIELDS: FieldDef[] = [
  {
    key: 'full_name',
    label: 'Full Name',
    required: true,
    description: 'Full name of the reader',
    autoKeywords: ['full_name', 'name', 'full name', 'reader name', 'reader'],
  },
  {
    key: 'employee_code',
    label: 'Reader Code',
    required: false,
    description: 'Unique reader ID (e.g. EMP001)',
    autoKeywords: ['employee_code', 'code', 'id', 'reader_code', 'reader code'],
  },
  {
    key: 'department',
    label: 'Department',
    required: true,
    description: 'Department or office unit',
    autoKeywords: ['department', 'dept', 'team'],
  },
  {
    key: 'email',
    label: 'Email',
    required: true,
    description: 'Reader email address',
    autoKeywords: ['email', 'e-mail', 'mail'],
  },
  {
    key: 'is_active',
    label: 'Active Status',
    required: false,
    description: 'TRUE or FALSE',
    autoKeywords: ['active', 'is_active', 'status'],
  },
]

const INVALID_CATEGORY_KEYWORDS = new Set([
  'engineering', 'hr', 'management', 'general', 'office collection',
  'technology', 'self-help', 'psychology', 'business', 'history',
  'leadership', 'strategy', 'memoir', 'fiction', 'non-fiction', 'science'
])

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

  // Raw extracted file data
  const [rawHeaders, setRawHeaders] = useState<string[]>([])
  const [rawRows, setRawRows] = useState<Record<string, any>[]>([])

  // Column mapping: fieldKey -> excelHeader or '__none__'
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({})
  const [defaultReader, setDefaultReader] = useState<string>('Aisha Rao')

  // Parsed data ready for preview/import
  const [bookRows, setBookRows] = useState<ParsedBookRow[]>([])
  const [employeeRows, setEmployeeRows] = useState<ParsedEmployeeRow[]>([])
  const [importedCount, setImportedCount] = useState(0)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Fetch active readers for default owner selector and validation
  const { data: employeesData } = useEmployees({ isActive: true, pageSize: 200 })
  const activeEmployees = employeesData?.employees ?? []

  function resetState() {
    setStep('upload')
    setFileName('')
    setRawHeaders([])
    setRawRows([])
    setColumnMapping({})
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

      // Sample data with reader names
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
        owned_by: 'Rahul Sharma',
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
        employee_code: 'EMP101',
        full_name: 'Anita Roy',
        department: 'Engineering',
        email: 'anita.roy@example.com',
        is_active: 'TRUE',
      })
      ws.addRow({
        employee_code: 'EMP102',
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
      const isCsv = file.name.endsWith('.csv')
      if (isCsv) {
        const text = await file.text()
        parseCsv(text)
      } else {
        const arrayBuffer = await file.arrayBuffer()
        const wb = new ExcelJS.Workbook()
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
    const rawRowsData: Record<string, any>[] = []

    ws.eachRow((row, rowNumber) => {
      if (rowNumber === 1) {
        row.eachCell((cell, colNumber) => {
          headers[colNumber] = String(cell.value || '').trim()
        })
      } else {
        const rowData: Record<string, any> = {}
        row.eachCell((cell, colNumber) => {
          const header = headers[colNumber]
          if (header) {
            let val = cell.value
            if (val && typeof val === 'object') {
              if ('result' in val) val = (val as any).result
              else if ('text' in val) val = (val as any).text
            }
            rowData[header] = val
          }
        })
        if (Object.keys(rowData).length > 0) {
          rawRowsData.push(rowData)
        }
      }
    })

    const cleanHeaders = headers.filter(Boolean)
    initializeMapping(cleanHeaders, rawRowsData)
  }

  function parseCsv(csvText: string) {
    const lines = csvText.split(/\r?\n/).filter(line => line.trim().length > 0)
    if (lines.length < 2) throw new Error('CSV file is empty or missing headers')

    const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''))
    const rawRowsData: Record<string, any>[] = []

    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(',').map(p => p.trim().replace(/^["']|["']$/g, ''))
      const rowData: Record<string, any> = {}
      headers.forEach((h, idx) => {
        if (h && parts[idx] !== undefined) {
          rowData[h] = parts[idx]
        }
      })
      rawRowsData.push(rowData)
    }

    initializeMapping(headers, rawRowsData)
  }

  // ─── Initialize Column Mapping Step ──────────────────────────
  function initializeMapping(headers: string[], rowsData: Record<string, any>[]) {
    if (rowsData.length === 0) {
      toast({ title: 'No data found', description: 'The file contains no records to import.', variant: 'destructive' })
      return
    }

    setRawHeaders(headers)
    setRawRows(rowsData)

    // Set default reader to the first active reader or Aisha Rao
    if (activeEmployees.length > 0 && !defaultReader) {
      setDefaultReader(activeEmployees[0].full_name)
    }

    const fields = importType === 'books' ? BOOK_FIELDS : EMPLOYEE_FIELDS
    const initialMapping: Record<string, string> = {}

    fields.forEach(field => {
      // Find matching header by keywords
      const matched = headers.find(h => {
        const norm = h.toLowerCase().trim()
        return field.autoKeywords.some(kw => norm === kw || norm.includes(kw))
      })
      initialMapping[field.key] = matched || '__none__'
    })

    setColumnMapping(initialMapping)
    setStep('mapping')
  }

  // ─── Process Mapping into Preview Rows ───────────────────────
  function applyMappingAndContinue() {
    if (importType === 'books') {
      const titleCol = columnMapping['title']
      if (!titleCol || titleCol === '__none__') {
        toast({
          title: 'Mapping Required',
          description: 'Please map an Excel column for the required "Book Title" field.',
          variant: 'destructive',
        })
        return
      }

      const parsed: ParsedBookRow[] = rawRows.map(r => {
        const title = String(r[titleCol] || '').trim()
        const errors: string[] = []

        if (!title) {
          errors.push('Title is required')
        }

        // Owned By resolution
        const ownedCol = columnMapping['owned_by']
        let ownerVal = (ownedCol && ownedCol !== '__none__' && r[ownedCol])
          ? String(r[ownedCol]).trim()
          : ''

        // Sanitize ownerVal: if it is a category or department name, discard it
        if (ownerVal && INVALID_CATEGORY_KEYWORDS.has(ownerVal.toLowerCase())) {
          ownerVal = ''
        }

        // Fall back to the selected default reader if empty
        const finalOwner = ownerVal || defaultReader || 'Aisha Rao'

        // Status resolution
        const statusCol = columnMapping['status']
        const validStatuses: BookStatus[] = ['Available', 'Borrowed', 'Reserved', 'Lost', 'Under Repair']
        let status: BookStatus = 'Available'
        if (statusCol && statusCol !== '__none__' && r[statusCol]) {
          const rawSt = String(r[statusCol]).trim() as BookStatus
          if (validStatuses.includes(rawSt)) status = rawSt
        }

        // Condition resolution
        const condCol = columnMapping['condition']
        const validConditions: BookCondition[] = ['Excellent', 'Good', 'Fair', 'Poor']
        let condition: BookCondition = 'Good'
        if (condCol && condCol !== '__none__' && r[condCol]) {
          const rawCd = String(r[condCol]).trim() as BookCondition
          if (validConditions.includes(rawCd)) condition = rawCd
        }

        const authorCol = columnMapping['author']
        const catCol = columnMapping['category']
        const isbnCol = columnMapping['isbn']
        const codeCol = columnMapping['book_code']
        const shelfCol = columnMapping['shelf_number']
        const pubCol = columnMapping['publisher']
        const yearCol = columnMapping['published_year']
        const langCol = columnMapping['language']
        const pageCol = columnMapping['page_count']

        return {
          title,
          author: (authorCol && authorCol !== '__none__' && r[authorCol]) ? String(r[authorCol]).trim() : undefined,
          book_code: (codeCol && codeCol !== '__none__' && r[codeCol]) ? String(r[codeCol]).trim() : undefined,
          isbn: (isbnCol && isbnCol !== '__none__' && r[isbnCol]) ? String(r[isbnCol]).trim() : undefined,
          category: (catCol && catCol !== '__none__' && r[catCol]) ? String(r[catCol]).trim() : undefined,
          publisher: (pubCol && pubCol !== '__none__' && r[pubCol]) ? String(r[pubCol]).trim() : undefined,
          published_year: (yearCol && yearCol !== '__none__' && r[yearCol]) ? parseInt(String(r[yearCol]), 10) || undefined : undefined,
          shelf_number: (shelfCol && shelfCol !== '__none__' && r[shelfCol]) ? String(r[shelfCol]).trim() : undefined,
          language: (langCol && langCol !== '__none__' && r[langCol]) ? String(r[langCol]).trim() : 'English',
          page_count: (pageCol && pageCol !== '__none__' && r[pageCol]) ? parseInt(String(r[pageCol]), 10) || undefined : undefined,
          owned_by: finalOwner,
          status,
          condition,
          isValid: errors.length === 0,
          errors,
        }
      })

      setBookRows(parsed)
      setStep('preview')
    } else {
      const nameCol = columnMapping['full_name']
      const emailCol = columnMapping['email']
      const deptCol = columnMapping['department']
      const codeCol = columnMapping['employee_code']
      const activeCol = columnMapping['is_active']

      if (!nameCol || nameCol === '__none__') {
        toast({
          title: 'Mapping Required',
          description: 'Please map an Excel column for "Full Name".',
          variant: 'destructive',
        })
        return
      }

      const parsed: ParsedEmployeeRow[] = rawRows.map(r => {
        const full_name = (nameCol && nameCol !== '__none__' && r[nameCol]) ? String(r[nameCol]).trim() : ''
        const email = (emailCol && emailCol !== '__none__' && r[emailCol]) ? String(r[emailCol]).trim() : ''
        const department = (deptCol && deptCol !== '__none__' && r[deptCol]) ? String(r[deptCol]).trim() : 'General'
        const employee_code = (codeCol && codeCol !== '__none__' && r[codeCol]) ? String(r[codeCol]).trim() : ''

        let is_active = true
        if (activeCol && activeCol !== '__none__' && r[activeCol] !== undefined) {
          const val = String(r[activeCol]).toLowerCase().trim()
          is_active = val === 'true' || val === '1' || val === 'yes' || val === 'active'
        }

        const errors: string[] = []
        if (!full_name) errors.push('Full name is required')

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

          let cover_image_url: string | null = null
          let google_books_volume_id: string | null = null
          let description: string | null = null
          let publisher: string | null = b.publisher || null
          let category: string = b.category || 'General'
          let page_count: number | null = b.page_count || null

          // Auto-detect with Google Books if title or ISBN is provided
          if (b.isbn || b.title) {
            try {
              const cleanIsbn = b.isbn?.replace(/[^0-9X]/gi, '')
              const query = (cleanIsbn && cleanIsbn.length >= 10) ? cleanIsbn : (b.title || '')
              const searchType = (cleanIsbn && cleanIsbn.length >= 10) ? 'isbn' : 'title'
              if (query.trim()) {
                const gbResults = await searchGoogleBooks(query, searchType, 1)
                if (gbResults && gbResults.length > 0) {
                  const top = gbResults[0]
                  if (top.coverUrl) cover_image_url = top.coverUrl
                  if (top.volumeId) google_books_volume_id = top.volumeId
                  if (!page_count && top.pageCount) page_count = top.pageCount
                  if (!description && top.description) description = top.description
                  if (!publisher && top.publisher) publisher = top.publisher
                  if ((!category || category === 'General') && top.categories) {
                    const c = top.categories.split(',')[0].trim()
                    if (c) category = c
                  }
                } else if (cleanIsbn && cleanIsbn.length >= 10) {
                  cover_image_url = `https://covers.openlibrary.org/b/isbn/${cleanIsbn}-M.jpg`
                }
              }
            } catch {
              const cleanIsbn = b.isbn?.replace(/[^0-9X]/gi, '')
              if (cleanIsbn && cleanIsbn.length >= 10) {
                cover_image_url = `https://covers.openlibrary.org/b/isbn/${cleanIsbn}-M.jpg`
              }
            }
          }

          booksToInsert.push({
            book_code: code,
            title: b.title,
            author: b.author || null,
            category,
            isbn: b.isbn || null,
            publisher,
            published_year: b.published_year || null,
            shelf_number: b.shelf_number || null,
            status: b.status || 'Available',
            condition: b.condition || 'Good',
            owned_by: b.owned_by || defaultReader || 'Aisha Rao',
            date_added: new Date().toISOString().split('T')[0],
            metadata_source: google_books_volume_id ? 'google_books' : 'import',
            cover_image_url,
            google_books_volume_id,
            description,
            page_count,
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
        toast({ title: 'Import successful', description: `Successfully imported ${booksToInsert.length} books.` })
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
        toast({ title: 'Import successful', description: `Successfully imported ${employeesToInsert.length} readers.` })
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

  const fields = importType === 'books' ? BOOK_FIELDS : EMPLOYEE_FIELDS

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[92vh] flex flex-col p-6">
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

          {/* Stepper indicator */}
          <div className="flex items-center gap-2 pt-3 text-xs">
            <div className={`flex items-center gap-1 font-semibold ${step === 'upload' ? 'text-primary' : 'text-muted-foreground'}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step === 'upload' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>1</span>
              <span>Upload</span>
            </div>
            <span className="text-muted-foreground">/</span>
            <div className={`flex items-center gap-1 font-semibold ${step === 'mapping' ? 'text-primary' : 'text-muted-foreground'}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step === 'mapping' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>2</span>
              <span>Map Columns</span>
            </div>
            <span className="text-muted-foreground">/</span>
            <div className={`flex items-center gap-1 font-semibold ${step === 'preview' ? 'text-primary' : 'text-muted-foreground'}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step === 'preview' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>3</span>
              <span>Preview & Confirm</span>
            </div>
          </div>
        </DialogHeader>

        {/* ─── STEP 1: UPLOAD ──────────────────────────────────────── */}
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
                  Pre-formatted Excel template with all supported columns including <strong>Owned By</strong>.
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

        {/* ─── STEP 2: COLUMN MAPPING ─────────────────────────────── */}
        {step === 'mapping' && (
          <div className="space-y-4 py-2 flex-1 flex flex-col min-h-0 overflow-y-auto pr-1">
            <div className="bg-muted/40 p-3 rounded-lg border flex items-center justify-between text-xs">
              <div>
                <span className="font-semibold text-foreground">File: </span>
                <span className="text-muted-foreground">{fileName}</span>
                <span className="mx-2 text-muted-foreground">·</span>
                <span className="font-semibold text-foreground">{rawRows.length}</span> records detected
              </div>
              <span className="text-muted-foreground">
                {rawHeaders.length} columns detected
              </span>
            </div>

            {/* SPECIAL HIGHLIGHT: Owned By / Reader Option for Books */}
            {importType === 'books' && (
              <div className="p-4 rounded-xl border border-amber-300 dark:border-amber-700/60 bg-amber-50/50 dark:bg-amber-950/20 space-y-3">
                <div className="flex items-start gap-2.5">
                  <User className="h-5 w-5 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <span>Book Ownership & Reader Assignment</span>
                      <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 bg-amber-200/60 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 rounded">
                        Required for library tracking
                      </span>
                    </h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Select which Excel column provides the reader's name, or assign a default reader to any book without an owner.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {/* Excel Column for Owned By */}
                  <div className="space-y-1.5">
                    <Label htmlFor="map-owned-by" className="text-xs font-medium">
                      Excel Column for Owned By
                    </Label>
                    <Select
                      value={columnMapping['owned_by'] || '__none__'}
                      onValueChange={val => setColumnMapping(prev => ({ ...prev, owned_by: val }))}
                    >
                      <SelectTrigger id="map-owned-by" className="h-9 text-xs bg-background">
                        <SelectValue placeholder="Select column…" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__" className="text-xs italic text-muted-foreground">
                          (Do not map — use Default Reader)
                        </SelectItem>
                        {rawHeaders.map(h => (
                          <SelectItem key={h} value={h} className="text-xs font-medium">
                            {h} {rawRows[0] && rawRows[0][h] ? `(e.g. "${String(rawRows[0][h]).slice(0, 20)}")` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Fallback Default Reader Dropdown */}
                  <div className="space-y-1.5">
                    <Label htmlFor="map-default-reader" className="text-xs font-medium">
                      Default Reader (if blank or unmapped)
                    </Label>
                    <Select
                      value={defaultReader}
                      onValueChange={setDefaultReader}
                    >
                      <SelectTrigger id="map-default-reader" className="h-9 text-xs bg-background">
                        <SelectValue placeholder="Select reader…" />
                      </SelectTrigger>
                      <SelectContent>
                        {activeEmployees.length === 0 ? (
                          <SelectItem value="Aisha Rao" className="text-xs">Aisha Rao</SelectItem>
                        ) : (
                          activeEmployees.map(emp => (
                            <SelectItem key={emp.id} value={emp.full_name} className="text-xs">
                              {emp.full_name} {emp.department ? `(${emp.department})` : ''}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            {/* Other Fields Mapping Table */}
            <div className="border rounded-xl overflow-hidden bg-card">
              <div className="bg-muted/60 px-4 py-2.5 border-b text-xs font-semibold flex items-center justify-between">
                <span>Field in Book Nook</span>
                <span>Column in your Excel File</span>
              </div>
              <div className="divide-y max-h-[300px] overflow-y-auto">
                {fields.filter(f => importType !== 'books' || f.key !== 'owned_by').map(field => {
                  const mappedCol = columnMapping[field.key] || '__none__'
                  const sampleVal = mappedCol !== '__none__' && rawRows[0] ? rawRows[0][mappedCol] : null

                  return (
                    <div key={field.key} className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-muted/20">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold text-foreground">{field.label}</span>
                          {field.required ? (
                            <span className="text-[10px] font-bold text-destructive bg-destructive/10 px-1.5 py-0.2 rounded">
                              Required *
                            </span>
                          ) : (
                            <span className="text-[10px] text-muted-foreground">Optional</span>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground">{field.description}</p>
                      </div>

                      <div className="w-full sm:w-[260px] flex-shrink-0">
                        <Select
                          value={mappedCol}
                          onValueChange={val => setColumnMapping(prev => ({ ...prev, [field.key]: val }))}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Select column…" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__" className="text-xs italic text-muted-foreground">
                              (Do Not Map)
                            </SelectItem>
                            {rawHeaders.map(h => (
                              <SelectItem key={h} value={h} className="text-xs">
                                {h}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {sampleVal !== null && sampleVal !== undefined && (
                          <p className="text-[10px] text-muted-foreground mt-0.5 truncate max-w-[260px]">
                            Sample: <span className="font-mono text-foreground">{String(sampleVal).slice(0, 30)}</span>
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* ─── STEP 3: PREVIEW ─────────────────────────────────────── */}
        {step === 'preview' && (
          <div className="space-y-4 py-2 flex-1 flex flex-col min-h-0">
            {/* Header / Stats */}
            <div className="flex items-center justify-between bg-muted/30 p-3 rounded-lg text-sm border">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
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
                      <th className="p-2.5 font-semibold">Owned By (Reader)</th>
                      <th className="p-2.5 font-semibold">ISBN</th>
                      <th className="p-2.5 font-semibold">Shelf</th>
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
                        <td className="p-2.5">
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-amber-50 text-amber-900 border border-amber-200/80 px-2 py-0.5 rounded-full dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-800">
                            <User className="h-2.5 w-2.5 text-amber-600 dark:text-amber-400 shrink-0" />
                            <span className="truncate max-w-[120px]">{row.owned_by}</span>
                          </span>
                        </td>
                        <td className="p-2.5 font-mono text-muted-foreground">{row.isbn || '—'}</td>
                        <td className="p-2.5 text-muted-foreground">{row.shelf_number || '—'}</td>
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
                        <td className="p-2.5 font-mono font-medium">{row.employee_code || '(Auto)'}</td>
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

        {/* ─── STEP 4: SUCCESS ─────────────────────────────────────── */}
        {step === 'success' && (
          <div className="py-12 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
              <Check className="h-8 w-8 stroke-[3]" />
            </div>
            <div>
              <h3 className="text-xl font-bold">Import Completed!</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Successfully added <span className="font-semibold text-foreground">{importedCount}</span> {importType === 'books' ? 'books' : 'readers'} to your library catalog.
              </p>
            </div>
          </div>
        )}

        {/* ─── DIALOG FOOTER ACTIONS ──────────────────────────────── */}
        <DialogFooter className="mt-4 pt-3 border-t flex items-center justify-between sm:justify-between w-full">
          {step === 'upload' && (
            <>
              <Button variant="ghost" size="sm" onClick={() => handleClose(false)}>
                Cancel
              </Button>
              <div className="text-xs text-muted-foreground">
                Step 1 of 3: Upload Workbook
              </div>
            </>
          )}

          {step === 'mapping' && (
            <>
              <Button variant="outline" size="sm" onClick={() => setStep('upload')}>
                <ArrowLeft className="h-4 w-4 mr-1.5" />
                Back to Upload
              </Button>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => handleClose(false)}>
                  Cancel
                </Button>
                <Button
                  id="mapping-continue-btn"
                  size="sm"
                  onClick={applyMappingAndContinue}
                  className="bg-forest hover:bg-forest-dark text-white font-medium"
                >
                  Continue to Preview
                  <ArrowRight className="h-4 w-4 ml-1.5" />
                </Button>
              </div>
            </>
          )}

          {step === 'preview' && (
            <>
              <Button variant="outline" size="sm" onClick={() => setStep('mapping')} disabled={isImporting}>
                <ArrowLeft className="h-4 w-4 mr-1.5" />
                Back to Mapping
              </Button>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => handleClose(false)} disabled={isImporting}>
                  Cancel
                </Button>
                <Button
                  id="confirm-import-btn"
                  size="sm"
                  onClick={executeImport}
                  loading={isImporting}
                  disabled={validCount === 0 || isImporting}
                  className="bg-forest hover:bg-forest-dark text-white font-medium"
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
