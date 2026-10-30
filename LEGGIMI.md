# 🌾 Annona — la tua guida

La tua app per tenere le razioni in ordine: calorie, deficit, peso e, sempre in cima, il tuo giuramento.

---

## 1. Dove sta cosa

| Cosa | Dove |
|---|---|
| **L'app** | https://gfeola21gf-ai.github.io/annona/ |
| **Hosting** | GitHub Pages → progetto *annona* sul tuo GitHub (prima era su Netlify) |
| **Database, account e IA** | Supabase → progetto *le-mie-routine* (lo stesso dell'altra app, tabelle `annona_…`) |
| **Il codice** | la cartella `Annona` sul Mac (questa) |
| **Le chiavi segrete** | Supabase → Edge Functions → Secrets (la chiave di Gemini sta solo lì) |

---

## 2. Come funziona

```
 iPhone (Annona)  ──►  Supabase: i tuoi dati (solo tuoi)
        │
        └──►  funzione "annona" su Supabase  ──►  Gemini (IA)  /  Open Food Facts (prodotti)
```

- **Prima il telefono**: tutto viene salvato subito sull'iPhone e poi spedito a Supabase. Senza internet l'app funziona lo stesso
  (tranne IA e ricerca dei prodotti) e recupera appena torna la rete.
- **I calcoli**:
  - *Basale* = calorie bruciate a riposo (formula di Mifflin-St Jeor, aggiornata col peso più recente).
  - *Movimento di ogni giorno* = quanto ti muovi senza allenamenti (Io → scegli il livello, con esempi e 4 domande guida).
  - *Fabbisogno del giorno* = basale × movimento + attività che registri.
  - *Bilancio* = mangiato − fabbisogno → negativo = **deficit**, positivo = **surplus**.
  - *Stima kg a settimana* = (fabbisogno di oggi − kcal di oggi) × 7 ÷ 7.700: quanto cambieresti se ogni giorno fosse come oggi.
    I pasti che non hai ancora segnato contano come quelli **previsti** dalla scheda (senza scheda: una parte del piano;
    i pasti «non mangiato» valgono 0). Il **bollino** accanto dice quanto sei VICINO al deficit che hai scelto (da entrambe le parti):
    🟢 entro ±100 kcal · 🟡 entro ±250 · 🔴 oltre (anche un deficit troppo grande, es. un pasto saltato, non è verde) ·
    ⚪ grigio finché non hai segnato il primo pasto della giornata.
  - *Giorni che contano*: se riapri Annona dopo qualche giorno, il foglio **Bentornato** chiede quali giorni contare
    (un giorno registrato a metà no, un digiuno sì). Servono al guardiano del metabolismo.
  - *Media 7 giorni del peso* = la linea del grafico: ignora le oscillazioni dovute all'acqua.
- **Taratura**: dopo 3 settimane di pasti e pesate, il guardiano calcola quanto consumi davvero e, se il livello scelto
  non torna, ti propone quello giusto. Decidi sempre tu.

---

## 3. Le Razioni (la tua scheda settimanale)

- **Razioni → Giorno**: in alto i giorni con un puntino (🟢 vicino al piano, 🟡 lontano), sotto il **totale grande** del giorno
  («1.458 kcal su 1.845») con la differenza dal piano, la barra dei macro e **quattro piastrelle**: icona e nome del pasto,
  gli alimenti in breve, le kcal grandi. **Tocca** una piastrella per modificare il pasto: dagli un **nome** (es. «Colazione yogurt»),
  cambia quantità, togli, aggiungi, **Copia su altri giorni…** oppure **Svuota**. **Tieni premuta** una piastrella per
  Copia / Incolla / Svuota (con **Annulla**).
- **Menu ⋯** (in alto a destra): **Copia su…** (il giorno mostrato su altri giorni), **Importa una scheda** (foto anche scritta
  a mano, PDF o testo: il legionario la trascrive, tu controlli e confermi; la nuova scheda **sostituisce** la vecchia), **Svuota**.
- **Razioni → Settimana**: tutta la settimana a colpo d'occhio, come **tabella** ▦ o **agenda** ☰ (l'app ricorda la scelta).
- **Oggi**: i pasti della scheda non ancora registrati appaiono tratteggiati, «dalla scheda», con le kcal in grigio:
  - **scorri a destra** = mangiato così com'è; **scorri a sinistra** = «ho mangiato altro» (si apre Aggiungi per quel pasto);
  - **tocca** = foglio con gli alimenti già spuntati: togli la spunta a ciò che non hai mangiato, tocca i grammi per cambiarli,
    poi **Mangiato**. «Cambia o aggiungi altro» apre l'editor completo (e poi chiede se aggiornare anche la scheda);
  - **tieni premuto** = menu (Mangiato così, Spunta gli alimenti, Ho mangiato altro, Non l'ho mangiato).
- **Provviste di domani**: il fiocco ❄ in alto a sinistra in Razioni (il numero = cose ancora da fare) e, dalle 18, in fondo a Oggi. L'IA dice cosa scongelare, cuocere,
  porzionare o preparare stasera. Spunti le cose fatte. Se cambi la scheda di domani, la lista si rifà da sola.

---

## 4. Foto del piatto e codice a barre

**Calorie più precise:** l'IA riconosce cosa c'è e quanto; se l'alimento è nella tabella interna dell'app
(valori ufficiali CREA, circa 130 cibi comuni) le calorie le calcola l'app dalla tabella, non l'IA.

Nella schermata **Aggiungi → Pasto** c'è **una sola barra**: «Cerca, scrivi o detta…» (per dettare usa il 🎤 della **tastiera**).
Mentre scrivi compaiono gli alimenti trovati (prima i tuoi e la tabella, poi Open Food Facts); in cima c'è **✨ Stima con l'IA**
per la frase intera («2 uova strapazzate e pane»): l'IA parte solo se la tocchi. Il pasto si cambia toccando il **titolo** (Colazione ▾).
Dentro la barra, a destra, due icone:
- **Foto** (📷): scatti (o scegli dalla galleria) il piatto. Il legionario lo guarda e mette nel vassoio un alimento per riga,
  con quantità «a occhio»: controllale col dosatore. Se prima scrivi o detti una nota («olio a crudo», «metà porzione»), la usa come aiuto.
  Funziona anche con l'**etichetta** di un prodotto (la tabella nutrizionale).
- **Codice** (▥): si apre la fotocamera con il mirino; quando il codice a barre entra nella cornice viene letto da solo.
  Il prodotto arriva da **Open Food Facts** e si apre il dosatore già su *1 porzione* del produttore.
  Se la fotocamera non va, scrivi le cifre sotto le barre. Se il prodotto non c'è: cerca per nome, scrivi a mano o fotografa l'etichetta.

---

## 4a. Attività e alimenti usati spesso

- **Aggiungi → Attività**: tocchi *che cosa* (corsa, camminata, bici, pesi, **kettlebell**, nuoto, sport, yoga, altro),
  i **minuti** e l'**intensità da 1 a 5** (come le zone cardiache: sotto vedi i tuoi battiti e quanto riesci a parlare).
  Se li hai, scrivi i dati dell'**orologio**: *kcal attive*, *battito medio*, *km*. L'app fa i conti da sola con il dato
  più preciso (kcal attive → battito → km → intensità) e ti dice da dove viene il numero. Solo per «Altro» la descrivi e l'IA stima.
- **Sotto la barra**, quando è vuota: *Spesso a cena* (tutto quello che hai mangiato in quel pasto negli ultimi 60 giorni,
  **anche una volta sola**: prima i più frequenti, poi i più recenti, con la quantità solita) oppure *Di recente*
  (gli ultimi 15 alimenti di qualsiasi pasto), con kcal e macro (C P G colorati). La barra di ricerca è già attiva: scrivi subito. Tocchi il **+** e scegli la quantità.
  Quello che scegli finisce nel vassoio in fondo: «2 alimenti · 284 kcal · **Aggiungi**».

## 4b. Oggi e i macronutrienti

- In cima a **Oggi**, sotto il giuramento, due riquadri:
  - **Razioni**: quante kcal ti restano (o di quanto sei *oltre il piano*), quante ne hai mangiate «su» quante, la barra che si riempie
    e carboidrati, proteine e grassi rispetto al tuo obiettivo.
  - **Bilancio** (terracotta): «−0,5 kg / settimana» in grande, sotto in piccolo il deficit di oggi, a destra il bollino.
    **Toccalo** per vedere i conti: basale × movimento + attività, mangiate + previste, obiettivo.
- **Toccando un pasto** si apre l'elenco: nome, grammi e macro colorati, kcal. **Tocca una riga** per il foglio **Modifica**:
  **Quantità** (tastierino o pezzi con −/+), **Valori** (kcal e macro **per 100 g** come sull'etichetta, con «Ricorda per la
  prossima volta»: nella ricerca troverai il tuo, già corretto) o **Cambia** (Aggiungi con in cima «Al posto di…»).
- **Gesti, come sull'iPhone** (sugli alimenti di un pasto e nel vassoio di Aggiungi):
  **scorri a destra** = duplica · **scorri a sinistra** = elimina · **tieni premuto** = menu (Modifica quantità, Modifica valori,
  Cambia alimento, Copia, Duplica, Sposta in…, Elimina) · **tieni premuto e trascina** sopra «Sposta in» = sposti l'alimento in un
  altro pasto. Dopo ogni azione, in alto, compare **Annulla** per qualche secondo.
- **Tieni premuto un pasto** in Oggi: Apri, Aggiungi, **Copia il pasto**, Incolla, Svuota.
- **Io → Macronutrienti**: due modi.
  - **Consigliati** (già scelto): dici solo se ti alleni (**cardio o sport**, **pesi**, anche entrambi) e l'app calcola
    con le linee guida italiane: proteine in base al **peso** (da 1 a 2,2 g per kg), grassi il 30%, carboidrati il resto (mai sotto
    130 g). Se cambiano peso o calorie, i grammi si aggiornano da soli.
  - **Su misura**: scegli le percentuali con −/+ (i carboidrati sono il resto). Se un valore esce dai consigli, la riga
    diventa gialla e dice qual è il valore consigliato. Oppure tocca **Chiedi al legionario**: anche la sua proposta passa dagli stessi controlli.
- **Ritmo**: si sceglie **Dolce / Costante / Deciso**, in proporzione al peso (per aumentare: 0,25% o 0,5% a settimana).
  I kg si ricalcolano da soli quando il peso cambia.
- **Novità**: dopo un aggiornamento importante, la prima volta che apri l'app compare una breve schermata che spiega cosa è
  cambiato e i tuoi numeri «prima → ora». Si rivede in **Io → Aiuto → Novità**. Quello che hai scelto su misura non cambia.
- **Copia e incolla**: tieni premuto un alimento (o un pasto) → **Copia**. Da quel momento **ogni pasto mostra «Incolla»**
  (in Oggi, in qualsiasi giorno, e tenendo premuta una piastrella di Razioni): un tocco e fatto. Gli appunti restano finché
  non tocchi la ✕ sulla barra sopra i pasti.
- **Io → Dati sul server**: «Allineato alle 16:20»; toccalo per riallineare subito. Telefono e PC si riallineano da soli
  quando riapri l'app, quando torni sulla finestra e ogni minuto; se cambiano due cose diverse del profilo, restano entrambe.

---

## 4c. Il guardiano del metabolismo

- Ogni giorno l'app confronta il peso che ti aspettavi di perdere (dalle calorie registrate) con quello perso davvero.
  Se la media del peso è ferma da 3 settimane, oppure sei in deficit da 12 settimane di fila, in **Oggi** compare il riquadro
  *Il guardiano veglia*. **Non è mai un obbligo**: «Non ora» lo nasconde per una settimana.
- **Pausa dalla dieta**: 7 o 14 giorni in cui l'obiettivo diventa il fabbisogno (niente deficit). La avvii tu, la interrompi quando vuoi.
- **Io → Valuta il mio percorso**: l'IA guarda le tue ultime 6 settimane e ti dice se è uno stallo vero, con un consiglio.
  Servono almeno 3 settimane di pasti e pesate registrati.

---

## 4d. Annona tra amici (inviti, suggerimenti, password)
- **Invitare**: Io → **Inviti e amici** (lo vedi solo tu) → «Invia l'invito su WhatsApp». Il messaggio ha il link con il
  codice già inserito, i 3 passi per installarla e ricorda il pulsante dei suggerimenti. Un codice vale per 10 persone;
  «Spegni codice» lo disattiva, «Crea un codice» ne fa uno nuovo.
- **L'amico** apre il link → «Crea account» (email, password; il codice c'è già). Chi ha già un account (Volantinaggio,
  Le mie routine) sceglie «Entra»: il codice glielo chiede una volta sola subito dopo.
