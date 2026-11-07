# Centrala: sistemul de design

**Direcția:** o centrală telefonică de epocă refăcută modern. Panou de smalț gri-verde,
plăcuțe gravate, mufe rotunde, lămpi de semnal și câte un cablu colorat pentru fiecare
canal.

**Metafora:** fiecare client care sună sau scrie aprinde o lampă; agentul „bagă cablul” și
leagă clientul de agendă. Toată interfața spune povestea asta.

**Utilizatorii:** patroni de saloane, clinici, service-uri auto, restaurante și firme de
transport: oameni ocupați, deloc tehnici. Interfața e în română, cu text mare și limpede.

Specimen viu: ruta `/sistem` (comutatorul de temă e sus, în dreapta).

Unde trăiesc tokenii:

- `src/app/globals.css`: valorile (primitive → semantice, light în `:root`, dark în `.dark`);
- `tailwind.config.ts`: numele utilitarelor care le folosesc.

Componentele folosesc doar numele. Vezi regula 2 din `CLAUDE.md`.

---

## Culoare

### Suprafețe și text

| Token | Light | Dark | Rol |
| --- | --- | --- | --- |
| `background` | `#EEF1EC` smalț | `#151B18` | fundalul paginii |
| `panel` / `card` | `#E2E8E1` | `#1D2521` | panouri, carduri, plăcuțe |
| `panel-sunken` | `#CFD8CF` | `#0F1412` | zone adâncite, mufe |
| `popover` | `#F8FAF7` | `#1D2521` | meniuri, dialoguri |
| `input-background` | `#F8FAF7` | `#0F1412` | câmpuri |
| `heading` | `#1C2420` | `#E8EDE7` | titluri |
| `foreground` | `#3A4540` | `#C5CFC7` | text de corp |
| `muted-foreground` | `#5D6A62` | `#94A39A` | text secundar |
| `border` | `#CFD8CF` | `#26302B` | separatoare discrete |
| `border-strong` | `#B4C0B5` | `#33403A` | conturul panourilor și plăcuțelor |
| `input` | `#7A877F` | `#6B7A71` | bordura câmpurilor (≥ 3:1) |

### Acțiune și semnale

| Token | Light | Dark | Rol |
| --- | --- | --- | --- |
| `primary` | `#1E4D3B` bachelită | `#7DBFA2` | butoane, linkuri, focus |
| `primary-hover` | `#163B2D` | `#96CDB4` | hover pe primară |
| `primary-foreground` | `#EEF1EC` | `#10201A` | text pe primară |
| `lamp` | `#F0A830` chihlimbar | `#F4B54A` | **doar „activ acum”** |
| `lamp-halo` | `rgb(240 168 48 / .35)` | `rgb(244 181 74 / .4)` | halo-ul lămpii aprinse |
| `lamp-off` | `#C9CFC4` | `#3A4540` | lampa stinsă |
| `success` | `#2A7347` | `#62C08A` | confirmat |
| `warning` | `#8A5A0E` | `#E3A94F` | atenție, predat la om |
| `destructive` | `#B3261E` | `#F28B82` | eroare, anulare |

Lampa nu e culoare de brand și nu se folosește pentru text pe fundal deschis (contrast
1.8:1). Starea pe care o semnalează e scrisă mereu și în text.

### Cablurile canalelor

Fixe în tot produsul: mufă, cablu, grafic, filtru, legendă.

| Canal | Token | Light | Dark |
| --- | --- | --- | --- |
| Telefon | `channel-phone` | `#B83A28` | `#E2715C` |
| WhatsApp | `channel-whatsapp` | `#2B5D8F` | `#6E9FD4` |
| E-mail | `channel-email` | `#4A4F4C` | `#A6AEA9` |

### Contrast verificat (WCAG)

Toate culorile de text trec de 4.5:1 pe `background`, `panel` și `input-background`, în
ambele teme (cel mai mic: `muted-foreground` pe `panel`, 4.55:1 în light). Bordura
câmpurilor trece de 3:1 (3.01:1 pe `panel`, 3.29:1 pe `background`).

---

## Tipografie

O singură familie variabilă: **Archivo** (Google Fonts, prin `next/font`, cu `latin-ext`
pentru diacritice și axa `wdth`), în două roluri:

| Rol | Utilitar | Stil |
| --- | --- | --- |
| Display (titluri) | `font-display`, `type-engraved`, automat pe `h1`–`h4` | 700, `font-stretch: 125%`, ca literele gravate pe plăcuțe |
| Text | `font-sans` (implicit) | 400, lățime 100%, corp 17px |
| Plăcuță | `type-plate` | 13px, 600, `font-stretch: 118%`, **literă mică**, nu majuscule |

Scara (`text-*`):

| `xs` | `sm` | `base` | `lg` | `xl` | `2xl` | `3xl` | `4xl` | `5xl` | `6xl` |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 13 | 15 | **17** | 19 | 22 | 26 | 32 | 40 | 52 | 64 |

