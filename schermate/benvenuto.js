/* =========================================================
   benvenuto.js — l'ONBOARDING: il giuramento.

   Passi, uno per schermata:
     1…n  le domande di domande.js (motivazione, perché, …)
     corpo      sesso, data di nascita, altezza
     peso       peso di partenza
     movimento  quanto ti muovi in una giornata normale (allenamenti esclusi): senza, il fabbisogno è solo il basale
     allenamento  ti alleni? cardio e/o pesi (per le proteine «consigliate», 2026-10-30)
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
import { pesoAttuale, quotidianoDel } from "../logica/riepilogo.js";
import { apriMovimento, testoFattore } from "./movimento.js";
import { VERSIONE_REGOLE, VERSIONE_NOVITA } from "../logica/regole.js";

const PASSI = [...DOMANDE.map((d) => d.id), "corpo", "peso", "movimento", "allenamento", "meta", "riepilogo"];
const BOZZA = "annona.bozza";

/** La bozza: quello che hai risposto finora (sopravvive a un ricaricamento) */
function leggiBozza() {
  try { return JSON.parse(sessionStorage.getItem(BOZZA)) ?? null; } catch { return null; }
}
const salvaBozza = (b) => { try { sessionStorage.setItem(BOZZA, JSON.stringify(b)); } catch { /* pazienza */ } };

const kgTesto = (v) => numero(v, 2).replace(/0$/, "");

