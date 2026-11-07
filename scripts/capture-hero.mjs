#!/usr/bin/env node
/**
 * Generează imaginile statice ale panoului din hero (public/hero/*.webp),
 * din scena 3D reală:
 *   - panou-asteapta-{zi,noapte}: starea de dinainte de secvență, afișată
 *     cât se încarcă panoul 3D;
 *   - panou-<client>-{zi,noapte}: starea finală, pentru prefers-reduced-motion,
 *     telefoane slabe și browsere fără WebGL.
 *
 * Folosire: pornește site-ul (`npm run build && npm start`), apoi
 *   node scripts/capture-hero.mjs [http://localhost:3000]
 *
 * Rulează din nou după orice schimbare vizuală a panoului sau a tokenilor.
 */
import { mkdirSync } from "node:fs"
import { createRequire } from "node:module"
import { join } from "node:path"

const require = createRequire(import.meta.url)
const { chromium } = require("playwright")
const sharp = require("sharp")

const BASE = process.argv[2] ?? "http://localhost:3000"
const OUT = join(process.cwd(), "public", "hero")
const CLIENTS = ["frizerie", "service", "pensiune"] // ordinea din scenarios.ts
const THEMES = [
  { name: "zi", scheme: "light" },
  { name: "noapte", scheme: "dark" },
]

mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch({
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
})

async function capture(theme, query, file) {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 860 },
    deviceScaleFactor: 2,
    colorScheme: theme.scheme,
  })
  const page = await context.newPage()
  await page.goto(`${BASE}/?${query}`, { waitUntil: "networkidle" })
  await page.waitForSelector('[data-scene-ready="true"]', { timeout: 30_000 })
  await page.waitForTimeout(400)
  const png = await page.locator("[data-hero-stage]").screenshot()
  const info = await sharp(png).webp({ quality: 80, effort: 6 }).toFile(join(OUT, file))
  console.log(`${file}  ${info.width}×${info.height}  ${(info.size / 1024).toFixed(0)} KB`)
  await context.close()
}

for (const theme of THEMES) {
  await capture(theme, "panou=initial", `panou-asteapta-${theme.name}.webp`)
  for (const [i, client] of CLIENTS.entries()) {
    await capture(theme, `panou=final&client=${i}`, `panou-${client}-${theme.name}.webp`)
  }
}

await browser.close()
