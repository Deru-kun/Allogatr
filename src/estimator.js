import { state } from './state.js';
import { TEAM_DATABASE, ROLES, getMembersByRole, getMemberById } from './data.js';
import { el, clear, fmtCurrency, fmtPercent, fmtDays, getWeeksBetween, weekOverlapsRange, toISODate, showToast, downloadCSV } from './utils.js';
import { PROJECT_TYPES } from './data.js';

const DEFAULT_COLUMNS = {
  ruolo: true, livello: true, attivita: true,
  datePersona: true, costoStd: true, rateStd: false,
  rateAcc: true, totGg: true, costoTot: true,
  ricavoTot: true, marginEur: true, marginPct: true,
};

export function renderEstimator(container, projectId) {
  clear(container);
  const proj = state.getProject(projectId);
  if (!proj) {
    container.appendChild(el('div', { className: 'empty-state' }, [
      el('h2', { textContent: 'Progetto non trovato' }),
      el('button', { className: 'btn btn-primary', textContent: '← Torna ai progetti', onClick: () => { window.location.hash = '#/projects'; }}),
    ]));
    return;
  }

  const cols = { ...DEFAULT_COLUMNS, ...(proj._columnVisibility || {}) };
  const wrapper = el('div', { className: 'estimator-view' });

  // Back button
  wrapper.appendChild(el('button', { className: 'btn btn-ghost back-btn', innerHTML: '<i class="ph ph-arrow-left"></i> Tutti i progetti', onClick: () => { window.location.hash = '#/projects'; }}));

  // ─── Project Header ──────────────────────────────
  wrapper.appendChild(renderProjectHeader(proj, projectId));

  // ─── Summary Cards ───────────────────────────────
  const summaryEl = el('div', { className: 'summary-cards', id: 'summary-cards' });
  wrapper.appendChild(summaryEl);

  // ─── Column Visibility Toggle ────────────────────
  wrapper.appendChild(renderColumnToggle(cols, projectId, container));

  // ─── Team Grid ───────────────────────────────────
  wrapper.appendChild(renderTeamGrid(proj, projectId, cols, container));

  container.appendChild(wrapper);
  updateSummary(proj);
}

function renderProjectHeader(proj, projectId) {
  const section = el('div', { className: 'project-header-section glass-card' });

  const makeField = (label, value, key, type = 'text', options = null) => {
    const group = el('div', { className: 'field-group' }, [el('label', { textContent: label })]);
    let input;
    if (options) {
      input = el('select', { value, onChange: (e) => state.updateProject(projectId, { [key]: e.target.value }) });
      options.forEach(o => {
        const opt = el('option', { value: o, textContent: o });
        if (o === value) opt.selected = true;
        input.appendChild(opt);
      });
    } else {
      input = el('input', { type: type === 'date' ? 'text' : type, value: value || '', onChange: (e) => {
        state.updateProject(projectId, { [key]: e.target.value });
        if (key === 'dataInizio' || key === 'dataFine') {
          renderEstimator(document.getElementById('app-content'), projectId);
        }
      }});
      if (type === 'date') {
        setTimeout(() => {
          flatpickr(input, {
            dateFormat: 'Y-m-d',
            defaultDate: value || null,
            locale: 'it',
            onChange: (selectedDates, dateStr) => {
              input.value = dateStr;
              input.dispatchEvent(new Event('change'));
            }
          });
        }, 0);
      }
    }
    group.appendChild(input);
    return group;
  };

  const row1 = el('div', { className: 'field-row' }, [
    makeField('Nome Progetto', proj.nome, 'nome'),
    makeField('Cliente', proj.cliente, 'cliente'),
    makeField('Tipologia', proj.tipologia, 'tipologia', 'text', PROJECT_TYPES),
  ]);

  const row2 = el('div', { className: 'field-row' }, [
    makeField('Project Lead', proj.projectLead, 'projectLead'),
    makeField('Account Lead', proj.accountLead, 'accountLead'),
    makeField('Buffer %', proj.bufferPercent, 'bufferPercent', 'number'),
  ]);

  const row3 = el('div', { className: 'field-row' }, [
    makeField('Data Inizio', proj.dataInizio, 'dataInizio', 'date'),
    makeField('Data Fine', proj.dataFine, 'dataFine', 'date'),
    el('div', { className: 'field-group' }, [
      el('label', { textContent: 'Durata' }),
      el('div', { className: 'computed-value', textContent: calcDuration(proj) }),
    ]),
  ]);

  const row4 = el('div', { className: 'field-row' }, [
    makeField('BD Fee %', proj.bdFeePercent, 'bdFeePercent', 'number'),
    makeField('Altre Revenues (€)', proj.altreRevenues, 'altreRevenues', 'number'),
    makeField('Costi Esterni (€)', proj.costiEsterni, 'costiEsterni', 'number'),
    makeField('Licenze (€)', proj.licenze, 'licenze', 'number'),
  ]);

  section.append(row1, row2, row3, row4);
  return section;
}

