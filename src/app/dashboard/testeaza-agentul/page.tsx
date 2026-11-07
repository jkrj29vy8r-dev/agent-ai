import type { Metadata } from "next"
import { Suspense } from "react"

import { requireMember } from "@/lib/auth/member"

import { TestChat } from "./test-chat"

export const metadata: Metadata = { title: "Testează agentul", robots: { index: false } }

async function Tester() {
  const member = await requireMember()
  return <TestChat businessName={member.tenantName} />
}

export default function TestAgentPage() {
  return (
    <>
      <div className="max-w-measure">
        <h1 className="text-3xl sm:text-4xl">Testează agentul</h1>
        <p className="mt-3">
          Vorbește cu agentul ca un client. Vezi fiecare unealtă pe care o folosește și ce i-a răspuns
          baza de date. Rezervările făcute aici intră în agenda reală, legate de o conversație de test.
        </p>
      </div>
      <Suspense fallback={<p className="type-plate mt-8 text-muted-foreground">se pregătește centrala…</p>}>
        <Tester />
      </Suspense>
    </>
  )
}
