/* =========================================================
   attivita.js — SOLO calcoli puri: le calorie bruciate con un'attività.

   Come per i cibi con la tabella: l'app fa i conti con dati certi e
   usa SEMPRE il dato più preciso che hai, in quest'ordine:
     1. kcal attive dell'orologio (o dell'app Salute)  → così come sono
     2. battito medio                                  → formula di Keytel (2005)
     3. km (corsa, camminata)                          → costo per kg e per km
     4. tipo + intensità                               → MET del Compendium of Physical Activities
   Contiamo solo le calorie IN PIÙ rispetto al riposo: il riposo è già
   nel basale × movimento del giorno. Provati da prove.html.
   ========================================================= */

/**
 * I tipi di attività. met = valori MET per l'intensità da 1 a 5;
 * kmNetto = kcal in più per kg di peso e per km (solo dove la distanza conta davvero).
 */
export const TIPI = [
  { id: "corsa", nome: "Corsa", emoji: "🏃", met: [6, 7.8, 9.3, 11, 12.8], kmNetto: 0.95 },
  { id: "camminata", nome: "Camminata", emoji: "🚶", met: [2.8, 3.5, 4.3, 5, 6.5], kmNetto: 0.5 },
  { id: "bici", nome: "Bici", emoji: "🚴", met: [4, 6, 8, 10, 12] },
  { id: "pesi", nome: "Pesi", emoji: "🏋️", met: [3, 3.5, 5, 6, 7] },
  // circuiti, EMOM, complex: lavoro a intervalli, l'intensità media conta più dei minuti
  { id: "kettlebell", nome: "Kettlebell", emoji: "🔔", met: [4, 6, 8, 9.8, 12],
    nota: "EMOM e complex: scegli l'intensità dalla fatica media di tutto l'allenamento, pause comprese. Col battito medio o le kcal attive dell'Apple Watch è più preciso." },
  { id: "nuoto", nome: "Nuoto", emoji: "🏊", met: [5, 6, 7, 9.5, 10] },
  { id: "sport", nome: "Sport", emoji: "⚽", met: [4.5, 6, 7, 8, 10] },
  { id: "yoga", nome: "Yoga", emoji: "🧘", met: [2, 2.5, 3, 4, 4.5] },
  { id: "altro", nome: "Altro", emoji: "✏️" },
];
export const tipoDa = (id) => TIPI.find((t) => t.id === id) ?? null;

/** L'intensità da 1 a 5 = le zone cardiache, con la «prova della parola» per chi non ha l'orologio */
export const ZONE = [
  { n: 1, nome: "Molto leggera", breve: "leggera", parlare: "parli e canti senza fatica", da: 0.5, a: 0.6 },
  { n: 2, nome: "Facile", breve: "facile", parlare: "parli a frasi intere", da: 0.6, a: 0.7 },
  { n: 3, nome: "Media", breve: "media", parlare: "parli a frasi brevi", da: 0.7, a: 0.8 },
  { n: 4, nome: "Dura", breve: "dura", parlare: "dici solo poche parole", da: 0.8, a: 0.9 },
  { n: 5, nome: "Massima", breve: "massima", parlare: "non riesci a parlare", da: 0.9, a: 1 },
];

/** Battito massimo stimato dall'età (formula di Tanaka: 208 − 0,7 × età) */
export const battitoMassimo = (eta) => Math.round(208 - 0.7 * eta);

/** I battiti di una zona: [da, a] */
export function battitiZona(zona, eta) {
  const z = ZONE[zona - 1], max = battitoMassimo(eta);
  return [Math.round(max * z.da), Math.round(max * z.a)];
}

/**
 * Formula di Keytel: kcal al minuto (TOTALI, riposo compreso) dal battito medio.
 * Senza sesso indicato, la media delle due formule.
 */
export function kcalMinutoDaBattito({ battito, peso, eta, sesso }) {
  const uomo = (-55.0969 + 0.6309 * battito + 0.1988 * peso + 0.2017 * eta) / 4.184;
  const donna = (-20.4022 + 0.4472 * battito - 0.1263 * peso + 0.074 * eta) / 4.184;
  return sesso === "M" ? uomo : sesso === "F" ? donna : (uomo + donna) / 2;
}

/**
 * Le calorie IN PIÙ di un'attività, con il dato più preciso disponibile.
 * @param a {tipo, minuti, zona, peso, eta, sesso, basale, kcalOrologio, battito, km, metIA}
 *        metIA = il MET stimato dall'IA per un'attività «Altro»
 * @returns {kcal, fonte: "orologio"|"battito"|"km"|"intensita"|"ia", met?} oppure null se mancano i dati
 */
export function kcalAttivita(a) {
  const t = tipoDa(a.tipo);
  const ore = (Number(a.minuti) || 0) / 60;
  if (a.kcalOrologio > 0) return { kcal: Math.round(a.kcalOrologio), fonte: "orologio" };
  if (!(a.peso > 0)) return null;
  if (a.battito > 0 && ore > 0 && a.eta > 0) {
    const totaleMinuto = kcalMinutoDaBattito(a);
    const riposoMinuto = (a.basale || 0) / 1440;
    // sotto ~90 battiti la formula non è affidabile: in quel caso passiamo agli altri metodi
    if (a.battito >= 90 && totaleMinuto > riposoMinuto)
      return { kcal: Math.round((totaleMinuto - riposoMinuto) * a.minuti), fonte: "battito" };
  }
  if (a.km > 0 && t?.kmNetto) return { kcal: Math.round(t.kmNetto * a.peso * a.km), fonte: "km" };
  const met = t?.met ? t.met[(a.zona || 3) - 1] : a.metIA;
  if (!(met > 1) || !(ore > 0)) return null;
  return { kcal: Math.round((met - 1) * a.peso * ore), fonte: t?.met ? "intensita" : "ia", met };
}

/** Dal risultato dell'IA (kcal in più per quei minuti) al MET, così se cambi i minuti il conto si aggiorna */
export const metDaKcal = (kcal, peso, minuti) => (peso > 0 && minuti > 0 ? kcal / (peso * (minuti / 60)) + 1 : 0);
