/* =========================================================
   aiuto.js — l'AIUTO dentro l'app (scelte dell'utente, 2026-10-30,
   anteprime anteprima/aiuto.html e anteprima/aiuto-domande.html).

   - puntoAiuto(id): il «?» (stile A · Pastiglia) accanto alle cose
     difficili. Toccandolo si apre il foglio dell'aiuto (apriAiuto).
   - Fumetti «una volta sola»: compaiono la prima volta che si
     incontra una funzione nascosta, poi mai più («Ho capito»).
     Al massimo UNO per schermata. Io → Aiuto → «Rivedi i suggerimenti».
   I testi stanno in dati/aiuto.js.
   ========================================================= */

import { foglio } from "../ui.js";
import { icona } from "../grafica/icone.js";
import { FOGLI, DOMANDE, FUMETTI, GESTI } from "../dati/aiuto.js";

/** Il «?»: uno span (può stare anche dentro un pulsante, come la riga Movimento di Io) */
export const puntoAiuto = (id) =>
  `<span class="punto-aiuto" role="button" tabindex="0" data-aiuto="${id}" aria-label="Spiegazione: ${FOGLI[id].titolo.toLowerCase()}">?</span>`;

const trova = (id) => DOMANDE.find((d) => d.id === id);

/** Una domanda che si apre e si chiude (nei fogli e nella pagina Domande e consigli) */
export const domandaHtml = (q, aperta = false) => `
  <div class="aiuto-domanda ${aperta ? "aperta" : ""}">
    <button type="button" class="ad-q" aria-expanded="${aperta}">${q.d}</button>
    <div class="ad-r"><p>${q.r}</p>${q.c ? `<p class="ad-consiglio">💡 ${q.c}</p>` : ""}</div>
  </div>`;

/** Il pulsante «Chiedi al legionario» (in fondo a fogli e pagine) */
export const tastoLegionario = (testo = "Chiedi al legionario") =>
  `<a class="pillola chiara larga" href="#/legionario">${icona("stelle")}${testo}</a>`;

/** Il foglio di un «?»: una frase · 3 passi · una domanda aperta e una da toccare · il legionario */
export function apriAiuto(id) {
  const f = FOGLI[id];
  if (!f) return;
  const [aperta, chiusa] = f.domande.map(trova);
  foglio(`
    <div class="foglio-testa"><h2 class="titolo-romano">${f.titolo}</h2>
      <button class="tondo" data-chiudi aria-label="Chiudi">${icona("chiudi")}</button></div>
    <div class="aiuto-foglio">
      <p class="aiuto-frase">${f.frase}</p>
      <h3 class="sopra">${f.sopra}</h3>
      <ol class="aiuto-passi">${f.passi.map((p) => `<li><span>${p}</span></li>`).join("")}</ol>
      <h3 class="sopra">Domande frequenti</h3>
      ${domandaHtml(aperta, true)}
      ${chiusa ? domandaHtml(chiusa) : ""}
      <a class="aiuto-link" href="#/domande?tema=${f.tema}">Tutte le domande e i consigli ›</a>
      ${tastoLegionario()}
    </div>`);
}

/** «Mostrami»: i gesti spiegati semplici */
export function apriGesti() {
  foglio(`
    <div class="foglio-testa"><h2 class="titolo-romano">I gesti</h2>
      <button class="tondo" data-chiudi aria-label="Chiudi">${icona("chiudi")}</button></div>
    <div class="aiuto-foglio">
      <p class="aiuto-frase">Come sull'iPhone: <b>scorri</b> e <b>tieni premuto</b>.</p>
      <ul class="aiuto-gesti">${GESTI.map(([s, a, b]) => `<li><span>${s}</span><p>${a}:<br>${b}</p></li>`).join("")}</ul>
      <a class="pillola terra larga" href="#/" data-chiudi>Prova in Oggi</a>
    </div>`);
}

/* ---------- Fumetti «una volta sola» ---------- */
const VISTI = "annona.fumetti";
const visti = () => { try { return JSON.parse(localStorage.getItem(VISTI)) ?? []; } catch { return []; } };
export const fumettoVisto = (id) => visti().includes(id);
function segnaVisto(id) {
  try {
    localStorage.setItem(VISTI, JSON.stringify([...new Set([...visti(), id])]));
    if (id === "scorri") localStorage.setItem("annona.scorriVisto", "1");    // il suggerimento di prima (oggi.js)
  } catch { /* pazienza */ }
}
/** Il primo fumetto non ancora visto fra quelli possibili qui (false/null = non adatto ora) */
export const primoFumetto = (...ids) => ids.find((id) => id && !fumettoVisto(id)) ?? null;
/** Fa ricomparire tutti i fumetti (Io → Aiuto) */
export function rivediFumetti() {
  try { localStorage.removeItem(VISTI); localStorage.removeItem("annona.scorriVisto"); } catch { /* pazienza */ }
}

/**
 * Il fumetto (HTML). punta = dove sta la punta: "giu" (la cosa è sotto),
 * "su" (sopra, a sinistra) o "su-destra".
 */
export const fumetto = (id, punta = "giu") => `
  <div class="fumetto punta-${punta}" data-fumetto="${id}" role="note">
    <p>${FUMETTI[id]}</p><button type="button" data-fumetto-ok>Ho capito</button>
  </div>`;

/** Una volta sola, all'avvio: «?» e «Ho capito» funzionano in tutte le schermate */
export function installaAiuto() {
  const apri = (e) => {
    const p = e.target.closest?.("[data-aiuto]");
    if (!p) return false;
    e.preventDefault();
    e.stopPropagation();          // il riquadro sotto (es. il Bilancio) non deve aprirsi
    apriAiuto(p.dataset.aiuto);
    return true;
  };
  document.addEventListener("click", apri, { capture: true });
  document.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") apri(e); }, { capture: true });

  document.addEventListener("click", (e) => {
    const ok = e.target.closest("[data-fumetto-ok]");
    if (ok) {
      const f = ok.closest("[data-fumetto]");
      segnaVisto(f.dataset.fumetto);
      f.classList.add("via");
      setTimeout(() => f.remove(), 220);
      return;
    }
    const q = e.target.closest(".ad-q");
    if (q) {
      const d = q.closest(".aiuto-domanda");
      d.classList.toggle("aperta");
      q.setAttribute("aria-expanded", d.classList.contains("aperta"));
    }
  });
}
