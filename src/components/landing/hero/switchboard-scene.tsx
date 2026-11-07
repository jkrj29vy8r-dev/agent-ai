"use client"

import { ContactShadows, RoundedBox } from "@react-three/drei"
import { Canvas, useFrame, useThree, type RootState } from "@react-three/fiber"
import { useEffect, useMemo, useRef, useState, type RefObject } from "react"
import {
  CanvasTexture,
  CatmullRomCurve3,
  Color,
  Euler,
  Group,
  MathUtils,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  PointLight,
  Quaternion,
  SRGBColorSpace,
  TubeGeometry,
  Vector3,
} from "three"

import type { Channel } from "@/lib/channels"

import { phaseAt, TIMELINE, type Phase, type Scenario } from "./scenarios"
import type { SceneColors } from "./scene-colors"
import {
  agendaLeftTexture,
  agendaRightTexture,
  plateTexture,
  screenTexture,
} from "./scene-textures"

/* ────────────────────────────────────────────────────────────────────────
   Geometria. Unități ≈ metri. Panoul e desenat în coordonatele lui, apoi
   așezat în scenă cu PANEL_POS / PANEL_ROT. Totul e procedural: niciun
   model descărcat.
   ──────────────────────────────────────────────────────────────────────── */

const PANEL = { w: 3, h: 2, d: 0.14 }
const FACE = PANEL.d / 2
const PANEL_POS = new Vector3(-0.62, 0.12, 0)
const PANEL_ROT = new Euler(-0.06, 0.17, 0)
const GROUND_Y = -1

const COLUMN_X: Record<Channel, number> = { phone: -1, whatsapp: 0, email: 1 }
const ROW = { plate: 0.72, lamp: 0.47, jack: 0.2 }
const AGENT = { x: 0.8, y: -0.38 }
const SCREEN = { x: -0.42, y: -0.5, w: 1.42, h: 0.47 }
const CHANNEL_LABEL: Record<Channel, string> = { phone: "Telefon", whatsapp: "WhatsApp", email: "E-mail" }

const AGENDA_POS = new Vector3(1.98, -0.62, 0.78)
const AGENDA_ROT = new Euler(0.95, -0.36, 0, "YXZ")

const MAX_TILT = MathUtils.degToRad(6)
const SETTLE = 0.9 // cât mai „respiră” cablul după ce a intrat în mufă

const panelMatrix = new Matrix4().compose(PANEL_POS, new Quaternion().setFromEuler(PANEL_ROT), new Vector3(1, 1, 1))
const agendaMatrix = new Matrix4().compose(AGENDA_POS, new Quaternion().setFromEuler(AGENDA_ROT), new Vector3(1, 1, 1))
const fromPanel = (x: number, y: number, z: number) => new Vector3(x, y, z).applyMatrix4(panelMatrix)
const fromAgenda = (x: number, y: number, z: number) => new Vector3(x, y, z).applyMatrix4(agendaMatrix)
const PANEL_NORMAL = new Vector3(0, 0, 1).applyEuler(PANEL_ROT).normalize()

const JACK: Record<Channel | "agent", Vector3> = {
  phone: fromPanel(COLUMN_X.phone, ROW.jack, FACE + 0.04),
  whatsapp: fromPanel(COLUMN_X.whatsapp, ROW.jack, FACE + 0.04),
  email: fromPanel(COLUMN_X.email, ROW.jack, FACE + 0.04),
  agent: fromPanel(AGENT.x, AGENT.y, FACE + 0.04),
}
const AGENDA_CLIP = fromAgenda(-0.74, 0.04, -0.22)
const AGENDA_NORMAL = new Vector3(-0.35, 0.6, 1).normalize()

/* ──────────────────────────────────────────────────────────────────────── */

type Mode = "play" | "initial" | "final"

/** Ceasul secvenței, comun tuturor pieselor. */
type SequenceClock = { t0: number | null; mode: Mode }

