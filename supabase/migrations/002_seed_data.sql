-- ============================================================
-- Migration: 002_seed_data.sql
-- Book Nook – Sample seed data (clearly marked as SAMPLE)
-- Run this ONLY in development/staging environments.
-- ============================================================

-- ============================================================
-- SAMPLE EMPLOYEES
-- ============================================================
INSERT INTO employees (id, employee_code, full_name, department, email, is_active) VALUES
  ('11111111-0001-0001-0001-000000000001', 'EMP001', 'Aisha Rao',        'Engineering',  'aisha.rao@example.com',    TRUE),
  ('11111111-0001-0001-0001-000000000002', 'EMP002', 'Suresh Mehta',     'Marketing',    'suresh.mehta@example.com', TRUE),
  ('11111111-0001-0001-0001-000000000003', 'EMP003', 'Priya Nair',       'HR',           'priya.nair@example.com',   TRUE),
  ('11111111-0001-0001-0001-000000000004', 'EMP004', 'Karthik Iyer',     'Finance',      'karthik.iyer@example.com', TRUE),
  ('11111111-0001-0001-0001-000000000005', 'EMP005', 'Divya Krishnan',   'Design',       'divya.k@example.com',      TRUE),
  ('11111111-0001-0001-0001-000000000006', 'EMP006', 'Rahul Sharma',     'Engineering',  'rahul.s@example.com',      TRUE),
  ('11111111-0001-0001-0001-000000000007', 'EMP007', 'Meena Pillai',     'Operations',   'meena.p@example.com',      FALSE)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- SAMPLE BOOKS
-- ============================================================
INSERT INTO books (id, book_code, title, author, category, isbn, publisher, published_year, language, page_count, status, condition, owned_by, date_added, metadata_source) VALUES
  ('22222222-0002-0002-0002-000000000001', 'BK001', 'Clean Code',                           'Robert C. Martin',    'Technology',  '9780132350884', 'Prentice Hall',      2008, 'English', 431,  'Available',    'Good',      'Aisha Rao',       '2023-01-10', 'manual'),
  ('22222222-0002-0002-0002-000000000002', 'BK002', 'The Pragmatic Programmer',             'David Thomas',        'Technology',  '9780135957059', 'Addison-Wesley',     2019, 'English', 352,  'Borrowed',     'Good',      'Rahul Sharma',   '2023-01-10', 'manual'),
  ('22222222-0002-0002-0002-000000000003', 'BK003', 'Atomic Habits',                        'James Clear',         'Self-Help',   '9780735211292', 'Avery',              2018, 'English', 320,  'Available',    'Excellent', 'Priya Nair',     '2023-02-15', 'manual'),
  ('22222222-0002-0002-0002-000000000004', 'BK004', 'Deep Work',                            'Cal Newport',         'Self-Help',   '9781455586691', 'Grand Central',      2016, 'English', 296,  'Available',    'Good',      'Aisha Rao',       '2023-02-15', 'manual'),
  ('22222222-0002-0002-0002-000000000005', 'BK005', 'Thinking, Fast and Slow',              'Daniel Kahneman',     'Psychology',  '9780374533557', 'Farrar Straus',      2011, 'English', 499,  'Available',    'Fair',      'Karthik Iyer',   '2023-03-01', 'manual'),
  ('22222222-0002-0002-0002-000000000006', 'BK006', 'The Lean Startup',                     'Eric Ries',           'Business',    '9780307887894', 'Crown Business',     2011, 'English', 336,  'Available',    'Good',      'Suresh Mehta',   '2023-03-01', 'manual'),
  ('22222222-0002-0002-0002-000000000007', 'BK007', 'Sapiens: A Brief History',             'Yuval Noah Harari',   'History',     '9780062316097', 'Harper',             2015, 'English', 443,  'Available',    'Good',      'Divya Krishnan', '2023-03-10', 'manual'),
  ('22222222-0002-0002-0002-000000000008', 'BK008', 'Zero to One',                          'Peter Thiel',         'Business',    '9780804139021', 'Crown Business',     2014, 'English', 224,  'Reserved',     'Good',      'Suresh Mehta',   '2023-04-01', 'manual'),
  ('22222222-0002-0002-0002-000000000009', 'BK009', 'The Phoenix Project',                  'Gene Kim',            'Technology',  '9781942788294', 'IT Revolution',      2018, 'English', 432,  'Available',    'Excellent', 'Rahul Sharma',   '2023-04-05', 'manual'),
  ('22222222-0002-0002-0002-000000000010', 'BK010', 'Designing Data-Intensive Applications','Martin Kleppmann',    'Technology',  '9781449373320', 'O''Reilly Media',     2017, 'English', 616,  'Lost',         'Poor',      'Aisha Rao',       '2023-04-10', 'manual'),
  ('22222222-0002-0002-0002-000000000011', 'BK011', 'Good to Great',                        'Jim Collins',         'Business',    '9780066620992', 'HarperBusiness',     2001, 'English', 320,  'Available',    'Good',      'Karthik Iyer',   '2023-05-01', 'manual'),
  ('22222222-0002-0002-0002-000000000012', 'BK012', 'Start With Why',                       'Simon Sinek',         'Leadership',  '9781591846444', 'Portfolio',          2009, 'English', 256,  'Under Repair', 'Fair',      'Priya Nair',     '2023-05-01', 'manual'),
  ('22222222-0002-0002-0002-000000000013', 'BK013', 'The Art of War',                       'Sun Tzu',             'Strategy',    '9780195014761', 'Oxford University',  1963, 'English', 160,  'Available',    'Good',      'Divya Krishnan', '2023-05-15', 'manual'),
  ('22222222-0002-0002-0002-000000000014', 'BK014', 'Educated',                             'Tara Westover',       'Memoir',      '9780399590504', 'Random House',       2018, 'English', 352,  'Available',    'Good',      'Divya Krishnan', '2023-06-01', 'manual'),
  ('22222222-0002-0002-0002-000000000015', 'BK015', 'The 7 Habits of Highly Effective People', 'Stephen R. Covey', 'Self-Help',  '9780743269513', 'Free Press',         2004, 'English', 432,  'Available',    'Fair',      'Priya Nair',     '2023-06-10', 'manual')
