// Local mock implementation of Supabase client for standalone / offline development.
import type { Database } from './database.types'

const LOCAL_STORAGE_PREFIX = 'booknook_mock_db_'

const INITIAL_EMPLOYEES = [
  { id: '11111111-0001-0001-0001-000000000001', employee_code: 'EMP001', full_name: 'Aisha Rao', department: 'Engineering', email: 'aisha.rao@example.com', is_active: true, archived_at: null, created_at: '2023-01-01T00:00:00Z' },
  { id: '11111111-0001-0001-0001-000000000002', employee_code: 'EMP002', full_name: 'Suresh Mehta', department: 'Marketing', email: 'suresh.mehta@example.com', is_active: true, archived_at: null, created_at: '2023-01-01T00:00:00Z' },
  { id: '11111111-0001-0001-0001-000000000003', employee_code: 'EMP003', full_name: 'Priya Nair', department: 'HR', email: 'priya.nair@example.com', is_active: true, archived_at: null, created_at: '2023-01-01T00:00:00Z' },
  { id: '11111111-0001-0001-0001-000000000004', employee_code: 'EMP004', full_name: 'Karthik Iyer', department: 'Finance', email: 'karthik.iyer@example.com', is_active: true, archived_at: null, created_at: '2023-01-01T00:00:00Z' },
  { id: '11111111-0001-0001-0001-000000000005', employee_code: 'EMP005', full_name: 'Divya Krishnan', department: 'Design', email: 'divya.k@example.com', is_active: true, archived_at: null, created_at: '2023-01-01T00:00:00Z' },
  { id: '11111111-0001-0001-0001-000000000006', employee_code: 'EMP006', full_name: 'Rahul Sharma', department: 'Engineering', email: 'rahul.s@example.com', is_active: true, archived_at: null, created_at: '2023-01-01T00:00:00Z' },
  { id: '11111111-0001-0001-0001-000000000007', employee_code: 'EMP007', full_name: 'Meena Pillai', department: 'Operations', email: 'meena.p@example.com', is_active: false, archived_at: null, created_at: '2023-01-01T00:00:00Z' },
]

