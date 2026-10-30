/* =========================================================
   provviste.js — le PROVVISTE DI DOMANI.

   Guarda i pasti della scheda per domani e chiede all'IA cosa
   conviene fare la sera prima: scongelare, cuocere, porzionare,
   preparare. La risposta resta salvata nel telefono finché la
   scheda di domani non cambia (così non si richiede ogni volta),
   insieme alle spunte delle cose già fatte.

   riquadroProvviste()  → il riquadro da mettere in Razioni e in Oggi
   apriProvviste()      → il foglio con l'elenco
   ========================================================= */

import * as P from "../logica/piano.js";
import { oggi, aggiungiGiorni } from "../logica/giorni.js";
import { chiediProvviste } from "../servizi/ia.js";
import { icona } from "../grafica/icone.js";
import { esc, foglio } from "../ui.js";

const CHIAVE = "annona.provviste";
const ICONE = { scongela: "fiocco", cuoci: "pentola", porziona: "bilancia", prepara: "anfora" };
const VERBI = { scongela: "Scongela", cuoci: "Cuoci", porziona: "Porziona", prepara: "Prepara" };
const NOMI_PASTO = { colazione: "colazione", pranzo: "pranzo", cena: "cena", spuntino: "spuntino" };

/** I pasti di domani nella scheda, e una "firma" che cambia se la scheda di domani cambia */
function domani() {
  const chiave = aggiungiGiorni(oggi(), 1);
  const g = P.giornoSettimana(chiave);
  const pasti = P.PASTI_ID
    .map((p) => ({ pasto: p, alimenti: P.vociDi(g, p).map((v) => ({ nome: v.nome, grammi: v.grammi })) }))
    .filter((p) => p.alimenti.length);
  return { chiave, g, pasti, firma: `${chiave}|${JSON.stringify(pasti)}` };
}

function leggiMemoria() {
  try { return JSON.parse(localStorage.getItem(CHIAVE)); } catch { return null; }
}
function scriviMemoria(m) {
  try { localStorage.setItem(CHIAVE, JSON.stringify(m)); } catch { /* pazienza */ }
}
/** La risposta salvata, solo se vale ancora per la scheda di domani */
function memoriaValida(d = domani()) {
  const m = leggiMemoria();
  return m?.firma === d.firma ? m : null;
}

/**
 * Per il fiocco ❄ in cima a Razioni: null se domani non c'è niente in scheda,
 * altrimenti quante cose restano da fare (undefined = non l'hai ancora chiesto al legionario).
 */
export function provvisteDaFare() {
  const d = domani();
  if (!d.pasti.length) return null;
  const m = memoriaValida(d);
  return m ? m.compiti.length - m.fatti.length : undefined;
}

/** Il riquadro (o "" se domani non c'è niente in scheda) */
export function riquadroProvviste() {
  const d = domani();
  if (!d.pasti.length) return "";
  const m = memoriaValida(d);
  const nome = P.NOMI_GIORNI[d.g - 1];
  let sotto;
  if (!m) sotto = `${nome} · tocca per sapere cosa preparare`;
  else if (!m.compiti.length) sotto = `${nome} · niente da preparare stasera`;
  else {
    const fatti = m.fatti.length;
    const prossimo = m.compiti.find((_, i) => !m.fatti.includes(i));
    sotto = !prossimo ? "Tutto pronto per domani"
      : fatti ? `${fatti} ${fatti === 1 ? "fatta" : "fatte"} su ${m.compiti.length} · ${VERBI[prossimo.tipo].toLowerCase()} ${P.nomeBreve(prossimo.alimento.split(",")[0]).toLowerCase()}`
      : `${nome} · ${m.compiti.length === 1 ? "1 cosa" : `${m.compiti.length} cose`} da fare stasera`;
  }
  return `
    <button class="provviste provviste-testa" data-azione="provviste">
      <span class="ic-tondo">${icona(m && m.compiti.length && m.fatti.length === m.compiti.length ? "spunta" : "fiocco")}</span>
      <span><strong>Provviste di domani</strong><small>${esc(sotto)}</small></span>
      ${icona("dx")}
    </button>`;
}

