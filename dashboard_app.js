
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
  categorySortCol: 'billableConsumers',
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

const CATEGORY_DATA_BY_DISCOM = {"ALL":[{"category":"HV1","billableConsumers":8822,"loadKw":2645109.33,"billedConsumers":8407,"paidConsumers":7145,"billedMu":2627.66,"assessmentCr":3403.94,"realisedCr":3673.04,"baseRealisedCr":3673.04,"abr":12.95,"collectionEff":107.91},{"category":"HV2","billableConsumers":17453,"loadKw":6322139.21,"billedConsumers":16197,"paidConsumers":14870,"billedMu":8226.42,"assessmentCr":8593.81,"realisedCr":7089.59,"baseRealisedCr":7089.59,"abr":10.45,"collectionEff":82.5},{"category":"HV3","billableConsumers":10,"loadKw":68200.0,"billedConsumers":10,"paidConsumers":12,"billedMu":96.58,"assessmentCr":103.39,"realisedCr":100.54,"baseRealisedCr":100.54,"abr":10.71,"collectionEff":97.24},{"category":"HV4","billableConsumers":139,"loadKw":207525.41,"billedConsumers":119,"paidConsumers":8,"billedMu":229.59,"assessmentCr":307.67,"realisedCr":385.69,"baseRealisedCr":385.69,"abr":13.4,"collectionEff":125.36},{"category":"LMV1","billableConsumers":21828481,"loadKw":30262995.35,"billedConsumers":21610717,"paidConsumers":3403369,"billedMu":12551.73,"assessmentCr":7507.35,"realisedCr":3720.46,"baseRealisedCr":3720.46,"abr":5.98,"collectionEff":49.56},{"category":"LMV11","billableConsumers":641,"loadKw":13326.95,"billedConsumers":495,"paidConsumers":312,"billedMu":4.25,"assessmentCr":3.72,"realisedCr":3.68,"baseRealisedCr":3.68,"abr":8.75,"collectionEff":98.92},{"category":"LMV2","billableConsumers":2474918,"loadKw":7700396.54,"billedConsumers":2411558,"paidConsumers":1346780,"billedMu":5036.64,"assessmentCr":6141.98,"realisedCr":5690.93,"baseRealisedCr":5690.93,"abr":12.19,"collectionEff":92.66},{"category":"LMV3","billableConsumers":54243,"loadKw":195524.58,"billedConsumers":52607,"paidConsumers":871,"billedMu":48.6,"assessmentCr":251.77,"realisedCr":281.14,"baseRealisedCr":281.14,"abr":51.8,"collectionEff":111.67},{"category":"LMV4A","billableConsumers":302472,"loadKw":894641.92,"billedConsumers":295520,"paidConsumers":9797,"billedMu":601.74,"assessmentCr":754.89,"realisedCr":837.13,"baseRealisedCr":837.13,"abr":12.55,"collectionEff":110.89},{"category":"LMV4B","billableConsumers":39155,"loadKw":328375.11,"billedConsumers":37850,"paidConsumers":23820,"billedMu":234.6,"assessmentCr":474.73,"realisedCr":354.65,"baseRealisedCr":354.65,"abr":20.24,"collectionEff":74.71},{"category":"LMV5","billableConsumers":1658302,"loadKw":10169382.74,"billedConsumers":922512,"paidConsumers":4227,"billedMu":11004.47,"assessmentCr":886.01,"realisedCr":28.37,"baseRealisedCr":28.37,"abr":0.81,"collectionEff":3.2},{"category":"LMV6","billableConsumers":135243,"loadKw":945229.79,"billedConsumers":129706,"paidConsumers":93447,"billedMu":477.79,"assessmentCr":439.42,"realisedCr":442.3,"baseRealisedCr":442.3,"abr":9.2,"collectionEff":100.66},{"category":"LMV7","billableConsumers":37071,"loadKw":798909.3,"billedConsumers":31809,"paidConsumers":13004,"billedMu":756.39,"assessmentCr":867.74,"realisedCr":936.98,"baseRealisedCr":936.98,"abr":11.47,"collectionEff":107.98},{"category":"LMV8","billableConsumers":34839,"loadKw":596818.29,"billedConsumers":23958,"paidConsumers":1496,"billedMu":457.06,"assessmentCr":453.27,"realisedCr":521.54,"baseRealisedCr":521.54,"abr":9.92,"collectionEff":115.06},{"category":"LMV9","billableConsumers":60305,"loadKw":219119.14,"billedConsumers":43474,"paidConsumers":18847,"billedMu":131.98,"assessmentCr":272.86,"realisedCr":227.89,"baseRealisedCr":227.89,"abr":20.67,"collectionEff":83.52}],"DVVNL":[{"category":"HV1","billableConsumers":1097,"loadKw":251293.52,"billedConsumers":1044,"paidConsumers":825,"billedMu":169.86,"assessmentCr":300.72,"realisedCr":327.84,"baseRealisedCr":327.84,"abr":17.7,"collectionEff":109.02},{"category":"HV2","billableConsumers":4000,"loadKw":1351029.3,"billedConsumers":3749,"paidConsumers":3646,"billedMu":1685.01,"assessmentCr":2054.29,"realisedCr":1730.48,"baseRealisedCr":1730.48,"abr":12.19,"collectionEff":84.24},{"category":"HV3","billableConsumers":1,"loadKw":5100.0,"billedConsumers":1,"paidConsumers":1,"billedMu":8.26,"assessmentCr":10.43,"realisedCr":11.75,"baseRealisedCr":11.75,"abr":12.63,"collectionEff":112.66},{"category":"HV4","billableConsumers":48,"loadKw":48538.97,"billedConsumers":39,"paidConsumers":4,"billedMu":19.16,"assessmentCr":58.27,"realisedCr":65.6,"baseRealisedCr":65.6,"abr":30.41,"collectionEff":112.58},{"category":"LMV1","billableConsumers":3735418,"loadKw":5018463.2,"billedConsumers":3695053,"paidConsumers":583382,"billedMu":1505.33,"assessmentCr":1205.73,"realisedCr":560.02,"baseRealisedCr":560.02,"abr":8.01,"collectionEff":46.45},{"category":"LMV11","billableConsumers":51,"loadKw":2687.6,"billedConsumers":38,"paidConsumers":16,"billedMu":0.13,"assessmentCr":0.16,"realisedCr":0.12,"baseRealisedCr":0.12,"abr":12.31,"collectionEff":75.0},{"category":"LMV2","billableConsumers":367824,"loadKw":1134860.3,"billedConsumers":360895,"paidConsumers":228337,"billedMu":624.35,"assessmentCr":820.5,"realisedCr":879.02,"baseRealisedCr":879.02,"abr":13.14,"collectionEff":107.13},{"category":"LMV3","billableConsumers":21257,"loadKw":48938.88,"billedConsumers":20757,"paidConsumers":450,"billedMu":14.66,"assessmentCr":78.04,"realisedCr":87.86,"baseRealisedCr":87.86,"abr":53.23,"collectionEff":112.58},{"category":"LMV4A","billableConsumers":69412,"loadKw":206144.77,"billedConsumers":67808,"paidConsumers":2287,"billedMu":122.85,"assessmentCr":235.59,"realisedCr":265.26,"baseRealisedCr":265.26,"abr":19.18,"collectionEff":112.59},{"category":"LMV4B","billableConsumers":8134,"loadKw":70753.4,"billedConsumers":7803,"paidConsumers":5367,"billedMu":37.17,"assessmentCr":68.86,"realisedCr":74.63,"baseRealisedCr":74.63,"abr":18.53,"collectionEff":108.38},{"category":"LMV5","billableConsumers":357150,"loadKw":3324124.56,"billedConsumers":159124,"paidConsumers":468,"billedMu":3486.94,"assessmentCr":410.07,"baseRealisedCr":5.0,"realisedCr":5.0,"abr":1.18,"collectionEff":1.22},{"category":"LMV6","billableConsumers":32195,"loadKw":211784.1,"billedConsumers":30290,"paidConsumers":24141,"billedMu":52.12,"assessmentCr":93.08,"realisedCr":104.56,"baseRealisedCr":104.56,"abr":17.86,"collectionEff":112.33},{"category":"LMV7","billableConsumers":16235,"loadKw":220859.14,"billedConsumers":14224,"paidConsumers":8292,"billedMu":154.38,"assessmentCr":206.26,"realisedCr":232.24,"baseRealisedCr":232.24,"abr":13.36,"collectionEff":112.6},{"category":"LMV8","billableConsumers":7794,"loadKw":179289.25,"billedConsumers":4609,"paidConsumers":484,"billedMu":104.54,"assessmentCr":119.11,"realisedCr":134.12,"baseRealisedCr":134.12,"abr":11.39,"collectionEff":112.6},{"category":"LMV9","billableConsumers":8385,"loadKw":24048.14,"billedConsumers":6699,"paidConsumers":2826,"billedMu":12.67,"assessmentCr":31.85,"realisedCr":30.85,"baseRealisedCr":30.85,"abr":25.14,"collectionEff":96.86}],"KESCO":[{"category":"HV1","billableConsumers":373,"loadKw":103673.7,"billedConsumers":361,"paidConsumers":309,"billedMu":231.74,"assessmentCr":300.98,"realisedCr":220.98,"baseRealisedCr":220.98,"abr":12.99,"collectionEff":73.42},{"category":"HV2","billableConsumers":528,"loadKw":137184.88,"billedConsumers":512,"paidConsumers":468,"billedMu":418.71,"assessmentCr":562.5,"realisedCr":230.8,"baseRealisedCr":230.8,"abr":13.43,"collectionEff":41.03},{"category":"HV3","billableConsumers":1,"loadKw":3600.0,"billedConsumers":1,"paidConsumers":2,"billedMu":4.0,"assessmentCr":0.0,"realisedCr":0.0,"baseRealisedCr":0.0,"abr":0.0,"collectionEff":0.0},{"category":"LMV1","billableConsumers":4852,"loadKw":90148.84,"billedConsumers":4546,"paidConsumers":3955,"billedMu":97.58,"assessmentCr":116.82,"realisedCr":85.17,"baseRealisedCr":85.17,"abr":11.97,"collectionEff":72.91},{"category":"LMV11","billableConsumers":118,"loadKw":796.25,"billedConsumers":91,"paidConsumers":53,"billedMu":0.74,"assessmentCr":0.79,"realisedCr":0.48,"baseRealisedCr":0.48,"abr":10.68,"collectionEff":60.76},{"category":"LMV2","billableConsumers":99503,"loadKw":319693.41,"billedConsumers":95379,"paidConsumers":63108,"billedMu":314.75,"assessmentCr":519.66,"realisedCr":337.96,"baseRealisedCr":337.96,"abr":16.51,"collectionEff":65.03},{"category":"LMV3","billableConsumers":520,"loadKw":16041.52,"billedConsumers":14,"paidConsumers":2,"billedMu":0.12,"assessmentCr":2.92,"realisedCr":2.09,"baseRealisedCr":2.09,"abr":243.33,"collectionEff":71.58},{"category":"LMV4A","billableConsumers":1155,"loadKw":19342.65,"billedConsumers":903,"paidConsumers":165,"billedMu":25.89,"assessmentCr":29.12,"realisedCr":20.85,"baseRealisedCr":20.85,"abr":11.25,"collectionEff":71.6},{"category":"LMV4B","billableConsumers":885,"loadKw":12325.64,"billedConsumers":848,"paidConsumers":662,"billedMu":19.55,"assessmentCr":32.27,"realisedCr":19.96,"baseRealisedCr":19.96,"abr":16.51,"collectionEff":61.85},{"category":"LMV5","billableConsumers":17,"loadKw":116.2,"billedConsumers":13,"paidConsumers":9,"billedMu":0.0,"assessmentCr":0.0,"baseRealisedCr":0.0,"realisedCr":0.0,"abr":0.0,"collectionEff":0.0},{"category":"LMV6","billableConsumers":10090,"loadKw":45750.71,"billedConsumers":9616,"paidConsumers":6419,"billedMu":25.15,"assessmentCr":49.7,"realisedCr":32.12,"baseRealisedCr":32.12,"abr":19.76,"collectionEff":64.63},{"category":"LMV7","billableConsumers":1316,"loadKw":59154.07,"billedConsumers":1038,"paidConsumers":24,"billedMu":45.68,"assessmentCr":58.8,"realisedCr":42.1,"baseRealisedCr":42.1,"abr":12.87,"collectionEff":71.6},{"category":"LMV9","billableConsumers":6876,"loadKw":23466.34,"billedConsumers":1827,"paidConsumers":774,"billedMu":5.23,"assessmentCr":21.7,"realisedCr":10.63,"baseRealisedCr":10.63,"abr":41.49,"collectionEff":48.99}],"MVVNL":[{"category":"HV1","billableConsumers":2299,"loadKw":691693.77,"billedConsumers":2227,"paidConsumers":1844,"billedMu":710.65,"assessmentCr":870.92,"realisedCr":980.25,"baseRealisedCr":980.25,"abr":12.26,"collectionEff":112.55},{"category":"HV2","billableConsumers":2916,"loadKw":937477.15,"billedConsumers":2727,"paidConsumers":2378,"billedMu":1201.58,"assessmentCr":1323.4,"realisedCr":1151.43,"baseRealisedCr":1151.43,"abr":11.01,"collectionEff":87.01},{"category":"HV3","billableConsumers":0,"loadKw":0.0,"billedConsumers":0,"paidConsumers":1,"billedMu":0.0,"assessmentCr":0.0,"realisedCr":0.0,"baseRealisedCr":0.0,"abr":0.0,"collectionEff":0.0},{"category":"HV4","billableConsumers":16,"loadKw":22859.61,"billedConsumers":15,"paidConsumers":1,"billedMu":23.59,"assessmentCr":34.46,"realisedCr":36.69,"baseRealisedCr":36.69,"abr":14.61,"collectionEff":106.47},{"category":"LMV1","billableConsumers":6478887,"loadKw":7481727.34,"billedConsumers":6404095,"paidConsumers":770063,"billedMu":3567.68,"assessmentCr":1995.8,"realisedCr":760.08,"baseRealisedCr":760.08,"abr":5.59,"collectionEff":38.08},{"category":"LMV11","billableConsumers":163,"loadKw":3571.9,"billedConsumers":138,"paidConsumers":86,"billedMu":1.75,"assessmentCr":1.37,"realisedCr":1.4,"baseRealisedCr":1.4,"abr":7.83,"collectionEff":102.19},{"category":"LMV2","billableConsumers":622769,"loadKw":1928843.86,"billedConsumers":605507,"paidConsumers":336672,"billedMu":1360.9,"assessmentCr":1580.1,"realisedCr":1575.02,"baseRealisedCr":1575.02,"abr":11.61,"collectionEff":99.68},{"category":"LMV3","billableConsumers":11396,"loadKw":51708.23,"billedConsumers":11177,"paidConsumers":152,"billedMu":19.86,"assessmentCr":65.99,"realisedCr":70.26,"baseRealisedCr":70.26,"abr":33.23,"collectionEff":106.47},{"category":"LMV4A","billableConsumers":96724,"loadKw":270299.76,"billedConsumers":94874,"paidConsumers":2835,"billedMu":198.95,"assessmentCr":225.92,"realisedCr":240.58,"baseRealisedCr":240.58,"abr":11.36,"collectionEff":106.49},{"category":"LMV4B","billableConsumers":9012,"loadKw":70403.29,"billedConsumers":8765,"paidConsumers":5175,"billedMu":53.82,"assessmentCr":80.41,"realisedCr":86.22,"baseRealisedCr":86.22,"abr":14.94,"collectionEff":107.23},{"category":"LMV5","billableConsumers":340270,"loadKw":1709327.43,"billedConsumers":147351,"paidConsumers":758,"billedMu":2092.61,"assessmentCr":99.82,"baseRealisedCr":5.72,"realisedCr":5.72,"abr":0.48,"collectionEff":5.73},{"category":"LMV6","billableConsumers":16197,"loadKw":151410.95,"billedConsumers":15638,"paidConsumers":11984,"billedMu":60.91,"assessmentCr":73.04,"realisedCr":77.24,"baseRealisedCr":77.24,"abr":11.99,"collectionEff":105.75},{"category":"LMV7","billableConsumers":5696,"loadKw":129536.21,"billedConsumers":4851,"paidConsumers":1148,"billedMu":143.43,"assessmentCr":173.11,"realisedCr":184.6,"baseRealisedCr":184.6,"abr":12.07,"collectionEff":106.64},{"category":"LMV8","billableConsumers":9651,"loadKw":132176.07,"billedConsumers":7439,"paidConsumers":331,"billedMu":134.77,"assessmentCr":131.91,"realisedCr":140.46,"baseRealisedCr":140.46,"abr":9.79,"collectionEff":106.48},{"category":"LMV9","billableConsumers":18959,"loadKw":45313.97,"billedConsumers":17599,"paidConsumers":8095,"billedMu":32.81,"assessmentCr":76.22,"realisedCr":63.55,"baseRealisedCr":63.55,"abr":23.23,"collectionEff":83.38}],"PUVNL":[{"category":"HV1","billableConsumers":1781,"loadKw":415946.18,"billedConsumers":1645,"paidConsumers":1346,"billedMu":473.9,"assessmentCr":530.75,"realisedCr":715.87,"baseRealisedCr":715.87,"abr":11.2,"collectionEff":134.88},{"category":"HV2","billableConsumers":2434,"loadKw":841813.36,"billedConsumers":1932,"paidConsumers":1710,"billedMu":1774.74,"assessmentCr":1620.35,"realisedCr":846.62,"baseRealisedCr":846.62,"abr":9.13,"collectionEff":52.25},{"category":"HV3","billableConsumers":0,"loadKw":0.0,"billedConsumers":0,"paidConsumers":0,"billedMu":0.0,"assessmentCr":0.0,"realisedCr":0.0,"baseRealisedCr":0.0,"abr":0.0,"collectionEff":0.0},{"category":"HV4","billableConsumers":71,"loadKw":135061.78,"billedConsumers":61,"paidConsumers":2,"billedMu":186.13,"assessmentCr":208.99,"realisedCr":277.72,"baseRealisedCr":277.72,"abr":11.23,"collectionEff":132.89},{"category":"LMV1","billableConsumers":8075715,"loadKw":9969693.39,"billedConsumers":8002002,"paidConsumers":1200321,"billedMu":4046.89,"assessmentCr":2035.23,"realisedCr":893.58,"baseRealisedCr":893.58,"abr":5.03,"collectionEff":43.91},{"category":"LMV11","billableConsumers":111,"loadKw":3904.55,"billedConsumers":81,"paidConsumers":49,"billedMu":0.64,"assessmentCr":0.44,"realisedCr":0.65,"baseRealisedCr":0.65,"abr":6.88,"collectionEff":147.73},{"category":"LMV2","billableConsumers":720212,"loadKw":2108907.99,"billedConsumers":701309,"paidConsumers":330159,"billedMu":1369.55,"assessmentCr":1293.22,"realisedCr":1328.61,"baseRealisedCr":1328.61,"abr":9.44,"collectionEff":102.74},{"category":"LMV3","billableConsumers":14155,"loadKw":43982.33,"billedConsumers":13988,"paidConsumers":173,"billedMu":8.65,"assessmentCr":55.37,"realisedCr":73.69,"baseRealisedCr":73.69,"abr":64.01,"collectionEff":133.09},{"category":"LMV4A","billableConsumers":93916,"loadKw":248347.01,"billedConsumers":91813,"paidConsumers":2603,"billedMu":161.06,"assessmentCr":155.26,"realisedCr":206.33,"baseRealisedCr":206.33,"abr":9.64,"collectionEff":132.89},{"category":"LMV4B","billableConsumers":11003,"loadKw":82739.24,"billedConsumers":10571,"paidConsumers":5802,"billedMu":55.94,"assessmentCr":193.45,"realisedCr":81.89,"baseRealisedCr":81.89,"abr":34.58,"collectionEff":42.33},{"category":"LMV5","billableConsumers":422791,"loadKw":1482347.06,"billedConsumers":212058,"paidConsumers":2206,"billedMu":1516.46,"assessmentCr":141.54,"baseRealisedCr":5.0,"realisedCr":5.0,"abr":0.93,"collectionEff":3.53},{"category":"LMV6","billableConsumers":28723,"loadKw":225492.61,"billedConsumers":27357,"paidConsumers":20665,"billedMu":81.64,"assessmentCr":73.08,"realisedCr":92.93,"baseRealisedCr":92.93,"abr":8.95,"collectionEff":127.16},{"category":"LMV7","billableConsumers":6881,"loadKw":180835.27,"billedConsumers":5482,"paidConsumers":1792,"billedMu":213.52,"assessmentCr":180.93,"realisedCr":240.43,"baseRealisedCr":240.43,"abr":8.47,"collectionEff":132.89},{"category":"LMV8","billableConsumers":12324,"loadKw":191917.43,"billedConsumers":7271,"paidConsumers":596,"billedMu":176.54,"assessmentCr":143.85,"realisedCr":191.17,"baseRealisedCr":191.17,"abr":8.15,"collectionEff":132.9},{"category":"LMV9","billableConsumers":12504,"loadKw":30273.45,"billedConsumers":10889,"paidConsumers":4288,"billedMu":13.82,"assessmentCr":29.04,"realisedCr":32.75,"baseRealisedCr":32.75,"abr":21.01,"collectionEff":112.78}],"PVVNL":[{"category":"HV1","billableConsumers":3272,"loadKw":1182502.16,"billedConsumers":3130,"paidConsumers":2821,"billedMu":1041.51,"assessmentCr":1400.57,"realisedCr":1428.1,"baseRealisedCr":1428.1,"abr":13.45,"collectionEff":101.97},{"category":"HV2","billableConsumers":7575,"loadKw":3054634.52,"billedConsumers":7277,"paidConsumers":6668,"billedMu":3146.38,"assessmentCr":3033.27,"realisedCr":3130.26,"baseRealisedCr":3130.26,"abr":9.64,"collectionEff":103.2},{"category":"HV3","billableConsumers":8,"loadKw":59500.0,"billedConsumers":8,"paidConsumers":8,"billedMu":84.32,"assessmentCr":92.96,"realisedCr":88.79,"baseRealisedCr":88.79,"abr":11.02,"collectionEff":95.51},{"category":"HV4","billableConsumers":4,"loadKw":1065.05,"billedConsumers":4,"paidConsumers":1,"billedMu":0.71,"assessmentCr":5.95,"realisedCr":5.68,"baseRealisedCr":5.68,"abr":83.8,"collectionEff":95.46},{"category":"LMV1","billableConsumers":3533609,"loadKw":7702962.58,"billedConsumers":3505021,"paidConsumers":845648,"billedMu":3334.25,"assessmentCr":2153.77,"realisedCr":1421.61,"baseRealisedCr":1421.61,"abr":6.46,"collectionEff":66.01},{"category":"LMV11","billableConsumers":198,"loadKw":2366.65,"billedConsumers":147,"paidConsumers":108,"billedMu":0.99,"assessmentCr":0.96,"realisedCr":1.03,"baseRealisedCr":1.03,"abr":9.7,"collectionEff":107.29},{"category":"LMV2","billableConsumers":664610,"loadKw":2208090.98,"billedConsumers":648468,"paidConsumers":388504,"billedMu":1367.09,"assessmentCr":1928.5,"realisedCr":1570.32,"baseRealisedCr":1570.32,"abr":14.11,"collectionEff":81.43},{"category":"LMV3","billableConsumers":6915,"loadKw":34853.62,"billedConsumers":6671,"paidConsumers":94,"billedMu":5.31,"assessmentCr":49.45,"realisedCr":47.24,"baseRealisedCr":47.24,"abr":93.13,"collectionEff":95.53},{"category":"LMV4A","billableConsumers":41265,"loadKw":150507.73,"billedConsumers":40122,"paidConsumers":1907,"billedMu":92.99,"assessmentCr":109.0,"realisedCr":104.11,"baseRealisedCr":104.11,"abr":11.72,"collectionEff":95.51},{"category":"LMV4B","billableConsumers":10121,"loadKw":92153.54,"billedConsumers":9863,"paidConsumers":6814,"billedMu":68.12,"assessmentCr":99.74,"realisedCr":91.95,"baseRealisedCr":91.95,"abr":14.64,"collectionEff":92.19},{"category":"LMV5","billableConsumers":538074,"loadKw":3653467.49,"billedConsumers":403966,"paidConsumers":786,"billedMu":3908.46,"assessmentCr":234.58,"baseRealisedCr":12.65,"realisedCr":12.65,"abr":0.6,"collectionEff":5.39},{"category":"LMV6","billableConsumers":48038,"loadKw":310791.42,"billedConsumers":46805,"paidConsumers":30238,"billedMu":257.97,"assessmentCr":150.52,"realisedCr":135.45,"baseRealisedCr":135.45,"abr":5.83,"collectionEff":89.99},{"category":"LMV7","billableConsumers":6943,"loadKw":208524.61,"billedConsumers":6214,"paidConsumers":1748,"billedMu":199.38,"assessmentCr":248.64,"realisedCr":237.61,"baseRealisedCr":237.61,"abr":12.47,"collectionEff":95.56},{"category":"LMV8","billableConsumers":5070,"loadKw":93435.54,"billedConsumers":4639,"paidConsumers":85,"billedMu":41.21,"assessmentCr":58.4,"realisedCr":55.79,"baseRealisedCr":55.79,"abr":14.17,"collectionEff":95.53},{"category":"LMV9","billableConsumers":13581,"loadKw":96017.24,"billedConsumers":6460,"paidConsumers":2864,"billedMu":67.45,"assessmentCr":114.05,"realisedCr":90.11,"baseRealisedCr":90.11,"abr":16.91,"collectionEff":79.01}]};


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

