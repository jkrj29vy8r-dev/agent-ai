import Link from "next/link"

import { ThemeSwitch } from "@/components/centrala/theme-switch"
import { LEGAL_LINKS } from "@/lib/legal"

import { Placeholder } from "./placeholder"

export function SiteFooter() {
  return (
    <footer className="border-t border-border-strong bg-panel">
      <div className="page grid gap-10 py-12 md:grid-cols-12">
        <div className="md:col-span-5">
          <p className="type-engraved text-xl">Centrala</p>
          <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
            <dt className="text-muted-foreground">Firma</dt>
            <dd><Placeholder>[CONTACT]</Placeholder></dd>
            <dt className="text-muted-foreground">CUI</dt>
            <dd><Placeholder>[CONTACT]</Placeholder></dd>
            <dt className="text-muted-foreground">Adresă</dt>
            <dd><Placeholder>[CONTACT]</Placeholder></dd>
            <dt className="text-muted-foreground">E-mail</dt>
            <dd><Placeholder>[CONTACT]</Placeholder></dd>
          </dl>
        </div>

        <nav aria-label="Documente legale" className="md:col-span-4">
          <ul className="flex flex-col gap-2 text-sm">
            {LEGAL_LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="underline-offset-4 hover:text-heading hover:underline">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex flex-col items-start gap-3 md:col-span-3 md:items-end">
          <ThemeSwitch />
        </div>
      </div>
      <div className="page border-t border-border-strong py-5 text-sm text-muted-foreground">
        © 2026 Centrala. Agentul e un asistent virtual și se prezintă ca atare clienților.
      </div>
    </footer>
  )
}
