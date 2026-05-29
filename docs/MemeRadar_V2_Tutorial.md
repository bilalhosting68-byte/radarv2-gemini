---
title: "MemeRadar V2 - Tutorial completo"
subtitle: "Guida passo passo per installare, configurare e usare il bot memecoin in paper trading event-driven"
author: "Generato da MemeRadar System"
date: "Maggio 2026"
---

# 1. Copertina
**MemeRadar V2 - Tutorial completo**
*Guida passo passo per installare, configurare e usare il bot memecoin in paper trading event-driven.*

> ⚠️ **PAPER TRADING ONLY:** Nessun wallet, nessuna private key, nessuna transazione reale. Questo progetto è SOLO a scopo educativo e di test statistico.

*Data di generazione: Maggio 2026*
*Versione Progetto: 1.0.0*

---

## 2. Introduzione
MemeRadar V2 è un framework avanzato per il test di logiche di trading su memecoin (rete Solana) all'interno di un ambiente completamente simulato (Paper Trading). A differenza delle versioni precedenti, V2 introduce un'architettura **event-driven** basata su **Redis** e **BullMQ**.
Questo rende il sistema resiliente, asincrono e capace di gestire fallimenti API e picchi di richieste, garantendo un'affidabilità superiore. Resta rigorosamente *paper trading only* per garantire sicurezza ed evitare perdite di fondi in esperimenti imperfetti.

---

## 3. Avvertenza importante sui rischi
- **Speculazione:** Le memecoin sono altamente speculative.
- **Scam e Rugpull:** La maggior parte dei token lanciati ogni giorno sono progettati per sottrarre liquidità.
- **Limiti della simulazione:** Il paper trading non garantisce risultati reali. In un ambiente reale incontrerai *slippage* elevato, latenza di rete, *front-running*, *MEV* e tasse di transazione che non possono essere modellate perfettamente senza una lettura approfondita e tempestiva della blockchain.
- **No soldi facili:** Questo strumento serve a sviluppare analisi quantitative e logiche condizionali, non a produrre "soldi facili".

---

## 4. Architettura generale
I moduli del sistema:
- **Data Ingestion:** Scanner che raccoglie dati.
- **DexScreener Adapter:** Legge dati API.
- **MockRealtime Adapter:** Simula dati per i test.
- **BullMQ/Event Bus:** Gestore asincrono della messaggistica su Redis.
- **Redis:** Store rapido e backend per le code.
- **PostgreSQL:** Persistenza a lungo termine dei risultati.
- **Prisma:** ORM per l'accesso a Postgres.
- **Risk Engine V2:** Valutatore punteggi.
- **On-chain checks placeholder:** Struttura per futuri controlli read-only (authority).
- **Paper Trading Engine V2:** Motore di gestione delle simulazioni.
- **Slippage Model V2:** Valuta impatto sul prezzo (FIXED o AMM).
- **AMM Constant Product:** Modello realistico del prezzo.
- **Price Tracker V2:** Monitora i token virtualmente detenuti.
- **Metrics V2:** Statistiche sulle performance.
- **Discord Alerts:** Notifiche webhooks.
- **Report/export:** Output.

**Diagramma Logico:**
```text
Data Source / DexScreener / MockRealtime
        ↓
Ingestion Service
        ↓
BullMQ Queues / Redis
        ↓
Risk Engine V2
        ↓
Paper Trading Engine V2
        ↓
Price Tracker V2
        ↓
PostgreSQL + Redis + Metrics + Discord Alerts
```

---

## 5. Requisiti
- Server consigliato: VPS Ubuntu
- Node.js 20+ e npm
- Docker e Docker Compose (necessari per PostgreSQL e Redis in locale)
- Nessuna API key obbligatoria (DexScreener è pubblico, ma sottoposto a rate limit)
- Webhook Discord (opzionale)

---

## 6. Installazione passo passo da zero su Ubuntu
Se parti da un server Ubuntu vergine, esegui:

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git ca-certificates
```

**Installazione Node.js 20:**
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v
npm -v
```

