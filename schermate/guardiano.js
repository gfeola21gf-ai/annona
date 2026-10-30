/* =========================================================
   guardiano.js (schermate) — il GUARDIANO DEL METABOLISMO.

   riquadroGuardiano()  → l'avviso in Oggi (solo se serve, mai obbligatorio)
   apriPausa()          → il foglio per iniziare (o interrompere) la pausa dalla dieta
   apriPercorso()       → «Valuta il mio percorso»: i numeri dell'app + il giudizio dell'IA
   I conti stanno in logica/guardiano.js.
   ========================================================= */

import * as G from "../logica/guardiano.js";
import * as R from "../logica/riepilogo.js";
import { chiediPercorso } from "../servizi/ia.js";
import { nomeGiorno, aggiungiGiorni, oggi } from "../logica/giorni.js";
import { icona } from "../grafica/icone.js";
import { esc, numero, conSegno, foglio, avviso } from "../ui.js";
import { testoFattore } from "./movimento.js";

const kgTesto = (n) => conSegno(n, 1).replace(".", ",");

/** L'avviso in Oggi, oppure "" se non c'è niente da dire (o se hai detto «Non ora») */
export function riquadroGuardiano() {
  const s = G.stato();
  if (!s.avviso) return "";
  if (s.avviso === "taratura") {
    const t = s.taratura, st = s.stallo;
    return `
    <section class="guardiano" aria-label="Il guardiano del metabolismo">
      <div class="guardiano-testa"><span class="ic-tondo">${icona("scudo")}</span>
        <span><strong>Il guardiano veglia</strong><small>Taratura dai tuoi dati</small></span></div>
      <p>In 3 settimane hai mangiato in media ${numero(st.mangiatoMedio)} kcal e il peso è cambiato di ${kgTesto(st.reale)} kg:
        senza allenamenti consumi circa <b>${numero(t.quotidianoReale)} kcal</b>, cioè un livello più vicino a
        <b>${t.livello.nome} (${testoFattore(t.livello.fattore)})</b>${t.attuale ? ` che a ${t.attuale.nome}` : ""}.</p>
      <div class="azioni">
        ${t.attuale ? `<button class="pillola" data-azione="taratura-tieni">Tieni ${t.attuale.nome}</button>` : ""}
        <button class="pillola terra" data-azione="taratura-passa" data-livello="${t.livello.id}">Passa a ${t.livello.nome}</button>
      </div>
      <button class="non-ora" data-azione="taratura-nonora">Non ora · ricordamelo tra una settimana</button>
    </section>`;
  }
  const testo = s.avviso === "stallo"
    ? `Da <b>3 settimane</b> il peso è quasi fermo (${kgTesto(s.stallo.reale)} kg), mentre dalle calorie registrate ti aspettavi circa <b>${kgTesto(s.stallo.atteso)} kg</b>. Hai registrato ${s.stallo.giorniRegistrati} giorni su 21.`
    : `<b>${s.settimane} settimane</b> di deficit di fila: una pausa di 1–2 settimane al fabbisogno aiuta fame, energia e costanza.`;
  return `
    <section class="guardiano" aria-label="Il guardiano del metabolismo">
      <div class="guardiano-testa"><span class="ic-tondo">${icona("scudo")}</span>
        <span><strong>Il guardiano veglia</strong><small>${s.avviso === "stallo" ? "Possibile stallo" : "Tempo di una pausa?"}</small></span></div>
      <p>${testo}</p>
      <div class="azioni">
        <button class="pillola" data-azione="guardiano-ia">${icona("stelle")} Valuta con l'IA</button>
        <button class="pillola terra" data-azione="guardiano-pausa">Pausa dalla dieta</button>
      </div>
      <button class="non-ora" data-azione="guardiano-nonora">Non ora · ricordamelo tra una settimana</button>
    </section>`;
}

/**
 * Il foglio della pausa: scegli 7 o 14 giorni (o la interrompi se è in corso).
 * @param giorni   la durata proposta (7 o 14)
 * @param onFatto  () => … per ridisegnare
 */
