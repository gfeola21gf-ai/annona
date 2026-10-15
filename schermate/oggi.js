/* =========================================================
   oggi.js — la schermata principale.

   In cima, sempre: il GIURAMENTO (la tua motivazione), poi due blocchi:
     RAZIONI   kcal rimanenti e mangiate (barra) + carboidrati, proteine, grassi
     BILANCIO  deficit o surplus del giorno, basale + attività, e quanto peso
               perdi/guadagni a settimana a questo ritmo.
   Sotto: le razioni del giorno, divise per pasto, e le attività.
   I pasti della scheda settimanale non ancora registrati compaiono
   come "previsti": ✓ verde = mangiato così, ✗ rossa = non mangiato
   (↺ per rimetterlo), tocco sulla riga = lo modifichi in «Aggiungi». Dalle 18, in fondo,
   il riquadro delle Provviste di domani.
   ========================================================= */

import * as store from "../dati/store.js";
import * as R from "../logica/riepilogo.js";
import { oggi, aggiungiGiorni, nomeGiornoRelativo } from "../logica/giorni.js";
import { testoQuantita } from "../servizi/cibo.js";
import * as P from "../logica/piano.js";
import { apriDosatore } from "./dosatore.js";
import { riquadroProvviste, apriProvviste } from "./provviste.js";
import { riquadroGuardiano, apriPausa, apriPercorso } from "./guardiano.js";
import * as G from "../logica/guardiano.js";
import { DOMANDE } from "../domande.js";
import { icona, marchio } from "../grafica/icone.js";
import { esc, numero, conSegno, foglio, avviso } from "../ui.js";

export const PASTI = [
  { id: "colazione", nome: "Colazione", icona: "sole" },
  { id: "pranzo", nome: "Pranzo", icona: "piatto" },
  { id: "cena", nome: "Cena", icona: "luna" },
  { id: "spuntino", nome: "Spuntini", icona: "mela" },
];

let giornoScelto = oggi();          // il giorno mostrato (si può andare avanti e indietro)

