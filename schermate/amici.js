/* =========================================================
   amici.js — Annona TRA AMICI (fogli aperti da Io):
     apriSuggerimento()      «Scrivi un suggerimento» (tutti)
     apriCambiaPassword()    Account → Cambia password (tutti)
     apriInviti()            codice invito + amici iscritti (solo admin)
     apriSuggerimentiRicevuti()                            (solo admin)
   Le regole stanno su Supabase: supabase/inviti.sql e suggerimenti.sql.
   ========================================================= */

import * as store from "../dati/store.js";
import { icona } from "../grafica/icone.js";
import { oggi } from "../logica/giorni.js";
import { esc, avviso, foglio, adattaAltezza } from "../ui.js";

const sb = store.supabase;
const INDIRIZZO = "https://gfeola21gf-ai.github.io/annona/";
const MESI = ["gen", "feb", "mar", "apr", "mag", "giu", "lug", "ago", "set", "ott", "nov", "dic"];
const data = (iso) => { const d = new Date(iso); return `${d.getDate()} ${MESI[d.getMonth()]}`; };
const testa = (titolo) => `<div class="foglio-testa"><h2 class="titolo-romano">${titolo}</h2><button class="tondo" data-chiudi aria-label="Chiudi">${icona("chiudi")}</button></div>`;

/** Apre WhatsApp con il testo già scritto (scegli tu a chi mandarlo) */
const whatsapp = (testo) => window.open(`https://wa.me/?text=${encodeURIComponent(testo)}`, "_blank");

async function copia(testo) {
  try { await navigator.clipboard.writeText(testo); avviso("Copiato: incollalo dove vuoi ✓"); }
  catch { avviso("Non riesco a copiare: usa il pulsante WhatsApp.", "errore"); }
}

/* ---------- Scrivi un suggerimento ---------- */
export function apriSuggerimento() {
  const { el, chiudi } = foglio(`
    ${testa("Un suggerimento")}
    <p class="sotto">Cosa miglioreresti? Cosa non funziona o non si capisce? Scrivi liberamente: lo legge chi ti ha invitato.</p>
    <textarea class="area-suggerimento" rows="3" maxlength="2000" placeholder="Es. non ho capito come si cambia la quantità…"></textarea>
    <button class="pillola terra larga" data-azione="invia">Invia</button>`);
  const area = el.querySelector("textarea");
  area.addEventListener("input", () => adattaAltezza(area));
  el.querySelector("[data-azione=invia]").addEventListener("click", async (e) => {
    const testo = area.value.trim();
    if (!testo) return avviso("Scrivi prima il suggerimento.");
    if (store.soloLocale()) return avviso("In modalità prova non si inviano suggerimenti.");
    e.target.disabled = true;
    const { error } = await sb.from("annona_suggerimenti").insert({ testo });
    if (error) { e.target.disabled = false; return avviso("Non riesco a inviarlo: controlla internet e riprova.", "errore"); }
    chiudi();
    avviso("Grazie! Suggerimento inviato ✓");
  });
  setTimeout(() => area.focus(), 300);
}

/* ---------- Cambia password ---------- */
export function apriCambiaPassword() {
  const { el, chiudi } = foglio(`
    ${testa("Cambia password")}
    <form class="modulo" novalidate>
      <label class="campo"><span>Nuova password (almeno 6 caratteri)</span>
        <input type="password" name="uno" autocomplete="new-password"></label>
      <label class="campo"><span>Ripetila</span>
        <input type="password" name="due" autocomplete="new-password"></label>
      <p class="errore" hidden></p>
      <button class="pillola terra larga" type="submit">Salva la password</button>
    </form>
    <p class="piccolo centro">${icona("scudo")} Vale anche per le altre app con lo stesso account.</p>`);
  const form = el.querySelector("form");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const errore = form.querySelector(".errore");
    const sbaglio = (t) => { errore.textContent = t; errore.hidden = false; };
    if (form.uno.value.length < 6) return sbaglio("Servono almeno 6 caratteri.");
    if (form.uno.value !== form.due.value) return sbaglio("Le due password non sono uguali.");
    try {
      await store.cambiaPassword(form.uno.value);
      chiudi();
      avviso("Password cambiata ✓");
    } catch (err) { sbaglio(err.message); }
  });
}

/* ---------- Inviti e amici (admin) ---------- */
function messaggioInvito(codice) {
  return `Ciao! Ti invito a provare *Annona*, la mia app per la dieta 🏛️

1. Apri questo link con *Safari*: ${INDIRIZZO}#/accesso?codice=${codice}
2. Tocca *Crea account* e scegli email e password: il codice invito (${codice}) è già inserito
3. Per averla come un'app: tocca *Condividi* (il quadrato con la freccia) → *Aggiungi alla schermata Home*

Se usi già Volantinaggio, scegli *Entra* con lo stesso account: il codice te lo chiede subito dopo.

💬 È una versione di prova e il tuo parere mi serve tantissimo: per qualunque idea, dubbio o cosa che non funziona usa *Scrivi un suggerimento* nella sezione *Io*. Arriva direttamente a me!`;
}

