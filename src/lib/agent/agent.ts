import type Anthropic from "@anthropic-ai/sdk"

import type { Channel } from "@/lib/channels"
import type { Json } from "@/lib/supabase/database.types"

import { AGENT_EFFORT, AGENT_MAX_TOKENS, AGENT_MODEL, FALLBACK, MAX_TOOL_ROUNDS } from "./config"
import { buildApiMessages, MESSAGE_COLUMNS, visibleText, type MessageRow } from "./history"
import {
  buildSystemPrompt,
  loadAgentProfile,
  timeNotice,
  type ConversationContext,
  type Db,
} from "./system-prompt"
import { apiTools, executeTool } from "./tools/registry"
import type { ChannelAction, ToolContext } from "./tools/types"

/* ── Conversația ─────────────────────────────────────────────────────────── */

/**
 * Deschide o conversație și îi îngheață promptul de sistem. `tenantId` vine
 * din canalul care a primit mesajul (sau din sesiunea membrului, la test).
 */
export async function startConversation(
  db: Db,
  args: { tenantId: string; channel: Channel; context?: ConversationContext; isTest?: boolean; now?: Date }
) {
  const now = args.now ?? new Date()
  const profile = await loadAgentProfile(db, args.tenantId)
  const systemPrompt = buildSystemPrompt(profile, args.channel, args.context ?? {}, now)

  const { data, error } = await db
    .from("conversations")
    .insert({
      tenant_id: args.tenantId,
      channel: args.channel,
      context: (args.context ?? {}) as NonNullable<Json>,
      system_prompt: systemPrompt,
      model: AGENT_MODEL,
      is_test: args.isTest ?? false,
      started_at: now.toISOString(),
    })
    .select("id")
    .single()
  if (error) throw new Error(`Nu am putut deschide conversația: ${error.message}`)
  return data.id
}

async function loadConversation(db: Db, conversationId: string) {
  const { data, error } = await db
    .from("conversations")
    .select("id, tenant_id, channel, context, system_prompt, status")
    .eq("id", conversationId)
    .single()
  if (error) throw new Error(`Conversația ${conversationId} nu există: ${error.message}`)
  if (!data.system_prompt) throw new Error("Conversația nu are prompt de sistem.")
  return { ...data, system_prompt: data.system_prompt, context: data.context as ConversationContext }
}

export async function loadMessages(db: Db, conversationId: string): Promise<MessageRow[]> {
  const { data, error } = await db.from("messages").select(MESSAGE_COLUMNS).eq("conversation_id", conversationId).order("seq")
  if (error) throw new Error(error.message)
  return data
}

/* ── O tură ──────────────────────────────────────────────────────────────── */

export type TurnResult = {
  /** Ce îi răspunde agentul clientului; null dacă nu răspunde (e-mail marcat). */
  reply: string | null
  /** Acțiuni pentru canal: transfer de apel, închiderea apelului, fără răspuns. */
  actions: ChannelAction[]
  /** Rândurile salvate în tura asta (mesaje și apeluri de unelte). */
  rows: MessageRow[]
  stopReason: string | null
}

const REFUSAL_REPLY = "Îmi pare rău, nu vă pot ajuta cu asta. Un coleg din echipă vă va contacta."
const TOO_MANY_ROUNDS_REPLY = "Am nevoie de ajutorul unui coleg pentru asta. Revenim la dumneavoastră cât de curând."

/**
 * Primește un mesaj al clientului, îl salvează, rulează bucla de tool use și
 * salvează fiecare răspuns al modelului și fiecare apel de unealtă.
 *
 * Istoricul trimis la API se construiește doar prin adăugare: promptul de
 * sistem e cel înghețat la început, iar ora curentă intră ca mesaj de sistem
 * după mesajul clientului. Mesajele dintr-o conversație se procesează pe rând.
 */
