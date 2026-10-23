-- ============================================================
-- Migration: 001_initial_schema.sql
-- Book Nook – Office Library Management System
-- Initial schema: tables, indexes, constraints, RLS policies
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- for fuzzy text search

-- ============================================================
-- ENUM-LIKE CHECK CONSTRAINTS (no enum types for flexibility)
-- ============================================================

-- ============================================================
-- TABLE: app_settings
-- ============================================================
CREATE TABLE IF NOT EXISTS app_settings (
  id               INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1), -- singleton row
  library_name     TEXT NOT NULL DEFAULT 'Book Nook',
  default_loan_days INTEGER NOT NULL DEFAULT 14 CHECK (default_loan_days BETWEEN 1 AND 365),
  business_timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  date_format      TEXT NOT NULL DEFAULT 'dd MMM yyyy',
  contact_info     TEXT,
  google_books_api_key TEXT,
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert default settings row
INSERT INTO app_settings (id, library_name, default_loan_days, business_timezone, date_format)
VALUES (1, 'Book Nook', 14, 'Asia/Kolkata', 'dd MMM yyyy')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- TABLE: books
-- ============================================================
CREATE TABLE IF NOT EXISTS books (
  id                     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  book_code              TEXT NOT NULL UNIQUE,
  title                  TEXT NOT NULL,
  author                 TEXT,
  category               TEXT,
  isbn                   TEXT,
  publisher              TEXT,
  published_year         INTEGER CHECK (published_year IS NULL OR (published_year >= 1000 AND published_year <= 2100)),
  edition                TEXT,
  language               TEXT DEFAULT 'English',
  page_count             INTEGER CHECK (page_count IS NULL OR page_count > 0),
  description            TEXT,
  owned_by               TEXT,
  shelf_number           TEXT,
  date_added             DATE NOT NULL DEFAULT CURRENT_DATE,
  status                 TEXT NOT NULL DEFAULT 'Available'
                           CHECK (status IN ('Available', 'Borrowed', 'Reserved', 'Lost', 'Under Repair')),
  condition              TEXT NOT NULL DEFAULT 'Good'
                           CHECK (condition IN ('Excellent', 'Good', 'Fair', 'Poor')),
  cover_image_url        TEXT,
  google_books_volume_id TEXT,
  metadata_source        TEXT CHECK (metadata_source IS NULL OR metadata_source IN ('manual', 'google_books', 'import')),
  metadata_updated_at    TIMESTAMPTZ,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived_at            TIMESTAMPTZ
);

-- ============================================================
-- TABLE: employees
-- ============================================================
CREATE TABLE IF NOT EXISTS employees (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_code   TEXT UNIQUE,
  full_name       TEXT NOT NULL,
  department      TEXT,
  email           TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived_at     TIMESTAMPTZ
);

-- ============================================================
-- TABLE: borrowings
-- ============================================================
CREATE TABLE IF NOT EXISTS borrowings (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  book_id          UUID NOT NULL REFERENCES books(id) ON DELETE RESTRICT,
  employee_id      UUID NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
  issue_date       DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date         DATE NOT NULL,
  return_date      DATE,
  issue_remarks    TEXT,
  return_remarks   TEXT,
  return_condition TEXT CHECK (return_condition IS NULL OR return_condition IN ('Excellent', 'Good', 'Fair', 'Poor')),
  created_by       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Business rules
  CONSTRAINT due_after_issue CHECK (due_date >= issue_date),
  CONSTRAINT return_after_issue CHECK (return_date IS NULL OR return_date >= issue_date)
);

-- Prevent duplicate active loans for the same book:
-- A book may only have one row where return_date IS NULL at a time.
CREATE UNIQUE INDEX IF NOT EXISTS idx_borrowings_one_active_per_book
  ON borrowings (book_id)
  WHERE return_date IS NULL;