function calcDuration(proj) {
  if (!proj.dataInizio || !proj.dataFine) return '—';
  const weeks = getWeeksBetween(proj.dataInizio, proj.dataFine);
  return `${weeks.length} settiman${weeks.length === 1 ? 'a' : 'e'}`;
}

function renderColumnToggle(cols, projectId, container) {
  const bar = el('div', { className: 'column-toggle-bar' });
  const btn = el('button', { className: 'btn btn-secondary btn-sm', innerHTML: '<i class="ph ph-gear"></i> Colonne', onClick: () => {
    dropdown.classList.toggle('open');
  }});
  const dropdown = el('div', { className: 'column-dropdown' });

  const labels = {
    ruolo: 'Ruolo', livello: 'Livello', attivita: 'Attività',
    datePersona: 'Date Coinvolgimento', costoStd: 'Costo Std €/gg', rateStd: 'Rate Std €/gg',
    rateAcc: 'Rate Accordato', totGg: 'Tot Giorni', costoTot: 'Costo Totale',
    ricavoTot: 'Ricavo Totale', marginEur: 'Margine €', marginPct: 'Margine %',
  };

  for (const [key, label] of Object.entries(labels)) {
    const cb = el('label', { className: 'cb-label' }, [
      el('input', { type: 'checkbox', checked: cols[key] ? 'checked' : undefined, onChange: (e) => {
        cols[key] = e.target.checked;
        state.updateProject(projectId, { _columnVisibility: { ...cols } });
        renderEstimator(container, projectId);
      }}),
      document.createTextNode(' ' + label),
    ]);
    // Fix: set checked properly
    cb.querySelector('input').checked = !!cols[key];
    dropdown.appendChild(cb);
  }

  bar.append(btn, dropdown);

  const actions = el('div', { className: 'bar-actions' }, [
    el('button', { className: 'btn btn-secondary btn-sm', innerHTML: '<i class="ph ph-file-csv"></i> Esporta CSV', onClick: () => {
      const proj = state.getProject(projectId);
      if (proj) exportProjectCSV(proj);
    }}),
    el('button', { className: 'btn btn-primary btn-sm', innerHTML: '<i class="ph ph-plus"></i> Aggiungi Risorsa', onClick: () => {
      showAddResourceModal(projectId, container);
    }})
  ]);

  bar.appendChild(actions);

  return bar;
}

function exportProjectCSV(proj) {
  const weeks = (proj.dataInizio && proj.dataFine) ? getWeeksBetween(proj.dataInizio, proj.dataFine) : [];
  const header = ['Risorsa', 'Ruolo', 'Livello', 'Attività', 'Inizio', 'Fine', 'Rate Accordato', 'Tot Giorni', 'Costo Totale', 'Ricavo Totale', ...weeks.map(w => w.label)];
  
  const rows = proj.team.map(m => {
    const member = getMemberById(m.risorsaId);
    const totalDays = Object.values(m.settimane || {}).reduce((s, v) => s + (Number(v) || 0), 0);
    const costTot = totalDays * (m.costoStandard || 0);
    const revTot = totalDays * (m.rateAccordato || 0);
    
    return [
      member ? `${member.cognome} ${member.nome}` : 'N/A',
      m.ruolo || '',
      member ? member.livello : '',
      m.attivita || '',
      m.dataInizio || '',
      m.dataFine || '',
      m.rateAccordato || 0,
      totalDays,
      costTot,
      revTot,
      ...weeks.map(w => m.settimane[w.label] || 0)
    ];
  });
  
  downloadCSV(`${proj.nome.replace(/\s+/g, '_')}_budget.csv`, [header, ...rows]);
  showToast('Progetto esportato in CSV', 'success');
}