function sequenceTime(clock: SequenceClock, state: RootState) {
  if (clock.mode === "initial") return 0
  if (clock.mode === "final") return TIMELINE.end + SETTLE + 1
  if (clock.t0 === null) clock.t0 = state.clock.elapsedTime
  return state.clock.elapsedTime - clock.t0
}

const easeInOut = (u: number) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2)

/* ── Cablul: o frânghie cu greutate între o mufă și fișa purtată spre țintă ── */

function Cord({
  clock,
  color,
  from,
  to,
  normal,
  startAt,
  endAt,
}: {
  clock: RefObject<SequenceClock>
  color: string
  from: Vector3
  to: Vector3
  normal: Vector3
  startAt: number
  endAt: number
}) {
  const tube = useRef<Mesh>(null)
  const plug = useRef<Group>(null)
  const material = useMemo(() => new MeshStandardMaterial({ roughness: 0.62, metalness: 0 }), [])
  const plugMaterial = useMemo(() => new MeshStandardMaterial({ roughness: 0.5, metalness: 0 }), [])
  // Lungimea cablului e fixă; cât e de întins depinde de cât de departe e fișa.
  const length = useMemo(() => from.distanceTo(to) * 1.16 + 0.32, [from, to])
  const lastKey = useRef("")

  useEffect(() => {
    material.color.set(color)
    plugMaterial.color.set(color).multiplyScalar(0.82)
    lastKey.current = ""
  }, [color, material, plugMaterial])

  useEffect(
    () => () => {
      tube.current?.geometry.dispose()
      material.dispose()
      plugMaterial.dispose()
    },
    [material, plugMaterial]
  )

  useFrame((state) => {
    const t = sequenceTime(clock.current, state)
    const visible = t >= startAt
    if (tube.current) tube.current.visible = visible
    if (plug.current) plug.current.visible = visible
    if (!visible || !tube.current || !plug.current) return

    // Nu reconstruim geometria când cablul s-a liniștit.
    const settled = t > endAt + SETTLE
    const key = settled ? "settled" : String(t)
    if (key === lastKey.current) return
    lastKey.current = key

    const u = easeInOut(MathUtils.clamp((t - startAt) / (endAt - startAt), 0, 1))
    const lift = Math.sin(Math.PI * u)
    const end = new Vector3()
      .lerpVectors(from, to, u)
      .addScaledVector(normal, 0.55 * lift)
      .add(new Vector3(0, 0.18 * lift, 0))

    const since = t - endAt
    const wobble = since > 0 && !settled ? 0.11 * Math.exp(-since * 5) * Math.sin(since * 15) : 0
    const sag = Math.max(0.05, (length - from.distanceTo(end)) * 0.55) + wobble

    const points: Vector3[] = []
    const steps = 22
    for (let i = 0; i <= steps; i++) {
      const k = i / steps
      const bell = 4 * k * (1 - k)
      points.push(
        new Vector3()
          .lerpVectors(from, end, k)
          .add(new Vector3(0, -sag * bell, 0))
          .addScaledVector(normal, 0.16 * bell)
      )
    }
    // Capetele ies perpendicular din mufă, ca un cablu real.
    points.splice(1, 0, from.clone().addScaledVector(normal, 0.1))
    points.splice(points.length - 1, 0, end.clone().addScaledVector(u >= 1 ? normal : normal.clone().multiplyScalar(0.6), 0.1))

    const curve = new CatmullRomCurve3(points, false, "centripetal")
    tube.current.geometry.dispose()
    tube.current.geometry = new TubeGeometry(curve, 64, 0.022, 8, false)

    const tangent = curve.getTangentAt(1)
    plug.current.position.copy(end)
    plug.current.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), tangent.negate())
  })

  return (
    <>
      <mesh ref={tube} material={material} visible={false} />
      {/* fișa de la capătul purtat */}
      <group ref={plug} visible={false}>
        <mesh material={plugMaterial} position={[0, 0.06, 0]}>
          <cylinderGeometry args={[0.042, 0.036, 0.12, 20]} />
        </mesh>
      </group>
      {/* fișa care rămâne în mufa de pornire */}
      <StartPlug clock={clock} at={from} normal={normal} startAt={startAt} material={plugMaterial} />
    </>
  )
}

