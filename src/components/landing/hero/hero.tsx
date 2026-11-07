import Link from "next/link"

import { Button } from "@/components/ui/button"

import { HeroVisual } from "./hero-visual"

export function Hero() {
  return (
    <section
      aria-labelledby="hero-titlu"
      className="page grid items-center gap-x-12 gap-y-10 pt-10 pb-section lg:grid-cols-12 lg:pt-16"
    >
      <div className="lg:col-span-5">
        <h1 id="hero-titlu" className="text-4xl sm:text-5xl lg:text-6xl">
          Răspunde la fiecare client, chiar și la 23:40.
        </h1>
        <p className="mt-6 max-w-measure text-lg">
          Centrala preia apelurile, mesajele pe WhatsApp și e-mailurile firmei tale, verifică
          programul și face programarea. Dimineața găsești totul în agendă.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link href="#pilot">Înscrie-te în pilot</Link>
          </Button>
          <Button asChild size="lg" variant="secondary">
            <Link href="#pas-cu-pas">Vezi cum lucrează</Link>
          </Button>
        </div>
      </div>

      <div className="min-w-0 lg:col-span-7">
        <HeroVisual />
      </div>
    </section>
  )
}