function showAddResourceModal(projectId, container) {
  const overlay = el('div', { className: 'modal-overlay', onClick: (e) => { if (e.target === overlay) overlay.remove(); }});
  const modal = el('div', { className: 'modal glass-card' });

  modal.appendChild(el('h2', { textContent: 'Aggiungi Risorsa' }));

  // Step 1: Role
  const roleSelect = el('select', { className: 'modal-select' });
  roleSelect.appendChild(el('option', { value: '', textContent: '— Seleziona Ruolo —' }));
  ROLES.forEach(r => roleSelect.appendChild(el('option', { value: r, textContent: r })));

  // Step 2: Name (populated when role is selected)
  const nameSelect = el('select', { className: 'modal-select', disabled: 'disabled' });
  nameSelect.appendChild(el('option', { value: '', textContent: '— Seleziona Nome —' }));

  // Preview
  const preview = el('div', { className: 'modal-preview' });

  roleSelect.addEventListener('change', () => {
    const role = roleSelect.value;
    nameSelect.innerHTML = '';
    nameSelect.appendChild(el('option', { value: '', textContent: '— Seleziona Nome —' }));
    clear(preview);

    if (!role) { nameSelect.disabled = true; return; }

    const members = getMembersByRole(role);
    nameSelect.disabled = false;

    if (members.length === 1) {
      // Auto-select
      nameSelect.appendChild(el('option', { value: String(members[0].id), textContent: members[0].cognome, selected: true }));
      nameSelect.value = String(members[0].id);
      showPreview(members[0], preview);
    } else {
      members.forEach(m => {
        nameSelect.appendChild(el('option', { value: String(m.id), textContent: m.cognome }));
      });
    }
  });

  nameSelect.addEventListener('change', () => {
    clear(preview);
    const memberId = Number(nameSelect.value);
    if (!memberId) return;
    const member = getMemberById(memberId);
    if (member) showPreview(member, preview);
  });

  const addBtn = el('button', { className: 'btn btn-primary', textContent: 'Aggiungi', onClick: () => {
    const memberId = Number(nameSelect.value);
    if (!memberId) { showToast('Seleziona una risorsa', 'error'); return; }
    const member = getMemberById(memberId);
    if (member) {
      state.addTeamMember(projectId, member);
      overlay.remove();
      renderEstimator(container, projectId);
      showToast('Risorsa aggiunta', 'success');
    }
  }});

  const cancelBtn = el('button', { className: 'btn btn-ghost', textContent: 'Annulla', onClick: () => overlay.remove() });

  modal.append(
    el('div', { className: 'field-group' }, [el('label', { textContent: 'Ruolo' }), roleSelect]),
    el('div', { className: 'field-group' }, [el('label', { textContent: 'Nome' }), nameSelect]),
    preview,
    el('div', { className: 'modal-actions' }, [cancelBtn, addBtn])
  );
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
}

function showPreview(member, container) {
  container.appendChild(el('div', { className: 'preview-grid' }, [
    el('div', { className: 'preview-item' }, [el('span', { textContent: 'Tipologia' }), el('strong', { textContent: member.tipologia })]),
    el('div', { className: 'preview-item' }, [el('span', { textContent: 'Costo/gg' }), el('strong', { textContent: fmtCurrency(member.costoGg) })]),
    el('div', { className: 'preview-item' }, [el('span', { textContent: 'Rate/gg' }), el('strong', { textContent: fmtCurrency(member.rateGg) })]),
    el('div', { className: 'preview-item' }, [el('span', { textContent: 'Disponibilità' }), el('strong', { textContent: member.disponibilitaPct + '%' })]),
    el('div', { className: 'preview-item' }, [el('span', { textContent: 'gg/Settimana' }), el('strong', { textContent: String(member.giorniSett) })]),
  ]));
}

