import { Temporal } from "temporal-polyfill"

/**
 * Citește un tstzrange așa cum îl întoarce Postgres/PostgREST, de exemplu
 * `["2030-01-07 08:00:00+00","2030-01-07 09:00:00+00")`, ca instante ISO.
 * Întoarce null pentru intervale goale sau fără capăt (nu le folosim).
 */
export function parseTstzRange(value: unknown): { start: string; end: string } | null {
  if (typeof value !== "string") return null
  const match = /^[[(]"?([^",]*)"?,"?([^",]*)"?[\])]$/.exec(value.trim())
  if (!match || !match[1] || !match[2]) return null
  return { start: toIsoInstant(match[1]), end: toIsoInstant(match[2]) }
}

function toIsoInstant(pg: string): string {
  // "2030-01-07 08:00:00+00" → "2030-01-07T08:00:00+00:00"
  const normalized = pg.trim().replace(" ", "T").replace(/([+-]\d{2})$/, "$1:00")
  return Temporal.Instant.from(normalized).toString()
}

/** Un interval [start, end) în formatul pe care îl înțelege PostgREST. */
export function toTstzRange(start: string, end: string) {
  return `[${start},${end})`
}
