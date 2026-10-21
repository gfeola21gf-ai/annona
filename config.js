/* =========================================================
   config.js — l'"indirizzo" del database Supabase.

   Annona usa lo stesso progetto di "Le mie routine"
   (stesso account), ma con tabelle sue (annona_…).

   Questi due valori sono PUBBLICI: sono fatti apposta per stare
   dentro un sito web. La sicurezza dei dati dipende dalle regole
   (RLS) scritte in supabase/annona.sql.

   ⚠️ Qui NON va mai messa una chiave segreta (sb_secret_…, chiavi IA).
   ========================================================= */

export const SUPABASE_URL = "https://hcseefgwbxfmtjccbrkq.supabase.co";
export const SUPABASE_CHIAVE_PUBBLICA = "sb_publishable_2m7zEzOSvmB2Gl8d5lEXfg_k3NSaOQr";

// Il nome della funzione su Supabase che fa da ponte verso l'IA e il database alimentare
export const FUNZIONE = "annona";