function renderTeamGrid(proj, projectId, cols, container) {
  const weeks = (proj.dataInizio && proj.dataFine) ? getWeeksBetween(proj.dataInizio, proj.dataFine) : [];
  const section = el('div', { className: 'team-grid-wrapper' });
  const table = el('table', { className: 'team-grid' });

  // ─── Header ──────────────────────────────────────
  const thead = el('thead');
  const headerRow = el('tr');
  headerRow.appendChild(el('th', { className: 'col-num sticky-left', textContent: '#' }));
  headerRow.appendChild(el('th', { className: 'col-name sticky-left-2', textContent: 'Risorsa' }));
  if (cols.ruolo) headerRow.appendChild(el('th', { textContent: 'Ruolo' }));
  if (cols.livello) headerRow.appendChild(el('th', { textContent: 'Livello' }));
  if (cols.attivita) headerRow.appendChild(el('th', { className: 'col-attivita', textContent: 'Attività' }));
  if (cols.datePersona) {
    headerRow.appendChild(el('th', { textContent: 'Da' }));
    headerRow.appendChild(el('th', { textContent: 'A' }));
  }
  if (cols.costoStd) headerRow.appendChild(el('th', { textContent: 'Costo €/gg' }));
  if (cols.rateStd) headerRow.appendChild(el('th', { textContent: 'Rate Std' }));
  if (cols.rateAcc) headerRow.appendChild(el('th', { textContent: 'Rate Acc.' }));

  // Weekly headers
  weeks.forEach(w => {
    headerRow.appendChild(el('th', { className: 'col-week', innerHTML: `<div class="week-label">${w.label}</div><div class="week-dates">${w.sublabel}</div>` }));
  });

  if (cols.totGg) headerRow.appendChild(el('th', { className: 'col-result', textContent: 'Tot gg' }));
  if (cols.costoTot) headerRow.appendChild(el('th', { className: 'col-result', textContent: 'Costo Tot.' }));
  if (cols.ricavoTot) headerRow.appendChild(el('th', { className: 'col-result', textContent: 'Ricavo Tot.' }));
  if (cols.marginEur) headerRow.appendChild(el('th', { className: 'col-result', textContent: 'Margine €' }));
  if (cols.marginPct) headerRow.appendChild(el('th', { className: 'col-result', textContent: 'Margine %' }));
  headerRow.appendChild(el('th', { className: 'col-action', textContent: '' }));

  thead.appendChild(headerRow);
  table.appendChild(thead);

  // ─── Body ────────────────────────────────────────
  const tbody = el('tbody');
  proj.team.forEach((member, idx) => {
    tbody.appendChild(renderTeamRow(member, idx, proj, projectId, weeks, cols, container));
  });

  // ─── Totals Row ──────────────────────────────────
  const totalsRow = el('tr', { className: 'totals-row' });
  totalsRow.appendChild(el('td', { className: 'sticky-left', textContent: '' }));
  totalsRow.appendChild(el('td', { className: 'sticky-left-2', innerHTML: '<strong>TOTALI</strong>' }));

  let skipCols = 0;
  if (cols.ruolo) skipCols++;
  if (cols.livello) skipCols++;
  if (cols.attivita) skipCols++;
  if (cols.datePersona) skipCols += 2;
  if (cols.costoStd) skipCols++;
  if (cols.rateStd) skipCols++;
  if (cols.rateAcc) skipCols++;
  for (let i = 0; i < skipCols; i++) totalsRow.appendChild(el('td', { textContent: '' }));

  // Weekly totals
  weeks.forEach(w => {
    const weekTotal = proj.team.reduce((sum, m) => sum + (Number(m.settimane?.[w.key]) || 0), 0);
    totalsRow.appendChild(el('td', { className: 'col-week total-cell', textContent: weekTotal > 0 ? fmtDays(weekTotal) : '' }));
  });

  const grandTotalDays = proj.team.reduce((sum, m) => sum + Object.values(m.settimane || {}).reduce((s, v) => s + (Number(v) || 0), 0), 0);
  const grandTotalCost = proj.team.reduce((sum, m) => { const d = Object.values(m.settimane || {}).reduce((s, v) => s + (Number(v) || 0), 0); return sum + d * (m.costoStandard || 0); }, 0);
  const grandTotalRev = proj.team.reduce((sum, m) => { const d = Object.values(m.settimane || {}).reduce((s, v) => s + (Number(v) || 0), 0); return sum + d * (m.rateAccordato || 0); }, 0);
  const grandMarginEur = grandTotalRev - grandTotalCost;
  const grandMarginPct = grandTotalRev > 0 ? (grandMarginEur / grandTotalRev * 100) : 0;

  if (cols.totGg) totalsRow.appendChild(el('td', { className: 'col-result total-cell', innerHTML: `<strong>${fmtDays(grandTotalDays)}</strong>` }));
  if (cols.costoTot) totalsRow.appendChild(el('td', { className: 'col-result total-cell', innerHTML: `<strong>${fmtCurrency(grandTotalCost)}</strong>` }));
  if (cols.ricavoTot) totalsRow.appendChild(el('td', { className: 'col-result total-cell', innerHTML: `<strong>${fmtCurrency(grandTotalRev)}</strong>` }));
  if (cols.marginEur) totalsRow.appendChild(el('td', { className: 'col-result total-cell', innerHTML: `<strong>${fmtCurrency(grandMarginEur)}</strong>` }));
  if (cols.marginPct) totalsRow.appendChild(el('td', { className: `col-result total-cell ${grandMarginPct >= 30 ? 'text-green' : grandMarginPct >= 15 ? 'text-yellow' : 'text-red'}`, innerHTML: `<strong>${fmtPercent(grandMarginPct)}</strong>` }));
  totalsRow.appendChild(el('td', { textContent: '' }));

  tbody.appendChild(totalsRow);
  table.appendChild(tbody);
  section.appendChild(table);
  return section;
}

