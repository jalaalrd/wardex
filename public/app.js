const API = window.location.origin;

async function analyzeTreasury(protocol) {
  showLoading();
  hideError();
  hideResults();

  try {
    // Fetch real treasury data from DefiLlama via our backend
    const res = await fetch(`${API}/api/treasury/${protocol}`);
    if (!res.ok) throw new Error('DAO not found. Try uniswap, aave, or compound.');
    const treasuryData = await res.json();

    // Send to Wardex agent for analysis
    const agentRes = await fetch(`${API}/api/agent/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ treasuryData })
    });
    const analysis = await agentRes.json();

    displayResults(protocol, analysis);

  } catch (err) {
    showError(err.message);
  } finally {
    hideLoading();
  }
}

function displayResults(protocol, a) {
  // DAO name
  document.getElementById('daoName').textContent =
    protocol.charAt(0).toUpperCase() + protocol.slice(1) + ' DAO';

  // Risk badge
  const badge = document.getElementById('riskBadge');
  if (a.riskScore >= 70) {
    badge.textContent = '⚠ High Risk';
    badge.className = 'risk-badge high';
  } else if (a.riskScore >= 40) {
    badge.textContent = '◉ Medium Risk';
    badge.className = 'risk-badge medium';
  } else {
    badge.textContent = '✓ Low Risk';
    badge.className = 'risk-badge low';
  }

  // Stats cards
  document.getElementById('totalValue').textContent = formatMoney(a.totalValue);
  document.getElementById('nativeConcentration').textContent =
    a.nativeConcentration.toFixed(1) + '%';
  document.getElementById('stableRatio').textContent =
    a.stableRatio.toFixed(1) + '%';
  document.getElementById('runwayMonths').textContent =
    a.runwayMonths > 0 ? a.runwayMonths + ' months' : 'Unknown';

  // Risk bar
  document.getElementById('riskBarFill').style.width = a.riskScore + '%';
  document.getElementById('riskBarScore').textContent = a.riskScore + '/100';

  // Bear case
  document.getElementById('currentValue').textContent = formatMoney(a.totalValue);
  document.getElementById('bearCaseValue').textContent = formatMoney(a.bearCaseTotalValue);
  document.getElementById('potentialLoss').textContent =
    '−' + formatMoney(a.bearCaseNativeLoss);

  // Agent analysis
  document.getElementById('recommendation').textContent = a.recommendation;
  document.getElementById('actionText').textContent = a.action;
  document.getElementById('yieldOpportunity').textContent =
    formatMoney(a.annualYieldOpportunity) + ' / year';

  showResults();
}

// Simulate agent executing on testnet
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('analyzeBtn').addEventListener('click', () => {
    const protocol = document.getElementById('protocolInput').value.trim().toLowerCase();
    if (!protocol) return;
    analyzeTreasury(protocol);
  });

  document.getElementById('protocolInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const protocol = e.target.value.trim().toLowerCase();
      if (protocol) analyzeTreasury(protocol);
    }
  });

  document.getElementById('executeBtn').addEventListener('click', () => {
    const daoName = document.getElementById('daoName').textContent;
    const txHash = '0x' + [...Array(64)].map(() =>
      Math.floor(Math.random() * 16).toString(16)).join('');

    document.getElementById('simulationText').textContent =
      `Wardex agent executed pre-approved rebalancing policy for ${daoName}. ` +
      `20% of native token holdings converted to USDC on Sepolia testnet. ` +
      `Action taken within governance-approved parameters. No vote required.`;

    document.getElementById('txHash').textContent = txHash;
    document.getElementById('simulationResult').classList.remove('hidden');

    document.getElementById('executeBtn').textContent = '✓ Execution Simulated';
    document.getElementById('executeBtn').style.opacity = '0.6';
    document.getElementById('executeBtn').disabled = true;
  });
});

function quickSelect(protocol) {
    const slugMap = {
      'uniswap': 'uniswap-v3',
      'aave': 'aave-v3',
      'compound': 'compound-v3',
      'makerdao': 'maker'
    };
    const slug = slugMap[protocol] || protocol;
    document.getElementById('protocolInput').value = slug;
    analyzeTreasury(slug);
  }

// Helpers
function formatMoney(value) {
  if (!value || isNaN(value)) return '$0';
  if (value >= 1e9) return '$' + (value / 1e9).toFixed(2) + 'B';
  if (value >= 1e6) return '$' + (value / 1e6).toFixed(2) + 'M';
  if (value >= 1e3) return '$' + (value / 1e3).toFixed(1) + 'K';
  return '$' + value.toFixed(2);
}

function showLoading() {
  document.getElementById('loading').classList.remove('hidden');
}
function hideLoading() {
  document.getElementById('loading').classList.add('hidden');
}
function showError(msg) {
  document.getElementById('errorMsg').textContent = msg;
  document.getElementById('error').classList.remove('hidden');
}
function hideError() {
  document.getElementById('error').classList.add('hidden');
}
function showResults() {
  document.getElementById('results').classList.remove('hidden');
}
function hideResults() {
  document.getElementById('results').classList.add('hidden');
}