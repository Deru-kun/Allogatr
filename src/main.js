import './style.css';
import { renderProjects } from './projects.js';
import { renderEstimator } from './estimator.js';
import { renderDashboard } from './dashboard.js';
import { state } from './state.js';
import { el } from './utils.js';

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(err => console.log('SW registration failed:', err));
  });
}

const app = document.querySelector('#app');
app.className = 'app-layout';

// Sidebar
const sidebar = el('aside', { className: 'sidebar' }, [
  el('div', { className: 'sidebar-brand' }, [
    el('img', { src: '/logo.png', className: 'logo-img', alt: 'Allogatr Logo' }),
  ]),
  el('div', { className: 'user-profile' }, [
    el('div', { className: 'avatar', textContent: 'A' }),
    el('div', { className: 'user-info' }, [
      el('strong', { textContent: 'Andrea' }),
      el('span', { textContent: 'Personal Account' }),
    ]),
  ]),
  el('div', { className: 'nav-section' }, [
    el('span', { className: 'nav-label', textContent: 'MAIN MENU' }),
    el('nav', { className: 'nav-links' }, [
      el('a', { href: '#/projects', id: 'nav-projects', innerHTML: '<span class="icon"><i class="ph ph-folder-open"></i></span> Progetti' }),
      el('a', { href: '#/dashboard', id: 'nav-dashboard', innerHTML: '<span class="icon"><i class="ph ph-chart-line-up"></i></span> Dashboard' }),
    ]),
  ]),
]);

// Main Wrapper
const mainWrapper = el('div', { className: 'main-wrapper' });

// Topbar
const searchInput = el('input', { type: 'text', placeholder: 'Search projects or clients...', id: 'global-search' });
searchInput.addEventListener('input', (e) => {
  state.setSearchQuery(e.target.value);
  handleRoute();
});

const topbar = el('header', { className: 'topbar' }, [
  el('div', { className: 'topbar-title', id: 'topbar-title' }, [
    el('h1', { textContent: 'Progetti' }),
    el('p', { textContent: 'Gestisci i tuoi preventivi' })
  ]),
  el('div', { className: 'topbar-actions' }, [
    el('div', { className: 'search-bar' }, [
      el('span', { innerHTML: '<i class="ph ph-magnifying-glass"></i>' }),
      searchInput,
    ]),
  ]),
]);

const content = el('main', { id: 'app-content' });

mainWrapper.appendChild(topbar);
mainWrapper.appendChild(content);

app.appendChild(sidebar);
app.appendChild(mainWrapper);

export function updateTopbar(title, subtitle) {
  const topbarTitle = document.getElementById('topbar-title');
  if (topbarTitle) {
    topbarTitle.innerHTML = `<h1>${title}</h1><p>${subtitle}</p>`;
  }
}

function handleRoute() {
  const hash = window.location.hash || '#/projects';
  const path = hash.replace('#', '');
  const segments = path.split('/').filter(Boolean);

  document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove('active'));

  if (segments[0] === 'projects') {
    document.getElementById('nav-projects').classList.add('active');
    updateTopbar('Progetti', 'Gestisci e crea nuovi preventivi.');
    renderProjects(content);
  } else if (segments[0] === 'dashboard') {
    document.getElementById('nav-dashboard').classList.add('active');
    updateTopbar('Dashboard', 'Visualizza l\'allocazione di tutti i membri del team.');
    renderDashboard(content);
  } else if (segments[0] === 'project' && segments[1]) {
    document.getElementById('nav-projects').classList.add('active');
    updateTopbar('Project Estimator', 'Stima il budget e alloca le risorse.');
    renderEstimator(content, segments[1]);
  } else {
    window.location.hash = '#/projects';
  }
}

window.addEventListener('hashchange', handleRoute);

// Initialize routing
if (!window.location.hash) {
  window.location.hash = '#/projects';
} else {
  handleRoute();
}
