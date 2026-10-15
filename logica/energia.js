/* =========================================================
   energia.js — il MOTORE dei calcoli energetici.

   Qui c'è solo matematica: niente schermate, niente database.
   Così i calcoli si possono provare da soli (vedi prove.html)
   e, se un giorno cambiamo formula, si cambia in un posto solo.

   Le idee chiave:
   - BASALE: le calorie che il corpo brucia a riposo in un giorno
     (formula di Mifflin-St Jeor).
   - FABBISOGNO DEL GIORNO = basale + calorie delle attività registrate.
   - BILANCIO = mangiato − fabbisogno.
       negativo → DEFICIT (perdi peso)   positivo → SURPLUS (aumenti)
   - 1 kg di peso corporeo ≈ 7700 kcal.
   ========================================================= */

import { aggiungiGiorni, etaDa, chiaveGiorno } from "./giorni.js";

export const KCAL_PER_KG = 7700;

/** Metabolismo basale (kcal/giorno) — Mifflin-St Jeor */
export function basale({ sesso, eta, altezza, peso }) {
  if (!peso || !altezza || !eta) return 0;
  const base = 10 * peso + 6.25 * altezza - 5 * eta;
  return Math.round(sesso === "F" ? base - 161 : base + 5);
}

/** Basale a partire dal profilo salvato e dal peso più recente */
export function basaleDelProfilo(profilo, pesoAttuale) {
  if (!profilo?.nascita) return 0;
  return basale({
    sesso: profilo.sesso,
    eta: etaDa(profilo.nascita),
    altezza: profilo.altezza,
    peso: pesoAttuale ?? profilo.pesoIniziale,
  });
}

/** Ritmo scelto (kg a settimana, negativo = dimagrire) → deficit/surplus al giorno */
export const kcalGiornalierePerRitmo = (kgSettimana) => Math.round((kgSettimana * KCAL_PER_KG) / 7);

/** kcal al giorno (media) → kg a settimana */
export const kgSettimanaDa = (kcalGiorno) => (kcalGiorno * 7) / KCAL_PER_KG;

/** Somma delle kcal di un elenco di voci (pasti o attività) */
export const somma = (voci) => voci.reduce((tot, v) => tot + (Number(v.kcal) || 0), 0);

/**
 * Il BILANCIO di un giorno.
 * @param basaleKcal  basale del giorno
 * @param pasti       voci del diario di quel giorno
 * @param attivita    attività di quel giorno
 * @param obiettivoKcal  bilancio voluto al giorno (es. −550 per dimagrire, +300 per aumentare)
 * @param fattore     il movimento di ogni giorno, allenamenti esclusi (LIVELLI: 1,2 … 1,7; 1 = solo basale)
 */
export function bilancioGiorno({ basaleKcal, pasti, attivita, obiettivoKcal = 0, fattore = 1 }) {
  const mangiato = Math.round(somma(pasti));
  const bruciato = Math.round(somma(attivita));
  const quotidiano = Math.round(basaleKcal * fattore);      // basale × movimento di ogni giorno
  const fabbisogno = quotidiano + bruciato;
  const bilancio = mangiato - fabbisogno;              // <0 deficit, >0 surplus
  const daMangiare = fabbisogno + obiettivoKcal;         // quanto mangiare per centrare l'obiettivo
  const restano = daMangiare - mangiato;                 // >0: puoi ancora mangiare; <0: sei oltre
  return {
    mangiato, bruciato, quotidiano, fabbisogno, bilancio, daMangiare, restano,
    percentuale: daMangiare > 0 ? mangiato / daMangiare : 0,
  };
}

/**
 * PREVISIONE: media del bilancio degli ultimi giorni COMPLETI
 * in cui hai registrato almeno un pasto (oggi escluso, perché è
 * ancora in corso), proiettata su una settimana.
 * @param giorni  [{giorno:"AAAA-MM-GG", bilancio}] solo giorni con registrazioni
 * @param oggiChiave  il giorno di oggi
 * @returns {mediaKcal, kgSettimana, giorniUsati} oppure null se mancano dati
 */
export function previsione(giorni, oggiChiave, finestra = 7) {
  const inizio = aggiungiGiorni(oggiChiave, -finestra);
  const usati = giorni.filter((g) => g.giorno < oggiChiave && g.giorno >= inizio);
  if (!usati.length) return null;
  const mediaKcal = Math.round(usati.reduce((t, g) => t + g.bilancio, 0) / usati.length);
  return { mediaKcal, kgSettimana: kgSettimanaDa(mediaKcal), giorniUsati: usati.length };
}

