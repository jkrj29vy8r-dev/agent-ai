import { CanvasTexture, SRGBColorSpace } from "three"

import type { Scenario } from "./scenarios"
import type { SceneColors } from "./scene-colors"

/**
 * Textele de pe panou sunt desenate în Archivo pe un canvas 2D și puse ca
 * textură. Fac parte din scena 3D (iau lumină, sunt acoperite corect de
 * cabluri) și nu cer fonturi descărcate de pe alt server.
 */

type Ctx = CanvasRenderingContext2D & { fontStretch?: string }

function canvas(w: number, h: number) {
  const el = document.createElement("canvas")
  el.width = w
  el.height = h
  const ctx = el.getContext("2d") as Ctx
  return { el, ctx }
}

function setFont(ctx: Ctx, family: string, weight: number, px: number, stretch: "expanded" | "semi-expanded" | "normal") {
  ctx.font = `${weight} ${px}px ${family}`
  if ("fontStretch" in ctx) ctx.fontStretch = stretch
}

function toTexture(el: HTMLCanvasElement) {
  const texture = new CanvasTexture(el)
  texture.colorSpace = SRGBColorSpace
  texture.anisotropy = 4
  return texture
}

/** Plăcuța de alamă: literele gravate, lărgite. */
export function plateTexture(text: string, c: SceneColors, family: string) {
  const { el, ctx } = canvas(512, 128)
  ctx.fillStyle = c.brass
  ctx.fillRect(0, 0, 512, 128)
  ctx.strokeStyle = c.brassText
  ctx.globalAlpha = 0.35
  ctx.lineWidth = 3
  ctx.strokeRect(10, 10, 492, 108)
  ctx.globalAlpha = 1
  ctx.fillStyle = c.brassText
  setFont(ctx, family, 700, 54, "expanded")
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.fillText(text, 256, 68)
  return toTexture(el)
}

/** Ecranul agentului: o etichetă mică și starea curentă. */
export function screenTexture(
  status: string,
  active: boolean,
  c: SceneColors,
  family: string
) {
  const { el, ctx } = canvas(768, 256)
  ctx.fillStyle = c.screen
  ctx.fillRect(0, 0, 768, 256)

  ctx.fillStyle = c.screenText
  ctx.globalAlpha = 0.6
  setFont(ctx, family, 600, 30, "semi-expanded")
  ctx.textBaseline = "alphabetic"
  ctx.fillText("agentul", 44, 74)
  ctx.globalAlpha = 1

  let x = 44
  if (active) {
    // Punctul de lampă: „activ acum”
    ctx.fillStyle = c.lamp
    ctx.beginPath()
    ctx.arc(x + 13, 158, 13, 0, Math.PI * 2)
    ctx.fill()
    x += 44
  }
  ctx.fillStyle = c.screenText
  setFont(ctx, family, 600, 52, "normal")
  ctx.fillText(status, x, 176)
  return toTexture(el)
}

function check(ctx: Ctx, cx: number, cy: number, r: number, color: string, ink: string) {
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = ink
  ctx.lineWidth = r * 0.28
  ctx.lineCap = "round"
  ctx.lineJoin = "round"
  ctx.beginPath()
  ctx.moveTo(cx - r * 0.45, cy + r * 0.02)
  ctx.lineTo(cx - r * 0.1, cy + r * 0.38)
  ctx.lineTo(cx + r * 0.5, cy - r * 0.35)
  ctx.stroke()
}

/** Pagina din stânga a agendei: titlul și ziua. */
export function agendaLeftTexture(scenario: Scenario, c: SceneColors, family: string) {
  const { el, ctx } = canvas(512, 704)
  ctx.fillStyle = c.paper
  ctx.fillRect(0, 0, 512, 704)
  ctx.fillStyle = c.paperText
  setFont(ctx, family, 700, 58, "expanded")
  ctx.fillText("Agenda", 48, 120)
  ctx.globalAlpha = 0.65
  setFont(ctx, family, 500, 34, "normal")
  ctx.fillText(scenario.agenda.title, 48, 180)
  ctx.globalAlpha = 0.18
  ctx.fillStyle = c.paperText
  for (let y = 260; y < 680; y += 64) ctx.fillRect(48, y, 416, 3)
  ctx.globalAlpha = 1
  return toTexture(el)
}

/** Pagina din dreapta: rândurile zilei; cel nou apare cu bifă verde. */
export function agendaRightTexture(
  scenario: Scenario,
  booked: boolean,
  c: SceneColors,
  family: string
) {
  const { el, ctx } = canvas(512, 704)
  ctx.fillStyle = c.paper
  ctx.fillRect(0, 0, 512, 704)

  const rows = [...scenario.agenda.rows]
  const all = booked
    ? [...rows, { ...scenario.agenda.newRow, isNew: true }].sort((a, b) => a.time.localeCompare(b.time))
    : rows

  let y = 110
  for (const row of all) {
    const isNew = "isNew" in row
    if (isNew) {
      ctx.fillStyle = c.success
      ctx.globalAlpha = 0.16
      ctx.fillRect(24, y - 62, 464, 104)
      ctx.globalAlpha = 1
      check(ctx, 440, y - 10, 30, c.success, c.paper)
    }
    ctx.fillStyle = c.paperText
    setFont(ctx, family, 700, 40, "semi-expanded")
    ctx.fillText(row.time, 48, y)
    ctx.globalAlpha = 0.75
    setFont(ctx, family, 500, 30, "normal")
    ctx.fillText(row.text, 48, y + 28, isNew ? 360 : 420)
    ctx.globalAlpha = 0.18
    ctx.fillRect(48, y + 50, 416, 3)
    ctx.globalAlpha = 1
    y += 140
  }
  return toTexture(el)
}