export function apriInviti() {
  const { el } = foglio(`${testa("Inviti e amici")}<div class="inviti"><p class="sotto">Carico…</p></div>`);
  const corpo = el.querySelector(".inviti");
  let codice = null;
  let amici = [];
  let salute = null;

  async function carica() {
    const settimana = new Date(Date.now() - 7 * 86400000).toISOString();
    const [inv, chi, uso, mis, err] = await Promise.all([
      sb.from("annona_inviti").select("*").order("creato_il", { ascending: false }),
      sb.from("annona_invitati").select("*").eq("ruolo", "amico").order("iscritto_il"),
      sb.from("annona_uso").select("user_id, richieste").eq("giorno", oggi()),
      sb.from("annona_misure").select("azione, ms, esito").gte("quando", settimana).limit(5000),
      sb.from("annona_errori").select("messaggio, dove, quando").gte("quando", settimana).order("quando", { ascending: false }).limit(50),
    ]);
    if (inv.error || chi.error || uso.error) { corpo.innerHTML = `<p class="errore">Non riesco a caricare: controlla internet.</p>`; return; }
    codice = inv.data.find((c) => c.attivo && c.usi < c.massimo) ?? null;
    const oggiPer = Object.fromEntries(uso.data.map((u) => [u.user_id, u.richieste]));
    amici = chi.data.map((a) => ({ ...a, oggi: oggiPer[a.user_id] ?? 0 }));
    salute = riassuntoSalute(mis.data ?? [], err.data ?? []);
    disegna();
  }

  function disegna() {
    corpo.innerHTML = `
      <h2 class="sopra">Codice invito</h2>
      ${codice ? `
        <div class="codice-invito">
          <b>${esc(codice.codice)}</b>
          <small>Usato ${codice.usi} ${codice.usi === 1 ? "volta" : "volte"} su ${codice.massimo}</small>
        </div>
        <button class="pillola terra larga" data-azione="whatsapp">Invia l'invito su WhatsApp</button>
        <div class="tasti-invito">
          <button class="pillola chiara" data-azione="copia">${icona("copia")} Copia</button>
          <button class="pillola chiara" data-azione="spegni">Spegni codice</button>
        </div>
        <p class="piccolo">Il messaggio contiene il link con il codice già inserito e ricorda il pulsante dei suggerimenti.</p>` : `
        <p class="sotto">Nessun codice attivo. Ne crei uno valido per 10 persone?</p>
        <button class="pillola terra larga" data-azione="nuovo">Crea un codice</button>`}

      <h2 class="sopra">Amici (${amici.length})</h2>
      ${amici.length ? `<div class="gruppo">${amici.map((a) => `
        <div class="riga-profilo riga-amico ${a.attivo ? "" : "sospeso"}" data-id="${a.user_id}">
          <span><strong>${esc(a.email ?? "—")}</strong>
            <small>dal ${data(a.iscritto_il)} · IA oggi ${a.oggi}${a.attivo ? "" : " · sospeso"}</small></span>
          <button class="tasto-amico" data-azione="password">Password</button>
          <button class="tasto-amico" data-azione="sospendi">${a.attivo ? "Sospendi" : "Riattiva"}</button>
        </div>`).join("")}</div>` : `<p class="sotto">Ancora nessuno: manda il codice!</p>`}
      <p class="piccolo">${icona("scudo")} Ogni amico può chiedere all'IA fino a 60 stime al giorno.</p>
      ${salute ? `
      <h2 class="sopra">Salute dell'app · 7 giorni</h2>
      <div class="gruppo">
        <div class="riga-profilo fissa"><span><small>Stime con l'IA (tutti, tu compreso)</small><strong>${salute.ia}</strong></span></div>
        <div class="riga-profilo fissa"><span><small>Errori imprevisti dell'app</small><strong>${salute.errori}</strong></span></div>
      </div>` : ""}`;
  }

  corpo.addEventListener("click", async (e) => {
    const b = e.target.closest("[data-azione]");
    if (!b) return;
    const azione = b.dataset.azione;
    const amico = amici.find((a) => a.user_id === b.closest("[data-id]")?.dataset.id);
    if (azione === "whatsapp") whatsapp(messaggioInvito(codice.codice));
    if (azione === "copia") copia(messaggioInvito(codice.codice));
    if (azione === "nuovo" || (azione === "spegni" && confirm(`Spegnere ${codice.codice}? Chi non l'ha ancora usato non potrà più entrare con questo codice.`))) {
      b.disabled = true;
      const r = azione === "nuovo"
        ? await sb.rpc("annona_nuovo_codice", { p_massimo: 10 })
        : await sb.rpc("annona_attiva_codice", { p_codice: codice.codice, p_attivo: false });
      if (r.error) avviso("Non ci riesco: controlla internet.", "errore");
      carica();
    }
    if (azione === "sospendi") {
      if (amico.attivo && !confirm(`Sospendere ${amico.email}? Non potrà più usare l'IA (i suoi dati restano). Puoi riattivarlo quando vuoi.`)) return;
      const { error } = await sb.rpc("annona_attiva_amico", { p_user: amico.user_id, p_attivo: !amico.attivo });
      if (error) avviso("Non ci riesco: controlla internet.", "errore");
      carica();
    }
    if (azione === "password") {
      if (!confirm(`Creare una password temporanea per ${amico.email}? Quella di prima smette di funzionare.`)) return;
      const { data: pw, error } = await sb.rpc("annona_nuova_password", { p_user: amico.user_id });
      if (error) return avviso("Non ci riesco: controlla internet.", "errore");
      mostraPassword(amico.email, pw);
    }
  });

  carica();
}

