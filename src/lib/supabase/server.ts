import "server-only"

import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

import { env } from "@/lib/env"

import type { Database } from "./database.types"

/**
 * Clientul Supabase pentru Server Components, Server Actions și Route
 * Handlers. Lucrează ca utilizatorul logat, sub RLS. Creează unul nou la
 * fiecare cerere; nu-l păstra într-o variabilă globală.
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(env.supabaseUrl, env.supabasePublishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        } catch {
          // Apelat dintr-un Server Component, unde cookie-urile nu se pot
          // scrie. E în regulă: proxy.ts reîmprospătează sesiunea.
        }
      },
    },
  })
}