export async function runAgentTurn(
  db: Db,
  claude: Anthropic,
  args: { conversationId: string; text: string; now?: Date }
): Promise<TurnResult> {
  const now = args.now ?? new Date()
  const conversation = await loadConversation(db, args.conversationId)
  if (conversation.status === "closed") throw new Error("Conversația e încheiată.")
  const profile = await loadAgentProfile(db, conversation.tenant_id)
  const channel = conversation.channel as Channel

  const saved: MessageRow[] = []
  async function save(row: Record<string, unknown>) {
    const { data, error } = await db
      .from("messages")
      .insert({ tenant_id: conversation.tenant_id, conversation_id: conversation.id, ...row } as never)
      .select(MESSAGE_COLUMNS)
      .single()
    if (error) throw new Error(`Nu am putut salva mesajul: ${error.message}`)
    saved.push(data)
    return data
  }

  await save({ role: "customer", content: args.text })
  await save({ role: "system", content: timeNotice(now, profile.timezone) })

  const messages = buildApiMessages(await loadMessages(db, conversation.id))
  const tools = apiTools(channel)
  const toolContext: ToolContext = {
    db,
    tenantId: conversation.tenant_id,
    conversationId: conversation.id,
    channel,
    context: conversation.context,
    profile,
    now,
  }

  const actions: ChannelAction[] = []
  let reply: string | null = null
  let stopReason: string | null = null

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const response = await claude.beta.messages.create({
      model: AGENT_MODEL,
      max_tokens: AGENT_MAX_TOKENS,
      system: [{ type: "text", text: conversation.system_prompt }],
      tools,
      messages,
      thinking: { type: "adaptive" },
      output_config: { effort: AGENT_EFFORT },
      // Istoricul crește doar la final, deci tot prefixul (unelte, prompt,
      // mesajele anterioare) se citește din cache la tura următoare.
      cache_control: { type: "ephemeral" },
      ...FALLBACK,
    })
    stopReason = response.stop_reason

    const text = visibleText(response.content)
    await save({ role: "agent", content: text || null, api_content: JSON.stringify(response.content) })
    await recordUsage(db, conversation.tenant_id, conversation.id, response)
    messages.push({ role: "assistant", content: response.content })

    if (response.stop_reason === "refusal") {
      reply = REFUSAL_REPLY
      await db.from("handoffs").insert({
        tenant_id: conversation.tenant_id,
        conversation_id: conversation.id,
        reason: "Asistentul nu a putut răspunde la cerere.",
      })
      break
    }

    if (response.stop_reason === "pause_turn") continue
    if (response.stop_reason !== "tool_use") {
      reply = text || null
      break
    }

    // Unealtă cu unealtă, în ordinea cerută; toate rezultatele într-un singur mesaj.
    const results: Anthropic.Beta.BetaToolResultBlockParam[] = []
    for (const block of response.content) {
      if (block.type !== "tool_use") continue
      const outcome = await executeTool(toolContext, block.name, block.input)
      const resultText = JSON.stringify(outcome.result)
      await save({
        role: "tool",
        tool_name: block.name,
        tool_use_id: block.id,
        tool_input: block.input as Json,
        tool_output: outcome.result as Json,
        is_error: outcome.isError,
        api_content: resultText,
      })
      results.push({ type: "tool_result", tool_use_id: block.id, content: resultText, ...(outcome.isError ? { is_error: true } : {}) })
      if (outcome.action) actions.push(outcome.action)
    }
    messages.push({ role: "user", content: results })

    if (round === MAX_TOOL_ROUNDS - 1) {
      reply = TOO_MANY_ROUNDS_REPLY
      await db.from("handoffs").insert({
        tenant_id: conversation.tenant_id,
        conversation_id: conversation.id,
        reason: "Asistentul nu a reușit să termine cererea după mai multe încercări.",
      })
    }
  }

  if (actions.includes("no_reply")) reply = null
  return { reply, actions, rows: saved, stopReason }
}

async function recordUsage(db: Db, tenantId: string, conversationId: string, response: Anthropic.Beta.BetaMessage) {
  const u = response.usage
  const input = u.input_tokens + (u.cache_creation_input_tokens ?? 0) + (u.cache_read_input_tokens ?? 0)
  const metadata = {
    model: response.model,
    cache_read: u.cache_read_input_tokens ?? 0,
    cache_creation: u.cache_creation_input_tokens ?? 0,
  }
  await db.from("usage_events").insert([
    { tenant_id: tenantId, conversation_id: conversationId, kind: "ai_input_tokens", quantity: input, metadata },
    { tenant_id: tenantId, conversation_id: conversationId, kind: "ai_output_tokens", quantity: u.output_tokens, metadata },
  ])
}
