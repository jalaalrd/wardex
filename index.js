require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Fetch protocol data from DefiLlama (free endpoint)
app.get('/api/treasury/:protocol', async (req, res) => {
    const { protocol } = req.params;
    try {
      const response = await axios.get(`https://api.llama.fi/protocol/${protocol}`);
      const data = response.data;
  
      if (!data || !data.name) {
        return res.status(404).json({ error: `DAO "${protocol}" not found.` });
      }
  
      const treasury = buildTreasuryFromProtocol(data);
      res.json(treasury);
    } catch (error) {
      console.error('Error:', error.message);
      res.status(404).json({ error: `DAO "${protocol}" not found. Try: aave-v3, uniswap-v3, compound-v3, lido` });
    }
  });

// Search protocols
app.get('/api/search/:query', async (req, res) => {
  const { query } = req.params;
  try {
    const response = await axios.get('https://api.llama.fi/protocols');
    const protocols = response.data;
    const matches = protocols
      .filter(p => p.name.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 5)
      .map(p => ({ id: p.slug, name: p.name, tvl: p.tvl, category: p.category }));
    res.json(matches);
  } catch (error) {
    res.status(500).json({ error: 'Search failed' });
  }
});

// Agent analysis endpoint
app.post('/api/agent/analyze', async (req, res) => {
  const { treasuryData } = req.body;
  try {
    const analysis = analyzeRisk(treasuryData);
    res.json(analysis);
  } catch (error) {
    res.status(500).json({ error: 'Agent analysis failed' });
  }
});

// Build treasury structure from protocol data
function buildTreasuryFromProtocol(data) {
  const tvl = data.tvl?.length > 0
    ? data.tvl[data.tvl.length - 1]?.totalLiquidityUSD || 0
    : 0;

  const currentChainTvls = data.currentChainTvls || {};

  // Estimate token breakdown based on category
  // Most DeFi DAOs hold 60-80% native, rest in stables/other
  const nativeEstimate = tvl * 0.68;
  const stableEstimate = tvl * 0.18;
  const otherEstimate = tvl * 0.14;

  return {
    name: data.name,
    symbol: data.symbol,
    category: data.category,
    totalValue: tvl,
    chainTvls: currentChainTvls,
    tokenBreakdowns: {
      ownTokens: [{ symbol: data.symbol, usdValue: nativeEstimate }],
      stablecoins: [{ symbol: 'USDC/USDT', usdValue: stableEstimate }],
      others: [{ symbol: 'Other', usdValue: otherEstimate }]
    },
    description: data.description,
    url: data.url,
    twitter: data.twitter
  };
}

// Core risk analysis logic
function analyzeRisk(treasury) {
  const totalValue = treasury.totalValue || 0;
  const nativeValue = treasury.tokenBreakdowns?.ownTokens?.reduce((sum, t) => sum + (t.usdValue || 0), 0) || 0;
  const stableValue = treasury.tokenBreakdowns?.stablecoins?.reduce((sum, t) => sum + (t.usdValue || 0), 0) || 0;
  const otherValue = treasury.tokenBreakdowns?.others?.reduce((sum, t) => sum + (t.usdValue || 0), 0) || 0;

  const nativeConcentration = totalValue > 0 ? (nativeValue / totalValue) * 100 : 0;
  const stableRatio = totalValue > 0 ? (stableValue / totalValue) * 100 : 0;

  // Bear market scenario — 70% drawdown on native tokens (historical data)
  const bearCaseNativeLoss = nativeValue * 0.70;
  const bearCaseTotalValue = totalValue - bearCaseNativeLoss;

  // Runway — $50k/month average DAO operational cost
  const monthlyBurn = 50000;
  const runwayMonths = stableValue > 0 ? Math.floor(stableValue / monthlyBurn) : 0;

  // Yield opportunity at 4.5% APY on idle stablecoins
  const annualYieldOpportunity = stableValue * 0.045;

  // Risk score 0-100
  let riskScore = 0;
  if (nativeConcentration > 80) riskScore = 90;
  else if (nativeConcentration > 60) riskScore = 70;
  else if (nativeConcentration > 40) riskScore = 50;
  else if (nativeConcentration > 20) riskScore = 30;
  else riskScore = 15;

  // Agent recommendation
  let recommendation = '';
  let action = '';

  if (nativeConcentration > 70) {
    recommendation = `CRITICAL: ${nativeConcentration.toFixed(1)}% of treasury is in native tokens. A 70% bear market drawdown would reduce treasury value from $${(totalValue / 1e6).toFixed(2)}M to $${(bearCaseTotalValue / 1e6).toFixed(2)}M.`;
    action = `Wardex recommends converting 20% of native token holdings to stablecoins. This reduces bear case loss by $${(nativeValue * 0.20 * 0.70 / 1e6).toFixed(2)}M while maintaining community alignment.`;
  } else if (nativeConcentration > 40) {
    recommendation = `MODERATE RISK: Native token concentration at ${nativeConcentration.toFixed(1)}%. Treasury is partially exposed to market volatility.`;
    action = `Wardex recommends deploying idle stablecoins into yield-bearing instruments. Potential annual yield: $${(annualYieldOpportunity / 1e3).toFixed(1)}k.`;
  } else {
    recommendation = `HEALTHY: Treasury is well diversified with ${stableRatio.toFixed(1)}% in stablecoins.`;
    action = `Wardex recommends deploying idle stablecoins into tokenised T-bill vaults at 4.5% APY. Annual yield opportunity: $${(annualYieldOpportunity / 1e3).toFixed(1)}k.`;
  }

  return {
    totalValue,
    nativeValue,
    stableValue,
    otherValue,
    nativeConcentration,
    stableRatio,
    riskScore,
    runwayMonths,
    bearCaseTotalValue,
    bearCaseNativeLoss,
    annualYieldOpportunity,
    recommendation,
    action,
    name: treasury.name,
    symbol: treasury.symbol,
    timestamp: new Date().toISOString()
  };
}

app.listen(PORT, () => {
  console.log(`Wardex running on http://localhost:${PORT}`);
});