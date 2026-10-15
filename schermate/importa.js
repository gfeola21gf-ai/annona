/* =========================================================
   importa.js — IMPORTA LA SCHEDA da foto, PDF o testo.

   1. scegli la fonte: una foto (anche scritta a mano), un PDF,
      oppure il testo incollato (es. dalle Note);
   2. l'IA la trascrive in giorni e pasti (azione "scheda" della funzione);
   3. controlli giorno per giorno: quantità col dosatore, ✕ per togliere;
   4. "Sostituisci la settimana": la nuova scheda prende il posto della vecchia.
   ========================================================= */

import * as P from "../logica/piano.js";
import { leggiScheda } from "../servizi/ia.js";
import { voceDaStima, testoQuantita } from "../servizi/cibo.js";
import { apriDosatore } from "./dosatore.js";
import { PASTI } from "./oggi.js";
import { icona } from "../grafica/icone.js";
import { esc, numero, foglio, avviso } from "../ui.js";
import { fotoInBase64, fileInBase64 } from "../servizi/foto.js";

// Restano in memoria se esci e rientri (es. per guardare la scheda vecchia)
let letta = null;          // { 1: {colazione: [voci], …}, … }
let note = "";
let inCorso = false;

export function mostra(el, parametri, { vai }) {
  function disegna() {
    const giorniLetti = letta ? Object.keys(letta).length : 0;
    el.innerHTML = `
      <div class="aggiungi">
        <header class="intest">
          <a class="tondo" href="#/razioni" aria-label="Indietro">${icona("indietro")}</a>
          <h1 class="titolo-romano">Importa scheda</h1>
          <span class="tondo invisibile"></span>
        </header>
        <p class="sotto">Fotografa o carica la tua scheda settimanale (anche scritta a mano), oppure incolla il testo. Il legionario la trascrive: tu controlli e confermi.</p>
        <div class="sorgenti">
          <label class="sorgente">${icona("cam")}Foto<input type="file" accept="image/*" data-fonte="foto" hidden></label>
          <label class="sorgente">${icona("documento")}PDF<input type="file" accept="application/pdf,.pdf" data-fonte="pdf" hidden></label>
          <button class="sorgente" data-azione="testo">${icona("matita")}Testo</button>
        </div>
        ${inCorso ? `
          <div class="voce-card"><p class="sotto prov-attesa"><span class="rotella"></span> Il legionario trascrive la scheda… può volerci un minuto.</p></div>` : ""}
        ${letta && !inCorso ? `
          <h2 class="sopra">Il legionario ha letto</h2>
          ${note ? `<div class="nota-avviso">${icona("stelle")}<span>${esc(note)}</span></div>` : ""}
          <div class="letto">
            ${P.NOMI_GIORNI.map((nome, i) => {
              const g = i + 1, pasti = letta[g] ?? {};
              const voci = P.PASTI_ID.flatMap((p) => pasti[p] ?? []);
              return `
                <button class="letto-giorno" data-azione="giorno" data-g="${g}">
                  <b>${P.SIGLE_GIORNI[i]}</b>
                  <span>${voci.length ? esc(P.PASTI_ID.filter((p) => pasti[p]?.length).map((p) => pasti[p].map((v) => P.nomeCortissimo(v.nome)).join(", ")).join(" · ")) : "Nessun pasto letto"}</span>
                  <span class="kcal">${voci.length ? numero(P.sommaKcal(voci)) : "—"}</span>
                </button>`;
            }).join("")}
          </div>
          <p class="piccolo">${icona("stelle")} Tocca un giorno per controllare e correggere le voci.</p>` : ""}
      </div>
      ${letta && !inCorso ? `<div class="piede"><button class="pillola terra larga" data-azione="conferma" ${giorniLetti ? "" : "disabled"}>
        ${P.schedaVuota() ? "Salva la scheda" : "Sostituisci la settimana"}</button></div>` : ""}`;
  }

  async function leggi(richiesta) {
    if (inCorso) return;
    inCorso = true;
    disegna();
    try {
      const r = await leggiScheda(await richiesta());
      letta = {};
      for (const g of r.giorni ?? []) {
        letta[g.giorno] = Object.fromEntries(P.PASTI_ID.map((p) => [p, (g.pasti?.[p] ?? []).map(voceDaStima)]));
      }
      note = r.note || "";
      if (!Object.keys(letta).length) { letta = null; avviso("Non ho trovato pasti in questa scheda: prova con una foto più nitida.", "errore"); }
    } catch (err) {
      avviso(err.message, "errore");
    } finally {
      inCorso = false;
      disegna();
    }
  }

  /** Il foglio di un giorno letto: correggi quantità o togli voci */
  function apriGiorno(g) {
    const pasti = letta[g] ??= {};
    const { el: f } = foglio(`
      <div class="foglio-testa"><h2 class="titolo-romano">${P.NOMI_GIORNI[g - 1]}</h2><button class="tondo" data-chiudi aria-label="Chiudi">${icona("chiudi")}</button></div>
      <div class="imp-pasti"></div>
      <button class="pillola larga" data-chiudi>Fatto</button>`, { onChiudi: disegna });
    const corpo = f.querySelector(".imp-pasti");
    const disegnaGiorno = () => {
      const presenti = PASTI.filter((p) => pasti[p.id]?.length);
      corpo.innerHTML = presenti.length ? presenti.map((p) => `
        <h3 class="sopra">${p.nome} · ${numero(P.sommaKcal(pasti[p.id]))} kcal</h3>
        <div class="voci">${pasti[p.id].map((v, i) => `
          <div class="voce" data-pasto="${p.id}" data-i="${i}">
            <div class="voce-nome"><strong>${esc(v.nome)}</strong></div>
            <button class="quantita" data-dosa>${esc(testoQuantita(v))}</button>
            <span class="kcal">${numero(v.kcal)}</span>
            <button class="tondo piccolo-tondo" data-togli aria-label="Togli">${icona("chiudi")}</button>
          </div>`).join("")}</div>`).join("")
        : `<p class="sotto">Nessun pasto per questo giorno: dopo l'import potrai aggiungerli dalla scheda.</p>`;
    };
    f.addEventListener("click", (e) => {
      const riga = e.target.closest(".voce");
      if (!riga) return;
      const { pasto } = riga.dataset, i = Number(riga.dataset.i);
      if (e.target.closest("[data-togli]")) { pasti[pasto].splice(i, 1); disegnaGiorno(); }
      if (e.target.closest("[data-dosa]")) {
        apriDosatore(pasti[pasto][i], {
          onConferma: (nuova) => { pasti[pasto][i] = nuova; disegnaGiorno(); },
          onRimuovi: () => { pasti[pasto].splice(i, 1); disegnaGiorno(); },
        });
      }
    });
    disegnaGiorno();
  }

  function apriTesto() {
    const { el: f, chiudi } = foglio(`
      <div class="foglio-testa"><h2 class="titolo-romano">Incolla la scheda</h2><button class="tondo" data-chiudi aria-label="Chiudi">${icona("chiudi")}</button></div>
      <form class="modulo">
        <label class="campo"><span>Il testo della scheda, giorno per giorno</span>
          <textarea name="testo" rows="9" class="area-scheda" placeholder="Lunedì&#10;Colazione: yogurt greco, 40 g avena&#10;Pranzo: 80 g riso, 150 g pollo&#10;…"></textarea></label>
        <button class="pillola terra larga">${icona("stelle")} Leggi con l'IA</button>
      </form>`);
    f.querySelector("form").addEventListener("submit", (e) => {
      e.preventDefault();
      const testo = e.target.testo.value.trim();
      if (!testo) return;
      chiudi();
      leggi(async () => ({ testo }));
    });
  }

  function conferma() {
    P.sostituisciScheda(letta);
    const n = Object.keys(letta).length;
    letta = null; note = "";
    avviso(`Scheda salvata: ${n === 1 ? "1 giorno" : `${n} giorni`}`);
    vai("#/razioni");
  }

  el.addEventListener("click", (e) => {
    const b = e.target.closest("[data-azione]");
    if (!b || b.disabled) return;
    const a = b.dataset.azione;
    if (a === "testo") apriTesto();
    if (a === "giorno") apriGiorno(Number(b.dataset.g));
    if (a === "conferma") conferma();
  });

  el.addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";               // così si può riscegliere lo stesso file
    if (e.target.dataset.fonte === "pdf") {
      if (file.size > 6 * 1024 * 1024) return avviso("PDF troppo grande (massimo 6 MB).", "errore");
      leggi(async () => ({ file: await fileInBase64(file), tipo: "application/pdf" }));
    } else {
      leggi(async () => ({ file: await fotoInBase64(file), tipo: "image/jpeg" }));
    }
  });

  disegna();
}
