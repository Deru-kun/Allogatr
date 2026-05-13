import { state } from './state.js';
import { el, clear } from './utils.js';

export function renderResources(container) {
  clear(container);

  const wrapper = el('div', { className: 'resources-view' });

  // Header with Search and Add button
  const header = el('div', { className: 'view-header' }, [
    el('h2', { textContent: 'Risorse' }),
    el('div', { className: 'header-actions' }, [
      el('div', { className: 'search-wrapper' }, [
        el('i', { className: 'ph ph-magnifying-glass' }),
        el('input', { 
          type: 'text', 
          placeholder: 'Cerca...', 
          className: 'search-input',
          onInput: (e) => updateTable(e.target.value)
        })
      ]),
      el('button', { 
        className: 'btn btn-primary', 
        onclick: () => {
          state.createResource();
          updateTable();
        }
      }, [
        el('i', { className: 'ph ph-plus' }),
        el('span', { textContent: 'Aggiungi' })
      ])
    ])
  ]);

  const tableContainer = el('div', { className: 'glass-card resources-table-card' });
  wrapper.appendChild(header);
  wrapper.appendChild(tableContainer);
  container.appendChild(wrapper);

  function updateTable(filter = '') {
    clear(tableContainer);
    const query = filter.toLowerCase();
    const resources = state.resources.filter(r => 
      (r.cognome || '').toLowerCase().includes(query) || 
      (r.titolo || '').toLowerCase().includes(query)
    );

    const table = el('table', { className: 'resources-table' }, [
      el('thead', {}, [
        el('tr', {}, [
          el('th', { textContent: 'Cognome' }),
          el('th', { textContent: 'Ruolo' }),
          el('th', { textContent: 'Tipologia' }),
          el('th', { textContent: 'Costo €/gg' }),
          el('th', { textContent: 'Rate €/gg' }),
          el('th', { textContent: 'gg/sett' }),
          el('th', { textContent: 'Disp.' }),
          el('th', { textContent: '' })
        ])
      ])
    ]);

    const tbody = el('tbody');
    resources.forEach(res => {
      const row = el('tr', {}, [
        el('td', {}, [
          el('input', { 
            type: 'text', 
            value: res.cognome, 
            className: 'table-input',
            onchange: (e) => state.updateResource(res.id, { cognome: e.target.value })
          })
        ]),
        el('td', {}, [
          el('input', { 
            type: 'text', 
            value: res.titolo, 
            className: 'table-input',
            onchange: (e) => state.updateResource(res.id, { titolo: e.target.value })
          })
        ]),
        el('td', {}, [
          el('select', { 
            className: 'table-select',
            onchange: (e) => state.updateResource(res.id, { tipologia: e.target.value })
          }, [
            el('option', { value: 'Dipendente', textContent: 'Dipendente', selected: res.tipologia === 'Dipendente' }),
            el('option', { value: 'Consulente', textContent: 'Consulente', selected: res.tipologia === 'Consulente' })
          ])
        ]),
        el('td', {}, [
          el('input', { 
            type: 'number', 
            value: res.costoGg, 
            className: 'table-input text-right',
            onchange: (e) => state.updateResource(res.id, { costoGg: Number(e.target.value) })
          })
        ]),
        el('td', {}, [
          el('input', { 
            type: 'number', 
            value: res.rateGg, 
            className: 'table-input text-right',
            onchange: (e) => state.updateResource(res.id, { rateGg: Number(e.target.value) })
          })
        ]),
        el('td', {}, [
          el('input', { 
            type: 'number', 
            value: res.giorniSett, 
            step: '0.5',
            className: 'table-input text-center',
            onchange: (e) => state.updateResource(res.id, { giorniSett: Number(e.target.value) })
          })
        ]),
        el('td', { className: 'text-center' }, [
          el('input', { 
            type: 'checkbox', 
            checked: res.disponibile,
            onchange: (e) => state.updateResource(res.id, { disponibile: e.target.checked })
          })
        ]),
        el('td', { className: 'text-right' }, [
          el('button', { 
            className: 'btn-icon text-danger',
            onclick: () => {
              if (confirm('Sicuro di voler eliminare questa risorsa?')) {
                state.deleteResource(res.id);
                updateTable(filter);
              }
            }
          }, [ el('i', { className: 'ph ph-trash' }) ])
        ])
      ]);
      tbody.appendChild(row);
    });

    table.appendChild(tbody);
    tableContainer.appendChild(table);
  }

  updateTable();
}
