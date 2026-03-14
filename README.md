# ⬡ Wardex — DAO Treasury Intelligence Agent

> Your DAO Treasury, Protected by AI

**Live Demo:** https://wardex.onrender.com  
**Built by:** [@jalaal_tweets](https://twitter.com/jalaal_tweets)

Built for the Campus to Colosseum Hackathon 2026 — Powered by Superteam UK  
Northern University Alliance: Northumbria · Teesside · Durham · Sunderland

---

## The Problem

DAOs collectively manage **$24.5 billion** in treasury assets. Yet:

- **67.3%** of all DAO treasury assets sit in a single native governance token
- **85%** of DAOs hold their entire treasury in one asset
- Native tokens suffer **70–90% drawdowns** in bear markets
- Average governance participation is just **17%**
- Idle stablecoins generate **zero yield** — leaving millions on the table annually

The 2022 bear market wiped out tens of billions in DAO treasury value that systematic management could have protected. The gap is real and unserved — especially on Solana where DAO treasury tooling lags behind the ecosystem's growth.

---

## The Solution

Wardex is an AI agent that reads real on-chain treasury data, forecasts bear market risk, and recommends autonomous actions — executed within governance-approved parameters on Solana, without requiring a vote for every transaction.

**The core insight:** DAOs don't need an agent that makes financial decisions for them. They need an agent that executes the financial decisions they've already made but keep failing to act on.

---

## How It Works
```
DefiLlama API → Real treasury data → Risk analysis engine → Agent recommendation → Solana Devnet execution
```

1. **Data** — pulls live TVL and token breakdown data from DefiLlama
2. **Analysis** — calculates native token concentration, bear market scenarios, runway estimates
3. **Intelligence** — generates risk score (0–100) and specific recommendations
4. **Action** — simulates autonomous rebalancing execution on Solana Devnet

---

## Features

- Real on-chain treasury data for Solana-native protocols
- Bear market scenario modelling (70% drawdown based on 2022 historical data)
- Native token concentration risk scoring
- Runway estimation in months
- Annual yield opportunity calculation
- Agent execution simulation on Solana Devnet
- Works for Marinade, Jupiter, Jito, Raydium and more

---

## Solana Ecosystem Focus

Wardex is built for the Solana DAO ecosystem. Target protocols include:

| Protocol | Category | Treasury Focus |
|----------|----------|----------------|
| Marinade | Liquid Staking | mSOL treasury management |
| Jupiter | DEX Aggregator | JUP governance treasury |
| Jito | MEV / Staking | JTO treasury protection |
| Raydium | AMM / DeFi | RAY concentration risk |

Solana's speed and low transaction costs make it the ideal chain for autonomous treasury agents — sub-second execution, near-zero gas, 24/7 operation.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | Node.js + Express |
| Data | DefiLlama API (free, public) |
| Frontend | HTML + CSS + Vanilla JS |
| Execution | Solana Devnet |
| Deployment | Render |
| Version Control | GitHub |

---

## Running Locally
```bash
# Clone the repo
git clone https://github.com/jalaalrd/wardex
cd wardex

# Install dependencies
npm install

# Start the server
node index.js

# Open in browser
http://localhost:3000
```

---

## Market Opportunity

- **$24.5B** total DAO treasury assets globally (2025)
- **13,000+** DAOs worldwide, 6,000+ regularly active
- **$170M** DAO tooling market growing to $333M by 2031
- Solana ecosystem DAOs are rapidly growing but underserved by treasury tooling
- Mid-tier DAOs ($1M–$50M) have no access to institutional-grade management

---

## The Agent Architecture

Wardex is built on **policy execution, not discretionary management**. The DAO votes once on a treasury policy (e.g. "if native token concentration exceeds 70%, rebalance 20% to stablecoins"). Wardex monitors conditions and executes automatically when thresholds are met — within multisig guardrails, non-custodially.

This solves the governance paradox: DAOs can't easily diversify because selling native tokens requires a live vote that feels like a vote of no confidence. Wardex separates the policy decision (one vote, made calmly) from the execution (automatic, pre-approved).

---

## Built By

**Jalaaldeen Akinola** — MSc Business Analytics, Newcastle Business School, Northumbria University  
**Twitter/X:** [@jalaal_tweets](https://twitter.com/jalaal_tweets)

Background in Web3 and financial analytics. Previously founded **Zakatchain** — a blockchain-based charitable giving platform — demonstrating real-world experience building decentralised financial products. Wardex bridges MSc forecasting methodology with Solana's autonomous agent infrastructure.

---

## Roadmap

- [ ] Time-series forecasting (ARIMA/ETS) on historical TVL for runway prediction
- [ ] Solana multisig integration for real on-chain execution
- [ ] Governance proposal impact modelling via Realms
- [ ] Cross-protocol Solana treasury aggregation
- [ ] Automated monthly treasury health reports
- [ ] Strategy-agnostic yield module

---

*Data sourced from DefiLlama. Built for the Superteam UK University Hackathon 2026.*