/* =========================================================
   codice.js — il foglio del CODICE A BARRE.

   1. si accende la fotocamera con il mirino: il codice si legge da solo;
   2. oppure scrivi le cifre (se la fotocamera non va o il codice è rovinato);
   3. cerchiamo il prodotto su Open Food Facts:
        trovato     → chi ha aperto il foglio apre il dosatore
        non trovato → tre strade: cerca per nome, a mano, foto dell'etichetta
   ========================================================= */

import { avviaScanner } from "../servizi/scanner.js";
import { prodottoDaCodice } from "../servizi/cibo.js";
import { icona } from "../grafica/icone.js";
import { esc, foglio, avviso } from "../ui.js";

/** "8001234567890" → "8 001234 567890" (più facile da confrontare con la confezione) */
const leggibile = (c) => (c.length === 13 ? `${c[0]} ${c.slice(1, 7)} ${c.slice(7)}` : c);

/**
 * @param onTrovato        (alimento) => …
 * @param onCercaNome      () => …
 * @param onAMano          () => …
 * @param onFotoEtichetta  () => …
 * @returns una funzione per chiudere il foglio (es. se cambi schermata)
 */
export function apriCodice({ onTrovato, onCercaNome, onAMano, onFotoEtichetta }) {
  let spegni = null;         // spegne la fotocamera
  let chiuso = false;

  const { el, chiudi } = foglio(`
    <div class="foglio-testa"><h2 class="titolo-romano">Codice a barre</h2><button class="tondo" data-chiudi aria-label="Chiudi">${icona("chiudi")}</button></div>
    <div class="cod-corpo"></div>`, {
    onChiudi: () => { chiuso = true; spegni?.(); },
  });
  const corpo = el.querySelector(".cod-corpo");

  /* ---- 1. il mirino ---- */
  async function scansiona() {
    corpo.innerHTML = `
      <div class="mirino">
        <video playsinline muted autoplay></video>
        <div class="cornice"></div><div class="laser"></div>
        <p class="mirino-testo">Accendo la fotocamera…</p>
      </div>
      <p class="oppure"><span>oppure scrivi le cifre</span></p>
      <form class="codice-a-mano">
        <input name="codice" inputmode="numeric" pattern="[0-9 ]*" autocomplete="off" placeholder="Le cifre sotto le barre" aria-label="Codice a barre">
        <button class="pillola terra">Cerca</button>
      </form>
      <p class="piccolo centro">${icona("stelle")} I dati arrivano da Open Food Facts, il database libero dei prodotti.</p>`;
    const testo = corpo.querySelector(".mirino-testo");
    try {
      const s = await avviaScanner(corpo.querySelector("video"), (codice) => {
        navigator.vibrate?.(30);
        cerca(codice);
      });
      if (chiuso) return s();
      spegni = s;
      testo.textContent = "Inquadra il codice a barre";
    } catch (err) {
      corpo.querySelector(".mirino").classList.add("spento");
      testo.textContent = err.message;
    }
  }

  /* ---- 2. cerca il prodotto ---- */
  async function cerca(codice) {
    spegni?.(); spegni = null;
    corpo.innerHTML = `<p class="sotto prov-attesa cod-attesa"><span class="rotella"></span> Cerco il prodotto ${esc(leggibile(codice))}…</p>`;
    try {
      const alimento = await prodottoDaCodice(codice);
      if (chiuso) return;
      if (alimento) { chiudi(); onTrovato(alimento); return; }
      nonTrovato(codice);
    } catch (err) {
      if (!chiuso) nonTrovato(codice, err.message);
    }
  }

  /* ---- 3. non trovato: tre strade ---- */
  function nonTrovato(codice, errore = "") {
    corpo.innerHTML = `
      <div class="nota-avviso">${icona("bar")}<span>${errore ? esc(errore)
        : `Il codice <b>${esc(leggibile(codice))}</b> non è nel database dei prodotti (o mancano le calorie).`}</span></div>
      <div class="strade">
        <button class="risultato" data-strada="nome"><span class="risultato-nome"><strong>Cerca per nome</strong><small>scrivi il nome del prodotto</small></span>${icona("cerca")}</button>
        <button class="risultato" data-strada="mano"><span class="risultato-nome"><strong>Scrivi a mano</strong><small>leggi le kcal sull'etichetta</small></span>${icona("matita")}</button>
        <button class="risultato" data-strada="foto"><span class="risultato-nome"><strong>Fotografa l'etichetta</strong><small>l'IA legge la tabella nutrizionale</small></span>${icona("cam")}</button>
      </div>
      <button class="pillola larga" data-strada="ancora">${icona("bar")} Scansiona di nuovo</button>`;
  }

  el.addEventListener("click", (e) => {
    const s = e.target.closest("[data-strada]")?.dataset.strada;
    if (!s) return;
    if (s === "ancora") { scansiona(); return; }
    chiudi();
    if (s === "nome") onCercaNome();
    if (s === "mano") onAMano();
    if (s === "foto") onFotoEtichetta();
  });

  el.addEventListener("submit", (e) => {
    e.preventDefault();
    const codice = e.target.codice.value.replace(/\D/g, "");
    if (codice.length < 8 || codice.length > 14) { avviso("Il codice ha da 8 a 13 cifre: sono i numeri sotto le barre."); return; }
    e.target.codice.blur();
    cerca(codice);
  });

  scansiona();
  return () => { if (!chiuso) chiudi(); };
}
