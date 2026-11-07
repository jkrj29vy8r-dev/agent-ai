/**
 * Scena 3D își ia culorile din tokenii CSS (globals.css), nu din valori
 * scrise aici. Așa panoul urmează tema (zi / noapte) și sistemul de design.
 */
const TOKENS = {
  panel: "enamel",
  rim: "border-strong",
  sunken: "panel-sunken",
  bakelite: "bakelite",
  brass: "brass",
  brassText: "brass-foreground",
  paper: "paper",
  paperText: "paper-foreground",
  screen: "screen",
  screenText: "screen-foreground",
  lamp: "lamp",
  lampOff: "lamp-off",
  lampRing: "lamp-ring",
  phone: "channel-phone",
  whatsapp: "channel-whatsapp",
  email: "channel-email",
  success: "success",
  shadow: "contact-shadow",
  muted: "muted-foreground",
} as const

export type SceneColors = Record<keyof typeof TOKENS, string>

export function readSceneColors(): SceneColors {
  const style = getComputedStyle(document.documentElement)
  return Object.fromEntries(
    Object.entries(TOKENS).map(([key, token]) => [key, style.getPropertyValue(`--${token}`).trim()])
  ) as SceneColors
}

/** Familia de text a paginii (Archivo din next/font), pentru texturile cu text. */
export function readFontFamily(): string {
  return getComputedStyle(document.body).fontFamily
}
