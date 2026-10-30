/* =========================================================
   riepilogo.js — mette insieme DATI (store) e CALCOLI (energia)
   per rispondere alle domande delle schermate:
   "quanto peso adesso?", "com'è andato questo giorno?",
   "a questo ritmo quanto perdo a settimana?"
   ========================================================= */

import * as store from "../dati/store.js";
import * as E from "./energia.js";
import { oggi, aggiungiGiorni, etaDa } from "./giorni.js";
import * as P from "./piano.js";

/** Le pesate in ordine di tempo */
export const pesateOrdinate = () =>
  store.elenco("pesate").sort((a, b) => new Date(a.quando) - new Date(b.quando));

/** Il peso più recente (o quello di partenza) */
export function pesoAttuale() {
  const p = pesateOrdinate();
  return p.length ? Number(p[p.length - 1].kg) : Number(store.profilo()?.pesoIniziale) || 0;
}

/**
 * Il RITMO di oggi (kg a settimana): dalla scelta (`ritmoScelta`, segue il peso) oppure, nei profili non ancora
 * aggiornati, dal numero salvato (`ritmo`). Leggere SEMPRE questo, non profilo.ritmo.
 */
export function ritmo() {
  const p = store.profilo();
  return p?.ritmoScelta ? E.ritmoDaScelta(p.ritmoScelta, pesoAttuale()) : Number(p?.ritmo) || 0;
}

/** Bilancio voluto al giorno, dal ritmo scelto (es. −0,5 kg/sett → −550 kcal) */
export const obiettivoKcal = () => E.kcalGiornalierePerRitmo(ritmo());

export const basaleAttuale = () => E.basaleDelProfilo(store.profilo(), pesoAttuale());

/** Pasti e attività di un giorno */
export const pastiDel = (giorno) => store.elenco("diario").filter((v) => v.giorno === giorno);
export const attivitaDel = (giorno) => store.elenco("attivita").filter((v) => v.giorno === giorno);

/**
 * PAUSA DALLA DIETA: nel profilo, pause = [{inizio, fine}] ("AAAA-MM-GG", fine compresa).
 * In quei giorni l'obiettivo è il fabbisogno: niente deficit né surplus.
 */
export const pausaDel = (chiave = oggi()) =>
  (store.profilo()?.pause ?? []).find((p) => p.inizio <= chiave && chiave <= p.fine) ?? null;

/** L'obiettivo (deficit/surplus voluto) di un giorno: 0 se quel giorno sei in pausa */
export const obiettivoDel = (chiave = oggi()) => (pausaDel(chiave) ? 0 : obiettivoKcal());

/**
 * MOVIMENTO DI OGNI GIORNO: nel profilo, movimento = [{da: "AAAA-MM-GG", livello: "basso"}].
 * Vale il più recente con «da» ≤ quel giorno, così i periodi passati restano calcolati col livello di allora.
 * Se non l'hai ancora scelto: fattore 1 (solo basale, come prima).
 */
export function livelloDel(chiave = oggi()) {
  const voci = (store.profilo()?.movimento ?? []).filter((m) => m.da <= chiave).sort((a, b) => b.da.localeCompare(a.da));
  return voci.length ? E.livello(voci[0].livello) : null;
}
export const fattoreDel = (chiave = oggi()) => livelloDel(chiave)?.fattore ?? 1;

/** Il fabbisogno di un giorno senza allenamenti: basale × movimento */
export const quotidianoDel = (chiave = oggi()) => Math.round(basaleAttuale() * fattoreDel(chiave));

/** Il minimo da mangiare (regole dei nutrizionisti: energia.MINIMO_KCAL) */
export const minimoKcal = () => E.minimoKcal(store.profilo()?.sesso);

/** Quanto mangiare in un giorno SENZA allenamenti: movimento + deficit/surplus, mai sotto il minimo */
export const pianoKcal = (chiave = oggi()) => Math.max(0, E.pianoDelGiorno(quotidianoDel(chiave), obiettivoDel(chiave), minimoKcal()));

/** Il bilancio completo di un giorno */
export function giorno(chiave = oggi()) {
  return E.bilancioGiorno({
    basaleKcal: basaleAttuale(),
    pasti: pastiDel(chiave),
    attivita: attivitaDel(chiave),
    obiettivoKcal: obiettivoDel(chiave),
    fattore: fattoreDel(chiave),
    minimoKcal: minimoKcal(),
  });
}

/**
 * MACRO: profilo.macro = {modo: "nutrizionista"} (predefinito) oppure {modo: "misura", p, g} in %.
 * I profili di prima con {p, g} senza modo li avevano scelti a mano → «su misura».
 */
export const macroSuMisura = () => {
  const m = store.profilo()?.macro;
  return !!m && m.modo !== "nutrizionista" && m.p != null;
};

/** La persona per i calcoli dei macro: peso di oggi, altezza, età, allenamento, ritmo */
export function personaMacro() {
  const p = store.profilo() ?? {};
  return { peso: pesoAttuale(), altezza: p.altezza, eta: p.nascita ? etaDa(p.nascita) : 0, allenamento: p.allenamento, ritmo: ritmo() };
}

