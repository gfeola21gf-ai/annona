/* =========================================================
   aggiungi.js — AGGIUNGI un pasto o un'attività, il più in fretta possibile.

   PASTO, quattro strade:
     1. 🎤 voce → testo → l'IA stima alimenti, grammi e kcal
     2. 📷 foto del piatto (o dell'etichetta) → l'IA la guarda e stima
     3. ▥ codice a barre → Open Food Facts → dosatore (schermate/codice.js)
     4. 🔍 ricerca: tabella interna + Open Food Facts
   Tutto finisce nel "vassoio": controlli i grammi e confermi.

   ATTIVITÀ: la descrivi (anche a voce) e l'IA stima le kcal,
   oppure scrivi tu le kcal (es. lette dall'orologio).

   MODALITÀ SCHEDA (#/aggiungi?piano=4&pasto=pranzo): stessa schermata,
   ma le voci finiscono nella scheda settimanale (il pranzo del giovedì)
   invece che nel diario.
   MODIFICA DELLA SCHEDA (…&modifica=1): il vassoio parte con il pasto della
   scheda; gli dai un nome («Colazione yogurt»), cambi quantità, togli, aggiungi, oppure svuoti; «Salva» lo sostituisce.
   PASTO PREVISTO (#/aggiungi?previsto=1&giorno=…&pasto=cena): il vassoio parte
   con la cena della scheda di quel giorno; «Mangiato» la scrive nel diario e, se
   l'hai cambiata, chiede se aggiornare anche la scheda.
   ========================================================= */

import * as store from "../dati/store.js";
import * as R from "../logica/riepilogo.js";
import { oggi, nomeGiornoRelativo } from "../logica/giorni.js";
import { cercaLocale, cercaOnline, voceDa, voceDaStima, conGrammi, normalizza, testoQuantita } from "../servizi/cibo.js";
import { apriDosatore } from "./dosatore.js";
import { stimaPasto, stimaFoto, stimaAttivita } from "../servizi/ia.js";
import { fotoInBase64 } from "../servizi/foto.js";
import { apriCodice } from "./codice.js";
import { dettaturaDisponibile, ascolta } from "../servizi/voce.js";
import { icona } from "../grafica/icone.js";
import { esc, numero, avviso, foglio, leggiNumero } from "../ui.js";
import { PASTI } from "./oggi.js";
import * as P from "../logica/piano.js";

/** "la cena", "il pranzo", "lo spuntino", "la colazione" */
const CON_ARTICOLO = { colazione: "la colazione", pranzo: "il pranzo", cena: "la cena", spuntino: "lo spuntino" };

/** Il pasto più probabile in base all'ora */
function pastoDellOra(d = new Date()) {
  const h = d.getHours() + d.getMinutes() / 60;
  return h < 10.5 ? "colazione" : h < 15 ? "pranzo" : h < 18.5 ? "spuntino" : "cena";
}

/** Gli ultimi alimenti usati (per ritrovarli subito) */
function recenti() {
  const visti = new Set();
  return store.elenco("diario")
    .filter((v) => v.per100)
    .sort((a, b) => String(b.creato_il).localeCompare(String(a.creato_il)))
    .filter((v) => { const n = normalizza(v.nome); if (visti.has(n)) return false; visti.add(n); return true; })
    .slice(0, 30)
    .map((v) => ({ nome: v.nome, per100: v.per100, porzione: v.grammi, fonte: v.fonte }));
}

