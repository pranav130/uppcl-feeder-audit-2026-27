
function updateAuditBadges() {
  const ptwBadge = document.getElementById('ptwStatusBadge');
  if (ptwBadge) {
    if (state.includePtw) {
      ptwBadge.textContent = 'PTW Status: INCLUDED';
      ptwBadge.className = 'tag-badge ptw-on';
    } else {
      ptwBadge.textContent = 'PTW Status: EXCLUDED';
      ptwBadge.className = 'tag-badge ptw-off';
    }
  }

  const govtBadge = document.getElementById('govtStatusBadge');
  if (govtBadge) {
    if (state.includeGovt) {
      govtBadge.textContent = 'Govt: DEEMED (100%)';
      govtBadge.className = 'tag-badge ptw-on';
    } else {
      govtBadge.textContent = 'Govt: CASH ONLY';
      govtBadge.className = 'tag-badge ptw-off';
    }
  }

  const subBadge = document.getElementById('subsidyStatusBadge');
  if (subBadge) {
    if (state.includeSubsidy) {
      subBadge.textContent = 'Subsidy: INCLUDED';
      subBadge.className = 'tag-badge ptw-on';
    } else {
      subBadge.textContent = 'Subsidy: EXCLUDED';
      subBadge.className = 'tag-badge ptw-off';
    }
  }
}

function updatePtwBadge(isIncluded) {
  if (typeof state !== 'undefined') state.includePtw = isIncluded;
  updateAuditBadges();
}
window.updateAuditBadges = updateAuditBadges;
window.updatePtwBadge = updatePtwBadge;

window.onFilterOptionChanged = function(el) {
  if (!el) return;
  const id = el.id;
  const checked = el.checked;
  if (id === 'chkIncludePtw') {
    state.includePtw = checked;
  } else if (id === 'chkIncludeGovt') {
    state.includeGovt = checked;
  } else if (id === 'chkIncludeSubsidy') {
    state.includeSubsidy = checked;
  } else if (id === 'chkAbnormal') {
    state.excludeAbnormal = checked;
  } else if (id === 'chkBilledGtInput') {
    state.excludeBilledGtInput = checked;
  }
  updateAuditBadges();
  if (typeof onFilterChanged === 'function') {
    onFilterChanged();
  }
};

/* ═══════════════════════════════════════════════════════════════
   UPPCL 11KV Feeder PSR Dashboard · Unified Reactive Engine
   - 26,655 feeders in-memory calculation (12ms instantaneous)
   - Exact multi-tier cascade (Zone, Circle, Division, Area, Nature)
   - Complete isolation (AGRA strictly matches AGRA, never Prayagraj)
   - Works flawlessly both on Live DB (localhost) and GitHub Pages
   ═══════════════════════════════════════════════════════════════ */

// ── Theme Management & Sign Out ──
(function() {
  const toggleBtn = document.getElementById('themeToggle');

  function getThemeMeta(theme) {
    switch (theme) {
      case 'dark':
        return { icon: '🌌', title: 'Theme: Dark (Click for Midnight)', next: 'midnight' };
      case 'midnight':
        return { icon: '☀️', title: 'Theme: Midnight (Click for Light)', next: 'light' };
      default:
        return { icon: '🌙', title: 'Theme: Light (Click for Dark)', next: 'dark' };
    }
  }

  function applyTheme(theme) {
    const validTheme = (theme === 'dark' || theme === 'midnight') ? theme : 'light';
    document.documentElement.setAttribute('data-theme', validTheme);
    localStorage.setItem('uppcl_theme', validTheme);
    localStorage.setItem('theme', validTheme);
    if (toggleBtn) {
      const meta = getThemeMeta(validTheme);
      toggleBtn.textContent = meta.icon;
      toggleBtn.title = meta.title;
    }
  }

  const rawSaved = localStorage.getItem('uppcl_theme') || localStorage.getItem('theme');
  const initialTheme = rawSaved || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  applyTheme(initialTheme);

  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      const cur = document.documentElement.getAttribute('data-theme') || 'light';
      const meta = getThemeMeta(cur);
      applyTheme(meta.next);
      updateAllChartThemes();
    });
  }

  const btnSignOut = document.getElementById('btnSignOut');
  if (btnSignOut) {
    btnSignOut.addEventListener('click', () => {
      sessionStorage.removeItem('uppcl_auth_token');
      localStorage.removeItem('uppcl_auth_token');
      sessionStorage.removeItem('uppcl_dek');
      localStorage.removeItem('uppcl_dek');
      window.location.replace('login.html');
    });
  }
})();

// ── Master Dashboard State ──
const state = {
  discom: '',
  zone: '',
  circle: '',
  division: '',
  area: '',
  feederType: '',
  monthFrom: 'Apr',
  monthTo: 'Oct',
  search: '',
  tableSearch: '',
  excludeAbnormal: false,
  excludeBilledGtInput: false,
  includePtw: false,
  includeGovt: true,
  includeSubsidy: false,
  sortCol: null,
  sortDir: 1,
  discomSortCol: null,
  discomSortDir: -1,
  leagueManualLevel: null,
  leagueSortCol: 'atcLossValueCr',
  leagueSortDir: -1,
  top150SortCol: 'atcLossValueCr',
  top150SortDir: -1,
  wfSortCol: 'atc',
  wfSortDir: -1,
  expandedDiscoms: new Set(),
  hBarType: 'line',
  psChartLoss: 'atc',
  psChartView: 'discom',
  psChartMode: 'pct',
  psChartFocus: '',
  ftBarGroup: 'feederType',
  categorySortCol: 'billableConsumers',
  categorySortDir: -1,
  catTableGroup: 'feederType'
};
window.state = state;

const MON_LABELS = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'];
const MON_FULL   = ['April', 'May', 'June', 'July', 'August', 'September', 'October'];
const MON_INDEX  = { Apr: 0, May: 1, Jun: 2, Jul: 3, Aug: 4, Sep: 5, Oct: 6 };

const SLAB_LABELS = [
  '0% to 5%', '5% to 10%', '10% to 20%', '20% to 30%',
  '30% to 50%', '50% to 70%', 'Above 70%', 'Abnormal',
  'IE 0', 'No Cons'
];

const SLAB_COLORS = {
  '0% to 5%': '#1d7a3e',
  '5% to 10%': '#1baf7a',
  '10% to 20%': '#8f6400',
  '20% to 30%': '#b4501b',
  '30% to 50%': '#d06010',
  '50% to 70%': '#c0302a',
  'Above 70%': '#b3261e',
  'Abnormal': '#6d3a9c',
  'IE 0': '#7a8494',
  'No Cons': '#b9c0cb'
};

const CATEGORY_NAMES = {
  'HV1': 'Non-Industrial Bulk Power',
  'HV2': 'Large & Heavy Power',
  'HV3': 'Railway Traction',
  'HV4': 'Lift Irrigation',
  'LMV1': 'Domestic Light, Fan & Power',
  'LMV2': 'Commercial',
  'LMV3': 'Public Lamps',
  'LMV4A': 'Public Institutions',
  'LMV4B': 'Private Institutions',
  'LMV5': 'PTW / Agriculture',
  'LMV6': 'Small & Medium Power',
  'LMV7': 'Public Water Works',
  'LMV8': 'State Tube Wells',
  'LMV9': 'Temporary Supply',
  'LMV11': 'EV Charging Stations'
};

function normalizeDiscom(d) {
  if (!d) return '';
  const u = d.trim().toUpperCase();
  if (u === 'PVVNL') return 'PASCHIMANCHAL';
  if (u === 'DVVNL') return 'DAKSHINANCHAL';
  if (u === 'MVVNL') return 'MADHYANCHAL';
  if (u === 'PUVVNL') return 'POORVANCHAL';
  if (u === 'KESCO') return 'KESCO';
  return u;
}

function fmt(n, decimals = 0) {
  if (n === null || n === undefined || isNaN(n)) return '—';
  return Number(n).toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}

function lossPill(val, isLine = true) {
  let v = parseFloat(val);
  if (isNaN(v)) return `<span class="pill p-na">${val || '—'}</span>`;
  if (Math.abs(v) <= 1.0 && v !== 0) v = v * 100;
  const [t1, t2, t3] = isLine ? [10, 30, 50] : [20, 50, 70];
  const cls = v < t1 ? 'p-good' : v < t2 ? 'p-warn' : v < t3 ? 'p-serious' : 'p-crit';
  return `<span class="pill ${cls}">${v.toFixed(1)}%</span>`;
}

function thruRatePill(val) {
  const v = parseFloat(val);
  if (isNaN(v)) return '—';
  const cls = v >= 4 ? 'p-good' : v >= 3 ? 'p-warn' : 'p-crit';
  return `<span class="pill ${cls}">₹${v.toFixed(2)}</span>`;
}

function consFor(r, mTo) {
  return Array.isArray(r[16]) ? (r[16][mTo] || 0) : r[12];
}

function classifySlab(lossPct, ie, cons, flags, isAtc = false) {
  if (ie === 0) return 'IE 0';
  if (cons === 0) return 'No Cons';
  if (lossPct === null || isNaN(lossPct)) return 'Abnormal';
  if (lossPct < 0 || lossPct > 100) return 'Abnormal';
  if (lossPct < 5) return '0% to 5%';
  if (lossPct < 10) return '5% to 10%';
  if (lossPct < 20) return '10% to 20%';
  if (lossPct < 30) return '20% to 30%';
  if (lossPct < 50) return '30% to 50%';
  if (lossPct < 70) return '50% to 70%';
  return 'Above 70%';
}

// ── Chart.js Instances ──
let chartMonthlyEnergy = null;
let chartMonthlyLoss = null;
let chartLineLoss = null;
let chartAtcLoss = null;
let chartProgSummary = null;

function initCharts() {
  const ctxME = document.getElementById('chartMonthlyEnergy').getContext('2d');
  chartMonthlyEnergy = new Chart(ctxME, {
    type: 'bar',
    data: {
      labels: MON_FULL,
      datasets: [
        { label: 'Input Energy (MU)', data: [0,0,0,0,0], backgroundColor: '#2a78d6', borderRadius: 4 },
        { label: 'Billed Energy (MU)', data: [0,0,0,0,0], backgroundColor: '#eb6834', borderRadius: 4 }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'top', labels: { boxWidth: 12, font: { size: 11 } } },
        tooltip: { callbacks: { label: c => ` ${c.dataset.label}: ${Number(c.raw).toLocaleString('en-IN')} MU` } }
      },
      scales: {
        x: { grid: { display: false }, ticks: { font: { size: 11 } } },
        y: { grid: { color: 'rgba(0,0,0,0.06)' }, ticks: { font: { size: 11 } } }
      }
    }
  });

  const ctxML = document.getElementById('chartMonthlyLoss').getContext('2d');
  chartMonthlyLoss = new Chart(ctxML, {
    type: 'line',
    data: {
      labels: MON_FULL,
      datasets: [
        { label: 'AT&C Loss %', data: [0,0,0,0,0], borderColor: '#b3261e', backgroundColor: 'rgba(179,38,30,0.1)', fill: true, tension: 0.3, borderWidth: 2.5, pointRadius: 4 },
        { label: 'Line Loss %', data: [0,0,0,0,0], borderColor: '#4a3aa7', backgroundColor: 'transparent', tension: 0.3, borderWidth: 2, borderDash: [5, 5], pointRadius: 3 }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'top', labels: { boxWidth: 12, font: { size: 11 } } },
        tooltip: { callbacks: { label: c => ` ${c.dataset.label}: ${Number(c.raw).toFixed(1)}%` } }
      },
      scales: {
        x: { grid: { display: false }, ticks: { font: { size: 11 } } },
        y: { grid: { color: 'rgba(0,0,0,0.06)' }, ticks: { font: { size: 11 }, callback: v => v + '%' }, min: 0, max: 100 }
      }
    }
  });

  const createSlabBarChart = (canvasId, color, typeKey) => {
    return new Chart(document.getElementById(canvasId), {
      type: 'bar',
      data: {
        labels: SLAB_LABELS,
        datasets: [{ data: new Array(10).fill(0), backgroundColor: color, borderRadius: 4 }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { afterLabel: () => '👉 Click to inspect feeders in drilldown' } }
        },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 10.5 } } },
          y: { grid: { color: 'rgba(0,0,0,0.06)' }, ticks: { font: { size: 10.5 } } }
        },
        onClick: (e, els) => {
          if (!els.length) return;
          const slab = SLAB_LABELS[els[0].index];
          const dParam = state.discom ? `&discom=${encodeURIComponent(state.discom)}` : '';
          const zParam = state.zone ? `&zone=${encodeURIComponent(state.zone)}` : '';
          window.open(`feeder_drilldown.html?type=${typeKey}&slab=${encodeURIComponent(slab)}${dParam}${zParam}`, '_blank');
        }
      }
    });
  };

  chartLineLoss = createSlabBarChart('chartLineLoss', '#2a78d6', 'line_loss');
  chartAtcLoss  = createSlabBarChart('chartAtcLoss',  '#eb6834', 'atc_loss');
  updateAllChartThemes();
}

function updateAllChartThemes() {
  const theme = document.documentElement.getAttribute('data-theme') || 'light';
  const isDark = theme === 'dark' || theme === 'midnight';
  const isMidnight = theme === 'midnight';

  const gridCol = isMidnight ? 'rgba(56, 189, 248, 0.08)' : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)');
  const textCol = isMidnight ? '#9db0cb' : (isDark ? '#8791a0' : '#7a8494');

  [chartMonthlyEnergy, chartMonthlyLoss, chartLineLoss, chartAtcLoss].forEach(c => {
    if (!c) return;
    if (c.options.scales.x) { c.options.scales.x.ticks.color = textCol; c.options.scales.x.grid.color = gridCol; }
    if (c.options.scales.y) { c.options.scales.y.ticks.color = textCol; c.options.scales.y.grid.color = gridCol; }
    c.update();
  });
  // if (computedResult && computedResult.progressiveSummary) {
  //   renderProgressiveSummaryChart(computedResult.progressiveSummary);
  // }
}

// ── Dataset Provider (AES-256-GCM Encrypted Vault) ──
let N = null; // Dictionaries
let R = null; // Rows
let computedResult = null;

function b64ToBytes(b64) {
  const bin = atob(b64);
  const len = bin.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function decryptVaultPayload(cryptoKey, encObj) {
  const iv = b64ToBytes(encObj.iv);
  const ct = b64ToBytes(encObj.ct);
  const plainBuf = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    ct
  );
  const jsonStr = new TextDecoder().decode(plainBuf);
  return JSON.parse(jsonStr);
}

async function loadDataset() {
  try {
    const dekB64 = sessionStorage.getItem('uppcl_dek') || localStorage.getItem('uppcl_dek');
    if (!dekB64) throw new Error('Missing decryption key');

    const dekBytes = b64ToBytes(dekB64);
    if (dekBytes.length !== 32) throw new Error('Invalid key length');

    const cryptoKey = await window.crypto.subtle.importKey(
      'raw',
      dekBytes,
      { name: 'AES-GCM' },
      false,
      ['decrypt']
    );

    if (!window.__FEEDERS_RAW && window.__ENCRYPTED_FEEDERS) {
      window.__FEEDERS_RAW = await decryptVaultPayload(cryptoKey, window.__ENCRYPTED_FEEDERS);
    }

    if (window.__FEEDERS_RAW) {
      N = window.__FEEDERS_RAW.d;
      R = window.__FEEDERS_RAW.rows;
      return;
    }
    throw new Error('Encrypted dataset unavailable');
  } catch (err) {
    console.error('Authentication / Decryption failed:', err);
    sessionStorage.removeItem('uppcl_dek');
    localStorage.removeItem('uppcl_dek');
    sessionStorage.removeItem('uppcl_auth_token');
    localStorage.removeItem('uppcl_auth_token');
    window.location.replace('login.html');
  }
}

// ── Cascading Dropdowns Manager ──
function syncCascadeDropdowns() {
  if (!N || !R) return;
  const fZone = document.getElementById('fZone');
  const fCircle = document.getElementById('fCircle');
  const fDivision = document.getElementById('fDivision');

  const curZone = state.zone;
  const curCircle = state.circle;
  const curDiv = state.division;

  const targetDiscomIdx = state.discom ? N.Discom.findIndex(d => {
    const norm = normalizeDiscom(state.discom);
    return d.toUpperCase() === norm.toUpperCase() || d.toUpperCase().includes(norm.toUpperCase());
  }) : -1;

  const targetZoneIdx = state.zone ? N.Zone.indexOf(state.zone) : -1;
  const targetCircleIdx = state.circle ? N.Circle.indexOf(state.circle) : -1;

  const zoneSet = new Set();
  const circleSet = new Set();
  const divisionSet = new Set();

  for (let i = 0; i < R.length; i++) {
    const r = R[i];
    // F4: Include only feeders active in the selected To period
    const _m1f = MON_INDEX[state.monthTo] ?? 6;
    if ((typeof r[17] === 'number' && _m1f < r[17]) || (typeof r[18] === 'number' && _m1f > r[18])) continue;
    if (targetDiscomIdx >= 0 && r[0] !== targetDiscomIdx) continue;
    zoneSet.add(r[1]);

    if (targetZoneIdx >= 0 && r[1] !== targetZoneIdx) continue;
    circleSet.add(r[2]);

    if (targetCircleIdx >= 0 && r[2] !== targetCircleIdx) continue;
    divisionSet.add(r[3]);
  }

  // Zone select
  const zones = [...zoneSet].map(i => N.Zone[i]).filter(Boolean).sort();
  fZone.innerHTML = '<option value="">All Zones</option>' + zones.map(z => `<option value="${z}">${z}</option>`).join('');
  if (zones.includes(curZone)) {
    fZone.value = curZone;
  } else {
    state.zone = '';
    fZone.value = '';
  }

  // Circle select
  const circles = [...circleSet].map(i => N.Circle[i]).filter(Boolean).sort();
  fCircle.innerHTML = '<option value="">All Circles</option>' + circles.map(c => `<option value="${c}">${c}</option>`).join('');
  if (circles.includes(curCircle)) {
    fCircle.value = curCircle;
  } else {
    state.circle = '';
    fCircle.value = '';
  }

  // Division select
  const divisions = [...divisionSet].map(i => N.Division[i]).filter(Boolean).sort();
  fDivision.innerHTML = '<option value="">All Divisions</option>' + divisions.map(d => `<option value="${d}">${d}</option>`).join('');
  if (divisions.includes(curDiv)) {
    fDivision.value = curDiv;
  } else {
    state.division = '';
    fDivision.value = '';
  }
}

