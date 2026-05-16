import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Server-side client with service role key for admin operations
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

// Types for our database
export interface Call {
  id: string
  source_id: string
  source_name: string
  external_id: string | null
  title: string
  description: string | null
  url: string | null
  deadline: string | null
  budget: string | null
  status: string
  category: string | null
  ai_summary: string | null
  ai_tags: string[] | null
  raw_data: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

export interface SyncLog {
  id: string
  source_id: string
  source_name: string
  status: string
  calls_found: number
  calls_new: number
  calls_updated: number
  error_message: string | null
  started_at: string
  completed_at: string | null
}
