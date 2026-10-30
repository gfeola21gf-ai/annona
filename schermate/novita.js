/* =========================================================
   novita.js — la schermata «NOVITÀ» (anteprima/novita.html, scelta dell'utente 2026-10-30).

   Schermo intero, una pagina alla volta (pulsante o scorrendo), «Salta»
   sempre in alto. Appare UNA volta dopo un aggiornamento importante
   (logica/regole.js → novitaDaVedere); si rivede da Io → Aiuto.
   I numeri «Per te» sono quelli veri: prima (regole vecchie) → ora.
   ========================================================= */

import * as store from "../dati/store.js";
import * as R from "../logica/riepilogo.js";
import * as E from "../logica/energia.js";
import { VERSIONE_NOVITA } from "../logica/regole.js";
import { pagine } from "../dati/novita.js";
import { legionario } from "../grafica/mascotte.js";
import { numero } from "../ui.js";

const SCELTE = [
  { id: "nessuno", nome: "Nessun allenamento", esempio: "Niente palestra né sport con regolarità." },
  { id: "cardio", nome: "Cardio o sport", esempio: "Corsa, bici, nuoto, calcio, padel…" },
  { id: "pesi", nome: "Pesi", esempio: "Palestra, kettlebell, esercizi di forza…" },
];

/**
 * @param onFine  () => …  quando si chiude (per ridisegnare la schermata sotto)
 */
export function apriNovita({ onFine } = {}) {
  const p = store.profilo() ?? {};
  const chiedeAllenamento = !Array.isArray(p.allenamento);
  let allenamento = Array.isArray(p.allenamento) ? [...p.allenamento] : null;
  const kcal = R.pianoKcal();
  const suMisura = R.macroSuMisura();
  // le proteine di PRIMA: il vecchio predefinito era il 30% delle calorie di allora (col ritmo vecchio, profilo.ritmo)
  const kcalPrima = Math.max(0, E.pianoDelGiorno(R.quotidianoDel(), E.kcalGiornalierePerRitmo(Number(p.ritmo) || 0), R.minimoKcal()));
  const protPrima = Math.round((kcalPrima * 0.3) / 4);
  const protOra = () => E.macroNutrizionista({ kcal, ...R.personaMacro(), allenamento: allenamento ?? [] }).grammi.p;
  const ritmoOra = R.ritmo();
  const contesto = () => ({
    suMisura, protPrima, protOra: protOra(), chiedeAllenamento,
    ritmoPrima: Math.round((Number(p.ritmo) || 0) * 100) / 100, ritmoOra, nomeRitmo: E.nomeRitmo(p.ritmoScelta),
  });
  let indice = 0;

  const el = document.createElement("div");
  el.className = "novita-schermo";
  el.setAttribute("role", "dialog");
  el.setAttribute("aria-modal", "true");
  document.body.append(el);
  document.documentElement.classList.add("con-foglio");
  requestAnimationFrame(() => el.classList.add("aperto"));

  const perTe = (t) => t && `
    <div class="nov-perte"><div><small>PER TE</small><span>${t.etichetta}</span></div>
      <b>${String(t.prima) !== String(t.ora) ? `<s>${typeof t.prima === "number" ? numero(t.prima) : t.prima}</s>` : ""}${typeof t.ora === "number" ? numero(t.ora) : t.ora}<em>${t.unita}</em></b></div>`;

  function disegna() {
    const tutte = pagine(contesto());
    indice = Math.min(indice, tutte.length - 1);
    const pg = tutte[indice];
    const ultima = indice === tutte.length - 1;
    let corpo = "";
    if (pg.posa) corpo += `<div class="nov-mascotte">${legionario(pg.posa)}</div>`;
    corpo += `<p class="nov-sopra">${pg.sopra}</p><h2 class="nov-titolo">${pg.titolo}</h2>`;
    if (pg.primaOra) corpo += `<div class="nov-primaora"><div><small>PRIMA</small><p>${pg.primaOra.prima}</p></div><div class="ora"><small>ORA</small><p>${pg.primaOra.ora}</p></div></div>`;
    if (pg.grafico) corpo += `<div class="nov-grafico" aria-hidden="true"><i style="height:88px">80</i><i style="height:74px">75</i><i style="height:60px">70</i></div>`;
    if (pg.testo) corpo += `<p class="nov-testo">${pg.testo}</p>`;
    if (pg.domanda === "allenamento") corpo += `<div class="nov-scelte">${SCELTE.map((s) => {
      const premuto = s.id === "nessuno" ? !!allenamento && !allenamento.length : !!allenamento?.includes(s.id);
      return `<button class="nov-scelta" data-allena="${s.id}" aria-pressed="${premuto}"><b>${s.nome}</b><small>${s.esempio}</small></button>`;
    }).join("")}</div>`;
    if (pg.perTe) corpo += perTe(pg.perTe);
    if (pg.nota) corpo += `<p class="nov-nota">${pg.nota}</p>`;
    el.innerHTML = `
      <div class="nov-testa"><span>NOVITÀ</span>${ultima ? "<span></span>" : `<button data-azione="salta">Salta</button>`}</div>
      <div class="nov-punti">${tutte.map((_, i) => `<i class="${i <= indice ? "on" : ""}"></i>`).join("")}</div>
      <div class="nov-corpo">${corpo}</div>
      <button class="pillola terra larga" data-azione="avanti">${ultima ? "Inizia" : pg.pulsante ?? "Avanti"}</button>
      ${ultima ? `<p class="nov-rivedi">Rivedi in Io → Aiuto → Novità</p>` : ""}`;
  }

  function chiudi() {
    const nuovo = { ...(store.profilo() ?? {}), novitaVista: VERSIONE_NOVITA };
    if (allenamento) nuovo.allenamento = allenamento;
    store.salvaProfilo(nuovo);
    el.classList.remove("aperto");
    setTimeout(() => { el.remove(); document.documentElement.classList.toggle("con-foglio", !!document.querySelector(".foglio-sfondo:not(.chiuso)")); }, 250);
    onFine?.();
  }
  const vai = (passo) => {
    const n = pagine(contesto()).length;
    if (indice + passo >= n) return chiudi();
    indice = Math.max(0, indice + passo);
    disegna();
  };

  el.addEventListener("click", (e) => {
    const allena = e.target.closest("[data-allena]")?.dataset.allena;
    if (allena) {
      if (allena === "nessuno") allenamento = [];
      else {
        const a = new Set(allenamento ?? []);
        a.has(allena) ? a.delete(allena) : a.add(allena);
        allenamento = [...a];
      }
      return disegna();
    }
    const a = e.target.closest("[data-azione]")?.dataset.azione;
    if (a === "salta") chiudi();
    if (a === "avanti") vai(1);
  });
  // scorrere: verso sinistra avanti, verso destra indietro
  let x0 = null, y0 = null;
  el.addEventListener("touchstart", (e) => { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
  el.addEventListener("touchend", (e) => {
    if (x0 === null) return;
    const dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0;
    x0 = null;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) vai(dx < 0 ? 1 : -1);
  }, { passive: true });

  disegna();
}
