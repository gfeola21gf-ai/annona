/* =========================================================
   razioni.js — la SCHEDA SETTIMANALE.

   Due viste, con l'interruttore in alto:
     GIORNO    → un giorno alla volta (striscia lun–dom), con i
                 4 pasti e le quantità; tocchi una voce per il
                 dosatore, "Aggiungi" per metterne altre.
                 "Copia su…" duplica il giorno su altri giorni.
     SETTIMANA → tutto a colpo d'occhio, in due formati a scelta:
                 TABELLA (7 giorni × 4 pasti) o AGENDA (un giorno
                 sotto l'altro). L'app ricorda l'ultima scelta.
   In cima: il riquadro delle Provviste di domani.
   ========================================================= */

import * as store from "../dati/store.js";
import * as P from "../logica/piano.js";
import { oggi } from "../logica/giorni.js";
import { testoQuantita } from "../servizi/cibo.js";
import { apriDosatore } from "./dosatore.js";
import { riquadroProvviste, apriProvviste } from "./provviste.js";
import { PASTI } from "./oggi.js";
import { legionario } from "../grafica/mascotte.js";
import { icona } from "../grafica/icone.js";
import { esc, numero, foglio, avviso } from "../ui.js";

/* Le preferenze di vista restano nel telefono */
const ricorda = (k, v) => { try { localStorage.setItem(`annona.razioni.${k}`, v); } catch { /* pazienza */ } };
const ricordato = (k, riserva) => { try { return localStorage.getItem(`annona.razioni.${k}`) || riserva; } catch { return riserva; } };

let giornoScelto = null;            // 1 = lunedì … 7 = domenica

