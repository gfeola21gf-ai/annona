/* =========================================================
   oggi.js — la schermata principale.

   In cima, sempre: il GIURAMENTO (la tua motivazione), poi due blocchi:
     RAZIONI   kcal rimanenti e mangiate (barra) + carboidrati, proteine, grassi
     BILANCIO  quanto peso perdi/guadagni a settimana se ogni giorno fosse come
               oggi (i pasti non ancora segnati contano come previsti), il deficit
               di oggi in piccolo e il bollino verde/giallo/rosso. Toccandolo: i conti.
   Sotto: le razioni del giorno, divise per pasto, e le attività.
   I pasti della scheda settimanale non ancora registrati compaiono
   come "previsti" (tratteggiati): SCORRI a destra = mangiato così, a sinistra =
   «ho mangiato altro» (→ Aggiungi); TOCCO = foglio con le spunte (togli ciò che
   non hai mangiato). Dalle 18, in fondo, il riquadro delle Provviste di domani.
   GESTI (gesti.js, fase 2): tieni premuto un pasto o un alimento = menu; nel foglio
   del pasto scorri un alimento a destra = duplica, a sinistra = elimina (con Annulla),
   tieni premuto e trascina sopra un altro pasto = sposta. Copia/Incolla: gli alimenti
   copiati restano negli APPUNTI e ogni pasto mostra «Incolla».
   ========================================================= */

import * as store from "../dati/store.js";
import * as R from "../logica/riepilogo.js";
import { oggi, aggiungiGiorni, nomeGiornoRelativo } from "../logica/giorni.js";
import { testoQuantita } from "../servizi/cibo.js";
import * as P from "../logica/piano.js";
import * as A from "../logica/appunti.js";
import { apriDosatore } from "./dosatore.js";
import { riquadroProvviste, apriProvviste } from "./provviste.js";
import { riquadroGuardiano, apriPausa, apriPercorso } from "./guardiano.js";
import * as G from "../logica/guardiano.js";
import { DOMANDE } from "../domande.js";
import { icona, marchio } from "../grafica/icone.js";
import { esc, numero, conSegno, foglio, avviso, macroVoce } from "../ui.js";
import { gesti, menu } from "../gesti.js";
import { puntoAiuto, fumetto, primoFumetto } from "./aiuto.js";

