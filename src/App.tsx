import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '@/contexts/AuthContext'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { AppLayout } from '@/components/layout/AppLayout'
import { Toaster } from '@/components/ui/toaster'

import HomePage          from '@/pages/HomePage'
import LoginPage         from '@/pages/auth/LoginPage'
import DashboardPage     from '@/pages/DashboardPage'
import BooksPage         from '@/pages/BooksPage'
import BorrowingPage     from '@/pages/BorrowingPage'
import EmployeesPage     from '@/pages/EmployeesPage'
import ReviewsPage       from '@/pages/ReviewsPage'
import ReportsPage       from '@/pages/ReportsPage'
import SettingsPage      from '@/pages/SettingsPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,       // 30 seconds
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public welcome homepage */}
            <Route path="/" element={<HomePage />} />

            {/* Public auth route */}
            <Route path="/login" element={<LoginPage />} />

            {/* Protected administrative routes */}
            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route path="/dashboard"   element={<DashboardPage />} />
                <Route path="/books/*"     element={<BooksPage />} />
                <Route path="/borrowing/*" element={<BorrowingPage />} />
                <Route path="/employees/*" element={<EmployeesPage />} />
                <Route path="/readers/*"   element={<EmployeesPage />} />
                <Route path="/reviews/*"   element={<ReviewsPage />} />
                <Route path="/reports/*"   element={<ReportsPage />} />
                <Route path="/settings/*"  element={<SettingsPage />} />
              </Route>
            </Route>

            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>

          <Toaster />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}