const INITIAL_BOOKS = [
  { id: '22222222-0002-0002-0002-000000000001', book_code: 'BK001', title: 'Clean Code', author: 'Robert C. Martin', category: 'Technology', isbn: '9780132350884', publisher: 'Prentice Hall', published_year: 2008, language: 'English', page_count: 431, status: 'Available', condition: 'Good', owned_by: 'Engineering', date_added: '2023-01-10', cover_image_url: 'https://covers.openlibrary.org/b/isbn/9780132350884-M.jpg', metadata_source: 'manual', archived_at: null, is_demo: true, created_at: '2023-01-10T00:00:00Z' },
  { id: '22222222-0002-0002-0002-000000000002', book_code: 'BK002', title: 'The Pragmatic Programmer', author: 'David Thomas', category: 'Technology', isbn: '9780135957059', publisher: 'Addison-Wesley', published_year: 2019, language: 'English', page_count: 352, status: 'Borrowed', condition: 'Good', owned_by: 'Engineering', date_added: '2023-01-10', cover_image_url: 'https://covers.openlibrary.org/b/isbn/9780135957059-M.jpg', metadata_source: 'manual', archived_at: null, is_demo: true, created_at: '2023-01-10T00:00:00Z' },
  { id: '22222222-0002-0002-0002-000000000003', book_code: 'BK003', title: 'Atomic Habits', author: 'James Clear', category: 'Self-Help', isbn: '9780735211292', publisher: 'Avery', published_year: 2018, language: 'English', page_count: 320, status: 'Borrowed', condition: 'Excellent', owned_by: 'HR', date_added: '2023-02-15', cover_image_url: 'https://covers.openlibrary.org/b/isbn/9780735211292-M.jpg', metadata_source: 'manual', archived_at: null, is_demo: true, created_at: '2023-02-15T00:00:00Z' },
  { id: '22222222-0002-0002-0002-000000000004', book_code: 'BK004', title: 'Deep Work', author: 'Cal Newport', category: 'Self-Help', isbn: '9781455586691', publisher: 'Grand Central', published_year: 2016, language: 'English', page_count: 296, status: 'Available', condition: 'Good', owned_by: 'HR', date_added: '2023-02-15', cover_image_url: 'https://covers.openlibrary.org/b/isbn/9781455586691-M.jpg', metadata_source: 'manual', archived_at: null, is_demo: true, created_at: '2023-02-15T00:00:00Z' },
  { id: '22222222-0002-0002-0002-000000000005', book_code: 'BK005', title: 'Thinking, Fast and Slow', author: 'Daniel Kahneman', category: 'Psychology', isbn: '9780374533557', publisher: 'Farrar Straus', published_year: 2011, language: 'English', page_count: 499, status: 'Available', condition: 'Fair', owned_by: 'Management', date_added: '2023-03-01', cover_image_url: 'https://covers.openlibrary.org/b/isbn/9780374533557-M.jpg', metadata_source: 'manual', archived_at: null, is_demo: true, created_at: '2023-03-01T00:00:00Z' },
  { id: '22222222-0002-0002-0002-000000000006', book_code: 'BK006', title: 'The Lean Startup', author: 'Eric Ries', category: 'Business', isbn: '9780307887894', publisher: 'Crown Business', published_year: 2011, language: 'English', page_count: 336, status: 'Available', condition: 'Good', owned_by: 'Management', date_added: '2023-03-01', cover_image_url: 'https://covers.openlibrary.org/b/isbn/9780307887894-M.jpg', metadata_source: 'manual', archived_at: null, is_demo: true, created_at: '2023-03-01T00:00:00Z' },
  { id: '22222222-0002-0002-0002-000000000007', book_code: 'BK007', title: 'Sapiens: A Brief History', author: 'Yuval Noah Harari', category: 'History', isbn: '9780062316097', publisher: 'Harper', published_year: 2015, language: 'English', page_count: 443, status: 'Available', condition: 'Good', owned_by: 'General', date_added: '2023-03-10', cover_image_url: 'https://covers.openlibrary.org/b/isbn/9780062316097-M.jpg', metadata_source: 'manual', archived_at: null, is_demo: true, created_at: '2023-03-10T00:00:00Z' },
  { id: '22222222-0002-0002-0002-000000000008', book_code: 'BK008', title: 'Zero to One', author: 'Peter Thiel', category: 'Business', isbn: '9780804139021', publisher: 'Crown Business', published_year: 2014, language: 'English', page_count: 224, status: 'Reserved', condition: 'Good', owned_by: 'Management', date_added: '2023-04-01', cover_image_url: 'https://covers.openlibrary.org/b/isbn/9780804139021-M.jpg', metadata_source: 'manual', archived_at: null, is_demo: true, created_at: '2023-04-01T00:00:00Z' },
  { id: '22222222-0002-0002-0002-000000000009', book_code: 'BK009', title: 'The Phoenix Project', author: 'Gene Kim', category: 'Technology', isbn: '9781942788294', publisher: 'IT Revolution', published_year: 2018, language: 'English', page_count: 432, status: 'Available', condition: 'Excellent', owned_by: 'Engineering', date_added: '2023-04-05', cover_image_url: 'https://covers.openlibrary.org/b/isbn/9781942788294-M.jpg', metadata_source: 'manual', archived_at: null, is_demo: true, created_at: '2023-04-05T00:00:00Z' },
  { id: '22222222-0002-0002-0002-000000000010', book_code: 'BK010', title: 'Designing Data-Intensive Applications', author: 'Martin Kleppmann', category: 'Technology', isbn: '9781449373320', publisher: "O'Reilly Media", published_year: 2017, language: 'English', page_count: 616, status: 'Lost', condition: 'Poor', owned_by: 'Engineering', date_added: '2023-04-10', cover_image_url: 'https://covers.openlibrary.org/b/isbn/9781449373320-M.jpg', metadata_source: 'manual', archived_at: null, is_demo: true, created_at: '2023-04-10T00:00:00Z' },
  { id: '22222222-0002-0002-0002-000000000011', book_code: 'BK011', title: 'Good to Great', author: 'Jim Collins', category: 'Business', isbn: '9780066620992', publisher: 'HarperBusiness', published_year: 2001, language: 'English', page_count: 320, status: 'Available', condition: 'Good', owned_by: 'Management', date_added: '2023-05-01', cover_image_url: 'https://covers.openlibrary.org/b/isbn/9780066620992-M.jpg', metadata_source: 'manual', archived_at: null, is_demo: true, created_at: '2023-05-01T00:00:00Z' },
  { id: '22222222-0002-0002-0002-000000000012', book_code: 'BK012', title: 'Start With Why', author: 'Simon Sinek', category: 'Leadership', isbn: '9781591846444', publisher: 'Portfolio', published_year: 2009, language: 'English', page_count: 256, status: 'Under Repair', condition: 'Fair', owned_by: 'Management', date_added: '2023-05-01', cover_image_url: 'https://covers.openlibrary.org/b/isbn/9781591846444-M.jpg', metadata_source: 'manual', archived_at: null, is_demo: true, created_at: '2023-05-01T00:00:00Z' },
  { id: '22222222-0002-0002-0002-000000000013', book_code: 'BK013', title: 'The Art of War', author: 'Sun Tzu', category: 'Strategy', isbn: '9780195014761', publisher: 'Oxford University', published_year: 1963, language: 'English', page_count: 160, status: 'Available', condition: 'Good', owned_by: 'General', date_added: '2023-05-15', cover_image_url: 'https://covers.openlibrary.org/b/isbn/9780195014761-M.jpg', metadata_source: 'manual', archived_at: null, is_demo: true, created_at: '2023-05-15T00:00:00Z' },
  { id: '22222222-0002-0002-0002-000000000014', book_code: 'BK014', title: 'Educated', author: 'Tara Westover', category: 'Memoir', isbn: '9780399590504', publisher: 'Random House', published_year: 2018, language: 'English', page_count: 352, status: 'Available', condition: 'Good', owned_by: 'General', date_added: '2023-06-01', cover_image_url: 'https://covers.openlibrary.org/b/isbn/9780399590504-M.jpg', metadata_source: 'manual', archived_at: null, is_demo: true, created_at: '2023-06-01T00:00:00Z' },
  { id: '22222222-0002-0002-0002-000000000015', book_code: 'BK015', title: 'The 7 Habits of Highly Effective People', author: 'Stephen R. Covey', category: 'Self-Help', isbn: '9780743269513', publisher: 'Free Press', published_year: 2004, language: 'English', page_count: 432, status: 'Available', condition: 'Fair', owned_by: 'HR', date_added: '2023-06-10', cover_image_url: 'https://covers.openlibrary.org/b/isbn/9780743269513-M.jpg', metadata_source: 'manual', archived_at: null, is_demo: true, created_at: '2023-06-10T00:00:00Z' },
]

