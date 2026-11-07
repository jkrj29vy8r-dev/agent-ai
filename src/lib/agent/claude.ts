import "server-only"

import Anthropic from "@anthropic-ai/sdk"

export class MissingApiKeyError extends Error {
  constructor() {
    super("Lipsește cheia API Claude pe server (ANTHROPIC_API_KEY).")
    this.name = "MissingApiKeyError"
  }
}

let client: Anthropic | undefined

/** Clientul Claude al serverului. Cheia stă doar pe server, niciodată NEXT_PUBLIC_. */
export function createClaude(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) throw new MissingApiKeyError()
  client ??= new Anthropic()
  return client
}
