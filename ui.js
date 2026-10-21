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

/** Peso: 78.4 → "78,4" */
export const kg = (n) => numero(n, 1);

/**
 * Un messaggio che compare per qualche secondo: in basso, oppure IN ALTO
 * se è aperto un foglio (così non copre le voci che stai modificando).
 */
export function avviso(testo, tipo = "") {
  document.querySelector(".avviso")?.remove();
  const el = document.createElement("div");
  const sopraUnFoglio = Boolean(document.querySelector(".foglio-sfondo.aperto"));
  el.className = `avviso ${tipo} ${sopraUnFoglio ? "in-alto" : ""}`;
  el.textContent = testo;
  document.body.append(el);
  requestAnimationFrame(() => el.classList.add("visibile"));
  setTimeout(() => { el.classList.remove("visibile"); setTimeout(() => el.remove(), 300); }, 3200);
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
  requestAnimationFrame(() => sfondo.classList.add("aperto"));
  const chiudi = () => {
    sfondo.classList.remove("aperto");
    setTimeout(() => sfondo.remove(), 250);
    onChiudi?.();
  };
  sfondo.addEventListener("click", (e) => { if (e.target === sfondo || e.target.closest("[data-chiudi]")) chiudi(); });
  return { el: sfondo.querySelector(".foglio"), chiudi };
}

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