const INITIAL_BORROWINGS = [
  {
    id: '33333333-0003-0003-0003-000000000001',
    book_id: '22222222-0002-0002-0002-000000000002',
    employee_id: '11111111-0001-0001-0001-000000000001',
    issue_date: '2026-10-01',
    due_date: '2026-10-29',
    return_date: null,
    issue_remarks: 'Borrowing for project reference',
    is_demo: true,
    created_at: '2026-10-01T10:00:00Z',
  },
  {
    id: '33333333-0003-0003-0003-000000000002',
    book_id: '22222222-0002-0002-0002-000000000001',
    employee_id: '11111111-0001-0001-0001-000000000002',
    issue_date: '2026-09-01',
    due_date: '2026-09-15',
    return_date: '2026-09-14',
    issue_remarks: null,
    is_demo: true,
    created_at: '2026-09-01T10:00:00Z',
  },
  {
    id: '33333333-0003-0003-0003-000000000003',
    book_id: '22222222-0002-0002-0002-000000000003',
    employee_id: '11111111-0001-0001-0001-000000000006',
    issue_date: '2026-10-16',
    due_date: '2026-10-30',
    return_date: null,
    issue_remarks: 'Rahul borrowed Atomic Habits',
    is_demo: true,
    created_at: '2026-10-16T10:00:00Z',
  },
]

