import { FlaskConical, LogOut } from "lucide-react"
import Link from "next/link"
import { Suspense } from "react"

import { Plug } from "@/components/centrala/plug"
import { ThemeSwitch } from "@/components/centrala/theme-switch"
import { Button } from "@/components/ui/button"
import { requireMember } from "@/lib/auth/member"

import { signOut } from "../intra/actions"

async function AccountBar() {
  const member = await requireMember()
  return (
    <div className="flex min-w-0 items-center gap-3">
      <div className="hidden min-w-0 text-right sm:block">
        <p className="truncate font-semibold text-heading">{member.tenantName}</p>
        <p className="type-plate truncate text-muted-foreground">{member.email}</p>
      </div>
      <form action={signOut}>
        <Button type="submit" variant="ghost" size="sm">
          <LogOut data-icon="inline-start" aria-hidden />
          Ieși
        </Button>
      </form>
    </div>
  )
}

export default function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-border-strong bg-panel">
        <div className="page flex h-16 items-center justify-between gap-4">
          <Link href="/dashboard" className="flex items-center gap-2.5 rounded-control outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
            <Plug channel="whatsapp" connected className="border-bakelite" />
            <span className="type-engraved text-xl">Centrala</span>
          </Link>
          <div className="flex items-center gap-4">
            <ThemeSwitch className="hidden md:inline-flex" />
            <Suspense fallback={<span className="type-plate text-muted-foreground">se încarcă…</span>}>
              <AccountBar />
            </Suspense>
          </div>
        </div>
      </header>

      <div className="page grid flex-1 gap-8 py-8 lg:grid-cols-[13rem_minmax(0,1fr)]">
        <nav aria-label="Dashboard">
          <ul className="flex gap-1 lg:flex-col">
            <li>
              <Link
                href="/dashboard/testeaza-agentul"
                aria-current="page"
                className="flex items-center gap-2 rounded-control bg-muted px-3 py-2 font-semibold text-heading outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <FlaskConical className="size-4" aria-hidden />
                Testează agentul
              </Link>
            </li>
          </ul>
        </nav>
        <main id="continut" className="min-w-0">
          {children}
        </main>
      </div>
    </div>
  )
}
