require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');
const { Connection, PublicKey, LAMPORTS_PER_SOL, clusterApiUrl } = require('@solana/web3.js');

const app = express();
const PORT = process.env.PORT || 3000;
const IS_PROD = process.env.NODE_ENV === 'production';

// Real Solana connection to devnet
const solanaConnection = new Connection(clusterApiUrl('devnet'), 'confirmed');

// Known Solana DAO treasury wallets (mainnet addresses used for lookup, devnet for live balance)
const DAO_WALLETS = {
  'marinade':   'B1aLAAe4vW8nSQnepZFn5F7QGrWnQyz7h5xg7GNwqaX7',
  'jupiter':    'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4',
  'jito':       'Jito4APyf642JPZPx3hGc6WWJ8zPKtRbRs4P815Cx9x',
  'raydium':    'HWy1jotHpo6UqeQxx49dpYYdQB8wj9Qk9MdxwjLvDHB8',
};

app.use(cors({
  origin: IS_PROD ? ['https://wardex.onrender.com'] : '*',
  methods: ['GET', 'POST'],
}));
app.use(express.json({ limit: '10kb' }));
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: IS_PROD ? '1d' : 0,
}));

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://api.llama.fi; img-src 'self' data:;");
  if (IS_PROD) res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
});

const rateLimitMap = new Map();
function rateLimit(maxRequests, windowMs) {
  return (req, res, next) => {
    const key = req.ip || 'unknown';
    const now = Date.now();
    const record = rateLimitMap.get(key) || { count: 0, start: now };
    if (now - record.start > windowMs) { record.count = 0; record.start = now; }
    record.count++;
    rateLimitMap.set(key, record);
    if (record.count > maxRequests) {
      return res.status(429).json({ error: { code: 429, message: 'Too many requests. Please wait a moment.' } });
    }
    next();
  };
}

function sanitiseSlug(slug) {
  if (!slug || typeof slug !== 'string') return null;
  const clean = slug.toLowerCase().trim().replace(/[^a-z0-9-]/g, '');
  if (clean.length < 2 || clean.length > 60) return null;
  return clean;
}

function sendError(res, status, message) {
  return res.status(status).json({ error: { code: status, message } });
}

const cache = new Map();
const CACHE_TTL = 30 * 60 * 1000;
function getCached(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL) { cache.delete(key); return null; }
  return entry.data;
}
function setCache(key, data) {
  cache.set(key, { data, ts: Date.now() });
}

app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), env: IS_PROD ? 'production' : 'development' });
});

