/* =========================================================
   sw.js — il SERVICE WORKER: un aiutante che vive nel telefono.

   Tiene una COPIA dei file dell'app. Strategia "prima la rete":
     - se c'è internet → scarica la versione più nuova (e aggiorna la copia);
     - se manca internet → usa la copia, così l'app si apre lo stesso.
   I dati (pasti, pesate…) li gestisce dati/store.js, non questo file.
   ========================================================= */

const COPIA = "annona-file";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (evento) => evento.waitUntil(self.clients.claim()));

self.addEventListener("fetch", (evento) => {
  const richiesta = evento.request;
  if (richiesta.method !== "GET") return;
  const indirizzo = new URL(richiesta.url);
  // Supabase e Open Food Facts non si copiano: sono dati "vivi"
  if (indirizzo.hostname.endsWith("supabase.co") || indirizzo.hostname.includes("openfoodfacts")) return;

  evento.respondWith(
    fetch(richiesta)
      .then((risposta) => {
        if (risposta.ok || risposta.type === "opaque") {
          const copia = risposta.clone();
          caches.open(COPIA).then((c) => c.put(richiesta, copia));
        }
        return risposta;
      })
      .catch(() => caches.match(richiesta, { ignoreSearch: true }))
  );
});
