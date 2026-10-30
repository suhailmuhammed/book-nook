import React from 'react'

interface BnMonogramProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | number
  className?: string
  variant?: 'gold' | 'forest' | 'white' | 'dual'
}

export function BnMonogram({
  size = 'md',
  className = '',
  variant = 'dual',
}: BnMonogramProps) {
  const pixelSize =
    typeof size === 'number'
      ? size
      : size === 'xs'
      ? 24
      : size === 'sm'
      ? 32
      : size === 'md'
      ? 48
      : size === 'lg'
      ? 72
      : size === 'xl'
      ? 110
      : 160 // 2xl

  // Unique IDs for SVG gradients so multiple instances don't collide
  const idPrefix = React.useId().replace(/:/g, '')

  // Color schemes
  const goldGradientStart = '#F5D77F'
  const goldGradientMid = '#D4AF37'
  const goldGradientEnd = '#9A6B1F'

  const darkColor =
    variant === 'gold'
      ? '#D4AF37'
      : variant === 'white'
      ? '#FFFFFF'
      : '#132E22' // Deep official forest green

  return (
    <svg
      width={pixelSize}
      height={pixelSize * 0.88}
      viewBox="0 0 200 176"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block flex-shrink-0 select-none ${className}`}
      aria-label="Book Nook BN Monogram"
    >
      <defs>
        {/* Luxury Gold Foil Gradient */}
        <linearGradient
          id={`${idPrefix}-gold`}
          x1="0%"
          y1="0%"
          x2="100%"
          y2="100%"
        >
          <stop offset="0%" stopColor={goldGradientStart} />
          <stop offset="35%" stopColor={goldGradientMid} />
          <stop offset="70%" stopColor="#FFF1B0" />
          <stop offset="100%" stopColor={goldGradientEnd} />
        </linearGradient>

        {/* Diagonal Gold Slice for 'N' */}
        <linearGradient
          id={`${idPrefix}-n-gold`}
          x1="30%"
          y1="0%"
          x2="70%"
          y2="100%"
        >
          <stop offset="0%" stopColor="#E5BE64" />
          <stop offset="50%" stopColor="#FFF6C8" />
          <stop offset="100%" stopColor="#AA7822" />
        </linearGradient>

        {/* Forest Metallic Accent */}
        <linearGradient
          id={`${idPrefix}-forest`}
          x1="0%"
          y1="0%"
          x2="100%"
          y2="100%"
        >
          <stop offset="0%" stopColor="#1B3F2F" />
          <stop offset="100%" stopColor="#0B1D15" />
        </linearGradient>

        {/* Drop shadow filter for embossed book cover feel */}
        <filter id={`${idPrefix}-emboss`} x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="1.5" stdDeviation="1" floodColor="#000000" floodOpacity="0.18" />
        </filter>
      </defs>

      <g filter={`url(#${idPrefix}-emboss)`}>
        {/* ─── Top Horizontal Bar ─── */}
        <rect
          x="12"
          y="10"
          width="176"
          height="11"
          rx="1"
          fill={variant === 'white' ? '#FFFFFF' : darkColor}
        />
        <rect
          x="12"
          y="10"
          width="176"
          height="2"
          fill={`url(#${idPrefix}-gold)`}
          opacity="0.85"
        />

        {/* ─── Bottom Horizontal Bar ─── */}
        <rect
          x="12"
          y="155"
          width="176"
          height="11"
          rx="1"
          fill={variant === 'white' ? '#FFFFFF' : darkColor}
        />
        <rect
          x="12"
          y="164"
          width="176"
          height="2"
          fill={`url(#${idPrefix}-gold)`}
          opacity="0.85"
        />

        {/* ─── LEFT CHARACTER: "B" (Stack of Book Spines & Pages) ─── */}
        <g id="book-letter-b">
          {/* Main vertical spine stem */}
          <path
            d="M 28 30 L 52 30 L 52 146 L 28 146 Z"
            fill={variant === 'white' ? '#FFFFFF' : darkColor}
          />

          {/* Book Spine ribs & Page layers (The horizontal book slices) */}
          {/* Top lobe of B - Upper books */}
          <path
            d="M 48 30 H 84 C 98 30 108 39 108 53 C 108 67 98 76 84 76 H 48 Z"
            fill="none"
            stroke={variant === 'white' ? '#FFFFFF' : darkColor}
            strokeWidth="9"
            strokeLinejoin="round"
          />

          {/* Lower lobe of B - Lower books */}
          <path
            d="M 48 76 H 88 C 103 76 114 86 114 101 C 114 116 103 126 88 126 H 48 Z"
            fill="none"
            stroke={variant === 'white' ? '#FFFFFF' : darkColor}
            strokeWidth="9"
            strokeLinejoin="round"
          />

          {/* Golden Horizontal Page ridges on B */}
          {/* Upper lobe horizontal page lines */}
          <line x1="38" y1="40" x2="82" y2="40" stroke={`url(#${idPrefix}-gold)`} strokeWidth="3" strokeLinecap="round" />
          <line x1="38" y1="48" x2="88" y2="48" stroke={`url(#${idPrefix}-gold)`} strokeWidth="3" strokeLinecap="round" />
          <line x1="38" y1="56" x2="90" y2="56" stroke={`url(#${idPrefix}-gold)`} strokeWidth="3" strokeLinecap="round" />
          <line x1="38" y1="64" x2="84" y2="64" stroke={`url(#${idPrefix}-gold)`} strokeWidth="3" strokeLinecap="round" />

          {/* Lower lobe horizontal page lines */}
          <line x1="38" y1="86" x2="86" y2="86" stroke={`url(#${idPrefix}-gold)`} strokeWidth="3.2" strokeLinecap="round" />
          <line x1="38" y1="95" x2="93" y2="95" stroke={`url(#${idPrefix}-gold)`} strokeWidth="3.2" strokeLinecap="round" />
          <line x1="38" y1="104" x2="93" y2="104" stroke={`url(#${idPrefix}-gold)`} strokeWidth="3.2" strokeLinecap="round" />
          <line x1="38" y1="113" x2="88" y2="113" stroke={`url(#${idPrefix}-gold)`} strokeWidth="3.2" strokeLinecap="round" />
          <line x1="38" y1="122" x2="80" y2="122" stroke={`url(#${idPrefix}-gold)`} strokeWidth="3.2" strokeLinecap="round" />

          {/* Bookmark Ribbon on top of B */}
          <path
            d="M 70 30 L 70 54 L 77 47 L 84 54 L 84 30 Z"
            fill={`url(#${idPrefix}-gold)`}
            stroke={variant === 'white' ? '#FFFFFF' : darkColor}
            strokeWidth="1.2"
          />
        </g>

        {/* ─── RIGHT CHARACTER: "N" (Editorial Serif with Gold Slice) ─── */}
        <g id="letter-n">
          {/* Left Vertical Pillar of N */}
          <path
            d="M 112 30 H 128 V 146 H 112 Z"
            fill={variant === 'white' ? '#FFFFFF' : darkColor}
          />
          {/* Top & Bottom serifs on left pillar */}
          <path
            d="M 108 30 H 132 V 34 H 108 Z"
            fill={variant === 'white' ? '#FFFFFF' : darkColor}
          />
          <path
            d="M 108 142 H 132 V 146 H 108 Z"
            fill={variant === 'white' ? '#FFFFFF' : darkColor}
          />

          {/* Right Vertical Pillar of N */}
          <path
            d="M 160 30 H 176 V 146 H 160 Z"
            fill={variant === 'white' ? '#FFFFFF' : darkColor}
          />
          {/* Top & Bottom serifs on right pillar */}
          <path
            d="M 156 30 H 180 V 34 H 156 Z"
            fill={variant === 'white' ? '#FFFFFF' : darkColor}
          />
          <path
            d="M 156 142 H 180 V 146 H 156 Z"
            fill={variant === 'white' ? '#FFFFFF' : darkColor}
          />

          {/* Main Diagonal Stroke of N - Upper & Lower Forest Parts */}
          <path
            d="M 124 30 L 142 66 L 132 82 L 118 42 Z"
            fill={variant === 'white' ? '#FFFFFF' : darkColor}
          />
          <path
            d="M 154 112 L 168 146 L 152 146 L 142 126 Z"
            fill={variant === 'white' ? '#FFFFFF' : darkColor}
          />

          {/* Sliced Gold Gradient Diagonal in center of N */}
          <path
            d="M 128 32 L 168 144 L 158 144 L 118 32 Z"
            fill={`url(#${idPrefix}-n-gold)`}
          />
          {/* Sharp sheen highlights on diagonal */}
          <line
            x1="126"
            y1="34"
            x2="166"
            y2="142"
            stroke="#FFF8E0"
            strokeWidth="1.5"
            strokeOpacity="0.8"
          />
        </g>
      </g>
    </svg>
  )
}