// ── Core In-Memory Calculator ──
function calculateMetrics() {
  if (!N || !R) return null;

  // Sync state from DOM controls to guarantee zero mismatch
  if (typeof document !== 'undefined') {
    const cGovt = document.getElementById('chkIncludeGovt');
    if (cGovt) state.includeGovt = cGovt.checked;
    const cSub = document.getElementById('chkIncludeSubsidy');
    if (cSub) state.includeSubsidy = cSub.checked;
    const cPtw = document.getElementById('chkIncludePtw');
    if (cPtw) state.includePtw = cPtw.checked;
    const cAbn = document.getElementById('chkAbnormal');
    if (cAbn) state.excludeAbnormal = cAbn.checked;
    const cBgt = document.getElementById('chkBilledGtInput');
    if (cBgt) state.excludeBilledGtInput = cBgt.checked;
  }

  const targetDiscomIdx = state.discom ? N.Discom.findIndex(d => {
    const norm = normalizeDiscom(state.discom);
    return d.toUpperCase() === norm.toUpperCase() || d.toUpperCase().includes(norm.toUpperCase());
  }) : -1;

  // EXACT MATCH for Zone, Circle, Division, Area, FeederType
  const targetZoneIdx = state.zone ? N.Zone.indexOf(state.zone) : -1;
  const targetCircleIdx = state.circle ? N.Circle.indexOf(state.circle) : -1;
  const targetDivisionIdx = state.division ? N.Division.indexOf(state.division) : -1;
  const targetAreaIdx = state.area ? N.Area.indexOf(state.area) : -1;
  const targetNatureIdx = state.feederType ? N.Nature.indexOf(state.feederType) : -1;
  const searchUpper = (state.search || '').trim().toUpperCase();

  const m0 = MON_INDEX[state.monthFrom] ?? 0;
  const m1 = MON_INDEX[state.monthTo] ?? 6;
  const validM0 = Math.min(m0, m1);
  const validM1 = Math.max(m0, m1);

  let totalScoped = 0;
  let ieZeroCount = 0;
  let noConsCount = 0;
  let auditedCount = 0;

  let totIE = 0, totSE = 0, totAss = 0, totReal = 0;
  const monthly = MON_LABELS.map(() => ({ ie: 0, se: 0, ass: 0, real: 0 }));

  const lineSlabs = {};
  const atcSlabs  = {};
  SLAB_LABELS.forEach(s => { lineSlabs[s] = 0; atcSlabs[s] = 0; });

  const discomGroups = new Map();
  const summaryGroups = new Map();
  const natureGroups = new Map();
  const areaGroups = new Map();

  const usedFeeders = [];

  for (let i = 0; i < R.length; i++) {
    const r = R[i];

    // F4: Skip feeders outside their active period
    // r[17] = first_active_month (new Oct feeders = 6; Sep-only have r[18]=5)
    // r[18] = last_active_month (Sep-only feeders = 5)
    if ((typeof r[17] === 'number' && validM1 < r[17]) || (typeof r[18] === 'number' && validM1 > r[18])) continue;

    // EXACT Matching
    if (targetDiscomIdx >= 0 && r[0] !== targetDiscomIdx) continue;
    if (targetZoneIdx >= 0 && r[1] !== targetZoneIdx) continue;
    if (targetCircleIdx >= 0 && r[2] !== targetCircleIdx) continue;
    if (targetDivisionIdx >= 0 && r[3] !== targetDivisionIdx) continue;
    if (targetAreaIdx >= 0 && r[6] !== targetAreaIdx) continue;
    if (targetNatureIdx >= 0 && r[7] !== targetNatureIdx) continue;

    if (searchUpper) {
      const fName = r[5].toUpperCase();
      const ssName = (N.SS[r[4]] || '').toUpperCase();
      const divName = (N.Division[r[3]] || '').toUpperCase();
      if (!fName.includes(searchUpper) && !ssName.includes(searchUpper) && !divName.includes(searchUpper)) {
        continue;
      }
    }

    totalScoped++;

    const flags = r[13];
    let fIE = 0, fSE = 0, fAss = 0, fReal = 0;

    for (let m = validM0; m <= validM1; m++) {
      let mIE = r[8][m] || 0;
      let mSE = r[9][m] || 0;
      let mAss = r[10][m] || 0;
      let mReal = r[11][m] || 0;

      // 1. Include PTW Connections (PTW realisation = PTW CA instead of PTW paid)
      if (state.includePtw) {
        mReal += ((r[14] && r[14][m]) || 0) - ((r[19] && r[19][m]) || 0);
      }

      // 2. Government Connections (when unchecked: Govt paid instead of deemed CA)
      if (!state.includeGovt) {
        mReal = mReal - ((r[20] && r[20][m]) || 0) + ((r[21] && r[21][m]) || 0);
      }

      // 3. Include State Subsidy: PTW_SUBS + PTW tariff subsidy + Others tariff/powerloom subsidy
      if (state.includeSubsidy) {
        const subAmt = ((r[15] && r[15][m]) || 0) + ((r[22] && r[22][m]) || 0) + ((r[23] && r[23][m]) || 0);
        mAss += subAmt;
        mReal += subAmt;
      }

      fIE += mIE;
      fSE += mSE;
      fAss += mAss;
      fReal += mReal;
    }

    if (state.excludeBilledGtInput && fSE > fIE) continue;

    // Exclude abnormal assessment: ABR > ₹50/kWh OR assessment > ₹100 Lakhs (₹1 Crore) with 0 sold energy
    const feederAbr = fSE > 0 ? (fAss * 100) / fSE : 0;
    if (state.excludeAbnormal && (feederAbr > 50 || (fAss > 100 && fSE <= 0))) continue;

    totIE += fIE; totSE += fSE; totAss += fAss; totReal += fReal;

    for (let m = 0; m < MON_LABELS.length; m++) {
      let mIE = r[8][m] || 0;
      let mSE = r[9][m] || 0;
      let mAss = r[10][m] || 0;
      let mReal = r[11][m] || 0;

      if (state.includePtw) {
        mReal += ((r[14] && r[14][m]) || 0) - ((r[19] && r[19][m]) || 0);
      }
      if (!state.includeGovt) {
        mReal = mReal - ((r[20] && r[20][m]) || 0) + ((r[21] && r[21][m]) || 0);
      }
      if (state.includeSubsidy) {
        const subAmt = ((r[15] && r[15][m]) || 0) + ((r[22] && r[22][m]) || 0) + ((r[23] && r[23][m]) || 0);
        mAss += subAmt;
        mReal += subAmt;
      }

      monthly[m].ie += mIE;
      monthly[m].se += mSE;
      monthly[m].ass += mAss;
      monthly[m].real += mReal;
    }

    const cons = consFor(r, validM1);
    if (fIE === 0) {
      ieZeroCount++;
    } else if (cons === 0) {
      noConsCount++;
    } else {
      auditedCount++;
    }

    const be = fIE > 0 ? (fSE / fIE) * 100 : null;
    const ce = fAss > 0 ? (fReal / fAss) * 100 : 100.0;
    const ll = be !== null ? 100 - be : null;
    const atc = (be !== null && ce !== null) ? 100 - (be * ce / 100) : null;

    const lineSlab = classifySlab(ll, fIE, cons, flags, false);
    const atcSlab  = classifySlab(atc, fIE, cons, flags, true);
    if (lineSlabs[lineSlab] !== undefined) lineSlabs[lineSlab]++;
    if (atcSlabs[atcSlab] !== undefined) atcSlabs[atcSlab]++;

    const fAbr = fSE > 0 ? (fAss * 100) / fSE : 0;
    const fTr  = fIE > 0 ? (fReal * 100) / fIE : 0;

    const discomName = N.Discom[r[0]];
    const zoneName   = N.Zone[r[1]];
    const areaName   = N.Area[r[6]];
    const natureName = N.Nature[r[7]];

    // Discom summary accumulator
    if (!discomGroups.has(discomName)) {
      discomGroups.set(discomName, { discom: discomName, feeders: 0, ie: 0, se: 0, ass: 0, real: 0 });
    }
    const dg = discomGroups.get(discomName);
    dg.feeders++; dg.ie += fIE; dg.se += fSE; dg.ass += fAss; dg.real += fReal;

    // Discom & Zone summary accumulator
    const szKey = `${discomName}__${zoneName}`;
    if (!summaryGroups.has(szKey)) {
      summaryGroups.set(szKey, {
        discom: discomName, zone: zoneName, total_feeders: 0,
        line_0_5: 0, line_5_10: 0, line_10_20: 0, line_20_30: 0,
        line_30_50: 0, line_50_70: 0, line_above_70: 0, line_abnormal: 0,
        atc_0_5: 0, atc_5_10: 0, atc_10_20: 0, atc_20_30: 0,
        atc_30_50: 0, atc_50_70: 0, atc_above_70: 0, atc_abnormal: 0,
        ie_zero: 0, no_consumers_tagged: 0,
        row_type: 1
      });
    }
    const sg = summaryGroups.get(szKey);
    sg.total_feeders++;
    if (fIE === 0) {
      sg.ie_zero++;
    } else if (cons === 0) {
      sg.no_consumers_tagged++;
    }

    const slabToKey = (s, p) => {
      if (s === '0% to 5%') return `${p}_0_5`;
      if (s === '5% to 10%') return `${p}_5_10`;
      if (s === '10% to 20%') return `${p}_10_20`;
      if (s === '20% to 30%') return `${p}_20_30`;
      if (s === '30% to 50%') return `${p}_30_50`;
      if (s === '50% to 70%') return `${p}_50_70`;
      if (s === 'Above 70%') return `${p}_above_70`;
      if (s === 'Abnormal') return `${p}_abnormal`;
      return null;
    };
    const lk = slabToKey(lineSlab, 'line');
    if (lk && sg[lk] !== undefined) sg[lk]++;
    const ak = slabToKey(atcSlab, 'atc');
    if (ak && sg[ak] !== undefined) sg[ak]++;

    // Nature & Area accumulator
    if (!natureGroups.has(natureName)) {
      natureGroups.set(natureName, { category: natureName, feeders: 0, consumers: 0, ie: 0, se: 0, ass: 0, real: 0 });
    }
    const ng = natureGroups.get(natureName);
    ng.feeders++; ng.consumers += (cons || 0); ng.ie += fIE; ng.se += fSE; ng.ass += fAss; ng.real += fReal;

    if (!areaGroups.has(areaName)) {
      areaGroups.set(areaName, { category: areaName, feeders: 0, consumers: 0, ie: 0, se: 0, ass: 0, real: 0 });
    }
    const ag = areaGroups.get(areaName);
    ag.feeders++; ag.consumers += (cons || 0); ag.ie += fIE; ag.se += fSE; ag.ass += fAss; ag.real += fReal;

    usedFeeders.push({
      ri: i,
      discom: discomName,
      zone: zoneName,
      circle: N.Circle[r[2]],
      division: N.Division[r[3]],
      substation: N.SS[r[4]],
      feeder: r[5],
      area: areaName,
      feederType: natureName,
      fIE, fSE, fAss, fReal, be, ce, ll, atc, fAbr, fTr, lineSlab, atcSlab,
      inputMu: fIE / 1000,
      billedMu: fSE / 1000
    });
  }

  // Overall KPIs
  const be = totIE > 0 ? (totSE / totIE) * 100 : 0;
  const ce = totAss > 0 ? (totReal / totAss) * 100 : (totReal > 0 ? 100 : 0);
  const ll = totIE > 0 ? 100 - be : 0;
  const atc = 100 - (be * ce / 100);
  const abr = totSE > 0 ? (totAss * 100) / totSE : 0;
  const thruRate = totIE > 0 ? (totReal * 100) / totIE : 0;
  const atcLossValueCr = (totIE * 1000 * abr * atc / 100) / 1e7;
  const lossPerUnit = totIE > 0 ? (atcLossValueCr * 1e7) / (totIE * 1000) : 0;

  const kpis = {
    totalFeeders: totalScoped,
    countedFeeders: usedFeeders.length,
    leftOutFeeders: totalScoped - usedFeeders.length,
    auditedFeeders: auditedCount,
    ieZeroFeeders: ieZeroCount,
    noConsFeeders: noConsCount,
    inputEnergyMu: totIE / 1000,
    soldEnergyMu: totSE / 1000,
    billingEfficiency: be,
    collectionEfficiency: ce,
    lineLoss: ll,
    atcLoss: atc,
    avgBillingRate: abr,
    thruRate: thruRate,
    lossPerUnit: lossPerUnit,
    assessmentCr: totAss / 100,
    realizationCr: totReal / 100,
    atcLossValueCr: atcLossValueCr
  };

  // Top 150 loss value
  for (const f of usedFeeders) {
    if (f.fIE > 0) {
      const rate = (f.fAbr >= 3 && f.fAbr <= 15) ? f.fAbr : (abr || 7);
      f.atcLossValueCr = (f.fIE * 1000 * rate * (f.atc || 0) / 100) / 1e7;
    } else {
      f.atcLossValueCr = 0;
    }
  }

  const top150 = [...usedFeeders]
    .filter(f => f.fIE > 0)
    .sort((a, b) => (b.atcLossValueCr || 0) - (a.atcLossValueCr || 0))
    .slice(0, 150);

  // Worst 10 feeders (>70% slab)
  const worst10 = [...usedFeeders]
    .filter(f => f.atcSlab === 'Above 70%')
    .sort((a, b) => ((b.atc || 0) - (a.atc || 0)) || ((b.ll || 0) - (a.ll || 0)))
    .slice(0, 10);

  return {
    kpis,
    monthly,
    lineSlabs,
    atcSlabs,
    discomSummary: [...discomGroups.values()].map(d => {
      const dBe = d.ie > 0 ? (d.se / d.ie) * 100 : 0;
      const dCe = d.ass > 0 ? (d.real / d.ass) * 100 : (d.real > 0 ? 100 : 0);
      const dAtc = 100 - (dBe * dCe / 100);
      const dAbr = d.se > 0 ? (d.ass * 100) / d.se : 0;
      const dTr  = d.ie > 0 ? (d.real * 100) / d.ie : 0;
      const dValCr = (d.ie * 1000 * dAbr * dAtc / 100) / 1e7;
      return {
        discom: d.discom,
        feeders: d.feeders,
        inputMu: d.ie / 1000,
        billedMu: d.se / 1000,
        billingEff: dBe,
        collectionEff: dCe,
        atcLoss: dAtc,
        abr: dAbr,
        thruRate: dTr,
        realisedCr: d.real / 100,
        atcLossValueCr: dValCr
      };
    }),
    categoryBreakdown: {
      feederType: [...natureGroups.values()].map(g => {
        const be = g.ie > 0 ? (g.se / g.ie) * 100 : 0;
        const ce = g.ass > 0 ? (g.real / g.ass) * 100 : (g.real > 0 ? 100 : 0);
        const atc = 100 - (be * ce / 100);
        const abr = g.se > 0 ? (g.ass * 100) / g.se : 0;
        const thruRate = g.ie > 0 ? (g.real * 100) / g.ie : 0;
        const atcLossValueCr = (g.ie * 1000 * abr * atc / 100) / 1e7;
        return {
          category: g.category,
          feeders: g.feeders,
          consumers: g.consumers,
          inputMu: g.ie / 1000,
          billedMu: g.se / 1000,
          billingEff: be,
          collectionEff: ce,
          atcLoss: atc,
          abr: abr,
          thruRate: thruRate,
          ie: g.ie,
          se: g.se,
          ass: g.ass,
          real: g.real,
          assessedCr: g.ass / 100,
          realisedCr: g.real / 100,
          atcLossValueCr: atcLossValueCr
        };
      }),
      area: [...areaGroups.values()].map(g => {
        const be = g.ie > 0 ? (g.se / g.ie) * 100 : 0;
        const ce = g.ass > 0 ? (g.real / g.ass) * 100 : (g.real > 0 ? 100 : 0);
        const atc = 100 - (be * ce / 100);
        const abr = g.se > 0 ? (g.ass * 100) / g.se : 0;
        const thruRate = g.ie > 0 ? (g.real * 100) / g.ie : 0;
        const atcLossValueCr = (g.ie * 1000 * abr * atc / 100) / 1e7;
        return {
          category: g.category,
          feeders: g.feeders,
          consumers: g.consumers,
          inputMu: g.ie / 1000,
          billedMu: g.se / 1000,
          billingEff: be,
          collectionEff: ce,
          atcLoss: atc,
          abr: abr,
          thruRate: thruRate,
          ie: g.ie,
          se: g.se,
          ass: g.ass,
          real: g.real,
          assessedCr: g.ass / 100,
          realisedCr: g.real / 100,
          atcLossValueCr: atcLossValueCr
        };
      })
    },
    feederTypeBreakdown: {
      feederType: [...natureGroups.values()].map(g => {
        const be = g.ie > 0 ? (g.se / g.ie) * 100 : 0;
        const ce = g.ass > 0 ? (g.real / g.ass) * 100 : (g.real > 0 ? 100 : 0);
        return { category: g.category, feeders: g.feeders, atcLoss: 100 - (be * ce / 100) };
      }),
      area: [...areaGroups.values()].map(g => {
        const be = g.ie > 0 ? (g.se / g.ie) * 100 : 0;
        const ce = g.ass > 0 ? (g.real / g.ass) * 100 : (g.real > 0 ? 100 : 0);
        return { category: g.category, feeders: g.feeders, atcLoss: 100 - (be * ce / 100) };
      })
    },
    progressiveSummary: [...summaryGroups.values()],
    top150,
    worst10,
    usedFeeders
  };
}

// ── Rendering Functions ──

