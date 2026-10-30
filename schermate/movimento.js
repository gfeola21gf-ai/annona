/* =========================================================
   movimento.js — il foglio del MOVIMENTO DI OGNI GIORNO (da Io).

   Quanto ti muovi in una giornata normale, ALLENAMENTI ESCLUSI
   (quelli li registri a parte). Due strade:
     1. scegli tu dall'elenco: 5 livelli con esempi di vita vera;
     2. «Non sai quale scegliere?» → 4 domande facili (lavoro,
        spostamenti, casa e tempo libero, passi dell'iPhone) e il
        legionario consiglia il livello, spiegando perché.
   «Da quando vale?»: da sempre, oppure da oggi (se la tua vita è
   cambiata: i giorni passati restano col livello di prima).
   Dal benvenuto (onScelto) non salva nulla: restituisce il livello scelto.
   ========================================================= */

import * as store from "../dati/store.js";
import * as R from "../logica/riepilogo.js";
import { LIVELLI, livelloDalleRisposte } from "../logica/energia.js";
import { oggi } from "../logica/giorni.js";
import { icona } from "../grafica/icone.js";
import { esc, numero, foglio, avviso } from "../ui.js";

/** "× 1,3" */
export const testoFattore = (f) => `× ${numero(f, 2).replace(/0$/, "")}`;

const DOMANDE = [
  {
    id: "lavoro", testo: "Durante il lavoro (o la tua giornata principale), di solito…",
    risposte: [
      { emoji: "🪑", testo: "Sto seduto quasi sempre", nota: "scrivania, computer, guida, studio", frase: "lavori seduto" },
      { emoji: "🚶", testo: "Sto seduto, ma mi alzo spesso", nota: "riunioni, giri in ufficio o in negozio", frase: "lavori seduto ma ti alzi spesso" },
      { emoji: "🧍", testo: "Sto in piedi gran parte del tempo", nota: "negozio, scuola, reparto, cucina", frase: "passi la giornata in piedi" },
      { emoji: "🏗️", testo: "Faccio un lavoro fisico pesante", nota: "sollevo pesi, cantiere, campi, magazzino", frase: "fai un lavoro fisico pesante" },
    ],
  },
  {
    id: "spostamenti", testo: "Come ti sposti di solito, in una giornata normale?",
    risposte: [
      { emoji: "🚗", testo: "In auto, moto o mezzi", nota: "quasi porta a porta, si cammina pochissimo", frase: "ti sposti in auto o coi mezzi" },
      { emoji: "🚲", testo: "Un po' a piedi o in bici", nota: "in tutto 10–30 minuti al giorno", frase: "cammini o pedali un po'" },
      { emoji: "🥾", testo: "Molto a piedi o in bici", nota: "più di 30 minuti al giorno", frase: "cammini o pedali parecchio" },
    ],
  },
  {
    id: "casa", testo: "A casa e nel tempo libero (sport esclusi), di solito…",
    risposte: [
      { emoji: "🛋️", testo: "Sto soprattutto seduto", nota: "TV, telefono, lettura, computer", frase: "a casa stai per lo più seduto" },
      { emoji: "🧺", testo: "Un po' di tutto", nota: "faccende, spesa, commissioni", frase: "a casa fai faccende e commissioni" },
      { emoji: "🧒", testo: "Sono sempre in movimento", nota: "figli piccoli, giardino, lavori in casa", frase: "a casa sei sempre in movimento" },
    ],
  },
  {
    id: "passi", testo: "Quanti passi fai in media al giorno?", facoltativa: true,
    risposte: [
      { testo: "Meno di 4.000", frase: "fai meno di 4.000 passi" },
      { testo: "4.000 – 7.000", frase: "fai 4.000–7.000 passi" },
      { testo: "7.000 – 10.000", frase: "fai 7.000–10.000 passi" },
      { testo: "Più di 10.000", frase: "fai più di 10.000 passi" },
    ],
  },
];

