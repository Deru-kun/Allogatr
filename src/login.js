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
  
  const userGroup = document.createElement('div');
  userGroup.className = 'field-group';
  userGroup.innerHTML = `
    <label>Username</label>
    <input type="text" id="login-username" required placeholder="name@domain.com">
  `;
  
  const passGroup = document.createElement('div');
  passGroup.className = 'field-group';
  passGroup.innerHTML = `
    <label>Password</label>
    <input type="password" id="login-password" required placeholder="••••••••">
  `;
  
  const errorMsg = document.createElement('div');
  errorMsg.className = 'login-error';
  errorMsg.style.display = 'none';
  errorMsg.style.color = 'var(--red)';
  errorMsg.style.fontSize = '0.875rem';
  errorMsg.style.marginBottom = '1rem';
  
  const submitBtn = document.createElement('button');
  submitBtn.type = 'submit';
  submitBtn.className = 'btn btn-primary';
  submitBtn.style.width = '100%';
  submitBtn.style.marginTop = '1rem';
  submitBtn.textContent = 'Accedi';
  
  form.appendChild(userGroup);
  form.appendChild(passGroup);
  form.appendChild(errorMsg);
  form.appendChild(submitBtn);
  
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const user = document.getElementById('login-username').value;
    const pass = document.getElementById('login-password').value;
    
    if (user === 'andrea.bertini@arad.digital' && pass === 'Arad123321!') {
      localStorage.setItem('allogatr_auth', JSON.stringify({ user, loggedIn: true }));
      onLoginSuccess();
    } else {
      errorMsg.textContent = 'Credenziali non valide. Riprova.';
      errorMsg.style.display = 'block';
    }
  });
  
  loginCard.appendChild(brand);
  loginCard.appendChild(form);
  loginWrapper.appendChild(loginCard);
  
  container.appendChild(loginWrapper);
}
