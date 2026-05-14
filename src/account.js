import { el } from './utils.js';
import { state } from './state.js';
import { checkAuth, startApp } from './main.js';

function logout() {
  localStorage.removeItem('allogatr_auth');
  window.location.hash = '';
  startApp();
}

export function renderAccount(container) {
  container.innerHTML = '';

  const user = checkAuth();
  if (!user) return; // shouldn't happen if properly routed

  // User object from state (to get latest data)
  let userData = state.getUser(user.username);
  if (!userData) userData = user;

  const header = el('div', { className: 'dashboard-header' }, [
    el('h2', { textContent: 'Impostazioni Account' }),
    el('button', { className: 'btn btn-danger', textContent: 'Logout' }, [], {
      click: () => logout()
    })
  ]);

  const profileForm = el('form', { className: 'account-form', id: 'profile-form' }, [
    el('div', { className: 'form-group' }, [
      el('label', { textContent: 'Nome' }),
      el('input', { type: 'text', name: 'name', value: userData.name, required: true })
    ]),
    el('div', { className: 'form-group' }, [
      el('label', { textContent: 'Cognome' }),
      el('input', { type: 'text', name: 'surname', value: userData.surname, required: true })
    ]),
    el('div', { className: 'form-group' }, [
      el('label', { textContent: 'Username / Email' }),
      el('input', { type: 'text', value: userData.username, disabled: true })
    ]),
    el('div', { className: 'form-group' }, [
      el('label', { textContent: 'Ruolo' }),
      el('input', { type: 'text', value: userData.role === 'admin' ? 'Amministratore' : 'Consultant', disabled: true })
    ]),
    el('div', { className: 'form-actions' }, [
      el('button', { type: 'submit', className: 'btn btn-primary', textContent: 'Salva Profilo' })
    ])
  ]);

  profileForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const updates = {
      name: formData.get('name'),
      surname: formData.get('surname')
    };
    state.updateUser(userData.username, updates);
    alert('Profilo aggiornato con successo.');
    // Aggiorna nome in sidebar e altrove se necessario
    const sidebarUsername = document.querySelector('.user-info strong');
    if (sidebarUsername) {
      sidebarUsername.textContent = `${updates.name} ${updates.surname}`;
    }
    const sidebarAvatar = document.querySelector('.user-profile .avatar');
    if (sidebarAvatar) {
      sidebarAvatar.textContent = updates.name.charAt(0).toUpperCase() + updates.surname.charAt(0).toUpperCase();
    }
  });

  const profileSection = el('section', { className: 'account-section card' }, [
    el('h3', { textContent: 'Profilo Personale' }),
    profileForm
  ]);

  // Password Section
  const passwordForm = el('form', { className: 'account-form', id: 'password-form' }, [
    el('div', { className: 'form-group' }, [
      el('label', { textContent: 'Vecchia Password' }),
      el('input', { type: 'password', name: 'oldPassword', required: true })
    ]),
    el('div', { className: 'form-group' }, [
      el('label', { textContent: 'Nuova Password' }),
      el('input', { type: 'password', name: 'newPassword', required: true, minLength: '6' })
    ]),
    el('div', { className: 'form-group' }, [
      el('label', { textContent: 'Conferma Nuova Password' }),
      el('input', { type: 'password', name: 'confirmPassword', required: true, minLength: '6' })
    ]),
    el('div', { className: 'form-actions' }, [
      el('button', { type: 'submit', className: 'btn btn-primary', textContent: 'Aggiorna Password' })
    ])
  ]);

  passwordForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const oldPassword = formData.get('oldPassword');
    const newPassword = formData.get('newPassword');
    const confirmPassword = formData.get('confirmPassword');

    if (newPassword !== confirmPassword) {
      alert('Le nuove password non corrispondono.');
      return;
    }

    try {
      state.updatePassword(userData.username, oldPassword, newPassword);
      alert('Password aggiornata con successo.');
      e.target.reset();
    } catch (err) {
      alert(err.message);
    }
  });

  const passwordSection = el('section', { className: 'account-section card' }, [
    el('h3', { textContent: 'Cambio Password' }),
    passwordForm
  ]);

  const contentDiv = el('div', { className: 'account-content' }, [
    profileSection,
    passwordSection
  ]);

  container.appendChild(header);
  container.appendChild(contentDiv);
}
