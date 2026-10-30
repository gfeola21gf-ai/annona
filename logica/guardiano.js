/* =========================================================
   guardiano.js — il GUARDIANO DEL METABOLISMO.

   Controlla (senza IA, solo conti) se il tuo percorso si è
   fermato: peso atteso dalle calorie contro peso reale
   (energia.valutaStallo), e da quante settimane sei in deficit
   senza una pausa. Se serve, PROPONE una pausa dalla dieta:
   non obbliga mai, puoi sempre dire «Non ora».

   Prepara anche il riassunto delle ultime settimane che
   «Valuta il mio percorso» manda all'IA.
   ========================================================= */

import * as store from "../dati/store.js";
import * as R from "./riepilogo.js";
import * as E from "./energia.js";
import { oggi, aggiungiGiorni, daChiave, etaDa, chiaveGiorno } from "./giorni.js";

const NON_ORA = "annona.guardiano.nonora";     // fino a quale giorno l'avviso resta nascosto
const TARATURA = "annona.guardiano.taratura";  // idem, per la proposta di taratura
export const SETTIMANE_PER_PAUSA = 12;

/** Giorni tra due date "AAAA-MM-GG" */
const giorniTra = (da, a) => Math.round((daChiave(a) - daChiave(da)) / 86400000);

/** I giorni che contano (scelti da te: i registrati a metà si possono escludere, i digiuni includere) */
const giorniRegistrati = () => R.giorniCheContano();

/** L'ultima pausa già finita (o null) */
export function ultimaPausa() {
  const finite = (store.profilo()?.pause ?? []).filter((p) => p.fine < oggi());
  return finite.sort((a, b) => b.fine.localeCompare(a.fine))[0] ?? null;
}

/** Da quante settimane sei in deficit di fila (dal primo pasto registrato o dalla fine dell'ultima pausa) */
export function settimaneInDeficit() {
  if (R.ritmo() >= 0) return 0;
  const registrati = giorniRegistrati();
  if (!registrati.length || R.pausaDel()) return 0;
  const ultima = ultimaPausa();
  const inizio = ultima && aggiungiGiorni(ultima.fine, 1) > registrati[0].giorno ? aggiungiGiorni(ultima.fine, 1) : registrati[0].giorno;
  return Math.max(0, Math.floor(giorniTra(inizio, oggi()) / 7));
}

/**
 * TARATURA: dal fabbisogno reale misurato (calorie + andamento del peso, allenamenti tolti)
 * ricaviamo il tuo vero fattore di movimento. Se è lontano da quello scelto, lo proponiamo.
 * @returns {fattore, livello (il più vicino), attuale, quotidianoReale} oppure null
 */
export function taratura(stallo) {
  if (!stallo || R.pausaDel()) return null;
  const basale = R.basaleAttuale();
  if (!basale) return null;
  const quotidianoReale = stallo.fabbisognoReale - stallo.attivitaMedia;
  const fattore = Math.min(2, Math.max(1, quotidianoReale / basale));
  const vicino = E.livelloVicino(fattore);
  const attuale = R.livelloDel();
  if (attuale && (vicino.id === attuale.id || Math.abs(fattore - attuale.fattore) < 0.07)) return null;
  return { fattore, livello: vicino, attuale, quotidianoReale: Math.round(quotidianoReale) };
}

/** La situazione: {stallo, settimane, pausa, taratura, avviso: "taratura" | "stallo" | "settimane" | null} */
export function stato() {
  const stallo = E.valutaStallo(giorniRegistrati(), store.elenco("pesate"), oggi());
  const settimane = settimaneInDeficit();
  const pausa = R.pausaDel();
  const tara = taratura(stallo);
  let avviso = null;
  // prima la taratura: un livello sbagliato sembra uno stallo, ma si risolve cambiando il livello
  if (tara && !nascosto(TARATURA)) avviso = "taratura";
  else if (!pausa && R.ritmo() < 0 && !nascosto(NON_ORA)) {
    if (stallo?.stallo) avviso = "stallo";
    else if (settimane >= SETTIMANE_PER_PAUSA) avviso = "settimane";
  }
  return { stallo, settimane, pausa, taratura: tara, avviso };
}