function renderKpis(d) {
  if (!d) return;
  document.getElementById('kpiIE').textContent = fmt(d.inputEnergyMu, 2);
  document.getElementById('kpiSE').textContent = fmt(d.soldEnergyMu, 2);
  document.getElementById('kpiAss').textContent = fmt(d.assessmentCr, 2);
  document.getElementById('kpiReal').textContent = fmt(d.realizationCr, 2);
  document.getElementById('kpiBE').textContent = (d.billingEfficiency || 0).toFixed(2) + '%';
  document.getElementById('kpiCE').textContent = (d.collectionEfficiency || 0).toFixed(2) + '%';
  document.getElementById('kpiLL').textContent = (d.lineLoss || 0).toFixed(2) + '%';
  document.getElementById('kpiATC').textContent = (d.atcLoss || 0).toFixed(2) + '%';

  document.getElementById('kpiABR').textContent = fmt(d.avgBillingRate, 2);
  document.getElementById('kpiThru').textContent = fmt(d.thruRate, 2);
  const elLPU = document.getElementById('kpiLossPerUnit');
  if (elLPU) elLPU.textContent = fmt(d.lossPerUnit, 2);
  const elALV = document.getElementById('kpiALV');
  if (elALV) elALV.textContent = fmt(d.atcLossValueCr, 2);

  document.getElementById('cntTotal').textContent = fmt(d.totalFeeders);
  document.getElementById('cntAudited').textContent = fmt(d.auditedFeeders);
  document.getElementById('cntIeZero').textContent = fmt(d.ieZeroFeeders);
  document.getElementById('cntNoCons').textContent = fmt(d.noConsFeeders);

  const now = new Date();
  document.getElementById('refreshTs').textContent = 'Refreshed: ' + now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

function renderMonthlyCharts(monthly) {
  if (!monthly || !chartMonthlyEnergy || !chartMonthlyLoss) return;

  const m0 = MON_INDEX[state.monthFrom] ?? 0;
  const m1 = MON_INDEX[state.monthTo] ?? 6;
  const validM0 = Math.min(m0, m1);
  const validM1 = Math.max(m0, m1);

  const inputMus = monthly.map(m => Math.round((m.ie / 1000) * 10) / 10);
  const billedMus = monthly.map(m => Math.round((m.se / 1000) * 10) / 10);
  const atcLosses = monthly.map(m => {
    const be = m.ie > 0 ? (m.se / m.ie) * 100 : 0;
    const ce = m.ass > 0 ? (m.real / m.ass) * 100 : (m.real > 0 ? 100 : 0);
    return Math.round((100 - (be * ce / 100)) * 10) / 10;
  });
  const lineLosses = monthly.map(m => {
    const be = m.ie > 0 ? (m.se / m.ie) * 100 : 0;
    return Math.round((100 - be) * 10) / 10;
  });

  // Color dimming outside range
  const bgBlue = inputMus.map((_, i) => (i >= validM0 && i <= validM1) ? '#2a78d6' : 'rgba(42, 120, 214, 0.25)');
  const bgOrange = billedMus.map((_, i) => (i >= validM0 && i <= validM1) ? '#eb6834' : 'rgba(235, 104, 52, 0.25)');

  chartMonthlyEnergy.data.datasets[0].data = inputMus;
  chartMonthlyEnergy.data.datasets[0].backgroundColor = bgBlue;
  chartMonthlyEnergy.data.datasets[1].data = billedMus;
  chartMonthlyEnergy.data.datasets[1].backgroundColor = bgOrange;
  chartMonthlyEnergy.update();

  chartMonthlyLoss.data.datasets[0].data = atcLosses;
  chartMonthlyLoss.data.datasets[1].data = lineLosses;
  chartMonthlyLoss.update();
}

function renderSlabCharts(lineSlabs, atcSlabs) {
  if (!chartLineLoss || !chartAtcLoss) return;
  const lineData = SLAB_LABELS.map(s => lineSlabs[s] || 0);
  const atcData  = SLAB_LABELS.map(s => atcSlabs[s] || 0);

  chartLineLoss.data.datasets[0].data = lineData;
  chartLineLoss.update();

  chartAtcLoss.data.datasets[0].data = atcData;
  chartAtcLoss.update();

  renderHBar(atcSlabs, lineSlabs);
}

function renderHBar(atcSlabs, lineSlabs) {
  const container = document.getElementById('hBarContainer');
  if (!container) return;
  const source = state.hBarType === 'atc' ? atcSlabs : lineSlabs;
  const values = SLAB_LABELS.map(s => source[s] || 0);
  const max = Math.max(...values) || 1;

  container.innerHTML = SLAB_LABELS.map((lbl, i) => {
    const v = values[i] || 0;
    const pct = ((v / max) * 100).toFixed(1);
    const color = SLAB_COLORS[lbl] || '#7a8494';
    const discomParam = state.discom ? `&discom=${encodeURIComponent(state.discom)}` : '';
    const zoneParam = state.zone ? `&zone=${encodeURIComponent(state.zone)}` : '';
    const typeParam = state.hBarType === 'atc' ? 'atc_loss' : 'line_loss';
    const url = `feeder_drilldown.html?type=${typeParam}&slab=${encodeURIComponent(lbl)}${discomParam}${zoneParam}`;

    return `
      <div class="bar-row" onclick="window.open('${url}', '_blank')" title="Click to view feeders in ${lbl}">
        <div class="bar-lbl">${lbl}</div>
        <div class="bar-track">
          <div class="bar-fill" style="width:${pct}%;background:${color}"></div>
        </div>
        <div class="bar-cnt">${fmt(v)}</div>
      </div>
    `;
  }).join('');
}

function renderFeederTypeBreakdown(data) {
  const container = document.getElementById('feederTypeBarContainer');
  if (!container || !data) return;
  const dataset = (state.ftBarGroup === 'area' ? data.area : data.feederType) || [];

  if (!dataset.length) {
    container.innerHTML = `<div style="text-align:center;padding:16px;color:var(--ink-3)">No category data.</div>`;
    return;
  }

  container.innerHTML = dataset.map(item => {
    const loss = item.atcLoss || 0;
    const widthPct = Math.min(100, Math.max(2, loss));
    const color = loss < 20 ? 'var(--good)' : loss < 50 ? 'var(--warn)' : 'var(--crit)';

    return `
      <div class="bar-row" style="grid-template-columns: 160px 1fr 110px;">
        <div class="bar-lbl" title="${item.category}">${item.category}</div>
        <div class="bar-track">
          <div class="bar-fill" style="width:${widthPct}%;background:${color};"></div>
        </div>
        <div class="bar-cnt"><b>${loss.toFixed(1)}%</b> (${fmt(item.feeders)})</div>
      </div>
    `;
  }).join('');
}

// ── Performance League Table ──

function getActiveLeagueLevel() {
  if (state.leagueManualLevel) return state.leagueManualLevel;
  if (state.division) return 'substation';
  if (state.circle) return 'division';
  if (state.zone) return 'circle';
  if (state.discom) return 'zone';
  return 'discom';
}

function renderLeagueBreadcrumbs(level) {
  const el = document.getElementById('leagueBreadcrumb');
  if (!el) return;

  const parts = [];
  parts.push(`<span class="league-crumb" onclick="clearLeagueCrumb('root')" title="View All UPPCL">Uttar Pradesh</span>`);

  if (state.discom) {
    parts.push(`<span>›</span>`);
    parts.push(`<span class="league-crumb" onclick="clearLeagueCrumb('discom')" title="Reset to ${state.discom}">${state.discom}</span>`);
  }
  if (state.zone) {
    parts.push(`<span>›</span>`);
    parts.push(`<span class="league-crumb" onclick="clearLeagueCrumb('zone')" title="Reset to ${state.zone}">${state.zone}</span>`);
  }
  if (state.circle) {
    parts.push(`<span>›</span>`);
    parts.push(`<span class="league-crumb" onclick="clearLeagueCrumb('circle')" title="Reset to ${state.circle}">${state.circle}</span>`);
  }
  if (state.division) {
    parts.push(`<span>›</span>`);
    parts.push(`<span class="league-crumb" onclick="clearLeagueCrumb('division')" title="Reset to ${state.division}">${state.division}</span>`);
  }

  const levelName = level.charAt(0).toUpperCase() + level.slice(1);
  parts.push(`<span style="color:var(--ink-3);font-size:11px;">(Viewing: <b>${levelName} level</b>)</span>`);

  el.innerHTML = parts.join(' ');
}

window.clearLeagueCrumb = function(part) {
  if (part === 'root') {
    state.discom = '';
    state.zone = '';
    state.circle = '';
    state.division = '';
    document.getElementById('fDiscom').value = '';
    document.getElementById('fZone').value = '';
    document.getElementById('fCircle').value = '';
    document.getElementById('fDivision').value = '';
  } else if (part === 'discom') {
    state.zone = '';
    state.circle = '';
    state.division = '';
    document.getElementById('fZone').value = '';
    document.getElementById('fCircle').value = '';
    document.getElementById('fDivision').value = '';
  } else if (part === 'zone') {
    state.circle = '';
    state.division = '';
    document.getElementById('fCircle').value = '';
    document.getElementById('fDivision').value = '';
  } else if (part === 'circle') {
    state.division = '';
    document.getElementById('fDivision').value = '';
  }
  state.leagueManualLevel = null;
  syncCascadeDropdowns();
  onFilterChanged();
};

function renderPerformanceLeagueTable(feeders) {
  const tbody = document.getElementById('leagueTableBody');
  const tfoot = document.getElementById('leagueTableFoot');
  if (!tbody || !feeders) return;

  const level = getActiveLeagueLevel();

  // Update segmented button UI
  document.querySelectorAll('#leagueLevelSeg .seg-btn').forEach(btn => {
    btn.setAttribute('aria-pressed', btn.dataset.level === level ? 'true' : 'false');
  });

  // Render breadcrumbs
  renderLeagueBreadcrumbs(level);

  // Group feeders by the active hierarchy level
  const groups = new Map();
  for (let i = 0; i < feeders.length; i++) {
    const f = feeders[i];
    let name = '', parent = '';
    if (level === 'discom') {
      name = f.discom;
      parent = 'UPPCL';
    } else if (level === 'zone') {
      name = f.zone;
      parent = f.discom;
    } else if (level === 'circle') {
      name = f.circle;
      parent = f.zone;
    } else if (level === 'division') {
      name = f.division;
      parent = f.circle;
    } else if (level === 'substation') {
      name = f.substation;
      parent = f.division;
    }

    const key = (parent || '') + '____' + (name || '');
    if (!groups.has(key)) {
      groups.set(key, { name: name || 'Unknown', parent: parent || '—', feeders: 0, ie: 0, se: 0, ass: 0, real: 0, fdrAbove70: 0 });
    }
    const item = groups.get(key);
    item.feeders++;
    item.ie += f.fIE;
    item.se += f.fSE;
    item.ass += f.fAss;
    item.real += f.fReal;
    if (f.atcSlab === 'Above 70%') item.fdrAbove70++;
  }

  const rows = [];
  let totFeeders = 0, totIE = 0, totSE = 0, totAss = 0, totReal = 0, totFdrAbove70 = 0;

  for (const item of groups.values()) {
    totFeeders += item.feeders;
    totIE += item.ie;
    totSE += item.se;
    totAss += item.ass;
    totReal += item.real;
    totFdrAbove70 += item.fdrAbove70;

    const inputMu = item.ie / 1000;
    const billedMu = item.se / 1000;
    const be = item.ie > 0 ? (item.se / item.ie) * 100 : 0;
    const ce = item.ass > 0 ? (item.real / item.ass) * 100 : (item.real > 0 ? 100 : 0);
    const lineLoss = 100 - be;
    const atcLoss = 100 - (be * ce / 100);
    const abr = item.se > 0 ? (item.ass * 100) / item.se : 0;
    const thruRate = item.ie > 0 ? (item.real * 100) / item.ie : 0;
    const atcLossValueCr = (item.ie * 1000 * abr * (atcLoss / 100)) / 1e7;
    const realisedCr = item.real / 100;

    rows.push({
      name: item.name,
      parent: item.parent,
      feeders: item.feeders,
      inputMu,
      billedMu,
      billingEff: be,
      lineLoss,
      collectionEff: ce,
      atcLoss,
      atcLossValueCr,
      abr,
      thruRate,
      realisedCr,
      fdrAbove70: item.fdrAbove70
    });
  }

  // Max Loss Value for inline progress bar scaling
  const maxLossValue = rows.reduce((max, r) => Math.max(max, r.atcLossValueCr || 0), 0);

  // Sorting
  const sortCol = state.leagueSortCol || 'atcLossValueCr';
  const sortDir = state.leagueSortDir || -1;
  rows.sort((a, b) => {
    const va = a[sortCol];
    const vb = b[sortCol];
    if (typeof va === 'string') return sortDir * va.localeCompare(vb);
    return sortDir * ((Number(va) || 0) - (Number(vb) || 0));
  });

  window.__activeLeagueRows = rows;
  window.__activeLeagueLevel = level;

  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="13" style="text-align:center;padding:16px;color:var(--ink-3)">No data available for current selection.</td></tr>`;
    if (tfoot) tfoot.innerHTML = '';
    return;
  }

  tbody.innerHTML = rows.map(r => {
    const barPct = maxLossValue > 0 ? Math.min(100, Math.max(0, ((r.atcLossValueCr || 0) / maxLossValue) * 100)) : 0;
    const drillHint = level === 'substation' 
      ? `Click to view feeders for ${r.name} in Feeder Explorer`
      : `Click to drill down into ${r.name}`;

    return `
      <tr class="drill" onclick="onLeagueRowClick('${level}', '${r.name.replace(/'/g, "\\'")}', '${r.parent.replace(/'/g, "\\'")}')" title="${drillHint}">
        <td class="tx" style="font-weight:600;color:var(--accent);">${r.name}</td>
        <td class="tx" style="color:var(--ink-3);">${r.parent}</td>
        <td>${fmt(r.feeders)}</td>
        <td>${fmt(r.inputMu, 2)}</td>
        <td>${fmt(r.billedMu, 2)}</td>
        <td>${lossPill(r.lineLoss, true)}</td>
        <td><span class="pill ${r.collectionEff >= 90 ? 'p-good' : r.collectionEff >= 70 ? 'p-warn' : 'p-crit'}">${r.collectionEff.toFixed(1)}%</span></td>
        <td>${lossPill(r.atcLoss, false)}</td>
        <td>
          <div style="display:flex;align-items:center;justify-content:flex-end;gap:8px;">
            <span style="font-weight:600;color:var(--crit);">₹${fmt(r.atcLossValueCr, 2)}</span>
            <div style="width:45px;height:5px;background:var(--line);border-radius:3px;overflow:hidden;flex-shrink:0;">
              <div style="width:${barPct.toFixed(1)}%;height:100%;background:var(--crit);border-radius:3px;"></div>
            </div>
          </div>
        </td>
        <td>${fmt(r.abr, 2)}</td>
        <td>${fmt(r.thruRate, 2)}</td>
        <td>₹${fmt(r.realisedCr, 2)}</td>
        <td><b>${fmt(r.fdrAbove70)}</b></td>
      </tr>
    `;
  }).join('');

  // Total grand row in tfoot
  if (tfoot) {
    const totInputMu = totIE / 1000;
    const totSoldMu = totSE / 1000;
    const totBe = totIE > 0 ? (totSE / totIE) * 100 : 0;
    const totCe = totAss > 0 ? (totReal / totAss) * 100 : (totReal > 0 ? 100 : 0);
    const totLineLoss = 100 - totBe;
    const totAtcLoss = 100 - (totBe * totCe / 100);
    const totAbr = totSE > 0 ? (totAss * 100) / totSE : 0;
    const totThruRate = totIE > 0 ? (totReal * 100) / totIE : 0;
    const totLossValueCr = (totIE * 1000 * totAbr * (totAtcLoss / 100)) / 1e7;
    const totRealisedCr = totReal / 100;
    const fdrBarPct = totFeeders > 0 ? Math.min(100, (totFdrAbove70 / totFeeders) * 100) : 0;

    window.__activeLeagueTotal = {
      level, count: rows.length, totFeeders, totInputMu, totSoldMu, totLineLoss,
      totCe, totAtcLoss, totLossValueCr, totAbr, totThruRate, totRealisedCr, totFdrAbove70
    };

    tfoot.innerHTML = `
      <tr class="grand">
        <td class="tx">Total (${fmt(rows.length)})</td>
        <td class="tx">—</td>
        <td>${fmt(totFeeders)}</td>
        <td>${fmt(totInputMu, 2)}</td>
        <td>${fmt(totSoldMu, 2)}</td>
        <td>${lossPill(totLineLoss, true)}</td>
        <td><span class="pill ${totCe >= 90 ? 'p-good' : totCe >= 70 ? 'p-warn' : 'p-crit'}">${totCe.toFixed(1)}%</span></td>
        <td>${lossPill(totAtcLoss, false)}</td>
        <td style="font-weight:700;color:var(--crit);">₹${fmt(totLossValueCr, 2)}</td>
        <td>${fmt(totAbr, 2)}</td>
        <td>${fmt(totThruRate, 2)}</td>
        <td>₹${fmt(totRealisedCr, 2)}</td>
        <td>
          <div style="display:flex;align-items:center;justify-content:flex-end;gap:8px;">
            <span>${fmt(totFdrAbove70)}</span>
            <div style="width:50px;height:6px;background:var(--line);border-radius:3px;overflow:hidden;flex-shrink:0;">
              <div style="width:${fdrBarPct.toFixed(1)}%;height:100%;background:var(--crit);border-radius:3px;"></div>
            </div>
          </div>
        </td>
      </tr>
    `;
  }
}

window.onLeagueRowClick = function(level, name, parent) {
  if (level === 'discom') {
    state.discom = normalizeDiscom(name);
    state.zone = '';
    state.circle = '';
    state.division = '';
    document.getElementById('fDiscom').value = state.discom;
    state.leagueManualLevel = null;
    syncCascadeDropdowns();
    onFilterChanged();
  } else if (level === 'zone') {
    state.zone = name;
    state.circle = '';
    state.division = '';
    document.getElementById('fZone').value = state.zone;
    state.leagueManualLevel = null;
    syncCascadeDropdowns();
    onFilterChanged();
  } else if (level === 'circle') {
    state.circle = name;
    state.division = '';
    document.getElementById('fCircle').value = state.circle;
    state.leagueManualLevel = null;
    syncCascadeDropdowns();
    onFilterChanged();
  } else if (level === 'division') {
    state.division = name;
    document.getElementById('fDivision').value = state.division;
    state.leagueManualLevel = null;
    syncCascadeDropdowns();
    onFilterChanged();
  } else if (level === 'substation') {
    window.open('feeder_drilldown.html?search=' + encodeURIComponent(name).replace(/\+/g, '%2B'), '_blank');
  }
};

function exportPerformanceLeagueCsv() {
  const rows = window.__activeLeagueRows;
  const tot = window.__activeLeagueTotal;
  const level = window.__activeLeagueLevel || 'league';
  if (!rows || !rows.length) return;

  const csvLines = [];
  csvLines.push(`# UPPCL Performance League Table (Level: ${level.toUpperCase()}, Period: ${state.monthFrom} to ${state.monthTo} 2026)`);
  csvLines.push(['Name', 'Parent', 'Feeders', 'Input MU', 'Sold MU', 'Line Loss %', 'Coll. Eff. %', 'AT&C Loss %', 'AT&C Loss Value (Cr)', 'ABR (Rs/kWh)', 'Thru Rate (Rs/kWh)', 'Realised (Cr)', 'Feeders >70%'].join(','));

  for (const r of rows) {
    const line = [
      `"${r.name.replace(/"/g, '""')}"`,
      `"${r.parent.replace(/"/g, '""')}"`,
      r.feeders,
      r.inputMu.toFixed(2),
      r.billedMu.toFixed(2),
      r.lineLoss.toFixed(1) + '%',
      r.collectionEff.toFixed(1) + '%',
      r.atcLoss.toFixed(1) + '%',
      r.atcLossValueCr.toFixed(2),
      r.abr.toFixed(2),
      r.thruRate.toFixed(2),
      r.realisedCr.toFixed(2),
      r.fdrAbove70
    ];
    csvLines.push(line.join(','));
  }

  if (tot) {
    const totLine = [
      `"Total (${tot.count})"`,
      '"—"',
      tot.totFeeders,
      tot.totInputMu.toFixed(2),
      tot.totSoldMu.toFixed(2),
      tot.totLineLoss.toFixed(1) + '%',
      tot.totCe.toFixed(1) + '%',
      tot.totAtcLoss.toFixed(1) + '%',
      tot.totLossValueCr.toFixed(2),
      tot.totAbr.toFixed(2),
      tot.totThruRate.toFixed(2),
      tot.totRealisedCr.toFixed(2),
      tot.totFdrAbove70
    ];
    csvLines.push(totLine.join(','));
  }

  const blob = new Blob([csvLines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `UPPCL_Performance_League_${level}_${state.monthFrom}_${state.monthTo}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

const btnExportLeagueCsv = document.getElementById('btnExportLeagueCsv');
if (btnExportLeagueCsv) btnExportLeagueCsv.addEventListener('click', exportPerformanceLeagueCsv);

function renderByDiscomTable(rows) {
  // Retained for backward-compatibility
}


window.filterByDiscomName = function(dName) {
  let mapped = dName;
  if (dName.includes('PASCHIM')) mapped = 'PVVNL';
  else if (dName.includes('DAKSHIN')) mapped = 'DVVNL';
  else if (dName.includes('MADHYA')) mapped = 'MVVNL';
  else if (dName.includes('POORV') || dName.includes('PURV')) mapped = 'PUVVNL';
  else if (dName.includes('KESCO')) mapped = 'KESCO';

  document.getElementById('fDiscom').value = mapped;
  state.discom = mapped;
  state.zone = '';
  state.circle = '';
  state.division = '';
  syncCascadeDropdowns();
  onFilterChanged();
};

const BASE_DISCOM_FEEDERS = {
  'ALL': 26615,
  'PVVNL': 8248,
  'DVVNL': 6212,
  'PUVNL': 5654,
  'MVVNL': 5870,
  'KESCO': 631
};

function getActiveCategoryData() {
  // Resolve active discom
  let discKey = 'ALL';
  const selDisc = (state.discom || '').toUpperCase().trim();
  if (selDisc) {
    if (selDisc.includes('DAKSHIN') || selDisc === 'DVVNL') discKey = 'DVVNL';
    else if (selDisc.includes('PASCHIM') || selDisc === 'PVVNL') discKey = 'PVVNL';
    else if (selDisc.includes('MADHYA') || selDisc === 'MVVNL') discKey = 'MVVNL';
    else if (selDisc.includes('POORV') || selDisc.includes('PURV') || selDisc === 'PUVNL' || selDisc === 'PUVVNL') discKey = 'PUVNL';
    else if (selDisc.includes('KESCO')) discKey = 'KESCO';
  }

  const rawRows = (typeof CATEGORY_DATA_BY_DISCOM !== 'undefined' && CATEGORY_DATA_BY_DISCOM[discKey]) 
    ? CATEGORY_DATA_BY_DISCOM[discKey] 
    : (typeof CATEGORY_DATA_BY_DISCOM !== 'undefined' && CATEGORY_DATA_BY_DISCOM['ALL'] ? CATEGORY_DATA_BY_DISCOM['ALL'] : []);

  if (!rawRows || !rawRows.length) return { discKey, rows: [] };

  // Calculate base totals for this Discom
  let baseAss = 0, baseMu = 0, baseReal = 0;
  for (const r of rawRows) {
    baseAss += (r.assessmentCr || 0);
    baseMu += (r.billedMu || 0);
    baseReal += (r.realisedCr || 0);
  }

  // Active KPI figures from active filters (Discom, Zone, Circle, Division, FeederType, Months, Search, PTW)
  const kpis = (typeof computedResult !== 'undefined' && computedResult) ? computedResult.kpis : null;
  const activeAss = kpis ? (kpis.assessmentCr || 0) : baseAss;
  const activeMu = kpis ? (kpis.soldEnergyMu || 0) : baseMu;
  const activeReal = kpis ? (kpis.realizationCr || 0) : baseReal;
  const activeFeeders = kpis ? (kpis.totalFeeders || 0) : (BASE_DISCOM_FEEDERS[discKey] || 26615);
  const baseFeeders = BASE_DISCOM_FEEDERS[discKey] || 26615;

  if (kpis && (activeFeeders === 0 || (activeAss === 0 && activeMu === 0))) {
    return { discKey, rows: [] };
  }

  // Feeder scaling ratio (for consumers and load when hierarchy/geographical filters are active)
  const feederRatio = baseFeeders > 0 ? Math.min(1.0, activeFeeders / baseFeeders) : 1.0;
  const scaleAss = baseAss > 0 ? (activeAss / baseAss) : 0;
  const scaleMu = baseMu > 0 ? (activeMu / baseMu) : 0;

  // Monthly snapshot scaling for selected "To" month (Apr=0, May=1, Jun=2, Jul=3, Aug=4, Sep=5, Oct=6)
  const mTo = (typeof MON_INDEX !== 'undefined' && MON_INDEX[state.monthTo] !== undefined) ? MON_INDEX[state.monthTo] : 6;

  // F8: For October, use actual consumer master counts from CATEGORY_OCT_COUNTS
  if (mTo === 6 && typeof CATEGORY_OCT_COUNTS !== 'undefined' && CATEGORY_OCT_COUNTS[discKey]) {
    const octCounts = CATEGORY_OCT_COUNTS[discKey];
    return {
      discKey,
      rows: rawRows.map(row => {
        const octRow = octCounts[row.category];
        if (!octRow) return { ...row };
        const scaledAss = scaleAss * (row.assessmentCr || 0);
        const scaledReal = scaleAss > 0 ? scaledAss * (activeReal / activeAss || 0) : 0;
        return {
          ...row,
          totalCons:    Math.round(octRow[0] * feederRatio),
          billableCons: Math.round(octRow[1] * feederRatio),
          billedCons:   Math.round(octRow[2] * feederRatio),
          totalLoadKw:  Math.round(octRow[3] * feederRatio),
          assessmentCr: scaledAss,
          realisedCr:   scaledReal,
        };
      })
    };
  }
  const billableRatios = DISCOM_MONTHLY_BILLABLE_RATIOS[discKey] || DISCOM_MONTHLY_BILLABLE_RATIOS['ALL'];
  const monthBillableRatio = billableRatios[mTo] ?? 1.0;
  const monthBilledRatio = MONTHLY_BILLED_RATIOS[mTo] ?? 1.0;

  let monthPaidRatio = MONTHLY_PAID_RATIOS[mTo] ?? 1.0;
  if (computedResult && computedResult.monthly && computedResult.monthly[4] && computedResult.monthly[4].real > 0 && computedResult.monthly[mTo]) {
    monthPaidRatio = computedResult.monthly[mTo].real / computedResult.monthly[4].real;
  }

  const finalBillableRatio = feederRatio * monthBillableRatio;
  const finalBilledRatio = feederRatio * monthBilledRatio;
  const finalPaidRatio = feederRatio * monthPaidRatio;

  // Clone rows and scale values
  const rows = rawRows.map(r => {
    const item = { ...r };
    item.desc = (typeof CATEGORY_NAMES !== 'undefined' && CATEGORY_NAMES[item.category]) ? CATEGORY_NAMES[item.category] : '';
    item.billableConsumers = Math.round((r.billableConsumers || 0) * finalBillableRatio);
    item.loadKw = Math.round(((r.loadKw || 0) * finalBillableRatio) * 100) / 100;
    item.billedConsumers = Math.round((r.billedConsumers || 0) * finalBilledRatio);
    item.paidConsumers = Math.round((r.paidConsumers || 0) * finalPaidRatio);
    item.billedMu = Math.round(((r.billedMu || 0) * scaleMu) * 100) / 100;
    item.assessmentCr = Math.round(((r.assessmentCr || 0) * scaleAss) * 100) / 100;
    return item;
  });

  // Adjust assessment and billedMu rounding diff to ensure exact match with active KPI totals
  const currentAss = rows.reduce((s, r) => s + r.assessmentCr, 0);
  const assDiff = Math.round((activeAss - currentAss) * 100) / 100;
  if (assDiff !== 0 && rows.length > 0) {
    const topRow = rows.reduce((max, r) => r.assessmentCr > max.assessmentCr ? r : max, rows[0]);
    topRow.assessmentCr = Math.round((topRow.assessmentCr + assDiff) * 100) / 100;
  }

  const currentMu = rows.reduce((s, r) => s + r.billedMu, 0);
  const muDiff = Math.round((activeMu - currentMu) * 100) / 100;
  if (muDiff !== 0 && rows.length > 0) {
    const topRow = rows.reduce((max, r) => r.billedMu > max.billedMu ? r : max, rows[0]);
    topRow.billedMu = Math.round((topRow.billedMu + muDiff) * 100) / 100;
  }

  // Handle Category Realisation under PTW, Govt Connections, and Subsidy rules
  const lmv5Row = rows.find(r => r.category === 'LMV5');
  const isGovtCat = (cat) => ['LMV4A', 'LMV3', 'LMV7'].includes(cat);

  // If Govt deemed credit is excluded, Govt categories reflect actual cash recovery (~40% CE)
  if (!state.includeGovt) {
    for (const r of rows) {
      if (isGovtCat(r.category)) {
        r.realisedCr = Math.round(r.assessmentCr * 0.40 * 100) / 100;
      }
    }
  }

  // If PTW is included, LMV5 is deemed 100% realized
  if (state.includePtw && lmv5Row) {
    lmv5Row.realisedCr = lmv5Row.assessmentCr;
    lmv5Row.collectionEff = 100.0;
  }

  // Calculate remaining realization for flexible categories
  const fixedReal = rows.filter(r => (state.includePtw && r.category === 'LMV5') || (!state.includeGovt && isGovtCat(r.category)))
                        .reduce((s, r) => s + r.realisedCr, 0);
  const remReal = Math.max(0.0, Math.round((activeReal - fixedReal) * 100) / 100);

  const flexRows = rows.filter(r => !((state.includePtw && r.category === 'LMV5') || (!state.includeGovt && isGovtCat(r.category))));
  const baseFlexReal = flexRows.reduce((s, r) => {
    const orig = rawRows.find(x => x.category === r.category);
    return s + (orig ? orig.realisedCr : r.realisedCr);
  }, 0);

  for (const r of flexRows) {
    const orig = rawRows.find(x => x.category === r.category) || r;
    r.realisedCr = baseFlexReal > 0 
      ? Math.round(((orig.realisedCr || 0) / baseFlexReal * remReal) * 100) / 100 
      : 0;
  }

  // Reconcile exact penny diff with activeReal
  const curReal = rows.reduce((s, r) => s + r.realisedCr, 0);
  const realDiff = Math.round((activeReal - curReal) * 100) / 100;
  if (realDiff !== 0 && rows.length > 0) {
    const targetRow = (flexRows.length > 0) 
      ? flexRows.reduce((max, r) => r.realisedCr > max.realisedCr ? r : max, flexRows[0])
      : rows.reduce((max, r) => r.realisedCr > max.realisedCr ? r : max, rows[0]);
    targetRow.realisedCr = Math.round((targetRow.realisedCr + realDiff) * 100) / 100;
  }

  // Calculate ABR and Collection Efficiency for each row
  for (const r of rows) {
    r.abr = r.billedMu > 0 ? Math.round(((r.assessmentCr * 10) / r.billedMu) * 100) / 100 : 0;
    r.collectionEff = r.assessmentCr > 0 ? Math.round(((r.realisedCr / r.assessmentCr) * 100) * 100) / 100 : 0;
  }

  return { discKey, rows };
}

function renderCategoryTable(data) {
  const tbody = document.getElementById('byCategoryBody');
  const tfoot = document.getElementById('byCategoryFoot');
  if (!tbody) return;

  const hintEl = document.getElementById('catTableHint');
  if (hintEl) {
    hintEl.innerHTML = `Tariff Category-wise breakdown from clean.supply_type_category · <b>Consumers &amp; Load snapshot as of ${state.monthTo} 2026</b>`;
  }

  const { discKey, rows } = getActiveCategoryData();

  let sorted = [...rows];
  if (state.categorySortCol) {
    const col = state.categorySortCol;
    const dir = state.categorySortDir;
    sorted.sort((a, b) => {
      const va = a[col];
      const vb = b[col];
      if (typeof va === 'string') return dir * va.localeCompare(vb);
      return dir * ((Number(va) || 0) - (Number(vb) || 0));
    });
  }

  if (!sorted.length) {
    tbody.innerHTML = `<tr><td colspan="10" style="text-align:center;padding:16px;color:var(--ink-3)">No category data available for current selection.</td></tr>`;
    if (tfoot) tfoot.innerHTML = '';
    return;
  }

  tbody.innerHTML = sorted.map(r => {
    const ceColor = r.collectionEff < 70 ? 'var(--crit)' : r.collectionEff < 90 ? 'var(--warn)' : 'var(--good)';
    return `
      <tr>
        <td class="tx" style="font-weight:600;color:var(--accent);">
          ${r.category}
          <span style="font-size:11px;color:var(--ink-3);font-weight:normal;margin-left:6px;">${r.desc}</span>
        </td>
        <td style="font-weight:600;">${fmt(r.billableConsumers)}</td>
        <td>${fmt(r.loadKw, 2)}</td>
        <td>${fmt(r.billedConsumers)}</td>
        <td title="Last pay date is of current month">${fmt(r.paidConsumers)}</td>
        <td>${fmt(r.billedMu, 2)}</td>
        <td>₹${fmt(r.assessmentCr, 2)}</td>
        <td>₹${fmt(r.realisedCr, 2)}</td>
        <td style="font-weight:600;">₹${fmt(r.abr, 2)}</td>
        <td style="font-weight:600;color:${ceColor};">${fmt(r.collectionEff, 2)}%</td>
      </tr>
    `;
  }).join('');

  if (tfoot) {
    let totBillable = 0, totLoad = 0, totBilled = 0, totPaid = 0;
    let totMu = 0, totAss = 0, totReal = 0;
    for (const r of rows) {
      totBillable += (r.billableConsumers || 0);
      totLoad += (r.loadKw || 0);
      totBilled += (r.billedConsumers || 0);
      totPaid += (r.paidConsumers || 0);
      totMu += (r.billedMu || 0);
      totAss += (r.assessmentCr || 0);
      totReal += (r.realisedCr || 0);
    }
    const totAbr = totMu > 0 ? (totAss * 10) / totMu : 0;
    const totCe = totAss > 0 ? (totReal / totAss) * 100 : (totReal > 0 ? 100 : 0);
    const ceColor = totCe < 70 ? 'var(--crit)' : totCe < 90 ? 'var(--warn)' : 'var(--good)';

    tfoot.innerHTML = `
      <tr class="grand">
        <td class="tx" style="font-weight:700;">Total (${discKey})</td>
        <td style="font-weight:700;">${fmt(totBillable)}</td>
        <td style="font-weight:700;">${fmt(totLoad, 2)}</td>
        <td style="font-weight:700;">${fmt(totBilled)}</td>
        <td style="font-weight:700;">${fmt(totPaid)}</td>
        <td style="font-weight:700;">${fmt(totMu, 2)}</td>
        <td style="font-weight:700;">₹${fmt(totAss, 2)}</td>
        <td style="font-weight:700;">₹${fmt(totReal, 2)}</td>
        <td style="font-weight:700;">₹${fmt(totAbr, 2)}</td>
        <td style="font-weight:700;color:${ceColor};">${fmt(totCe, 2)}%</td>
      </tr>
    `;
  }
}

function renderWorstFeeders(rows, totalAuditedAbove70) {
  const tbody = document.getElementById('wfTableBody');
  if (!tbody) return;
  const dParam = state.discom ? `&discom=${encodeURIComponent(state.discom)}` : '';
  const zParam = state.zone ? `&zone=${encodeURIComponent(state.zone)}` : '';
  const viewAllUrl = `feeder_drilldown.html?type=atc_loss&slab=Above%2070%25${dParam}${zParam}`;
  const viewAllLink = document.getElementById('wfViewAllLink');
  if (viewAllLink) viewAllLink.href = viewAllUrl;

  const hint = document.getElementById('wfTitleHint');
  if (hint) {
    hint.innerHTML = `Top 10 of <b>${fmt(totalAuditedAbove70)}</b> feeders in AT&amp;C &gt;70% slab · <a href="${viewAllUrl}" target="_blank" style="color:var(--accent);font-weight:600">View all in Feeder Explorer →</a>`;
  }

  if (!rows || !rows.length) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:16px;color:var(--ink-3)">No feeders found in &gt;70% slab for current selection.</td></tr>`;
    return;
  }

  let sorted = [...rows];
  if (state.wfSortCol) {
    const col = state.wfSortCol;
    const dir = state.wfSortDir;
    sorted.sort((a, b) => {
      const va = a[col];
      const vb = b[col];
      if (typeof va === 'string') return dir * (va || '').localeCompare(vb || '');
      return dir * ((Number(va) || 0) - (Number(vb) || 0));
    });
  }

  tbody.innerHTML = sorted.map((r, i) => {
    const drillUrl = `feeder_drilldown.html?type=atc_loss&slab=${encodeURIComponent('Above 70%')}&search=${encodeURIComponent(r.feeder).replace(/\+/g, '%2B')}`;
    return `
    <tr class="drill" onclick="window.open('${drillUrl}', '_blank')">
      <td class="tx" style="color:var(--ink-3)">${i + 1}</td>
      <td class="tx" style="font-weight:600">${r.discom}</td>
      <td class="tx">${r.zone}</td>
      <td class="tx">${r.substation}</td>
      <td class="tx" style="font-weight:600;color:var(--accent)">${r.feeder}</td>
      <td>${lossPill(r.ll, true)}</td>
      <td>${lossPill(r.atc, false)}</td>
      <td class="tx"><a href="${drillUrl}" target="_blank" style="color:var(--accent);text-decoration:none;font-weight:500;">Inspect →</a></td>
    </tr>
  `;
  }).join('');
}

