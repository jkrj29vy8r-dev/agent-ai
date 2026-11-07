import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"

import { Placeholder } from "./placeholder"
import { SectionIntro } from "./section-intro"

const QUESTIONS: { q: string; a: React.ReactNode }[] = [
  {
    q: "Clienții știu că vorbesc cu un asistent virtual?",
    a: (
      <p>
        Da. Agentul se prezintă de la început ca asistent virtual al firmei, iar la telefon anunță
        că apelul e înregistrat.
      </p>
    ),
  },
  {
    q: "Ce face agentul când nu știe răspunsul?",
    a: (
      <p>
        Nu inventează. Îi spune clientului că verifică cineva din echipă, îți trimite cazul cu tot
        ce s-a discutat și, la telefon, poate transfera apelul către un om, în orele pe care le
        alegi tu.
      </p>
    ),
  },
  {
    q: "Îmi păstrez numărul de telefon?",
    a: (
      <p>
        Da. Redirecționezi apelurile de pe numărul tău când nu răspunzi sau după program. Clienții
        sună la același număr ca până acum.
      </p>
    ),
  },
  {
    q: "Pot evita programările suprapuse cu agenda pe care o am?",
    a: (
      <p>
        Agentul ține programările într-o singură agendă, iar baza de date refuză singură două
        rezervări în același loc și la aceeași oră, chiar dacă vin în aceeași secundă pe canale
        diferite. Poți lega și Google Calendar sau Outlook.
      </p>
    ),
  },
  {
    q: "Unde stau datele clienților mei?",
    a: (
      <p>
        Fiecare firmă își vede doar datele ei. Semnăm cu tine un acord de prelucrare a datelor
        (DPA) și îți dăm lista furnizorilor implicați.
      </p>
    ),
  },
  {
    q: "Cât costă?",
    a: (
      <p>
        Un abonament lunar, în funcție de canale și de volum: <Placeholder>[PREȚ]</Placeholder>
      </p>
    ),
  },
  {
    q: "Ce primesc dacă intru în pilot?",
    a: (
      <p>
        <Placeholder>[CONDIȚII PILOT]</Placeholder>
      </p>
    ),
  },
]

export function Faq() {
  return (
    <section
      id="intrebari"
      aria-labelledby="intrebari-titlu"
      className="page grid scroll-mt-8 gap-x-12 gap-y-8 border-t border-border-strong py-section lg:grid-cols-12"
    >
      <div className="lg:col-span-5">
        <SectionIntro id="intrebari-titlu" title="Întrebări frecvente" />
      </div>
      <div className="min-w-0 lg:col-span-7">
        <Accordion type="single" collapsible className="border-t border-border-strong">
          {QUESTIONS.map(({ q, a }) => (
            <AccordionItem key={q} value={q}>
              <AccordionTrigger>{q}</AccordionTrigger>
              <AccordionContent>{a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  )
}
