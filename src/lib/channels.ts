import { Mail, MessageCircle, Phone, type LucideIcon } from "lucide-react"

/**
 * Cele trei canale. Fiecare are „cablul” lui, aceeași culoare peste tot
 * în produs (mufă, cablu, grafic, filtru). Culorile sunt tokeni, nu hex.
 */
export const CHANNELS = {
  phone: {
    label: "Telefon",
    icon: Phone,
    text: "text-channel-phone",
    border: "border-channel-phone",
    bg: "bg-channel-phone",
    stroke: "stroke-channel-phone",
  },
  whatsapp: {
    label: "WhatsApp",
    icon: MessageCircle,
    text: "text-channel-whatsapp",
    border: "border-channel-whatsapp",
    bg: "bg-channel-whatsapp",
    stroke: "stroke-channel-whatsapp",
  },
  email: {
    label: "E-mail",
    icon: Mail,
    text: "text-channel-email",
    border: "border-channel-email",
    bg: "bg-channel-email",
    stroke: "stroke-channel-email",
  },
} as const satisfies Record<
  string,
  { label: string; icon: LucideIcon; text: string; border: string; bg: string; stroke: string }
>

export type Channel = keyof typeof CHANNELS

export const CHANNEL_ORDER: Channel[] = ["phone", "whatsapp", "email"]
