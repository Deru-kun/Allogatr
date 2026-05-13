import { state } from './state.js';
import { el, clear, getYearWeek, getWeekDays, formatDateDayMonth, toISODate, getWeeksBetween, parseYearWeek, showToast } from './utils.js';

let currentUserId = null;
let currentDate = new Date();
let currentYearWeek = getYearWeek(currentDate);
let expandedProjects = new Set(); // Stores project IDs

export function renderTimesheet(container) {
  clear(container);
  
  if (state.resources.length === 0) {
    container.appendChild(el('div', { className: 'empty-state glass-card' }, [
      el('h2', { textContent: 'Nessuna risorsa' }),
      el('p', { textContent: 'Aggiungi delle risorse nel tab Risorse per iniziare a usare il timesheet.' })
    ]));
    return;
  }
  
  if (!currentUserId || !state.getResourceById(currentUserId)) {
    currentUserId = String(state.resources[0].id);
  }

  const wrapper = el('div', { className: 'timesheet-view' });
  
  // Header
  wrapper.appendChild(renderHeader());
  
  // Table Container
  const tableContainer = el('div', { className: 'timesheet-table-container glass-card' });
  tableContainer.appendChild(renderTable());
  
  wrapper.appendChild(tableContainer);
  container.appendChild(wrapper);
}

function refreshTimesheet() {
  const container = document.getElementById('app-content');
  if (container) renderTimesheet(container);
}

function renderHeader() {
  const header = el('div', { className: 'timesheet-header glass-card' });
  
  const topBar = el('div', { className: 'timesheet-topbar' });
  
  // User Selector
  const userSelect = el('select', { className: 'input-select', onChange: (e) => {
    currentUserId = e.target.value;
    refreshTimesheet();
  }});
  state.resources.forEach(r => {
    userSelect.appendChild(el('option', { value: String(r.id), textContent: `${r.cognome} ${r.nome || ''}`.trim(), selected: String(r.id) === currentUserId }));
  });
  
  // Week Controls
  const weekControls = el('div', { className: 'week-controls' });
  
  const btnPrev = el('button', { className: 'btn btn-ghost btn-sm', innerHTML: '<i class="ph ph-caret-left"></i>', onClick: () => changeWeek(-1) });
  const btnToday = el('button', { className: 'btn btn-secondary btn-sm', textContent: 'Jump to today', onClick: () => {
    currentDate = new Date();
    currentYearWeek = getYearWeek(currentDate);
    refreshTimesheet();
  }});
  const btnNext = el('button', { className: 'btn btn-ghost btn-sm', innerHTML: '<i class="ph ph-caret-right"></i>', onClick: () => changeWeek(1) });
  
  // Week Selector Dropdown
  const { year, week } = parseYearWeek(currentYearWeek);
  const weekSelect = el('select', { className: 'input-select input-sm', onChange: (e) => {
    currentYearWeek = e.target.value;
    refreshTimesheet();
  }});
  // Populate with 52 weeks around the current year
  for(let w = 1; w <= 52; w++) {
    const val = `${year}-W${String(w).padStart(2, '0')}`;
    weekSelect.appendChild(el('option', { value: val, textContent: `Week ${w}`, selected: val === currentYearWeek }));
  }

  const btnFilter = el('button', { className: 'btn btn-secondary btn-sm', innerHTML: '<i class="ph ph-faders"></i>' });
  
  weekControls.append(btnPrev, btnToday, btnNext, weekSelect, btnFilter);
  topBar.append(userSelect, weekControls);
  
  // Progress bars
  const progressContainer = el('div', { className: 'timesheet-progress' });
  
  const { totalPlanned, totalTracked } = calculateWeekTotals();
  
  const plannedBar = el('div', { className: 'progress-row' }, [
    el('span', { className: 'progress-label', innerHTML: `Planned <strong>${totalPlanned.toFixed(2)} h</strong>` }),
    el('div', { className: 'progress-track' }, [
      el('div', { className: 'progress-fill planned-fill', style: { width: `${Math.min(100, (totalPlanned / 40) * 100)}%` }})
    ])
  ]);
  
  const trackedBar = el('div', { className: 'progress-row' }, [
    el('span', { className: 'progress-label', innerHTML: `Tracked <strong>${totalTracked.toFixed(2)} h</strong>` }),
    el('div', { className: 'progress-track' }, [
      el('div', { className: 'progress-fill tracked-fill', style: { width: `${Math.min(100, (totalTracked / 40) * 100)}%` }})
    ])
  ]);
  
  progressContainer.append(plannedBar, trackedBar);
  header.append(topBar, progressContainer);
  
  return header;
}