const INITIAL_REQUESTS = [
  {
    id: '55555555-0005-0005-0005-000000000001',
    book_id: '22222222-0002-0002-0002-000000000003', // Atomic Habits
    employee_id: '11111111-0001-0001-0001-000000000003', // Priya Nair (HR)
    status: 'Waiting',
    queue_position: 1,
    request_date: '2026-10-24',
    notified_at: null,
    notes: 'Office reading group',
    is_demo: true,
    created_at: '2026-10-24T10:00:00Z',
    updated_at: '2026-10-24T10:00:00Z',
  },
  {
    id: '55555555-0005-0005-0005-000000000002',
    book_id: '22222222-0002-0002-0002-000000000003', // Atomic Habits
    employee_id: '11111111-0001-0001-0001-000000000004', // Karthik Iyer (Finance)
    status: 'Waiting',
    queue_position: 2,
    request_date: '2026-10-25',
    notified_at: null,
    notes: null,
    is_demo: true,
    created_at: '2026-10-25T11:00:00Z',
    updated_at: '2026-10-25T11:00:00Z',
  },
  {
    id: '55555555-0005-0005-0005-000000000003',
    book_id: '22222222-0002-0002-0002-000000000003', // Atomic Habits
    employee_id: '11111111-0001-0001-0001-000000000005', // Divya Krishnan (Design)
    status: 'Waiting',
    queue_position: 3,
    request_date: '2026-10-26',
    notified_at: null,
    notes: null,
    is_demo: true,
    created_at: '2026-10-26T09:00:00Z',
    updated_at: '2026-10-26T09:00:00Z',
  },
]

const INITIAL_REVIEWS = [
  { id: '44444444-0004-0004-0004-000000000001', book_id: '22222222-0002-0002-0002-000000000001', employee_id: '11111111-0001-0001-0001-000000000001', rating: 5, comment: 'Essential reading for every developer.', review_date: '2026-09-20', created_at: '2026-09-20T00:00:00Z' },
  { id: '44444444-0004-0004-0004-000000000002', book_id: '22222222-0002-0002-0002-000000000003', employee_id: '11111111-0001-0001-0001-000000000002', rating: 4, comment: 'Practical and immediately applicable.', review_date: '2026-09-25', created_at: '2026-09-25T00:00:00Z' },
  { id: '44444444-0004-0004-0004-000000000003', book_id: '22222222-0002-0002-0002-000000000005', employee_id: '11111111-0001-0001-0001-000000000004', rating: 5, comment: 'Changed how I think about decisions.', review_date: '2026-10-01', created_at: '2026-10-01T00:00:00Z' },
  { id: '44444444-0004-0004-0004-000000000004', book_id: '22222222-0002-0002-0002-000000000006', employee_id: '11111111-0001-0001-0001-000000000005', rating: 4, comment: 'Great for startup thinking.', review_date: '2026-10-05', created_at: '2026-10-05T00:00:00Z' },
]

const INITIAL_SETTINGS = [
  {
    id: 1,
    library_name: 'Book Nook',
    default_loan_days: 14,
    business_timezone: 'Asia/Kolkata',
    date_format: 'dd MMM yyyy',
    contact_info: 'librarian@company.internal',
    google_books_api_key: '',
    updated_at: new Date().toISOString(),
  },
]

function getTableData(table: string): any[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_PREFIX + table)
    if (raw) {
      let data = JSON.parse(raw)
      // Ensure app_settings has google_books_api_key field
      if (table === 'app_settings' && data[0] && data[0].google_books_api_key === undefined) {
        data[0].google_books_api_key = ''
      }
      // Ensure books have cover_image_url
      if (table === 'books' && Array.isArray(data)) {
        let changed = false
        data.forEach((b: any) => {
          if (!b.cover_image_url && b.isbn) {
            b.cover_image_url = `https://covers.openlibrary.org/b/isbn/${String(b.isbn).replace(/[^0-9X]/gi, '')}-M.jpg`
            changed = true
          }
        })
        if (changed) saveTableData('books', data)
      }

      // Ensure employees table has archived_at and auto-seeds if empty
      if (table === 'employees' && Array.isArray(data)) {
        let changed = false
        if (data.length === 0) {
          data = [...INITIAL_EMPLOYEES]
          changed = true
        } else {
          data.forEach((e: any) => {
            if (e.archived_at === undefined) {
              e.archived_at = null
              changed = true
            }
          })
        }
        if (changed) saveTableData('employees', data)
      }
      return data
    }
  } catch (e) {
    console.error('Failed reading mock table:', table, e)
  }

  // Initial fallbacks
  let initial: any[] = []
  if (table === 'books') initial = INITIAL_BOOKS
  else if (table === 'employees') initial = INITIAL_EMPLOYEES
  else if (table === 'borrowings') initial = INITIAL_BORROWINGS
  else if (table === 'book_requests') initial = INITIAL_REQUESTS
  else if (table === 'queue_audit_logs') initial = []
  else if (table === 'reviews') initial = INITIAL_REVIEWS
  else if (table === 'app_settings') initial = INITIAL_SETTINGS
  else if (table === 'audit_logs') initial = []

  saveTableData(table, initial)
  return initial
}

