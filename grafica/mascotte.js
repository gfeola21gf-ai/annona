/* =========================================================
   mascotte.js — il PICCOLO LEGIONARIO, disegnato al tratto (SVG).

   Pose disponibili:
     "saluta"   → saluta con la mano
     "rotolo"   → tiene il rotolo del giuramento (onboarding)
     "bilancia" → esulta in piedi sulla bilancia (schermata Peso)
     "pensa"    → in attesa (schermate vuote)

   I colori arrivano dalle variabili CSS (styles.css), quindi
   si adatta da solo al tema chiaro e scuro.
   ========================================================= */

export function legionario(posa = "saluta", { peso = "" } = {}) {
  const sinistro = {
    bilancia: "M46 70L34 50l-4-8",
    rotolo: "M46 70l-10 12 6 6",
    pensa: "M46 70l-8 18",
    saluta: "M46 70l-8 18",
  }[posa];
  const destro = {
    bilancia: "M74 70l12-20 4-8",
    rotolo: "M74 70l10 12-6 6",
    pensa: "M74 70l8 10-12 0",
    saluta: "M74 70l12-16 2-10",
  }[posa];
  const piedi = posa === "bilancia" ? 124 : 132;

  const extra = {
    rotolo: `<rect x="34" y="78" width="52" height="16" rx="4" fill="var(--carta)"/>
             <path d="M34 82a4 4 0 0 0 0 8M86 82a4 4 0 0 1 0 8M44 86h22"/>`,
    bilancia: `<rect x="18" y="126" width="84" height="16" rx="7" fill="var(--carta)"/>
               <rect x="45" y="130" width="30" height="8" rx="2" fill="var(--inchiostro)" stroke="none"/>
               <text x="60" y="136.6" fill="var(--grano)" stroke="none" font-size="6.5" font-family="Gelasio,serif" font-weight="700" text-anchor="middle">${peso}</text>
               <path d="M22 40l-4-4M26 34l-2-5M98 40l4-4M94 34l2-5" stroke-width="2"/>`,
    saluta: `<path d="M92 40l4-3M93 46h5" stroke-width="2"/>`,
    pensa: `<circle cx="92" cy="28" r="2.5" fill="var(--inchiostro)" stroke="none"/><circle cx="99" cy="19" r="3.5" fill="var(--inchiostro)" stroke="none"/>`,
  }[posa];

  return `
    <svg viewBox="0 0 120 150" class="mascotte" aria-hidden="true">
      <g fill="none" stroke="var(--inchiostro)" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
        <path d="M53 110l-3 ${piedi - 112}h-8M67 110l3 ${piedi - 112}h8"/>
        <path d="M44 66q16-6 32 0l5 44H39z" fill="var(--terra)"/>
        <path d="M45 76h30M44 84h32" stroke="var(--su-terra)" stroke-width="2"/>
        <path d="M41 96h38" stroke="var(--grano)" stroke-width="4"/>
        <path d="M45 110v7M53 110v7M60 110v7M67 110v7M75 110v7" stroke-width="2.2"/>
        <path d="${sinistro}"/><path d="${destro}"/>
        <circle cx="60" cy="46" r="15" fill="var(--carta)"/>
        <path d="M55 48h.1M65 48h.1" stroke-width="3.6"/>
        <path d="${posa === "pensa" ? "M56 55h8" : "M55 54q5 4 10 0"}"/>
        <path d="M43 42c0-12 8-18 17-18s17 6 17 18z" fill="var(--bronzo)"/>
        <path d="M44 42v9q3 3 6 0v-9M76 42v9q-3 3-6 0v-9" fill="var(--bronzo)"/>
        <path d="M46 24c0-12 28-12 28 0z" fill="var(--terra)"/>
        <path d="M52 17v6M60 14v9M68 17v6" stroke="var(--su-terra)" stroke-width="1.6"/>
        ${extra}
      </g>
    </svg>`;
}
