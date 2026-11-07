import "server-only"

import { createClient as createSupabaseClient } from "@supabase/supabase-js"

import { env } from "@/lib/env"

import type { Database } from "./database.types"

/**
 * Clientul cu cheia secretă: OCOLEȘTE RLS. Doar pe server, doar pentru
 * backend-ul agentului (webhook-uri de telefon, WhatsApp, e-mail) și joburi.
 *
 * Regula: orice interogare făcută cu acest client filtrează EXPLICIT după
 * `tenant_id`. RLS nu te mai apără aici.
 */
export function createAdminClient() {
  const secretKey = process.env.SUPABASE_SECRET_KEY
  if (!secretKey) {
    throw new Error("Lipsește SUPABASE_SECRET_KEY (doar pe server, niciodată NEXT_PUBLIC_).")
  }
  return createSupabaseClient<Database>(env.supabaseUrl, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
