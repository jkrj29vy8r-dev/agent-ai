"use client"

import { Check, UserRoundPlus } from "lucide-react"
import dynamic from "next/dynamic"
import Image from "next/image"
import { useTheme } from "next-themes"
import { Component, useEffect, useState, useSyncExternalStore, type ReactNode } from "react"

import { Lamp } from "@/components/centrala/lamp"
import { Plug } from "@/components/centrala/plug"
import { Button } from "@/components/ui/button"
import { CHANNELS } from "@/lib/channels"
import { cn } from "@/lib/utils"

import { readFontFamily, readSceneColors, type SceneColors } from "./scene-colors"
import { SCENARIOS, type Phase, type Scenario } from "./scenarios"

// Three.js ajunge în browser doar după ce textul paginii e afișat.
const SwitchboardScene = dynamic(() => import("./switchboard-scene"), { ssr: false })

/* ── Ce afișăm: panoul 3D sau imaginea statică ───────────────────────────── */

type Mode = "pending" | "static" | "play" | "initial" | "final"

/**
 * Imaginea statică (starea finală) apare cu prefers-reduced-motion, fără
 * WebGL, cu Save-Data și pe ecrane sub 768px fără WebGL bun sau pe telefoane
 * slabe. `?panou=static|3d|initial|final` forțează un mod (QA și scriptul
 * care generează imaginile statice).
 */
function detectMode(): Exclude<Mode, "pending"> {
  const forced = new URLSearchParams(window.location.search).get("panou")
  if (forced === "static" || forced === "initial" || forced === "final") return forced
  if (forced === "3d") return "play"

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return "static"
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } }
  if (nav.connection?.saveData) return "static"

  const probe = document.createElement("canvas")
  const strong = probe.getContext("webgl2", { failIfMajorPerformanceCaveat: true })
  const any = strong ?? probe.getContext("webgl")
  if (!any) return "static"
  any.getExtension("WEBGL_lose_context")?.loseContext()

  const weakDevice = (nav.deviceMemory ?? 8) < 4 || (navigator.hardwareConcurrency ?? 8) < 4
  const small = window.innerWidth < 768
  if (small && (!strong || weakDevice)) return "static"
  if (!strong && weakDevice) return "static"
  return "play"
}

let cachedMode: Exclude<Mode, "pending"> | null = null
const noSubscribe = () => () => {}
const getMode = () => (cachedMode ??= detectMode())
const getServerMode = (): Mode => "pending"

/** `?client=1` pornește de la alt client (pentru scriptul de captură). */
function getStartIndex() {
  const n = Number(new URLSearchParams(window.location.search).get("client"))
  return Number.isInteger(n) && n >= 0 && n < SCENARIOS.length ? n : 0
}
const getServerStartIndex = () => 0

/** Dacă WebGL cade, rămânem la imaginea statică. */
class SceneBoundary extends Component<{ onError: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch() {
    this.props.onError()
  }
  render() {
    return this.state.failed ? null : this.props.children
  }
}

/* ── Textul secvenței ────────────────────────────────────────────────────── */

const ORDER: Phase[] = ["idle", "ring", "search", "hold", "booked"]
const reached = (phase: Phase, step: Phase) => ORDER.indexOf(phase) >= ORDER.indexOf(step)
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

const CABLE_NAME = { phone: "roșu", whatsapp: "albastru", email: "grafit" } as const

function describe(s: Scenario) {
  const channel = CHANNELS[s.channel].label
  return (
    `Panoul centralei. Lampa ${channel} se aprinde la ${s.receivedAt}. ` +
    `Un cablu ${CABLE_NAME[s.channel]} leagă clientul de agent, care caută locuri libere ` +
    `și ${s.hold}. Un al doilea cablu duce la agendă, unde apare programarea: ${s.booking}.`
  )
}

/* ── Componenta ──────────────────────────────────────────────────────────── */

