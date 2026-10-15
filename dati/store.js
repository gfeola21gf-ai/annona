/* =========================================================
   store.js — l'ARCHIVIO di Annona.

   Il resto dell'app usa solo queste funzioni e non sa DOVE
   finiscono i dati:
     account:   utenteAttuale()  accedi()  esci()
     profilo:   profilo()  salvaProfilo(p)
     elenchi:   elenco("pesate"|"diario"|"attivita"|"piano")
                salva(nome, voce)   elimina(nome, id)
     sincronia: sincronizza()

   "PRIMA IL TELEFONO" (offline-first):
   ogni modifica viene salvata SUBITO nel telefono (localStorage),
   così l'app è velocissima e funziona anche senza internet.
   Poi viene messa in una CODA e spedita a Supabase appena possibile.
   All'avvio scarichiamo da Supabase la versione aggiornata.
   ========================================================= */

import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.116.0/+esm";
import { SUPABASE_URL, SUPABASE_CHIAVE_PUBBLICA } from "../config.js";

export const supabase = createClient(SUPABASE_URL, SUPABASE_CHIAVE_PUBBLICA);

// Nome dell'elenco nell'app → tabella su Supabase
const TABELLE = {
  pesate: "annona_pesate",
  diario: "annona_diario",
  attivita: "annona_attivita",
  piano: "annona_piano",
};

const CHIAVE = (nome) => `annona.${nome}`;
let utente = null;

