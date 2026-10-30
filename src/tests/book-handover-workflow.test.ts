import { describe, it, expect, beforeEach } from 'vitest'

// Setup in-memory localStorage for test environment
const store = new Map<string, string>()
const mockStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => { store.set(k, String(v)) },
  removeItem: (k: string) => { store.delete(k) },
  clear: () => { store.clear() },
  key: (i: number) => Array.from(store.keys())[i] ?? null,
  get length() { return store.size },
} as Storage

Object.defineProperty(globalThis, 'localStorage', {
  value: mockStorage,
  writable: true,
})

import { mockSupabase } from '../lib/mockSupabase'

describe('Complete Book Handover Workflow: Ready for Pickup -> Book Given -> Active Loans -> Return', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('executes the exact user scenario with Rahul Sharma and Aadu Jeevitham', async () => {
    // 1. Reader Rahul Sharma requests Aadu Jeevitham
    const { data: employees } = await mockSupabase.from('employees').select('*')
    const rahul = employees.find((e: any) => e.full_name === 'Rahul Sharma')
    expect(rahul).toBeDefined()

    const { data: books } = await mockSupabase.from('books').select('*')
    const aaduJeevitham = books.find((b: any) => b.title === 'Aadu Jeevitham')
    expect(aaduJeevitham).toBeDefined()
    expect(aaduJeevitham.status).toBe('Available')

    // Rahul Sharma submits request
    const { data: request, error: reqErr } = await mockSupabase.from('book_requests').insert({
      book_id: aaduJeevitham.id,
      employee_id: rahul.id,
      status: 'Waiting',
      queue_position: 1,
      request_date: '2026-10-30',
      notes: 'Office reading request',
    }).select().single()

    expect(reqErr).toBeNull()
    expect(request).toBeDefined()
    expect(request.status).toBe('Waiting')
    expect(request.queue_position).toBe(1)

    // 2. Admin sees Rahul in Waiting Lists by Book
    const { data: waitingLists } = await mockSupabase
      .from('book_requests')
      .select('*')
      .eq('book_id', aaduJeevitham.id)
      .in('status', ['Waiting', 'Ready for Pickup'])

    expect(waitingLists.length).toBe(1)
    expect(waitingLists[0].employee_id).toBe(rahul.id)

    // 3. Admin clicks Mark Pickup -> 4. Request status changes to Ready for Pickup
    const { data: updatedReq } = await mockSupabase
      .from('book_requests')
      .update({
        status: 'Ready for Pickup',
        notified_at: new Date().toISOString(),
      })
      .eq('id', request.id)
      .select()
      .single()

    expect(updatedReq.status).toBe('Ready for Pickup')

    // Physical copy status is Reserved while waiting for pickup
    await mockSupabase.from('books').update({ status: 'Reserved' }).eq('id', aaduJeevitham.id)
    const { data: reservedBook } = await mockSupabase.from('books').select('*').eq('id', aaduJeevitham.id).single()
    expect(reservedBook.status).toBe('Reserved')

    // 5. Rahul comes to collect the book
    // 6. Admin clicks Book Given
    // 7. Admin confirms issue date and expected return date
    // 8. Request status changes to Fulfilled
    const issueDate = '2026-10-30'
    const dueDate = '2026-11-13'

    const { data: newBorrowingId, error: issueErr } = await mockSupabase.rpc('issue_book', {
      p_book_id: aaduJeevitham.id,
      p_employee_id: rahul.id,
      p_issue_date: issueDate,
      p_due_date: dueDate,
      p_remarks: 'Handed over at desk',
      p_actor_user_id: 'librarian-admin',
      p_request_id: request.id,
    })

    expect(issueErr).toBeNull()
    expect(newBorrowingId).toBeDefined()

    // Verify request status is now Fulfilled and removed from active queue
    const { data: fulfilledReq } = await mockSupabase.from('book_requests').select('*').eq('id', request.id).single()
    expect(fulfilledReq.status).toBe('Fulfilled')
    expect(fulfilledReq.queue_position).toBeNull()

    // Verify active waiting queue for this book is now empty
    const { data: activeQueue } = await mockSupabase
      .from('book_requests')
      .select('*')
      .eq('book_id', aaduJeevitham.id)
      .in('status', ['Waiting', 'Ready for Pickup'])
    expect(activeQueue.length).toBe(0)

    // 9. The borrowing transaction appears under Current Active Loans
    const { data: activeLoans } = await mockSupabase
      .from('borrowings')
      .select('*')
      .is('return_date', null)

    const rahulActiveLoan = activeLoans.find((l: any) => l.book_id === aaduJeevitham.id && l.employee_id === rahul.id)
    expect(rahulActiveLoan).toBeDefined()
    expect(rahulActiveLoan.issue_date).toBe(issueDate)
    expect(rahulActiveLoan.due_date).toBe(dueDate)
    expect(rahulActiveLoan.request_id).toBe(request.id)

    // 10. The book status changes to On Loan (Borrowed)
    const { data: borrowedBook } = await mockSupabase.from('books').select('*').eq('id', aaduJeevitham.id).single()
    expect(borrowedBook.status).toBe('Borrowed')

    // 11. Rahul's Reader Portal shows the book as currently borrowed
    const { data: rahulLoans } = await mockSupabase
      .from('borrowings')
      .select('*')
      .eq('employee_id', rahul.id)
      .is('return_date', null)
    expect(rahulLoans.some((l: any) => l.book_id === aaduJeevitham.id)).toBe(true)

    // 12. Admin later clicks Mark as Returned
    const returnDate = '2026-11-05'
    const { error: returnErr } = await mockSupabase.rpc('return_book', {
      p_borrowing_id: rahulActiveLoan.id,
      p_return_date: returnDate,
      p_return_remarks: 'Returned in good condition',
      p_return_condition: 'Good',
    })
    expect(returnErr).toBeNull()

    // 13. The transaction moves to Recently Returned
    const { data: closedLoan } = await mockSupabase.from('borrowings').select('*').eq('id', rahulActiveLoan.id).single()
    expect(closedLoan.return_date).toBe(returnDate)

    const { data: activeLoansAfterReturn } = await mockSupabase
      .from('borrowings')
      .select('*')
      .is('return_date', null)
    expect(activeLoansAfterReturn.some((l: any) => l.id === rahulActiveLoan.id)).toBe(false)

    // 14. The book becomes Available
    const { data: availableBookAfterReturn } = await mockSupabase.from('books').select('*').eq('id', aaduJeevitham.id).single()
    expect(availableBookAfterReturn.status).toBe('Available')
  })

  it('supports marking the next eligible reader as Ready for Pickup upon return if waiting list exists', async () => {
    const { data: employees } = await mockSupabase.from('employees').select('*')
    const rahul = employees.find((e: any) => e.full_name === 'Rahul Sharma')
    const priya = employees.find((e: any) => e.full_name === 'Priya Nair')
    const { data: books } = await mockSupabase.from('books').select('*')
    const book = books.find((b: any) => b.title === 'Aadu Jeevitham')

    // 1. Issue book to Rahul
    const { data: loanId } = await mockSupabase.rpc('issue_book', {
      p_book_id: book.id,
      p_employee_id: rahul.id,
      p_issue_date: '2026-10-30',
      p_due_date: '2026-11-13',
    })

    // 2. Priya joins waiting list for the book while it is on loan
    const { data: priyaReq } = await mockSupabase.from('book_requests').insert({
      book_id: book.id,
      employee_id: priya.id,
      status: 'Waiting',
      queue_position: 1,
      request_date: '2026-10-31',
    }).select().single()

    expect(priyaReq.status).toBe('Waiting')

    // 3. Rahul returns book, and librarian checks mark next waiting reader as Ready for Pickup
    await mockSupabase.rpc('return_book', {
      p_borrowing_id: loanId,
      p_return_date: '2026-11-05',
      p_return_remarks: 'Returned in excellent condition',
      p_next_request_ready: true,
    })

    // Book is Reserved for Priya
    const { data: bookAfterReturn } = await mockSupabase.from('books').select('*').eq('id', book.id).single()
    expect(bookAfterReturn.status).toBe('Reserved')

    // Priya's request is now Ready for Pickup (not automatically issued)
    const { data: priyaReqAfterReturn } = await mockSupabase.from('book_requests').select('*').eq('id', priyaReq.id).single()
    expect(priyaReqAfterReturn.status).toBe('Ready for Pickup')

    // No active loan exists yet for Priya until handover
    const { data: activeLoans } = await mockSupabase.from('borrowings').select('*').is('return_date', null)
    expect(activeLoans.some((l: any) => l.employee_id === priya.id && l.book_id === book.id)).toBe(false)
  })
})
