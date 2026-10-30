/* =========================================================
   io.js — il PROFILO: giuramento, dati, obiettivo, macronutrienti, account.
   Ogni riga riapre il passo giusto dell'onboarding.
   ========================================================= */

import * as store from "../dati/store.js";
import * as R from "../logica/riepilogo.js";
import * as E from "../logica/energia.js";
import { etaDa } from "../logica/giorni.js";
import { DOMANDE } from "../domande.js";
import { icona, marchio } from "../grafica/icone.js";
import { esc, numero, kg, conSegno, avviso, foglio } from "../ui.js";
import { apriMacro, testoMacro } from "./macro.js";
import { apriNovita } from "./novita.js";
import { apriPausa, apriPercorso } from "./guardiano.js";
import { apriMovimento, testoFattore } from "./movimento.js";
import * as G from "../logica/guardiano.js";
import { puntoAiuto, fumetto, primoFumetto, rivediFumetti } from "./aiuto.js";

/** «alle 16:20» oggi, «ieri alle 21:05», altrimenti «il 27/10» */
function quandoAllineato() {
  const d = new Date(store.ultimaSincronia());
  const ora = d.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
  const giorni = Math.round((new Date().setHours(0, 0, 0, 0) - new Date(d).setHours(0, 0, 0, 0)) / 86400000);
  return giorni === 0 ? `alle ${ora}` : giorni === 1 ? `ieri alle ${ora}` : `il ${d.toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit" })}`;
}
import { nomeGiorno } from "../logica/giorni.js";
import { apriSuggerimento, apriCambiaPassword, apriInviti, apriSuggerimentiRicevuti, quantiDaLeggere } from "./amici.js";

/** "In corso · giorno 3 di 14" oppure "Nessuna in corso · l'ultima finita il 12 luglio" */
function statoPausa() {
  const inCorso = R.pausaDel();
  if (inCorso) { const { numero: n, totale } = G.giornoDiPausa(inCorso); return `In corso · giorno ${n} di ${totale}`; }
  const ultima = G.ultimaPausa();
  return ultima ? `Nessuna in corso · l'ultima finita ${nomeGiorno(ultima.fine).split(" ").slice(1).join(" ")}` : "Nessuna in corso · tocca per iniziarla";
}

/**
 * COPIA DI SICUREZZA: tutti i tuoi dati (profilo, diario, attività, pesate, scheda) in un file
 * «annona-dati-AAAA-MM-GG.json». Sull'iPhone si apre il menu Condividi: «Salva in File» (anche iCloud Drive).
 */
async function scaricaDati() {
  const dati = {
    app: "Annona", creato: new Date().toISOString(),
    profilo: store.profilo(),
    diario: store.elenco("diario"), attivita: store.elenco("attivita"),
    pesate: store.elenco("pesate"), piano: store.elenco("piano"),
  };
  const nome = `annona-dati-${new Date().toISOString().slice(0, 10)}.json`;
  const file = new File([JSON.stringify(dati, null, 2)], nome, { type: "application/json" });
  try {
    if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], title: "Annona · i miei dati" }); return; }
  } catch (err) {
    if (err?.name === "AbortError") return;          // hai chiuso il menu: va bene così
  }
  const url = URL.createObjectURL(file);             // computer o browser senza «Condividi»: scarica il file
  const a = Object.assign(document.createElement("a"), { href: url, download: nome });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  avviso(`Copia salvata: ${nome}`);
}

/** Il giuramento è riservato: in Io si vede solo aprendolo. Ogni risposta ha la sua matita per modificarla. */
function apriGiuramento() {
  const p = store.profilo() ?? {};
  foglio(`
    <div class="foglio-testa"><h2 class="titolo-romano">Il tuo giuramento</h2><button class="tondo" data-chiudi aria-label="Chiudi">${icona("chiudi")}</button></div>
    <div class="gruppo">${DOMANDE.map((d) => `
      <a class="riga-profilo" href="#/benvenuto?passo=${d.id}&modifica=1">
        <span><small>${esc(d.titolo)}</small><strong>${esc(p.risposte?.[d.id] || "—")}</strong></span>${icona("matita")}</a>`).join("")}
    </div>
    `);
}

