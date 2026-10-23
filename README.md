# Book Nook — Office Library Management System

A complete, cloud-hosted web application for managing your office book catalog, tracking borrowings, and generating reports.

## Technology Stack

| Layer       | Technology                                      |
|-------------|--------------------------------------------------|
| Frontend    | React 18, Vite, TypeScript, Tailwind CSS         |
| UI          | shadcn/ui patterns, Radix UI, Lucide Icons       |
| Data        | TanStack Query, React Hook Form + Zod            |
| Charts      | Recharts                                         |
| Backend     | Supabase (PostgreSQL + Auth + RLS)               |
| Hosting     | Vercel (frontend) + Supabase (database)          |
| Integration | Google Books API v1                              |
| Reports     | ExcelJS                                          |

---

## Local Development Setup

### 1. Prerequisites

- Node.js 18+
- A free [Supabase](https://supabase.com) account
- A free [Vercel](https://vercel.com) account (for deployment)

### 2. Clone and Install

```bash
git clone <your-repo-url>
cd TBN
npm install
```

### 3. Configure Environment Variables

Copy `.env.example` to `.env.local` and fill in the values:

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_GOOGLE_BOOKS_API_KEY=your-google-books-api-key-here   # optional
VITE_APP_NAME=Book Nook
```

> **Never commit `.env.local` to source control.** It is listed in `.gitignore`.

### 4. Set Up Supabase

1. Create a new project at [app.supabase.com](https://app.supabase.com)
2. Go to **Project Settings → API** and copy your Project URL and anon key
3. Open the **SQL Editor** in the Supabase dashboard
4. Run `supabase/migrations/001_initial_schema.sql` — this creates all tables, indexes, RLS policies, and stored procedures
5. *(Optional)* Run `supabase/migrations/002_seed_data.sql` for sample data in a dev/staging environment

### 5. Create Librarian Account

Since there is no public sign-up, create accounts via the Supabase dashboard:

1. Go to **Authentication → Users → Add User**
2. Enter the librarian's email and a strong temporary password
3. The librarian can log in and reset their password via the "Forgot password?" link

### 6. Run the Dev Server

```bash
npm run dev
```

App will open at [http://localhost:5173](http://localhost:5173).

---

## Google Books API (Optional)

The application works without a Google Books API key — it falls back gracefully when the API is unavailable.

To enable book metadata and cover auto-fill:

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a project and enable the **Books API**
3. Create an **API key** and restrict it to the Books API and your domain
4. Add it to `VITE_GOOGLE_BOOKS_API_KEY` in `.env.local`

---

## Vercel Deployment

### 1. Push to GitHub/GitLab/Bitbucket

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin <your-repo-url>
git push -u origin main
```

### 2. Import to Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your repository
3. Add the environment variables from `.env.local` in the Vercel project settings
4. Deploy

Vercel will automatically redeploy on every push to `main`.

---

## Database Schema Overview

| Table          | Purpose                                          |
|----------------|--------------------------------------------------|
| `books`        | Book catalog with status, condition, metadata    |
| `employees`    | Employee directory                               |
| `borrowings`   | Loan records (issue → return history)            |
| `reviews`      | Employee book reviews and ratings                |
| `audit_logs`   | Immutable audit trail of all important actions   |
| `app_settings` | Singleton settings row (loan days, timezone, etc)|

### Key Database Features

- **Concurrency-safe book IDs**: `generate_book_code()` DB function uses a PostgreSQL sequence
- **Atomic issue/return**: `issue_book()` and `return_book()` stored procedures handle status updates transactionally
- **One active loan per book**: Partial unique index prevents duplicate active loans
- **Row Level Security**: All tables protected; anon users have zero access

---

## Migration from Excel

See `supabase/migrations/002_seed_data.sql` for the import format. For a production migration:

1. Keep your original workbook read-only as a backup
2. Use the **Import Wizard** in the Reports section (coming in Phase 4)
3. The wizard maps columns, validates data, detects duplicates, and preserves existing Book IDs
4. Review errors before confirming import
5. After migration, Book Nook becomes the source of truth

---

## Project Structure

```
src/
├── components/
│   ├── auth/          # ProtectedRoute
│   ├── books/         # BookFormDialog, BookDetailDialog
│   ├── borrowing/     # IssueBookDialog, ReturnBookDialog
│   ├── layout/        # AppLayout, Sidebar, Topbar
│   └── ui/            # Button, Card, Dialog, Badge, etc.
├── contexts/
│   └── AuthContext.tsx
├── hooks/
│   ├── use-books.ts
│   ├── use-borrowings.ts
│   ├── use-employees.ts
│   └── use-toast.ts
├── lib/
│   ├── database.types.ts
│   ├── supabase.ts
│   └── utils.ts
├── pages/
│   ├── auth/LoginPage.tsx
│   ├── DashboardPage.tsx
│   ├── BooksPage.tsx
│   ├── BorrowingPage.tsx
│   ├── EmployeesPage.tsx
│   ├── ReviewsPage.tsx
│   ├── ReportsPage.tsx
│   └── SettingsPage.tsx
└── App.tsx
supabase/
└── migrations/
    ├── 001_initial_schema.sql
    └── 002_seed_data.sql   ← SAMPLE DATA ONLY
```

---

## Backup and Recovery

### Daily Backup (Supabase Pro)
Supabase Pro includes Point-in-Time Recovery (PITR). For the Free tier:

1. Go to **Supabase → Database → Backups**
2. Download periodic backups manually
3. Use the **Reports → Full Book Catalog** and **Borrowing History** exports as a human-readable backup

### Restore from Backup
Contact Supabase support or use `pg_restore` with your downloaded backup file.

---

## Troubleshooting

| Issue                         | Solution                                                           |
|-------------------------------|---------------------------------------------------------------------|
| Cannot sign in                | Verify email/password in Supabase Auth dashboard                   |
| Books not loading             | Check Supabase URL and anon key in `.env.local`                    |
| Google Books not working      | App works without API key; add key to enable metadata fill         |
| Issue book fails              | Ensure book is Available and employee is Active                    |
| Excel export is empty         | Confirm there is data in the database and you are logged in        |
| "relation does not exist"     | Run migration `001_initial_schema.sql` in Supabase SQL Editor      |

---

## Development Phases

- [x] **Phase 1** — Project setup, database schema, authentication, security
- [x] **Phase 2** — Book catalog, Google Books integration
- [x] **Phase 3** — Employees, borrowing, returns, overdue logic
- [ ] **Phase 4** — Dashboard charts, full reports, Excel import wizard
- [ ] **Phase 5** — Migration validation, testing, security review, deployment

---

## Security Notes

- The Supabase **anon key** is safe to expose in the browser — it is restricted by Row Level Security
- The **service-role key** is NEVER used in frontend code
- All destructive operations require confirmed authentication
- Audit logs are INSERT-only for authenticated users (no UPDATE or DELETE policy)
- Password reset is handled via Supabase Auth secure email links
