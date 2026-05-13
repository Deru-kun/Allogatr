import { state } from './state.js';
import { ROLES, PROJECT_TEMPLATES } from './data.js';
import { el, clear, fmtDays, getYearWeek, DataAggregator } from './utils.js';

export function renderDashboard(container) {
  clear(container);

  const wrapper = el('div', { className: 'dashboard-view' });
  
  // Dashboard Header
  const header = el('div', { className: 'dashboard-header' }, [
    el('h1', { textContent: 'Dashboard Allocazioni' }),
    el('p', { className: 'text-muted', textContent: 'Panoramica del carico di lavoro e distribuzione risorse.' })
  ]);
  wrapper.appendChild(header);

  // Portfolio Health Alerts (New)
  try { renderHealthSection(wrapper); } catch (e) { console.error('Health Section Error:', e); }

  // Heatmap Section
  try { renderHeatmap(wrapper); } catch (e) { console.error('Heatmap Error:', e); }

  // Charts Container (Resources)
  const chartsContainer = el('div', { className: 'dashboard-charts' });
  
  // Role Chart
  const chartCard = el('div', { className: 'glass-card chart-card' }, [
    el('h3', { textContent: 'Allocazione per Ruolo' }),
    el('div', { className: 'chart-wrapper' }, [
      el('canvas', { id: 'roleChart' })
    ])
  ]);

  // Capacity Chart
  const capacityCard = el('div', { className: 'glass-card chart-card' }, [
    el('h3', { textContent: 'Capacità vs Allocato (Media)' }),
    el('div', { className: 'chart-wrapper' }, [
      el('canvas', { id: 'capacityChart' })
    ])
  ]);

  // Team Distribution Chart
  const teamChartCard = el('div', { className: 'glass-card chart-card' }, [
    el('h3', { textContent: 'Allocazione per Team (Ecom, P&SD, CRM)' }),
    el('div', { className: 'chart-wrapper' }, [
      el('canvas', { id: 'teamChart' })
    ])
  ]);

  chartsContainer.appendChild(chartCard);
  chartsContainer.appendChild(capacityCard);
  chartsContainer.appendChild(teamChartCard);
  wrapper.appendChild(chartsContainer);

  // Financial Intelligence Section
  try { renderFinancialSection(wrapper); } catch (e) { console.error('Financial Section Error:', e); }

  // Portfolio Roadmap Section (New)
  try { renderRoadmapSection(wrapper); } catch (e) { console.error('Roadmap Error:', e); }

  // Bench List Section
  try { renderBenchList(wrapper); } catch (e) { console.error('Bench List Error:', e); }

  // Filters Container
  const filtersContainer = el('div', { className: 'dashboard-filters' }, [
    el('div', { style: 'flex: 1; display: flex; gap: 1rem; align-items: center;' }, [
      el('div', { className: 'search-wrapper', style: 'position: relative; flex: 1;' }, [
        el('i', { className: 'ph ph-magnifying-glass', style: 'position: absolute; left: 1rem; top: 50%; transform: translateY(-50%); color: var(--text-muted);' }),
        el('input', { type: 'text', placeholder: 'Cerca per nome...', className: 'filter-input', style: 'padding-left: 2.75rem; width: 100%;' })
      ]),
      el('select', { className: 'filter-select', id: 'roleFilter' }, [
        el('option', { value: '', textContent: 'Tutti i ruoli' })
      ]),
      el('select', { className: 'filter-select', id: 'teamFilter' }, [
        el('option', { value: '', textContent: 'Tutti i team' }),
        el('option', { value: 'Ecom', textContent: 'Ecom' }),
        el('option', { value: 'P&SD', textContent: 'P&SD' }),
        el('option', { value: 'CRM', textContent: 'CRM' }),
        el('option', { value: 'Other', textContent: 'Altro' })
      ])
    ]),
    el('div', { className: 'view-toggle-group' }, [
      el('button', { className: 'view-btn active', id: 'btnViewCard', title: 'Vista Card' }, [
        el('i', { className: 'ph-fill ph-squares-four' }),
        el('span', { textContent: 'Card' })
      ]),
      el('button', { className: 'view-btn', id: 'btnViewTable', title: 'Vista Tabella' }, [
        el('i', { className: 'ph ph-table' }),
        el('span', { textContent: 'Tabella' })
      ])
    ])
  ]);

  // Populate roles
  const roles = new Set(state.resources.filter(m => m.id !== 36).map(m => m.titolo).filter(Boolean));
  const roleSelectElem = filtersContainer.querySelector('#roleFilter');
  Array.from(roles).sort().forEach(r => {
    roleSelectElem.appendChild(el('option', { value: r, textContent: r }));
  });
  
  wrapper.appendChild(filtersContainer);

  const searchInput = filtersContainer.querySelector('.filter-input');
  const roleSelect = filtersContainer.querySelector('#roleFilter');
  const teamSelect = filtersContainer.querySelector('#teamFilter');
  const btnViewCard = filtersContainer.querySelector('#btnViewCard');
  const btnViewTable = filtersContainer.querySelector('#btnViewTable');

  let currentViewMode = 'card'; // 'card' or 'table'

  const gridContainer = el('div');
  wrapper.appendChild(gridContainer);

  let roleData = {};
  let teamAllocData = { 'Ecom': 0, 'P&SD': 0, 'CRM': 0, 'Other': 0 };
  let totalAllocatedDays = 0;

  function updateGrid() {
    clear(gridContainer);
    const searchTerm = searchInput.value.toLowerCase();
    const roleFilter = roleSelect.value;
    const teamFilter = teamSelect.value;

    const filteredMembers = state.resources.filter(member => {
      if (member.id === 36) return false;
      const allocation = state.getAllocationForMember(member.id);
      if (allocation.length === 0) return false;
      
      const fullName = (member.cognome || '').toLowerCase();
      if (searchTerm && !fullName.includes(searchTerm)) return false;
      if (roleFilter && member.titolo !== roleFilter) return false;
      if (teamFilter && member.team !== teamFilter) return false;
      
      return true;
    });

    if (filteredMembers.length === 0) {
      gridContainer.appendChild(el('div', { className: 'empty-state' }, [
        el('div', { className: 'empty-icon', innerHTML: '<i class="ph-fill ph-users"></i>' }),
        el('h2', { textContent: 'Nessun risultato' }),
        el('p', { textContent: 'Nessun membro corrisponde ai filtri selezionati.' }),
      ]));
    } else {
      gridContainer.appendChild(el('h2', { className: 'dashboard-section-title', textContent: 'Dettaglio Risorse' }));
      
      if (currentViewMode === 'table') {
        gridContainer.appendChild(renderResourceTable(filteredMembers));
      } else {
        const grid = el('div', { className: 'dashboard-grid' });
        filteredMembers.forEach(member => {
          const allocation = state.getAllocationForMember(member.id);
          grid.appendChild(renderMemberAllocation(member, allocation));
        });
        gridContainer.appendChild(grid);
      }
    }
  }

  btnViewCard.onclick = () => {
    currentViewMode = 'card';
    btnViewCard.classList.add('active');
    btnViewTable.classList.remove('active');
    updateGrid();
  };

  btnViewTable.onclick = () => {
    currentViewMode = 'table';
    btnViewTable.classList.add('active');
    btnViewCard.classList.remove('active');
    updateGrid();
  };

  // Pre-calculate chart data once
  for (const member of state.resources) {
    if (member.id === 36) continue;
    const allocation = state.getAllocationForMember(member.id);
    if (allocation.length === 0) continue;
    
    let memberDays = 0;
    for (const a of allocation) {
      memberDays += Object.values(a.settimane || {}).reduce((s, v) => s + (Number(v) || 0), 0);
    }
    if (memberDays > 0) {
      const role = member.titolo || 'Altro';
      roleData[role] = (roleData[role] || 0) + memberDays;
      
      const team = member.team || 'Other';
      teamAllocData[team] = (teamAllocData[team] || 0) + memberDays;
      
      totalAllocatedDays += memberDays;
    }
  }

  searchInput.addEventListener('input', updateGrid);
  roleSelect.addEventListener('change', updateGrid);
  teamSelect.addEventListener('change', updateGrid);

  updateGrid(); // Initial render

  container.appendChild(wrapper);

  // Render Charts if data exists
  if (totalAllocatedDays > 0) {
    requestAnimationFrame(() => {
      // Role Chart (Doughnut)
      const ctxRole = document.getElementById('roleChart');
      if (ctxRole) {
        new Chart(ctxRole, {
          type: 'doughnut',
          data: {
            labels: Object.keys(roleData),
            datasets: [{
              data: Object.values(roleData),
              backgroundColor: ['#8dec6a', '#333333', '#666666', '#cccccc', '#aaff88'],
              borderWidth: 0,
              hoverOffset: 4
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { position: 'right', labels: { color: '#333', font: { family: 'Inter', size: 12 } } }
            },
            cutout: '70%'
          }
        });
      }

      // Capacity Chart (Bar)
      const ctxCap = document.getElementById('capacityChart');
      const capacityData = state.getRoleCapacity();
      if (ctxCap) {
        new Chart(ctxCap, {
          type: 'bar',
          data: {
            labels: Object.keys(capacityData),
            datasets: [
              {
                label: 'Capacità Totale',
                data: Object.values(capacityData).map(v => v.total),
                backgroundColor: '#eee',
                borderRadius: 4,
              },
              {
                label: 'Allocato',
                data: Object.values(capacityData).map(v => v.allocated),
                backgroundColor: '#8dec6a',
                borderRadius: 4,
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              x: { stacked: true, grid: { display: false } },
              y: { stacked: false, beginAtZero: true }
            },
            plugins: {
              legend: { position: 'bottom', labels: { boxWidth: 12, font: { family: 'Inter', size: 11 } } }
            }
          }
        });
      }

      // Team Chart (Doughnut) - New
      const ctxTeam = document.getElementById('teamChart');
      if (ctxTeam) {
        new Chart(ctxTeam, {
          type: 'doughnut',
          data: {
            labels: Object.keys(teamAllocData),
            datasets: [{
              data: Object.values(teamAllocData),
              backgroundColor: ['#0369a1', '#991b1b', '#166534', '#666666'],
              borderWidth: 0,
              hoverOffset: 4
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { position: 'right', labels: { boxWidth: 12, font: { family: 'Inter', size: 11 } } }
            },
            cutout: '70%'
          }
        });
      }

      // Margin Matrix (Scatter)
      const ctxMargin = document.getElementById('marginMatrix');
      const financialData = DataAggregator.getProjectFinancials(state.projects);
      if (ctxMargin && financialData.length > 0) {
        new Chart(ctxMargin, {
          type: 'scatter',
          data: {
            datasets: [{
              label: 'Progetti',
              data: financialData.map(p => ({
                x: p.totalRev,
                y: p.marginPct,
                r: Math.max(5, Math.min(20, p.totalDays / 5)) // Bubble size based on effort
              })),
              backgroundColor: financialData.map(p => p.marginPct >= 25 ? '#8dec6a' : p.marginPct >= 10 ? '#ffd666' : '#ff4d4f'),
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              x: { title: { display: true, text: 'Ricavo Totale (€)' } },
              y: { title: { display: true, text: 'Margine Finale (%)' }, beginAtZero: true }
            },
            plugins: {
              tooltip: {
                callbacks: {
                  label: (ctx) => {
                    const p = financialData[ctx.dataIndex];
                    return `${p.name}: €${p.totalRev.toLocaleString()} | ${p.marginPct.toFixed(1)}%`;
                  }
                }
              }
            }
          }
        });
      }

      // Revenue Forecast (Bar)
      const ctxRev = document.getElementById('revenueForecast');
      const forecastData = DataAggregator.getMonthlyRevenueForecast(state.projects);
      if (ctxRev && Object.keys(forecastData).length > 0) {
        new Chart(ctxRev, {
          type: 'bar',
          data: {
            labels: Object.keys(forecastData),
            datasets: [{
              label: 'Revenue Previsionale (€)',
              data: Object.values(forecastData),
              backgroundColor: '#333',
              borderRadius: 4
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true } }
          }
        });
      }

      // Cost Breakdown (Doughnut)
      const ctxCosts = document.getElementById('costsChart');
      const costData = DataAggregator.getPortfolioCostsBreakdown(state.projects);
      if (ctxCosts) {
        new Chart(ctxCosts, {
          type: 'doughnut',
          data: {
            labels: ['Team Interno', 'Costi Esterni/Licenze', 'BD Fees'],
            datasets: [{
              data: [costData.internal, costData.external, costData.bdFees],
              backgroundColor: ['#333', '#888', '#8dec6a'],
              borderWidth: 0
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { position: 'right', labels: { boxWidth: 12, font: { family: 'Inter', size: 11 } } }
            },
            cutout: '70%'
          }
        });
      }
    });
  } else {
    chartsContainer.style.display = 'none'; // hide chart area if no data
  }
}

function renderMemberAllocation(member, allocation) {
  const card = el('div', { className: 'allocation-card glass-card' });

  const header = el('div', { className: 'allocation-header' }, [
    el('div', { className: 'member-info' }, [
      el('h3', { textContent: member.cognome }),
      el('span', { className: 'member-role', textContent: member.titolo }),
    ]),
    el('div', { className: 'member-capacity' }, [
      el('span', { className: 'capacity-label', textContent: 'Capacity:' }),
      el('span', { className: 'capacity-value', textContent: `${member.giorniSett}gg / sett.` }),
    ]),
  ]);
  card.appendChild(header);

  const list = el('div', { className: 'allocation-list' });

  let totalDays = 0;
  for (const a of allocation) {
    const projDays = Object.values(a.settimane || {}).reduce((s, v) => s + (Number(v) || 0), 0);
    totalDays += projDays;

    const item = el('div', { className: 'allocation-item', onClick: () => { window.location.hash = `#/project/${a.projectId}`; } }, [
      el('div', { className: 'proj-info' }, [
        el('strong', { className: 'proj-name', textContent: a.projectName }),
        el('span', { className: 'proj-client', textContent: a.cliente || 'No client' }),
      ]),
      el('div', { className: 'proj-role', textContent: a.ruolo }),
      el('div', { className: 'proj-days' }, [
        el('strong', { textContent: fmtDays(projDays) }),
        el('span', { textContent: ' gg' }),
      ]),
    ]);
    list.appendChild(item);
  }

  card.appendChild(list);

  const footer = el('div', { className: 'allocation-footer' }, [
    el('span', { textContent: 'Totale Giorni:' }),
    el('strong', { textContent: fmtDays(totalDays) }),
  ]);
  card.appendChild(footer);

  return card;
}

function renderHeatmap(container) {
  const workload = state.getGlobalWorkload();
  const weeks = [];
  const now = new Date();
  
  // Align to current week's Monday
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const currentMonday = new Date(now);
  currentMonday.setDate(currentMonday.getDate() + diff);

  for (let i = 0; i < 12; i++) {
    const d = new Date(currentMonday);
    d.setDate(d.getDate() + i * 7);
    weeks.push({
      key: getYearWeek(d),
      label: i === 0 ? 'Oggi' : `+${i}s`,
      fullDate: d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })
    });
  }

  const section = el('div', { className: 'heatmap-section glass-card' }, [
    el('div', { className: 'section-header' }, [
      el('h3', { textContent: 'Resource Heatmap (Next 12 Weeks)' }),
      el('div', { className: 'heatmap-legend' }, [
        el('div', { className: 'legend-item' }, [el('div', { className: 'heat-box heat-empty' }), el('span', { textContent: '0%' })]),
        el('div', { className: 'legend-item' }, [el('div', { className: 'heat-box heat-low' }), el('span', { textContent: '<40%' })]),
        el('div', { className: 'legend-item' }, [el('div', { className: 'heat-box heat-med' }), el('span', { textContent: '40-80%' })]),
        el('div', { className: 'legend-item' }, [el('div', { className: 'heat-box heat-high' }), el('span', { textContent: '80-100%' })]),
        el('div', { className: 'legend-item' }, [el('div', { className: 'heat-box heat-over' }), el('span', { textContent: '>100%' })]),
      ])
    ])
  ]);

  const tableWrapper = el('div', { className: 'heatmap-table-wrapper' });
  const table = el('table', { className: 'heatmap-table' });
  
  const thead = el('thead');
  const headerRow = el('tr', {}, [
    el('th', { textContent: 'Risorsa' }),
    ...weeks.map(w => el('th', { innerHTML: `${w.label}<br><small>${w.fullDate}</small>` }))
  ]);
  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  
  // Sort members by cognitive load/relevance or just cognome
  state.resources.slice().sort((a,b) => a.cognome.localeCompare(b.cognome)).forEach(member => {
    if (member.id === 36) return;
    const resWorkload = workload[member.id] || {};
    const hasAnyWork = Object.values(resWorkload).some(v => v > 0);
    if (!hasAnyWork) return;

    const row = el('tr', {}, [
      el('td', { className: 'member-name-cell' }, [
        el('strong', { textContent: member.cognome }),
        el('small', { textContent: member.titolo })
      ])
    ]);

    weeks.forEach(w => {
      const pct = resWorkload[w.key] || 0;
      let cls = 'heat-empty';
      if (pct >= 1.05) cls = 'heat-over';
      else if (pct >= 0.8) cls = 'heat-high';
      else if (pct >= 0.4) cls = 'heat-med';
      else if (pct > 0) cls = 'heat-low';

      row.appendChild(el('td', { 
        className: `heat-cell ${cls}`, 
        title: `${member.cognome}: ${Math.round(pct * 100)}% allocato nella settimana ${w.key}` 
      }));
    });
    tbody.appendChild(row);
  });

  table.appendChild(tbody);
  tableWrapper.appendChild(table);
  section.appendChild(tableWrapper);
  container.appendChild(section);
}

function renderBenchList(container) {
  const workload = state.getGlobalWorkload();
  const now = new Date();
  const weeks = [];
  for (let i = 0; i < 4; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() + i * 7);
    weeks.push(getYearWeek(d));
  }

  const benchMembers = state.resources.filter(m => {
    if (m.id === 36) return false;
    const resWorkload = workload[m.id] || {};
    // Calculate average allocation in next 4 weeks
    const avg = weeks.reduce((sum, w) => sum + (resWorkload[w] || 0), 0) / 4;
    return avg < 0.5; // Bench if < 50% allocated on average
  }).sort((a,b) => {
    const aw = workload[a.id] || {};
    const bw = workload[b.id] || {};
    const avgA = weeks.reduce((sum, w) => sum + (aw[w] || 0), 0) / 4;
    const avgB = weeks.reduce((sum, w) => sum + (bw[w] || 0), 0) / 4;
    return avgA - avgB; // Most free first
  });

  if (benchMembers.length === 0) return;

  const section = el('div', { className: 'bench-section glass-card' }, [
    el('div', { className: 'section-header' }, [
      el('h3', { textContent: 'Bench & Availability (Next 4 Weeks)' }),
      el('span', { className: 'badge badge-info', textContent: `${benchMembers.length} risorse libere` })
    ]),
    el('div', { className: 'bench-grid' })
  ]);

  const grid = section.querySelector('.bench-grid');

  benchMembers.forEach(m => {
    const resWorkload = workload[m.id] || {};
    const avg = weeks.reduce((sum, w) => sum + (resWorkload[w] || 0), 0) / 4;
    const freePct = Math.round((1 - avg) * 100);

    const item = el('div', { className: 'bench-item' }, [
      el('div', { className: 'bench-avatar', textContent: m.cognome[0] }),
      el('div', { className: 'bench-info' }, [
        el('strong', { textContent: m.cognome }),
        el('small', { textContent: m.titolo || 'Altro' })
      ]),
      el('div', { className: 'bench-availability' }, [
        el('div', { className: 'progress-mini' }, [
          el('div', { className: 'progress-fill', style: `width: ${freePct}%` })
        ]),
        el('span', { textContent: `${freePct}% disponibile` })
      ])
    ]);
    grid.appendChild(item);
  });

  container.appendChild(section);
}

function renderFinancialSection(container) {
  const financialSection = el('div', { className: 'dashboard-charts financial-intelligence' });
  
  const marginCard = el('div', { className: 'glass-card chart-card' }, [
    el('h3', { textContent: 'Project Margin Matrix' }),
    el('div', { className: 'chart-wrapper' }, [
      el('canvas', { id: 'marginMatrix' })
    ])
  ]);

  const revenueCard = el('div', { className: 'glass-card chart-card' }, [
    el('h3', { textContent: 'Revenue Forecast (Mensile)' }),
    el('div', { className: 'chart-wrapper' }, [
      el('canvas', { id: 'revenueForecast' })
    ])
  ]);

  const costsCard = el('div', { className: 'glass-card chart-card' }, [
    el('h3', { textContent: 'Portfolio Cost Breakdown' }),
    el('div', { className: 'chart-wrapper' }, [
      el('canvas', { id: 'costsChart' })
    ])
  ]);

  financialSection.append(marginCard, revenueCard, costsCard);
  container.appendChild(financialSection);
}

function renderRoadmapSection(container) {
  const projects = Object.values(state.projects).filter(p => p.dataInizio && p.dataFine);
  if (projects.length === 0) return;

  const validStarts = projects
    .map(p => new Date(p.dataInizio))
    .filter(d => !isNaN(d.getTime()));
    
  if (validStarts.length === 0) return;
  const minDate = new Date(Math.min(...validStarts));
  minDate.setDate(1); // Start of month

  const months = [];
  for (let i = 0; i < 6; i++) {
    const d = new Date(minDate);
    d.setMonth(d.getMonth() + i);
    months.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: d.toLocaleDateString('it-IT', { month: 'short', year: '2-digit' })
    });
  }

  const section = el('div', { className: 'roadmap-section glass-card' }, [
    el('h3', { textContent: 'Portfolio Roadmap (Macro Gantt)' }),
    el('div', { className: 'roadmap-timeline' }, [
      el('div', { className: 'timeline-header' }, [
        el('div', { className: 'project-name-col', textContent: 'Progetto' }),
        ...months.map(m => el('div', { className: 'month-col', textContent: m.label }))
      ]),
      el('div', { className: 'timeline-body' })
    ])
  ]);

  const body = section.querySelector('.timeline-body');

  projects.sort((a,b) => new Date(a.dataInizio) - new Date(b.dataInizio)).forEach(proj => {
    const start = new Date(proj.dataInizio);
    const end = new Date(proj.dataFine);
    
    const row = el('div', { className: 'timeline-row', onClick: () => { window.location.hash = `#/project/${proj.id}`; } }, [
      el('div', { className: 'project-name-col', textContent: proj.nome }),
      el('div', { className: 'track-col' }, [
        el('div', { className: 'gantt-bar', style: calculateGanttStyle(start, end, minDate, months.length) }, [
           el('span', { className: 'bar-label', textContent: `${proj.nome}` })
        ])
      ])
    ]);
    body.appendChild(row);
  });

  container.appendChild(section);
}