export function mostra(el, parametri, { vai }) {
  if (parametri.giorno) giornoScelto = parametri.giorno;
  if (giornoScelto > oggi()) giornoScelto = oggi();
  let mostraPerche = false;

  function disegna() {
    const profilo = store.profilo() ?? {};
    const g = giornoScelto;
    const eOggi = g === oggi();
    const b = R.giorno(g);
    const ob = R.obiettivoDel(g);
    const pausa = R.pausaDel(g);
    const prev = R.previsioneSettimanale();
    const pasti = R.pastiDel(g);
    const attivita = R.attivitaDel(g);
    // la scheda vale per oggi e per ieri (se ieri hai dimenticato di registrare)
    const conPrevisti = g >= aggiungiGiorni(oggi(), -1);

    // ---- Il giuramento ----
    const inCima = DOMANDE.filter((d) => d.inCima).map((d) => profilo.risposte?.[d.id]).filter(Boolean);
    const altre = DOMANDE.filter((d) => !d.inCima && profilo.risposte?.[d.id]);
    const giuramento = `
      <button class="giuramento" data-azione="perche" aria-expanded="${mostraPerche}">
        ${icona("alloro", "alloro")}
        <span>
          <span class="sopra">Il tuo giuramento</span>
          <span class="giuramento-testo">${esc(inCima.join(" · ") || "Scrivi la tua motivazione nel profilo.")}</span>
          ${mostraPerche ? altre.map((d) => `<span class="giuramento-altro"><b>${esc(d.titolo)}</b> ${esc(profilo.risposte[d.id])}</span>`).join("") : ""}
        </span>
      </button>`;

    // ---- Blocco 1 · Razioni: quanto resta da mangiare e i macronutrienti ----
    const m = R.macroDel(g);
    const oltre = b.restano < 0;
    const pieno = b.daMangiare > 0 ? Math.min(1, b.mangiato / b.daMangiare) : 0;
    const barraMacro = (nome, chiave, classe) => {
      const fatti = m.mangiati[chiave], obiettivo = m.obiettivo[chiave];
      const perc = obiettivo ? Math.min(100, (fatti / obiettivo) * 100) : 0;
      return `<div class="${obiettivo && fatti > obiettivo ? "oltre" : ""}"><small>${nome}</small><span class="mb"><i class="${classe}" style="width:${perc}%"></i></span>
        <p><b>${numero(fatti)}</b> / ${numero(obiettivo)} g</p></div>`;
    };
    const razioniOggi = `
      <section class="razioni-oggi ${pausa ? "in-pausa" : ""}" aria-label="Calorie e macronutrienti">
        ${pausa ? (() => {
          const { numero: n, totale } = G.giornoDiPausa(pausa, g);
          return `<button class="pausa-etichetta" data-azione="guardiano-pausa">${icona("scudo")} Pausa dalla dieta · giorno ${n} di ${totale}</button>
            <div class="pausa-passi">${Array.from({ length: totale }, (_, i) => `<i class="${i < n ? "fatto" : ""}"></i>`).join("")}</div>`;
        })() : ""}
        <div class="ro-numeri">
          <div class="principale ${oltre ? "oltre" : ""}"><small>${oltre ? "Oltre il piano" : "Rimanenti"}</small>
            <strong>${oltre ? `+${numero(-b.restano)}` : numero(b.restano)}<span>kcal</span></strong></div>
          <div class="lato"><small>Mangiate</small><strong>${numero(b.mangiato)}</strong></div>
        </div>
        <div class="ro-barra ${oltre ? "oltre" : ""}" role="progressbar" aria-valuenow="${Math.round(b.percentuale * 100)}" aria-valuemin="0" aria-valuemax="100">
          <i style="width:${pieno * 100}%"></i>${oltre ? `<b style="width:${Math.min(40, (1 - b.daMangiare / b.mangiato) * 100)}%"></b>` : ""}</div>
        <div class="ro-scala"><span>0</span><span>obiettivo ${numero(b.daMangiare)} kcal (${pausa ? "pausa" : conSegno(ob)})</span></div>
        <div class="macro-righe">
          ${barraMacro("Carboidrati", "c", "c-carbo")}
          ${barraMacro("Proteine", "p", "c-prot")}
          ${barraMacro("Grassi", "g", "c-grassi")}
        </div>
      </section>`;

    // ---- Blocco 2 · Bilancio: deficit o surplus, e il ritmo in kg a settimana ----
    const tipo = b.bilancio < 0 ? "Deficit" : b.bilancio > 0 ? "Surplus" : "Bilancio";
    const quando = eOggi ? "di oggi, finora" : `di ${nomeGiornoRelativo(g).toLowerCase()}`;
    const ritmo = prev
      ? `<div class="kg" title="Media ${prev.giorniUsati === 1 ? "di 1 giorno" : `di ${prev.giorniUsati} giorni`}: ${conSegno(prev.mediaKcal)} kcal/g">
          <strong>${icona(prev.kgSettimana < 0 ? "giu" : "su")} ${conSegno(prev.kgSettimana, 2)}</strong><small>kg/settimana</small></div>`
      : `<div class="kg"><strong>—</strong><small>kg/settimana<br>(servono più giorni)</small></div>`;
    const bilancio = `
      <section class="bilancio" aria-label="Bilancio calorico">
        <div class="b2-due">
          <div><small>${tipo} ${quando}</small><div class="grande">${numero(b.bilancio)}<span>kcal</span></div></div>
          ${ritmo}
        </div>
        <div class="b2-linea"></div>
        <div class="b2-conto"><span>Basale <b>${numero(R.basaleAttuale())}</b></span>
          ${R.fattoreDel(g) !== 1 ? `<span>× Movimento <b>${numero(R.fattoreDel(g), 2).replace(/0$/, "")}</b></span>` : ""}
          <span>+ Attività <b>${numero(b.bruciato)}</b></span><span title="Fabbisogno del giorno">= <b>${numero(b.fabbisogno)}</b></span></div>
      </section>`;

    // ---- Le razioni ----
    const riga = (id, nome, ic, voci, segno = "") => {
      const tot = voci.reduce((t, v) => t + Number(v.kcal), 0);
      const previsti = !voci.length && conPrevisti && id !== "attivita" ? P.vociDi(P.giornoSettimana(g), id) : [];
      // ✗ premuta: «non mangiato» (si può aggiungere altro, o rimettere il previsto con ↺)
      if (previsti.length && P.saltato(g, id)) return `
        <div class="pasto saltato">
          <button class="pasto-tocco" data-azione="apri" data-pasto="${id}">
            <span class="pall">${icona(ic)}</span>
            <span class="pasto-testo"><strong>${nome}</strong><small>Non mangiato</small></span></button>
          <button class="ripristina" data-azione="ripristina" data-pasto="${id}" aria-label="Rimetti ${nome.toLowerCase()} previsto">${icona("annulla")}</button>
        </div>`;
      if (previsti.length) return `
        <div class="pasto previsto">
          <button class="pasto-tocco" data-azione="previsto" data-pasto="${id}" aria-label="${nome} previsto: modifica">
            <span class="pall">${icona(ic)}</span>
            <span class="pasto-testo"><strong>${nome}<em> · previsto</em></strong>
              <small>${numero(P.sommaKcal(previsti))} kcal · ${esc(P.descrizionePasto(P.giornoSettimana(g), id, true))}</small></span></button>
          <span class="si-no">
            <button class="tondo-no" data-azione="salta" data-pasto="${id}" aria-label="${nome}: non mangiato">${icona("chiudi")}</button>
            <button class="tondo-si" data-azione="mangiato-subito" data-pasto="${id}" aria-label="${nome}: mangiato così">${icona("spunta")}</button>
          </span>
        </div>`;
      return `
        <button class="pasto ${voci.length ? "" : "vuoto"}" data-azione="apri" data-pasto="${id}">
          <span class="pall">${icona(ic)}</span>
          <span class="pasto-testo"><strong>${nome}</strong>
            <small>${voci.length ? esc(voci.map((v) => v.nome ?? v.descrizione).join(" · ")) : "Aggiungi"}</small></span>
          ${voci.length ? `<span class="kcal">${segno}${numero(tot)}</span>` : `<span class="aggiungi-mini">${icona("piu")}</span>`}
        </button>`;
    };

    el.innerHTML = `
      <header class="saluto">
        ${marchio()}
        <div class="naviga-giorno">
          <button class="freccia" data-azione="ieri" aria-label="Giorno prima">${icona("sx")}</button>
          <span>${esc(nomeGiornoRelativo(g))}</span>
          <button class="freccia" data-azione="domani" aria-label="Giorno dopo" ${eOggi ? "disabled" : ""}>${icona("dx")}</button>
        </div>
      </header>
      ${giuramento}
      ${eOggi ? riquadroGuardiano() : ""}
      ${razioniOggi}
      ${bilancio}
      <div class="titolo-sez"><h2>Razioni ${eOggi ? "di oggi" : "del giorno"}</h2></div>
      <div class="pasti">
        ${PASTI.map((p) => riga(p.id, p.nome, p.icona, pasti.filter((v) => v.pasto === p.id))).join("")}
        ${riga("attivita", "Attività", "fuoco", attivita, "+")}
      </div>
      ${eOggi && new Date().getHours() >= 18 ? riquadroProvviste() : ""}`;
  }

  /** Foglio con le voci di un pasto: cambi i grammi o elimini */
  function apriPasto(id) {
    const eAttivita = id === "attivita";
    const voci = eAttivita ? R.attivitaDel(giornoScelto) : R.pastiDel(giornoScelto).filter((v) => v.pasto === id);
    const indirizzo = `#/aggiungi?giorno=${giornoScelto}&${eAttivita ? "tipo=attivita" : `pasto=${id}`}`;
    if (!voci.length) return vai(indirizzo);
    const nome = eAttivita ? "Attività" : PASTI.find((p) => p.id === id).nome;
    const { el: f, chiudi } = foglio(`
      <div class="foglio-testa"><h2 class="titolo-romano">${nome}</h2><button class="tondo" data-chiudi aria-label="Chiudi">${icona("chiudi")}</button></div>
      <div class="voci">
        ${voci.map((v) => `
          <div class="voce" data-id="${v.id}">
            <div class="voce-nome"><strong>${esc(v.nome ?? v.descrizione)}</strong>
              <small>${eAttivita ? (v.minuti ? `${v.minuti} min` : "") : `${numero(v.proteine ?? 0)} P · ${numero(v.carboidrati ?? 0)} C · ${numero(v.grassi ?? 0)} G`}</small></div>
            ${eAttivita || !v.per100 ? "" : `<button class="quantita" data-dosa>${esc(testoQuantita(v))}</button>`}
            <span class="kcal">${numero(v.kcal)}</span>
            <button class="tondo piccolo-tondo" data-elimina aria-label="Elimina">${icona("cestino")}</button>
          </div>`).join("")}
      </div>
      <a class="pillola terra larga" href="${indirizzo}" data-chiudi>${icona("piu")} Aggiungi</a>`);

    f.addEventListener("click", (e) => {
      const dosa = e.target.closest("[data-dosa]");
      if (dosa) {
        const riga = dosa.closest(".voce");
        const voce = voci.find((v) => v.id === riga.dataset.id);
        apriDosatore(voce, {
          onConferma: (nuova) => {
            store.salva("diario", nuova);
            Object.assign(voce, nuova);
            dosa.textContent = testoQuantita(nuova);
            riga.querySelector(".kcal").textContent = numero(nuova.kcal);
          },
        });
        return;
      }
      if (!e.target.closest("[data-elimina]")) return;
      const riga = e.target.closest(".voce");
      store.elimina(eAttivita ? "attivita" : "diario", riga.dataset.id);
      riga.remove();
      avviso("Eliminato");
      if (!f.querySelector(".voce")) chiudi();
    });
  }

  /** ✓ verde: il pasto previsto, mangiato così com'è → nel diario, senza altre domande */
  function mangiatoSubito(id) {
    const g = giornoScelto;
    const nome = PASTI.find((p) => p.id === id).nome;
    const voci = P.vociDi(P.giornoSettimana(g), id);
    if (!voci.length) return;
    const adesso = new Date().toISOString();
    store.salvaTante("diario", voci.map((v) => ({ ...P.pulisciVoce(v), giorno: g, pasto: id, creato_il: adesso })));
    avviso(`${nome}: ${numero(P.sommaKcal(voci))} kcal registrate`);
  }

  el.addEventListener("click", (e) => {
    const b = e.target.closest("[data-azione]");
    if (!b) return;
    const a = b.dataset.azione;
    if (a === "ieri") { giornoScelto = aggiungiGiorni(giornoScelto, -1); disegna(); }
    if (a === "domani" && giornoScelto < oggi()) { giornoScelto = aggiungiGiorni(giornoScelto, 1); disegna(); }
    if (a === "perche") { mostraPerche = !mostraPerche; disegna(); }
    if (a === "apri") apriPasto(b.dataset.pasto);
    if (a === "previsto") vai(`#/aggiungi?previsto=1&giorno=${giornoScelto}&pasto=${b.dataset.pasto}`);
    if (a === "mangiato-subito") mangiatoSubito(b.dataset.pasto);
    if (a === "salta") { P.salta(giornoScelto, b.dataset.pasto); disegna(); }
    if (a === "ripristina") { P.ripristina(giornoScelto, b.dataset.pasto); disegna(); }
    if (a === "provviste") apriProvviste({ vai });
    if (a === "guardiano-ia") apriPercorso({ onFatto: disegna });
    if (a === "guardiano-pausa") apriPausa({ onFatto: disegna });
    if (a === "taratura-nonora") { G.taraturaNonOra(); avviso("Va bene: te lo ricordo tra una settimana."); disegna(); }
    if (a === "taratura-tieni") { G.taraturaTieni(); avviso("Teniamo il tuo livello. Riguardo i dati tra 4 settimane."); disegna(); }
    if (a === "taratura-passa") { G.taraturaAccetta(b.dataset.livello); avviso("Livello aggiornato da oggi: i conti ora seguono i tuoi dati."); disegna(); }
    if (a === "guardiano-nonora") { G.nonOra(); avviso("Va bene: te lo ricordo tra una settimana."); disegna(); }
  });

  const aggiorna = () => disegna();
  window.addEventListener("annona-dati", aggiorna);
  disegna();
  return () => window.removeEventListener("annona-dati", aggiorna);
}