function StartPlug({
  clock,
  at,
  normal,
  startAt,
  material,
}: {
  clock: RefObject<SequenceClock>
  at: Vector3
  normal: Vector3
  startAt: number
  material: MeshStandardMaterial
}) {
  const ref = useRef<Mesh>(null)
  const quaternion = useMemo(() => new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), normal), [normal])
  const position = useMemo(() => at.clone().addScaledVector(normal, 0.05), [at, normal])
  useFrame((state) => {
    if (ref.current) ref.current.visible = sequenceTime(clock.current, state) >= startAt
  })
  return (
    <mesh ref={ref} material={material} position={position} quaternion={quaternion} visible={false}>
      <cylinderGeometry args={[0.042, 0.042, 0.1, 20]} />
    </mesh>
  )
}

/* ── Lampa de semnal ─────────────────────────────────────────────────────── */

function SignalLamp({
  clock,
  x,
  lit,
  colors,
  halo,
}: {
  clock: RefObject<SequenceClock>
  x: number
  lit: boolean
  colors: SceneColors
  halo: CanvasTexture
}) {
  const lens = useRef<MeshStandardMaterial>(null)
  const glow = useRef<Mesh>(null)
  const light = useRef<PointLight>(null)
  const off = useMemo(() => new Color(colors.lampOff), [colors.lampOff])
  const on = useMemo(() => new Color(colors.lamp), [colors.lamp])

  useFrame((state) => {
    const t = sequenceTime(clock.current, state)
    // Se aprinde o dată, în 150ms, și rămâne aprinsă. Nu pulsează.
    const k = lit ? MathUtils.clamp((t - TIMELINE.ring) / 0.15, 0, 1) : 0
    const warm = lit ? MathUtils.clamp((t - TIMELINE.ring) / 0.4, 0, 1) : 0
    if (lens.current) {
      lens.current.color.lerpColors(off, on, k)
      lens.current.emissive.copy(on)
      lens.current.emissiveIntensity = 0.85 * k
    }
    if (glow.current) {
      glow.current.visible = k > 0
      ;(glow.current.material as MeshStandardMaterial).opacity = 0.75 * k
    }
    if (light.current) light.current.intensity = 0.16 * warm
  })

  return (
    <group position={[x, ROW.lamp, FACE]}>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.012]}>
        <cylinderGeometry args={[0.088, 0.088, 0.024, 32]} />
        <meshStandardMaterial color={colors.lampRing} roughness={0.7} />
      </mesh>
      <mesh position={[0, 0, 0.03]} scale={[1, 1, 0.55]}>
        <sphereGeometry args={[0.064, 32, 16]} />
        <meshStandardMaterial ref={lens} color={colors.lampOff} roughness={0.55} />
      </mesh>
      <mesh ref={glow} position={[0, 0, 0.026]} visible={false}>
        <planeGeometry args={[0.42, 0.42]} />
        <meshBasicMaterial map={halo} transparent depthWrite={false} opacity={0} />
      </mesh>
      {/* Mereu montată (intensitate 0 cât e stinsă), ca schimbarea clientului
          să nu recompileze shaderele. */}
      <pointLight ref={light} position={[0, 0, 0.42]} color={colors.lamp} intensity={0} distance={2.4} decay={2} />    </group>
  )
}

/* ── Piese statice ───────────────────────────────────────────────────────── */

function Plate({ x, y, texture, colors }: { x: number; y: number; texture: CanvasTexture; colors: SceneColors }) {
  return (
    <group position={[x, y, FACE]}>
      <mesh position={[0, 0, 0.008]}>
        <boxGeometry args={[0.62, 0.155, 0.016]} />
        <meshStandardMaterial color={colors.brass} roughness={0.6} metalness={0.12} />
      </mesh>
      <mesh position={[0, 0, 0.0165]}>
        <planeGeometry args={[0.6, 0.15]} />
        <meshStandardMaterial map={texture} roughness={0.6} metalness={0.12} />
      </mesh>
    </group>
  )
}

