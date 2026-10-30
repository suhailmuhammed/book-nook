import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, BookOpen, ArrowLeftRight, Users,
  Star, BarChart3, Settings, BookMarked, Compass,
} from 'lucide-react'
import { BookNookLogo } from '@/components/brand/BookNookLogo'
import { cn } from '@/lib/utils'

const navItems = [
  { to: '/dashboard',  label: 'Dashboard',   icon: LayoutDashboard },
  { to: '/books',      label: 'Book Catalog',icon: BookOpen        },
  { to: '/borrowing',  label: 'Borrowing',   icon: ArrowLeftRight  },
  { to: '/employees',  label: 'Readers',     icon: Users           },
  { to: '/reviews',    label: 'Reviews',     icon: Star            },
  { to: '/reports',    label: 'Reports',     icon: BarChart3       },
  { to: '/settings',   label: 'Settings',    icon: Settings        },
]

export function Sidebar({ onClose }: { onClose?: () => void }) {
  const location = useLocation()

  return (
    <aside className="sidebar h-full w-64 flex flex-col">
      {/* Logo / Branding */}
      <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: 'hsl(228 40% 32%)' }}>
        <BookNookLogo variant="horizontal" theme="dark" size="sm" showSubtitle={true} />
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {navItems.map(({ to, label, icon: Icon }) => {
          const isActive = location.pathname.startsWith(to)

          return (
            <NavLink
              key={to}
              to={to}
              onClick={onClose}
              className={cn('sidebar-link', isActive && 'active')}
              style={isActive ? { borderLeftColor: 'hsl(174 54% 42%)' } : undefined}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              {label}
            </NavLink>
          )
        })}
      </nav>

      {/* Public Library View Link */}
      <div className="px-3 py-2 border-t" style={{ borderColor: 'hsl(228 40% 32%)' }}>
        <NavLink
          to="/"
          onClick={onClose}
          className="sidebar-link text-xs flex items-center gap-2 hover:bg-white/5 transition-colors"
        >
          <Compass className="h-4 w-4 text-teal-300 flex-shrink-0" />
          <span>Public Welcome Page</span>
        </NavLink>
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t text-[10px]" style={{ borderColor: 'hsl(228 40% 32%)', color: 'hsl(228 30% 45%)' }}>
        Book Nook v1.0 · Office Library
      </div>
    </aside>
  )
}
