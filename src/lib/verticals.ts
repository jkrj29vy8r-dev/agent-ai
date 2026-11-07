/** Domeniile pentru care e gândit produsul, cu o întrebare tipică de client. */
export const VERTICALS = [
  { id: "salon", label: "Saloane și frizerii", question: "Mai aveți loc mâine după ora 17?" },
  { id: "dentar", label: "Clinici dentare", question: "Cât costă o detartrare și când aveți liber?" },
  { id: "veterinar", label: "Cabinete veterinare", question: "Puteți vedea pisica azi? Nu mănâncă de ieri." },
  { id: "service", label: "Service-uri auto", question: "Cât durează schimbul de plăcuțe la un Logan?" },
  { id: "restaurant", label: "Restaurante", question: "Aveți o masă de 6 sâmbătă la 20:00?" },
  { id: "pensiune", label: "Pensiuni și hoteluri", question: "Aveți cameră dublă de vineri până duminică?" },
  { id: "transport", label: "Transport persoane", question: "Mai sunt locuri în cursa de luni spre Viena?" },
] as const

export type VerticalId = (typeof VERTICALS)[number]["id"] | "altceva"

/** Cum se numește o firmă din domeniu, la singular (pentru promptul agentului). */
export const VERTICAL_SINGULAR: Record<string, string> = {
  salon: "salon de înfrumusețare",
  dentar: "clinică dentară",
  veterinar: "cabinet veterinar",
  service: "service auto",
  restaurant: "restaurant",
  pensiune: "pensiune",
  transport: "firmă de transport persoane",
}

export const VERTICAL_OPTIONS: { id: VerticalId; label: string }[] = [
  ...VERTICALS.map(({ id, label }) => ({ id, label })),
  { id: "altceva", label: "Alt domeniu" },
]
