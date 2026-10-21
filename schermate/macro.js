/* =========================================================
   macro.js — il foglio dei MACRONUTRIENTI (si apre da Io).

   Scegli in percentuale quante calorie dare a proteine e grassi
   (−/+ di 5 in 5); i carboidrati sono il resto, così il totale
   fa sempre 100%. I grammi al giorno si vedono subito.
   «Chiedi al legionario»: racconti la dieta che vuoi fare e
   la tua situazione, l'IA propone le percentuali e spiega perché.
   ========================================================= */

import * as store from "../dati/store.js";
import * as R from "../logica/riepilogo.js";
import * as E from "../logica/energia.js";
import { chiediMacro } from "../servizi/ia.js";
import { icona } from "../grafica/icone.js";
import { esc, numero, foglio, avviso, adattaAltezza } from "../ui.js";
import { etaDa } from "../logica/giorni.js";

/** La striscia colorata con le tre percentuali */
const striscia = (r) => `
  <div class="ripartizione" aria-hidden="true"><i class="c-carbo" style="width:${r.c}%"></i><i class="c-prot" style="width:${r.p}%"></i><i class="c-grassi" style="width:${r.g}%"></i></div>`;

/** "35% carboidrati · 40% proteine · 25% grassi" */
export const testoMacro = (r) => `${r.c}% carboidrati · ${r.p}% proteine · ${r.g}% grassi`;

/** Le kcal su cui calcolare i grammi: quanto puoi mangiare in un giorno senza attività */
const kcalBase = () => Math.max(0, R.quotidianoDel() + R.obiettivoKcal());

/**
 * @param onSalvato  () => …  dopo il salvataggio (per ridisegnare Io)
 */
export function apriMacro({ onSalvato } = {}) {
  let r = R.percentualiMacro();
  const kcal = kcalBase();

  const { el, chiudi } = foglio(`
    <div class="foglio-testa"><h2 class="titolo-romano">Macronutrienti</h2><button class="tondo" data-chiudi aria-label="Chiudi">${icona("chiudi")}</button></div>
    <div class="mac-corpo"></div>
    <p class="piccolo centro">Grammi calcolati sul tuo obiettivo di ${numero(kcal)} kcal. −/+ di 5 in 5.</p>
    <button class="pillola larga" data-azione="ia">${icona("stelle")} Chiedi al legionario</button>
    <button class="pillola terra larga" data-azione="salva">Salva</button>`);

  function disegna() {
    const gr = E.grammiMacro(kcal, r);
    const riga = (k, nome, classe) => `
      <div class="mac-riga"><span class="pallino ${classe}"></span><strong>${nome}<small>≈ ${numero(gr[k])} g al giorno</small></strong>
        <button class="mini" data-meno="${k}" aria-label="${nome}: 5% in meno">−</button><span class="perc">${r[k]}%</span>
        <button class="mini" data-piu="${k}" aria-label="${nome}: 5% in più">+</button></div>`;
    el.querySelector(".mac-corpo").innerHTML = `
      ${striscia(r)}
      <div class="mac-righe">
        ${riga("p", "Proteine", "c-prot")}
        ${riga("g", "Grassi", "c-grassi")}
        <div class="mac-riga resto"><span class="pallino c-carbo"></span><strong>Carboidrati<small>il resto · ≈ ${numero(gr.c)} g al giorno</small></strong>
          <span></span><span class="perc">${r.c}%</span><span></span></div>
      </div>`;
  }

  el.addEventListener("click", (e) => {
    const meno = e.target.closest("[data-meno]")?.dataset.meno;
    const piu = e.target.closest("[data-piu]")?.dataset.piu;
    if (meno || piu) {
      const k = meno || piu;
      const prima = r;
      r = E.ripartizione({ ...r, [k]: r[k] + (piu ? 5 : -5) });
      if (r.p === prima.p && r.g === prima.g) navigator.vibrate?.(10);   // già al limite
      disegna();
    }
    const a = e.target.closest("[data-azione]")?.dataset.azione;
    if (a === "ia") apriAiuto((proposta) => { r = proposta; disegna(); });
    if (a === "salva") {
      store.salvaProfilo({ ...(store.profilo() ?? {}), macro: { p: r.p, g: r.g } });
      avviso(`Macronutrienti: ${testoMacro(r)}`);
      chiudi();
      onSalvato?.();
    }
  });

  disegna();
}

/** Il foglio «Chiedi al legionario»: descrivi la dieta, l'IA propone */
function apriAiuto(onUsa) {
  let proposta = null, inCorso = false;
  const p = store.profilo() ?? {};
  const { el, chiudi } = foglio(`
    <div class="foglio-testa"><h2 class="titolo-romano">Chiedi al legionario</h2><button class="tondo" data-chiudi aria-label="Chiudi">${icona("chiudi")}</button></div>
    <p class="sotto">Racconta la dieta che vuoi fare e la tua situazione: allenamenti, gusti, cosa ti pesa di più.</p>
    <textarea name="dieta" rows="3" class="area-dieta" placeholder="Es. voglio dimagrire senza perdere muscolo, faccio pesi 3 volte a settimana…"></textarea>
    <div class="mac-proposta"></div>
    <button class="pillola terra larga" data-azione="chiedi">${icona("stelle")} Chiedi la proposta</button>`);
  const area = el.querySelector("textarea");
  const pulsante = el.querySelector('[data-azione="chiedi"]');

  function disegna() {
    el.querySelector(".mac-proposta").innerHTML = proposta ? `
      <div class="proposta">
        <span class="sopra">${icona("stelle")} La proposta</span>
        ${striscia(proposta)}
        <p><b>${testoMacro(proposta)}</b><br>${esc(proposta.spiegazione)}</p>
      </div>
      <p class="piccolo centro">Potrai sempre ritoccarli a mano.</p>` : "";
    pulsante.innerHTML = inCorso ? `<span class="rotella"></span> Il legionario ci pensa…`
      : proposta ? "Usa questi valori" : `${icona("stelle")} Chiedi la proposta`;
    pulsante.disabled = inCorso;
  }

  async function chiedi() {
    const testo = area.value.trim();
    if (!testo) { area.focus(); avviso("Scrivi o detta che dieta vuoi fare."); return; }
    inCorso = true; disegna();
    try {
      const r = await chiediMacro(testo, {
        sesso: p.sesso, eta: p.nascita ? etaDa(p.nascita) : null, peso: R.pesoAttuale(),
        pesoObiettivo: p.pesoObiettivo, kcal: kcalBase(), ritmo: Number(p.ritmo) || 0,
      });
      proposta = { ...E.ripartizione({ p: r.proteine, g: r.grassi }), spiegazione: r.spiegazione };
    } catch (err) {
      avviso(err.message, "errore");
    } finally {
      inCorso = false; disegna();
    }
  }

  el.addEventListener("input", () => { adattaAltezza(area); if (proposta) { proposta = null; disegna(); } });
  el.addEventListener("click", (e) => {
    const a = e.target.closest("[data-azione]")?.dataset.azione;
    if (a === "chiedi") {
      if (proposta) { onUsa(proposta); chiudi(); } else chiedi();
    }
  });

  disegna();
}
