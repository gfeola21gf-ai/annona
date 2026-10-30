/* =========================================================
   accesso.js — ENTRA con email e password, oppure CREA L'ACCOUNT
   con il codice invito (supabase/inviti.sql).

   Il link dell'invito porta già il codice: #/accesso?codice=ANNONA-K7P3QX
   → si apre «Crea account» con il codice scritto.
   ========================================================= */

import * as store from "../dati/store.js";
import { marchio, icona } from "../grafica/icone.js";
import { legionario } from "../grafica/mascotte.js";
import { esc, foglio } from "../ui.js";
import { ricordaCodice, codiceRicordato } from "./invito.js";

/** Dopo l'accesso: codice mancante → #/invito, profilo da fare → benvenuto, altrimenti Oggi */
export async function dopoAccesso(el, vai) {
  el.innerHTML = `<p class="caricamento">Apro i granai…</p>`;
  const inv = await store.controllaInvito();
  if (inv?.no) return vai("#/invito");
  await store.sincronizza();
  vai(store.profilo()?.completato ? "#/" : "#/benvenuto");
}

/** «Password dimenticata?»: le mail di recupero non arrivano agli amici (piano gratuito di Supabase) */
function apriDimenticata() {
  foglio(`
    <div class="foglio-testa"><h2 class="titolo-romano">Password dimenticata</h2><button class="tondo" data-chiudi aria-label="Chiudi">${icona("chiudi")}</button></div>
    <p>Nessun problema: scrivi a <b>chi ti ha invitato</b>. Ti manderà una <b>password temporanea</b>.</p>
    <p class="sotto">Entra con quella, poi scegline una tua in <b>Io → Account → Cambia password</b>.</p>
    <button class="pillola larga" data-chiudi>Ho capito</button>`);
}

export function mostra(el, parametri, { vai }) {
  if (parametri.codice) ricordaCodice(parametri.codice);
  let modo = codiceRicordato() ? "crea" : "entra";

  function disegna(messaggio = "", email = "") {
    const crea = modo === "crea";
    el.innerHTML = `
      <div class="accesso ${crea ? "compatto" : ""}">
        <div class="accesso-testa">${marchio()}</div>
        <div class="accesso-mascotte">${legionario("saluta")}</div>
        <h1 class="titolo-romano">Ave!</h1>
        <p class="sotto">${crea ? "Crea il tuo account con il codice invito che hai ricevuto." : "Entra con il tuo account."}</p>
        <div class="segmenti" role="tablist">
          <button type="button" role="tab" data-modo="entra" aria-selected="${!crea}">Entra</button>
          <button type="button" role="tab" data-modo="crea" aria-selected="${crea}">Crea account</button>
        </div>
        <form class="modulo" novalidate>
          <label class="campo"><span>Email</span>
            <input type="email" name="email" autocomplete="username" inputmode="email" autocapitalize="off" required value="${esc(email)}"></label>
          <label class="campo"><span>Password${crea ? " (almeno 6 caratteri)" : ""}</span>
            <input type="password" name="password" autocomplete="${crea ? "new-password" : "current-password"}" required></label>
          ${crea ? `
          <label class="campo"><span>Codice invito</span>
            <input type="text" name="codice" class="campo-codice" autocomplete="off" autocapitalize="characters" spellcheck="false"
              placeholder="ANNONA-…" value="${esc(codiceRicordato())}"></label>` : ""}
          <p class="errore" ${messaggio ? "" : "hidden"}>${esc(messaggio)}</p>
          <button class="pillola terra larga" type="submit">${crea ? "Crea account" : "Entra"}</button>
        </form>
        ${crea
          ? `<p class="nota-avviso">${icona("scudo")}<span>Usi già <i>Volantinaggio</i> o <i>Le mie routine</i>? Scegli <b>Entra</b> con lo stesso account: il codice te lo chiediamo subito dopo.</span></p>`
          : `<button type="button" class="link-piccolo" data-azione="dimenticata">Password dimenticata?</button>`}
      </div>`;
  }

  el.addEventListener("click", (e) => {
    const m = e.target.closest("[data-modo]")?.dataset.modo;
    if (m && m !== modo) { const email = el.querySelector("[name=email]").value; modo = m; disegna("", email); }
    if (e.target.closest("[data-azione=dimenticata]")) apriDimenticata();
  });

  el.addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.target;
    const pulsante = form.querySelector("button[type=submit]");
    const errore = form.querySelector(".errore");
    const email = form.email.value.trim();
    const password = form.password.value;
    const codice = form.codice?.value.trim() ?? "";
    const sbaglio = (testo) => { errore.textContent = testo; errore.hidden = false; pulsante.disabled = false; pulsante.textContent = modo === "crea" ? "Crea account" : "Entra"; };

    if (!email || !password) return sbaglio("Scrivi email e password.");
    if (modo === "crea" && !codice) return sbaglio("Manca il codice invito.");
    pulsante.disabled = true;
    pulsante.textContent = modo === "crea" ? "Creo l'account…" : "Entro…";
    errore.hidden = true;
    try {
      if (modo === "entra") {
        await store.accedi(email, password);
        return dopoAccesso(el, vai);
      }
      ricordaCodice(codice);
      await store.registrati(email, password);
      const esito = await store.usaCodice(codice);
      if (esito === "ok" || esito === "gia") { ricordaCodice(""); return dopoAccesso(el, vai); }
      vai(`#/invito?esito=${esito}`);          // l'account c'è già: manca solo un codice valido
    } catch (err) {
      if (/già un account/.test(err.message)) { modo = "entra"; disegna(err.message, email); return; }
      sbaglio(err.message);
    }
  });

  disegna();
}
