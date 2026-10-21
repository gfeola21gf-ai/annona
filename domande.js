/* =========================================================
   domande.js — le DOMANDE del giuramento (onboarding).

   È un semplice elenco: per aggiungere una domanda basta
   copiare un blocco { … } e cambiarne il testo.
   L'app le mostra in quest'ordine, una per schermata,
   prima dei dati fisici e dell'obiettivo.

   Campi:
     id          nome interno (unico, senza spazi)
     sopra       piccola scritta sopra il titolo
     titolo      la domanda
     aiuto       una riga di spiegazione
     esempio     testo grigio d'esempio nel riquadro
     obbligatoria  true = non si può saltare
     inCima      true = la risposta compare in cima alla schermata Oggi
   ========================================================= */

export const DOMANDE = [
  {
    id: "motivazione",
    sopra: "Il tuo giuramento",
    titolo: "Qual è la tua motivazione?",
    aiuto: "La vedrai ogni giorno in cima all'app.",
    esempio: "Es. Tornare a correre senza fiatone e sentirmi bene nei miei vestiti.",
    obbligatoria: true,
    inCima: true,
  },
  {
    id: "perche",
    sopra: "Scava più a fondo",
    titolo: "Perché vuoi farlo?",
    aiuto: "Il motivo vero, quello che ti tiene in piedi nei giorni difficili.",
    esempio: "Es. Perché voglio avere energia per le persone a cui tengo.",
    obbligatoria: true,
    inCima: false,
  },
  // ← qui potrai aggiungere le tue domande in più
];
