import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"

import { Placeholder } from "@/components/landing/placeholder"
import { LEGAL_LINKS } from "@/lib/legal"

// Documentele legale nu sunt scrise încă; paginile există ca linkurile din
// subsol să nu ducă la 404. Textul se verifică cu un avocat înainte de lansare.
const DOCS = Object.fromEntries(LEGAL_LINKS.map((l) => [l.href.replace("/legal/", ""), l.label]))

export function generateStaticParams() {
  return Object.keys(DOCS).map((doc) => ({ doc }))
}

export async function generateMetadata({ params }: PageProps<"/legal/[doc]">): Promise<Metadata> {
  const { doc } = await params
  return { title: DOCS[doc], robots: { index: false } }
}

export default async function LegalPage({ params }: PageProps<"/legal/[doc]">) {
  const { doc } = await params
  const title = DOCS[doc]
  if (!title) notFound()

  return (
    <main id="continut" className="page max-w-measure py-section">
      <Link href="/" className="type-plate text-muted-foreground hover:text-heading">
        Centrala
      </Link>
      <h1 className="mt-4 text-4xl">{title}</h1>
      <p className="mt-6">
        <Placeholder>[DOCUMENT ÎN LUCRU]</Placeholder>
      </p>
    </main>
  )
}
