/* =========================================================
   app.js — il REGISTA.
   Decide quale schermata mostrare in base all'indirizzo
   (la parte dopo "#") e disegna la barra in basso.

     #/            → Oggi (giuramento + bilancio)
     #/aggiungi    → aggiungi pasto o attività   (?pasto=pranzo&giorno=…&tipo=attivita, ?piano=4 → nella scheda)
     #/peso        → la bilancia
     #/razioni     → scheda settimanale (?g=4 apre il giovedì)
     #/importa     → importa la scheda da foto, PDF o testo
     #/io          → profilo
     #/benvenuto   → onboarding (?passo=…&modifica=1)
     #/accesso     → entra con email e password
   ========================================================= */

import * as store from "./dati/store.js";
import { installaIcone, icona } from "./grafica/icone.js";
import * as oggi from "./schermate/oggi.js";
import * as aggiungi from "./schermate/aggiungi.js";
import * as peso from "./schermate/peso.js";
import * as razioni from "./schermate/razioni.js";
import * as importa from "./schermate/importa.js";
import * as io from "./schermate/io.js";
import * as benvenuto from "./schermate/benvenuto.js";
import * as accesso from "./schermate/accesso.js";

const SCHERMATE = { "": oggi, aggiungi, peso, razioni, importa, io, benvenuto, accesso };
const CON_BARRA = ["", "razioni", "peso", "io"];

const app = document.getElementById("app");
let pulizia = null;          // funzione per "spegnere" la schermata precedente

installaIcone();

// Service worker: copia offline dei file dell'app
if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});

// Ogni cosa premibile si abbassa come un tasto (su iPhone :active non è affidabile)
document.addEventListener("pointerdown", (e) => {
  const el = e.target.closest("button, a, [data-azione], label.scelta");
  if (!el || el.disabled) return;
  el.classList.add("premuto");
  const rilascia = () => el.classList.remove("premuto");
  ["pointerup", "pointercancel", "pointerleave"].forEach((t) => el.addEventListener(t, rilascia, { once: true }));
  setTimeout(rilascia, 600);
}, { capture: true });

/** Legge l'indirizzo: "#/aggiungi?pasto=cena" → { nome: "aggiungi", parametri: {pasto: "cena"} } */
function percorso() {
  const [nome, query] = location.hash.replace(/^#\/?/, "").split("?");
  return { nome: nome || "", parametri: Object.fromEntries(new URLSearchParams(query)) };
}

export function vai(indirizzo, { sostituisci = false } = {}) {
  if (sostituisci) location.replace(indirizzo);
  else location.hash = indirizzo.replace(/^#/, "");
}

function barra(attiva) {
  const voce = (nome, ic, testo) =>
    `<a href="#/${nome}" class="${attiva === nome ? "attiva" : ""}">${icona(ic)}<span>${testo}</span></a>`;
  return `<nav class="barra">
    ${voce("", "casa", "Oggi")}
    ${voce("razioni", "rotolo", "Razioni")}
    <a href="#/aggiungi" class="piu" aria-label="Aggiungi">${icona("piu")}</a>
    ${voce("peso", "bilancia", "Peso")}
    ${voce("io", "elmo", "Io")}
  </nav>`;
}

/** Disegna la schermata giusta */
async function mostra() {
  const { nome, parametri } = percorso();
  const utente = await store.utenteAttuale();

  // Regole di passaggio: prima l'accesso, poi il giuramento, poi l'app
  if (!utente && nome !== "accesso") return vai("#/accesso", { sostituisci: true });
  if (utente && nome === "accesso") return vai("#/", { sostituisci: true });
  if (utente && !store.profilo()?.completato && nome !== "benvenuto") return vai("#/benvenuto", { sostituisci: true });

  const schermata = SCHERMATE[nome] ?? oggi;
  pulizia?.();
  pulizia = null;
  document.querySelectorAll(".foglio-sfondo").forEach((f) => f.remove());   // un foglio aperto non "segue" nella schermata nuova
  window.scrollTo(0, 0);
  app.className = `schermata-${nome || "oggi"}`;
  app.innerHTML = `<div class="contenuto"></div>${CON_BARRA.includes(nome) ? barra(nome) : ""}`;
  pulizia = schermata.mostra(app.querySelector(".contenuto"), parametri, { vai }) ?? null;
}

window.addEventListener("hashchange", mostra);

/* ---------- Avvio ---------- */
(async () => {
  const utente = await store.utenteAttuale();
  if (utente && !store.profilo()) {
    // Primo avvio su questo telefono: proviamo a recuperare il profilo da Supabase
    app.innerHTML = `<p class="caricamento">Apro i granai…</p>`;
    await Promise.race([store.sincronizza(), new Promise((r) => setTimeout(r, 5000))]);
  } else if (utente) {
    store.sincronizza();       // in sottofondo: l'app intanto parte con i dati del telefono
  }
  mostra();
})();

// Quando riapri l'app dopo un po', riallinea i dati
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") store.sincronizza();
});
