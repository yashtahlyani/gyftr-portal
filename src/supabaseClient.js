// src/supabaseClient.js
// ─────────────────────────────────────────────────────────────────
//  Single Supabase client shared across the entire app.
//  Keys come from .env.local — never hardcode them here.
//
//  .env.local (create this in your project root):
//    VITE_SUPABASE_URL=https://your-project-id.supabase.co
//    VITE_SUPABASE_ANON_KEY=your-anon-key-here
//
//  Get both from: Supabase dashboard → Settings → API
// ─────────────────────────────────────────────────────────────────

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_ANON) {
  throw new Error(
    'Missing Supabase env vars. Create .env.local with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY'
  )
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON)
