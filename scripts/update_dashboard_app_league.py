import re

def update_js(path):
    with open(path, 'r', encoding='utf-8') as f:
        c = f.read()

    # 1. Add state variables
    old_state = "  discomSortCol: null,\n  discomSortDir: -1,"
    new_state = "  discomSortCol: null,\n  discomSortDir: -1,\n  leagueManualLevel: null,\n  leagueSortCol: 'atcLossValueCr',\n  leagueSortDir: -1,"
    assert old_state in c, f"discomSortCol not found in {path}"
    c = c.replace(old_state, new_state, 1)

    # 2. Return usedFeeders from calculateMetrics()
    old_return = """    progressiveSummary: [...summaryGroups.values()],
    top150,
    worst10
  };"""
    new_return = """    progressiveSummary: [...summaryGroups.values()],
    top150,
    worst10,
    usedFeeders
  };"""
    assert old_return in c, f"calculateMetrics return not found in {path}"
    c = c.replace(old_return, new_return, 1)

    # 3. Add Performance League Table render and helper functions, replacing renderByDiscomTable
    league_code = """// ── Performance League Table ──

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
      <tr class="drill" onclick="onLeagueRowClick('${level}', '${r.name.replace(/'/g, "\\\\'")}', '${r.parent.replace(/'/g, "\\\\'")}')" title="${drillHint}">
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
    window.open('feeder_drilldown.html?search=' + encodeURIComponent(name).replace(/\\+/g, '%2B'), '_blank');
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

  const blob = new Blob([csvLines.join('\\r\\n')], { type: 'text/csv;charset=utf-8;' });
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
"""

    old_discom_fn = """function renderByDiscomTable(rows) {
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
}"""

    assert old_discom_fn in c, f"renderByDiscomTable not found in {path}"
    c = c.replace(old_discom_fn, league_code, 1)

    # 4. In onFilterChanged(): hook renderPerformanceLeagueTable
    old_hook = "renderByDiscomTable(computedResult.discomSummary);"
    new_hook = "renderPerformanceLeagueTable(computedResult.usedFeeders);"
    assert old_hook in c, f"renderByDiscomTable hook not found in {path}"
    c = c.replace(old_hook, new_hook, 1)

    # 5. In resetFilters(): reset leagueManualLevel, leagueSortCol, leagueSortDir
    old_reset_pt = "  state.discomSortCol = null;\n  state.discomSortDir = -1;"
    new_reset_pt = "  state.discomSortCol = null;\n  state.discomSortDir = -1;\n  state.leagueManualLevel = null;\n  state.leagueSortCol = 'atcLossValueCr';\n  state.leagueSortDir = -1;"
    assert old_reset_pt in c, f"resetFilters sort not found in {path}"
    c = c.replace(old_reset_pt, new_reset_pt, 1)

    # 6. Add event listeners for level buttons and headers
    wiring_code = """// ── 2. Performance League Table Sorting & Level Switching (#tblLeague) ──
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
});"""

    old_discom_sort = """// ── 2. By Discom Table Sorting (#tblByDiscom) ──
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
});"""

    assert old_discom_sort in c, f"old discom sort block not found in {path}"
    c = c.replace(old_discom_sort, wiring_code, 1)

    with open(path, 'w', encoding='utf-8') as f:
        f.write(c)
    print(f"Updated {path} successfully!")

if __name__ == '__main__':
    update_js('dashboard_app.js')
    update_js('frontend/dashboard_app.js')