export function apriPausa({ giorni = 14, onFatto } = {}) {
  const inCorso = R.pausaDel();
  if (inCorso) {
    const { numero: n, totale } = G.giornoDiPausa(inCorso);
    const { el, chiudi } = foglio(`
      <div class="foglio-testa"><h2 class="titolo-romano">Pausa dalla dieta</h2><button class="tondo" data-chiudi aria-label="Chiudi">${icona("chiudi")}</button></div>
      <p class="sotto">Sei al <b>giorno ${n} di ${totale}</b>: finisce ${esc(nomeGiorno(inCorso.fine))}. Poi torna da solo il tuo ritmo.</p>
      <button class="pillola larga" data-chiudi>Continua la pausa</button>
      <button class="dos-rimuovi" data-interrompi>Interrompi: da oggi torno al mio ritmo</button>`);
    el.querySelector("[data-interrompi]").addEventListener("click", () => {
      G.interrompiPausa();
      avviso("Pausa interrotta: da oggi si torna al tuo ritmo.");
      chiudi(); onFatto?.();
    });
    return;
  }

  let scelti = giorni === 7 ? 7 : 14;
  const adesso = R.pianoKcal();
  const inPausa = R.quotidianoDel();
  const { el, chiudi } = foglio(`
    <div class="foglio-testa"><h2 class="titolo-romano">Pausa dalla dieta</h2><button class="tondo" data-chiudi aria-label="Chiudi">${icona("chiudi")}</button></div>
    <p class="sotto">Per qualche giorno mangi quanto consumi: niente deficit, peso stabile. Aiuta fame, energia e allenamenti; poi si riparte.</p>
    <div class="scelta-giorni">
      <button class="chip" data-giorni="7">7 giorni</button>
      <button class="chip" data-giorni="14">14 giorni</button>
    </div>
    <div class="dati-percorso">
      <div><small>Obiettivo adesso</small><strong>${numero(adesso)}</strong> kcal</div>
      <div><small>Durante la pausa</small><strong>${numero(inPausa)}</strong> kcal + attività</div>
    </div>
    <p class="piccolo">${icona("stelle")} Il peso può salire di qualche etto nei primi giorni: è acqua e glicogeno, non grasso.</p>
    <button class="pillola terra larga" data-inizia></button>
    <button class="pillola larga" data-chiudi>Non ora</button>`);

  const disegna = () => {
    el.querySelectorAll("[data-giorni]").forEach((b) => b.setAttribute("aria-pressed", String(Number(b.dataset.giorni) === scelti)));
    const fine = aggiungiGiorni(oggi(), scelti - 1);
    el.querySelector("[data-inizia]").textContent = `Inizia la pausa · fino a ${nomeGiorno(fine).split(" ").slice(0, 2).join(" ")}`;
  };
  el.addEventListener("click", (e) => {
    const g = e.target.closest("[data-giorni]");
    if (g) { scelti = Number(g.dataset.giorni); disegna(); }
    if (e.target.closest("[data-inizia]")) {
      G.iniziaPausa(scelti);
      avviso(`Pausa dalla dieta: ${scelti} giorni. Buon riposo, legionario!`);
      chiudi(); onFatto?.();
    }
  });
  disegna();
}

const VERDETTI = {
  stallo: { testo: "Stallo probabile", classe: "stallo" },
  regolare: { testo: "Tutto regolare", classe: "regolare" },
  presto: { testo: "Troppo presto per dirlo", classe: "presto" },
};

/** «Valuta il mio percorso»: i numeri (calcolati dall'app) e il giudizio dell'IA */
export function apriPercorso({ onFatto } = {}) {
  const s = G.stato();
  const { el, chiudi } = foglio(`
    <div class="foglio-testa"><h2 class="titolo-romano">Il tuo percorso</h2><button class="tondo" data-chiudi aria-label="Chiudi">${icona("chiudi")}</button></div>
    <div class="dati-percorso">
      <div><small>Settimane in deficit</small><strong>${s.settimane}</strong></div>
      <div><small>Giorni registrati (3 sett.)</small><strong>${s.stallo ? `${Math.round((s.stallo.giorniRegistrati / 21) * 100)}%` : "—"}</strong></div>
      <div><small>Atteso / reale (3 sett.)</small><strong>${s.stallo ? `${kgTesto(s.stallo.atteso)} / ${kgTesto(s.stallo.reale)}` : "—"}</strong>${s.stallo ? " kg" : ""}</div>
      <div><small>Fabbisogno reale stimato</small><strong>${s.stallo ? numero(s.stallo.fabbisognoReale) : "—"}</strong>${s.stallo ? " kcal" : ""}</div>
    </div>
    <div class="percorso-giudizio"><p class="sotto prov-attesa"><span class="rotella"></span> Il legionario esamina le tue ultime settimane…</p></div>
    <p class="piccolo centro">Consiglio generale, non medico.</p>`);

  const giudizio = el.querySelector(".percorso-giudizio");
  chiediPercorso(G.riassunto())
    .then((r) => {
      const v = VERDETTI[r.verdetto] ?? VERDETTI.presto;
      const pausa = !R.pausaDel() && (r.pausaGiorni === 7 || r.pausaGiorni === 14) ? r.pausaGiorni : 0;
      giudizio.innerHTML = `
        <span class="verdetto ${v.classe}">${icona("scudo")} ${v.testo}</span>
        <p class="consiglio">${esc(r.consiglio)}</p>
        ${pausa ? `<button class="pillola terra larga" data-pausa="${pausa}">Inizia la pausa di ${pausa} giorni</button>` : ""}`;
    })
    .catch((err) => {
      giudizio.innerHTML = `<div class="nota-avviso">${icona("stelle")}<span>${esc(err.message)}</span></div>`;
    });

  el.addEventListener("click", (e) => {
    const b = e.target.closest("[data-pausa]");
    if (!b) return;
    chiudi();
    apriPausa({ giorni: Number(b.dataset.pausa), onFatto });
  });
}
