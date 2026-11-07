import { describe, expect, it } from "vitest"

import { apiTools } from "./registry"

describe("uneltele pe canale", () => {
  it("dă fiecărui canal uneltele lui, în aceeași ordine de fiecare dată", () => {
    const names = (channel: "phone" | "whatsapp" | "email") => apiTools(channel).map((t) => t.name)
    expect(names("whatsapp")).toHaveLength(11)
    expect(names("phone")).toEqual(expect.arrayContaining(["transfer_call", "end_call"]))
    expect(names("phone")).not.toContain("classify_email")
    expect(names("email")).toContain("classify_email")
    expect(names("email")).not.toContain("end_call")
    expect(JSON.stringify(apiTools("phone"))).toBe(JSON.stringify(apiTools("phone"))) // prefix stabil pentru cache
  })

  it("generează scheme JSON de tip obiect, fără câmpul $schema", () => {
    for (const tool of apiTools("phone")) {
      expect(tool.input_schema.type).toBe("object")
      expect(tool.input_schema).not.toHaveProperty("$schema")
      expect(tool.description?.length).toBeGreaterThan(40)
    }
    const check = apiTools("whatsapp").find((t) => t.name === "check_availability")!
    expect(check.input_schema.required).toEqual(["service_id", "date_from"])
  })
})
