/* =========================================================
   store.js — l'ARCHIVIO di Annona.

   Il resto dell'app usa solo queste funzioni e non sa DOVE
   finiscono i dati:
     account:   utenteAttuale()  accedi()  registrati()  cambiaPassword()  esci()
     invito:    invito()  controllaInvito()  usaCodice()   (supabase/inviti.sql)
     errori:    segnalaErrore()                            (supabase/monitoraggio.sql)
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

/**
 * Ogni richiesta al database ha un TEMPO MASSIMO (2026-10-30). Il telefono di Valerio (Android, Wi-Fi ↔ dati) ha avuto una
 * richiesta rimasta appesa per sempre: senza tempo massimo la coda aspettava all'infinito e nessun dato arrivava più
 * al server (i registri: l'ultima richiesta alle 14:50 UTC, poi un'ora d'uso senza nulla). Le funzioni IA hanno già il loro.
 */
const TEMPO_MASSIMO_MS = 20000;
const fetchConTempo = (url, opzioni = {}) =>
  opzioni.signal ? fetch(url, opzioni) : fetch(url, { ...opzioni, signal: AbortSignal.timeout(TEMPO_MASSIMO_MS) });

export const supabase = createClient(SUPABASE_URL, SUPABASE_CHIAVE_PUBBLICA, { global: { fetch: fetchConTempo } });

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
   ACCOUNT (unico per tutto il progetto: vale anche per Le mie routine e Volantinaggio)
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

/** Nuovo account (le registrazioni del progetto sono aperte: per Annona serve poi il codice invito) */
export async function registrati(email, password) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw traduci(error);
  if (!data.session) throw new Error("Account creato: ora entra con email e password.");
  utente = data.user;
}

export async function cambiaPassword(password) {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw traduci(error);
}

export async function esci() {
  await supabase.auth.signOut();
  utente = null;
  for (const nome of [...Object.keys(TABELLE), "profilo", "coda", "invito"]) scrivi(nome, null);
  localStorage.removeItem("annona.solo-locale");
}

/* =========================================================
   INVITO (supabase/inviti.sql): un account non basta, serve
   essere nella lista degli invitati di Annona.
   La risposta resta nel telefono: {ruolo: "admin"|"amico", attivo} oppure {no: true}.
   ========================================================= */
export const invito = () => (soloLocale() ? { ruolo: "amico", attivo: true } : leggi("invito", null));

/** Chiede al server se sei invitato. Senza internet tiene la risposta di prima. */
export async function controllaInvito() {
  if (soloLocale()) return invito();
  const io = utente ?? (await utenteAttuale());
  if (!io) return null;
  const { data, error } = await supabase.from("annona_invitati").select("ruolo, attivo").eq("user_id", io.id).maybeSingle();
  if (error) return invito();
  scrivi("invito", data ?? { no: true });
  return invito();
}

/** Inserisce il codice invito. Risponde: ok | gia | sbagliato | esaurito | troppi */
export async function usaCodice(codice) {
  const { data, error } = await supabase.rpc("annona_usa_codice", { p_codice: codice });
  if (error) throw traduci(error);
  if (data === "ok" || data === "gia") await controllaInvito();
  return data;
}

/**
 * ERRORI IMPREVISTI dell'app (supabase/monitoraggio.sql): li annotiamo per scoprire i problemi
 * che gli amici non raccontano. Solo il messaggio e la schermata, mai i dati. Al massimo 10 per apertura.
 */
let segnalati = 0;
export function segnalaErrore(messaggio, dove = "") {
  if (soloLocale() || !utente || segnalati >= 10) return;
  segnalati++;
  supabase.from("annona_errori").insert({
    messaggio: String(messaggio || "?").slice(0, 500),
    dove: String(dove).slice(0, 200),
    dispositivo: navigator.userAgent.slice(0, 200),
  }).then(() => {}, () => {});
}

/** Supabase risponde in inglese: traduciamo i messaggi più comuni */
export function traduci(errore) {
  const m = errore?.message || String(errore);
  const testo =
    /invalid login credentials/i.test(m) ? "Email o password sbagliate." :
    /email not confirmed/i.test(m) ? "Devi prima confermare l'email." :
    /already registered|already exists/i.test(m) ? "Questa email ha già un account: usa «Entra»." :
    /password.*(at least|characters)|weak password/i.test(m) ? "La password deve avere almeno 6 caratteri." :
    /invalid.*email|email.*invalid/i.test(m) ? "Controlla l'email: sembra scritta male." :
    /same.*password|different from the old/i.test(m) ? "La nuova password deve essere diversa da quella di prima." :
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
  const prima = profilo() ?? {};
  const nuovo = { ...dati, aggiornato: new Date().toISOString() };
  // quali campi sono cambiati: sul server cambiamo SOLO quelli (vedi spedisci), così se il telefono
  // e il PC modificano due cose diverse (es. i macro e un pasto saltato) restano entrambe
  const cambiati = [...new Set([...Object.keys(prima), ...Object.keys(nuovo)])]
    .filter((k) => JSON.stringify(prima[k]) !== JSON.stringify(nuovo[k]));
  scrivi("profilo", nuovo);
  accoda({ tipo: "profilo", dati: nuovo, cambiati });
  avvisa();
}

