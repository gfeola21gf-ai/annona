/* =========================================================
   invito.js — MANCA IL CODICE: hai un account (per esempio di
   Volantinaggio o Le mie routine) ma non sei ancora tra gli
   invitati di Annona. Si chiede una volta sola.

   #/invito?esito=sbagliato → mostra subito il messaggio
   ========================================================= */

import * as store from "../dati/store.js";
import { marchio } from "../grafica/icone.js";
import { legionario } from "../grafica/mascotte.js";
import { esc } from "../ui.js";
import { dopoAccesso } from "./accesso.js";

const MESSAGGI = {
  sbagliato: "Codice non valido: controllalo, oppure chiedine uno nuovo a chi ti ha invitato.",
  esaurito: "Questo codice è già stato usato da tutti: chiedine uno nuovo a chi ti ha invitato.",
  troppi: "Troppi tentativi: riprova tra un'ora.",
};
export const messaggioEsito = (esito) => MESSAGGI[esito] ?? "";

// Il codice arrivato col link dell'invito resta in memoria finché la scheda è aperta
export const ricordaCodice = (c) => { try { sessionStorage.setItem("annona.codice", c); } catch { /* pazienza */ } };
export const codiceRicordato = () => { try { return sessionStorage.getItem("annona.codice") ?? ""; } catch { return ""; } };

export async function mostra(el, parametri, { vai }) {
  const utente = await store.utenteAttuale();
  el.innerHTML = `
    <div class="accesso">
      <div class="accesso-testa">${marchio()}</div>
      <div class="accesso-mascotte">${legionario("saluta")}</div>
      <h1 class="titolo-romano">Manca il codice</h1>
      <p class="sotto">Sei entrato come <b>${esc(utente?.email ?? "")}</b>. Per usare Annona serve il codice invito che ti hanno mandato: te lo chiediamo una volta sola.</p>
      <form class="modulo" novalidate>
        <label class="campo"><span>Codice invito</span>
          <input type="text" name="codice" class="campo-codice" autocomplete="off" autocapitalize="characters" spellcheck="false"
            placeholder="ANNONA-…" value="${esc(codiceRicordato())}"></label>
        <p class="errore" ${parametri.esito ? "" : "hidden"}>${esc(messaggioEsito(parametri.esito))}</p>
        <button class="pillola terra larga" type="submit">Entra in Annona</button>
      </form>
      <button type="button" class="link-piccolo" data-azione="esci">Non sei tu? Esci</button>
    </div>`;

  const form = el.querySelector("form");
  const errore = el.querySelector(".errore");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const pulsante = form.querySelector("button");
    const codice = form.codice.value.trim();
    if (!codice) { errore.textContent = "Scrivi il codice invito."; errore.hidden = false; return; }
    pulsante.disabled = true;
    pulsante.textContent = "Controllo…";
    errore.hidden = true;
    try {
      const esito = await store.usaCodice(codice);
      if (esito === "ok" || esito === "gia") { ricordaCodice(""); return dopoAccesso(el, vai); }
      errore.textContent = messaggioEsito(esito) || "Qualcosa non va: riprova.";
    } catch (err) {
      errore.textContent = err.message;
    }
    errore.hidden = false;
    pulsante.disabled = false;
    pulsante.textContent = "Entra in Annona";
  });

  el.querySelector("[data-azione=esci]").addEventListener("click", async () => {
    await store.esci();
    vai("#/accesso");
  });
}
