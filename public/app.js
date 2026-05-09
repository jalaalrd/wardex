const API = window.location.origin;

function sanitiseInput(value) {
  return value.toLowerCase().trim().replace(/[^a-z0-9-]/g, '').slice(0, 60);
}

// Pre-fetch yield rates on page load so the cache is warm for the first analysis
let cachedYieldRates = null;
function prefetchYieldRates() {
  fetch(`${API}/api/yield/rates`)
    .then(r => r.json())
    .then(data => { cachedYieldRates = data; })
    .catch(() => {});
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
    // Fetch treasury data and yield rates in parallel
    const [res, yieldRes] = await Promise.all([
      fetch(`${API}/api/treasury/${clean}`),
      fetch(`${API}/api/yield/rates`),
    ]);

    const data = await res.json();
    if (!res.ok) {
      const msg = data?.error?.message || data?.error || 'DAO not found. Try: marinade, jupiter, jito, or raydium.';
      throw new Error(msg);
    }

    const yieldRates = yieldRes.ok ? await yieldRes.json() : null;
    if (yieldRates) cachedYieldRates = yieldRates;

    const agentRes = await fetch(`${API}/api/agent/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ treasuryData: data }),
    });

    const analysis = await agentRes.json();
    if (!agentRes.ok) throw new Error(analysis?.error?.message || 'Agent analysis failed.');

    displayResults(clean, analysis, yieldRates);
    announce('Analysis complete for ' + (analysis.name || clean) + '. Risk score: ' + analysis.riskScore + ' out of 100.');

  } catch (err) {
    showError(err.message || 'Something went wrong. Please try again.');
    announce('Error: ' + (err.message || 'Analysis failed'));
  } finally {
    hideLoading();
  }
}

function displayResults(protocol, a, yieldRates) {
  const daoNameEl = document.getElementById('daoName');
  daoNameEl.textContent = (a.name || protocol.charAt(0).toUpperCase() + protocol.slice(1)) + ' DAO';

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

  // Realms connected / estimated data badges
  const realmsBadge = document.getElementById('realmsBadge');
  const estimatedBadge = document.getElementById('estimatedBadge');
  if (realmsBadge) {
    if (a.realmsConnected) {
      realmsBadge.classList.remove('hidden');
    } else {
      realmsBadge.classList.add('hidden');
    }
  }
  if (estimatedBadge) {
    if (!a.realmsConnected) {
      estimatedBadge.classList.remove('hidden');
    } else {
      estimatedBadge.classList.add('hidden');
    }
  }

  // DAO-specific context message
  const ctxEl = document.getElementById('daoContext');
  if (ctxEl) {
    if (a.daoContext) {
      ctxEl.textContent = a.daoContext;
      ctxEl.classList.remove('hidden');
    } else {
      ctxEl.classList.add('hidden');
    }
  }

  // Treasury stats
  document.getElementById('totalValue').textContent = formatMoney(a.totalValue);
  document.getElementById('nativeConcentration').textContent = a.nativeConcentration.toFixed(1) + '%' + (a.estimated ? '*' : '');
  document.getElementById('stableRatio').textContent = a.stableRatio.toFixed(1) + '%';
  document.getElementById('runwayMonths').textContent = a.runwayMonths > 0 ? a.runwayMonths + ' months' : 'Unknown';

  // Risk bar animation
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

  // Live yield venue label
  const venueLabelEl = document.getElementById('yieldVenueLabel');
  const venueNameEl  = document.getElementById('yieldVenueName');
  const venue = a.yieldVenue || (yieldRates && yieldRates.best_venue) || null;
  if (venueLabelEl && venueNameEl && venue) {
    venueNameEl.textContent = venue;
    venueLabelEl.classList.remove('hidden');
  } else if (venueLabelEl) {
    venueLabelEl.classList.add('hidden');
  }

  // Estimated note
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
  btn.setAttribute('aria-label', 'Simulate agent execution on Solana Devnet');
  document.getElementById('simulationResult').classList.add('hidden');

  // Store current analysis for the simulation handler
  btn._currentAnalysis = a;

  showResults();
  setTimeout(() => { daoNameEl.focus(); }, 100);
}

document.addEventListener('DOMContentLoaded', () => {
  prefetchYieldRates();

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

  document.getElementById('executeBtn').addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    const a = btn._currentAnalysis || {};
    const daoName = document.getElementById('daoName').textContent;
    const venue = a.yieldVenue || (cachedYieldRates && cachedYieldRates.best_venue) || 'Kamino Earn';
    const apy = a.yieldRate ? (a.yieldRate * 100).toFixed(1) + '%' : '';
    const actionText = a.action || 'Deploy idle stablecoins to ' + venue;

    btn.textContent = '⬡ Broadcasting to Solana Devnet...';
    btn.disabled = true;
    btn.style.opacity = '0.7';

    try {
      const execRes = await fetch(`${API}/api/agent/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ daoName, action: actionText, venue }),
      });
      const exec = await execRes.json();

      if (!execRes.ok) throw new Error(exec?.error?.message || 'Execution failed');

      document.getElementById('simulationText').textContent =
        `Wardex agent executed pre-approved rebalancing policy for ${daoName}. ` +
        `Idle stablecoins deployed into ${venue}${apy ? ' at ' + apy + ' APY' : ''}. ` +
        `Action taken within governance-approved parameters — no vote required.`;

      const txEl = document.getElementById('txHash');
      txEl.textContent = exec.signature;
      txEl.href = exec.explorerUrl;

      document.getElementById('simulationResult').classList.remove('hidden');
      btn.textContent = '✓ Executed on Devnet';
      btn.style.opacity = '0.6';
      btn.setAttribute('aria-label', 'Agent execution complete — transaction on Solana Devnet');
      announce('Agent execution complete. Real transaction broadcast on Solana Devnet.');
    } catch (err) {
      btn.textContent = '⬡ Simulate Agent Execution (Solana Devnet)';
      btn.disabled = false;
      btn.style.opacity = '1';
      showError('Execution failed: ' + (err.message || 'Please try again.'));
      announce('Execution failed: ' + (err.message || 'Please try again.'));
    }
  });
});

function quickSelect(protocol) {
  const slugMap = { marinade: 'marinade', jupiter: 'jupiter', jito: 'jito', raydium: 'raydium' };
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
