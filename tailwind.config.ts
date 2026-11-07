import type { Config } from "tailwindcss"

/**
 * Tema Tailwind a Centralei.
 *
 * Valorile brute (hex, px, ms) trăiesc DOAR în `src/app/globals.css`, ca
 * variabile CSS, cu o variantă pentru light și una pentru dark. Aici doar
 * le dăm nume de utilitare. Componentele folosesc numele (`bg-primary`,
 * `rounded-panel`, `shadow-plate`), niciodată valori brute.
 *
 * Paleta, umbrele, razele, fonturile și animațiile implicite din Tailwind
 * sunt șterse în globals.css (`--color-*: initial` etc.), deci o clasă ca
 * `bg-red-500` sau `shadow-lg` pur și simplu nu există.
 */

const v = (name: string) => `var(--${name})`

const config = {
  theme: {
    colors: {
      transparent: "transparent",
      current: "currentColor",
      inherit: "inherit",

      background: v("background"),
      foreground: v("foreground"),
      heading: v("heading"),

      card: { DEFAULT: v("card"), foreground: v("card-foreground") },
      popover: { DEFAULT: v("popover"), foreground: v("popover-foreground") },
      panel: { DEFAULT: v("panel"), sunken: v("panel-sunken") },

      primary: {
        DEFAULT: v("primary"),
        hover: v("primary-hover"),
        foreground: v("primary-foreground"),
      },
      secondary: { DEFAULT: v("secondary"), foreground: v("secondary-foreground") },
      muted: { DEFAULT: v("muted"), foreground: v("muted-foreground") },
      // `accent` = fundalul neutru de hover din shadcn. NU e lampa.
      accent: { DEFAULT: v("accent"), foreground: v("accent-foreground") },

      border: { DEFAULT: v("border"), strong: v("border-strong") },
      input: { DEFAULT: v("input"), background: v("input-background") },
      ring: v("ring"),
      overlay: v("overlay"),

      success: { DEFAULT: v("success"), foreground: v("success-foreground") },
      warning: { DEFAULT: v("warning"), foreground: v("warning-foreground") },
      destructive: { DEFAULT: v("destructive"), foreground: v("destructive-foreground") },

      // Lampa: singurul accent. Înseamnă DOAR „activ acum”.
      lamp: {
        DEFAULT: v("lamp"),
        halo: v("lamp-halo"),
        off: v("lamp-off"),
        ring: v("lamp-ring"),
      },

      // Materialele centralei (panoul 3D, ilustrații): alama plăcuțelor,
      // hârtia agendei, ecranul agentului.
      enamel: v("enamel"),
      bakelite: v("bakelite"),
      brass: { DEFAULT: v("brass"), foreground: v("brass-foreground") },
      paper: { DEFAULT: v("paper"), foreground: v("paper-foreground") },
      screen: { DEFAULT: v("screen"), foreground: v("screen-foreground") },

      // Cablurile canalelor: aceleași culori peste tot în produs.
      channel: {
        phone: v("channel-phone"),
        whatsapp: v("channel-whatsapp"),
        email: v("channel-email"),
      },

      chart: {
        1: v("chart-1"),
        2: v("chart-2"),
        3: v("chart-3"),
        4: v("chart-4"),
        5: v("chart-5"),
      },

      sidebar: {
        DEFAULT: v("sidebar"),
        foreground: v("sidebar-foreground"),
        primary: v("sidebar-primary"),
        "primary-foreground": v("sidebar-primary-foreground"),
        accent: v("sidebar-accent"),
        "accent-foreground": v("sidebar-accent-foreground"),
        border: v("sidebar-border"),
        ring: v("sidebar-ring"),
      },
    },

    fontFamily: {
      // Două roluri, aceeași familie variabilă (Archivo), cum cere V1:
      // `display` = lărgit 125%, ca literele gravate; `sans` = text de corp.
      sans: [v("family-text"), "ui-sans-serif", "system-ui", "sans-serif"],
      display: [v("family-display"), "ui-sans-serif", "system-ui", "sans-serif"],
      // alias folosit de componentele shadcn (CardTitle, DialogTitle)
      heading: [v("family-display"), "ui-sans-serif", "system-ui", "sans-serif"],
    },

    // Scara tipografică. `base` = 17px, textul de corp.
    fontSize: {
      xs: [v("size-xs"), { lineHeight: v("lh-xs") }],
      sm: [v("size-sm"), { lineHeight: v("lh-sm") }],
      base: [v("size-base"), { lineHeight: v("lh-base") }],
      lg: [v("size-lg"), { lineHeight: v("lh-lg") }],
      xl: [v("size-xl"), { lineHeight: v("lh-xl") }],
      "2xl": [v("size-2xl"), { lineHeight: v("lh-2xl") }],
      "3xl": [v("size-3xl"), { lineHeight: v("lh-3xl") }],
      "4xl": [v("size-4xl"), { lineHeight: v("lh-4xl") }],
      "5xl": [v("size-5xl"), { lineHeight: v("lh-5xl") }],
      "6xl": [v("size-6xl"), { lineHeight: v("lh-6xl") }],
    },

    fontWeight: {
      normal: "400",
      medium: "500",
      semibold: "600",
      bold: "700",
    },

    // Formă: 4px pentru controale, 10px pentru panouri, cerc pentru lămpi și
    // mufe (`rounded-full`, utilitar static). sm–4xl sunt aliasuri pentru
    // componentele shadcn adăugate pe viitor.
    borderRadius: {
      none: "0",
      xs: v("round-xs"),
      control: v("round-control"),
      panel: v("round-panel"),
      sm: v("round-control"),
      md: v("round-control"),
      lg: v("round-control"),
      xl: v("round-panel"),
      "2xl": v("round-panel"),
      "3xl": v("round-panel"),
      "4xl": v("round-panel"),
    },

    // Fără umbre aruncate. Adâncimea = bordură 1px + linie deschisă sus.
    // Aliasurile xs–2xl trimit tot la `plate`, ca shadcn să rămână plat.
    boxShadow: {
      none: "none",
      plate: v("depth-plate"),
      socket: v("depth-socket"),
      lamp: v("depth-lamp"),
      xs: v("depth-plate"),
      sm: v("depth-plate"),
      md: v("depth-plate"),
      lg: v("depth-plate"),
      xl: v("depth-plate"),
      "2xl": v("depth-plate"),
    },

    extend: {
      // Pasul de bază e 4px (`p-1` = 4px, `p-4` = 16px, `p-6` = 24px).
      // Plus trei distanțe de layout cu nume.
      spacing: {
        gutter: v("space-gutter"),
        panel: v("space-panel"),
        section: v("space-section"),
      },
      maxWidth: {
        measure: v("measure"),
        page: v("page-width"),
      },
      transitionDuration: {
        instant: v("motion-instant"),
        fast: v("motion-fast"),
        base: v("motion-base"),
        slow: v("motion-slow"),
      },
      transitionTimingFunction: {
        switch: v("curve-switch"),
        settle: v("curve-settle"),
      },
      keyframes: {
        // Lampa se aprinde o dată. Nu pulsează niciodată.
        "lamp-on": {
          "0%": { backgroundColor: v("lamp-off"), boxShadow: "none" },
          "100%": { backgroundColor: v("lamp"), boxShadow: v("depth-lamp") },
        },
        // Cablul „intră în mufă”: linia se desenează de la capăt la capăt.
        "cable-plug": {
          from: { strokeDashoffset: "1" },
          to: { strokeDashoffset: "0" },
        },
        // Mufa primește fișa: inelul se strânge ușor.
        "plug-seat": {
          "0%": { transform: "scale(1.12)" },
          "100%": { transform: "scale(1)" },
        },
        rise: {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        spin: {
          to: { transform: "rotate(360deg)" },
        },
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": `accordion-down ${v("motion-fast")} ${v("curve-settle")} 1 both`,
        "accordion-up": `accordion-up ${v("motion-fast")} ${v("curve-settle")} 1 both`,
        "lamp-on": `lamp-on ${v("motion-instant")} ${v("curve-switch")} 1 both`,
        "cable-plug": `cable-plug ${v("motion-slow")} ${v("curve-settle")} 1 both`,
        "plug-seat": `plug-seat ${v("motion-fast")} ${v("curve-switch")} 1 both`,
        rise: `rise ${v("motion-base")} ${v("curve-settle")} 1 both`,
        "fade-in": `fade-in ${v("motion-fast")} ${v("curve-settle")} 1 both`,
        spin: "spin 1s linear infinite",
      },
    },
  },
} satisfies Config

export default config
