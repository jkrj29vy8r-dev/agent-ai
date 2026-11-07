import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

import { env } from "@/lib/env"

/**
 * Reîmprospătează sesiunea Supabase la fiecare cerere și scrie cookie-urile
 * noi în răspuns. Rulează din `src/proxy.ts`.
 *
 * Nu e verificare de autorizare: accesul la date îl decide RLS, iar paginile
 * protejate verifică utilizatorul pe server.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })

  // Fără Supabase configurat (prima pornire, previzualizări) site-ul public
  // merge mai departe; doar sesiunea nu se reîmprospătează.
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    return response
  }

  const supabase = createServerClient(env.supabaseUrl, env.supabasePublishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        )
        Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value))
      },
    },
  })

  // Nu pune cod între createServerClient și getClaims: poate deloga
  // utilizatorii la întâmplare.
  await supabase.auth.getClaims()

  return response
}