/**
 * MEDIA MOBILE A 7 GIORNI del peso: per ogni pesata, la media di
 * tutte le pesate dei 7 giorni precedenti (lei compresa).
 * Attenua le oscillazioni dovute all'acqua e mostra la tendenza vera.
 * @param pesate [{quando: ISO, kg}] in qualunque ordine
 * @returns [{quando, kg, media}] in ordine di tempo
 */
export function mediaMobile(pesate, giorni = 7) {
  const ordinate = [...pesate].sort((a, b) => new Date(a.quando) - new Date(b.quando));
  const finestra = giorni * 86400000;
  return ordinate.map((p, i) => {
    const t = new Date(p.quando).getTime();
    let tot = 0, n = 0;
    for (let j = i; j >= 0; j--) {
      const tj = new Date(ordinate[j].quando).getTime();
      if (t - tj >= finestra) break;
      tot += Number(ordinate[j].kg); n++;
    }
    return { ...p, kg: Number(p.kg), media: tot / n };
  });
}

/** Settimane stimate per arrivare al peso obiettivo con un certo ritmo */
export function settimaneAllObiettivo(pesoAttuale, pesoObiettivo, kgSettimana) {
  const mancano = pesoObiettivo - pesoAttuale;
  if (!kgSettimana || Math.sign(mancano) !== Math.sign(kgSettimana)) return null;
  return Math.ceil(mancano / kgSettimana);
}

/** Avanzamento verso l'obiettivo (0…1) */
export function avanzamento(pesoIniziale, pesoAttuale, pesoObiettivo) {
  const totale = pesoObiettivo - pesoIniziale;
  if (!totale) return 1;
  return Math.min(1, Math.max(0, (pesoAttuale - pesoIniziale) / totale));
}

/* ---------- IL MOVIMENTO DI OGNI GIORNO (allenamenti esclusi) ----------
   Il basale è quanto consumi immobile a letto: nessuna giornata è così.
   Il fabbisogno del giorno = basale × fattore + allenamenti registrati.
   Fattori «senza sport» (comprendono anche la digestione), come i livelli di attività
   fisica (LAF/PAL) dei LARN e della FAO, tolta la parte dovuta all'esercizio. */
export const LIVELLI = [
  { id: "molto-basso", nome: "Molto basso", fattore: 1.2, passi: "meno di 4.000 passi",
    esempio: "Quasi tutto il giorno seduto o sdraiato: smart working, auto anche per 200 metri, sera sul divano." },
  { id: "basso", nome: "Basso", fattore: 1.3, passi: "4.000–7.000 passi",
    esempio: "Lavoro d'ufficio, ma ti alzi ogni tanto; qualche commissione a piedi, un po' di faccende." },
  { id: "medio", nome: "Medio", fattore: 1.4, passi: "7.000–10.000 passi",
    esempio: "Spesso in piedi o in giro: insegnante, commesso, cammini 30–60 minuti al giorno, casa e figli." },
  { id: "alto", nome: "Alto", fattore: 1.55, passi: "10.000–13.000 passi",
    esempio: "Quasi sempre in piedi e in movimento: cameriere, infermiere, magazziniere, tanti spostamenti a piedi o in bici." },
  { id: "molto-alto", nome: "Molto alto", fattore: 1.7, passi: "più di 13.000 passi",
    esempio: "Lavoro fisico pesante tutto il giorno: muratore, agricoltore, traslochi." },
];
export const livello = (id) => LIVELLI.find((l) => l.id === id) ?? null;

/**
 * Le DOMANDE GUIDA → il livello consigliato.
 * @param r  {lavoro: 0-3, spostamenti: 0-2, casa: 0-2, passi: 0-3 | null}  (indici delle risposte)
 * @returns indice in LIVELLI (0 = molto basso … 4 = molto alto)
 */
export function livelloDalleRisposte({ lavoro = 0, spostamenti = 0, casa = 0, passi = null }) {
  const punti = [0, 1, 2, 3.5][lavoro] + [0, 0.5, 1][spostamenti] + [0, 0.5, 1][casa];
  const daDomande = punti < 0.75 ? 0 : punti < 1.75 ? 1 : punti < 2.75 ? 2 : punti < 3.75 ? 3 : 4;
  if (passi === null || passi === undefined) return daDomande;
  // i passi sono la misura più oggettiva: contano il doppio
  const daPassi = passi === 3 && lavoro === 3 ? 4 : passi;
  return Math.min(4, Math.max(0, Math.round((daDomande + daPassi * 2) / 3)));
}

/** Il livello più vicino a un fattore misurato (per la taratura) */
export const livelloVicino = (fattore) =>
  LIVELLI.reduce((m, l) => (Math.abs(l.fattore - fattore) < Math.abs(m.fattore - fattore) ? l : m));

