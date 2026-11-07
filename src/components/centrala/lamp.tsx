import { cn } from "@/lib/utils"

type LampProps = {
  /** Aprinsă = „activ acum” (un apel în curs, un mesaj nou). Atât. */
  lit: boolean
  /** Starea e scrisă MEREU și în text lângă lampă, nu doar prin culoare. */
  label: string
  /** Ascunde textul vizual, dar îl păstrează pentru cititoarele de ecran. */
  hideLabel?: boolean
  className?: string
}

/**
 * Lampa de semnal: cerc de 12px cu inel de 1.5px. Stinsă e gri, aprinsă e
 * chihlimbar cu halo. Se aprinde o singură dată (150ms) și nu pulsează.
 */
export function Lamp({ lit, label, hideLabel = false, className }: LampProps) {
  return (
    <span
      data-slot="lamp"
      data-lit={lit}
      className={cn("inline-flex items-center gap-2", className)}
    >
      <span
        aria-hidden
        className={cn(
          "size-3 shrink-0 rounded-full border-[1.5px] border-lamp-ring",
          lit ? "animate-lamp-on bg-lamp shadow-lamp" : "bg-lamp-off"
        )}
      />
      <span className={cn("type-plate text-foreground", hideLabel && "sr-only")}>{label}</span>
    </span>
  )
}