**Installazione Docker:**
```bash
curl -fsSL https://get.docker.com | sudo sh
docker --version
docker compose version
```

**Clonare o aprire il progetto:**
```bash
cd ~
# Clona il tuo repository qui
cd MemeRadar_V2
```

**Installare dipendenze:**
```bash
npm install
```

**Configurare .env:**
```bash
cp .env.example .env
nano .env
```

**Avviare servizi database e Redis:**
```bash
docker compose up -d
docker ps
```

**Inizializzazione Prisma:**
```bash
npm run prisma:generate
npm run prisma:migrate -- --name init
```

**Verifiche di sistema:**
```bash
npm run typecheck
npm test
npm run build
```

**Avvio:**
Per lo sviluppo:
```bash
npm run dev
```
In produzione:
```bash
npm run build
npm start
```

---

## 7. Configurazione .env passo passo

- **DATABASE_URL**
  - Cosa fa: Stringa di connessione a PostgreSQL.
  - Consigliato: (Default nel file)
  - Quando modificare: Se cambi password nel `docker-compose.yml`.

- **REDIS_URL**
  - Cosa fa: Connessione a Redis.
  - Consigliato: `redis://localhost:6380` (come nel file).

- **PROCESSED_TOKEN_TTL_MINUTES**
  - Cosa fa: Tempo di permanenza nella cache Redis per i pair già analizzati.
  - Valore consigliato: `30`.
  - Quando modificarla: Per scansionare più o meno frequentemente gli stessi token.

- **DISCORD_WEBHOOK_URL**
  - Cosa fa: Invia le allerte Discord.
  - Consigliato: Lascialo vuoto, oppure inserisci l'url del tuo server.
  - Rischio: Mostrare a terzi i propri test o inondare il proprio canale se lo scanner fa spam.

- **BOT_MODE**
  - Cosa fa: Modalità globale.
  - Consigliato: `paper`.
  - Rischio: Qualsiasi altra cosa fermerà l'engine in questa versione.

- **DATA_SOURCE_MODE**
  - Cosa fa: Fonte dati (`rest` o `mock`).
  - Consigliato: `rest`.
  - Quando modificare: Metti `mock` per fare test isolati offline senza consumare API rate limit.

- **ENABLE_MOCK_REALTIME**
  - Cosa fa: Aggiunge token fasulli anche quando si usa `rest`.
  - Consigliato: `false`.

- **SCAN_INTERVAL_SECONDS / PRICE_UPDATE_INTERVAL_SECONDS / METRICS_INTERVAL_MINUTES**
  - Cosa fa: Imposta la frequenza dei loop principali.
  - Consigliato: `15`, `10`, `5` rispettivamente.
  - Rischio: Intervalli di scan troppo bassi scatenano Errori 429 da DexScreener.

- **MIN_LIQUIDITY_USD / MIN_VOLUME_5M_USD / MIN_BUY_RATIO**
  - Cosa fa: Soglie del filtro d'ingresso.

- **MIN_MARKET_CAP_USD / MAX_MARKET_CAP_USD**
  - Cosa fa: Filtro di tolleranza capitalizzazione.

- **RISK_MAX_ALLOWED_LEVEL**
  - Cosa fa: Sbarra le porte a token troppo rischiosi.
  - Consigliato: `MEDIUM` o `HIGH`. Mai usare `EXTREME` a meno di esperimenti kamikaze in paper trading.

- **UNKNOWN_ONCHAIN_CHECK_PENALTY**
  - Cosa fa: La penalità per verifiche onchain non effettuate (poiché non implementate).
  - Consigliato: `5`.

- **VIRTUAL_STARTING_BALANCE_USD / VIRTUAL_POSITION_SIZE_USD / MAX_OPEN_POSITIONS**
  - Cosa fa: Controlla la gestione portafoglio finto.
  - Consigliato: `10` dollari per position. `MAX_OPEN_POSITIONS=3`.

