import { CHANNELS, type Channel } from "@/lib/channels"
import { cn } from "@/lib/utils"

type Point = { x: number; y: number }

type CableProps = {
  channel: Channel
  from: Point
  to: Point
  /** Cât de mult atârnă cablul între capete (în unitățile SVG-ului). */
  sag?: number
  /** Desenează cablul de la un capăt la altul o singură dată, la montare. */
  animate?: boolean
  className?: string
}

/**
 * Cablul: o curbă SVG de 3px în culoarea canalului, care atârnă ca un cablu
 * real între două mufe. Se pune într-un <svg> părinte.
 */
export function Cable({ channel, from, to, sag = 40, animate = false, className }: CableProps) {
  const lowY = Math.max(from.y, to.y) + sag
  const d = `M ${from.x} ${from.y} C ${from.x} ${lowY}, ${to.x} ${lowY}, ${to.x} ${to.y}`

  return (
    <path
      d={d}
      data-slot="cable"
      data-channel={channel}
      pathLength={1}
      fill="none"
      strokeWidth={3}
      strokeLinecap="round"
      strokeDasharray={animate ? 1 : undefined}
      className={cn(CHANNELS[channel].stroke, animate && "animate-cable-plug", className)}
    />
  )
}