function saveTableData(table: string, data: any[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_PREFIX + table, JSON.stringify(data))
  } catch (e) {
    console.error('Failed saving mock table:', table, e)
  }
}

// ============================================================
// Sequential Code Generators (Continuous & Non-Restarting)
// ============================================================
function getHighestCodeNumber(type: 'book' | 'employee'): number {
  const seqKey = `${LOCAL_STORAGE_PREFIX}seq_${type}`
  let stored = 0
  try {
    const raw = localStorage.getItem(seqKey)
    if (raw) stored = parseInt(raw, 10) || 0
  } catch {}

  const defaultMin = type === 'book' ? 15 : 7
  const table = type === 'book' ? 'books' : 'employees'
  const codeField = type === 'book' ? 'book_code' : 'employee_code'
  
  let maxInTable = 0
  try {
    const rows = getTableData(table)
    for (const r of rows) {
      const codeStr = String(r[codeField] || '')
      const match = codeStr.match(/\d+/)
      if (match) {
        const val = parseInt(match[0], 10)
        if (!isNaN(val) && val > maxInTable) maxInTable = val
      }
    }
  } catch {}

  let maxInAudit = 0
  try {
    const auditLogs = getTableData('audit_logs')
    for (const log of auditLogs) {
      const codeStr = log?.details?.[codeField] || log?.details?.code
      if (codeStr) {
        const match = String(codeStr).match(/\d+/)
        if (match) {
          const val = parseInt(match[0], 10)
          if (!isNaN(val) && val > maxInAudit) maxInAudit = val
        }
      }
    }
  } catch {}

  const highest = Math.max(stored, maxInTable, maxInAudit, defaultMin)
  if (highest > stored) {
    try {
      localStorage.setItem(seqKey, String(highest))
    } catch {}
  }
  return highest
}

export function getNextSequentialCode(type: 'book' | 'employee', advance: boolean = true): string {
  const prefix = type === 'book' ? 'BK' : 'EMP'
  const seqKey = `${LOCAL_STORAGE_PREFIX}seq_${type}`
  const highest = getHighestCodeNumber(type)
  const nextNum = highest + 1

  if (advance) {
    try {
      localStorage.setItem(seqKey, String(nextNum))
    } catch {}
  }

  return `${prefix}${String(nextNum).padStart(3, '0')}`
}

export function recordAssignedCode(type: 'book' | 'employee', code: string | null | undefined): void {
  if (!code) return
  const match = String(code).match(/\d+/)
  if (!match) return
  const num = parseInt(match[0], 10)
  if (isNaN(num)) return

  const seqKey = `${LOCAL_STORAGE_PREFIX}seq_${type}`
  const current = getHighestCodeNumber(type)
  if (num > current) {
    try {
      localStorage.setItem(seqKey, String(num))
    } catch {}
  }
}


// Auth State
const AUTH_KEY = 'booknook_mock_auth'
const authListeners: Array<(event: string, session: any) => void> = []

function getStoredSession() {
  try {
    const raw = localStorage.getItem(AUTH_KEY)
    if (raw) return JSON.parse(raw)
  } catch (e) {
    console.error('Failed getting mock session', e)
  }
  return null
}

function notifyAuth(event: string, session: any) {
  authListeners.forEach((fn) => {
    try {
      fn(event, session)
    } catch (e) {
      console.error(e)
    }
  })
}