-- ============================================================
-- TABLE: reviews
-- ============================================================
CREATE TABLE IF NOT EXISTS reviews (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  book_id      UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  employee_id  UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  rating       INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment      TEXT,
  review_date  DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One review per employee per book
  UNIQUE (book_id, employee_id)
);

-- ============================================================
-- TABLE: audit_logs
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action        TEXT NOT NULL,
  entity_type   TEXT NOT NULL,
  entity_id     TEXT,
  details       JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ============================================================
-- TABLE: audit_logs
-- Tracks administrative actions, book creation, bulk imports
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  action      TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id   UUID,
  details     JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE: book_code_sequence
-- Concurrency-safe auto-increment for book codes (BK001, BK002…)
-- ============================================================
CREATE SEQUENCE IF NOT EXISTS book_code_seq START WITH 1 INCREMENT BY 1 NO CYCLE;

-- If migrating with existing IDs, bump the sequence past the highest existing ID:
-- SELECT setval('book_code_seq', (SELECT MAX(CAST(SUBSTRING(book_code FROM 3) AS INTEGER)) FROM books WHERE book_code ~ '^BK[0-9]+$'));

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_books_book_code ON books (book_code);
CREATE INDEX IF NOT EXISTS idx_books_title_trgm ON books USING GIN (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_books_author_trgm ON books USING GIN (author gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_books_isbn ON books (isbn);
CREATE INDEX IF NOT EXISTS idx_books_status ON books (status);
CREATE INDEX IF NOT EXISTS idx_books_category ON books (category);
CREATE INDEX IF NOT EXISTS idx_books_archived_at ON books (archived_at);

CREATE INDEX IF NOT EXISTS idx_employees_full_name_trgm ON employees USING GIN (full_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_employees_department ON employees (department);
CREATE INDEX IF NOT EXISTS idx_employees_is_active ON employees (is_active);

CREATE INDEX IF NOT EXISTS idx_borrowings_book_id ON borrowings (book_id);
CREATE INDEX IF NOT EXISTS idx_borrowings_employee_id ON borrowings (employee_id);
CREATE INDEX IF NOT EXISTS idx_borrowings_issue_date ON borrowings (issue_date);
CREATE INDEX IF NOT EXISTS idx_borrowings_due_date ON borrowings (due_date);
CREATE INDEX IF NOT EXISTS idx_borrowings_return_date ON borrowings (return_date);
CREATE INDEX IF NOT EXISTS idx_borrowings_active ON borrowings (book_id) WHERE return_date IS NULL;

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs (actor_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs (created_at DESC);

-- ============================================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_books_updated_at BEFORE UPDATE ON books
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON employees
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_borrowings_updated_at BEFORE UPDATE ON borrowings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON reviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_app_settings_updated_at BEFORE UPDATE ON app_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- SEQUENCES: Sequential Code Generation (Books & Employees)
-- Never restarts; continues sequentially from last assigned numbers
-- ============================================================
CREATE SEQUENCE IF NOT EXISTS book_code_seq START WITH 16;
CREATE SEQUENCE IF NOT EXISTS employee_code_seq START WITH 8;

-- ============================================================
-- FUNCTION: generate_book_code
-- Thread-safe book code generation using the sequence
-- ============================================================
CREATE OR REPLACE FUNCTION generate_book_code()
RETURNS TEXT AS $$
DECLARE
  seq_val BIGINT;
BEGIN
  seq_val := nextval('book_code_seq');
  RETURN 'BK' || LPAD(seq_val::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- FUNCTION: generate_employee_code
-- Thread-safe employee code generation using the sequence
-- ============================================================
CREATE OR REPLACE FUNCTION generate_employee_code()
RETURNS TEXT AS $$
DECLARE
  seq_val BIGINT;
BEGIN
  seq_val := nextval('employee_code_seq');
  RETURN 'EMP' || LPAD(seq_val::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- FUNCTION: issue_book (atomic issue transaction)
-- Creates a borrowing record and updates book status atomically.
-- ============================================================
CREATE OR REPLACE FUNCTION issue_book(
  p_book_id       UUID,
  p_employee_id   UUID,
  p_issue_date    DATE,
  p_due_date      DATE,
  p_remarks       TEXT,
  p_actor_user_id UUID
)
RETURNS UUID AS $$
DECLARE
  v_book_status  TEXT;
  v_book_archived TIMESTAMPTZ;
  v_emp_active   BOOLEAN;
  v_existing     UUID;
  v_borrowing_id UUID;
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

  -- Double-check no active loan (belt-and-suspenders beyond unique index)
  SELECT id INTO v_existing FROM borrowings
  WHERE book_id = p_book_id AND return_date IS NULL;
  IF FOUND THEN
    RAISE EXCEPTION 'An active loan already exists for this book';
  END IF;

  -- Insert borrowing
  INSERT INTO borrowings (book_id, employee_id, issue_date, due_date, issue_remarks, created_by)
  VALUES (p_book_id, p_employee_id, p_issue_date, p_due_date, p_remarks, p_actor_user_id)
  RETURNING id INTO v_borrowing_id;

  -- Update book status
  UPDATE books SET status = 'Borrowed' WHERE id = p_book_id;

  -- Audit log
  INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, details)
  VALUES (
    p_actor_user_id,
    'BOOK_ISSUED',
    'borrowings',
    v_borrowing_id::TEXT,
    jsonb_build_object('book_id', p_book_id, 'employee_id', p_employee_id, 'due_date', p_due_date)
  );

  RETURN v_borrowing_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- FUNCTION: return_book (atomic return transaction)
-- ============================================================
CREATE OR REPLACE FUNCTION return_book(
  p_borrowing_id    UUID,
  p_return_date     DATE,
  p_return_remarks  TEXT,
  p_return_condition TEXT,
  p_actor_user_id   UUID
)
RETURNS VOID AS $$
DECLARE
  v_book_id    UUID;
  v_issue_date DATE;
BEGIN
  -- Lock borrowing row
  SELECT book_id, issue_date INTO v_book_id, v_issue_date
  FROM borrowings WHERE id = p_borrowing_id AND return_date IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Active loan not found for this borrowing ID';
  END IF;

  IF p_return_date < v_issue_date THEN
    RAISE EXCEPTION 'Return date cannot be before issue date';
  END IF;

  -- Close loan
  UPDATE borrowings
  SET return_date = p_return_date,
      return_remarks = p_return_remarks,
      return_condition = p_return_condition
  WHERE id = p_borrowing_id;

  -- Update book status
  -- If returned in Lost or Under Repair condition, keep that status
  IF p_return_condition IS NOT NULL AND p_return_condition = 'Poor' THEN
    -- Still mark Available; librarian can manually change if needed
    UPDATE books SET status = 'Available', condition = 'Poor' WHERE id = v_book_id;
  ELSE
    UPDATE books
    SET status = CASE
      WHEN status NOT IN ('Lost', 'Under Repair') THEN 'Available'
      ELSE status
    END
    WHERE id = v_book_id;
  END IF;

  -- Audit log
  INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, details)
  VALUES (
    p_actor_user_id,
    'BOOK_RETURNED',
    'borrowings',
    p_borrowing_id::TEXT,
    jsonb_build_object('book_id', v_book_id, 'return_date', p_return_date)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE books ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE borrowings ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Authenticated users (librarians/admins) have full access to operational tables
CREATE POLICY "authenticated_full_access_books" ON books
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_full_access_employees" ON employees
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_full_access_borrowings" ON borrowings
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_full_access_reviews" ON reviews
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_full_access_app_settings" ON app_settings
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Audit logs: authenticated users can INSERT and SELECT, but NOT UPDATE or DELETE
CREATE POLICY "authenticated_read_audit_logs" ON audit_logs
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_insert_audit_logs" ON audit_logs
  FOR INSERT TO authenticated WITH CHECK (true);

-- No anonymous access to anything
-- (Supabase denies anon by default when RLS is enabled and no anon policy exists)