/** I ritmi possibili, in base alla direzione, in PERCENTUALE del peso (energia.opzioniRitmo): si salva la SCELTA (`ritmoScelta`) */
function ritmi(pesoAttuale, pesoObiettivo) {
  if (!pesoObiettivo || Math.abs(pesoObiettivo - pesoAttuale) < 0.3) return [{ id: "mantenere", v: 0, nome: "Mantenere", nota: "nessun deficit" }];
  return E.opzioniRitmo(pesoObiettivo < pesoAttuale ? "giu" : "su", pesoAttuale).map((o) => ({
    ...o, nome: E.nomeRitmo(o.id),
    nota: `${o.v > 0 ? "+" : ""}${kgTesto(o.v)} kg a settimana (${numero(o.perc, 2).replace(/0$/, "")}% del peso)`,
  }));
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
          <input type="text" name="peso" inputmode="decimal" placeholder="es. 80,0" value="${bozza.pesoIniziale ? kg(bozza.pesoIniziale) : ""}"></label></div>`;
    } else if (passo === "movimento") {
      const scelto = bozza.movimento?.[0]?.livello;
      corpo = `
        <p class="sopra centro">La tua giornata</p>
        <h1 class="titolo-romano centro">Quanto ti muovi?</h1>
        <p class="sotto centro">In una giornata normale, <b>senza contare gli allenamenti</b>: quelli li registrerai a parte.</p>
        <button class="aiuto-livello" data-azione="guida">${icona("stelle")}<span><b>Non sai quale scegliere?</b>Rispondi a 4 domande facili</span>${icona("dx")}</button>
        <div class="livelli">${E.LIVELLI.map((l) => `
          <button class="livello" data-livello="${l.id}" aria-pressed="${l.id === scelto}">
            <b>${l.nome}</b><em>${testoFattore(l.fattore)}</em><small>${esc(l.esempio)} ${l.passi[0].toUpperCase() + l.passi.slice(1)}.</small></button>`).join("")}
        </div>`;
    } else if (passo === "allenamento") {
      const a = bozza.allenamento;
      const opzione = (id, nome, esempio, premuto) => `
          <button class="livello" data-allena="${id}" aria-pressed="${premuto}"><b>${nome}</b><small>${esempio}</small></button>`;
      corpo = `
        <p class="sopra centro">Gli allenamenti</p>
        <h1 class="titolo-romano centro">Ti alleni?</h1>
        <p class="sotto centro">Serve per calcolare le <b>proteine</b> giuste per te. Se fai entrambi, <b>scegline due</b>.</p>
        <div class="livelli">
          ${opzione("nessuno", "Nessun allenamento", "Niente palestra né sport fatti con regolarità.", Array.isArray(a) && !a.length)}
          ${opzione("cardio", "Cardio o sport", "Corsa, bici, nuoto, calcio, padel… almeno 2 volte a settimana.", !!a?.includes("cardio"))}
          ${opzione("pesi", "Pesi", "Palestra, kettlebell, esercizi di forza… almeno 2 volte a settimana.", !!a?.includes("pesi"))}
        </div>`;
    } else if (passo === "meta") {
      // in modifica (da "Io") il ritmo si calcola dal peso di oggi, non da quello di partenza
      const attuale = (modifica ? pesoAttuale() : Number(bozza.pesoIniziale)) || 0;
      const opzioni = ritmi(attuale, Number(bozza.pesoObiettivo));
      // prima la scelta salvata (il numero cambia col peso), poi il numero, poi quella di mezzo
      const scelta = opzioni.find((o) => o.id === bozza.ritmoScelta) ?? opzioni.find((o) => o.v === bozza.ritmo) ?? opzioni[Math.min(1, opzioni.length - 1)];
      bozza.ritmo = scelta.v; bozza.ritmoScelta = scelta.id;
      const quot = quotidianoBozza();
      const minimo = E.minimoKcal(bozza.sesso);
      const dettaglio = (o) => {
        const piano = E.pianoDelGiorno(quot, E.kcalGiornalierePerRitmo(o.v), minimo);
        const vero = E.ritmoEffettivo(quot, o.v, minimo);
        return `mangi ${numero(piano)} kcal al giorno` +
          (o.v < 0 && vero > o.v + 0.045 ?   // differenze minime (−0,3 → −0,27) non valgono un avviso
           `<br><em class="sotto-minimo">Sotto il minimo di ${numero(minimo)} kcal: perderai circa ${kgTesto(vero)} kg</em>` : "");
      };
      corpo = `
        <p class="sopra centro">La meta</p>
        <h1 class="titolo-romano centro">Dove vuoi arrivare?</h1>
        <div class="modulo">
          <label class="campo grande-campo"><span>Peso obiettivo (kg)</span>
            <input type="text" name="obiettivo" inputmode="decimal" placeholder="es. ${attuale ? kg(attuale - 5) : "75,0"}" value="${bozza.pesoObiettivo ? kg(bozza.pesoObiettivo) : ""}"></label>
          <div class="campo"><span>Con che ritmo?</span>
            <div class="scelte colonna">
              ${opzioni.map((o) => `
                <label class="scelta"><input type="radio" name="ritmo" value="${o.v}" data-scelta="${o.id}" ${o.id === bozza.ritmoScelta ? "checked" : ""}>
                  <span><b>${o.nome}</b><small>${o.nota} · ${dettaglio(o)}</small></span></label>`).join("")}
            </div></div>
          <p class="piccolo">${icona("scudo")} Come dicono le linee guida: ritmo in proporzione al tuo peso e mai sotto ${numero(minimo)} kcal al giorno.</p>
        </div>`;
    } else {
      // RIEPILOGO
      const bas = basaleBozza();
      const mov = E.livello(bozza.movimento?.[0]?.livello);
      const quotidiano = quotidianoBozza();
      const minimo = E.minimoKcal(bozza.sesso);
      const piano = E.pianoDelGiorno(quotidiano, E.kcalGiornalierePerRitmo(bozza.ritmo), minimo);
      const ob = piano - quotidiano;                                   // il deficit VERO (con il minimo)
      const ritmoVero = Math.round(E.ritmoEffettivo(quotidiano, bozza.ritmo, minimo) * 100) / 100;
      const alMinimo = bozza.ritmo < 0 && ritmoVero > bozza.ritmo + 0.045;
      const settimane = E.settimaneAllObiettivo(bozza.pesoIniziale, bozza.pesoObiettivo, ritmoVero);
      const arrivo = settimane ? daChiave(aggiungiGiorni(oggi(), settimane * 7)) : null;
      corpo = `
        <p class="sopra centro">Il tuo piano</p>
        <h1 class="titolo-romano centro">Ecco i numeri</h1>
        <div class="riepilogo">
          <div><small>Metabolismo basale</small><strong class="classico">${numero(bas)} kcal</strong><span>quello che bruci a riposo, ogni giorno</span></div>
          ${mov ? `<div><small>Con il tuo movimento (${esc(mov.nome.toLowerCase())})</small><strong class="classico">${numero(quotidiano)} kcal</strong><span>basale ${testoFattore(mov.fattore)}: quello che bruci in una giornata normale</span></div>` : ""}
          <div><small>${ob < 0 ? "Deficit" : ob > 0 ? "Surplus" : "Bilancio"} ${alMinimo ? "col minimo" : "voluto"}</small><strong class="classico">${numero(ob)} kcal</strong><span>al giorno, per ${ritmoVero ? `${kgTesto(ritmoVero)} kg a settimana` : "mantenere il peso"}</span></div>
          <div><small>Nei giorni senza allenamenti</small><strong class="classico">${numero(piano)} kcal</strong><span>da mangiare. Ogni attività che registri le aumenta.</span></div>
          ${arrivo ? `<div><small>Arrivo previsto</small><strong class="classico">${nomeMese(arrivo.getMonth())} ${arrivo.getFullYear()}</strong><span>circa ${settimane} settimane, se mantieni il ritmo</span></div>` : ""}
        </div>
        ${alMinimo ? `<p class="nota-avviso">${icona("scudo")} <span>Per stare bene non si scende sotto ${numero(minimo)} kcal al giorno: il tuo ritmo vero sarà circa ${kgTesto(ritmoVero)} kg a settimana. Per andare più veloce, <b>muoviti di più</b>: ogni allenamento registrato ti dà calorie in più.</span></p>` : ""}`;
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

  /** Il basale dai dati scritti finora (nel benvenuto il profilo non c'è ancora) */
  function basaleBozza() {
    return E.basale({ sesso: bozza.sesso, eta: etaDa(bozza.nascita), altezza: Number(bozza.altezza), peso: Number(bozza.pesoIniziale) });
  }
  /** Quello che bruci in una giornata normale: da Io quello di oggi, nel benvenuto dai dati scritti */
  const quotidianoBozza = () => (modifica ? quotidianoDel()
    : Math.round(basaleBozza() * (E.livello(bozza.movimento?.[0]?.livello)?.fattore ?? 1)));
  const scegliMovimento = (id) => {
    bozza.movimento = [{ da: "0000-01-01", livello: id }];
    disegna();
    // nel benvenuto, scelto il livello si va avanti da soli (il tasto Avanti era sotto, fuori schermo)
    if (!modifica && PASSI[indice] === "movimento") setTimeout(() => { salvaBozza(bozza); indice++; disegna(); }, 350);
  };

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
    } else if (passo === "movimento") {
      if (!bozza.movimento?.length) return "Scegli il livello che ti somiglia di più: serve per calcolare quanto puoi mangiare.";
    } else if (passo === "allenamento") {
      if (!Array.isArray(bozza.allenamento)) return "Scegli una risposta: serve per le proteine.";
    } else if (passo === "meta") {
      bozza.pesoObiettivo = leggiNumero(val("obiettivo"));
      bozza.ritmo = Number(el.querySelector('[name="ritmo"]:checked')?.value ?? 0);
      bozza.ritmoScelta = el.querySelector('[name="ritmo"]:checked')?.dataset.scelta ?? "mantenere";
      if (!(bozza.pesoObiettivo >= 30 && bozza.pesoObiettivo <= 300)) return "Inserisci il peso obiettivo in kg.";
      // se l'obiettivo è cambiato direzione, il ritmo scelto potrebbe non valere più
      const validi = ritmi(modifica ? pesoAttuale() : bozza.pesoIniziale, bozza.pesoObiettivo).map((o) => o.id);
      if (!validi.includes(bozza.ritmoScelta)) { disegna(); return "Scegli di nuovo il ritmo."; }
    }
    return null;
  }

  function finisci() {
    const nuovo = { ...bozza, completato: true };
    // chi arriva adesso ha già le regole e le novità di oggi: niente aggiornamenti né schermata «Novità»
    if (!modifica) { nuovo.versioneRegole = VERSIONE_REGOLE; nuovo.novitaVista = VERSIONE_NOVITA; }
    delete nuovo.aggiornato;
    store.salvaProfilo(nuovo);
    sessionStorage.removeItem(BOZZA);
    if (!modifica && !store.elenco("pesate").length && nuovo.pesoIniziale) {
      store.salva("pesate", { quando: new Date().toISOString(), kg: nuovo.pesoIniziale });
    }
  }

  el.addEventListener("click", (e) => {
    const livello = e.target.closest("[data-livello]")?.dataset.livello;
    if (livello) return scegliMovimento(livello);
    const allena = e.target.closest("[data-allena]")?.dataset.allena;
    if (allena) {
      if (allena === "nessuno") bozza.allenamento = [];
      else {
        const a = new Set(bozza.allenamento ?? []);
        a.has(allena) ? a.delete(allena) : a.add(allena);
        bozza.allenamento = [...a];
      }
      return disegna();
    }
    const azione = e.target.closest("[data-azione]")?.dataset.azione;
    if (azione === "guida") return apriMovimento({ basale: basaleBozza(), onScelto: scegliMovimento, domande: true });
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
