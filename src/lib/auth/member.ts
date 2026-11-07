import "server-only"

import { redirect } from "next/navigation"

import { createClient } from "@/lib/supabase/server"

export type Member = {
  userId: string
  email: string | null
  tenantId: string
  tenantName: string
  role: "owner" | "staff"
}

/**
 * Utilizatorul logat și firma lui. Firma vine din tabelul members, citit sub
 * RLS cu sesiunea utilizatorului: nimic din cerere nu o poate schimba.
 * Fără sesiune sau fără firmă → pagina de logare.
 */
export async function requireMember(): Promise<Member> {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const claims = data?.claims
  if (!claims?.sub) redirect("/intra")

  const { data: membership } = await supabase
    .from("members")
    .select("tenant_id, role, tenants(name)")
    .eq("user_id", claims.sub)
    .order("created_at")
    .limit(1)
    .maybeSingle()
  if (!membership) redirect("/intra?eroare=fara-firma")

  return {
    userId: claims.sub,
    email: typeof claims.email === "string" ? claims.email : null,
    tenantId: membership.tenant_id,
    tenantName: membership.tenants?.name ?? "Firma ta",
    role: membership.role,
  }
}
