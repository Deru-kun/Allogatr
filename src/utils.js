// ─── Date Utilities ────────────────────────────────────
export function getWeeksBetween(startDate, endDate) {
  const weeks = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  // Align to Monday
  const day = start.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const weekStart = new Date(start);
  weekStart.setDate(weekStart.getDate() + diff);

  let weekNum = 1;
  while (weekStart <= end) {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 4); // Friday
    weeks.push({
      num: weekNum,
      key: `W${weekNum}`,
      start: new Date(weekStart),
      end: weekEnd,
      label: `W${weekNum}`,
      sublabel: `${fmt(weekStart)} – ${fmt(weekEnd)}`
    });
    weekStart.setDate(weekStart.getDate() + 7);
    weekNum++;
  }
  return weeks;
}

export function isDateInRange(date, rangeStart, rangeEnd) {
  const d = new Date(date);
  return d >= new Date(rangeStart) && d <= new Date(rangeEnd);
}

export function weekOverlapsRange(weekStart, weekEnd, rangeStart, rangeEnd) {
  if (!rangeStart || !rangeEnd) return true;
  const ws = new Date(weekStart), we = new Date(weekEnd);
  const rs = new Date(rangeStart), re = new Date(rangeEnd);
  return ws <= re && we >= rs;
}

export function getYearWeek(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  // ISO Week numbering
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${d.getFullYear()}-W${weekNo.toString().padStart(2, '0')}`;
}

function fmt(d) {
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`;
}

export function toISODate(d) {
  if (!d) return '';
  const dt = new Date(d);
  return dt.toISOString().split('T')[0];
}

export function weeksBetweenCount(startDate, endDate) {
  if (!startDate || !endDate) return 0;
  const ms = new Date(endDate) - new Date(startDate);
  return Math.max(1, Math.ceil(ms / (7 * 24 * 60 * 60 * 1000)));
}

