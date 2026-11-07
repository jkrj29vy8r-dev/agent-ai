/**
 * Variabilele publice de mediu. Se citesc explicit (nu `process.env[name]`),
 * ca Next să le poată înlocui la build în codul de client.
 */
function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Lipsește variabila de mediu ${name}. Copiază .env.example în .env.local și completeaz-o.`
    )
  }
  return value
}

export const env = {
  get supabaseUrl() {
    return required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL)
  },
  get supabasePublishableKey() {
    return required(
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    )
  },
}