/** Crea un codice univoco nel formato che il database si aspetta (UUID) */
export function nuovoId() {
  if (crypto.randomUUID) return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

/* ---------- Lettura/scrittura nel telefono ---------- */
function leggi(nome, riserva) {
  try { return JSON.parse(localStorage.getItem(CHIAVE(nome))) ?? riserva; } catch { return riserva; }
}
function scrivi(nome, valore) {
  try {
    if (valore === null) localStorage.removeItem(CHIAVE(nome));
    else localStorage.setItem(CHIAVE(nome), JSON.stringify(valore));
  } catch { /* memoria piena o navigazione privata: pazienza */ }
}
/** Avvisa le schermate che i dati sono cambiati (così si ridisegnano) */
const avvisa = () => window.dispatchEvent(new CustomEvent("annona-dati"));

/* =========================================================
   ACCOUNT (lo stesso di "Le mie routine")
   ========================================================= */

/** Modalità prova: tutto resta nel telefono, niente account (per i test in locale) */
export const soloLocale = () => localStorage.getItem("annona.solo-locale") === "1";

export async function utenteAttuale() {
  if (soloLocale()) return { id: "locale", email: "prova" };
  const { data } = await supabase.auth.getSession();
  utente = data.session?.user ?? null;
  return utente;
}

export async function accedi(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw traduci(error);
  utente = data.user;
}

export async function esci() {
  await supabase.auth.signOut();
  utente = null;
  for (const nome of [...Object.keys(TABELLE), "profilo", "coda"]) scrivi(nome, null);
  localStorage.removeItem("annona.solo-locale");
}

/** Supabase risponde in inglese: traduciamo i messaggi più comuni */
export function traduci(errore) {
  const m = errore?.message || String(errore);
  const testo =
    /invalid login credentials/i.test(m) ? "Email o password sbagliate." :
    /email not confirmed/i.test(m) ? "Devi prima confermare l'email." :
    /rate limit|too many/i.test(m) ? "Troppi tentativi: riprova tra qualche minuto." :
    /fetch|network|load failed/i.test(m) ? "Nessuna connessione a internet." :
    m;
  return new Error(testo);
}

/* =========================================================
   PROFILO: dati fisici, obiettivo, motivazione (un solo oggetto)
   {
     risposte: { motivazione: "…", perche: "…", … },   ← domande.js
     sesso: "M"|"F", nascita: "AAAA-MM-GG", altezza: 180,
     pesoIniziale: 82, pesoObiettivo: 75, ritmo: -0.5,  ← kg a settimana
     completato: true
   }
   ========================================================= */
export const profilo = () => leggi("profilo", null);

export function salvaProfilo(dati) {
  const nuovo = { ...dati, aggiornato: new Date().toISOString() };
  scrivi("profilo", nuovo);
  accoda({ tipo: "profilo", dati: nuovo });
  avvisa();
}

/* =========================================================
   ELENCHI: pesate, diario (pasti), attività, piano
   Ogni voce ha un "id"; il resto dei campi è uguale alle colonne
   della tabella su Supabase (vedi supabase/annona.sql).
   ========================================================= */
export const elenco = (nome) => leggi(nome, []);

export function salva(nome, voce) {
  const v = { ...voce, id: voce.id ?? nuovoId() };
  const tutte = elenco(nome).filter((x) => x.id !== v.id);
  tutte.push(v);
  scrivi(nome, tutte);
  accoda({ tipo: "salva", nome, voce: v });
  avvisa();
  return v;
}

export function salvaTante(nome, voci) {
  const nuove = voci.map((v) => ({ ...v, id: v.id ?? nuovoId() }));
  const ids = new Set(nuove.map((v) => v.id));
  scrivi(nome, [...elenco(nome).filter((x) => !ids.has(x.id)), ...nuove]);
  nuove.forEach((v) => accoda({ tipo: "salva", nome, voce: v }, false));
  spedisci();
  avvisa();
  return nuove;
}

export function elimina(nome, id) {
  scrivi(nome, elenco(nome).filter((x) => x.id !== id));
  accoda({ tipo: "elimina", nome, id });
  avvisa();
}

/* =========================================================
   LA CODA verso Supabase
   ========================================================= */
function accoda(operazione, subito = true) {
  if (soloLocale()) return;
  const coda = leggi("coda", []);
  coda.push(operazione);
  scrivi("coda", coda);
  if (subito) spedisci();
}

let inViaggio = null;
/** Spedisce a Supabase le modifiche in attesa, una alla volta, nell'ordine */
export function spedisci() {
  if (soloLocale()) return Promise.resolve(true);
  inViaggio ??= (async () => {
    try {
      let coda = leggi("coda", []);
      while (coda.length) {
        const op = coda[0];
        const risposta =
          op.tipo === "profilo"
            ? await supabase.from("annona_profilo").upsert({ user_id: utente?.id, dati: op.dati })
            : op.tipo === "salva"
              ? await supabase.from(TABELLE[op.nome]).upsert(op.voce)
              : await supabase.from(TABELLE[op.nome]).delete().eq("id", op.id);
        if (risposta.error) {
          // Errore di rete: riproveremo. Errore "vero" (dato rifiutato): lo scartiamo per non bloccare la coda.
          if (/fetch|network|load failed|jwt|auth/i.test(risposta.error.message)) return false;
          console.warn("Annona: modifica scartata", op, risposta.error);
        }
        coda = leggi("coda", []);
        coda.shift();
        scrivi("coda", coda);
      }
      return true;
    } catch {
      return false;
    } finally {
      inViaggio = null;
    }
  })();
  return inViaggio;
}

/** Ci sono modifiche non ancora arrivate su Supabase? */
export const inAttesa = () => leggi("coda", []).length;

/**
 * Allinea il telefono con Supabase:
 * 1. spedisce le modifiche in attesa
 * 2. se sono arrivate tutte, scarica la versione completa
 */
export async function sincronizza() {
  if (soloLocale()) return true;
  const ok = await spedisci();
  if (!ok || inAttesa()) return false;
  try {
    const unAnnoFa = new Date(Date.now() - 400 * 86400000).toISOString().slice(0, 10);
    const [prof, pesate, diario, attivita, piano] = await Promise.all([
      supabase.from("annona_profilo").select("dati").maybeSingle(),
      supabase.from("annona_pesate").select("id, quando, kg").order("quando"),
      supabase.from("annona_diario").select("*").gte("giorno", unAnnoFa),
      supabase.from("annona_attivita").select("*").gte("giorno", unAnnoFa),
      supabase.from("annona_piano").select("*"),
    ]);
    const errore = [prof, pesate, diario, attivita, piano].find((r) => r.error)?.error;
    if (errore) throw errore;
    // Se nel frattempo hai modificato qualcosa, non sovrascriviamo: riproveremo dopo
    if (inAttesa()) return false;
    if (prof.data?.dati) scrivi("profilo", prof.data.dati);
    else if (profilo()) accoda({ tipo: "profilo", dati: profilo() });   // profilo creato offline
    const pulisci = (righe) => righe.map(({ user_id, ...resto }) => resto);
    scrivi("pesate", pulisci(pesate.data));
    scrivi("diario", pulisci(diario.data));
    scrivi("attivita", pulisci(attivita.data));
    scrivi("piano", pulisci(piano.data));
    avvisa();
    return true;
  } catch (e) {
    console.warn("Annona: sincronizzazione non riuscita", e);
    return false;
  }
}

// Torna internet → spediamo quello che è rimasto in coda
window.addEventListener("online", () => sincronizza());
