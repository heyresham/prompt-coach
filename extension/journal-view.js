document.addEventListener('DOMContentLoaded', () => {
  checkStatusAndLoad();
});

function checkStatusAndLoad() {
  chrome.runtime.sendMessage({ type: 'GET_JOURNAL_STATUS' }, (resp) => {
    if (resp && resp.encrypted && !resp.unlocked) {
      document.getElementById('unlockForm').style.display = '';
      setupUnlock();
    } else {
      loadEntries();
    }
  });
}

function setupUnlock() {
  document.getElementById('unlockBtn').addEventListener('click', () => {
    const pp = document.getElementById('unlockPass').value.trim();
    if (!pp) return;
    chrome.runtime.sendMessage({ type: 'UNLOCK_JOURNAL', passphrase: pp }, (r) => {
      if (r && r.ok) {
        document.getElementById('unlockForm').style.display = 'none';
        document.getElementById('unlockError').style.display = 'none';
        loadEntries();
      } else {
        document.getElementById('unlockError').style.display = '';
      }
    });
  });
}

function loadEntries() {
  chrome.runtime.sendMessage({ type: 'GET_JOURNAL' }, (resp) => {
    if (!resp || !resp.entries || resp.entries.length === 0) {
      document.getElementById('emptyState').style.display = '';
      return;
    }

    const entries = resp.entries.filter(e => !e.error);
    if (entries.length === 0) {
      document.getElementById('emptyState').style.display = '';
      return;
    }

    renderStats(entries);
    renderTrend(entries);
    renderTable(entries);
  });
}

function renderStats(entries) {
  const dims = ['goal', 'role', 'context', 'constraints', 'format', 'examples', 'efficiency'];
  const avgs = {};
  for (const d of dims) {
    const vals = entries.filter(e => e.scores && e.scores[d] !== undefined).map(e => e.scores[d]);
    avgs[d] = vals.length > 0 ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null;
  }

  const overallVals = entries.filter(e => e.overall !== undefined).map(e => e.overall);
  const overallAvg = overallVals.length > 0 ? Math.round(overallVals.reduce((a, b) => a + b, 0) / overallVals.length) : null;

  const row = document.getElementById('statsRow');
  let html = '';
  if (overallAvg !== null) {
    html += statCard('Overall', overallAvg);
  }
  for (const d of dims) {
    if (avgs[d] !== null) {
      html += statCard(d.charAt(0).toUpperCase() + d.slice(1), avgs[d]);
    }
  }
  html += statCard('Sessions', entries.length, true);
  row.innerHTML = html;
  row.style.display = '';
}

function statCard(label, value, isCount) {
  const cls = isCount ? '' : (value >= 70 ? 'jv-stat-good' : value >= 40 ? 'jv-stat-ok' : 'jv-stat-weak');
  return `<div class="jv-stat-card">
    <div class="jv-stat-value ${cls}">${value}</div>
    <div class="jv-stat-label">${label}</div>
  </div>`;
}

function renderTrend(entries) {
  const scores = entries.filter(e => e.overall !== undefined).map(e => e.overall);
  if (scores.length < 2) return;

  const svg = document.getElementById('trendSvg');
  const w = 600, h = 120, pad = 10;
  const minS = Math.max(0, Math.min(...scores) - 10);
  const maxS = Math.min(100, Math.max(...scores) + 10);
  const range = maxS - minS || 1;

  const points = scores.map((s, i) => {
    const x = pad + (i / (scores.length - 1)) * (w - 2 * pad);
    const y = h - pad - ((s - minS) / range) * (h - 2 * pad);
    return `${x},${y}`;
  });

  svg.innerHTML = `
    <polyline points="${points.join(' ')}" fill="none" stroke="#1B6B3E" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
    ${scores.map((s, i) => {
      const x = pad + (i / (scores.length - 1)) * (w - 2 * pad);
      const y = h - pad - ((s - minS) / range) * (h - 2 * pad);
      return `<circle cx="${x}" cy="${y}" r="4" fill="#1B6B3E" stroke="#111214" stroke-width="2"/>`;
    }).join('')}
  `;

  document.getElementById('trendRow').style.display = '';
}

function renderTable(entries) {
  const tbody = document.getElementById('journalBody');
  const sorted = [...entries].sort((a, b) => (b.ts || 0) - (a.ts || 0));

  tbody.innerHTML = sorted.map(e => {
    const date = e.ts ? new Date(e.ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
    const overall = e.overall !== undefined ? e.overall : '—';
    const cls = overall >= 70 ? 'jv-score-good' : overall >= 40 ? 'jv-score-ok' : 'jv-score-weak';
    const preview = e.promptText ? (e.promptText.length > 60 ? e.promptText.slice(0, 60) + '...' : e.promptText) : '—';
    return `<tr>
      <td>${escHtml(date)}</td>
      <td>${escHtml(e.platform || '—')}</td>
      <td><span class="jv-score-badge ${cls}">${overall}</span></td>
      <td class="jv-preview">${escHtml(preview)}</td>
    </tr>`;
  }).join('');

  document.getElementById('journalTable').style.display = '';
}

function escHtml(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}