ON CONFLICT (id) DO NOTHING;

-- Bump the sequence past the highest seed book code number
SELECT setval('book_code_seq', 15, true);

-- ============================================================
-- SAMPLE BORROWINGS
-- ============================================================
INSERT INTO borrowings (id, book_id, employee_id, issue_date, due_date, return_date, issue_remarks) VALUES
  -- Active loan: BK002 is Borrowed
  ('33333333-0003-0003-0003-000000000001',
   '22222222-0002-0002-0002-000000000002',
   '11111111-0001-0001-0001-000000000001',
   '2026-10-01', '2026-10-15', NULL,
   'Borrowing for project reference'),

  -- Returned loan: BK001 was returned
  ('33333333-0003-0003-0003-000000000002',
   '22222222-0002-0002-0002-000000000001',
   '11111111-0001-0001-0001-000000000002',
   '2026-09-01', '2026-09-15', '2026-09-14',
   NULL),

  -- Overdue loan (for demo – return_date NULL, due date in the past)
  ('33333333-0003-0003-0003-000000000003',
   '22222222-0002-0002-0002-000000000003',
   '11111111-0001-0001-0001-000000000003',
   '2026-09-15', '2026-09-29', NULL,
   'Long overdue demo record')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- SAMPLE REVIEWS
-- ============================================================
INSERT INTO reviews (book_id, employee_id, rating, comment, review_date) VALUES
  ('22222222-0002-0002-0002-000000000001', '11111111-0001-0001-0001-000000000001', 5, 'Essential reading for every developer.', '2026-09-20'),
  ('22222222-0002-0002-0002-000000000003', '11111111-0001-0001-0001-000000000002', 4, 'Practical and immediately applicable.', '2026-09-25'),
  ('22222222-0002-0002-0002-000000000005', '11111111-0001-0001-0001-000000000004', 5, 'Changed how I think about decisions.', '2026-10-01'),
  ('22222222-0002-0002-0002-000000000006', '11111111-0001-0001-0001-000000000005', 4, 'Great for startup thinking.', '2026-10-05')
ON CONFLICT DO NOTHING;