/**
 * I macro per un certo numero di kcal: {grammi, perc, perKg (proteine), pesoRif, fuori (controlli), suMisura}.
 * Del nutrizionista: dal peso. Su misura: dalle percentuali scelte, con i controlli di sicurezza.
 */
export function macroPer(kcal, scelta = store.profilo()?.macro) {
  const persona = personaMacro();
  const pesoRif = E.pesoRiferimento(persona.peso, persona.altezza);
  if (!scelta || scelta.modo === "nutrizionista" || scelta.p == null) {
    return { ...E.macroNutrizionista({ kcal, ...persona }), fuori: { p: null, g: null, c: null }, suMisura: false };
  }
  const perc = E.ripartizione(scelta);
  const grammi = E.grammiMacro(kcal, perc);
  return {
    grammi, perc, pesoRif, suMisura: true,
    perKg: pesoRif ? Math.round((grammi.p / pesoRif) * 10) / 10 : 0,
    fuori: E.controlliMacro({ grammi, kcal, pesoRif, eta: persona.eta }),
  };
}

/** Le percentuali di macronutrienti di oggi (su misura: quelle scelte; del nutrizionista: calcolate sul piano) */
export const percentualiMacro = () => macroPer(pianoKcal()).perc;

/** Macronutrienti di un giorno: mangiati e obiettivo (grammi), sull'obiettivo kcal del giorno */
export function macroDel(chiave = oggi()) {
  return {
    mangiati: E.sommaMacro(pastiDel(chiave)),
    obiettivo: macroPer(Math.max(0, giorno(chiave).daMangiare)).grammi,
  };
}

/* ---------- GIORNI CHE CONTANO ----------
   Decidi tu quali giorni entrano nella previsione: un giorno registrato a metà
   lo spegni (non sballa la media), un digiuno (giorno vuoto) lo accendi.
   Nel profilo: contaGiorni = {"AAAA-MM-GG": true|false}, solo le scelte fatte.
   Senza scelta: conta se ha almeno un pasto. */
export function contaGiorno(chiave) {
  const scelta = store.profilo()?.contaGiorni?.[chiave];
  return typeof scelta === "boolean" ? scelta : pastiDel(chiave).length > 0;
}
export const sceltoConta = (chiave) => typeof store.profilo()?.contaGiorni?.[chiave] === "boolean";

/** Salva più scelte in una volta: {"2026-10-17": false, …} (le più vecchie di 60 giorni si cancellano) */
export function impostaConte(scelte) {
  const p = store.profilo() ?? {};
  const limite = aggiungiGiorni(oggi(), -60);
  const contaGiorni = Object.fromEntries(Object.entries({ ...(p.contaGiorni ?? {}), ...scelte }).filter(([g]) => g >= limite));
  store.salvaProfilo({ ...p, contaGiorni });
}
export const impostaConta = (chiave, si) => impostaConte({ [chiave]: si });

/** I giorni (fino a ieri) che contano, tra quelli con pasti o con una scelta: [{giorno, mangiato, bilancio, attivita}] */
export function giorniCheContano() {
  const candidati = new Set([...store.elenco("diario").map((v) => v.giorno), ...Object.keys(store.profilo()?.contaGiorni ?? {})]);
  return [...candidati].filter((g) => g < oggi() && contaGiorno(g)).sort()
    .map((g) => { const b = giorno(g); return { giorno: g, mangiato: b.mangiato, bilancio: b.bilancio, attivita: b.bruciato }; });
}

/** Previsione settimanale dai giorni che contano (gli ultimi 7, oggi escluso) */
export const previsioneSettimanale = () => E.previsione(giorniCheContano(), oggi());

/* ---------- LA STIMA DI OGGI ----------
   kg a settimana = (fabbisogno di oggi − kcal di oggi) × 7 ÷ 7.700, come se ogni giorno fosse così.
   Per il giorno in corso, i pasti non ancora segnati contano come quelli PREVISTI della scheda
   (se quel giorno la scheda è vuota: una quota del piano). I pasti «non mangiato» valgono 0.
   I giorni passati usano solo quello che hai registrato. */
const QUOTE_PASTO = { colazione: 0.25, pranzo: 0.35, cena: 0.3, spuntino: 0.1 };

export function stimaGiorno(chiave = oggi()) {
  const b = giorno(chiave);
  let previste = 0;
  if (chiave === oggi()) {
    const gs = P.giornoSettimana(chiave);
    const pasti = pastiDel(chiave);
    const conScheda = Object.keys(QUOTE_PASTO).some((p) => P.vociDi(gs, p).length);
    for (const p of Object.keys(QUOTE_PASTO)) {
      if (pasti.some((v) => v.pasto === p) || P.saltato(chiave, p)) continue;
      previste += conScheda ? P.sommaKcal(P.vociDi(gs, p)) : Math.round(b.daMangiare * QUOTE_PASTO[p]);
    }
  }
  const bilancio = Math.round(b.mangiato + previste - b.fabbisogno);
  return {
    ...b, previste, bilancioStimato: bilancio,
    kgSettimana: E.kgSettimanaDa(bilancio),
    // prima del primo pasto segnato la giornata è solo «in corso»: bollino grigio
    stato: chiave === oggi() && !pastiDel(chiave).length ? "attesa" : E.statoBilancio(bilancio, b.daMangiare - b.fabbisogno),
  };
}
