"use server"

import { createAdminClient } from "@/lib/supabase/admin"
import { VERTICAL_OPTIONS } from "@/lib/verticals"

export type PilotState = {
  status: "idle" | "ok" | "error"
  message?: string
  fieldErrors?: Partial<Record<"businessName" | "vertical" | "phone", string>>
  values?: { businessName: string; vertical: string; phone: string }
}

const PHONE = /^\+?[0-9 ().-]{9,20}$/

export async function submitPilotRequest(_prev: PilotState, form: FormData): Promise<PilotState> {
  const values = {
    businessName: String(form.get("businessName") ?? "").trim(),
    vertical: String(form.get("vertical") ?? ""),
    phone: String(form.get("phone") ?? "").trim(),
  }

  const fieldErrors: PilotState["fieldErrors"] = {}
  if (values.businessName.length < 2) fieldErrors.businessName = "Scrie numele firmei."
  if (!VERTICAL_OPTIONS.some((o) => o.id === values.vertical)) fieldErrors.vertical = "Alege domeniul."
  if (!PHONE.test(values.phone) || values.phone.replace(/\D/g, "").length < 9)
    fieldErrors.phone = "Scrie un număr de telefon, de exemplu 0722 123 456."

  if (Object.keys(fieldErrors).length) {
    return { status: "error", message: "Verifică câmpurile marcate.", fieldErrors, values }
  }

  try {
    const supabase = createAdminClient()
    const { error } = await supabase.rpc("submit_pilot_request", {
      p_business_name: values.businessName,
      p_vertical: values.vertical,
      p_phone: values.phone,
    })
    if (error) throw error
  } catch (error) {
    console.error("Cererea de pilot nu a fost salvată:", error)
    return {
      status: "error",
      message: "Nu am putut trimite cererea acum. Încearcă din nou peste câteva minute.",
      values,
    }
  }

  return { status: "ok" }
}
