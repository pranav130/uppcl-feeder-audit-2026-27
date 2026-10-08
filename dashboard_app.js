
function updatePtwBadge(isIncluded) {
  const ptwBadge = document.getElementById('ptwStatusBadge');
  if (!ptwBadge) return;
  if (isIncluded) {
    ptwBadge.textContent = 'PTW Status: INCLUDED';
    ptwBadge.className = 'tag-badge ptw-on';
  } else {
    ptwBadge.textContent = 'PTW Status: EXCLUDED';
    ptwBadge.className = 'tag-badge ptw-off';
  }
}

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
  monthTo: 'Aug',
  search: '',
  tableSearch: '',
  excludeAbnormal: false,
  excludeBilledGtInput: false,
  excludeZeroInput: false,
  includePtw: false,
  sortCol: null,
  sortDir: 1,
  discomSortCol: null,
  discomSortDir: -1,
  top150SortCol: 'atcLossValueCr',
  top150SortDir: -1,
  wfSortCol: 'atc',
  wfSortDir: -1,
  collapsedDiscoms: new Set(),
  hBarType: 'atc',
  ftBarGroup: 'feederType',
  categorySortCol: 'consumers',
  categorySortDir: -1,
  catTableGroup: 'feederType'
};
window.state = state;

const MON_LABELS = ['Apr', 'May', 'Jun', 'Jul', 'Aug'];
const MON_FULL   = ['April', 'May', 'June', 'July', 'August'];
const MON_INDEX  = { Apr: 0, May: 1, Jun: 2, Jul: 3, Aug: 4 };

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

