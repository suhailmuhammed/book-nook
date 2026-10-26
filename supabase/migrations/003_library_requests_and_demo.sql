-- ============================================================
-- Migration: 003_library_requests_and_demo.sql
-- Book Nook – Office Library Management System
-- Book Requests, FIFO Waiting Lists, Audit Log & Demo Data Flags
-- ============================================================

-- 1. Add is_demo flag to books table if not exists
ALTER TABLE books
  ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. Add is_demo flag to borrowings table if not exists
ALTER TABLE borrowings
  ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT FALSE;

-- 3. Create book_requests table for waiting lists
CREATE TABLE IF NOT EXISTS book_requests (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  book_id        UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  employee_id    UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  status         TEXT NOT NULL DEFAULT 'Waiting'
                   CHECK (status IN ('Waiting', 'Ready for Pickup', 'Fulfilled', 'Cancelled', 'Expired')),
  queue_position INTEGER NOT NULL DEFAULT 1,
  request_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  notified_at    TIMESTAMPTZ,
  notes          TEXT,
  is_demo        BOOLEAN NOT NULL DEFAULT FALSE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Prevent duplicate active requests for the same employee and book
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_active_request_per_emp_book
  ON book_requests (book_id, employee_id)
  WHERE status IN ('Waiting', 'Ready for Pickup');

-- Index for ordering queue efficiently
CREATE INDEX IF NOT EXISTS idx_book_requests_queue
  ON book_requests (book_id, queue_position)
  WHERE status IN ('Waiting', 'Ready for Pickup');

-- 4. Create queue_audit_logs table to record admin queue operations
CREATE TABLE IF NOT EXISTS queue_audit_logs (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  book_id       UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  request_id    UUID REFERENCES book_requests(id) ON DELETE SET NULL,
  employee_id   UUID REFERENCES employees(id) ON DELETE SET NULL,
  action        TEXT NOT NULL, -- 'ADDED', 'CANCELLED', 'REORDERED', 'READY_FOR_PICKUP', 'FULFILLED'
  prev_position INTEGER,
  new_position  INTEGER,
  reason        TEXT,
  performed_by  TEXT DEFAULT 'Admin',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tag existing sample seed records as demo
UPDATE books SET is_demo = TRUE WHERE is_demo IS FALSE;
UPDATE borrowings SET is_demo = TRUE WHERE is_demo IS FALSE;
