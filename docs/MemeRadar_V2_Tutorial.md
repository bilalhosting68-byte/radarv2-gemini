---
title: "MemeRadar V2 - Tutorial completo"
subtitle: "Guida passo passo per configurare e usare il bot memecoin in paper trading event-driven"
author: "Generato da MemeRadar System"
date: "Maggio 2026"
---

# 1. Copertina
**MemeRadar V2 - Tutorial completo**
*Guida passo passo per configurare e usare il bot memecoin in paper trading event-driven.*

> ⚠️ **PAPER TRADING ONLY:** Nessun wallet, nessuna private key, nessuna transazione reale. Questo progetto è SOLO a scopo educativo e di test.

## 2. Introduzione
MemeRadar V2 è un framework sperimentale avanzato per testare logiche e strategie di trading su memecoin (rete Solana) in un ambiente simulato (Paper Trading). Utilizza un'architettura moderna a microservizi/eventi per gestire il flusso dei dati in modo scalabile e resiliente.

## 3. Avvertenza importante sui rischi
Il trading di memecoin è estremamente rischioso. MemeRadar V2 simula le operazioni ma non può replicare perfettamente le condizioni di mercato reali come il front-running, il MEV (Miner Extractable Value) o la congestione della rete Solana. Non usare mai questo codice per il trading reale senza una profonda comprensione dei rischi.

## 4. Architettura generale
Il bot segue un pattern event-driven:
- **Ingestion:** Scansiona i token e invia eventi alla coda.
- **Workers:** Elaborano gli eventi (Rischio, Ingresso, Prezzo, Uscita) in modo asincrono.
- **State:** PostgreSQL memorizza lo storico; Redis gestisce le code e lo stato rapido.

## 5. Requisiti
- **Node.js:** v20+
- **Docker:** Per Postgres e Redis.
- **Memoria:** Almeno 2GB RAM raccomandati.
- **OS:** Linux (VPS raccomandata) o macOS/Windows.

