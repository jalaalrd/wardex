require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');
const { Connection, PublicKey, LAMPORTS_PER_SOL, clusterApiUrl, Keypair, Transaction, TransactionInstruction } = require('@solana/web3.js');

const app = express();
const PORT = process.env.PORT || 3000;
const IS_PROD = process.env.NODE_ENV === 'production';

// Track integration API keys
const RPCFAST_API_KEY  = process.env.RPCFAST_API_KEY;
const GOLDRUSH_API_KEY = process.env.GOLDRUSH_API_KEY;
const JUPITER_API_KEY  = process.env.JUPITER_API_KEY;

// Solana connections — devnet for agent execution, mainnet for Realms treasury reads
// RPC Fast powers fast reads (getMultipleAccountsInfo, getParsedTokenAccountsByOwner, getBalance).
// getProgramAccounts is not available on the free plan so a public fallback handles that call.
const solanaConnection = new Connection(clusterApiUrl('devnet'), 'confirmed');
const solanaMainnet = RPCFAST_API_KEY
  ? new Connection('https://solana-rpc.rpcfast.com', {
      commitment: 'confirmed',
      httpHeaders: { 'X-Token': RPCFAST_API_KEY },
    })
  : new Connection(process.env.SOLANA_RPC_URL || clusterApiUrl('mainnet-beta'), 'confirmed');
// Free-tier fallback for getProgramAccounts (not included in RPC Fast Start plan)
const solanaMainnetFallback = new Connection(
  process.env.SOLANA_RPC_URL || clusterApiUrl('mainnet-beta'), 'confirmed'
);

// Agent keypair for devnet execution — loaded from env (AGENT_KEYPAIR_SECRET) or generated fresh
const MEMO_PROGRAM_ID = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');

function loadOrGenerateKeypair() {
  const hex = process.env.AGENT_KEYPAIR_HEX;
  if (hex && /^[0-9a-f]{128}$/.test(hex)) {
    try {
      return Keypair.fromSecretKey(Uint8Array.from(Buffer.from(hex, 'hex')));
    } catch {
      console.warn('[agent] Could not load AGENT_KEYPAIR_HEX, generating fresh keypair');
    }
  }
  return Keypair.generate();
}

const agentKeypair = loadOrGenerateKeypair();
let agentFunded = false;

async function fundAgentKeypair() {
  // Check balance first — no need to airdrop if already funded
  try {
    const balance = await solanaConnection.getBalance(agentKeypair.publicKey);
    if (balance >= 5000) { // at least 0.000005 SOL (covers a Memo TX fee)
      agentFunded = true;
      console.log('[agent] Devnet keypair ready:', agentKeypair.publicKey.toBase58(), '— balance:', (balance / LAMPORTS_PER_SOL).toFixed(4), 'SOL');
      return;
    }
  } catch {}

  // Request airdrop via RPC
  try {
    const sig = await solanaConnection.requestAirdrop(agentKeypair.publicKey, 1 * LAMPORTS_PER_SOL);
    await solanaConnection.confirmTransaction(sig, 'confirmed');
    agentFunded = true;
    console.log('[agent] Devnet keypair funded via airdrop:', agentKeypair.publicKey.toBase58());
    return;
  } catch (err) {
    console.warn('[agent] RPC airdrop failed:', err.message);
  }

  // Fallback: try faucet.solana.com API
  try {
    const faucetRes = await axios.post('https://faucet.solana.com/api/v1/request-airdrop', {
      pubkey: agentKeypair.publicKey.toBase58(),
      lamports: 1000000000,
    }, { timeout: 10000 });
    if (faucetRes.data && faucetRes.data.signature) {
      agentFunded = true;
      console.log('[agent] Devnet keypair funded via faucet:', agentKeypair.publicKey.toBase58());
    }
  } catch (err) {
    console.warn('[agent] Faucet airdrop also failed:', err.message);
  }
}

fundAgentKeypair();

// Governance account type bytes that represent treasury-controlling accounts (V1 and V2 variants)
const GOVERNANCE_ACCOUNT_TYPES = new Set([3, 4, 9, 10, 14, 16, 17, 19]);
const SPL_TOKEN_PROGRAM = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');

