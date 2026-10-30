import React from 'react'
import { BnMonogram } from './BnMonogram'

interface BrandedLoaderProps {
  message?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function BrandedLoader({
  message = 'Loading Book Nook…',
  size = 'md',
  className = '',
}: BrandedLoaderProps) {
  const monogramSizes = {
    sm: 32,
    md: 48,
    lg: 64,
  }

  return (
    <div className={`flex flex-col items-center justify-center py-12 px-4 gap-3.5 select-none ${className}`}>
      <div className="relative flex items-center justify-center">
        {/* Soft ambient gold pulse glow */}
        <div className="absolute w-14 h-14 rounded-full bg-gold/20 animate-ping opacity-50" />
        <div className="relative animate-pulse transition-transform duration-700">
          <BnMonogram size={monogramSizes[size]} variant="dual" />
        </div>
      </div>
      {message && (
        <p className="text-xs font-serif italic text-muted-foreground tracking-wider text-center">
          {message}
        </p>
      )}
    </div>
  )
}

