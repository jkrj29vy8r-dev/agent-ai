#!/usr/bin/env node
/**
 * Verifică regula „toate componentele folosesc tokenii de design”.
 *
 * Caută în src/ (în afară de src/app/globals.css, singurul loc cu valori
 * brute): culori hex/rgb/hsl/oklch, valori arbitrare de culoare, umbră,
 * rază sau font în clase Tailwind, paleta implicită Tailwind, gradienți și
 * emoji. O linie se poate excepta explicit cu comentariul `token-ok:` urmat
 * de motiv.
 */
import { readdirSync, readFileSync, statSync } from "node:fs"
import { join, relative } from "node:path"

const ROOT = process.cwd()
const SRC = join(ROOT, "src")
const EXEMPT_FILES = new Set(["src/app/globals.css"])
const EXTENSIONS = /\.(tsx?|css|mdx?)$/

const PALETTE =
  "slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|white|black"
const COLOR_UTILS =
  "bg|text|border|border-[trblxy]|ring|ring-offset|fill|stroke|from|via|to|outline|divide|decoration|shadow|accent|caret|placeholder"

const RULES = [
  {
    name: "culoare hex brută",
    re: /(?<![\w&])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3})(?![\w-])/g,
  },
  { name: "funcție de culoare brută", re: /\b(?:rgba?|hsla?|oklch|oklab|lab|lch)\(/g },
  {
    name: "valoare arbitrară de culoare",
    re: new RegExp(`\\b(?:${COLOR_UTILS})-\\[(?:#|rgb|hsl|oklch|oklab|color-mix|var\\()`, "g"),
  },
  { name: "umbră arbitrară", re: /\b(?:shadow|drop-shadow|inset-shadow)-\[/g },
  { name: "rază arbitrară", re: /\brounded(?:-[trblse]{1,2})?-\[/g },
  { name: "font arbitrar", re: /\bfont-\[/g },
  { name: "mărime de text arbitrară", re: /\btext-\[\d/g },
  { name: "paleta implicită Tailwind", re: new RegExp(`\\b(?:${COLOR_UTILS})-(?:${PALETTE})(?:-\\d{2,3})?\\b`, "g") },
  { name: "gradient", re: /\bbg-(?:gradient-to|linear|radial|conic)-/g },
  { name: "emoji (folosește iconițe Lucide)", re: /(?![©®™])\p{Extended_Pictographic}/gu },
]

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) walk(full, out)
    else if (EXTENSIONS.test(entry)) out.push(full)
  }
  return out
}

const problems = []
for (const file of walk(SRC)) {
  const rel = relative(ROOT, file).split("\\").join("/")
  if (EXEMPT_FILES.has(rel)) continue
  const lines = readFileSync(file, "utf8").split("\n")
  lines.forEach((line, i) => {
    if (line.includes("token-ok:")) return
    for (const rule of RULES) {
      for (const m of line.matchAll(rule.re)) {
        problems.push(`${rel}:${i + 1}  ${rule.name}: ${m[0]}`)
      }
    }
  })
}

if (problems.length) {
  console.error(`Tokeni de design: ${problems.length} problemă(e)\n`)
  console.error(problems.join("\n"))
  console.error(
    "\nFolosește tokenii din tailwind.config.ts / globals.css (ex. bg-primary, shadow-plate, rounded-panel)."
  )
  process.exit(1)
}
console.log("Tokeni de design: OK")
