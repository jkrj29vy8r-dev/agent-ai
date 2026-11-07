import { createCn } from "cn/config"

/**
 * `cn` cu tokenii Centralei înregistrați, ca rezolvarea conflictelor să știe
 * că `shadow-plate` e o umbră (nu o culoare), `rounded-panel` e o rază și
 * `p-gutter` e o distanță. Importă mereu din `@/lib/utils`, nu direct din "cn".
 */
export const cn = createCn({
  extend: {
    theme: {
      shadow: ["plate", "socket", "lamp"],
      radius: ["control", "panel"],
      spacing: ["gutter", "panel", "section"],
      font: ["display", "heading"],
      ease: ["switch", "settle"],
    },
  },
})