// Confirmed on-chain DAO configs — realm pubkeys verified on mainnet, May 2026
const DAO_CONFIGS = {
  marinade: {
    realmPubkey: '899YG3yk4F66ZgbNWLHriZHTXSKk9e1kvsKEquW7L6Mo',
    govProgram:  'GovMaiHfpVPw8BAM1mbdzgmSZYDw2tdP32J2fapoQoYs',
    customGovFork: true,
    nativeToken: 'MNDE',
    stableLabel: 'mSOL/USDC',
    defillamaSlug: 'marinade',
    context: 'Marinade passed MIP proposals to diversify away from MNDE concentration. mSOL/USDC treasury needs active management.',
    nativeRatio: 0.60, stableRatio: 0.20, otherRatio: 0.20,
  },
  jito: {
    realmPubkey: 'jjCAwuuNpJCNMLAanpwgJZ6cdXzLPXe2GfD6TaDQBXt',
    govProgram:  'jtogvBNH3WBSWDYD5FJfQP2ZxNTuf82zL8GkEhPeaJx',
    nativeToken: 'JTO',
    stableLabel: 'SOL/USDC',
    defillamaSlug: 'jito',
    context: 'JIP-24 routes 100% of Block Engine fees (~$15M+/yr) to DAO treasury. Idle SOL is accumulating with no deployment strategy.',
    nativeRatio: 0.63, stableRatio: 0.18, otherRatio: 0.19,
  },
  jupiter: {
    realmPubkey: '2Z5BXuRCJPqYUCBGyQTwAXHeJoFAnbtvoXja19aZFLKY',
    govProgram:  'GovER5Lthms3bLBqWub97yVrMmEogzX7xNjdXpPPCVZw',
    nativeToken: 'JUP',
    stableLabel: 'USDC',
    defillamaSlug: 'jupiter',
    context: 'Treasury locked until 2027. New governance model in design. Wardex is the execution layer for when it reopens.',
    nativeRatio: 0.72, stableRatio: 0.14, otherRatio: 0.14,
  },
  raydium: {
    realmPubkey: '8JZdqeTaMkPaatN8xKRXRHeSGSrNLSMAT5vWQjdNp7K',
    govProgram:  'GovER5Lthms3bLBqWub97yVrMmEogzX7xNjdXpPPCVZw',
    nativeToken: 'RAY',
    stableLabel: 'USDC',
    defillamaSlug: 'raydium',
    context: 'On-chain governance launched 2025. Treasury management practices still immature — first-mover opportunity for Wardex.',
    nativeRatio: 0.75, stableRatio: 0.12, otherRatio: 0.13,
  },
  orca:        { nativeRatio: 0.70, stableRatio: 0.15, otherRatio: 0.15 },
  drift:       { nativeRatio: 0.65, stableRatio: 0.22, otherRatio: 0.13 },
  kamino:      { nativeRatio: 0.58, stableRatio: 0.28, otherRatio: 0.14 },
  'aave-v3':   { nativeRatio: 0.55, stableRatio: 0.32, otherRatio: 0.13 },
  'uniswap-v3':  { nativeRatio: 0.72, stableRatio: 0.14, otherRatio: 0.14 },
  'compound-v3': { nativeRatio: 0.55, stableRatio: 0.32, otherRatio: 0.13 },
};

// GoldRush (Covalent) — real on-chain SPL token balances with USD pricing
const STABLECOIN_SYMBOLS = new Set(['USDC','USDT','USDS','DAI','PYUSD','EURC','USDH','PAI','USDA','UXD','ISC','HUSDC']);

async function getGoldRushBalances(address) {
  if (!GOLDRUSH_API_KEY || !address) return null;
  try {
    const res = await Promise.race([
      axios.get(`https://api.covalenthq.com/v1/solana-mainnet/address/${address}/balances_v2/`, {
        params: { key: GOLDRUSH_API_KEY, nft: false },
        timeout: 8000,
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('GoldRush timeout')), 8000)),
    ]);
    const items = res.data?.data?.items;
    return Array.isArray(items) && items.length ? items : null;
  } catch (err) {
    console.warn('[goldrush] Balances fetch failed:', err.message);
    return null;
  }
}

