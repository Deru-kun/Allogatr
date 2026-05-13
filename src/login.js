import { state } from './state.js';

export function renderLogin(container, onLoginSuccess) {
  container.innerHTML = '';
  
  const loginWrapper = document.createElement('div');
  loginWrapper.className = 'login-wrapper';
  
  const loginCard = document.createElement('div');
  loginCard.className = 'login-card glass-card';
  
  const brand = document.createElement('div');
  brand.className = 'login-brand';
  brand.innerHTML = `
    <img src="/logo.png" alt="Allogatr Logo" class="login-logo">
    <h1>Allogatr</h1>
    <p>Project Budget Estimator</p>
  `;
  
  const form = document.createElement('form');
  form.className = 'login-form';
  
  let isRegisterMode = false;

  const renderForm = () => {
    form.innerHTML = '';

    const createInput = (id, label, type, placeholder) => {
      const group = document.createElement('div');
      group.className = 'field-group';
      group.innerHTML = `
        <label>${label}</label>
        <input type="${type}" id="${id}" required placeholder="${placeholder}">
      `;
      return group;
    };

    if (isRegisterMode) {
      form.appendChild(createInput('login-nome', 'Nome', 'text', 'Mario'));
      form.appendChild(createInput('login-cognome', 'Cognome', 'text', 'Rossi'));
    }
    
    form.appendChild(createInput('login-username', 'Username', 'email', 'nome.cognome@arad.digital'));
    form.appendChild(createInput('login-password', 'Password', 'password', '••••••••'));
    
    const errorMsg = document.createElement('div');
    errorMsg.id = 'login-error-msg';
    errorMsg.className = 'login-error';
    errorMsg.style.display = 'none';
    errorMsg.style.color = 'var(--red)';
    errorMsg.style.fontSize = '0.875rem';
    errorMsg.style.marginBottom = '1rem';
    form.appendChild(errorMsg);
    
    const submitBtn = document.createElement('button');
    submitBtn.type = 'submit';
    submitBtn.className = 'btn btn-primary';
    submitBtn.style.width = '100%';
    submitBtn.style.marginTop = '1rem';
    submitBtn.textContent = isRegisterMode ? 'Registrati' : 'Accedi';
    form.appendChild(submitBtn);

    const toggleModeText = document.createElement('p');
    toggleModeText.style.textAlign = 'center';
    toggleModeText.style.marginTop = '1rem';
    toggleModeText.style.fontSize = '0.875rem';
    toggleModeText.style.color = 'var(--text-muted)';
    toggleModeText.innerHTML = isRegisterMode 
      ? 'Hai già un account? <a href="#" id="toggle-login-mode" style="color: var(--primary);">Accedi</a>'
      : 'Non hai un account? <a href="#" id="toggle-login-mode" style="color: var(--primary);">Registrati</a>';
    
    form.appendChild(toggleModeText);

    document.getElementById('toggle-login-mode').addEventListener('click', (e) => {
      e.preventDefault();
      isRegisterMode = !isRegisterMode;
      renderForm();
    });
  };

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const errorMsg = document.getElementById('login-error-msg');
    errorMsg.style.display = 'none';

    const user = document.getElementById('login-username').value.trim();
    const pass = document.getElementById('login-password').value;
    
    if (isRegisterMode) {
      const nome = document.getElementById('login-nome').value.trim();
      const cognome = document.getElementById('login-cognome').value.trim();
      
      try {
        state.registerUser({ name: nome, surname: cognome, username: user, password: pass });
        // Automatically log in the user after successful registration
        localStorage.setItem('allogatr_auth', JSON.stringify({ user, loggedIn: true }));
        onLoginSuccess();
      } catch (err) {
        errorMsg.textContent = err.message;
        errorMsg.style.display = 'block';
      }
    } else {
      const dbUser = state.getUser(user);
      if (dbUser && dbUser.password === pass) {
        localStorage.setItem('allogatr_auth', JSON.stringify({ user, loggedIn: true }));
        onLoginSuccess();
      } else {
        errorMsg.textContent = 'Credenziali non valide. Riprova.';
        errorMsg.style.display = 'block';
      }
    }
  });
  
  renderForm();
  
  loginCard.appendChild(brand);
  loginCard.appendChild(form);
  loginWrapper.appendChild(loginCard);
  
  container.appendChild(loginWrapper);
}
