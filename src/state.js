import { uuid, getYearWeek, toISODate, getWeeksBetween } from './utils.js';
import { TEAM_DATABASE, PROJECT_TEMPLATES, getMembersByRole, getMemberById } from './data.js';

const STORAGE_KEY = 'allogatr_projects_v3';

// ─── State ─────────────────────────────────────────────
class AppState {
  constructor() {
    const data = this._load() || {};
    this.projects = data.projects || {};
    this.resources = (data.resources && data.resources.length > 0) ? data.resources : [...TEAM_DATABASE];
    this.users = data.users || [];
    this.timesheets = data.timesheets || {};
    this.timesheetSettings = data.timesheetSettings || {};
    this.listeners = [];
    this.searchQuery = '';
    const andrea = this.users.find(u => u.username === 'andrea.bertini@arad.digital');
    if (!andrea) {
      this.users.push({ username: 'andrea.bertini@arad.digital', password: 'password123', name: 'Andrea', surname: 'Bertini', role: 'admin' });
    } else {
      andrea.role = 'admin'; // Forza il ruolo ad admin in caso sia registrato come consultant
    }

    if (Object.keys(this.projects).length < 5) {
      this.seedDemoProjects();
    }
  }

  setSearchQuery(q) {
    this.searchQuery = q.toLowerCase();
  }

  getSearchQuery() {
    return this.searchQuery;
  }

  getGlobalWorkload() {
    const workload = {}; // { risorsaId: { "YYYY-WW": percentage } }
    
    for (const project of Object.values(this.projects)) {
      if (!project.dataInizio || !project.dataFine) continue;
      
      const projectWeeks = getWeeksBetween(project.dataInizio, project.dataFine);
      
      for (const member of project.team) {
        const rid = member.risorsaId;
        const resData = getMemberById(rid);
        if (!resData) continue;
        
        if (!workload[rid]) workload[rid] = {};
        
        projectWeeks.forEach(pw => {
          const absoluteWeek = getYearWeek(pw.start);
          const val = Number(member.settimane[pw.key]) || 0;
          const pct = val / resData.giorniSett;
          
          workload[rid][absoluteWeek] = (workload[rid][absoluteWeek] || 0) + pct;
        });
      }
    }
    return workload;
  }

  getRoleCapacity() {
    const roleStats = {}; // { roleName: { total: X, allocated: Y } }
    
    this.resources.forEach(m => {
      if (m.id === 36) return;
      const role = m.titolo || 'Altro';
      if (!roleStats[role]) roleStats[role] = { total: 0, allocated: 0 };
      roleStats[role].total += m.giorniSett;
    });

    // Actual allocation across all active projects
    for (const project of Object.values(this.projects)) {
      if (!project.dataInizio || !project.dataFine) continue;
      
      for (const member of project.team) {
        const rid = member.risorsaId;
        const resData = this.getResourceById(rid);
        if (!resData) continue;
        
        const role = resData.titolo || 'Altro';
        if (!roleStats[role]) roleStats[role] = { total: 0, allocated: 0 };
        
        // Average allocation per week (simple sum of days / duration in weeks)
        const totalProjectDays = Object.values(member.settimane || {}).reduce((s, v) => s + (Number(v) || 0), 0);
        const weeks = getWeeksBetween(project.dataInizio, project.dataFine).length;
        if (weeks > 0) {
          roleStats[role].allocated += (totalProjectDays / weeks);
        }
      }
    }
    return roleStats;
  }

