import { Temporal } from "temporal-polyfill"

/** „joi, 12 noiembrie, 15:30”, în fusul firmei. */
export function slotLabel(instant: string | Date, timeZone: string) {
  const date = typeof instant === "string" ? new Date(Temporal.Instant.from(instant).epochMilliseconds) : instant
  const day = new Intl.DateTimeFormat("ro-RO", { timeZone, weekday: "long", day: "numeric", month: "long" }).format(date)
  const time = new Intl.DateTimeFormat("ro-RO", { timeZone, hour: "2-digit", minute: "2-digit" }).format(date)
  return `${day}, ${time}`
}

export function priceLabel(priceType: string, price: number | null, currency: string) {
  const unit = currency === "RON" ? "lei" : currency
  if (priceType === "on_request" || price === null) return "la cerere"
  const amount = Number.isInteger(price) ? String(price) : price.toFixed(2)
  return priceType === "from" ? `de la ${amount} ${unit}` : `${amount} ${unit}`
}

/** Normalizează un număr românesc la E.164: „0722 123 456” → „+40722123456”. Null dacă nu e un număr. */
export function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null
  const digits = raw.replace(/[^\d+]/g, "")
  let e164: string
  if (digits.startsWith("+")) e164 = `+${digits.slice(1).replace(/\D/g, "")}`
  else if (digits.startsWith("00")) e164 = `+${digits.slice(2)}`
  else if (digits.startsWith("0")) e164 = `+40${digits.slice(1)}`
  else e164 = `+${digits}`
  return /^\+[1-9]\d{6,14}$/.test(e164) ? e164 : null
}

/** Început de zi locală → instant. */
export function startOfLocalDay(date: string, timeZone: string) {
  return Temporal.PlainDate.from(date).toZonedDateTime({ timeZone }).toInstant().toString()
}

/** Litere mici, fără diacritice, pentru căutare. */
export function fold(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
}
