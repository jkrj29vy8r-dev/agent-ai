import type Anthropic from "@anthropic-ai/sdk"

import type { Database } from "@/lib/supabase/database.types"

export type MessageRow = Pick<
  Database["public"]["Tables"]["messages"]["Row"],
  "id" | "seq" | "role" | "content" | "api_content" | "tool_name" | "tool_input" | "tool_output" | "tool_use_id" | "is_error" | "created_at"
>

export const MESSAGE_COLUMNS = "id, seq, role, content, api_content, tool_name, tool_input, tool_output, tool_use_id, is_error, created_at"

/**
 * Reconstruiește istoricul pentru API din rândurile salvate, în ordinea `seq`.
 * Rezultatul trebuie să fie identic la fiecare tură (doar adăugăm la final):
 * blocurile de gândire și cache-ul depind de un istoric neschimbat.
 *
 *   customer → { role: "user", content: text }
 *   system   → { role: "system", content: text } (ora curentă, la fiecare mesaj al clientului)
 *   agent    → { role: "assistant", content: blocurile exacte de la API }
 *   tool…    → un singur { role: "user" } cu toate tool_result-urile consecutive
 *   staff    → nu ajunge la model (mesajele echipei se trimit direct clientului)
 */
export function buildApiMessages(rows: MessageRow[]): Anthropic.Beta.BetaMessageParam[] {
  const messages: Anthropic.Beta.BetaMessageParam[] = []
  const sorted = [...rows].sort((a, b) => a.seq - b.seq)

  for (const [index, row] of sorted.entries()) {
    if (row.role === "customer") {
      messages.push({ role: "user", content: row.content ?? "" })
    } else if (row.role === "system") {
      // O tură care a eșcuat (API indisponibil) lasă „client, sistem” fără
      // răspuns. Un mesaj de sistem urmat direct de alt mesaj al clientului nu
      // se trimite: regula e deterministă, deci istoricul rămâne identic.
      if (sorted[index + 1]?.role === "customer") continue
      messages.push({ role: "system", content: row.content ?? "" })
    } else if (row.role === "agent") {
      if (!row.api_content) throw new Error(`Mesajul agentului ${row.id} nu are conținutul API.`)
      messages.push({ role: "assistant", content: JSON.parse(row.api_content) as Anthropic.Beta.BetaContentBlockParam[] })
    } else if (row.role === "tool") {
      const block: Anthropic.Beta.BetaToolResultBlockParam = {
        type: "tool_result",
        tool_use_id: row.tool_use_id ?? "",
        content: row.api_content ?? "",
        ...(row.is_error ? { is_error: true } : {}),
      }
      const last = messages.at(-1)
      if (last?.role === "user" && Array.isArray(last.content) && last.content.every((b) => b.type === "tool_result")) {
        last.content.push(block)
      } else {
        messages.push({ role: "user", content: [block] })
      }
    }
  }
  return messages
}

/** Textul vizibil al unui răspuns (fără blocurile de gândire și de unelte). */
export function visibleText(content: Anthropic.Beta.BetaContentBlock[]) {
  return content
    .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n\n")
    .trim()
}
