import Link from "next/link"

import { Plug } from "@/components/centrala/plug"
import { Button } from "@/components/ui/button"

const NAV = [
  { href: "#pas-cu-pas", label: "Cum lucrează" },
  { href: "#pentru-cine", label: "Pentru cine" },
  { href: "#intrebari", label: "Întrebări" },
]

export function SiteHeader() {
  return (
    <header className="border-b border-border-strong">
      <a
        href="#continut"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-control focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
      >
        Sari la conținut
      </a>
      <div className="page flex h-16 items-center justify-between gap-6">
        <Link href="/" className="flex items-center gap-2.5 rounded-control outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
          <Plug channel="whatsapp" connected className="border-bakelite" />
          <span className="type-engraved text-xl">Centrala</span>
        </Link>
        <nav aria-label="Principal" className="flex items-center gap-1">
          <ul className="hidden items-center gap-1 md:flex">
            {NAV.map((item) => (
              <li key={item.href}>
                <Button asChild variant="ghost" size="sm">
                  <Link href={item.href}>{item.label}</Link>
                </Button>
              </li>
            ))}
          </ul>
          <Button asChild size="sm" className="ms-2">
            <Link href="#pilot">Înscrie-te în pilot</Link>
          </Button>
        </nav>
      </div>
    </header>
  )
}
