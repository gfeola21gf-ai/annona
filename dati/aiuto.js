/* =========================================================
   aiuto.js — i TESTI dell'aiuto (solo parole, niente logica).

   Regole di scrittura (scelte dell'utente, 2026-10-30):
   - semplice, come per un bambino; diretto; frasi corte;
   - DELICATO: il peso è un tema sensibile. Niente «ingrassi»,
     «dimagrisci», «puoi mangiare di più». Mai colpe.

   Si aggiungono domande, fogli e funzioni senza toccare il resto.
   <b>…</b> = grassetto (sono testi nostri, non dell'utente).
   ========================================================= */

/** I temi della pagina «Domande e consigli» */
export const TEMI = [
  { id: "pasti", nome: "Pasti" },
  { id: "attivita", nome: "Attività" },
  { id: "peso", nome: "Peso" },
  { id: "dieta", nome: "Dieta" },
];

/** Le domande frequenti: d = domanda, r = risposta, c = consiglio 💡 (facoltativo) */
export const DOMANDE = [
  // ---- Pasti ----
  { id: "p-sport", tema: "pasti", d: "Ho fatto sport. Posso mangiare di più?",
    r: "<b>Sì.</b> Segna lo sport: il numero sale da solo.", c: "Se vuoi andare un po' più veloce, mangiane metà." },
  { id: "p-oltre", tema: "pasti", d: "Oggi ho mangiato di più. Va male?",
    r: "<b>No.</b> Un giorno non cambia niente. Conta come va la settimana.", c: "Domani riparti normale: non serve mangiare meno per recuperare." },
  { id: "p-pesare", tema: "pasti", d: "Devo pesare tutto?",
    r: "Per i primi giorni sì: impari com'è una porzione. Poi va bene anche a occhio.", c: "Pesa sempre olio, pasta, riso e frutta secca: sono i più facili da sbagliare." },
  { id: "p-cotto", tema: "pasti", d: "La pasta la peso cruda o cotta?",
    r: "<b>Cruda</b>: è più precisa. Se la pesi cotta, scrivi «pasta cotta»." },
  { id: "p-fuori", tema: "pasti", d: "Mangio fuori. Come lo segno?",
    r: "Fai una <b>foto al piatto</b> (📷 in Aggiungi). Annona stima per te.", c: "Nel dubbio, meglio stimare un po' di più che di meno." },
  { id: "p-olio", tema: "pasti", d: "Devo segnare anche l'olio?",
    r: "<b>Sì.</b> Un cucchiaio d'olio sono circa 90 kcal.", c: "È la cosa che si dimentica più spesso." },
  { id: "p-scheda", tema: "pasti", d: "Ho la dieta del nutrizionista. Posso metterla?",
    r: "<b>Sì.</b> In Razioni tocca ⋯ e poi «Importa una scheda». Basta una foto." },
  { id: "p-saltare", tema: "pasti", d: "Ho saltato un pasto. Cosa faccio?",
    r: "Tieni premuto il pasto in Oggi e scegli «Non l'ho mangiato».", c: "Saltare spesso non aiuta: dopo di solito si ha più fame." },

  // ---- Attività ----
  { id: "a-passi", tema: "attivita", d: "Ho camminato più del solito. Cosa faccio?",
    r: "<b>Niente.</b> Le camminate di tutti i giorni sono già nel tuo movimento.", c: "Segna solo le camminate fatte apposta, a passo svelto." },
  { id: "a-orologio", tema: "attivita", d: "Ho l'orologio. Che numero metto?",
    r: "Le <b>calorie attive</b>. Non le totali.", c: "Gli orologi sbagliano un po'. Va bene lo stesso." },
  { id: "a-pulizie", tema: "attivita", d: "Ho fatto le pulizie. Le segno?",
    r: "<b>No.</b> Le cose di casa sono già nel tuo movimento di ogni giorno." },
  { id: "a-fatica", tema: "attivita", d: "Che fatica scelgo, da 1 a 5?",
    r: "Parli bene = <b>1-2</b>. Parli a fatica = <b>3</b>. Hai il fiatone = <b>4-5</b>." },
  { id: "a-ieri", tema: "attivita", d: "Ho dimenticato lo sport di ieri.",
    r: "In Oggi torna a ieri con la freccia ‹ e aggiungilo lì." },
  { id: "a-palestra", tema: "attivita", d: "Vado in palestra. Sono «attivo»?",
    r: "<b>No.</b> Qui la palestra non conta. Lavori seduto? Di solito è «Basso».", c: "Nel dubbio, scegli quello più basso." },
  { id: "a-lavoro", tema: "attivita", d: "Ho cambiato lavoro. Cosa faccio?",
    r: "Vai in Io → Movimento di ogni giorno e scegli di nuovo. Vale da oggi in poi." },

  // ---- Peso ----
  { id: "w-acqua", tema: "peso", d: "La bilancia segna 1 kg in più. Perché?",
    r: "Di solito <b>è acqua</b>. In pochi giorni torna giù.", c: "Conta la linea, non il giorno." },
  { id: "w-linea", tema: "peso", d: "Cos'è la linea?",
    r: "È la <b>media degli ultimi 7 giorni</b>. Toglie gli alti e bassi dell'acqua." },
  { id: "w-quando", tema: "peso", d: "Quando mi peso?",
    r: "La mattina, dopo il bagno, prima di mangiare. <b>2-3 volte a settimana</b> bastano." },
  { id: "w-fermo", tema: "peso", d: "Il peso non si muove. Cosa faccio?",
    r: "Dai tempo al corpo: <b>2-3 settimane</b>. Se resta fermo, il guardiano ti avvisa.", c: "Controlla di segnare tutto, anche condimenti e bevande." },

  // ---- Dieta ----
  { id: "d-rosso", tema: "dieta", d: "È rosso, ma ho mangiato poco. Perché?",
    r: "Anche <b>mangiare troppo poco</b> non fa bene. Forse manca un pasto da segnare." },
  { id: "d-ritmo", tema: "dieta", d: "Quanto peso posso perdere a settimana?",
    r: "Per quasi tutti va bene <b>mezzo chilo</b>. Più piano è più facile da mantenere." },
  { id: "d-pausa", tema: "dieta", d: "Cos'è la pausa dalla dieta?",
    r: "1 o 2 settimane in cui <b>mangi quanto consumi</b>. Poi riparti con più energia.", c: "Decidi sempre tu." },
  { id: "d-guardiano", tema: "dieta", d: "Perché il guardiano non dice ancora niente?",
    r: "Gli servono <b>3 settimane</b> di pasti e pesate. Poi ti dice come va." },
  { id: "d-macro", tema: "dieta", d: "Cosa sono carboidrati, proteine e grassi?",
    r: "Sono i tre tipi di cibo. Le <b>proteine</b> aiutano a tenere i muscoli.", c: "L'app li calcola dal tuo peso, con le linee guida. Puoi cambiarli in Io → Macronutrienti." },
];

