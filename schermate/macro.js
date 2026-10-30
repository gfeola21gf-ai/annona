/* =========================================================
   macro.js — il foglio dei MACRONUTRIENTI (si apre da Io).

   Due modi (scelta dell'utente 2026-10-30, anteprima/PIANO-MACRO.md):
   - CONSIGLIATI (predefinito; nel dato modo "nutrizionista", sullo schermo MAI «nutrizionista»: l'utente non vuole
     che l'app sembri sostituire un professionista): una domanda, «Ti alleni?» (cardio e/o
     pesi), e l'app calcola: proteine in g per kg di peso, grassi 30%,
     carboidrati il resto (energia.macroNutrizionista). Si aggiorna da solo.
   - SU MISURA: percentuali con −/+ di 5 (carboidrati = il resto). Se un
     valore esce dalle regole, la riga diventa gialla con il consiglio.
   «Chiedi al legionario»: l'IA propone percentuali → diventano «su misura».
   ========================================================= */

import * as store from "../dati/store.js";
import * as R from "../logica/riepilogo.js";
import * as E from "../logica/energia.js";
import { chiediMacro } from "../servizi/ia.js";
import { icona } from "../grafica/icone.js";
import { esc, numero, kg, foglio, avviso, adattaAltezza } from "../ui.js";
import { etaDa } from "../logica/giorni.js";

/** La striscia colorata con le tre percentuali */
const striscia = (r) => `
  <div class="ripartizione" aria-hidden="true"><i class="c-carbo" style="width:${r.c}%"></i><i class="c-prot" style="width:${r.p}%"></i><i class="c-grassi" style="width:${r.g}%"></i></div>`;

/** "35% carboidrati · 40% proteine · 25% grassi" */
export const testoMacro = (r) => `${r.c}% carboidrati · ${r.p}% proteine · ${r.g}% grassi`;

/** "1,8 g per kg" */
const perKgTesto = (v) => `${numero(v, 1)} g per kg`;

/** Le frasi gentili quando un valore su misura esce dalle regole */
const FRASI = {
  p: { alto: "Più di quante il corpo ne usi.", basso: "Poche per stare in forma." },
  g: { alto: "Più del consigliato.", basso: "Pochi: servono per ormoni e vitamine." },
  c: { basso: "Pochi: danno energia a cervello e muscoli." },
};
export const fraseFuori = (k, f) => `${FRASI[k][f.stato]} Di solito: ${f.consiglio}.`;

/** Le kcal su cui calcolare i grammi: quanto puoi mangiare in un giorno senza attività */
const kcalBase = () => R.pianoKcal();

/**
 * @param onSalvato  () => …  dopo il salvataggio (per ridisegnare Io)
 */
