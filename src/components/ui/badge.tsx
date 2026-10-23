import { cn, getStatusVariant, getConditionVariant } from '@/lib/utils'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'purple'
  className?: string
  size?: 'sm' | 'default'
}

const variantClasses = {
  success: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  info:    'bg-blue-50 text-blue-700 border border-blue-200',
  warning: 'bg-amber-50 text-amber-700 border border-amber-200',
  error:   'bg-red-50 text-red-700 border border-red-200',
  purple:  'bg-purple-50 text-purple-700 border border-purple-200',
  neutral: 'bg-gray-50 text-gray-600 border border-gray-200',
}

export function Badge({ children, variant = 'neutral', className, size = 'default' }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-medium',
        size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-0.5 text-xs',
        variantClasses[variant],
        className
      )}
    >
      {children}
    </span>
  )
}

export function StatusBadge({ status }: { status: string }) {
  return <Badge variant={getStatusVariant(status)}>{status}</Badge>
}

export function ConditionBadge({ condition }: { condition: string }) {
  return <Badge variant={getConditionVariant(condition)}>{condition}</Badge>
}
