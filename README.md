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

The 2022 bear market wiped out tens of billions in DAO treasury value that systematic management could have protected. Parcel — the only automated treasury tool for mid-tier DAOs — shut down in 2025. The gap is real and unserved — especially on Solana where DAO treasury tooling lags behind the ecosystem's growth.

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
2. **On-chain** — reads real wallet balances directly from Solana via web3.js
3. **Analysis** — calculates native token concentration, bear market scenarios, runway estimates
4. **Intelligence** — generates risk score (0–100) and specific recommendations
5. **Action** — simulates autonomous rebalancing execution on Solana Devnet

---

## Features

- Real on-chain treasury data for Solana-native protocols
- Live Solana wallet balance reading via `@solana/web3.js`
- Bear market scenario modelling (70% drawdown based on 2022 historical data)
- Protocol-specific risk profiles (Marinade, Jupiter, Jito, Raydium)
- Native token concentration risk scoring
- Runway estimation scaled by treasury size
- Annual yield opportunity calculation
- Agent execution simulation on Solana Devnet
- Security headers, rate limiting, input sanitisation

---

## Solana Ecosystem Focus

| Protocol | Category | Native Exposure | Treasury Focus |
|----------|----------|----------------|----------------|
| Marinade | Liquid Staking | 60% | mSOL treasury management |
| Jupiter | DEX Aggregator | 72% | JUP governance treasury |
| Jito | MEV / Staking | 63% | JTO treasury protection |
| Raydium | AMM / DeFi | 75% | RAY concentration risk |

Solana's speed and low transaction costs make it the ideal chain for autonomous treasury agents — sub-second execution, near-zero gas, 24/7 operation.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | Node.js + Express |
| Blockchain | Solana web3.js (devnet) |
| Data | DefiLlama API (free, public) |
| Frontend | HTML + CSS + Vanilla JS |
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

# Test Solana on-chain integration
http://localhost:3000/api/solana/wallet/marinade
```

---

## Business Model & Path to Revenue

### The Problem with Existing Solutions

Karpatkey and Avantgarde serve only the top 10 DAOs with $500M+ treasuries. Mid-tier DAOs ($1M–$50M) have no professional management options. Parcel shut down in 2025 due to monetisation difficulties — not lack of demand. Wardex is designed from day one with a sustainable revenue model.

### Revenue Streams

**1. Performance Fee (primary)**
Wardex charges 10–15% of yield generated on behalf of the DAO. A $5M treasury with $1M in idle stablecoins at 4.5% APY generates $45,000/year — Wardex takes $4,500–$6,750. Zero cost to DAOs unless Wardex delivers results. Fully aligned incentives.

**2. Treasury Policy Setup Fee**
One-time fee of $500–$2,000 for configuring a DAO's treasury policy parameters, risk thresholds, and governance approvals. Covers onboarding and integration.

**3. Premium Intelligence Reports**
Monthly automated treasury health reports with on-chain data, risk trends, and governance recommendations. $200–$500/month per DAO. Positions Wardex as the ongoing financial intelligence layer.

### Target Market

- **Primary:** 6,000 actively managed DAOs globally with $1M–$50M in treasury assets
- **Beachhead:** Solana ecosystem DAOs — fastest growing, least served by tooling
- **Expansion:** Cross-chain treasury management as product matures

### Unit Economics

| Metric | Value |
|--------|-------|
| Target DAO treasury size | $5M average |
| Idle stablecoins (18%) | $900K |
| Annual yield at 4.5% | $40,500 |
| Wardex fee (12.5%) | $5,063/year per DAO |
| Break-even DAOs | ~20 DAOs |
| 100 DAO ARR | ~$506,000 |

### Why Now

- Parcel's shutdown in 2025 left a direct gap in the market
- Coinbase Agentic Wallets launched February 2026 — production infrastructure now exists
- MiCA regulation pushing DAOs toward professional treasury management
- Solana DAO ecosystem growing rapidly with no dedicated treasury tooling

---

## The Agent Architecture

Wardex is built on **policy execution, not discretionary management**. The DAO votes once on a treasury policy (e.g. "if native token concentration exceeds 70%, rebalance 20% to stablecoins"). Wardex monitors conditions and executes automatically when thresholds are met — within multisig guardrails, non-custodially.

This solves the governance paradox: DAOs can't easily diversify because selling native tokens requires a live vote that feels like a vote of no confidence. Wardex separates the policy decision (one vote, made calmly) from the execution (automatic, pre-approved).

---

## Built By

**Jalaaldeen Akinola** — MSc Business Analytics, Newcastle Business School, Northumbria University  
**Twitter/X:** [@jalaal_tweets](https://twitter.com/jalaal_tweets)

Background in Web3 and financial analytics. Previously founded **Zakatchain** — a blockchain-based charitable giving platform that raised funds for 300+ families in Nigeria — demonstrating real-world experience building decentralised financial products. Wardex bridges MSc forecasting methodology with Solana's autonomous agent infrastructure.

---

## Roadmap

- [x] Live treasury data from DefiLlama
- [x] Real Solana on-chain wallet reading via web3.js
- [x] Bear market risk scoring and scenario modelling
- [x] Protocol-specific treasury profiles
- [x] Agent execution simulation on Solana Devnet
- [ ] Time-series forecasting (ARIMA/ETS) on historical TVL for runway prediction
- [ ] Real Solana multisig integration for live execution
- [ ] Governance proposal impact modelling via Realms
- [ ] Cross-protocol Solana treasury aggregation
- [ ] Automated monthly treasury health reports
- [ ] Strategy-agnostic yield module

---

*Data sourced from DefiLlama. Built for the Superteam UK x Northumbria University Hackathon 2026.*