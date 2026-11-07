import { CallTranscript } from "@/components/landing/call-transcript"
import { Faq } from "@/components/landing/faq"
import { Hero } from "@/components/landing/hero/hero"
import { InboxPreview } from "@/components/landing/inbox-preview"
import { NoGuessing } from "@/components/landing/no-guessing"
import { PilotSection } from "@/components/landing/pilot-section"
import { SetupSteps } from "@/components/landing/setup-steps"
import { SiteFooter } from "@/components/landing/site-footer"
import { SiteHeader } from "@/components/landing/site-header"
import { VerticalsBand } from "@/components/landing/verticals-band"

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main id="continut">
        <Hero />
        <CallTranscript />
        <NoGuessing />
        <SetupSteps />
        <VerticalsBand />
        <InboxPreview />
        <Faq />
        <PilotSection />
      </main>
      <SiteFooter />
    </>
  )
}
