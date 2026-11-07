import { Placeholder } from "./placeholder"
import { PilotForm } from "./pilot-form"
import { SectionIntro } from "./section-intro"

export function PilotSection() {
  return (
    <section id="pilot" aria-labelledby="pilot-titlu" className="page scroll-mt-8 py-section">
      <div className="surface-plate grid gap-x-12 gap-y-8 rounded-panel p-panel lg:grid-cols-12 lg:p-12">
        <div className="lg:col-span-5">
          <SectionIntro id="pilot-titlu" title="Intră în pilot">
            <p>
              Căutăm primele firme care vor să nu mai piardă clienți după program. Te ajutăm noi cu
              configurarea, iar tu ne spui ce nu merge.
            </p>
            <p>
              <Placeholder>[CONDIȚII PILOT]</Placeholder>
            </p>
          </SectionIntro>
        </div>
        <div className="min-w-0 lg:col-span-7">
          <PilotForm />
        </div>
      </div>
    </section>
  )
}
