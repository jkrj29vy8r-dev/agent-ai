import type { Metadata } from "next"
import Link from "next/link"

import { Plug } from "@/components/centrala/plug"

import { SignInForm } from "./sign-in-form"

export const metadata: Metadata = { title: "Intră în cont", robots: { index: false } }

export default function SignInPage() {
  return (
    <main id="continut" className="page grid min-h-dvh place-items-center py-section">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-8 inline-flex items-center gap-2.5 rounded-control outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
          <Plug channel="whatsapp" connected className="border-bakelite" />
          <span className="type-engraved text-xl">Centrala</span>
        </Link>
        <div className="surface-plate rounded-panel p-panel">
          <h1 className="text-3xl">Intră în cont</h1>
          <p className="mt-2 mb-6 text-muted-foreground">Contul firmei tale, unde configurezi și testezi agentul.</p>
          <SignInForm />
        </div>
      </div>
    </main>
  )
}
