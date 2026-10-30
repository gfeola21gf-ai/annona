/* =========================================================
   grafico.js — il GRAFICO DEL PESO, disegnato in SVG.

   Mostra due cose:
   - i PUNTI: ogni singola pesata (oscillano per acqua, sale, ecc.)
   - la LINEA: la media mobile a 7 giorni = la tendenza vera

   Tre viste (la vista "giorno" l'utente l'ha tolta: inutile):
     settimana → ultimi 7 giorni
     mese      → ultimi 30 giorni
     anno      → ultimi 365 giorni
   ========================================================= */

import { mediaMobile } from "../logica/energia.js";
import { nomeGiornoBreve, nomeMese } from "../logica/giorni.js";

const L = 320, A = 170;                 // dimensioni del disegno
const SX = 30, DX = 312, SU = 14, GIU = 140;  // margini dell'area dei dati
const GIORNO = 86400000;

export const VISTE = [
  { id: "settimana", nome: "Settimana" },
  { id: "mese", nome: "Mese" },
  { id: "anno", nome: "Anno" },
];

/** Inizio e fine del periodo mostrato */
function periodo(vista, adesso = new Date()) {
  if (vista === "giorno") {
    const inizio = new Date(adesso); inizio.setHours(0, 0, 0, 0);
    return [inizio.getTime(), inizio.getTime() + GIORNO];
  }
  const giorni = { settimana: 7, mese: 30, anno: 365 }[vista];
  const fine = new Date(adesso); fine.setHours(24, 0, 0, 0);
  return [fine.getTime() - giorni * GIORNO, fine.getTime()];
}

/** Le etichette sotto l'asse orizzontale */
function tacche(vista, da, a) {
  const out = [];
  if (vista === "giorno") {
    for (let h = 0; h <= 24; h += 6) out.push({ t: da + h * 3600000, testo: `${h}:00` });
  } else if (vista === "settimana") {
    for (let t = da + GIORNO / 2; t < a; t += GIORNO) out.push({ t, testo: nomeGiornoBreve(new Date(t)) });
  } else if (vista === "mese") {
    for (let t = da + GIORNO / 2; t < a; t += 7 * GIORNO) {
      const d = new Date(t); out.push({ t, testo: `${d.getDate()}/${d.getMonth() + 1}` });
    }
  } else {
    const d = new Date(da); d.setDate(1); d.setMonth(d.getMonth() + 1);
    for (; d.getTime() < a; d.setMonth(d.getMonth() + 2)) out.push({ t: d.getTime(), testo: nomeMese(d.getMonth()).slice(0, 3) });
  }
  return out;
}

const formatoKg = (kg) => kg.toLocaleString("it-IT", { maximumFractionDigits: 1 });

/**
 * @param pesate  [{quando, kg}] tutto lo storico
 * @param vista   "giorno" | "settimana" | "mese" | "anno"
 * @returns il codice SVG del grafico
 */
export function graficoPeso(pesate, vista) {
  const [da, a] = periodo(vista);
  const tutti = mediaMobile(pesate);                      // la media usa TUTTO lo storico
  const visibili = tutti.filter((p) => { const t = new Date(p.quando).getTime(); return t >= da && t < a; });

  if (!visibili.length) {
    return `<p class="grafico-vuoto">${vista === "giorno" ? "Nessuna pesata oggi." : "Nessuna pesata in questo periodo."}</p>`;
  }

  // Scala verticale: dal più basso al più alto, con un po' di margine
  const valori = visibili.flatMap((p) => [p.kg, p.media]);
  let min = Math.min(...valori), max = Math.max(...valori);
  if (max - min < 1) { const centro = (max + min) / 2; min = centro - 0.5; max = centro + 0.5; }
  const passo = max - min > 6 ? 2 : max - min > 2.5 ? 1 : 0.5;
  min = Math.floor((min - passo * 0.3) / passo) * passo;
  max = Math.ceil((max + passo * 0.3) / passo) * passo;

  const x = (t) => SX + ((t - da) / (a - da)) * (DX - SX);
  const y = (kg) => GIU - ((kg - min) / (max - min)) * (GIU - SU);

  let svg = `<svg viewBox="0 0 ${L} ${A}" class="grafico-svg" role="img" aria-label="Andamento del peso">`;

  // linee orizzontali di riferimento
  for (let v = min; v <= max + 0.001; v += passo) {
    svg += `<line x1="${SX}" x2="${DX}" y1="${y(v)}" y2="${y(v)}" class="g-griglia"/>
            <text x="${SX - 6}" y="${y(v) + 3.5}" text-anchor="end" class="g-testo">${formatoKg(v)}</text>`;
  }
  for (const tk of tacche(vista, da, a)) {
    svg += `<text x="${x(tk.t)}" y="${A - 12}" text-anchor="middle" class="g-testo">${tk.testo}</text>`;
  }

  // la tendenza (media mobile)
  if (visibili.length > 1) {
    const punti = visibili.map((p) => `${x(new Date(p.quando).getTime()).toFixed(1)},${y(p.media).toFixed(1)}`);
    svg += `<polyline points="${punti.join(" ")}" class="g-media"/>`;
  }
  // le pesate (l'ultima più evidente)
  visibili.forEach((p, i) => {
    const ultima = i === visibili.length - 1;
    svg += `<circle cx="${x(new Date(p.quando).getTime())}" cy="${y(p.kg)}" r="${ultima ? 5.5 : 3.6}" class="${ultima ? "g-ultima" : "g-punto"}"/>`;
  });
  return svg + "</svg>";
}