function renderTop150Table(rows) {
  const tbody = document.getElementById('top150Body');
  if (!tbody) return;
  const countBadge = document.getElementById('top150CountBadge');
  if (countBadge) countBadge.textContent = `Top ${rows ? rows.length : 0} Feeders by Loss Value`;

  if (!rows || !rows.length) {
    tbody.innerHTML = `<tr><td colspan="12" style="text-align:center;padding:20px;color:var(--ink-3)">No feeders found matching selection.</td></tr>`;
    return;
  }

  let sorted = [...rows];
  if (state.top150SortCol) {
    const col = state.top150SortCol;
    const dir = state.top150SortDir;
    sorted.sort((a, b) => {
      const va = a[col];
      const vb = b[col];
      if (typeof va === 'string') return dir * (va || '').localeCompare(vb || '');
      return dir * ((Number(va) || 0) - (Number(vb) || 0));
    });
  }

  tbody.innerHTML = sorted.map((r, i) => {
    const targetSlab = r.atcSlab || 'Above 70%';
    const drillUrl = `feeder_drilldown.html?type=atc_loss&slab=${encodeURIComponent(targetSlab)}&search=${encodeURIComponent(r.feeder).replace(/\+/g, '%2B')}`;
    return `
    <tr class="drill" onclick="window.open('${drillUrl}', '_blank')">
      <td class="tx" style="color:var(--ink-3)">${i + 1}</td>
      <td class="tx">${r.division}</td>
      <td class="tx">${r.substation}</td>
      <td class="tx" style="font-weight:600;color:var(--accent)">${r.feeder}</td>
      <td class="tx"><span style="font-size:11px;color:var(--ink-2);">${r.feederType || '—'}</span></td>
      <td>${fmt(r.inputMu, 2)}</td>
      <td>${fmt(r.be, 1)}%</td>
      <td>${fmt(r.ce, 1)}%</td>
      <td>${lossPill(r.atc, false)}</td>
      <td>₹${fmt(r.fAbr, 2)}</td>
      <td>${thruRatePill(r.fTr)}</td>
      <td style="font-weight:700;color:var(--crit);">₹${fmt(r.atcLossValueCr, 2)}</td>
    </tr>
  `;
  }).join('');
}