/** I fogli del «?»: una frase, 3 passi, una domanda aperta e una da toccare */
export const FOGLI = {
  bilancio: { titolo: "Il bilancio", tema: "dieta",
    frase: "Ti dice <b>come andrebbe il peso</b> in una settimana, se ogni giorno fosse come oggi.",
    sopra: "Come si legge",
    passi: ["<b>−</b> il peso scende · <b>+</b> il peso sale.", "🟢 sei in linea · 🟡 quasi · 🔴 un po' lontano.", "Toccalo per vedere i conti."],
    domande: ["d-rosso", "a-passi"] },
  razioni: { titolo: "Le razioni", tema: "pasti",
    frase: "Ti dice <b>quante calorie ti restano</b> oggi.",
    sopra: "Come si legge",
    passi: ["Il numero grande: quello che ti resta.", "Ogni cosa che segni lo fa scendere.", "Sotto: carboidrati, proteine, grassi."],
    domande: ["p-sport", "p-oltre"] },
  attivita: { titolo: "Le attività", tema: "attivita",
    frase: "Segna qui lo sport. Annona lo <b>aggiunge alle calorie del giorno</b>.",
    sopra: "Come si fa",
    passi: ["Scegli cosa hai fatto.", "Metti i minuti.", "Quanta fatica? Parli bene = 1-2. Fiatone = 4-5."],
    domande: ["a-orologio", "a-pulizie"] },
  peso: { titolo: "La bilancia", tema: "peso",
    frase: "Il peso cambia un po' ogni giorno. <b>Guarda la linea</b>, non il singolo numero.",
    sopra: "Come pesarsi",
    passi: ["La mattina, dopo il bagno.", "Prima di mangiare, con poco addosso.", "2-3 volte a settimana bastano."],
    domande: ["w-acqua", "w-linea"] },
  movimento: { titolo: "Il movimento", tema: "attivita",
    frase: "Quanto ti muovi in un giorno normale. <b>Senza lo sport.</b>",
    sopra: "Come sceglierlo",
    passi: ["Pensa al lavoro e alla casa.", "Non sai? Rispondi alle 4 domande.", "Lo sport lo segni a parte, in Attività."],
    domande: ["a-palestra", "a-lavoro"] },
  guardiano: { titolo: "Il guardiano", tema: "dieta",
    frase: "Controlla che <b>il percorso funzioni</b>. Se qualcosa non torna, ti avvisa.",
    sopra: "Come funziona",
    passi: ["Segna cosa mangi.", "Pesati 2 volte a settimana.", "Dopo 3 settimane ti dice come va."],
    domande: ["d-pausa", "d-guardiano"] },
};

