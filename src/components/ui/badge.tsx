import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

// Badge = Plăcuța din V1: fundal de panou, bordură subțire, text mic lărgit,
// cu literă mică. Se folosește pentru canale și stări, NU ca etichetă
// deasupra titlurilor.
const badgeVariants = cva(
  "group/badge type-plate inline-flex h-6 w-fit shrink-0 items-center justify-center gap-1.5 overflow-hidden rounded-control border px-2 whitespace-nowrap shadow-plate transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 [&>svg]:pointer-events-none [&>svg]:size-3.5!",
  {
    variants: {
      variant: {
        default: "border-border-strong bg-panel text-heading",
        outline: "border-border-strong bg-transparent text-foreground shadow-none",
        primary: "border-transparent bg-primary text-primary-foreground",
        success: "border-success/40 bg-panel text-success",
        warning: "border-warning/40 bg-panel text-warning",
        destructive: "border-destructive/40 bg-panel text-destructive",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
