import React, { useState, useEffect, useRef } from 'react'
import { BnMonogram } from '../brand/BnMonogram'
import { ArrowRight, BookOpen } from 'lucide-react'
import './book-intro.css'

interface BookOpeningIntroProps {
  onComplete: () => void
  forceShow?: boolean
}

type IntroScene = 'welcome' | 'book-appear' | 'book-opening' | 'dissolve'

export function BookOpeningIntro({ onComplete, forceShow = false }: BookOpeningIntroProps) {
  const [scene, setScene] = useState<IntroScene>('welcome')
  const [isCoverOpen, setIsCoverOpen] = useState(false)
  const [isRadianceActive, setIsRadianceActive] = useState(false)
  const [dontShowAgain, setDontShowAgain] = useState(false)
  const [visible, setVisible] = useState(true)

  const timersRef = useRef<NodeJS.Timeout[]>([])

  function clearAllTimers() {
    timersRef.current.forEach(t => clearTimeout(t))
    timersRef.current = []
  }

  // Handle immediate skip / Enter Library
  function handleSkip() {
    clearAllTimers()
    if (dontShowAgain) {
      localStorage.setItem('booknook_intro_disabled', 'true')
    }
    sessionStorage.setItem('booknook_intro_viewed', 'true')
    setScene('dissolve')
    setTimeout(() => {
      setVisible(false)
      onComplete()
    }, 400)
  }

  useEffect(() => {
    const isExplicitlyDisabled = localStorage.getItem('booknook_intro_disabled') === 'true'
    const alreadyViewed = sessionStorage.getItem('booknook_intro_viewed') === 'true'
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (!forceShow && (isExplicitlyDisabled || alreadyViewed)) {
      setVisible(false)
      onComplete()
      return
    }

    if (prefersReducedMotion) {
      const t = setTimeout(() => {
        handleSkip()
      }, 1200)
      timersRef.current.push(t)
      return () => clearAllTimers()
    }

    // ─── Sequence Choreography ───
    // Step 1: Welcome Screen (0s -> 2.4s)

    // Step 2: Closed Book Appears in center (at 2.4s)
    const t1 = setTimeout(() => {
      setScene('book-appear')
    }, 2400)
    timersRef.current.push(t1)

    // Step 3: Front cover begins rotating around spine (at 4.2s)
    const t2 = setTimeout(() => {
      setScene('book-opening')
      setIsCoverOpen(true)
      setIsRadianceActive(true)
    }, 4200)
    timersRef.current.push(t2)

    // Steps 4-6: Front cover rotates through 180 degrees, reaches completely flat position by 6.4s
    // Step 7: Hold the fully open book flat (6.4s -> 8.2s)

    // Step 8: Smoothly transition into the actual Book Nook homepage (at 8.2s)
    const t3 = setTimeout(() => {
      setScene('dissolve')
      sessionStorage.setItem('booknook_intro_viewed', 'true')
    }, 8200)
    timersRef.current.push(t3)

    // Unmount Intro overlay (at 9.0s)
    const t4 = setTimeout(() => {
      setVisible(false)
      onComplete()
    }, 9000)
    timersRef.current.push(t4)

    return () => clearAllTimers()
  }, [forceShow])

  if (!visible) return null

  const isDissolving = scene === 'dissolve'

  return (
    <div
      className={`fixed inset-0 z-50 overflow-hidden bg-[#FAF6EE] text-[#132E22] select-none transition-opacity duration-700 ease-out ${
        isDissolving ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      aria-label="Book Nook Introduction"
    >
      {/* ─── Top Control Bar (Skip Intro / Enter Library) ── */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-50 flex items-center gap-3">
        <label className="hidden sm:flex items-center gap-1.5 text-[11px] text-[#6E5D3F] cursor-pointer">
          <input
            type="checkbox"
            checked={dontShowAgain}
            onChange={e => setDontShowAgain(e.target.checked)}
            className="rounded border-[#C5A059] text-forest focus:ring-forest h-3 w-3"
          />
          <span>Don't show on return</span>
        </label>
        <button
          onClick={handleSkip}
          id="skip-intro-btn"
          className="group flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/90 hover:bg-white text-xs font-serif font-medium text-[#132E22] border border-[#D4AF37]/50 shadow-xs hover:border-[#D4AF37] transition-all cursor-pointer"
        >
          <span>Enter Library</span>
          <ArrowRight className="h-3 w-3 text-[#B38728] group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>

      {/* ─── Vintage Screen Border Frame ─────────────────── */}
      <div className="absolute inset-3 sm:inset-6 pointer-events-none border border-[#D4AF37]/50 rounded-2xl sm:rounded-3xl">
        <div className="absolute inset-1 sm:inset-1.5 border border-[#132E22]/15 rounded-xl sm:rounded-2xl" />
        <div className="absolute top-2 left-2 w-2 h-2 border-t-2 border-l-2 border-[#D4AF37]" />
        <div className="absolute top-2 right-2 w-2 h-2 border-t-2 border-r-2 border-[#D4AF37]" />
        <div className="absolute bottom-2 left-2 w-2 h-2 border-b-2 border-l-2 border-[#D4AF37]" />
        <div className="absolute bottom-2 right-2 w-2 h-2 border-b-2 border-r-2 border-[#D4AF37]" />
      </div>

      {/* ─── Main Stage ──────────────────────────────────── */}
      <div className="relative w-full h-full flex flex-col items-center justify-center p-3 sm:p-6">

        {/* ─── SCENE 1: Welcome Screen (Fades out when book appears) ─── */}
        <div
          className={`absolute flex flex-col items-center text-center max-w-xl px-4 transition-all duration-900 ease-out ${
            scene === 'welcome'
              ? 'opacity-100 scale-100 translate-y-0'
              : 'opacity-0 scale-95 -translate-y-8 pointer-events-none'
          }`}
        >
          {/* Monogram with reveal animation */}
          <div className="animate-fade-in duration-700">
            <BnMonogram size="xl" variant="dual" className="drop-shadow-sm mb-4" />
          </div>

          {/* Wordmark */}
          <h1 className="font-serif font-bold text-3xl sm:text-4xl md:text-5xl tracking-tight leading-tight mt-1 text-[#132E22]">
            The{' '}
            <span className="bg-gradient-to-r from-[#B8860B] via-[#D4AF37] to-[#AA771C] bg-clip-text text-transparent font-extrabold">
              Book
            </span>{' '}
            Nook
          </h1>

          {/* Gold divider with open book */}
          <div className="flex items-center justify-center gap-3 w-48 sm:w-64 my-3 opacity-90">
            <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-[#D4AF37] to-[#D4AF37]" />
            <BookOpen className="h-4 w-4 text-[#C5A059]" />
            <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent via-[#D4AF37] to-[#D4AF37]" />
          </div>

          {/* Subtitle */}
          <p className="text-xs sm:text-sm font-sans font-semibold tracking-[0.28em] text-[#8C6D2C] uppercase">
            Office Community Library
          </p>

          {/* Welcome Message */}
          <p className="font-serif italic text-sm sm:text-base text-[#463D2E] mt-4 leading-relaxed max-w-md">
            &ldquo;A little space for stories, ideas and shared reading.&rdquo;
          </p>

          <p className="text-[11px] text-[#8C6D2C] tracking-wide mt-2">
            Let&rsquo;s work together to keep it organized
          </p>
        </div>

        {/* ─── SCENES 2 & 3: 3D Physical Book Experience ─── */}
        <div
          className={`book-perspective-container transition-all duration-1000 ease-out flex items-center justify-center ${
            scene === 'welcome'
              ? 'opacity-0 scale-75 translate-y-8 pointer-events-none'
              : scene === 'book-appear'
              ? 'opacity-100 scale-100 translate-y-0'
              : scene === 'book-opening'
              ? 'opacity-100 scale-100 sm:scale-105 translate-y-0'
              : 'opacity-0 scale-120'
          }`}
        >
          {/*
            The Two-Page Spread Assembly:
            When closed: translated by -25% so the closed right-half front cover is dead-center.
            When open: translated to 0% with rotateY(0deg) so the center spine is strictly vertical and centered!
          */}
          <div
            className="book-spread-assembly w-[340px] sm:w-[520px] md:w-[680px] h-[255px] sm:h-[370px] md:h-[460px]"
            style={{
              transform: isCoverOpen
                ? 'translateX(0%) rotateX(13deg) rotateY(0deg) rotateZ(0deg)'
                : 'translateX(-25%) rotateX(13deg) rotateY(0deg) rotateZ(0deg)',
            }}
          >
            {/* ─── Left Half: Left Page & Hardcover Base ───── */}
            <div
              className="book-left-half"
              style={{
                opacity: isCoverOpen ? 1 : 0,
                pointerEvents: isCoverOpen ? 'auto' : 'none',
              }}
            >
              {/* Hardcover base under left page */}
              <div className="hardcover-base-left" />

              {/* Stacked 3D Paper Edges on Left and Bottom */}
              <div className="page-edge-left" />
              <div className="page-edge-bottom-left" />

              {/* Left Page (Chapter 1 & Reading Principles) */}
              <div className="book-page-surface rounded-l-lg p-3 sm:p-6 md:p-8 flex flex-col justify-between">
                {/* Header */}
                <div className="border-b border-[#E2D8C0] pb-1.5 sm:pb-2 text-center">
                  <span className="text-[8px] sm:text-[10px] font-sans font-semibold tracking-[0.24em] text-[#9A7D3C] uppercase block">
                    The Book Nook · Chapter I
                  </span>
                  <h3 className="font-serif font-bold text-xs sm:text-base md:text-lg text-[#102B22] mt-0.5">
                    A Shared Space for Stories
                  </h3>
                </div>

                {/* Body Content */}
                <div className="space-y-1.5 sm:space-y-3 my-auto text-left px-1">
                  <p className="font-serif italic text-[9px] sm:text-xs md:text-sm text-[#463D2E] leading-relaxed">
                    &ldquo;A quiet sanctuary in our workspace where curiosity meets community. Every volume connects colleagues through ideas.&rdquo;
                  </p>

                  <div className="space-y-1 sm:space-y-2 pt-1 border-t border-[#D4AF37]/30 text-[8px] sm:text-[11px] text-[#2C3E35]">
                    <div className="flex items-start gap-1.5">
                      <span className="text-[#C5A059] font-bold text-[9px] sm:text-xs">◈</span>
                      <span>Browse curated volumes in fiction, tech, leadership & design</span>
                    </div>
                    <div className="flex items-start gap-1.5">
                      <span className="text-[#C5A059] font-bold text-[9px] sm:text-xs">◈</span>
                      <span>Reserve books seamlessly via the Reader Portal</span>
                    </div>
                    <div className="flex items-start gap-1.5">
                      <span className="text-[#C5A059] font-bold text-[9px] sm:text-xs">◈</span>
                      <span>Return on time so fellow readers can share the journey</span>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between text-[8px] sm:text-[10px] font-mono text-[#9A7D3C] border-t border-[#E8DFC8] pt-1.5 sm:pt-2">
                  <span>OFFICE ARCHIVE</span>
                  <span>PAGE 1</span>
                </div>

                {/* Inner gutter shadow */}
                <div className="page-gutter-shadow-left" />
              </div>
            </div>

            {/* ─── Center Spine Gutter & Gold Ribbon ───────── */}
            <div className="book-spine-gutter" />
            <div className="book-spine-ribbon" />

            {/* ─── Right Half: Right Page & Hardcover Base ──── */}
            <div className="book-right-half">
              {/* Hardcover base under right page */}
              <div className="hardcover-base-right" />

              {/* Stacked 3D Paper Edges on Right and Bottom */}
              <div className="page-edge-right" />
              <div className="page-edge-bottom-right" />

              {/* Right Page (Ex Libris Seal & Monogram) */}
              <div className="book-page-surface rounded-r-lg p-3 sm:p-6 md:p-8 flex flex-col justify-between">
                {/* Header */}
                <div className="border-b border-[#E2D8C0] pb-1.5 sm:pb-2 text-center">
                  <span className="text-[8px] sm:text-[10px] font-sans font-semibold tracking-[0.24em] text-[#9A7D3C] uppercase block">
                    Ex Libris · Official Edition
                  </span>
                  <h3 className="font-serif font-bold text-xs sm:text-base md:text-lg text-[#102B22] mt-0.5">
                    Office Community Library
                  </h3>
                </div>

                {/* Decorative Ex Libris Seal */}
                <div className="my-auto p-2 sm:p-4 rounded-xl border border-[#D4AF37]/50 bg-[#FFFDF7] text-center space-y-1 sm:space-y-2 shadow-2xs">
                  <BnMonogram size="md" variant="dual" className="mx-auto" />
                  <p className="font-serif font-bold text-[10px] sm:text-sm text-[#102B22]">
                    The Book Nook
                  </p>
                  <p className="font-serif italic text-[8px] sm:text-xs text-[#524633] leading-snug">
                    A shared space where everyone can contribute, borrow, enjoy books and accessible for all.
                  </p>
                  <div className="pt-1 border-t border-[#D4AF37]/30 text-[7px] sm:text-[9px] font-mono text-[#8C6D2C] tracking-wider uppercase">
                    Let&rsquo;s work together to keep it organized
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between text-[8px] sm:text-[10px] font-mono text-[#9A7D3C] border-t border-[#E8DFC8] pt-1.5 sm:pt-2">
                  <span>READER PORTAL ACTIVE</span>
                  <span>PAGE 2</span>
                </div>

                {/* Inner gutter shadow */}
                <div className="page-gutter-shadow-right" />
              </div>
            </div>

            {/* ─── Soft Golden Radiance Beam (Spreads from spine) ── */}
            <div className={`book-golden-radiance ${isRadianceActive ? 'active' : ''}`} />

            {/* ─── The Rotating Front Cover ─────────────────── */}
            {/*
              Hinge is anchored at center spine (left: 50%).
              When closed (0deg): covers the right half.
              When opening: rotates 180 degrees around spine to lie completely flat on the left side!
            */}
            <div className={`book-cover-hinge ${isCoverOpen ? 'open' : ''}`}>
              {/* Outer Front Cover Face (Closed Book Appearance) */}
              <div className="cover-front-face p-3 sm:p-6 md:p-8 flex flex-col justify-between items-center text-center">
                {/* Gold Foil Border Frame on Cover */}
                <div className="absolute inset-2 sm:inset-3 border-2 border-[#D4AF37]/80 rounded-md pointer-events-none">
                  <div className="absolute inset-0.5 sm:inset-1 border border-[#D4AF37]/40 rounded-sm" />
                  <div className="absolute top-1 left-1 w-2 h-2 border-t border-l border-[#FFF1B0]" />
                  <div className="absolute top-1 right-1 w-2 h-2 border-t border-r border-[#FFF1B0]" />
                  <div className="absolute bottom-1 left-1 w-2 h-2 border-b border-l border-[#FFF1B0]" />
                  <div className="absolute bottom-1 right-1 w-2 h-2 border-b border-r border-[#FFF1B0]" />
                </div>

                {/* Top Cover Header */}
                <div className="pt-1 sm:pt-2">
                  <span className="text-[8px] sm:text-[9px] md:text-[10px] font-sans font-semibold tracking-[0.28em] text-[#D4AF37] uppercase">
                    Official Library Edition
                  </span>
                </div>

                {/* Centerpiece: Gold BN Monogram & Title */}
                <div className="my-auto space-y-1 sm:space-y-2.5 z-10">
                  <BnMonogram size="lg" variant="gold" className="mx-auto drop-shadow-md" />
                  <h2 className="font-serif font-bold text-lg sm:text-2xl md:text-3xl tracking-tight text-white leading-tight">
                    The{' '}
                    <span className="bg-gradient-to-r from-[#F5D77F] via-[#FFF6C8] to-[#D4AF37] bg-clip-text text-transparent font-extrabold">
                      Book
                    </span>{' '}
                    Nook
                  </h2>
                  <div className="w-16 sm:w-20 h-[1.5px] bg-[#D4AF37]/80 mx-auto" />
                </div>

                {/* Bottom Cover Label */}
                <div className="pb-1 sm:pb-2">
                  <p className="text-[8px] sm:text-[9px] md:text-[10px] font-sans font-medium tracking-[0.22em] text-[#D4AF37]/90 uppercase">
                    Shared Community Reading
                  </p>
                </div>

                {/* 3D Spine for the closed book (left edge) */}
                <div
                  className="book-closed-spine"
                  style={{ opacity: isCoverOpen ? 0 : 1 }}
                />
              </div>

              {/* Inside Face of Front Cover: Flips over and rests completely flat as Left Page backing */}
              <div className="cover-inside-face p-3 sm:p-6 md:p-8 flex flex-col justify-between">
                <div className="border border-[#D4AF37]/40 rounded-lg p-2 sm:p-4 h-full flex flex-col justify-between text-center bg-[#FAF6EE]">
                  <span className="text-[8px] sm:text-[9px] font-mono tracking-widest text-[#8C6D2C]">
                    BOOK NOOK EX LIBRIS
                  </span>
                  <div className="space-y-0.5 sm:space-y-1">
                    <p className="font-serif font-bold text-xs sm:text-sm text-[#132E22]">
                      Community Office Library
                    </p>
                    <p className="text-[9px] sm:text-[11px] text-[#6E5D3F]">
                      Read · Borrow · Return · Share
                    </p>
                  </div>
                  <div className="w-10 sm:w-12 h-[1px] bg-[#D4AF37] mx-auto" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ─── Bottom Step Indicator ──────────────────────── */}
        <div className="absolute bottom-4 sm:bottom-7 flex flex-col items-center gap-1.5 text-center">
          <p className="text-[11px] font-serif text-[#6E5D3F] italic">
            {scene === 'welcome'
              ? 'Opening the library archives…'
              : scene === 'book-appear'
              ? 'A little space for stories, ideas and shared reading.'
              : 'Welcome to Book Nook.'}
          </p>
          <div className="flex items-center gap-1.5">
            <span
              className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                scene === 'welcome' ? 'bg-[#D4AF37] scale-125' : 'bg-[#D4AF37]/30'
              }`}
            />
            <span
              className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                scene === 'book-appear' ? 'bg-[#D4AF37] scale-125' : 'bg-[#D4AF37]/30'
              }`}
            />
            <span
              className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                scene === 'book-opening' || scene === 'dissolve' ? 'bg-[#D4AF37] scale-125' : 'bg-[#D4AF37]/30'
              }`}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
