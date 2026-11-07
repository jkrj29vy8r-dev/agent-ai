import { createBrowserClient } from "@supabase/ssr"

import { env } from "@/lib/env"

import type { Database } from "./database.types"

/** Clientul Supabase din browser. Lucrează ca utilizatorul logat, sub RLS. */
export function createClient() {
  return createBrowserClient<Database>(env.supabaseUrl, env.supabasePublishableKey)
}
