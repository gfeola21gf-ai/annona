/* =========================================================
   piano.js — la SCHEDA SETTIMANALE (le "Razioni").

   La scheda è fissa: un lunedì, un martedì… una domenica,
   che si ripetono ogni settimana finché non li cambi.
   Nel database (tabella annona_piano) c'è una riga per ogni
   giorno + pasto:
     { id, giorno_settimana: 1-7 (1 = lunedì), pasto: "pranzo",
       voci: [ {nome, grammi, kcal, proteine, carboidrati, grassi, per100, fonte}, … ] }
   Le "voci" hanno la stessa forma delle righe del diario, così
   passare dalla scheda al diario ("Mangiato ✓") è una copia.
   ========================================================= */

import * as store from "../dati/store.js";
import * as R from "./riepilogo.js";
import { daChiave, chiaveGiorno } from "./giorni.js";
import { conGrammi, normalizza } from "../servizi/cibo.js";

export const PASTI_ID = ["colazione", "pranzo", "cena", "spuntino"];
export const NOMI_GIORNI = ["Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato", "Domenica"];
export const SIGLE_GIORNI = ["LUN", "MAR", "MER", "GIO", "VEN", "SAB", "DOM"];

/** "2026-10-15" (un giovedì) → 4.   Lunedì = 1 … domenica = 7 */
export const giornoSettimana = (chiave) => daChiave(chiave).getDay() || 7;

/** Solo i campi che servono in una voce della scheda (via id, giorno, pasto del diario) */
export function pulisciVoce(v) {
  const { nome, grammi, kcal, proteine = 0, carboidrati = 0, grassi = 0, per100 = null, fonte = null } = v;
  return { nome, grammi: Math.round(grammi) || 0, kcal: Math.round(kcal) || 0, proteine, carboidrati, grassi, per100, fonte };
}

const righeDi = (g, pasto) =>
  store.elenco("piano")
    .filter((r) => Number(r.giorno_settimana) === g && r.pasto === pasto)
    .sort((a, b) => String(a.creato_il).localeCompare(String(b.creato_il)));

/** Le voci di un pasto della scheda (es. vociDi(4, "pranzo") = il pranzo del giovedì) */
export const vociDi = (g, pasto) => righeDi(g, pasto).flatMap((r) => r.voci ?? []);

/** Sostituisce le voci di un pasto della scheda (elenco vuoto = svuota il pasto) */
export function impostaVoci(g, pasto, voci) {
  const [prima, ...altre] = righeDi(g, pasto);
  altre.forEach((r) => store.elimina("piano", r.id));      // per sicurezza: una riga sola per giorno + pasto
  if (!voci.length) { if (prima) store.elimina("piano", prima.id); scriviNomi([[g, pasto, ""]]); return; }
  store.salva("piano", {
    id: prima?.id,
    giorno_settimana: g,
    pasto,
    voci: voci.map(pulisciVoce),
    creato_il: prima?.creato_il ?? new Date().toISOString(),
  });
}

/** Aggiunge voci in fondo a un pasto della scheda. Se un alimento c'è già (stesso nome), somma i grammi. */
export function aggiungiVoci(g, pasto, nuove) {
  const voci = vociDi(g, pasto);
  for (const v of nuove) {
    const i = voci.findIndex((x) => x.per100 && v.per100 && normalizza(x.nome) === normalizza(v.nome));
    if (i >= 0) voci[i] = conGrammi(voci[i], voci[i].grammi + v.grammi);
    else voci.push(v);
  }
  impostaVoci(g, pasto, voci);
}

/* ---------- PASTI SALTATI ----------
   Il ✗ rosso su un pasto previsto: «oggi questo pasto non l'ho mangiato».
   Nel profilo: saltati = {"AAAA-MM-GG": ["cena", …]}, solo gli ultimi 7 giorni
   (i previsti si vedono solo per oggi e ieri). */
export const saltato = (giorno, pasto) => Boolean(store.profilo()?.saltati?.[giorno]?.includes(pasto));

function scriviSaltati(giorno, cambia) {
  const p = store.profilo() ?? {};
  const limite = chiaveGiorno(new Date(Date.now() - 7 * 86400000));
  const saltati = Object.fromEntries(Object.entries(p.saltati ?? {}).filter(([g]) => g >= limite));
  saltati[giorno] = cambia(saltati[giorno] ?? []);
  if (!saltati[giorno].length) delete saltati[giorno];
  store.salvaProfilo({ ...p, saltati });
}
export const salta = (giorno, pasto) => scriviSaltati(giorno, (l) => [...new Set([...l, pasto])]);
export const ripristina = (giorno, pasto) => scriviSaltati(giorno, (l) => l.filter((x) => x !== pasto));

/* ---------- NOMI DEI PASTI ----------
   Un pasto della scheda può avere un nome tuo («Colazione yogurt»): negli elenchi
   compare al posto della lista degli alimenti (che resta visibile aprendo il pasto).
   Nel profilo: nomiPasti = {"1-colazione": "Colazione yogurt", …}  (1 = lunedì). */
const chiaveNome = (g, pasto) => `${g}-${pasto}`;
export const nomePasto = (g, pasto) => store.profilo()?.nomiPasti?.[chiaveNome(g, pasto)] ?? "";

