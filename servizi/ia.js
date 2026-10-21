/* =========================================================
   ia.js — il "telefono" verso la funzione su Supabase.

   L'app NON parla direttamente con Gemini o Claude: chiede alla
   funzione "annona" (supabase/functions/annona/index.ts), che tiene
   la chiave segreta e sceglie il fornitore di IA.
   Così la chiave non finisce mai nel telefono, e cambiare IA
   non richiede di toccare l'app.

   Risposte sempre nello stesso formato, qualunque IA ci sia dietro.
   ========================================================= */

import { supabase, soloLocale } from "../dati/store.js";
import { FUNZIONE } from "../config.js";
import { ALIMENTI } from "../dati/alimenti.js";

// I nomi della tabella interna: l'IA indica quale corrisponde (campo "tabella")
// e le calorie le calcola l'app dalla tabella (vedi cibo.js → voceDaStima)
const TABELLA = ALIMENTI.map((a) => a.nome);

async function chiama(azione, dati) {
  if (soloLocale()) throw new Error("In modalità prova l'IA non è disponibile: entra con il tuo account.");
  if (!navigator.onLine) throw new Error("Serve internet per questa funzione.");
  // un tempo massimo: la funzione prova già un'IA di riserva, oltre non ha senso aspettare
  const secondi = azione === "scheda" ? 140 : azione === "foto" ? 90 : 60;
  const invia = () => supabase.functions.invoke(FUNZIONE, { body: { azione, ...dati }, signal: AbortSignal.timeout(secondi * 1000) });
  let { data, error } = await invia();
  // la linea è caduta per un attimo (non una risposta della funzione): un secondo tentativo, da solo
  if (error?.name === "FunctionsFetchError" && !error.context?.name?.includes("Timeout")) ({ data, error } = await invia());
  if (error?.context?.name === "TimeoutError" || error?.context?.name === "AbortError")
    throw new Error("L'IA ci sta mettendo troppo: riprova, oppure cerca l'alimento o inseriscilo a mano.");
  if (error) {
    // Proviamo a leggere il messaggio spiegato dalla funzione
    let messaggio = "Il servizio non risponde, riprova tra poco.";
    try { messaggio = (await error.context.json()).errore || messaggio; } catch { /* niente */ }
    throw new Error(messaggio);
  }
  if (data?.errore) throw new Error(data.errore);
  return data;
}

/**
 * Dal testo ("pasta al pomodoro e un'insalata") agli alimenti stimati.
 * @returns [{nome, grammi, kcal, proteine, carboidrati, grassi, tabella?}]
 */
export async function stimaPasto(testo) {
  const r = await chiama("pasto", { testo, tabella: TABELLA });
  return (r.alimenti ?? []).filter((a) => a.nome && a.grammi > 0);
}

/**
 * Dalla foto del piatto (o dell'etichetta) agli alimenti stimati.
 * @param foto  JPEG in base64
 * @param nota  un aiuto facoltativo scritto o dettato ("olio a crudo")
 * @returns come stimaPasto
 */
export async function stimaFoto(foto, nota = "") {
  const r = await chiama("foto", { file: foto, tipo: "image/jpeg", testo: nota, tabella: TABELLA });
  return (r.alimenti ?? []).filter((a) => a.nome && a.grammi > 0);
}

/**
 * Dal testo ("corsa 40 minuti media intensità") alle kcal bruciate.
 * @param peso  il tuo peso attuale (serve per una stima giusta)
 * @returns {descrizione, minuti, kcal}
 */
export function stimaAttivita(testo, peso) {
  return chiama("attivita", { testo, peso });
}

/** Ricerca nel database Open Food Facts (prodotti confezionati) */
export async function cercaProdotti(testo) {
  const r = await chiama("cerca", { testo });
  return r.prodotti ?? [];
}

/**
 * Una ripartizione dei macronutrienti adatta alla dieta descritta.
 * @param testo     la dieta che vuoi fare e la tua situazione
 * @param persona   {sesso, eta, peso, pesoObiettivo, kcal, ritmo}
 * @returns {carboidrati, proteine, grassi (in %), spiegazione}
 */
export function chiediMacro(testo, persona) {
  return chiama("macro", { testo, persona });
}

/**
 * «Valuta il mio percorso»: il giudizio dell'IA sulle ultime settimane.
 * @param riassunto  logica/guardiano.js → riassunto()
 * @returns {verdetto: "stallo"|"regolare"|"presto", consiglio, pausaGiorni: 0|7|14}
 */
export function chiediPercorso(riassunto) {
  return chiama("percorso", { riassunto });
}

/**
 * Legge la scheda settimanale da una foto/PDF (base64) oppure da un testo.
 * @returns {giorni: [{giorno: 1-7, pasti: {colazione: [alimenti], …}}], note}
 */
export function leggiScheda({ testo = "", file = null, tipo = "" }) {
  return chiama("scheda", { ...(file ? { file, tipo } : { testo }), tabella: TABELLA });
}

/**
 * Cosa preparare stasera per i pasti di domani.
 * @param pasti  [{pasto, alimenti: [{nome, grammi}]}]
 * @returns [{tipo: "scongela"|"cuoci"|"porziona"|"prepara", alimento, pasto, consiglio}]
 */
export async function chiediProvviste(pasti) {
  const r = await chiama("provviste", { pasti });
  return r.compiti ?? [];
}