function Jack({ x, y, ring, hole, big = false }: { x: number; y: number; ring: string; hole: string; big?: boolean }) {
  const r = big ? 0.17 : 0.105
  return (
    <group position={[x, y, FACE]} rotation={[Math.PI / 2, 0, 0]}>
      <mesh position={[0, 0.02, 0]}>
        <cylinderGeometry args={[r, r, 0.04, 40]} />
        <meshStandardMaterial color={ring} roughness={0.55} />
      </mesh>
      <mesh position={[0, 0.026, 0]}>
        <cylinderGeometry args={[r * 0.48, r * 0.48, 0.04, 32]} />
        <meshStandardMaterial color={hole} roughness={0.9} />
      </mesh>
    </group>
  )
}

function haloTexture(color: string) {
  const el = document.createElement("canvas")
  el.width = el.height = 128
  const ctx = el.getContext("2d")!
  const g = ctx.createRadialGradient(64, 64, 8, 64, 64, 64)
  g.addColorStop(0, color)
  g.addColorStop(1, "transparent")
  ctx.globalAlpha = 0.5
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 128, 128)
  const texture = new CanvasTexture(el)
  texture.colorSpace = SRGBColorSpace
  return texture
}

/* ── Scena ───────────────────────────────────────────────────────────────── */

const SCREEN_STATUS: Record<Phase, (s: Scenario) => string> = {
  idle: () => "așteaptă clienți",
  ring: (s) => s.incoming,
  search: () => "caută locuri libere",
  hold: (s) => s.hold,
  booked: () => "programare făcută",
}