function calculateGanttStyle(start, end, minDate, monthsCount) {
  const totalDays = monthsCount * 30.44; // Approximation
  const startDiff = (start - minDate) / (1000 * 60 * 60 * 24);
  const duration = (end - start) / (1000 * 60 * 60 * 24);
  
  const left = Math.max(0, (startDiff / totalDays) * 100);
  const width = Math.min(100 - left, (duration / totalDays) * 100);
  
  return `left: ${left}%; width: ${width}%;`;
}

function renderHealthSection(container) {
  const workload = state.getGlobalWorkload();
  const health = DataAggregator.getPortfolioHealthOverview(state.projects, workload);
  
  if (health.atRisk.length === 0 && health.bottlenecks.length === 0) return;

  const section = el('div', { className: 'health-section' });
  
  // High Level Stats
  const statsRow = el('div', { className: 'health-stats-row' }, [
    el('div', { className: 'health-stat-card' }, [
      el('span', { className: 'stat-label', textContent: 'Avg Portfolio Margin' }),
      el('span', { className: 'stat-value', textContent: `${health.stats.avgMargin.toFixed(1)}%` }),
      el('div', { className: 'stat-indicator', style: `background: ${health.stats.avgMargin < 20 ? '#ff4d4f' : '#8dec6a'}` })
    ])
  ]);
  section.appendChild(statsRow);

  // Alerts
  const alertsContainer = el('div', { className: 'health-alerts-grid' });
  
  health.atRisk.forEach(risk => {
    alertsContainer.appendChild(el('div', { className: 'alert-card alert-danger' }, [
      el('div', { className: 'alert-icon', innerHTML: '<i class="ph-fill ph-warning-circle"></i>' }),
      el('div', { className: 'alert-content' }, [
        el('strong', { textContent: risk.name }),
        el('p', { textContent: `${risk.reason}: ${risk.value}` })
      ])
    ]));
  });

  health.bottlenecks.forEach(b => {
    const member = state.resources.find(m => m.id == b.memberId);
    if (!member) return;
    alertsContainer.appendChild(el('div', { className: 'alert-card alert-warning' }, [
      el('div', { className: 'alert-icon', innerHTML: '<i class="ph-fill ph-users-three"></i>' }),
      el('div', { className: 'alert-content' }, [
        el('strong', { textContent: member.cognome }),
        el('p', { textContent: `Sovraccarico critico rilevato per ${b.count} settimane.` })
      ])
    ]));
  });

  section.appendChild(alertsContainer);
  container.appendChild(section);
}

