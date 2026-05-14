import { state } from './state.js';
import { ROLES, PROJECT_TEMPLATES, PROJECT_TYPES } from './data.js';
import { el, clear, fmtCurrency, fmtPercent, fmtDays, getWeeksBetween, weekOverlapsRange, toISODate, showToast, downloadCSV } from './utils.js';
import { checkAuth } from './main.js';

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

  const auth = checkAuth();
  const dbUser = auth ? state.getUser(auth.user) : null;
  const isAdmin = dbUser?.role === 'admin';

  const cols = { ...DEFAULT_COLUMNS, ...(proj._columnVisibility || {}) };
  const wrapper = el('div', { className: 'estimator-view' });

  // Back button
  wrapper.appendChild(el('button', { className: 'btn btn-ghost back-btn', innerHTML: '<i class="ph ph-arrow-left"></i> Tutti i progetti', onClick: () => { window.location.hash = '#/projects'; }}));

  // ─── Top Sections (Side-by-side Accordions) ──────
  const topSections = el('div', { className: 'estimator-top-sections' });
  
  const infoSection = renderProjectInfo(proj, projectId);
  topSections.appendChild(renderAccordion('Informazioni Progetto', infoSection, true));

  if (isAdmin) {
    const ecoSection = el('div', { className: 'project-header-section' });
    ecoSection.appendChild(renderEcoParamsFields(proj, projectId));
    const summaryEl = el('div', { className: 'summary-cards', id: 'summary-cards' });
    ecoSection.appendChild(summaryEl);
    topSections.appendChild(renderAccordion('Parametri Economici', ecoSection, true));
  }

  wrapper.appendChild(topSections);

  // ─── Team Grid ───────────────────────────────────
  wrapper.appendChild(renderTeamGrid(proj, projectId, cols, container, isAdmin));

  container.appendChild(wrapper);
  if (isAdmin) {
    updateSummary(proj);
  }
}

function renderAccordion(title, contentNode, defaultOpen = true) {
  const card = el('div', { className: `accordion-card glass-card ${defaultOpen ? 'open' : ''}` });
  const header = el('div', { className: 'accordion-header', onClick: () => {
    card.classList.toggle('open');
    const icon = header.querySelector('i');
    if (card.classList.contains('open')) {
      icon.className = 'ph ph-caret-up';
    } else {
      icon.className = 'ph ph-caret-down';
    }
  }}, [
    el('h3', { textContent: title }),
    el('i', { className: `ph ${defaultOpen ? 'ph-caret-up' : 'ph-caret-down'}` })
  ]);
  const content = el('div', { className: 'accordion-content' });
  content.appendChild(contentNode);
  card.append(header, content);
  return card;
}

function renderProjectInfo(proj, projectId) {
  const section = el('div', { className: 'project-header-section' });

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
    makeField('Tipologia', proj.tipologia, 'tipologia', 'text', PROJECT_TYPES),
  ]);

  const row2 = el('div', { className: 'field-row' }, [
    makeField('Cliente', proj.cliente, 'cliente'),
    makeField('Project Lead', proj.projectLead, 'projectLead'),
    makeField('Account Lead', proj.accountLead, 'accountLead'),
  ]);

  const row3 = el('div', { className: 'field-row' }, [
    makeField('Data Inizio', proj.dataInizio, 'dataInizio', 'date'),
    makeField('Data Fine', proj.dataFine, 'dataFine', 'date'),
    el('div', { className: 'field-group' }, [
      el('label', { textContent: 'Durata' }),
      el('div', { className: 'computed-value', textContent: calcDuration(proj) }),
    ]),
  ]);

  section.append(row1, row2, row3);
  return section;
}