function Switchboard({
  scenario,
  runId,
  mode,
  colors,
  fontFamily,
  onPhase,
  onReady,
}: SceneProps) {
  const clock = useRef<SequenceClock>({ t0: null, mode })
  const root = useRef<Group>(null)
  const pointer = useRef({ x: 0, y: 0 })
  const ready = useRef(false)
  const lastPhase = useRef<Phase | null>(null)
  const [phase, setPhase] = useState<Phase>(mode === "final" ? "booked" : "idle")
  const invalidate = useThree((s) => s.invalidate)

  // Fiecare rulare (sau client nou) pornește ceasul de la zero.
  useEffect(() => {
    clock.current = { t0: null, mode }
    lastPhase.current = null
    invalidate()
  }, [runId, mode, scenario, invalidate])

  // Panoul urmărește mouse-ul, cu cel mult 6 grade. Fără rotire automată.
  useEffect(() => {
    const move = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return
      pointer.current = {
        x: MathUtils.clamp((e.clientX / window.innerWidth) * 2 - 1, -1, 1),
        y: MathUtils.clamp((e.clientY / window.innerHeight) * 2 - 1, -1, 1),
      }
      invalidate()
    }
    window.addEventListener("pointermove", move, { passive: true })
    return () => window.removeEventListener("pointermove", move)
  }, [invalidate])

  useFrame((state) => {
    const t = sequenceTime(clock.current, state)
    const p = phaseAt(t)
    if (p !== lastPhase.current) {
      lastPhase.current = p
      setPhase(p)
      onPhase(p)
    }

    let moving = false
    if (root.current) {
      const ty = pointer.current.x * MAX_TILT
      const tx = pointer.current.y * MAX_TILT * 0.6
      const r = root.current.rotation
      r.y = MathUtils.lerp(r.y, ty, 0.08)
      r.x = MathUtils.lerp(r.x, tx, 0.08)
      moving = Math.abs(r.y - ty) > 1e-4 || Math.abs(r.x - tx) > 1e-4
    }

    // Randăm doar cât se mișcă ceva; apoi panoul stă și nu consumă baterie.
    if (clock.current.mode === "play" && t < TIMELINE.end + SETTLE + 0.2) moving = true
    if (moving) state.invalidate()

    if (!ready.current) {
      ready.current = true
      requestAnimationFrame(() => requestAnimationFrame(onReady))
    }
  })

  const textures = useMemo(() => {
    const plates = {
      phone: plateTexture(CHANNEL_LABEL.phone, colors, fontFamily),
      whatsapp: plateTexture(CHANNEL_LABEL.whatsapp, colors, fontFamily),
      email: plateTexture(CHANNEL_LABEL.email, colors, fontFamily),
      agent: plateTexture("Agent", colors, fontFamily),
    }
    return { plates, halo: haloTexture(colors.lamp), left: agendaLeftTexture(scenario, colors, fontFamily) }
  }, [colors, fontFamily, scenario])

  const screen = useMemo(
    () => screenTexture(SCREEN_STATUS[phase](scenario), phase !== "idle" && phase !== "booked", colors, fontFamily),
    [phase, scenario, colors, fontFamily]
  )
  const right = useMemo(
    () => agendaRightTexture(scenario, phase === "booked", colors, fontFamily),
    [phase, scenario, colors, fontFamily]
  )

  useEffect(
    () => () => {
      Object.values(textures.plates).forEach((t) => t.dispose())
      textures.halo.dispose()
      textures.left.dispose()
    },
    [textures]
  )
  useEffect(() => () => screen.dispose(), [screen])
  useEffect(() => () => right.dispose(), [right])

  const channelColor = colors[scenario.channel]

  return (
    <group ref={root}>
      {/* ── panoul ── */}
      <group position={PANEL_POS} rotation={PANEL_ROT}>
        <RoundedBox args={[PANEL.w + 0.08, PANEL.h + 0.08, PANEL.d - 0.03]} radius={0.05} position={[0, 0, -0.02]}>
          <meshStandardMaterial color={colors.rim} roughness={0.85} />
        </RoundedBox>
        <RoundedBox args={[PANEL.w, PANEL.h, PANEL.d]} radius={0.04} smoothness={3}>
          <meshStandardMaterial color={colors.panel} roughness={0.92} />
        </RoundedBox>

        {/* șuruburile din colțuri */}
        {[
          [-1.4, 0.9],
          [1.4, 0.9],
          [-1.4, -0.9],
          [1.4, -0.9],
        ].map(([x, y]) => (
          <mesh key={`${x}${y}`} position={[x, y, FACE + 0.006]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.032, 0.032, 0.012, 20]} />
            <meshStandardMaterial color={colors.brass} roughness={0.6} metalness={0.12} />
          </mesh>
        ))}

        {/* cele trei canale */}
        {(Object.keys(COLUMN_X) as Channel[]).map((ch) => (
          <group key={ch}>
            <Plate x={COLUMN_X[ch]} y={ROW.plate} texture={textures.plates[ch]} colors={colors} />
            <SignalLamp
              clock={clock}
              x={COLUMN_X[ch]}
              lit={mode !== "initial" && ch === scenario.channel}
              colors={colors}
              halo={textures.halo}
            />
            <Jack x={COLUMN_X[ch]} y={ROW.jack} ring={colors[ch]} hole={colors.screen} />
          </group>
        ))}

        {/* agentul: mufa mare, plăcuța și ecranul */}
        <Jack x={AGENT.x} y={AGENT.y} ring={colors.bakelite} hole={colors.screen} big />
        <Plate x={AGENT.x} y={-0.8} texture={textures.plates.agent} colors={colors} />
        <group position={[SCREEN.x, SCREEN.y, FACE]}>
          <RoundedBox args={[SCREEN.w + 0.08, SCREEN.h + 0.08, 0.03]} radius={0.012} position={[0, 0, 0.012]}>
            <meshStandardMaterial color={colors.rim} roughness={0.85} />
          </RoundedBox>
          <mesh position={[0, 0, 0.028]}>
            <planeGeometry args={[SCREEN.w, SCREEN.h]} />
            <meshStandardMaterial map={screen} roughness={0.75} emissive={colors.screenText} emissiveIntensity={0} />
          </mesh>
        </group>

        {/* picioarele de bachelită */}
        {[-1.1, 1.1].map((x) => (
          <mesh key={x} position={[x, -PANEL.h / 2 - 0.06, 0]}>
            <boxGeometry args={[0.26, 0.12, 0.34]} />
            <meshStandardMaterial color={colors.bakelite} roughness={0.6} />
          </mesh>
        ))}
      </group>

      {/* ── agenda deschisă ── */}
      <group position={AGENDA_POS} rotation={AGENDA_ROT}>
        <RoundedBox args={[1.38, 0.05, 0.96]} radius={0.02}>
          <meshStandardMaterial color={colors.bakelite} roughness={0.7} />
        </RoundedBox>
        {[
          { x: -0.335, rz: 0.05, map: textures.left },
          { x: 0.335, rz: -0.05, map: right },
        ].map(({ x, rz, map }) => (
          <group key={x} position={[x, 0.045, 0]} rotation={[0, 0, rz]}>
            <mesh>
              <boxGeometry args={[0.64, 0.04, 0.9]} />
              <meshStandardMaterial color={colors.paper} roughness={0.95} />
            </mesh>
            <mesh position={[0, 0.0205, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[0.62, 0.86]} />
              <meshStandardMaterial map={map} roughness={0.95} />
            </mesh>
          </group>
        ))}
        {/* clema de alamă în care intră cablul */}
        <mesh position={[-0.72, 0.03, -0.22]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.05, 0.05, 0.14, 24]} />
          <meshStandardMaterial color={colors.brass} roughness={0.6} metalness={0.12} />
        </mesh>
      </group>

      {/* ── cablurile ── */}
      {mode !== "initial" && (
        <>
          <Cord
            key={`a-${runId}-${scenario.id}`}
            clock={clock}
            color={channelColor}
            from={JACK[scenario.channel]}
            to={JACK.agent}
            normal={PANEL_NORMAL}
            startAt={TIMELINE.cable1Start}
            endAt={TIMELINE.cable1End}
          />
          <Cord
            key={`b-${runId}-${scenario.id}`}
            clock={clock}
            color={channelColor}
            from={JACK.agent}
            to={AGENDA_CLIP}
            normal={AGENDA_NORMAL}
            startAt={TIMELINE.cable2Start}
            endAt={TIMELINE.cable2End}
          />
        </>
      )}

      <ContactShadows
        position={[0.2, GROUND_Y, 0.2]}
        scale={8}
        blur={2.6}
        far={1.6}
        opacity={0.38}
        resolution={512}
        color={colors.shadow}
      />
    </group>
  )
}