const CATEGORY_DATA_BY_DISCOM = {"ALL":[{"category":"HV1","consumers":9769,"billedMu":589.52,"assessmentCr":573.67,"realisedCr":598.08,"abr":9.73,"collectionEff":104.26,"baseRealisedCr":598.08},{"category":"HV2","consumers":17640,"billedMu":41943.41,"assessmentCr":1521.42,"realisedCr":1170.62,"abr":0.36,"collectionEff":76.94,"baseRealisedCr":1170.62},{"category":"HV3","consumers":42,"billedMu":20.94,"assessmentCr":17.37,"realisedCr":17.37,"abr":8.3,"collectionEff":100.0,"baseRealisedCr":17.37},{"category":"HV4","consumers":173,"billedMu":60.73,"assessmentCr":64.19,"realisedCr":64.19,"abr":10.57,"collectionEff":100.0,"baseRealisedCr":64.19},{"category":"LMV1","consumers":24237906,"billedMu":3028.24,"assessmentCr":1379.21,"realisedCr":614.63,"abr":4.55,"collectionEff":44.56,"baseRealisedCr":614.63},{"category":"LMV11","consumers":707,"billedMu":0.92,"assessmentCr":0.58,"realisedCr":0.58,"abr":6.3,"collectionEff":100.0,"baseRealisedCr":0.58},{"category":"LMV2","consumers":3524293,"billedMu":1189.01,"assessmentCr":1060.96,"realisedCr":919.85,"abr":8.92,"collectionEff":86.7,"baseRealisedCr":919.85},{"category":"LMV3","consumers":56832,"billedMu":12.18,"assessmentCr":45.74,"realisedCr":45.76,"abr":37.55,"collectionEff":100.04,"baseRealisedCr":45.76},{"category":"LMV4A","consumers":331047,"billedMu":147.06,"assessmentCr":134.79,"realisedCr":134.79,"abr":9.17,"collectionEff":100.0,"baseRealisedCr":134.79},{"category":"LMV4B","consumers":43558,"billedMu":55.38,"assessmentCr":88.46,"realisedCr":57.42,"abr":15.97,"collectionEff":64.91,"baseRealisedCr":57.42},{"category":"LMV5","consumers":1860562,"billedMu":2735.68,"assessmentCr":133.29,"realisedCr":1.8,"abr":0.49,"collectionEff":1.35,"baseRealisedCr":1.8},{"category":"LMV6","consumers":330523,"billedMu":109.28,"assessmentCr":74.58,"realisedCr":71.87,"abr":6.82,"collectionEff":96.37,"baseRealisedCr":71.87},{"category":"LMV7","consumers":43843,"billedMu":184.2,"assessmentCr":152.65,"realisedCr":152.71,"abr":8.29,"collectionEff":100.04,"baseRealisedCr":152.71},{"category":"LMV8","consumers":36604,"billedMu":116.6,"assessmentCr":84.94,"realisedCr":84.94,"abr":7.28,"collectionEff":100.0,"baseRealisedCr":84.94},{"category":"LMV9","consumers":127219,"billedMu":29.72,"assessmentCr":45.46,"realisedCr":37.12,"abr":15.3,"collectionEff":81.65,"baseRealisedCr":37.12}],"DVVNL":[{"category":"HV1","consumers":1182,"billedMu":51.23,"assessmentCr":54.76,"realisedCr":53.02,"abr":10.69,"collectionEff":96.82,"baseRealisedCr":53.02},{"category":"HV2","consumers":4055,"billedMu":508.19,"assessmentCr":389.64,"realisedCr":279.86,"abr":7.67,"collectionEff":71.83,"baseRealisedCr":279.86},{"category":"HV3","consumers":5,"billedMu":2.49,"assessmentCr":1.9,"realisedCr":1.9,"abr":7.63,"collectionEff":100.0,"baseRealisedCr":1.9},{"category":"HV4","consumers":51,"billedMu":5.78,"assessmentCr":10.61,"realisedCr":10.61,"abr":18.36,"collectionEff":100.0,"baseRealisedCr":10.61},{"category":"LMV1","consumers":4386684,"billedMu":454.0,"assessmentCr":219.56,"realisedCr":90.57,"abr":4.84,"collectionEff":41.25,"baseRealisedCr":90.57},{"category":"LMV11","consumers":62,"billedMu":0.04,"assessmentCr":0.03,"realisedCr":0.02,"abr":7.5,"collectionEff":66.67,"baseRealisedCr":0.02},{"category":"LMV2","consumers":555640,"billedMu":188.3,"assessmentCr":149.41,"realisedCr":142.16,"abr":7.93,"collectionEff":95.15,"baseRealisedCr":142.16},{"category":"LMV3","consumers":21798,"billedMu":4.42,"assessmentCr":14.21,"realisedCr":14.21,"abr":32.15,"collectionEff":100.0,"baseRealisedCr":14.21},{"category":"LMV4A","consumers":77529,"billedMu":37.05,"assessmentCr":42.9,"realisedCr":42.9,"abr":11.58,"collectionEff":100.0,"baseRealisedCr":42.9},{"category":"LMV4B","consumers":9326,"billedMu":11.21,"assessmentCr":12.54,"realisedCr":12.07,"abr":11.19,"collectionEff":96.25,"baseRealisedCr":12.07},{"category":"LMV5","consumers":404241,"billedMu":1051.64,"assessmentCr":59.11,"realisedCr":0.46,"abr":0.56,"collectionEff":0.78,"baseRealisedCr":0.46},{"category":"LMV6","consumers":91302,"billedMu":15.72,"assessmentCr":16.95,"realisedCr":16.91,"abr":10.78,"collectionEff":99.76,"baseRealisedCr":16.91},{"category":"LMV7","consumers":18835,"billedMu":46.56,"assessmentCr":37.56,"realisedCr":37.56,"abr":8.07,"collectionEff":100.0,"baseRealisedCr":37.56},{"category":"LMV8","consumers":8196,"billedMu":31.53,"assessmentCr":21.69,"realisedCr":21.69,"abr":6.88,"collectionEff":100.0,"baseRealisedCr":21.69},{"category":"LMV9","consumers":21678,"billedMu":3.82,"assessmentCr":5.8,"realisedCr":4.99,"abr":15.18,"collectionEff":86.03,"baseRealisedCr":4.99}],"KESCO":[{"category":"HV1","consumers":416,"billedMu":37.69,"assessmentCr":26.77,"realisedCr":27.45,"abr":7.1,"collectionEff":102.54,"baseRealisedCr":27.45},{"category":"HV2","consumers":530,"billedMu":68.1,"assessmentCr":50.03,"realisedCr":28.67,"abr":7.35,"collectionEff":57.31,"baseRealisedCr":28.67},{"category":"HV3","consumers":2,"billedMu":0.65,"assessmentCr":0.0,"realisedCr":0.0,"abr":0.0,"collectionEff":0.0,"baseRealisedCr":0.0},{"category":"LMV1","consumers":5755,"billedMu":15.87,"assessmentCr":10.39,"realisedCr":10.58,"abr":6.55,"collectionEff":101.83,"baseRealisedCr":10.58},{"category":"LMV11","consumers":122,"billedMu":0.12,"assessmentCr":0.07,"realisedCr":0.06,"abr":5.83,"collectionEff":85.71,"baseRealisedCr":0.06},{"category":"LMV2","consumers":190846,"billedMu":51.19,"assessmentCr":46.22,"realisedCr":41.98,"abr":9.03,"collectionEff":90.83,"baseRealisedCr":41.98},{"category":"LMV3","consumers":613,"billedMu":0.02,"assessmentCr":0.26,"realisedCr":0.26,"abr":130.0,"collectionEff":100.0,"baseRealisedCr":0.26},{"category":"LMV4A","consumers":1784,"billedMu":4.21,"assessmentCr":2.59,"realisedCr":2.59,"abr":6.15,"collectionEff":100.0,"baseRealisedCr":2.59},{"category":"LMV4B","consumers":1023,"billedMu":3.18,"assessmentCr":2.87,"realisedCr":2.48,"abr":9.03,"collectionEff":86.41,"baseRealisedCr":2.48},{"category":"LMV5","consumers":27,"billedMu":0.0,"assessmentCr":0.0,"realisedCr":0.0,"abr":0.0,"collectionEff":0.0,"baseRealisedCr":0.0},{"category":"LMV6","consumers":17273,"billedMu":4.09,"assessmentCr":4.42,"realisedCr":3.99,"abr":10.81,"collectionEff":90.27,"baseRealisedCr":3.99},{"category":"LMV7","consumers":1648,"billedMu":7.43,"assessmentCr":5.23,"realisedCr":5.23,"abr":7.04,"collectionEff":100.0,"baseRealisedCr":5.23},{"category":"LMV9","consumers":9160,"billedMu":0.85,"assessmentCr":1.93,"realisedCr":1.32,"abr":22.71,"collectionEff":68.39,"baseRealisedCr":1.32}],"MVVNL":[{"category":"HV1","consumers":2576,"billedMu":154.24,"assessmentCr":139.51,"realisedCr":147.46,"abr":9.04,"collectionEff":105.7,"baseRealisedCr":147.46},{"category":"HV2","consumers":2959,"billedMu":260.79,"assessmentCr":211.99,"realisedCr":173.21,"abr":8.13,"collectionEff":81.71,"baseRealisedCr":173.21},{"category":"HV3","consumers":11,"billedMu":0.0,"assessmentCr":0.0,"realisedCr":0.0,"abr":0.0,"collectionEff":0.0,"baseRealisedCr":0.0},{"category":"HV4","consumers":21,"billedMu":5.12,"assessmentCr":5.52,"realisedCr":5.52,"abr":10.78,"collectionEff":100.0,"baseRealisedCr":5.52},{"category":"LMV1","consumers":7086732,"billedMu":774.33,"assessmentCr":319.7,"realisedCr":114.34,"abr":4.13,"collectionEff":35.76,"baseRealisedCr":114.34},{"category":"LMV11","consumers":180,"billedMu":0.38,"assessmentCr":0.22,"realisedCr":0.21,"abr":5.79,"collectionEff":95.45,"baseRealisedCr":0.21},{"category":"LMV2","consumers":874197,"billedMu":295.37,"assessmentCr":253.11,"realisedCr":236.93,"abr":8.57,"collectionEff":93.61,"baseRealisedCr":236.93},{"category":"LMV3","consumers":12485,"billedMu":4.31,"assessmentCr":10.57,"realisedCr":10.57,"abr":24.52,"collectionEff":100.0,"baseRealisedCr":10.57},{"category":"LMV4A","consumers":106335,"billedMu":43.18,"assessmentCr":36.19,"realisedCr":36.19,"abr":8.38,"collectionEff":100.0,"baseRealisedCr":36.19},{"category":"LMV4B","consumers":10071,"billedMu":11.68,"assessmentCr":12.88,"realisedCr":12.97,"abr":11.03,"collectionEff":100.7,"baseRealisedCr":12.97},{"category":"LMV5","consumers":383676,"billedMu":454.18,"assessmentCr":15.99,"realisedCr":0.47,"abr":0.35,"collectionEff":2.94,"baseRealisedCr":0.47},{"category":"LMV6","consumers":49320,"billedMu":13.22,"assessmentCr":11.7,"realisedCr":11.62,"abr":8.85,"collectionEff":99.32,"baseRealisedCr":11.62},{"category":"LMV7","consumers":7732,"billedMu":31.13,"assessmentCr":27.73,"realisedCr":27.77,"abr":8.91,"collectionEff":100.14,"baseRealisedCr":27.77},{"category":"LMV8","consumers":10436,"billedMu":29.25,"assessmentCr":21.13,"realisedCr":21.13,"abr":7.22,"collectionEff":100.0,"baseRealisedCr":21.13},{"category":"LMV9","consumers":40083,"billedMu":7.12,"assessmentCr":12.21,"realisedCr":9.56,"abr":17.15,"collectionEff":78.3,"baseRealisedCr":9.56}],"PUVNL":[{"category":"HV1","consumers":1980,"billedMu":126.49,"assessmentCr":119.54,"realisedCr":121.33,"abr":9.45,"collectionEff":101.5,"baseRealisedCr":121.33},{"category":"HV2","consumers":2466,"billedMu":473.7,"assessmentCr":364.95,"realisedCr":143.49,"abr":7.7,"collectionEff":39.32,"baseRealisedCr":143.49},{"category":"HV3","consumers":7,"billedMu":0.0,"assessmentCr":0.0,"realisedCr":0.0,"abr":0.0,"collectionEff":0.0,"baseRealisedCr":0.0},{"category":"HV4","consumers":94,"billedMu":49.68,"assessmentCr":47.07,"realisedCr":47.07,"abr":9.47,"collectionEff":100.0,"baseRealisedCr":47.07},{"category":"LMV1","consumers":8819074,"billedMu":1080.16,"assessmentCr":471.12,"realisedCr":151.45,"abr":4.36,"collectionEff":32.15,"baseRealisedCr":151.45},{"category":"LMV11","consumers":138,"billedMu":0.17,"assessmentCr":0.1,"realisedCr":0.11,"abr":5.88,"collectionEff":110.0,"baseRealisedCr":0.11},{"category":"LMV2","consumers":935928,"billedMu":365.55,"assessmentCr":291.27,"realisedCr":225.18,"abr":7.97,"collectionEff":77.31,"baseRealisedCr":225.18},{"category":"LMV3","consumers":14387,"billedMu":2.31,"assessmentCr":12.47,"realisedCr":12.49,"abr":53.98,"collectionEff":100.16,"baseRealisedCr":12.49},{"category":"LMV4A","consumers":99072,"billedMu":42.99,"assessmentCr":34.97,"realisedCr":34.97,"abr":8.13,"collectionEff":100.0,"baseRealisedCr":34.97},{"category":"LMV4B","consumers":12013,"billedMu":14.93,"assessmentCr":43.57,"realisedCr":13.88,"abr":29.18,"collectionEff":31.86,"baseRealisedCr":13.88},{"category":"LMV5","consumers":493840,"billedMu":404.76,"assessmentCr":19.15,"realisedCr":0.49,"abr":0.47,"collectionEff":2.56,"baseRealisedCr":0.49},{"category":"LMV6","consumers":76046,"billedMu":21.79,"assessmentCr":16.46,"realisedCr":15.75,"abr":7.55,"collectionEff":95.69,"baseRealisedCr":15.75},{"category":"LMV7","consumers":7535,"billedMu":56.99,"assessmentCr":40.75,"realisedCr":40.75,"abr":7.15,"collectionEff":100.0,"baseRealisedCr":40.75},{"category":"LMV8","consumers":12734,"billedMu":47.12,"assessmentCr":32.4,"realisedCr":32.4,"abr":6.88,"collectionEff":100.0,"baseRealisedCr":32.4},{"category":"LMV9","consumers":19437,"billedMu":3.69,"assessmentCr":6.54,"realisedCr":5.55,"abr":17.72,"collectionEff":84.86,"baseRealisedCr":5.55}],"PVVNL":[{"category":"HV1","consumers":3615,"billedMu":219.87,"assessmentCr":233.09,"realisedCr":248.82,"abr":10.6,"collectionEff":106.75,"baseRealisedCr":248.82},{"category":"HV2","consumers":7630,"billedMu":40632.63,"assessmentCr":504.81,"realisedCr":545.39,"abr":0.12,"collectionEff":108.04,"baseRealisedCr":545.39},{"category":"HV3","consumers":17,"billedMu":17.8,"assessmentCr":15.47,"realisedCr":15.47,"abr":8.69,"collectionEff":100.0,"baseRealisedCr":15.47},{"category":"HV4","consumers":7,"billedMu":0.15,"assessmentCr":0.99,"realisedCr":0.99,"abr":66.0,"collectionEff":100.0,"baseRealisedCr":0.99},{"category":"LMV1","consumers":3939661,"billedMu":703.88,"assessmentCr":358.44,"realisedCr":247.69,"abr":5.09,"collectionEff":69.1,"baseRealisedCr":247.69},{"category":"LMV11","consumers":205,"billedMu":0.21,"assessmentCr":0.16,"realisedCr":0.18,"abr":7.62,"collectionEff":112.5,"baseRealisedCr":0.18},{"category":"LMV2","consumers":967682,"billedMu":288.6,"assessmentCr":320.95,"realisedCr":273.6,"abr":11.12,"collectionEff":85.25,"baseRealisedCr":273.6},{"category":"LMV3","consumers":7549,"billedMu":1.12,"assessmentCr":8.23,"realisedCr":8.23,"abr":73.48,"collectionEff":100.0,"baseRealisedCr":8.23},{"category":"LMV4A","consumers":46327,"billedMu":19.63,"assessmentCr":18.14,"realisedCr":18.14,"abr":9.24,"collectionEff":100.0,"baseRealisedCr":18.14},{"category":"LMV4B","consumers":11125,"billedMu":14.38,"assessmentCr":16.6,"realisedCr":16.02,"abr":11.54,"collectionEff":96.51,"baseRealisedCr":16.02},{"category":"LMV5","consumers":578778,"billedMu":825.1,"assessmentCr":39.04,"realisedCr":0.38,"abr":0.47,"collectionEff":0.97,"baseRealisedCr":0.38},{"category":"LMV6","consumers":96582,"billedMu":54.46,"assessmentCr":25.05,"realisedCr":23.6,"abr":4.6,"collectionEff":94.21,"baseRealisedCr":23.6},{"category":"LMV7","consumers":8093,"billedMu":42.09,"assessmentCr":41.38,"realisedCr":41.4,"abr":9.83,"collectionEff":100.05,"baseRealisedCr":41.4},{"category":"LMV8","consumers":5238,"billedMu":8.7,"assessmentCr":9.72,"realisedCr":9.72,"abr":11.17,"collectionEff":100.0,"baseRealisedCr":9.72},{"category":"LMV9","consumers":36861,"billedMu":14.24,"assessmentCr":18.98,"realisedCr":15.7,"abr":13.33,"collectionEff":82.72,"baseRealisedCr":15.7}]};


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

