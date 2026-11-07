import type Anthropic from "@anthropic-ai/sdk"
import { z } from "zod"

import type { Channel } from "@/lib/channels"

import {
  cancelBooking,
  checkAvailability,
  createBooking,
  findCustomerBookings,
  holdSlot,
  rescheduleBooking,
  sendPaymentLink,
} from "./booking"
import { classifyEmail, endCall, handoffToHuman, transferCall } from "./handoff"
import { getBusinessInfo, listServices, searchFaq } from "./info"
import type { AnyTool, ChannelAction, ToolContext, ToolResult } from "./types"

/** Uneltele, în ordinea din plan. Ordinea e fixă: lista face parte din prefixul pus în cache. */
export const TOOLS: AnyTool[] = [
  getBusinessInfo,
  listServices,
  checkAvailability,
  holdSlot,
  createBooking,
  findCustomerBookings,
  rescheduleBooking,
  cancelBooking,
  sendPaymentLink,
  searchFaq,
  handoffToHuman,
  transferCall,
  endCall,
  classifyEmail,
]

export function toolsForChannel(channel: Channel): AnyTool[] {
  return TOOLS.filter((t) => !t.channels || t.channels.includes(channel))
}

/** Definițiile trimise la API, generate din schemele zod (aceleași care validează). */
export function apiTools(channel: Channel): Anthropic.Beta.BetaTool[] {
  return toolsForChannel(channel).map((tool) => {
    const schema = z.toJSONSchema(tool.input, { io: "input" }) as Record<string, unknown>
    delete schema.$schema
    return {
      name: tool.name,
      description: tool.description,
      input_schema: schema as Anthropic.Beta.BetaTool["input_schema"],
    }
  })
}

export type ToolOutcome = {
  result: ToolResult
  isError: boolean
  action?: ChannelAction
}

/**
 * Rulează o unealtă: verifică dacă e permisă pe canal, validează intrarea cu
 * zod și prinde orice eroare. Modelul primește mereu un rezultat, niciodată o
 * excepție.
 */
export async function executeTool(ctx: ToolContext, name: string, rawInput: unknown): Promise<ToolOutcome> {
  const tool = toolsForChannel(ctx.channel).find((t) => t.name === name)
  if (!tool) {
    return { result: { ok: false, code: "unknown_tool", error: `Unealta ${name} nu există pe acest canal.` }, isError: true }
  }

  const parsed = tool.input.safeParse(rawInput ?? {})
  if (!parsed.success) {
    return {
      result: {
        ok: false,
        code: "invalid_input",
        error: "Parametrii nu sunt valizi. Corectează-i și încearcă din nou.",
        probleme: parsed.error.issues.map((i) => `${i.path.join(".") || "(intrare)"}: ${i.message}`),
      },
      isError: true,
    }
  }

  try {
    const result = await tool.run(ctx, parsed.data)
    const action = result.ok && typeof result.action === "string" ? (result.action as ChannelAction) : undefined
    return { result, isError: false, action }
  } catch (error) {
    console.error(`Unealta ${name} a eșuat:`, error)
    return {
      result: { ok: false, code: "internal_error", error: "A apărut o eroare la server. Nu promite nimic; predă la om dacă se repetă." },
      isError: true,
    }
  }
}
