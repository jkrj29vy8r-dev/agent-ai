import { describe, expect, it } from "vitest"

import { parseTstzRange } from "./range"

describe("parseTstzRange", () => {
  it("citește formatul Postgres", () => {
    expect(parseTstzRange('["2030-01-07 08:00:00+00","2030-01-07 09:00:00+00")')).toEqual({
      start: "2030-01-07T08:00:00Z",
      end: "2030-01-07T09:00:00Z",
    })
  })

  it("înțelege fracțiuni de secundă și offseturi cu minute", () => {
    expect(parseTstzRange('["2030-01-07 08:00:00.5+05:30","2030-01-07 09:00:00+02")')).toEqual({
      start: "2030-01-07T02:30:00.5Z",
      end: "2030-01-07T07:00:00Z",
    })
  })

  it("ignoră intervalele goale, fără capăt sau valorile greșite", () => {
    expect(parseTstzRange("empty")).toBeNull()
    expect(parseTstzRange('["2030-01-07 08:00:00+00",)')).toBeNull()
    expect(parseTstzRange(null)).toBeNull()
  })
})