function renderEcoParamsFields(proj, projectId) {
  const section = el('div', { className: 'project-header-section eco-params-inputs' });

  const makeField = (label, value, key, type = 'text') => {
    const group = el('div', { className: 'field-group' }, [el('label', { textContent: label })]);
    const input = el('input', { type: type, value: value || '', onChange: (e) => {
      state.updateProject(projectId, { [key]: e.target.value });
      updateSummary(state.getProject(projectId));
    }});
    group.appendChild(input);
    return group;
  };

  const row1 = el('div', { className: 'field-row' }, [
    makeField('Buffer %', proj.bufferPercent, 'bufferPercent', 'number'),
    makeField('BD Fee %', proj.bdFeePercent, 'bdFeePercent', 'number'),
    makeField('Altre Revenues (€)', proj.altreRevenues, 'altreRevenues', 'number'),
  ]);

  const row2 = el('div', { className: 'field-row' }, [
    makeField('Costi Esterni (€)', proj.costiEsterni, 'costiEsterni', 'number'),
    makeField('Licenze (€)', proj.licenze, 'licenze', 'number'),
  ]);

  section.append(row1, row2);
  return section;
}

function calcDuration(proj) {
  if (!proj.dataInizio || !proj.dataFine) return '—';
  const weeks = getWeeksBetween(proj.dataInizio, proj.dataFine);
  return `${weeks.length} settiman${weeks.length === 1 ? 'a' : 'e'}`;
}

