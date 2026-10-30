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
     #/accesso     → entra con email e password, o crea l'account col codice invito (?codice=…)
     #/invito      → hai un account ma manca il codice invito (si chiede una volta)
     #/aiuto       → Cosa sa fare Annona      #/domande → Domande e consigli (?tema=…)
     #/legionario  → Chiedi al legionario (IA)
   ========================================================= */

import { aggiornaRegole, novitaDaVedere } from "./logica/regole.js";
import { apriNovita } from "./schermate/novita.js";
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
import * as invito from "./schermate/invito.js";
import * as guida from "./schermate/guida.js";
import { installaAiuto } from "./schermate/aiuto.js";
import { controllaBentornato } from "./schermate/bentornato.js";
import { apriMovimento } from "./schermate/movimento.js";
import { oggi as oggiChiave } from "./logica/giorni.js";
import { bloccaSfondo } from "./ui.js";

const SCHERMATE = { "": oggi, aggiungi, peso, razioni, importa, io, benvenuto, accesso, invito,
  aiuto: guida.cosa, domande: guida.domande, legionario: guida.legionario };
const CON_BARRA = ["", "razioni", "peso", "io"];

const app = document.getElementById("app");
let pulizia = null;          // funzione per "spegnere" la schermata precedente

installaIcone();
installaAiuto();          // i «?», i fumetti e le domande che si aprono, in tutte le schermate

// Errori imprevisti: li annotiamo (Io → Inviti e amici → Salute dell'app). «Script error.» = errori di altri siti, senza dettagli
window.addEventListener("error", (e) => {
  if (!e.message || /^Script error|ResizeObserver/.test(e.message)) return;
  store.segnalaErrore(e.message, `${location.hash || "#/"} · ${String(e.filename).split("/").pop()}:${e.lineno}`);
});
window.addEventListener("unhandledrejection", (e) => store.segnalaErrore(e.reason?.message ?? String(e.reason), location.hash || "#/"));

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
  // «B2 · isola che galleggia» (scelta dell'utente 2026-10-29): le 4 schede in una pillola, il + tondo accanto
  return `<nav class="barra">
    <div class="isola">
      ${voce("", "casa", "Oggi")}
      ${voce("razioni", "rotolo", "Razioni")}
      ${voce("peso", "bilancia", "Peso")}
      ${voce("io", "elmo", "Io")}
    </div>
    <a href="#/aggiungi" class="piu" aria-label="Aggiungi">${icona("piu")}</a>
  </nav>`;
}

/** Disegna la schermata giusta */
async function mostra() {
  const { nome, parametri } = percorso();
  const utente = await store.utenteAttuale();

  // Regole di passaggio: prima l'accesso, poi il codice invito, poi il giuramento, poi l'app
  if (parametri.codice) invito.ricordaCodice(parametri.codice);     // link dell'invito aperto con un account già attivo
  if (!utente && nome !== "accesso") return vai("#/accesso", { sostituisci: true });
  if (utente && nome === "accesso") return vai("#/", { sostituisci: true });
  const senzaCodice = Boolean(utente && store.invito()?.no);
  if (senzaCodice && nome !== "invito") return vai("#/invito", { sostituisci: true });
  if (utente && !senzaCodice && nome === "invito") return vai("#/", { sostituisci: true });
  if (utente && !senzaCodice && !store.profilo()?.completato && nome !== "benvenuto") return vai("#/benvenuto", { sostituisci: true });

  const schermata = SCHERMATE[nome] ?? oggi;
  pulizia?.();
  pulizia = null;
  document.querySelectorAll(".foglio-sfondo").forEach((f) => f.remove());   // un foglio aperto non "segue" nella schermata nuova
  bloccaSfondo();
  app.scrollTo(0, 0);       // si scorre dentro #app, non la pagina: così la barra in basso resta ferma
  app.className = `schermata-${nome || "oggi"}`;
  app.innerHTML = `<div class="contenuto"></div>${CON_BARRA.includes(nome) ? barra(nome) : ""}`;
  pulizia = schermata.mostra(app.querySelector(".contenuto"), parametri, { vai }) ?? null;
}

