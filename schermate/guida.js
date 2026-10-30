/* =========================================================
   guida.js — le tre pagine dell'aiuto (Io → Aiuto):

     #/aiuto        → Cosa sa fare Annona (le funzioni, con «Provalo»)
     #/domande      → Domande e consigli (?tema=pasti|attivita|peso|dieta)
     #/legionario   → Chiedi al legionario (domande libere all'IA)

   I testi stanno in dati/aiuto.js.
   ========================================================= */

import * as store from "../dati/store.js";
import * as R from "../logica/riepilogo.js";
import { etaDa } from "../logica/giorni.js";
import { chiediLegionario } from "../servizi/ia.js";
import { esc, adattaAltezza } from "../ui.js";
import { icona } from "../grafica/icone.js";
import { TEMI, DOMANDE, FUNZIONI, ESEMPI_LEGIONARIO } from "../dati/aiuto.js";
import { apriAiuto, apriGesti, domandaHtml, tastoLegionario } from "./aiuto.js";

const testa = (titolo) => `
  <header class="intest">
    <button class="tondo" data-azione="indietro" aria-label="Indietro">${icona("indietro")}</button>
    <h1 class="titolo-romano">${titolo}</h1>
    <span class="tondo invisibile"></span>
  </header>`;

/** Indietro: da dove si è venuti (un foglio, Io…), altrimenti Io */
const indietro = (vai) => (history.length > 1 ? history.back() : vai("#/io"));

/* ---------- Cosa sa fare Annona ---------- */
export const cosa = {
  mostra(el, _p, { vai }) {
    let n = 0;
    const azioni = [];
    el.innerHTML = `
      ${testa("Cosa sa fare")}
      ${FUNZIONI.map((g) => `
        <h2 class="sopra">${g.gruppo}${g.ia ? ` ${icona("stelle", "sopra-ia")}` : ""}</h2>
        <div class="funzioni">
          ${g.voci.map((v) => {
            azioni.push(v);
            const etichetta = v.gesti ? "Mostrami" : v.aiuto ? "Scopri" : "Provalo";
            return `<button class="funzione" data-n="${n++}">
              <span class="pall">${icona(v.icona)}</span>
              <span class="funzione-testo"><strong>${v.titolo}</strong><small>${v.testo}</small></span>
              <span class="funzione-vai">${etichetta} ›</span></button>`;
          }).join("")}
        </div>`).join("")}`;
    el.addEventListener("click", (e) => {
      if (e.target.closest('[data-azione="indietro"]')) return indietro(vai);
      const b = e.target.closest(".funzione");
      if (!b) return;
      const v = azioni[b.dataset.n];
      if (v.gesti) apriGesti();
      else if (v.aiuto) apriAiuto(v.aiuto);
      else vai(v.vai);
    });
  },
};

/* ---------- Domande e consigli ---------- */
export const domande = {
  mostra(el, parametri, { vai }) {
    let tema = TEMI.some((t) => t.id === parametri.tema) ? parametri.tema : "pasti";
    el.innerHTML = `
      ${testa("Domande")}
      <label class="cerca">${icona("cerca")}<input type="search" placeholder="Cerca una domanda…" aria-label="Cerca una domanda" enterkeyhint="search"></label>
      <div class="temi" role="tablist">
        ${TEMI.map((t) => `<button class="tema" role="tab" data-tema="${t.id}">${t.nome}</button>`).join("")}
      </div>
      <div class="elenco-domande"></div>
      <div class="pagina-piede">${tastoLegionario("Non trovi? Chiedi al legionario")}</div>`;
    const input = el.querySelector("input");
    const elenco = el.querySelector(".elenco-domande");
    // senza accenti e minuscolo: «attivita» trova «attività»
    const semplice = (t) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/<[^>]+>/g, "").toLowerCase();

    function disegna() {
      const cerco = semplice(input.value.trim());
      el.querySelectorAll(".tema").forEach((b) => b.setAttribute("aria-selected", !cerco && b.dataset.tema === tema));
      const trovate = cerco
        ? DOMANDE.filter((q) => semplice(`${q.d} ${q.r} ${q.c ?? ""}`).includes(cerco))
        : DOMANDE.filter((q) => q.tema === tema);
      elenco.innerHTML = trovate.length
        ? trovate.map((q, i) => domandaHtml(q, i === 0 && !cerco)).join("")
        : `<p class="sotto centro">Nessuna domanda così. Prova a chiederlo al legionario.</p>`;
    }
    input.addEventListener("input", disegna);
    el.addEventListener("click", (e) => {
      if (e.target.closest('[data-azione="indietro"]')) return indietro(vai);
      const t = e.target.closest("[data-tema]");
      if (!t) return;
      tema = t.dataset.tema;
      input.value = "";
      disegna();
    });
    disegna();
  },
};