- **SLIPPAGE_MODEL**
  - Cosa fa: "FIXED" o "AMM_CONSTANT_PRODUCT".
  - Consigliato: `AMM_CONSTANT_PRODUCT` per simulazioni più realistiche.

- **STOP_LOSS_PERCENT / TAKE_PROFIT_PERCENT / TRAILING_STOP_PERCENT**
  - Cosa fa: Parametri percentuali della strategia di uscita.

- **MAX_HOLD_MINUTES**
  - Cosa fa: Chiusura forzata temporale.

- **PRICE_STALE_MINUTES**
  - Cosa fa: Tempo massimo di tolleranza prima di abbandonare un pair se l'API tace.

**Test reale DexScreener:**
```env
DATA_SOURCE_MODE="rest"
ENABLE_MOCK_REALTIME=false
```

**Test isolato Mock:**
```env
DATA_SOURCE_MODE="mock"
ENABLE_MOCK_REALTIME=true
```

---

## 8. Come creare Discord Webhook
1. Entra nel tuo Server Discord.
2. Scegli il canale di testo dedicato al bot.
3. Clicca sull'icona a ingranaggio "Modifica canale" (Impostazioni canale).
4. Vai nella sezione **Integrazioni**.
5. Seleziona **Webhook** e clicca su **Nuovo webhook**.
6. Dagli un nome e clicca su **Copia URL webhook**.
7. Incolla questo url in `.env` come valore di `DISCORD_WEBHOOK_URL`.
8. Riavvia il bot.
**Nota di sicurezza:** Mai pubblicare l'URL, chiunque ne sia in possesso potrebbe spammare il canale.

---

## 9. Come avviare MemeRadar V2
- `npm run dev`: Utilizza `tsx` per lanciare il codice sorgente con watch, utile per sviluppare.
- `npm run build`: Compila TypeScript.
- `npm start`: Avvia la build compilata di produzione.
- Altri script di utility: `npm test`, `npm run report`, `npm run metrics:summary`, `npm run export:csv`, `npm run docs:pdf`.

**Avvio continuo su VPS con `screen`:**
```bash
sudo apt install -y screen
screen -S memeradar-v2
npm run build
npm start 2>&1 | tee -a memeradar-v2.log
```
Per uscire lasciando il bot in background, premi la sequenza: `CTRL+A` seguito da `D`.
Per rientrare, usa `screen -r memeradar-v2`.

---

## 10. Come capire se sta funzionando
Nei log (che usano la libreria `Pino`), cerca:
- "Connected to PostgreSQL database".
- "Connected to Redis".
- Eventi BullMQ processati (`Starting job process-candidate`).
- Alert Discord inviati ("🚀 MemeRadar_V2 started").
- Nel tempo vedrai "Opened paper position" o "Price update cycle". Se ci sono continue "Skipped entry", significa che il Risk Engine sta filtrando correttamente token pessimi.

---

## 11. Data Ingestion
Il modulo `IngestionService` regola la raccolta dati.
- **DexScreener REST**: Chiede gli ultimi token a `/token-profiles/latest/v1`, li filtra per catena (Solana), ne chiede i dettagli pair, rispettando limiti rigorosi per non essere bannati. In caso di errore API si ferma al backoff configurato.
- **MockRealtime**: Restituisce dati puramente casuali. Usato per testare la scalabilità della struttura.
- **Perché Mock non vale**: L'azione casuale del Mock porta PNL a caso, non usalo per testare una strategia. Serve per testare l'infrastruttura.

---

## 12. BullMQ/Event Bus
L'architettura usa Redis tramite BullMQ definendo Code (*Queues*):
- `token.discovered`: Ingresso scanner.
- `token.enriched`: Spazio per futura espansione.
- `risk.analyze`: Calcola score (Risk Engine).
- `paper.evaluate-entry`: Controlla stop, fondi, entry (Paper Engine).
- `price.update`: Aggiorna prezzi dal DB (Price Tracker).
- `position.evaluate-exit`: Loop uscita o vendita.
- `metrics.snapshot`: Istantanee metriche.
- `alerts.send`: Gestione asincrona del webhook Discord per evitare blocchi.

