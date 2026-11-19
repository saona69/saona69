/* SAONA Workspace — application locale (aucune dépendance, données dans le navigateur). */
'use strict';

/* ------------------------------------------------------------------ */
/* Constantes et format de sauvegarde                                  */
/* ------------------------------------------------------------------ */
const APP_NAME = 'SAONA WORKSPACE';
const FORMAT_VERSION = 1;
const STORAGE_KEY = 'saona-workspace-v1';

const COLLECTION_KEYS = [
  'tasks', 'projects', 'prospects', 'campaigns', 'knowledge', 'events', 'lessons',
  'diagnostics', 'quizResults', 'academyResults', 'academyProfiles', 'preDiagnostics',
  'saonaPilots', 'organizations', 'strategicProjects', 'crmContacts', 'crmEvents',
  'crmDeliverables', 'crmAnalyses', 'crmProposals'
];

function emptyData() {
  const d = {};
  COLLECTION_KEYS.forEach(k => { d[k] = []; });
  return d;
}

/* ------------------------------------------------------------------ */
/* Utilitaires                                                         */
/* ------------------------------------------------------------------ */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

function esc(v) {
  return String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function getPath(obj, path) {
  return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
}
function setPath(obj, path, value) {
  const keys = path.split('.');
  let o = obj;
  keys.slice(0, -1).forEach(k => { if (typeof o[k] !== 'object' || o[k] === null) o[k] = {}; o = o[k]; });
  o[keys[keys.length - 1]] = value;
}
const nowISO = () => new Date().toISOString();
function todayLocal() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function randomSuffix() { return Math.random().toString(36).slice(2, 7); }
function newId(kind) {
  if (kind === 'number') return Date.now();
  return `${kind}-${Date.now()}-${randomSuffix()}`;
}
function fmtDate(v) {
  if (!v) return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(v);
  if (!m) return v;
  return `${m[3]}/${m[2]}/${m[1]}`;
}
function fmtDateTime(v) {
  if (!v) return '';
  const d = new Date(v);
  if (isNaN(d)) return v;
  return d.toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
}
function fmtMoney(n) {
  if (n === '' || n == null || isNaN(Number(n))) return n || '';
  return Number(n).toLocaleString('fr-FR') + ' € HT';
}
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.remove('show'), 2400);
}
const isUnknown = v => !v || /^(À identifier|À déterminer|Non vérifié|À confirmer|À compléter)$/i.test(String(v).trim());

/* ------------------------------------------------------------------ */
/* Stockage                                                            */
/* ------------------------------------------------------------------ */
let DATA = emptyData();

function normalize(data) {
  const out = Object.assign(emptyData(), data || {});
  COLLECTION_KEYS.forEach(k => { if (!Array.isArray(out[k])) out[k] = []; });
  return out;
}
function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) DATA = normalize(JSON.parse(raw).data);
  } catch (e) {
    console.warn('Lecture du stockage local impossible', e);
  }
}
function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ app: APP_NAME, version: FORMAT_VERSION, savedAt: nowISO(), data: DATA }));
  } catch (e) {
    toast('Enregistrement local impossible : exportez vos données.');
    console.error(e);
  }
}
function exportBackup() {
  const payload = { app: APP_NAME, version: FORMAT_VERSION, exportedAt: nowISO(), data: DATA };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'SAONA_WORKSPACE_sauvegarde.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  toast('Sauvegarde exportée');
}
function importBackup(text) {
  let parsed;
  try { parsed = JSON.parse(text); } catch { throw new Error('Fichier JSON invalide.'); }
  if (!parsed || parsed.app !== APP_NAME || typeof parsed.data !== 'object') {
    throw new Error(`Ce fichier n'est pas une sauvegarde ${APP_NAME}.`);
  }
  if (Number(parsed.version) > FORMAT_VERSION) {
    throw new Error(`Version de sauvegarde ${parsed.version} non prise en charge (max ${FORMAT_VERSION}).`);
  }
  DATA = normalize(parsed.data);
  save();
}

/* ------------------------------------------------------------------ */
/* Référentiels                                                        */
/* ------------------------------------------------------------------ */
const OPTIONS = {
  priority: ['Basse', 'Normale', 'Haute'],
  projectStatus: ['À cadrer', 'À préparer', 'En cours', 'En pause', 'Terminé'],
  prospectStage: ['Prospection', 'Qualification', 'Proposition', 'Négociation', 'Gagné', 'Perdu'],
  channel: ['Email', 'Newsletter', 'Réseaux sociaux', 'SMS', 'Événement', 'Autre'],
  campaignStatus: ['À préparer', 'Planifiée', 'En cours', 'Terminée'],
  eventCategory: ['Événement', 'Rendez-vous', 'Réunion', 'Échéance', 'Autre'],
  relationship: ['Prospect', 'Client existant', 'Partenaire', 'Revendeur'],
  spStage: ['À qualifier', 'Pré-diagnostic', 'Analyse à valider', 'Diagnostic proposé', 'Diagnostic en cours', 'Mise en place', 'Clos'],
  profileRole: ['Interne', 'Revendeur', 'Client', 'Partenaire'],
  evidence: ['Déclaratif', 'Données vérifiées', 'Mixte : précisions dans les notes', 'À confirmer'],
  enjeu: ['Acquisition', 'Fidélisation', 'Engagement / visibilité', 'Incentive', 'À identifier'],
  frein: ['Recommandations peu structurées', 'Manque de visibilité', 'Faible engagement', 'Données dispersées', 'À identifier'],
  public: ['Clients', 'Partenaires / prescripteurs', 'Collaborateurs', 'Réseau commercial', 'À identifier'],
  action: ['Recommandation qualifiée', 'Partage / avis', 'Achat répété', 'Participation', 'À déterminer'],
  donnees: ['CRM / base clients', 'Fichier Excel / CSV', 'Aucune base', 'Non vérifié'],
  priorite: ['Lancement prioritaire', 'À planifier', 'Exploratoire', 'Non vérifié'],
  pilotDecision: ['À instruire', 'Diagnostic à proposer', 'Diagnostic en cours', 'Go', 'No-go'],
  proposalStatus: ['Brouillon interne', 'Envoyée', 'Acceptée', 'Refusée'],
};

/* Étapes du pilote : les clés proviennent du format de sauvegarde, les libellés sont des intitulés de travail. */
const PILOT_STEPS = [
  ['base', 'Audit de la base de contacts'],
  ['law', 'Conformité RGPD et règles de sollicitation'],
  ['journey', 'Parcours participant'],
  ['qualification', 'Règles de qualification des recommandations'],
  ['economics', 'Modèle économique et récompenses'],
  ['showroom', 'Studio témoin / point de démonstration'],
  ['accept', 'Acceptation du client'],
  ['design', 'Design des supports'],
  ['aurizon', 'Paramétrage Aurizon'],
  ['legal', 'Règlement / CGU du programme'],
  ['qa', 'Recette'],
  ['go', 'Go / No-go de lancement'],
];

const ANSWER_LABELS = {
  enjeu: 'Objectif', frein: 'Frein', public: 'Public prioritaire',
  action: 'Action recherchée', donnees: 'Données disponibles', priorite: 'Priorité',
};

/* ------------------------------------------------------------------ */
/* Définition des collections (CRUD générique)                         */
/* ------------------------------------------------------------------ */
const refOptions = (key, labelKey = 'name') => () => DATA[key].map(x => [x.id, x[labelKey] || x.title || x.id]);
const datalistOf = (key, labelKey) => () => DATA[key].map(x => x[labelKey]);

