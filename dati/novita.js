/* =========================================================
   novita.js — i TESTI della schermata «Novità» (schermate/novita.js).

   Ogni aggiornamento importante ha le sue pagine, CONCORDATE con
   l'utente prima di pubblicare (anteprima in anteprima/). Quando se ne
   aggiunge uno: nuove pagine qui + VERSIONE_NOVITA in logica/regole.js.
   Stile: semplicissimo, delicato, mai «come un nutrizionista»
   (l'app non sostituisce un professionista).

   Ogni pagina: {id, sopra, titolo, testo, perTe?, domanda?, posa?}
   - perTe: {etichetta, prima, ora, unita} → il numero vero della persona
   - domanda: "allenamento" → le tre scelte, risposta salvata nel profilo
   ========================================================= */

/**
 * Versione 1 (2026-10-30): proteine dal peso, «Ti alleni?», ritmo che segue il peso.
 * @param c  {suMisura, protPrima, protOra, chiedeAllenamento, ritmoPrima, ritmoOra, nomeRitmo}
 */
export function pagine(c) {
  const kgTesto = (v) => `${v > 0 ? "+" : v < 0 ? "−" : ""}${String(Math.abs(v)).replace(".", ",")}`;
  return [
    {
      id: "copertina", posa: "saluta", sopra: "ANNONA SI È ALLENATA",
      titolo: "Conti <em>più precisi</em>, pensati sul tuo corpo",
      testo: "Abbiamo rifatto i calcoli seguendo le <b>linee guida italiane sulla nutrizione</b>. Ora si adattano meglio a te.",
      nota: "Annona ti aiuta a orientarti, ma <b>non sostituisce un medico o un nutrizionista</b>. Per dubbi sulla tua salute, chiedi a loro.",
      pulsante: "Scopri cosa cambia",
    },
    {
      id: "proteine", sopra: "LE PROTEINE",
      titolo: "Giuste per il <em>tuo corpo</em>",
      primaOra: {
        prima: "Una fetta fissa delle calorie. Più mangiavi, più ne chiedeva: a volte <b>troppe</b>.",
        ora: "Si parte dal tuo <b>peso</b>, come dicono le linee guida. Né troppe né poche.",
      },
      perTe: c.suMisura ? null : { etichetta: "proteine al giorno", prima: c.protPrima, ora: c.protOra, unita: "g" },
      nota: c.suMisura ? "Le tue proteine le hai scelte tu: restano come sono." : "Le proteine servono ai muscoli. Il corpo ne usa solo quante gliene servono.",
    },
    c.chiedeAllenamento && {
      id: "allenamento", sopra: "UNA DOMANDA", domanda: "allenamento",
      titolo: "Ti <em>alleni</em>?",
      testo: "Chi si allena ha bisogno di <b>più proteine</b> per i muscoli. Se fai tutti e due, scegline due.",
    },
    c.ritmoOra !== 0 && {
      id: "ritmo", sopra: "IL RITMO", grafico: true,
      titolo: "Il ritmo <em>cresce e cala</em> con te",
      testo: "Ora il ritmo è <b>una parte del tuo peso</b>. Se il peso cambia, Annona aggiusta il ritmo da sola. Così resta sempre <b>sano</b>.",
      perTe: { etichetta: `ritmo «${c.nomeRitmo}»`, prima: kgTesto(c.ritmoPrima), ora: kgTesto(c.ritmoOra), unita: "kg/sett." },
    },
  ].filter(Boolean);
}
