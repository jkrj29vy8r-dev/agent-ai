import type { Metadata, Viewport } from "next"
import { Archivo } from "next/font/google"

import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import "./globals.css"

// O singură familie, variabilă: axa `wdth` dă titlurile lărgite (125%),
// plăcuțele (118%) și textul de corp (100%). latin-ext pentru ă, â, î, ș, ț.
const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin", "latin-ext"],
  axes: ["wdth"],
  display: "swap",
})

export const metadata: Metadata = {
  title: {
    default: "Centrala — recepționerul AI care răspunde non-stop",
    template: "%s · Centrala",
  },
  description:
    "Un recepționer AI care răspunde la telefon, pe WhatsApp și pe e-mail, verifică locurile libere și face singur rezervarea.",
}

// <meta name="theme-color"> nu acceptă variabile CSS: aici repetăm valorile
// lui --background (light / dark) din globals.css.
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#eef1ec" }, // token-ok: --enamel-100
    { media: "(prefers-color-scheme: dark)", color: "#151b18" }, // token-ok: --night-900
  ],
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ro" className={archivo.variable} suppressHydrationWarning>
      <body className="flex min-h-dvh flex-col">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <TooltipProvider>{children}</TooltipProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