/** Il profilo da spedire: quello sul server + i soli campi cambiati qui (senza «cambiati»: tutto il nostro) */
async function profiloUnito(op) {
  if (!op.cambiati) return op.dati;
  const { data, error } = await supabase.from("annona_profilo").select("dati").maybeSingle();
  if (error) throw error;
  if (!data?.dati) return op.dati;            // sul server non c'è ancora: va tutto il nostro
  const unito = { ...data.dati };
  for (const k of op.cambiati) { if (k in op.dati) unito[k] = op.dati[k]; else delete unito[k]; }
  return unito;
}

/* =========================================================
   ELENCHI: pesate, diario (pasti), attività, piano
   Ogni voce ha un "id"; il resto dei campi è uguale alle colonne
   della tabella su Supabase (vedi supabase/annona.sql).
   ========================================================= */
export const elenco = (nome) => leggi(nome, []);

export function salva(nome, voce) {
  const v = { ...voce, id: voce.id ?? nuovoId() };
  const tutte = elenco(nome);
  const i = tutte.findIndex((x) => x.id === v.id);
  if (i >= 0) tutte[i] = v; else tutte.push(v);       // una voce modificata resta al suo posto (es. nel pasto)
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

let inViaggio = null, partitoIl = 0, giro = 0;
/** Spedisce a Supabase le modifiche in attesa, una alla volta, nell'ordine */
export function spedisci() {
  if (soloLocale()) return Promise.resolve(true);
  // SBLOCCA CODA: se un giro è partito da più di un minuto è rimasto appeso → ne parte uno nuovo
  if (inViaggio && Date.now() - partitoIl > 60000) {
    segnalaErrore("Coda bloccata da più di un minuto: riparto", "store.spedisci");
    inViaggio = null;
  }
  if (inViaggio) return inViaggio;
  partitoIl = Date.now();
  const questo = ++giro;
  inViaggio = (async () => {
    try {
      let coda = leggi("coda", []);
      while (coda.length) {
        const op = coda[0];
        const risposta =
          op.tipo === "profilo"
            ? await supabase.from("annona_profilo").upsert({ user_id: utente?.id, dati: await profiloUnito(op) })
            : op.tipo === "salva"
              ? await supabase.from(TABELLE[op.nome]).upsert(op.voce)
              : await supabase.from(TABELLE[op.nome]).delete().eq("id", op.id);
        if (risposta.error) {
          // Errore di rete: riproveremo. Errore "vero" (dato rifiutato): lo scartiamo per non bloccare la coda.
          if (/fetch|network|load failed|jwt|auth|abort|timeout|timed out/i.test(risposta.error.message)) return false;
          console.warn("Annona: modifica scartata", op, risposta.error);
          segnalaErrore(`Modifica scartata (${op.tipo} ${op.nome ?? ""}): ${risposta.error.message}`, "store.spedisci");
        }
        coda = leggi("coda", []);
        // la togliamo solo se è ancora la prima (un giro vecchio sbloccato potrebbe averla già tolta)
        if (JSON.stringify(coda[0]) === JSON.stringify(op)) { coda.shift(); scrivi("coda", coda); }
      }
      return true;
    } catch (e) {
      if (!/fetch|network|load failed|abort|timeout|timed out/i.test(e?.message ?? "")) segnalaErrore(`Spedizione non riuscita: ${e?.message ?? e}`, "store.spedisci");
      return false;
    } finally {
      if (giro === questo) inViaggio = null;
    }
  })();
  return inViaggio;
}

/** Quando il telefono si è allineato col server l'ultima volta (ISO), o null */
export const ultimaSincronia = () => leggi("ultimaSincronia", null);

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
    scrivi("ultimaSincronia", new Date().toISOString());
    avvisa();
    return true;
  } catch (e) {
    console.warn("Annona: sincronizzazione non riuscita", e);
    return false;
  }
}

// Torna internet → spediamo quello che è rimasto in coda
window.addEventListener("online", () => sincronizza());