  _load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }

  _save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      projects: this.projects,
      resources: this.resources,
      users: this.users,
      timesheets: this.timesheets,
      timesheetSettings: this.timesheetSettings
    }));
    this.listeners.forEach(fn => fn());
  }

  // ─── Auth / Users ─────────────────────────────────────
  getUser(username) {
    return this.users.find(u => u.username === username);
  }

  updateUser(username, data) {
    const userIndex = this.users.findIndex(u => u.username === username);
    if (userIndex !== -1) {
      this.users[userIndex] = { ...this.users[userIndex], ...data };
      this._save();
    }
  }

  updatePassword(username, oldPassword, newPassword) {
    const userIndex = this.users.findIndex(u => u.username === username);
    if (userIndex !== -1) {
      if (this.users[userIndex].password !== oldPassword) {
        throw new Error("La vecchia password è errata.");
      }
      this.users[userIndex].password = newPassword;
      this._save();
    } else {
      throw new Error("Utente non trovato.");
    }
  }

  registerUser({ name, surname, username, password }) {
    if (this.getUser(username)) {
      throw new Error("Utente già registrato");
    }
    if (!username.endsWith('@arad.digital')) {
      throw new Error("Lo username deve terminare con @arad.digital");
    }
    this.users.push({ name, surname, username, password, role: 'consultant' });
    
    // Create new resource
    const newId = Math.max(...this.resources.map(r => r.id), 0) + 1;
    this.resources.push({
      id: newId,
      cognome: surname,
      nome: name,
      titolo: "Consultant",
      tipologia: "Dipendente",
      costoGg: 350,
      rateGg: 600,
      disponibile: true,
      disponibilitaPct: 100,
      giorniSett: 5.0,
      team: "Altro"
    });
    
    this._save();
  }

  onChange(fn) {
    this.listeners.push(fn);
    return () => { this.listeners = this.listeners.filter(l => l !== fn); };
  }

  // ─── Projects CRUD ────────────────────────────────────
  listProjects() {
    return Object.values(this.projects).sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
  }

  getProject(id) {
    return this.projects[id] || null;
  }

  createProject(data = {}) {
    const id = uuid();
    const now = new Date().toISOString();
    this.projects[id] = {
      id,
      nome: data.nome || 'Nuovo Progetto',
      cliente: data.cliente || '',
      projectLead: data.projectLead || '',
      accountLead: data.accountLead || '',
      tipologia: data.tipologia || 'Fixed Fee',
      dataInizio: data.dataInizio || '',
      dataFine: data.dataFine || '',
      bufferPercent: data.bufferPercent ?? 0,
      bdFeePercent: data.bdFeePercent ?? 0,
      altreRevenues: data.altreRevenues ?? 0,
      costiEsterni: data.costiEsterni ?? 0,
      licenze: data.licenze ?? 0,
      team: [],
      hiddenColumns: [],
      createdAt: now,
      updatedAt: now,
    };
    this._save();
    return id;
  }

  createProjectFromTemplate(templateId) {
    const template = PROJECT_TEMPLATES.find(t => t.id === templateId);
    if (!template) return this.createProject();

    const projectId = this.createProject({
      nome: template.name,
      tipologia: template.type
    });

    const project = this.projects[projectId];
    
    // Add roles
    template.roles.forEach(roleConf => {
      const candidates = getMembersByRole(roleConf.role);
      const count = roleConf.count || 1;
      
      for (let i = 0; i < count; i++) {
        // Try to find a unique candidate if possible, or just the first one
        const member = candidates[i % candidates.length];
        if (!member) continue;
        
        const rowId = uuid();
        const settimane = {};
        
        roleConf.weeks.forEach((w, index) => {
          settimane[`W${index + 1}`] = w;
        });

        project.team.push({
          rowId,
          risorsaId: member.id,
          ruolo: member.titolo,
          settimane
        });
      }
    });

    this._save();
    return projectId;
  }

  updateProject(id, updates) {
    if (!this.projects[id]) return;
    Object.assign(this.projects[id], updates, { updatedAt: new Date().toISOString() });
    this._save();
  }

  deleteProject(id) {
    delete this.projects[id];
    this._save();
  }

  duplicateProject(id) {
    const src = this.projects[id];
    if (!src) return null;
    const newId = uuid();
    const now = new Date().toISOString();
    this.projects[newId] = {
      ...JSON.parse(JSON.stringify(src)),
      id: newId,
      nome: src.nome + ' (copia)',
      createdAt: now,
      updatedAt: now,
    };
    this._save();
    return newId;
  }

  // ─── Team members in project ──────────────────────────
  addTeamMember(projectId, member) {
    const proj = this.projects[projectId];
    if (!proj) return;
    const row = {
      rowId: uuid(),
      risorsaId: member.id,
      cognome: member.cognome,
      ruolo: member.titolo,
      livello: member.tipologia,
      costoStandard: member.costoGg,
      rateStandard: member.rateGg,
      rateAccordato: member.rateGg,
      attivita: '',
      dataInizio: proj.dataInizio || '',
      dataFine: proj.dataFine || '',
      settimane: {},
    };
    proj.team.push(row);
    this._save();
    return row;
  }

  updateTeamMember(projectId, rowId, updates) {
    const proj = this.projects[projectId];
    if (!proj) return;
    const member = proj.team.find(m => m.rowId === rowId);
    if (member) Object.assign(member, updates);
    this._save();
  }

  removeTeamMember(projectId, rowId) {
    const proj = this.projects[projectId];
    if (!proj) return;
    proj.team = proj.team.filter(m => m.rowId !== rowId);
    this._save();
  }

  // ─── Cross-project allocation ─────────────────────────
  getAllocationForMember(memberId) {
    const allocation = [];
    for (const proj of Object.values(this.projects)) {
      for (const row of proj.team) {
        if (row.risorsaId === memberId) {
          allocation.push({
            projectId: proj.id,
            projectName: proj.nome,
            cliente: proj.cliente,
            dataInizio: row.dataInizio || proj.dataInizio,
            dataFine: row.dataFine || proj.dataFine,
            settimane: row.settimane || {},
            ruolo: row.ruolo,
          });
        }
      }
    }
    return allocation;
  }

  // ─── Resources Helpers ───────────────────────────────
  getResourceById(id) {
    return this.resources.find(r => r.id == id);
  }

  getResourcesByRole(role) {
    return this.resources.filter(r => r.titolo === role && r.disponibile);
  }

  getAllRoles() {
    return [...new Set(this.resources.map(r => r.titolo).filter(Boolean))].sort();
  }

  // ─── Resources CRUD ──────────────────────────────────
  updateResource(id, updates) {
    const res = this.resources.find(r => r.id === id);
    if (res) {
      Object.assign(res, updates);
      this._save();
    }
  }

  deleteResource(id) {
    this.resources = this.resources.filter(r => r.id !== id);
    this._save();
  }

  createResource() {
    const nextId = Math.max(0, ...this.resources.map(r => r.id)) + 1;
    const newRes = {
      id: nextId,
      cognome: 'Nuova Risorsa',
      titolo: 'Ruolo',
      tipologia: 'Dipendente',
      costoGg: 0,
      rateGg: 0,
      giorniSett: 5.0,
      disponibile: true,
      team: 'Other'
    };
    this.resources.push(newRes);
    this._save();
    return newRes;
  }
  exportJSON() {
    return JSON.stringify(this.projects, null, 2);
  }

  importJSON(json) {
    try {
      const data = JSON.parse(json);
      this.projects = data;
      this._save();
      return true;
    } catch { return false; }
  }
  // ─── Timesheet Management ──────────────────────────────
  getTimesheetSettings(userId) {
    if (!this.timesheetSettings[userId]) {
      this.timesheetSettings[userId] = {
        visibleDays: [1, 2, 3, 4, 5], // Mon-Fri
        sortBy: 'manual',
        projects: [] // Array of project IDs
      };
    }
    return this.timesheetSettings[userId];
  }

  saveTimesheetSettings(userId, settings) {
    this.timesheetSettings[userId] = { ...this.getTimesheetSettings(userId), ...settings };
    this._save();
  }

  getTimesheetData(userId, yearWeek) {
    if (!this.timesheets[userId]) this.timesheets[userId] = {};
    if (!this.timesheets[userId][yearWeek]) this.timesheets[userId][yearWeek] = {};
    return this.timesheets[userId][yearWeek];
  }

  saveTimesheetEntry(userId, yearWeek, projectId, dateStr, billable, nonBillable) {
    const data = this.getTimesheetData(userId, yearWeek);
    if (!data[projectId]) data[projectId] = {};
    data[projectId][dateStr] = { billable, nonBillable };
    this._save();
  }

  seedDemoProjects() {
    this.projects = {}; // Clear existing to avoid partial data
    const clients = [
      "Ferrari", "Prada", "Armani", "Eni", "Enel", 
      "Gucci", "L'Oreal", "Nestlé", "Barilla", "Fiat", 
      "Iveco", "Leonardo", "TIM", "Vodafone", "Sky"
    ];
    const statuses = ["In Corso", "Draft", "Archiviato"];
    const now = new Date();
    const bertini = this.getResourceById(1);

    clients.forEach((client, i) => {
      const id = uuid();
      const status = statuses[i % 3];
      const start = new Date();
      start.setDate(now.getDate() - (30 + i * 2));
      const end = new Date();
      end.setDate(now.getDate() + (60 - i));

      const proj = {
        id,
        nome: `Digital Transformation ${i + 1}`,
        cliente: client,
        stato: status,
        dataInizio: toISODate(start),
        dataFine: toISODate(end),
        tipo: "Time & Material",
        budget: 50000 + (i * 10000),
        costiEsterni: 2000,
        licenze: 1000,
        bdFeePercent: 3,
        team: [],
        updatedAt: new Date().toISOString()
      };

      // Always allocate Bertini (ID 1)
      if (bertini) {
        proj.team.push({
          rowId: uuid(),
          risorsaId: bertini.id,
          cognome: bertini.cognome,
          ruolo: "Manager",
          livello: bertini.tipologia,
          costoStandard: bertini.costoGg,
          rateStandard: bertini.rateGg,
          rateAccordato: bertini.rateGg,
          dataInizio: proj.dataInizio,
          dataFine: proj.dataFine,
          settimane: {
            "W1": 0.5, "W2": 1, "W3": 0.5, "W4": 1, "W5": 0.5, "W6": 1, "W7": 0.5, "W8": 1
          }
        });
      }

      // Add 2 random resources from the database
      for (let j = 0; j < 2; j++) {
        const otherId = ((i + j) % 35) + 2;
        const otherRes = this.getResourceById(otherId);
        if (otherRes && otherRes.id !== 1) {
          proj.team.push({
            rowId: uuid(),
            risorsaId: otherRes.id,
            cognome: otherRes.cognome,
            ruolo: otherRes.titolo,
            livello: otherRes.tipologia,
            costoStandard: otherRes.costoGg,
            rateStandard: otherRes.rateGg,
            rateAccordato: otherRes.rateGg,
            dataInizio: proj.dataInizio,
            dataFine: proj.dataFine,
            settimane: { "W1": 1, "W2": 1, "W3": 1, "W4": 1 }
          });
        }
      }

      this.projects[id] = proj;
    });

    this._save();
  }
}

export const state = new AppState();