export function mostra(el, parametri, { vai }) {
  const gOggi = P.giornoSettimana(oggi());
  if (parametri.g) { giornoScelto = Number(parametri.g); ricorda("vista", "giorno"); }
  giornoScelto ??= gOggi;
  let vista = ricordato("vista", "giorno");            // "giorno" | "settimana"
  let formato = ricordato("formato", "tabella");       // "tabella" | "agenda"

  /* ---------- disegno ---------- */
  function disegna() {
    el.innerHTML = `
      <header class="intest">
        <span class="tondo invisibile"></span>
        <h1 class="titolo-romano">Razioni</h1>
        <a class="tondo" href="#/importa" aria-label="Importa la scheda da foto, PDF o testo">${icona("scarica")}</a>
      </header>
      <div class="segmenti" role="tablist">
        <button role="tab" aria-selected="${vista === "giorno"}" data-azione="vista" data-valore="giorno">${icona("sole")} Giorno</button>
        <button role="tab" aria-selected="${vista === "settimana"}" data-azione="vista" data-valore="settimana">${icona("rotolo")} Settimana</button>
      </div>
      ${vista === "giorno" ? vistaGiorno() : vistaSettimana()}`;
  }

  function vistaGiorno() {
    const g = giornoScelto;
    const piano = P.giornoPiano(g);
    const tot = P.totaleGiorno(g);
    const obiettivo = P.kcalObiettivo();
    return `
      ${riquadroProvviste()}
      <div class="settimana" role="tablist" aria-label="Giorni della settimana">
        ${P.SIGLE_GIORNI.map((s, i) => {
          const n = i + 1, t = P.totaleGiorno(n);
          return `<button role="tab" class="giorno-tab ${n === gOggi ? "oggi" : ""} ${t ? "" : "vuoto"}" aria-selected="${n === g}"
            data-azione="giorno" data-g="${n}"><b>${s}</b><small>${t ? numero(t) : "—"}</small></button>`;
        }).join("")}
      </div>
      ${P.schedaVuota() ? `
        <div class="cartello cartello-piccolo">
          ${legionario("pensa")}
          <p>La tua scheda è ancora vuota. Riempi i pasti di un giorno e poi <b>copialo</b> sugli altri, oppure <a href="#/importa"><b>importala</b></a> da foto, PDF o testo.</p>
        </div>` : ""}
      <div class="giorno-testa">
        <div><h2>${P.NOMI_GIORNI[g - 1]}${g === gOggi ? ` <span class="etichetta">oggi</span>` : ""}</h2>
          <small>${numero(tot)} kcal${obiettivo ? ` · piano <b class="${tot > obiettivo ? "oltre" : ""}">${numero(obiettivo)}</b>` : ""}</small></div>
        <button class="mini-pulsante" data-azione="copia">${icona("copia")} Copia su…</button>
      </div>
      <div class="pasti">
        ${PASTI.map((p) => cartaPasto(p, piano[p.id])).join("")}
      </div>`;
  }

  function cartaPasto(p, voci) {
    if (!voci.length) return `
      <button class="piano-pasto vuoto" data-azione="aggiungi" data-pasto="${p.id}" id="pasto-${p.id}">
        <span class="piano-pasto-testa"><span class="pall">${icona(p.icona)}</span><strong>${p.nome}</strong><span class="aggiungi-mini">${icona("piu")}</span></span>
      </button>`;
    return `
      <section class="piano-pasto" id="pasto-${p.id}">
        <button class="piano-pasto-testa" data-azione="modifica" data-pasto="${p.id}" aria-label="Modifica ${p.nome.toLowerCase()}">
          <span class="pall">${icona(p.icona)}</span><strong>${p.nome}${P.nomePasto(giornoScelto, p.id) ? `<small class="nome-sotto">${esc(P.nomePasto(giornoScelto, p.id))}</small>` : ""}</strong>${icona("matita")}<span class="kcal">${numero(P.sommaKcal(voci))}</span></button>
        ${voci.map((v, i) => `
          <button class="piano-voce" data-azione="voce" data-pasto="${p.id}" data-i="${i}">
            <span>${esc(v.nome)}</span><em>${esc(v.per100 ? quantitaBreve(v) : v.grammi ? `${v.grammi} g` : "")}</em><span class="kcal">${numero(v.kcal)}</span>
          </button>`).join("")}
        <button class="piano-aggiungi" data-azione="aggiungi" data-pasto="${p.id}">${icona("piu")} Aggiungi</button>
      </section>`;
  }

  /** "3 gallette · 27 g" → "3 gallette" (più corto, per la scheda);  "200 g" resta così */
  const quantitaBreve = (v) => testoQuantita(v).split(" · ")[0];

  function vistaSettimana() {
    const totali = P.SIGLE_GIORNI.map((_, i) => P.totaleGiorno(i + 1));
    const pieni = totali.filter(Boolean);
    const media = pieni.length ? pieni.reduce((a, b) => a + b, 0) / pieni.length : 0;
    const testa = `
      <div class="sett-testa">
        <small>${pieni.length ? `Media ${numero(media)} kcal al giorno${P.kcalObiettivo() ? ` · piano ${numero(P.kcalObiettivo())}` : ""}` : "Scheda vuota"}</small>
        <div class="formato" role="group" aria-label="Formato">
          <button data-azione="formato" data-valore="tabella" aria-pressed="${formato === "tabella"}" aria-label="Tabella">${icona("griglia")}</button>
          <button data-azione="formato" data-valore="agenda" aria-pressed="${formato === "agenda"}" aria-label="Agenda">${icona("elenco")}</button>
        </div>
      </div>`;

    if (formato === "tabella") return `${testa}
      <div class="tabella">
        <span></span>${PASTI.map((p) => `<span class="tc">${icona(p.icona)}${p.nome.slice(0, 6).replace("Colazi", "Colaz.").replace("Spunti", "Spunt.")}</span>`).join("")}
        ${P.SIGLE_GIORNI.map((s, i) => {
          const g = i + 1, piano = P.giornoPiano(g);
          return `
            <button class="tg ${g === gOggi ? "oggi" : ""}" data-azione="apri-giorno" data-g="${g}"><b>${s}</b><small>${totali[i] ? numero(totali[i]) : "—"}</small></button>
            ${PASTI.map((p) => {
              const voci = piano[p.id];
              return voci.length
                ? `<button class="cella ${P.nomePasto(g, p.id) ? "con-nome" : ""}" data-azione="modifica" data-g="${g}" data-pasto="${p.id}"><span>${esc(P.descrizionePasto(g, p.id, true))}</span><em>${numero(P.sommaKcal(voci))}</em></button>`
                : `<button class="cella vuota" data-azione="aggiungi" data-g="${g}" data-pasto="${p.id}" aria-label="Aggiungi">${icona("piu")}</button>`;
            }).join("")}`;
        }).join("")}
      </div>`;

    return `${testa}
      <div class="agenda">
        ${P.NOMI_GIORNI.map((nome, i) => {
          const g = i + 1, piano = P.giornoPiano(g);
          const righe = PASTI.filter((p) => piano[p.id].length);
          return `
            <div class="ag-giorno ${g === gOggi ? "oggi" : ""}">
              <button class="ag-testa" data-azione="apri-giorno" data-g="${g}"><strong>${nome}</strong><small>${totali[i] ? `${numero(totali[i])} kcal` : "vuoto · tocca per riempire"}</small></button>
              ${righe.map((p) => `<button class="ag-riga ${P.nomePasto(g, p.id) ? "con-nome" : ""}" data-azione="modifica" data-g="${g}" data-pasto="${p.id}">${icona(p.icona)}<span>${esc(P.descrizionePasto(g, p.id))}</span><em>${numero(P.sommaKcal(piano[p.id]))}</em></button>`).join("")}
            </div>`;
        }).join("")}
      </div>`;
  }

  /* ---------- azioni ---------- */
  /** Tocchi una voce della scheda: dosatore (o solo "Rimuovi" se è una voce scritta a mano senza valori per 100 g) */
  function apriVoce(pasto, i) {
    const g = giornoScelto;
    const voci = P.vociDi(g, pasto);
    const voce = voci[i];
    if (!voce) return;
    const rimuovi = () => { P.impostaVoci(g, pasto, voci.filter((_, j) => j !== i)); avviso("Tolto dalla scheda"); };
    if (voce.per100) {
      apriDosatore(voce, {
        onConferma: (nuova) => P.impostaVoci(g, pasto, voci.map((v, j) => (j === i ? nuova : v))),
        onRimuovi: rimuovi,
      });
      return;
    }
    const { el: f, chiudi } = foglio(`
      <div class="foglio-testa"><h2 class="dos-nome">${esc(voce.nome)}</h2><button class="tondo" data-chiudi aria-label="Chiudi">${icona("chiudi")}</button></div>
      <p class="sotto">${numero(voce.kcal)} kcal, scritte a mano.</p>
      <button class="dos-rimuovi" data-rimuovi>${icona("cestino")} Togli dalla scheda</button>`);
    f.querySelector("[data-rimuovi]").addEventListener("click", () => { rimuovi(); chiudi(); });
  }

  /** "Copia su…": scegli i giorni dove copiare quello mostrato (o svuotalo) */
  function apriCopia() {
    const da = giornoScelto;
    const scelti = new Set();
    let confermaSvuota = false;
    const { el: f, chiudi } = foglio(`
      <div class="foglio-testa"><h2 class="titolo-romano">Copia ${P.NOMI_GIORNI[da - 1].toLowerCase()}</h2><button class="tondo" data-chiudi aria-label="Chiudi">${icona("chiudi")}</button></div>
      <p class="sotto">Scegli i giorni: i loro pasti verranno <b>sostituiti</b> con quelli di ${P.NOMI_GIORNI[da - 1].toLowerCase()}.</p>
      <div class="scegli-giorni">
        ${P.SIGLE_GIORNI.map((s, i) => `<button class="chip" data-g="${i + 1}" ${i + 1 === da ? "disabled" : ""} aria-pressed="false">${s}</button>`).join("")}
      </div>
      <button class="pillola terra larga" data-copia disabled>Scegli i giorni</button>
      <button class="dos-rimuovi" data-svuota>${icona("cestino")} Svuota ${P.NOMI_GIORNI[da - 1].toLowerCase()}</button>`);
    const pulsante = f.querySelector("[data-copia]");
    f.addEventListener("click", (e) => {
      const chip = e.target.closest("[data-g]");
      if (chip && !chip.disabled) {
        const g = Number(chip.dataset.g);
        scelti.has(g) ? scelti.delete(g) : scelti.add(g);
        chip.setAttribute("aria-pressed", String(scelti.has(g)));
        pulsante.disabled = !scelti.size;
        pulsante.textContent = scelti.size ? `Copia su ${scelti.size === 1 ? "1 giorno" : `${scelti.size} giorni`}` : "Scegli i giorni";
      }
      if (e.target.closest("[data-copia]") && scelti.size) {
        P.copiaGiorno(da, [...scelti]);
        chiudi();
        avviso(`Copiato su ${[...scelti].sort().map((g) => P.SIGLE_GIORNI[g - 1].toLowerCase()).join(", ")}`);
      }
      const svuota = e.target.closest("[data-svuota]");
      if (svuota) {
        if (!confermaSvuota) { confermaSvuota = true; svuota.lastChild.textContent = " Tocca di nuovo per svuotare"; return; }
        P.PASTI_ID.forEach((p) => P.impostaVoci(da, p, []));
        chiudi();
        avviso(`${P.NOMI_GIORNI[da - 1]} svuotato`);
      }
    });
  }

  el.addEventListener("click", (e) => {
    const b = e.target.closest("[data-azione]");
    if (!b) return;
    const a = b.dataset.azione;
    if (a === "vista") { vista = b.dataset.valore; ricorda("vista", vista); disegna(); }
    if (a === "formato") { formato = b.dataset.valore; ricorda("formato", formato); disegna(); }
    if (a === "giorno") { giornoScelto = Number(b.dataset.g); disegna(); }
    if (a === "apri-giorno") {
      giornoScelto = Number(b.dataset.g);
      vista = "giorno"; ricorda("vista", vista);
      disegna();
      const pasto = b.dataset.pasto && el.querySelector(`#pasto-${b.dataset.pasto}`);
      if (pasto) pasto.scrollIntoView({ block: "center" }); else window.scrollTo(0, 0);
    }
    if (a === "aggiungi") vai(`#/aggiungi?piano=${b.dataset.g || giornoScelto}&pasto=${b.dataset.pasto}`);
    // si torna a Razioni nella stessa vista (settimana o giorno), su quel giorno
    if (a === "modifica") { giornoScelto = Number(b.dataset.g || giornoScelto); }
    if (a === "modifica") vai(`#/aggiungi?piano=${b.dataset.g || giornoScelto}&pasto=${b.dataset.pasto}&modifica=1`);
    if (a === "voce") apriVoce(b.dataset.pasto, Number(b.dataset.i));
    if (a === "copia") apriCopia();
    if (a === "provviste") apriProvviste({ vai });
  });

  const aggiorna = () => { if (!document.querySelector(".foglio-sfondo")) disegna(); else disegnaDopo = true; };
  let disegnaDopo = false;
  // Se un foglio è aperto ridisegniamo quando si chiude (per non far "saltare" la pagina sotto)
  const osserva = new MutationObserver(() => { if (disegnaDopo && !document.querySelector(".foglio-sfondo")) { disegnaDopo = false; disegna(); } });
  osserva.observe(document.body, { childList: true });
  window.addEventListener("annona-dati", aggiorna);
  disegna();
  return () => { window.removeEventListener("annona-dati", aggiorna); osserva.disconnect(); };
}
