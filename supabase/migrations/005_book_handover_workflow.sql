-- ============================================================
-- Migration: 005_book_handover_workflow.sql
-- Book Nook – Complete Book Issue Workflow
-- Links borrowings to book_requests and updates issue_book & return_book
-- ============================================================

-- 1. Add request_id to borrowings table if not exists
ALTER TABLE borrowings
  ADD COLUMN IF NOT EXISTS request_id UUID REFERENCES book_requests(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_borrowings_request_id ON borrowings (request_id);

-- 2. Update issue_book function to support linking request_id & auto-fulfilling request
CREATE OR REPLACE FUNCTION issue_book(
  p_book_id       UUID,
  p_employee_id   UUID,
  p_issue_date    DATE,
  p_due_date      DATE,
  p_remarks       TEXT,
  p_actor_user_id UUID,
  p_request_id    UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_book_status   TEXT;
  v_book_archived  TIMESTAMPTZ;
  v_emp_active    BOOLEAN;
  v_existing      UUID;
  v_borrowing_id  UUID;
  v_req_id        UUID;
BEGIN
  -- Lock the book row for update
  SELECT status, archived_at INTO v_book_status, v_book_archived
  FROM books WHERE id = p_book_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Book not found';
  END IF;

  IF v_book_archived IS NOT NULL THEN
    RAISE EXCEPTION 'Book is archived and cannot be issued';
  END IF;

  IF v_book_status NOT IN ('Available', 'Reserved') THEN
    RAISE EXCEPTION 'Book is not available for borrowing (current status: %)', v_book_status;
  END IF;

  -- Check employee
  SELECT is_active INTO v_emp_active FROM employees WHERE id = p_employee_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Employee not found';
  END IF;
  IF NOT v_emp_active THEN
    RAISE EXCEPTION 'Employee is not active';
  END IF;

  -- Check due date
  IF p_due_date < p_issue_date THEN
    RAISE EXCEPTION 'Due date cannot be before issue date';
  END IF;

  -- Ensure no active loan currently exists for this book
  SELECT id INTO v_existing FROM borrowings
  WHERE book_id = p_book_id AND return_date IS NULL;
  IF FOUND THEN
    RAISE EXCEPTION 'An active loan already exists for this book';
  END IF;

  -- If request_id provided, verify or find matching active request
  v_req_id := p_request_id;
  IF v_req_id IS NULL THEN
    SELECT id INTO v_req_id FROM book_requests
    WHERE book_id = p_book_id AND employee_id = p_employee_id AND status IN ('Waiting', 'Ready for Pickup')
    LIMIT 1;
  END IF;

  -- Insert borrowing transaction
  INSERT INTO borrowings (book_id, employee_id, issue_date, due_date, issue_remarks, created_by, request_id)
  VALUES (p_book_id, p_employee_id, p_issue_date, p_due_date, p_remarks, p_actor_user_id, v_req_id)
  RETURNING id INTO v_borrowing_id;

  -- Update book status to Borrowed (On Loan)
  UPDATE books SET status = 'Borrowed' WHERE id = p_book_id;

  -- If linked request exists, mark as Fulfilled and recompact waiting queue
  IF v_req_id IS NOT NULL THEN
    UPDATE book_requests
    SET status = 'Fulfilled',
        queue_position = NULL,
        updated_at = NOW()
    WHERE id = v_req_id;

    -- Recompact remaining queue
    WITH renumbered AS (
      SELECT id, ROW_NUMBER() OVER (ORDER BY queue_position ASC) as new_pos
      FROM book_requests
      WHERE book_id = p_book_id AND status IN ('Waiting', 'Ready for Pickup')
    )
    UPDATE book_requests
    SET queue_position = renumbered.new_pos
    FROM renumbered
    WHERE book_requests.id = renumbered.id;

    -- Log queue audit
    INSERT INTO queue_audit_logs (book_id, request_id, employee_id, action, reason, performed_by)
    VALUES (p_book_id, v_req_id, p_employee_id, 'FULFILLED', 'Book handed over to reader (Loan issued)', 'Librarian');
  END IF;

  -- General audit log
  INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, details)
  VALUES (
    p_actor_user_id,
    'BOOK_ISSUED',
    'borrowings',
    v_borrowing_id::TEXT,
    jsonb_build_object('book_id', p_book_id, 'employee_id', p_employee_id, 'due_date', p_due_date, 'request_id', v_req_id)
  );

  RETURN v_borrowing_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Seed Aadu Jeevitham if not exists
INSERT INTO books (id, book_code, title, author, category, isbn, publisher, published_year, language, page_count, status, condition, owned_by, date_added, metadata_source, is_demo)
VALUES (
  '22222222-0002-0002-0002-000000000016',
  'BK016',
  'Aadu Jeevitham',
  'Benyamin',
  'Fiction',
  '9788126421077',
  'Green Books',
  2008,
  'Malayalam / English',
  255,
  'Available',
  'Good',
  'Rahul Sharma',
  '2023-07-01',
  'manual',
  TRUE
)
ON CONFLICT (id) DO NOTHING;