function changeWeek(offset) {
  const { year, week } = parseYearWeek(currentYearWeek);
  const d = new Date(year, 0, 1 + (week - 1) * 7);
  d.setDate(d.getDate() + (offset * 7));
  currentYearWeek = getYearWeek(d);
  refreshTimesheet();
}

function renderTable() {
  const settings = state.getTimesheetSettings(currentUserId);
  const days = getWeekDays(currentYearWeek);
  
  const table = el('table', { className: 'timesheet-table' });
  
  // THEAD
  const thead = el('thead');
  const trHead = el('tr');
  
  const thProj = el('th', { className: 'col-project' });
  thProj.appendChild(el('button', { className: 'btn btn-secondary btn-sm', innerHTML: '<i class="ph ph-plus"></i> Projects', onClick: showAddProjectModal }));
  trHead.appendChild(thProj);
  
  settings.visibleDays.forEach(dayIdx => {
    // 0 = Sunday, 1 = Monday... days is ISO start (Monday)
    // days[0] is Mon, days[4] is Fri
    // If settings are 1,2,3,4,5 -> indices 0,1,2,3,4
    const d = days[dayIdx - 1];
    trHead.appendChild(el('th', { className: 'col-day text-center', textContent: formatDateDayMonth(d) }));
  });
  
  trHead.appendChild(el('th', { className: 'col-total text-right', textContent: 'Total' }));
  thead.appendChild(trHead);
  table.appendChild(thead);
  
  // TBODY
  const tbody = el('tbody');
  
  let colTotals = new Array(settings.visibleDays.length).fill(0);
  let grandTotal = 0;
  
  settings.projects.forEach(projId => {
    const proj = state.getProject(projId);
    if (!proj) return;
    
    const isExpanded = expandedProjects.has(projId);
    const timesheetData = state.getTimesheetData(currentUserId, currentYearWeek)[projId] || {};
    
    // Calculate totals for this project
    let projTotal = 0;
    const dayTotals = settings.visibleDays.map((dayIdx, i) => {
      const d = days[dayIdx - 1];
      const iso = toISODate(d);
      const data = timesheetData[iso] || { billable: 0, nonBillable: 0 };
      const sum = data.billable + data.nonBillable;
      projTotal += sum;
      colTotals[i] += sum;
      return sum;
    });
    grandTotal += projTotal;
    
    const plannedHrs = getProjectPlannedHours(projId, currentUserId, currentYearWeek);
    
    // Main Row
    const trMain = el('tr', { className: 'ts-row-main' });
    const tdInfo = el('td', { className: 'ts-proj-info' }, [
      el('button', { className: 'btn-icon', innerHTML: isExpanded ? '<i class="ph ph-caret-down"></i>' : '<i class="ph ph-caret-right"></i>', onClick: () => toggleProjectExpand(projId) }),
      el('div', { className: 'ts-proj-name' }, [
        el('span', { className: 'client-name', textContent: proj.cliente || 'Unknown Client' }),
        el('strong', { textContent: proj.nome })
      ]),
      el('button', { className: 'btn-icon text-danger', innerHTML: '<i class="ph ph-x"></i>', onClick: () => removeProjectFromTimesheet(projId) })
    ]);
    trMain.appendChild(tdInfo);
    
    // Day cells (main row shows totals and allows editing billable)
    settings.visibleDays.forEach((dayIdx, i) => {
      const d = days[dayIdx - 1];
      const iso = toISODate(d);
      const data = timesheetData[iso] || { billable: 0, nonBillable: 0 };
      const val = data.billable + data.nonBillable;

      const td = el('td', { className: 'col-day text-center' });
      const inputWrapper = el('div', { className: 'ts-input-wrapper' });
      
      const input = el('input', { 
        type: 'number', 
        step: '0.5', 
        min: '0', 
        value: val || '',
        placeholder: '0:00',
        onChange: (e) => {
          const newTotal = parseFloat(e.target.value) || 0;
          const newBillable = Math.max(0, newTotal - (data.nonBillable || 0));
          updateTimesheetValue(projId, iso, 'billable', newBillable);
        }
      });
      
      const btnMinus = el('button', { className: 'btn-stepper', innerHTML: '<i class="ph ph-minus"></i>', onClick: () => {
        const v = Math.max(0, (parseFloat(input.value) || 0) - 0.5);
        input.value = v > 0 ? v : '';
        const newBillable = Math.max(0, v - (data.nonBillable || 0));
        updateTimesheetValue(projId, iso, 'billable', newBillable);
      }});
      
      const btnPlus = el('button', { className: 'btn-stepper', innerHTML: '<i class="ph ph-plus"></i>', onClick: () => {
        const v = (parseFloat(input.value) || 0) + 0.5;
        input.value = v;
        const newBillable = Math.max(0, v - (data.nonBillable || 0));
        updateTimesheetValue(projId, iso, 'billable', newBillable);
      }});
      
      inputWrapper.append(btnMinus, input, btnPlus);
      td.appendChild(inputWrapper);
      trMain.appendChild(td);
    });
    
    // Total cell
    trMain.appendChild(el('td', { className: 'col-total text-right' }, [
      el('strong', { textContent: projTotal > 0 ? `${projTotal.toFixed(2)} h` : '0:00 h' }),
      el('div', { className: 'ts-planned', textContent: `Plan: ${plannedHrs.toFixed(2)} h` })
    ]));
    tbody.appendChild(trMain);
    
    // Sub-rows
    if (isExpanded) {
      ['billable', 'nonBillable'].forEach(type => {
        const trSub = el('tr', { className: 'ts-row-sub' });
        trSub.appendChild(el('td', { className: 'ts-sub-label', textContent: type === 'billable' ? 'Billable' : 'Non-billable' }));
        
        settings.visibleDays.forEach(dayIdx => {
          const d = days[dayIdx - 1];
          const iso = toISODate(d);
          const data = timesheetData[iso] || { billable: 0, nonBillable: 0 };
          const val = data[type];
          
          const td = el('td', { className: 'col-day text-center' });
          const inputWrapper = el('div', { className: 'ts-input-wrapper' });
          
          const input = el('input', { 
            type: 'number', 
            step: '0.5', 
            min: '0', 
            value: val || '',
            placeholder: '0:00',
            onChange: (e) => updateTimesheetValue(projId, iso, type, parseFloat(e.target.value) || 0)
          });
          
          const btnMinus = el('button', { className: 'btn-stepper', innerHTML: '<i class="ph ph-minus"></i>', onClick: () => {
            const v = Math.max(0, (parseFloat(input.value) || 0) - 0.5);
            input.value = v > 0 ? v : '';
            updateTimesheetValue(projId, iso, type, v);
          }});
          
          const btnPlus = el('button', { className: 'btn-stepper', innerHTML: '<i class="ph ph-plus"></i>', onClick: () => {
            const v = (parseFloat(input.value) || 0) + 0.5;
            input.value = v;
            updateTimesheetValue(projId, iso, type, v);
          }});
          
          inputWrapper.append(btnMinus, input, btnPlus);
          td.appendChild(inputWrapper);
          trSub.appendChild(td);
        });
        trSub.appendChild(el('td', { className: 'col-total' })); // empty for sub-row
        tbody.appendChild(trSub);
      });
    }
  });
  
  // Footer Row (Totals)
  const tfoot = el('tfoot');
  const trFoot = el('tr', { className: 'ts-row-footer' });
  trFoot.appendChild(el('td', { textContent: 'Total' }));
  
  colTotals.forEach(tot => {
    trFoot.appendChild(el('td', { className: 'text-center', textContent: tot > 0 ? tot.toFixed(2) : '0:00' }));
  });
  
  trFoot.appendChild(el('td', { className: 'text-right', innerHTML: `<strong>${grandTotal > 0 ? `${grandTotal.toFixed(2)} h` : '0:00 h'}</strong><div class="ts-planned">Plan: ${calculateWeekTotals().totalPlanned.toFixed(2)} h</div>` }));
  
  tfoot.appendChild(trFoot);
  table.appendChild(tbody);
  table.appendChild(tfoot);
  
  return table;
}

