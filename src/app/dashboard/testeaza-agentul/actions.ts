"use server"

import { z } from "zod"

import { runAgentTurn, startConversation } from "@/lib/agent/agent"
import { createClaude, MissingApiKeyError } from "@/lib/agent/claude"
import type { MessageRow } from "@/lib/agent/history"
import { endConversation, type Summary } from "@/lib/agent/summary"
import { normalizePhone } from "@/lib/agent/tools/format"
import { requireMember } from "@/lib/auth/member"
import { createAdminClient } from "@/lib/supabase/admin"

/** Un rând din chat-ul de test: replici și apeluri de unelte. */
export type ChatEvent =
  | { kind: "customer"; id: string; text: string }
  | { kind: "agent"; id: string; text: string }
  | { kind: "tool"; id: string; name: string; input: unknown; output: unknown; isError: boolean }

function toEvents(rows: MessageRow[]): ChatEvent[] {
  return rows.flatMap((r): ChatEvent[] => {
    if (r.role === "customer") return [{ kind: "customer", id: r.id, text: r.content ?? "" }]
    if (r.role === "agent" && r.content) return [{ kind: "agent", id: r.id, text: r.content }]
    if (r.role === "tool")
      return [{ kind: "tool", id: r.id, name: r.tool_name ?? "?", input: r.tool_input, output: r.tool_output, isError: r.is_error }]
    return []
  })
}

type Result<T> = ({ ok: true } & T) | { ok: false; error: string }

const failure = (error: unknown): { ok: false; error: string } => {
  if (error instanceof MissingApiKeyError) return { ok: false, error: error.message }
  console.error("Testează agentul:", error)
  return { ok: false, error: "Ceva n-a mers. Încearcă din nou; dacă se repetă, verifică jurnalul serverului." }
}

/** Conversația trebuie să fie de test și a firmei membrului. */
async function ownTestConversation(conversationId: string) {
  const member = await requireMember()
  const db = createAdminClient()
  const { data } = await db
    .from("conversations")
    .select("id")
    .eq("id", conversationId)
    .eq("tenant_id", member.tenantId)
    .eq("is_test", true)
    .maybeSingle()
  if (!data) throw new Error("Conversația de test nu există pentru firma ta.")
  return db
}

const StartInput = z.object({
  channel: z.enum(["whatsapp", "phone", "email"]),
  contact: z.string().trim().max(200),
})

export async function startTestConversation(input: z.infer<typeof StartInput>): Promise<Result<{ conversationId: string }>> {
  const parsed = StartInput.safeParse(input)
  if (!parsed.success) return { ok: false, error: "Alege canalul." }
  const { channel, contact } = parsed.data

  // Ce ar ști canalul real despre client: numărul (telefon, WhatsApp) sau adresa (e-mail).
  const phone = normalizePhone(contact)
  if (channel !== "email" && contact && !phone) return { ok: false, error: "Numărul de telefon nu pare valid." }
  if (channel === "email" && contact && !z.string().email().safeParse(contact).success)
    return { ok: false, error: "Adresa de e-mail nu pare validă." }
  const context =
    channel === "phone"
      ? { callerNumber: phone ?? undefined }
      : channel === "whatsapp"
        ? { customerPhone: phone ?? undefined }
        : { customerEmail: contact || undefined }

  try {
    const member = await requireMember()
    const conversationId = await startConversation(createAdminClient(), {
      tenantId: member.tenantId,
      channel,
      context,
      isTest: true,
    })
    return { ok: true, conversationId }
  } catch (error) {
    return failure(error)
  }
}

const SendInput = z.object({ conversationId: z.string().uuid(), text: z.string().trim().min(1).max(4000) })

export async function sendTestMessage(
  input: z.infer<typeof SendInput>
): Promise<Result<{ events: ChatEvent[]; noReply: boolean; actions: string[] }>> {
  const parsed = SendInput.safeParse(input)
  if (!parsed.success) return { ok: false, error: "Scrie un mesaj." }
  try {
    const db = await ownTestConversation(parsed.data.conversationId)
    const turn = await runAgentTurn(db, createClaude(), parsed.data)
    return { ok: true, events: toEvents(turn.rows), noReply: turn.reply === null, actions: turn.actions }
  } catch (error) {
    return failure(error)
  }
}

export async function endTestConversation(conversationId: string): Promise<Result<{ summary: Summary | null }>> {
  if (!z.string().uuid().safeParse(conversationId).success) return { ok: false, error: "Conversație invalidă." }
  try {
    const db = await ownTestConversation(conversationId)
    const summary = await endConversation(db, createClaude(), conversationId)
    return { ok: true, summary }
  } catch (error) {
    return failure(error)
  }
}
