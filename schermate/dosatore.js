/* =========================================================
   dosatore.js — il foglio per scegliere QUANTO hai mangiato.

   In alto il nome (con l'icona del pasto, se arriva dal diario) e, se si
   può, le linguette «Quantità | Cambia alimento». Poi i grammi grandi, le kcal
   e la barra dei macro. Due modi, a scelta con le linguette piccole:
     GRAMMI → un tastierino grande, come una calcolatrice
     PEZZI  → −/+ per le cose che si contano (gallette, biscotti,
              uova, fette…), con il peso di un pezzo già noto
   Le kcal si aggiornano mentre cambi la quantità.
   VALORI (fase 2, facoltativo con `modificaValori`): kcal e macro PER 100 g scritti
   a mano, come sull'etichetta; con «Ricorda» diventano i tuoi (logica/miei.js).
   ========================================================= */

import { conGrammi, testoQuantita } from "../servizi/cibo.js";
import { icona } from "../grafica/icone.js";
import { esc, numero, foglio, leggiNumero } from "../ui.js";
import * as M from "../logica/miei.js";

const CAMPI = [["kcal", "Kcal", "kcal"], ["p", "Proteine", "g"], ["c", "Carboidrati", "g"], ["g", "Grassi", "g"]];

/**
 * @param voce        la voce da dosare (deve avere per100 per ricalcolare)
 * @param onConferma  (nuovaVoce) => …
 * @param onRimuovi   () => …   (facoltativo: mostra il pulsante accanto a «Conferma»)
 * @param onCambia    () => …   (facoltativo: linguette «Quantità | Cambia alimento»)
 * @param sotto       una riga sotto il nome (facoltativa: es. da dove vengono i dati)
 * @param simbolo     l'icona del pasto, grande accanto al nome (facoltativa)
 * @param conferma    il testo del pulsante (es. «Salva»)
 * @param rimuovi     il testo del pulsante per togliere (es. «Elimina»)
 * @param modificaValori  mostra la linguetta «Valori» (kcal e macro per 100 g)
 * @param valori      si apre direttamente su «Valori»
 */
