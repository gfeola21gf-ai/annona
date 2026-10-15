/* =========================================================
   peso.js — LA BILANCIA: il legionario sulla bilancia,
   l'ultimo peso, l'obiettivo e il grafico dell'andamento.
   ========================================================= */

import * as store from "../dati/store.js";
import * as R from "../logica/riepilogo.js";
import { avanzamento } from "../logica/energia.js";
import { graficoPeso, VISTE } from "../grafica/grafico.js";
import { legionario } from "../grafica/mascotte.js";
import { icona } from "../grafica/icone.js";
import { kg, foglio, leggiNumero, avviso, esc } from "../ui.js";

let vista = "settimana";

const quandoLeggibile = (iso) => {
  const d = new Date(iso);
  const ora = d.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
  const oggi = new Date().toDateString() === d.toDateString();
  return oggi ? `Oggi, ${ora}` : `${d.toLocaleDateString("it-IT", { weekday: "short", day: "numeric", month: "short" })}, ${ora}`;
};

export function mostra(el) {
  function disegna() {
    const profilo = store.profilo() ?? {};
    const pesate = R.pesateOrdinate();
    const ultima = pesate[pesate.length - 1];
    const attuale = R.pesoAttuale();
    const iniziale = Number(profilo.pesoIniziale) || attuale;
    const obiettivo = Number(profilo.pesoObiettivo);
    const delta = attuale - iniziale;
    const mancano = obiettivo ? obiettivo - attuale : 0;
    const perc = obiettivo ? avanzamento(iniziale, attuale, obiettivo) : 0;

    el.innerHTML = `
      <header class="intest">
        <span class="tondo invisibile"></span>
        <h1 class="titolo-romano">La bilancia</h1>
        <span class="tondo invisibile"></span>
      </header>

      <section class="peso-card">
        ${legionario("bilancia", { peso: ultima ? kg(ultima.kg) : "" })}
        <div class="peso-num">
          <small>${ultima ? esc(quandoLeggibile(ultima.quando)) : "Nessuna pesata"}</small>
          <div class="grande">${attuale ? kg(attuale) : "–"}<span>kg</span></div>
          ${Math.abs(delta) >= 0.05 ? `<span class="delta ${(delta < 0) === (obiettivo < iniziale) ? "buono" : ""}">${delta < 0 ? "↓" : "↑"} ${kg(Math.abs(delta))} kg dall'inizio</span>` : ""}
          ${obiettivo ? `<div class="obiettivo">Obiettivo ${kg(obiettivo)} kg · ${Math.abs(mancano) < 0.05 ? "raggiunto! 🏛" : `mancano ${kg(Math.abs(mancano))}`}</div>
          <div class="barra-ob"><i style="width:${Math.round(perc * 100)}%"></i></div>` : ""}
        </div>
      </section>

      <div class="periodi" role="tablist">
        ${VISTE.map((v) => `<button role="tab" aria-selected="${v.id === vista}" data-vista="${v.id}">${v.nome}</button>`).join("")}
      </div>

      <section class="grafico">
        <div class="legenda"><span><i class="leg-punto"></i>Pesate</span><span><i class="leg-linea"></i>Media 7 giorni</span></div>
        ${graficoPeso(pesate, vista)}
      </section>

      <button class="pillola terra larga" data-azione="nuova">${icona("piu")} Nuova pesata</button>

      ${pesate.length ? `
        <h2 class="sopra">Ultime pesate</h2>
        <div class="elenco-pesate">
          ${pesate.slice(-10).reverse().map((p) => `
            <div class="voce" data-id="${p.id}">
              <span class="voce-nome"><strong>${kg(p.kg)} kg</strong><small>${esc(quandoLeggibile(p.quando))}</small></span>
              <button class="tondo piccolo-tondo" data-azione="elimina" aria-label="Elimina pesata">${icona("cestino")}</button>
            </div>`).join("")}
        </div>` : ""}`;
  }

  function nuovaPesata() {
    const adesso = new Date();
    const locale = new Date(adesso.getTime() - adesso.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    const { el: f, chiudi } = foglio(`
      <div class="foglio-testa"><h2 class="titolo-romano">Nuova pesata</h2><button class="tondo" data-chiudi aria-label="Chiudi">${icona("chiudi")}</button></div>
      <form class="modulo">
        <label class="campo grande-campo"><span>Peso (kg)</span>
          <input name="kg" inputmode="decimal" placeholder="${kg(R.pesoAttuale() || 80)}" autocomplete="off"></label>
        <label class="campo"><span>Quando</span><input type="datetime-local" name="quando" value="${locale}" max="${locale}"></label>
        <p class="piccolo">Consiglio: pesati al mattino, a digiuno, dopo il bagno. La linea "media 7 giorni" ignora le oscillazioni dell'acqua.</p>
        <button class="pillola terra larga">Salva</button>
      </form>`);
    f.querySelector('[name="kg"]').focus();
    f.querySelector("form").addEventListener("submit", (e) => {
      e.preventDefault();
      const valore = leggiNumero(e.target.kg.value);
      if (!(valore >= 30 && valore <= 300)) { avviso("Scrivi il peso in kg, es. 78,4", "errore"); return; }
      store.salva("pesate", { quando: new Date(e.target.quando.value || Date.now()).toISOString(), kg: valore });
      chiudi();
      avviso(`Registrato: ${kg(valore)} kg`);
    });
  }

  el.addEventListener("click", (e) => {
    const v = e.target.closest("[data-vista]");
    if (v) { vista = v.dataset.vista; disegna(); return; }
    const a = e.target.closest("[data-azione]")?.dataset.azione;
    if (a === "nuova") nuovaPesata();
    if (a === "elimina") {
      const id = e.target.closest(".voce").dataset.id;
      if (confirm("Eliminare questa pesata?")) store.elimina("pesate", id);
    }
  });

  const aggiorna = () => disegna();
  window.addEventListener("annona-dati", aggiorna);
  disegna();
  return () => window.removeEventListener("annona-dati", aggiorna);
}

