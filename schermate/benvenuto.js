/* =========================================================
   benvenuto.js — l'ONBOARDING: il giuramento.

   Passi, uno per schermata:
     1…n  le domande di domande.js (motivazione, perché, …)
     corpo      sesso, data di nascita, altezza
     peso       peso di partenza
     meta       peso obiettivo e ritmo
     riepilogo  basale, piano del giorno, tempo stimato

   Da "Io" si può riaprire un singolo passo: #/benvenuto?passo=corpo&modifica=1
   ========================================================= */

import * as store from "../dati/store.js";
import * as E from "../logica/energia.js";
import { etaDa, oggi, aggiungiGiorni, nomeMese, daChiave } from "../logica/giorni.js";
import { DOMANDE } from "../domande.js";
import { legionario } from "../grafica/mascotte.js";
import { icona } from "../grafica/icone.js";
import { esc, numero, kg, leggiNumero, avviso } from "../ui.js";
import { pesoAttuale } from "../logica/riepilogo.js";

const PASSI = [...DOMANDE.map((d) => d.id), "corpo", "peso", "meta", "riepilogo"];
const BOZZA = "annona.bozza";

/** La bozza: quello che hai risposto finora (sopravvive a un ricaricamento) */
function leggiBozza() {
  try { return JSON.parse(sessionStorage.getItem(BOZZA)) ?? null; } catch { return null; }
}
const salvaBozza = (b) => { try { sessionStorage.setItem(BOZZA, JSON.stringify(b)); } catch { /* pazienza */ } };

/** I ritmi possibili, in base alla direzione (dimagrire o aumentare) */
function ritmi(pesoAttuale, pesoObiettivo) {
  if (!pesoObiettivo || Math.abs(pesoObiettivo - pesoAttuale) < 0.3) return [{ v: 0, nome: "Mantenere", nota: "nessun deficit" }];
  if (pesoObiettivo < pesoAttuale) return [
    { v: -0.25, nome: "Dolce", nota: "−0,25 kg a settimana" },
    { v: -0.5, nome: "Costante", nota: "−0,5 kg a settimana" },
    { v: -0.75, nome: "Deciso", nota: "−0,75 kg a settimana" },
  ];
  return [
    { v: 0.25, nome: "Dolce", nota: "+0,25 kg a settimana" },
    { v: 0.5, nome: "Deciso", nota: "+0,5 kg a settimana" },
  ];
}