export function mostra(el, _p, { vai }) {
  async function disegna() {
    const p = store.profilo() ?? {};
    const utente = await store.utenteAttuale();
    const inCoda = store.inAttesa();
    const riga = (passo, titolo, valore) => `
      <a class="riga-profilo" href="#/benvenuto?passo=${passo}&modifica=1">
        <span><small>${esc(titolo)}</small><strong>${valore}</strong></span>${icona("matita")}</a>`;

    el.innerHTML = `
      <header class="saluto">${marchio()}</header>
      ${primoFumetto("aiuto") ? fumetto("aiuto") : ""}
      <h2 class="sopra">Aiuto</h2>
      <div class="gruppo">
        <a class="riga-profilo" href="#/aiuto"><span><small>Tutte le funzioni, una per una</small><strong>Cosa sa fare Annona</strong></span>${icona("dx")}</a>
        <a class="riga-profilo" href="#/domande"><span><small>Pasti, attività, peso, dieta</small><strong>Domande e consigli</strong></span>${icona("dx")}</a>
        <a class="riga-profilo" href="#/legionario"><span><small>Fai una domanda tua</small><strong>Chiedi al legionario</strong></span>${icona("stelle")}</a>
        <button class="riga-profilo" data-azione="novita"><span><small>Cosa è cambiato nell'ultimo aggiornamento</small><strong>Novità</strong></span>${icona("stelle")}</button>
        <button class="riga-profilo" data-azione="rivedi"><span><small>Le spiegazioni che compaiono una volta sola</small><strong>Rivedi i suggerimenti</strong></span>${icona("annulla")}</button>
      </div>

      <h2 class="sopra">Il tuo giuramento</h2>
      <div class="gruppo">
        <button class="riga-profilo" data-azione="giuramento"><span><small>${(() => {
          const n = DOMANDE.filter((d) => p.risposte?.[d.id]).length;
          return n === 1 ? "1 risposta · riservata" : `${n} risposte · riservate`;
        })()}</small><strong>Apri il giuramento</strong></span>${icona("alloro")}</button>
      </div>

      <h2 class="sopra">Il tuo corpo</h2>
      <div class="gruppo">
        ${riga("corpo", "Sesso · età · altezza", `${p.sesso === "F" ? "Donna" : "Uomo"} · ${p.nascita ? etaDa(p.nascita) : "—"} anni · ${p.altezza ?? "—"} cm`)}
        <div class="riga-profilo fissa"><span><small>Metabolismo basale</small><strong>${numero(R.basaleAttuale())} kcal al giorno</strong></span></div>
        <button class="riga-profilo" data-azione="movimento"><span><small>Movimento di ogni giorno${R.livelloDel() ? "" : " · da scegliere"}${puntoAiuto("movimento")}</small>
          <strong>${R.livelloDel() ? `${R.livelloDel().nome} · ${testoFattore(R.fattoreDel())} → ${numero(R.quotidianoDel())} kcal` : "Tocca qui per sceglierlo"}</strong></span>${icona("matita")}</button>
      </div>

      <h2 class="sopra">La meta</h2>
      <div class="gruppo">
        ${riga("meta", `Peso obiettivo · ritmo · ${(() => {
            const vero = R.pianoKcal() - R.quotidianoDel();       // con il minimo il deficit vero può essere più piccolo
            return vero > R.obiettivoKcal() && R.obiettivoKcal() < 0 ? `${conSegno(vero)} kcal (al minimo di ${numero(R.minimoKcal())})` : `${conSegno(R.obiettivoKcal())} kcal al giorno`;
          })()}`,
          `${p.pesoObiettivo ? kg(p.pesoObiettivo) : "—"} kg · ${R.ritmo() ? `${p.ritmoScelta ? `${E.nomeRitmo(p.ritmoScelta)} · ` : ""}${conSegno(R.ritmo(), 2).replace(/(,\d)0$/, "$1")} kg a settimana` : "mantenere"}`)}
        <button class="riga-profilo" data-azione="macro"><span><small>Macronutrienti · ${(() => {
            const m = R.macroPer(R.pianoKcal());
            if (m.suMisura) return Object.values(m.fuori).some(Boolean) ? `su misura · <b class="fuori-consigli">fuori dai consigli</b>` : "su misura";
            return Array.isArray(p.allenamento) ? "consigliati" : "consigliati · dimmi se ti alleni";
          })()}</small>
          ${(() => { const r = R.percentualiMacro(); return `<strong>Carb. ${r.c}% · Prot. ${r.p}% · Grassi ${r.g}%</strong>
          <i class="mini-ripartizione" aria-hidden="true"><b class="c-carbo" style="width:${r.c}%"></b><b class="c-prot" style="width:${r.p}%"></b><b class="c-grassi" style="width:${r.g}%"></b></i>`; })()}
          </span>${icona("matita")}</button>
      </div>

      <h2 class="sopra">Il guardiano del metabolismo${puntoAiuto("guardiano")}</h2>
      <div class="gruppo">
        <button class="riga-profilo" data-azione="percorso"><span><small>Chiedi all'IA</small><strong>Valuta il mio percorso</strong></span>${icona("stelle")}</button>
        <button class="riga-profilo" data-azione="pausa"><span><small>Pausa dalla dieta</small><strong>${statoPausa()}</strong></span>${icona("scudo")}</button>
      </div>

      <h2 class="sopra">Annona tra amici</h2>
      <div class="gruppo">
        <button class="riga-profilo" data-azione="suggerimento"><span><small>Idee e dubbi</small><strong>Scrivi un suggerimento</strong></span>${icona("matita")}</button>
        ${store.invito()?.ruolo === "admin" ? `
        <button class="riga-profilo" data-azione="inviti"><span><small>Codici e amici</small><strong>Inviti e amici</strong></span>${icona("persona")}</button>
        <button class="riga-profilo" data-azione="ricevuti"><span><small class="da-leggere">Dagli amici</small><strong>Suggerimenti ricevuti</strong></span>${icona("rotolo")}</button>` : ""}
      </div>

      <h2 class="sopra">Account</h2>
      <div class="gruppo">
        <div class="riga-profilo fissa"><span><small>${store.soloLocale() ? "Modalità prova" : "Accesso come"}</small><strong>${esc(utente?.email ?? "")}</strong></span></div>
        <button class="riga-profilo" data-azione="sincronizza"><span><small>Dati sul server</small><strong>${inCoda ? `${inCoda} modifiche in attesa di internet` : store.ultimaSincronia() ? `Allineato ${quandoAllineato()} · tocca per aggiornare` : "Tutto salvato"}</strong></span>${icona("nuvola")}</button>
        ${store.soloLocale() ? "" : `<button class="riga-profilo" data-azione="password"><span><small>Account</small><strong>Cambia password</strong></span>${icona("scudo")}</button>`}
        <button class="riga-profilo" data-azione="scarica"><span><small>Copia di sicurezza</small><strong>Scarica i miei dati</strong></span>${icona("scarica")}</button>
        <button class="riga-profilo" data-azione="esci"><span><strong>Esci</strong></span>${icona("esci")}</button>
      </div>
      <p class="piccolo centro">Annona · versione 1</p>`;
    if (store.invito()?.ruolo === "admin") contaDaLeggere();
  }

  /** Accanto a «Suggerimenti ricevuti»: quanti sono ancora da leggere */
  async function contaDaLeggere() {
    const n = await quantiDaLeggere().catch(() => 0);
    const small = el.querySelector(".da-leggere");
    if (small && n) small.innerHTML = `Dagli amici · <span class="etichetta">${n === 1 ? "1 nuovo" : `${n} nuovi`}</span>`;
  }

  el.addEventListener("click", async (e) => {
    const a = e.target.closest("[data-azione]")?.dataset.azione;
    if (a === "giuramento") apriGiuramento();
    if (a === "scarica") scaricaDati();
    if (a === "macro") apriMacro({ onSalvato: disegna });
    if (a === "movimento") apriMovimento({ onSalvato: disegna });
    if (a === "percorso") apriPercorso({ onFatto: disegna });
    if (a === "pausa") apriPausa({ onFatto: disegna });
    if (a === "suggerimento") apriSuggerimento();
    if (a === "novita") apriNovita({ onFine: disegna });
    if (a === "rivedi") { rivediFumetti(); avviso("Fatto: le spiegazioni ricompariranno."); disegna(); }
    if (a === "password") apriCambiaPassword();
    if (a === "inviti") apriInviti();
    if (a === "ricevuti") apriSuggerimentiRicevuti({ onLetti: disegna });
    if (a === "sincronizza") {
      avviso((await store.sincronizza()) ? "Tutto allineato ✓" : "Non riesco a raggiungere il server, riprovo più tardi.");
      disegna();
    }
    if (a === "esci" && confirm("Vuoi uscire? I dati restano salvati sul tuo account.")) {
      await store.esci();
      vai("#/accesso");
    }
  });

  disegna();
}
