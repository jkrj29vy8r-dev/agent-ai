import type { z } from "zod"

import type { Channel } from "@/lib/channels"

import type { AgentProfile, ConversationContext, Db } from "../system-prompt"

/**
 * Tot ce primește o unealtă de la server. NIMIC din ce trimite modelul nu
 * stabilește firma sau clientul: tenantId vine din canal, telefonul verificat
 * din context (numărul de pe care sună sau scrie clientul).
 */
export type ToolContext = {
  db: Db
  tenantId: string
  conversationId: string
  channel: Channel
  context: ConversationContext
  profile: AgentProfile
  now: Date
}

/** Răspunsul unei unelte, trimis modelului ca JSON. */
export type ToolResult =
  | ({ ok: true } & Record<string, unknown>)
  | { ok: false; code: string; error: string; [key: string]: unknown }

/** O acțiune pe care stratul de canal trebuie s-o execute după tură. */
export type ChannelAction = "transfer" | "end_call" | "no_reply"

export type ToolDefinition<S extends z.ZodType = z.ZodType> = {
  name: string
  /** Când se folosește: descrierea pe care o vede modelul. */
  description: string
  /** Canalele pe care e disponibilă; implicit toate. */
  channels?: Channel[]
  input: S
  run: (ctx: ToolContext, input: z.infer<S>) => Promise<ToolResult>
}

/** O unealtă cu tipul intrării șters, ca să poată sta într-o listă. */
export type AnyTool = {
  name: string
  description: string
  channels?: Channel[]
  input: z.ZodType
  run: (ctx: ToolContext, input: unknown) => Promise<ToolResult>
}

export function defineTool<S extends z.ZodType>(tool: ToolDefinition<S>): AnyTool {
  return tool as unknown as AnyTool
}

export const fail = (code: string, error: string, extra: Record<string, unknown> = {}): ToolResult => ({
  ok: false,
  code,
  error,
  ...extra,
})
