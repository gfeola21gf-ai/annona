/* =========================================================
   accesso.js — ENTRA con email e password
   (lo stesso account di "Le mie routine").
   ========================================================= */

import * as store from "../dati/store.js";
import { marchio } from "../grafica/icone.js";
import { legionario } from "../grafica/mascotte.js";
import { esc } from "../ui.js";

export function mostra(el, _p, { vai }) {
  el.innerHTML = `
    <div class="accesso">
      <div class="accesso-testa">${marchio()}</div>
      <div class="accesso-mascotte">${legionario("saluta")}</div>
      <h1 class="titolo-romano">Ave!</h1>
      <p class="sotto">Entra con il tuo account (lo stesso di <i>Le mie routine</i>).</p>
      <form class="modulo" novalidate>
        <label class="campo"><span>Email</span>
          <input type="email" name="email" autocomplete="username" inputmode="email" required></label>
        <label class="campo"><span>Password</span>
          <input type="password" name="password" autocomplete="current-password" required></label>
        <p class="errore" hidden></p>
        <button class="pillola terra larga" type="submit">Entra</button>
      </form>
    </div>`;

  const form = el.querySelector("form");
  const errore = el.querySelector(".errore");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const pulsante = form.querySelector("button");
    pulsante.disabled = true;
    pulsante.textContent = "Entro…";
    errore.hidden = true;
    try {
      await store.accedi(form.email.value.trim(), form.password.value);
      el.innerHTML = `<p class="caricamento">Apro i granai…</p>`;
      await store.sincronizza();
      vai(store.profilo()?.completato ? "#/" : "#/benvenuto");
    } catch (err) {
      errore.innerHTML = esc(err.message);
      errore.hidden = false;
      pulsante.disabled = false;
      pulsante.textContent = "Entra";
    }
  });
}
