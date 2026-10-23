import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Menu, Bell, LogOut, User, ChevronDown } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { toast } from '@/hooks/use-toast'

const pageTitles: Record<string, string> = {
  '/dashboard':  'Dashboard',
  '/books':      'Book Catalog',
  '/borrowing':  'Borrowing & Returns',
  '/employees':  'Employees',
  '/reviews':    'Reviews',
  '/reports':    'Reports',
  '/settings':   'Settings',
}

function getPageTitle(pathname: string): string {
  // Exact matches first
  if (pageTitles[pathname]) return pageTitles[pathname]
  // Prefix matches
  for (const [key, val] of Object.entries(pageTitles)) {
    if (key !== '/' && pathname.startsWith(key)) return val
  }
  return 'Book Nook'
}

interface TopbarProps {
  onMenuClick: () => void
}

export function Topbar({ onMenuClick }: TopbarProps) {
  const location = useLocation()
  const { user, signOut } = useAuth()
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  const title = getPageTitle(location.pathname)

  async function handleSignOut() {
    try {
      await signOut()
    } catch {
      toast({ title: 'Sign out failed', variant: 'destructive' })
    }
  }

  return (
    <header className="h-14 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex items-center px-4 gap-4 flex-shrink-0 sticky top-0 z-30">
      {/* Mobile menu toggle */}
      <button
        id="mobile-menu-btn"
        className="lg:hidden p-1.5 rounded-md hover:bg-muted transition-colors"
        onClick={onMenuClick}
        aria-label="Open navigation menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Page title */}
      <h2 className="text-base font-semibold text-foreground flex-1">{title}</h2>

      {/* Right actions */}
      <div className="flex items-center gap-2">
        {/* User menu */}
        <div className="relative">
          <button
            id="user-menu-btn"
            onClick={() => setUserMenuOpen(v => !v)}
            className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm hover:bg-muted transition-colors"
            aria-expanded={userMenuOpen}
            aria-haspopup="menu"
          >
            <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold flex-shrink-0">
              {user?.email?.charAt(0).toUpperCase() ?? 'A'}
            </div>
            <span className="hidden sm:block text-sm font-medium max-w-[140px] truncate">
              {user?.email ?? 'Admin'}
            </span>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground hidden sm:block" />
          </button>

          {userMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setUserMenuOpen(false)}
              />
              <div
                className="absolute right-0 top-full mt-1 w-52 rounded-lg border bg-popover shadow-lg z-50 py-1"
                role="menu"
              >
                <div className="px-3 py-2 border-b">
                  <p className="text-xs text-muted-foreground">Signed in as</p>
                  <p className="text-sm font-medium truncate">{user?.email}</p>
                </div>
                <button
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                  onClick={handleSignOut}
                  role="menuitem"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