function mostraPassword(email, pw) {
  const testo = `Ecco la tua password temporanea di Annona: ${pw}

Entra con la tua email (${email}) e questa password, poi scegline una tua in *Io → Account → Cambia password*.`;
  const { el } = foglio(`
    ${testa("Password temporanea")}
    <p class="sotto">Per <b>${esc(email)}</b>:</p>
    <div class="codice-invito"><b>${esc(pw)}</b></div>
    <button class="pillola terra larga" data-azione="whatsapp">Mandala su WhatsApp</button>
    <button class="pillola chiara larga" data-azione="copia">${icona("copia")} Copia il messaggio</button>`);
  el.addEventListener("click", (e) => {
    const a = e.target.closest("[data-azione]")?.dataset.azione;
    if (a === "whatsapp") whatsapp(testo);
    if (a === "copia") copia(testo);
  });
}

/** «42 · metà entro 6 s · 3 non riuscite» e «Nessuno ✓» oppure «2 · l'ultimo: …» */
function riassuntoSalute(misure, errori) {
  const stime = misure.filter((m) => m.azione !== "cerca" && m.esito !== "dati");
  const riuscite = stime.filter((m) => m.esito === "ok").map((m) => m.ms).sort((a, b) => a - b);
  const fallite = stime.filter((m) => m.esito === "errore").length;
  const secondi = (ms) => (ms / 1000).toFixed(ms < 10000 ? 1 : 0).replace(".", ",");
  const ia = !stime.length ? "Ancora nessuna"
    : `${stime.length} · ${riuscite.length ? `metà entro ${secondi(riuscite[Math.floor(riuscite.length / 2)])} s` : "nessuna riuscita"}` +
      (fallite ? ` · ${fallite} non riuscit${fallite === 1 ? "a" : "e"}` : " · tutte riuscite ✓");
  const e = errori[0];
  return { ia, errori: !errori.length ? "Nessuno ✓" : `${errori.length} · l'ultimo: ${esc(e.messaggio.slice(0, 80))} (${esc(e.dove ?? "")}, ${data(e.quando)})` };
}

/* ---------- Suggerimenti ricevuti (admin) ---------- */
export async function quantiDaLeggere() {
  const { count } = await sb.from("annona_suggerimenti").select("id", { count: "exact", head: true }).eq("letto", false);
  return count ?? 0;
}

export function apriSuggerimentiRicevuti({ onLetti } = {}) {
  const { el } = foglio(`${testa("Suggerimenti")}<div class="suggerimenti"><p class="sotto">Carico…</p></div>`);
  const corpo = el.querySelector(".suggerimenti");
  (async () => {
    const [sug, chi] = await Promise.all([
      sb.from("annona_suggerimenti").select("*").order("creato_il", { ascending: false }).limit(100),
      sb.from("annona_invitati").select("user_id, email"),
    ]);
    if (sug.error || chi.error) { corpo.innerHTML = `<p class="errore">Non riesco a caricare: controlla internet.</p>`; return; }
    const email = Object.fromEntries(chi.data.map((c) => [c.user_id, c.email]));
    corpo.innerHTML = sug.data.length ? sug.data.map((s) => `
      <div class="suggerimento ${s.letto ? "" : "nuovo"}">
        <small>${esc(email[s.user_id] ?? "—")} · ${data(s.creato_il)}${s.letto ? "" : ` · <span class="etichetta">nuovo</span>`}</small>
        <p>${esc(s.testo)}</p>
      </div>`).join("") : `<p class="sotto">Ancora nessun suggerimento.</p>`;
    if (sug.data.some((s) => !s.letto)) {
      await sb.from("annona_suggerimenti").update({ letto: true }).eq("letto", false);
      onLetti?.();
    }
  })();
}