window.addEventListener("hashchange", mostra);

/** «Bentornato»: dopo qualche giorno di assenza chiede quali giorni contare (solo dentro l'app, non in accesso/benvenuto) */
async function bentornato(sincronia) {
  await Promise.race([sincronia, new Promise((r) => setTimeout(r, 4000))]);     // prima i dati aggiornati, se arrivano in fretta
  const { nome } = percorso();
  if (!(await store.utenteAttuale()) || !store.profilo()?.completato || store.invito()?.no || ["accesso", "benvenuto", "invito"].includes(nome)) return;
  // i profili vecchi passano alle regole di oggi (logica/regole.js), poi UNA volta la schermata «Novità»
  if (aggiornaRegole()) mostra();
  if (novitaDaVedere() && !document.querySelector(".novita-schermo")) return apriNovita({ onFine: () => mostra() });
  if (chiediMovimento()) return;
  controllaBentornato();
}

/**
 * Chi ha fatto il benvenuto prima del passo «Quanto ti muovi?» (2026-10-26) non ha il movimento:
 * il fabbisogno resta il solo basale e le razioni escono troppo basse. Lo chiediamo, al massimo una volta al giorno.
 */
function chiediMovimento() {
  if ((store.profilo()?.movimento ?? []).length || document.querySelector(".foglio-sfondo")) return false;
  try {
    if (localStorage.getItem("annona.chiestoMovimento") === oggiChiave()) return false;
    localStorage.setItem("annona.chiestoMovimento", oggiChiave());
  } catch { /* pazienza */ }
  apriMovimento({
    motivo: "Manca un dato importante: quanto ti muovi in una giornata normale. Senza, Annona conta solo il basale e ti fa mangiare troppo poco.",
    onSalvato: () => mostra(),
  });
  return true;
}

/* ---------- Avvio ---------- */
(async () => {
  const utente = await store.utenteAttuale();
  let sincronia = Promise.resolve();
  // Il codice invito: la prima volta aspettiamo la risposta; poi la ricontrolliamo in sottofondo
  if (utente && !store.invito()) {
    app.innerHTML = `<p class="caricamento">Apro i granai…</p>`;
    await Promise.race([store.controllaInvito(), new Promise((r) => setTimeout(r, 5000))]);
  } else if (utente) {
    store.controllaInvito().then((inv) => { if (inv?.no) mostra(); });
  }
  if (store.invito()?.no) return mostra();
  if (utente && !store.profilo()) {
    // Primo avvio su questo telefono: proviamo a recuperare il profilo da Supabase
    app.innerHTML = `<p class="caricamento">Apro i granai…</p>`;
    await Promise.race([store.sincronizza(), new Promise((r) => setTimeout(r, 5000))]);
  } else if (utente) {
    sincronia = store.sincronizza();       // in sottofondo: l'app intanto parte con i dati del telefono
  }
  mostra();
  bentornato(sincronia);
})();

// Quando riapri l'app dopo un po', riallinea i dati (e, se sono passati giorni, chiedi quali contare)
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") bentornato(store.sincronizza());
});

// Sul PC la pagina resta "visibile" per ore (cambiare finestra non conta): senza questo non
// vedrebbe mai le modifiche fatte dal telefono, e al primo salvataggio del profilo le cancellerebbe.
// Quindi riallineiamo anche quando la finestra torna in primo piano e ogni minuto mentre è aperta.
let ultimaSincronia = Date.now();
const riallinea = () => {
  if (document.visibilityState !== "visible" || Date.now() - ultimaSincronia < 20000) return;
  ultimaSincronia = Date.now();
  store.sincronizza();
};
window.addEventListener("focus", riallinea);
setInterval(riallinea, 60000);
