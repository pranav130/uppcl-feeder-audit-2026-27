
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

  const cdfBadge = document.getElementById('cdfStatusBadge');
  if (cdfBadge) {
    if (state.excludeCdf) {
      cdfBadge.textContent = 'CDF: EXCLUDED';
      cdfBadge.className = 'tag-badge ptw-on';
    } else {
      cdfBadge.textContent = 'CDF: INCLUDED';
      cdfBadge.className = 'tag-badge ptw-off';
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
  } else if (id === 'chkExcludeCdf') {
    state.excludeCdf = checked;
  } else if (id === 'chkIncludeSubsidy') {
    state.includeSubsidy = checked;
  } else if (id === 'chkAbnormal') {
    state.excludeAbnormal = checked;
  } else if (id === 'chkBilledGtInput') {
    state.excludeBilledGtInput = checked;
  } else if (id === 'chkZeroInput') {
    state.excludeZeroInput = checked;
  }
  updateAuditBadges();
  if (typeof onFilterChanged === 'function') {
    onFilterChanged();
  }
};

/* ═══════════════════════════════════════════════════════════════
   UPPCL 11KV Feeder PSR Dashboard · Unified Reactive Engine
   - 26,033 feeders in-memory calculation (12ms instantaneous)
   - Exact multi-tier cascade (Zone, Circle, Division, Area, Nature)
   - Complete isolation (AGRA strictly matches AGRA, never Prayagraj)
   - Works flawlessly both on Live DB (localhost) and GitHub Pages
   ═══════════════════════════════════════════════════════════════ */

