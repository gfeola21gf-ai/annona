/* =========================================================
   riepilogo.js — mette insieme DATI (store) e CALCOLI (energia)
   per rispondere alle domande delle schermate:
   "quanto peso adesso?", "com'è andato questo giorno?",
   "a questo ritmo quanto perdo a settimana?"
   ========================================================= */

import * as store from "../dati/store.js";
import * as E from "./energia.js";
import { oggi, aggiungiGiorni } from "./giorni.js";

/** Le pesate in ordine di tempo */
export const pesateOrdinate = () =>
  store.elenco("pesate").sort((a, b) => new Date(a.quando) - new Date(b.quando));

/** Il peso più recente (o quello di partenza) */
export function pesoAttuale() {
  const p = pesateOrdinate();
  return p.length ? Number(p[p.length - 1].kg) : Number(store.profilo()?.pesoIniziale) || 0;
}

/** Bilancio voluto al giorno, dal ritmo scelto (es. −0,5 kg/sett → −550 kcal) */
export const obiettivoKcal = () => E.kcalGiornalierePerRitmo(Number(store.profilo()?.ritmo) || 0);

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

/** Il bilancio completo di un giorno */
export function giorno(chiave = oggi()) {
  return E.bilancioGiorno({
    basaleKcal: basaleAttuale(),
    pasti: pastiDel(chiave),
    attivita: attivitaDel(chiave),
    obiettivoKcal: obiettivoDel(chiave),
    fattore: fattoreDel(chiave),
  });
}

/** Le percentuali di macronutrienti scelte nel profilo (o quelle predefinite) */
export const percentualiMacro = () => E.ripartizione(store.profilo()?.macro);

/** Macronutrienti di un giorno: mangiati e obiettivo (grammi), sull'obiettivo kcal del giorno */
export function macroDel(chiave = oggi()) {
  return {
    mangiati: E.sommaMacro(pastiDel(chiave)),
    obiettivo: E.grammiMacro(Math.max(0, giorno(chiave).daMangiare), percentualiMacro()),
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
