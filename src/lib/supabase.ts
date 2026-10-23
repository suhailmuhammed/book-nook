import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'
import { mockSupabase } from './mockSupabase'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

const isMock =
  !supabaseUrl ||
  !supabaseAnonKey ||
  supabaseUrl.includes('your-project-id') ||
  supabaseUrl.includes('placeholder') ||
  import.meta.env.VITE_USE_MOCK === 'true'

export const isMockMode = isMock

export const supabase: any = (
  isMock
    ? mockSupabase
    : createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      })
)