export function mostra(el, parametri, { vai }) {
  const giorno = parametri.giorno || oggi();
  const piano = Number(parametri.piano) || 0;     // 1-7 = stiamo riempiendo la scheda di quel giorno
  const modifica = Boolean(piano && parametri.modifica && parametri.pasto);        // modifico un pasto della scheda
  const previsto = Boolean(!piano && parametri.previsto && parametri.pasto);       // registro un pasto previsto
  const gScheda = piano || P.giornoSettimana(giorno);                               // il giorno della scheda coinvolto
  let tipo = parametri.tipo === "attivita" && !piano && !previsto ? "attivita" : "pasto";
  let pasto = parametri.pasto || pastoDellOra();
  const daScheda = new WeakSet();   // le voci che arrivano dalla scheda (etichetta "scheda")
  const originale = modifica || previsto ? P.vociDi(gScheda, pasto).map((v) => ({ ...v })) : [];
  let vassoio = originale.map((v) => { const c = { ...v }; daScheda.add(c); return c; });   // le voci pronte
  let confermaSvuota = false;
  let risultati = [];               // risultati della ricerca
  let ricerca = "";
  let smettiDiAscoltare = null;
  let attesaRicerca = null;
  let stimaAtt = null;              // {descrizione, minuti, kcal} proposto dall'IA
  let dettato = "";                 // il testo dettato o scritto nel riquadro
  let stimaInCorso = false;         // c'è già una richiesta all'IA in viaggio?
  let fotoInVista = null;           // l'indirizzo della foto che l'IA sta guardando (per mostrarla)
  let etichetta = false;            // la prossima foto è l'etichetta di un prodotto?
  const daFoto = new WeakSet();     // le voci del vassoio stimate da una foto (per la piccola fotocamera)
  let chiudiCodice = null;

  /* ---------- disegno ---------- */
  function disegna() {
    const nomePasto = PASTI.find((p) => p.id === pasto).nome.toLowerCase().replace("spuntini", "spuntino");
    const nomeGiornoScheda = P.NOMI_GIORNI[gScheda - 1].toLowerCase();
    const titolo = modifica ? `${nomePasto} · ${P.SIGLE_GIORNI[piano - 1]}` : previsto ? nomePasto : piano ? "Al piano" : "Aggiungi";
    const totale = numero(vassoio.reduce((t, v) => t + v.kcal, 0));
    el.innerHTML = `
      <div class="aggiungi">
        <header class="intest">
          <a class="tondo" href="${modifica ? "#/razioni" : piano ? `#/razioni?g=${piano}` : `#/?giorno=${giorno}`}" aria-label="Indietro">${icona("indietro")}</a>
          <h1 class="titolo-romano">${esc(titolo)}</h1>
          <span class="tondo invisibile"></span>
        </header>
        ${modifica ? `<button class="nome-pasto-riga" data-azione="nome-pasto">${icona("matita")}
            <span><small>Nome del pasto</small><strong>${esc(P.nomePasto(piano, pasto) || "Dai un nome a questo pasto")}</strong></span></button>`
        : previsto ? `<div class="dalla-scheda">${icona("rotolo")}<span>${P.nomePasto(gScheda, pasto) ? `«${esc(P.nomePasto(gScheda, pasto))}» dalla scheda` : `Dalla scheda di ${esc(nomeGiornoScheda)}`}: cambia ciò che vuoi.</span></div>`
        : piano ? `<p class="piccolo centro">Scheda di ${esc(P.NOMI_GIORNI[piano - 1].toLowerCase())}</p>` : `
        <div class="segmenti" role="tablist">
          <button role="tab" aria-selected="${tipo === "pasto"}" data-azione="tipo" data-valore="pasto">${icona("piatto")} Pasto</button>
          <button role="tab" aria-selected="${tipo === "attivita"}" data-azione="tipo" data-valore="attivita">${icona("fuoco")} Attività</button>
        </div>
        ${giorno !== oggi() ? `<p class="piccolo centro">Per: ${esc(nomeGiornoRelativo(giorno))}</p>` : ""}`}
        ${tipo === "pasto" ? corpoPasto() : corpoAttivita()}
      </div>
      <div class="piede">${tipo === "pasto"
        ? `<button class="pillola terra larga" data-azione="salva-pasto" ${vassoio.length || (modifica && originale.length) ? "" : "disabled"}>
             ${modifica ? (vassoio.length ? `Salva nella scheda · ${totale} kcal` : "Salva: pasto vuoto")
               : previsto ? `${icona("spunta")} Mangiato · ${totale} kcal`
               : piano ? `Metti nel piano · ${totale} kcal` : `Aggiungi a ${nomePasto} · ${totale} kcal`}</button>`
        : `<button class="pillola terra larga" data-azione="salva-attivita">Aggiungi attività</button>`}
      </div>`;
    if (tipo === "attivita") aggiornaPiedeAttivita();
  }

  function schedaVoce(segnaposto) {
    return `
      <section class="voce-card">
        ${fotoInVista ? `
          <div class="foto-piatto"><img src="${fotoInVista}" alt="La foto scelta">
            <span class="foto-stato"><span class="rotella"></span> ${etichetta ? "Il legionario legge l'etichetta…" : "Il legionario guarda il piatto…"}</span></div>` : ""}
        <textarea name="dettato" rows="2" placeholder="${fotoInVista ? "Una nota per aiutarlo (facoltativa)" : segnaposto}">${esc(dettato)}</textarea>
        <div class="tasti">
          ${tipo === "pasto" ? `<button class="tondo grande-tondo" data-azione="foto" aria-label="Foto del piatto" ${fotoInVista ? "disabled" : ""}>${icona("cam")}<small>Foto</small></button>
            <input type="file" accept="image/*" name="foto" hidden>` : ""}
          <button class="mic" data-azione="mic" aria-label="Detta">${icona("mic")}</button>
          ${tipo === "pasto" ? `<button class="tondo grande-tondo" data-azione="codice" aria-label="Codice a barre">${icona("bar")}<small>Codice</small></button>` : ""}
        </div>
        <button class="pillola stima" data-azione="stima" ${dettato.trim() && !fotoInVista ? "" : "hidden"}>${icona("stelle")} Stima con l'IA</button>
      </section>`;
  }

  function corpoPasto() {
    const inModifica = modifica || previsto;
    const vassoioHtml = vassoio.length ? `
        <h2 class="sopra">${modifica ? "Nel pasto" : "Nel vassoio"}</h2>
        <div class="vassoio">${vassoio.map((v, i) => `
          <div class="voce" data-i="${i}">
            <div class="voce-nome"><strong>${esc(v.nome)}</strong><small>${daFoto.has(v) ? `${icona("cam")} stima IA` : daScheda.has(v) ? "scheda" : v.fonte === "ia" ? "stima IA" : v.fonte === "openfoodfacts" ? "Open Food Facts" : v.fonte === "manuale" ? "a mano" : "tabella"}</small></div>
            ${v.per100 ? `<button class="quantita" data-azione="dosa">${esc(testoQuantita(v))}</button>` : ""}
            <span class="kcal">${numero(v.kcal)}</span>
            <button class="tondo piccolo-tondo" data-azione="togli" aria-label="Togli">${icona("chiudi")}</button>
          </div>`).join("")}
        </div>
        ${vassoio.some((v) => daFoto.has(v))
          ? `<div class="nota-avviso">${icona("stelle")}<span>Dalla foto le quantità sono «a occhio»: tocca i grammi per correggerli.</span></div>`
          : `<p class="piccolo">${icona("stelle")} Tocca la quantità per correggerla.</p>`}`
      : inModifica ? `<p class="sotto centro">Il pasto è vuoto: aggiungi qualcosa qui sotto.</p>` : "";
    const nomePasto = PASTI.find((p) => p.id === pasto).nome.toLowerCase().replace("spuntini", "spuntino");
    const svuota = modifica && originale.length ? `<button class="svuota" data-azione="svuota">${icona("cestino")} ${confermaSvuota
        ? "Tocca di nuovo per svuotare" : `Svuota ${CON_ARTICOLO[pasto]} del ${P.NOMI_GIORNI[gScheda - 1].toLowerCase()}`}</button>` : "";
    const cerca = `
      <label class="cerca">${icona("cerca")}
        <input type="search" name="cerca" placeholder="Cerca un alimento o un prodotto" autocomplete="off" value="${esc(ricerca)}"></label>
      <div class="risultati">${elencoRisultati()}</div>`;
    // Modifica di un pasto: prima le sue voci (le vedi subito), poi gli strumenti per aggiungere
    if (inModifica) return `${vassoioHtml}
      ${modifica && vassoio.length ? `<button class="mini-pulsante copia-pasto" data-azione="copia-pasto">${icona("copia")} Copia su altri giorni…</button>` : ""}
      ${schedaVoce("Aggiungi altro… es. un frutto, 80 g di riso")}
      ${cerca}
      ${svuota}`;
    return `
      <div class="chips">${PASTI.map((p) =>
        `<button class="chip ${p.id === pasto ? "attiva" : ""}" data-azione="pasto" data-valore="${p.id}">${p.nome === "Spuntini" ? "Spuntino" : p.nome}</button>`).join("")}</div>
      ${schedaVoce(piano ? "Cosa mangerai… es. 80 g di riso, 150 g di pollo e zucchine" : "Dimmi cosa hai mangiato… es. pasta al pomodoro e un'insalata")}
      ${cerca}
      ${vassoioHtml}`;
  }

  function elencoRisultati() {
    if (!ricerca) {
      if (modifica || previsto) return "";
      const r = recenti().slice(0, 5);
      return r.length ? `<h2 class="sopra">Usati di recente</h2>${r.map((a, i) => rigaRisultato(a, `r${i}`)).join("")}` : "";
    }
    return risultati.map((a, i) => rigaRisultato(a, i)).join("") + `
      <button class="risultato" data-azione="a-mano">
        <span class="risultato-nome"><strong>Scrivi a mano «${esc(ricerca)}»</strong><small>se conosci già le kcal</small></span>${icona("matita")}</button>`;
  }

  const rigaRisultato = (a, chiave) => `
    <button class="risultato" data-azione="scegli" data-chiave="${chiave}">
      <span class="risultato-nome"><strong>${esc(a.nome)}</strong>
        <small>${numero(a.per100.kcal)} kcal/100 g · porzione ${numero(a.porzione)} g${a.fonte === "openfoodfacts" ? " · prodotto" : ""}</small></span>
      ${icona("piu")}</button>`;

  function corpoAttivita() {
    return `
      ${schedaVoce("Descrivi l'attività… es. corsa 40 minuti, intensità media")}
      <p class="oppure"><span>oppure a mano</span></p>
      <div class="modulo">
        <label class="campo"><span>Attività</span><input type="text" name="descrizione" placeholder="Es. camminata veloce" value="${esc(stimaAtt?.descrizione ?? "")}"></label>
        <div class="campi-due">
          <label class="campo"><span>Minuti</span><input type="number" inputmode="numeric" name="minuti" placeholder="30" value="${stimaAtt?.minuti ?? ""}"></label>
          <label class="campo"><span>Kcal bruciate</span><input type="number" inputmode="numeric" name="kcal" placeholder="200" value="${stimaAtt?.kcal ?? ""}"></label>
        </div>
        ${stimaAtt ? `<p class="piccolo">${icona("stelle")} Stima dell'IA: controlla e correggi se serve.</p>` : ""}
      </div>`;
  }

  function aggiornaPiedeAttivita() {
    const kcal = Number(el.querySelector('[name="kcal"]')?.value) || 0;
    const b = el.querySelector('[data-azione="salva-attivita"]');
    b.disabled = !kcal;
    b.textContent = kcal ? `Aggiungi attività · ${numero(kcal)} kcal` : "Aggiungi attività";
  }

  /** Ridisegna solo i risultati (per non chiudere la tastiera mentre scrivi) */
  const ridisegnaRisultati = () => { el.querySelector(".risultati").innerHTML = elencoRisultati(); };

  /* ---------- azioni ---------- */
  /** Mette le voci nel vassoio. Se un alimento c'è già (stesso nome), somma i grammi invece di duplicarlo. */
  function aggiungiAlVassoio(voci) {
    for (const v of voci) {
      const i = vassoio.findIndex((x) => normalizza(x.nome) === normalizza(v.nome) && x.per100 && v.per100);
      if (i >= 0) sostituisci(i, conGrammi(vassoio[i], vassoio[i].grammi + v.grammi));
      else vassoio.push(v);
    }
    ricerca = ""; risultati = [];
    disegna();
    el.querySelector(".vassoio")?.scrollIntoView({ behavior: "smooth", block: "center" });   // fai vedere dove è finito
  }

  /** Cambia una voce del vassoio ricordando se veniva da una foto o dalla scheda */
  function sostituisci(i, nuova) {
    if (daFoto.has(vassoio[i])) daFoto.add(nuova);
    if (daScheda.has(vassoio[i])) daScheda.add(nuova);
    vassoio[i] = nuova;
  }

  /** La foto del piatto (o dell'etichetta) → l'IA → il vassoio */
  async function stimaDaFoto(file) {
    if (stimaInCorso) return;
    stimaInCorso = true;
    smettiDiAscoltare?.();
    fotoInVista = URL.createObjectURL(file);
    disegna();
    el.querySelector(".voce-card").scrollIntoView({ behavior: "smooth", block: "center" });
    try {
      const foto = await fotoInBase64(file, 1600);
      const nota = [etichetta ? "Questa è l'etichetta di un prodotto confezionato." : "", dettato.trim()].filter(Boolean).join(" ");
      const alimenti = await stimaFoto(foto, nota);
      if (!alimenti.length) throw new Error(etichetta ? "Non riesco a leggere l'etichetta: prova più da vicino, con più luce." : "Non vedo cibo in questa foto: riprova o descrivilo a voce.");
      dettato = "";
      const voci = alimenti.map(voceDaStima);
      voci.forEach((v) => daFoto.add(v));
      chiudiFoto();
      aggiungiAlVassoio(voci);
    } catch (err) {
      chiudiFoto();
      disegna();
      avviso(err.message, "errore");
    } finally {
      stimaInCorso = false;
    }
  }

  function chiudiFoto() {
    if (fotoInVista) URL.revokeObjectURL(fotoInVista);
    fotoInVista = null;
    etichetta = false;
  }

  /** Il codice a barre: prodotto trovato → dosatore con la porzione del produttore */
  function codice() {
    smettiDiAscoltare?.();
    chiudiCodice = apriCodice({
      onTrovato: (alimento) => {
        const pz = alimento.per100.pezzo;
        apriDosatore(voceDa(alimento, alimento.porzione), {
          // "3 biscotti (28 g)" lo mostriamo com'è; "47.5 g" lo riscriviamo all'italiana
          sotto: pz ? `Open Food Facts · 1 porzione = ${/[a-z]{2,}/i.test(alimento.porzioneTesto) ? alimento.porzioneTesto : `${numero(pz.g, Number.isInteger(pz.g) ? 0 : 1)} g`}`
            : "Open Food Facts · valori per 100 g",
          onConferma: (v) => aggiungiAlVassoio([v]),
        });
      },
      onCercaNome: () => { const c = el.querySelector('[name="cerca"]'); c.focus(); c.scrollIntoView({ block: "center" }); },
      onAMano: () => { ricerca = ""; aMano(); },
      onFotoEtichetta: () => { etichetta = true; el.querySelector('[name="foto"]').click(); },
    });
  }

  async function stima() {
    const area = el.querySelector('[name="dettato"]');
    const testo = area.value.trim();
    // Una stima alla volta: se ne parte una seconda (es. fine dettatura + tocco sul pulsante) la ignoriamo,
    // altrimenti gli alimenti finirebbero due volte nel vassoio.
    if (!testo || stimaInCorso) return;
    stimaInCorso = true;
    const pulsante = el.querySelector('[data-azione="stima"]');
    pulsante.disabled = true;
    pulsante.innerHTML = `<span class="rotella"></span> ${tipo === "pasto" ? "Il legionario pesa le razioni…" : "Il legionario fa i conti…"}`;
    try {
      if (tipo === "pasto") {
        const alimenti = await stimaPasto(testo);
        if (!alimenti.length) throw new Error("Non ho riconosciuto alimenti: prova a descrivere meglio.");
        dettato = "";
        aggiungiAlVassoio(alimenti.map(voceDaStima));
      } else {
        stimaAtt = await stimaAttivita(testo, R.pesoAttuale());
        dettato = "";
        disegna();
      }
    } catch (err) {
      avviso(err.message, "errore");
      pulsante.disabled = false;
      pulsante.innerHTML = `${icona("stelle")} Stima con l'IA`;
    } finally {
      stimaInCorso = false;
    }
  }

  function microfono() {
    const area = el.querySelector('[name="dettato"]');
    const mic = el.querySelector(".mic");
    if (smettiDiAscoltare) { smettiDiAscoltare(); return; }
    if (!dettaturaDisponibile()) {
      area.focus();
      avviso("Tocca il microfono 🎤 sulla tastiera e parla.");
      return;
    }
    mic.classList.add("ascolta");
    mic.innerHTML = icona("stop");
    smettiDiAscoltare = ascolta({
      onTesto: (t) => { area.value = dettato = t; mostraStima(); },
      onErrore: (m) => { avviso(m, "errore"); area.focus(); },
      onFine: (t) => {
        smettiDiAscoltare = null;
        mic.classList.remove("ascolta");
        mic.innerHTML = icona("mic");
        if (t.trim()) stima();          // appena finisci di parlare, parte la stima
      },
    });
  }

  const mostraStima = () => {
    const area = el.querySelector('[name="dettato"]');
    el.querySelector('[data-azione="stima"]').hidden = !area.value.trim() || !!fotoInVista;
  };

  function cerca(testo) {
    ricerca = testo.trim();
    risultati = cercaLocale(ricerca, recenti());
    ridisegnaRisultati();
    clearTimeout(attesaRicerca);
    if (ricerca.length < 3) return;
    const cercato = ricerca;
    attesaRicerca = setTimeout(async () => {
      const online = await cercaOnline(cercato);
      if (cercato !== ricerca) return;              // nel frattempo hai scritto altro
      const nomi = new Set(risultati.map((r) => normalizza(r.nome)));
      risultati = [...risultati, ...online.filter((o) => o.per100?.kcal >= 0 && !nomi.has(normalizza(o.nome)))].slice(0, 14);
      ridisegnaRisultati();
    }, 500);
  }

  function aMano() {
    const { el: f, chiudi } = foglio(`
      <div class="foglio-testa"><h2 class="titolo-romano">A mano</h2><button class="tondo" data-chiudi aria-label="Chiudi">${icona("chiudi")}</button></div>
      <form class="modulo">
        <label class="campo"><span>Alimento</span><input name="nome" value="${esc(ricerca)}" required></label>
        <div class="campi-due">
          <label class="campo"><span>Grammi (facoltativo)</span><input type="number" inputmode="numeric" name="grammi" placeholder="100"></label>
          <label class="campo"><span>Kcal totali</span><input type="number" inputmode="numeric" name="kcal" required></label>
        </div>
        <button class="pillola terra larga">Metti nel vassoio</button>
      </form>`);
    f.querySelector("form").addEventListener("submit", (e) => {
      e.preventDefault();
      const fm = e.target;
      const kcal = Number(fm.kcal.value), grammi = Number(fm.grammi.value) || 0;
      if (!fm.nome.value.trim() || !(kcal >= 0)) return;
      const voce = grammi
        ? voceDa({ nome: fm.nome.value.trim(), per100: { kcal: (kcal / grammi) * 100, p: 0, c: 0, g: 0 }, fonte: "manuale" }, grammi)
        : { nome: fm.nome.value.trim(), grammi: 0, kcal: Math.round(kcal), proteine: 0, carboidrati: 0, grassi: 0, per100: null, fonte: "manuale" };
      chiudi();
      aggiungiAlVassoio([voce]);
    });
  }

  /** Che cosa è cambiato rispetto alla scheda: ["− insalata", "~ manzo: 180 g → 150 g", "+ Pane, 30 g"] */
  function cambiamenti() {
    const chiave = (v) => normalizza(v.nome);
    const prima = new Map(originale.map((v) => [chiave(v), v]));
    const dopo = new Map(vassoio.map((v) => [chiave(v), v]));
    const righe = [];
    for (const [k, v] of prima) if (!dopo.has(k)) righe.push(`− ${v.nome}`);
    for (const [k, v] of dopo) {
      const p = prima.get(k);
      if (!p) righe.push(`+ ${v.nome}, ${testoQuantita(v)}`);
      else if (Math.round(p.grammi) !== Math.round(v.grammi) || p.kcal !== v.kcal) righe.push(`~ ${v.nome}: ${testoQuantita(p)} → ${testoQuantita(v)}`);
    }
    return righe;
  }

  /** Il NOME DEL PASTO della scheda («Colazione yogurt»): anche per gli altri giorni con lo stesso pasto */
  function nomina() {
    const uguali = P.giorniUguali(piano, pasto);
    const scelti = new Set(uguali);
    const attuale = P.nomePasto(piano, pasto);
    const { el: f, chiudi } = foglio(`
      <div class="foglio-testa"><h2 class="titolo-romano">Nome del pasto</h2><button class="tondo" data-chiudi aria-label="Chiudi">${icona("chiudi")}</button></div>
      <p class="sotto">Negli elenchi vedrai questo nome al posto della lista degli alimenti. Toccando il pasto li ritrovi tutti.</p>
      <form class="modulo">
        <label class="campo campo-nome"><span>Nome</span><input name="nome" value="${esc(attuale)}" maxlength="40" autocomplete="off"
          placeholder="Es. ${esc(CON_ARTICOLO[pasto].split(" ")[1].replace(/^./, (c) => c.toUpperCase()))} yogurt"></label>
        ${uguali.length ? `
          <p class="piccolo">Stesso pasto anche in questi giorni: diamo lo stesso nome?</p>
          <div class="scelta-giorni">${uguali.map((g) => `<button type="button" class="chip" data-g="${g}" aria-pressed="true">${P.SIGLE_GIORNI[g - 1]}</button>`).join("")}</div>` : ""}
        <button class="pillola terra larga">Salva il nome</button>
        ${attuale ? `<button type="button" class="dos-rimuovi" data-togli-nome>${icona("cestino")} Togli il nome (torna l'elenco)</button>` : ""}
      </form>`);
    const campo = f.querySelector("input");
    campo.focus();
    f.addEventListener("click", (e) => {
      const c = e.target.closest("[data-g]");
      if (c) { const g = Number(c.dataset.g); scelti.has(g) ? scelti.delete(g) : scelti.add(g); c.setAttribute("aria-pressed", String(scelti.has(g))); }
      if (e.target.closest("[data-togli-nome]")) { P.nominaPasto([piano], pasto, ""); chiudi(); disegna(); }
    });
    f.querySelector("form").addEventListener("submit", (e) => {
      e.preventDefault();
      const nome = campo.value.trim();
      P.nominaPasto([piano, ...scelti], pasto, nome);
      avviso(nome ? `Nome «${nome}»${scelti.size ? ` anche per ${[...scelti].sort().map((g) => P.SIGLE_GIORNI[g - 1].toLowerCase()).join(", ")}` : ""}` : "Nome tolto");
      chiudi();
      disegna();
    });
  }

  /** Copia questo pasto (così come lo vedi, nome compreso) su altri giorni della scheda */
  function copiaSu() {
    const scelti = new Set();
    const nome = P.nomePasto(piano, pasto);
    const { el: f, chiudi } = foglio(`
      <div class="foglio-testa"><h2 class="titolo-romano">Copia ${esc(CON_ARTICOLO[pasto])}</h2><button class="tondo" data-chiudi aria-label="Chiudi">${icona("chiudi")}</button></div>
      <p class="sotto">${nome ? `«${esc(nome)}»` : `${esc(CON_ARTICOLO[pasto].replace(/^./, (c) => c.toUpperCase()))} del ${esc(P.NOMI_GIORNI[piano - 1].toLowerCase())}`}
        andrà in questi giorni, al posto di quello che c'è adesso.</p>
      <div class="scegli-giorni">
        ${P.SIGLE_GIORNI.map((s, i) => `<button class="chip" data-g="${i + 1}" ${i + 1 === piano ? "disabled" : ""} aria-pressed="false">${s}</button>`).join("")}
      </div>
      <button class="pillola terra larga" data-copia disabled>Scegli i giorni</button>`);
    const pulsante = f.querySelector("[data-copia]");
    f.addEventListener("click", (e) => {
      const chip = e.target.closest("[data-g]");
      if (chip && !chip.disabled) {
        const g = Number(chip.dataset.g);
        scelti.has(g) ? scelti.delete(g) : scelti.add(g);
        chip.setAttribute("aria-pressed", String(scelti.has(g)));
        pulsante.disabled = !scelti.size;
        pulsante.textContent = scelti.size ? `Copia su ${[...scelti].sort().map((x) => P.SIGLE_GIORNI[x - 1].toLowerCase()).join(", ")}` : "Scegli i giorni";
      }
      if (e.target.closest("[data-copia]") && scelti.size) {
        P.copiaPasto(pasto, vassoio, [...scelti], nome);
        chiudi();
        avviso(`Copiato su ${[...scelti].sort().map((x) => P.NOMI_GIORNI[x - 1].toLowerCase()).join(", ")}`);
      }
    });
  }

  /** Pasto previsto: nel diario, e se è cambiato chiede se aggiornare anche la scheda */
  function salvaPrevisto() {
    const registra = (anche) => {
      const adesso = new Date().toISOString();
      store.salvaTante("diario", vassoio.map((v) => ({ ...P.pulisciVoce(v), giorno, pasto, creato_il: adesso })));
      if (anche) P.impostaVoci(gScheda, pasto, vassoio);
      avviso(`${PASTI.find((p) => p.id === pasto).nome}: ${numero(vassoio.reduce((t, v) => t + v.kcal, 0))} kcal${anche ? " · scheda aggiornata" : ""}`);
      vai(`#/?giorno=${giorno}`);
    };
    const cambi = cambiamenti();
    if (!cambi.length) { registra(false); return; }
    const nomePasto = PASTI.find((p) => p.id === pasto).nome.toLowerCase().replace("spuntini", "spuntino");
    const nomeGiorno = P.NOMI_GIORNI[gScheda - 1].toLowerCase();
    const { el: f, chiudi } = foglio(`
      <div class="foglio-testa"><h2 class="titolo-romano">Anche nella scheda?</h2><button class="tondo" data-chiudi aria-label="Chiudi">${icona("chiudi")}</button></div>
      <p class="sotto">Hai cambiato ${CON_ARTICOLO[pasto]} rispetto alla scheda. Vuoi che d'ora in poi sia così ogni <b>${esc(nomeGiorno)}</b>?</p>
      <div class="cambi">${cambi.map(esc).join("<br>")}</div>
      <button class="pillola terra larga" data-scelta="si">Sì, aggiorna la scheda del ${esc(nomeGiorno)}</button>
      <button class="pillola larga" data-scelta="no">No, solo per oggi</button>`);
    f.addEventListener("click", (e) => {
      const s = e.target.closest("[data-scelta]")?.dataset.scelta;
      if (!s) return;
      chiudi();
      registra(s === "si");
    });
  }

  function salvaPasto() {
    if (modifica) {
      P.impostaVoci(piano, pasto, vassoio);
      avviso(vassoio.length ? `Scheda di ${P.NOMI_GIORNI[piano - 1].toLowerCase()} aggiornata: ${numero(vassoio.reduce((t, v) => t + v.kcal, 0))} kcal` : "Pasto svuotato");
      vai("#/razioni");
      return;
    }
    if (previsto) { salvaPrevisto(); return; }
    if (piano) {
      P.aggiungiVoci(piano, pasto, vassoio);
      avviso(`Nella scheda di ${P.NOMI_GIORNI[piano - 1].toLowerCase()}: ${numero(vassoio.reduce((t, v) => t + v.kcal, 0))} kcal`);
      vai(`#/razioni?g=${piano}`);
      return;
    }
    const adesso = new Date().toISOString();
    store.salvaTante("diario", vassoio.map((v) => ({ ...v, giorno, pasto, creato_il: adesso })));
    const tot = vassoio.reduce((t, v) => t + v.kcal, 0);
    avviso(`Aggiunto: ${numero(tot)} kcal`);
    vai(`#/?giorno=${giorno}`);
  }

  function salvaAttivita() {
    const v = (n) => el.querySelector(`[name="${n}"]`).value.trim();
    const kcal = Math.round(leggiNumero(v("kcal")));
    if (!kcal) return;
    store.salva("attivita", {
      giorno,
      descrizione: v("descrizione") || "Attività",
      minuti: Math.round(leggiNumero(v("minuti"))) || null,
      kcal,
      fonte: stimaAtt && Number(stimaAtt.kcal) === kcal ? "ia" : "manuale",
      creato_il: new Date().toISOString(),
    });
    avviso(`Attività aggiunta: +${numero(kcal)} kcal al fabbisogno`);
    vai(`#/?giorno=${giorno}`);
  }

  /* ---------- ascoltatori ---------- */
  el.addEventListener("click", (e) => {
    const b = e.target.closest("[data-azione]");
    if (!b || b.disabled) return;
    const a = b.dataset.azione;
    if (a === "tipo") { tipo = b.dataset.valore; dettato = ""; disegna(); }
    if (a === "pasto") { pasto = b.dataset.valore; disegna(); }
    if (a === "mic") microfono();
    if (a === "stima") stima();
    if (a === "foto") { etichetta = false; el.querySelector('[name="foto"]').click(); }
    if (a === "codice") codice();
    if (a === "a-mano") aMano();
    if (a === "togli") { vassoio.splice(Number(b.closest(".voce").dataset.i), 1); disegna(); }
    if (a === "nome-pasto") nomina();
    if (a === "copia-pasto") copiaSu();
    if (a === "svuota") {
      if (!confermaSvuota) { confermaSvuota = true; disegna(); return; }
      vassoio = []; salvaPasto();
    }
    if (a === "dosa") {
      const i = Number(b.closest(".voce").dataset.i);
      apriDosatore(vassoio[i], {
        onConferma: (nuova) => { sostituisci(i, nuova); disegna(); },
        onRimuovi: () => { vassoio.splice(i, 1); disegna(); },
      });
    }
    if (a === "scegli") {
      const k = b.dataset.chiave;
      const alimento = k.startsWith("r") ? recenti()[Number(k.slice(1))] : risultati[Number(k)];
      // si apre subito il dosatore, già impostato sulla porzione tipica: scegli e confermi
      apriDosatore(voceDa(alimento, alimento.porzione || 100), { onConferma: (v) => aggiungiAlVassoio([v]) });
    }
    if (a === "salva-pasto") salvaPasto();
    if (a === "salva-attivita") salvaAttivita();
  });

  el.addEventListener("change", (e) => {
    if (e.target.name !== "foto") return;
    const file = e.target.files?.[0];
    e.target.value = "";               // così si può riscegliere la stessa foto
    if (file) stimaDaFoto(file); else etichetta = false;
  });

  el.addEventListener("input", (e) => {
    if (e.target.name === "dettato") { dettato = e.target.value; mostraStima(); }
    if (e.target.name === "cerca") cerca(e.target.value);
    if (e.target.name === "kcal" && tipo === "attivita") aggiornaPiedeAttivita();
  });

  disegna();
  return () => { smettiDiAscoltare?.(); clearTimeout(attesaRicerca); chiudiCodice?.(); chiudiFoto(); };
}
