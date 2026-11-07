import { describe, expect, it } from "vitest"

import { buildApiMessages, type MessageRow } from "./history"

let seq = 0
const row = (role: string, extra: Partial<MessageRow> = {}): MessageRow => ({
  id: `m${++seq}`,
  seq,
  role: role as MessageRow["role"],
  content: null,
  api_content: null,
  tool_name: null,
  tool_input: null,
  tool_output: null,
  tool_use_id: null,
  is_error: false,
  created_at: "",
  ...extra,
})

describe("buildApiMessages", () => {
  it("reconstruiește istoricul în ordinea seq, cu blocurile exacte ale agentului", () => {
    const blocks = [{ type: "thinking", thinking: "", signature: "s" }, { type: "tool_use", id: "t1", name: "list_services", input: { b: 1, a: 2 } }]
    const rows = [
      row("customer", { content: "Bună" }),
      row("system", { content: "Ora: 10:00" }),
      row("agent", { api_content: JSON.stringify(blocks) }),
      row("tool", { tool_use_id: "t1", api_content: '{"ok":true}' }),
      row("tool", { tool_use_id: "t2", api_content: '{"ok":false}', is_error: true }),
      row("agent", { api_content: JSON.stringify([{ type: "text", text: "Gata" }]) }),
    ]
    const messages = buildApiMessages([...rows].reverse())
    expect(messages.map((m) => m.role)).toEqual(["user", "system", "assistant", "user", "assistant"])
    expect(JSON.stringify(messages[2].content)).toBe(JSON.stringify(blocks)) // ordinea cheilor păstrată
    expect(messages[3].content).toEqual([
      { type: "tool_result", tool_use_id: "t1", content: '{"ok":true}' },
      { type: "tool_result", tool_use_id: "t2", content: '{"ok":false}', is_error: true },
    ])
  })

  it("sare peste ora unei ture eșuate, ca istoricul să rămână valid și identic", () => {
    const rows = [
      row("customer", { content: "Primul mesaj" }),
      row("system", { content: "Ora: 10:00" }), // tura asta a eșuat la API
      row("customer", { content: "Al doilea" }),
      row("system", { content: "Ora: 10:05" }),
    ]
    expect(buildApiMessages(rows).map((m) => m.role)).toEqual(["user", "user", "system"])
  })

  it("nu trimite la model mesajele echipei", () => {
    expect(buildApiMessages([row("customer", { content: "x" }), row("staff", { content: "y" })])).toHaveLength(1)
  })
})
