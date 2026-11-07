import type Anthropic from "@anthropic-ai/sdk"

/** Modelul agentului și al rezumatului. */
export const AGENT_MODEL = "claude-opus-5-5"

/**
 * Efortul de gândire. Pe Claude Opus 5.5 implicitul e „medium”; îl scriem
 * explicit. Rezumatul e o extragere simplă, deci merge pe „low”.
 */
export const AGENT_EFFORT = "medium" as const
export const SUMMARY_EFFORT = "low" as const

export const AGENT_MAX_TOKENS = 16_000

/** Câte runde de unelte poate face agentul pentru un singur mesaj al clientului. */
export const MAX_TOOL_ROUNDS = 8

/**
 * Dacă un filtru de siguranță refuză cererea pe modelul principal, API-ul o
 * reia automat pe un model de rezervă („default” alege după tipul refuzului).
 */
export const FALLBACK: Pick<Anthropic.Beta.MessageCreateParamsNonStreaming, "betas" | "fallbacks"> = {
  betas: ["server-side-fallback-2026-07-01"],
  fallbacks: "default",
}