/** Il foglio con l'elenco delle cose da fare */
export function apriProvviste({ vai }) {
  const d = domani();
  const nome = P.NOMI_GIORNI[d.g - 1];
  const { el, chiudi } = foglio(`
    <div class="foglio-testa"><h2 class="titolo-romano">Provviste di domani</h2><button class="tondo" data-chiudi aria-label="Chiudi">${icona("chiudi")}</button></div>
    <div class="prov-corpo"></div>
    <button class="pillola larga" data-azione="scheda">${icona("rotolo")} Vedi la scheda di ${esc(nome.toLowerCase())}</button>`);
  const corpo = el.querySelector(".prov-corpo");
  let inCorso = false;

  const avvisaTutti = () => window.dispatchEvent(new CustomEvent("annona-dati"));

  function disegna(stato = "") {
    const m = memoriaValida(d);
    if (!d.pasti.length) {
      corpo.innerHTML = `<p class="sotto">Nella scheda di ${esc(nome.toLowerCase())} non c'è ancora nessun pasto.</p>`;
      return;
    }
    if (stato === "errore") {
      corpo.innerHTML = `<p class="errore">${esc(corpo.dataset.errore)}</p>
        <button class="pillola terra larga" data-azione="riprova">${icona("stelle")} Riprova</button>`;
      return;
    }
    if (stato === "attesa" || !m) {
      corpo.innerHTML = `<p class="sotto prov-attesa"><span class="rotella"></span> Il legionario controlla la dispensa…</p>`;
      return;
    }
    const pasti = d.pasti.map((p) => NOMI_PASTO[p.pasto]).join(", ");
    corpo.innerHTML = `
      <p class="sotto">${esc(nome)}: ${esc(pasti)} sono nella scheda. ${m.compiti.length ? "Ecco cosa conviene fare stasera." : ""}</p>
      ${m.compiti.length ? `
        <div class="provviste">
          ${m.compiti.map((c, i) => {
            const fatto = m.fatti.includes(i);
            return `
              <button class="compito ${fatto ? "fatto" : ""}" data-azione="spunta" data-i="${i}" aria-pressed="${fatto}">
                ${icona(ICONE[c.tipo] ?? "anfora")}
                <span class="compito-testo"><b>${VERBI[c.tipo] ?? "Prepara"}${c.pasto ? ` · ${NOMI_PASTO[c.pasto]}` : ""}</b>${esc(c.alimento)}<small>${esc(c.consiglio)}</small></span>
                <span class="spunta ${fatto ? "fatta" : ""}">${fatto ? icona("spunta") : ""}</span>
              </button>`;
          }).join("")}
        </div>` : `<div class="nota-avviso">${icona("spunta")}<span>Niente da preparare: domani si cucina tutto al momento.</span></div>`}
      <button class="piccolo centro prov-rifai" data-azione="rifai">${icona("stelle")} Consigli dell'IA dalla tua scheda · rifai la lista</button>`;
  }

  async function chiedi() {
    if (inCorso) return;
    inCorso = true;
    disegna("attesa");
    try {
      const compiti = await chiediProvviste(d.pasti);
      scriviMemoria({ firma: d.firma, compiti, fatti: [] });
      disegna();
      avvisaTutti();
    } catch (err) {
      corpo.dataset.errore = err.message;
      disegna("errore");
    } finally {
      inCorso = false;
    }
  }

  el.addEventListener("click", (e) => {
    const a = e.target.closest("[data-azione]")?.dataset.azione;
    if (a === "riprova" || a === "rifai") chiedi();
    if (a === "scheda") { chiudi(); vai(`#/razioni?g=${d.g}`); }
    if (a === "spunta") {
      const m = memoriaValida(d);
      const i = Number(e.target.closest("[data-i]").dataset.i);
      m.fatti = m.fatti.includes(i) ? m.fatti.filter((x) => x !== i) : [...m.fatti, i];
      scriviMemoria(m);
      disegna();
      avvisaTutti();
    }
  });

  disegna();
  if (d.pasti.length && !memoriaValida(d)) chiedi();
}
