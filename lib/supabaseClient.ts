"use client";

import { createClient } from "@supabase/supabase-js";

function validSupabaseUrl(value?: string) {
  if (!value) return false;
  return value.startsWith("https://") || value.startsWith("http://");
}

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const rawAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

const supabaseUrl = validSupabaseUrl(rawUrl)
  ? rawUrl
  : "https://placeholder.supabase.co";

const supabaseAnonKey = rawAnonKey && rawAnonKey.length > 10
  ? rawAnonKey
  : "placeholder-anon-key";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