function renderTeamRow(member, idx, proj, projectId, weeks, cols, appContainer) {
  const row = el('tr');
  row.appendChild(el('td', { className: 'col-num sticky-left', textContent: String(idx + 1) }));
  row.appendChild(el('td', { className: 'col-name sticky-left-2', innerHTML: `<strong>${member.cognome}</strong>` }));

  if (cols.ruolo) row.appendChild(makeEditableCell(member.ruolo, (v) => state.updateTeamMember(projectId, member.rowId, { ruolo: v })));
  if (cols.livello) row.appendChild(makeEditableCell(member.livello, (v) => state.updateTeamMember(projectId, member.rowId, { livello: v })));
  if (cols.attivita) {
    const td = el('td', { className: 'col-attivita' });
    const input = el('input', { type: 'text', className: 'cell-input input-wide', value: member.attivita || '', placeholder: 'Attività...', onChange: (e) => {
      state.updateTeamMember(projectId, member.rowId, { attivita: e.target.value });
    }});
    td.appendChild(input);
    row.appendChild(td);
  }

  if (cols.datePersona) {
    row.appendChild(makeDateCell(member.dataInizio, (v) => {
      state.updateTeamMember(projectId, member.rowId, { dataInizio: v });
      renderEstimator(appContainer, projectId);
    }));
    row.appendChild(makeDateCell(member.dataFine, (v) => {
      state.updateTeamMember(projectId, member.rowId, { dataFine: v });
      renderEstimator(appContainer, projectId);
    }));
  }

  if (cols.costoStd) row.appendChild(makeNumberCell(member.costoStandard, (v) => state.updateTeamMember(projectId, member.rowId, { costoStandard: v })));
  if (cols.rateStd) row.appendChild(makeNumberCell(member.rateStandard, (v) => state.updateTeamMember(projectId, member.rowId, { rateStandard: v })));
  if (cols.rateAcc) row.appendChild(makeNumberCell(member.rateAccordato, (v) => {
    state.updateTeamMember(projectId, member.rowId, { rateAccordato: v });
    updateSummary(state.getProject(projectId));
  }));

  // Weekly cells
  const memberStart = member.dataInizio || proj.dataInizio;
  const memberEnd = member.dataFine || proj.dataFine;

  weeks.forEach(w => {
    const inRange = weekOverlapsRange(w.start, w.end, memberStart, memberEnd);
    const td = el('td', { className: `col-week ${inRange ? '' : 'disabled-cell'}` });
    if (inRange) {
      const input = el('input', {
        type: 'number', className: 'cell-input week-input',
        value: member.settimane?.[w.key] || '',
        min: '0', max: '5', step: '0.5',
        placeholder: '0',
      });
      applyHeatmapAndValidation(input, member, w.key, projectId);
      input.addEventListener('change', (e) => {
        const val = Number(e.target.value) || 0;
        const settimane = { ...(member.settimane || {}), [w.key]: val };
        state.updateTeamMember(projectId, member.rowId, { settimane });
        updateRowTotals(row, member, projectId, cols);
        updateSummary(state.getProject(projectId));
        const updatedMember = state.getProject(projectId).team.find(m => m.rowId === member.rowId);
        applyHeatmapAndValidation(input, updatedMember, w.key, projectId);
      });
      td.appendChild(input);
    }
    row.appendChild(td);
  });

  // Calculated columns
  const totalDays = Object.values(member.settimane || {}).reduce((s, v) => s + (Number(v) || 0), 0);
  const costTot = totalDays * (member.costoStandard || 0);
  const revTot = totalDays * (member.rateAccordato || 0);
  const marginEur = revTot - costTot;
  const marginPct = revTot > 0 ? (marginEur / revTot * 100) : 0;

  if (cols.totGg) row.appendChild(el('td', { className: 'col-result', textContent: fmtDays(totalDays), dataset: { field: 'totGg' } }));
  if (cols.costoTot) row.appendChild(el('td', { className: 'col-result', textContent: fmtCurrency(costTot), dataset: { field: 'costoTot' } }));
  if (cols.ricavoTot) row.appendChild(el('td', { className: 'col-result', textContent: fmtCurrency(revTot), dataset: { field: 'ricavoTot' } }));
  if (cols.marginEur) row.appendChild(el('td', { className: 'col-result', textContent: fmtCurrency(marginEur), dataset: { field: 'marginEur' } }));
  if (cols.marginPct) row.appendChild(el('td', { className: `col-result ${marginPct >= 30 ? 'text-green' : marginPct >= 15 ? 'text-yellow' : 'text-red'}`, textContent: fmtPercent(marginPct), dataset: { field: 'marginPct' } }));

  // Delete button
  row.appendChild(el('td', { className: 'col-action' }, [
    el('button', { className: 'btn-icon btn-danger', innerHTML: '<i class="ph ph-trash"></i>', title: 'Rimuovi', onClick: () => {
      state.removeTeamMember(projectId, member.rowId);
      renderEstimator(appContainer, projectId);
      showToast('Risorsa rimossa', 'info');
    }}),
  ]));

  return row;
}