Tutti i worker presentano `try/catch` per non far crollare Node.js. Ogni fallimento registra un `BotEvent` nel database.

---

## 13. Redis
Oltre ad ospitare la memoria per BullMQ, Redis è il supporto volatile rapido. Conserva cache (come `open_positions`) che permette al modulo Price Tracker di non bombardare inutilmente PostgreSQL ad ogni tick per capire cosa aggiornare.

---

## 14. PostgreSQL/Prisma
Tabelle principali:
- `TokenSignal`: I token trovati.
- `RiskResult` & `RiskCheck`: Motivi per lo score calcolato.
- `SignalDecision`: Spiega perché il bot è entrato (OPENED) o si è arreso (SKIPPED).
- `PaperPosition`: Le posizioni simulate vere e proprie, collegate in `PaperTradeEvent` (log entrate, update, e uscite).
- `MetricsSnapshot`: Storico performance.
- `BotEvent`: Alert di sistema, errori API e Queue.

---

## 15. Risk Engine V2
Trasforma parametri fisici (come volume e liquidità) in uno score 0-100.
I livelli sono: LOW, MEDIUM, HIGH, EXTREME.
Il modello possiede la capacità logica per controlli "On-Chain" (Mint Authority, Freeze Authority, LP Burned). Tuttavia, per la mancanza di RPC (es. Helius) per questi endpoint, essi ritornano al momento `UNKNOWN` e applicano una penalità leggera opzionale.

---

## 16. Paper Trading Engine V2
Decide le entrate controllando i livelli massimi configurati e il max amount di trade aperti.
Fornisce 5 tipologie di Exit automatiche:
- `STOP_LOSS`: Percentuale fissa.
- `TAKE_PROFIT`: Profitto target.
- `TRAILING_STOP`: Scatta se il token si muove in positivo ma poi cala più del X% dal picco (`highestPriceUsd`). Scatta solo in profitto.
- `MAX_HOLD`: Limite di tempo in minuti.
- `STALE_PRICE`: Abbandono forzato dovuto a API mute.

---

## 17. Slippage Model V2
Modelli:
- **FIXED**: Rimuove ad es. il 3% all'acquisto e il 5% alla vendita fisso.
- **AMM_CONSTANT_PRODUCT**: Usa la formula di mercato decentralizzato $x \cdot y = k$.
*Esempio AMM*:
Se la Pool ha $20.000 liquidità (quindi $10.000 in SOL e $10.000 in token). Compro con size finta da $1.000 (virtualSizeUsd).
Fee: -1% = mi restano 990$.
Riserva US: da $10.000 diventerà $10.990.
Poiché $K = 10k \times Y$, i token tolti al pool seguiranno la curva calando proporzionalmente.
Il bot stima il `priceImpactPercent` e lo simula matematicamente. L'uscita è calcolata partendo rigorosamente dal `tokenAmount` acquistato in ingresso.

---

## 18. Price Tracker V2
Interroga regolarmente gli endpoint. Risiede in un loop separato rispetto all'Ingestion.
Perché? Perché l'Ingestion serve a *scoprire* token nuovi. Il Price Tracker interroga *solo* DexScreener usando gli ID stringa specifici delle posizioni già aperte, per non disperdere la cache ed emettere il Job `evaluate-exit`.

---

## 19. Alert Discord
Notifiche supportate: `BOT_STARTED`, apertura posizione, chiusura (con PNL finale e percentuale), e alert di Errori API in modo da esser informato se DexScreener ti ha bannato in tempo reale.

---

## 20. Metriche da guardare
Valutazioni da `npm run metrics:summary`:
- **Winrate**: Vittorie totali.
- **Profit Factor**: Profitti lordi / Perdite lorde. (Sopra 1.0 sei positivo, > 1.5 è eccellente).
- **Max Drawdown**: Calcolato "Peak-To-Trough". La massima caduta in dollari dal momento di capitale massimo (es. partivi da $1000, sali a $1500, crolli a $1200, MaxDD = $300).
*Nota statistica:* Meno di 100 trade rendono il Profit Factor casuale. Mira a +300 trade simulati per giudicare.

