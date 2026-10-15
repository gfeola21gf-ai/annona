/* =========================================================
   giorni.js — piccoli aiutanti per le DATE.

   Nel database ogni pasto e ogni attività sono legati a un
   "giorno" scritto come testo "AAAA-MM-GG" (es. "2026-10-15"):
   è semplice da confrontare e non ha problemi di fuso orario.
   ========================================================= */

const GIORNI = ["domenica", "lunedì", "martedì", "mercoledì", "giovedì", "venerdì", "sabato"];
const MESI = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno",
  "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];

/** Data → "AAAA-MM-GG" (ora locale, non UTC) */
export function chiaveGiorno(data = new Date()) {
  const d = new Date(data);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const g = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${g}`;
}

/** "AAAA-MM-GG" → Date a mezzogiorno (così i cambi d'ora non spostano il giorno) */
export function daChiave(chiave) {
  const [a, m, g] = chiave.split("-").map(Number);
  return new Date(a, m - 1, g, 12);
}

/** Sposta un giorno di n giorni: aggiungiGiorni("2026-10-15", -1) → "2026-10-14" */
export function aggiungiGiorni(chiave, n) {
  const d = daChiave(chiave);
  d.setDate(d.getDate() + n);
  return chiaveGiorno(d);
}

export const oggi = () => chiaveGiorno();

/** "giovedì 15 ottobre" */
export function nomeGiorno(chiave) {
  const d = daChiave(chiave);
  return `${GIORNI[d.getDay()]} ${d.getDate()} ${MESI[d.getMonth()]}`;
}

/** "Oggi", "Ieri", "Domani" oppure "giovedì 15 ottobre" */
export function nomeGiornoRelativo(chiave) {
  const differenza = Math.round((daChiave(chiave) - daChiave(oggi())) / 86400000);
  if (differenza === 0) return "Oggi";
  if (differenza === -1) return "Ieri";
  if (differenza === 1) return "Domani";
  const n = nomeGiorno(chiave);
  return n[0].toUpperCase() + n.slice(1);
}

export const nomeMese = (i) => MESI[i];
export const nomeGiornoBreve = (data) => GIORNI[data.getDay()].slice(0, 3).replace("ì", "");

/** Anni compiuti da una data di nascita "AAAA-MM-GG" */
export function etaDa(nascita, adesso = new Date()) {
  const n = daChiave(nascita);
  let anni = adesso.getFullYear() - n.getFullYear();
  if (adesso.getMonth() < n.getMonth() || (adesso.getMonth() === n.getMonth() && adesso.getDate() < n.getDate())) anni--;
  return anni;
}
