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
  - *Previsione* = media del bilancio degli ultimi 7 giorni completi in cui hai registrato i pasti × 7 ÷ 7.700 = kg a settimana.
  - *Media 7 giorni del peso* = la linea del grafico: ignora le oscillazioni dovute all'acqua.
- **Taratura**: dopo 3 settimane di pasti e pesate, il guardiano calcola quanto consumi davvero e, se il livello scelto
  non torna, ti propone quello giusto. Decidi sempre tu.

---

## 3. Le Razioni (la tua scheda settimanale)

- **Razioni → Giorno**: scegli il giorno in alto (il puntino è oggi), tocca **+ Aggiungi** in un pasto e inserisci gli
  alimenti come nel diario (voce, ricerca, dosatore). Tocca una voce per cambiarne la quantità o toglierla.
- **Copia su…**: copia il giorno mostrato su altri giorni (quelli scelti vengono sostituiti). Da lì puoi anche svuotare il giorno.
- **Razioni → Settimana**: tutta la settimana a colpo d'occhio, come **tabella** ▦ o **agenda** ☰ (l'app ricorda la scelta).
- **Importa** (freccia in alto a destra): foto (anche scritta a mano), PDF o testo incollato. Il legionario la trascrive,
  tu controlli giorno per giorno e confermi: la nuova scheda **sostituisce** quella vecchia.
- **Oggi**: i pasti della scheda non ancora registrati appaiono tratteggiati come *previsti*, con due pulsanti tondi:
  **✓ verde** = mangiato così com'è (registrato subito), **✗ rossa** = non l'ho mangiato (↺ per rimetterlo).
  Toccando il pasto lo modifichi: quantità, togli, aggiungi con voce/foto/codice/ricerca. Se l'hai cambiato,
  Annona chiede se aggiornare anche la scheda per le prossime volte.
- **Razioni**: tocca un pasto (tabella, agenda o il titolo del pasto nel Giorno) per modificarlo nella scheda:
  dagli un **nome** (es. «Colazione yogurt»: negli elenchi vedrai il nome al posto della lista degli alimenti; se altri giorni
  hanno lo stesso pasto, Annona propone lo stesso nome), cambia quantità, togli, aggiungi, **Copia su altri giorni…** (es. la colazione del mercoledì anche la domenica),
  oppure **Svuota** il pasto.
- **Provviste di domani**: in cima a Razioni e, dalle 18, in fondo a Oggi. L'IA dice cosa scongelare, cuocere,
  porzionare o preparare stasera. Spunti le cose fatte. Se cambi la scheda di domani, la lista si rifà da sola.

---

## 4. Foto del piatto e codice a barre

Nella schermata **Aggiungi → Pasto**, ai lati del microfono:
- **Foto**: scatti (o scegli dalla galleria) il piatto. Il legionario lo guarda e mette nel vassoio un alimento per riga,
  con quantità «a occhio»: controllale col dosatore. Se prima scrivi o detti una nota («olio a crudo», «metà porzione»), la usa come aiuto.
  Funziona anche con l'**etichetta** di un prodotto (la tabella nutrizionale).
- **Codice**: si apre la fotocamera con il mirino; quando il codice a barre entra nella cornice viene letto da solo.
  Il prodotto arriva da **Open Food Facts** e si apre il dosatore già su *1 porzione* del produttore.
  Se la fotocamera non va, scrivi le cifre sotto le barre. Se il prodotto non c'è: cerca per nome, scrivi a mano o fotografa l'etichetta.

---

## 4b. Oggi e i macronutrienti

- In cima a **Oggi**, sotto il giuramento, due riquadri:
  - **Razioni**: quante kcal ti restano (o di quanto sei *oltre il piano*), quante ne hai mangiate, la barra che si riempie
    e carboidrati, proteine e grassi rispetto al tuo obiettivo.
  - **Bilancio**: il deficit (o surplus) del giorno in grande, a destra i kg a settimana a questo ritmo, sotto basale × movimento + attività.
- **Io → Macronutrienti**: scegli le percentuali con −/+ (i carboidrati sono il resto) oppure tocca **Chiedi al legionario**,
  racconta la dieta che vuoi fare e la tua situazione, e usa la proposta dell'IA.

---

## 4c. Il guardiano del metabolismo

- Ogni giorno l'app confronta il peso che ti aspettavi di perdere (dalle calorie registrate) con quello perso davvero.
  Se la media del peso è ferma da 3 settimane, oppure sei in deficit da 12 settimane di fila, in **Oggi** compare il riquadro
  *Il guardiano veglia*. **Non è mai un obbligo**: «Non ora» lo nasconde per una settimana.
- **Pausa dalla dieta**: 7 o 14 giorni in cui l'obiettivo diventa il fabbisogno (niente deficit). La avvii tu, la interrompi quando vuoi.
- **Io → Valuta il mio percorso**: l'IA guarda le tue ultime 6 settimane e ti dice se è uno stallo vero, con un consiglio.
  Servono almeno 3 settimane di pasti e pesate registrati.

---

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
- per usare **Claude**: aggiungi `ANTHROPIC_API_KEY` (la tua chiave) e `IA_FORNITORE` = `claude`;
- per tornare a **Gemini**: cancella `IA_FORNITORE` (o mettilo a `gemini`).

L'app non va toccata.

---

## 8. Se qualcosa non va

| Problema | Cosa fare |
|---|---|
| **"Il servizio non risponde" quando uso la voce** | Controlla internet. Se continua: Supabase potrebbe essere in pausa (vedi sotto) o manca la chiave Gemini nei Secrets. |
| **"Limite gratuito dell'IA raggiunto"** | Il piano gratis di Gemini ha un limite al minuto/giorno: aspetta un minuto. |
| **La dettatura non parte** | Tocca il riquadro di testo e usa il **microfono della tastiera** 🎤. |
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