// ─── Currency Formatting ───────────────────────────────
export function fmtCurrency(value) {
  if (value == null || isNaN(value)) return '€ 0';
  return '€ ' + Number(value).toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export function fmtPercent(value) {
  if (value == null || isNaN(value)) return '0,0%';
  return Number(value).toLocaleString('it-IT', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%';
}

export function fmtDays(value) {
  if (value == null || isNaN(value)) return '0';
  return Number(value).toLocaleString('it-IT', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

// ─── UUID Generator ────────────────────────────────────
export function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

// ─── DOM Helpers ───────────────────────────────────────
export function el(tag, attrs = {}, children = []) {
  const element = document.createElement(tag);
  for (const [key, val] of Object.entries(attrs)) {
    if (key === 'className') element.className = val;
    else if (key === 'textContent') element.textContent = val;
    else if (key === 'innerHTML') element.innerHTML = val;
    else if (key.startsWith('on')) element.addEventListener(key.slice(2).toLowerCase(), val);
    else if (key === 'style' && typeof val === 'object') Object.assign(element.style, val);
    else if (key === 'dataset') Object.entries(val).forEach(([k,v]) => element.dataset[k] = v);
    else element.setAttribute(key, val);
  }
  for (const child of (Array.isArray(children) ? children : [children])) {
    if (typeof child === 'string') element.appendChild(document.createTextNode(child));
    else if (child) element.appendChild(child);
  }
  return element;
}

export function clear(container) {
  while (container.firstChild) container.removeChild(container.firstChild);
}

// ─── Toasts & Modals ───────────────────────────────────
export function showToast(message, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = el('div', { id: 'toast-container', className: 'toast-container' });
    document.body.appendChild(container);
  }
  
  const icon = type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ';
  const toast = el('div', { className: `toast toast-${type}` }, [
    el('span', { className: 'toast-icon', textContent: icon }),
    el('span', { textContent: message })
  ]);
  
  container.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('show'));
  
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

export function confirmDialog(message, onConfirm) {
  const overlay = el('div', { className: 'modal-overlay' });
  const modal = el('div', { className: 'modal glass-card confirm-modal' }, [
    el('h3', { textContent: 'Conferma' }),
    el('p', { textContent: message }),
    el('div', { className: 'modal-actions' }, [
      el('button', { className: 'btn btn-ghost', textContent: 'Annulla', onClick: () => overlay.remove() }),
      el('button', { className: 'btn btn-danger', textContent: 'Conferma', onClick: () => {
        overlay.remove();
        onConfirm();
      }})
    ])
  ]);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
}

export function downloadCSV(filename, rows) {
  const csvContent = rows.map(row => 
    row.map(cell => {
      const str = String(cell || '');
      return `"${str.replace(/"/g, '""')}"`;
    }).join(',')
  ).join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

export const DataAggregator = {
  getProjectFinancials(projects) {
    return Object.values(projects).map(proj => {
      let totalCost = 0, totalRev = 0, totalDays = 0;
      for (const m of proj.team) {
        const d = Object.values(m.settimane || {}).reduce((s, v) => s + (Number(v) || 0), 0);
        totalDays += d;
        totalCost += d * (m.costoStandard || 0);
        totalRev += d * (m.rateAccordato || 0);
      }
      const bdFee = totalRev * (Number(proj.bdFeePercent) || 0) / 100;
      const totalExternalCosts = (Number(proj.costiEsterni) || 0) + (Number(proj.licenze) || 0);
      const totalOtherRevenues = (Number(proj.altreRevenues) || 0);
      
      const finalRev = totalRev + totalOtherRevenues;
      const finalCost = totalCost + totalExternalCosts + bdFee;
      const finalMargin = finalRev - finalCost;
      const finalMarginPct = finalRev > 0 ? (finalMargin / finalRev * 100) : 0;

      return {
        id: proj.id,
        name: proj.nome,
        totalRev: finalRev,
        totalCost: finalCost,
        margin: finalMargin,
        marginPct: finalMarginPct,
        totalDays: totalDays,
        dataInizio: proj.dataInizio,
        dataFine: proj.dataFine
      };
    });
  },

  getMonthlyRevenueForecast(projects) {
    const forecast = {};
    const projStats = this.getProjectFinancials(projects);

    projStats.forEach(p => {
      if (!p.dataInizio || !p.dataFine || p.totalRev <= 0) return;
      
      const start = new Date(p.dataInizio);
      const end = new Date(p.dataFine);
      const months = [];
      let curr = new Date(start.getFullYear(), start.getMonth(), 1);
      
      while (curr <= end) {
        months.push(`${curr.getFullYear()}-${String(curr.getMonth() + 1).padStart(2, '0')}`);
        curr.setMonth(curr.getMonth() + 1);
      }
      
      if (months.length > 0) {
        const revPerMonth = p.totalRev / months.length;
        months.forEach(m => {
          forecast[m] = (forecast[m] || 0) + revPerMonth;
        });
      }
    });

    return Object.keys(forecast).sort().reduce((obj, key) => {
      obj[key] = forecast[key];
      return obj;
    }, {});
  },

  getPortfolioCostsBreakdown(projects) {
    let internal = 0;
    let external = 0;
    let bdFees = 0;

    Object.values(projects).forEach(proj => {
      let projectInternal = 0;
      let projectRev = 0;
      
      proj.team.forEach(m => {
        const d = Object.values(m.settimane || {}).reduce((s, v) => s + (Number(v) || 0), 0);
        projectInternal += d * (m.costoStandard || 0);
        projectRev += d * (m.rateAccordato || 0);
      });

      internal += projectInternal;
      external += (Number(proj.costiEsterni) || 0) + (Number(proj.licenze) || 0);
      bdFees += projectRev * (Number(proj.bdFeePercent) || 0) / 100;
    });

    return { internal, external, bdFees };
  },

  getPortfolioHealthOverview(projects, workload) {
    const health = {
      atRisk: [],
      bottlenecks: [],
      stats: {
        totalMargin: 0,
        projectCount: Object.keys(projects).length
      }
    };

    const financials = this.getProjectFinancials(projects);
    financials.forEach(p => {
      health.stats.totalMargin += p.marginPct;
      if (p.marginPct < 15) {
        health.atRisk.push({ name: p.name, reason: 'Basso Margine', value: `${p.marginPct.toFixed(1)}%` });
      }
    });
    
    health.stats.avgMargin = health.stats.totalMargin / (health.stats.projectCount || 1);

    // Identify resources with >110% allocation in any week
    Object.entries(workload).forEach(([memberId, weeks]) => {
      const overWeeks = Object.values(weeks).filter(pct => pct > 1.1).length;
      if (overWeeks > 0) {
        // Just report ID or assume we'll map it in UI
        health.bottlenecks.push({ memberId, count: overWeeks });
      }
    });

    return health;
  }
};
