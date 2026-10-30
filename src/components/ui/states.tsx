import { LucideIcon } from 'lucide-react'
import { BrandedLoader } from '@/components/brand/BrandedLoader'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-base font-semibold mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground mb-4 max-w-xs">{description}</p>
      )}
      {action}
    </div>
  )
}

export function LoadingRows({ columns = 5, rows = 5 }: { columns?: number; rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, ri) => (
        <tr key={ri} className="border-b">
          {Array.from({ length: columns }).map((_, ci) => (
            <td key={ci} className="px-4 py-3">
              <div className="skeleton h-4 rounded w-3/4" />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}

export function PageLoader({ message = 'Loading library catalog…' }: { message?: string }) {
  return <BrandedLoader message={message} size="md" />
}

export function ErrorMessage({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
      <strong>Error:</strong> {message}
    </div>
  )
}
