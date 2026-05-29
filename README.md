# MemeRadar V2
> ⚠️ **PAPER TRADING ONLY** - Questo bot è una simulazione e NON include funzionalità di esecuzione reale. Nessun wallet, nessuna private key.

MemeRadar V2 è un framework avanzato per il paper trading di memecoin su Solana, progettato per testare strategie di ingresso e gestione del rischio. È un'evoluzione delle precedenti versioni, riscritta per essere event-driven, modulare e resiliente.

## Quick Start
1. `npm install`
2. `docker compose up -d`
3. `cp .env.example .env` (imposta `DATA_SOURCE_MODE="rest"` per DexScreener reale)
4. `npm run prisma:generate`
5. `npm run prisma:migrate -- --name init`
6. `npm run dev`

## Installazione Ubuntu passo passo
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git ca-certificates unzip
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
curl -fsSL https://get.docker.com | sudo sh
git clone <tuo-repo>
cd MemeRadar_V2
npm install
docker compose up -d
cp .env.example .env
npm run prisma:generate
npm run prisma:migrate -- --name init
```

## Mock vs Rest
Nel file `.env`:
- `DATA_SOURCE_MODE="rest"`: Usa le API di DexScreener (Dati Reali).
- `DATA_SOURCE_MODE="mock"`: Genera token simulati (Test Infrastruttura).

## Script Utili
- `npm run dev`: Avvia in modalità sviluppo.
- `npm run build` & `npm start`: Compila e avvia in produzione.
- `npm test`: Esegue la suite Vitest.
- `npm run report`: Genera un Markdown report in `reports/`.
- `npm run metrics:summary`: Stampa a video il riassunto delle metriche.
- `npm run export:csv`: Esporta posizioni e metriche in formato CSV in `exports/`.
- `npm run docs:pdf`: Genera la guida PDF ufficiale.
  - *Nota:* Su VPS, se fallisce, esegui: `npx puppeteer browsers install chrome`

## Roadmap
- Integrazione Helius/Birdeye per controlli on-chain.
- Nessun trading reale pianificato nella V2 per motivi di sicurezza.