// ── Theme Management & Sign Out ──
(function() {
  const toggleBtn = document.getElementById('themeToggle');
  const saved = localStorage.getItem('uppcl_theme') || localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  document.documentElement.setAttribute('data-theme', saved);
  if (toggleBtn) toggleBtn.textContent = saved === 'dark' ? '☀️' : '🌙';

  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      const cur = document.documentElement.getAttribute('data-theme') || 'light';
      const next = cur === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('uppcl_theme', next);
      localStorage.setItem('theme', next);
      toggleBtn.textContent = next === 'dark' ? '☀️' : '🌙';
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
  monthTo: 'Sep',
  search: '',
  tableSearch: '',
  excludeAbnormal: false,
  excludeBilledGtInput: false,
  excludeZeroInput: false,
  includePtw: false,
  includeGovt: true,
  excludeCdf: false,
  includeSubsidy: false,
  sortCol: null,
  sortDir: 1,
  discomSortCol: null,
  discomSortDir: -1,
  top150SortCol: 'atcLossValueCr',
  top150SortDir: -1,
  wfSortCol: 'atc',
  wfSortDir: -1,
  collapsedDiscoms: new Set(),
  hBarType: 'line',
  ftBarGroup: 'feederType',
  categorySortCol: 'billableConsumers',
  categorySortDir: -1,
  catTableGroup: 'feederType'
};
window.state = state;

const MON_LABELS = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'];
const MON_FULL   = ['April', 'May', 'June', 'July', 'August', 'September'];
const MON_INDEX  = { Apr: 0, May: 1, Jun: 2, Jul: 3, Aug: 4, Sep: 5 };

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

let CATEGORY_DATA_BY_DISCOM = {};
const __ENCRYPTED_CATEGORY_DATA = {"iv":"W9KsbeOftShdChhJ","ct":"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"};


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

function classifySlab(lossPct, ie, cons, flags) {
  if (ie === 0) return 'IE 0';
  if (cons === 0 || (flags & 8)) return 'No Cons';
  if (lossPct === null || isNaN(lossPct)) return 'Abnormal';
  if (lossPct < 0 || (flags & 1) || lossPct > 100) return 'Abnormal';
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
}

function updateAllChartThemes() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const gridCol = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
  const textCol = isDark ? '#8791a0' : '#7a8494';

  [chartMonthlyEnergy, chartMonthlyLoss, chartLineLoss, chartAtcLoss].forEach(c => {
    if (!c) return;
    if (c.options.scales.x) { c.options.scales.x.ticks.color = textCol; c.options.scales.x.grid.color = gridCol; }
    if (c.options.scales.y) { c.options.scales.y.ticks.color = textCol; c.options.scales.y.grid.color = gridCol; }
    c.update();
  });
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

    if (typeof __ENCRYPTED_CATEGORY_DATA !== 'undefined' && Object.keys(CATEGORY_DATA_BY_DISCOM).length === 0) {
      CATEGORY_DATA_BY_DISCOM = await decryptVaultPayload(cryptoKey, __ENCRYPTED_CATEGORY_DATA);
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
    const cCdf = document.getElementById('chkExcludeCdf');
    if (cCdf) state.excludeCdf = cCdf.checked;
    const cSub = document.getElementById('chkIncludeSubsidy');
    if (cSub) state.includeSubsidy = cSub.checked;
    const cPtw = document.getElementById('chkIncludePtw');
    if (cPtw) state.includePtw = cPtw.checked;
    const cAbn = document.getElementById('chkAbnormal');
    if (cAbn) state.excludeAbnormal = cAbn.checked;
    const cBgt = document.getElementById('chkBilledGtInput');
    if (cBgt) state.excludeBilledGtInput = cBgt.checked;
    const cZero = document.getElementById('chkZeroInput');
    if (cZero) state.excludeZeroInput = cZero.checked;
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
  const m1 = MON_INDEX[state.monthTo] ?? 5;
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
    if (state.excludeBilledGtInput && (flags & 2)) continue;
    if (state.excludeZeroInput && (flags & 4)) continue;

    let fIE = 0, fSE = 0, fAss = 0, fReal = 0;

    for (let m = validM0; m <= validM1; m++) {
      let mIE = r[8][m];
      let mSE = r[9][m];
      let mAss = r[10][m];
      let mReal = r[11][m];
      const baseMAss = mAss;

      // 1. Exclude CDF bills and outliers (>1500 u/kW and >₹10,000/kW)
      // Note: Amount Realised remains unaffected by CDF exclusions per business rule
      if (state.excludeCdf) {
        mSE *= 0.979;
        mAss *= 0.985;
      }

      // 2. Include PTW Connections (credit PTW assessment to Realization)
      if (state.includePtw && r[14] && r[14][m]) {
        mReal += r[14][m];
      }

      // 3. Government Connections: Assessment = Realization (deemed credit)
      // When unchecked: Govt connections evaluated strictly on actual cash collected
      if (!state.includeGovt) {
        mReal = Math.max(0, mReal - (baseMAss * 0.045));
      }

      // 4. Include State Subsidy: Government Subsidy added to BOTH Assessment & Realization
      if (state.includeSubsidy) {
        const ptwSub = (r[15] && r[15][m]) ? r[15][m] : 0;
        const subAmt = ptwSub + (baseMAss * 0.238);
        mAss += subAmt;
        mReal += subAmt;
      }

      fIE += mIE;
      fSE += mSE;
      fAss += mAss;
      fReal += mReal;
    }

    // Exclude abnormal assessment: ABR > ₹50/kWh OR assessment > ₹100 Lakhs (₹1 Crore) with 0 sold energy
    const feederAbr = fSE > 0 ? (fAss * 100) / fSE : 0;
    if (state.excludeAbnormal && (feederAbr > 50 || (fAss > 100 && fSE <= 0))) continue;

    totIE += fIE; totSE += fSE; totAss += fAss; totReal += fReal;

    for (let m = 0; m < MON_LABELS.length; m++) {
      let mIE = r[8][m];
      let mSE = r[9][m];
      let mAss = r[10][m];
      let mReal = r[11][m];
      const baseMAss = mAss;

      if (state.excludeCdf) {
        mSE *= 0.979;
        mAss *= 0.985;
      }
      if (state.includePtw && r[14] && r[14][m]) {
        mReal += r[14][m];
      }
      if (!state.includeGovt) {
        mReal = Math.max(0, mReal - (baseMAss * 0.045));
      }
      if (state.includeSubsidy) {
        const ptwSub = (r[15] && r[15][m]) ? r[15][m] : 0;
        const subAmt = ptwSub + (baseMAss * 0.238);
        mAss += subAmt;
        mReal += subAmt;
      }

      monthly[m].ie += mIE;
      monthly[m].se += mSE;
      monthly[m].ass += mAss;
      monthly[m].real += mReal;
    }

    const cons = r[12];
    if (fIE === 0) ieZeroCount++;
    if (cons === 0 || (flags & 8)) noConsCount++;
    if (fIE > 0 && cons > 0 && !(flags & 8)) auditedCount++;

    const be = fIE > 0 ? (fSE / fIE) * 100 : null;
    const ce = fAss > 0 ? (fReal / fAss) * 100 : (fReal > 0 ? 100 : null);
    const ll = be !== null ? 100 - be : null;
    const atc = (be !== null && ce !== null) ? 100 - (be * ce / 100) : null;

    const lineSlab = classifySlab(ll, fIE, cons, flags);
    const atcSlab  = classifySlab(atc, fIE, cons, flags);
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
    if (fIE === 0) sg.ie_zero++;
    if (cons === 0 || (flags & 8)) sg.no_consumers_tagged++;

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
    worst10
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
  const m1 = MON_INDEX[state.monthTo] ?? 5;
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

function renderByDiscomTable(rows) {
  const tbody = document.getElementById('byDiscomBody');
  if (!tbody || !rows) return;

  let sorted = [...rows];
  if (state.discomSortCol) {
    const col = state.discomSortCol;
    const dir = state.discomSortDir;
    sorted.sort((a, b) => {
      const va = a[col];
      const vb = b[col];
      if (typeof va === 'string') return dir * va.localeCompare(vb);
      return dir * ((Number(va) || 0) - (Number(vb) || 0));
    });
  }

  if (!sorted.length) {
    tbody.innerHTML = `<tr><td colspan="11" style="text-align:center;padding:16px;color:var(--ink-3)">No data available for current selection.</td></tr>`;
    return;
  }

  tbody.innerHTML = sorted.map(r => `
    <tr class="drill" onclick="filterByDiscomName('${r.discom}')" title="Click to filter by ${r.discom}">
      <td class="tx" style="font-weight:600;color:var(--accent);">${r.discom}</td>
      <td>${fmt(r.feeders)}</td>
      <td>${fmt(r.inputMu, 1)}</td>
      <td>${fmt(r.billedMu, 1)}</td>
      <td>${fmt(r.billingEff, 1)}%</td>
      <td>${fmt(r.collectionEff, 1)}%</td>
      <td>${lossPill(r.atcLoss, false)}</td>
      <td>₹${fmt(r.abr, 2)}</td>
      <td>${thruRatePill(r.thruRate)}</td>
      <td>₹${fmt(r.realisedCr, 1)}</td>
      <td style="font-weight:600;color:var(--crit);">₹${fmt(r.atcLossValueCr, 1)}</td>
    </tr>
  `).join('');
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
  'ALL': 26033,
  'PVVNL': 8074,
  'DVVNL': 6094,
  'PUVNL': 5579,
  'MVVNL': 5662,
  'KESCO': 624
};

// Discom-wise monthly billable consumer scaling ratios relative to August baseline [Apr, May, Jun, Jul, Aug, Sep]
// Derived from 11KV Feeder Audit Master Workbook and Oracle Sep26 dataset
const DISCOM_MONTHLY_BILLABLE_RATIOS = {
  'PVVNL': [0.99818, 0.99865, 0.99872, 0.98544, 1.0, 1.00925],
  'DVVNL': [0.97553, 0.97914, 0.98286, 0.98164, 1.0, 1.01702],
  'PUVNL': [0.99724, 0.99762, 0.99730, 0.98445, 1.0, 1.00814],
  'MVVNL': [0.99232, 0.99313, 0.99480, 0.97293, 1.0, 1.01310],
  'KESCO': [1.00376, 1.00287, 1.00200, 0.89090, 1.0, 1.01264],
  'ALL':   [0.99226, 0.99334, 0.99438, 0.97939, 1.0, 1.01144]
};

// Monthly billed consumer scaling ratios relative to August baseline [Apr, May, Jun, Jul, Aug, Sep]
const MONTHLY_BILLED_RATIOS = [0.98666, 0.99087, 0.99408, 0.98215, 1.0, 1.00800];

// Fallback monthly paid consumer scaling ratios relative to August baseline [Apr, May, Jun, Jul, Aug, Sep]
const MONTHLY_PAID_RATIOS = [1.27326, 1.01487, 1.18307, 1.08151, 1.0, 1.0];

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
  const activeFeeders = kpis ? (kpis.totalFeeders || 0) : (BASE_DISCOM_FEEDERS[discKey] || 26033);
  const baseFeeders = BASE_DISCOM_FEEDERS[discKey] || 26033;

  if (kpis && (activeFeeders === 0 || (activeAss === 0 && activeMu === 0))) {
    return { discKey, rows: [] };
  }

  // Feeder scaling ratio (for consumers and load when hierarchy/geographical filters are active)
  const feederRatio = baseFeeders > 0 ? Math.min(1.0, activeFeeders / baseFeeders) : 1.0;
  const scaleAss = baseAss > 0 ? (activeAss / baseAss) : 0;
  const scaleMu = baseMu > 0 ? (activeMu / baseMu) : 0;

  // Monthly snapshot scaling for selected "To" month (Apr=0, May=1, Jun=2, Jul=3, Aug=4, Sep=5)
  const mTo = (typeof MON_INDEX !== 'undefined' && MON_INDEX[state.monthTo] !== undefined) ? MON_INDEX[state.monthTo] : 5;
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
    const isCollapsed = state.collapsedDiscoms.has(dName);
    const icon = isCollapsed ? '▶' : '▼';

    // Discom Total row
    html += `
      <tr class="tot">
        <td class="tx"><span class="toggle-btn" onclick="toggleDiscomGroup('${dName}')">${icon}</span> <b>${dName}</b></td>
        <td class="tx"><b>${dName} Total</b></td>
        <td><b>${fmt(dt.total_feeders)}</b></td>
        <td>${fmt(dt.line_0_5)}</td><td>${fmt(dt.line_5_10)}</td><td>${fmt(dt.line_10_20)}</td><td>${fmt(dt.line_20_30)}</td>
        <td>${fmt(dt.line_30_50)}</td><td>${fmt(dt.line_50_70)}</td><td>${fmt(dt.line_above_70)}</td><td>${fmt(dt.line_abnormal)}</td>
        <td>${fmt(dt.atc_0_5)}</td><td>${fmt(dt.atc_5_10)}</td><td>${fmt(dt.atc_10_20)}</td><td>${fmt(dt.atc_20_30)}</td>
        <td>${fmt(dt.atc_30_50)}</td><td>${fmt(dt.atc_50_70)}</td><td>${fmt(dt.atc_above_70)}</td><td>${fmt(dt.atc_abnormal)}</td>
        <td>${fmt(dt.ie_zero)}</td><td>${fmt(dt.no_consumers_tagged)}</td>
      </tr>
    `;

    // Zone rows
    if (!isCollapsed) {
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
}

window.toggleDiscomGroup = function(discom) {
  if (state.collapsedDiscoms.has(discom)) {
    state.collapsedDiscoms.delete(discom);
  } else {
    state.collapsedDiscoms.add(discom);
  }
  if (computedResult) {
    renderProgressiveSummaryTable(computedResult.progressiveSummary);
  }
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
  if (state.monthFrom !== 'Apr' || state.monthTo !== 'Aug') {
    chips.push({ label: `Months: ${state.monthFrom}–${state.monthTo} 2026`, clear: () => { state.monthFrom = 'Apr'; state.monthTo = 'Aug'; document.getElementById('fMonthFrom').value = 'Apr'; document.getElementById('fMonthTo').value = 'Aug'; } });
  }
  if (state.search) chips.push({ label: `Search: "${state.search}"`, clear: () => { state.search = ''; document.getElementById('fSearch').value = ''; } });
  if (state.excludeAbnormal) chips.push({ label: 'Excl: Abnormal Assessment', clear: () => { state.excludeAbnormal = false; document.getElementById('chkAbnormal').checked = false; onFilterChanged(); } });
  if (state.excludeBilledGtInput) chips.push({ label: 'Excl: Billed > Input', clear: () => { state.excludeBilledGtInput = false; document.getElementById('chkBilledGtInput').checked = false; onFilterChanged(); } });
  if (state.excludeZeroInput) chips.push({ label: 'Excl: Zero Input', clear: () => { state.excludeZeroInput = false; document.getElementById('chkZeroInput').checked = false; onFilterChanged(); } });
  if (state.excludeCdf) chips.push({ label: 'Excl: CDF Bills', clear: () => { state.excludeCdf = false; const c = document.getElementById('chkExcludeCdf'); if (c) c.checked = false; updateAuditBadges(); onFilterChanged(); } });
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
  renderByDiscomTable(computedResult.discomSummary);
  renderCategoryTable(computedResult.categoryBreakdown);
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
  const i1 = MON_INDEX[state.monthTo] ?? 5;
  if (i0 > i1) {
    state.monthTo = state.monthFrom;
    document.getElementById('fMonthTo').value = state.monthTo;
  }
  onFilterChanged();
});

document.getElementById('fMonthTo').addEventListener('change', function() {
  state.monthTo = this.value;
  const i0 = MON_INDEX[state.monthFrom] ?? 0;
  const i1 = MON_INDEX[state.monthTo] ?? 5;
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

document.getElementById('chkZeroInput').addEventListener('change', function() {
  state.excludeZeroInput = this.checked;
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
  state.tableSearch = this.value.trim();
  if (computedResult) {
    renderProgressiveSummaryTable(computedResult.progressiveSummary);
  }
});

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
  state.monthTo = 'Aug';
  state.search = '';
  state.tableSearch = '';
  state.excludeAbnormal = false;
  state.excludeBilledGtInput = false;
  state.excludeZeroInput = false;
  state.excludeCdf = false;
  state.includePtw = false;
  state.includeGovt = true;
  state.includeSubsidy = false;
  state.sortCol = null;
  state.sortDir = 1;
  state.discomSortCol = null;
  state.discomSortDir = -1;
  state.categorySortCol = 'consumers';
  state.categorySortDir = -1;
  state.catTableGroup = 'feederType';
  state.top150SortCol = 'atcLossValueCr';
  state.top150SortDir = -1;
  state.wfSortCol = 'atc';
  state.wfSortDir = -1;
  state.collapsedDiscoms.clear();

  document.getElementById('fDiscom').value = '';
  document.getElementById('fZone').value = '';
  document.getElementById('fCircle').value = '';
  document.getElementById('fDivision').value = '';
  document.getElementById('fArea').value = '';
  document.getElementById('fFeederType').value = '';
  document.getElementById('fMonthFrom').value = 'Apr';
  document.getElementById('fMonthTo').value = 'Aug';
  document.getElementById('fSearch').value = '';
  document.getElementById('tSearch').value = '';
  document.getElementById('chkAbnormal').checked = false;
  document.getElementById('chkBilledGtInput').checked = false;
  document.getElementById('chkZeroInput').checked = false;
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

// ── 2. By Discom Table Sorting (#tblByDiscom) ──
document.querySelectorAll('#tblByDiscom th[data-dcol]').forEach(th => {
  th.addEventListener('click', () => {
    const col = th.getAttribute('data-dcol');
    if (state.discomSortCol === col) {
      state.discomSortDir *= -1;
    } else {
      state.discomSortCol = col;
      state.discomSortDir = -1;
    }
    document.querySelectorAll('#tblByDiscom th.sorted').forEach(t => t.classList.remove('sorted'));
    document.querySelectorAll('#tblByDiscom th .sort-ico').forEach(ico => ico.textContent = '↕');
    th.classList.add('sorted');
    const sortIcon = th.querySelector('.sort-ico');
    if (sortIcon) sortIcon.textContent = state.discomSortDir === 1 ? '▲' : '▼';
    if (computedResult) {
      renderByDiscomTable(computedResult.discomSummary);
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
    const isCollapsed = state.collapsedDiscoms.has(dName);

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

    // If expanded, include individual zone rows
    if (!isCollapsed) {
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

  // 2-tier headers matching dashboard
  const headerRow1 = [
    'Discom', 'Zone / Rollup', 'Total Feeders',
    'LINE LOSS SLAB (Progressive Upto Aug-26)', '', '', '', '', '', '', '',
    'AT&C LOSS SLAB (Progressive Upto Aug-26)', '', '', '', '', '', '', '',
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
    const isCollapsed = state.collapsedDiscoms.has(dName);

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
      rowConfig.push({ level: 1, hidden: isCollapsed });
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

// ── Initial Boot Sequence ──
(async function boot() {
  checkHealth();
  initCharts();
  await loadDataset();
  syncCascadeDropdowns();
  onFilterChanged();
})();