function updateRowTotals(row, member, projectId, cols) {
  const updated = state.getProject(projectId)?.team.find(m => m.rowId === member.rowId);
  if (!updated) return;
  const totalDays = Object.values(updated.settimane || {}).reduce((s, v) => s + (Number(v) || 0), 0);
  const costTot = totalDays * (updated.costoStandard || 0);
  const revTot = totalDays * (updated.rateAccordato || 0);
  const marginEur = revTot - costTot;
  const marginPct = revTot > 0 ? (marginEur / revTot * 100) : 0;

  row.querySelectorAll('td[data-field]').forEach(td => {
    switch (td.dataset.field) {
      case 'totGg': td.textContent = fmtDays(totalDays); break;
      case 'costoTot': td.textContent = fmtCurrency(costTot); break;
      case 'ricavoTot': td.textContent = fmtCurrency(revTot); break;
      case 'marginEur': td.textContent = fmtCurrency(marginEur); break;
      case 'marginPct':
        td.textContent = fmtPercent(marginPct);
        td.className = `col-result ${marginPct >= 30 ? 'text-green' : marginPct >= 15 ? 'text-yellow' : 'text-red'}`;
        break;
    }
  });
}

function updateSummary(proj) {
  const el2 = document.getElementById('summary-cards');
  if (!el2 || !proj) return;
  clear(el2);

  let totalCost = 0, totalRev = 0, totalDays = 0;
  for (const m of proj.team) {
    const d = Object.values(m.settimane || {}).reduce((s, v) => s + (Number(v) || 0), 0);
    totalDays += d;
    totalCost += d * (m.costoStandard || 0);
    totalRev += d * (m.rateAccordato || 0);
  }
  const margin = totalRev - totalCost;
  const marginPct = totalRev > 0 ? (margin / totalRev * 100) : 0;
  
  const buffer = totalRev * (Number(proj.bufferPercent) || 0) / 100;
  const bdFee = totalRev * (Number(proj.bdFeePercent) || 0) / 100;
  
  const totalExternalCosts = (Number(proj.costiEsterni) || 0) + (Number(proj.licenze) || 0);
  const totalOtherRevenues = (Number(proj.altreRevenues) || 0);
  
  const finalRev = totalRev + totalOtherRevenues;
  const finalCost = totalCost + totalExternalCosts + bdFee;
  const finalMargin = finalRev - finalCost;
  const finalMarginPct = finalRev > 0 ? (finalMargin / finalRev * 100) : 0;

  const cards = [
    { label: 'Ricavo Produzione', value: fmtCurrency(totalRev), cls: '' },
    { label: 'Costo Produzione', value: fmtCurrency(totalCost), cls: '' },
    { label: 'Margine Proda', value: `${fmtCurrency(margin)} (${fmtPercent(marginPct)})`, cls: marginPct >= 30 ? 'card-green' : marginPct >= 15 ? 'card-yellow' : 'card-red' },
    { label: 'BD Fee', value: fmtCurrency(bdFee), cls: '' },
    { label: 'Costi Esterni/Licenze', value: fmtCurrency(totalExternalCosts), cls: '' },
    { label: 'Margine Finale', value: `${fmtCurrency(finalMargin)} (${fmtPercent(finalMarginPct)})`, cls: finalMarginPct >= 25 ? 'card-green' : finalMarginPct >= 10 ? 'card-yellow' : 'card-red' },
    { label: 'Totale Progetto', value: fmtCurrency(finalRev - buffer), cls: 'card-highlight' },
    { label: 'Giorni Totali', value: fmtDays(totalDays), cls: '' },
  ];

  cards.forEach(c => {
    el2.appendChild(el('div', { className: `summary-card glass-card ${c.cls}` }, [
      el('div', { className: 'summary-label', textContent: c.label }),
      el('div', { className: 'summary-value', textContent: c.value }),
    ]));
  });
}