class MockQueryBuilder {
  private table: string
  private isSingle = false
  private isHead = false
  private countMode: string | null = null
  private filters: Array<(row: any) => boolean> = []
  private sortFn: ((a: any, b: any) => number) | null = null
  private rangeStart: number | null = null
  private rangeEnd: number | null = null
  private limitCount: number | null = null
  private insertData: any = null
  private updateData: any = null
  private isDelete = false
  private selectFields = '*'

  constructor(table: string) {
    this.table = table
  }

  select(fields = '*', options?: { count?: 'exact' | 'planned' | 'estimated'; head?: boolean }) {
    this.selectFields = fields
    if (options?.count) this.countMode = options.count
    if (options?.head) this.isHead = true
    return this
  }

  insert(data: any) {
    this.insertData = data
    return this
  }

  update(data: any) {
    this.updateData = data
    return this
  }

  delete() {
    this.isDelete = true
    return this
  }

  eq(col: string, val: any) {
    this.filters.push((row) => row[col] === val)
    return this
  }

  neq(col: string, val: any) {
    this.filters.push((row) => row[col] !== val)
    return this
  }

  lt(col: string, val: any) {
    this.filters.push((row) => row[col] !== null && row[col] !== undefined && row[col] < val)
    return this
  }

  lte(col: string, val: any) {
    this.filters.push((row) => row[col] !== null && row[col] !== undefined && row[col] <= val)
    return this
  }

  gt(col: string, val: any) {
    this.filters.push((row) => row[col] !== null && row[col] !== undefined && row[col] > val)
    return this
  }

  gte(col: string, val: any) {
    this.filters.push((row) => row[col] !== null && row[col] !== undefined && row[col] >= val)
    return this
  }

  in(col: string, vals: any[]) {
    this.filters.push((row) => vals.includes(row[col]))
    return this
  }

  is(col: string, val: any) {
    this.filters.push((row) => {
      if (val === null) return row[col] === null || row[col] === undefined
      return row[col] === val
    })
    return this
  }

  not(col: string, _operator: string, val: any) {
    this.filters.push((row) => {
      if (val === null) return row[col] !== null && row[col] !== undefined
      return row[col] !== val
    })
    return this
  }

  or(filterStr: string) {
    // e.g. "title.ilike.%test%,author.ilike.%test%"
    const conditions = filterStr.split(',').map((cond) => {
      const parts = cond.split('.')
      const col = parts[0]
      const op = parts[1]
      const val = parts.slice(2).join('.').replace(/%/g, '').toLowerCase()
      return { col, op, val }
    })

    this.filters.push((row) => {
      return conditions.some(({ col, op, val }) => {
        const rowVal = String(row[col] ?? '').toLowerCase()
        if (op === 'ilike' || op === 'like') {
          return rowVal.includes(val)
        }
        return rowVal === val
      })
    })
    return this
  }

  order(col: string, { ascending = true }: { ascending?: boolean } = {}) {
    this.sortFn = (a, b) => {
      const valA = a[col] ?? ''
      const valB = b[col] ?? ''
      if (valA < valB) return ascending ? -1 : 1
      if (valA > valB) return ascending ? 1 : -1
      return 0
    }
    return this
  }

  range(from: number, to: number) {
    this.rangeStart = from
    this.rangeEnd = to
    return this
  }

  limit(count: number) {
    this.limitCount = count
    return this
  }

  single() {
    this.isSingle = true
    return this
  }

