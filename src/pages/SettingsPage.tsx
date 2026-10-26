import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Save, Key, Eye, EyeOff, CheckCircle2, AlertCircle, RefreshCw, ExternalLink } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { PageLoader } from '@/components/ui/states'
import { supabase } from '@/lib/supabase'
import { toast } from '@/hooks/use-toast'
import { testGoogleBooksApiKey } from '@/lib/utils'
import { DemoDataMaintenance } from '@/components/maintenance/DemoDataMaintenance'

const TIMEZONES = [
  'Asia/Kolkata', 'Asia/Dubai', 'Asia/Singapore', 'Europe/London',
  'America/New_York', 'America/Chicago', 'America/Los_Angeles', 'UTC',
]

const DATE_FORMATS = [
  { value: 'dd MMM yyyy', label: '22 Oct 2026' },
  { value: 'MM/dd/yyyy',  label: '10/22/2026'  },
  { value: 'dd/MM/yyyy',  label: '22/10/2026'  },
  { value: 'yyyy-MM-dd',  label: '2026-10-22'  },
]

const settingsSchema = z.object({
  library_name:         z.string().min(1, 'Library name is required'),
  default_loan_days:    z.coerce.number().int().min(1).max(365),
  business_timezone:    z.string().min(1),
  date_format:          z.string().min(1),
  contact_info:         z.string().optional(),
  google_books_api_key: z.string().optional(),
})

type SettingsForm = z.infer<typeof settingsSchema>