Reguli: cifre tabulare peste tot (setat pe `body`); rânduri de cel mult 68 de caractere
(`max-w-measure`); titluri aliniate la stânga, cu `text-wrap: balance`.

---

## Spațiere

Pas de 4px (`p-1` = 4px, `p-4` = 16px). Treptele folosite: 1, 2, 3, 4, 6, 8, 12, 16, 24.

Distanțe de layout cu nume, care cresc singure de la 768px:

| Token | Mobil | ≥ 768px | Rol |
| --- | --- | --- | --- |
| `gutter` | 16px | 24px | marginea paginii (utilitarul `page`) |
| `panel` | 24px | 32px | interiorul unui panou |
| `section` | 64px | 96px | între secțiuni |

Lățimi: `max-w-page` (76rem), `max-w-measure` (68ch).

---

## Formă și adâncime

| Token | Valoare | Folosit pentru |
| --- | --- | --- |
| `rounded-control` | 4px | butoane, câmpuri, meniuri, plăcuțe |
| `rounded-panel` | 10px | panouri, carduri, dialoguri |
| `rounded-full` | cerc | lămpi, mufe |
| `rounded-xs` | 2px | detalii mici |

**Fără umbre aruncate.** Adâncimea vine dintr-o bordură de 1px și o linie interioară
deschisă sus, ca o tablă presată:

| Token | Ce face |
| --- | --- |
| `shadow-plate` | linia deschisă sus (tabla presată); `shadow-sm`…`shadow-2xl` trimit tot aici |
| `shadow-socket` | adâncitura unei mufe sau a unui comutator |
| `shadow-lamp` | halo-ul lămpii aprinse: singura strălucire din produs |

Utilitarul `surface-plate` = `bg-panel` + bordură `border-strong` + `shadow-plate`.

---

## Mișcare

Comutatoare mecanice: scurte, precise, o singură dată. Nimic nu pulsează și nimic nu se
mișcă în buclă (în afară de indicatorul de încărcare). Cu `prefers-reduced-motion`, toate
animațiile se reduc la 1ms.

| Token | Valoare |
| --- | --- |
| `duration-instant` / `fast` / `base` / `slow` | 150 / 200 / 300 / 480 ms |
| `ease-switch` | `cubic-bezier(.2, .8, .2, 1)`: clapa care cade la loc |
| `ease-settle` | `cubic-bezier(.3, 0, .2, 1)`: cablul care se așază |

| Animație | Ce face |
| --- | --- |
| `animate-lamp-on` | lampa se aprinde o dată, în 150ms |
| `animate-cable-plug` | cablul se desenează de la mufă la agendă (480ms) |
| `animate-plug-seat` | fișa intră în mufă (200ms) |
| `animate-rise` / `animate-fade-in` | intrarea panourilor |
| `animate-spin` | doar indicatorul de încărcare |

---

## Componente-semnătură (`src/components/centrala/`)

- **Lampa** (`<Lamp lit label>`): cerc de 12px cu inel de 1.5px `lamp-ring`. Stinsă:
  `lamp-off`. Aprinsă: `lamp` + `shadow-lamp`. Se aprinde o dată în 150ms și nu pulsează.
  Starea e scrisă mereu și în text lângă lampă.
- **Mufa** (`<Plug channel connected>`): cerc de 20px cu bordură de 2px în culoarea
  canalului și o gaură adâncită; conectată, fișa plină stă în gaură.
- **Cablul** (`<Cable channel from to sag animate>`): curbă SVG de 3px în culoarea
  canalului, care atârnă ca un cablu real între două puncte.
- **Plăcuța** (`<Badge>`, `<ChannelPlate>`): fundal de panou, bordură subțire, text mic
  lărgit. Pentru canale și stări, **nu** ca etichetă deasupra titlurilor.
- **Comutatorul de temă** (`<ThemeSwitch>`): Zi / Noapte / Sistem.

Componentele shadcn/ui (`src/components/ui/`) sunt trecute pe aceiași tokeni: butoane de
40px înălțime (ținte ușor de apăsat), câmpuri pe `input-background` cu bordură `input`,
panouri cu `rounded-panel` + `shadow-plate`, overlay `bg-overlay` fără blur.

---

## Iconițe

Lucide, linie de 1.5px (setată global pe `svg.lucide`), 16px în butoane. Niciodată emoji
în rolul de iconițe.

---

## De evitat

- gradienți violet-albastru (și gradienți decorativi în general), text cu gradient;
- glassmorphism, `backdrop-blur`;
- trei carduri identice într-o grilă; totul centrat;
- etichete cu majuscule deasupra fiecărui titlu;
- săgeți la finalul butoanelor;
- emoji ca iconițe;
- lampa folosită ca simplă decorațiune sau culoare de brand.

**Momentul wow** (V2) e panoul 3D din hero: singurul loc cu efecte. Restul produsului e
liniștit și foarte îngrijit.