/**
 * «Cosa sa fare Annona»: le funzioni divise per momento.
 * vai = dove porta «Provalo»; gesti = apre la spiegazione dei gesti.
 */
export const FUNZIONI = [
  { gruppo: "Ogni giorno", voci: [
    { icona: "piatto", titolo: "Segnare un pasto", testo: "Cerca, scrivi una frase, foto del piatto o codice a barre.", vai: "#/aggiungi" },
    { icona: "spunta", titolo: "Mangiato come da scheda", testo: "Scorri il pasto a destra: un gesto e fatto.", gesti: true },
    { icona: "fuoco", titolo: "Attività", testo: "Sport e camminate fatte apposta.", vai: "#/aggiungi?tipo=attivita" },
    { icona: "bilancia", titolo: "Il peso", testo: "Segna il peso e guarda la linea della settimana.", vai: "#/peso" },
  ] },
  { gruppo: "Con il legionario", ia: true, voci: [
    { icona: "cam", titolo: "Foto del piatto", testo: "Riconosce i cibi e le quantità.", vai: "#/aggiungi" },
    { icona: "documento", titolo: "Importa la tua dieta", testo: "Foto o PDF della scheda del nutrizionista.", vai: "#/importa" },
    { icona: "fiocco", titolo: "Provviste di domani", testo: "Cosa scongelare e preparare stasera.", vai: "#/razioni" },
    { icona: "stelle", titolo: "Chiedi al legionario", testo: "Fai una domanda tua, su dieta o app.", vai: "#/legionario" },
  ] },
  { gruppo: "Per fare prima", voci: [
    { icona: "copia", titolo: "Copia e incolla", testo: "Tieni premuto un alimento o un pasto → Copia.", gesti: true },
    { icona: "rotolo", titolo: "La scheda della settimana", testo: "I pasti di ogni giorno, già pronti in Oggi.", vai: "#/razioni" },
  ] },
  { gruppo: "Nel tempo", voci: [
    { icona: "scudo", titolo: "Il guardiano", testo: "Se il peso si ferma, ti avvisa e propone una pausa.", aiuto: "guardiano" },
    { icona: "elmo", titolo: "Macronutrienti", testo: "Carboidrati, proteine e grassi: li calcola l'app, o scegli tu.", vai: "#/io" },
  ] },
];

/** I gesti, spiegati semplici (foglio «Mostrami») */
export const GESTI = [
  ["👉", "<b>Scorri a destra</b> un pasto della scheda", "l'hai mangiato così."],
  ["👈", "<b>Scorri a sinistra</b>", "hai mangiato altro."],
  ["👆", "<b>Tieni premuto</b> un pasto o un alimento", "copia, incolla, sposta, svuota."],
  ["↩", "<b>Annulla</b>, in alto, per qualche secondo", "se hai sbagliato."],
];

/** I fumetti «una volta sola»: compaiono la prima volta, poi mai più */
export const FUMETTI = {
  attivita: "Hai fatto <b>sport o una camminata</b> apposta? Segnala qui: Annona la aggiunge alle calorie del giorno.",
  scorri: "<b>Scorri a destra</b>: mangiato così. <b>A sinistra</b>: ho mangiato altro. <b>Tocca</b> per cambiare qualcosa.",
  tieni: "<b>Tieni premuto</b> un pasto per copiarlo, incollarlo o svuotarlo.",
  foto: "Puoi anche fare una <b>foto al piatto</b> 📷 o leggere il <b>codice a barre</b> ▥.",
  provviste: "Il <b>fiocco ❄</b> ti dice cosa preparare stasera per domani.",
  aiuto: "Qui trovi <b>spiegazioni, domande</b> e il legionario a cui chiedere.",
};

/** Domande pronte nella pagina del legionario */
export const ESEMPI_LEGIONARIO = [
  "Stasera mangio fuori: come lo segno?",
  "Come peso la pasta cotta?",
  "Ho saltato la colazione: va bene?",
];
