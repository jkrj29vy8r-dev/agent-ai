"use server"

import { redirect } from "next/navigation"

import { createClient } from "@/lib/supabase/server"

export type SignInState = { error?: string; email?: string }

export async function signIn(_prev: SignInState, form: FormData): Promise<SignInState> {
  const email = String(form.get("email") ?? "").trim()
  const password = String(form.get("password") ?? "")
  if (!email || !password) return { error: "Scrie adresa de e-mail și parola.", email }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) return { error: "E-mailul sau parola nu sunt corecte.", email }

  redirect("/dashboard/testeaza-agentul")
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect("/intra")
}