export function apriDosatore(voce, { onConferma, onRimuovi, onCambia, sotto = "", simbolo = "", conferma = "Conferma", rimuovi = "Togli",
  modificaValori = false, valori = false }) {
  const pezzo = voce.per100?.pezzo;
  let modo = pezzo ? "pezzi" : "grammi";
  let vista = valori && modificaValori ? "valori" : "quantita";      // «quantita» | «valori»
  const per100 = { ...voce.per100 };          // i valori per 100 g (si possono correggere)
  let campo = "kcal";                         // il valore che stai scrivendo nella vista «Valori»
  let digitatoV = null;
  let ricordare = true;
  let valoriCambiati = false;
  let grammi = Math.round(voce.grammi) || 0;
  let digitato = null;          // il numero che stai scrivendo sul tastierino (null = non hai ancora toccato)

  const { el, chiudi } = foglio(`
    <div class="foglio-testa dos-testa">
      ${simbolo ? `<span class="dos-simbolo">${icona(simbolo)}</span>` : ""}
      <h2 class="dos-nome">${esc(voce.nome)}</h2>
      <button class="tondo" data-chiudi aria-label="Chiudi">${icona("chiudi")}</button>
    </div>
    ${sotto ? `<p class="dos-fonte">${esc(sotto)}</p>` : ""}
    ${onCambia || modificaValori ? `
      <div class="segmenti tenui" role="tablist">
        <button role="tab" data-vista="quantita">Quantità</button>
        ${modificaValori ? `<button role="tab" data-vista="valori">Valori</button>` : ""}
        ${onCambia ? `<button role="tab" aria-selected="false" data-azione="cambia">${icona("annulla")} ${modificaValori ? "Cambia" : "Cambia alimento"}</button>` : ""}
      </div>` : ""}
    <div class="dos-schermo" aria-live="polite"></div>
    ${pezzo ? `
      <div class="segmenti piccoli dos-modi" role="tablist">
        <button role="tab" data-modo="pezzi">${esc(pezzo.plurale)}</button>
        <button role="tab" data-modo="grammi">Grammi</button>
      </div>` : ""}
    <div class="dos-comandi"></div>
    <div class="dos-fondo">
      ${onRimuovi ? `<button class="dos-rimuovi" data-azione="rimuovi">${icona("cestino")} ${esc(rimuovi)}</button>` : ""}
      <button class="pillola terra" data-azione="conferma">${esc(conferma)}</button>
    </div>`);

  const anteprima = () => conGrammi(valoriCambiati ? { ...voce, per100: { ...per100 }, fonte: "mio" } : voce, Math.max(0, grammi));

  /** La vista «Valori»: quattro caselle per 100 g e un tastierino con la virgola */
  function disegnaValori() {
    const v = anteprima();
    el.querySelector(".dos-schermo").innerHTML = `
      <p class="val-nota">Come sull'etichetta: <b>per 100 g</b></p>
      <div class="val-campi">
        ${CAMPI.map(([k, nome, u]) => `<button class="val-campo ${k === campo ? "attivo" : ""}" data-campo="${k}">
          <small>${nome}</small><b>${k === campo && digitatoV !== null ? esc(digitatoV || "0") : numero(per100[k] ?? 0, k === "kcal" ? 0 : 1)}<em>${u}</em></b></button>`).join("")}
      </div>
      <div class="val-tuo"><span>Nei tuoi ${grammi} g</span><b>${numero(v.kcal)} kcal · P ${numero(v.proteine)} · C ${numero(v.carboidrati)} · G ${numero(v.grassi)}</b></div>
      <button class="val-ricorda ${ricordare ? "si" : ""}" data-azione="ricorda" role="checkbox" aria-checked="${ricordare}">
        <span class="spunta-tonda">${icona("spunta")}</span><b>Ricorda per la prossima volta</b></button>`;
    el.querySelector(".dos-comandi").innerHTML = `
      <div class="tastierino tastierino-valori">
        ${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => `<button data-tastov="${n}">${n}</button>`).join("")}
        <button data-tastov="," aria-label="Virgola">,</button>
        <button data-tastov="0">0</button>
        <button data-tastov="⌫" aria-label="Cancella una cifra">⌫</button>
      </div>`;
  }

  function disegna() {
    el.querySelectorAll("[data-vista]").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.vista === vista)));
    el.querySelector(".dos-modi")?.toggleAttribute("hidden", vista === "valori");
    if (vista === "valori") return disegnaValori();
    el.querySelectorAll("[data-modo]").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.modo === modo)));
    const v = anteprima();
    // la barra dei macro: ogni pezzo è lungo quanto le kcal che porta (carboidrati e proteine 4 kcal/g, grassi 9)
    const c = v.carboidrati ?? 0, p = v.proteine ?? 0, g = v.grassi ?? 0;
    const conMacro = c + p + g > 0;
    el.querySelector(".dos-schermo").innerHTML = `
      <div class="dos-quantita">${modo === "pezzi" ? esc(grammi > 0 ? testoQuantita(v).split(" · ")[0] : `0 ${pezzo.plurale}`) : `${grammi}<span>g</span>`}</div>
      <div class="dos-kcal">${numero(v.kcal)} <small>kcal${modo === "pezzi" ? ` · ${grammi} g` : ""}</small></div>
      ${conMacro ? `
        <div class="dos-barra"><i class="c-carbo" style="flex:${c * 4}"></i><i class="c-prot" style="flex:${p * 4}"></i><i class="c-grassi" style="flex:${g * 9}"></i></div>
        <div class="dos-legenda">
          <span><i class="c-carbo"></i>Carbo <b class="mv-c">${numero(c)} g</b></span>
          <span><i class="c-prot"></i>Prot <b class="mv-p">${numero(p)} g</b></span>
          <span><i class="c-grassi"></i>Grassi <b class="mv-g">${numero(g)} g</b></span>
        </div>` : ""}`;

    const comandi = el.querySelector(".dos-comandi");
    if (modo === "pezzi") {
      comandi.innerHTML = `
        <div class="dos-passi">
          <button class="dos-tondo" data-azione="meno" aria-label="Un ${esc(pezzo.nome)} in meno">−</button>
          <button class="dos-tondo" data-azione="piu" aria-label="Un ${esc(pezzo.nome)} in più">+</button>
        </div>
        <p class="piccolo centro">1 ${esc(pezzo.nome)} ≈ ${numero(pezzo.g, Number.isInteger(pezzo.g) ? 0 : 1)} g · tieni premuto − o + per ½</p>`;
    } else {
      comandi.innerHTML = `
        <div class="tastierino">
          ${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => `<button data-tasto="${n}">${n}</button>`).join("")}
          <button data-tasto="C" aria-label="Cancella tutto">C</button>
          <button data-tasto="0">0</button>
          <button data-tasto="⌫" aria-label="Cancella una cifra">⌫</button>
        </div>`;
    }
  }

  /* Mezzo pezzo: tenendo premuto − o + si va di ½ invece che di 1 */
  let pressione = null, mezzo = false;
  el.addEventListener("pointerdown", (e) => {
    if (!e.target.closest('[data-azione="meno"], [data-azione="piu"]')) return;
    mezzo = false;
    pressione = setTimeout(() => { mezzo = true; navigator.vibrate?.(10); }, 450);
  });
  el.addEventListener("pointerup", () => clearTimeout(pressione));

  el.addEventListener("click", (e) => {
    const vi = e.target.closest("[data-vista]");
    if (vi) { vista = vi.dataset.vista; digitatoV = null; disegna(); return; }
    const c = e.target.closest("[data-campo]");
    if (c) { campo = c.dataset.campo; digitatoV = null; disegna(); return; }
    const tv = e.target.closest("[data-tastov]")?.dataset.tastov;
    if (tv) {
      // il primo tasto sostituisce il valore di partenza; una sola virgola, al massimo un decimale
      let t = tv === "⌫" ? (digitatoV ?? numero(per100[campo] ?? 0, campo === "kcal" ? 0 : 1).replace(/\./g, "")).slice(0, -1)
        : (digitatoV ?? "") + tv;
      if (tv === "," && (digitatoV ?? "").includes(",")) t = digitatoV;
      t = t.replace(/^0+(?=\d)/, "").replace(/^,/, "0,").replace(/(,\d).+$/, "$1").slice(0, 6);
      digitatoV = t;
      per100[campo] = leggiNumero(t) || 0;
      valoriCambiati = true;
      disegna();
      return;
    }
    const m = e.target.closest("[data-modo]");
    if (m) { modo = m.dataset.modo; digitato = null; disegna(); return; }

    const t = e.target.closest("[data-tasto]")?.dataset.tasto;
    if (t) {
      // il primo tasto premuto sostituisce il numero di partenza
      if (t === "C") digitato = "";
      else if (t === "⌫") digitato = (digitato ?? String(grammi)).slice(0, -1);
      else digitato = ((digitato ?? "") + t).replace(/^0+(?=\d)/, "").slice(0, 4);
      grammi = Number(digitato) || 0;
      disegna();
      return;
    }

    const a = e.target.closest("[data-azione]")?.dataset.azione;
    if (a === "meno" || a === "piu") {
      const passo = mezzo ? 0.5 : 1;
      const attuali = Math.round((grammi / pezzo.g) * 2) / 2;
      const nuovi = Math.max(0, a === "piu" ? attuali + passo : attuali - passo);
      grammi = Math.round(nuovi * pezzo.g);
      mezzo = false;
      disegna();
    }
    if (a === "ricorda") { ricordare = !ricordare; disegna(); return; }
    if (a === "conferma") {
      if (grammi <= 0) { onRimuovi ? (onRimuovi(), chiudi()) : chiudi(); return; }
      if (valoriCambiati && ricordare) M.ricorda(voce.nome, { ...per100 }, grammi);
      onConferma(anteprima());
      chiudi();
    }
    if (a === "rimuovi") { onRimuovi(); chiudi(); }
    if (a === "cambia") { chiudi(); onCambia(); }
  });

  disegna();
}
