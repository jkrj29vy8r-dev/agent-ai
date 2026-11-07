import { VERTICALS } from "@/lib/verticals"

import { SectionIntro } from "./section-intro"

export function VerticalsBand() {
  return (
    <section
      id="pentru-cine"
      aria-labelledby="pentru-cine-titlu"
      className="scroll-mt-8 border-y border-border-strong bg-panel py-section"
    >
      <div className="page">
        <SectionIntro id="pentru-cine-titlu" title="Pentru cine">
          <p>
            Pentru orice afacere care trăiește din programări și pierde clienți când nu răspunde la
            timp. Fiecare domeniu pornește cu întrebările lui tipice.
          </p>
        </SectionIntro>

        <ul className="mt-10 flex flex-wrap gap-3">
          {VERTICALS.map((v) => (
            <li
              key={v.id}
              className="flex max-w-full flex-col gap-1 rounded-control border border-border-strong bg-background px-4 py-3 shadow-plate"
            >
              <span className="type-plate text-heading">{v.label}</span>
              <q className="text-base text-foreground">{v.question}</q>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
