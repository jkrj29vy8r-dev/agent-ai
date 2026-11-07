import { cn } from "@/lib/utils"

/**
 * Loc marcat pentru conținut care nu există încă ([PREȚ], [CONDIȚII PILOT],
 * [CONTACT]). Se vede intenționat, ca să nu ajungă în producție necompletat.
 */
export function Placeholder({ children, className }: { children: string; className?: string }) {
  return (
    <mark
      data-placeholder
      className={cn(
        "type-plate rounded-xs border border-dashed border-warning bg-transparent px-1.5 py-0.5 text-warning",
        className
      )}
    >
      {children}
    </mark>
  )
}
