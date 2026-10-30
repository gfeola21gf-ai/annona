/* =========================================================
   miei.js — i TUOI alimenti: valori per 100 g corretti a mano
   (es. «il mio yogurt greco ha 10 g di proteine, non 8»).

   Stanno nel profilo (quindi anche sugli altri dispositivi):
     profilo.alimentiMiei = { "yogurt greco 0%": { nome, per100 } }
   Nella ricerca compaiono per primi, già corretti.
   ========================================================= */

import * as store from "../dati/store.js";
import { normalizza } from "../servizi/cibo.js";

export const elenco = () =>
  Object.values(store.profilo()?.alimentiMiei ?? {}).map((a) => ({ ...a, porzione: a.porzione || 100, fonte: "mio" }));

/** Ricorda i valori di un alimento (sostituisce quelli di prima con lo stesso nome) */
export function ricorda(nome, per100, porzione) {
  const profilo = store.profilo() ?? {};
  const miei = { ...(profilo.alimentiMiei ?? {}) };
  miei[normalizza(nome)] = { nome, per100, porzione: Math.round(porzione) || 100 };
  store.salvaProfilo({ ...profilo, alimentiMiei: miei });
}

/** Se l'alimento è tra i tuoi, i tuoi valori; altrimenti null */
export const valoriDi = (nome) => store.profilo()?.alimentiMiei?.[normalizza(nome)]?.per100 ?? null;