function exportProjectCSV(proj, isAdmin) {
  const weeks = (proj.dataInizio && proj.dataFine) ? getWeeksBetween(proj.dataInizio, proj.dataFine) : [];
  
  const header = ['Risorsa', 'Ruolo', 'Livello', 'Attività', 'Inizio', 'Fine', 'Tot Giorni'];
  if (isAdmin) {
    header.push('Rate Accordato', 'Costo Totale', 'Ricavo Totale');
  }
  header.push(...weeks.map(w => w.label));
  
  const rows = proj.team.map(m => {
    const member = state.getResourceById(m.risorsaId);
    const totalDays = Object.values(m.settimane || {}).reduce((s, v) => s + (Number(v) || 0), 0);
    const costTot = totalDays * (m.costoStandard || 0);
    const revTot = totalDays * (m.rateAccordato || 0);
    
    const row = [
      member ? member.cognome : 'N/A',
      m.ruolo || '',
      member ? member.livello : '',
      m.attivita || '',
      m.dataInizio || '',
      m.dataFine || '',
      totalDays
    ];

    if (isAdmin) {
      row.push(m.rateAccordato || 0, costTot, revTot);
    }

    row.push(...weeks.map(w => m.settimane[w.label] || 0));

    return row;
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

    const filteredMembers = state.getResourcesByRole(role);
    if (filteredMembers.length === 0) { nameSelect.disabled = true; return; }
    nameSelect.disabled = false;

    if (filteredMembers.length === 1) {
      // Auto-select
      nameSelect.appendChild(el('option', { value: String(filteredMembers[0].id), textContent: filteredMembers[0].cognome, selected: true }));
      nameSelect.value = String(filteredMembers[0].id);
      showPreview(filteredMembers[0], preview);
    } else {
      filteredMembers.forEach(m => {
        nameSelect.appendChild(el('option', { value: String(m.id), textContent: m.cognome }));
      });
    }
  });

  nameSelect.addEventListener('change', () => {
    clear(preview);
    const memberId = Number(nameSelect.value);
    if (!memberId) return;
    const member = state.getResourceById(memberId);
    if (member) showPreview(member, preview);
  });

  const addBtn = el('button', { className: 'btn btn-primary', textContent: 'Aggiungi', onClick: () => {
    const memberId = Number(nameSelect.value);
    if (!memberId) { showToast('Seleziona una risorsa', 'error'); return; }
    const member = state.getResourceById(memberId);
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

function renderTeamGrid(proj, projectId, cols, container, isAdmin) {
  const weeks = (proj.dataInizio && proj.dataFine) ? getWeeksBetween(proj.dataInizio, proj.dataFine) : [];
  
  const wrapper = el('div', { className: 'team-section-container' });
  const header = el('div', { className: 'team-section-header' }, [
    el('h3', { textContent: 'Team di progetto' }),
    el('div', { className: 'team-section-actions' }, [
       el('button', { className: 'btn btn-secondary btn-sm', innerHTML: '<i class="ph ph-file-csv"></i> Esporta CSV', onClick: () => { exportProjectCSV(proj, isAdmin); } }),
       el('button', { className: 'btn btn-primary btn-sm', innerHTML: '<i class="ph ph-plus"></i> Aggiungi Risorsa', onClick: () => { showAddResourceModal(projectId, container); } })
    ])
  ]);
  wrapper.appendChild(header);

  const section = el('div', { className: 'team-grid-wrapper' });
  const table = el('table', { className: 'team-grid' });

  // ─── Header ──────────────────────────────────────
  const thead = el('thead');
  const headerRow = el('tr');
  headerRow.appendChild(el('th', { className: 'col-num sticky-left', textContent: '#' }));
  headerRow.appendChild(el('th', { className: 'col-name sticky-left-2', textContent: 'Figura' }));
  headerRow.appendChild(el('th', { textContent: 'Ruolo' }));

  // Weekly headers
  weeks.forEach(w => {
    headerRow.appendChild(el('th', { className: 'col-week', innerHTML: `<div class="week-label">${w.label}</div><div class="week-dates">${w.sublabel}</div>` }));
  });

  headerRow.appendChild(el('th', { className: 'col-result', textContent: 'Tot gg' }));
  headerRow.appendChild(el('th', { className: 'col-action', textContent: '' }));

  thead.appendChild(headerRow);
  table.appendChild(thead);

  // ─── Body ────────────────────────────────────────
  const tbody = el('tbody');
  proj.team.forEach((member, idx) => {
    tbody.appendChild(renderTeamRow(member, idx, proj, projectId, weeks, container, isAdmin));
  });

  // ─── Totals Row ──────────────────────────────────
  const totalsRow = el('tr', { className: 'totals-row' });
  totalsRow.appendChild(el('td', { className: 'sticky-left', textContent: '' }));
  totalsRow.appendChild(el('td', { className: 'sticky-left-2', innerHTML: '<strong>TOTALI</strong>' }));
  totalsRow.appendChild(el('td', { textContent: '' })); // Ruolo

  // Weekly totals
  weeks.forEach(w => {
    const weekTotal = proj.team.reduce((sum, m) => sum + (Number(m.settimane?.[w.key]) || 0), 0);
    totalsRow.appendChild(el('td', { className: 'col-week total-cell', textContent: weekTotal > 0 ? fmtDays(weekTotal) : '' }));
  });

  const grandTotalDays = proj.team.reduce((sum, m) => sum + Object.values(m.settimane || {}).reduce((s, v) => s + (Number(v) || 0), 0), 0);
  
  totalsRow.appendChild(el('td', { className: 'col-result total-cell', innerHTML: `<strong>${fmtDays(grandTotalDays)}</strong>` }));
  totalsRow.appendChild(el('td', { textContent: '' }));

  tbody.appendChild(totalsRow);
  table.appendChild(tbody);
  section.appendChild(table);
  wrapper.appendChild(section);
  return wrapper;
}

function renderTeamRow(member, idx, proj, projectId, weeks, appContainer, isAdmin) {
  const frag = document.createDocumentFragment();
  const rowMain = el('tr');
  const rowExpanded = el('tr', { className: 'expanded-row' });
  rowExpanded.style.display = 'none';

  rowMain.appendChild(el('td', { className: 'col-num sticky-left', textContent: String(idx + 1) }));
  
  const iconSpan = el('span', { className: 'cell-arrow', innerHTML: '<i class="ph ph-caret-down"></i>', onClick: () => {
    const isHidden = rowExpanded.style.display === 'none';
    rowExpanded.style.display = isHidden ? 'table-row' : 'none';
    iconSpan.innerHTML = isHidden ? '<i class="ph ph-caret-up"></i>' : '<i class="ph ph-caret-down"></i>';
  }});
  
  const nameCell = el('td', { className: 'col-name sticky-left-2' }, [
    el('div', { className: 'name-cell-content' }, [
      iconSpan,
      el('strong', { textContent: member.cognome })
    ])
  ]);
  rowMain.appendChild(nameCell);

  rowMain.appendChild(makeEditableCell(member.ruolo, (v) => state.updateTeamMember(projectId, member.rowId, { ruolo: v })));

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
        updateRowTotals(rowMain, rowExpanded, member, projectId);
        updateSummary(state.getProject(projectId));
        const updatedMember = state.getProject(projectId).team.find(m => m.rowId === member.rowId);
        applyHeatmapAndValidation(input, updatedMember, w.key, projectId);
      });
      td.appendChild(input);
    }
    rowMain.appendChild(td);
  });

  // Calculate fields
  const totalDays = Object.values(member.settimane || {}).reduce((s, v) => s + (Number(v) || 0), 0);
  const costTot = totalDays * (member.costoStandard || 0);
  const revTot = totalDays * (member.rateAccordato || 0);
  const marginEur = revTot - costTot;
  const marginPct = revTot > 0 ? (marginEur / revTot * 100) : 0;

  rowMain.appendChild(el('td', { className: 'col-result', textContent: fmtDays(totalDays), dataset: { field: 'totGg' } }));

  // Delete button
  rowMain.appendChild(el('td', { className: 'col-action' }, [
    el('button', { className: 'btn-icon btn-danger', innerHTML: '<i class="ph ph-trash"></i>', title: 'Rimuovi', onClick: () => {
      state.removeTeamMember(projectId, member.rowId);
      renderEstimator(appContainer, projectId);
      showToast('Risorsa rimossa', 'info');
    }}),
  ]));

  // ─── Expanded Content ──────────────────────────────
  const colspan = 5 + weeks.length;
  const expTd = el('td', { colSpan: colspan });
  const expContent = el('div', { className: 'expanded-content' });

  const dbMember = state.getResourceById(member.risorsaId);
  const tipologia = dbMember ? dbMember.tipologia : '—';
  
  // Define inputs first
  const daInput = el('input', { type: 'text', className: 'cell-input', value: toISODate(member.dataInizio) });
  daInput.addEventListener('change', (e) => {
    state.updateTeamMember(projectId, member.rowId, { dataInizio: e.target.value });
    renderEstimator(appContainer, projectId);
  });
  setTimeout(() => flatpickr(daInput, { dateFormat: 'Y-m-d', defaultDate: member.dataInizio ? toISODate(member.dataInizio) : null, locale: 'it' }), 0);

  const aInput = el('input', { type: 'text', className: 'cell-input', value: toISODate(member.dataFine) });
  aInput.addEventListener('change', (e) => {
    state.updateTeamMember(projectId, member.rowId, { dataFine: e.target.value });
    renderEstimator(appContainer, projectId);
  });
  setTimeout(() => flatpickr(aInput, { dateFormat: 'Y-m-d', defaultDate: member.dataFine ? toISODate(member.dataFine) : null, locale: 'it' }), 0);

  const costoInput = el('input', { type: 'number', className: 'cell-input', value: member.costoStandard || 0 });
  costoInput.addEventListener('change', (e) => state.updateTeamMember(projectId, member.rowId, { costoStandard: Number(e.target.value) || 0 }));

  const rateStdInput = el('input', { type: 'number', className: 'cell-input', value: member.rateStandard || 0 });
  rateStdInput.addEventListener('change', (e) => state.updateTeamMember(projectId, member.rowId, { rateStandard: Number(e.target.value) || 0 }));

  const rateAccInput = el('input', { type: 'number', className: 'cell-input', value: member.rateAccordato || 0 });
  rateAccInput.addEventListener('change', (e) => {
    state.updateTeamMember(projectId, member.rowId, { rateAccordato: Number(e.target.value) || 0 });
    updateRowTotals(rowMain, rowExpanded, member, projectId);
    updateSummary(state.getProject(projectId));
  });

  const attInput = el('input', { type: 'text', className: 'cell-input', value: member.attivita || '', placeholder: 'Descrizione attività...' });
  attInput.addEventListener('change', (e) => state.updateTeamMember(projectId, member.rowId, { attivita: e.target.value }));

  // Create Grid
  const expGrid = el('div', { className: 'expanded-columns' });

  // Col 1: Inquadramento e Date
  expGrid.appendChild(el('div', { className: 'expanded-col' }, [
    el('div', { className: 'field-group' }, [el('label', { textContent: 'Tipologia' }), el('div', { className: 'computed-text', textContent: tipologia })]),
    el('div', { className: 'field-group' }, [el('label', { textContent: 'Data Inizio' }), daInput]),
    el('div', { className: 'field-group' }, [el('label', { textContent: 'Data Fine' }), aInput])
  ]));

  // Col 2: Parametri Unitari (Only for Admin)
  if (isAdmin) {
    expGrid.appendChild(el('div', { className: 'expanded-col' }, [
      el('div', { className: 'field-group' }, [el('label', { textContent: 'Costo Std €/gg' }), costoInput]),
      el('div', { className: 'field-group' }, [el('label', { textContent: 'Rate Std €/gg' }), rateStdInput]),
      el('div', { className: 'field-group' }, [el('label', { textContent: 'Rate Accordato €/gg' }), rateAccInput])
    ]));

    // Col 3: Indicatori Economici (Totali)
    expGrid.appendChild(el('div', { className: 'expanded-col' }, [
      el('div', { className: 'field-group' }, [el('label', { textContent: 'Costo Totale' }), el('div', { className: 'computed-text', textContent: fmtCurrency(costTot), dataset: { field: 'costoTot' } })]),
      el('div', { className: 'field-group' }, [el('label', { textContent: 'Ricavo Totale' }), el('div', { className: 'computed-text', textContent: fmtCurrency(revTot), dataset: { field: 'ricavoTot' } })])
    ]));

    // Col 4: Margini
    expGrid.appendChild(el('div', { className: 'expanded-col' }, [
      el('div', { className: 'field-group' }, [el('label', { textContent: 'Margine €' }), el('div', { className: 'computed-text', textContent: fmtCurrency(marginEur), dataset: { field: 'marginEur' } })]),
      el('div', { className: 'field-group' }, [el('label', { textContent: 'Margine %' }), el('div', { className: `computed-text ${marginPct >= 30 ? 'text-green' : marginPct >= 15 ? 'text-yellow' : 'text-red'}`, textContent: fmtPercent(marginPct), dataset: { field: 'marginPct' } })])
    ]));
  }

  // Bottom Row for Activity Notes
  const bottomRow = el('div', { className: 'expanded-notes-row' });
  bottomRow.appendChild(el('div', { className: 'field-group' }, [el('label', { textContent: 'Attività / Note' }), attInput]));

  expContent.append(expGrid, bottomRow);
  expTd.appendChild(expContent);
  rowExpanded.appendChild(expTd);

  frag.append(rowMain, rowExpanded);
  return frag;
}

