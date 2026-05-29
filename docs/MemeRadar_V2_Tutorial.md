---
title: "MemeRadar V2 - Tutorial completo"
subtitle: "Guida passo passo per configurare e usare il bot memecoin in paper trading event-driven"
author: "Generato da MemeRadar System"
date: "Maggio 2026"
---

# Copertina
**MemeRadar V2 - Tutorial completo**
*Guida passo passo per configurare e usare il bot memecoin in paper trading event-driven.*

> ⚠️ **PAPER TRADING ONLY:** Nessun wallet, nessuna private key, nessuna transazione reale.

## 2. Introduzione
MemeRadar V2 è un framework sperimentale per testare logiche e strategie di trading su memecoin (rete Solana) in un ambiente controllato. A differenza della V1, questa versione sfrutta un'architettura ad eventi (tramite Redis e BullMQ) per separare l'ingestion dei dati dall'esecuzione logica.

## 3. Avvertenza importante sui rischi
Questo software non garantisce alcun guadagno. Le simulazioni in paper trading, specialmente nel mercato altamente volatile e spesso manipolato delle memecoin, differiscono significativamente dall'esecuzione reale (frontrunning, MEV, slippage asimmetrico).

## 4. Architettura generale
Il sistema si basa su:
- **Ingestion Service:** Raccoglie token candidates da DexScreener o da generatori Mock.
- **Event Bus (BullMQ):** Distribuisce compiti (scoperta, analisi rischio, valutazione ingresso).
- **Risk Engine V2:** Attribuisce un punteggio e filtra le "rugpull" palesi.
- **Paper Trading Engine V2:** Crea entità \`PaperPosition\` simulando entrate e gestendo stop-loss/take-profit.
- **PostgreSQL + Prisma:** Persiste lo storico delle simulazioni.

## 5. Requisiti
- Node.js versione 20 o superiore.
- Docker e Docker Compose installati (per avviare PostgreSQL e Redis localmente).
- Connessione a internet (se si usa \`DATA_SOURCE_MODE="rest"\`).

## 6. Installazione passo passo
1. Clona/estrai il progetto.
2. Apri il terminale nella root \`MemeRadar_V2\`.
3. Esegui \`npm install\`.
4. Avvia l'infrastruttura con \`docker compose up -d\`.
5. Prepara lo schema Prisma con \`npm run prisma:generate\` e \`npm run prisma:migrate\`.

## 7. Configurazione .env
Copia il file \`.env.example\` in \`.env\`. Verifica:
- \`BOT_MODE="paper"\`: Lascialo invariato.
- \`DATA_SOURCE_MODE\`: Imposta a "mock" se vuoi testare il sistema senza API, "rest" per dati veri da DexScreener.
- Parametri di SLIPPAGE e RISK per adattarli al tuo profilo di studio.

## 8. Come creare Discord Webhook
Per ricevere alert:
1. Apri Discord -> Impostazioni Server -> Integrazioni -> Crea Webhook.
2. Copia l'URL.
3. Incollalo nel file \`.env\` alla voce \`DISCORD_WEBHOOK_URL\`.

## 9. Come avviare MemeRadar V2
Per ambiente di sviluppo (con auto-reload):
\`npm run dev\`
Per l'ambiente di produzione:
\`npm run build\`
\`npm start\`

## 10. Come funziona Data Ingestion
Il bot usa l'adattatore DexScreener per leggere i nuovi token. Rispetta rigorosamente i limiti di rate (max 20 token per scan, interval backoff) per evitare blocchi IP. 

## 11. Come funziona BullMQ/Event Bus
Una volta scoperto un token, viene mandato alla coda \`token.discovered\`. Da qui passa ai worker per il rischio e l'eventuale ingresso, slegando la logica dal loop principale. Se un worker fallisce (es. timeout), la coda riprova automaticamente.

## 12. Come funziona Redis
Redis funge da storage ultra-veloce per BullMQ e tiene traccia delle posizioni "OPEN" (tramite set) per non sovraccaricare il database durante le letture veloci del Price Tracker.

## 13. Come funziona PostgreSQL/Prisma
Tutto viene persistito in Postgres. La tabella \`PaperPosition\` traccia lo stato. Le tabelle \`SignalDecision\` spiegano *perché* un trade è stato aperto o scartato.

## 14. Come funziona Risk Engine V2
Valuta Liquidità, Volume 5m, Buy Ratio e Market Cap. In futuro (Roadmap) analizzerà metriche on-chain (Mint/Freeze Authority). Per ora queste ultime ritornano \`UNKNOWN\` e applicano una piccola penalità.

## 15. Come funziona Paper Trading Engine V2
Simula un ingresso usando il budget \`VIRTUAL_POSITION_SIZE_USD\`. Una volta dentro, il worker \`position.evaluate-exit\` controlla ciclicamente Take Profit, Stop Loss, e Trailing Stop.

## 16. Come funziona Slippage Model V2
Due modalità:
- **FIXED:** Applica una percentuale fissa in ingresso e in uscita.
- **AMM_CONSTANT_PRODUCT:** Simula l'impatto reale della size sulla formula $x \cdot y = k$, fornendo alert \`HIGH_PRICE_IMPACT\` se la liquidità è troppo bassa.

## 17. Come funziona Price Tracker V2
Ciclicamente, scorre i token con \`status="OPEN"\` e ne richiede l'ultimo prezzo. Se un prezzo manca per troppo tempo (\`PRICE_STALE_MINUTES\`), la posizione viene chiusa forzatamente.

## 18. Alert Discord
Se configurato, il bot avvisa quando si avvia, quando apre una posizione e quando la chiude, riportando i PNL e il motivo della chiusura.

## 19. Metriche da guardare
Tieni d'occhio il **Profit Factor** e il **Winrate**. Nota che in paper trading su DexScreener i risultati tenderanno a essere più ottimistici della realtà a causa dell'assenza di latenza e front-running.

## 20. Report ed export
- Esegui \`npm run report\` per creare un riepilogo in Markdown (\`reports/\`).
- Esegui \`npm run export:csv\` per scaricare dati processabili in Excel (\`exports/\`).

## 21. Come confrontare V2 con Cursor e Codex
La V2 ha l'esecuzione disaccoppiata e resiliente grazie a BullMQ. Cursor e Codex erano script single-thread soggetti a crash su errori di rete prolungati.

## 22. Troubleshooting
- *Redis/Postgres error:* Verifica che Docker sia avviato (\`docker ps\`).
- *TypeScript/Prisma error:* Riesegui \`npm run prisma:generate\` se modifichi lo schema.

## 23. Best practices
Esegui inizialmente in modalità \`DATA_SOURCE_MODE="mock"\` per studiare le code e la generazione eventi senza stressare le API.

## 24. Roadmap futura
- Integrazione RPC Helius per on-chain authority checking reale.
- Moduli per lettura orderbook Birdeye.
- Trading reale (sarà una fork completamente separata per sicurezza).

## 25. Conclusione
Questo tool è un potente strumento di analisi statistica. Usalo saggiamente e non trasformarlo in un bot di trading reale se non hai l'esperienza di ingegneria per gestire i failure cases on-chain.