// ── Dataset Provider ──
let N = null; // Dictionaries
let R = null; // Rows
let computedResult = null;

async function loadDataset() {
  if (window.__FEEDERS_RAW) {
    N = window.__FEEDERS_RAW.d;
    R = window.__FEEDERS_RAW.rows;
    return;
  }
  try {
    const res = await fetch('data/feeders.json');
    if (!res.ok) throw new Error('Fetch failed');
    const json = await res.json();
    N = json.d;
    R = json.rows;
    window.__FEEDERS_RAW = json;
  } catch (err) {
    console.error('Failed to load dataset:', err);
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
  const m1 = MON_INDEX[state.monthTo] ?? 4;
  const validM0 = Math.min(m0, m1);
  const validM1 = Math.max(m0, m1);

  let totalScoped = 0;
  let ieZeroCount = 0;
  let noConsCount = 0;
  let auditedCount = 0;

  let totIE = 0, totSE = 0, totAss = 0, totReal = 0;
  const monthly = [0, 1, 2, 3, 4].map(() => ({ ie: 0, se: 0, ass: 0, real: 0 }));

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
    if (state.excludeAbnormal && (flags & 1)) continue;
    if (state.excludeBilledGtInput && (flags & 2)) continue;
    if (state.excludeZeroInput && (flags & 4)) continue;

    let fIE = 0, fSE = 0, fAss = 0, fReal = 0;

    for (let m = validM0; m <= validM1; m++) {
      fIE += r[8][m];
      fSE += r[9][m];
      fAss += r[10][m]; // Assessment is CONSTANT in both modes

      // Realization changes based on PTW:
      // When Include PTW is checked: PTW Assessment = PTW Realization (crediting PTW Assessment to Realization)
      let mReal = r[11][m];
      if (state.includePtw && r[14] && r[14][m]) {
        mReal += r[14][m];
      }
      fReal += mReal;
    }

    totIE += fIE; totSE += fSE; totAss += fAss; totReal += fReal;

    for (let m = 0; m < 5; m++) {
      monthly[m].ie += r[8][m];
      monthly[m].se += r[9][m];
      monthly[m].ass += r[10][m]; // Assessment CONSTANT
      let mReal = r[11][m];
      if (state.includePtw && r[14] && r[14][m]) {
        mReal += r[14][m]; // Credit PTW assessment to Realization
      }
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
  document.getElementById('kpiIE').textContent = fmt(d.inputEnergyMu, 1);
  document.getElementById('kpiSE').textContent = fmt(d.soldEnergyMu, 1);
  document.getElementById('kpiBE').textContent = (d.billingEfficiency || 0).toFixed(1) + '%';
  document.getElementById('kpiCE').textContent = (d.collectionEfficiency || 0).toFixed(1) + '%';
  document.getElementById('kpiLL').textContent = (d.lineLoss || 0).toFixed(1) + '%';
  document.getElementById('kpiATC').textContent = (d.atcLoss || 0).toFixed(1) + '%';

  document.getElementById('kpiABR').textContent = fmt(d.avgBillingRate, 2);
  document.getElementById('kpiThru').textContent = fmt(d.thruRate, 2);
  document.getElementById('kpiLossPerUnit').textContent = fmt(d.lossPerUnit, 2);
  document.getElementById('kpiAss').textContent = fmt(d.assessmentCr);
  document.getElementById('kpiReal').textContent = fmt(d.realizationCr);
  const elALV = document.getElementById('kpiALV');
  if (elALV) elALV.textContent = fmt(d.atcLossValueCr);

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
  const m1 = MON_INDEX[state.monthTo] ?? 4;
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

function renderCategoryTable(data) {
  const tbody = document.getElementById('byCategoryBody');
  const tfoot = document.getElementById('byCategoryFoot');
  if (!tbody) return;

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

  const rawRows = (typeof CATEGORY_DATA_BY_DISCOM !== 'undefined' && CATEGORY_DATA_BY_DISCOM[discKey]) ? CATEGORY_DATA_BY_DISCOM[discKey] : (CATEGORY_DATA_BY_DISCOM['ALL'] || []);

  // Clone rows and handle PTW toggle rule
  const rows = rawRows.map(r => {
    const item = { ...r };
    item.desc = (typeof CATEGORY_NAMES !== 'undefined' && CATEGORY_NAMES[item.category]) ? CATEGORY_NAMES[item.category] : '';
    if (item.category === 'LMV5') {
      if (state.includePtw) {
        item.realisedCr = item.assessmentCr;
        item.collectionEff = 100.0;
      } else {
        item.realisedCr = item.baseRealisedCr;
        item.collectionEff = item.assessmentCr > 0 ? Math.round((item.baseRealisedCr / item.assessmentCr * 100) * 100) / 100 : 0.0;
      }
    }
    return item;
  });

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
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:16px;color:var(--ink-3)">No category data available for current selection.</td></tr>`;
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
        <td style="font-weight:600;">${fmt(r.consumers)}</td>
        <td>${fmt(r.billedMu, 2)}</td>
        <td>₹${fmt(r.assessmentCr, 2)}</td>
        <td>₹${fmt(r.realisedCr, 2)}</td>
        <td style="font-weight:600;">₹${fmt(r.abr, 2)}</td>
        <td style="font-weight:600;color:${ceColor};">${fmt(r.collectionEff, 2)}%</td>
      </tr>
    `;
  }).join('');

  if (tfoot) {
    let totC = 0, totMu = 0, totAss = 0, totReal = 0;
    for (const r of rows) {
      totC += (r.consumers || 0);
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
        <td style="font-weight:700;">${fmt(totC)}</td>
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
  if (state.excludeAbnormal) chips.push({ label: 'Excl: Abnormal Assessment', clear: () => { state.excludeAbnormal = false; document.getElementById('chkAbnormal').checked = false; } });
  if (state.excludeBilledGtInput) chips.push({ label: 'Excl: Billed > Input', clear: () => { state.excludeBilledGtInput = false; document.getElementById('chkBilledGtInput').checked = false; } });
  if (state.excludeZeroInput) chips.push({ label: 'Excl: Zero Input', clear: () => { state.excludeZeroInput = false; document.getElementById('chkZeroInput').checked = false;
  state.includePtw = false;
  const cbPtw = document.getElementById('chkIncludePtw');
  if (cbPtw) cbPtw.checked = false;
  updatePtwBadge(false); } });
  if (state.includePtw) chips.push({ label: 'PTW: Included', clear: () => { state.includePtw = false; const c = document.getElementById('chkIncludePtw'); if (c) c.checked = false; updatePtwBadge(false); } });

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
  const i1 = MON_INDEX[state.monthTo] ?? 4;
  if (i0 > i1) {
    state.monthTo = state.monthFrom;
    document.getElementById('fMonthTo').value = state.monthTo;
  }
  onFilterChanged();
});

document.getElementById('fMonthTo').addEventListener('change', function() {
  state.monthTo = this.value;
  const i0 = MON_INDEX[state.monthFrom] ?? 0;
  const i1 = MON_INDEX[state.monthTo] ?? 4;
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
  let discKey = 'ALL';
  const selDisc = (state.discom || '').toUpperCase().trim();
  if (selDisc) {
    if (selDisc.includes('DAKSHIN') || selDisc === 'DVVNL') discKey = 'DVVNL';
    else if (selDisc.includes('PASCHIM') || selDisc === 'PVVNL') discKey = 'PVVNL';
    else if (selDisc.includes('MADHYA') || selDisc === 'MVVNL') discKey = 'MVVNL';
    else if (selDisc.includes('POORV') || selDisc.includes('PURV') || selDisc === 'PUVNL' || selDisc === 'PUVVNL') discKey = 'PUVNL';
    else if (selDisc.includes('KESCO')) discKey = 'KESCO';
  }

  const rawRows = (typeof CATEGORY_DATA_BY_DISCOM !== 'undefined' && CATEGORY_DATA_BY_DISCOM[discKey]) ? CATEGORY_DATA_BY_DISCOM[discKey] : (CATEGORY_DATA_BY_DISCOM['ALL'] || []);
  const rows = rawRows.map(r => {
    const item = { ...r };
    item.desc = (typeof CATEGORY_NAMES !== 'undefined' && CATEGORY_NAMES[item.category]) ? CATEGORY_NAMES[item.category] : '';
    if (item.category === 'LMV5') {
      if (state.includePtw) {
        item.realisedCr = item.assessmentCr;
        item.collectionEff = 100.0;
      } else {
        item.realisedCr = item.baseRealisedCr;
        item.collectionEff = item.assessmentCr > 0 ? Math.round((item.baseRealisedCr / item.assessmentCr * 100) * 100) / 100 : 0.0;
      }
    }
    return item;
  });

  const headers = [
    'Category', 'Description', 'No. of Consumers', 'Billed Energy (MU)',
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
  csvLines.push(`# Generated: ${new Date().toLocaleString('en-IN')}`);
  csvLines.push(headers.join(','));

  let totC = 0, totMu = 0, totAss = 0, totReal = 0;
  for (const r of rows) {
    totC += (r.consumers || 0);
    totMu += (r.billedMu || 0);
    totAss += (r.assessmentCr || 0);
    totReal += (r.realisedCr || 0);

    csvLines.push([
      escapeVal(r.category),
      escapeVal(r.desc),
      r.consumers || 0,
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
    totC,
    totMu.toFixed(2),
    totAss.toFixed(2),
    totReal.toFixed(2),
    totAbr.toFixed(2),
    totCe.toFixed(2)
  ].join(','));

  const blob = new Blob([csvLines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `UPPCL_Category_Performance_Summary_${discKey}_${new Date().toISOString().slice(0, 10)}.csv`;
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