export default function SettingsPage() {
  const qc = useQueryClient()
  const [showApiKey, setShowApiKey] = useState(false)
  const [isTestingKey, setIsTestingKey] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)

  const { data: settings, isLoading } = useQuery({
    queryKey: ['app-settings'],
    queryFn: async () => {
      const { data } = await supabase.from('app_settings').select('*').eq('id', 1).single()
      return data
    },
  })

  const form = useForm<SettingsForm>({
    resolver: zodResolver(settingsSchema),
    values: settings ? {
      library_name:         settings.library_name,
      default_loan_days:    settings.default_loan_days,
      business_timezone:    settings.business_timezone,
      date_format:          settings.date_format,
      contact_info:         settings.contact_info ?? '',
      google_books_api_key: settings.google_books_api_key ?? '',
    } : undefined,
  })

  async function handleTestApiKey() {
    const key = form.getValues('google_books_api_key')?.trim() || ''
    setIsTestingKey(true)
    setTestResult(null)
    try {
      const res = await testGoogleBooksApiKey(key)
      setTestResult(res)
      if (res.success) {
        toast({ title: 'Google Books API Connected', description: res.message })
      } else {
        toast({ title: 'API Key Test Failed', description: res.message, variant: 'destructive' })
      }
    } finally {
      setIsTestingKey(false)
    }
  }

  const save = useMutation({
    mutationFn: async (data: SettingsForm) => {
      const { error } = await supabase
        .from('app_settings')
        .update({
          library_name:         data.library_name,
          default_loan_days:    data.default_loan_days,
          business_timezone:    data.business_timezone,
          date_format:          data.date_format,
          contact_info:         data.contact_info || null,
          google_books_api_key: data.google_books_api_key ? data.google_books_api_key.trim() : null,
        })
        .eq('id', 1)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['app-settings'] })
      toast({ title: 'Settings saved', variant: 'success' as never })
    },
    onError: (err: Error) => {
      toast({ title: 'Failed to save settings', description: err.message, variant: 'destructive' })
    },
  })

  if (isLoading) return <PageLoader />

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Configure the library management system.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Library Settings</CardTitle>
          <CardDescription>These settings apply across the entire system.</CardDescription>
        </CardHeader>
        <CardContent>
          <form id="settings-form" onSubmit={form.handleSubmit(d => save.mutate(d))} className="space-y-4">
            {/* Library Name */}
            <div className="space-y-1.5">
              <Label htmlFor="library-name-input">Library Name</Label>
              <Input id="library-name-input" {...form.register('library_name')} placeholder="Book Nook" />
              {form.formState.errors.library_name && (
                <p className="text-xs text-destructive">{form.formState.errors.library_name.message}</p>
              )}
            </div>

            {/* Default Loan Days */}
            <div className="space-y-1.5">
              <Label htmlFor="loan-days-input">Default Loan Duration (days)</Label>
              <Input
                id="loan-days-input"
                type="number"
                min={1}
                max={365}
                {...form.register('default_loan_days')}
              />
              <p className="text-xs text-muted-foreground">Used when issuing a book to pre-fill the due date.</p>
              {form.formState.errors.default_loan_days && (
                <p className="text-xs text-destructive">{form.formState.errors.default_loan_days.message}</p>
              )}
            </div>

            {/* Business Timezone */}
            <div className="space-y-1.5">
              <Label htmlFor="timezone-select">Business Timezone</Label>
              <Controller
                name="business_timezone"
                control={form.control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="timezone-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIMEZONES.map(tz => <SelectItem key={tz} value={tz}>{tz}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              />
              <p className="text-xs text-muted-foreground">Used for overdue calculations and report timestamps.</p>
            </div>

            {/* Date Format */}
            <div className="space-y-1.5">
              <Label htmlFor="date-format-select">Date Display Format</Label>
              <Controller
                name="date_format"
                control={form.control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="date-format-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DATE_FORMATS.map(f => (
                        <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            {/* Contact Info */}
            <div className="space-y-1.5">
              <Label htmlFor="contact-info-input">Library Contact Information <span className="text-muted-foreground">(optional)</span></Label>
              <Textarea
                id="contact-info-input"
                {...form.register('contact_info')}
                placeholder="Library room number, email, phone…"
                rows={2}
              />
            </div>

            {/* Google Books API Key */}
            <div className="pt-4 border-t space-y-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-primary/10 rounded text-primary">
                  <Key className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold">Google Books API Integration</h3>
                  <p className="text-xs text-muted-foreground">
                    Enables book metadata auto-fill, description retrieval, and cover artwork by ISBN or title.
                  </p>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="google-books-api-key-input">Google Books API Key</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      id="google-books-api-key-input"
                      type={showApiKey ? 'text' : 'password'}
                      {...form.register('google_books_api_key')}
                      placeholder="AIzaSy..."
                      className="pr-10 font-mono text-sm"
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      onClick={() => setShowApiKey(v => !v)}
                      tabIndex={-1}
                      aria-label={showApiKey ? 'Hide key' : 'Show key'}
                    >
                      {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <Button
                    id="test-google-api-key-btn"
                    type="button"
                    variant="outline"
                    disabled={isTestingKey}
                    onClick={handleTestApiKey}
                    className="shrink-0 gap-1.5"
                  >
                    {isTestingKey ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Key className="h-4 w-4" />
                    )}
                    Test Connection
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Optional. Basic lookups work without a key, but an API key ensures higher rate limits and uninterrupted service.
                </p>
              </div>

              {testResult && (
                <div
                  className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
                    testResult.success
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                      : 'bg-destructive/10 text-destructive border border-destructive/20'
                  }`}
                >
                  {testResult.success ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                  ) : (
                    <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />
                  )}
                  <span>{testResult.message}</span>
                </div>
              )}

              <div className="rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground space-y-1">
                <p className="font-semibold text-foreground">
                  How to get a Google Books API Key:
                </p>
                <ol className="list-decimal list-inside space-y-0.5 pl-1">
                  <li>
                    Visit{' '}
                    <a
                      href="https://console.cloud.google.com"
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary underline inline-flex items-center gap-0.5 font-medium"
                    >
                      Google Cloud Console <ExternalLink className="h-3 w-3 inline" />
                    </a>
                  </li>
                  <li>Enable the <strong>Books API</strong> under APIs & Services.</li>
                  <li>Create an <strong>API Key</strong> under Credentials and paste it here.</li>
                </ol>
              </div>
            </div>

            <Button
              id="save-settings-btn"
              type="submit"
              loading={save.isPending}
              className="w-full sm:w-auto"
            >
              <Save className="h-4 w-4" />
              Save Settings
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Demo Data & Maintenance Section */}
      <DemoDataMaintenance />
    </div>
  )
}