function renderProgressiveSummaryTable(groups) {
  const tbody = document.getElementById('summaryTableBody');
  if (!tbody || !groups) return;

  const search = (state.tableSearch || '').trim().toLowerCase();
  const selectedZoneUpper = (state.zone || '').trim().toUpperCase();

  // Dynamic Period Label for Table Headers and Badge
  const isSingleMonth = state.monthFrom === state.monthTo;
  const isYtd = state.monthFrom === 'Apr';
  let periodTag = '';
  if (isSingleMonth) {
    periodTag = `Month: ${state.monthFrom}-26`;
  } else if (isYtd) {
    periodTag = state.monthTo === 'Oct' ? 'Progressive Upto Oct-26' : `Progressive Apr to ${state.monthTo}-26`;
  } else {
    periodTag = `Period: ${state.monthFrom} to ${state.monthTo}-26`;
  }

  const thLine = document.getElementById('thLineLossHeader');
  if (thLine) thLine.textContent = `LINE LOSS SLAB (${periodTag.toUpperCase()})`;
  const thAtc = document.getElementById('thAtcLossHeader');
  if (thAtc) thAtc.textContent = `AT&C LOSS SLAB (${periodTag.toUpperCase()})`;

  const badgePeriod = document.getElementById('summaryPeriodBadge');
  if (badgePeriod) badgePeriod.textContent = periodTag;

  // Filter groups
  let filtered = [...groups];

  // Exact zone match if state.zone is active (AGRA NEVER matches PRAYAGRAJ!)
  if (selectedZoneUpper) {
    filtered = filtered.filter(r => r.zone && r.zone.trim().toUpperCase() === selectedZoneUpper);
  }

  if (search) {
    filtered = filtered.filter(r =>
      (r.discom && r.discom.toLowerCase().includes(search)) ||
      (r.zone && r.zone.toLowerCase().includes(search))
    );
  }

  // Calculate totals by Discom and Grand Total
  const discomTotalsMap = new Map();
  const grandTotal = {
    discom: 'UPPCL', zone: 'Statewide Total', total_feeders: 0,
    line_0_5: 0, line_5_10: 0, line_10_20: 0, line_20_30: 0,
    line_30_50: 0, line_50_70: 0, line_above_70: 0, line_abnormal: 0,
    atc_0_5: 0, atc_5_10: 0, atc_10_20: 0, atc_20_30: 0,
    atc_30_50: 0, atc_50_70: 0, atc_above_70: 0, atc_abnormal: 0,
    ie_zero: 0, no_consumers_tagged: 0, row_type: 3
  };

  const cols = [
    'total_feeders', 'line_0_5', 'line_5_10', 'line_10_20', 'line_20_30',
    'line_30_50', 'line_50_70', 'line_above_70', 'line_abnormal',
    'atc_0_5', 'atc_5_10', 'atc_10_20', 'atc_20_30',
    'atc_30_50', 'atc_50_70', 'atc_above_70', 'atc_abnormal',
    'ie_zero', 'no_consumers_tagged'
  ];

  filtered.forEach(r => {
    if (!discomTotalsMap.has(r.discom)) {
      discomTotalsMap.set(r.discom, {
        discom: r.discom, zone: `${r.discom} Total`, row_type: 2
      });
      cols.forEach(c => discomTotalsMap.get(r.discom)[c] = 0);
    }
    const dt = discomTotalsMap.get(r.discom);
    cols.forEach(c => {
      const v = Number(r[c]) || 0;
      dt[c] += v;
      grandTotal[c] += v;
    });
  });

  // Sort zone rows if requested
  if (state.sortCol) {
    const col = state.sortCol;
    const dir = state.sortDir;
    filtered.sort((a, b) => {
      const va = a[col];
      const vb = b[col];
      if (typeof va === 'string') return dir * (va || '').localeCompare(vb || '');
      return dir * ((Number(va) || 0) - (Number(vb) || 0));
    });
  }

  // Assemble final rows with collapsible Discom total headers
  let html = '';

  const discomOrder = ['PASCHIMANCHAL', 'DAKSHINANCHAL', 'MADHYANCHAL', 'POORVANCHAL', 'KESCO'];
  let discomsPresent = [...new Set(filtered.map(r => r.discom))];
  if (state.sortCol === 'discom') {
    discomsPresent.sort((a, b) => state.sortDir * a.localeCompare(b));
  } else {
    discomsPresent.sort((a, b) => {
      const ia = discomOrder.indexOf(a), ib = discomOrder.indexOf(b);
      return (ia >= 0 ? ia : 99) - (ib >= 0 ? ib : 99);
    });
  }

  for (const dName of discomsPresent) {
    const dt = discomTotalsMap.get(dName);
    const zRows = filtered.filter(r => r.discom === dName);
    const isExpanded = state.expandedDiscoms.has(dName) || Boolean(selectedZoneUpper);
    const icon = isExpanded ? '▼' : '▶';

    // Discom Total row
    html += `
      <tr class="tot">
        <td class="tx" onclick="toggleDiscomGroup('${dName}')" style="cursor:pointer;" title="Click to ${isExpanded ? 'fold' : 'unfold'} ${dName}"><span class="toggle-btn">${icon}</span> <b>${dName}</b></td>
        <td class="tx" onclick="toggleDiscomGroup('${dName}')" style="cursor:pointer;" title="Click to ${isExpanded ? 'fold' : 'unfold'} ${dName}"><b>${dName} Total</b></td>
        <td><b>${fmt(dt.total_feeders)}</b></td>
        <td>${fmt(dt.line_0_5)}</td><td>${fmt(dt.line_5_10)}</td><td>${fmt(dt.line_10_20)}</td><td>${fmt(dt.line_20_30)}</td>
        <td>${fmt(dt.line_30_50)}</td><td>${fmt(dt.line_50_70)}</td><td>${fmt(dt.line_above_70)}</td><td>${fmt(dt.line_abnormal)}</td>
        <td>${fmt(dt.atc_0_5)}</td><td>${fmt(dt.atc_5_10)}</td><td>${fmt(dt.atc_10_20)}</td><td>${fmt(dt.atc_20_30)}</td>
        <td>${fmt(dt.atc_30_50)}</td><td>${fmt(dt.atc_50_70)}</td><td>${fmt(dt.atc_above_70)}</td><td>${fmt(dt.atc_abnormal)}</td>
        <td>${fmt(dt.ie_zero)}</td><td>${fmt(dt.no_consumers_tagged)}</td>
      </tr>
    `;

    // Zone rows
    if (isExpanded) {
      for (const r of zRows) {
        html += `
          <tr class="drill">
            <td class="tx" style="padding-left:22px;color:var(--ink-2)">${r.discom}</td>
            <td class="tx" style="font-weight:600">${r.zone}</td>
            <td>${fmt(r.total_feeders)}</td>
            <td>${fmt(r.line_0_5)}</td><td>${fmt(r.line_5_10)}</td><td>${fmt(r.line_10_20)}</td><td>${fmt(r.line_20_30)}</td>
            <td>${fmt(r.line_30_50)}</td><td>${fmt(r.line_50_70)}</td><td>${fmt(r.line_above_70)}</td><td>${fmt(r.line_abnormal)}</td>
            <td>${fmt(r.atc_0_5)}</td><td>${fmt(r.atc_5_10)}</td><td>${fmt(r.atc_10_20)}</td><td>${fmt(r.atc_20_30)}</td>
            <td>${fmt(r.atc_30_50)}</td><td>${fmt(r.atc_50_70)}</td><td>${fmt(r.atc_above_70)}</td><td>${fmt(r.atc_abnormal)}</td>
            <td>${fmt(r.ie_zero)}</td><td>${fmt(r.no_consumers_tagged)}</td>
          </tr>
        `;
      }
    }
  }

  // Grand Total row (only when displaying multi-discom / All of UPPCL)
  if (!state.discom && !selectedZoneUpper && grandTotal.total_feeders > 0) {
    html += `
      <tr class="grand">
        <td class="tx"><b>UPPCL</b></td>
        <td class="tx"><b>Statewide Total</b></td>
        <td><b>${fmt(grandTotal.total_feeders)}</b></td>
        <td>${fmt(grandTotal.line_0_5)}</td><td>${fmt(grandTotal.line_5_10)}</td><td>${fmt(grandTotal.line_10_20)}</td><td>${fmt(grandTotal.line_20_30)}</td>
        <td>${fmt(grandTotal.line_30_50)}</td><td>${fmt(grandTotal.line_50_70)}</td><td>${fmt(grandTotal.line_above_70)}</td><td>${fmt(grandTotal.line_abnormal)}</td>
        <td>${fmt(grandTotal.atc_0_5)}</td><td>${fmt(grandTotal.atc_5_10)}</td><td>${fmt(grandTotal.atc_10_20)}</td><td>${fmt(grandTotal.atc_20_30)}</td>
        <td>${fmt(grandTotal.atc_30_50)}</td><td>${fmt(grandTotal.atc_50_70)}</td><td>${fmt(grandTotal.atc_above_70)}</td><td>${fmt(grandTotal.atc_abnormal)}</td>
        <td>${fmt(grandTotal.ie_zero)}</td><td>${fmt(grandTotal.no_consumers_tagged)}</td>
      </tr>
    `;
  }

  tbody.innerHTML = html || `<tr><td colspan="21" style="text-align:center;padding:20px;color:var(--ink-3)">No matching zones found.</td></tr>`;

  const hintEl = document.getElementById('summaryTableHint');
  if (hintEl) {
    const totalCount = grandTotal.total_feeders > 0 ? fmt(grandTotal.total_feeders) : '26,655';
    hintEl.innerHTML = `Feeder count distribution across loss slabs for <b>${periodTag}</b> (${totalCount} total feeders) · Click column headers to sort · Click ▶ on Discom row to unfold/fold zones`;
  }

  const btnToggleLbl = document.getElementById('lblToggleAllDiscoms');
  if (btnToggleLbl && discomsPresent.length > 0) {
    const allExpanded = discomsPresent.every(d => state.expandedDiscoms.has(d));
    btnToggleLbl.textContent = allExpanded ? '▼ Fold All' : '▶ Unfold All';
  }

  // renderProgressiveSummaryChart(groups); // [Retained for future use]
}

// ── Progressive Summary Chart (100% stacked slab mix by Discom / Zone) ──
const PS_SLABS = [
  { key: '0_5',      label: '0-5%',     color: '#1a7f37' },
  { key: '5_10',     label: '5-10%',    color: '#5aa95f' },
  { key: '10_20',    label: '10-20%',   color: '#a9c96a' },
  { key: '20_30',    label: '20-30%',   color: '#f2c94c' },
  { key: '30_50',    label: '30-50%',   color: '#f2994a' },
  { key: '50_70',    label: '50-70%',   color: '#e0603a' },
  { key: 'above_70', label: '>70%',     color: '#b3261e' },
  { key: 'abnormal', label: 'Abnormal', color: '#8e9aa8' }
];
const PS_DISCOM_ORDER = ['PASCHIMANCHAL', 'DAKSHINANCHAL', 'MADHYANCHAL', 'POORVANCHAL', 'KESCO'];
const PS_DISCOM_SHORT = {
  'PASCHIMANCHAL': 'PV',
  'DAKSHINANCHAL': 'DV',
  'MADHYANCHAL': 'MV',
  'POORVANCHAL': 'PuV',
  'KESCO': 'Ksco',
  'PVVNL': 'PV',
  'DVVNL': 'DV',
  'MVVNL': 'MV',
  'PUVVNL': 'PuV'
};
const getPsDiscomShort = d => {
  if (!d) return '';
  const u = d.trim().toUpperCase();
  if (PS_DISCOM_SHORT[u]) return PS_DISCOM_SHORT[u];
  if (u.includes('POORV') || u.includes('PURV') || u.includes('PUV')) return 'PuV';
  if (u.includes('PASCHIM') || u.includes('PVV')) return 'PV';
  if (u.includes('MADHYA') || u.includes('MVV')) return 'MV';
  if (u.includes('DAKSHIN') || u.includes('DVV')) return 'DV';
  if (u.includes('KESCO')) return 'Ksco';
  return u.slice(0, 4);
};

function renderProgressiveSummaryChart(groups) {
  const canvas = document.getElementById('chartProgressiveSummary');
  if (!canvas || !groups || typeof Chart === 'undefined') return;

  const loss = state.psChartLoss === 'line' ? 'line' : 'atc';
  const isPct = state.psChartMode !== 'count';
  const search = (state.tableSearch || '').trim().toLowerCase();
  const selectedZoneUpper = (state.zone || '').trim().toUpperCase();

  // Same filtering as the summary table
  let rows = [...groups];
  if (selectedZoneUpper) {
    rows = rows.filter(r => r.zone && r.zone.trim().toUpperCase() === selectedZoneUpper);
  }
  if (search) {
    rows = rows.filter(r =>
      (r.discom && r.discom.toLowerCase().includes(search)) ||
      (r.zone && r.zone.toLowerCase().includes(search))
    );
  }

  const dRank = d => { const i = PS_DISCOM_ORDER.indexOf(d); return i >= 0 ? i : 99; };
  const slabCols = PS_SLABS.map(s => `${loss}_${s.key}`);

  // Decide entities to plot
  const focus = state.psChartFocus;
  const zoneView = state.psChartView === 'zone' || !!focus || !!selectedZoneUpper;
  let entities = [];

  if (zoneView) {
    let zr = focus ? rows.filter(r => r.discom === focus) : rows;
    zr = [...zr].sort((a, b) => dRank(a.discom) - dRank(b.discom) || (a.zone || '').localeCompare(b.zone || ''));
    entities = zr.map(r => ({
      label: focus ? r.zone : `${r.zone} (${getPsDiscomShort(r.discom)})`,
      discom: r.discom,
      isTotal: false,
      vals: slabCols.map(c => Number(r[c]) || 0),
      feeders: Number(r.total_feeders) || 0
    }));
  } else {
    const map = new Map();
    rows.forEach(r => {
      if (!map.has(r.discom)) {
        map.set(r.discom, {
          label: r.discom,
          discom: r.discom,
          isTotal: false,
          vals: new Array(PS_SLABS.length).fill(0),
          feeders: 0
        });
      }
      const e = map.get(r.discom);
      slabCols.forEach((c, i) => { e.vals[i] += Number(r[c]) || 0; });
      e.feeders += Number(r.total_feeders) || 0;
    });
    entities = [...map.values()].sort((a, b) => dRank(a.discom) - dRank(b.discom));
    if (entities.length > 1 && !state.discom && !selectedZoneUpper) {
      entities.push({
        label: 'UPPCL (Statewide)',
        discom: '',
        isTotal: true,
        vals: PS_SLABS.map((_, i) => entities.reduce((s, e) => s + e.vals[i], 0)),
        feeders: entities.reduce((s, e) => s + e.feeders, 0)
      });
    }
  }

  const sums = entities.map(e => e.vals.reduce((a, b) => a + b, 0));
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const borderSepCol = isDark ? 'rgba(26, 31, 39, 0.8)' : 'rgba(255, 255, 255, 0.7)';

  const datasets = PS_SLABS.map((s, i) => ({
    label: s.label,
    backgroundColor: s.color,
    borderColor: borderSepCol,
    borderWidth: { right: 1, top: 0, bottom: 0, left: 0 },
    data: entities.map((e, k) => isPct ? (sums[k] ? +(e.vals[i] * 100 / sums[k]).toFixed(2) : 0) : e.vals[i]),
    _counts: entities.map(e => e.vals[i]),
    barPercentage: 0.82,
    categoryPercentage: 0.9
  }));

  // Size the container dynamically to the number of bars
  const wrap = document.getElementById('psChartWrap');
  if (wrap) {
    wrap.style.height = `${Math.max(260, entities.length * 32 + 90)}px`;
  }

  // Header hint + back button
  const hint = document.getElementById('psChartHint');
  const periodText = state.monthTo ? `Progressive Upto ${state.monthTo}-26` : 'Progressive';
  const lossName = loss === 'atc' ? 'AT&C' : 'Line';
  const metricName = isPct ? 'Share of feeders' : 'Number of feeders';

  if (hint) {
    if (focus) {
      hint.textContent = `${focus} — Zone-wise ${lossName} loss slab mix (${periodText})`;
    } else if (zoneView) {
      hint.textContent = `${metricName} in each ${lossName} loss slab by Zone (${periodText})`;
    } else {
      hint.textContent = `${metricName} in each ${lossName} loss slab (${periodText}) · Click a Discom bar to see its zones`;
    }
  }

  const back = document.getElementById('psChartBack');
  if (back) {
    back.style.display = focus ? 'inline-flex' : 'none';
  }

  const gridCol = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
  const textCol = isDark ? '#b3bcc9' : '#4d5766';
  const boldTextCol = isDark ? '#eef1f5' : '#141a22';

  const opts = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 250 },
    interaction: {
      mode: 'index',
      axis: 'y',
      intersect: false
    },
    plugins: {
      legend: {
        position: 'top',
        align: 'center',
        labels: {
          boxWidth: 12,
          boxHeight: 12,
          padding: 14,
          color: textCol,
          font: { family: '"IBM Plex Sans", system-ui, -apple-system, sans-serif', size: 11, weight: '500' }
        }
      },
      tooltip: {
        mode: 'index',
        axis: 'y',
        intersect: false,
        backgroundColor: isDark ? '#1a1f27' : '#141a22',
        titleColor: '#ffffff',
        bodyColor: '#eef1f5',
        borderColor: isDark ? '#2c333e' : '#4d5766',
        borderWidth: 1,
        padding: 10,
        cornerRadius: 6,
        callbacks: {
          title: items => {
            if (!items || !items.length) return '';
            const idx = items[0].dataIndex !== undefined ? items[0].dataIndex : items[0].index;
            const e = entities[idx];
            return e ? `${e.label} · ${e.feeders.toLocaleString('en-IN')} feeders` : '';
          },
          label: c => {
            const idx = c.dataIndex !== undefined ? c.dataIndex : c.index;
            const cnt = c.dataset._counts ? c.dataset._counts[idx] : (c.raw || 0);
            const tot = sums[idx] || 0;
            const pct = tot ? (cnt * 100 / tot).toFixed(1) : '0.0';
            return ` ${c.dataset.label}: ${cnt.toLocaleString('en-IN')} (${pct}%)`;
          },
          footer: items => {
            if (!items || !items.length) return '';
            const idx = items[0].dataIndex !== undefined ? items[0].dataIndex : items[0].index;
            const e = entities[idx];
            if (zoneView || !e || e.isTotal) return '';
            return '👉 Click bar to view zones';
          }
        }
      }
    },
    scales: {
      x: {
        stacked: true,
        min: 0,
        max: isPct ? 100 : undefined,
        grid: { color: gridCol },
        ticks: {
          color: textCol,
          font: { family: '"IBM Plex Sans", system-ui, -apple-system, sans-serif', size: 11 },
          callback: v => isPct ? v + '%' : Number(v).toLocaleString('en-IN')
        }
      },
      y: {
        stacked: true,
        grid: { display: false },
        ticks: {
          color: ctx => {
            const isTotal = entities[ctx.index] && entities[ctx.index].isTotal;
            return isTotal ? boldTextCol : textCol;
          },
          autoSkip: false,
          font: ctx => {
            const isTotal = entities[ctx.index] && entities[ctx.index].isTotal;
            return {
              family: '"IBM Plex Sans", system-ui, -apple-system, sans-serif',
              size: isTotal ? 11.5 : 11,
              weight: isTotal ? '700' : '500'
            };
          }
        }
      }
    },
    onClick: (evt, els) => {
      if (!els || !els.length || zoneView) return;
      const idx = els[0].index !== undefined ? els[0].index : els[0].dataIndex;
      const e = entities[idx];
      if (!e || e.isTotal) return;
      state.psChartFocus = e.discom;
      // Defer the re-render with setTimeout to avoid Chart.js error inside its own click handler
      setTimeout(() => {
        if (computedResult) {
          renderProgressiveSummaryChart(computedResult.progressiveSummary);
        }
      }, 0);
    },
    onHover: (evt, els) => {
      const chartCanvas = evt.chart?.canvas || evt.native?.target;
      const idx = els && els.length ? (els[0].index !== undefined ? els[0].index : els[0].dataIndex) : -1;
      const clickable = !zoneView && idx >= 0 && entities[idx] && !entities[idx].isTotal;
      if (chartCanvas) {
        chartCanvas.style.cursor = clickable ? 'pointer' : 'default';
      }
    }
  };

  if (chartProgSummary) {
    chartProgSummary.destroy();
  }
  chartProgSummary = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: entities.map(e => e.label),
      datasets
    },
    options: opts
  });
}

function initProgressiveSummaryChartControls() {
  const bind = (attr, stateKey, after) => {
    document.querySelectorAll(`[${attr}]`).forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll(`[${attr}]`).forEach(b => {
          b.setAttribute('aria-pressed', 'false');
          b.classList.remove('active');
        });
        btn.setAttribute('aria-pressed', 'true');
        btn.classList.add('active');
        state[stateKey] = btn.getAttribute(attr);
        if (after) after();
        if (computedResult) {
          renderProgressiveSummaryChart(computedResult.progressiveSummary);
        }
      });
    });
  };
  bind('data-ps-loss', 'psChartLoss');
  bind('data-ps-mode', 'psChartMode');
  bind('data-ps-view', 'psChartView', () => {
    state.psChartFocus = '';
  });

  const back = document.getElementById('psChartBack');
  if (back) {
    back.addEventListener('click', () => {
      state.psChartFocus = '';
      state.psChartView = 'discom';
      document.querySelectorAll('[data-ps-view]').forEach(b => {
        const isDisc = b.getAttribute('data-ps-view') === 'discom';
        b.setAttribute('aria-pressed', isDisc ? 'true' : 'false');
        if (isDisc) b.classList.add('active'); else b.classList.remove('active');
      });
      if (computedResult) {
        renderProgressiveSummaryChart(computedResult.progressiveSummary);
      }
    });
  }
}


window.toggleDiscomGroup = function(discom) {
  if (state.expandedDiscoms.has(discom)) {
    state.expandedDiscoms.delete(discom);
  } else {
    state.expandedDiscoms.add(discom);
  }
  if (computedResult) {
    renderProgressiveSummaryTable(computedResult.progressiveSummary);
  }
};

window.toggleAllDiscoms = function() {
  if (!computedResult || !computedResult.progressiveSummary) return;
  const allDiscoms = [...new Set(computedResult.progressiveSummary.map(r => r.discom))];
  const allExpanded = allDiscoms.length > 0 && allDiscoms.every(d => state.expandedDiscoms.has(d));
  if (allExpanded) {
    state.expandedDiscoms.clear();
  } else {
    allDiscoms.forEach(d => state.expandedDiscoms.add(d));
  }
  renderProgressiveSummaryTable(computedResult.progressiveSummary);
};

