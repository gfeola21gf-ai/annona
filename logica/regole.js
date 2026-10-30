/* =========================================================
   regole.js — le REGOLE CHE SEGUONO GLI AGGIORNAMENTI (2026-10-30, anteprima/PIANO-NOVITA.md).

   Ogni impostazione salva QUALE regola hai scelto, non il numero:
   così, quando miglioriamo una formula, chi usa lo standard la riceve
   da solo; chi ha scelto «su misura» resta com'è.

   VERSIONE_REGOLE: si alza quando una formula cambia e serve sistemare
   i profili vecchi (aggiornaRegole). VERSIONE_NOVITA: si alza quando c'è
   una nuova schermata «Novità» da mostrare una volta (dati/novita.js).
   ========================================================= */

import * as store from "../dati/store.js";
import * as E from "./energia.js";
import { pesoAttuale } from "./riepilogo.js";

export const VERSIONE_REGOLE = 1;
export const VERSIONE_NOVITA = 1;

/** Le «Novità» da mostrare? (profilo completo e non ancora viste) */
export const novitaDaVedere = () => {
  const p = store.profilo();
  return !!p?.completato && (Number(p.novitaVista) || 0) < VERSIONE_NOVITA;
};

/**
 * Porta un profilo vecchio alle regole di oggi. Una volta sola (profilo.versioneRegole).
 * v1: il ritmo diventa una SCELTA (dolce/costante/deciso) che segue il peso; `ritmo` (il numero vecchio) resta
 *     com'era: serve alle «Novità» per mostrare «prima → ora». Macro: già «consigliati» se non scelti a mano.
 * @returns true se ha cambiato qualcosa
 */
export function aggiornaRegole() {
  const p = store.profilo();
  if (!p?.completato || (Number(p.versioneRegole) || 0) >= VERSIONE_REGOLE) return false;
  const nuovo = { ...p, versioneRegole: VERSIONE_REGOLE };
  if (!p.ritmoScelta) nuovo.ritmoScelta = E.sceltaVicina(Number(p.ritmo) || 0, pesoAttuale());
  store.salvaProfilo(nuovo);
  return true;
}