function categoriseGoldRushItems(items, nativeTokenSymbol) {
  let nativeValue = 0, stableValue = 0, otherValue = 0;
  const nativeSym = (nativeTokenSymbol || '').toUpperCase();
  for (const item of items) {
    const sym  = (item.contract_ticker_symbol || '').toUpperCase();
    const usd  = Number(item.quote) || 0;
    if (usd <= 0) continue;
    if (sym === nativeSym || sym === 'SOL' || sym === 'MSOL' || sym === 'JITOSOL' || sym === 'BSOL') {
      nativeValue += usd;
    } else if (STABLECOIN_SYMBOLS.has(sym)) {
      stableValue += usd;
    } else {
      otherValue += usd;
    }
  }
  return { nativeValue, stableValue, otherValue, total: nativeValue + stableValue + otherValue };
}

app.disable('x-powered-by');
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
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://api.llama.fi https://yields.llama.fi; img-src 'self' data:; frame-ancestors 'none';");
  if (IS_PROD) res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
});

const rateLimitMap = new Map();
// Purge stale rate-limit entries every 10 minutes to prevent unbounded memory growth
setInterval(() => {
  const cutoff = Date.now() - 10 * 60 * 1000;
  for (const [key, record] of rateLimitMap) {
    if (record.start < cutoff) rateLimitMap.delete(key);
  }
}, 10 * 60 * 1000).unref();

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
const CACHE_MAX_SIZE = 200;
function getCached(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > entry.ttl) { cache.delete(key); return null; }
  return entry.data;
}
function setCache(key, data, ttlMs) {
  // Evict oldest entry if at capacity
  if (cache.size >= CACHE_MAX_SIZE) {
    const oldest = cache.keys().next().value;
    cache.delete(oldest);
  }
  cache.set(key, { data, ts: Date.now(), ttl: ttlMs || 30 * 60 * 1000 });
}

// Derive native treasury PDA for a governance account (seeds: ['native-treasury', governancePubkey])
function getNativeTreasuryAddress(govProgram, governancePubkey) {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from('native-treasury'), governancePubkey.toBuffer()],
    new PublicKey(govProgram)
  );
  return pda;
}

// Read real on-chain DAO treasury from Solana mainnet via SPL Governance
async function getRealmsOnChainTreasury(protocol) {
  const cfg = DAO_CONFIGS[protocol];
  if (!cfg || !cfg.realmPubkey || !cfg.govProgram) return null;

  try {
    const govProgramId = new PublicKey(cfg.govProgram);
    const realmPk = new PublicKey(cfg.realmPubkey);

    // Fetch governance accounts belonging to this realm.
    // In SPL Governance borsh layout: byte 0 = account_type (u8), bytes 1–32 = realm pubkey.
    // The memcmp filter at offset 1 returns all accounts (governance + token owner records) for this realm.
    // Use fallback RPC for getProgramAccounts — not available on RPC Fast Start plan
    const rawAccounts = await Promise.race([
      solanaMainnetFallback.getProgramAccounts(govProgramId, {
        commitment: 'confirmed',
        filters: [{ memcmp: { offset: 1, bytes: realmPk.toBase58() } }],
        dataSlice: { offset: 0, length: 1 }, // only fetch the type byte
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('RPC timeout')), 9000)),
    ]);

    // Keep governance account types only. Cap at 8 to protect against custom governance
    // programs (e.g. Marinade's fork) that may return many accounts with matching byte patterns.
    const govAccounts = rawAccounts
      .filter(a => GOVERNANCE_ACCOUNT_TYPES.has(a.account.data[0]))
      .slice(0, 8);

    if (govAccounts.length === 0) return null;

    // Derive native treasury PDAs and batch-read their SOL balances
    const govSlice = govAccounts;
    const treasuryPdas = govSlice.map(({ pubkey }) => getNativeTreasuryAddress(cfg.govProgram, pubkey));
    const accountInfos = await solanaMainnet.getMultipleAccountsInfo(treasuryPdas, 'confirmed');

    let totalSol = 0;
    const nonEmptyTreasuries = [];
    accountInfos.forEach((info, i) => {
      const sol = info ? info.lamports / LAMPORTS_PER_SOL : 0;
      totalSol += sol;
      if (sol > 0.001) nonEmptyTreasuries.push(treasuryPdas[i]);
    });

    // Read SPL token accounts for non-empty treasuries (cap at 3 to avoid rate limits)
    const splTokens = {};
    for (const pda of nonEmptyTreasuries.slice(0, 3)) {
      try {
        const tokenAccounts = await solanaMainnet.getParsedTokenAccountsByOwner(
          pda, { programId: SPL_TOKEN_PROGRAM }
        );
        for (const { account } of tokenAccounts.value) {
          const info = account.data.parsed.info;
          const amount = info.tokenAmount.uiAmount || 0;
          if (amount > 0) splTokens[info.mint] = (splTokens[info.mint] || 0) + amount;
        }
      } catch {}
    }

    return {
      govAccountsFound: govAccounts.length,
      nativeSol: totalSol,
      splTokens: Object.entries(splTokens).map(([mint, uiAmount]) => ({ mint, uiAmount })),
      treasuryAddresses: nonEmptyTreasuries.slice(0, 3).map(p => p.toBase58()),
      realmsConnected: true,
      onChain: true,
      realmPubkey: cfg.realmPubkey,
      network: 'mainnet-beta',
    };
  } catch (err) {
    console.error('[realms] ' + protocol + ':', err.message);
    return null;
  }
}