  private expandRelations(row: any) {
    const item = { ...row }
    if (this.table === 'borrowings') {
      const books = getTableData('books')
      const employees = getTableData('employees')
      const book = books.find((b) => b.id === item.book_id)
      const employee = employees.find((e) => e.id === item.employee_id)
      item.book = book ? { id: book.id, book_code: book.book_code, title: book.title, cover_image_url: book.cover_image_url, status: book.status } : null
      item.employee = employee ? { id: employee.id, full_name: employee.full_name, department: employee.department, employee_code: employee.employee_code } : null
    } else if (this.table === 'book_requests') {
      const books = getTableData('books')
      const employees = getTableData('employees')
      const book = books.find((b) => b.id === item.book_id)
      const employee = employees.find((e) => e.id === item.employee_id)
      item.book = book ? { id: book.id, book_code: book.book_code, title: book.title, cover_image_url: book.cover_image_url, status: book.status, condition: book.condition } : null
      item.employee = employee ? { id: employee.id, full_name: employee.full_name, department: employee.department, employee_code: employee.employee_code } : null
    } else if (this.table === 'reviews') {
      const books = getTableData('books')
      const employees = getTableData('employees')
      const book = books.find((b) => b.id === item.book_id)
      const employee = employees.find((e) => e.id === item.employee_id)
      item.book = book ? { id: book.id, book_code: book.book_code, title: book.title, cover_image_url: book.cover_image_url } : null
      item.employee = employee ? { id: employee.id, full_name: employee.full_name } : null
    }
    return item
  }

  private execute() {
    let rows = [...getTableData(this.table)]

    // Handle INSERT
    if (this.insertData) {
      const newItems = Array.isArray(this.insertData) ? this.insertData : [this.insertData]
      const inserted = newItems.map((item, idx) => {
        const enriched = {
          id: item.id || `mock-${Date.now()}-${idx}`,
          created_at: item.created_at || new Date().toISOString(),
          ...item,
        }

        if (this.table === 'books') {
          if (!enriched.book_code) {
            enriched.book_code = getNextSequentialCode('book', true)
          } else {
            recordAssignedCode('book', enriched.book_code)
          }
        } else if (this.table === 'employees') {
          if (!enriched.employee_code) {
            enriched.employee_code = getNextSequentialCode('employee', true)
          } else {
            recordAssignedCode('employee', enriched.employee_code)
          }
        }

        return enriched
      })
      rows = [...rows, ...inserted]
      saveTableData(this.table, rows)
      return {
        data: this.isSingle ? this.expandRelations(inserted[0]) : inserted.map((r) => this.expandRelations(r)),
        error: null,
      }
    }

    // Handle UPDATE
    if (this.updateData) {
      let updatedRows: any[] = []
      rows = rows.map((row) => {
        if (this.filters.every((f) => f(row))) {
          const updated = { ...row, ...this.updateData, updated_at: new Date().toISOString() }
          updatedRows.push(updated)
          return updated
        }
        return row
      })
      saveTableData(this.table, rows)
      return {
        data: this.isSingle ? (updatedRows[0] ? this.expandRelations(updatedRows[0]) : null) : updatedRows.map((r) => this.expandRelations(r)),
        error: null,
      }
    }

    // Handle DELETE
    if (this.isDelete) {
      rows = rows.filter((row) => !this.filters.every((f) => f(row)))
      saveTableData(this.table, rows)
      return { data: null, error: null }
    }

    // Handle SELECT
    let filtered = rows.filter((row) => this.filters.every((f) => f(row)))
    const count = filtered.length

    if (this.isHead) {
      return { data: null, error: null, count }
    }

    if (this.sortFn) {
      filtered.sort(this.sortFn)
    }

    if (this.rangeStart !== null && this.rangeEnd !== null) {
      filtered = filtered.slice(this.rangeStart, this.rangeEnd + 1)
    } else if (this.limitCount !== null) {
      filtered = filtered.slice(0, this.limitCount)
    }

    const processed = filtered.map((r) => this.expandRelations(r))

    return {
      data: this.isSingle ? (processed[0] ?? null) : processed,
      error: null,
      count,
    }
  }