---

## 21. Report ed export CSV
I tre comandi disponibili non rompono l'esecuzione se mancano trade:
- `npm run report`: Scrive un pratico `.md` con i riepiloghi e i JSON reason di exit in `reports/`.
- `npm run export:csv`: Genera file massivi CSV utili per essere importati su Excel o Google Sheets, dentro `exports/`.
- `npm run metrics:summary`: Stampa i valori principali della Metrics in terminale.

---

## 22. Confronto V2 con Cursor e Codex
La V2 ha BullMQ che non frizza il codice se DexScreener fa time-out.
**Test A/B**: Lancia questa V2 con `DATA_SOURCE_MODE=rest`. Tieni accesa contemporaneamente una V1 con gli STESSI identici parametri di SLIPPAGE e BUDGET. Osserva il numero di errori e le chiusure anomale di "Stale". La V2 avrà performance nettamente più stabili.

---

## 23. Troubleshooting

- **Bot non parte o Errore Node.js:** Controlla che Node.js sia alla versione 20 o superiore.
- **Errore npm install:** Su VPS a volte manca `unzip`. Fai `sudo apt install unzip`.
- **Docker non parte / non trovato:** Assicurati che l'utente Linux abbia privilegi o fai `sudo docker compose up -d`.
- **PostgreSQL non raggiungibile / DATABASE_URL errato:** Controlla nel `docker-compose.yml` che la porta sia la 5433 o correggi la connection string.
- **Prisma migrate fallisce:** DB non pronto o schema modificato male. Riavvia container.
- **BullMQ worker non lavora / Redis non raggiungibile:** Assicurati che il servizio redis su docker (6380) stia andando.
- **DexScreener 429:** Hai alzato troppo i check rate, raddoppia i valori ms.
- **Nessun token rilevato / nessun trade aperto:** Potrebbe essere che i tuoi parametri `MIN_VOLUME` siano troppo alti in mercato orso, prova ad abbassarli.
- **AMM price impact troppo alto:** Se la size virtuale ($1000) entra su token molto piccoli ($5000), il price impact distruggerà l'operazione in start (comportamento corretto).
- **Discord non riceve alert:** Formato url webhook invalido.
- **Report/CSV vuoti:** Nessun trade mai completato.
- **PDF non generato / Chrome Puppeteer mancante:** Su Ubuntu Headless manca Chromium per convertire Markdown a Pdf. Esegui `npx puppeteer browsers install chrome`. Se mancano librerie C++, installale (es. libnss3, libasound2t64).

---

## 24. Best practices
- Modifica **una singola soglia** alla volta in `.env`.
- Fai test da minino 3-4 giorni prima di concludere un'analisi.
- Effettua sempre `npm run export:csv` prima di alterare profondamente i target per comparare i report vecchi e nuovi.
- Mantieni la cautela. Anche in simulazione ottima non provare il reale subito, studia prima quanti alert API hai accumulato, potrebbero esserti fatali se veri.

---

## 25. Roadmap futura
1. **Helius e Birdeye:** API vere on-chain e order-book real-time per saltare DexScreener.
2. **Listener Pump.fun/Raydium:** Scansione via websocket pura senza pooling.
3. **Wallet Analytics:** API per analizzare a priori gli holder (sezione Risk V3).
4. **Dashboard GUI:** Sostituire o affiancare console e Discord con pannelli Recharts JS.
Il trading live rimane strettamente proibito finché l'intero stack (inclusi fallback e smart routing fee) non è confermato.

---

## 26. Conclusione
MemeRadar V2 segna un punto di stacco tra semplici script Javascript e un'infrastruttura Event-Driven. Lo puoi configurare al millimetro grazie al suo file `.env` ed aver certezza che, essendo *Paper Trading*, non subirai furti reali mentre elabori le logiche del rischio.
Buona sperimentazione simulata!
