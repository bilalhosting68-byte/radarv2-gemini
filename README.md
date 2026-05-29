# MemeRadar V2
> ⚠️ **PAPER TRADING ONLY** - Questo bot è una simulazione e NON include funzionalità di esecuzione reale.

MemeRadar V2 è un framework avanzato per il paper trading di memecoin su Solana, progettato per testare strategie di ingresso e gestione del rischio. È un'evoluzione delle precedenti versioni, riscritta per essere event-driven, modulare e resiliente.

## Cosa Fa
1. **Scansiona** continuamente nuovi token su Solana usando DexScreener o in modalità mock.
2. **Analizza** il rischio di ogni pair tramite un "Risk Engine" basato su regole rigorose (liquidità, volume, età).
3. **Simula** entrate applicando un modello di slippage (Constant Product AMM o fisso).
4. **Traccia** i prezzi delle posizioni virtuali aperte.
5. **Simula** uscite basate su Stop Loss, Take Profit, Trailing Stop e Max Hold Time.
6. **Esporta** report dettagliati e genera metriche.

## Cosa NON Fa
- NON fa trading reale.
- NON richiede né gestisce private key.
- NON firma transazioni.
- NON ha un wallet integrato.

## Architettura
- **Node.js + TypeScript**
- **BullMQ + Redis:** Gestione asincrona degli eventi tramite code.
- **PostgreSQL + Prisma ORM:** Persistenza dei dati (segnali, decisioni, posizioni virtuali).

## Requisiti
- Node.js 20+
- Docker & Docker Compose (per PostgreSQL e Redis)
- Un Webhook Discord (opzionale, per ricevere alert)

## Installazione e Avvio
1. Installa dipendenze: \`npm install\`
2. Avvia i database: \`docker compose up -d\`
3. Configura \`.env\` copiando \`.env.example\`
4. Inizializza il DB:
   \`\`\`bash
   npm run prisma:generate
   npm run prisma:migrate
   \`\`\`
5. Avvia il bot: \`npm run dev\`

## Script Utili
- \`npm test\`: Esegue i test Vitest.
- \`npm run report\`: Genera un Markdown report riassuntivo.
- \`npm run export:csv\`: Esporta le posizioni, decisioni e metriche in formato CSV.
- \`npm run docs:pdf\`: Genera la guida PDF ufficiale nella cartella docs.
  - *Nota:* Su VPS, potrebbe servire eseguire prima: \`npx puppeteer browsers install chrome\`