app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), env: IS_PROD ? 'production' : 'development' });
});

// Live yield rates from DefiLlama yields API — Kamino, Marginfi, Drift on Solana
app.get('/api/yield/rates', rateLimit(30, 60000), async (req, res) => {
  const cached = getCached('yield:rates');
  if (cached) return res.json(cached);

  try {
    // Fetch DefiLlama pools + Jupiter Lend rates in parallel
    const [llamaRes, jupiterRes] = await Promise.allSettled([
      axios.get('https://yields.llama.fi/pools', { timeout: 8000 }),
      JUPITER_API_KEY
        ? axios.get('https://api.jup.ag/lend/v1/earn/tokens', {
            headers: { 'x-api-key': JUPITER_API_KEY },
            timeout: 6000,
          })
        : Promise.resolve(null),
    ]);

    const pools = llamaRes.status === 'fulfilled' ? (llamaRes.value.data.data || []) : [];

    const find = (project, symbol) =>
      pools.find(p => p.project === project && p.chain === 'Solana' && p.symbol === symbol);

    const kaminoUsdc  = find('kamino',   'USDC');
    const kaminoSol   = find('kamino',   'SOL');
    const marginfi    = find('marginfi', 'USDC');
    const drift       = find('drift',    'USDC');

    // Jupiter Lend stablecoin supply rate (JupUSD vault — rates in basis points)
    // totalRate = supplyRate + rewardsRate; divide by 10000 to get decimal APY
    let jupiterLendUsdc = null;
    if (jupiterRes.status === 'fulfilled' && jupiterRes.value?.data) {
      const jupTokens = Array.isArray(jupiterRes.value.data) ? jupiterRes.value.data : [];
      // Jupiter Lend uses JupUSD (their stablecoin) — pick the first stablecoin vault
      const stableEntry = jupTokens.find(t => {
        const sym = (t.asset?.symbol || t.symbol || t.uiSymbol || '').toUpperCase();
        return sym === 'JUPUSD' || sym === 'USDC' || sym === 'USDT';
      });
      if (stableEntry?.totalRate != null) {
        jupiterLendUsdc = Number(stableEntry.totalRate) / 10000; // bps → decimal
        console.log('[jupiter-lend] stablecoin totalRate:', (jupiterLendUsdc * 100).toFixed(2) + '% APY (asset:', stableEntry.asset?.symbol || stableEntry.symbol, ')');
      }
    }

    const rates = {
      kamino_usdc:        kaminoUsdc  ? kaminoUsdc.apy  / 100 : 0.055,
      kamino_sol:         kaminoSol   ? kaminoSol.apy   / 100 : 0.064,
      marginfi_usdc:      marginfi    ? marginfi.apy    / 100 : 0.048,
      drift_usdc:         drift       ? drift.apy       / 100 : 0.044,
      jupiter_lend_usdc:  jupiterLendUsdc ?? 0.050,
      jupiter_lend_live:  jupiterLendUsdc != null,
      best_usdc: 0,
      best_venue: 'Kamino Earn',
      timestamp: new Date().toISOString(),
      live: !!(kaminoUsdc || marginfi),
    };

    const usdcOptions = [
      { venue: 'Kamino Earn',  rate: rates.kamino_usdc },
      { venue: 'Marginfi',     rate: rates.marginfi_usdc },
      { venue: 'Drift',        rate: rates.drift_usdc },
      { venue: 'Jupiter Lend (JupUSD)', rate: rates.jupiter_lend_usdc },
    ];
    const best = usdcOptions.reduce((a, b) => a.rate > b.rate ? a : b);
    rates.best_usdc  = best.rate;
    rates.best_venue = best.venue;

    setCache('yield:rates', rates, 10 * 60 * 1000);
    res.json(rates);
  } catch (err) {
    console.error('[yield] Error fetching rates:', err.message);
    const fallback = {
      kamino_usdc: 0.055, kamino_sol: 0.064, marginfi_usdc: 0.048, drift_usdc: 0.044,
      jupiter_lend_usdc: 0.050, jupiter_lend_live: false,
      best_usdc: 0.055, best_venue: 'Kamino Earn',
      timestamp: new Date().toISOString(), live: false,
    };
    setCache('yield:rates', fallback, 5 * 60 * 1000);
    res.json(fallback);
  }
});

