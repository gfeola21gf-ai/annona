/* =========================================================
   ui.js — piccoli ATTREZZI per disegnare le schermate.
   ========================================================= */

/** Rende sicuro un testo prima di metterlo nell'HTML (es. "<" non diventa codice) */
export const esc = (t) =>
  String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

/** 1780 → "1.780"   0.44 → "0,44"   (con il segno meno "vero": −) */
export function numero(n, decimali = 0) {
  const t = Math.abs(n).toLocaleString("it-IT", { minimumFractionDigits: decimali, maximumFractionDigits: decimali });
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

/** Legge un numero scritto all'italiana: "78,4" → 78.4 */
export const leggiNumero = (t) => Number(String(t).replace(",", ".").replace(/[^\d.]/g, ""));
