import { state } from './state.js';
import { el, clear, fmtCurrency, showToast, confirmDialog } from './utils.js';
import { PROJECT_TEMPLATES } from './data.js';

export function renderProjects(container) {
  clear(container);
  let projects = state.listProjects();
  const query = state.getSearchQuery();
  
  if (query) {
    projects = projects.filter(p => 
      (p.nome || '').toLowerCase().includes(query) || 
      (p.cliente || '').toLowerCase().includes(query)
    );
  }
  const wrapper = el('div', { className: 'projects-view' });

  const header = el('div', { className: 'projects-header' }, [
    el('div', { className: 'header-actions' }, [
      el('button', { className: 'btn btn-secondary', innerHTML: '<i class="ph ph-download-simple"></i> Importa', onClick: importProjects }),
      el('button', { className: 'btn btn-secondary', innerHTML: '<i class="ph ph-upload-simple"></i> Esporta', onClick: exportProjects }),
      el('button', { className: 'btn btn-secondary', innerHTML: '<i class="ph ph-copy"></i> Template', onClick: showTemplateModal }),
      el('button', { className: 'btn btn-primary', innerHTML: '<i class="ph ph-plus"></i> Nuovo Progetto', onClick: () => {
        const id = state.createProject();
        window.location.hash = `#/project/${id}`;
      }}),
    ]),
  ]);
  wrapper.appendChild(header);

  if (projects.length === 0) {
    wrapper.appendChild(el('div', { className: 'empty-state' }, [
      el('div', { className: 'empty-icon', innerHTML: '<i class="ph-fill ph-folder-open"></i>' }),
      el('h2', { textContent: 'Nessun progetto' }),
      el('p', { textContent: 'Crea il tuo primo progetto per iniziare.' }),
      el('button', { className: 'btn btn-primary btn-lg', innerHTML: '<i class="ph ph-plus"></i> Crea Progetto', onClick: () => {
        const id = state.createProject();
        window.location.hash = `#/project/${id}`;
      }}),
    ]));
  } else {
    const grid = el('div', { className: 'projects-grid' });
    projects.forEach(proj => grid.appendChild(makeCard(proj)));
    wrapper.appendChild(grid);
  }
  container.appendChild(wrapper);
}

function calcProjectStats(proj) {
  let totalDays = 0, totalRev = 0, totalCost = 0;
  for (const m of proj.team) {
    const d = Object.values(m.settimane || {}).reduce((s, v) => s + (Number(v) || 0), 0);
    totalDays += d;
    totalRev += d * (m.rateAccordato || 0);
    totalCost += d * (m.costoStandard || 0);
  }
  const margin = totalRev > 0 ? ((totalRev - totalCost) / totalRev * 100) : 0;
  return { totalDays, totalRev, totalCost, margin };
}

function makeCard(proj) {
  const { totalDays, totalRev, margin } = calcProjectStats(proj);
  return el('div', { className: 'project-card', onClick: (e) => {
    if (e.target.closest('.card-actions')) return;
    window.location.hash = `#/project/${proj.id}`;
  }}, [
    el('div', { className: 'card-header' }, [
      el('span', { className: `card-badge badge-${proj.tipologia === 'Fixed Fee' ? 'fixed' : 'tm'}`, textContent: proj.tipologia || 'N/D' }),
      el('div', { className: 'card-actions' }, [
        el('button', { className: 'btn-icon', title: 'Duplica', innerHTML: '<i class="ph ph-copy"></i>', onClick: () => {
          state.duplicateProject(proj.id);
          renderProjects(document.getElementById('app-content'));
        }}),
        el('button', { className: 'btn-icon btn-danger', title: 'Elimina', innerHTML: '<i class="ph ph-trash"></i>', onClick: () => {
          confirmDialog(`Eliminare "${proj.nome}"?`, () => {
            state.deleteProject(proj.id);
            renderProjects(document.getElementById('app-content'));
            showToast('Progetto eliminato', 'success');
          });
        }}),
      ]),
    ]),
    el('h3', { className: 'card-title', textContent: proj.nome || 'Senza nome' }),
    el('p', { className: 'card-client', textContent: proj.cliente || 'Nessun cliente' }),
    el('div', { className: 'card-meta' }, [
      el('span', { innerHTML: `<i class="ph ph-calendar-blank"></i> ${proj.dataInizio ? `${proj.dataInizio} → ${proj.dataFine || '...'}` : 'Date non impostate'}` }),
    ]),
    el('div', { className: 'card-stats' }, [
      stat(String(proj.team.length), 'Risorse'),
      stat(totalDays.toFixed(1), 'Giorni'),
      stat(fmtCurrency(totalRev), 'Ricavo'),
      stat(margin.toFixed(1) + '%', 'Margine', margin >= 30 ? 'text-green' : margin >= 15 ? 'text-yellow' : 'text-red'),
    ]),
  ]);
}

function stat(value, label, cls = '') {
  return el('div', { className: 'stat' }, [
    el('span', { className: `stat-value ${cls}`, textContent: value }),
    el('span', { className: 'stat-label', textContent: label }),
  ]);
}

function exportProjects() {
  const blob = new Blob([state.exportJSON()], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `allogatr_${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  showToast('Progetti esportati con successo', 'success');
}

function importProjects() {
  const input = document.createElement('input');
  input.type = 'file'; input.accept = '.json';
  input.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (state.importJSON(ev.target.result)) {
        renderProjects(document.getElementById('app-content'));
        showToast('Progetti importati con successo', 'success');
      } else {
        showToast('File JSON non valido', 'error');
      }
    };
    reader.readAsText(file);
  };
  input.click();
}

function showTemplateModal() {
  const overlay = el('div', { className: 'modal-overlay' });
  const modal = el('div', { className: 'modal glass-card' }, [
    el('div', { className: 'modal-header' }, [
      el('h2', { textContent: 'Crea da Template' }),
      el('button', { className: 'btn-icon', innerHTML: '<i class="ph ph-x"></i>', onClick: () => overlay.remove() })
    ])
  ]);

  const templateList = el('div', { className: 'template-list' });
  
  PROJECT_TEMPLATES.forEach(template => {
    const item = el('div', { className: 'template-item' }, [
      el('h3', { textContent: template.name }),
      el('p', { textContent: template.description }),
      el('button', { className: 'btn btn-primary btn-sm', innerHTML: '<i class="ph ph-plus"></i> Usa', onClick: () => {
        overlay.remove();
        const id = state.createProjectFromTemplate(template.id);
        window.location.hash = `#/project/${id}`;
      }})
    ]);
    templateList.appendChild(item);
  });

  modal.appendChild(templateList);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
}