function updateTimesheetValue(projectId, dateStr, type, value) {
  const timesheetData = state.getTimesheetData(currentUserId, currentYearWeek);
  const data = timesheetData[projectId] || {};
  const current = data[dateStr] || { billable: 0, nonBillable: 0 };
  current[type] = value;
  
  state.saveTimesheetEntry(currentUserId, currentYearWeek, projectId, dateStr, current.billable, current.nonBillable);
  refreshTimesheet();
}

function toggleProjectExpand(projId) {
  if (expandedProjects.has(projId)) expandedProjects.delete(projId);
  else expandedProjects.add(projId);
  refreshTimesheet();
}

function removeProjectFromTimesheet(projId) {
  const settings = state.getTimesheetSettings(currentUserId);
  settings.projects = settings.projects.filter(id => id !== projId);
  state.saveTimesheetSettings(currentUserId, settings);
  expandedProjects.delete(projId);
  refreshTimesheet();
}

function showAddProjectModal() {
  const overlay = el('div', { className: 'modal-overlay', onClick: (e) => { if (e.target === overlay) overlay.remove(); }});
  const modal = el('div', { className: 'modal glass-card' });
  
  modal.appendChild(el('h2', { textContent: 'Add Project to Timesheet' }));
  
  // Find projects the user is assigned to
  const userProjects = Object.values(state.projects).filter(p => p.team.some(m => String(m.risorsaId) === String(currentUserId)));
  
  if (userProjects.length === 0) {
    modal.appendChild(el('p', { textContent: 'You are not assigned to any projects.' }));
  } else {
    const list = el('div', { className: 'project-list' });
    
    // Sort by client name
    userProjects.sort((a,b) => (a.cliente || '').localeCompare(b.cliente || ''));
    
    userProjects.forEach(p => {
      const isAdded = state.getTimesheetSettings(currentUserId).projects.includes(p.id);
      
      const item = el('div', { className: `project-list-item ${isAdded ? 'added' : ''}`, onClick: () => {
        if (!isAdded) {
          const settings = state.getTimesheetSettings(currentUserId);
          if (!settings.projects.includes(p.id)) {
            settings.projects.push(p.id);
            state.saveTimesheetSettings(currentUserId, settings);
            overlay.remove();
            refreshTimesheet();
          }
        }
      }}, [
        el('div', { className: 'info' }, [
          el('strong', { textContent: p.cliente || 'No Client' }),
          el('span', { textContent: p.nome })
        ]),
        el('i', { className: isAdded ? 'ph ph-check text-success' : 'ph ph-plus text-primary' })
      ]);
      list.appendChild(item);
    });
    modal.appendChild(list);
  }
  
  modal.appendChild(el('div', { className: 'modal-actions mt-lg' }, [
    el('button', { className: 'btn btn-ghost', textContent: 'Close', onClick: () => overlay.remove() })
  ]));
  
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
}

function calculateWeekTotals() {
  const settings = state.getTimesheetSettings(currentUserId);
  let totalPlanned = 0;
  let totalTracked = 0;
  
  settings.projects.forEach(projId => {
    totalPlanned += getProjectPlannedHours(projId, currentUserId, currentYearWeek);
    
    const timesheetData = state.getTimesheetData(currentUserId, currentYearWeek)[projId] || {};
    Object.values(timesheetData).forEach(day => {
      totalTracked += (day.billable || 0) + (day.nonBillable || 0);
    });
  });
  
  return { totalPlanned, totalTracked };
}

function getProjectPlannedHours(projectId, userId, yearWeek) {
  const proj = state.getProject(projectId);
  if (!proj) return 0;
  const member = proj.team.find(m => String(m.risorsaId) === String(userId));
  if (!member || !member.settimane) return 0;

  if (!proj.dataInizio || !proj.dataFine) return 0;
  
  const projWeeks = getWeeksBetween(proj.dataInizio, proj.dataFine);
  for (const w of projWeeks) {
     if (getYearWeek(w.start) === yearWeek) {
         return (member.settimane[w.label] || 0) * 8; // 8 hours per day
     }
  }
  return 0;
}