function renderResourceTable(members) {
  const table = el('table', { className: 'resource-table' }, [
    el('thead', {}, [
      el('tr', {}, [
        el('th', { textContent: 'Risorsa' }),
        el('th', { textContent: 'Team' }),
        el('th', { textContent: 'Ruolo' }),
        el('th', { textContent: 'Allocazioni Attive' }),
        el('th', { textContent: 'Totale Giorni' }),
        el('th', { textContent: 'Azioni' })
      ])
    ])
  ]);

  const tbody = el('tbody');
  members.forEach(member => {
    const allocation = state.getAllocationForMember(member.id);
    const totalDays = allocation.reduce((sum, a) => sum + Object.values(a.settimane || {}).reduce((s, v) => s + (Number(v) || 0), 0), 0);
    
    const teamClass = `team-${(member.team || 'other').toLowerCase().replace('&', '')}`;
    
    const row = el('tr', {}, [
      el('td', {}, [
        el('div', { style: 'font-weight: 600;' }, [
          el('span', { textContent: member.cognome })
        ])
      ]),
      el('td', {}, [
        el('span', { className: `team-badge ${teamClass}`, textContent: member.team || 'Altro' })
      ]),
      el('td', { textContent: member.titolo || '-' }),
      el('td', {}, [
        el('div', { className: 'alloc-mini-list' }, 
          allocation.map(a => {
            const proj = state.projects.find(p => p.id === a.progettoId);
            const days = Object.values(a.settimane || {}).reduce((s, v) => s + (Number(v) || 0), 0);
            return el('div', { className: 'alloc-mini-item' }, [
              el('span', { className: 'alloc-mini-name', textContent: proj ? proj.nome : 'Progetto' }),
              el('span', { className: 'alloc-mini-days', textContent: `${days}gg` })
            ]);
          })
        )
      ]),
      el('td', { style: 'font-weight: 700;', textContent: `${totalDays}gg` }),
      el('td', {}, [
        el('button', { className: 'btn btn-icon', title: 'Vedi Dettaglio', onclick: () => {
          // Future: open member detail
        }}, [ el('i', { className: 'ph ph-eye' }) ])
      ])
    ]);
    tbody.appendChild(row);
  });

  table.appendChild(tbody);
  return el('div', { className: 'glass-card resource-table-card' }, [
    el('div', { className: 'resource-table-wrapper' }, [table])
  ]);
}
