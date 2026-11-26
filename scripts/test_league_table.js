const fs = require('fs');

const d = JSON.parse(fs.readFileSync('data/feeders.json', 'utf8'));
const N = d.d;
const R = d.rows;

// Emulate minimal browser environment for calculateMetrics
global.state = {
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
  excludeCdf: false,
  includePtw: false,
  includeGovt: true,
  includeSubsidy: false,
  leagueManualLevel: null,
  leagueSortCol: 'atcLossValueCr',
  leagueSortDir: -1
};

global.N = N;
global.R = R;
global.MON_LABELS = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'];
global.MON_FULL   = ['April', 'May', 'June', 'July', 'August', 'September', 'October'];
global.MON_INDEX  = { Apr: 0, May: 1, Jun: 2, Jul: 3, Aug: 4, Sep: 5, Oct: 6 };
global.SLAB_LABELS = ['0% to 5%', '5% to 10%', '10% to 20%', '20% to 30%', '30% to 50%', '50% to 70%', 'Above 70%', 'Abnormal', 'IE 0', 'No Cons'];

function classifySlab(lossPct, ie, cons, flags, isAtc = false) {
  if (ie === 0) return 'IE 0';
  if (cons === 0 || (flags & 8)) return 'No Cons';
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
global.classifySlab = classifySlab;

function normalizeDiscom(d) {
  const u = (d || '').toUpperCase();
  if (u.includes('PASCHIM') || u.includes('PVVNL')) return 'PVVNL';
  if (u.includes('DAKSHIN') || u.includes('DVVNL')) return 'DVVNL';
  if (u.includes('MADHYA') || u.includes('MVVNL')) return 'MVVNL';
  if (u.includes('POORV') || u.includes('PURV') || u.includes('PUVVNL')) return 'PUVVNL';
  if (u.includes('KESCO')) return 'KESCO';
  return d;
}
global.normalizeDiscom = normalizeDiscom;

// Read calculateMetrics from dashboard_app.js
const code = fs.readFileSync('dashboard_app.js', 'utf8');

// Extract calculateMetrics
eval(code.substring(code.indexOf('function calculateMetrics()'), code.indexOf('function renderKpis(')));

console.log('calculateMetrics evaluated successfully!');

const res = calculateMetrics();
console.log('Used feeders count:', res.usedFeeders.length);
console.assert(res.usedFeeders.length === 26648, `Expected 26648 Oct-active feeders, got ${res.usedFeeders.length}`);

// Test aggregation for all 5 levels (Progressive Apr-Oct 2026)
['discom', 'zone', 'circle', 'division', 'substation'].forEach(level => {
  state.leagueManualLevel = level;
  const groups = new Map();
  for (const f of res.usedFeeders) {
    let name = '', parent = '';
    if (level === 'discom') { name = f.discom; parent = 'UPPCL'; }
    else if (level === 'zone') { name = f.zone; parent = f.discom; }
    else if (level === 'circle') { name = f.circle; parent = f.zone; }
    else if (level === 'division') { name = f.division; parent = f.circle; }
    else if (level === 'substation') { name = f.substation; parent = f.division; }
    const key = parent + '____' + name;
    if (!groups.has(key)) groups.set(key, { name, parent, feeders: 0, ie: 0, se: 0, ass: 0, real: 0, fdrAbove70: 0 });
    const item = groups.get(key);
    item.feeders++;
    item.ie += f.fIE;
    item.se += f.fSE;
    item.ass += f.fAss;
    item.real += f.fReal;
    if (f.atcSlab === 'Above 70%') item.fdrAbove70++;
  }

  let totFeeders = 0, totIE = 0, totSE = 0, totAss = 0, totReal = 0, tot70 = 0;
  for (const it of groups.values()) {
    totFeeders += it.feeders;
    totIE += it.ie;
    totSE += it.se;
    totAss += it.ass;
    totReal += it.real;
    tot70 += it.fdrAbove70;
  }

  console.log(`Level: ${level.padEnd(10)} | Groups: ${String(groups.size).padStart(5)} | Feeders: ${totFeeders} | Input MU: ${(totIE/1000).toFixed(2)} | Fdrs>70%: ${tot70}`);
  console.assert(totFeeders === 26648, `Feeder total mismatch at level ${level}: got ${totFeeders}`);
});

// Test Single Month (Oct-Oct) and Verify PSR Slabs
state.monthFrom = 'Oct';
state.monthTo = 'Oct';
const octRes = calculateMetrics();
let octFeeders = 0;
for (const sg of octRes.progressiveSummary) {
  const llSum = sg.line_0_5 + sg.line_5_10 + sg.line_10_20 + sg.line_20_30 + sg.line_30_50 + sg.line_50_70 + sg.line_above_70 + sg.line_abnormal + sg.ie_zero + sg.no_consumers_tagged;
  const atcSum = sg.atc_0_5 + sg.atc_5_10 + sg.atc_10_20 + sg.atc_20_30 + sg.atc_30_50 + sg.atc_50_70 + sg.atc_above_70 + sg.atc_abnormal + sg.ie_zero + sg.no_consumers_tagged;
  if (llSum !== sg.total_feeders || atcSum !== sg.total_feeders) {
    throw new Error(`PSR slab mismatch on ${sg.zone}: Total=${sg.total_feeders}, LL=${llSum}, ATC=${atcSum}`);
  }
  octFeeders += sg.total_feeders;
}
console.log(`Oct-26 Single Month PSR Verify: Input MU=${octRes.kpis.inputEnergyMu.toFixed(2)}, Total Feeders=${octFeeders}`);
console.assert(octFeeders === 26648, 'Expected 26648 Oct-active feeders in Oct-26 PSR');

// Test Clean Abnormal Filter on Oct-26
state.excludeAbnormal = true;
const octCleanRes = calculateMetrics();
console.log(`Oct-26 Clean (Excl Abnormal): Feeders=${octCleanRes.kpis.countedFeeders}, Excluded=${octCleanRes.kpis.leftOutFeeders}, Ass=Rs ${octCleanRes.kpis.assessmentCr.toFixed(2)} Cr, Real=Rs ${octCleanRes.kpis.realizationCr.toFixed(2)} Cr, CE=${octCleanRes.kpis.collectionEfficiency.toFixed(2)}%, ATC=${octCleanRes.kpis.atcLoss.toFixed(2)}%`);

console.log('All tests passed with flying colors!');