/* Il fumetto «scorri» sopra i pasti previsti sparisce dopo il primo scorrimento (o con «Ho capito») */
const SCORRI_VISTO = "annona.scorriVisto";
const scorriVisto = () => { try { return localStorage.getItem(SCORRI_VISTO) === "1"; } catch { return true; } };
const segnaScorri = () => { try { localStorage.setItem(SCORRI_VISTO, "1"); } catch { /* niente */ } };

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
  let mostraConti = false;          // i conti del bilancio (basale × movimento…) si vedono toccando il riquadro

  function disegna() {
    const profilo = store.profilo() ?? {};
    const g = giornoScelto;
    const eOggi = g === oggi();
    const b = R.giorno(g);
    const ob = R.obiettivoDel(g);
    const pausa = R.pausaDel(g);
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
          <div class="principale ${oltre ? "oltre" : ""}"><small>${oltre ? "Oltre il piano" : "Rimanenti"}${puntoAiuto("razioni")}</small>
            <strong>${oltre ? `+${numero(-b.restano)}` : numero(b.restano)}<span>kcal</span></strong></div>
          <div class="lato"><small>Mangiate</small><strong>${numero(b.mangiato)}</strong><em>su ${numero(b.daMangiare)}</em></div>
        </div>
        <div class="ro-barra ${oltre ? "oltre" : ""}" role="progressbar" aria-valuenow="${Math.round(b.percentuale * 100)}" aria-valuemin="0" aria-valuemax="100">
          <i style="width:${pieno * 100}%"></i>${oltre ? `<b style="width:${Math.min(40, (1 - b.daMangiare / b.mangiato) * 100)}%"></b>` : ""}</div>
        <div class="macro-righe">
          ${barraMacro("Carboidrati", "c", "c-carbo")}
          ${barraMacro("Proteine", "p", "c-prot")}
          ${barraMacro("Grassi", "g", "c-grassi")}
        </div>
      </section>`;

    // ---- Blocco 2 · Bilancio: kg a settimana se ogni giorno fosse così, e il bollino ----
    const st = R.stimaGiorno(g);
    const nomeG = nomeGiornoRelativo(g).toLowerCase();
    const parola = st.bilancioStimato < 0 ? "deficit" : st.bilancioStimato > 0 ? "surplus" : "bilancio";
    const bilancio = `
      <section class="bilancio" aria-label="Bilancio calorico" role="button" tabindex="0" data-azione="conti" aria-expanded="${mostraConti}">
        <div class="b-riga">
          ${icona(st.kgSettimana > 0 ? "su" : "giu", "freccia-trend")}
          <div class="b-testo"><strong>${conSegno(st.kgSettimana, 1)} kg<span>/ settimana</span>${puntoAiuto("bilancio")}</strong>
            <small>${parola} di ${esc(nomeG)} ${conSegno(st.bilancioStimato)} kcal</small></div>
          <span class="bollino ${st.stato}" aria-label="${{ attesa: "Giornata in corso", verde: "In linea", giallo: "Un po' lontano", rosso: "Lontano dall'obiettivo" }[st.stato]}"></span>
        </div>
        ${mostraConti ? `
        <div class="b2-linea"></div>
        <div class="b2-conto"><span>Basale <b>${numero(R.basaleAttuale())}</b></span>
          ${R.fattoreDel(g) !== 1 ? `<span>× Movimento <b>${numero(R.fattoreDel(g), 2).replace(/0$/, "")}</b></span>` : ""}
          <span>+ Attività <b>${numero(b.bruciato)}</b></span><span>= <b>${numero(b.fabbisogno)}</b></span></div>
        ${st.previste ? `<div class="b2-conto"><span>Mangiate <b>${numero(b.mangiato)}</b></span><span>+ Previste <b>${numero(st.previste)}</b></span>
          <span>= <b>${numero(b.mangiato + st.previste)}</b></span></div>` : ""}
        <div class="b2-conto"><span>Obiettivo <b>${pausa ? "pausa" : conSegno(b.daMangiare - b.fabbisogno)}</b> kcal${!pausa && ob < 0 && b.daMangiare > b.fabbisogno + ob ? " · minimo" : ""}</span></div>` : ""}
      </section>`;

    // ---- Le razioni ----
    const ap = A.leggi();
    // con qualcosa negli appunti, ogni pasto mostra «Incolla»
    const incollaQui = (id) => ap && id !== "attivita"
      ? `<span class="incolla-qui" data-azione="incolla-in" data-pasto="${id}" role="button">${icona("incolla")}Incolla</span>` : "";
    let primoPrevisto = true;
    // Un fumetto «una volta sola» alla volta (aiuto.js), solo oggi: prima Attività, poi «scorri», poi «tieni premuto»
    const ciSonoPrevisti = conPrevisti && PASTI.some((p) => !pasti.some((v) => v.pasto === p.id)
      && P.vociDi(P.giornoSettimana(g), p.id).length && !P.saltato(g, p.id));
    let fumettoQui = eOggi ? primoFumetto(!attivita.length && "attivita", ciSonoPrevisti && !scorriVisto() && "scorri", pasti.length && "tieni") : null;
    const fumettoPer = (id) => { if (fumettoQui !== id) return ""; fumettoQui = null; return fumetto(id); };
    const riga = (id, nome, ic, voci, segno = "") => {
      const tot = voci.reduce((t, v) => t + Number(v.kcal), 0);
      const previsti = !voci.length && conPrevisti && id !== "attivita" ? P.vociDi(P.giornoSettimana(g), id) : [];
      // «non mangiato» (si può aggiungere altro, o rimettere il previsto con ↺)
      if (previsti.length && P.saltato(g, id)) return `
        <div class="pasto saltato">
          <button class="pasto-tocco" data-azione="apri" data-pasto="${id}">
            <span class="pall">${icona(ic)}</span>
            <span class="pasto-testo"><strong>${nome}</strong><small>Non mangiato · tocca per aggiungere</small></span></button>
          ${incollaQui(id)}
          <button class="ripristina" data-azione="ripristina" data-pasto="${id}" aria-label="Rimetti ${nome.toLowerCase()} previsto">${icona("annulla")}</button>
        </div>`;
      if (previsti.length) {
        const suggerimento = primoPrevisto ? fumettoPer("scorri") : "";
        primoPrevisto = false;
        return `${suggerimento}
        <div class="pasto previsto gestibile" data-gesto="previsto" data-pasto="${id}">
          <button class="pasto-tocco" data-azione="previsto" data-pasto="${id}" aria-label="${nome} dalla scheda: spunta ciò che hai mangiato">
            <span class="pall">${icona(ic)}</span>
            <span class="pasto-testo"><strong>${nome}<em> · dalla scheda</em></strong>
              <small>${esc(P.descrizionePasto(P.giornoSettimana(g), id, true))}</small></span>
            <span class="kcal previste">${numero(P.sommaKcal(previsti))}</span></button>
          ${incollaQui(id)}
        </div>`;
      }
      const eAtt = id === "attivita";
      return `${fumettoPer(eAtt ? "attivita" : voci.length ? "tieni" : "")}
        <button class="pasto ${voci.length ? "" : "vuoto"} ${eAtt ? "" : "gestibile"}" data-azione="apri" data-pasto="${id}" ${id === "attivita" ? "" : `data-gesto="pasto"`}>
          <span class="pall">${icona(ic)}</span>
          <span class="pasto-testo"><strong>${nome}</strong>
            ${voci.length ? `<small>${esc(voci.map((v) => v.nome ?? v.descrizione).join(" · "))}</small>` : eAtt ? `<small>Camminata, palestra, sport…</small>` : ""}</span>
          ${incollaQui(id) || (voci.length ? `<span class="kcal">${segno}${numero(tot)}</span>` : `<span class="aggiungi-mini ${eAtt ? "pieno" : ""}">${icona("piu")}</span>`)}
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
      ${barraAppunti()}
      <div class="pasti">
        ${PASTI.map((p) => riga(p.id, p.nome, p.icona, pasti.filter((v) => v.pasto === p.id))).join("")}
        ${riga("attivita", "Attività", "fuoco", attivita, "+")}
      </div>
      ${eOggi && new Date().getHours() >= 18 ? riquadroProvviste() : ""}`;
  }

  const nomeDi = (id) => (id === "attivita" ? "Attività" : PASTI.find((p) => p.id === id).nome);
  const daQui = (id) => `${nomeDi(id).toLowerCase()} di ${nomeGiornoRelativo(giornoScelto).toLowerCase()}`;

  /* ---------- azioni su un alimento del diario (con «Annulla» al posto del «sei sicuro?») ---------- */
  const tabellaDi = (v) => (v.pasto ? "diario" : "attivita");
  function eliminaVoce(v) {
    store.elimina(tabellaDi(v), v.id);
    avviso(`Eliminato: ${v.nome ?? v.descrizione}`, "", { annulla: () => store.salva(tabellaDi(v), v) });
  }
  function duplicaVoce(v) {
    const copia = store.salva(tabellaDi(v), { ...v, id: undefined, creato_il: new Date().toISOString() });
    avviso(`Duplicato: ${v.nome ?? v.descrizione}`, "", { annulla: () => store.elimina(tabellaDi(v), copia.id) });
  }
  function spostaVoce(v, pasto) {
    if (!v.pasto || v.pasto === pasto) return;
    store.salva("diario", { ...v, pasto });
    avviso(`Spostato in ${nomeDi(pasto).toLowerCase()}`, "", { annulla: () => store.salva("diario", v) });
  }
  function copiaVoci(voci, da) {
    A.copia(voci, da);
    avviso(`${voci.length === 1 ? `Copiato: ${voci[0].nome}` : `${voci.length} alimenti copiati`} · tocca «Incolla» su un pasto`);
    disegna();
  }

  /** Il menu di un pasto (tieni premuto sulla sua riga in Oggi) */
  function menuPasto(riga, id) {
    const voci = R.pastiDel(giornoScelto).filter((v) => v.pasto === id);
    const ap = A.leggi();
    const incollaVoce = ap ? { testo: `Incolla ${ap.voci.length === 1 ? "1 alimento" : `${ap.voci.length} alimenti`}`, icona: "incolla", fai: () => incolla(id) } : null;
    if (riga.dataset.gesto === "previsto") return menu(riga, [
      { testo: "Mangiato così", icona: "spunta", fai: () => mangiatoSubito(id) },
      { testo: "Spunta gli alimenti…", icona: "elenco", fai: () => apriPrevisto(id) },
      { testo: "Ho mangiato altro", icona: "sposta", fai: () => mangiatoAltro(id) },
      ...(incollaVoce ? [incollaVoce] : []),
      null,
      { testo: "Non l'ho mangiato", icona: "chiudi", rossa: true, fai: () => saltaPasto(id) },
    ]);
    if (!voci.length) return menu(riga, [
      { testo: "Aggiungi", icona: "piu", fai: () => vai(`#/aggiungi?giorno=${giornoScelto}&pasto=${id}`) },
      incollaVoce,
    ].filter(Boolean));
    menu(riga, [
      { testo: "Apri", icona: "elenco", fai: () => apriPasto(id) },
      { testo: "Aggiungi", icona: "piu", fai: () => vai(`#/aggiungi?giorno=${giornoScelto}&pasto=${id}`) },
      { testo: "Copia il pasto", icona: "copia", fai: () => copiaVoci(voci, daQui(id)) },
      ...(incollaVoce ? [incollaVoce] : []),
      null,
      { testo: "Svuota il pasto", icona: "cestino", rossa: true, fai: () => {
        voci.forEach((v) => store.elimina("diario", v.id));
        avviso(`${nomeDi(id)} svuotato`, "", { annulla: () => store.salvaTante("diario", voci) });
      } },
    ]);
  }

  /** Foglio con le voci di un pasto: tocchi una riga per cambiarla; tieni premuto, scorri o trascina per il resto */
  function apriPasto(id, apriVoce = "") {
    const eAttivita = id === "attivita";
    const leggiVoci = () => eAttivita ? R.attivitaDel(giornoScelto) : R.pastiDel(giornoScelto).filter((v) => v.pasto === id);
    let voci = leggiVoci();
    const indirizzo = `#/aggiungi?giorno=${giornoScelto}&${eAttivita ? "tipo=attivita" : `pasto=${id}`}`;
    if (!voci.length) return vai(indirizzo);
    const info = eAttivita ? { nome: "Attività", icona: "fuoco" } : PASTI.find((p) => p.id === id);
    const righe = () => voci.map((v) => `
      <button class="voce voce-tocco gestibile" data-voce="${v.id}">
        <span class="voce-nome"><strong>${esc(v.nome ?? v.descrizione)}</strong>
          <small>${eAttivita ? (v.minuti ? `${v.minuti} min` : "") : `${v.per100 ? esc(testoQuantita(v)) : ""}${macroVoce(v)}`}</small></span>
        <span class="kcal">${numero(v.kcal)}</span>
      </button>`).join("");
    const ap = A.leggi();
    const { el: f, chiudi } = foglio(`
      <div class="foglio-testa">
        <h2 class="titolo-romano titolo-pasto">${icona(info.icona, "ic-pasto")}${info.nome}</h2>
        ${eAttivita ? "" : `<button class="copia-mini" data-copia>${icona("copia")} copia</button>
          ${ap ? `<button class="copia-mini" data-incolla-qui>${icona("incolla")} incolla (${ap.voci.length})</button>` : ""}`}
        <button class="tondo" data-chiudi aria-label="Chiudi">${icona("chiudi")}</button>
      </div>
      ${eAttivita ? "" : `<div class="sposta-in" hidden><small>Sposta in</small>
        ${PASTI.filter((p) => p.id !== id).map((p) => `<span class="chip" data-sposta-in="${p.id}">${icona(p.icona)}${p.nome}</span>`).join("")}</div>`}
      <div class="voci">${righe()}</div>
      <p class="suggerimento-foglio">Tieni premuto un alimento per il menu · scorrilo per duplicare o eliminare</p>
      <a class="pillola terra larga" href="${indirizzo}" data-chiudi>${icona("piu")} Aggiungi</a>`);

    const aggiorna = () => {
      voci = leggiVoci();
      if (!voci.length) return chiudi();
      f.querySelector(".voci").innerHTML = righe();
    };
    window.addEventListener("annona-dati", aggiorna);
    const dopoChiuso = new MutationObserver(() => { if (!f.isConnected) { window.removeEventListener("annona-dati", aggiorna); dopoChiuso.disconnect(); } });
    dopoChiuso.observe(document.body, { childList: true });
    const voceDi = (riga) => voci.find((v) => v.id === riga.dataset.voce);

    /** Il foglio Modifica di una voce: quantità, valori, cambia alimento, elimina */
    function modifica(v, { valori = false } = {}) {
      const cambia = () => { chiudi(); vai(`#/aggiungi?giorno=${giornoScelto}&pasto=${id}&cambia=${v.id}`); };
      if (!eAttivita && v.per100) {
        return apriDosatore(v, {
          simbolo: info.icona, conferma: "Salva", rimuovi: "Elimina", valori, modificaValori: true,
          onConferma: (nuova) => store.salva("diario", nuova),
          onRimuovi: () => eliminaVoce(v),
          onCambia: cambia,
        });
      }
      // senza grammi (kcal scritte a mano) o un'attività: solo elimina (e cambia, per gli alimenti)
      const { el: m, chiudi: chiudiM } = foglio(`
        <div class="foglio-testa dos-testa"><span class="dos-simbolo">${icona(info.icona)}</span>
          <h2 class="dos-nome">${esc(v.nome ?? v.descrizione)}</h2><button class="tondo" data-chiudi aria-label="Chiudi">${icona("chiudi")}</button></div>
        <div class="dos-schermo"><div class="dos-kcal">${eAttivita ? "+" : ""}${numero(v.kcal)} <small>kcal${v.minuti ? ` · ${v.minuti} min` : ""}</small></div></div>
        <div class="dos-fondo">
          <button class="dos-rimuovi" data-elimina>${icona("cestino")} Elimina</button>
          ${eAttivita ? "" : `<button class="pillola terra" data-cambia>${icona("annulla")} Cambia alimento</button>`}
        </div>`);
      m.addEventListener("click", (e) => {
        if (e.target.closest("[data-elimina]")) { chiudiM(); eliminaVoce(v); }
        if (e.target.closest("[data-cambia]")) { chiudiM(); cambia(); }
      });
    }

    const barraSposta = f.querySelector(".sposta-in");
    gesti(f.querySelector(".voci"), "[data-voce]", {
      destra: { testo: "Duplica", icona: "duplica", fai: (r) => duplicaVoce(voceDi(r)) },
      sinistra: { testo: "Elimina", icona: "cestino", fai: (r) => eliminaVoce(voceDi(r)) },
      lungo: (r) => {
        const v = voceDi(r);
        menu(r, eAttivita ? [{ testo: "Elimina", icona: "cestino", rossa: true, fai: () => eliminaVoce(v) }] : [
          ...(v.per100 ? [{ testo: "Modifica quantità", icona: "bilancia", fai: () => modifica(v) },
            { testo: "Modifica valori (macro)", icona: "matita", fai: () => modifica(v, { valori: true }) }] : []),
          { testo: "Cambia alimento", icona: "annulla", fai: () => { chiudi(); vai(`#/aggiungi?giorno=${giornoScelto}&pasto=${id}&cambia=${v.id}`); } },
          { testo: "Copia", icona: "copia", fai: () => { copiaVoci([v], daQui(id)); chiudi(); } },
          { testo: "Duplica", icona: "duplica", fai: () => duplicaVoce(v) },
          { testo: "Sposta in…", icona: "sposta", fai: () => scegliPasto(`Sposta «${v.nome}» in`, id, (p) => spostaVoce(v, p)) },
          null,
          { testo: "Elimina", icona: "cestino", rossa: true, fai: () => eliminaVoce(v) },
        ]);
      },
      trascina: eAttivita ? undefined : {
        bersagli: "[data-sposta-in]",
        inizio: () => { barraSposta.hidden = false; },
        fine: () => { barraSposta.hidden = true; },
        lascia: (r, b) => spostaVoce(voceDi(r), b.dataset.spostaIn),
      },
    });

    f.addEventListener("click", (e) => {
      if (e.target.closest("[data-copia]")) { chiudi(); return copiaVoci(voci, daQui(id)); }
      if (e.target.closest("[data-incolla-qui]")) { chiudi(); return incolla(id); }
      const riga = e.target.closest("[data-voce]");
      if (riga) modifica(voceDi(riga));
    });
    // tornando da «Cambia alimento» con Annulla: si riapre il foglio Modifica dell'alimento di prima
    const daRiaprire = apriVoce && voci.find((v) => v.id === apriVoce);
    if (daRiaprire) modifica(daRiaprire);
  }

  /** Un foglio piccolo per scegliere un pasto (Sposta in…, Incolla in…) */
  function scegliPasto(titolo, tranne, poi) {
    const { el: f, chiudi } = foglio(`
      <div class="foglio-testa"><h2 class="titolo-romano">${esc(titolo)}</h2><button class="tondo" data-chiudi aria-label="Chiudi">${icona("chiudi")}</button></div>
      <div class="scelta-pasti">
        ${PASTI.filter((p) => p.id !== tranne).map((p) => `<button class="pasto" data-verso="${p.id}"><span class="pall">${icona(p.icona)}</span>
          <span class="pasto-testo"><strong>${p.nome}</strong></span><span class="aggiungi-mini">${icona("dx")}</span></button>`).join("")}
      </div>`);
    f.addEventListener("click", (e) => {
      const p = e.target.closest("[data-verso]");
      if (p) { chiudi(); poi(p.dataset.verso); }
    });
  }

  /** Gli appunti pieni: una barra sopra i pasti (cosa hai copiato, ✕ per svuotare); «Incolla» è su ogni pasto */
  function barraAppunti() {
    const ap = A.leggi();
    if (!ap) return "";
    const n = ap.voci.length;
    return `
      <div class="appunti">
        <span class="appunti-tocco">
          ${icona("copia")}
          <span><b>${n === 1 ? esc(ap.voci[0].nome) : `${n} alimenti copiati`}</b>
            <small>${numero(P.sommaKcal(ap.voci))} kcal · da ${esc(ap.da)} · tocca «Incolla» su un pasto</small></span>
        </span>
        <button class="tondo piccolo-tondo" data-azione="svuota-appunti" aria-label="Svuota gli appunti">${icona("chiudi")}</button>
      </div>`;
  }

  /** Incolla gli appunti nel giorno che stai guardando, nel pasto indicato */
  function incolla(verso) {
    const ap = A.leggi();
    if (!ap) return;
    const adesso = new Date().toISOString();
    const nuove = store.salvaTante("diario", ap.voci.map((v) => ({ ...P.pulisciVoce(v), giorno: giornoScelto, pasto: verso, creato_il: adesso })));
    avviso(`Incollato in ${nomeDi(verso).toLowerCase()} · ${numero(P.sommaKcal(ap.voci))} kcal`, "",
      { annulla: () => nuove.forEach((v) => store.elimina("diario", v.id)) });
  }

  /** Scorri a destra (o «Mangiato così»): il pasto previsto, mangiato com'è → nel diario */
  function mangiatoSubito(id, voci = P.vociDi(P.giornoSettimana(giornoScelto), id)) {
    if (!voci.length) return;
    const adesso = new Date().toISOString();
    const nuove = store.salvaTante("diario", voci.map((v) => ({ ...P.pulisciVoce(v), giorno: giornoScelto, pasto: id, creato_il: adesso })));
    avviso(`${nomeDi(id)}: ${numero(P.sommaKcal(voci))} kcal registrate`, "",
      { annulla: () => nuove.forEach((v) => store.elimina("diario", v.id)) });
  }
  function saltaPasto(id) {
    P.salta(giornoScelto, id);
    avviso(`${nomeDi(id)}: non mangiato`, "", { annulla: () => P.ripristina(giornoScelto, id) });
  }
  /** Scorri a sinistra: «ho mangiato altro» → il previsto non conta più, e si apre Aggiungi per quel pasto */
  function mangiatoAltro(id) {
    P.salta(giornoScelto, id);
    vai(`#/aggiungi?giorno=${giornoScelto}&pasto=${id}`);
  }

  /** Tocco su un pasto previsto: tutti gli alimenti spuntati; togli ciò che non hai mangiato, cambia i grammi */
  function apriPrevisto(id) {
    const g = giornoScelto, info = PASTI.find((p) => p.id === id);
    const voci = P.vociDi(P.giornoSettimana(g), id).map((v) => ({ ...v }));
    const si = new Set(voci.map((_, i) => i));
    const { el: f, chiudi } = foglio(`
      <div class="foglio-testa">
        <h2 class="titolo-romano titolo-pasto">${icona(info.icona, "ic-pasto")}${info.nome}</h2>
        <button class="tondo" data-chiudi aria-label="Chiudi">${icona("chiudi")}</button>
      </div>
      <p class="sotto">Dalla scheda di ${esc(P.NOMI_GIORNI[P.giornoSettimana(g) - 1].toLowerCase())} · togli la spunta a ciò che non hai mangiato</p>
      <div class="voci"></div>
      <a class="mini-pulsante altro-previsto" href="#/aggiungi?previsto=1&giorno=${g}&pasto=${id}" data-chiudi>${icona("piu")} Cambia o aggiungi altro</a>
      <button class="pillola terra larga" data-mangiato></button>`);
    const disegnaVoci = () => {
      f.querySelector(".voci").innerHTML = voci.map((v, i) => `
        <div class="voce da-copiare ${si.has(i) ? "scelta-si" : "scelta-no"}" data-i="${i}" role="checkbox" aria-checked="${si.has(i)}">
          <span class="spunta-tonda">${icona("spunta")}</span>
          <span class="voce-nome"><strong>${esc(v.nome)}</strong></span>
          ${v.per100 ? `<button class="quantita" data-dosa>${esc(testoQuantita(v).split(" · ")[0])}</button>` : ""}
          <span class="kcal">${numero(v.kcal)}</span>
        </div>`).join("");
      const scelte = voci.filter((_, i) => si.has(i));
      f.querySelector("[data-mangiato]").innerHTML = scelte.length
        ? `${icona("spunta")} Mangiato · ${numero(P.sommaKcal(scelte))} kcal` : "Non l'ho mangiato";
    };
    disegnaVoci();
    f.addEventListener("click", (e) => {
      const r = e.target.closest("[data-i]");
      if (r && e.target.closest("[data-dosa]")) {
        const i = Number(r.dataset.i);
        return apriDosatore(voci[i], { onConferma: (nuova) => { voci[i] = nuova; si.add(i); disegnaVoci(); }, conferma: "Fatto" });
      }
      if (r) { const i = Number(r.dataset.i); si.has(i) ? si.delete(i) : si.add(i); disegnaVoci(); }
      if (e.target.closest("[data-mangiato]")) {
        const scelte = voci.filter((_, i) => si.has(i));
        chiudi();
        scelte.length ? mangiatoSubito(id, scelte) : saltaPasto(id);
      }
    });
  }

  el.addEventListener("click", (e) => {
    const b = e.target.closest("[data-azione]");
    if (!b) return;
    const a = b.dataset.azione;
    if (a === "ieri") { giornoScelto = aggiungiGiorni(giornoScelto, -1); disegna(); }
    if (a === "domani" && giornoScelto < oggi()) { giornoScelto = aggiungiGiorni(giornoScelto, 1); disegna(); }
    if (a === "perche") { mostraPerche = !mostraPerche; disegna(); }
    if (a === "apri") apriPasto(b.dataset.pasto);
    if (a === "previsto") apriPrevisto(b.dataset.pasto);
    if (a === "incolla-in") incolla(b.dataset.pasto);
    if (a === "svuota-appunti") { A.svuota(); disegna(); }
    if (a === "conti") { mostraConti = !mostraConti; disegna(); }
    if (a === "ripristina") { P.ripristina(giornoScelto, b.dataset.pasto); disegna(); }
    if (a === "provviste") apriProvviste({ vai });
    if (a === "guardiano-ia") apriPercorso({ onFatto: disegna });
    if (a === "guardiano-pausa") apriPausa({ onFatto: disegna });
    if (a === "taratura-nonora") { G.taraturaNonOra(); avviso("Va bene: te lo ricordo tra una settimana."); disegna(); }
    if (a === "taratura-tieni") { G.taraturaTieni(); avviso("Teniamo il tuo livello. Riguardo i dati tra 4 settimane."); disegna(); }
    if (a === "taratura-passa") { G.taraturaAccetta(b.dataset.livello); avviso("Livello aggiornato da oggi: i conti ora seguono i tuoi dati."); disegna(); }
    if (a === "guardiano-nonora") { G.nonOra(); avviso("Va bene: te lo ricordo tra una settimana."); disegna(); }
  });

  // i gesti sulle righe dei pasti (anche quelle ridisegnate dopo)
  gesti(el, "[data-gesto]", {
    destra: (r) => r.dataset.gesto === "previsto" ? { testo: "Mangiato", icona: "spunta", fai: () => { segnaScorri(); mangiatoSubito(r.dataset.pasto); } } : null,
    sinistra: (r) => r.dataset.gesto === "previsto" ? { testo: "Ho mangiato altro", icona: "sposta", classe: "altro", fai: () => { segnaScorri(); mangiatoAltro(r.dataset.pasto); } } : null,
    lungo: (r) => menuPasto(r, r.dataset.pasto),
  });

  const aggiorna = () => disegna();
  window.addEventListener("annona-dati", aggiorna);
  disegna();
  if (parametri.apri) apriPasto(parametri.apri, parametri.voce);
  return () => window.removeEventListener("annona-dati", aggiorna);
}