- **Senza codice** un account del progetto non può usare Annona né la sua IA (le registrazioni sono aperte per Volantinaggio).
- **Tetto**: ogni amico può chiedere all'IA 60 stime al giorno (tu nessun limite). Nell'elenco vedi quante ne ha usate oggi.
- **Password dimenticata**: le mail di recupero di Supabase gratis arrivano solo a te, non agli amici. Allora in Inviti e amici
  tocchi «Password» accanto all'amico → password temporanea → «Mandala su WhatsApp». Lui la cambia in Io → Account → Cambia password.
- **Sospendi**: l'amico non usa più l'IA, i suoi dati restano; «Riattiva» per tornare indietro. Per cancellarlo del tutto:
  Supabase → Authentication → Users → l'utente → Delete (cancella anche i suoi dati nelle altre app: fallo solo se lo chiede lui).
- **Suggerimenti**: tutti hanno Io → «Scrivi un suggerimento»; tu li leggi in Io → «Suggerimenti ricevuti» (con «N nuovi»).

## 4e. L'aiuto dentro l'app (spiegazioni, domande, legionario)
- **Il «?»**: un cerchietto accanto alle cose difficili (Oggi → Razioni e Bilancio, Aggiungi → Attività, Peso, Io → Movimento e
  Guardiano). Toccalo: una frase, 3 passi, due domande frequenti e «Chiedi al legionario».