const BASE_DISCOM_FEEDERS = {
  'ALL': 26033,
  'PVVNL': 8074,
  'DVVNL': 6094,
  'PUVNL': 5579,
  'MVVNL': 5662,
  'KESCO': 624
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
  const activeFeeders = kpis ? (kpis.totalFeeders || 0) : (BASE_DISCOM_FEEDERS[discKey] || 26033);
  const baseFeeders = BASE_DISCOM_FEEDERS[discKey] || 26033;

  if (kpis && (activeFeeders === 0 || (activeAss === 0 && activeMu === 0))) {
    return { discKey, rows: [] };
  }

  // Feeder scaling ratio (for consumers and load when hierarchy/geographical filters are active)
  const feederRatio = baseFeeders > 0 ? Math.min(1.0, activeFeeders / baseFeeders) : 1.0;
  const scaleAss = baseAss > 0 ? (activeAss / baseAss) : 0;
  const scaleMu = baseMu > 0 ? (activeMu / baseMu) : 0;

  // Clone rows and scale values
  const rows = rawRows.map(r => {
    const item = { ...r };
    item.desc = (typeof CATEGORY_NAMES !== 'undefined' && CATEGORY_NAMES[item.category]) ? CATEGORY_NAMES[item.category] : '';
    item.billableConsumers = Math.round((r.billableConsumers || 0) * feederRatio);
    item.loadKw = Math.round(((r.loadKw || 0) * feederRatio) * 100) / 100;
    item.billedConsumers = Math.round((r.billedConsumers || 0) * feederRatio);
    item.paidConsumers = Math.round((r.paidConsumers || 0) * feederRatio);
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

  // Handle Realisation and PTW
  const lmv5Row = rows.find(r => r.category === 'LMV5');
  if (state.includePtw && lmv5Row) {
    lmv5Row.realisedCr = lmv5Row.assessmentCr;
    lmv5Row.collectionEff = 100.0;
    const remReal = Math.max(0.0, Math.round((activeReal - lmv5Row.realisedCr) * 100) / 100);
    const nonLmv5BaseReal = rawRows.filter(r => r.category !== 'LMV5').reduce((s, r) => s + (r.realisedCr || 0), 0);
    
    for (const r of rows) {
      if (r.category === 'LMV5') continue;
      const orig = rawRows.find(x => x.category === r.category) || r;
      r.realisedCr = nonLmv5BaseReal > 0 
        ? Math.round(((orig.realisedCr || 0) / nonLmv5BaseReal * remReal) * 100) / 100 
        : 0;
    }
    const curReal = rows.reduce((s, r) => s + r.realisedCr, 0);
    const realDiff = Math.round((activeReal - curReal) * 100) / 100;
    if (realDiff !== 0) {
      const topNonLmv5 = rows.filter(r => r.category !== 'LMV5').reduce((max, r) => r.realisedCr > max.realisedCr ? r : max, rows[0]);
      if (topNonLmv5) topNonLmv5.realisedCr = Math.round((topNonLmv5.realisedCr + realDiff) * 100) / 100;
    }
  } else {
    const scaleReal = baseReal > 0 ? (activeReal / baseReal) : 0;
    for (const r of rows) {
      const orig = rawRows.find(x => x.category === r.category) || r;
      r.realisedCr = Math.round(((orig.realisedCr || 0) * scaleReal) * 100) / 100;
    }
    const curReal = rows.reduce((s, r) => s + r.realisedCr, 0);
    const realDiff = Math.round((activeReal - curReal) * 100) / 100;
    if (realDiff !== 0 && rows.length > 0) {
      const topRow = rows.reduce((max, r) => r.realisedCr > max.realisedCr ? r : max, rows[0]);
      topRow.realisedCr = Math.round((topRow.realisedCr + realDiff) * 100) / 100;
    }
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
  csvLines.push(`# Period: ${state.monthFrom} to ${state.monthTo}`);
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