## 6. Installazione passo passo
1. Clona il repository.
2. Esegui \`npm install\`.
3. Assicurati che Docker sia attivo e avvia i servizi: \`docker compose up -d\`.
4. Genera il client Prisma: \`npm run prisma:generate\`.
5. Esegui le migrazioni del DB: \`npm run prisma:migrate\`.

## 7. Configurazione .env
Copia \`.env.example\` in \`.env\`. I parametri chiave includono:
- \`DATA_SOURCE_MODE\`: "rest" (DexScreener) o "mock" (Simulato).
- \`RISK_MAX_ALLOWED_LEVEL\`: Il livello massimo di rischio accettato per aprire una posizione.
- \`VIRTUAL_POSITION_SIZE_USD\`: Dimensione di ogni trade simulato.

## 8. Come creare Discord Webhook
1. In un server Discord, vai su Impostazioni Canale -> Integrazioni.
2. Crea un nuovo Webhook.
3. Copia l'URL e inseriscilo in \`DISCORD_WEBHOOK_URL\` nel file \`.env\`.

## 9. Come avviare MemeRadar V2
- **Sviluppo:** \`npm run dev\`
- **Produzione:** \`npm run build && npm start\`

## 10. Come funziona Data Ingestion
Il servizio Ingestion interroga le API di DexScreener o genera dati mock. Filtra i token per catena (Solana) e volume. Se \`ENABLE_MOCK_REALTIME\` è attivo, aggiunge token simulati ai dati reali per testare il sistema sotto carico.

## 11. Come funziona BullMQ/Event Bus
BullMQ gestisce le code su Redis. Ogni fase del processo (scoperta, analisi rischio, esecuzione) è un "Job" separato. Questo garantisce che se un componente fallisce, il sistema può riprendere l'elaborazione senza perdere dati.

## 12. Come funziona Redis
Redis è il cuore della comunicazione tra i processi. Memorizza le code di BullMQ e mantiene un set di "posizioni aperte" per un accesso rapido durante l'aggiornamento dei prezzi.

## 13. Come funziona PostgreSQL/Prisma
PostgreSQL è il database relazionale che conserva tutto lo storico. Prisma agisce come ORM (Object-Relational Mapper), fornendo un'interfaccia tipizzata per interrogare il DB (es. \`prisma.paperPosition.findMany()\`).

## 14. Come funziona Risk Engine V2
Analizza parametri come la liquidità, il volume, il rapporto buy/sell e l'età del pair. Assegna penalità per ogni parametro fuori norma, producendo uno score finale da 0 a 100 e un livello (LOW, MEDIUM, HIGH, EXTREME).

## 15. Come funziona Paper Trading Engine V2
Quando un segnale supera i filtri di rischio, l'engine simula l'acquisto. Crea un record \`PaperPosition\` con lo stato "OPEN" e calcola la quantità di token ricevuti basandosi sul modello di slippage scelto.

## 16. Come funziona Slippage Model V2
- **FIXED:** Slippage percentuale statico.
- **AMM_CONSTANT_PRODUCT:** Modello realistico basato sulla formula $x \cdot y = k$. Più grande è la size dell'ordine rispetto alla liquidità, maggiore sarà lo slippage (Price Impact).

## 17. Come funziona Price Tracker V2
Un loop periodico scansiona le posizioni aperte nel database e aggiorna il loro prezzo corrente tramite API. Se il prezzo non viene aggiornato per troppo tempo, scatta la chiusura forzata per "Stale Price".

## 18. Alert Discord
Il sistema invia notifiche automatiche per:
- Avvio del bot.
- Apertura di una nuova posizione (con prezzo e analisi).
- Chiusura di una posizione (con PNL finale e motivo).
- Errori critici del sistema.

## 19. Metriche da guardare
- **Winrate:** Percentuale di trade chiusi in profitto.
- **Profit Factor:** Rapporto tra profitti totali e perdite totali.
- **Max Drawdown:** La massima perdita subita dal picco massimo del capitale simulato.

## 20. Come generare Report ed Export
- **Report Markdown:** \`npm run report\` genera un riepilogo leggibile in \`reports/\`.
- **CSV Export:** \`npm run export:csv\` esporta tutti i dati in \`exports/\` per analisi in Excel.
- **Metrics Summary:** \`npm run metrics:summary\` stampa un riassunto rapido nel terminale.

## 21. Confronto V2 con Cursor e Codex
La V2 è significativamente più robusta. Mentre Cursor/Codex erano spesso script monolitici, la V2 è disaccoppiata. Se l'API di DexScreener cade, i worker continuano a gestire le posizioni aperte senza bloccarsi.

## 22. Troubleshooting
- **Database non raggiungibile:** Controlla che il container Docker sia \`Up\`.
- **Job falliti:** Controlla i log di BullMQ; spesso è dovuto a timeout delle API esterne.
- **PDF non generato:** Su VPS, assicurati di aver eseguito \`npx puppeteer browsers install chrome\`.

## 23. Best practices
- Inizia sempre con \`DATA_SOURCE_MODE="mock"\` per verificare la configurazione.
- Non impostare intervalli di scansione troppo brevi per evitare il ban dell'IP da parte di DexScreener.
- Monitora regolarmente il **Max Drawdown** per aggiustare i parametri di Stop Loss.

## 24. Roadmap futura
- Integrazione con Helius per on-chain check reali.
- Supporto per più DEX (Pump.fun, Raydium v4/v5).
- Web Dashboard per monitoraggio in tempo reale.

## 25. Conclusione
MemeRadar V2 è uno strumento potente per la ricerca e il backtesting. La sua architettura modulare permette di estenderlo facilmente con nuove strategie e controlli di rischio. Ricorda: il paper trading è l'unico modo sicuro per imparare in questo mercato.