export function HeroVisual() {
  const detected = useSyncExternalStore(noSubscribe, getMode, getServerMode)
  const [failed, setFailed] = useState(false)
  const mode: Mode = failed ? "static" : detected
  const uses3d = mode === "play" || mode === "initial" || mode === "final"

  const startIndex = useSyncExternalStore(noSubscribe, getStartIndex, getServerStartIndex)
  const [offset, setOffset] = useState(0)
  const index = (startIndex + offset) % SCENARIOS.length
  const [runId, setRunId] = useState(0)
  const [phase, setPhase] = useState<Phase>("idle")
  const [load3d, setLoad3d] = useState(false)
  const [sceneReady, setSceneReady] = useState(false)
  const [colors, setColors] = useState<SceneColors | null>(null)
  const [fontFamily, setFontFamily] = useState<string | null>(null)
  const { resolvedTheme } = useTheme()

  const scenario = SCENARIOS[index]
  const shownPhase: Phase =
    mode === "static" || mode === "final" ? "booked" : mode === "pending" || mode === "initial" ? "idle" : phase

  // Scena se încarcă după ce browserul a terminat cu textul, cu fontul gata.
  useEffect(() => {
    if (!uses3d) return
    let cancelled = false
    const start = async () => {
      const family = readFontFamily()
      await document.fonts.load(`700 40px ${family}`).catch(() => undefined)
      if (!cancelled) {
        setFontFamily(family)
        setLoad3d(true)
      }
    }
    const idle = window.requestIdleCallback?.(start, { timeout: 1200 }) ?? window.setTimeout(start, 200)
    return () => {
      cancelled = true
      if (window.cancelIdleCallback) window.cancelIdleCallback(idle)
      else window.clearTimeout(idle)
    }
  }, [uses3d])

  // Culorile scenei vin din tokeni; le recitim când se schimbă tema.
  useEffect(() => {
    if (!uses3d) return
    const raf = requestAnimationFrame(() => setColors(readSceneColors()))
    return () => cancelAnimationFrame(raf)
  }, [uses3d, resolvedTheme])

  function nextClient() {
    setOffset((o) => o + 1)
    setRunId((r) => r + 1)
    setPhase("idle")
  }

  // Imaginea: starea finală în modul static, starea de așteptare cât se
  // încarcă panoul 3D (prima lui imagine e identică, deci nu sare nimic).
  const still = mode === "static" ? `panou-${scenario.id}` : "panou-asteapta"
  const showStill = !uses3d || !sceneReady

  return (
    <div className="flex flex-col gap-4">
      <div
        data-hero-stage
        data-scene-ready={sceneReady}
        role="img"
        aria-label={describe(scenario)}
        className="relative aspect-16/10 w-full"
      >
        {showStill && (
          <>
            <Image
              src={`/hero/${still}-zi.webp`}
              alt=""
              fill
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="object-contain dark:hidden"
            />
            <Image
              src={`/hero/${still}-noapte.webp`}
              alt=""
              fill
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="hidden object-contain dark:block"
            />
          </>
        )}

        {uses3d && load3d && colors && fontFamily && (
          <div
            className={cn(
              "absolute inset-0 transition-opacity duration-base ease-settle",
              sceneReady ? "opacity-100" : "opacity-0"
            )}
          >
            <SceneBoundary onError={() => setFailed(true)}>
              <SwitchboardScene
                scenario={scenario}
                runId={runId}
                mode={mode === "initial" || mode === "final" ? mode : "play"}
                colors={colors}
                fontFamily={fontFamily}
                onPhase={setPhase}
                onReady={() => setSceneReady(true)}
                onError={() => setFailed(true)}
              />
            </SceneBoundary>
          </div>
        )}
      </div>

      {/* Ce se întâmplă, ca text real: se citește și fără panou. */}
      <div className="surface-plate flex flex-col gap-4 rounded-panel p-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
        <ol className="flex min-w-0 flex-col gap-2.5 text-sm">
          <li className={cn("flex items-center gap-3 transition-opacity duration-fast", !reached(shownPhase, "ring") && "opacity-45")}>
            <Plug channel={scenario.channel} connected={reached(shownPhase, "ring")} className="size-4 border-[1.5px]" />
            <span>
              {capitalize(scenario.incoming)} la{" "}
              <span className="font-semibold text-heading">{scenario.receivedAt}</span>
            </span>
          </li>
          <li className={cn("flex items-center gap-3 transition-opacity duration-fast", !reached(shownPhase, "search") && "opacity-45")}>
            <Lamp
              lit={shownPhase === "search" || shownPhase === "hold"}
              label="Agentul lucrează acum"
              hideLabel
              className="w-4 justify-center"
            />
            <span>
              Caută locuri libere{reached(shownPhase, "hold") && <>, {scenario.hold}</>}
            </span>
          </li>
          <li
            className={cn(
              "flex items-start gap-3",
              reached(shownPhase, "booked") ? "animate-fade-in" : "opacity-0"
            )}
          >
            <span className="mt-0.5 grid size-4 shrink-0 place-items-center rounded-full bg-success text-success-foreground">
              <Check className="size-3" aria-hidden />
            </span>
            <span className="font-semibold text-heading">
              <span className="sr-only">Programare în agendă: </span>
              {scenario.booking}
            </span>
          </li>
        </ol>
        <Button variant="outline" size="sm" onClick={nextClient} className="self-start">
          <UserRoundPlus data-icon="inline-start" aria-hidden />
          Alt client
        </Button>
      </div>
    </div>
  )
}
