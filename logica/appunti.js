/* =========================================================
   appunti.js — gli alimenti COPIATI, in attesa di essere incollati.

   Restano in questo telefono (localStorage) finché non li svuoti:
   così puoi incollarli in più pasti e in più giorni.
   { voci: [voci del diario, senza id/giorno/pasto], da: "cena di ieri" }
   ========================================================= */

import { pulisciVoce } from "./piano.js";

const CHIAVE = "annona.appunti";

export function leggi() {
  try {
    const a = JSON.parse(localStorage.getItem(CHIAVE));
    return a?.voci?.length ? a : null;
  } catch { return null; }
}

export function copia(voci, da) {
  try { localStorage.setItem(CHIAVE, JSON.stringify({ voci: voci.map(pulisciVoce), da })); } catch { /* niente */ }
}

export function svuota() {
  try { localStorage.removeItem(CHIAVE); } catch { /* niente */ }
}