/** Cambia i nomi di più pasti in un colpo solo: cambi = [[g, pasto, nome | ""], …]  ("" = togli il nome) */
function scriviNomi(cambi) {
  const p = store.profilo() ?? {};
  const nomiPasti = { ...(p.nomiPasti ?? {}) };
  let cambiato = false;
  for (const [g, pasto, nome] of cambi) {
    const k = chiaveNome(g, pasto), n = String(nome ?? "").trim().slice(0, 40);
    if ((nomiPasti[k] ?? "") === n) continue;
    if (n) nomiPasti[k] = n; else delete nomiPasti[k];
    cambiato = true;
  }
  if (cambiato) store.salvaProfilo({ ...p, nomiPasti });
}
export const nominaPasto = (giorni, pasto, nome) => scriviNomi(giorni.map((g) => [g, pasto, nome]));

/** Gli altri giorni che hanno lo STESSO pasto (stessi alimenti e grammi): a loro si può dare lo stesso nome */
const firma = (voci) => JSON.stringify(voci.map((v) => [normalizza(v.nome), Math.round(v.grammi)]).sort());
export function giorniUguali(g, pasto) {
  const voci = vociDi(g, pasto);
  if (!voci.length) return [];
  const f = firma(voci);
  return [1, 2, 3, 4, 5, 6, 7].filter((x) => x !== g && firma(vociDi(x, pasto)) === f);
}

/** Il riassunto di un pasto per gli elenchi: il suo nome, oppure gli alimenti */
export const descrizionePasto = (g, pasto, corto = false) => {
  const nome = nomePasto(g, pasto);
  if (nome) return nome;
  const voci = vociDi(g, pasto);
  return corto ? voci.map((v) => nomeCortissimo(v.nome)).join(", ") : elencoNomi(voci);
};

/** Il giorno intero: { colazione: [...], pranzo: [...], cena: [...], spuntino: [...] } */
export const giornoPiano = (g) => Object.fromEntries(PASTI_ID.map((p) => [p, vociDi(g, p)]));

export const sommaKcal = (voci) => voci.reduce((t, v) => t + (Number(v.kcal) || 0), 0);
export const totaleGiorno = (g) => sommaKcal(PASTI_ID.flatMap((p) => vociDi(g, p)));

/** C'è almeno qualcosa nella scheda? */
export const schedaVuota = () => !store.elenco("piano").some((r) => r.voci?.length);

/** Quanto puoi mangiare in un giorno senza attività per rispettare l'obiettivo (mai sotto il minimo) */
export const kcalObiettivo = () => R.pianoKcal();

/** Copia un giorno della scheda su altri giorni (che vengono sostituiti) */
export function copiaGiorno(da, verso) {
  const sorgente = giornoPiano(da);
  const nomi = [];
  for (const g of verso) {
    if (g === da) continue;
    for (const p of PASTI_ID) { impostaVoci(g, p, sorgente[p].map((v) => ({ ...v }))); nomi.push([g, p, nomePasto(da, p)]); }
  }
  scriviNomi(nomi);       // anche i nomi dei pasti viaggiano con la copia
}

/**
 * Copia UN pasto su altri giorni (quel pasto, in quei giorni, viene sostituito), nome compreso.
 * @param voci  le voci da copiare (quelle che vedi, anche se non ancora salvate)
 */
export function copiaPasto(pasto, voci, verso, nome = "") {
  for (const g of verso) impostaVoci(g, pasto, voci.map((v) => ({ ...v })));
  scriviNomi(verso.map((g) => [g, pasto, nome]));
}

/**
 * Sostituisce TUTTA la scheda (dopo l'import).
 * @param giorni  { 1: {colazione: [voci], …}, 2: {…}, … }
 */
export function sostituisciScheda(giorni) {
  for (const r of store.elenco("piano")) store.elimina("piano", r.id);
  const p = store.profilo() ?? {};
  if (p.nomiPasti && Object.keys(p.nomiPasti).length) store.salvaProfilo({ ...p, nomiPasti: {} });   // scheda nuova: nomi da rifare
  const adesso = new Date().toISOString();
  const righe = [];
  for (const [g, pasti] of Object.entries(giorni)) {
    for (const p of PASTI_ID) {
      const voci = pasti[p] ?? [];
      if (voci.length) righe.push({ giorno_settimana: Number(g), pasto: p, voci: voci.map(pulisciVoce), creato_il: adesso });
    }
  }
  if (righe.length) store.salvaTante("piano", righe);
}

/** Nome breve per gli elenchi compatti: "Riso basmati (crudo)" → "Riso basmati";  "Biscotti · Mulino" → "Biscotti" */
export const nomeBreve = (nome) => String(nome).split(" · ")[0].replace(/\s*\(.*?\)\s*/g, " ").trim();

/** "Yogurt greco 0%, Fiocchi d'avena, Mirtilli" */
export const elencoNomi = (voci) => voci.map((v) => nomeBreve(v.nome)).join(", ");

/** Il nome più corto possibile, per la tabella della settimana:
    "Petto di pollo" → "Pollo",  "Fiocchi d'avena" → "Avena",  "Yogurt greco 0%" → "Yogurt" */
export function nomeCortissimo(nome) {
  const n = nomeBreve(nome);
  const dopo = n.match(/\s(?:di|d'|d’)\s?(\S+)/i)?.[1];
  const parola = dopo || n.split(/\s+/)[0];
  return parola.charAt(0).toUpperCase() + parola.slice(1);
}
