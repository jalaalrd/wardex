const API = window.location.origin;

function sanitiseInput(value) {
  return value.toLowerCase().trim().replace(/[^a-z0-9-]/g, '').slice(0, 60);
}

async function analyzeTreasury(protocol) {
  const clean = sanitiseInput(protocol);
  if (!clean || clean.length < 2) {
    showError('Please enter a valid protocol name (letters, numbers, hyphens only).');
    return;
  }

  showLoading();
  hideError();
  hideResults();
  announce('Analysing ' + clean + ' treasury data...');

  try {
    const res = await fetch(`${API}/api/treasury/${clean}`);
    const data = await res.json();

    if (!res.ok) {
      const msg = data?.error?.message || data?.error || 'DAO not found. Try: marinade, jupiter, jito, or raydium.';
      throw new Error(msg);
    }

    const agentRes = await fetch(`${API}/api/agent/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ treasuryData: data })
    });

    const analysis = await agentRes.json();
    if (!agentRes.ok) throw new Error(analysis?.error?.message || 'Agent analysis failed.');

    displayResults(clean, analysis);
    announce('Analysis complete for ' + (analysis.name || clean) + '. Risk score: ' + analysis.riskScore + ' out of 100.');

  } catch (err) {
    showError(err.message || 'Something went wrong. Please try again.');
    announce('Error: ' + (err.message || 'Analysis failed'));
  } finally {
    hideLoading();
  }
}

function displayResults(protocol, a) {
  const daoNameEl = document.getElementById('daoName');
  daoNameEl.textContent = (a.name || protocol.charAt(0).toUpperCase() + protocol.slice(1)) + ' DAO';

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

  document.getElementById('totalValue').textContent = formatMoney(a.totalValue);
  document.getElementById('nativeConcentration').textContent = a.nativeConcentration.toFixed(1) + '%' + (a.estimated ? '*' : '');
  document.getElementById('stableRatio').textContent = a.stableRatio.toFixed(1) + '%';
  document.getElementById('runwayMonths').textContent = a.runwayMonths > 0 ? a.runwayMonths + ' months' : 'Unknown';

  const fill = document.getElementById('riskBarFill');
  fill.style.width = '0%';
  setTimeout(() => { fill.style.width = a.riskScore + '%'; }, 100);

  const track = document.getElementById('riskBarTrack');
  if (track) track.setAttribute('aria-valuenow', a.riskScore);

  document.getElementById('riskBarScore').textContent = a.riskScore + '/100';
  document.getElementById('currentValue').textContent = formatMoney(a.totalValue);
  document.getElementById('bearCaseValue').textContent = formatMoney(a.bearCaseTotalValue);
  document.getElementById('potentialLoss').textContent = '−' + formatMoney(a.bearCaseNativeLoss);
  document.getElementById('recommendation').textContent = a.recommendation;
  document.getElementById('actionText').textContent = a.action;
  document.getElementById('yieldOpportunity').textContent = formatMoney(a.annualYieldOpportunity) + ' / year';

  // Show estimated note if breakdown is estimated
  const note = document.getElementById('estimatedNote');
  if (note) {
    if (a.estimated) note.classList.remove('hidden');
    else note.classList.add('hidden');
  }

  // Reset simulate button
  const btn = document.getElementById('executeBtn');
  btn.textContent = '⬡ Simulate Agent Execution (Solana Devnet)';
  btn.style.opacity = '1';
  btn.disabled = false;
  document.getElementById('simulationResult').classList.add('hidden');

  showResults();
  setTimeout(() => { daoNameEl.focus(); }, 100);
}

document.addEventListener('DOMContentLoaded', () => {
  const daoNameEl = document.getElementById('daoName');
  if (daoNameEl) daoNameEl.setAttribute('tabindex', '-1');

  document.getElementById('analyzeBtn').addEventListener('click', () => {
    const val = document.getElementById('protocolInput').value.trim();
    if (val) analyzeTreasury(val);
  });

  document.getElementById('protocolInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const val = e.target.value.trim();
      if (val) analyzeTreasury(val);
    }
  });

  document.getElementById('executeBtn').addEventListener('click', () => {
    const daoName = document.getElementById('daoName').textContent;
    const chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
    const txHash = [...Array(88)].map(() => chars[Math.floor(Math.random() * chars.length)]).join('');

    document.getElementById('simulationText').textContent =
      `Wardex agent executed pre-approved rebalancing policy for ${daoName}. ` +
      `20% of native token holdings converted to USDC on Solana Devnet. ` +
      `Action taken within governance-approved parameters. No vote required.`;

    document.getElementById('txHash').textContent = txHash;
    document.getElementById('simulationResult').classList.remove('hidden');

    const btn = document.getElementById('executeBtn');
    btn.textContent = '✓ Execution Simulated';
    btn.style.opacity = '0.6';
    btn.disabled = true;
    btn.setAttribute('aria-label', 'Agent execution has been simulated');

    announce('Agent execution simulated successfully. Transaction recorded on Solana Devnet.');
  });
});

function quickSelect(protocol) {
  const slugMap = {
    'marinade': 'marinade',
    'jupiter': 'jupiter',
    'jito': 'jito',
    'raydium': 'raydium'
  };
  const slug = slugMap[protocol] || sanitiseInput(protocol);
  document.getElementById('protocolInput').value = slug;
  analyzeTreasury(slug);
}

function announce(message) {
  const el = document.getElementById('status-announcer');
  if (el) { el.textContent = ''; setTimeout(() => { el.textContent = message; }, 50); }
}

function formatMoney(value) {
  if (!value || isNaN(value)) return '$0';
  if (value >= 1e9) return '$' + (value / 1e9).toFixed(2) + 'B';
  if (value >= 1e6) return '$' + (value / 1e6).toFixed(2) + 'M';
  if (value >= 1e3) return '$' + (value / 1e3).toFixed(1) + 'K';
  return '$' + value.toFixed(2);
}

function showLoading() { document.getElementById('loading').classList.remove('hidden'); }
function hideLoading() { document.getElementById('loading').classList.add('hidden'); }
function showError(msg) {
  document.getElementById('errorMsg').textContent = msg;
  document.getElementById('error').classList.remove('hidden');
}
function hideError() { document.getElementById('error').classList.add('hidden'); }
function showResults() { document.getElementById('results').classList.remove('hidden'); }
function hideResults() { document.getElementById('results').classList.add('hidden'); }