import { SectionIntro } from "./section-intro"

const STEPS = [
  {
    title: "Contul firmei",
    time: "5 minute",
    text: "Numele, adresa, programul general și domeniul. Domeniul aduce un șablon cu servicii și întrebări tipice, ca să nu pornești de la zero.",
  },
  {
    title: "Servicii și program",
    time: "20 de minute",
    text: "Prețuri, durate, cine face ce și în ce zile. Dacă ai site, citim serviciile de acolo, iar tu doar verifici.",
  },
  {
    title: "Canalele",
    time: "15 minute",
    text: "Redirecționezi telefonul de pe numărul tău, conectezi WhatsApp cu un buton și primești o adresă pentru e-mailuri.",
  },
  {
    title: "Testul",
    time: "10 minute",
    text: "Vorbești cu agentul chiar din pagină, îl suni de pe mobil, apoi apeși „Activează”.",
  },
]

export function SetupSteps() {
  return (
    <section
      aria-labelledby="porneste-titlu"
      className="page grid gap-x-12 gap-y-10 border-t border-border-strong py-section lg:grid-cols-12"
    >
      <div className="lg:col-span-5">
        <SectionIntro id="porneste-titlu" title="Pornești într-o oră">
          <p>
            Fără instalări și fără un om de IT. Completezi un formular ghidat, în patru pași, și
            agentul răspunde clienților din aceeași zi.
          </p>
        </SectionIntro>
      </div>

      <ol className="relative flex flex-col gap-8 lg:col-span-7">
        {/* cablul care leagă pașii */}
        <span aria-hidden className="absolute top-6 bottom-6 left-6 w-0.5 -translate-x-1/2 bg-border-strong" />
        {STEPS.map((step, i) => (
          <li key={step.title} className="relative flex gap-5">
            <span
              aria-hidden
              className="type-engraved relative grid size-12 shrink-0 place-items-center rounded-full border-2 border-bakelite bg-background text-xl shadow-socket"
            >
              {i + 1}
            </span>
            <div className="min-w-0 pt-1.5">
              <h3 className="text-xl">
                <span className="sr-only">Pasul {i + 1}: </span>
                {step.title}
              </h3>
              <p className="type-plate mt-1 text-muted-foreground">cam {step.time}</p>
              <p className="mt-2 max-w-measure">{step.text}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}
