import { el } from './utils.js';
import { state } from './state.js';
import { checkAuth } from './main.js';

export function renderUsers(container) {
  container.innerHTML = '';

  const auth = checkAuth();
  const dbUser = auth ? state.getUser(auth.user) : null;

  if (!dbUser || dbUser.role !== 'admin') {
    container.appendChild(el('div', { className: 'error-state' }, [
      el('h3', { textContent: 'Accesso Negato' }),
      el('p', { textContent: 'Non hai i permessi per visualizzare questa pagina.' })
    ]));
    return;
  }

  const header = el('div', { className: 'dashboard-header' }, [
    el('h2', { textContent: 'Gestione Utenti' }),
    el('p', { textContent: 'Gestisci i ruoli e gli accessi al sistema.', className: 'text-secondary' })
  ]);

  const table = el('table', { className: 'data-grid' }, [
    el('thead', {}, [
      el('tr', {}, [
        el('th', { textContent: 'Utente' }),
        el('th', { textContent: 'Username' }),
        el('th', { textContent: 'Ruolo' }),
        el('th', { textContent: 'Azioni' })
      ])
    ]),
    el('tbody', { id: 'users-tbody' })
  ]);

  const card = el('div', { className: 'card' }, [ table ]);

  container.appendChild(header);
  container.appendChild(card);

  renderUsersTable();
}

function renderUsersTable() {
  const tbody = document.getElementById('users-tbody');
  if (!tbody) return;
  tbody.innerHTML = '';

  const currentUser = checkAuth();
  const currentUsername = currentUser?.user;

  state.users.forEach(u => {
    const isSelf = currentUsername === u.username;
    
    const roleSelect = el('select', { 
      className: 'role-select', 
      disabled: isSelf // Can't change own role
    }, [
      el('option', { value: 'consultant', textContent: 'Consultant' }),
      el('option', { value: 'admin', textContent: 'Amministratore' })
    ]);
    
    roleSelect.value = u.role || 'consultant';
    
    roleSelect.addEventListener('change', (e) => {
      const newRole = e.target.value;
      if (confirm(`Sei sicuro di voler cambiare il ruolo di ${u.name} ${u.surname} in ${newRole}?`)) {
        state.updateUser(u.username, { role: newRole });
        // Optional: show a small toast or just alert
      } else {
        // Revert selection if cancelled
        e.target.value = u.role || 'consultant';
      }
    });

    const tr = el('tr', {}, [
      el('td', { textContent: `${u.name} ${u.surname}`, className: 'fw-500' }),
      el('td', { textContent: u.username }),
      el('td', {}, [ roleSelect ]),
      el('td', {}, [
        isSelf ? el('span', { className: 'badge badge-info', textContent: 'Tu' }) : ''
      ])
    ]);
    
    tbody.appendChild(tr);
  });
}