function makeEditableCell(value, onChange) {
  const td = el('td');
  const input = el('input', { type: 'text', className: 'cell-input', value: value || '' });
  input.addEventListener('change', (e) => onChange(e.target.value));
  td.appendChild(input);
  return td;
}

function makeNumberCell(value, onChange) {
  const td = el('td');
  const input = el('input', { type: 'number', className: 'cell-input', value: value ?? '' });
  input.addEventListener('change', (e) => onChange(Number(e.target.value) || 0));
  td.appendChild(input);
  return td;
}

function makeDateCell(value, onChange) {
  const td = el('td');
  const input = el('input', { type: 'text', className: 'cell-input', value: toISODate(value) });
  input.addEventListener('change', (e) => onChange(e.target.value));
  td.appendChild(input);
  
  setTimeout(() => {
    flatpickr(input, {
      dateFormat: 'Y-m-d',
      defaultDate: value ? toISODate(value) : null,
      locale: 'it'
    });
  }, 0);
  
  return td;
}

function applyHeatmapAndValidation(input, member, weekKey, projectId) {
  const memberId = member.risorsaId;
  const dbMember = getMemberById(memberId);
  const maxDays = dbMember ? dbMember.giorniSett : 5;
  
  const allAllocations = state.getAllocationForMember(memberId);
  let totalDays = 0;
  let tooltips = [];
  
  for (const alloc of allAllocations) {
    const days = Number(alloc.settimane?.[weekKey]) || 0;
    if (days > 0) {
      totalDays += days;
      tooltips.push(`- ${alloc.projectName}: ${days}gg`);
    }
  }
  
  input.classList.remove('heat-low', 'heat-med', 'heat-high', 'heat-over');
  
  if (totalDays === 0) {
    input.title = '';
  } else {
    input.title = `Totale: ${totalDays}/${maxDays}gg\n` + tooltips.join('\n');
    
    if (totalDays > maxDays) {
      input.classList.add('heat-over');
    } else if (totalDays >= maxDays * 0.8) {
      input.classList.add('heat-high');
    } else if (totalDays >= maxDays * 0.4) {
      input.classList.add('heat-med');
    } else {
      input.classList.add('heat-low');
    }
  }
}