- **Fumetti una volta sola**: la prima volta che incontri una funzione nascosta (la riga Attività, «scorri» sui pasti della scheda,
  «tieni premuto», Foto e Codice, il fiocco ❄, l'Aiuto in Io) compare un fumetto. «Ho capito» e non torna più. Uno alla volta.
- **Io → Aiuto**: *Cosa sa fare Annona* (tutte le funzioni con «Provalo»), *Domande e consigli* (per tema, con la ricerca),
  *Chiedi al legionario* (domande libere all'IA, che conosce l'app e i tuoi numeri; conta nel tetto di 60 al giorno degli amici),
  *Rivedi i suggerimenti* (fa ricomparire i fumetti: utile per far provare l'app a qualcuno).
- I testi stanno tutti in `dati/aiuto.js`: per aggiungere una domanda basta una riga. Regola: semplici, corti e **delicati**.
- La riga **Attività** in Oggi, quando è vuota, dice «Camminata, palestra, sport…» e ha il + colorato.

---

## 4f. Copia di sicurezza
Doppio clic su **`App-Annona/CopiaDiSicurezza/Fai la copia.command`**: salva sul Mac tutte le tabelle del progetto
(anche delle altre app) e gli account. Tiene le ultime 20 copie. Una volta a settimana basta. Dettagli nel `LEGGIMI.md` di quella cartella.

## 5. Aggiornare l'app dopo una modifica

```bash
bash pubblica.sh Annona
```
(dalla cartella `ElementareClaude_Workshop_Esercitazione`). Poi sull'iPhone **chiudi del tutto** l'app e riaprila.

---

## 6. Installarla sull'iPhone

1. Apri **Safari** e vai su https://gfeola21gf-ai.github.io/annona/
2. **Condividi** → **Aggiungi alla schermata Home** → **Aggiungi**.
3. Apri l'app dall'icona (la spiga) ed entra con **email e password di Le mie routine**.

---

## 7. Cambiare intelligenza artificiale

In Supabase → Edge Functions → **Secrets**:
- con la chiave `ANTHROPIC_API_KEY` risponde **Claude** (veloce e stabile, pochi centesimi al mese) e, se non ce la fa, Gemini fa da riserva;
- senza quella chiave risponde solo **Gemini** (gratis, ma a volte sovraccarico);
- `IA_FORNITORE` = `gemini` mette Gemini per primo e Claude di riserva.

L'app non va toccata.

---

## 8. Se qualcosa non va

| Problema | Cosa fare |
|---|---|
| **"Il servizio non risponde" quando uso la voce** | Controlla internet. Se continua: Supabase potrebbe essere in pausa (vedi sotto) o manca la chiave Gemini nei Secrets. |
| **"Limite gratuito dell'IA raggiunto"** | Il piano gratis di Gemini ha un limite al minuto/giorno: aspetta un minuto. |
| **Come detto?** | Tocca il riquadro di testo e usa il **microfono della tastiera** 🎤 (il microfono dell'app è stato tolto: iOS chiedeva il permesso ogni volta). |
| **L'app mostra la versione vecchia** | Chiudila del tutto e riaprila (anche due volte). |
| **"Importa" o "Provviste" dicono che il servizio non risponde** | Come per la voce: internet, Supabase in pausa o chiave Gemini. Una scheda lunga può richiedere fino a un minuto. |
| **Il codice a barre non apre la fotocamera** | La prima volta l'iPhone chiede il permesso: tocca **Consenti**. Se l'hai negato: Impostazioni → Safari → Fotocamera → Chiedi. Intanto puoi scrivere le cifre. |
| **"Prodotto non trovato"** | Open Food Facts non ha tutti i prodotti: usa *Cerca per nome* o *Fotografa l'etichetta*. |
| **Dati non salvati sul server** | Profilo (Io) → *Dati sul server*: dice se ci sono modifiche in attesa. Toccalo per riprovare. Se Supabase è **in pausa** (7 giorni senza uso): supabase.com/dashboard → progetto → **Restore**. |

---

## 9. Cosa arriva nelle prossime tappe

2. ~~Razioni~~ ✅ fatto (scheda settimanale, Provviste di domani, Mangiato ✓, import da foto/PDF/testo).
3. ~~Foto del piatto e codice a barre~~ ✅ fatto.
4. **Promemoria serale** per il prep, le tue domande in più nel giuramento.
