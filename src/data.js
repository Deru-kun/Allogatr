// Database Risorse Aziendali — extracted from spreadsheet
export const TEAM_DATABASE = [
  { id:1,  cognome:"Bertini",     titolo:"Manager",                  tipologia:"Dipendente", costoGg:626,  rateGg:900,  disponibile:false, disponibilitaPct:80,  giorniSett:4.0, team: "P&SD" },
  { id:2,  cognome:"Bini",        titolo:"Consultant",               tipologia:"Dipendente", costoGg:342,  rateGg:550,  disponibile:false, disponibilitaPct:100, giorniSett:5.0, team: "Ecom" },
  { id:3,  cognome:"Gelain",      titolo:"Senior Consultant",        tipologia:"Dipendente", costoGg:378,  rateGg:650,  disponibile:true,  disponibilitaPct:100, giorniSett:5.0, team: "Ecom" },
  { id:4,  cognome:"Giuliani",    titolo:"Senior Manager",           tipologia:"Dipendente", costoGg:1141, rateGg:1150, disponibile:true,  disponibilitaPct:100, giorniSett:5.0, team: "P&SD" },
  { id:5,  cognome:"Nalin",       titolo:"Consultant",               tipologia:"Dipendente", costoGg:359,  rateGg:600,  disponibile:true,  disponibilitaPct:100, giorniSett:5.0, team: "CRM" },
  { id:6,  cognome:"Pratelli",    titolo:"Senior Consultant",        tipologia:"Dipendente", costoGg:454,  rateGg:700,  disponibile:true,  disponibilitaPct:100, giorniSett:5.0, team: "Ecom" },
  { id:7,  cognome:"Quarantotti", titolo:"Junior Consultant",        tipologia:"Dipendente", costoGg:320,  rateGg:550,  disponibile:true,  disponibilitaPct:100, giorniSett:5.0, team: "CRM" },
  { id:8,  cognome:"Sguario",     titolo:"Consultant / UX Designer", tipologia:"Dipendente", costoGg:325,  rateGg:650,  disponibile:true,  disponibilitaPct:100, giorniSett:5.0, team: "Ecom" },
  { id:9,  cognome:"Shostak",     titolo:"Consultant / UX Designer", tipologia:"Dipendente", costoGg:325,  rateGg:650,  disponibile:true,  disponibilitaPct:60,  giorniSett:3.0, team: "Ecom" },
  { id:10, cognome:"Albini",      titolo:"Partner",                  tipologia:"Consulente", costoGg:1150, rateGg:1500, disponibile:true,  disponibilitaPct:0,   giorniSett:0.0, team: "P&SD" },
  { id:11, cognome:"Baldazzi",    titolo:"Senior Project Lead",      tipologia:"Consulente", costoGg:400,  rateGg:750,  disponibile:true,  disponibilitaPct:100, giorniSett:5.0, team: "P&SD" },
  { id:12, cognome:"Barbieri",    titolo:"Senior Expert",            tipologia:"Consulente", costoGg:1000, rateGg:1500, disponibile:true,  disponibilitaPct:100, giorniSett:5.0, team: "Ecom" },
  { id:13, cognome:"Barone",      titolo:"Senior Project Lead",      tipologia:"Consulente", costoGg:500,  rateGg:800,  disponibile:true,  disponibilitaPct:100, giorniSett:5.0, team: "CRM" },
  { id:14, cognome:"Carli",       titolo:"Senior Expert",            tipologia:"Consulente", costoGg:1000, rateGg:1450, disponibile:true,  disponibilitaPct:100, giorniSett:5.0, team: "P&SD" },
  { id:15, cognome:"Chitoroaga",  titolo:"Senior Expert",            tipologia:"Consulente", costoGg:1000, rateGg:1500, disponibile:true,  disponibilitaPct:100, giorniSett:5.0, team: "Ecom" },
  { id:16, cognome:"Di Dario",    titolo:"Senior Expert",            tipologia:"Consulente", costoGg:1150, rateGg:1500, disponibile:true,  disponibilitaPct:100, giorniSett:5.0, team: "CRM" },
  { id:17, cognome:"Di Pietro",   titolo:"Partner",                  tipologia:"Consulente", costoGg:1150, rateGg:1500, disponibile:true,  disponibilitaPct:100, giorniSett:5.0, team: "P&SD" },
  { id:18, cognome:"Farina",      titolo:"Senior Expert",            tipologia:"Consulente", costoGg:850,  rateGg:1350, disponibile:true,  disponibilitaPct:100, giorniSett:5.0, team: "Ecom" },
  { id:19, cognome:"Gardini",     titolo:"Senior Expert",            tipologia:"Consulente", costoGg:800,  rateGg:1200, disponibile:true,  disponibilitaPct:100, giorniSett:5.0, team: "P&SD" },
  { id:20, cognome:"Lattaruli",   titolo:"Senior Expert",            tipologia:"Consulente", costoGg:600,  rateGg:1000, disponibile:true,  disponibilitaPct:100, giorniSett:5.0, team: "CRM" },
  { id:21, cognome:"Lorusso",     titolo:"Expert",                   tipologia:"Consulente", costoGg:650,  rateGg:1000, disponibile:true,  disponibilitaPct:100, giorniSett:5.0, team: "Ecom" },
  { id:22, cognome:"Maiorana",    titolo:"Partner",                  tipologia:"Consulente", costoGg:1150, rateGg:1500, disponibile:true,  disponibilitaPct:100, giorniSett:5.0, team: "P&SD" },
  { id:23, cognome:"Marchioni",   titolo:"Senior Expert",            tipologia:"Consulente", costoGg:1000, rateGg:1500, disponibile:true,  disponibilitaPct:100, giorniSett:5.0, team: "CRM" },
  { id:24, cognome:"Milani",      titolo:"Senior Expert",            tipologia:"Consulente", costoGg:950,  rateGg:1400, disponibile:true,  disponibilitaPct:100, giorniSett:5.0, team: "Ecom" },
  { id:25, cognome:"Motti",       titolo:"Senior Expert",            tipologia:"Consulente", costoGg:1000, rateGg:1500, disponibile:true,  disponibilitaPct:100, giorniSett:5.0, team: "P&SD" },
  { id:26, cognome:"Patrissi",    titolo:"Senior Expert",            tipologia:"Consulente", costoGg:800,  rateGg:1350, disponibile:true,  disponibilitaPct:100, giorniSett:5.0, team: "CRM" },
  { id:27, cognome:"Poggiolini",  titolo:"Partner",                  tipologia:"Consulente", costoGg:800,  rateGg:1200, disponibile:true,  disponibilitaPct:100, giorniSett:5.0, team: "Ecom" },
  { id:28, cognome:"Salvati",     titolo:"Senior Project Lead",      tipologia:"Consulente", costoGg:500,  rateGg:800,  disponibile:true,  disponibilitaPct:100, giorniSett:5.0, team: "P&SD" },
  { id:29, cognome:"Soprana",     titolo:"Partner",                  tipologia:"Consulente", costoGg:1150, rateGg:1650, disponibile:true,  disponibilitaPct:100, giorniSett:5.0, team: "CRM" },
  { id:30, cognome:"Tazzari",     titolo:"Partner",                  tipologia:"Consulente", costoGg:1150, rateGg:1500, disponibile:true,  disponibilitaPct:100, giorniSett:5.0, team: "Ecom" },
  { id:31, cognome:"Thiella",     titolo:"Senior Project Lead",      tipologia:"Consulente", costoGg:500,  rateGg:750,  disponibile:true,  disponibilitaPct:100, giorniSett:5.0, team: "P&SD" },
  { id:32, cognome:"Zuffi",       titolo:"Partner",                  tipologia:"Consulente", costoGg:800,  rateGg:1250, disponibile:true,  disponibilitaPct:100, giorniSett:5.0, team: "CRM" },
  { id:33, cognome:"Gasparotto",  titolo:"Senior Expert",            tipologia:"Consulente", costoGg:1000, rateGg:1500, disponibile:true,  disponibilitaPct:100, giorniSett:5.0, team: "Ecom" },
  { id:34, cognome:"Picard",      titolo:"Senior Project Lead",      tipologia:"Consulente", costoGg:600,  rateGg:900,  disponibile:true,  disponibilitaPct:100, giorniSett:5.0, team: "P&SD" },
  { id:35, cognome:"Moretti",     titolo:"Partner",                  tipologia:"Dipendente", costoGg:1150, rateGg:1650, disponibile:true,  disponibilitaPct:100, giorniSett:5.0, team: "CRM" },
  { id:36, cognome:"Other",       titolo:"Other",                    tipologia:"",           costoGg:0,    rateGg:0,    disponibile:true,  disponibilitaPct:100, giorniSett:5.0, team: "Other" },
];

