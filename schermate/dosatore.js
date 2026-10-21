/* =========================================================
   dosatore.js — il foglio per scegliere QUANTO hai mangiato.

   Due modi, a scelta con le linguette in alto:
     GRAMMI → un tastierino grande, come una calcolatrice
     PEZZI  → −/+ per le cose che si contano (gallette, biscotti,
              uova, fette…), con il peso di un pezzo già noto
   Le kcal si aggiornano mentre cambi la quantità.
   ========================================================= */

import { conGrammi, testoQuantita } from "../servizi/cibo.js";
import { icona } from "../grafica/icone.js";
import { esc, numero, foglio } from "../ui.js";

/**
 * @param voce        la voce da dosare (deve avere per100 per ricalcolare)
 * @param onConferma  (nuovaVoce) => …
 * @param onRimuovi   () => …   (facoltativo: mostra il pulsante "Rimuovi")
 * @param sotto       una riga sotto il nome (facoltativa: es. da dove vengono i dati)
 */
export function apriDosatore(voce, { onConferma, onRimuovi, sotto = "" }) {
  const pezzo = voce.per100?.pezzo;
  let modo = pezzo ? "pezzi" : "grammi";
  let grammi = Math.round(voce.grammi) || 0;
  let digitato = null;          // il numero che stai scrivendo sul tastierino (null = non hai ancora toccato)

  const { el, chiudi } = foglio(`
    <div class="foglio-testa">
      <h2 class="dos-nome">${esc(voce.nome)}</h2>
      <button class="tondo" data-chiudi aria-label="Chiudi">${icona("chiudi")}</button>
    </div>
    ${sotto ? `<p class="dos-fonte">${esc(sotto)}</p>` : ""}
    ${pezzo ? `
      <div class="segmenti dos-modi" role="tablist">
        <button role="tab" data-modo="pezzi">${esc(pezzo.plurale)}</button>
        <button role="tab" data-modo="grammi">Grammi</button>
      </div>` : ""}
    <div class="dos-schermo" aria-live="polite"></div>
    <div class="dos-comandi"></div>
    <button class="pillola terra larga" data-azione="conferma">Conferma</button>
    ${onRimuovi ? `<button class="dos-rimuovi" data-azione="rimuovi">${icona("cestino")} Rimuovi</button>` : ""}`);

  const anteprima = () => conGrammi(voce, Math.max(0, grammi));

  function disegna() {
    el.querySelectorAll("[data-modo]").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.modo === modo)));
    const v = anteprima();
    el.querySelector(".dos-schermo").innerHTML = `
      <div class="dos-quantita">${modo === "pezzi" ? esc(grammi > 0 ? testoQuantita(v).split(" · ")[0] : `0 ${pezzo.plurale}`) : `${grammi}<span>g</span>`}</div>
      <div class="dos-kcal">${numero(v.kcal)} kcal${modo === "pezzi" ? ` · ${grammi} g` : ""}
        <small>${numero(v.proteine ?? 0)} P · ${numero(v.carboidrati ?? 0)} C · ${numero(v.grassi ?? 0)} G</small></div>`;

    const comandi = el.querySelector(".dos-comandi");
    if (modo === "pezzi") {
      comandi.innerHTML = `
        <div class="dos-passi">
          <button class="dos-tondo" data-azione="meno" aria-label="Un ${esc(pezzo.nome)} in meno">−</button>
          <button class="dos-tondo" data-azione="piu" aria-label="Un ${esc(pezzo.nome)} in più">+</button>
        </div>
        <p class="piccolo centro">1 ${esc(pezzo.nome)} ≈ ${numero(pezzo.g, Number.isInteger(pezzo.g) ? 0 : 1)} g · tieni premuto − o + per ½</p>`;
    } else {
      comandi.innerHTML = `
        <div class="tastierino">
          ${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => `<button data-tasto="${n}">${n}</button>`).join("")}
          <button data-tasto="C" aria-label="Cancella tutto">C</button>
          <button data-tasto="0">0</button>
          <button data-tasto="⌫" aria-label="Cancella una cifra">⌫</button>
        </div>`;
    }
  }

  /* Mezzo pezzo: tenendo premuto − o + si va di ½ invece che di 1 */
  let pressione = null, mezzo = false;
  el.addEventListener("pointerdown", (e) => {
    if (!e.target.closest('[data-azione="meno"], [data-azione="piu"]')) return;
    mezzo = false;
    pressione = setTimeout(() => { mezzo = true; navigator.vibrate?.(10); }, 450);
  });
  el.addEventListener("pointerup", () => clearTimeout(pressione));

  el.addEventListener("click", (e) => {
    const m = e.target.closest("[data-modo]");
    if (m) { modo = m.dataset.modo; digitato = null; disegna(); return; }

    const t = e.target.closest("[data-tasto]")?.dataset.tasto;
    if (t) {
      // il primo tasto premuto sostituisce il numero di partenza
      if (t === "C") digitato = "";
      else if (t === "⌫") digitato = (digitato ?? String(grammi)).slice(0, -1);
      else digitato = ((digitato ?? "") + t).replace(/^0+(?=\d)/, "").slice(0, 4);
      grammi = Number(digitato) || 0;
      disegna();
      return;
    }

    const a = e.target.closest("[data-azione]")?.dataset.azione;
    if (a === "meno" || a === "piu") {
      const passo = mezzo ? 0.5 : 1;
      const attuali = Math.round((grammi / pezzo.g) * 2) / 2;
      const nuovi = Math.max(0, a === "piu" ? attuali + passo : attuali - passo);
      grammi = Math.round(nuovi * pezzo.g);
      mezzo = false;
      disegna();
    }
    if (a === "conferma") {
      if (grammi <= 0) { onRimuovi ? (onRimuovi(), chiudi()) : chiudi(); return; }
      onConferma(anteprima());
      chiudi();
    }
    if (a === "rimuovi") { onRimuovi(); chiudi(); }
  });

  disegna();
}