// REAL SOLANA ON-CHAIN endpoint — reads actual wallet balance from Solana devnet
app.get('/api/solana/wallet/:protocol', rateLimit(20, 60000), async (req, res) => {
  const protocol = sanitiseSlug(req.params.protocol);
  if (!protocol) return sendError(res, 400, 'Invalid protocol name.');

  try {
    // Get the known wallet address for this protocol
    const walletAddress = DAO_WALLETS[protocol];
    if (!walletAddress) {
      return sendError(res, 404, 'No wallet address found for protocol: ' + protocol);
    }

    const pubkey = new PublicKey(walletAddress);

    // Read real balance from Solana devnet blockchain
    const balance = await solanaConnection.getBalance(pubkey);
    const solBalance = balance / LAMPORTS_PER_SOL;

    // Get recent transaction signatures from Solana
    const signatures = await solanaConnection.getSignaturesForAddress(pubkey, { limit: 5 });

    res.json({
      protocol: protocol,
      walletAddress: walletAddress,
      network: 'devnet',
      solBalance: solBalance,
      lamports: balance,
      recentTransactions: signatures.length,
      lastActivity: signatures.length > 0 ? signatures[0].blockTime : null,
      onChain: true,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('[solana] Error reading wallet:', error.message);
    return sendError(res, 502, 'Failed to read Solana wallet data: ' + error.message);
  }
});

app.get('/api/treasury/:protocol', rateLimit(20, 60000), async (req, res) => {
  const protocol = sanitiseSlug(req.params.protocol);
  if (!protocol) return sendError(res, 400, 'Invalid protocol name. Use only letters, numbers, and hyphens.');

  const cached = getCached('treasury:' + protocol);
  if (cached) return res.json(cached);

  try {
    const response = await axios.get('https://api.llama.fi/protocol/' + protocol, { timeout: 8000 });
    const data = response.data;
    if (!data || !data.name) return sendError(res, 404, 'Protocol "' + protocol + '" not found. Try: marinade, jupiter, jito, raydium');
    const treasury = buildTreasuryFromProtocol(data, protocol);
    setCache('treasury:' + protocol, treasury);
    res.json(treasury);
  } catch (error) {
    if (error.response && error.response.status === 404) {
      return sendError(res, 404, 'Protocol "' + protocol + '" not found. Try: marinade, jupiter, jito, raydium');
    }
    console.error('[treasury] Error fetching ' + protocol + ':', error.message);
    return sendError(res, 502, 'Failed to fetch treasury data. Please try again shortly.');
  }
});

app.post('/api/agent/analyze', rateLimit(30, 60000), async (req, res) => {
  const { treasuryData } = req.body;
  if (!treasuryData || typeof treasuryData !== 'object') return sendError(res, 400, 'Invalid request body.');
  try {
    const analysis = analyzeRisk(treasuryData);
    res.json(analysis);
  } catch (error) {
    console.error('[agent] Analysis error:', error.message);
    return sendError(res, 500, 'Agent analysis failed. Please try again.');
  }
});

function buildTreasuryFromProtocol(data, slug) {
  const tvlHistory = data.tvl || [];
  const tvl = tvlHistory.length > 0 ? (tvlHistory[tvlHistory.length - 1].totalLiquidityUSD || 0) : 0;

  const protocolProfiles = {
    'marinade':    { nativeRatio: 0.60, stableRatio: 0.20, otherRatio: 0.20 },
    'jupiter':     { nativeRatio: 0.72, stableRatio: 0.14, otherRatio: 0.14 },
    'jito':        { nativeRatio: 0.63, stableRatio: 0.18, otherRatio: 0.19 },
    'raydium':     { nativeRatio: 0.75, stableRatio: 0.12, otherRatio: 0.13 },
    'orca':        { nativeRatio: 0.70, stableRatio: 0.15, otherRatio: 0.15 },
    'drift':       { nativeRatio: 0.65, stableRatio: 0.22, otherRatio: 0.13 },
    'kamino':      { nativeRatio: 0.58, stableRatio: 0.28, otherRatio: 0.14 },
    'aave-v3':     { nativeRatio: 0.55, stableRatio: 0.32, otherRatio: 0.13 },
    'uniswap-v3':  { nativeRatio: 0.72, stableRatio: 0.14, otherRatio: 0.14 },
    'compound-v3': { nativeRatio: 0.55, stableRatio: 0.32, otherRatio: 0.13 },
  };

  const key = (slug || '').toLowerCase();
  const profile = protocolProfiles[key] || { nativeRatio: 0.68, stableRatio: 0.18, otherRatio: 0.14 };

  return {
    name: data.name,
    symbol: data.symbol || 'N/A',
    category: data.category || 'DeFi',
    totalValue: tvl,
    chainTvls: data.currentChainTvls || {},
    tokenBreakdowns: {
      ownTokens: [{ symbol: data.symbol || 'NATIVE', usdValue: tvl * profile.nativeRatio }],
      stablecoins: [{ symbol: 'USDC/USDT', usdValue: tvl * profile.stableRatio }],
      others: [{ symbol: 'Other', usdValue: tvl * profile.otherRatio }],
    },
    estimatedBreakdown: true,
  };
}

function analyzeRisk(treasury) {
  const totalValue = Number(treasury.totalValue) || 0;
  const tokens = treasury.tokenBreakdowns.ownTokens || [];
  const stables = treasury.tokenBreakdowns.stablecoins || [];
  const others = treasury.tokenBreakdowns.others || [];

  const nativeValue = tokens.reduce(function(s, t) { return s + (Number(t.usdValue) || 0); }, 0);
  const stableValue = stables.reduce(function(s, t) { return s + (Number(t.usdValue) || 0); }, 0);
  const otherValue = others.reduce(function(s, t) { return s + (Number(t.usdValue) || 0); }, 0);

  const nativeConcentration = totalValue > 0 ? (nativeValue / totalValue) * 100 : 0;
  const stableRatio = totalValue > 0 ? (stableValue / totalValue) * 100 : 0;

  const bearCaseNativeLoss = nativeValue * 0.70;
  const bearCaseTotalValue = totalValue - bearCaseNativeLoss;
  const monthlyBurn = Math.max(50000, totalValue * 0.001);
  const runwayMonths = stableValue > 0 ? Math.floor(stableValue / monthlyBurn) : 0;
  const annualYieldOpportunity = stableValue * 0.045;

  let riskScore = 15;
  if (nativeConcentration > 80) riskScore = 90;
  else if (nativeConcentration > 60) riskScore = 70;
  else if (nativeConcentration > 40) riskScore = 50;
  else if (nativeConcentration > 20) riskScore = 30;

  let recommendation, action;
  if (nativeConcentration > 70) {
    recommendation = 'CRITICAL: ' + nativeConcentration.toFixed(1) + '% of treasury is in native tokens. A 70% bear market drawdown would reduce treasury value from $' + (totalValue / 1e6).toFixed(2) + 'M to $' + (bearCaseTotalValue / 1e6).toFixed(2) + 'M.';
    action = 'Wardex recommends converting 20% of native token holdings to stablecoins. This reduces bear case loss by $' + (nativeValue * 0.20 * 0.70 / 1e6).toFixed(2) + 'M while maintaining community alignment.';
  } else if (nativeConcentration > 40) {
    recommendation = 'MODERATE RISK: Native token concentration at ' + nativeConcentration.toFixed(1) + '%. Treasury is partially exposed to market volatility.';
    action = 'Wardex recommends deploying idle stablecoins into yield-bearing instruments. Potential annual yield: $' + (annualYieldOpportunity / 1e3).toFixed(1) + 'k.';
  } else {
    recommendation = 'HEALTHY: Treasury is well diversified with ' + stableRatio.toFixed(1) + '% in stablecoins.';
    action = 'Wardex recommends deploying idle stablecoins into strategy-approved yield vaults. Annual yield opportunity: $' + (annualYieldOpportunity / 1e3).toFixed(1) + 'k.';
  }

  return {
    totalValue: totalValue,
    nativeValue: nativeValue,
    stableValue: stableValue,
    otherValue: otherValue,
    nativeConcentration: nativeConcentration,
    stableRatio: stableRatio,
    riskScore: riskScore,
    runwayMonths: runwayMonths,
    bearCaseTotalValue: bearCaseTotalValue,
    bearCaseNativeLoss: bearCaseNativeLoss,
    annualYieldOpportunity: annualYieldOpportunity,
    recommendation: recommendation,
    action: action,
    name: treasury.name,
    symbol: treasury.symbol,
    category: treasury.category,
    estimated: treasury.estimatedBreakdown || false,
    timestamp: new Date().toISOString(),
  };
}

process.on('unhandledRejection', function(reason) {
  console.error('[unhandledRejection]', reason);
});

app.listen(PORT, function() {
  console.log('Wardex running on http://localhost:' + PORT + ' [' + (IS_PROD ? 'production' : 'development') + ']');
});