// Unique roles sorted alphabetically
export const ROLES = [...new Set(TEAM_DATABASE.map(m => m.titolo))].sort();

// Get members by role
export function getMembersByRole(role) {
  return TEAM_DATABASE.filter(m => m.titolo === role && m.disponibile);
}

// Get member by ID
export function getMemberById(id) {
  return TEAM_DATABASE.find(m => m.id === id);
}

// Project types
export const PROJECT_TYPES = ['Fixed Fee', 'Time & Material', 'Retainer'];

// Project Templates
export const PROJECT_TEMPLATES = [
  {
    id: 'tech_standard',
    name: 'Progetto Tech Standard',
    type: 'Time & Material',
    description: '1 Senior Project Lead, 1 Senior Consultant, 2 Consultants',
    roles: [
      { role: 'Senior Project Lead', weeks: [1, 1, 1, 1] },
      { role: 'Senior Consultant', weeks: [5, 5, 5, 5] },
      { role: 'Consultant', count: 2, weeks: [5, 5, 5, 5] }
    ]
  },
  {
    id: 'strategy',
    name: 'Consulenza Strategica',
    type: 'Fixed Fee',
    description: '1 Partner, 1 Senior Manager, 1 Consultant',
    roles: [
      { role: 'Partner', weeks: [1, 1, 1] },
      { role: 'Senior Manager', weeks: [3, 3, 3] },
      { role: 'Consultant', count: 1, weeks: [5, 5, 5] }
    ]
  },
  {
    id: 'design_sprint',
    name: 'Design Sprint',
    type: 'Fixed Fee',
    description: '1 Partner, 1 UX Designer',
    roles: [
      { role: 'Partner', weeks: [1, 0.5] },
      { role: 'Consultant / UX Designer', count: 1, weeks: [5, 5] }
    ]
  }
];
