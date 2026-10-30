/* =========================================================
   bentornato.js — il foglio BENTORNATO.

   Se riapri Annona dopo almeno un giorno intero di assenza,
   ti mostra i giorni rimasti indietro (al massimo gli ultimi 7,
   oggi escluso) e ti chiede quali contare per il guardiano del metabolismo:
     acceso = conta · spento = non conta.
   Già impostati: acceso se hai registrato abbastanza, spento se
   il giorno è vuoto o registrato a metà (meno di metà del piano).
   Un digiuno? Lo accendi e conta come 0 kcal mangiate.
   ========================================================= */

import * as R from "../logica/riepilogo.js";
import { oggi, aggiungiGiorni, nomeGiornoRelativo } from "../logica/giorni.js";
import { icona } from "../grafica/icone.js";
import { esc, numero, foglio } from "../ui.js";

const ULTIMA = "annona.ultimaApertura";
const leggi = () => { try { return localStorage.getItem(ULTIMA); } catch { return null; } };
const scrivi = (g) => { try { localStorage.setItem(ULTIMA, g); } catch { /* pazienza */ } };

/** Chiamata all'avvio (e quando riapri l'app): apre il foglio solo se serve, una volta sola */
export function controllaBentornato() {
  const ultima = leggi();
  const ieri = aggiungiGiorni(oggi(), -1);
  scrivi(oggi());
  if (!ultima || ultima >= ieri) return;                 // prima volta, oppure eri qui ieri o oggi
  if (document.querySelector(".foglio-sfondo")) return;  // c'è già un foglio aperto

  // i giorni dall'ultima apertura (compresa: magari quel giorno non l'avevi finito) fino a ieri
  const giorni = [];
  for (let g = ultima < aggiungiGiorni(oggi(), -7) ? aggiungiGiorni(oggi(), -7) : ultima; g <= ieri; g = aggiungiGiorni(g, 1)) {
    if (!R.sceltoConta(g)) giorni.push(g);
  }
  if (!giorni.length) return;

  // la proposta: acceso se il giorno è registrato abbastanza (almeno metà del piano)
  const righe = giorni.map((g) => {
    const b = R.giorno(g), pasti = new Set(R.pastiDel(g).map((v) => v.pasto)).size;
    const aMeta = b.mangiato > 0 && b.daMangiare > 0 && b.mangiato < b.daMangiare / 2;
    return { g, b, pasti, aMeta, si: b.mangiato > 0 && !aMeta };
  });

  const { el, chiudi } = foglio(`
    <div class="foglio-testa"><h2 class="titolo-romano">Bentornato!</h2><button class="tondo" data-chiudi aria-label="Chiudi">${icona("chiudi")}</button></div>
    <p class="sotto">Quali giorni contiamo? Spegni quelli segnati a metà; se hai digiunato, accendilo.</p>
    <div class="giorni-da-contare">${righe.map((r, i) => `
      <button class="giorno-conta" role="switch" aria-checked="${r.si}" data-i="${i}">
        <span><strong>${esc(nomeGiornoRelativo(r.g))}</strong>
          <small class="${r.aMeta || !r.pasti ? "forse" : ""}">${r.pasti
            ? `${r.pasti === 1 ? "1 pasto" : `${r.pasti} pasti`} · ${numero(r.b.mangiato)} kcal${r.aMeta ? " · registrato a metà?" : ""}`
            : "nessun pasto · digiuno?"}</small></span>
        <i class="interruttore" aria-hidden="true"></i>
      </button>`).join("")}
    </div>
    <button class="pillola terra larga" data-fatto>Fatto</button>`, {
    // chiudere il foglio vale come «Fatto»: si tengono le scelte che vedi
    onChiudi: () => R.impostaConte(Object.fromEntries(righe.map((r) => [r.g, r.si]))),
  });

  el.addEventListener("click", (e) => {
    const b = e.target.closest("[data-i]");
    if (b) { const r = righe[Number(b.dataset.i)]; r.si = !r.si; b.setAttribute("aria-checked", String(r.si)); }
    if (e.target.closest("[data-fatto]")) chiudi();
  });
}
