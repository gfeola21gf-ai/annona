/* =========================================================
   scanner.js — leggere un CODICE A BARRE con la fotocamera.

   Safari sull'iPhone non sa leggere i codici a barre da solo,
   quindi usiamo ZXing, una libreria libera che guarda i fotogrammi
   del video e ci trova le barre. La scarichiamo solo quando serve
   (la prima volta che apri lo scanner), con la versione esatta.
   ========================================================= */

const ZXING = "https://cdn.jsdelivr.net/npm/@zxing/browser@0.1.5/+esm";

/**
 * Accende la fotocamera posteriore dentro <video> e cerca codici a barre.
 * Un codice vale solo se viene letto UGUALE due volte di fila (evita letture sbagliate).
 * @param video     l'elemento <video> dove mostrare l'inquadratura
 * @param onCodice  (codice) => …   chiamata una volta sola
 * @returns una funzione per spegnere la fotocamera
 */
export async function avviaScanner(video, onCodice) {
  if (!navigator.mediaDevices?.getUserMedia) throw new Error("Questo browser non può usare la fotocamera.");
  let modulo;
  try {
    modulo = await import(ZXING);
  } catch {
    throw new Error("Non riesco a caricare il lettore: serve internet la prima volta.");
  }
  const lettore = new modulo.BrowserMultiFormatOneDReader(undefined, { delayBetweenScanAttempts: 120 });
  let ultimo = "", fatto = false, controlli = null;
  const spegni = () => { fatto = true; controlli?.stop(); };
  try {
    controlli = await lettore.decodeFromConstraints(
      { audio: false, video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } } },
      video,
      (risultato) => {
        if (fatto || !risultato) return;
        const codice = risultato.getText();
        if (!/^\d{8,14}$/.test(codice)) return;                 // solo codici di prodotti (EAN/UPC)
        if (codice !== ultimo) { ultimo = codice; return; }      // aspettiamo la conferma
        spegni();
        onCodice(codice);
      },
    );
  } catch (err) {
    if (err?.name === "NotAllowedError") throw new Error("Hai negato la fotocamera: puoi scrivere le cifre qui sotto.");
    throw new Error("Fotocamera non disponibile: scrivi le cifre qui sotto.");
  }
  if (fatto) controlli.stop();       // chiuso mentre si accendeva
  return spegni;
}