export function apriMacro({ onSalvato } = {}) {
  const p = store.profilo() ?? {};
  const kcal = kcalBase();
  let suMisura = R.macroSuMisura();
  let allenamento = Array.isArray(p.allenamento) ? [...p.allenamento] : null;   // null = non ancora detto
  let perc = R.macroPer(kcal).perc;                                            // le percentuali su misura
  if (!suMisura) perc = E.ripartizione(perc);                                  // a passi di 5 se si passa a «Su misura»
  let perche = false;

  const { el, chiudi } = foglio(`
    <div class="foglio-testa"><h2 class="titolo-romano">Macronutrienti</h2><button class="tondo" data-chiudi aria-label="Chiudi">${icona("chiudi")}</button></div>
    <div class="segmenti" role="tablist">
      <button role="tab" data-modo="nutrizionista">Consigliati</button><button role="tab" data-modo="misura">Su misura</button></div>
    <div class="mac-corpo"></div>
    <button class="pillola larga" data-azione="ia">${icona("stelle")} Chiedi al legionario</button>
    <button class="pillola terra larga" data-azione="salva">Salva</button>`);

  /** Il calcolo con le scelte attuali del foglio */
  const calcolo = () => {
    if (suMisura) return R.macroPer(kcal, { modo: "misura", ...perc });
    const persona = R.personaMacro();
    return { ...E.macroNutrizionista({ kcal, ...persona, allenamento: allenamento ?? [] }), fuori: { p: null, g: null, c: null } };
  };

  function disegna() {
    el.querySelectorAll("[data-modo]").forEach((b) => b.setAttribute("aria-selected", String((b.dataset.modo === "misura") === suMisura)));
    const m = calcolo();
    const gr = m.grammi;
    const fuori = m.fuori;
    const avvisoRiga = (k) => (fuori[k] ? `<p class="mac-avviso">${esc(fraseFuori(k, fuori[k]))}</p>` : "");
    let righe;
    if (!suMisura) {
      const riga = (k, nome, classe, sotto) => `
        <div class="mac-riga auto"><span class="pallino ${classe}"></span><strong>${nome}<small>${sotto}</small></strong>
          <span class="grammi">${numero(gr[k])}<em>g</em></span></div>`;
      const nessuno = !!allenamento && !allenamento.length;
      righe = `
        <p class="mac-chiede">Ti alleni?<small>${allenamento ? "puoi sceglierne due" : "dimmelo, così le proteine sono giuste"}</small></p>
        <div class="mac-allena">
          <button class="chip" data-allena="nessuno" aria-pressed="${nessuno}">Nessuno</button>
          ${E.ALLENAMENTI.map((a) => `<button class="chip" data-allena="${a.id}" aria-pressed="${!!allenamento?.includes(a.id)}">${a.nome}</button>`).join("")}
        </div>
        ${striscia(m.perc)}
        <div class="mac-righe">
          ${riga("p", "Proteine", "c-prot", `${perKgTesto(m.perKg)} · ${m.perc.p}%`)}
          ${riga("g", "Grassi", "c-grassi", `${m.perc.g}% delle calorie`)}
          ${riga("c", "Carboidrati", "c-carbo", `il resto · ${m.perc.c}%`)}
        </div>
        <p class="piccolo centro mac-info">Su <b>${numero(kcal)} kcal</b> e <b>${kg(m.pesoRif)} kg</b>${m.pesoRif < R.pesoAttuale() - 0.05 ? " (peso di riferimento)" : ""}. Se cambiano peso o calorie, i grammi si aggiornano da soli.</p>
        <button class="mac-perche" data-azione="perche" aria-expanded="${perche}">Perché questi numeri?</button>
        ${perche ? `<p class="mac-spiega">Seguono le linee guida italiane sulla nutrizione. Le <b>proteine</b> dipendono dal peso (da 1 a 2,2 g per kg: di più se ti alleni, soprattutto coi pesi, e quando sei a dieta, per tenere i muscoli). I <b>grassi</b> sono il 30% delle calorie. I <b>carboidrati</b> sono il resto, mai meno di 130 g.${m.pesoRif < R.pesoAttuale() - 0.05 ? " Con qualche chilo in più si usa un peso di riferimento: le proteine non servono per il grasso." : ""}<br><b>Non sostituiscono un medico o un nutrizionista</b>: per dubbi sulla tua salute, chiedi a loro.</p>` : ""}`;
    } else {
      const riga = (k, nome, classe, sotto) => `
        <div class="mac-riga ${fuori[k] ? "fuori" : ""}"><span class="pallino ${classe}"></span><strong>${nome}<small>${sotto}</small></strong>
          <button class="mini" data-meno="${k}" aria-label="${nome}: 5% in meno">−</button><span class="perc">${perc[k]}%</span>
          <button class="mini" data-piu="${k}" aria-label="${nome}: 5% in più">+</button>${avvisoRiga(k)}</div>`;
      righe = `
        ${striscia(perc)}
        <div class="mac-righe">
          ${riga("p", "Proteine", "c-prot", `${numero(gr.p)} g · ${perKgTesto(m.perKg)}`)}
          ${riga("g", "Grassi", "c-grassi", `${numero(gr.g)} g al giorno`)}
          <div class="mac-riga resto ${fuori.c ? "fuori" : ""}"><span class="pallino c-carbo"></span><strong>Carboidrati<small>il resto · ${numero(gr.c)} g</small></strong>
            <span></span><span class="perc">${perc.c}%</span><span></span>${avvisoRiga("c")}</div>
        </div>
        <p class="piccolo centro">Grammi sul tuo obiettivo di ${numero(kcal)} kcal. −/+ di 5 in 5.</p>
        <button class="mac-perche" data-modo="nutrizionista">Torna ai valori consigliati</button>`;
    }
    el.querySelector(".mac-corpo").innerHTML = righe;
  }

  el.addEventListener("click", (e) => {
    const modo = e.target.closest("[data-modo]")?.dataset.modo;
    if (modo) { suMisura = modo === "misura"; return disegna(); }
    const allena = e.target.closest("[data-allena]")?.dataset.allena;
    if (allena) {
      if (allena === "nessuno") allenamento = [];
      else {
        const a = new Set(allenamento ?? []);
        a.has(allena) ? a.delete(allena) : a.add(allena);
        allenamento = [...a];
      }
      return disegna();
    }
    const meno = e.target.closest("[data-meno]")?.dataset.meno;
    const piu = e.target.closest("[data-piu]")?.dataset.piu;
    if (meno || piu) {
      const k = meno || piu;
      const prima = perc;
      perc = E.ripartizione({ ...perc, [k]: perc[k] + (piu ? 5 : -5) });
      if (perc.p === prima.p && perc.g === prima.g) navigator.vibrate?.(10);   // già al limite
      disegna();
    }
    const a = e.target.closest("[data-azione]")?.dataset.azione;
    if (a === "perche") { perche = !perche; disegna(); }
    if (a === "ia") apriAiuto((proposta) => { perc = E.ripartizione(proposta); suMisura = true; disegna(); }, allenamento);
    if (a === "salva") {
      const nuovo = { ...(store.profilo() ?? {}), macro: suMisura ? { modo: "misura", p: perc.p, g: perc.g } : { modo: "nutrizionista" } };
      if (allenamento) nuovo.allenamento = allenamento;
      store.salvaProfilo(nuovo);
      avviso(suMisura ? `Macronutrienti su misura: ${testoMacro(perc)}` : "Macronutrienti consigliati");
      chiudi();
      onSalvato?.();
    }
  });

  disegna();
}

/** Il foglio «Chiedi al legionario»: descrivi la dieta, l'IA propone */
function apriAiuto(onUsa, allenamento) {
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
        ${(() => {   // anche la proposta dell'IA passa dagli stessi controlli dei nutrizionisti
          const fuori = R.macroPer(kcalBase(), { modo: "misura", ...proposta }).fuori;
          return Object.entries(fuori).filter(([, f]) => f).map(([k, f]) => `<p class="mac-avviso">${esc(fraseFuori(k, f))}</p>`).join("");
        })()}
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
        pesoObiettivo: p.pesoObiettivo, kcal: kcalBase(), ritmo: R.ritmo(),
        allenamento: E.tipoAllenamento(allenamento ?? p.allenamento),
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