// ── Filter Chips ──
function renderChips() {
  const chipContainer = document.getElementById('chipRow');
  if (!chipContainer) return;
  const chips = [];

  if (state.discom) chips.push({ label: `Discom: ${state.discom}`, clear: () => { state.discom = ''; document.getElementById('fDiscom').value = ''; } });
  if (state.zone) chips.push({ label: `Zone: ${state.zone}`, clear: () => { state.zone = ''; document.getElementById('fZone').value = ''; } });
  if (state.circle) chips.push({ label: `Circle: ${state.circle}`, clear: () => { state.circle = ''; document.getElementById('fCircle').value = ''; } });
  if (state.division) chips.push({ label: `Division: ${state.division}`, clear: () => { state.division = ''; document.getElementById('fDivision').value = ''; } });
  if (state.area) chips.push({ label: `Area: ${state.area}`, clear: () => { state.area = ''; document.getElementById('fArea').value = ''; } });
  if (state.feederType) chips.push({ label: `Type: ${state.feederType}`, clear: () => { state.feederType = ''; document.getElementById('fFeederType').value = ''; } });
  if (state.monthFrom !== 'Apr' || state.monthTo !== 'Oct') {
    const isSingle = state.monthFrom === state.monthTo;
    const mLabel = isSingle
      ? `📅 Single Month: ${state.monthFrom} 2026`
      : (state.monthFrom === 'Apr' ? `📈 Progressive: Apr to ${state.monthTo} 2026` : `📈 Progressive: ${state.monthFrom} to ${state.monthTo} 2026`);
    chips.push({ label: mLabel, clear: () => { state.monthFrom = 'Apr'; state.monthTo = 'Sep'; document.getElementById('fMonthFrom').value = 'Apr'; document.getElementById('fMonthTo').value = 'Oct'; } });
  }
  if (state.search) chips.push({ label: `Search: "${state.search}"`, clear: () => { state.search = ''; document.getElementById('fSearch').value = ''; } });
  if (state.excludeAbnormal) chips.push({ label: 'Excl: Abnormal Assessment', clear: () => { state.excludeAbnormal = false; document.getElementById('chkAbnormal').checked = false; onFilterChanged(); } });
  if (state.excludeBilledGtInput) chips.push({ label: 'Excl: Billed > Input', clear: () => { state.excludeBilledGtInput = false; document.getElementById('chkBilledGtInput').checked = false; onFilterChanged(); } });
  if (state.includePtw) chips.push({ label: 'PTW: Included', clear: () => { state.includePtw = false; const c = document.getElementById('chkIncludePtw'); if (c) c.checked = false; updateAuditBadges(); onFilterChanged(); } });
  if (!state.includeGovt) chips.push({ label: 'Govt Deemed: Excluded (Cash Only)', clear: () => { state.includeGovt = true; const c = document.getElementById('chkIncludeGovt'); if (c) c.checked = true; updateAuditBadges(); onFilterChanged(); } });
  if (state.includeSubsidy) chips.push({ label: 'Subsidy: Included', clear: () => { state.includeSubsidy = false; const c = document.getElementById('chkIncludeSubsidy'); if (c) c.checked = false; updateAuditBadges(); onFilterChanged(); } });

  chipContainer.innerHTML = chips.map((c, i) => `
    <div class="chip">
      <span>${c.label}</span>
      <button type="button" onclick="removeChip(${i})" title="Remove filter">✕</button>
    </div>
  `).join('');

  window.__activeChips = chips;
}

window.removeChip = function(index) {
  if (window.__activeChips && window.__activeChips[index]) {
    window.__activeChips[index].clear();
    syncCascadeDropdowns();
    onFilterChanged();
  }
};

// ── Master Filter Trigger Function ──
function onFilterChanged() {
  updateAuditBadges();
  renderChips();
  computedResult = calculateMetrics();
  if (!computedResult) return;

  renderKpis(computedResult.kpis);
  renderMonthlyCharts(computedResult.monthly);
  renderSlabCharts(computedResult.lineSlabs, computedResult.atcSlabs);
  renderFeederTypeBreakdown(computedResult.feederTypeBreakdown);
  renderPerformanceLeagueTable(computedResult.usedFeeders);
  if (typeof window.renderCategoryTable === 'function') window.renderCategoryTable();
  renderWorstFeeders(computedResult.worst10, computedResult.atcSlabs['Above 70%']);
  renderTop150Table(computedResult.top150);
  renderProgressiveSummaryTable(computedResult.progressiveSummary);
}
window.onFilterChanged = onFilterChanged;

// ── Event Listeners ──

// Discom change
document.getElementById('fDiscom').addEventListener('change', function() {
  state.discom = this.value;
  state.zone = '';
  state.circle = '';
  state.division = '';
  syncCascadeDropdowns();
  onFilterChanged();
});

// Zone change
document.getElementById('fZone').addEventListener('change', function() {
  state.zone = this.value;
  state.circle = '';
  state.division = '';
  syncCascadeDropdowns();
  onFilterChanged();
});

// Circle change
document.getElementById('fCircle').addEventListener('change', function() {
  state.circle = this.value;
  state.division = '';
  syncCascadeDropdowns();
  onFilterChanged();
});

// Division change
document.getElementById('fDivision').addEventListener('change', function() {
  state.division = this.value;
  onFilterChanged();
});

// Area change
document.getElementById('fArea').addEventListener('change', function() {
  state.area = this.value;
  onFilterChanged();
});

// Feeder Type change
document.getElementById('fFeederType').addEventListener('change', function() {
  state.feederType = this.value;
  onFilterChanged();
});

// Months range
document.getElementById('fMonthFrom').addEventListener('change', function() {
  state.monthFrom = this.value;
  const i0 = MON_INDEX[state.monthFrom] ?? 0;
  const i1 = MON_INDEX[state.monthTo] ?? 6;
  if (i0 > i1) {
    state.monthTo = state.monthFrom;
    document.getElementById('fMonthTo').value = state.monthTo;
  }
  onFilterChanged();
});

document.getElementById('fMonthTo').addEventListener('change', function() {
  state.monthTo = this.value;
  const i0 = MON_INDEX[state.monthFrom] ?? 0;
  const i1 = MON_INDEX[state.monthTo] ?? 6;
  if (i1 < i0) {
    state.monthFrom = state.monthTo;
    document.getElementById('fMonthFrom').value = state.monthFrom;
  }
  onFilterChanged();
});

// Checkboxes
document.getElementById('chkAbnormal').addEventListener('change', function() {
  state.excludeAbnormal = this.checked;
  onFilterChanged();
});

document.getElementById('chkBilledGtInput').addEventListener('change', function() {
  state.excludeBilledGtInput = this.checked;
  onFilterChanged();
});

const chkIncludePtw = document.getElementById('chkIncludePtw');
if (chkIncludePtw) {
  chkIncludePtw.addEventListener('change', function() {
    state.includePtw = this.checked;
    updatePtwBadge(this.checked);
    onFilterChanged();
  });
}

const chkIncludeGovt = document.getElementById('chkIncludeGovt');
if (chkIncludeGovt) {
  chkIncludeGovt.addEventListener('change', function() {
    state.includeGovt = this.checked;
    onFilterChanged();
  });
}

const chkExcludeCdf = document.getElementById('chkExcludeCdf');
if (chkExcludeCdf) {
  chkExcludeCdf.addEventListener('change', function() {
    state.excludeCdf = this.checked;
    onFilterChanged();
  });
}

const chkIncludeSubsidy = document.getElementById('chkIncludeSubsidy');
if (chkIncludeSubsidy) {
  chkIncludeSubsidy.addEventListener('change', function() {
    state.includeSubsidy = this.checked;
    onFilterChanged();
  });
}

// Methodology Modal Wiring
const btnMethodology = document.getElementById('btnMethodology');
const modalMethodology = document.getElementById('methodologyModal');
const modalCloseBtn = document.getElementById('modalCloseBtn');
if (btnMethodology && modalMethodology) {
  btnMethodology.addEventListener('click', () => modalMethodology.classList.add('active'));
}
if (modalCloseBtn && modalMethodology) {
  modalCloseBtn.addEventListener('click', () => modalMethodology.classList.remove('active'));
}
if (modalMethodology) {
  modalMethodology.addEventListener('click', (e) => {
    if (e.target === modalMethodology) modalMethodology.classList.remove('active');
  });
}

// Filter Guide Modal Wiring
const btnFilterGuide = document.getElementById('btnFilterGuide');
const modalFilterGuide = document.getElementById('filterGuideModal');
const filterGuideCloseBtn = document.getElementById('filterGuideCloseBtn');
if (btnFilterGuide && modalFilterGuide) {
  btnFilterGuide.addEventListener('click', () => modalFilterGuide.classList.add('active'));
}
if (filterGuideCloseBtn && modalFilterGuide) {
  filterGuideCloseBtn.addEventListener('click', () => modalFilterGuide.classList.remove('active'));
}
if (modalFilterGuide) {
  modalFilterGuide.addEventListener('click', (e) => {
    if (e.target === modalFilterGuide) modalFilterGuide.classList.remove('active');
  });
}

// Feeder Search (debounced)
let searchTimeout = null;
document.getElementById('fSearch').addEventListener('input', function() {
  clearTimeout(searchTimeout);
  state.search = this.value.trim();
  renderChips();
  searchTimeout = setTimeout(() => {
    onFilterChanged();
  }, 150);
});

// Table Search (summary table)
document.getElementById('tSearch').addEventListener('input', function() {
  const prevSearch = state.tableSearch;
  state.tableSearch = this.value.trim();
  if (state.tableSearch) {
    const q = state.tableSearch.toLowerCase();
    if (computedResult && computedResult.progressiveSummary) {
      computedResult.progressiveSummary.forEach(r => {
        if ((r.zone && r.zone.toLowerCase().includes(q)) || (r.discom && r.discom.toLowerCase().includes(q))) {
          state.expandedDiscoms.add(r.discom);
        }
      });
    }
  } else if (prevSearch && !state.tableSearch) {
    state.expandedDiscoms.clear();
  }
  if (computedResult) {
    renderProgressiveSummaryTable(computedResult.progressiveSummary);
  }
});

const btnToggleAll = document.getElementById('btnToggleAllDiscoms');
if (btnToggleAll) {
  btnToggleAll.addEventListener('click', window.toggleAllDiscoms);
}

// Horizontal Slab Bar toggle
document.querySelectorAll('[data-hbar]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('[data-hbar]').forEach(b => b.setAttribute('aria-pressed', 'false'));
    btn.setAttribute('aria-pressed', 'true');
    state.hBarType = btn.getAttribute('data-hbar');
    if (computedResult) {
      renderHBar(computedResult.atcSlabs, computedResult.lineSlabs);
    }
  });
});

// Feeder Type / Area category toggle
document.querySelectorAll('[data-ft-toggle]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('[data-ft-toggle]').forEach(b => b.setAttribute('aria-pressed', 'false'));
    btn.setAttribute('aria-pressed', 'true');
    state.ftBarGroup = btn.getAttribute('data-ft-toggle');
    if (computedResult) {
      renderFeederTypeBreakdown(computedResult.feederTypeBreakdown);
    }
  });
});

// Reset Button
function resetFilters() {
  state.discom = '';
  state.zone = '';
  state.circle = '';
  state.division = '';
  state.area = '';
  state.feederType = '';
  state.monthFrom = 'Apr';
  state.monthTo = 'Oct';
  state.search = '';
  state.tableSearch = '';
  state.excludeAbnormal = false;
  state.excludeBilledGtInput = false;
  state.includePtw = false;
  state.includeGovt = true;
  state.includeSubsidy = false;
  state.sortCol = null;
  state.sortDir = 1;
  state.discomSortCol = null;
  state.discomSortDir = -1;
  state.leagueManualLevel = null;
  state.leagueSortCol = 'atcLossValueCr';
  state.leagueSortDir = -1;
  state.categorySortCol = 'consumers';
  state.categorySortDir = -1;
  state.catTableGroup = 'feederType';
  state.top150SortCol = 'atcLossValueCr';
  state.top150SortDir = -1;
  state.wfSortCol = 'atc';
  state.wfSortDir = -1;
  state.expandedDiscoms.clear();

  document.getElementById('fDiscom').value = '';
  document.getElementById('fZone').value = '';
  document.getElementById('fCircle').value = '';
  document.getElementById('fDivision').value = '';
  document.getElementById('fArea').value = '';
  document.getElementById('fFeederType').value = '';
  document.getElementById('fMonthFrom').value = 'Apr';
  document.getElementById('fMonthTo').value = 'Oct';
  document.getElementById('fSearch').value = '';
  document.getElementById('tSearch').value = '';
  // Reset psChart controls
  state.psChartFocus = '';
  state.psChartLoss = 'atc';
  state.psChartView = 'discom';
  state.psChartMode = 'pct';
  document.querySelectorAll('[data-ps-loss]').forEach(b => {
    const isAtc = b.getAttribute('data-ps-loss') === 'atc';
    b.setAttribute('aria-pressed', isAtc ? 'true' : 'false');
    if (isAtc) b.classList.add('active'); else b.classList.remove('active');
  });
  document.querySelectorAll('[data-ps-view]').forEach(b => {
    const isDisc = b.getAttribute('data-ps-view') === 'discom';
    b.setAttribute('aria-pressed', isDisc ? 'true' : 'false');
    if (isDisc) b.classList.add('active'); else b.classList.remove('active');
  });
  document.querySelectorAll('[data-ps-mode]').forEach(b => {
    const isPct = b.getAttribute('data-ps-mode') === 'pct';
    b.setAttribute('aria-pressed', isPct ? 'true' : 'false');
    if (isPct) b.classList.add('active'); else b.classList.remove('active');
  });
  document.getElementById('chkAbnormal').checked = false;
  document.getElementById('chkBilledGtInput').checked = false;
  const cPtw = document.getElementById('chkIncludePtw'); if (cPtw) cPtw.checked = false;
  const cGovt = document.getElementById('chkIncludeGovt'); if (cGovt) cGovt.checked = true;
  const cCdf = document.getElementById('chkExcludeCdf'); if (cCdf) cCdf.checked = false;
  const cSub = document.getElementById('chkIncludeSubsidy'); if (cSub) cSub.checked = false;
  updateAuditBadges();

  // Reset visual sort header states
  document.querySelectorAll('th.sorted').forEach(t => t.classList.remove('sorted'));
  document.querySelectorAll('th .sort-ico').forEach(ico => ico.textContent = '↕');
  const dDef = document.querySelector('#top150Table th[data-t150col="atcLossValueCr"]');
  if (dDef) {
    dDef.classList.add('sorted');
    const ico = dDef.querySelector('.sort-ico');
    if (ico) ico.textContent = '▼';
  }
  const wDef = document.querySelector('#wfTable th[data-wfcol="atc"]');
  if (wDef) {
    wDef.classList.add('sorted');
    const ico = wDef.querySelector('.sort-ico');
    if (ico) ico.textContent = '▼';
  }
  const cDef = document.querySelector('#tblByCategory th[data-ccol="consumers"]');
  if (cDef) {
    cDef.classList.add('sorted');
    const ico = cDef.querySelector('.sort-ico');
    if (ico) ico.textContent = '▼';
  }
  document.querySelectorAll('[data-cat-toggle]').forEach(b => {
    b.setAttribute('aria-pressed', b.getAttribute('data-cat-toggle') === 'feederType' ? 'true' : 'false');
  });

  syncCascadeDropdowns();
  onFilterChanged();
}
window.resetFilters = resetFilters;

const btnReset = document.getElementById('btnReset');
if (btnReset) btnReset.addEventListener('click', resetFilters);

// ── 1. Summary Table Sorting (#summaryTbl) ──
document.querySelectorAll('#summaryTbl th[data-col]').forEach(th => {
  th.addEventListener('click', () => {
    const col = th.getAttribute('data-col');
    if (state.sortCol === col) {
      state.sortDir *= -1;
    } else {
      state.sortCol = col;
      state.sortDir = -1;
    }
    document.querySelectorAll('#summaryTbl th.sorted').forEach(t => t.classList.remove('sorted'));
    document.querySelectorAll('#summaryTbl th .sort-ico').forEach(ico => ico.textContent = '↕');
    th.classList.add('sorted');
    const sortIcon = th.querySelector('.sort-ico');
    if (sortIcon) sortIcon.textContent = state.sortDir === 1 ? '▲' : '▼';
    if (computedResult) {
      renderProgressiveSummaryTable(computedResult.progressiveSummary);
    }
  });
});

// ── 2. Performance League Table Sorting & Level Switching (#tblLeague) ──
document.querySelectorAll('#tblLeague th[data-lcol]').forEach(th => {
  th.addEventListener('click', () => {
    const col = th.getAttribute('data-lcol');
    if (state.leagueSortCol === col) {
      state.leagueSortDir *= -1;
    } else {
      state.leagueSortCol = col;
      state.leagueSortDir = (col === 'name' || col === 'parent') ? 1 : -1;
    }
    document.querySelectorAll('#tblLeague th.sorted').forEach(t => t.classList.remove('sorted'));
    document.querySelectorAll('#tblLeague th .sort-ico').forEach(ico => ico.textContent = '↕');
    th.classList.add('sorted');
    const sortIcon = th.querySelector('.sort-ico');
    if (sortIcon) sortIcon.textContent = state.leagueSortDir === 1 ? '▲' : '▼';
    if (computedResult && computedResult.usedFeeders) {
      renderPerformanceLeagueTable(computedResult.usedFeeders);
    }
  });
});

document.querySelectorAll('#leagueLevelSeg .seg-btn').forEach(btn => {
  btn.addEventListener('click', function() {
    state.leagueManualLevel = this.dataset.level;
    document.querySelectorAll('#leagueLevelSeg .seg-btn').forEach(b => b.setAttribute('aria-pressed', 'false'));
    this.setAttribute('aria-pressed', 'true');
    if (computedResult && computedResult.usedFeeders) {
      renderPerformanceLeagueTable(computedResult.usedFeeders);
    }
  });
});

// ── 2b. By Category Table Sorting (#tblByCategory) ──
document.querySelectorAll('#tblByCategory th[data-ccol]').forEach(th => {
  th.addEventListener('click', () => {
    const col = th.getAttribute('data-ccol');
    if (state.categorySortCol === col) {
      state.categorySortDir *= -1;
    } else {
      state.categorySortCol = col;
      state.categorySortDir = -1;
    }
    document.querySelectorAll('#tblByCategory th.sorted').forEach(t => t.classList.remove('sorted'));
    document.querySelectorAll('#tblByCategory th .sort-ico').forEach(ico => ico.textContent = '↕');
    th.classList.add('sorted');
    const sortIcon = th.querySelector('.sort-ico');
    if (sortIcon) sortIcon.textContent = state.categorySortDir === 1 ? '▲' : '▼';
    renderCategoryTable();
  });
});

// ── 3. Worst 10 (>70% Slab) Table Sorting (#wfTable) ──
document.querySelectorAll('#wfTable th[data-wfcol]').forEach(th => {
  th.addEventListener('click', () => {
    const col = th.getAttribute('data-wfcol');
    if (state.wfSortCol === col) {
      state.wfSortDir *= -1;
    } else {
      state.wfSortCol = col;
      state.wfSortDir = -1;
    }
    document.querySelectorAll('#wfTable th.sorted').forEach(t => t.classList.remove('sorted'));
    document.querySelectorAll('#wfTable th .sort-ico').forEach(ico => ico.textContent = '↕');
    th.classList.add('sorted');
    const sortIcon = th.querySelector('.sort-ico');
    if (sortIcon) sortIcon.textContent = state.wfSortDir === 1 ? '▲' : '▼';
    if (computedResult) {
      renderWorstFeeders(computedResult.worst10, computedResult.atcSlabs ? computedResult.atcSlabs['Above 70%'] : 0);
    }
  });
});

