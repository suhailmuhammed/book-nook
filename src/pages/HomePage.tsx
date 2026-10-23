import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  BookMarked, BookOpen, Users, Bookmark, Star, ArrowRight,
  Sparkles, CheckCircle2, ShieldCheck, HeartHandshake, Compass,
  ChevronRight, Search, LogIn, Check, Info, Library
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { BookCover } from '@/components/ui/book-cover'
import { BookDetailDialog } from '@/components/books/BookDetailDialog'
import { useBooks } from '@/hooks/use-books'
import { useEmployees } from '@/hooks/use-employees'
import { usePublicLibraryStats } from '@/hooks/use-public-stats'
import { useAuth } from '@/contexts/AuthContext'
import type { Book, Employee } from '@/lib/database.types'

export default function HomePage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { data: stats, isLoading: statsLoading } = usePublicLibraryStats()
  const { data: booksData, isLoading: booksLoading } = useBooks({ status: 'Available', pageSize: 40 })
  const { data: empsData, isLoading: empsLoading } = useEmployees({ isActive: true, pageSize: 200 })

  const availableBooks = booksData?.books ?? []
  const employees = empsData?.employees ?? []

  // Visitor selection state (stored in sessionStorage for browsing convenience)
  const [selectedEmpId, setSelectedEmpId] = useState<string>(() => {
    return sessionStorage.getItem('booknook_visitor_emp_id') || ''
  })
  const [visitorName, setVisitorName] = useState<string>(() => {
    return sessionStorage.getItem('booknook_visitor_name') || ''
  })
  const [visitorError, setVisitorError] = useState<string | null>(null)
  const [empSearch, setEmpSearch] = useState('')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Category filter for public available books
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [detailBook, setDetailBook] = useState<Book | null>(null)

  const availableSectionRef = useRef<HTMLElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleSelectEmployee(emp: Employee) {
    setSelectedEmpId(emp.id)
    setVisitorName(emp.full_name)
    setVisitorError(null)
    setDropdownOpen(false)
    sessionStorage.setItem('booknook_visitor_emp_id', emp.id)
    sessionStorage.setItem('booknook_visitor_name', emp.full_name)
  }

  function handleClearVisitor() {
    setSelectedEmpId('')
    setVisitorName('')
    sessionStorage.removeItem('booknook_visitor_emp_id')
    sessionStorage.removeItem('booknook_visitor_name')
  }

  function handleExploreClick() {
    if (!selectedEmpId) {
      setVisitorError('Please select your name from the list to continue.')
      setDropdownOpen(true)
      return
    }
    setVisitorError(null)
    availableSectionRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // Filter categories
  const categories = Array.from(
    new Set(availableBooks.map(b => b.category).filter(Boolean))
  ) as string[]

  const filteredBooks = selectedCategory === 'all'
    ? availableBooks
    : availableBooks.filter(b => b.category === selectedCategory)

  const filteredEmployees = employees.filter(e =>
    e.full_name.toLowerCase().includes(empSearch.toLowerCase()) ||
    (e.department && e.department.toLowerCase().includes(empSearch.toLowerCase()))
  )

  return (
    <div className="min-h-screen bg-warmwhite text-foreground flex flex-col font-sans">
      {/* ─── Header ─────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-forest-dark/95 backdrop-blur-md text-white border-b border-white/10 shadow-sm transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between">
          {/* Logo & Title */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gold/15 border border-gold/30 flex items-center justify-center text-gold group-hover:scale-105 transition-transform">
              <BookMarked className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-serif font-bold text-xl sm:text-2xl tracking-tight text-white">
                  Book Nook
                </span>
                <span className="hidden sm:inline-block w-1.5 h-1.5 rounded-full bg-gold" />
              </div>
              <p className="text-[10px] sm:text-[11px] font-semibold tracking-widest text-gold uppercase">
                YOUR OFFICE LIBRARY
              </p>
            </div>
          </Link>

          {/* Right actions */}
          <div className="flex items-center gap-3">
            {visitorName && (
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 text-xs text-white/90 border border-white/15">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Visiting as <strong className="font-semibold text-white">{visitorName}</strong></span>
                <button
                  onClick={handleClearVisitor}
                  className="text-white/60 hover:text-white underline text-[11px] ml-1"
                >
                  Change
                </button>
              </div>
            )}

            {user ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/dashboard')}
                className="bg-gold text-forest-dark border-gold hover:bg-gold-light hover:text-forest-dark font-medium rounded-lg text-xs sm:text-sm h-9 shadow-xs"
              >
                <ShieldCheck className="h-4 w-4 mr-1.5" />
                Admin Dashboard
              </Button>
            ) : (
              <Link
                to="/login"
                id="admin-login-link"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-lg text-white/90 hover:text-white hover:bg-white/10 transition-colors border border-white/20"
              >
                <LogIn className="h-3.5 w-3.5" />
                <span>Admin Login</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* ─── Hero Section ───────────────────────────────────── */}
      <section className="relative min-h-[580px] sm:min-h-[640px] flex items-center overflow-hidden">
        {/* Background photo: Real library hero photo showing actual books and shelves */}
        <div
          className="absolute inset-0 bg-cover bg-center sm:bg-[center_center] scale-100 transition-transform duration-1000"
          style={{ backgroundImage: `url('/photos/hero_bookshelf_wide.jpg')` }}
          role="img"
          aria-label="Book Nook illuminated office library shelves with books"
        />

        {/* Responsive dark forest green gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-forest-dark via-forest-dark/90 to-forest-dark/75 lg:to-forest/60" />
        <div className="absolute inset-0 bg-gradient-to-t from-forest-dark via-transparent to-black/30" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-20 w-full">
          <div className="max-w-2xl space-y-6 animate-fade-in">
            {/* Eyebrow */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold/15 border border-gold/30 text-gold-light text-xs font-semibold tracking-wider uppercase">
              <Sparkles className="h-3.5 w-3.5 text-gold" />
              <span>A LITTLE SPACE FOR BIG IDEAS</span>
            </div>

            {/* Heading */}
            <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl font-bold text-white tracking-tight leading-[1.12]">
              Welcome to <br />
              <span className="text-gold-light italic">Book Nook.</span>
            </h1>

            {/* Description */}
            <p className="text-white/85 text-base sm:text-lg md:text-xl font-normal leading-relaxed max-w-xl">
              Discover new perspectives, explore our office collection, and let a good book spark your next idea.
            </p>

            {/* Visitor Selection Card */}
            <div className="mt-8 pt-4">
              <div className="bg-white/95 dark:bg-card/95 backdrop-blur-md rounded-2xl p-5 sm:p-6 shadow-xl border border-white/20 text-foreground max-w-lg">
                <div className="flex items-center gap-2 mb-2 text-forest-dark">
                  <Compass className="h-4 w-4 text-gold" />
                  <label htmlFor="visitor-select-trigger" className="text-sm font-semibold tracking-tight">
                    Who is visiting the library?
                  </label>
                </div>
                <p className="text-xs text-muted-foreground mb-4">
                  Select your name to personalize your browsing experience today.
                </p>

                {/* Dropdown Container */}
                <div className="space-y-3" ref={dropdownRef}>
                  <div className="relative">
                    <button
                      id="visitor-select-trigger"
                      type="button"
                      onClick={() => setDropdownOpen(v => !v)}
                      aria-expanded={dropdownOpen}
                      className="w-full h-11 px-3.5 rounded-lg border bg-background text-left flex items-center justify-between hover:border-forest/50 focus:outline-none focus:ring-2 focus:ring-forest text-sm transition-all"
                    >
                      <span className={visitorName ? 'font-medium text-foreground' : 'text-muted-foreground'}>
                        {visitorName ? `👋 ${visitorName}` : 'Select your name…'}
                      </span>
                      <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${dropdownOpen ? 'rotate-90' : ''}`} />
                    </button>

                    {/* Searchable Dropdown Menu */}
                    {dropdownOpen && (
                      <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-popover border rounded-xl shadow-xl p-2 max-h-60 overflow-hidden flex flex-col animate-fade-in">
                        <div className="relative mb-2">
                          <Search className="h-3.5 w-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            placeholder="Search employee or team…"
                            value={empSearch}
                            onChange={e => setEmpSearch(e.target.value)}
                            className="w-full pl-8 pr-2 py-1.5 text-xs rounded-md border bg-muted/30 focus:outline-none focus:ring-1 focus:ring-forest"
                            autoFocus
                          />
                        </div>

                        <div className="overflow-y-auto flex-1 space-y-0.5 divide-y divide-border/30">
                          {empsLoading ? (
                            <p className="text-xs text-muted-foreground p-3 text-center">Loading team members…</p>
                          ) : filteredEmployees.length === 0 ? (
                            <p className="text-xs text-muted-foreground p-3 text-center">No matching team member found.</p>
                          ) : (
                            filteredEmployees.map(emp => {
                              const isSelected = emp.id === selectedEmpId
                              return (
                                <button
                                  key={emp.id}
                                  type="button"
                                  onClick={() => handleSelectEmployee(emp)}
                                  className={`w-full text-left px-3 py-2 rounded-md text-xs flex items-center justify-between transition-colors ${
                                    isSelected ? 'bg-forest/10 font-semibold text-forest' : 'hover:bg-muted text-foreground'
                                  }`}
                                >
                                  <div>
                                    <p className="font-medium">{emp.full_name}</p>
                                    <p className="text-[11px] text-muted-foreground">{emp.department || 'General'}</p>
                                  </div>
                                  {isSelected && <Check className="h-4 w-4 text-forest" />}
                                </button>
                              )
                            })
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {visitorError && (
                    <p className="text-xs text-rose-600 font-medium flex items-center gap-1.5">
                      <Info className="h-3.5 w-3.5 flex-shrink-0" />
                      {visitorError}
                    </p>
                  )}

                  <Button
                    id="explore-library-btn"
                    onClick={handleExploreClick}
                    className="w-full bg-forest hover:bg-forest-dark text-white font-medium h-11 rounded-lg shadow-sm transition-all group"
                  >
                    <span>Explore the Library</span>
                    <ArrowRight className="h-4 w-4 ml-1.5 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </div>

                <p className="text-[11px] text-muted-foreground/80 mt-3 text-center">
                  Selecting your name is for browsing convenience only and does not grant admin access.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Library Statistics Strip ───────────────────────── */}
      <section className="bg-sage/70 border-y border-sage-dark/30 py-6 sm:py-8 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            {/* Stat 1: Books Available */}
            <div className="bg-white/80 rounded-xl p-4 sm:p-5 border border-sage-dark/30 flex items-center gap-3 sm:gap-4 shadow-2xs">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-forest/10 text-forest flex items-center justify-center flex-shrink-0">
                <BookOpen className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <div>
                <p className="text-2xl sm:text-3xl font-bold font-serif text-forest-dark leading-none">
                  {statsLoading ? '…' : stats?.availableBooks ?? 0}
                </p>
                <p className="text-xs sm:text-sm font-medium text-muted-foreground mt-1">
                  Books Available
                </p>
              </div>
            </div>

            {/* Stat 2: Team Members */}
            <div className="bg-white/80 rounded-xl p-4 sm:p-5 border border-sage-dark/30 flex items-center gap-3 sm:gap-4 shadow-2xs">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gold/15 text-gold-dark flex items-center justify-center flex-shrink-0">
                <Users className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <div>
                <p className="text-2xl sm:text-3xl font-bold font-serif text-forest-dark leading-none">
                  {statsLoading ? '…' : stats?.teamMembers ?? 0}
                </p>
                <p className="text-xs sm:text-sm font-medium text-muted-foreground mt-1">
                  Team Members
                </p>
              </div>
            </div>

            {/* Stat 3: Categories */}
            <div className="bg-white/80 rounded-xl p-4 sm:p-5 border border-sage-dark/30 flex items-center gap-3 sm:gap-4 shadow-2xs">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-forest/10 text-forest flex items-center justify-center flex-shrink-0">
                <Bookmark className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <div>
                <p className="text-2xl sm:text-3xl font-bold font-serif text-forest-dark leading-none">
                  {statsLoading ? '…' : stats?.categoriesCount ?? 0}
                </p>
                <p className="text-xs sm:text-sm font-medium text-muted-foreground mt-1">
                  Categories
                </p>
              </div>
            </div>

            {/* Stat 4: Average Rating */}
            <div className="bg-white/80 rounded-xl p-4 sm:p-5 border border-sage-dark/30 flex items-center gap-3 sm:gap-4 shadow-2xs">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center flex-shrink-0">
                <Star className="h-5 w-5 sm:h-6 sm:w-6 fill-amber-500 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl sm:text-3xl font-bold font-serif text-forest-dark leading-none flex items-baseline gap-1">
                  {statsLoading ? '…' : `${stats?.averageRating ?? 4.8}`}
                  <span className="text-xs font-normal text-muted-foreground">/ 5.0</span>
                </p>
                <p className="text-xs sm:text-sm font-medium text-muted-foreground mt-1">
                  Average Rating
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Available Books Section ────────────────────────── */}
      <section ref={availableSectionRef} id="available-books" className="py-14 sm:py-20 max-w-7xl mx-auto px-4 sm:px-6 w-full">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold tracking-widest text-gold uppercase mb-1.5">
              <span>AVAILABLE NOW</span>
            </div>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-forest-dark">
              Books Ready for You
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground mt-1 max-w-xl">
              A selection of books currently available in our office library.
            </p>
          </div>

          <Link
            to={user ? "/books" : "/login"}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-forest hover:text-forest-dark hover:underline transition-colors self-start md:self-auto"
          >
            <span>{user ? 'View Full Catalog' : 'Librarian Catalog'}</span>
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Category Filter Pills */}
        {categories.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-6 scrollbar-none">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                selectedCategory === 'all'
                  ? 'bg-forest text-white shadow-2xs'
                  : 'bg-white hover:bg-sage text-foreground border border-border'
              }`}
            >
              All Available ({availableBooks.length})
            </button>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === cat
                    ? 'bg-forest text-white shadow-2xs'
                    : 'bg-white hover:bg-sage text-foreground border border-border'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {/* Books Grid */}
        {booksLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="animate-pulse bg-white rounded-xl p-3 border border-border/60 space-y-3">
                <div className="aspect-[2/3] bg-muted/60 rounded-md" />
                <div className="h-4 bg-muted/60 rounded w-3/4" />
                <div className="h-3 bg-muted/60 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : filteredBooks.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-border p-8">
            <BookOpen className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-60" />
            <h3 className="font-serif text-lg font-semibold text-foreground">No books available in this category</h3>
            <p className="text-xs text-muted-foreground mt-1">Check back soon or explore other categories.</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedCategory('all')}
              className="mt-4 text-xs"
            >
              Show all available books
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
            {filteredBooks.map(book => (
              <div
                key={book.id}
                onClick={() => setDetailBook(book)}
                className="group bg-white rounded-xl p-3 sm:p-3.5 border border-border/80 hover:border-forest/40 hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between"
              >
                <div>
                  {/* Book Cover with consistent 2:3 aspect ratio */}
                  <div className="relative mb-3 overflow-hidden rounded-md group-hover:scale-[1.02] transition-transform">
                    <BookCover
                      src={book.cover_image_url}
                      title={book.title}
                      size="lg"
                      className="w-full aspect-[2/3] shadow-xs"
                    />
                    {book.shelf_number && (
                      <span className="absolute bottom-1.5 right-1.5 bg-black/75 text-white text-[10px] px-1.5 py-0.5 rounded font-mono">
                        Shelf {book.shelf_number}
                      </span>
                    )}
                  </div>

                  {/* Title and Author */}
                  <h3 className="font-serif font-bold text-sm leading-snug line-clamp-2 text-foreground group-hover:text-forest transition-colors">
                    {book.title}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {book.author || 'Unknown Author'}
                  </p>
                </div>

                {/* Badges / Status */}
                <div className="mt-3 pt-2.5 border-t border-border/50 flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground truncate max-w-[80px]">
                    {book.category || 'General'}
                  </span>
                  <span className="inline-flex items-center gap-1 font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full text-[10px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Available
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ─── Inspirational Section ──────────────────────────── */}
      <section className="relative bg-forest-dark text-white py-16 sm:py-24 overflow-hidden">
        {/* Real photo background texture with soft overlay */}
        <div
          className="absolute inset-0 bg-cover bg-center opacity-15 mix-blend-overlay"
          style={{ backgroundImage: `url('/photos/ede574eb-0d4d-4aee-b3be-f017a5db9717.jpg')` }}
          role="img"
          aria-label="Books on library shelf"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-forest-dark via-forest-dark/95 to-forest-dark" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6">
          {/* Featured Quote */}
          <div className="max-w-3xl mx-auto text-center mb-16 space-y-4">
            <span className="inline-block text-gold text-2xl font-serif">“</span>
            <blockquote className="font-serif italic text-2xl sm:text-3xl md:text-4xl text-white font-medium tracking-tight leading-snug">
              A good book can change your day.
            </blockquote>
            <p className="text-xs sm:text-sm font-semibold tracking-widest text-gold uppercase pt-1">
              THE BOOK NOOK PHILOSOPHY
            </p>
          </div>

          {/* Three Pillars: GROW · SHARE · BELONG */}
          <div className="grid md:grid-cols-3 gap-6 sm:gap-8 max-w-5xl mx-auto">
            {/* GROW */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 sm:p-8 backdrop-blur-sm hover:bg-white/10 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-gold/15 text-gold flex items-center justify-center mb-4">
                <Sparkles className="h-6 w-6" />
              </div>
              <h3 className="font-serif text-xl font-bold tracking-tight text-white mb-2">
                GROW
              </h3>
              <p className="text-sm text-white/80 leading-relaxed">
                New knowledge, new opportunities. Broaden your skills with carefully curated business, technology, and leadership classics.
              </p>
            </div>

            {/* SHARE */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 sm:p-8 backdrop-blur-sm hover:bg-white/10 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-gold/15 text-gold flex items-center justify-center mb-4">
                <HeartHandshake className="h-6 w-6" />
              </div>
              <h3 className="font-serif text-xl font-bold tracking-tight text-white mb-2">
                SHARE
              </h3>
              <p className="text-sm text-white/80 leading-relaxed">
                Ideas that inspire conversations. Pass on recommendations, write honest reviews, and spark creative discussions with teammates.
              </p>
            </div>

            {/* BELONG */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 sm:p-8 backdrop-blur-sm hover:bg-white/10 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-gold/15 text-gold flex items-center justify-center mb-4">
                <Users className="h-6 w-6" />
              </div>
              <h3 className="font-serif text-xl font-bold tracking-tight text-white mb-2">
                BELONG
              </h3>
              <p className="text-sm text-white/80 leading-relaxed">
                A library built by and for our team. Every employee can borrow freely, suggest new titles, and cultivate a shared culture of reading.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Office Library Shelving Feature (Photo 3) ─────── */}
      <section className="py-16 sm:py-20 bg-warmwhite max-w-7xl mx-auto px-4 sm:px-6 w-full">
        <div className="bg-white rounded-3xl border border-border/80 overflow-hidden shadow-sm grid lg:grid-cols-12 gap-0">
          {/* Photo side: Office library books photograph */}
          <div className="lg:col-span-6 relative min-h-[320px] sm:min-h-[420px] bg-muted">
            <img
              src="/photos/a7d5caf4-7d68-4583-acc9-e4215c4dc9c6.jpg"
              alt="Actual Book Nook office library shelves and physical books"
              loading="lazy"
              className="w-full h-full object-cover object-center"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent lg:hidden" />
            <span className="absolute bottom-4 left-4 bg-black/70 text-white text-xs px-3 py-1.5 rounded-full font-medium backdrop-blur-xs">
              📸 Actual Office Library
            </span>
          </div>

          {/* Text side: How borrowing works */}
          <div className="lg:col-span-6 p-6 sm:p-10 lg:p-12 flex flex-col justify-center space-y-6">
            <div>
              <span className="text-xs font-bold tracking-widest text-gold uppercase">
                SIMPLE & EFFORTLESS
              </span>
              <h3 className="font-serif text-2xl sm:text-3xl font-bold text-forest-dark mt-1">
                How Our Office Library Works
              </h3>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                Borrowing is simple for everyone in the company. Find what you love, check it out, and enjoy reading at your own pace.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-forest/10 text-forest font-bold text-sm flex items-center justify-center flex-shrink-0">
                  1
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-foreground">Explore & Choose</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Browse the shelves in the office or scroll through the live catalog online.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-forest/10 text-forest font-bold text-sm flex items-center justify-center flex-shrink-0">
                  2
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-foreground">Easy Check-Out</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Let the office librarian know. Your loan is recorded with a standard 14-day return window.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-forest/10 text-forest font-bold text-sm flex items-center justify-center flex-shrink-0">
                  3
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-foreground">Read, Return & Share</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Return the book to its shelf when done and write a short review to guide fellow colleagues!
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <Button
                variant="outline"
                onClick={() => availableSectionRef.current?.scrollIntoView({ behavior: 'smooth' })}
                className="border-forest text-forest hover:bg-forest hover:text-white transition-colors"
              >
                <BookOpen className="h-4 w-4 mr-2" />
                Browse Available Titles
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Footer ─────────────────────────────────────────── */}
      <footer className="mt-auto bg-forest-dark text-white border-t border-white/10 pt-12 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10 pb-8 border-b border-white/10">
            {/* Branding */}
            <div className="space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-gold/15 border border-gold/30 flex items-center justify-center text-gold">
                  <BookMarked className="h-4 w-4" />
                </div>
                <div>
                  <span className="font-serif font-bold text-lg text-white">Book Nook</span>
                  <p className="text-[10px] font-semibold tracking-wider text-gold uppercase">
                    YOUR OFFICE LIBRARY
                  </p>
                </div>
              </div>
              <p className="text-xs text-white/70 leading-relaxed max-w-sm">
                Curated physical books for continuous learning, creativity, and connection across our company.
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="text-xs font-semibold tracking-wider uppercase text-gold mb-3">
                Navigation
              </h4>
              <ul className="space-y-2 text-xs text-white/80">
                <li>
                  <button
                    onClick={() => availableSectionRef.current?.scrollIntoView({ behavior: 'smooth' })}
                    className="hover:text-white transition-colors"
                  >
                    Available Books
                  </button>
                </li>
                <li>
                  <Link to={user ? "/books" : "/login"} className="hover:text-white transition-colors">
                    {user ? 'Admin Book Catalog' : 'Librarian Catalog'}
                  </Link>
                </li>
                {user && (
                  <li>
                    <Link to="/borrowing" className="hover:text-white transition-colors">
                      Borrowing Management
                    </Link>
                  </li>
                )}
              </ul>
            </div>

            {/* Administration */}
            <div>
              <h4 className="text-xs font-semibold tracking-wider uppercase text-gold mb-3">
                Administration
              </h4>
              <p className="text-xs text-white/70 leading-relaxed mb-3">
                Authorized librarians can issue loans, register returns, and manage catalog records.
              </p>
              <Link
                to={user ? "/dashboard" : "/login"}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-gold hover:text-gold-light hover:underline"
              >
                <LogIn className="h-3.5 w-3.5" />
                <span>{user ? 'Open Admin Dashboard →' : 'Administrator Sign In →'}</span>
              </Link>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white/60">
            <p>© {new Date().getFullYear()} Book Nook. All rights reserved.</p>
            <p className="text-[11px] text-white/50">
              Designed for office library management · Powered by real database & Google Books
            </p>
          </div>
        </div>
      </footer>

      {/* Book Detail Dialog (view-only for visitors) */}
      {detailBook && (
        <BookDetailDialog
          open={!!detailBook}
          onOpenChange={open => !open && setDetailBook(null)}
          book={detailBook}
        />
      )}
    </div>
  )
}
