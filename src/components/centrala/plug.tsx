import { CHANNELS, type Channel } from "@/lib/channels"
import { cn } from "@/lib/utils"

type PlugProps = {
  channel: Channel
  /** Fișa e băgată în mufă: canalul e conectat. */
  connected?: boolean
  className?: string
}

/**
 * Mufa: cerc de 20px cu bordură de 2px în culoarea canalului și o gaură
 * adâncită la mijloc. Când canalul e conectat, fișa (plină) stă în gaură.
 * Decorativă: starea se spune în text de componenta care o folosește.
 */
export function Plug({ channel, connected = false, className }: PlugProps) {
  const c = CHANNELS[channel]
  return (
    <span
      aria-hidden
      data-slot="plug"
      data-channel={channel}
      data-connected={connected}
      className={cn(
        "relative inline-grid size-5 shrink-0 place-items-center rounded-full border-2 bg-panel-sunken shadow-socket",
        c.border,
        className
      )}
    >
      <span
        className={cn(
          "size-2 rounded-full",
          connected ? cn("animate-plug-seat", c.bg) : "bg-background shadow-socket"
        )}
      />
    </span>
  )
}
