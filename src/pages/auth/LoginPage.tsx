import { useState } from 'react'
import { useNavigate, useLocation, Navigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { BookMarked, Eye, EyeOff, Mail, Lock } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from '@/hooks/use-toast'
import { isMockMode } from '@/lib/supabase'

const loginSchema = z.object({
  email: z.string().min(1, 'Please enter an email or username'),
  password: z.string().min(1, 'Please enter your password'),
})

const resetSchema = z.object({
  email: z.string().min(1, 'Please enter a valid email'),
})

type LoginForm = z.infer<typeof loginSchema>
type ResetForm = z.infer<typeof resetSchema>

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, signIn, sendPasswordReset } = useAuth()
  const [showPassword, setShowPassword] = useState(false)
  const [mode, setMode] = useState<'login' | 'reset'>('login')
  const [resetSent, setResetSent] = useState(false)

  const loginForm = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: 'admin@booknook.local', password: 'password' },
  })

  const resetForm = useForm<ResetForm>({
    resolver: zodResolver(resetSchema),
    defaultValues: { email: '' },
  })

  const rawFrom = (location.state as any)?.from?.pathname
  const redirectTarget = rawFrom && rawFrom !== '/' ? rawFrom : '/dashboard'

  // Redirect immediately if already authenticated (called after all hooks to comply with React rules of hooks)
  if (user) {
    return <Navigate to={redirectTarget} replace />
  }

  async function onLogin(data: LoginForm) {
    try {
      const email = data.email.includes('@') ? data.email.trim() : `${data.email.trim()}@booknook.local`
      await signIn(email, data.password)
      toast({ title: 'Welcome back!', description: 'Logged in successfully.' })
      navigate(redirectTarget, { replace: true })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Invalid credentials'
      toast({ title: 'Sign in failed', description: message, variant: 'destructive' })
    }
  }

  async function onReset(data: ResetForm) {
    try {
      await sendPasswordReset(data.email)
      setResetSent(true)
      toast({ title: 'Reset link sent', description: 'Please check your email.' })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to send reset email'
      toast({ title: 'Reset failed', description: message, variant: 'destructive' })
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel – branding */}
      <div
        className="hidden lg:flex lg:w-[420px] flex-col justify-between p-10 text-white"
        style={{ background: 'linear-gradient(135deg, hsl(228 56% 22%) 0%, hsl(228 56% 14%) 60%, hsl(174 65% 22%) 100%)' }}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
            <BookMarked className="h-6 w-6 text-teal-300" />
          </div>
          <span className="font-serif font-bold text-xl">Book Nook</span>
        </div>

        <div>
          <h2 className="font-serif text-3xl font-bold leading-snug mb-4">
            Your Office<br />Library, Organized.
          </h2>
          <p className="text-white/70 text-sm leading-relaxed">
            Manage your physical book catalog, track borrowings, monitor returns,
            and generate insightful reports — all from one place.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {[
            { label: 'Books Tracked', value: '60–70' },
            { label: 'Loan History', value: '100%' },
            { label: 'Reports', value: '9 Types' },
            { label: 'Uptime', value: '99.9%' },
          ].map(item => (
            <div key={item.label} className="bg-white/10 rounded-lg p-3">
              <p className="text-white font-bold text-lg">{item.value}</p>
              <p className="text-white/60 text-xs">{item.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel – login form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
              <BookMarked className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-serif font-bold text-xl text-foreground">Book Nook</span>
          </div>

          {mode === 'login' ? (
            <>
              <div className="mb-6">
                <h1 className="text-2xl font-bold mb-1">Welcome back</h1>
                <p className="text-muted-foreground text-sm">Sign in to the library management system</p>
              </div>

              {isMockMode && (
                <div className="mb-6 p-3.5 rounded-lg border border-blue-200 bg-blue-50/70 dark:bg-blue-950/30 dark:border-blue-800 text-xs text-blue-900 dark:text-blue-200 space-y-1">
                  <div className="font-semibold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                    Local Demo Mode Active
                  </div>
                  <p className="text-blue-700 dark:text-blue-300">
                    You can sign in with username <code className="bg-blue-100 dark:bg-blue-900/60 px-1 py-0.5 rounded font-mono font-medium">admin</code> or <code className="bg-blue-100 dark:bg-blue-900/60 px-1 py-0.5 rounded font-mono font-medium">admin@booknook.local</code> and password <code className="bg-blue-100 dark:bg-blue-900/60 px-1 py-0.5 rounded font-mono font-medium">password</code>.
                  </p>
                </div>
              )}

              <form
                id="login-form"
                onSubmit={loginForm.handleSubmit(onLogin)}
                className="space-y-4"
              >
                <div className="space-y-1.5">
                  <Label htmlFor="login-email">Email or Username</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="login-email"
                      type="text"
                      placeholder="admin or librarian@youroffice.com"
                      className="pl-9"
                      autoComplete="username"
                      {...loginForm.register('email')}
                    />
                  </div>
                  {loginForm.formState.errors.email && (
                    <p className="text-xs text-destructive">{loginForm.formState.errors.email.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="login-password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      className="pl-9 pr-9"
                      autoComplete="current-password"
                      {...loginForm.register('password')}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      onClick={() => setShowPassword(v => !v)}
                      tabIndex={-1}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {loginForm.formState.errors.password && (
                    <p className="text-xs text-destructive">{loginForm.formState.errors.password.message}</p>
                  )}
                </div>

                <div className="flex items-center justify-end">
                  <button
                    type="button"
                    className="text-xs text-primary hover:underline"
                    onClick={() => setMode('reset')}
                  >
                    Forgot password?
                  </button>
                </div>

                <Button
                  id="login-submit-btn"
                  type="submit"
                  className="w-full"
                  loading={loginForm.formState.isSubmitting}
                >
                  Sign In
                </Button>
              </form>

              <div className="mt-6 pt-4 border-t border-border/60 flex flex-col items-center gap-2">
                <Link to="/" className="text-xs text-forest hover:text-forest-dark font-medium underline">
                  ← Return to Public Library
                </Link>
                <p className="text-center text-xs text-muted-foreground">
                  Don't have an account? Contact your system administrator.
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="mb-8">
                <h1 className="text-2xl font-bold mb-1">Reset Password</h1>
                <p className="text-muted-foreground text-sm">
                  Enter your email and we'll send you a reset link.
                </p>
              </div>

              {resetSent ? (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                  ✓ Reset link sent! Check your email inbox.
                </div>
              ) : (
                <form
                  id="reset-form"
                  onSubmit={resetForm.handleSubmit(onReset)}
                  className="space-y-4"
                >
                  <div className="space-y-1.5">
                    <Label htmlFor="reset-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="reset-email"
                        type="email"
                        placeholder="librarian@youroffice.com"
                        className="pl-9"
                        {...resetForm.register('email')}
                      />
                    </div>
                    {resetForm.formState.errors.email && (
                      <p className="text-xs text-destructive">{resetForm.formState.errors.email.message}</p>
                    )}
                  </div>

                  <Button
                    id="reset-submit-btn"
                    type="submit"
                    className="w-full"
                    loading={resetForm.formState.isSubmitting}
                  >
                    Send Reset Link
                  </Button>
                </form>
              )}

              <button
                type="button"
                className="mt-4 text-xs text-primary hover:underline block"
                onClick={() => { setMode('login'); setResetSent(false) }}
              >
                ← Back to sign in
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
