# ⬡ Wardex — DAO Treasury Intelligence Agent

> Your DAO Treasury, Monitored and Protected by AI

**Live Demo:** https://wardex.onrender.com  
**Built by:** [@jalaal_tweets](https://twitter.com/jalaal_tweets)

Built for the Colosseum Frontier Hackathon 2026 — Powered by Superteam UK  
Northern University Alliance: Northumbria · Teesside · Durham · Sunderland

---

## The Problem

DAOs collectively manage **$24.5 billion** in treasury assets — and most of it is structurally at risk.

- **81.67%** of DAO treasury assets are held in a single native governance token *(Schellinger, Fiedler & Steinmetz, Blockchain Research Lab, 2023)*
- Native tokens suffer **70–90% drawdowns** in bear markets — the 2022 crash destroyed tens of billions in DAO purchasing power
- Idle stablecoins earn **zero yield**, leaving millions on the table annually
- The only automated treasury tool for mid-tier DAOs — Parcel — shut down in 2025. Tally shut down March 2026.
- Jito's JIP-24 (passed 2025) routes **~$15M+/yr** in Block Engine fees to the DAO treasury. It is accumulating with no deployment strategy.

The structural trap: DAOs want to diversify, but every proposal to sell native tokens signals a vote of no confidence. A governance vote *to* diversify can suppress the token price before it even passes.

---

## The Solution

Wardex is an AI agent that reads real on-chain treasury data via Solana SPL Governance (Realms), scores bear market risk, and either generates ready-to-approve governance proposals or — once trust is established — executes pre-approved treasury actions within a non-custodial mandate.

**The core insight:** DAOs don't need an agent that makes financial decisions for them. They need an agent that executes the financial decisions they've already made but keep failing to act on.

The DAO votes once on a treasury policy. Wardex monitors and executes continuously within that mandate.

---

## How It Works

```
Realms SPL Governance → Real on-chain treasury reads (mainnet)
DefiLlama API         → Live TVL and protocol data
DefiLlama Yields API  → Live Kamino / Marginfi / Drift APY rates
Risk Analysis Engine  → Concentration score, bear market scenarios
Agent Execution       → Real Solana devnet transaction via Memo program
```

1. **On-chain read** — reads real governance accounts from Solana mainnet via SPL Governance (Realms) for Marinade, Jito, Jupiter, and Raydium
2. **TVL data** — pulls live total value from DefiLlama to size the treasury
3. **Live yield rates** — fetches current Kamino USDC/SOL, Marginfi, and Drift APYs from DefiLlama Yields API
4. **Risk scoring** — calculates native token concentration, 70% bear market scenario (based on 2022 historical data), runway estimate, and annual yield opportunity
5. **Agent recommendation** — generates a specific, actionable recommendation with the best available yield venue
6. **Real execution** — broadcasts a verifiable Solana devnet transaction via the Memo program, returning a real Solana Explorer link

---

## The Competitive Gap

| Solution | Chains | Active Management | Min Treasury | Per-Action Vote | AI-Driven |
|---|---|---|---|---|---|
| **Karpatkey / kpk** | EVM only | Yes (human) | ~$100M+ | No (policy-based) | No |
| **Avantgarde / Enzyme** | EVM only | Yes (human + vault) | ~$50M+ | No (policy-based) | No |
| **Realms (SPL Governance)** | Solana | No | None | Yes — every action | No |
| **Squads Protocol** | Solana | No (manual via SquadsX) | None | Yes — every action | No |
| **Castle Finance** | Solana | Limited (3% APY vaults) | None | No | No |
| **⬡ Wardex** | **Solana** | **Yes (AI agent)** | **$1M+** | **No (policy-based)** | **Yes** |

**There is no Karpatkey for Solana.** Wardex fills that gap — serving the 6,000 mid-tier DAOs ($1M–$50M) that Karpatkey structurally ignores, on the chain where the most active governance communities live.

---

## Target DAOs

| DAO | Realm (Mainnet) | Why Now |
|-----|-----------------|---------|
| **Jito** | `jjCAwuu...` | JIP-24 routes 100% of Block Engine fees (~$15M+/yr) to DAO treasury. Idle SOL accumulating with no deployment strategy. |
| **Marinade** | `899YG3y...` | MIP proposals already passed to diversify away from MNDE concentration. mSOL/USDC treasury needs active management. |
| **Jupiter** | `2Z5BXuR...` | Treasury locked until 2027. New governance model being designed. Wardex is the execution layer for when it reopens. |
| **Raydium** | `8JZdqeT...` | On-chain governance launched 2025. Treasury management practices still immature. First-mover opportunity. |

All realm pubkeys verified on Solana mainnet, May 2026.

---

## Trust Model — Non-Custodial by Design

The most common question from DAO treasury managers: *"Do you have custody of our funds?"*

The answer is no — and the architecture is designed so that trust is earned in stages, never assumed upfront.

### Phase 1 — Monitoring + Proposal Generation (zero custody)

Wardex reads the DAO's on-chain treasury, monitors conditions 24/7, and when a policy threshold is crossed, generates a **fully-formed Realms governance proposal** — risk data, recommended action, yield comparison, rationale. The DAO's treasury committee reviews and approves it. The DAO signs and executes it themselves. Wardex never touches a key.

This is the initial onboarding phase for every new DAO. Zero execution risk. Zero custody. The analytical bottleneck is removed; control stays with the community.

### Phase 2 — Destination-Whitelisted Delegate (minimal trust)

After 3–6 months of clean Phase 1 operation, Wardex can be granted a Squads delegate key — but with hard constraints enforced on-chain:

- **Destination whitelist only** — Wardex can only call `deposit()` on pre-approved protocol addresses (e.g., Kamino Earn vault `xyz...`). It cannot transfer funds to arbitrary wallet addresses. Even if Wardex's infrastructure were compromised, an attacker could only deposit the DAO's funds into Kamino — not exfiltrate them.
- **Daily volume cap** — maximum 2% of treasury per 24-hour window, enforced by the Squads program on-chain.
- **Timelock** — every Wardex-initiated transaction sits pending for 24 hours, visible to all multisig signers. The DAO retains a veto window on every action.

This is the same model Karpatkey uses with Aave and Balancer on EVM — Gnosis Safe role modules with destination whitelists rather than open spending authority. We are building the equivalent primitive on Solana.

### Phase 3 — Policy Execution (earned trust)

After a proven Phase 2 track record, the whitelist expands (Marginfi, Drift, additional venues) and volume caps increase. The DAO still controls the policy parameters. Wardex executes within them.

---

## Architecture: Policy Execution, Not Discretionary Management

```
DAO Governance (Realms)
        │
        ▼
  One-time policy vote
  ┌──────────────────────────────────────────────┐
  │  "If native concentration > 70%:             │
  │   rebalance 20% → stablecoins.               │
  │   Deploy idle USDC to Kamino Earn.           │
  │   Monthly report to treasury committee."     │
  └──────────────────────────────────────────────┘
        │
        ▼
  Wardex Agent (monitors 24/7)
        │ reads
        ├─── Realms SPL Governance treasury PDAs (mainnet)
        ├─── DefiLlama TVL and token breakdowns
        └─── Live yield rates (Kamino, Marginfi, Drift)
        │ executes within mandate
        ├─── Phase 1: Realms proposal generation
        ├─── Phase 2: Squads destination-whitelisted delegate
        └─── Real Solana transactions via Memo / SPL programs
        │
        ▼
  No vote per action. Policy decision = community.
  Execution = agent.
```

This solves the governance paradox: selling native tokens requires a confidence vote that can suppress price. Wardex separates the *strategic decision* (one vote, made calmly) from *execution* (automatic, pre-approved, non-custodial).

---

## Features

- **Realms SPL Governance integration** — reads real governance accounts and native treasury PDAs from Solana mainnet for all 4 target DAOs
- **Live yield rates** — fetches current APYs from Kamino (USDC + SOL), Marginfi, and Drift via DefiLlama Yields API
- **Real devnet execution** — agent broadcasts a verifiable Solana devnet transaction via Memo program; returns a real Solana Explorer link
- Bear market scenario modelling (70% drawdown based on 2022 historical data)
- Risk score 0–100 with native token concentration analysis
- Runway estimation scaled by treasury size and burn rate
- Estimated vs. on-chain data clearly labelled in the UI
- Protocol-specific DAO context (Jito Block Engine fees, Marinade MIP diversification, etc.)
- Security: rate limiting, input sanitisation, CSP headers, HSTS in production, X-Powered-By suppressed

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | Node.js + Express |
| Governance | Solana SPL Governance (Realms) — mainnet reads |
| Blockchain | `@solana/web3.js` — mainnet reads + devnet execution |
| TVL Data | DefiLlama API (free, public) |
| Yield Data | DefiLlama Yields API — live Kamino, Marginfi, Drift APYs |
| Frontend | HTML + CSS + Vanilla JS |
| Deployment | Render |

---

## Running Locally

```bash
# Clone the repo
git clone https://github.com/jalaalrd/wardex
cd wardex

# Install dependencies
npm install

# Add your agent keypair (optional — server generates + airdrops one automatically)
echo "AGENT_KEYPAIR_HEX=<your_hex_encoded_64_byte_secret>" > .env

# Start the server
node index.js

# Open in browser
http://localhost:3000

# Test Realms on-chain integration (reads Jito treasury from mainnet)
http://localhost:3000/api/realms/treasury/jito

# Test live yield rates
http://localhost:3000/api/yield/rates

# Test agent execution (real devnet TX)
curl -X POST http://localhost:3000/api/agent/execute \
  -H 'Content-Type: application/json' \
  -d '{"daoName":"Jito DAO","action":"Deploy idle SOL to Kamino Earn","venue":"Kamino Earn"}'
```

---

## Business Model

Parcel and Tally both failed because free governance tooling cannot sustain a business. Wardex is designed from day one with a performance-aligned revenue model.

### Revenue Streams

**1. Performance Fee (primary)**  
10–15% of yield generated. A $5M treasury with $900K in idle stablecoins at 5.5% APY = $49,500/year in yield. Wardex takes $5,000–$7,500. Zero cost to DAOs unless Wardex delivers.

**2. Treasury Policy Setup Fee**  
$500–$2,000 one-time for configuring risk parameters, whitelisted protocols, and governance proposal templates.

**3. Premium Intelligence Reports**  
$200–$500/month for automated monthly treasury health reports — on-chain data, risk trends, governance recommendations.

### Unit Economics

| Metric | Value |
|--------|-------|
| Target DAO treasury size | $5M average |
| Idle stablecoins (18%) | $900K |
| Live USDC APY (Kamino) | 5.5% |
| Annual yield generated | $49,500 |
| Wardex fee (12.5%) | $6,188/year per DAO |
| Break-even DAOs | ~16 DAOs |
| 100 DAO ARR | ~$619,000 |

### Why Now

- Parcel shut down 2025 — direct gap in mid-tier DAO tooling
- Tally shut down March 2026 — "no venture business in governance tooling yet"
- Coinbase Agentic Wallets launched February 2026 — Solana-compatible autonomous execution infrastructure now exists
- MiCA regulation pushing DAOs toward professional treasury management
- Jito's JIP-24 (passed 2025) routes ~$15M+/yr to DAO treasury with no deployment strategy — immediate, named customer pain

---

## Roadmap

- [x] Live treasury TVL from DefiLlama
- [x] Realms SPL Governance integration — real mainnet treasury reads for Marinade, Jito, Jupiter, Raydium
- [x] Live yield rates from DefiLlama Yields API (Kamino, Marginfi, Drift)
- [x] Bear market risk scoring and scenario modelling
- [x] Real agent execution on Solana Devnet — verifiable Memo program transactions
- [x] Competitive gap UI — policy-based onboarding flow
- [x] Non-custodial trust model — phased architecture, destination whitelist design
- [ ] Realms governance proposal generation — draft and submit proposals on behalf of DAOs
- [ ] Squads destination-whitelist delegate integration — Phase 2 execution model
- [ ] SPL token account reads per governance PDA — replace estimated breakdowns with real token balances
- [ ] Time-series forecasting (ARIMA/ETS) on historical TVL for runway prediction
- [ ] Kamino Earn Vault integration — direct idle stablecoin deployment via CPI
- [ ] Automated monthly treasury health reports

---

## Built By

**Jalaaldeen Akinola** — MSc Business Analytics, Newcastle Business School, Northumbria University  
**Twitter/X:** [@jalaal_tweets](https://twitter.com/jalaal_tweets)

Background in Web3 and financial analytics. Previously founded **Zakatchain** — a blockchain-based charitable giving platform that raised funds for 300+ families in Nigeria. Wardex bridges MSc forecasting methodology with Solana's autonomous agent infrastructure.

---

*Treasury risk data: Schellinger, Fiedler & Steinmetz (2023), Blockchain Research Lab. TVL data: DefiLlama. Yield data: DefiLlama Yields API. Built for the Superteam UK × Northumbria University Campus to Colosseum Frontier Hackathon 2026.*
