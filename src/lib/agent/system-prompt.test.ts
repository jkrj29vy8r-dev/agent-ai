import { describe, expect, it } from "vitest"

import { renderTemplate } from "./prompts"
import { buildSystemPrompt, formatNow, type AgentProfile } from "./system-prompt"

const profile: AgentProfile = {
  tenantId: "t",
  businessName: "Salonul Ana",
  vertical: "salon",
  address: "Str. Exemplului 12, Cluj-Napoca",
  timezone: "Europe/Bucharest",
  agentName: "Clara",
  tone: "friendly",
  addressForm: "dumneavoastra",
  greeting: "Bună ziua!",
  extraInstructions: "Întreabă cât de lung e părul.",
  forbidden: "sfaturi medicale.",
  handoffRules: null,
  humanHours: "luni–vineri, 9:00–17:00",
  handoffPhone: "+40700000001",
  emailSignature: null,
  requiredFields: ["nume", "telefon", "lungimea părului"],
  cancellationPolicy: "Anularea e gratuită cu 24 de ore înainte.",
  cancellationNoticeHours: 24,
  maxGroupSize: 3,
}
const NOW = new Date("2026-11-07T21:40:00Z")

describe("renderTemplate", () => {
  it("completează variabilele", () => {
    expect(renderTemplate("Salut, {{nume}}!", { nume: "Ana" })).toBe("Salut, Ana!")
  })
  it("refuză un prompt cu variabile lipsă sau goale", () => {
    expect(() => renderTemplate("{{a}} {{b}}", { a: "x", b: " " })).toThrow(/b/)
  })
})

describe("buildSystemPrompt", () => {
  it.each(["phone", "whatsapp", "email"] as const)("nu lasă nicio variabilă necompletată (%s)", (channel) => {
    const prompt = buildSystemPrompt(profile, channel, { callerNumber: "+40722000001", customerPhone: "+40722000001" }, NOW)
    expect(prompt).not.toMatch(/\{\{|\}\}/)
    expect(prompt).toContain("Ești Clara, asistentul virtual al Salonul Ana (salon de înfrumusețare, Cluj-Napoca)")
  })

  it("folosește fusul orar al firmei pentru ora curentă", () => {
    expect(formatNow(NOW, "Europe/Bucharest")).toBe("sâmbătă, 7 noiembrie 2026 la 23:40")
    expect(buildSystemPrompt(profile, "whatsapp", {}, NOW)).toContain("23:40 (Europe/Bucharest)")
  })

  it("pune datele cerute în plus și limita de grup", () => {
    const prompt = buildSystemPrompt(profile, "whatsapp", {}, NOW)
    expect(prompt).toContain("Ceri doar datele necesare: nume, telefon, lungimea părului.")
    expect(prompt).toContain("depășește 3 persoane")
  })

  it("adaugă completarea canalului", () => {
    expect(buildSystemPrompt(profile, "phone", { callerNumber: "+40722000001" }, NOW)).toContain(
      "Numărul apelantului este +40722000001."
    )
    expect(buildSystemPrompt(profile, "email", {}, NOW)).toContain("semnătura Clara, asistentul virtual al Salonul Ana")
    expect(buildSystemPrompt(profile, "whatsapp", {}, NOW)).toContain("necunoscut (cere-l clientului)")
  })
})