/**
 * @param onSalvato  () => … per ridisegnare Io
 * @param onScelto   (id) => … dal benvenuto: niente salvataggio né «Da quando», solo la scelta
 * @param basale     kcal del basale se il profilo non c'è ancora (benvenuto)
 * @param motivo     una nota in cima (es. «manca un dato importante»)
 * @param domande    true = si apre subito sulle 4 domande (dal benvenuto, che l'elenco lo mostra già)
 */
export function apriMovimento({ onSalvato, onScelto, basale, motivo, domande = false } = {}) {
  let vista = domande ? "domande" : "elenco";          // "elenco" | "domande" | "esito"
  let passo = 0;                 // quale domanda
  let risposte = {};             // {lavoro: 1, spostamenti: 0, …}
  let scelto = R.livelloDel()?.id ?? null;
  let consigliato = null;
  let daQuando = (store.profilo()?.movimento ?? []).length ? "oggi" : "sempre";

  const { el, chiudi } = foglio(`<div class="mov-corpo"></div>`);
  const corpo = el.querySelector(".mov-corpo");
  const testa = (titolo, indietro) => `
    <div class="foglio-testa">${indietro ? `<button class="tondo" data-indietro aria-label="Indietro">${icona("indietro")}</button>` : ""}
      <h2 class="titolo-romano">${titolo}</h2><button class="tondo" data-chiudi aria-label="Chiudi">${icona("chiudi")}</button></div>`;
  const basaleKcal = basale ?? R.basaleAttuale();
  const quotidiano = (l) => Math.round(basaleKcal * l.fattore);

  function disegna() {
    if (vista === "elenco") {
      corpo.innerHTML = `
        ${testa("Movimento di ogni giorno")}
        ${motivo ? `<p class="nota-avviso">${icona("stelle")} <span>${motivo}</span></p>` : ""}
        <p class="sotto">Quanto ti muovi in una giornata normale, <b>senza contare gli allenamenti</b> (quelli li registri a parte).</p>
        <button class="aiuto-livello" data-guida>${icona("stelle")}<span><b>Non sai quale scegliere?</b>Rispondi a 4 domande facili</span>${icona("dx")}</button>
        <div class="livelli">${LIVELLI.map((l) => `
          <button class="livello" data-livello="${l.id}" aria-pressed="${l.id === scelto}">
            <b>${l.nome}</b><em>${testoFattore(l.fattore)}</em><small>${esc(l.esempio)} ${l.passi[0].toUpperCase() + l.passi.slice(1)}.</small>
            ${l.id === consigliato ? `<span class="consigliato">${icona("stelle")} consigliato dalle tue risposte</span>` : ""}</button>`).join("")}
        </div>
        ${quando()}
        <button class="pillola terra larga" data-salva ${scelto ? "" : "disabled"}>${scelto ? `Usa «${LIVELLI.find((l) => l.id === scelto).nome}»` : "Scegli un livello"}</button>`;
      return;
    }
    if (vista === "domande") {
      const d = DOMANDE[passo];
      corpo.innerHTML = `
        ${testa(`Domanda ${passo + 1} di ${DOMANDE.length}`, true)}
        <div class="passi-domande">${DOMANDE.map((_, i) => `<i class="${i <= passo ? "fatto" : ""}"></i>`).join("")}</div>
        <p class="domanda">${d.testo}</p>
        ${d.id === "passi" ? `<div class="come-salute">L'iPhone li conta già da solo. Per vederli:
          <ol><li>apri l'app <b>Salute</b> (il cuore bianco e rosso)</li><li>tocca <b>Passi</b> (o Sfoglia → Attività → Passi)</li>
          <li>scegli <b>S</b> (settimana) in alto e leggi la <b>media</b>.</li></ol></div>` : ""}
        <div class="risposte">${d.risposte.map((r, i) => `
          <button class="risposta-guida" data-risposta="${i}" aria-pressed="${risposte[d.id] === i}">
            ${r.emoji ? `<span class="emoji" aria-hidden="true">${r.emoji}</span>` : ""}
            <span><strong>${r.testo}</strong>${r.nota ? `<small>${r.nota}</small>` : ""}</span></button>`).join("")}
        </div>
        ${d.facoltativa ? `<button class="salta" data-salta>Non lo so, salta questa domanda</button>`
          : `<p class="piccolo centro">Pensa a una settimana normale, non a quella più pigra o più attiva.</p>`}`;
      return;
    }
    // esito
    const l = LIVELLI.find((x) => x.id === consigliato);
    const frasi = DOMANDE.filter((d) => risposte[d.id] !== undefined && risposte[d.id] !== null).map((d) => d.risposte[risposte[d.id]].frase);
    const perche = frasi.length > 1 ? `${frasi.slice(0, -1).join(", ")} e ${frasi.at(-1)}` : frasi[0];
    corpo.innerHTML = `
      ${testa("Il tuo livello", true)}
      <div class="esito">
        <span class="sopra">Il legionario consiglia</span>
        <strong class="nome">${l.nome} · ${testoFattore(l.fattore)}</strong>
        <p>${esc(perche[0].toUpperCase() + perche.slice(1))}: corrisponde al livello «${l.nome.toLowerCase()}».</p>
      </div>
      <div class="conto-livello"><span>Fabbisogno senza allenamenti<br><small class="piccolo">basale ${numero(basaleKcal)} ${testoFattore(l.fattore)}</small></span>
        <b>${numero(quotidiano(l))} kcal</b></div>
      ${quando()}
      <button class="pillola terra larga" data-usa>Usa «${l.nome}»</button>
      <button class="salta" data-elenco>Preferisco scegliere io dall'elenco</button>`;
  }

  const quando = () => onScelto ? "" : `
    <p class="sopra">Da quando vale?</p>
    <div class="scelta-giorni">
      <button class="chip" data-quando="sempre" aria-pressed="${daQuando === "sempre"}">Da sempre</button>
      <button class="chip" data-quando="oggi" aria-pressed="${daQuando === "oggi"}">Da oggi</button>
    </div>
    <p class="piccolo">«Da oggi» se la tua vita è cambiata (nuovo lavoro, trasloco): i giorni passati restano calcolati col livello di prima.</p>`;

  function salva(id) {
    if (onScelto) { chiudi(); onScelto(id); return; }
    const p = store.profilo() ?? {};
    const nuovo = { da: daQuando === "sempre" ? "0000-01-01" : oggi(), livello: id };
    const movimento = daQuando === "sempre" ? [nuovo] : [...(p.movimento ?? []).filter((m) => m.da < oggi()), nuovo];
    store.salvaProfilo({ ...p, movimento });
    const l = LIVELLI.find((x) => x.id === id);
    avviso(`Movimento: ${l.nome} (${testoFattore(l.fattore)}) · ${numero(quotidiano(l))} kcal senza allenamenti`);
    chiudi();
    onSalvato?.();
  }

  el.addEventListener("click", (e) => {
    const t = e.target;
    const lv = t.closest("[data-livello]");
    if (lv) { scelto = lv.dataset.livello; disegna(); return; }
    const q = t.closest("[data-quando]");
    if (q) { daQuando = q.dataset.quando; disegna(); return; }
    if (t.closest("[data-guida]")) { vista = "domande"; passo = 0; risposte = {}; disegna(); return; }
    if (t.closest("[data-elenco]")) { vista = "elenco"; disegna(); return; }
    if (t.closest("[data-indietro]")) {
      if (vista === "esito") { vista = "domande"; passo = DOMANDE.length - 1; }
      else if (passo > 0) passo--;
      else vista = "elenco";
      disegna(); return;
    }
    const r = t.closest("[data-risposta]");
    const salta = t.closest("[data-salta]");
    if (r || salta) {
      risposte[DOMANDE[passo].id] = r ? Number(r.dataset.risposta) : null;
      if (passo < DOMANDE.length - 1) { passo++; disegna(); return; }
      consigliato = LIVELLI[livelloDalleRisposte(risposte)].id;
      scelto = consigliato;
      vista = "esito"; disegna(); return;
    }
    if (t.closest("[data-usa]")) salva(consigliato);
    if (t.closest("[data-salva]") && scelto) salva(scelto);
  });

  disegna();
}