  // Promise-like interface
  then<TResult1 = any, TResult2 = never>(
    onfulfilled?: ((value: any) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return Promise.resolve(this.execute()).then(onfulfilled, onrejected)
  }
}

export const mockSupabase = {
  auth: {
    async getSession() {
      const session = getStoredSession()
      return { data: { session }, error: null }
    },
    onAuthStateChange(callback: (event: string, session: any) => void) {
      authListeners.push(callback)
      return {
        data: {
          subscription: {
            unsubscribe: () => {
              const idx = authListeners.indexOf(callback)
              if (idx !== -1) authListeners.splice(idx, 1)
            },
          },
        },
      }
    },
    async signInWithPassword({ email, password }: { email: string; password: string }) {
      const normalizedEmail = email && email.includes('@') ? email : `${email || 'admin'}@booknook.local`
      const session = {
        access_token: 'mock-jwt-token',
        token_type: 'bearer',
        expires_in: 3600,
        user: {
          id: 'mock-user-admin-1',
          email: normalizedEmail,
          role: 'authenticated',
          aud: 'authenticated',
          user_metadata: { name: 'Library Admin', role: 'librarian' },
          created_at: new Date().toISOString(),
        },
      }
      localStorage.setItem(AUTH_KEY, JSON.stringify(session))
      notifyAuth('SIGNED_IN', session)
      return { data: { user: session.user, session }, error: null }
    },
    async signOut() {
      localStorage.removeItem(AUTH_KEY)
      notifyAuth('SIGNED_OUT', null)
      return { error: null }
    },
    async resetPasswordForEmail(_email: string) {
      return { data: {}, error: null }
    },
  },

  from(table: string) {
    return new MockQueryBuilder(table)
  },

  async rpc(fnName: string, params?: any) {
    if (fnName === 'generate_book_code') {
      const nextCode = getNextSequentialCode('book', true)
      return { data: nextCode, error: null }
    }

    if (fnName === 'peek_next_book_code') {
      const nextCode = getNextSequentialCode('book', false)
      return { data: nextCode, error: null }
    }

    if (fnName === 'generate_employee_code') {
      const nextCode = getNextSequentialCode('employee', true)
      return { data: nextCode, error: null }
    }

    if (fnName === 'peek_next_employee_code') {
      const nextCode = getNextSequentialCode('employee', false)
      return { data: nextCode, error: null }
    }

    if (fnName === 'issue_book') {
      const { p_book_id, p_employee_id, p_issue_date, p_due_date, p_remarks } = params || {}
      const books = getTableData('books')
      const borrowings = getTableData('borrowings')

      const bookIdx = books.findIndex((b) => b.id === p_book_id)
      if (bookIdx !== -1) {
        books[bookIdx].status = 'Borrowed'
        saveTableData('books', books)
      }

      const newBorrowing = {
        id: `mock-borrowing-${Date.now()}`,
        book_id: p_book_id,
        employee_id: p_employee_id,
        issue_date: p_issue_date,
        due_date: p_due_date,
        return_date: null,
        issue_remarks: p_remarks || null,
        created_at: new Date().toISOString(),
      }
      borrowings.unshift(newBorrowing)
      saveTableData('borrowings', borrowings)

      // Fulfill any active request for this employee and book
      const requests = getTableData('book_requests')
      const reqIdx = requests.findIndex(
        (r) => r.book_id === p_book_id && r.employee_id === p_employee_id && (r.status === 'Waiting' || r.status === 'Ready for Pickup')
      )
      if (reqIdx !== -1) {
        requests[reqIdx].status = 'Fulfilled'
        requests[reqIdx].queue_position = null
        requests[reqIdx].updated_at = new Date().toISOString()

        // Recompact remaining queue for this book
        const remainingQueue = requests
          .filter((r) => r.book_id === p_book_id && (r.status === 'Waiting' || r.status === 'Ready for Pickup'))
          .sort((a, b) => (a.queue_position || 999) - (b.queue_position || 999))
        remainingQueue.forEach((item, idx) => {
          item.queue_position = idx + 1
        })
        saveTableData('book_requests', requests)
      }

      return { data: newBorrowing.id, error: null }
    }

    if (fnName === 'return_book') {
      const { p_borrowing_id, p_return_date, p_return_remarks, p_return_condition } = params || {}
      const borrowings = getTableData('borrowings')
      const books = getTableData('books')

      const loan = borrowings.find((b) => b.id === p_borrowing_id)
      if (loan) {
        loan.return_date = p_return_date || new Date().toISOString().split('T')[0]
        loan.return_remarks = p_return_remarks || null
        saveTableData('borrowings', borrowings)

        const book = books.find((b) => b.id === loan.book_id)
        if (book) {
          book.status = 'Available'
          if (p_return_condition) book.condition = p_return_condition
          saveTableData('books', books)
        }
      }

      return { data: null, error: null }
    }

    return { data: null, error: null }
  },
}
