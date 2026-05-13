import { uuid, getYearWeek, getWeeksBetween } from './utils.js';
import { PROJECT_TEMPLATES, getMembersByRole, getMemberById } from './data.js';

const STORAGE_KEY = 'allogatr_projects';

// ─── State ─────────────────────────────────────────────
class AppState {
  constructor() {
    this.projects = this._load();
    this.listeners = [];
    this.searchQuery = '';
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
    
    // Total capacity from DB
    TEAM_DATABASE.forEach(m => {
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
        const resData = getMemberById(rid);
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
      return raw ? JSON.parse(raw) : {};
    } catch { return {}; }
  }

  _save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.projects));
    this.listeners.forEach(fn => fn());
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

  // ─── Export / Import ──────────────────────────────────
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
}

export const state = new AppState();