/* ---------- Chiedi al legionario ---------- */
// La conversazione resta finché l'app è aperta (sessionStorage), non sul server
const CHAT = "annona.legionario";
const leggiChat = () => { try { return JSON.parse(sessionStorage.getItem(CHAT)) ?? []; } catch { return []; } };
const scriviChat = (m) => { try { sessionStorage.setItem(CHAT, JSON.stringify(m.slice(-20))); } catch { /* pazienza */ } };

/** I numeri della persona, perché il legionario risponda su misura (niente nomi, niente email) */
function contesto() {
  const p = store.profilo() ?? {};
  const b = R.giorno();
  const eta = p.nascita ? etaDa(p.nascita) : null;
  return {
    sesso: p.sesso === "F" ? "donna" : p.sesso === "M" ? "uomo" : "",
    eta,
    peso: R.pesoAttuale() ?? null,
    pesoObiettivo: Number(p.pesoObiettivo) || null,
    ritmoKgSettimana: R.ritmo(),
    movimento: R.livelloDel()?.nome ?? "non scelto",
    oggi: { kcalPiano: Math.round(b.daMangiare), kcalMangiate: Math.round(b.mangiato), kcalAttivita: Math.round(b.bruciato) },
    haScheda: Boolean(store.elenco("piano").length),
  };
}

/** La risposta dell'IA è testo semplice: **grassetto**, a capo, e ogni «2. » di un elenco su una riga nuova */
const formatta = (t) => esc(t).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>")
  .replace(/\s+(\d)\.\s/g, "\n$1. ").replace(/\n+/g, "<br>");

export const legionario = {
  mostra(el, _p, { vai }) {
    let messaggi = leggiChat();
    let attesa = false;
    el.innerHTML = `
      ${testa("Il legionario")}
      <div class="chat" aria-live="polite"></div>
      <div class="chat-piede">
        <div class="chat-esempi"></div>
        <form class="chat-scrivi">
          <textarea rows="1" placeholder="Scrivi o detta…" aria-label="La tua domanda" enterkeyhint="send"></textarea>
          <button class="chat-invia" type="submit" aria-label="Invia">${icona("indietro", "freccia-su")}</button>
        </form>
        <p class="chat-nota">Il legionario conosce l'app e i tuoi numeri. Non è un medico.</p>
      </div>`;
    const chat = el.querySelector(".chat");
    const area = el.querySelector("textarea");
    const esempi = el.querySelector(".chat-esempi");
    area.addEventListener("input", () => adattaAltezza(area, 110));

    const bolla = (m) => m.da === "io"
      ? `<div class="bolla io">${esc(m.testo)}</div>`
      : `<div class="bolla lui ${m.errore ? "errore-bolla" : ""}"><span class="chi">${icona("stelle")}Il legionario</span>${formatta(m.testo)}</div>`;
    function disegna() {
      chat.innerHTML = `
        <div class="bolla lui"><span class="chi">${icona("stelle")}Il legionario</span>Ciao! Chiedimi quello che vuoi su <b>pasti, peso, sport</b> o su <b>come usare Annona</b>.</div>
        ${messaggi.map(bolla).join("")}
        ${attesa ? `<div class="bolla lui pensa"><span></span><span></span><span></span></div>` : ""}`;
      esempi.innerHTML = messaggi.length ? "" : ESEMPI_LEGIONARIO.map((t) => `<button type="button" class="esempio">${t}</button>`).join("");
      el.closest("#app")?.scrollTo(0, 1e6);
    }

    async function chiedi(domanda) {
      domanda = domanda.trim().slice(0, 500);
      if (!domanda || attesa) return;
      const storia = messaggi.filter((m) => !m.errore).slice(-6).map((m) => ({ da: m.da, testo: m.testo }));
      messaggi.push({ da: "io", testo: domanda });
      attesa = true;
      area.value = "";
      area.dispatchEvent(new Event("input"));
      disegna();
      try {
        const r = await chiediLegionario({ domanda, storia, dati: contesto() });
        messaggi.push({ da: "lui", testo: r.risposta });
      } catch (e) {
        messaggi.push({ da: "lui", testo: e.message, errore: true });
      }
      attesa = false;
      scriviChat(messaggi.filter((m) => !m.errore));
      if (location.hash.startsWith("#/legionario")) disegna();
    }

    el.querySelector("form").addEventListener("submit", (e) => { e.preventDefault(); chiedi(area.value); });
    area.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); chiedi(area.value); }
    });
    el.addEventListener("click", (e) => {
      if (e.target.closest('[data-azione="indietro"]')) return indietro(vai);
      const es = e.target.closest(".esempio");
      if (es) chiedi(es.textContent);
    });
    disegna();
  },
};