function updateRowTotals(rowMain, rowExpanded, member, projectId) {
  const updated = state.getProject(projectId)?.team.find(m => m.rowId === member.rowId);
  if (!updated) return;
  const totalDays = Object.values(updated.settimane || {}).reduce((s, v) => s + (Number(v) || 0), 0);
  const costTot = totalDays * (updated.costoStandard || 0);
  const revTot = totalDays * (updated.rateAccordato || 0);
  const marginEur = revTot - costTot;
  const marginPct = revTot > 0 ? (marginEur / revTot * 100) : 0;

  const fields = [
    ...rowMain.querySelectorAll('[data-field]'),
    ...rowExpanded.querySelectorAll('[data-field]')
  ];

  fields.forEach(node => {
    switch (node.dataset.field) {
      case 'totGg': node.textContent = fmtDays(totalDays); break;
      case 'costoTot': node.textContent = fmtCurrency(costTot); break;
      case 'ricavoTot': node.textContent = fmtCurrency(revTot); break;
      case 'marginEur': node.textContent = fmtCurrency(marginEur); break;
      case 'marginPct':
        node.textContent = fmtPercent(marginPct);
        node.className = `computed-text ${marginPct >= 30 ? 'text-green' : marginPct >= 15 ? 'text-yellow' : 'text-red'}`;
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
  const dbMember = state.getResourceById(memberId);
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