const nascosto = (chiave) => { try { return (localStorage.getItem(chiave) ?? "") > oggi(); } catch { return false; } };
const nascondi = (chiave, giorni) => { try { localStorage.setItem(chiave, aggiungiGiorni(oggi(), giorni)); } catch { /* pazienza */ } };

/** Taratura: «Non ora» (7 giorni), «Tieni il mio» (4 settimane) oppure accetta (da oggi vale il nuovo livello) */
export const taraturaNonOra = () => nascondi(TARATURA, 7);
export const taraturaTieni = () => nascondi(TARATURA, 28);
export function taraturaAccetta(id) {
  const p = store.profilo() ?? {};
  const movimento = [...(p.movimento ?? []).filter((m) => m.da < oggi()), { da: oggi(), livello: id }];
  store.salvaProfilo({ ...p, movimento });
}

/* ---------- «Non ora»: l'avviso sparisce per una settimana ---------- */
export const avvisoNascosto = () => nascosto(NON_ORA);
export const nonOra = () => nascondi(NON_ORA, 7);

/* ---------- La pausa dalla dieta: la scegli tu, la interrompi quando vuoi ---------- */
export function iniziaPausa(giorni) {
  const p = store.profilo() ?? {};
  const pause = (p.pause ?? []).filter((x) => x.fine < oggi());
  pause.push({ inizio: oggi(), fine: aggiungiGiorni(oggi(), giorni - 1) });
  store.salvaProfilo({ ...p, pause });
  try { localStorage.removeItem(NON_ORA); } catch { /* pazienza */ }
}

/** Interrompe la pausa in corso: da oggi si torna al tuo ritmo */
export function interrompiPausa() {
  const p = store.profilo() ?? {};
  const pause = (p.pause ?? [])
    .map((x) => (x.inizio <= oggi() && oggi() <= x.fine ? { ...x, fine: aggiungiGiorni(oggi(), -1) } : x))
    .filter((x) => x.fine >= x.inizio);
  store.salvaProfilo({ ...p, pause });
}

/** Giorno della pausa: {numero, totale} (es. giorno 3 di 14) */
export function giornoDiPausa(pausa, chiave = oggi()) {
  return { numero: giorniTra(pausa.inizio, chiave) + 1, totale: giorniTra(pausa.inizio, pausa.fine) + 1 };
}

/** Il riassunto per l'IA: dati della persona + le ultime 6 settimane, una riga per settimana */
export function riassunto() {
  const p = store.profilo() ?? {};
  const registrati = giorniRegistrati();
  const pesate = store.elenco("pesate");
  const settimane = [];
  for (let s = 6; s >= 1; s--) {
    const da = aggiungiGiorni(oggi(), -7 * s), a = aggiungiGiorni(da, 7);
    const giorni = registrati.filter((g) => g.giorno >= da && g.giorno < a);
    const pesi = pesate.filter((x) => { const g = chiaveGiorno(x.quando); return g >= da && g < a; }).map((x) => Number(x.kg));
    const media = (v) => (v.length ? Math.round((v.reduce((t, x) => t + x, 0) / v.length) * 10) / 10 : null);
    settimane.push({
      dal: da,
      giorniRegistrati: giorni.length,
      pesoMedio: media(pesi),
      kcalMangiateMedie: media(giorni.map((g) => g.mangiato)),
      attivitaMedia: media(giorni.map((g) => g.attivita)),
      bilancioMedio: media(giorni.map((g) => g.bilancio)),
      inPausa: Boolean(R.pausaDel(aggiungiGiorni(da, 3))),
    });
  }
  const s = stato();
  return {
    persona: {
      sesso: p.sesso, eta: p.nascita ? etaDa(p.nascita) : null, altezza: p.altezza,
      pesoAttuale: R.pesoAttuale(), pesoObiettivo: p.pesoObiettivo, ritmo: R.ritmo(),
      basaleFormula: R.basaleAttuale(), obiettivoKcal: R.obiettivoKcal(),
      movimento: R.livelloDel()?.nome ?? "non scelto", fattoreMovimento: R.fattoreDel(),
    },
    settimane,
    calcoli: { settimaneInDeficit: s.settimane, stallo: s.stallo, ultimaPausa: ultimaPausa() },
  };
}