export function mostra(el, parametri, { vai }) {
  const modifica = parametri.modifica === "1";
  let bozza = (!modifica && leggiBozza()) || { risposte: {}, sesso: "M", ...structuredClone(store.profilo() ?? {}) };
  bozza.risposte ??= {};
  let indice = Math.max(0, PASSI.indexOf(parametri.passo ?? PASSI[0]));

  function disegna() {
    const passo = PASSI[indice];
    const domanda = DOMANDE.find((d) => d.id === passo);
    const ultimo = indice === PASSI.length - 1;
    const testa = `
      <div class="testa-passi">
        <button class="tondo trasparente" data-azione="indietro" aria-label="Indietro">${icona("indietro")}</button>
        ${modifica ? "" : `<span class="conta">${indice + 1} di ${PASSI.length}</span>`}
      </div>
      ${modifica ? "" : `<div class="passi">${PASSI.map((_, i) => `<i class="${i <= indice ? "fatto" : ""}"></i>`).join("")}</div>`}`;

    let corpo = "";
    if (domanda) {
      corpo = `
        <p class="sopra centro">${esc(domanda.sopra)}</p>
        <h1 class="titolo-romano centro">${esc(domanda.titolo)}</h1>
        <div class="onb-mascotte">${legionario(indice === 0 ? "rotolo" : "pensa")}</div>
        <label class="risposta">
          <span class="piccolo">${esc(domanda.aiuto)}</span>
          <textarea name="risposta" rows="3" maxlength="200" placeholder="${esc(domanda.esempio)}">${esc(bozza.risposte[domanda.id] ?? "")}</textarea>
          <span class="riga-tra"><span class="piccolo">${icona("mic")} Puoi dettare con il microfono della tastiera</span><span class="piccolo conteggio">0/200</span></span>
        </label>`;
    } else if (passo === "corpo") {
      corpo = `
        <p class="sopra centro">Il tuo corpo</p>
        <h1 class="titolo-romano centro">Chi sei?</h1>
        <p class="sotto centro">Servono per calcolare il tuo metabolismo basale: le calorie che bruci a riposo.</p>
        <div class="modulo">
          <div class="campo"><span>Sesso (per la formula)</span>
            <div class="scelte due">
              <label class="scelta"><input type="radio" name="sesso" value="M" ${bozza.sesso !== "F" ? "checked" : ""}><span>Uomo</span></label>
              <label class="scelta"><input type="radio" name="sesso" value="F" ${bozza.sesso === "F" ? "checked" : ""}><span>Donna</span></label>
            </div></div>
          <label class="campo"><span>Data di nascita</span>
            <input type="date" name="nascita" value="${esc(bozza.nascita ?? "")}" max="${aggiungiGiorni(oggi(), -365 * 14)}"></label>
          <label class="campo"><span>Altezza (cm)</span>
            <input type="number" name="altezza" inputmode="numeric" min="120" max="230" placeholder="175" value="${esc(bozza.altezza ?? "")}"></label>
        </div>`;
    } else if (passo === "peso") {
      corpo = `
        <p class="sopra centro">Il punto di partenza</p>
        <h1 class="titolo-romano centro">Quanto pesi oggi?</h1>
        <div class="onb-mascotte">${legionario("bilancia", { peso: bozza.pesoIniziale ? kg(bozza.pesoIniziale) : "" })}</div>
        <div class="modulo"><label class="campo grande-campo"><span>Peso (kg)</span>
          <input type="text" name="peso" inputmode="decimal" placeholder="80,0" value="${bozza.pesoIniziale ? kg(bozza.pesoIniziale) : ""}"></label></div>`;
    } else if (passo === "meta") {
      // in modifica (da "Io") il ritmo si calcola dal peso di oggi, non da quello di partenza
      const attuale = (modifica ? pesoAttuale() : Number(bozza.pesoIniziale)) || 0;
      const opzioni = ritmi(attuale, Number(bozza.pesoObiettivo));
      if (!opzioni.some((o) => o.v === bozza.ritmo)) bozza.ritmo = opzioni[Math.min(1, opzioni.length - 1)].v;
      corpo = `
        <p class="sopra centro">La meta</p>
        <h1 class="titolo-romano centro">Dove vuoi arrivare?</h1>
        <div class="modulo">
          <label class="campo grande-campo"><span>Peso obiettivo (kg)</span>
            <input type="text" name="obiettivo" inputmode="decimal" placeholder="${attuale ? kg(attuale - 5) : "75,0"}" value="${bozza.pesoObiettivo ? kg(bozza.pesoObiettivo) : ""}"></label>
          <div class="campo"><span>Con che ritmo?</span>
            <div class="scelte colonna">
              ${opzioni.map((o) => `
                <label class="scelta"><input type="radio" name="ritmo" value="${o.v}" ${o.v === bozza.ritmo ? "checked" : ""}>
                  <span><b>${o.nome}</b><small>${o.nota} · ${numero(Math.abs(E.kcalGiornalierePerRitmo(o.v)))} kcal al giorno ${o.v < 0 ? "di deficit" : o.v > 0 ? "di surplus" : ""}</small></span></label>`).join("")}
            </div></div>
        </div>`;
    } else {
      // RIEPILOGO
      const bas = E.basale({ sesso: bozza.sesso, eta: etaDa(bozza.nascita), altezza: Number(bozza.altezza), peso: Number(bozza.pesoIniziale) });
      const ob = E.kcalGiornalierePerRitmo(bozza.ritmo);
      const piano = bas + ob;
      const settimane = E.settimaneAllObiettivo(bozza.pesoIniziale, bozza.pesoObiettivo, bozza.ritmo);
      const arrivo = settimane ? daChiave(aggiungiGiorni(oggi(), settimane * 7)) : null;
      const soglia = bozza.sesso === "F" ? 1200 : 1400;
      corpo = `
        <p class="sopra centro">Il tuo piano</p>
        <h1 class="titolo-romano centro">Ecco i numeri</h1>
        <div class="riepilogo">
          <div><small>Metabolismo basale</small><strong class="classico">${numero(bas)} kcal</strong><span>quello che bruci a riposo, ogni giorno</span></div>
          <div><small>${ob < 0 ? "Deficit" : ob > 0 ? "Surplus" : "Bilancio"} voluto</small><strong class="classico">${numero(ob)} kcal</strong><span>al giorno, per ${bozza.ritmo ? `${numero(bozza.ritmo, 2)} kg a settimana` : "mantenere il peso"}</span></div>
          <div><small>Nei giorni senza attività</small><strong class="classico">${numero(piano)} kcal</strong><span>da mangiare. Ogni attività che registri le aumenta.</span></div>
          ${arrivo ? `<div><small>Arrivo previsto</small><strong class="classico">${nomeMese(arrivo.getMonth())} ${arrivo.getFullYear()}</strong><span>circa ${settimane} settimane, se mantieni il ritmo</span></div>` : ""}
        </div>
        ${piano < soglia ? `<p class="nota-avviso">${icona("stelle")} ${numero(piano)} kcal sono poche: il basale non conta digestione e movimenti quotidiani, quindi il tuo deficit vero sarà più grande. Valuta un ritmo più dolce.</p>` : ""}`;
    }

    el.innerHTML = `
      <div class="onboarding">
        ${testa}
        <div class="onb-corpo">${corpo}</div>
        <p class="errore" hidden></p>
        <button class="pillola terra larga" data-azione="avanti">${modifica ? "Salva" : ultimo ? "Giuro e inizio" : "Avanti"}</button>
      </div>`;

    // conteggio caratteri delle risposte
    const area = el.querySelector("textarea");
    if (area) {
      const conta = () => (el.querySelector(".conteggio").textContent = `${area.value.length}/200`);
      area.addEventListener("input", conta);
      conta();
    }
    // nel passo "meta" i ritmi cambiano se cambi l'obiettivo
    el.querySelector('[name="obiettivo"]')?.addEventListener("change", (e) => {
      bozza.pesoObiettivo = leggiNumero(e.target.value) || null;
      disegna();
    });
  }

  /** Legge e controlla i campi del passo attuale. Restituisce un messaggio d'errore o null. */
  function raccogli() {
    const passo = PASSI[indice];
    const domanda = DOMANDE.find((d) => d.id === passo);
    const val = (n) => el.querySelector(`[name="${n}"]`)?.value?.trim() ?? "";
    if (domanda) {
      const t = val("risposta");
      if (domanda.obbligatoria && t.length < 3) return "Scrivi almeno qualche parola: è il cuore del tuo percorso.";
      bozza.risposte[domanda.id] = t;
    } else if (passo === "corpo") {
      bozza.sesso = el.querySelector('[name="sesso"]:checked')?.value ?? "M";
      bozza.nascita = val("nascita");
      bozza.altezza = Number(val("altezza"));
      if (!bozza.nascita) return "Inserisci la data di nascita.";
      if (!(bozza.altezza >= 120 && bozza.altezza <= 230)) return "L'altezza va in centimetri, es. 175.";
    } else if (passo === "peso") {
      bozza.pesoIniziale = leggiNumero(val("peso"));
      if (!(bozza.pesoIniziale >= 30 && bozza.pesoIniziale <= 300)) return "Inserisci il peso in kg, es. 80,5.";
    } else if (passo === "meta") {
      bozza.pesoObiettivo = leggiNumero(val("obiettivo"));
      bozza.ritmo = Number(el.querySelector('[name="ritmo"]:checked')?.value ?? 0);
      if (!(bozza.pesoObiettivo >= 30 && bozza.pesoObiettivo <= 300)) return "Inserisci il peso obiettivo in kg.";
      // se l'obiettivo è cambiato direzione, il ritmo scelto potrebbe non valere più
      const validi = ritmi(modifica ? pesoAttuale() : bozza.pesoIniziale, bozza.pesoObiettivo).map((o) => o.v);
      if (!validi.includes(bozza.ritmo)) { disegna(); return "Scegli di nuovo il ritmo."; }
    }
    return null;
  }

  function finisci() {
    const nuovo = { ...bozza, completato: true };
    delete nuovo.aggiornato;
    store.salvaProfilo(nuovo);
    sessionStorage.removeItem(BOZZA);
    if (!modifica && !store.elenco("pesate").length && nuovo.pesoIniziale) {
      store.salva("pesate", { quando: new Date().toISOString(), kg: nuovo.pesoIniziale });
    }
  }

  el.addEventListener("click", (e) => {
    const azione = e.target.closest("[data-azione]")?.dataset.azione;
    if (azione === "indietro") {
      if (modifica) return vai("#/io");
      if (indice === 0) return store.profilo()?.completato ? vai("#/io") : null;
      indice--; disegna();
    }
    if (azione === "avanti") {
      const problema = raccogli();
      const errore = el.querySelector(".errore");
      if (problema) { errore.textContent = problema; errore.hidden = false; return; }
      salvaBozza(bozza);
      if (modifica) {
        finisci();
        avviso("Salvato");
        return vai("#/io");
      }
      if (indice === PASSI.length - 1) {
        finisci();
        return vai("#/");
      }
      indice++; disegna();
      el.scrollIntoView();
    }
  });

  disegna();
}