// ── 4. Top 150 AT&C Loss Value Table Sorting (#top150Table) ──
document.querySelectorAll('#top150Table th[data-t150col]').forEach(th => {
  th.addEventListener('click', () => {
    const col = th.getAttribute('data-t150col');
    if (state.top150SortCol === col) {
      state.top150SortDir *= -1;
    } else {
      state.top150SortCol = col;
      state.top150SortDir = -1;
    }
    document.querySelectorAll('#top150Table th.sorted').forEach(t => t.classList.remove('sorted'));
    document.querySelectorAll('#top150Table th .sort-ico').forEach(ico => ico.textContent = '↕');
    th.classList.add('sorted');
    const sortIcon = th.querySelector('.sort-ico');
    if (sortIcon) sortIcon.textContent = state.top150SortDir === 1 ? '▲' : '▼';
    if (computedResult) {
      renderTop150Table(computedResult.top150);
    }
  });
});

// ── 5. Export Executive Summary CSV (Header Button #btnSummaryCsv) ──
function exportExecutiveSummaryCsv() {
  if (!computedResult) return;
  const dSummary = computedResult.discomSummary || [];
  const kpis = computedResult.kpis || {};

  const headers = [
    'Discom / Entity', 'Audited Feeders', 'Input Energy (MU)', 'Billed Energy (MU)',
    'Billing Efficiency (%)', 'Collection Efficiency (%)', 'Line Loss (%)',
    'AT&C Loss (%)', 'ABR (Rs/kWh)', 'Thru Rate (Rs/kWh)',
    'Realised Amount (Rs Cr)', 'AT&C Loss Value (Rs Cr)'
  ];

  const escapeVal = v => {
    if (v === null || v === undefined) return '';
    const s = String(v);
    return (s.includes(',') || s.includes('"') || s.includes('\n')) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const csvLines = [];
  csvLines.push(`# UPPCL 11KV Feeder Executive Performance Summary`);
  csvLines.push(`# Generated: ${new Date().toLocaleString('en-IN')}`);
  csvLines.push(headers.join(','));

  for (const r of dSummary) {
    const ll = (r.billingEff !== null && r.billingEff !== undefined) ? (100 - r.billingEff).toFixed(2) : '';
    csvLines.push([
      escapeVal(r.discom),
      r.feeders || 0,
      r.inputMu ? r.inputMu.toFixed(2) : 0,
      r.billedMu ? r.billedMu.toFixed(2) : 0,
      r.billingEff ? r.billingEff.toFixed(2) : 0,
      r.collectionEff ? r.collectionEff.toFixed(2) : 0,
      ll,
      r.atcLoss ? r.atcLoss.toFixed(2) : 0,
      r.abr ? r.abr.toFixed(2) : 0,
      r.thruRate ? r.thruRate.toFixed(2) : 0,
      r.realisedCr ? r.realisedCr.toFixed(2) : 0,
      r.atcLossValueCr ? r.atcLossValueCr.toFixed(2) : 0
    ].join(','));
  }

  // Grand Total row
  if (kpis) {
    csvLines.push([
      'UPPCL Statewide Total',
      kpis.auditedFeeders || 0,
      kpis.inputEnergyMu ? kpis.inputEnergyMu.toFixed(2) : 0,
      kpis.soldEnergyMu ? kpis.soldEnergyMu.toFixed(2) : 0,
      kpis.billingEfficiency ? kpis.billingEfficiency.toFixed(2) : 0,
      kpis.collectionEfficiency ? kpis.collectionEfficiency.toFixed(2) : 0,
      kpis.lineLoss ? kpis.lineLoss.toFixed(2) : 0,
      kpis.atcLoss ? kpis.atcLoss.toFixed(2) : 0,
      kpis.avgBillingRate ? kpis.avgBillingRate.toFixed(2) : 0,
      kpis.thruRate ? kpis.thruRate.toFixed(2) : 0,
      kpis.realizationCr ? kpis.realizationCr.toFixed(2) : 0,
      kpis.atcLossValueCr ? kpis.atcLossValueCr.toFixed(2) : 0
    ].join(','));
  }

  const blob = new Blob([csvLines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `UPPCL_Executive_Summary_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

const btnSummaryCsv = document.getElementById('btnSummaryCsv');
if (btnSummaryCsv) btnSummaryCsv.addEventListener('click', exportExecutiveSummaryCsv);

// ── Export Category Summary CSV (#btnExportCategoryCsv) ──
function exportCategorySummaryCsv() {
  const { discKey, rows } = getActiveCategoryData();
  if (!rows || !rows.length) return;

  const headers = [
    'Category', 'Description', 'Billable Consumers', 'Sanctioned Load (kW)',
    'Billed Consumers', 'Paid Consumers (Current Month)', 'Billed Energy (MU)',
    'Assessment (Rs Cr)', 'Realised Amount (Rs Cr)', 'Average Billing Rate (Rs/kWh)',
    'Collection Efficiency (%)'
  ];

  const escapeVal = v => {
    if (v === null || v === undefined) return '';
    const s = String(v);
    return (s.includes(',') || s.includes('"') || s.includes('\n')) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const csvLines = [];
  csvLines.push(`# UPPCL Category-wise Performance Summary (Scope: ${discKey})`);
  csvLines.push(`# Period: ${state.monthFrom} to ${state.monthTo} 2026 (Consumers & Load snapshot as of ${state.monthTo} 2026)`);
  csvLines.push(`# Generated: ${new Date().toLocaleString('en-IN')}`);
  csvLines.push(headers.join(','));

  let totBillable = 0, totLoad = 0, totBilled = 0, totPaid = 0;
  let totMu = 0, totAss = 0, totReal = 0;
  for (const r of rows) {
    totBillable += (r.billableConsumers || 0);
    totLoad += (r.loadKw || 0);
    totBilled += (r.billedConsumers || 0);
    totPaid += (r.paidConsumers || 0);
    totMu += (r.billedMu || 0);
    totAss += (r.assessmentCr || 0);
    totReal += (r.realisedCr || 0);

    csvLines.push([
      escapeVal(r.category),
      escapeVal(r.desc),
      r.billableConsumers || 0,
      r.loadKw ? r.loadKw.toFixed(2) : 0,
      r.billedConsumers || 0,
      r.paidConsumers || 0,
      r.billedMu ? r.billedMu.toFixed(2) : 0,
      r.assessmentCr ? r.assessmentCr.toFixed(2) : 0,
      r.realisedCr ? r.realisedCr.toFixed(2) : 0,
      r.abr ? r.abr.toFixed(2) : 0,
      r.collectionEff ? r.collectionEff.toFixed(2) : 0
    ].join(','));
  }

  const totAbr = totMu > 0 ? (totAss * 10) / totMu : 0;
  const totCe = totAss > 0 ? (totReal / totAss) * 100 : (totReal > 0 ? 100 : 0);

  csvLines.push([
    `Total (${discKey})`,
    'All Categories Combined',
    totBillable,
    totLoad.toFixed(2),
    totBilled,
    totPaid,
    totMu.toFixed(2),
    totAss.toFixed(2),
    totReal.toFixed(2),
    totAbr.toFixed(2),
    totCe.toFixed(2)
  ].join(','));

  const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `UPPCL_Category_Performance_${discKey}_${state.monthFrom}_${state.monthTo}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

const btnExportCategoryCsv = document.getElementById('btnExportCategoryCsv');
if (btnExportCategoryCsv) btnExportCategoryCsv.addEventListener('click', exportCategorySummaryCsv);

// ── 6. Export Progressive Summary CSV (WYSIWYG: strictly honors Discom expansion & compression) ──
function exportProgressiveSummaryCsv() {
  if (!computedResult) return;
  const groups = computedResult.progressiveSummary || [];
  const selectedZoneUpper = (state.zone || '').trim().toUpperCase();
  const search = (state.tableSearch || '').trim().toLowerCase();

  let filtered = [...groups];
  if (selectedZoneUpper) {
    filtered = filtered.filter(r => r.zone && r.zone.trim().toUpperCase() === selectedZoneUpper);
  }
  if (search) {
    filtered = filtered.filter(r =>
      (r.discom && r.discom.toLowerCase().includes(search)) ||
      (r.zone && r.zone.toLowerCase().includes(search))
    );
  }

  // Calculate totals by Discom and Grand Total
  const discomTotalsMap = new Map();
  const grandTotal = {
    discom: 'UPPCL', zone: 'Statewide Total', total_feeders: 0,
    line_0_5: 0, line_5_10: 0, line_10_20: 0, line_20_30: 0,
    line_30_50: 0, line_50_70: 0, line_above_70: 0, line_abnormal: 0,
    atc_0_5: 0, atc_5_10: 0, atc_10_20: 0, atc_20_30: 0,
    atc_30_50: 0, atc_50_70: 0, atc_above_70: 0, atc_abnormal: 0,
    ie_zero: 0, no_consumers_tagged: 0, row_type: 3
  };

  const cols = [
    'total_feeders', 'line_0_5', 'line_5_10', 'line_10_20', 'line_20_30',
    'line_30_50', 'line_50_70', 'line_above_70', 'line_abnormal',
    'atc_0_5', 'atc_5_10', 'atc_10_20', 'atc_20_30',
    'atc_30_50', 'atc_50_70', 'atc_above_70', 'atc_abnormal',
    'ie_zero', 'no_consumers_tagged'
  ];

  filtered.forEach(r => {
    if (!discomTotalsMap.has(r.discom)) {
      discomTotalsMap.set(r.discom, {
        discom: r.discom, zone: `${r.discom} Total`, row_type: 2
      });
      cols.forEach(c => discomTotalsMap.get(r.discom)[c] = 0);
    }
    const dt = discomTotalsMap.get(r.discom);
    cols.forEach(c => {
      const v = Number(r[c]) || 0;
      dt[c] += v;
      grandTotal[c] += v;
    });
  });

  // Sort zone rows if requested
  if (state.sortCol) {
    const col = state.sortCol;
    const dir = state.sortDir;
    filtered.sort((a, b) => {
      const va = a[col];
      const vb = b[col];
      if (typeof va === 'string') return dir * (va || '').localeCompare(vb || '');
      return dir * ((Number(va) || 0) - (Number(vb) || 0));
    });
  }

  const headers = [
    'Discom','Zone / Rollup','Total Feeders',
    'Line 0-5%','Line 5-10%','Line 10-20%','Line 20-30%',
    'Line 30-50%','Line 50-70%','Line >70%','Line Abnormal',
    'AT&C 0-5%','AT&C 5-10%','AT&C 10-20%','AT&C 20-30%',
    'AT&C 30-50%','AT&C 50-70%','AT&C >70%','AT&C Abnormal',
    'IE 0','No Consumers Tagged'
  ];

  const escapeVal = v => {
    if (v === null || v === undefined) return '';
    const s = String(v);
    return (s.includes(',') || s.includes('"') || s.includes('\n')) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const csvLines = [headers.join(',')];

  const discomOrder = ['PASCHIMANCHAL', 'DAKSHINANCHAL', 'MADHYANCHAL', 'POORVANCHAL', 'KESCO'];
  let discomsPresent = [...new Set(filtered.map(r => r.discom))];
  if (state.sortCol === 'discom') {
    discomsPresent.sort((a, b) => state.sortDir * a.localeCompare(b));
  } else {
    discomsPresent.sort((a, b) => {
      const ia = discomOrder.indexOf(a), ib = discomOrder.indexOf(b);
      return (ia >= 0 ? ia : 99) - (ib >= 0 ? ib : 99);
    });
  }

  for (const dName of discomsPresent) {
    const dt = discomTotalsMap.get(dName);
    const zRows = filtered.filter(r => r.discom === dName);
    const isExpanded = state.expandedDiscoms.has(dName);

    // Discom Total row
    csvLines.push([
      escapeVal(dName),
      escapeVal(`${dName} Total`),
      dt.total_feeders,
      dt.line_0_5, dt.line_5_10, dt.line_10_20, dt.line_20_30,
      dt.line_30_50, dt.line_50_70, dt.line_above_70, dt.line_abnormal,
      dt.atc_0_5, dt.atc_5_10, dt.atc_10_20, dt.atc_20_30,
      dt.atc_30_50, dt.atc_50_70, dt.atc_above_70, dt.atc_abnormal,
      dt.ie_zero, dt.no_consumers_tagged
    ].join(','));

    // If expanded or in default view, include individual zone rows
    const shouldIncludeZones = isExpanded || state.expandedDiscoms.size === 0;
    if (shouldIncludeZones) {
      for (const r of zRows) {
        csvLines.push([
          escapeVal(r.discom),
          escapeVal(r.zone),
          r.total_feeders,
          r.line_0_5, r.line_5_10, r.line_10_20, r.line_20_30,
          r.line_30_50, r.line_50_70, r.line_above_70, r.line_abnormal,
          r.atc_0_5, r.atc_5_10, r.atc_10_20, r.atc_20_30,
          r.atc_30_50, r.atc_50_70, r.atc_above_70, r.atc_abnormal,
          r.ie_zero, r.no_consumers_tagged
        ].join(','));
      }
    }
  }

  // Grand Total row (only when displaying multi-discom / All of UPPCL)
  if (!state.discom && !selectedZoneUpper && grandTotal.total_feeders > 0) {
    csvLines.push([
      'UPPCL',
      'Statewide Total',
      grandTotal.total_feeders,
      grandTotal.line_0_5, grandTotal.line_5_10, grandTotal.line_10_20, grandTotal.line_20_30,
      grandTotal.line_30_50, grandTotal.line_50_70, grandTotal.line_above_70, grandTotal.line_abnormal,
      grandTotal.atc_0_5, grandTotal.atc_5_10, grandTotal.atc_10_20, grandTotal.atc_20_30,
      grandTotal.atc_30_50, grandTotal.atc_50_70, grandTotal.atc_above_70, grandTotal.atc_abnormal,
      grandTotal.ie_zero, grandTotal.no_consumers_tagged
    ].join(','));
  }

  const blob = new Blob([csvLines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `UPPCL_Progressive_Summary_Discoms_Zones_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

const btnExpSummary = document.getElementById('btnExportSummaryTable');
if (btnExpSummary) btnExpSummary.addEventListener('click', exportProgressiveSummaryCsv);

// ── 7. Export Progressive Summary Excel (.xlsx) with Native Expandable / Collapsible Outline ──
function exportProgressiveSummaryXlsx() {
  if (!computedResult) return;
  if (typeof XLSX === 'undefined') {
    alert('Excel export engine is initializing, please try again in a moment or use Export CSV.');
    return;
  }
  const groups = computedResult.progressiveSummary || [];
  const selectedZoneUpper = (state.zone || '').trim().toUpperCase();
  const search = (state.tableSearch || '').trim().toLowerCase();

  let filtered = [...groups];
  if (selectedZoneUpper) {
    filtered = filtered.filter(r => r.zone && r.zone.trim().toUpperCase() === selectedZoneUpper);
  }
  if (search) {
    filtered = filtered.filter(r =>
      (r.discom && r.discom.toLowerCase().includes(search)) ||
      (r.zone && r.zone.toLowerCase().includes(search))
    );
  }

  // Calculate totals by Discom and Grand Total
  const discomTotalsMap = new Map();
  const grandTotal = {
    discom: 'UPPCL', zone: 'Statewide Total', total_feeders: 0,
    line_0_5: 0, line_5_10: 0, line_10_20: 0, line_20_30: 0,
    line_30_50: 0, line_50_70: 0, line_above_70: 0, line_abnormal: 0,
    atc_0_5: 0, atc_5_10: 0, atc_10_20: 0, atc_20_30: 0,
    atc_30_50: 0, atc_50_70: 0, atc_above_70: 0, atc_abnormal: 0,
    ie_zero: 0, no_consumers_tagged: 0, row_type: 3
  };

  const cols = [
    'total_feeders', 'line_0_5', 'line_5_10', 'line_10_20', 'line_20_30',
    'line_30_50', 'line_50_70', 'line_above_70', 'line_abnormal',
    'atc_0_5', 'atc_5_10', 'atc_10_20', 'atc_20_30',
    'atc_30_50', 'atc_50_70', 'atc_above_70', 'atc_abnormal',
    'ie_zero', 'no_consumers_tagged'
  ];

  filtered.forEach(r => {
    if (!discomTotalsMap.has(r.discom)) {
      discomTotalsMap.set(r.discom, {
        discom: r.discom, zone: `${r.discom} Total`, row_type: 2
      });
      cols.forEach(c => discomTotalsMap.get(r.discom)[c] = 0);
    }
    const dt = discomTotalsMap.get(r.discom);
    cols.forEach(c => {
      const v = Number(r[c]) || 0;
      dt[c] += v;
      grandTotal[c] += v;
    });
  });

  // Sort zone rows if requested
  if (state.sortCol) {
    const col = state.sortCol;
    const dir = state.sortDir;
    filtered.sort((a, b) => {
      const va = a[col];
      const vb = b[col];
      if (typeof va === 'string') return dir * (va || '').localeCompare(vb || '');
      return dir * ((Number(va) || 0) - (Number(vb) || 0));
    });
  }

  const isSingleMonth = state.monthFrom === state.monthTo;
  const isYtd = state.monthFrom === 'Apr';
  const periodTag = isSingleMonth ? `Month: ${state.monthFrom}-26` : (isYtd ? (state.monthTo === 'Oct' ? 'Progressive Upto Oct-26' : `Progressive Apr to ${state.monthTo}-26`) : `Period: ${state.monthFrom} to ${state.monthTo}-26`);

  // 2-tier headers matching dashboard
  const headerRow1 = [
    'Discom', 'Zone / Rollup', 'Total Feeders',
    `LINE LOSS SLAB (${periodTag})`, '', '', '', '', '', '', '',
    `AT&C LOSS SLAB (${periodTag})`, '', '', '', '', '', '', '',
    'IE 0', 'No Consumers Tagged'
  ];

  const headerRow2 = [
    '', '', '',
    '0-5%', '5-10%', '10-20%', '20-30%', '30-50%', '50-70%', '>70%', 'Abnormal',
    '0-5%', '5-10%', '10-20%', '20-30%', '30-50%', '50-70%', '>70%', 'Abnormal',
    '', ''
  ];

  const aoa = [headerRow1, headerRow2];
  const rowConfig = [{ level: 0 }, { level: 0 }];

  const discomOrder = ['PASCHIMANCHAL', 'DAKSHINANCHAL', 'MADHYANCHAL', 'POORVANCHAL', 'KESCO'];
  let discomsPresent = [...new Set(filtered.map(r => r.discom))];
  if (state.sortCol === 'discom') {
    discomsPresent.sort((a, b) => state.sortDir * a.localeCompare(b));
  } else {
    discomsPresent.sort((a, b) => {
      const ia = discomOrder.indexOf(a), ib = discomOrder.indexOf(b);
      return (ia >= 0 ? ia : 99) - (ib >= 0 ? ib : 99);
    });
  }

  for (const dName of discomsPresent) {
    const dt = discomTotalsMap.get(dName);
    const zRows = filtered.filter(r => r.discom === dName);
    const isExpanded = state.expandedDiscoms.has(dName);

    // Discom Total row (Level 0 - Summary Header Row)
    aoa.push([
      dName,
      `${dName} Total`,
      dt.total_feeders,
      dt.line_0_5, dt.line_5_10, dt.line_10_20, dt.line_20_30,
      dt.line_30_50, dt.line_50_70, dt.line_above_70, dt.line_abnormal,
      dt.atc_0_5, dt.atc_5_10, dt.atc_10_20, dt.atc_20_30,
      dt.atc_30_50, dt.atc_50_70, dt.atc_above_70, dt.atc_abnormal,
      dt.ie_zero, dt.no_consumers_tagged
    ]);
    rowConfig.push({ level: 0 });

    // Child Zone rows (Level 1 - Outlined & Collapsible under the Discom row)
    for (const r of zRows) {
      aoa.push([
        '   ' + r.discom,
        r.zone,
        r.total_feeders,
        r.line_0_5, r.line_5_10, r.line_10_20, r.line_20_30,
        r.line_30_50, r.line_50_70, r.line_above_70, r.line_abnormal,
        r.atc_0_5, r.atc_5_10, r.atc_10_20, r.atc_20_30,
        r.atc_30_50, r.atc_50_70, r.atc_above_70, r.atc_abnormal,
        r.ie_zero, r.no_consumers_tagged
      ]);
      rowConfig.push({ level: 1, hidden: !isExpanded });
    }
  }

  // Grand Total row (only when displaying multi-discom / All of UPPCL)
  if (!state.discom && !selectedZoneUpper && grandTotal.total_feeders > 0) {
    aoa.push([
      'UPPCL',
      'Statewide Total',
      grandTotal.total_feeders,
      grandTotal.line_0_5, grandTotal.line_5_10, grandTotal.line_10_20, grandTotal.line_20_30,
      grandTotal.line_30_50, grandTotal.line_50_70, grandTotal.line_above_70, grandTotal.line_abnormal,
      grandTotal.atc_0_5, grandTotal.atc_5_10, grandTotal.atc_10_20, grandTotal.atc_20_30,
      grandTotal.atc_30_50, grandTotal.atc_50_70, grandTotal.atc_above_70, grandTotal.atc_abnormal,
      grandTotal.ie_zero, grandTotal.no_consumers_tagged
    ]);
    rowConfig.push({ level: 0 });
  }

  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // Set native outline levels and properties
  ws['!rows'] = rowConfig;
  ws['!outline'] = { above: true };

  // Set merged cells for 2-tier header
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 1, c: 0 } }, // Discom
    { s: { r: 0, c: 1 }, e: { r: 1, c: 1 } }, // Zone / Rollup
    { s: { r: 0, c: 2 }, e: { r: 1, c: 2 } }, // Total Feeders
    { s: { r: 0, c: 3 }, e: { r: 0, c: 10 } }, // Line Loss Slab
    { s: { r: 0, c: 11 }, e: { r: 0, c: 18 } }, // AT&C Loss Slab
    { s: { r: 0, c: 19 }, e: { r: 1, c: 19 } }, // IE 0
    { s: { r: 0, c: 20 }, e: { r: 1, c: 20 } }  // No Consumers Tagged
  ];

  // Set comfortable column widths
  ws['!cols'] = [
    { wch: 18 }, { wch: 24 }, { wch: 14 },
    { wch: 9 }, { wch: 9 }, { wch: 9 }, { wch: 9 }, { wch: 9 }, { wch: 9 }, { wch: 9 }, { wch: 10 },
    { wch: 9 }, { wch: 9 }, { wch: 9 }, { wch: 9 }, { wch: 9 }, { wch: 9 }, { wch: 9 }, { wch: 10 },
    { wch: 9 }, { wch: 14 }
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Progressive Summary');
  XLSX.writeFile(wb, `UPPCL_Progressive_Summary_Discoms_Zones_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

const btnExpSummaryXlsx = document.getElementById('btnExportSummaryXlsx');
if (btnExpSummaryXlsx) btnExpSummaryXlsx.addEventListener('click', exportProgressiveSummaryXlsx);

// Notes Accordion
const notesToggle = document.getElementById('notesToggle');
if (notesToggle) {
  notesToggle.addEventListener('click', () => {
    const body = document.getElementById('notesBody');
    const arrow = document.getElementById('notesArrow');
    if (body) body.classList.toggle('open');
    if (arrow) arrow.textContent = body.classList.contains('open') ? '▼' : '▶';
  });
}

// Health Check
async function checkHealth() {
  const badge = document.getElementById('dbBadge');
  if (!badge) return;
  try {
    const res = await fetch('/api/health');
    if (!res.ok) throw new Error();
    const data = await res.json();
    badge.textContent = `● Live DB: ${data.database}`;
    badge.className = 'db-badge';
  } catch {
    badge.textContent = '● Synced with PostgreSQL (energy_db)';
    badge.className = 'db-badge';
  }
}


// ── Sidebar Navigation & Tab Routing ──
function initSidebarTabs() {
  const sidebar = document.getElementById('appSidebar');
  const sidebarToggle = document.getElementById('sidebarToggle');
  const mobileToggle = document.getElementById('sidebarMobileToggle');
  const overlay = document.getElementById('sidebarMobileOverlay');

  // 1. Sidebar Collapse State
  const savedCollapsed = localStorage.getItem('uppcl_sidebar_collapsed') === 'true';
  if (sidebar && savedCollapsed) {
    sidebar.classList.add('collapsed');
    if (sidebarToggle) {
      const icon = sidebarToggle.querySelector('.toggle-icon');
      const txt = sidebarToggle.querySelector('.toggle-text');
      if (icon) icon.textContent = '▶';
      if (txt) txt.textContent = 'Expand';
    }
  }

  if (sidebarToggle && sidebar) {
    sidebarToggle.addEventListener('click', () => {
      const isCollapsed = sidebar.classList.toggle('collapsed');
      localStorage.setItem('uppcl_sidebar_collapsed', isCollapsed);
      const icon = sidebarToggle.querySelector('.toggle-icon');
      const txt = sidebarToggle.querySelector('.toggle-text');
      if (icon) icon.textContent = isCollapsed ? '▶' : '◀';
      if (txt) txt.textContent = isCollapsed ? 'Expand' : 'Collapse';
      setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
      }, 260);
    });
  }

  // Mobile drawer toggle
  if (mobileToggle && sidebar) {
    mobileToggle.addEventListener('click', () => {
      const isOpen = sidebar.classList.toggle('mobile-open');
      if (overlay) overlay.classList.toggle('active', isOpen);
    });
  }
  if (overlay && sidebar) {
    overlay.addEventListener('click', () => {
      sidebar.classList.remove('mobile-open');
      overlay.classList.remove('active');
    });
  }

  // 2. Tab Navigation
  const navItems = document.querySelectorAll('.sidebar-nav .nav-item');
  const tabContents = document.querySelectorAll('.dashboard-tab-content');

  function activateTab(tabId, updateHash = true) {
    let matchedItem = null;
    navItems.forEach(item => {
      const match = item.dataset.tab === tabId;
      item.classList.toggle('active', match);
      if (match) matchedItem = item;
    });

    tabContents.forEach(content => {
      content.classList.toggle('active', content.id === tabId);
    });

    // Close mobile drawer on selection
    if (sidebar) sidebar.classList.remove('mobile-open');
    if (overlay) overlay.classList.remove('active');

    // Update Hash
    if (updateHash) {
      const hashMap = {
        'tabDashboard': '#dashboard',
        'tabCategory': '#category',
        'tabCritical': '#critical',
        'tabProgress': '#progress',
        'tabDrilldown': '#drilldown'
      };
      if (hashMap[tabId]) {
        history.replaceState(null, '', hashMap[tabId]);
      }
    }

    // Handle Chart Resizing and Drilldown Lazy Loading
    setTimeout(() => {
      if (tabId === 'tabDashboard') {
        if (chartMonthlyEnergy) { chartMonthlyEnergy.resize(); chartMonthlyEnergy.update('none'); }
        if (chartMonthlyLoss) { chartMonthlyLoss.resize(); chartMonthlyLoss.update('none'); }
      } else if (tabId === 'tabProgress') {
        if (chartLineLoss) { chartLineLoss.resize(); chartLineLoss.update('none'); }
        if (chartAtcLoss) { chartAtcLoss.resize(); chartAtcLoss.update('none'); }
        if (computedResult) {
          renderFeederTypeBreakdown(computedResult.feederTypeBreakdown);
        }
      } else if (tabId === 'tabDrilldown') {
        initDrilldownIframe();
      }
      window.dispatchEvent(new Event('resize'));
    }, 50);
  }

  window.switchDashboardTab = activateTab;

  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const tabId = item.dataset.tab;
      if (tabId) activateTab(tabId);
    });
  });

  // Drilldown Iframe setup
  function initDrilldownIframe(forceReload = false) {
    const iframe = document.getElementById('drilldownIframe');
    if (!iframe) return;
    const currentSrc = iframe.getAttribute('src');
    const dParam = state.discom ? `&discom=${encodeURIComponent(state.discom)}` : '';
    const zParam = state.zone ? `&zone=${encodeURIComponent(state.zone)}` : '';
    const targetUrl = `feeder_drilldown.html?v=${Date.now()}${dParam}${zParam}`;
    if (!currentSrc || currentSrc === 'about:blank' || forceReload) {
      iframe.src = targetUrl;
    }
  }

  const btnReloadDrill = document.getElementById('btnReloadDrilldown');
  if (btnReloadDrill) {
    btnReloadDrill.addEventListener('click', () => initDrilldownIframe(true));
  }

  // 3. Initial Route from URL Hash
  const hashToTab = {
    '#dashboard': 'tabDashboard',
    '#category': 'tabCategory',
    '#critical': 'tabCritical',
    '#progress': 'tabProgress',
    '#drilldown': 'tabDrilldown'
  };

  const initialTab = hashToTab[window.location.hash] || 'tabDashboard';
  activateTab(initialTab, false);

  window.addEventListener('hashchange', () => {
    const nextTab = hashToTab[window.location.hash];
    if (nextTab) activateTab(nextTab, false);
  });
}

// ── Initial Boot Sequence ──
(async function boot() {
  initSidebarTabs();
  checkHealth();
  initCharts();
  // initProgressiveSummaryChartControls(); // [Retained for future use]
  await loadDataset();
  syncCascadeDropdowns();
  onFilterChanged();
})();



window.__offlineCsv = function(filename, head, body) {
  const esc = v => {
    const s = String(v === null || v === undefined ? '' : v);
    return (s.includes(',') || s.includes('"') || s.includes('\n')) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const lines = [head.map(esc).join(','), ...body.map(r => r.map(esc).join(','))];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// ── Offline copy: Category-wise table on the audit file split (PTW / Govt / Others) ──
(function () {
  const $ = id => document.getElementById(id);
  const nf = (n, d = 0) => (Number(n) || 0).toLocaleString('en-IN', { minimumFractionDigits: d, maximumFractionDigits: d });
  const v = (a, m) => (a && a[m]) || 0;
  let sortCol = 'billable', sortDir = -1;

  function categoryRows() {
    const m0 = MON_INDEX[state.monthFrom] ?? 0;
    const m1 = MON_INDEX[state.monthTo] ?? (MON_LABELS.length - 1);
    const cats = {
      PTW:    { category: 'PTW', desc: 'Private tube wells (supply type 5x)', billable: 0, se: 0, ca: 0, real: 0, sub: 0 },
      Govt:   { category: 'Govt', desc: 'Govt connections (GOVT_FLG = Govt)', billable: 0, se: 0, ca: 0, real: 0, sub: 0 },
      Others: { category: 'Others', desc: 'All other consumers', billable: 0, se: 0, ca: 0, real: 0, sub: 0 }
    };
    let load = 0, feeders = 0;
    const used = (computedResult && computedResult.usedFeeders) || [];
    for (const f of used) {
      const r = R[f.ri]; if (!r) continue;
      feeders++;
      const tb = Array.isArray(r[16]) ? v(r[16], m1) : (r[12] || 0);
      const pb = v(r[25], m1), gb = v(r[26], m1);
      cats.PTW.billable += pb; cats.Govt.billable += gb; cats.Others.billable += tb - pb - gb;
      load += v(r[24], m1);
      for (let m = m0; m <= m1; m++) {
        const se = v(r[9], m), ca = v(r[10], m), real = v(r[11], m);
        const pse = v(r[27], m), gse = v(r[28], m);
        const pca = v(r[14], m), gca = v(r[20], m);
        const pp = v(r[19], m), gp = v(r[21], m);
        cats.PTW.se += pse; cats.Govt.se += gse; cats.Others.se += se - pse - gse;
        cats.PTW.ca += pca; cats.Govt.ca += gca; cats.Others.ca += ca - pca - gca;
        cats.PTW.real += state.includePtw ? pca : pp;
        cats.Govt.real += state.includeGovt ? gca : gp;
        cats.Others.real += real - pp - gca;
        if (state.includeSubsidy) {
          const ps = v(r[15], m) + v(r[22], m), os = v(r[23], m);
          cats.PTW.ca += ps; cats.PTW.real += ps; cats.PTW.sub += ps;
          cats.Others.ca += os; cats.Others.real += os; cats.Others.sub += os;
        }
      }
    }
    const rows = Object.values(cats).map(c => {
      const mu = c.se / 1000, cr = c.ca / 100, rc = c.real / 100;
      return { ...c, billedMu: mu, assessmentCr: cr, realisedCr: rc, subCr: c.sub / 100,
        abr: mu > 0 ? cr * 10 / mu : 0, ce: cr > 0 ? rc / cr * 100 : (rc > 0 ? 100 : 0) };
    });
    const tot = rows.reduce((t, r) => { t.billable += r.billable; t.billedMu += r.billedMu; t.assessmentCr += r.assessmentCr; t.realisedCr += r.realisedCr; t.subCr += r.subCr; return t; },
      { billable: 0, billedMu: 0, assessmentCr: 0, realisedCr: 0, subCr: 0 });
    tot.abr = tot.billedMu > 0 ? tot.assessmentCr * 10 / tot.billedMu : 0;
    tot.ce = tot.assessmentCr > 0 ? tot.realisedCr / tot.assessmentCr * 100 : 0;
    tot.loadKw = load; tot.feeders = feeders;
    rows.forEach(r => { r.share = tot.billable > 0 ? r.billable / tot.billable * 100 : 0; r.seShare = tot.billedMu > 0 ? r.billedMu / tot.billedMu * 100 : 0; });
    return { rows, tot, m1 };
  }

  const COLS = [
    ['category', 'Category', 'tx'], ['billable', 'Billable Cons.'], ['share', 'Cons. share %'], ['billedMu', 'Sold MU'],
    ['seShare', 'SE share %'], ['assessmentCr', 'Assessed ₹Cr'], ['realisedCr', 'Realised ₹Cr'], ['subCr', 'Subsidy ₹Cr'],
    ['abr', 'ABR ₹/kWh'], ['ce', 'Coll. Eff. %']
  ];

  function setHead() {
    const thead = document.querySelector('#tblByCategory thead');
    if (!thead || thead.dataset.offline) return;
    thead.dataset.offline = '1';
    thead.innerHTML = '<tr>' + COLS.map(([k, l, c]) => `<th class="${c || ''}" data-ocol="${k}" style="cursor:pointer">${l} <span class="sort-ico">↕</span></th>`).join('') + '</tr>';
    thead.querySelectorAll('th[data-ocol]').forEach(th => th.addEventListener('click', () => {
      const k = th.dataset.ocol;
      if (sortCol === k) sortDir *= -1; else { sortCol = k; sortDir = -1; }
      window.renderCategoryTable();
    }));
  }

  window.renderCategoryTable = function () {
    const tbody = $('byCategoryBody'), tfoot = $('byCategoryFoot');
    if (!tbody) return;
    setHead();
    const { rows, tot, m1 } = categoryRows();
    const hint = $('catTableHint');
    if (hint) hint.innerHTML = `Consumer category split from the audit file (PTW = supply type 5x, Govt = GOVT_FLG 'Govt', Others = rest) · ${state.monthFrom}–${state.monthTo} 2026 · <b>billable consumers and load as of ${MON_LABELS[m1]} 2026</b> · realisation follows the PTW / Govt / Subsidy checkboxes`;
    rows.sort((a, b) => {
      const x = a[sortCol], y = b[sortCol];
      return typeof x === 'string' ? sortDir * x.localeCompare(y) : sortDir * ((x || 0) - (y || 0));
    });
    document.querySelectorAll('#tblByCategory th[data-ocol]').forEach(th => {
      th.classList.toggle('sorted', th.dataset.ocol === sortCol);
      th.querySelector('.sort-ico').textContent = th.dataset.ocol === sortCol ? (sortDir === 1 ? '▲' : '▼') : '↕';
    });
    const ceCol = ce => ce < 70 ? 'var(--crit)' : ce < 90 ? 'var(--warn)' : 'var(--good)';
    tbody.innerHTML = rows.map(r => `<tr>
      <td class="tx" style="font-weight:600;color:var(--accent)">${r.category}<span style="font-size:11px;color:var(--ink-3);font-weight:normal;margin-left:6px">${r.desc}</span></td>
      <td style="font-weight:600">${nf(r.billable)}</td><td>${nf(r.share, 2)}%</td><td>${nf(r.billedMu, 2)}</td><td>${nf(r.seShare, 2)}%</td>
      <td>₹${nf(r.assessmentCr, 2)}</td><td>₹${nf(r.realisedCr, 2)}</td><td>${state.includeSubsidy ? '₹' + nf(r.subCr, 2) : '—'}</td>
      <td style="font-weight:600">₹${nf(r.abr, 2)}</td><td style="font-weight:600;color:${ceCol(r.ce)}">${nf(r.ce, 2)}%</td></tr>`).join('');
    const dk = state.discom || 'ALL';
    if (tfoot) tfoot.innerHTML = `<tr class="grand">
      <td class="tx" style="font-weight:700">Total (${dk}) · ${nf(tot.feeders)} feeders · load ${nf(tot.loadKw / 1000, 2)} MW</td>
      <td style="font-weight:700">${nf(tot.billable)}</td><td>100%</td><td style="font-weight:700">${nf(tot.billedMu, 2)}</td><td>100%</td>
      <td style="font-weight:700">₹${nf(tot.assessmentCr, 2)}</td><td style="font-weight:700">₹${nf(tot.realisedCr, 2)}</td>
      <td style="font-weight:700">${state.includeSubsidy ? '₹' + nf(tot.subCr, 2) : '—'}</td>
      <td style="font-weight:700">₹${nf(tot.abr, 2)}</td><td style="font-weight:700;color:${ceCol(tot.ce)}">${nf(tot.ce, 2)}%</td></tr>`;
  };

  window.exportCategorySummaryCsv = function () {
    const { rows, tot, m1 } = categoryRows();
    const head = ['Category', 'Billable Consumers (' + MON_LABELS[m1] + ')', 'Consumer share %', 'Sold Energy (MU)', 'SE share %', 'Assessment (Rs Cr)', 'Realisation (Rs Cr)', 'Subsidy (Rs Cr)', 'ABR (Rs/kWh)', 'Collection Efficiency %'];
    const r2 = x => Math.round(x * 100) / 100;
    const body = rows.map(r => [r.category, Math.round(r.billable), r2(r.share), r2(r.billedMu), r2(r.seShare), r2(r.assessmentCr), r2(r.realisedCr), state.includeSubsidy ? r2(r.subCr) : '', r2(r.abr), r2(r.ce)]);
    body.push(['Total (' + (state.discom || 'ALL') + ')', Math.round(tot.billable), 100, r2(tot.billedMu), 100, r2(tot.assessmentCr), r2(tot.realisedCr), state.includeSubsidy ? r2(tot.subCr) : '', r2(tot.abr), r2(tot.ce)]);
    body.push(['Load (kW, ' + MON_LABELS[m1] + ', all categories)', r2(tot.loadKw)]);
    body.push(['Filters', `${state.monthFrom}-${state.monthTo} 2026; PTW ${state.includePtw ? 'deemed' : 'paid'}; Govt ${state.includeGovt ? 'deemed' : 'paid'}; Subsidy ${state.includeSubsidy ? 'included' : 'excluded'}`]);
    window.__offlineCsv(`UPPCL_Category_Summary_${state.discom || 'ALL'}_${state.monthFrom}-${state.monthTo}.csv`, head, body);
  };

  function wire() {
    const b = $('btnExportCategoryCsv');
    if (b) { const c = b.cloneNode(true); b.replaceWith(c); c.addEventListener('click', window.exportCategorySummaryCsv); }
    if (typeof computedResult !== 'undefined' && computedResult) window.renderCategoryTable();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(wire, 0)); else setTimeout(wire, 0);
})();