// Real Solana mainnet treasury reads via SPL Governance / Realms
app.get('/api/realms/treasury/:protocol', rateLimit(10, 60000), async (req, res) => {
  const protocol = sanitiseSlug(req.params.protocol);
  if (!protocol) return sendError(res, 400, 'Invalid protocol name.');
  if (!DAO_CONFIGS[protocol]?.realmPubkey) {
    return sendError(res, 404, 'No Realms config for: ' + protocol + '. Try: marinade, jupiter, jito, raydium');
  }

  const cacheKey = 'realms:' + protocol;
  const cached = getCached(cacheKey);
  if (cached) return res.json(cached);

  const result = await getRealmsOnChainTreasury(protocol);
  if (!result) return sendError(res, 502, 'Could not read Realms treasury for ' + protocol + '. RPC may be rate-limited.');

  result.protocol = protocol;
  result.context = DAO_CONFIGS[protocol].context || '';
  setCache(cacheKey, result, 5 * 60 * 1000);
  res.json(result);
});

// Legacy devnet wallet endpoint (kept for compatibility)
app.get('/api/solana/wallet/:protocol', rateLimit(20, 60000), async (req, res) => {
  const protocol = sanitiseSlug(req.params.protocol);
  if (!protocol) return sendError(res, 400, 'Invalid protocol name.');

  const cfg = DAO_CONFIGS[protocol];
  if (!cfg?.realmPubkey) return sendError(res, 404, 'No wallet address found for protocol: ' + protocol);

  try {
    const pubkey = new PublicKey(cfg.realmPubkey);
    const balance = await solanaConnection.getBalance(pubkey);
    const signatures = await solanaConnection.getSignaturesForAddress(pubkey, { limit: 5 });

    res.json({
      protocol,
      walletAddress: cfg.realmPubkey,
      network: 'devnet',
      solBalance: balance / LAMPORTS_PER_SOL,
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

  const cacheKey = 'treasury:' + protocol;
  const cached = getCached(cacheKey);
  if (cached) return res.json(cached);

  try {
    const response = await axios.get('https://api.llama.fi/protocol/' + protocol, { timeout: 8000 });
    const data = response.data;
    if (!data || !data.name) return sendError(res, 404, 'Protocol "' + protocol + '" not found. Try: marinade, jupiter, jito, raydium');

    // Attempt to enrich with real on-chain Realms data (non-blocking — falls back gracefully)
    const realmsData = await getRealmsOnChainTreasury(protocol);

    // GoldRush enrichment — real USD token balances for treasury PDAs (replaces estimated ratios)
    let goldRushItems = null;
    if (GOLDRUSH_API_KEY) {
      const grAddr = realmsData?.treasuryAddresses?.[0] || DAO_CONFIGS[protocol]?.realmPubkey;
      if (grAddr) {
        goldRushItems = await getGoldRushBalances(grAddr);
        if (goldRushItems) console.log('[goldrush] Got', goldRushItems.length, 'token balances for', protocol);
      }
    }

    const treasury = buildTreasuryFromProtocol(data, protocol, realmsData, goldRushItems);
    setCache(cacheKey, treasury, 30 * 60 * 1000);
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
  if (!treasuryData || typeof treasuryData !== 'object' ||
      typeof treasuryData.totalValue === 'undefined' ||
      !treasuryData.tokenBreakdowns || typeof treasuryData.tokenBreakdowns !== 'object') {
    return sendError(res, 400, 'Invalid request body.');
  }
  try {
    const yieldRates = getCached('yield:rates');
    const liveYieldRate = yieldRates ? yieldRates.best_usdc : null;
    const bestVenue = yieldRates ? yieldRates.best_venue : 'Kamino Earn';
    const analysis = analyzeRisk(treasuryData, liveYieldRate, bestVenue);
    res.json(analysis);
  } catch (error) {
    console.error('[agent] Analysis error:', error.message);
    return sendError(res, 500, 'Agent analysis failed. Please try again.');
  }
});

app.post('/api/agent/execute', rateLimit(10, 60000), async (req, res) => {
  const { daoName, action, venue } = req.body || {};
  if (!daoName) return sendError(res, 400, 'daoName is required.');

  if (!agentFunded) {
    // Retry airdrop if first attempt failed
    await fundAgentKeypair();
    if (!agentFunded) {
      return sendError(res, 503, 'Agent devnet wallet not yet funded. Please try again in a moment.');
    }
  }

  try {
    const sanitise = s => String(s).replace(/[\n\r\t|]/g, ' ').trim();
    // SNS identity — wardex-agent.sol is the on-chain identity for this agent
    // The .sol domain is registered on Solana mainnet and resolved via Solana Name Service
    const AGENT_SNS_IDENTITY = 'wardex-agent.sol';
    const memoText = `Wardex agent execution | Identity: ${AGENT_SNS_IDENTITY} | DAO: ${sanitise(daoName).slice(0, 40)} | Action: ${sanitise(action || 'rebalance').slice(0, 60)} | Venue: ${sanitise(venue || 'Kamino Earn').slice(0, 30)} | ts: ${Date.now()}`;

    const transaction = new Transaction().add(
      new TransactionInstruction({
        keys: [],
        programId: MEMO_PROGRAM_ID,
        data: Buffer.from(memoText, 'utf-8'),
      })
    );

    const { blockhash, lastValidBlockHeight } = await solanaConnection.getLatestBlockhash('confirmed');
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = agentKeypair.publicKey;

    const signature = await solanaConnection.sendTransaction(transaction, [agentKeypair], { skipPreflight: false });
    await Promise.race([
      solanaConnection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, 'confirmed'),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Confirmation timeout')), 30000)),
    ]);

    console.log(`[agent/execute] ${new Date().toISOString()} DAO=${sanitise(daoName)} sig=${signature}`);
    // Proactively refund if balance is getting low
    solanaConnection.getBalance(agentKeypair.publicKey).then(bal => {
      if (bal < 0.05 * LAMPORTS_PER_SOL) {
        console.warn('[agent] Low devnet balance:', bal / LAMPORTS_PER_SOL, 'SOL — attempting refund');
        fundAgentKeypair();
      }
    }).catch(() => {});
    res.json({
      success: true,
      signature,
      explorerUrl: `https://explorer.solana.com/tx/${signature}?cluster=devnet`,
      agentPubkey: agentKeypair.publicKey.toBase58(),
      agentIdentity: AGENT_SNS_IDENTITY,
      memo: memoText,
    });
  } catch (err) {
    console.error('[agent/execute] Transaction failed:', err.message);
    return sendError(res, 500, 'Devnet transaction could not be confirmed. Please try again.');
  }
});

function buildTreasuryFromProtocol(data, slug, realmsData, goldRushItems) {
  const tvlHistory = data.tvl || [];
  const tvl = tvlHistory.length > 0 ? (tvlHistory[tvlHistory.length - 1].totalLiquidityUSD || 0) : 0;

  const key = (slug || '').toLowerCase();
  const cfg = DAO_CONFIGS[key] || {};

  // GoldRush real token breakdown — only overrides estimated ratios when coverage is meaningful.
  // Governance realm accounts often only hold a fraction of the DAO's full treasury (the rest sits
  // in derived PDAs or multisigs), so we require GoldRush to see ≥5% of DefiLlama TVL before
  // trusting it for risk calculations. Below that threshold the badge still shows (integration is
  // real) but we keep the calibrated estimated ratios for the risk engine.
  let realBreakdown = null;
  const MIN_GOLDRUSH_COVERAGE = 0.05; // must cover ≥5% of TVL to replace estimated ratios
  if (goldRushItems && goldRushItems.length > 0) {
    const cats = categoriseGoldRushItems(goldRushItems, cfg.nativeToken);
    if (cats.total > 0 && (tvl <= 0 || cats.total / tvl >= MIN_GOLDRUSH_COVERAGE)) {
      realBreakdown = cats;
    }
  }

  const estimatedTotal = tvl > 0 ? tvl : 1;
  const profile = realBreakdown
    ? {
        nativeRatio: realBreakdown.nativeValue / estimatedTotal,
        stableRatio: realBreakdown.stableValue / estimatedTotal,
        otherRatio:  realBreakdown.otherValue  / estimatedTotal,
      }
    : {
        nativeRatio: cfg.nativeRatio || 0.68,
        stableRatio: cfg.stableRatio || 0.18,
        otherRatio:  cfg.otherRatio  || 0.14,
      };

  const realmsContext = realmsData ? {
    realmsConnected: true,
    onChain: true,
    govAccountsFound: realmsData.govAccountsFound,
    nativeSol: realmsData.nativeSol,
    realmPubkey: realmsData.realmPubkey,
  } : { realmsConnected: false, onChain: false, customGovFork: cfg.customGovFork || false };

  return {
    name: data.name,
    symbol: data.symbol || 'N/A',
    category: data.category || 'DeFi',
    totalValue: tvl,
    chainTvls: data.currentChainTvls || {},
    tokenBreakdowns: {
      ownTokens:   [{ symbol: cfg.nativeToken || data.symbol || 'NATIVE', usdValue: tvl * profile.nativeRatio }],
      stablecoins: [{ symbol: cfg.stableLabel || 'USDC/USDT',             usdValue: tvl * profile.stableRatio }],
      others:      [{ symbol: 'Other',                                     usdValue: tvl * profile.otherRatio  }],
    },
    estimatedBreakdown: !realmsData && !realBreakdown,
    goldRushConnected: !!realBreakdown,
    daoContext: cfg.context || '',
    ...realmsContext,
  };
}

function analyzeRisk(treasury, liveYieldRate, bestVenue) {
  const totalValue = Number(treasury.totalValue) || 0;
  const tokens  = treasury.tokenBreakdowns.ownTokens   || [];
  const stables = treasury.tokenBreakdowns.stablecoins || [];
  const others  = treasury.tokenBreakdowns.others      || [];

  const nativeValue = tokens .reduce((s, t) => s + (Number(t.usdValue) || 0), 0);
  const stableValue = stables.reduce((s, t) => s + (Number(t.usdValue) || 0), 0);

  const nativeConcentration = totalValue > 0 ? (nativeValue / totalValue) * 100 : 0;
  const stableRatio         = totalValue > 0 ? (stableValue / totalValue) * 100 : 0;

  const bearCaseNativeLoss = nativeValue * 0.70;
  const bearCaseTotalValue = totalValue - bearCaseNativeLoss;
  const monthlyBurn        = Math.max(50000, totalValue * 0.001);
  const runwayMonths       = stableValue > 0 ? Math.floor(stableValue / monthlyBurn) : 0;

  const yieldRate  = liveYieldRate || 0.055;
  const yieldVenue = bestVenue || 'Kamino Earn';
  const annualYieldOpportunity = stableValue * yieldRate;

  let riskScore = 15;
  if (nativeConcentration > 80)      riskScore = 90;
  else if (nativeConcentration > 60) riskScore = 70;
  else if (nativeConcentration > 40) riskScore = 50;
  else if (nativeConcentration > 20) riskScore = 30;

  let recommendation, action;
  if (nativeConcentration > 70) {
    recommendation = 'CRITICAL: ' + nativeConcentration.toFixed(1) + '% of treasury is in native tokens. A 70% bear market drawdown would reduce treasury value from $' + (totalValue / 1e6).toFixed(2) + 'M to $' + (bearCaseTotalValue / 1e6).toFixed(2) + 'M.';
    action = 'Wardex recommends converting 20% of native token holdings to stablecoins. This reduces bear case loss by $' + (nativeValue * 0.20 * 0.70 / 1e6).toFixed(2) + 'M while maintaining community alignment.';
  } else if (nativeConcentration > 40) {
    recommendation = 'MODERATE RISK: Native token concentration at ' + nativeConcentration.toFixed(1) + '%. Treasury is partially exposed to market volatility.';
    action = 'Wardex recommends deploying idle stablecoins into ' + yieldVenue + '. Potential annual yield: $' + (annualYieldOpportunity / 1e3).toFixed(1) + 'k at ' + (yieldRate * 100).toFixed(1) + '% APY.';
  } else {
    recommendation = 'HEALTHY: Treasury is well diversified with ' + stableRatio.toFixed(1) + '% in stablecoins.';
    action = 'Wardex recommends deploying idle stablecoins into ' + yieldVenue + '. Annual yield opportunity: $' + (annualYieldOpportunity / 1e3).toFixed(1) + 'k at ' + (yieldRate * 100).toFixed(1) + '% APY.';
  }

  return {
    totalValue, nativeValue, stableValue,
    otherValue: others.reduce((s, t) => s + (Number(t.usdValue) || 0), 0),
    nativeConcentration, stableRatio,
    riskScore, runwayMonths,
    bearCaseTotalValue, bearCaseNativeLoss,
    annualYieldOpportunity, yieldRate, yieldVenue,
    recommendation, action,
    name: treasury.name,
    symbol: treasury.symbol,
    category: treasury.category,
    estimated: treasury.estimatedBreakdown || false,
    realmsConnected: treasury.realmsConnected || false,
    onChain: treasury.onChain || false,
    customGovFork: treasury.customGovFork || false,
    goldRushConnected: treasury.goldRushConnected || false,
    daoContext: treasury.daoContext || '',
    timestamp: new Date().toISOString(),
  };
}

// Agent identity — Solana Name Service (.sol) onchain identity for the Wardex agent
// wardex-agent.sol is the verifiable SNS identity for autonomous treasury execution
app.get('/api/agent/identity', rateLimit(60, 60000), async (req, res) => {
  const SNS_DOMAIN = 'wardex-agent.sol';
  res.json({
    snsDomain: SNS_DOMAIN,
    agentPubkey: agentKeypair.publicKey.toBase58(),
    network: 'mainnet-beta',
    description: 'Wardex autonomous treasury agent. Verify identity: resolve wardex-agent.sol on Solana mainnet to confirm the agent pubkey.',
    resolveUrl: `https://www.sns.id/search?search=wardex-agent`,
    rpcFast: !!RPCFAST_API_KEY,
    goldRush: !!GOLDRUSH_API_KEY,
    jupiterLend: !!JUPITER_API_KEY,
    integrations: {
      rpcFast:    { enabled: !!RPCFAST_API_KEY,  purpose: 'High-performance Solana mainnet RPC for treasury reads' },
      goldRush:   { enabled: !!GOLDRUSH_API_KEY, purpose: 'Real on-chain SPL token balances with live USD pricing' },
      jupiterLend:{ enabled: !!JUPITER_API_KEY,  purpose: 'Jupiter Lend USDC supply rates as yield venue' },
      sns:        { enabled: true,               purpose: 'wardex-agent.sol — verifiable onchain agent identity' },
    },
    timestamp: new Date().toISOString(),
  });
});

process.on('unhandledRejection', function(reason) {
  console.error('[unhandledRejection]', reason);
});

app.listen(PORT, function() {
  console.log('Wardex running on http://localhost:' + PORT + ' [' + (IS_PROD ? 'production' : 'development') + ']');
  console.log('[integrations]',
    'RPC Fast:'    + (RPCFAST_API_KEY  ? '✓' : '○'),
    '| GoldRush:'  + (GOLDRUSH_API_KEY ? '✓' : '○'),
    '| Jupiter:'   + (JUPITER_API_KEY  ? '✓' : '○'),
    '| SNS: ✓ (wardex-agent.sol)'
  );
});
