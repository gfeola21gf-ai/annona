/* =========================================================
   ui.js — piccoli ATTREZZI per disegnare le schermate.
   ========================================================= */

/** Rende sicuro un testo prima di metterlo nell'HTML (es. "<" non diventa codice) */
export const esc = (t) =>
  String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

/** 1780 → "1.780"   0.44 → "0,44"   (con il segno meno "vero": −) */
export function numero(n, decimali = 0) {
  // fatto "a mano": l'italiano del browser non mette il punto ai numeri di 4 cifre (1780), noi sì, sempre
  const [intero, dec] = Math.abs(Number(n) || 0).toFixed(decimali).split(".");
  const t = intero.replace(/\B(?=(\d{3})+(?!\d))/g, ".") + (dec ? `,${dec}` : "");
  const zero = Math.abs(n) < 0.5 * 10 ** -decimali;   // es. −0,04 con 1 decimale è "0,0", senza segno
  return (n < 0 && !zero ? "−" : "") + t;
}
/** Come numero(), ma con "+" davanti ai positivi */
export const conSegno = (n, decimali = 0) => (n > 0 ? "+" : "") + numero(n, decimali);

/** I macro di una voce, colorati: «C 20 P 8 G 5» (carboidrati grano, proteine terra, grassi oliva) */
export const macroVoce = (v) => `<span class="macro-voce"><b class="mv-c">C ${numero(v.carboidrati ?? 0)}</b><b class="mv-p">P ${numero(v.proteine ?? 0)}</b><b class="mv-g">G ${numero(v.grassi ?? 0)}</b></span>`;

/** Peso: 78.4 → "78,4" */
export const kg = (n) => numero(n, 1);

/**
 * Un messaggio che compare per qualche secondo IN ALTO, come le notifiche dell'iPhone
 * (così non copre i pasti né i pulsanti in fondo).
 * @param annulla  (facoltativo) una funzione: compare il pulsante «Annulla» (al posto del «sei sicuro?»)
 */
export function avviso(testo, tipo = "", { annulla } = {}) {
  document.querySelector(".avviso")?.remove();
  const el = document.createElement("div");
  el.className = `avviso in-alto ${tipo} ${annulla ? "con-annulla" : ""}`;
  el.innerHTML = `<span>${esc(testo)}</span>${annulla ? `<button type="button">Annulla</button>` : ""}`;
  document.body.append(el);
  requestAnimationFrame(() => el.classList.add("visibile"));
  const via = () => { el.classList.remove("visibile"); setTimeout(() => el.remove(), 300); };
  const t = setTimeout(via, annulla ? 5000 : 3200);
  el.querySelector("button")?.addEventListener("click", () => { clearTimeout(t); via(); annulla(); });
}

/**
 * Un "foglio" che sale dal basso (per modificare o confermare).
 * @returns {el, chiudi}
 */
export function foglio(html, { onChiudi } = {}) {
  const sfondo = document.createElement("div");
  sfondo.className = "foglio-sfondo";
  sfondo.innerHTML = `<div class="foglio" role="dialog" aria-modal="true"><div class="foglio-maniglia"></div>${html}</div>`;
  document.body.append(sfondo);
  bloccaSfondo();
  requestAnimationFrame(() => sfondo.classList.add("aperto"));
  const chiudi = () => {
    sfondo.classList.remove("aperto");
    sfondo.classList.add("chiuso");
    bloccaSfondo();
    setTimeout(() => sfondo.remove(), 250);
    onChiudi?.();
  };
  sfondo.addEventListener("click", (e) => { if (e.target === sfondo || e.target.closest("[data-chiudi]")) chiudi(); });
  return { el: sfondo.querySelector(".foglio"), chiudi };
}

/** Con un foglio aperto la schermata dietro non scorre (classe «con-foglio» su <html>) */
export const bloccaSfondo = () =>
  document.documentElement.classList.toggle("con-foglio", Boolean(document.querySelector(".foglio-sfondo:not(.chiuso)")));

/**
 * Una casella di testo che CRESCE con quello che scrivi (o detti), fino a un massimo:
 * oltre, scorre al suo interno invece di diventare enorme.
 */
export function adattaAltezza(area, massimo = 172) {
  area.style.height = "auto";
  const alta = area.scrollHeight + 2;
  area.style.height = `${Math.min(alta, massimo)}px`;
  area.style.overflowY = alta > massimo ? "auto" : "hidden";
}

/** Legge un numero scritto all'italiana: "78,4" → 78.4   "1.780" → 1780   "78.4" → 78.4 */
export function leggiNumero(t) {
  let s = String(t ?? "").trim().replace(/[^\d.,]/g, "");
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");     // "1.780,5": il punto è delle migliaia
  else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, "");    // "1.780": migliaia, non decimali
  return Number(s);
}
