import React from 'react'
import { BnMonogram } from './BnMonogram'

interface BookNookLogoProps {
  variant?: 'horizontal' | 'stacked' | 'monogram' | 'compact'
  theme?: 'dark' | 'light' | 'cover' // 'dark' = for dark backgrounds (white text), 'light' = for cream/white backgrounds, 'cover' = gold foil
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showSubtitle?: boolean
  className?: string
  monogramClassName?: string
}

export function BookNookLogo({
  variant = 'horizontal',
  theme = 'light',
  size = 'md',
  showSubtitle = true,
  className = '',
  monogramClassName = '',
}: BookNookLogoProps) {
  // Size mapping
  const monogramSizeMap = {
    sm: 28,
    md: 40,
    lg: 64,
    xl: 96,
  }

  const monogramSize = monogramSizeMap[size]

  // Text color styles based on theme
  const isDark = theme === 'dark'
  const isCover = theme === 'cover'

  const theNookColor = isCover
    ? 'text-[#F5E6C8]'
    : isDark
    ? 'text-white'
    : 'text-[#132E22]'

  const subtitleColor = isCover
    ? 'text-[#E5BE64]'
    : isDark
    ? 'text-[#E5B96D]'
    : 'text-[#8C6D2C]'

  const monogramVariant = isCover ? 'gold' : isDark ? 'dual' : 'dual'

  if (variant === 'monogram') {
    return (
      <BnMonogram
        size={monogramSize}
        variant={monogramVariant}
        className={className}
      />
    )
  }

  if (variant === 'horizontal') {
    return (
      <div className={`flex items-center gap-3 select-none ${className}`}>
        <BnMonogram
          size={monogramSize}
          variant={isDark ? 'gold' : 'dual'}
          className={monogramClassName}
        />
        <div className="flex flex-col justify-center">
          <div className="flex items-baseline font-serif font-bold tracking-tight text-lg sm:text-xl leading-none">
            <span className={theNookColor}>The&nbsp;</span>
            <span className="bg-gradient-to-r from-[#D4AF37] via-[#F3E5AB] to-[#B38728] bg-clip-text text-transparent font-extrabold">
              Book&nbsp;
            </span>
            <span className={theNookColor}>Nook</span>
          </div>
          {showSubtitle && (
            <p
              className={`text-[9px] sm:text-[10px] font-sans font-semibold tracking-[0.24em] uppercase mt-1 ${subtitleColor}`}
            >
              Office Community Library
            </p>
          )}
        </div>
      </div>
    )
  }

  if (variant === 'compact') {
    return (
      <div className={`flex items-center gap-2 select-none ${className}`}>
        <BnMonogram
          size={monogramSize * 0.8}
          variant={isDark ? 'gold' : 'dual'}
          className={monogramClassName}
        />
        <span className="font-serif font-bold text-base tracking-tight leading-none">
          <span className={theNookColor}>The </span>
          <span className="bg-gradient-to-r from-[#D4AF37] via-[#F3E5AB] to-[#B38728] bg-clip-text text-transparent font-extrabold">
            Book
          </span>
          <span className={theNookColor}> Nook</span>
        </span>
      </div>
    )
  }

  // variant === 'stacked'
  return (
    <div className={`flex flex-col items-center text-center select-none ${className}`}>
      {/* Central BN Monogram */}
      <BnMonogram
        size={monogramSize}
        variant={isCover ? 'gold' : isDark ? 'gold' : 'dual'}
        className={`mb-3 ${monogramClassName}`}
      />

      {/* Main Wordmark */}
      <div className="font-serif font-bold tracking-tight text-2xl sm:text-3xl md:text-4xl leading-tight">
        <span className={theNookColor}>The </span>
        <span className="bg-gradient-to-r from-[#D4AF37] via-[#FFF1B0] to-[#B8860B] bg-clip-text text-transparent drop-shadow-xs font-extrabold">
          Book
        </span>
        <span className={theNookColor}> Nook</span>
      </div>

      {showSubtitle && (
        <>
          {/* Subtle gold line divider with open book icon */}
          <div className="flex items-center justify-center gap-3 w-48 sm:w-60 my-2.5">
            <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-[#D4AF37]/70 to-[#D4AF37]" />
            <svg
              width="18"
              height="12"
              viewBox="0 0 24 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="text-[#D4AF37] flex-shrink-0 opacity-90"
            >
              <path
                d="M 1 3 C 6 1 11 3 12 5 C 13 3 18 1 23 3 V 14 C 18 12 13 14 12 15 C 11 14 6 12 1 14 Z"
                fill="currentColor"
                opacity="0.25"
              />
              <path
                d="M 12 5 V 15 M 1 3 C 6 1 11 3 12 5 C 13 3 18 1 23 3 M 1 14 C 6 12 11 14 12 15 C 13 14 18 12 23 14"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent via-[#D4AF37]/70 to-[#D4AF37]" />
          </div>

          {/* Subtitle */}
          <p
            className={`text-[10px] sm:text-xs font-sans font-semibold tracking-[0.28em] uppercase ${subtitleColor}`}
          >
            Office Community Library
          </p>
        </>
      )}
    </div>
  )
}

