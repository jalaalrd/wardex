# Jupiter Developer Experience Report
**Builder:** Jalaaldeen Akinola — Wardex  
**Project:** DAO Treasury Intelligence Agent  
**Track:** Not Your Regular Bounty — Jupiter Developer Platform  
**Date:** May 2026

---

## What I Built with Jupiter

Wardex is a DAO treasury intelligence agent that monitors Solana treasuries (Jito, Marinade, Jupiter, Raydium), scores bear market risk, and recommends yield deployment strategies. I integrated the **Jupiter Lend API** to surface live JupUSD vault supply rates as a yield venue alongside Kamino, Marginfi, and Drift — so the agent can recommend the best place to deploy idle stablecoins at any given moment.

**Endpoint used:** `GET https://api.jup.ag/lend/v1/earn/tokens`  
**Auth:** `x-api-key` header via Jupiter Developer Platform  
**Use case:** Pull live stablecoin vault APYs to power yield routing decisions

---

## What Worked Well

### 1. The API key experience is frictionless
Getting an API key at `developers.jup.ag` took under two minutes. No approval wait, no KYC, no quota request form. For a hackathon timeline this matters enormously — I was making authenticated calls within one coffee break. The Anthropic and Covalent API keys I used in the same project both required more friction to obtain.

### 2. The endpoint is stable and fast
Over ~40 requests during development I had zero timeouts and zero 5xx errors. Response times were consistently under 400ms. When you're building a product with multiple external data sources (DefiLlama, Covalent, RPC nodes) a flaky endpoint poisons the whole request chain. Jupiter Lend didn't do that.

### 3. The response structure is clean
The token array is a flat list with consistent fields. My parser is seven lines:

```javascript
const stableEntry = jupTokens.find(t => {
  const sym = (t.asset?.symbol || t.symbol || t.uiSymbol || '').toUpperCase();
  return sym === 'JUPUSD' || sym === 'USDC' || sym === 'USDT';
});
if (stableEntry?.totalRate != null) {
  jupiterLendUsdc = Number(stableEntry.totalRate) / 10000;
}
```

A clean response means a clean integration. I didn't need to unwrap nested objects or handle pagination.

---

## What Was Confusing or Missing

### 1. Rates are in basis points — this is not documented clearly
`totalRate: 496` means `4.96% APY`. I spent about 45 minutes debugging why my displayed rate was `496%` before I figured out the basis point encoding from inspecting multiple responses over time and noticing the pattern. The docs (at the time of building) did not state that `totalRate` is in basis points. A single sentence — *"Rates are returned in basis points. Divide by 10,000 to get decimal APY."* — would have saved that 45 minutes.

**Suggestion:** Add a `rateUnit: "basisPoints"` field to the response, or document the encoding prominently in the API reference.

### 2. The asset is JupUSD, not USDC — and this isn't prominently explained
The intuitive expectation when integrating a "USDC lending rate" is that the asset returned will have `symbol: "USDC"`. The actual asset is JupUSD (`symbol: "JupUSD"`), which is Jupiter's own stablecoin. This changes the product story — a DAO deploying USDC into a Jupiter Lend vault is actually acquiring JupUSD, which introduces a conversion step and a different risk profile than a native USDC vault.

For Wardex this matters: recommending "deploy to Jupiter Lend at 4.96% APY" without explaining the USDC → JupUSD conversion could mislead a DAO treasurer. I had to add a disclosure in the recommendation text.

**Suggestion:** The endpoint or its documentation should make the USDC → JupUSD conversion explicit. Even a `requiresSwap: true` or `inputAsset: "USDC"` / `outputAsset: "JupUSD"` field on the token object would make this self-documenting.

### 3. No historical rate data
I wanted to show how Jupiter Lend rates have trended over the past 30 days relative to Kamino — to help DAOs understand whether it's a consistently competitive venue or an anomaly. The API has no historical rates endpoint. DefiLlama Yields fills this gap for Kamino and Marginfi (they're indexed there), but Jupiter Lend isn't indexed on DefiLlama Yields at the time of writing.

**Suggestion:** A `GET /lend/v1/earn/tokens/:tokenAddress/history?days=30` endpoint returning daily average APYs would unlock a class of treasury analytics products that currently can't be built on Jupiter data alone.

### 4. No rate change webhooks or streaming
Wardex is designed to monitor 24/7 and trigger governance proposals when thresholds are crossed. For yield rates, polling at 10-minute intervals is workable but wasteful. There's no way to subscribe to rate changes above a threshold — which would be the right primitive for an agent that says "alert me when Jupiter Lend exceeds Kamino."

**Suggestion:** A webhook or SSE stream on `lend/v1/earn/rates/stream` would make Jupiter Lend the natural choice for any monitoring or agent product. Right now polling is the only option.

### 5. SDK vs raw HTTP parity
The Jupiter Swap SDK (`@jup-ag/api`) is excellent. There's no equivalent for Jupiter Lend — it's raw HTTP only. This creates a different integration experience depending on which Jupiter product you're using. Given that the SDK handles things like rate limiting, retries, and TypeScript types, its absence for Lend means each builder reinvents these solutions.

**Suggestion:** Even a thin TypeScript wrapper around the Lend endpoints — types for `EarnToken`, a `getLendRates()` convenience function — would substantially lower the integration floor.

---

## What I Would Build Next with Jupiter Lend

If historical rates were available, the next feature would be **yield venue drift detection**: track 30-day rolling average APY per venue and flag when Jupiter Lend crosses Kamino as the best option. Right now Kamino wins every comparison because we're comparing spot rates at a single moment. A 30-day average comparison would be more useful for a treasury making a multi-month deployment decision.

If webhooks existed, I'd make Wardex subscribe to a rate threshold event and automatically surface a governance proposal the moment Jupiter Lend's APY exceeds a DAO's configured threshold (e.g. "alert me when any venue exceeds 6% APY").

---

## Summary

Jupiter Lend API: **fast, stable, frictionless to obtain keys.** Three specific improvements would make it significantly more builder-friendly: document basis point encoding, clarify JupUSD conversion explicitly, and add a historical rates endpoint. The absence of those three things cost me ~90 minutes and required product copy changes to stay honest with end users. Everything else worked cleanly.

The developer platform experience itself (key issuance, docs structure) is better than average for DeFi APIs. I would use Jupiter Lend in production for Wardex and recommend it to other builders integrating yield venue routing.

---

*Wardex — usewardex.xyz | Source: github.com/jalaalrd/wardex | Builder: @jalaal_tweets*
