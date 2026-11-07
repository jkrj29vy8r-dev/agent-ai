"use client"

import { Monitor, Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { useSyncExternalStore } from "react"

import { cn } from "@/lib/utils"

const OPTIONS = [
  { value: "light", label: "Zi", icon: Sun },
  { value: "dark", label: "Noapte", icon: Moon },
  { value: "system", label: "Sistem", icon: Monitor },
] as const

const subscribe = () => () => {}

/** Comutatorul de temă: trei poziții, ca un comutator de panou. */
export function ThemeSwitch({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme()
  // Tema reală se știe doar în browser; pe server nu marcăm nicio poziție.
  const mounted = useSyncExternalStore(subscribe, () => true, () => false)

  return (
    <div
      role="radiogroup"
      aria-label="Tema"
      className={cn(
        "inline-flex items-center gap-0.5 rounded-control border border-border-strong bg-panel-sunken p-0.5 shadow-socket",
        className
      )}
    >
      {OPTIONS.map(({ value, label, icon: Icon }) => {
        const active = mounted && theme === value
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setTheme(value)}
            className={cn(
              "type-plate inline-flex h-8 items-center gap-1.5 rounded-xs px-2.5 text-muted-foreground transition-colors duration-fast ease-switch outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
              active ? "bg-panel text-heading shadow-plate" : "hover:text-heading"
            )}
          >
            <Icon className="size-3.5" aria-hidden />
            {label}
          </button>
        )
      })}
    </div>
  )
}
