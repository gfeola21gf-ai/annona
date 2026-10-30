/* =========================================================
   razioni.js — la SCHEDA SETTIMANALE.

   Due viste, con l'interruttore in alto:
     GIORNO    → un giorno alla volta (striscia lun–dom; il puntino sotto è oggi:
                 i puntini «vicino/lontano» erano confusi, G1 2026-10-29), il totale grande,
                 la barra dei macro e QUATTRO PIASTRELLE (scelta R2 dell'utente,
                 2026-10-29): icona e nome del pasto, gli alimenti in breve,
                 le kcal grandi. Tocco = modifica il pasto; tieni premuto = menu.
     SETTIMANA → tutto a colpo d'occhio, in due formati a scelta:
                 TABELLA (7 giorni × 4 pasti) o AGENDA (un giorno
                 sotto l'altro). L'app ricorda l'ultima scelta.
   In cima: il fiocco ❄ (Provviste di domani, col numero di cose da fare) e
   il menu ⋯ con le azioni rare (Copia su…, Importa, Svuota).
   ========================================================= */

import * as store from "../dati/store.js";
import * as P from "../logica/piano.js";
import { oggi } from "../logica/giorni.js";
import { provvisteDaFare, apriProvviste } from "./provviste.js";
import * as A from "../logica/appunti.js";
import { gesti, menu } from "../gesti.js";
import { PASTI } from "./oggi.js";
import { legionario } from "../grafica/mascotte.js";
import { icona } from "../grafica/icone.js";
import { esc, numero, foglio, avviso } from "../ui.js";
import { fumetto, primoFumetto } from "./aiuto.js";

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
        ${fiocco()}
        <h1 class="titolo-romano">Razioni</h1>
        <button class="tondo" data-azione="menu" aria-label="Altre azioni">${icona("punti")}</button>
      </header>
      ${provvisteDaFare() !== null && primoFumetto("provviste") ? fumetto("provviste", "su") : ""}
      <div class="segmenti" role="tablist">
        <button role="tab" aria-selected="${vista === "giorno"}" data-azione="vista" data-valore="giorno">${icona("sole")} Giorno</button>
        <button role="tab" aria-selected="${vista === "settimana"}" data-azione="vista" data-valore="settimana">${icona("rotolo")} Settimana</button>
      </div>
      ${vista === "giorno" ? vistaGiorno() : vistaSettimana()}`;
  }

  /** Il fiocco delle Provviste di domani (con quante cose restano da fare), se domani c'è qualcosa in scheda */
  function fiocco() {
    const n = provvisteDaFare();
    if (n === null) return `<span class="tondo invisibile"></span>`;
    return `<button class="tondo" data-azione="provviste" aria-label="Provviste di domani">${icona("fiocco")}
      ${n === undefined ? `<span class="badge-tondo puntino"></span>` : n > 0 ? `<span class="badge-tondo">${n}</span>` : ""}</button>`;
  }

  /** Il giorno è lontano dal piano? (più del 15%, almeno 200 kcal) */
  const lontano = (tot, obiettivo) => obiettivo && Math.abs(tot - obiettivo) >= Math.max(200, obiettivo * 0.15);

  function vistaGiorno() {
    const g = giornoScelto;
    const piano = P.giornoPiano(g);
    const tot = P.totaleGiorno(g);
    const obiettivo = P.kcalObiettivo();
    const tutte = P.PASTI_ID.flatMap((p) => piano[p]);
    const somma = (k) => tutte.reduce((t, v) => t + (Number(v[k]) || 0), 0);
    const c = somma("carboidrati"), pr = somma("proteine"), gr = somma("grassi");
    const diff = tot - obiettivo;
    return `
      <div class="settimana" role="tablist" aria-label="Giorni della settimana">
        ${P.SIGLE_GIORNI.map((s, i) => {
          const n = i + 1, t = P.totaleGiorno(n);
          return `<button role="tab" class="giorno-tab ${n === gOggi ? "oggi" : ""} ${t ? "" : "vuoto"}" aria-selected="${n === g}"
            data-azione="giorno" data-g="${n}"><b>${s}</b></button>`;
        }).join("")}
      </div>
      ${P.schedaVuota() ? `
        <div class="cartello cartello-piccolo">
          ${legionario("pensa")}
          <p>La tua scheda è ancora vuota. Riempi i pasti di un giorno e poi <b>copialo</b> sugli altri (menu ⋯), oppure <a href="#/importa"><b>importala</b></a> da foto, PDF o testo.</p>
        </div>` : ""}
      <div class="r-riass">
        <strong>${numero(tot)}</strong><small>kcal${obiettivo ? ` su ${numero(obiettivo)}` : ""} · ${P.NOMI_GIORNI[g - 1].toLowerCase()}</small>
        ${tot && obiettivo ? `<span class="pastiglia-piano ${lontano(tot, obiettivo) ? "lontano" : ""}">${Math.abs(diff) < 1 ? "in linea" : `${diff > 0 ? "+" : "−"}${numero(Math.abs(diff))}`}</span>` : ""}
      </div>
      ${tot ? `
      <div class="r-macro"><i class="c-carbo" style="flex:${c * 4}"></i><i class="c-prot" style="flex:${pr * 4}"></i><i class="c-grassi" style="flex:${gr * 9}"></i></div>
      <div class="r-legenda"><span>Carbo <b>${numero(c)} g</b></span><span>Prot <b>${numero(pr)} g</b></span><span>Grassi <b>${numero(gr)} g</b></span></div>` : ""}
      <div class="piastrelle">
        ${PASTI.map((p) => piastra(p, piano[p.id])).join("")}
      </div>`;
  }

  /** Una piastrella: icona e nome del pasto, gli alimenti in breve, le kcal grandi e la barretta dei macro */
  function piastra(p, voci) {
    const ap = A.leggi();
    if (!voci.length) return `
      <button class="piastra vuota gestibile" data-azione="aggiungi" data-pasto="${p.id}" data-piastra="${p.id}">
        <span class="piastra-testa">${icona(p.icona)}<strong>${p.nome}</strong></span>
        <span class="piastra-vuota">${ap ? `${icona("incolla")} tieni premuto per incollare` : `${icona("piu")} Aggiungi`}</span>
      </button>`;
    const somma = (k) => voci.reduce((t, v) => t + (Number(v[k]) || 0), 0);
    const nome = P.nomePasto(giornoScelto, p.id);
    return `
      <button class="piastra gestibile" data-azione="modifica" data-pasto="${p.id}" data-piastra="${p.id}" aria-label="Modifica ${p.nome.toLowerCase()}">
        <span class="piastra-testa">${icona(p.icona)}<strong>${p.nome}</strong></span>
        <small>${esc(nome || P.elencoNomi(voci))}</small>
        <span class="piastra-kcal">${numero(P.sommaKcal(voci))}<em>kcal</em></span>
        <span class="piastra-macro"><i class="c-carbo" style="flex:${somma("carboidrati") * 4}"></i><i class="c-prot" style="flex:${somma("proteine") * 4}"></i><i class="c-grassi" style="flex:${somma("grassi") * 9}"></i></span>
      </button>`;
  }

  /** Tieni premuto una piastrella: copia, incolla, copia su altri giorni, svuota */
  function menuPiastra(riga, pasto) {
    const g = giornoScelto;
    const voci = P.vociDi(g, pasto);
    const nomeP = PASTI.find((p) => p.id === pasto).nome;
    const ap = A.leggi();
    menu(riga, [
      voci.length ? { testo: "Modifica", icona: "matita", fai: () => vai(`#/aggiungi?piano=${g}&pasto=${pasto}&modifica=1`) }
        : { testo: "Aggiungi", icona: "piu", fai: () => vai(`#/aggiungi?piano=${g}&pasto=${pasto}`) },
      ...(voci.length ? [{ testo: "Copia", icona: "copia", fai: () => {
        A.copia(voci, `${nomeP.toLowerCase()} della scheda (${P.SIGLE_GIORNI[g - 1].toLowerCase()})`);
        avviso(`${nomeP} copiato · incollalo in Oggi o in un altro giorno`); disegna();
      } }] : []),
      ...(ap ? [{ testo: `Incolla ${ap.voci.length === 1 ? "1 alimento" : `${ap.voci.length} alimenti`}`, icona: "incolla", fai: () => {
        P.aggiungiVoci(g, pasto, ap.voci);
        avviso(`Incollato nella scheda: ${nomeP.toLowerCase()} di ${P.NOMI_GIORNI[g - 1].toLowerCase()}`, "", { annulla: () => P.impostaVoci(g, pasto, voci) });
      } }] : []),
      ...(voci.length ? [null, { testo: "Svuota", icona: "cestino", rossa: true, fai: () => {
        P.impostaVoci(g, pasto, []);
        avviso(`${nomeP} di ${P.NOMI_GIORNI[g - 1].toLowerCase()} svuotato`, "", { annulla: () => P.impostaVoci(g, pasto, voci) });
      } }] : []),
    ]);
  }

  /** Il menu ⋯ in alto: le azioni che si usano di rado */
  function menuAltro(pulsante) {
    const g = giornoScelto, nomeG = P.NOMI_GIORNI[g - 1].toLowerCase();
    const prima = Object.fromEntries(P.PASTI_ID.map((p) => [p, P.vociDi(g, p)]));
    menu(pulsante, [
      { testo: `Copia ${nomeG} su…`, icona: "copia", fai: () => apriCopia() },
      { testo: "Importa una scheda", icona: "scarica", fai: () => vai("#/importa") },
      ...(provvisteDaFare() !== null ? [{ testo: "Provviste di domani", icona: "fiocco", fai: () => apriProvviste({ vai }) }] : []),
      null,
      { testo: `Svuota ${nomeG}`, icona: "cestino", rossa: true, fai: () => {
        P.PASTI_ID.forEach((p) => P.impostaVoci(g, p, []));
        avviso(`${P.NOMI_GIORNI[g - 1]} svuotato`, "", { annulla: () => P.PASTI_ID.forEach((p) => P.impostaVoci(g, p, prima[p])) });
      } },
    ]);
  }

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
      if (pasto) pasto.scrollIntoView({ block: "center" }); else document.getElementById("app").scrollTo(0, 0);
    }
    if (a === "aggiungi") vai(`#/aggiungi?piano=${b.dataset.g || giornoScelto}&pasto=${b.dataset.pasto}`);
    // si torna a Razioni nella stessa vista (settimana o giorno), su quel giorno
    if (a === "modifica") { giornoScelto = Number(b.dataset.g || giornoScelto); }
    if (a === "modifica") vai(`#/aggiungi?piano=${b.dataset.g || giornoScelto}&pasto=${b.dataset.pasto}&modifica=1`);
    if (a === "copia") apriCopia();
    if (a === "menu") menuAltro(b);
    if (a === "provviste") apriProvviste({ vai });
  });

  // tieni premuto una piastrella → menu (copia, incolla, svuota)
  gesti(el, "[data-piastra]", { lungo: (r) => menuPiastra(r, r.dataset.piastra) });

  const aggiorna = () => { if (!document.querySelector(".foglio-sfondo")) disegna(); else disegnaDopo = true; };
  let disegnaDopo = false;
  // Se un foglio è aperto ridisegniamo quando si chiude (per non far "saltare" la pagina sotto)
  const osserva = new MutationObserver(() => { if (disegnaDopo && !document.querySelector(".foglio-sfondo")) { disegnaDopo = false; disegna(); } });
  osserva.observe(document.body, { childList: true });
  window.addEventListener("annona-dati", aggiorna);
  disegna();
  return () => { window.removeEventListener("annona-dati", aggiorna); osserva.disconnect(); };
}
