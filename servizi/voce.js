/* =========================================================
   voce.js — DETTATURA: dal parlato al testo.

   Usa il riconoscimento vocale del browser (Safari su iPhone lo ha,
   in italiano). È gratis e non passa dalla nostra IA: l'IA riceve
   solo il testo già scritto.

   Se il riconoscimento non è disponibile (o iOS lo blocca),
   l'app ripiega sul microfono della TASTIERA dell'iPhone.
   ========================================================= */

const Riconoscitore = window.SpeechRecognition || window.webkitSpeechRecognition;

export const dettaturaDisponibile = () => Boolean(Riconoscitore);

/**
 * Inizia ad ascoltare.
 * @param onTesto(testo, finito)  chiamata mentre parli e alla fine
 * @param onErrore(messaggio)
 * @returns una funzione per smettere di ascoltare
 */
export function ascolta({ onTesto, onErrore, onFine }) {
  const r = new Riconoscitore();
  r.lang = "it-IT";
  r.interimResults = true;      // mostra il testo mentre parli
  r.continuous = false;         // si ferma da solo quando fai una pausa
  let testo = "";

  r.onresult = (e) => {
    testo = [...e.results].map((x) => x[0].transcript).join(" ");
    onTesto?.(testo, e.results[e.results.length - 1].isFinal);
  };
  r.onerror = (e) => {
    const m =
      e.error === "not-allowed" || e.error === "service-not-allowed"
        ? "Microfono non consentito: usa il microfono della tastiera."
        : e.error === "no-speech" ? "Non ho sentito nulla, riprova." : "Dettatura non riuscita, riprova.";
    onErrore?.(m);
  };
  r.onend = () => onFine?.(testo);
  try { r.start(); } catch { onErrore?.("Dettatura non disponibile: usa il microfono della tastiera."); }
  return () => { try { r.stop(); } catch { /* già fermo */ } };
}
