import { useState } from 'react'
import { BookOpen } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BookCoverProps {
  src?: string | null
  title: string
  className?: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
}

const sizeClasses = {
  xs: 'w-8 h-12 text-[9px]',
  sm: 'w-10 h-15 text-[10px]',
  md: 'w-16 h-24 text-xs',
  lg: 'w-24 h-36 text-sm',
  xl: 'w-32 h-48 text-base',
}

export function BookCover({ src, title, className, size = 'md' }: BookCoverProps) {
  const [imgError, setImgError] = useState(false)

  if (!src || imgError) {
    return (
      <div
        className={cn(
          'relative flex flex-col items-center justify-center rounded border border-border/80 bg-sage-light text-forest shadow-xs flex-shrink-0 aspect-[2/3] overflow-hidden select-none p-1 text-center',
          sizeClasses[size],
          className
        )}
        title={title}
        aria-label={`Cover for ${title}`}
      >
        <BookOpen className="h-1/3 w-1/3 opacity-70 mb-0.5 text-forest" />
        <span className="font-serif text-[10px] leading-tight font-medium line-clamp-2 px-0.5 opacity-80">
          {title}
        </span>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'relative rounded overflow-hidden flex-shrink-0 aspect-[2/3] bg-muted/30 border border-border/60 shadow-xs flex items-center justify-center',
        sizeClasses[size],
        className
      )}
    >
      <img
        src={src}
        alt={`Cover of ${title}`}
        loading="lazy"
        onError={() => setImgError(true)}
        className="w-full h-full object-contain"
      />
    </div>
  )
}