/**
 * IL GUARDIANO: c'è uno STALLO?
 * Sulle ultime 3 settimane (oggi escluso) confronta il peso che ti aspettavi di perdere
 * dalle calorie registrate con quello perso davvero: media delle pesate della 1ª settimana
 * contro la media della 3ª (i loro "centri" distano 14 giorni).
 * Serve costanza: almeno 15 giorni registrati su 21 e almeno 2 pesate in entrambe le settimane.
 * @param giorni  [{giorno, mangiato, bilancio}] solo i giorni con pasti registrati
 * @param pesate  [{quando: ISO, kg}]
 * @returns {giorniRegistrati, atteso, reale (kg), fabbisognoReale (kcal), stallo} oppure null se mancano dati
 */
export function valutaStallo(giorni, pesate, oggiChiave, finestra = 21) {
  const inizio = aggiungiGiorni(oggiChiave, -finestra);
  const usati = giorni.filter((g) => g.giorno >= inizio && g.giorno < oggiChiave);
  const pesiTra = (da, a) => pesate.map((p) => ({ g: chiaveGiorno(p.quando), kg: Number(p.kg) }))
    .filter((p) => p.g >= da && p.g < a).map((p) => p.kg);
  const prima = pesiTra(inizio, aggiungiGiorni(inizio, 7));
  const ultima = pesiTra(aggiungiGiorni(oggiChiave, -7), oggiChiave);
  if (usati.length < 15 || prima.length < 2 || ultima.length < 2) return null;
  const media = (a) => a.reduce((t, x) => t + x, 0) / a.length;
  const distanza = finestra - 7;
  const reale = media(ultima) - media(prima);
  const atteso = (media(usati.map((g) => g.bilancio)) * distanza) / KCAL_PER_KG;
  // quanto consumi DAVVERO: quello che mangi, corretto per quanto peso hai perso o preso
  const fabbisognoReale = Math.round(media(usati.map((g) => g.mangiato)) - (reale * KCAL_PER_KG) / distanza);
  return {
    giorniRegistrati: usati.length,
    attivitaMedia: Math.round(media(usati.map((g) => Number(g.attivita) || 0))),
    mangiatoMedio: Math.round(media(usati.map((g) => g.mangiato))),
    atteso: Math.round(atteso * 10) / 10,
    reale: Math.round(reale * 10) / 10,
    fabbisognoReale,
    // stallo: ti aspettavi almeno mezzo chilo in meno, ma ne hai perso meno di un terzo
    stallo: atteso <= -0.5 && reale > atteso * 0.3,
  };
}

/* ---------- MACRONUTRIENTI ----------
   1 g di carboidrati o proteine = 4 kcal; 1 g di grassi = 9 kcal. */
export const KCAL_PER_GRAMMO = { c: 4, p: 4, g: 9 };

/** Ripartizione predefinita (in %) finché non ne scegli una tua */
export const MACRO_PREDEFINITI = { c: 40, p: 30, g: 30 };

/**
 * Percentuali sistemate: proteine e grassi a passi di 5, carboidrati = il resto (il totale fa sempre 100).
 * @param m  {p, g} (c viene ricalcolato)
 */
export function ripartizione(m = {}) {
  const passo5 = (x) => Math.min(70, Math.max(5, Math.round((Number(x) || 0) / 5) * 5));
  let p = passo5(m.p ?? MACRO_PREDEFINITI.p), g = passo5(m.g ?? MACRO_PREDEFINITI.g);
  if (p + g > 95) g = 95 - p;               // ai carboidrati resta almeno il 5%
  return { c: 100 - p - g, p, g };
}

/** Percentuali + kcal del giorno → grammi obiettivo {c, p, g} */
export function grammiMacro(kcal, perc) {
  const r = ripartizione(perc);
  const g = (k) => Math.max(0, Math.round((kcal * r[k]) / 100 / KCAL_PER_GRAMMO[k]));
  return { c: g("c"), p: g("p"), g: g("g") };
}

/** Somma dei macronutrienti mangiati (grammi) */
export const sommaMacro = (voci) => ({
  c: Math.round(voci.reduce((t, v) => t + (Number(v.carboidrati) || 0), 0)),
  p: Math.round(voci.reduce((t, v) => t + (Number(v.proteine) || 0), 0)),
  g: Math.round(voci.reduce((t, v) => t + (Number(v.grassi) || 0), 0)),
});

/** kcal "per 100 g" → kcal per una certa grammatura */
export const perGrammi = (valore100, grammi) => Math.round(((Number(valore100) || 0) * grammi) / 100 * 10) / 10;

