import { redirect } from "next/navigation"

// Temporar: landing page-ul vine în V2 („Landing page cu panoul 3D”).
// Până atunci, rădăcina duce la specimenul sistemului de design.
export default function Home() {
  redirect("/sistem")
}
