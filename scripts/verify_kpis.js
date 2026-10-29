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
  monthFrom: 'Sep',
  monthTo: 'Sep',
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
global.MON_LABELS = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'];
global.MON_FULL   = ['April', 'May', 'June', 'July', 'August', 'September'];
global.MON_INDEX  = { Apr: 0, May: 1, Jun: 2, Jul: 3, Aug: 4, Sep: 5 };
global.SLAB_LABELS = ['0% to 5%', '5% to 10%', '10% to 20%', '20% to 30%', '30% to 50%', '50% to 70%', 'Above 70%', 'Abnormal', 'IE 0', 'No Cons'];

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

const code = fs.readFileSync('dashboard_app.js', 'utf8');
eval(code.substring(code.indexOf('function calculateMetrics()'), code.indexOf('function renderKpis(')));

console.log('======================================================================');
console.log('KPI VERIFICATION (September 2026 Only - monthFrom: Sep, monthTo: Sep)');
console.log('======================================================================');
state.monthFrom = 'Sep';
state.monthTo = 'Sep';
const sepRes = calculateMetrics();
console.log(`Feeders Analyzed   : ${sepRes.usedFeeders.length}`);
console.log(`Input Energy (MU)  : ${sepRes.inputEnergyMu.toFixed(2)} MU`);
console.log(`Sold Energy (MU)   : ${sepRes.soldEnergyMu.toFixed(2)} MU`);
console.log(`Assessment (Cr)    : ${sepRes.assessmentCr.toFixed(2)} Cr`);
console.log(`Realization (Cr)   : ${sepRes.realizationCr.toFixed(2)} Cr`);
console.log(`Billing Efficiency : ${sepRes.billingEfficiency.toFixed(2)}%`);
console.log(`Collection Eff.    : ${sepRes.collectionEfficiency.toFixed(2)}%`);
console.log(`Line Loss (%)      : ${sepRes.lineLoss.toFixed(2)}%`);
console.log(`AT&C Loss (%)      : ${sepRes.atcLoss.toFixed(2)}%`);
console.log(`Total Consumers    : ${sepRes.totalConsumers.toLocaleString()}`);

console.log('\n======================================================================');
console.log('KPI VERIFICATION (Progressive Apr-Sep 2026 - monthFrom: Apr, monthTo: Sep)');
console.log('======================================================================');
state.monthFrom = 'Apr';
state.monthTo = 'Sep';
const progRes = calculateMetrics();
console.log(`Feeders Analyzed   : ${progRes.usedFeeders.length}`);
console.log(`Input Energy (MU)  : ${progRes.inputEnergyMu.toFixed(2)} MU`);
console.log(`Sold Energy (MU)   : ${progRes.soldEnergyMu.toFixed(2)} MU`);
console.log(`Assessment (Cr)    : ${progRes.assessmentCr.toFixed(2)} Cr`);
console.log(`Realization (Cr)   : ${progRes.realizationCr.toFixed(2)} Cr`);
console.log(`Billing Efficiency : ${progRes.billingEfficiency.toFixed(2)}%`);
console.log(`Collection Eff.    : ${progRes.collectionEfficiency.toFixed(2)}%`);
console.log(`Line Loss (%)      : ${progRes.lineLoss.toFixed(2)}%`);
console.log(`AT&C Loss (%)      : ${progRes.atcLoss.toFixed(2)}%`);
console.log(`Total Consumers    : ${progRes.totalConsumers.toLocaleString()}`);

console.log('\n======================================================================');
console.log('DISCOM-WISE PROGRESSIVE SUMMARY (Apr-Sep 2026)');
console.log('======================================================================');
state.leagueManualLevel = 'discom';
const groups = new Map();
for (const f of progRes.usedFeeders) {
  const name = f.discom;
  if (!groups.has(name)) groups.set(name, { name, feeders: 0, ie: 0, se: 0, ass: 0, real: 0, fdrAbove70: 0 });
  const item = groups.get(name);
  item.feeders++;
  item.ie += f.fIE;
  item.se += f.fSE;
  item.ass += f.fAss;
  item.real += f.fReal;
  if (f.atcSlab === 'Above 70%') item.fdrAbove70++;
}

for (const it of groups.values()) {
  const be = it.ie > 0 ? (it.se / it.ie * 100) : 0;
  const ce = it.ass > 0 ? (it.real / it.ass * 100) : 0;
  const ll = 100 - be;
  const atc = 100 - (be * ce / 100);
  console.log(`Discom: ${it.name.padEnd(14)} | Feeders: ${it.feeders.toString().padStart(5)} | IE: ${(it.ie/1000).toFixed(2).padStart(8)} MU | SE: ${(it.se/1000).toFixed(2).padStart(8)} MU | Line Loss: ${ll.toFixed(2).padStart(5)}% | AT&C Loss: ${atc.toFixed(2).padStart(5)}%`);
}
