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

async function chiama(azione, dati) {
  if (soloLocale()) throw new Error("In modalità prova l'IA non è disponibile: entra con il tuo account.");
  if (!navigator.onLine) throw new Error("Serve internet per questa funzione.");
  const { data, error } = await supabase.functions.invoke(FUNZIONE, { body: { azione, ...dati } });
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
 * @returns [{nome, grammi, kcal, proteine, carboidrati, grassi}]
 */
export async function stimaPasto(testo) {
  const r = await chiama("pasto", { testo });
  return (r.alimenti ?? []).filter((a) => a.nome && a.grammi > 0);
}

/**
 * Dalla foto del piatto (o dell'etichetta) agli alimenti stimati.
 * @param foto  JPEG in base64
 * @param nota  un aiuto facoltativo scritto o dettato ("olio a crudo")
 * @returns come stimaPasto
 */
export async function stimaFoto(foto, nota = "") {
  const r = await chiama("foto", { file: foto, tipo: "image/jpeg", testo: nota });
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
  return chiama("scheda", file ? { file, tipo } : { testo });
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