/* ── Canvas ──────────────────────────────────────────────────────────────── */

export type SceneProps = {
  scenario: Scenario
  runId: number
  mode: Mode
  colors: SceneColors
  fontFamily: string
  onPhase: (phase: Phase) => void
  onReady: () => void
}

export type SwitchboardSceneProps = SceneProps & { onError: () => void }

export default function SwitchboardScene({ onError, ...props }: SwitchboardSceneProps) {
  return (
    <Canvas
      flat
      frameloop="demand"
      dpr={[1, 1.75]}
      camera={{ position: [0.32, 0.5, 6.5], fov: 30, near: 0.1, far: 40 }}
      gl={{ antialias: true, alpha: true, powerPreference: "low-power", preserveDrawingBuffer: false }}
      onCreated={({ camera, gl }) => {
        camera.lookAt(0.34, -0.02, 0.2)
        gl.domElement.addEventListener("webglcontextlost", onError, { once: true })
      }}
      aria-hidden
    >
      <hemisphereLight args={[props.colors.paper, props.colors.shadow, 0.62]} />
      <directionalLight position={[-3, 4.5, 5]} intensity={0.62} />
      <directionalLight position={[4, 1, 3]} intensity={0.12} />
      <Switchboard {...props} />
    </Canvas>
  )
}
