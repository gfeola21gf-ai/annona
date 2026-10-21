/* =========================================================
   io.js — il PROFILO: giuramento, dati, obiettivo, macronutrienti, account.
   Ogni riga riapre il passo giusto dell'onboarding.
   ========================================================= */

import * as store from "../dati/store.js";
import * as R from "../logica/riepilogo.js";
import { etaDa } from "../logica/giorni.js";
import { DOMANDE } from "../domande.js";
import { icona, marchio } from "../grafica/icone.js";
import { esc, numero, kg, conSegno, avviso, foglio } from "../ui.js";
import { apriMacro, testoMacro } from "./macro.js";
import { apriPausa, apriPercorso } from "./guardiano.js";
import { apriMovimento, testoFattore } from "./movimento.js";
import * as G from "../logica/guardiano.js";
import { nomeGiorno } from "../logica/giorni.js";

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
    <p class="piccolo centro">${icona("stelle")} Nel profilo resta chiuso: si legge solo aprendolo.</p>`);
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
        <div class="riga-profilo fissa"><span><small>Metabolismo basale (dal peso di oggi)</small><strong>${numero(R.basaleAttuale())} kcal al giorno</strong></span></div>
        <button class="riga-profilo" data-azione="movimento"><span><small>Movimento di ogni giorno (senza allenamenti)${R.livelloDel() ? "" : " · da scegliere"}</small>
          <strong>${R.livelloDel() ? `${R.livelloDel().nome} · ${testoFattore(R.fattoreDel())} → ${numero(R.quotidianoDel())} kcal` : "Tocca qui per sceglierlo"}</strong></span>${icona("matita")}</button>
      </div>

      <h2 class="sopra">La meta</h2>
      <div class="gruppo">
        ${riga("meta", `Peso obiettivo · ritmo · ${conSegno(R.obiettivoKcal())} kcal al giorno`,
          `${p.pesoObiettivo ? kg(p.pesoObiettivo) : "—"} kg · ${conSegno(Number(p.ritmo) || 0, 2).replace(/(,\d)0$/, "$1")} kg a settimana`)}
        <button class="riga-profilo" data-azione="macro"><span><small>Macronutrienti${p.macro ? "" : " · da scegliere"}</small>
          ${(() => { const r = R.percentualiMacro(); return `<strong>Carb. ${r.c}% · Prot. ${r.p}% · Grassi ${r.g}%</strong>
          <i class="mini-ripartizione" aria-hidden="true"><b class="c-carbo" style="width:${r.c}%"></b><b class="c-prot" style="width:${r.p}%"></b><b class="c-grassi" style="width:${r.g}%"></b></i>`; })()}
          </span>${icona("matita")}</button>
      </div>

      <h2 class="sopra">Il guardiano del metabolismo</h2>
      <div class="gruppo">
        <button class="riga-profilo" data-azione="percorso"><span><small>Chiedi all'IA</small><strong>Valuta il mio percorso</strong></span>${icona("stelle")}</button>
        <button class="riga-profilo" data-azione="pausa"><span><small>Pausa dalla dieta</small><strong>${statoPausa()}</strong></span>${icona("scudo")}</button>
      </div>

      <h2 class="sopra">Account</h2>
      <div class="gruppo">
        <div class="riga-profilo fissa"><span><small>${store.soloLocale() ? "Modalità prova" : "Accesso come"}</small><strong>${esc(utente?.email ?? "")}</strong></span></div>
        <button class="riga-profilo" data-azione="sincronizza"><span><small>Dati sul server</small><strong>${inCoda ? `${inCoda} modifiche in attesa di internet` : "Tutto salvato"}</strong></span>${icona("nuvola")}</button>
        <button class="riga-profilo" data-azione="scarica"><span><small>Copia di sicurezza</small><strong>Scarica i miei dati</strong></span>${icona("scarica")}</button>
        <button class="riga-profilo" data-azione="esci"><span><strong>Esci</strong></span>${icona("esci")}</button>
      </div>
      <p class="piccolo centro">Annona · versione 1</p>`;
  }

  el.addEventListener("click", async (e) => {
    const a = e.target.closest("[data-azione]")?.dataset.azione;
    if (a === "giuramento") apriGiuramento();
    if (a === "scarica") scaricaDati();
    if (a === "macro") apriMacro({ onSalvato: disegna });
    if (a === "movimento") apriMovimento({ onSalvato: disegna });
    if (a === "percorso") apriPercorso({ onFatto: disegna });
    if (a === "pausa") apriPausa({ onFatto: disegna });
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
