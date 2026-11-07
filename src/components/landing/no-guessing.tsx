import { Badge } from "@/components/ui/badge"

import { SectionIntro } from "./section-intro"

const SWITCHES = [
  {
    name: "Prețuri și program",
    source: "din datele tale",
    text: "Prețul, durata și locurile libere le citește din ce ai completat, la fiecare întrebare. Nu le ține minte și nu le ghicește.",
  },
  {
    name: "Restul răspunsurilor",
    source: "din întrebările tale frecvente",
    text: "Parcare, plată cu cardul, ce aduce clientul: răspunde doar cu ce ai scris tu, cu vorbele tale.",
  },
  {
    name: "Ce nu știe",
    source: "predă unui om",
    text: "Dacă întrebarea iese din ce știe, îți trimite cazul pe telefon sau pe e-mail și îi spune clientului că revii tu.",
  },
]

/** Comutatorul basculant al panoului, pe poziția „pornit”. Decorativ. */
function Toggle() {
  return (
    <span
      aria-hidden
      className="relative inline-flex h-14 w-8 shrink-0 justify-center rounded-full border border-border-strong bg-panel-sunken p-1 shadow-socket"
    >
      <span className="size-6 rounded-full bg-bakelite shadow-plate" />
    </span>
  )
}

export function NoGuessing() {
  return (
    <section aria-labelledby="nu-inventeaza-titlu" className="page py-section">
      <SectionIntro id="nu-inventeaza-titlu" title="Nu inventează nimic">
        <p>
          Un recepționer care improvizează prețuri face mai mult rău decât unul care nu răspunde.
          Așa că agentul lucrează cu trei comutatoare care stau mereu pornite.
        </p>
      </SectionIntro>

      <ul className="surface-plate mt-10 grid divide-y divide-border-strong rounded-panel lg:grid-cols-3 lg:divide-x lg:divide-y-0">
        {SWITCHES.map((s) => (
          <li key={s.name} className="flex gap-5 p-panel">
            <Toggle />
            <div className="min-w-0">
              <h3 className="text-xl">{s.name}</h3>
              <Badge variant="outline" className="mt-2">
                {s.source}
              </Badge>
              <p className="mt-3 text-base">{s.text}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
