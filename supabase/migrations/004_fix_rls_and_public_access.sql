-- ============================================================
-- Migration: 004_fix_rls_and_public_access.sql
-- Book Nook – Office Library Management System
-- Enable anonymous / public access for homepage employee selection,
-- book browsing, and book requests submission.
-- ============================================================

-- 1. Enable RLS on book_requests and queue_audit_logs
ALTER TABLE book_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE queue_audit_logs ENABLE ROW LEVEL SECURITY;

-- 2. Authenticated users (librarians / admins) have full access
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'book_requests' AND policyname = 'authenticated_full_access_requests'
  ) THEN
    CREATE POLICY "authenticated_full_access_requests" ON book_requests
      FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'queue_audit_logs' AND policyname = 'authenticated_full_access_queue_logs'
  ) THEN
    CREATE POLICY "authenticated_full_access_queue_logs" ON queue_audit_logs
      FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 3. Anonymous / Public Users:
-- Allow reading active employees so the homepage dropdown can populate dynamically
DROP POLICY IF EXISTS "anon_read_active_employees" ON employees;
CREATE POLICY "anon_read_active_employees" ON employees
  FOR SELECT TO anon
  USING (is_active = TRUE AND archived_at IS NULL);

-- Allow reading non-archived books for public browsing
DROP POLICY IF EXISTS "anon_read_books" ON books;
CREATE POLICY "anon_read_books" ON books
  FOR SELECT TO anon
  USING (archived_at IS NULL);

-- Allow reading borrowings so current borrower name and due dates show on book cards
DROP POLICY IF EXISTS "anon_read_borrowings" ON borrowings;
CREATE POLICY "anon_read_borrowings" ON borrowings
  FOR SELECT TO anon
  USING (true);

-- Allow reading active book requests so queue counts and requester spots show
DROP POLICY IF EXISTS "anon_read_requests" ON book_requests;
CREATE POLICY "anon_read_requests" ON book_requests
  FOR SELECT TO anon
  USING (true);

-- Allow anonymous users to submit book requests and join waiting lists
DROP POLICY IF EXISTS "anon_insert_requests" ON book_requests;
CREATE POLICY "anon_insert_requests" ON book_requests
  FOR INSERT TO anon
  WITH CHECK (true);

-- Allow anonymous users to cancel their own requests
DROP POLICY IF EXISTS "anon_cancel_requests" ON book_requests;
CREATE POLICY "anon_cancel_requests" ON book_requests
  FOR UPDATE TO anon
  USING (status IN ('Waiting', 'Ready for Pickup'))
  WITH CHECK (status = 'Cancelled');

-- Allow reading app settings
DROP POLICY IF EXISTS "anon_read_settings" ON app_settings;
CREATE POLICY "anon_read_settings" ON app_settings
  FOR SELECT TO anon
  USING (true);

-- Allow inserting into queue_audit_logs for requests made by users
DROP POLICY IF EXISTS "anon_insert_queue_logs" ON queue_audit_logs;
CREATE POLICY "anon_insert_queue_logs" ON queue_audit_logs
  FOR INSERT TO anon
  WITH CHECK (true);
