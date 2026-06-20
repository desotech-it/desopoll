# desopoll

Piattaforma di **quiz e sondaggi dal vivo** self-hosted: l'host proietta le domande su uno schermo condiviso, i partecipanti rispondono dal proprio telefono entrando con un PIN, e i punteggi si aggiornano in tempo reale tra una domanda e l'altra.

Pensata sia per la **formazione e le certificazioni** (domande lunghe in stile VMware VCP, AWS, ecc., con immagini e diagrammi) sia per il **coinvolgimento dal vivo** (lezioni, eventi, team building).

---

## Cosa fa

- **Partite dal vivo con PIN** — l'host avvia una sessione e ottiene un PIN; i giocatori entrano da browser/telefono con PIN e nickname, senza bisogno di un account.
- **Esperienza a due viste** — schermo *host* (proiettore) e schermo *giocatore* (mobile), pensati separatamente.
- **Punteggio per accuratezza e velocità**, con classifica intermedia tra le domande e **podio finale**.
- **Statistiche post-partita** per giocatore e per singola domanda.

## Tipi di domanda

Architettura a tipi estensibili. Tipi previsti:

- Scelta singola
- Scelta multipla (più risposte corrette)
- Vero / Falso
- Risposta aperta (testo)
- Numerica e slider/intervallo
- Ordinamento (riordina)
- Sondaggio (senza punteggio)
- Nuvola di parole

Ogni domanda è configurabile singolarmente: **testo lungo** sempre leggibile per intero, **immagine** allegata (apribile a tutto schermo), **tempo dedicato**, **punti** (standard / doppi / nessuno) e bonus velocità.

## Amministrazione e condivisione

- **Ruoli**: *Amministratore* (gestione di utenti e gruppi) e *Utente* (crea e possiede i propri poll). Principio di separazione gestione/contenuto: l'amministratore gestisce gli account ma non accede ai contenuti altrui per impostazione predefinita.
- **Gruppi** di utenti, con gestione dei membri.
- **Proprietà** dei poll per utente e **condivisione** verso singoli utenti o interi gruppi.
- **Livelli di permesso** crescenti: *Sola lettura* → *Può giocare/ospitare* → *Può modificare* → *Co-proprietario*. In caso di permessi multipli (diretto e via gruppo) vale sempre il più alto.
- **Link di partecipazione** revocabile (solo modalità gioco).

## Interfaccia

Design **liquid glass** su tema chiaro: pannelli traslucidi, palette pastello, layout responsive ottimizzato per le due viste (host e giocatore).

## Architettura

- **Livello real-time sostituibile**: la logica di gioco dipende da un'unica interfaccia di trasporto, con due implementazioni intercambiabili — **HTTP polling** (compatibile con hosting condiviso) e **WebSocket** (per ambienti con processo persistente, es. VPS). Il passaggio dall'uno all'altro non richiede modifiche alla logica.
- **Stato di gioco autoritativo lato server** (lobby → domanda → raccolta → risultati → classifica → podio), con calcolo dei tempi di risposta lato server.
- **Modello dati estensibile**: domande polimorfiche per tipo; utenti, gruppi e condivisioni gestiti con tabelle dedicate additive.

## Stato del progetto

🎨 **Fase di design completata** — flussi, modello dati e mockup di tutte le schermate (gioco, editor, amministrazione, condivisione, statistiche).

🛠️ **Implementazione** — in avvio.

## Licenza

Distribuito secondo i termini riportati nel file [LICENSE](LICENSE).