const COLLECTIONS = {
  tasks: {
    label: 'Tâches', singular: 'une tâche', idKind: 'number',
    fields: [
      { key: 'title', label: 'Intitulé', required: true },
      { key: 'project', label: 'Projet', datalist: datalistOf('projects', 'name') },
      { key: 'owner', label: 'Responsable' },
      { key: 'priority', label: 'Priorité', type: 'select', options: OPTIONS.priority, default: 'Normale' },
      { key: 'done', label: 'Terminée', type: 'checkbox' },
    ],
    columns: ['done', 'title', 'project', 'owner', 'priority'],
    sort: (a, b) => Number(a.done) - Number(b.done) || OPTIONS.priority.indexOf(b.priority) - OPTIONS.priority.indexOf(a.priority),
  },
  projects: {
    label: 'Projets', singular: 'un projet', idKind: 'number',
    fields: [
      { key: 'name', label: 'Nom', required: true },
      { key: 'description', label: 'Description', type: 'textarea' },
      { key: 'owner', label: 'Responsable(s)' },
      { key: 'status', label: 'Statut', type: 'select', options: OPTIONS.projectStatus, default: 'À cadrer' },
      { key: 'progress', label: 'Avancement (%)', type: 'number', min: 0, max: 100, default: 0 },
    ],
    columns: ['name', 'owner', 'status', 'progress'],
  },
  prospects: {
    label: 'Prospects', singular: 'un prospect', idKind: 'number',
    fields: [
      { key: 'name', label: 'Entreprise', required: true },
      { key: 'contact', label: 'Contact' },
      { key: 'stage', label: 'Étape', type: 'select', options: OPTIONS.prospectStage, default: 'Prospection' },
      { key: 'owner', label: 'Responsable' },
      { key: 'amount', label: 'Montant estimé (€ HT)' },
    ],
    columns: ['name', 'contact', 'stage', 'owner', 'amount'],
    sort: (a, b) => OPTIONS.prospectStage.indexOf(b.stage) - OPTIONS.prospectStage.indexOf(a.stage),
  },
  campaigns: {
    label: 'Campagnes', singular: 'une campagne', idKind: 'number',
    fields: [
      { key: 'title', label: 'Intitulé', required: true },
      { key: 'channel', label: 'Canal', type: 'select', options: OPTIONS.channel, default: 'Email' },
      { key: 'status', label: 'Statut', type: 'select', options: OPTIONS.campaignStatus, default: 'À préparer' },
      { key: 'owner', label: 'Responsable' },
      { key: 'description', label: 'Description', type: 'textarea' },
    ],
    columns: ['title', 'channel', 'status', 'owner'],
  },
  knowledge: {
    label: 'Base de connaissances', singular: 'une fiche', idKind: 'number',
    fields: [
      { key: 'title', label: 'Titre', required: true },
      { key: 'category', label: 'Catégorie', datalist: datalistOf('knowledge', 'category') },
      { key: 'content', label: 'Contenu', type: 'textarea' },
      { key: 'updated', label: 'Mise à jour', type: 'date', readonly: true },
    ],
    columns: ['title', 'category', 'content', 'updated'],
    beforeSave: item => { item.updated = todayLocal(); },
  },
  events: {
    label: 'Agenda', singular: 'un événement', idKind: 'number',
    fields: [
      { key: 'title', label: 'Intitulé', required: true },
      { key: 'date', label: 'Date', type: 'date', required: true },
      { key: 'time', label: 'Heure', type: 'time' },
      { key: 'category', label: 'Catégorie', type: 'select', options: OPTIONS.eventCategory, default: 'Événement' },
      { key: 'owner', label: 'Responsable' },
      { key: 'notes', label: 'Notes', type: 'textarea' },
    ],
    columns: ['date', 'time', 'title', 'category', 'owner', 'notes'],
    sort: (a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`),
  },
  lessons: {
    label: 'Académie — modules', singular: 'un module', idKind: 'number',
    fields: [
      { key: 'title', label: 'Titre', required: true },
      { key: 'module', label: 'Code module' },
      { key: 'date', label: 'Date', type: 'date', default: () => todayLocal() },
      { key: 'completed', label: 'Terminé', type: 'checkbox' },
      { key: 'note', label: 'Note', type: 'textarea' },
    ],
    columns: ['completed', 'title', 'module', 'date', 'note'],
  },
  academyProfiles: {
    label: 'Académie — profils', singular: 'un profil', idKind: 'profile',
    fields: [
      { key: 'name', label: 'Nom', required: true },
      { key: 'org', label: 'Organisation' },
      { key: 'role', label: 'Rôle', type: 'select', options: OPTIONS.profileRole, default: 'Interne' },
    ],
    columns: ['name', 'org', 'role'],
  },
  organizations: {
    label: 'Organisations', singular: 'une organisation', idKind: 'org',
    fields: [
      { key: 'name', label: 'Nom', required: true },
      { key: 'relationship', label: 'Relation', type: 'select', options: OPTIONS.relationship, default: 'Prospect' },
      { key: 'sector', label: 'Secteur' },
      { key: 'notes', label: 'Notes', type: 'textarea' },
      { key: 'source', label: 'Source de l’information' },
    ],
    columns: ['name', 'relationship', 'sector'],
    beforeSave: (item, isNew) => { if (isNew) item.createdAt = nowISO(); },
    canDelete: item => {
      const n = DATA.strategicProjects.filter(p => p.orgId === item.id).length + DATA.crmContacts.filter(c => c.orgId === item.id).length;
      return n ? `Cette organisation a ${n} contact(s) ou projet(s) rattaché(s). Supprimez-les d’abord.` : null;
    },
  },
  crmContacts: {
    label: 'Contacts', singular: 'un contact', idKind: 'ct',
    fields: [
      { key: 'orgId', label: 'Organisation', type: 'select', optionsFn: refOptions('organizations'), required: true },
      { key: 'name', label: 'Nom', required: true },
      { key: 'role', label: 'Fonction' },
      { key: 'email', label: 'E-mail', type: 'email' },
      { key: 'phone', label: 'Téléphone', type: 'tel' },
    ],
    columns: ['name', 'role', 'email', 'phone'],
  },
  strategicProjects: {
    label: 'Projets stratégiques', singular: 'un projet stratégique', idKind: 'sp',
    fields: [
      { key: 'orgId', label: 'Organisation', type: 'select', optionsFn: refOptions('organizations'), required: true },
      { key: 'title', label: 'Intitulé', required: true },
      { key: 'stage', label: 'Étape', type: 'select', options: OPTIONS.spStage, default: 'À qualifier' },
      { key: 'objective', label: 'Objectif', type: 'textarea' },
      { key: 'owner', label: 'Responsable' },
      { key: 'nextAction', label: 'Prochaine action', type: 'textarea' },
      { key: 'source', label: 'Source' },
      { key: 'preId', label: 'Pré-diagnostic lié', type: 'select', optionsFn: refOptions('preDiagnostics', 'company'), allowEmpty: true },
    ],
    columns: ['title', 'stage', 'owner', 'nextAction'],
    beforeSave: (item, isNew) => {
      if (isNew) { item.createdAt = nowISO(); item.priceDiagnosis = null; item.approval = null; }
      item.updatedAt = nowISO();
      if (!item.preId) delete item.preId;
    },
    canDelete: item => {
      const n = DATA.crmAnalyses.filter(a => a.projectId === item.id).length + DATA.crmProposals.filter(p => p.projectId === item.id).length;
      return n ? `Ce projet a ${n} analyse(s) ou proposition(s) rattachée(s). Supprimez-les d’abord.` : null;
    },
  },
  preDiagnostics: {
    label: 'Pré-diagnostics', singular: 'un pré-diagnostic', idKind: 'pre',
    fields: [
      { key: 'company', label: 'Entreprise', required: true, datalist: datalistOf('organizations', 'name') },
      { key: 'contact', label: 'Contact' },
      { key: 'context', label: 'Contexte déclaré', type: 'textarea' },
      { key: 'evidence', label: 'Qualité de la source', type: 'select', options: OPTIONS.evidence, default: 'À confirmer' },
      ...Object.keys(ANSWER_LABELS).map(k => ({
        key: `answers.${k}`, label: ANSWER_LABELS[k], type: 'select', options: OPTIONS[k], default: OPTIONS[k][OPTIONS[k].length - 1],
      })),
      { key: 'notes', label: 'Notes', type: 'textarea' },
    ],
    columns: ['company', 'contact', 'answers.enjeu', 'answers.public', 'evidence', 'updatedAt'],
    beforeSave: (item, isNew) => {
      item.updatedAt = nowISO();
      if (isNew) item.stage = 'Pré-diagnostic';
    },
    afterSave: item => ensurePilot(item),
    canDelete: item => {
      const n = DATA.strategicProjects.filter(p => p.preId === item.id).length + DATA.crmAnalyses.filter(a => a.content && a.content.sourcePreId === item.id).length;
      return n ? `Ce pré-diagnostic est utilisé par ${n} projet(s) ou analyse(s). Détachez-les d’abord.` : null;
    },
    afterDelete: item => { DATA.saonaPilots = DATA.saonaPilots.filter(p => p.preId !== item.id); },
  },
};

const COLUMN_LABELS = { updatedAt: 'Mis à jour', 'answers.enjeu': 'Objectif', 'answers.public': 'Public' };

function fieldOf(collKey, fieldKey) {
  return COLLECTIONS[collKey].fields.find(f => f.key === fieldKey);
}

/* ------------------------------------------------------------------ */
/* Rendu des cellules                                                  */
/* ------------------------------------------------------------------ */
function badgeClass(v) {
  if (/^(Haute|Perdu|Refusée|No-go)$/.test(v)) return 'danger';
  if (/^(Terminé|Terminée|Gagné|Acceptée|Go|Validé en interne)$/.test(v)) return 'ok';
  if (/^(En cours|Proposition|Négociation|Envoyée|Diagnostic)/.test(v)) return 'accent';
  if (/^(À |Brouillon)/.test(v)) return 'warn';
  return '';
}
function renderCell(collKey, key, item) {
  const v = getPath(item, key);
  const f = fieldOf(collKey, key);
  if (key === 'updatedAt' || key === 'createdAt' || key === 'at') return esc(fmtDateTime(v));
  if (!f) return esc(v);
  if (f.type === 'checkbox') {
    return `<input type="checkbox" data-toggle="${esc(key)}" data-id="${esc(item.id)}" ${v ? 'checked' : ''} aria-label="${esc(f.label)}">`;
  }
  if (key === 'progress') return `<div class="row" style="flex-wrap:nowrap"><div class="progress" style="flex:1"><div style="width:${Math.max(0, Math.min(100, Number(v) || 0))}%"></div></div><span class="small">${esc(v ?? 0)} %</span></div>`;
  if (f.type === 'date') return esc(fmtDate(v));
  if (f.type === 'select' && f.optionsFn) {
    const opt = f.optionsFn().find(o => o[0] === v);
    return esc(opt ? opt[1] : v || '');
  }
  if (f.type === 'select') return v ? `<span class="badge ${badgeClass(v)}">${esc(v)}</span>` : '';
  if (f.type === 'textarea') {
    const s = String(v || '');
    return `<span class="small">${esc(s.length > 110 ? s.slice(0, 110) + '…' : s)}</span>`;
  }
  if (key === 'amount') return esc(fmtMoney(v));
  return esc(v);
}

/* ------------------------------------------------------------------ */
/* Formulaire modal générique                                          */
/* ------------------------------------------------------------------ */
function fieldInput(f, value) {
  const id = `f_${f.key.replace(/\W/g, '_')}`;
  const req = f.required ? 'required' : '';
  const ro = f.readonly ? 'readonly' : '';
  if (f.type === 'checkbox') {
    return `<div class="field check"><label><input type="checkbox" id="${id}" name="${esc(f.key)}" ${value ? 'checked' : ''}> ${esc(f.label)}</label></div>`;
  }
  let input;
  if (f.type === 'textarea') {
    input = `<textarea id="${id}" name="${esc(f.key)}" ${req} ${ro}>${esc(value)}</textarea>`;
  } else if (f.type === 'select') {
    let opts = f.optionsFn ? f.optionsFn() : f.options.map(o => [o, o]);
    if (value && !opts.some(o => o[0] === value)) opts = [[value, `${value} (valeur importée)`], ...opts];
    const empty = f.allowEmpty || !f.required && f.optionsFn ? '<option value="">—</option>' : (!value && f.required ? '<option value="">Choisir…</option>' : '');
    input = `<select id="${id}" name="${esc(f.key)}" ${req}>${empty}${opts.map(o => `<option value="${esc(o[0])}" ${o[0] === value ? 'selected' : ''}>${esc(o[1])}</option>`).join('')}</select>`;
  } else {
    const type = f.type || 'text';
    const list = f.datalist ? `list="${id}_list"` : '';
    const extra = [f.min != null ? `min="${f.min}"` : '', f.max != null ? `max="${f.max}"` : ''].join(' ');
    input = `<input type="${type}" id="${id}" name="${esc(f.key)}" value="${esc(value)}" ${req} ${ro} ${list} ${extra}>`;
    if (f.datalist) {
      const vals = [...new Set(f.datalist().filter(Boolean))];
      input += `<datalist id="${id}_list">${vals.map(v => `<option value="${esc(v)}">`).join('')}</datalist>`;
    }
  }
  return `<div class="field"><label for="${id}">${esc(f.label)}${f.required ? ' *' : ''}</label>${input}</div>`;
}

let modalHandler = null;
function openModal(title, bodyHtml, buttons, onSubmit) {
  $('#modalTitle').textContent = title;
  $('#modalBody').innerHTML = bodyHtml;
  $('#modalFoot').innerHTML = buttons;
  modalHandler = onSubmit;
  $('#modal').showModal();
  const first = $('#modalBody input:not([type=checkbox]), #modalBody textarea, #modalBody select');
  if (first) first.focus();
}
function closeModal() { $('#modal').close(); modalHandler = null; }

function openItemForm(collKey, item, presets = {}) {
  const def = COLLECTIONS[collKey];
  const isNew = !item;
  const draft = isNew ? {} : JSON.parse(JSON.stringify(item));
  if (isNew) {
    def.fields.forEach(f => {
      const d = typeof f.default === 'function' ? f.default() : f.default;
      setPath(draft, f.key, f.type === 'checkbox' ? false : (d ?? ''));
    });
    Object.entries(presets).forEach(([k, v]) => setPath(draft, k, v));
  }
  const body = def.fields.map(f => fieldInput(f, getPath(draft, f.key) ?? '')).join('');
  const buttons = `<button type="button" class="btn ghost" data-close>Annuler</button><button type="submit" class="btn">${isNew ? 'Ajouter' : 'Enregistrer'}</button>`;
  openModal(`${isNew ? 'Ajouter' : 'Modifier'} ${def.singular}`, body, buttons, form => {
    def.fields.forEach(f => {
      const el = form.elements[f.key];
      if (!el) return;
      let v;
      if (f.type === 'checkbox') v = el.checked;
      else if (f.type === 'number') v = el.value === '' ? 0 : Number(el.value);
      else v = el.value.trim();
      setPath(draft, f.key, v);
    });
    if (isNew) draft.id = newId(def.idKind);
    if (def.beforeSave) def.beforeSave(draft, isNew);
    const list = DATA[collKey];
    if (isNew) list.push(draft);
    else list[list.findIndex(x => x.id === item.id)] = draft;
    if (def.afterSave) def.afterSave(draft, isNew);
    save();
    toast(isNew ? 'Ajouté' : 'Enregistré');
    render();
  });
}

function deleteItem(collKey, id) {
  const def = COLLECTIONS[collKey];
  const item = DATA[collKey].find(x => String(x.id) === String(id));
  if (!item) return;
  const blocker = def.canDelete && def.canDelete(item);
  if (blocker) { alert(blocker); return; }
  const label = item.title || item.name || item.company || 'cet élément';
  if (!confirm(`Supprimer « ${label} » ? Cette action est définitive.`)) return;
  DATA[collKey] = DATA[collKey].filter(x => x !== item);
  if (def.afterDelete) def.afterDelete(item);
  save();
  toast('Supprimé');
  render();
}

/* ------------------------------------------------------------------ */
/* Journal CRM, pilotes, moteur de règles                              */
/* ------------------------------------------------------------------ */
function logCrmEvent(orgId, projectId, type, detail) {
  DATA.crmEvents.push({ id: newId('event'), orgId, projectId, type, detail, at: nowISO() });
}

function ensurePilot(pre) {
  let p = DATA.saonaPilots.find(x => x.preId === pre.id);
  if (!p) {
    p = { preId: pre.id, company: pre.company, stage: 0, done: {}, notes: '', decision: 'À instruire', actualProspectRows: null, updatedAt: nowISO() };
    DATA.saonaPilots.push(p);
  } else {
    p.company = pre.company;
  }
  return p;
}

/*
 * Moteur de règles local (sans IA) : produit une synthèse structurée à partir
 * des seules déclarations du pré-diagnostic. Les hypothèses s'appuient sur la
 * grille des 3 programmes (Parrainage / Ambassadeur / Opération).
 */
function generateAnalysis(project) {
  const pre = DATA.preDiagnostics.find(p => p.id === project.preId);
  if (!pre) throw new Error('Aucun pré-diagnostic lié à ce projet.');
  const pilot = DATA.saonaPilots.find(p => p.preId === pre.id);
  const a = pre.answers || {};

  const facts = [];
  const declared = [['enjeu', 'Objectif déclaré'], ['frein', 'Frein déclaré'], ['public', 'Public prioritaire déclaré'], ['action', 'Action recherchée'], ['donnees', 'Données déclarées'], ['priorite', 'Priorité déclarée']];
  declared.forEach(([k, label]) => { if (!isUnknown(a[k])) facts.push(`${label} : ${a[k]}`); });
  if (pre.context && pre.context.trim()) facts.push(`Contexte déclaré : ${pre.context.trim()}`);
  if (pre.evidence) facts.push(`Qualité de source déclarée : ${pre.evidence}`);
  if (project.objective) facts.push(`Objectif de projet saisi : ${project.objective}`);
  const rows = pilot && Number(pilot.actualProspectRows);
  if (rows) facts.push(`Un fichier de ${rows.toLocaleString('fr-FR')} lignes de prospects est déclaré, sans audit du contenu.`);

  const hypotheses = [];
  if (/prescripteur|partenaire/i.test(a.public || '')) {
    hypotheses.push('Un parcours de mobilisation des prescripteurs pourrait soutenir l’acquisition, à valider après qualification des relations existantes.');
  }
  if (a.enjeu === 'Acquisition' && /client/i.test(a.public || '')) {
    hypotheses.push('Un programme de parrainage pourrait générer des recommandations clients, à condition de disposer d’une base de clients satisfaits.');
  }
  if (/engagement|visibilit/i.test(a.enjeu || '') || /partage|avis/i.test(a.action || '')) {
    hypotheses.push('Un parcours ambassadeur ne serait pertinent qu’avec des participants volontaires et des réalisations à partager.');
  }
  if (/fidélisation|incentive/i.test(a.enjeu || '') || /achat répété/i.test(a.action || '')) {
    hypotheses.push('Une opération de fidélité ou d’incentive pourrait être étudiée, sous réserve de connaître le panier moyen et la marge.');
  }
  hypotheses.push('Le diagnostic payant devra comparer les leviers possibles et mesurer leur potentiel sans garantir un résultat.');

  const missing = [];
  if (rows) missing.push(`Analyser le fichier des ${rows.toLocaleString('fr-FR')} lignes : doublons, provenance, ancienneté, segments, qualité et usages autorisés.`);
  if (/crm|fichier|base/i.test(a.donnees || '') || rows) missing.push('Vérifier l’origine des contacts, les mentions d’information et les règles de sollicitation par canal.');
  Object.keys(ANSWER_LABELS).forEach(k => { if (isUnknown(a[k])) missing.push(`Préciser : ${ANSWER_LABELS[k].toLowerCase()}.`); });
  missing.push(
    'Confirmer avec l’interlocuteur le problème prioritaire et les critères de réussite.',
    'Obtenir les volumes réels, taux de transformation, panier moyen, marge et capacité de suivi commercial.',
    'Identifier les interlocuteurs décisionnaires, le budget, le calendrier et les données accessibles.'
  );

  const angles = [];
  if (!isUnknown(a.enjeu)) angles.push(`${a.enjeu}${isUnknown(a.action) ? '' : ' / ' + a.action.toLowerCase()}`);
  if (/prescripteur/i.test(a.public || '')) angles.push('Prescription et suivi d’opportunités');

  const unknownCount = Object.keys(ANSWER_LABELS).filter(k => isUnknown(a[k])).length;
  const conclusion = unknownCount >= 3
    ? 'Informations insuffisantes : compléter le pré-diagnostic avant toute recommandation.'
    : 'Poursuivre par un cadrage approfondi ; aucun scénario économique fiable ni déploiement ne peut être validé sans données complémentaires.';

  const analysis = {
    id: newId('analysis'),
    projectId: project.id,
    createdAt: nowISO(),
    status: 'À valider',
    approvedBy: null, approvedAt: null, proof: null,
    content: { facts, hypotheses, missing, angles, conclusion, sourcePreId: pre.id, generatedBy: 'Moteur de règles local (sans IA)' },
  };
  DATA.crmAnalyses.push(analysis);
  logCrmEvent(project.orgId, project.id, 'Synthèse structurée créée', `Moteur de règles local, non IA · ${analysis.id}`);
  return analysis;
}

function proposalText(project, analysis, amount) {
  const org = DATA.organizations.find(o => o.id === project.orgId);
  const missing = (analysis.content.missing || []).map(m => `- ${m}`).join('\n');
  return `SAONA — PROPOSITION DE DIAGNOSTIC STRATÉGIQUE
Entreprise : ${org ? org.name : ''}
Projet : ${project.title}

Objet : analyser le capital relationnel et déterminer les leviers de croissance pertinents.

Périmètre proposé :
- Entretiens de cadrage et clarification des objectifs ;
- Audit des informations et communautés accessibles, sous réserve de fourniture des données ;
- Analyse des leviers et scénarios, avec hypothèses explicites ;
- Définition des KPI et du plan de mesure ;
- Rapport de diagnostic et réunion de restitution.

Prix du diagnostic : ${Number(amount).toLocaleString('fr-FR')} € HT (tarif de référence, à confirmer dans le devis signé).
Déduction éventuelle du diagnostic sur la mise en place : conditions à définir dans la proposition contractuelle.

Données à obtenir :
${missing}

Cette proposition est un brouillon interne ; aucun accord client, paiement ou engagement de déploiement n’est présumé.`;
}

/* ------------------------------------------------------------------ */
/* Navigation                                                          */
/* ------------------------------------------------------------------ */
const NAV = [
  ['Pilotage', [['dashboard', 'Tableau de bord'], ['tasks', 'Tâches'], ['projects', 'Projets'], ['events', 'Agenda']]],
  ['Commercial', [['prospects', 'Prospects'], ['campaigns', 'Campagnes'], ['crm', 'CRM'], ['preDiagnostics', 'Pré-diagnostics']]],
  ['Ressources', [['knowledge', 'Connaissances'], ['lessons', 'Académie'], ['academyProfiles', 'Profils académie']]],
  ['Système', [['data', 'Données']]],
];

function renderNav(active) {
  const counts = {
    tasks: DATA.tasks.filter(t => !t.done).length, projects: DATA.projects.length, events: DATA.events.length,
    prospects: DATA.prospects.length, campaigns: DATA.campaigns.length, crm: DATA.organizations.length,
    preDiagnostics: DATA.preDiagnostics.length, knowledge: DATA.knowledge.length, lessons: DATA.lessons.length,
    academyProfiles: DATA.academyProfiles.length,
  };
  $('#nav').innerHTML = NAV.map(([group, links]) => `
    <div class="nav-group"><div class="nav-group-title">${esc(group)}</div>
      ${links.map(([r, l]) => `<a class="nav-link ${active === r ? 'active' : ''}" href="#/${r}">${esc(l)}${counts[r] != null ? `<span class="nav-count">${counts[r]}</span>` : ''}</a>`).join('')}
    </div>`).join('');
}

function parseRoute() {
  const parts = (location.hash.replace(/^#\/?/, '') || 'dashboard').split('/').map(decodeURIComponent);
  return { name: parts[0], arg: parts[1] };
}

/* ------------------------------------------------------------------ */
/* Vues                                                                */
/* ------------------------------------------------------------------ */
const searchState = {};

function viewCollection(collKey) {
  const def = COLLECTIONS[collKey];
  const q = (searchState[collKey] || '').toLowerCase();
  let rows = DATA[collKey].slice();
  if (def.sort) rows.sort(def.sort);
  if (q) rows = rows.filter(r => JSON.stringify(r).toLowerCase().includes(q));
  const extraActions = collKey === 'preDiagnostics'
    ? r => `<a class="btn small ghost" href="#/pilot/${encodeURIComponent(r.id)}">Pilote</a>`
    : () => '';
  const head = def.columns.map(c => `<th>${esc(COLUMN_LABELS[c] || (fieldOf(collKey, c) || {}).label || c)}</th>`).join('');
  const body = rows.map(r => {
    const done = r.done || r.completed;
    return `<tr class="${done ? 'is-done' : ''}">${def.columns.map(c => `<td class="${c === 'title' || c === 'name' ? 'title-cell' : ''}">${renderCell(collKey, c, r)}</td>`).join('')}
      <td class="actions">${extraActions(r)} <button class="btn small ghost" data-edit="${esc(r.id)}">Modifier</button> <button class="btn small danger" data-del="${esc(r.id)}" aria-label="Supprimer">✕</button></td></tr>`;
  }).join('');
  return `
    <div class="toolbar">
      <input type="search" id="search" placeholder="Rechercher…" value="${esc(searchState[collKey] || '')}" aria-label="Rechercher">
      <button class="btn" id="addBtn">Ajouter</button>
    </div>
    <div class="table-wrap">${rows.length ? `<table><thead><tr>${head}<th></th></tr></thead><tbody>${body}</tbody></table>` : `<div class="empty">${q ? 'Aucun résultat.' : 'Aucun élément pour le moment.'}</div>`}</div>`;
}

function bindCollection(collKey) {
  const s = $('#search');
  if (s) s.addEventListener('input', e => {
    searchState[collKey] = e.target.value;
    const pos = e.target.selectionStart;
    render();
    const ns = $('#search'); ns.focus(); ns.setSelectionRange(pos, pos);
  });
  const add = $('#addBtn');
  if (add) add.addEventListener('click', () => openItemForm(collKey));
  bindRowActions(collKey, $('#view'));
}

function bindRowActions(collKey, root) {
  $$('[data-edit]', root).forEach(b => b.addEventListener('click', () => {
    openItemForm(collKey, DATA[collKey].find(x => String(x.id) === b.dataset.edit));
  }));
  $$('[data-del]', root).forEach(b => b.addEventListener('click', () => deleteItem(collKey, b.dataset.del)));
  $$('[data-toggle]', root).forEach(cb => cb.addEventListener('change', () => {
    const item = DATA[collKey].find(x => String(x.id) === cb.dataset.id);
    if (!item) return;
    setPath(item, cb.dataset.toggle, cb.checked);
    save();
    render();
  }));
}

function viewDashboard() {
  const openTasks = DATA.tasks.filter(t => !t.done);
  const high = openTasks.filter(t => t.priority === 'Haute');
  const today = todayLocal();
  const upcoming = DATA.events.filter(e => (e.date || '') >= today).sort(COLLECTIONS.events.sort).slice(0, 6);
  const avg = DATA.projects.length ? Math.round(DATA.projects.reduce((s, p) => s + (Number(p.progress) || 0), 0) / DATA.projects.length) : 0;
  const byStage = OPTIONS.prospectStage.map(s => [s, DATA.prospects.filter(p => p.stage === s).length]).filter(x => x[1]);
  const drafts = DATA.crmProposals.filter(p => p.status === 'Brouillon interne');
  const pendingAnalyses = DATA.crmAnalyses.filter(a => a.status !== 'Validé en interne');
  const lessonsDone = DATA.lessons.filter(l => l.completed).length;

  return `
    <div class="stats">
      <div class="stat"><div class="stat-value">${openTasks.length}</div><div class="stat-label">Tâches ouvertes (${high.length} haute priorité)</div></div>
      <div class="stat"><div class="stat-value">${avg} %</div><div class="stat-label">Avancement moyen des ${DATA.projects.length} projets</div></div>
      <div class="stat"><div class="stat-value">${DATA.prospects.length}</div><div class="stat-label">Prospects suivis</div></div>
      <div class="stat"><div class="stat-value">${DATA.strategicProjects.length}</div><div class="stat-label">Projets stratégiques CRM</div></div>
      <div class="stat"><div class="stat-value">${drafts.length}</div><div class="stat-label">Propositions en brouillon</div></div>
      <div class="stat"><div class="stat-value">${lessonsDone}/${DATA.lessons.length}</div><div class="stat-label">Modules académie terminés</div></div>
    </div>
    <div class="grid">
      <div class="card"><div class="card-head"><h2>Priorités</h2><a href="#/tasks" class="small">Toutes les tâches</a></div>
        ${high.length ? `<ul class="list">${high.map(t => `<li><div class="row"><span>${esc(t.title)}</span><span class="badge">${esc(t.owner)}</span></div><div class="small muted">${esc(t.project)}</div></li>`).join('')}</ul>` : '<p class="muted">Aucune tâche haute priorité ouverte.</p>'}
      </div>
      <div class="card"><div class="card-head"><h2>À venir</h2><a href="#/events" class="small">Agenda</a></div>
        ${upcoming.length ? `<ul class="list">${upcoming.map(e => `<li><div class="row"><strong>${esc(fmtDate(e.date))}${e.time ? ' · ' + esc(e.time) : ''}</strong><span class="badge">${esc(e.category)}</span></div><div>${esc(e.title)}</div>${e.notes ? `<div class="small muted">${esc(e.notes)}</div>` : ''}</li>`).join('')}</ul>` : '<p class="muted">Aucun événement à venir.</p>'}
      </div>
      <div class="card"><div class="card-head"><h2>Pipeline prospects</h2><a href="#/prospects" class="small">Prospects</a></div>
        ${byStage.length ? `<ul class="list">${byStage.map(([s, n]) => `<li class="row"><span>${esc(s)}</span><strong>${n}</strong></li>`).join('')}</ul>` : '<p class="muted">Aucun prospect.</p>'}
      </div>
      <div class="card"><div class="card-head"><h2>CRM — à traiter</h2><a href="#/crm" class="small">CRM</a></div>
        <ul class="list">
          ${DATA.strategicProjects.map(p => {
            const org = DATA.organizations.find(o => o.id === p.orgId);
            return `<li><div class="row"><a href="#/org/${encodeURIComponent(p.orgId)}">${esc(org ? org.name : p.orgId)}</a><span class="badge ${badgeClass(p.stage)}">${esc(p.stage)}</span></div><div class="small muted">${esc(p.nextAction)}</div></li>`;
          }).join('') || '<li class="muted">Aucun projet stratégique.</li>'}
        </ul>
        ${pendingAnalyses.length ? `<p class="small">${pendingAnalyses.length} analyse(s) en attente de validation.</p>` : ''}
      </div>
    </div>
    <div class="card"><div class="card-head"><h2>Projets</h2><a href="#/projects" class="small">Tous les projets</a></div>
      <ul class="list">${DATA.projects.map(p => `<li><div class="row"><strong>${esc(p.name)}</strong><span class="badge ${badgeClass(p.status)}">${esc(p.status)}</span></div><div class="row" style="flex-wrap:nowrap"><div class="progress" style="flex:1"><div style="width:${Number(p.progress) || 0}%"></div></div><span class="small">${Number(p.progress) || 0} %</span></div></li>`).join('') || '<li class="muted">Aucun projet.</li>'}</ul>
    </div>`;
}

function viewCrm() {
  const q = (searchState.crm || '').toLowerCase();
  const orgs = DATA.organizations.filter(o => !q || JSON.stringify(o).toLowerCase().includes(q));
  return `
    <div class="toolbar">
      <input type="search" id="search" placeholder="Rechercher une organisation…" value="${esc(searchState.crm || '')}" aria-label="Rechercher">
      <button class="btn" id="addBtn">Nouvelle organisation</button>
    </div>
    <div class="grid">${orgs.map(o => {
      const sps = DATA.strategicProjects.filter(p => p.orgId === o.id);
      const cts = DATA.crmContacts.filter(c => c.orgId === o.id);
      return `<a class="card" href="#/org/${encodeURIComponent(o.id)}" style="text-decoration:none;color:inherit;display:block">
        <div class="card-head"><h2>${esc(o.name)}</h2><span class="badge accent">${esc(o.relationship)}</span></div>
        <div class="small muted">${esc(o.sector)}</div>
        <p class="small">${esc(o.notes)}</p>
        <div class="small">${sps.length} projet(s) · ${cts.length} contact(s)</div>
      </a>`;
    }).join('') || '<div class="empty">Aucune organisation.</div>'}</div>`;
}

function bindCrm() {
  $('#search').addEventListener('input', e => {
    searchState.crm = e.target.value;
    const pos = e.target.selectionStart;
    render();
    const ns = $('#search'); ns.focus(); ns.setSelectionRange(pos, pos);
  });
  $('#addBtn').addEventListener('click', () => openItemForm('organizations'));
}

function analysisHtml(an) {
  const c = an.content || {};
  const list = (title, arr) => arr && arr.length ? `<h3 class="section-title">${title}</h3><ul>${arr.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : '';
  const validated = an.status === 'Validé en interne';
  return `<div class="card">
    <div class="card-head"><div><h3>Synthèse du ${esc(fmtDateTime(an.createdAt))}</h3><div class="small muted">${esc(c.generatedBy || '')}</div></div>
      <span class="badge ${badgeClass(an.status)}">${esc(an.status)}</span></div>
    ${list('Faits déclarés', c.facts)}${list('Hypothèses (à vérifier)', c.hypotheses)}${list('Informations manquantes', c.missing)}${list('Angles', c.angles)}
    ${c.conclusion ? `<h3 class="section-title">Conclusion</h3><p>${esc(c.conclusion)}</p>` : ''}
    ${validated ? `<p class="small muted">Validé par ${esc(an.approvedBy)} le ${esc(fmtDateTime(an.approvedAt))}${an.proof ? ` — « ${esc(an.proof)} »` : ''}</p>` : ''}
    <div class="row" style="justify-content:flex-end">
      ${validated ? `<button class="btn small" data-propose="${esc(an.id)}">Créer une proposition</button>` : `<button class="btn small" data-validate="${esc(an.id)}">Valider</button>`}
      <button class="btn small danger" data-del-analysis="${esc(an.id)}">Supprimer</button>
    </div>
  </div>`;
}

function proposalHtml(pr) {
  return `<div class="card">
    <div class="card-head"><div><h3>Proposition — ${esc(fmtMoney(pr.amountHT))}</h3><div class="small muted">Créée le ${esc(fmtDateTime(pr.createdAt))}</div></div>
      <select data-proposal-status="${esc(pr.id)}" aria-label="Statut" style="width:auto">${OPTIONS.proposalStatus.concat(OPTIONS.proposalStatus.includes(pr.status) ? [] : [pr.status]).map(s => `<option ${s === pr.status ? 'selected' : ''}>${esc(s)}</option>`).join('')}</select></div>
    <details><summary>Afficher le texte</summary><div class="pre">${esc(pr.text)}</div></details>
    <div class="row" style="justify-content:flex-end;margin-top:10px">
      <button class="btn small ghost" data-copy="${esc(pr.id)}">Copier le texte</button>
      <button class="btn small danger" data-del-proposal="${esc(pr.id)}">Supprimer</button>
    </div>
  </div>`;
}

function viewOrg(orgId) {
  const o = DATA.organizations.find(x => x.id === orgId);
  if (!o) return '<div class="empty">Organisation introuvable. <a href="#/crm">Retour au CRM</a></div>';
  const contacts = DATA.crmContacts.filter(c => c.orgId === o.id);
  const sps = DATA.strategicProjects.filter(p => p.orgId === o.id);
  const events = DATA.crmEvents.filter(e => e.orgId === o.id).sort((a, b) => String(b.at).localeCompare(String(a.at)));
  return `
    <p><a href="#/crm">← CRM</a></p>
    <div class="card">
      <div class="card-head"><h2>${esc(o.name)}</h2>
        <div class="row"><button class="btn small ghost" id="editOrg">Modifier</button><button class="btn small danger" id="delOrg">Supprimer</button></div></div>
      <dl class="kv">
        <dt>Relation</dt><dd>${esc(o.relationship)}</dd>
        <dt>Secteur</dt><dd>${esc(o.sector)}</dd>
        <dt>Notes</dt><dd>${esc(o.notes)}</dd>
        <dt>Source</dt><dd>${esc(o.source)}</dd>
        <dt>Créée le</dt><dd>${esc(fmtDateTime(o.createdAt))}</dd>
      </dl>
    </div>

    <div class="card" id="contactsCard">
      <div class="card-head"><h2>Contacts</h2><button class="btn small" id="addContact">Ajouter</button></div>
      ${contacts.length ? `<div class="table-wrap"><table><thead><tr><th>Nom</th><th>Fonction</th><th>E-mail</th><th>Téléphone</th><th></th></tr></thead><tbody>
        ${contacts.map(c => `<tr><td>${esc(c.name)}</td><td>${esc(c.role)}</td><td>${c.email ? `<a href="mailto:${esc(c.email)}">${esc(c.email)}</a>` : ''}</td><td>${esc(c.phone)}</td>
        <td class="actions"><button class="btn small ghost" data-edit="${esc(c.id)}">Modifier</button> <button class="btn small danger" data-del="${esc(c.id)}" aria-label="Supprimer">✕</button></td></tr>`).join('')}
      </tbody></table></div>` : '<p class="muted">Aucun contact.</p>'}
    </div>

    <div class="row" style="margin-top:22px"><h2>Projets stratégiques</h2><button class="btn small" id="addSp">Nouveau projet</button></div>
    ${sps.map(p => {
      const pre = DATA.preDiagnostics.find(x => x.id === p.preId);
      const analyses = DATA.crmAnalyses.filter(a => a.projectId === p.id);
      const proposals = DATA.crmProposals.filter(x => x.projectId === p.id);
      return `<div class="card" data-sp="${esc(p.id)}" style="margin-top:12px">
        <div class="card-head"><div><h2>${esc(p.title)}</h2><div class="small muted">Responsable : ${esc(p.owner)} · Source : ${esc(p.source)}</div></div>
          <span class="badge ${badgeClass(p.stage)}">${esc(p.stage)}</span></div>
        <dl class="kv">
          <dt>Objectif</dt><dd>${esc(p.objective)}</dd>
          <dt>Prochaine action</dt><dd>${esc(p.nextAction)}</dd>
          <dt>Pré-diagnostic</dt><dd>${pre ? `<a href="#/pilot/${encodeURIComponent(pre.id)}">${esc(pre.company)} — voir le pilote</a>` : '<span class="muted">Non lié</span>'}</dd>
        </dl>
        <div class="row" style="justify-content:flex-end;margin-top:12px">
          <button class="btn small" data-analyze="${esc(p.id)}" ${pre ? '' : 'disabled title="Liez un pré-diagnostic pour générer une synthèse"'}>Générer une synthèse</button>
          <button class="btn small ghost" data-edit-sp="${esc(p.id)}">Modifier</button>
          <button class="btn small danger" data-del-sp="${esc(p.id)}">Supprimer</button>
        </div>
        ${analyses.length ? `<h3 class="section-title">Analyses</h3>${analyses.map(analysisHtml).join('')}` : ''}
        ${proposals.length ? `<h3 class="section-title">Propositions</h3>${proposals.map(proposalHtml).join('')}` : ''}
      </div>`;
    }).join('') || '<p class="muted">Aucun projet stratégique.</p>'}

    <div class="card" style="margin-top:16px">
      <div class="card-head"><h2>Journal</h2></div>
      ${events.length ? `<ul class="list">${events.map(e => `<li><div class="row"><strong>${esc(e.type)}</strong><span class="small muted">${esc(fmtDateTime(e.at))}</span></div><div class="small">${esc(e.detail)}</div></li>`).join('')}</ul>` : '<p class="muted">Aucun événement.</p>'}
    </div>`;
}

function bindOrg(orgId) {
  const o = DATA.organizations.find(x => x.id === orgId);
  if (!o) return;
  $('#editOrg').addEventListener('click', () => openItemForm('organizations', o));
  $('#delOrg').addEventListener('click', () => {
    const blocker = COLLECTIONS.organizations.canDelete(o);
    if (blocker) { alert(blocker); return; }
    if (confirm(`Supprimer « ${o.name} » ?`)) {
      DATA.organizations = DATA.organizations.filter(x => x !== o);
      DATA.crmEvents = DATA.crmEvents.filter(e => e.orgId !== o.id);
      save(); location.hash = '#/crm';
    }
  });
  $('#addContact').addEventListener('click', () => openItemForm('crmContacts', null, { orgId }));
  bindRowActions('crmContacts', $('#contactsCard'));
  $('#addSp').addEventListener('click', () => openItemForm('strategicProjects', null, { orgId, owner: 'Sébastien' }));
  $$('[data-edit-sp]').forEach(b => b.addEventListener('click', () => openItemForm('strategicProjects', DATA.strategicProjects.find(p => p.id === b.dataset.editSp))));
  $$('[data-del-sp]').forEach(b => b.addEventListener('click', () => deleteItem('strategicProjects', b.dataset.delSp)));

  $$('[data-analyze]').forEach(b => b.addEventListener('click', () => {
    const p = DATA.strategicProjects.find(x => x.id === b.dataset.analyze);
    try {
      generateAnalysis(p);
      p.updatedAt = nowISO();
      save(); toast('Synthèse générée — à valider'); render();
    } catch (e) { alert(e.message); }
  }));

  $$('[data-validate]').forEach(b => b.addEventListener('click', () => {
    const an = DATA.crmAnalyses.find(a => a.id === b.dataset.validate);
    openModal('Valider la synthèse',
      fieldInput({ key: 'approvedBy', label: 'Validé par (initiales)', required: true }, '') +
      fieldInput({ key: 'proof', label: 'Commentaire de validation', type: 'textarea' }, ''),
      '<button type="button" class="btn ghost" data-close>Annuler</button><button type="submit" class="btn">Valider</button>',
      form => {
        an.status = 'Validé en interne';
        an.approvedBy = form.elements.approvedBy.value.trim();
        an.proof = form.elements.proof.value.trim();
        an.approvedAt = nowISO();
        const p = DATA.strategicProjects.find(x => x.id === an.projectId);
        logCrmEvent(p ? p.orgId : orgId, an.projectId, 'Analyse validée', `Par ${an.approvedBy} · ${an.id}`);
        save(); toast('Synthèse validée'); render();
      });
  }));

  $$('[data-propose]').forEach(b => b.addEventListener('click', () => {
    const an = DATA.crmAnalyses.find(a => a.id === b.dataset.propose);
    const p = DATA.strategicProjects.find(x => x.id === an.projectId);
    openModal('Créer une proposition de diagnostic',
      fieldInput({ key: 'amountHT', label: 'Montant du diagnostic (€ HT)', type: 'number', min: 0, required: true }, 690),
      '<button type="button" class="btn ghost" data-close>Annuler</button><button type="submit" class="btn">Créer le brouillon</button>',
      form => {
        const amount = Number(form.elements.amountHT.value) || 0;
        const pr = { id: newId('offer'), projectId: p.id, analysisId: an.id, status: 'Brouillon interne', amountHT: amount, createdAt: nowISO(), text: proposalText(p, an, amount) };
        DATA.crmProposals.push(pr);
        logCrmEvent(p.orgId, p.id, 'Proposition créée', `Brouillon diagnostic ${amount.toLocaleString('fr-FR')} € HT, non accepté`);
        save(); toast('Brouillon de proposition créé'); render();
      });
  }));

  $$('[data-del-analysis]').forEach(b => b.addEventListener('click', () => {
    const id = b.dataset.delAnalysis;
    const n = DATA.crmProposals.filter(p => p.analysisId === id).length;
    if (n) { alert(`${n} proposition(s) reposent sur cette analyse. Supprimez-les d’abord.`); return; }
    if (!confirm('Supprimer cette synthèse ?')) return;
    DATA.crmAnalyses = DATA.crmAnalyses.filter(a => a.id !== id);
    save(); render();
  }));

  $$('[data-proposal-status]').forEach(s => s.addEventListener('change', () => {
    const pr = DATA.crmProposals.find(x => x.id === s.dataset.proposalStatus);
    const p = DATA.strategicProjects.find(x => x.id === pr.projectId);
    pr.status = s.value;
    logCrmEvent(p ? p.orgId : orgId, pr.projectId, 'Statut de proposition modifié', `${pr.id} → ${pr.status}`);
    save(); toast('Statut mis à jour'); render();
  }));
  $$('[data-copy]').forEach(b => b.addEventListener('click', async () => {
    const pr = DATA.crmProposals.find(x => x.id === b.dataset.copy);
    try { await navigator.clipboard.writeText(pr.text); toast('Texte copié'); } catch { alert('Copie impossible dans ce navigateur.'); }
  }));
  $$('[data-del-proposal]').forEach(b => b.addEventListener('click', () => {
    if (!confirm('Supprimer cette proposition ?')) return;
    DATA.crmProposals = DATA.crmProposals.filter(x => x.id !== b.dataset.delProposal);
    save(); render();
  }));
}

function viewPilot(preId) {
  const pre = DATA.preDiagnostics.find(p => p.id === preId);
  if (!pre) return '<div class="empty">Pré-diagnostic introuvable. <a href="#/preDiagnostics">Retour</a></div>';
  const pilot = DATA.saonaPilots.find(p => p.preId === preId) || ensurePilot(pre);
  const done = pilot.done || {};
  const doneCount = PILOT_STEPS.filter(([k]) => done[k]).length;
  const sp = DATA.strategicProjects.find(p => p.preId === preId);
  const a = pre.answers || {};
  return `
    <p><a href="#/preDiagnostics">← Pré-diagnostics</a></p>
    <div class="card">
      <div class="card-head"><div><h2>${esc(pre.company)}</h2><div class="small muted">${esc(pre.contact)} · mis à jour le ${esc(fmtDateTime(pre.updatedAt))}</div></div>
        <div class="row"><span class="badge">${esc(pre.evidence)}</span><button class="btn small ghost" id="editPre">Modifier</button></div></div>
      <dl class="kv">
        ${Object.keys(ANSWER_LABELS).map(k => `<dt>${esc(ANSWER_LABELS[k])}</dt><dd>${isUnknown(a[k]) ? `<span class="muted">${esc(a[k] || '—')}</span>` : esc(a[k])}</dd>`).join('')}
        <dt>Contexte</dt><dd style="white-space:pre-wrap">${esc(pre.context) || '<span class="muted">—</span>'}</dd>
        ${pre.notes ? `<dt>Notes</dt><dd>${esc(pre.notes)}</dd>` : ''}
      </dl>
      <div class="row" style="justify-content:flex-end;margin-top:12px">
        ${sp ? `<a class="btn small ghost" href="#/org/${encodeURIComponent(sp.orgId)}">Voir le projet CRM</a>` : '<button class="btn small" id="linkCrm">Créer le projet CRM</button>'}
      </div>
    </div>
    <div class="card">
      <div class="card-head"><h2>Pilote de mise en place</h2><span class="small">${doneCount}/${PILOT_STEPS.length} étapes</span></div>
      <div class="progress" style="margin-bottom:14px"><div style="width:${Math.round(doneCount / PILOT_STEPS.length * 100)}%"></div></div>
      <div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(220px,1fr))">
        <div class="field"><label for="pDecision">Décision</label><select id="pDecision">${OPTIONS.pilotDecision.concat(OPTIONS.pilotDecision.includes(pilot.decision) ? [] : [pilot.decision]).map(d => `<option ${d === pilot.decision ? 'selected' : ''}>${esc(d)}</option>`).join('')}</select></div>
        <div class="field"><label for="pRows">Lignes de prospects déclarées</label><input type="number" min="0" id="pRows" value="${pilot.actualProspectRows ?? ''}"></div>
      </div>
      <div class="checklist">${PILOT_STEPS.map(([k, l]) => `<label><input type="checkbox" data-step="${k}" ${done[k] ? 'checked' : ''}> ${esc(l)}</label>`).join('')}</div>
      <div class="field" style="margin-top:12px"><label for="pNotes">Notes</label><textarea id="pNotes">${esc(pilot.notes)}</textarea></div>
      <p class="small muted">Les modifications sont enregistrées automatiquement.</p>
    </div>`;
}

function bindPilot(preId) {
  const pre = DATA.preDiagnostics.find(p => p.id === preId);
  if (!pre) return;
  const pilot = DATA.saonaPilots.find(p => p.preId === preId);
  const touch = () => { pilot.updatedAt = nowISO(); save(); };
  $('#editPre').addEventListener('click', () => openItemForm('preDiagnostics', pre));
  $('#pDecision').addEventListener('change', e => { pilot.decision = e.target.value; touch(); toast('Décision enregistrée'); });
  $('#pRows').addEventListener('change', e => { pilot.actualProspectRows = e.target.value === '' ? null : Number(e.target.value); touch(); toast('Enregistré'); });
  $('#pNotes').addEventListener('change', e => { pilot.notes = e.target.value; touch(); toast('Notes enregistrées'); });
  $$('[data-step]').forEach(cb => cb.addEventListener('change', () => {
    pilot.done = Object.assign(Object.fromEntries(PILOT_STEPS.map(([k]) => [k, false])), pilot.done || {});
    pilot.done[cb.dataset.step] = cb.checked;
    pilot.stage = PILOT_STEPS.filter(([k]) => pilot.done[k]).length;
    touch(); render();
  }));
  const link = $('#linkCrm');
  if (link) link.addEventListener('click', () => {
    let org = DATA.organizations.find(o => o.name.trim().toLowerCase() === pre.company.trim().toLowerCase());
    if (!org) {
      org = { id: newId('org'), name: pre.company, relationship: 'Prospect', sector: 'À compléter', notes: '', source: 'Pré-diagnostic', createdAt: nowISO() };
      DATA.organizations.push(org);
    }
    if (pre.contact && !DATA.crmContacts.some(c => c.orgId === org.id && c.name.toLowerCase() === pre.contact.toLowerCase())) {
      DATA.crmContacts.push({ id: newId('ct'), orgId: org.id, name: pre.contact, role: 'Interlocuteur', email: '', phone: '' });
    }
    const sp = {
      id: newId('sp'), orgId: org.id, title: 'Programme de croissance relationnelle', stage: 'Pré-diagnostic',
      objective: isUnknown(pre.answers && pre.answers.enjeu) ? 'À identifier' : `${pre.answers.enjeu} ; hypothèses à vérifier`,
      owner: 'Sébastien', nextAction: 'Compléter et vérifier les informations du pré-diagnostic', source: 'Pré-diagnostic',
      preId: pre.id, createdAt: nowISO(), updatedAt: nowISO(), priceDiagnosis: null, approval: null,
    };
    DATA.strategicProjects.push(sp);
    logCrmEvent(org.id, sp.id, 'Projet créé', `Depuis le pré-diagnostic ${pre.id}`);
    save();
    location.hash = `#/org/${encodeURIComponent(org.id)}`;
  });
}

function viewData() {
  const rows = COLLECTION_KEYS.map(k => `<tr><td>${esc(k)}</td><td>${DATA[k].length}</td></tr>`).join('');
  const extra = Object.keys(DATA).filter(k => !COLLECTION_KEYS.includes(k));
  return `
    <div class="grid">
      <div class="card stack">
        <h2>Importer une sauvegarde</h2>
        <p class="small muted">Fichier JSON exporté par ${APP_NAME}. L’import remplace toutes les données présentes dans ce navigateur.</p>
        <input type="file" id="importFile" accept="application/json,.json">
      </div>
      <div class="card stack">
        <h2>Exporter</h2>
        <p class="small muted">Télécharge l’intégralité des données au même format.</p>
        <button class="btn" id="exportBtn2">Exporter la sauvegarde</button>
      </div>
      <div class="card stack">
        <h2>Réinitialiser</h2>
        <p class="small muted">Efface toutes les données stockées dans ce navigateur. Exportez d’abord.</p>
        <button class="btn danger" id="resetBtn">Tout effacer</button>
      </div>
    </div>
    <div class="card">
      <h2>Contenu</h2>
      <p class="small muted">Les données sont stockées uniquement dans ce navigateur (localStorage). Aucune donnée n’est envoyée à un serveur.</p>
      <div class="table-wrap"><table><thead><tr><th>Collection</th><th>Éléments</th></tr></thead><tbody>${rows}</tbody></table></div>
      ${extra.length ? `<p class="small muted">Clés supplémentaires conservées telles quelles : ${extra.map(esc).join(', ')}</p>` : ''}
    </div>`;
}

function bindData() {
  $('#importFile').addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    if (!confirm('Remplacer toutes les données actuelles par ce fichier ?')) { e.target.value = ''; return; }
    const reader = new FileReader();
    reader.onload = () => {
      try { importBackup(reader.result); toast('Sauvegarde importée'); render(); } catch (err) { alert(err.message); }
      e.target.value = '';
    };
    reader.readAsText(file, 'utf-8');
  });
  $('#exportBtn2').addEventListener('click', exportBackup);
  $('#resetBtn').addEventListener('click', () => {
    if (!confirm('Effacer définitivement toutes les données de ce navigateur ?')) return;
    DATA = emptyData(); save(); toast('Données effacées'); render();
  });
}

/* ------------------------------------------------------------------ */
/* Routeur                                                             */
/* ------------------------------------------------------------------ */
const TITLES = { dashboard: 'Tableau de bord', crm: 'CRM', org: 'CRM — organisation', pilot: 'Pré-diagnostic et pilote', data: 'Données' };

function render() {
  const { name, arg } = parseRoute();
  const navName = name === 'org' ? 'crm' : name === 'pilot' ? 'preDiagnostics' : name;
  renderNav(navName);
  const view = $('#view');
  let title = TITLES[name] || (COLLECTIONS[name] && COLLECTIONS[name].label) || 'Introuvable';
  if (name === 'dashboard') { view.innerHTML = viewDashboard(); }
  else if (name === 'crm') { view.innerHTML = viewCrm(); bindCrm(); }
  else if (name === 'org') {
    view.innerHTML = viewOrg(arg); bindOrg(arg);
    const o = DATA.organizations.find(x => x.id === arg); if (o) title = o.name;
  }
  else if (name === 'pilot') { view.innerHTML = viewPilot(arg); bindPilot(arg); }
  else if (name === 'data') { view.innerHTML = viewData(); bindData(); }
  else if (COLLECTIONS[name]) { view.innerHTML = viewCollection(name); bindCollection(name); }
  else { view.innerHTML = '<div class="empty">Page introuvable. <a href="#/dashboard">Tableau de bord</a></div>'; }
  $('#pageTitle').textContent = title;
  document.title = `${title} · SAONA Workspace`;
  $('#sidebar').classList.remove('open');
}

/* ------------------------------------------------------------------ */
/* Démarrage                                                           */
/* ------------------------------------------------------------------ */
function init() {
  load();
  $('#modalForm').addEventListener('submit', e => {
    e.preventDefault();
    const form = e.target;
    if (!form.checkValidity()) { form.reportValidity(); return; }
    const handler = modalHandler;
    closeModal();
    if (handler) handler(form);
  });
  $('#modal').addEventListener('click', e => { if (e.target.matches('[data-close]')) closeModal(); });
  $('#modalClose').addEventListener('click', closeModal);
  $('#exportBtn').addEventListener('click', exportBackup);
  $('#menuBtn').addEventListener('click', () => $('#sidebar').classList.toggle('open'));
  window.addEventListener('hashchange', render);
  if (!COLLECTION_KEYS.some(k => DATA[k].length) && !location.hash) location.hash = '#/data';
  render();
}

document.addEventListener('DOMContentLoaded', init);
