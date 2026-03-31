
// ── DATA STORE ────────────────────────────────────
const SERVICES = [
  { id: 'N', name: 'Neurología', color: '#3B72F2' },
  { id: 'P', name: 'Psiquiatría', color: '#8B5CF6' },
  { id: 'K', name: 'Kinesiología', color: '#F97316' },
  { id: 'G', name: 'General', color: '#22C55E' },
  { id: 'A', name: 'General', color: '#22C55E' },
  { id: 'B', name: 'General', color: '#22C55E' },
  { id: 'C', name: 'Kinesiología', color: '#F97316' },
  { id: 'L', name: 'Laboratorio', color: '#F59E0B' },
];

function getSvcColor(prefix) {
  const s = SERVICES.find(x => x.id === prefix);
  return s ? s.color : '#3B72F2';
}
function getSvcName(prefix) {
  const map = {N:'Neurología', P:'Psiquiatría', K:'Kinesiología', G:'General', A:'General', B:'General', C:'Kinesiología', L:'Laboratorio'};
  return map[prefix] || 'General';
}

// ── TIMING HELPERS ────────────────────────────────
function nowTs() { return Date.now(); }
function tsToHHMM(ts) {
  if (!ts || isNaN(Number(ts))) return '—';
  const d = new Date(Number(ts));
  if (isNaN(d.getTime())) return '—';
  try { return d.toLocaleTimeString('es-CO', {hour:'2-digit', minute:'2-digit'}); }
  catch(_) { return d.toLocaleTimeString(undefined, {hour:'2-digit', minute:'2-digit'}); }
}
function fmtHHMM(date) {
  try { return date.toLocaleTimeString('es-CO', {hour:'2-digit', minute:'2-digit'}); }
  catch(_) { const h=date.getHours(), m=date.getMinutes(); return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`; }
}
function fmtDateTV(date) {
  try { return date.toLocaleDateString('es-CO', {weekday:'long', day:'numeric', month:'long'}); }
  catch(_) {
    const days=['édomingo','lunes','martes','miércoles','jueves','viernes','sábado'];
    const months=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
    return `${days[date.getDay()]}, ${date.getDate()} de ${months[date.getMonth()]}`;
  }
}
function msBetween(a, b) { return b - a; }
// HTML-escape helper — prevents XSS when injecting user-supplied strings into innerHTML
function esc(s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
function fmtDuration(ms) {
  if (!ms || ms < 0) return '—';
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${m%60}m`;
  if (m > 0) return `${m}m ${s%60}s`;
  return `${s}s`;
}
function fmtMMSS(ms) {
  if (!ms || ms < 0) return '00:00';
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
}
// Build default timestamps relative to now so timers work on fresh load
function makeTs(minutesAgo) { return Date.now() - minutesAgo * 60000; }

const DEFAULT_TURNOS = [
  { id:'A-104', patient:'Ricardo M. Valdivia', doc:'4821', estado:'Llamando', modulo:'Módulo 05', service:'Módulo 1',
    tsCreated: makeTs(42), tsLlamado: makeTs(3), tsAtendido: null, tsFin: null },
  { id:'B-201', patient:'Elena Rodríguez', doc:'3902', estado:'Atendiendo', modulo:'Módulo 02', service:'Módulo 2',
    tsCreated: makeTs(55), tsLlamado: makeTs(14), tsAtendido: makeTs(13), tsFin: null },
  { id:'L-054', patient:'Carlos Méndez', doc:'1154', estado:'En fila', modulo:'—', service:'Módulo 3',
    tsCreated: makeTs(38), tsLlamado: null, tsAtendido: null, tsFin: null },
  { id:'A-103', patient:'Sofía Hernanz', doc:'8827', estado:'Finalizado', modulo:'Módulo 05', service:'Módulo 1',
    tsCreated: makeTs(90), tsLlamado: makeTs(52), tsAtendido: makeTs(50), tsFin: makeTs(35) },
  { id:'G-012', patient:'Juan P. Duarte', doc:'0023', estado:'En fila', modulo:'—', service:'Módulo 2',
    tsCreated: makeTs(30), tsLlamado: null, tsAtendido: null, tsFin: null },
  { id:'A-108', patient:'Marina Torres', doc:'9028', estado:'En fila', modulo:'—', service:'Módulo 3',
    tsCreated: makeTs(22), tsLlamado: null, tsAtendido: null, tsFin: null },
  { id:'B-205', patient:'Sergio Ruiz', doc:'5541', estado:'En fila', modulo:'—', service:'Módulo 4',
    tsCreated: makeTs(17), tsLlamado: null, tsAtendido: null, tsFin: null },
  { id:'N-402', patient:'Pedro Alvarado', doc:'7731', estado:'Finalizado', modulo:'Módulo 04', service:'Módulo 1',
    tsCreated: makeTs(110), tsLlamado: makeTs(73), tsAtendido: makeTs(71), tsFin: makeTs(48) },
  { id:'K-115', patient:'Laura Gómez', doc:'6612', estado:'Llamando', modulo:'Módulo 01', service:'Módulo 2',
    tsCreated: makeTs(28), tsLlamado: makeTs(2), tsAtendido: null, tsFin: null },
  { id:'P-089', patient:'Fernando Ríos', doc:'3310', estado:'Cancelado', modulo:'Módulo 07', service:'Módulo 3',
    tsCreated: makeTs(80), tsLlamado: makeTs(40), tsAtendido: null, tsFin: makeTs(39) },
  { id:'G-551', patient:'Marta Villanueva', doc:'9982', estado:'Finalizado', modulo:'Módulo 02', service:'Módulo 4',
    tsCreated: makeTs(95), tsLlamado: makeTs(60), tsAtendido: makeTs(58), tsFin: makeTs(40) },
  { id:'A-102', patient:'Juan Pérez', doc:'1100', estado:'Finalizado', modulo:'Módulo 01', service:'Módulo 1',
    tsCreated: makeTs(140), tsLlamado: makeTs(120), tsAtendido: makeTs(119), tsFin: makeTs(100) },
  { id:'B-205', patient:'María García', doc:'4450', estado:'Finalizado', modulo:'Módulo 03', service:'Psiquiatría',
    tsCreated: makeTs(105), tsLlamado: makeTs(75), tsAtendido: makeTs(73), tsFin: makeTs(55) },
  { id:'C-044', patient:'Carlos Rodríguez', doc:'2218', estado:'Cancelado', modulo:'Módulo 02', service:'Kinesiología',
    tsCreated: makeTs(62), tsLlamado: null, tsAtendido: null, tsFin: makeTs(60) },
  { id:'A-109', patient:'Ricardo Gómez', doc:'3371', estado:'Finalizado', modulo:'Módulo 01', service:'Neurología',
    tsCreated: makeTs(78), tsLlamado: makeTs(42), tsAtendido: makeTs(40), tsFin: makeTs(20) },
];

// Computed helpers
function getWaitTime(t) {
  if (!t.tsCreated || t.tsCreated <= 0) return 0;
  // Tiempo de espera: desde creación hasta que fue atendido (fijo) o hasta ahora si sigue esperando
  if (t.tsAtendido) return msBetween(t.tsCreated, t.tsAtendido);
  if (t.tsFin)      return msBetween(t.tsCreated, t.tsFin);
  // Llamando: ya fue llamado, mostrar tiempo de espera fijo hasta ese momento
  if (t.tsLlamado)  return msBetween(t.tsCreated, t.tsLlamado);
  return msBetween(t.tsCreated, nowTs());
}
function getServiceTime(t) {
  if (!t.tsAtendido) return null;
  const end = t.tsFin || nowTs();
  return msBetween(t.tsAtendido, end);
}
function getTotalTime(t) {
  if (!t.tsCreated) return null;
  const end = t.tsFin || nowTs();
  return msBetween(t.tsCreated, end);
}

const DEFAULT_USERS = [
  { name:'Dr. Julian Rossi',   username:'admin',    password:'1234', role:'Administrador',  email:'j.rossi@neurocoop.com',    modulo:'Módulo 01', active:true,  color:'#3B72F2' },
  { name:'Dra. Ana Torres',    username:'atores',   password:'1234', role:'Médico',          email:'a.torres@neurocoop.com',   modulo:'Módulo 02', active:true,  color:'#8B5CF6' },
  { name:'Enf. Pedro Lima',    username:'plima',    password:'1234', role:'Enfermero',       email:'p.lima@neurocoop.com',     modulo:'Módulo 03', active:true,  color:'#22C55E' },
  { name:'Dr. Marco Silva',    username:'msilva',   password:'1234', role:'Médico',          email:'m.silva@neurocoop.com',    modulo:'Sin módulo',active:false, color:'#F97316' },
  { name:'Rec. Julia Méndez',  username:'jmendez',  password:'1234', role:'Recepcionista',   email:'j.mendez@neurocoop.com',   modulo:'Sin módulo',active:true,  color:'#F59E0B' },
  { name:'Adm. Luis García',   username:'lgarcia',  password:'1234', role:'Administrativo',  email:'l.garcia@neurocoop.com',   modulo:'Sin módulo',active:true,  color:'#EF4444' },
];

const DEFAULT_SERVICIOS = [
  { id:'SVC-01', name:'Neurología', prefix:'N', modulos:3, turnos:42, active:true },
  { id:'SVC-02', name:'Psiquiatría', prefix:'P', modulos:2, turnos:28, active:true },
  { id:'SVC-03', name:'Kinesiología', prefix:'K', modulos:2, turnos:35, active:true },
  { id:'SVC-04', name:'General', prefix:'G', modulos:4, turnos:58, active:true },
  { id:'SVC-05', name:'Laboratorio', prefix:'L', modulos:1, turnos:19, active:false },
];

// ══════════════════════════════════════════════════
//  NeuroTurn v2.0 — Cliente API + SSE
// ══════════════════════════════════════════════════

// ── API base ──────────────────────────────────────
const API = {
  base: window.location.origin,

  async req(method, path, body, token) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = 'Bearer ' + token;
    const res = await fetch(this.base + path, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  },

  get(path)         { return this.req('GET',    path, null, getToken()); },
  post(path, body)  { return this.req('POST',   path, body, getToken()); },
  patch(path, body) { return this.req('PATCH',  path, body, getToken()); },
  postAuth(path, b) { return this.req('POST',   path, b, null); },
};

// ── Token JWT ─────────────────────────────────────
function getToken()   { return sessionStorage.getItem('nt_token') || ''; }
function setToken(t)  { sessionStorage.setItem('nt_token', t); }
function clearToken() { sessionStorage.removeItem('nt_token'); }

// ── Estado en memoria (sincronizado desde la API) ─
let state = {
  turnos:   [],
  servicios: [],
  modulos:  [],
  users:    [],
  counter:  100,
};

// Guarda datos NO críticos localmente (configuración UI, notificaciones)
function savePref(key, val) {
  try { localStorage.setItem('nt_pref_' + key, JSON.stringify(val)); } catch(_) {}
}
function loadPref(key, def) {
  try { const v = localStorage.getItem('nt_pref_' + key); return v ? JSON.parse(v) : def; } catch(_) { return def; }
}

// ── Auth ───────────────────────────────────────────
let currentUser = null;

// ── Funciones del modal de registro ──────────────
function abrirRegistro() {
  // Limpiar campos y mensajes
  ['reg-nombre','reg-username','reg-password','reg-email','reg-admin-key'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  const rolEl = document.getElementById('reg-rol');
  if (rolEl) rolEl.value = 'Recepcionista';
  const modEl = document.getElementById('reg-modulo');
  if (modEl) modEl.value = 'Sin módulo';
  document.getElementById('reg-error').textContent = '';
  document.getElementById('reg-success').style.display = 'none';
  const btn = document.getElementById('btn-reg-submit');
  if (btn) { btn.disabled = false; btn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="display:inline;vertical-align:middle;margin-right:5px;margin-top:-2px"><polyline points="20 6 9 17 4 12"/></svg> Crear cuenta'; }
  document.getElementById('registro-overlay').classList.add('open');
  setTimeout(() => { const el = document.getElementById('reg-nombre'); if(el) el.focus(); }, 100);
}

function cerrarRegistro() {
  document.getElementById('registro-overlay').classList.remove('open');
}

// Cerrar con Escape
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') cerrarRegistro();
});

function setAuthError(id, msg) {
  const el = document.getElementById(id);
  if (el) { el.textContent = msg; setTimeout(() => { if(el.textContent===msg) el.textContent = ''; }, 6000); }
}

function setLoginLoading(loading) {
  const btn = document.getElementById('btn-login');
  if (!btn) return;
  btn.disabled = loading;
  btn.innerHTML = loading
    ? 'Verificando...'
    : '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" style="display:inline;vertical-align:middle;margin-right:6px;margin-top:-2px"><path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>Iniciar sesión';
}

async function login() {
  const username = document.getElementById('auth-username')?.value.trim();
  const password = document.getElementById('auth-password')?.value;
  if (!username || !password) { setAuthError('auth-error', 'Ingresa usuario y contraseña'); return; }

  setLoginLoading(true);
  try {
    const data = await API.postAuth('/api/auth/login', { username, password });
    setToken(data.token);
    currentUser = data.usuario || data.user;
    onLoginSuccess();
  } catch(e) {
    setAuthError('auth-error', e.message || 'Error al iniciar sesión');
  } finally {
    setLoginLoading(false);
  }
}

async function registrarUsuario() {
  const nombre    = document.getElementById('reg-nombre')?.value.trim();
  const username  = document.getElementById('reg-username')?.value.trim().toLowerCase();
  const password  = document.getElementById('reg-password')?.value;
  const email     = document.getElementById('reg-email')?.value.trim();
  const rol       = document.getElementById('reg-rol')?.value;
  const modulo    = document.getElementById('reg-modulo')?.value;
  const admin_key = document.getElementById('reg-admin-key')?.value;

  if (!nombre)    { setAuthError('reg-error', 'El nombre completo es obligatorio'); return; }
  if (!username)  { setAuthError('reg-error', 'El nombre de usuario es obligatorio'); return; }
  if (!password)  { setAuthError('reg-error', 'La contraseña es obligatoria'); return; }
  if (password.length < 6) { setAuthError('reg-error', 'La contraseña debe tener al menos 6 caracteres'); return; }
  if (!admin_key) { setAuthError('reg-error', 'La clave de administrador es obligatoria'); return; }

  const btn = document.getElementById('btn-reg-submit');
  if (btn) { btn.disabled = true; btn.textContent = 'Creando cuenta...'; }
  document.getElementById('reg-error').textContent = '';

  try {
    await API.postAuth('/api/auth/registro', { nombre, username, password, email, rol, modulo, admin_key });

    // Mostrar mensaje de éxito en el modal
    document.getElementById('reg-success-msg').textContent = `¡Listo! "${username}" puede iniciar sesión ahora.`;
    document.getElementById('reg-success').style.display = 'flex';
    if (btn) { btn.disabled = true; btn.textContent = '✓ Cuenta creada'; btn.style.background = '#15803D'; }

    // Cerrar modal después de 2 segundos
    setTimeout(() => {
      cerrarRegistro();
      showToast(`Usuario "${nombre.split(' ')[0]}" registrado correctamente`, 'success');
    }, 2000);

  } catch(e) {
    setAuthError('reg-error', e.message || 'Error al crear la cuenta');
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="display:inline;vertical-align:middle;margin-right:5px;margin-top:-2px"><polyline points="20 6 9 17 4 12"/></svg> Crear cuenta';
    }
  }
}

// Compatibilidad con código viejo que llame mostrarLogin / mostrarRegistro
function mostrarLogin() {
  const authScreen = document.getElementById('auth-screen');
  const appDiv = document.getElementById('app');
  if (authScreen) authScreen.style.display = 'flex';
  if (appDiv) appDiv.style.display = 'none';
}
function mostrarRegistro() { abrirRegistro(); }

async function onLoginSuccess() {
  document.getElementById('auth-screen').style.display = 'none';
  document.getElementById('app').style.display = 'block';

  // Update sidebar
  const nombre = currentUser.nombre || currentUser.name || 'Usuario';
  const initials = nombre.split(' ').map(x => x[0]).join('').slice(0, 2).toUpperCase();
  const avatarEl = document.getElementById('sidebar-avatar');
  const nameEl   = document.getElementById('sidebar-user-name');
  const roleEl   = document.getElementById('sidebar-user-role');
  if (avatarEl) { avatarEl.textContent = initials; avatarEl.style.background = currentUser.color || '#3B72F2'; }
  if (nameEl) nameEl.textContent = nombre;
  if (roleEl) roleEl.textContent = (currentUser.rol || 'Recepcionista') + (currentUser.modulo && currentUser.modulo !== 'Sin módulo' ? ' · ' + currentUser.modulo : '');

  // Cargar datos iniciales
  await cargarDatos();
  iniciarSSE();
  loadMiModulo();
  addNotif('sistema', `Sesión iniciada — ${nombre.split(' ').slice(0,2).join(' ')}`, `${state.turnos.filter(t=>t.estado==='En fila').length} turno(s) en espera`);
  navTo('inicio');
}

function logout() {
  clearToken();
  currentUser = null;
  if (sseSource) { sseSource.close(); sseSource = null; }
  document.getElementById('auth-screen').style.display = 'flex';
  document.getElementById('app').style.display = 'none';
  mostrarLogin();
  document.getElementById('auth-username').value = '';
  document.getElementById('auth-password').value = '';
}

// ── Carga inicial de datos desde la API ───────────
async function cargarDatos() {
  try {
    const [tRes, sRes, mRes, uRes] = await Promise.all([
      API.get('/api/turnos'),
      API.get('/api/servicios'),
      API.get('/api/modulos'),
      API.get('/api/usuarios'),
    ]);
    state.turnos   = (tRes.turnos   || []).map(normalizarTurno);
    state.servicios = sRes.servicios || [];
    state.modulos  = mRes.modulos   || [];
    state.users    = uRes.usuarios  || [];
  } catch(e) {
    console.warn('cargarDatos error:', e.message);
    showToast('Modo sin conexión — los datos pueden estar desactualizados', 'error');
  }
}

// Normaliza campos de la API (snake_case → camelCase compatible con render)
function normalizarTurno(t) {
  return {
    id:           t.codigo   || String(t.id),
    codigo:       t.codigo   || String(t.id),
    dbId:         t.id,
    patient:      t.paciente || t.patient,
    doc:          t.documento || t.doc || '',
    service:      t.servicio || t.service,
    modulo:       t.modulo   || '—',
    estado:       t.estado,
    atendidoPor:  t.atendido_por   || t.atendidoPor  || null,
    registradoPor: t.registrado_por || t.registradoPor || null,
    nota:         t.nota || null,
    tsCreated:    t.ts_creado   || t.tsCreated  || null,
    tsLlamado:    t.ts_llamado  || t.tsLlamado  || null,
    tsAtendido:   t.ts_atendido || t.tsAtendido || null,
    tsFin:        t.ts_fin      || t.tsFin      || null,
  };
}

// tCode(t) — devuelve el código visible del turno (e.g. "N-101")
// Compatible tanto con datos de API (t.codigo) como con datos legados (t.id como string)
function tCode(t) {
  return t.codigo || t.id || '—';
}

// ── SSE — Tiempo real ─────────────────────────────
let sseSource = null;
let sseReconnectTimer = null;

function iniciarSSE() {
  if (sseSource) sseSource.close();
  sseSource = new EventSource('/events');

  sseSource.onmessage = (e) => {
    try {
      const msg = JSON.parse(e.data);
      onSSEMessage(msg);
    } catch(_) {}
  };

  sseSource.onerror = () => {
    sseSource.close();
    // Reconectar en 5s
    clearTimeout(sseReconnectTimer);
    sseReconnectTimer = setTimeout(() => {
      if (currentUser) iniciarSSE();
    }, 5000);
  };
}

function onSSEMessage(msg) {
  if (msg.tipo === 'conectado') return;

  if (msg.tipo === 'turno_nuevo' && msg.turno) {
    const t = normalizarTurno(msg.turno);
    const existing = state.turnos.findIndex(x => x.dbId === t.dbId);
    if (existing < 0) state.turnos.push(t);
    addNotif('turno', `Nuevo turno ${t.codigo}`, `${t.patient} · ${t.service}`);
  }

  if ((msg.tipo === 'turno_actualizado' || msg.tipo === 'turno_llamado') && msg.turno) {
    const t = normalizarTurno(msg.turno);
    const idx = state.turnos.findIndex(x => x.dbId === t.dbId);
    if (idx >= 0) {
      state.turnos[idx] = { ...state.turnos[idx], ...t };
    } else {
      state.turnos.push(t);
    }
    if (msg.tipo === 'turno_llamado') {
      showTVCallBanner(state.turnos.find(x => x.dbId === t.dbId));
      addNotif('llamado', `Turno ${t.codigo} llamado`, `→ ${t.modulo} · Por: ${t.atendidoPor?.split(' ').slice(0,2).join(' ') || '—'}`);
    }
  }

  // Re-renderizar la página activa
  const activePage = document.querySelector('.page.active')?.id?.replace('page-', '');
  if (activePage) renderPage(activePage);
  // Actualizar TV fullscreen si está abierta (sin delay)
  _renderTVNow();
}

// ── Nuevo turno (llama a la API) ──────────────────
async function crearNuevoTurno() {
  const paciente  = document.getElementById('new-turno-name')?.value.trim();
  const documento = document.getElementById('new-turno-doc')?.value.trim();
  const servicio  = document.getElementById('new-turno-svc')?.value;
  if (!paciente || !servicio) { showToast('Nombre y servicio son obligatorios', 'error'); return; }

  try {
    const data = await API.post('/api/turnos', { paciente, documento, servicio });
    const t = normalizarTurno(data.turno);
    if (state.turnos.findIndex(x => x.dbId === t.dbId) < 0) state.turnos.push(t);
    closeModal('modal-nuevo-turno');
    renderTurnos(); renderInicio();
    showToast(`✅ Turno ${t.codigo} creado — ${paciente}`, 'success');
    addNotif('turno', `Turno ${t.codigo} creado`, `${paciente} · ${servicio}`);
  } catch(e) {
    showToast('Error al crear turno: ' + e.message, 'error');
  }
}

// ── Llamar siguiente turno (Panel — vía API) ───────
let moduloPaused = false;

async function siguienteTurno() {
  if (moduloPaused) { showToast('⏸ Módulo en pausa', 'error'); return; }
  const waiting = state.turnos.filter(t => t.estado === 'En fila');
  if (!waiting.length) { showToast('No hay turnos en espera'); return; }
  try {
    const data = await API.post('/api/turnos/siguiente', {});
    if (!data.ok) { showToast(data.mensaje || 'No hay turnos en espera'); return; }
    const t = normalizarTurno(data.turno);
    const idx = state.turnos.findIndex(x => x.dbId === t.dbId);
    if (idx >= 0) state.turnos[idx] = { ...state.turnos[idx], ...t };
    else state.turnos.push(t);
    renderPanel(); renderDashboard(); renderTurnos();
    const turnoActual = state.turnos.find(x => x.dbId === t.dbId) || t;
    if (turnoActual) {
      // Registrar inicio de atención cuando se llama el turno
      if (!turnoActual.tsAtendidoStart) {
        turnoActual.tsAtendidoStart = Date.now();
      }
      TTS.speak(turnoActual);
      showTVCallBanner(turnoActual);
    }
    _renderTVNow();
    showToast(`🔊 Llamando: ${t.codigo} → ${t.modulo}`, 'success');
    addNotif('llamado', `Turno ${t.codigo} llamado`, `→ ${t.modulo}`);
  } catch(e) {
    showToast('Error: ' + e.message, 'error');
  }
}

async function llamarTurno() {
  const codigo = document.getElementById('panel-turno-id').textContent;
  if (!codigo || codigo === '—') return;
  const t = state.turnos.find(x => x.codigo === codigo || x.id === codigo);
  if (!t) return;
  try {
    const modulo = (currentUser?.modulo && currentUser.modulo !== 'Sin módulo') ? currentUser.modulo : (t.modulo !== '—' ? t.modulo : 'Módulo 01');
    await API.patch(`/api/turnos/${t.dbId}`, { estado: 'Llamando', modulo });
    t.estado = 'Llamando'; t.tsLlamado = t.tsLlamado || Date.now();
    t.modulo = modulo; t.atendidoPor = t.atendidoPor || currentUser?.nombre || currentUser?.name;
    TTS.speak(t);
    showTVCallBanner(t);
    renderPanel(); renderTurnos(); _renderTVNow();
    showToast(`🔊 Re-llamando turno ${t.codigo}`, 'success');
  } catch(e) { showToast('Error: ' + e.message, 'error'); }
}

async function atenderTurnoAPI() {
  const id = document.getElementById('panel-turno-id').textContent;
  const t = state.turnos.find(x => x.codigo === id || String(x.id) === String(id));
  if (!t) return;
  try {
    const modulo = (currentUser?.modulo && currentUser.modulo !== 'Sin módulo') ? currentUser.modulo : t.modulo;
    await API.patch(`/api/turnos/${t.dbId}`, { estado: 'Atendiendo', modulo });
    t.estado = 'Atendiendo'; t.tsAtendido = t.tsAtendido || Date.now();
    // Registrar inicio de atención si aún no está registrado
    if (!t.tsAtendidoStart) t.tsAtendidoStart = Date.now();
    t.modulo = modulo; t.atendidoPor = t.atendidoPor || currentUser?.nombre || currentUser?.name;
    renderPanel(); renderDashboard(); renderTurnos(); _renderTVNow();
    showToast(`✅ ${t.codigo} en atención`, 'success');
  } catch(e) { showToast('Error: ' + e.message, 'error'); }
}

async function finalizarTurnoAPI(nota = '') {
  const id = document.getElementById('panel-turno-id').textContent;
  const t = state.turnos.find(x => x.codigo === id || String(x.id) === String(id));
  if (!t) return;
  try {
    t.tsFin = Date.now();
    if (!t.tsAtendido) t.tsAtendido = Date.now();
    
    // Calcular tiempo de atención en HH:MM:SS
    const startTime = t.tsAtendidoStart || t.tsAtendido || t.tsFin;
    const durationMs = t.tsFin - startTime;
    const hours = Math.floor(durationMs / 3600000);
    const minutes = Math.floor((durationMs % 3600000) / 60000);
    const seconds = Math.floor((durationMs % 60000) / 1000);
    const attendingDuration = `${String(hours).padStart(2,'0')}:${String(minutes).padStart(2,'0')}:${String(seconds).padStart(2,'0')}`;
    t.attendingDuration = attendingDuration;
    
    const patchData = { estado: 'Finalizado', nota: nota || undefined, attendingDuration: attendingDuration };
    await API.patch(`/api/turnos/${t.dbId}`, patchData);
    
    t.estado = 'Finalizado'; if (nota) t.nota = nota;
    renderPanel(); renderDashboard(); renderTurnos(); _renderTVNow();
    showToast(`✓ Turno ${t.codigo} finalizado (Atención: ${attendingDuration})`, 'success');
    addNotif('turno', `Turno ${t.codigo} finalizado`, `${t.patient} · ${t.service}`);
  } catch(e) { showToast('Error: ' + e.message, 'error'); }
}

async function cancelarTurnoAPI() {
  const id = document.getElementById('panel-turno-id').textContent;
  const t = state.turnos.find(x => x.codigo === id || String(x.id) === String(id));
  if (!t) return;
  try {
    await API.patch(`/api/turnos/${t.dbId}`, { estado: 'Cancelado' });
    t.estado = 'Cancelado'; t.tsFin = Date.now();
    renderPanel(); renderDashboard(); renderTurnos(); _renderTVNow();
    showToast('Turno ' + t.codigo + ' cancelado');
  } catch(e) { showToast('Error: ' + e.message, 'error'); }
}

// ── Polyfills para compatibilidad con código heredado ─
// (las funciones de renderizado usan t.patient, t.id como codigo, etc.)
function saveState() { /* no-op: datos en servidor */ }
function loadState() { return state; }

// ── NAVIGATION ────────────────────────────────────
const PAGE_TITLES = {
  inicio:'Inicio', dashboard:'Main Dashboard Overview', turnos:'Gestión de Turnos',
  recepcion:'Recepción — Registro de Turnos',
  panel:'Panel de Atención — Mi Módulo', historial:'Historial de Turnos', tv:'Ventana Televisor',
  anuncios:'Ventana de Anuncios',
  usuarios:'Gestión De Usuarios', servicios:'Servicios Médicos',
  estadisticas:'Estadísticas por Funcionario',
  modulos:'Gestión de Módulos', gservicios:'Gestión de Servicios', config:'Configuración'
};
// Pages that are fully implemented (others show Próximamente screen)
const ACTIVE_PAGES = new Set(['inicio','dashboard','turnos','recepcion','panel','historial','tv','config','estadisticas']);

function navTo(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const el = document.getElementById('page-' + page);
  if (el) el.classList.add('active');
  document.getElementById('page-title').textContent = PAGE_TITLES[page] || page;
  document.querySelectorAll('.nav-item').forEach(n => {
    if (n.getAttribute('onclick') === `navTo('${page}')`) n.classList.add('active');
  });
  renderPage(page);
}

function renderPage(page) {
  if (!ACTIVE_PAGES.has(page)) return; // Próximamente pages — no render needed
  if (page === 'inicio') renderInicio();
  else if (page === 'dashboard') renderDashboard();
  else if (page === 'turnos') renderTurnos();
  else if (page === 'recepcion') renderRecepcion();
  else if (page === 'panel') renderPanel();
  else if (page === 'historial') renderHistorial();
  else if (page === 'estadisticas') renderEstadisticasFuncionarios();
  else if (page === 'tv') renderTV();
  else if (page === 'config') renderArchivos();
}

// ── NOTIFICATIONS ─────────────────────────────────
let notifications = [];
let notifUnread = 0;

function addNotif(type, title, body) {
  // type: 'llamado' | 'espera' | 'turno' | 'sistema'
  const icons = {
    llamado: { bg: '#EEF2FF', color: '#3B72F2', svg: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 010 7.07"/></svg>' },
    espera:  { bg: '#FEF3C7', color: '#D97706', svg: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>' },
    turno:   { bg: '#DCFCE7', color: '#16A34A', svg: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/></svg>' },
    sistema: { bg: '#F3E8FF', color: '#7C3AED', svg: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>' },
  };
  const ic = icons[type] || icons.sistema;
  const now = new Date();
  const time = now.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
  notifications.unshift({ type, title, body, time, unread: true, ic });
  if (notifications.length > 20) notifications.pop();
  notifUnread++;
  renderNotifBadge();
  renderNotifList();
}

function renderNotifBadge() {
  const dot   = document.getElementById('notif-dot');
  const count = document.getElementById('notif-count');
  if (!dot || !count) return;
  if (notifUnread > 0) {
    dot.style.display = 'none';
    count.style.display = 'flex';
    count.textContent = notifUnread > 9 ? '9+' : String(notifUnread);
  } else {
    dot.style.display = 'none';
    count.style.display = 'none';
  }
}

function renderNotifList() {
  const el = document.getElementById('notif-list');
  if (!el) return;
  if (!notifications.length) {
    el.innerHTML = '<div style="text-align:center;padding:24px 0;color:var(--text-muted);font-size:13px">Sin notificaciones</div>';
    return;
  }
  el.innerHTML = notifications.map(n =>
    `<div class="notif-item ${n.unread?'unread':''}">
      <div class="notif-icon" style="background:${n.ic.bg};color:${n.ic.color}">${n.ic.svg}</div>
      <div class="notif-text">
        <div class="notif-title">${esc(n.title)}</div>
        <div class="notif-body">${esc(n.body)}</div>
        <div class="notif-time">${n.time}</div>
      </div>
    </div>`
  ).join('');
}

function toggleNotifPanel() {
  const panel = document.getElementById('notif-panel');
  if (!panel) return;
  panel.classList.toggle('open');
  if (panel.classList.contains('open')) {
    // Mark all as read
    notifications.forEach(n => n.unread = false);
    notifUnread = 0;
    renderNotifBadge();
    renderNotifList();
    // Close on outside click
    setTimeout(() => {
      document.addEventListener('click', function closeP(e) {
        if (!panel.contains(e.target) && !document.getElementById('notif-btn')?.contains(e.target)) {
          panel.classList.remove('open');
          document.removeEventListener('click', closeP);
        }
      });
    }, 50);
  }
}

function clearNotifs() {
  notifications = []; notifUnread = 0;
  renderNotifBadge(); renderNotifList();
}

// Override siguienteTurno to also push notification
const _origSiguiente = siguienteTurno;
// ── INICIO ────────────────────────────────────────
function renderInicio() {
  const now = new Date();
  const dateEl = document.getElementById('inicio-date');
  if (dateEl) dateEl.textContent = now.toLocaleDateString('es',{weekday:'long',day:'numeric',month:'long',year:'numeric'});

  // Welcome message with current user
  const welcomeEl = document.getElementById('inicio-welcome');
  if (welcomeEl && currentUser) {
    const nameToUse = currentUser.nombre || currentUser.name || 'Usuario';
    const firstName = nameToUse.split(' ').find(w => !['Dr.','Dra.','Enf.','Rec.','Adm.'].includes(w)) || nameToUse.split(' ')[0];
    const hour = now.getHours();
    const greeting = hour < 12 ? 'Buenos días' : hour < 18 ? 'Buenas tardes' : 'Buenas noches';
    welcomeEl.textContent = `${greeting}, ${firstName} 👋`;
  }

  const turnos   = state.turnos;
  const fin      = turnos.filter(t=>t.estado==='Finalizado');
  const espera   = turnos.filter(t=>t.estado==='En fila');
  const atnd     = turnos.filter(t=>t.estado==='Atendiendo'||t.estado==='Llamando');
  const cancel   = turnos.filter(t=>t.estado==='Cancelado');
  const waitTimes = fin.filter(t=>t.tsCreated&&t.tsAtendido).map(t=>(t.tsAtendido-t.tsCreated)/60000);
  const avgWait  = waitTimes.length ? Math.round(waitTimes.reduce((a,b)=>a+b,0)/waitTimes.length) : 0;

  const statsEl = document.getElementById('inicio-stats');
  if (statsEl) statsEl.innerHTML = `
    <div class="card stat-card"><div class="stat-icon" style="background:#EEF2FF">📋</div><div class="stat-label">Atendidos hoy</div><div class="stat-value">${fin.length+atnd.length}</div></div>
    <div class="card stat-card"><div class="stat-icon" style="background:#FEF3C7">⏳</div><div class="stat-label">En espera</div><div class="stat-value">${espera.length}</div></div>
    <div class="card stat-card"><div class="stat-icon" style="background:#DCFCE7">✅</div><div class="stat-label">Finalizados</div><div class="stat-value">${fin.length}</div></div>
    <div class="card stat-card"><div class="stat-icon" style="background:#CFFAFE">⏱</div><div class="stat-label">Espera promedio</div><div class="stat-value blue">${avgWait} min</div></div>`;

  // Activity feed
  const actEl = document.getElementById('inicio-activity');
  if (actEl) {
    const recent = [...turnos].sort((a,b)=>(b.tsCreated||0)-(a.tsCreated||0)).slice(0,6);
    actEl.innerHTML = recent.map(t => {
      const color = getSvcColor(t.id[0]);
      const icon  = t.estado==='Finalizado'?'✅':t.estado==='Cancelado'?'❌':t.estado==='Atendiendo'?'🟢':t.estado==='Llamando'?'🔊':'⏳';
      return `<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border-light)">
        <div style="width:28px;height:28px;border-radius:8px;background:${color}20;display:flex;align-items:center;justify-content:center;font-size:13px;flex-shrink:0">${icon}</div>
        <div style="flex:1;min-width:0">
          <div style="font-size:13px;font-weight:500"><span style="font-family:'DM Mono',monospace;color:${color}">${esc(t.id)}</span> — ${esc(t.patient)}</div>
          <div style="font-size:11px;color:var(--text-muted)">${esc(t.service)} · ${tsToHHMM(t.tsCreated)}</div>
        </div>
        ${badgeHTML(t.estado)}
      </div>`;
    }).join('');
  }

  // Alerts
  const alertEl = document.getElementById('inicio-alerts');
  if (alertEl) {
    const longWait = espera.filter(t=>getWaitTime(t)>15*60000);
    if (!longWait.length) {
      alertEl.innerHTML = '<div style="color:var(--success);font-size:13px;padding:12px 0">✅ Sin alertas — todos los tiempos de espera son normales</div>';
    } else {
      alertEl.innerHTML = longWait.map(t => {
        const wMin = Math.floor(getWaitTime(t)/60000);
        return `<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border-light)">
          <div style="width:28px;height:28px;border-radius:8px;background:var(--danger-light);display:flex;align-items:center;justify-content:center;font-size:13px">⚠️</div>
          <div style="flex:1">
            <div style="font-size:13px;font-weight:500">${esc(t.id)} — ${esc(t.patient)}</div>
            <div style="font-size:11px;color:var(--danger)">${wMin} minutos esperando</div>
          </div>
        </div>`;
      }).join('');
    }
  }

  // Módulos status grid
  const modGrid = document.getElementById('inicio-modulos-grid');
  const modSummary = document.getElementById('inicio-modulos-summary');
  if (modGrid) {
    const modulos = state.modulos || [];
    const usuariosActivos = state.users.filter(u => u.active);
    
    // Contar módulos ocupados
    const modulosOcupados = modulos.filter(m => state.users.find(u => u.modulo === m.id || m.nombre && u.modulo === m.nombre)).length;
    if (modSummary) modSummary.textContent = `${modulosOcupados} ocupados · ${modulos.length - modulosOcupados} disponibles`;
    
    modGrid.innerHTML = modulos.map(m => {
      const turnoActual = state.turnos.find(t => (t.estado==='Atendiendo'||t.estado==='Llamando') && t.modulo === m.id);
      // Buscar operador por m.id o por m.nombre
      const operador = state.users.find(u => (u.modulo === m.id || u.modulo === m.nombre) && u.active);
      const isActive    = turnoActual && operador;
      const statusColor = !operador ? '#9CA3AF' : isActive ? '#22C55E' : '#F59E0B';
      const statusLabel = !operador ? 'Disponible' : isActive ? (turnoActual.estado==='Llamando'?'Llamando':'Atendiendo') : 'Esperando';
      const statusBg    = !operador ? '#F9FAFB' : isActive ? '#F0FDF4' : '#FFFBEB';
      const statusBorder= !operador ? '#E5E7EB' : isActive ? '#BBF7D0' : '#FDE68A';
      
      return `<div style="padding:14px;border-radius:10px;background:${statusBg};border:2px solid ${statusBorder};transition:all 0.2s">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
          <div style="font-family:'DM Mono',monospace;font-size:13px;font-weight:800;color:#374151">${m.id || m.nombre}</div>
          <div style="display:flex;align-items:center;gap:4px;font-size:10px;font-weight:700;color:${statusColor}">
            <div style="width:7px;height:7px;border-radius:50%;background:${statusColor}${isActive?';animation:blink 1s infinite':''}"></div>
            ${statusLabel}
          </div>
        </div>
        ${turnoActual ? `
          <div style="background:rgba(0,0,0,0.05);border-radius:6px;padding:6px 8px;margin-bottom:8px;font-size:10px">
            <div style="font-family:'DM Mono',monospace;color:var(--primary);font-weight:700">${esc(turnoActual.id)}</div>
            <div style="color:var(--text-muted);font-size:9px">${esc(turnoActual.patient.split(' ')[0])}</div>
          </div>
        ` : ''}
        ${operador ? `
          <div style="background:linear-gradient(135deg, #EEF2FF 0%, #F3E8FF 100%);border-radius:6px;padding:8px;border-left:3px solid var(--primary)">
            <div style="font-size:11px;font-weight:700;color:var(--primary)">${esc((operador.nombre || operador.name || 'Usuario').split(' ').slice(0,2).join(' '))}</div>
            <div style="font-size:9px;color:var(--text-muted);margin-top:2px">Usando este módulo</div>
          </div>
        ` : '<div style="font-size:10.5px;color:#9CA3AF;font-weight:600">Sin operador asignado</div>'}
      </div>`;
    }).join('');
  }
}

// ── DASHBOARD ─────────────────────────────────────
function renderDashboard() {
  const turnos = state.turnos;
  const finalizados = turnos.filter(t => t.estado === 'Finalizado');
  const espera      = turnos.filter(t => t.estado === 'En fila');
  const atendiendo  = turnos.filter(t => t.estado === 'Atendiendo' || t.estado === 'Llamando');
  const atendidos   = finalizados.length + atendiendo.length;

  // Avg wait time from finalized turns
  const waitTimes = finalizados.filter(t => t.tsCreated && t.tsAtendido)
    .map(t => msBetween(t.tsCreated, t.tsAtendido));
  const avgWait = waitTimes.length ? Math.round(waitTimes.reduce((a,b)=>a+b,0)/waitTimes.length/60000) : 0;

  // Avg service time
  const svcTimes = finalizados.filter(t => t.tsAtendido && t.tsFin)
    .map(t => msBetween(t.tsAtendido, t.tsFin));
  const avgSvc = svcTimes.length ? Math.round(svcTimes.reduce((a,b)=>a+b,0)/svcTimes.length/60000) : 0;

  document.getElementById('stat-atendidos').textContent  = atendidos;
  document.getElementById('stat-espera').textContent     = espera.length;
  document.getElementById('stat-finalizados').textContent = finalizados.length;
  document.getElementById('stat-tiempo').textContent     = avgWait + ' min';

  // Chart bars — real turnos per "hour bucket" (simulate from today's data)
  const bars = document.getElementById('chart-bars');
  const buckets = [0,0,0,0,0,0,0];
  const now = Date.now();
  turnos.forEach(t => {
    if (!t.tsCreated) return;
    const hoursAgo = (now - t.tsCreated) / 3600000;
    const bucket = Math.min(6, Math.floor(hoursAgo)); // 0=most recent
    if (bucket >= 0 && bucket < 7) buckets[6-bucket]++;
  });
  const maxB = Math.max(...buckets, 1);
  bars.innerHTML = buckets.map((v,i) =>
    `<div class="chart-bar cb${i+1}" style="height:${Math.max(4,(v/maxB)*100)}%" title="${v} turnos"></div>`
  ).join('');

  // Donut — real service distribution
  const svcMap = {};
  turnos.forEach(t => { svcMap[t.service] = (svcMap[t.service]||0)+1; });
  const legend    = document.getElementById('donut-legend');
  const colors    = ['#3B72F2','#8B5CF6','#22C55E','#F97316','#F59E0B'];
  const entries   = Object.entries(svcMap).slice(0,4);
  const totalSvc  = entries.reduce((s,[,v])=>s+v,0);
  document.querySelector('#donut-svg text').textContent = totalSvc;
  legend.innerHTML = entries.map(([k,v],i) => {
    const pct = Math.round(v/totalSvc*100);
    return `<div class="legend-item"><div class="legend-dot" style="background:${colors[i]}"></div><span style="font-weight:600">${k}</span><span style="color:var(--text-muted);margin-left:4px">${pct}%</span></div>`;
  }).join('');

  // Table
  const tbody  = document.getElementById('dash-table-body');
  const recent = [...turnos].sort((a,b)=>(b.tsCreated||0)-(a.tsCreated||0)).slice(0,8);
  tbody.innerHTML = recent.map(t => {
    const waitMs  = getWaitTime(t);
    const isLive  = ['En fila','Llamando','Atendiendo'].includes(t.estado);
    const safeId  = t.id.replace(/[^a-zA-Z0-9]/g,'_');
    const pill    = isLive
      ? `<span class="live-dash-${safeId} timer-pill timer-orange">${fmtDuration(waitMs)}</span>`
      : `<span class="timer-pill timer-gray">${fmtDuration(waitMs)}</span>`;
    return `
      <td><span class="turno-id">${esc(t.id)}</span></td>
      <td>${esc(t.service)}</td>
      <td>${esc(t.modulo)}</td>
      <td>${badgeHTML(t.estado)}</td>
      <td>${pill}</td>
      <td style="color:var(--text-muted);font-size:12.5px">${tsToHHMM(t.tsCreated)}</td>
    `;
  }).join('');

  // Métricas por operador y módulo
  const metricsEl = document.getElementById('dash-metrics-panel');
  if (metricsEl) {
    const byOp = {};
    finalizados.forEach(t => {
      const op = t.atendidoPor || '—';
      if (!byOp[op]) byOp[op] = { op, cnt:0, espera:0, atc:0, cntAtc:0 };
      byOp[op].cnt++;
      if (t.tsCreated && t.tsAtendido) byOp[op].espera += (t.tsAtendido - t.tsCreated)/60000;
      if (t.tsAtendido && t.tsFin)     { byOp[op].atc += (t.tsFin - t.tsAtendido)/60000; byOp[op].cntAtc++; }
    });
    const opRows = Object.values(byOp).sort((a,b)=>b.cnt-a.cnt).slice(0,5);
    const byMod = {};
    finalizados.forEach(t => { const m = t.modulo||'—'; byMod[m]=(byMod[m]||0)+1; });
    const modRows = Object.entries(byMod).sort((a,b)=>b[1]-a[1]).slice(0,5);
    const porHora = Array.from({length:8},(_,i) => {
      const h = (new Date().getHours() - 7 + i + 24) % 24;
      const cnt = finalizados.filter(t => t.tsCreated && new Date(t.tsCreated).getHours() === h).length;
      return { h, cnt };
    });
    metricsEl.innerHTML = `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px">
        <!-- PACIENTES POR OPERADOR -->
        <div style="background:linear-gradient(135deg, #FFFFFF 0%, #F9FAFB 100%);border:2px solid #E5E7EB;border-radius:12px;padding:20px;box-shadow:0 2px 8px rgba(0,0,0,0.04)">
          <div style="font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:#3B72F2;margin-bottom:16px;display:flex;align-items:center;gap:6px">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
            Pacientes por operador
          </div>
          ${opRows.length ? opRows.map((o, idx) => `
            <div style="display:flex;align-items:center;justify-content:space-between;padding:12px;margin-bottom:8px;background:${idx % 2 === 0 ? '#FFFFFF' : '#F9FAFB'};border-radius:8px;border-left:4px solid #3B72F2;transition:all 0.2s;cursor:pointer" onclick="showOperadorPacientes('${esc(o.op)}')" onmouseover="this.style.background='#EFF6FF';this.style.boxShadow='0 4px 12px rgba(59,114,242,0.15)'" onmouseout="this.style.background='${idx % 2 === 0 ? '#FFFFFF' : '#F9FAFB'}';this.style.boxShadow='none'">
              <div>
                <div style="font-size:13px;font-weight:700;color:var(--text);margin-bottom:3px">${esc(o.op.split(' ').slice(0,3).join(' '))} →</div>
                <div style="display:flex;gap:12px;font-size:11px;color:var(--text-muted)">
                  <span style="background:linear-gradient(135deg, #3B72F2 0%, #5B8FFF 100%);color:white;padding:2px 8px;border-radius:4px;font-weight:600"><b>${o.cnt}</b> atendidos</span>
                  <span style="padding:2px 8px">⏱ esp. <b style="color:#3B72F2;font-weight:700">${o.cnt?+(o.espera/o.cnt).toFixed(1):'—'}</b> min</span>
                  <span style="padding:2px 8px">⚡ atc. <b style="color:#F59E0B;font-weight:700">${o.cntAtc?+(o.atc/o.cntAtc).toFixed(1):'—'}</b> min</span>
                </div>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="opacity:0.4;flex-shrink:0"><polyline points="9 18 15 12 9 6"/></svg>
            </div>
          `).join('') : '<div style="font-size:13px;color:var(--text-muted);padding:12px 0;text-align:center">📊 Sin datos aún</div>'}
        </div>

        <!-- COLUMNA DERECHA: MÓDULO + HORA -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
          <!-- POR MÓDULO -->
          <div style="background:linear-gradient(135deg, #FFFFFF 0%, #F9FAFB 100%);border:2px solid #E5E7EB;border-radius:12px;padding:20px;box-shadow:0 2px 8px rgba(0,0,0,0.04)">
            <div style="font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:#8B5CF6;margin-bottom:14px;display:flex;align-items:center;gap:6px">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>
              Por módulo
            </div>
            ${modRows.length ? modRows.map(([m,n], idx) => `
              <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;margin-bottom:6px;background:${idx % 2 === 0 ? '#FFFFFF' : '#F9FAFB'};border-radius:6px;font-size:12px;border-left:3px solid #8B5CF6" onmouseover="this.style.background='#F3E8FF'" onmouseout="this.style.background='${idx % 2 === 0 ? '#FFFFFF' : '#F9FAFB'}'">
                <span style="font-weight:600;color:var(--text)">${esc(m)}</span>
                <span style="background:linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%);color:white;font-weight:700;padding:3px 10px;border-radius:4px;min-width:30px;text-align:center">${n}</span>
              </div>
            `).join('') : '<div style="font-size:12px;color:var(--text-muted);padding:8px 0;text-align:center">📦 Sin datos</div>'}
          </div>

          <!-- POR HORA (HOY) -->
          <div style="background:linear-gradient(135deg, #FFFFFF 0%, #F9FAFB 100%);border:2px solid #E5E7EB;border-radius:12px;padding:20px;box-shadow:0 2px 8px rgba(0,0,0,0.04);display:flex;flex-direction:column">
            <div style="font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:#F59E0B;margin-bottom:12px;display:flex;align-items:center;gap:6px">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              Por hora (hoy)
            </div>
            <div style="display:flex;align-items:flex-end;gap:4px;height:64px;flex:1">
              ${porHora.map(({h,cnt})=>{ const maxH=Math.max(...porHora.map(x=>x.cnt),1); return `<div title="${h}h: ${cnt}" style="flex:1;background:linear-gradient(180deg, #F59E0B 0%, #D97706 100%);opacity:${0.25+0.75*(cnt/maxH)};border-radius:4px 4px 0 0;height:${Math.max(6,cnt/maxH*100)}%;transition:all 0.2s;cursor:pointer" onmouseover="this.style.opacity='1';this.style.transform='scale(1.05)'" onmouseout="this.style.opacity='${0.25+0.75*(cnt/maxH)}';this.style.transform='scale(1)'"></div>`; }).join('')}
            </div>
            <div style="display:flex;justify-content:space-between;font-size:9px;color:var(--text-muted);margin-top:8px;font-weight:700">
              ${porHora.map(({h})=>`<span>${h}h</span>`).join('')}
            </div>
          </div>
        </div>
      </div>

      <!-- KPIs FINALES -->
      <div style="display:grid;grid-template-columns:repeat(3, 1fr);gap:16px;padding-top:16px;border-top:2px solid #E5E7EB">
        <div style="background:linear-gradient(135deg, #FFFFFF 0%, #F9FAFB 100%);border:2px solid #E5E7EB;border-radius:12px;padding:16px;text-align:center;box-shadow:0 2px 8px rgba(0,0,0,0.04);transition:all 0.2s" onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 4px 12px rgba(0,0,0,0.1)'" onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='0 2px 8px rgba(0,0,0,0.04)'">
          <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--text-muted);letter-spacing:0.5px;margin-bottom:8px">⏱ Prom. Espera</div>
          <div style="font-size:32px;font-weight:900;background:linear-gradient(135deg, #3B72F2 0%, #5B8FFF 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text">${avgWait}</div>
          <div style="font-size:12px;color:var(--text-muted);margin-top:4px">minutos</div>
        </div>
        <div style="background:linear-gradient(135deg, #FFFFFF 0%, #F9FAFB 100%);border:2px solid #E5E7EB;border-radius:12px;padding:16px;text-align:center;box-shadow:0 2px 8px rgba(0,0,0,0.04);transition:all 0.2s" onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 4px 12px rgba(0,0,0,0.1)'" onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='0 2px 8px rgba(0,0,0,0.04)'">
          <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--text-muted);letter-spacing:0.5px;margin-bottom:8px">⚡ Prom. Atención</div>
          <div style="font-size:32px;font-weight:900;background:linear-gradient(135deg, #22C55E 0%, #4ADE80 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text">${avgSvc}</div>
          <div style="font-size:12px;color:var(--text-muted);margin-top:4px">minutos</div>
        </div>
        <div style="background:linear-gradient(135deg, #FFFFFF 0%, #F9FAFB 100%);border:2px solid #E5E7EB;border-radius:12px;padding:16px;text-align:center;box-shadow:0 2px 8px rgba(0,0,0,0.04);transition:all 0.2s" onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 4px 12px rgba(0,0,0,0.1)'" onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='0 2px 8px rgba(0,0,0,0.04)'">
          <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--text-muted);letter-spacing:0.5px;margin-bottom:8px">✓ Turnos Finalizados</div>
          <div style="font-size:32px;font-weight:900;background:linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text">${finalizados.length}</div>
          <div style="font-size:12px;color:var(--text-muted);margin-top:4px">hoy</div>
        </div>
      </div>
    `;
  }

  startDashboardTicker();
}

// ── BADGE HTML ────────────────────────────────────
function badgeHTML(estado) {
  const map = {
    'Atendiendo': 'atendiendo', 'Llamando': 'llamando', 'En fila': 'fila',
    'Finalizado': 'finalizado', 'Cancelado': 'cancelado', 'No atendido': 'noatendido'
  };
  const cls = map[estado] || 'fila';
  const labels = { 'Atendiendo':'Atendiendo','Llamando':'Llamando','En fila':'En fila','Finalizado':'Finalizado','Cancelado':'Cancelado','No atendido':'No atendido' };
  return `<span class="badge badge-${cls}">${labels[estado]||estado}</span>`;
}

// ── TURNOS ────────────────────────────────────────
let turnosPage = 1;
const TURNOS_PER_PAGE = 5;
let filteredTurnos = null;

function renderTurnos(search='') {
  const turnos = filteredTurnos || state.turnos;
  const fila = turnos.filter(t => t.estado==='En fila').length;
  const atendiendo = turnos.filter(t => t.estado==='Atendiendo').length;
  document.getElementById('g-espera').textContent = String(fila).padStart(2,'0');
  document.getElementById('g-atendiendo').textContent = String(atendiendo).padStart(2,'0');
  // Actualizar promedio y módulos activos
  const allFin = state.turnos.filter(t=>t.estado==='Finalizado');
  const wtimes = allFin.filter(t=>t.tsCreated&&t.tsAtendido).map(t=>(t.tsAtendido-t.tsCreated)/60000);
  const avgW = wtimes.length ? Math.round(wtimes.reduce((a,b)=>a+b,0)/wtimes.length) : 0;
  const gProm = document.getElementById('g-promedio'); if (gProm) gProm.textContent = avgW+' min';
  const modsActivos = new Set(state.turnos.filter(t=>t.estado==='Atendiendo'||t.estado==='Llamando').map(t=>t.modulo).filter(Boolean));
  const gMod = document.getElementById('g-modulos'); if (gMod) gMod.textContent = String(modsActivos.size).padStart(2,'0');

  const total = turnos.length;
  const pages = Math.ceil(total / TURNOS_PER_PAGE);
  if (turnosPage > pages) turnosPage = 1;
  const start = (turnosPage-1)*TURNOS_PER_PAGE;
  const slice = turnos.slice(start, start+TURNOS_PER_PAGE);

  const tbody = document.getElementById('turnos-table-body');
  tbody.innerHTML = slice.map((t,i) => {
    const waitMs = getWaitTime(t);
    const svcMs  = getServiceTime(t);
    const waitStr = (t.estado==='En fila'||t.estado==='Atendiendo')
      ? `<span class="live-tw-${t.id.replace(/[^a-zA-Z0-9]/g,'_')} timer-pill ${waitMs>1200000?'timer-red':waitMs>600000?'timer-orange':''}">${fmtMMSS(waitMs)}</span>`
      : `<span class="timer-pill timer-gray">${fmtDuration(waitMs)}</span>`;
    const svcStr = svcMs ? `<span class="timer-pill timer-blue">${fmtDuration(svcMs)}</span>` : '<span style="color:var(--text-light)">—</span>';
    const moduloDisplay = (() => {
      const mod = t.modulo && t.modulo !== '—' ? t.modulo : '—';
      if (t.estado === 'Llamando')
        return `<span style="font-size:12.5px;color:var(--text-muted)">${esc(mod)}</span><span style="display:inline-flex;align-items:center;gap:3px;font-size:10px;font-weight:700;background:#EEF2FF;color:#3B72F2;padding:1px 7px;border-radius:20px;margin-left:6px">● LLAMANDO</span>`;
      if (t.estado === 'Atendiendo')
        return `<span style="font-size:12.5px;color:var(--text-muted)">${esc(mod)}</span><span style="display:inline-flex;align-items:center;gap:3px;font-size:10px;font-weight:700;background:#DCFCE7;color:#16A34A;padding:1px 7px;border-radius:20px;margin-left:6px">● ATENDIENDO</span>`;
      return `<span style="color:var(--text-muted);font-size:12.5px">${esc(mod)}</span>`;
    })();
    return `
    
      <td><span class="turno-id">${esc(t.id)}</span></td>
      <td style="font-weight:500">${esc(t.patient)}</td>
      <td><span class="doc-masked">****${esc(t.doc)}</span></td>
      <td>${badgeHTML(t.estado)}</td>
      <td>${waitStr}</td>
      <td>${svcStr}</td>
      <td>${moduloDisplay}</td>
      <td>
        <div class="action-icons">
          <div class="icon-btn" title="Llamar" onclick="actionTurno(${start+i},'llamar')">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/></svg>
          </div>
          <div class="icon-btn" title="Atender" onclick="actionTurno(${start+i},'siguiente')">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 4 15 12 5 20 5 4"/><line x1="19" y1="5" x2="19" y2="19"/></svg>
          </div>
          <div class="icon-btn" title="Finalizar" onclick="actionTurno(${start+i},'finalizar')">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <div class="icon-btn" title="Cancelar" onclick="actionTurno(${start+i},'cancelar')" style="color:var(--danger)">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </div>
          <div class="icon-btn" title="Ver detalle" onclick="openTurnoDetail(${start+i})">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          </div>
        </div>
      </td>
    `;
  }).join('');

  document.getElementById('turnos-pagination-info').textContent = `Mostrando ${start+1}-${Math.min(start+TURNOS_PER_PAGE,total)} de ${total} turnos`;
  const btns = document.getElementById('turnos-pagination-btns');
  btns.innerHTML = `<button class="page-btn" onclick="changeTurnosPage(${turnosPage-1})" ${turnosPage===1?'disabled':''}>‹</button>` +
    Array.from({length:Math.min(pages,3)},(_,i)=>i+1).map(p=>`<button class="page-btn ${p===turnosPage?'active':''}" onclick="changeTurnosPage(${p})">${p}</button>`).join('') +
    (pages > 3 ? `<button class="page-btn" disabled>…</button><button class="page-btn" onclick="changeTurnosPage(${pages})">${pages}</button>` : '') +
    `<button class="page-btn" onclick="changeTurnosPage(${turnosPage+1})" ${turnosPage===pages?'disabled':''}>›</button>`;
  startTurnosTicker();
}

function changeTurnosPage(p) {
  const pages = Math.ceil((filteredTurnos||state.turnos).length / TURNOS_PER_PAGE);
  if (p < 1 || p > pages) return;
  turnosPage = p;
  renderTurnos();
}

function filterTurnos(q) {
  q = q.toLowerCase();
  filteredTurnos = q ? state.turnos.filter(t => t.id.toLowerCase().includes(q) || t.patient.toLowerCase().includes(q)) : null;
  turnosPage = 1;
  renderTurnos();
}

function actionTurno(idx, action) {
  const t = (filteredTurnos||state.turnos)[idx];
  const realIdx = state.turnos.findIndex(x => x.id===t.id && x.patient===t.patient);
  if (realIdx < 0) return;
  const now = nowTs();
  const r = state.turnos[realIdx];
  if (action === 'llamar') {
    r.estado = 'Llamando';
    r.tsLlamado = now;
    TTS.speak(r);
  } else if (action === 'siguiente') {
    r.estado = 'Atendiendo';
    r.tsAtendido = now;
    if (!r.tsLlamado) r.tsLlamado = now;
  } else if (action === 'finalizar') {
    r.estado = 'Finalizado';
    r.tsFin = now;
    if (!r.tsAtendido) r.tsAtendido = now;
  } else if (action === 'cancelar') {
    r.estado = 'Cancelado';
    r.tsFin = now;
  }
  saveState();
  renderTurnos();
  renderDashboard();
  showToast(`Turno ${t.id} — ${action}`, 'success');
}

// ── TURNO DETAIL MODAL ────────────────────────────
function openTurnoDetail(idx) {
  const t = (filteredTurnos||state.turnos)[idx];
  if (!t) return;
  document.getElementById('detail-title').textContent = `Turno ${t.id}`;
  document.getElementById('detail-badge').innerHTML = badgeHTML(t.estado);
  const waitMs = getWaitTime(t);
  const svcMs  = getServiceTime(t);
  const totalMs = getTotalTime(t);
  const color  = getSvcColor(t.id[0]);
  document.getElementById('detail-body').innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px">
      <div class="detail-stat-box">
        <div class="detail-stat-label">Paciente</div>
        <div class="detail-stat-val">${esc(t.patient)}</div>
      </div>
      <div class="detail-stat-box">
        <div class="detail-stat-label">Documento</div>
        <div class="detail-stat-val" style="font-family:'DM Mono',monospace">****${esc(t.doc)}</div>
      </div>
      <div class="detail-stat-box">
        <div class="detail-stat-label">Servicio</div>
        <div class="detail-stat-val" style="display:flex;align-items:center;gap:6px">
          <span style="width:10px;height:10px;border-radius:50%;background:${color};display:inline-block"></span>${esc(t.service)}
        </div>
      </div>
      <div class="detail-stat-box">
        <div class="detail-stat-label">Módulo</div>
        <div class="detail-stat-val">${esc(t.modulo)}</div>
      </div>
      <div class="detail-stat-box">
        <div class="detail-stat-label">Atendido por</div>
        <div class="detail-stat-val">${t.atendidoPor ? esc(t.atendidoPor) : '—'}</div>
      </div>
    </div>
    <div style="background:var(--bg);border-radius:12px;padding:16px;margin-bottom:20px">
      <div style="font-size:12px;font-weight:600;color:var(--text-muted);margin-bottom:12px;text-transform:uppercase;letter-spacing:.5px">Cronología del turno</div>
      <div class="timeline">
        <div class="tl-item ${t.tsCreated?'done':'pending'}">
          <div class="tl-dot"></div>
          <div class="tl-content">
            <div class="tl-label">Turno creado</div>
            <div class="tl-time">${t.tsCreated ? tsToHHMM(t.tsCreated) : '—'}</div>
          </div>
        </div>
        <div class="tl-item ${t.tsLlamado?'done':'pending'}">
          <div class="tl-dot"></div>
          <div class="tl-content">
            <div class="tl-label">Llamado</div>
            <div class="tl-time">${t.tsLlamado ? tsToHHMM(t.tsLlamado) : '—'}</div>
          </div>
        </div>
        <div class="tl-item ${t.tsAtendido?'done':'pending'}">
          <div class="tl-dot"></div>
          <div class="tl-content">
            <div class="tl-label">Inicio atención</div>
            <div class="tl-time">${t.tsAtendido ? tsToHHMM(t.tsAtendido) : '—'}</div>
          </div>
        </div>
        <div class="tl-item ${t.tsFin?'done':'pending'}">
          <div class="tl-dot"></div>
          <div class="tl-content">
            <div class="tl-label">${t.estado==='Cancelado'?'Cancelado':'Finalizado'}</div>
            <div class="tl-time">${t.tsFin ? tsToHHMM(t.tsFin) : '—'}</div>
          </div>
        </div>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px">
      <div class="detail-time-card" style="background:var(--primary-light)">
        <div class="detail-time-label" style="color:var(--primary)">Tiempo de espera</div>
        <div class="detail-time-val" style="color:var(--primary)">${fmtDuration(waitMs)}</div>
      </div>
      <div class="detail-time-card" style="background:var(--success-light)">
        <div class="detail-time-label" style="color:#16A34A">Tiempo de atención</div>
        <div class="detail-time-val" style="color:#16A34A">${t.attendingDuration || (svcMs ? fmtDuration(svcMs) : '—')}</div>
      </div>
      <div class="detail-time-card" style="background:var(--warning-light)">
        <div class="detail-time-label" style="color:#D97706">Tiempo total</div>
        <div class="detail-time-val" style="color:#D97706">${fmtDuration(totalMs)}</div>
      </div>
    </div>
    ${t.nota ? `<div style="background:#F0F4F8;border-left:4px solid var(--primary);border-radius:6px;padding:12px;margin-top:16px">
      <div style="font-size:11px;font-weight:600;color:var(--primary);text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px">📝 Nota médica</div>
      <div style="font-size:13px;color:var(--text);line-height:1.5;white-space:pre-wrap;word-wrap:break-word">${esc(t.nota)}</div>
    </div>` : ''}`;
  openModal('modal-detail');
}

// Live ticker for turnos table
let turnosTickerInterval = null;
function startTurnosTicker() {
  if (turnosTickerInterval) clearInterval(turnosTickerInterval);
  turnosTickerInterval = setInterval(() => {
    state.turnos.forEach(t => {
      if (t.estado==='En fila'||t.estado==='Atendiendo') {
        const el = document.querySelector(`.live-tw-${t.id.replace(/[^a-zA-Z0-9]/g,'_')}`);
        if (el) el.textContent = fmtMMSS(getWaitTime(t));
      }
    });
  }, 1000);
}

// Live ticker for dashboard table
let dashboardTickerInterval = null;
function startDashboardTicker() {
  if (dashboardTickerInterval) clearInterval(dashboardTickerInterval);
  dashboardTickerInterval = setInterval(() => {
    state.turnos.forEach(t => {
      if (['En fila','Llamando','Atendiendo'].includes(t.estado)) {
        const safeId = t.id.replace(/[^a-zA-Z0-9]/g,'_');
        const el = document.querySelector(`.live-dash-${safeId}`);
        if (el) el.textContent = fmtDuration(getWaitTime(t));
      }
    });
  }, 1000);
}

function openTurnoDetailById(id) {
  const idx = state.turnos.findIndex(t => t.id === id);
  if (idx >= 0) openTurnoDetail(idx);
}

// Mostrar pacientes atendidos por un operador
function showOperadorPacientes(operadorName) {
  const pacientes = state.turnos
    .filter(t => t.atendidoPor === operadorName && (t.estado === 'Finalizado' || t.estado === 'Cancelado'))
    .sort((a, b) => (b.tsFin || 0) - (a.tsFin || 0));
  
  // Actualizar título
  document.getElementById('operador-modal-title').textContent = `Pacientes atendidos por ${operadorName}`;
  
  // Generar lista de pacientes
  const listEl = document.getElementById('operador-pacientes-list');
  if (!pacientes.length) {
    listEl.innerHTML = '<div style="text-align:center;padding:32px;color:var(--text-muted);font-size:13px">📊 Sin pacientes atendidos</div>';
  } else {
    listEl.innerHTML = pacientes.map((t, idx) => {
      const color = getSvcColor(t.id[0]);
      const horaCreacion = tsToHHMM(t.tsCreated);
      const horaFin = tsToHHMM(t.tsFin);
      const waitMs = t.tsCreated && t.tsAtendido ? (t.tsAtendido - t.tsCreated) / 1000 : 0;
      const waitTime = fmtDuration(waitMs * 1000);
      const estatuBg = t.estado === 'Finalizado' ? '#DCFCE7' : '#FEE2E2';
      const statusColor = t.estado === 'Finalizado' ? '#16A34A' : '#DC2626';
      
      return `
        <div style="background:white;border:1px solid #E5E7EB;border-radius:10px;padding:14px;display:grid;grid-template-columns:1fr auto;gap:16px;align-items:start;cursor:pointer;transition:all 0.2s" onmouseover="this.style.background='#F9FAFB';this.style.boxShadow='0 4px 12px rgba(0,0,0,0.08)'" onmouseout="this.style.background='white';this.style.boxShadow='none'" onclick="closeModal('modal-operador-pacientes');openTurnoDetailById('${esc(t.id)}')">
          <div>
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
              <span style="font-family:'DM Mono',monospace;font-size:14px;font-weight:800;color:${color}">${esc(t.id)}</span>
              <span style="background:${estatuBg};color:${statusColor};font-size:10px;font-weight:700;padding:2px 8px;border-radius:4px">${t.estado}</span>
            </div>
            <div style="font-size:13px;font-weight:600;color:var(--text);margin-bottom:6px">${esc(t.patient)}</div>
            <div style="display:flex;gap:14px;font-size:11px;color:var(--text-muted)">
              <span><span style="color:var(--text);font-weight:600">${esc(t.service)}</span> • ${horaCreacion} a ${horaFin}</span>
              <span>Espera: <span style="color:#3B72F2;font-weight:600">${waitTime}</span></span>
              ${t.attendingDuration ? `<span>Atención: <span style="color:#22C55E;font-weight:600">${t.attendingDuration}</span></span>` : ''}
            </div>
          </div>
          <div style="text-align:right">
            <div style="font-size:10px;color:var(--text-muted);margin-bottom:4px">📋</div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2" style="opacity:0.5"><polyline points="9 18 15 12 9 6"/></svg>
          </div>
        </div>
      `;
    }).join('');
  }
  
  openModal('modal-operador-pacientes');
}

// ── LONG-WAIT ALERT SYSTEM ────────────────────────
const WAIT_ALERT_MS    = 20 * 60000; // 20 min warning
const WAIT_CRITICAL_MS = 30 * 60000; // 30 min critical
const alertedSet = new Set();
function checkLongWaits() {
  state.turnos.filter(t => t.estado==='En fila').forEach(t => {
    const w = getWaitTime(t);
    if (w >= WAIT_CRITICAL_MS && !alertedSet.has(t.id+'_c')) {
      alertedSet.add(t.id+'_c');
      showToast(`🚨 Turno ${t.id} lleva ${fmtDuration(w)} — CRÍTICO`, 'error');
      addNotif('espera', `⚠️ Espera crítica — ${t.id}`, `${t.patient} lleva ${fmtDuration(w)} en fila · ${t.service}`);
    } else if (w >= WAIT_ALERT_MS && !alertedSet.has(t.id+'_w')) {
      alertedSet.add(t.id+'_w');
      showToast(`⏰ ${t.id} (${t.patient}) lleva ${fmtDuration(w)} esperando`);
      addNotif('espera', `Espera prolongada — ${t.id}`, `${t.patient} · ${fmtDuration(w)} · ${t.service}`);
    }
  });
}
setInterval(checkLongWaits, 60000);

let panelTimerInterval = null;

// ══════════════════════════════════════════════════
//  MÓDULO RECEPCIÓN
// ══════════════════════════════════════════════════
let recServicioSeleccionado = '';
let recServicioColor = '#3B72F2';

function renderRecepcion() {
  _recPoblarServiciosBtns();
  renderRecQueue();
  // Foco automático en el campo nombre al abrir la pantalla
  setTimeout(() => { const el = document.getElementById('rec-nombre'); if (el) el.focus(); }, 80);
}

function _recPoblarServiciosBtns() {
  const cont = document.getElementById('rec-servicios-btns');
  if (!cont) return;
  const lista = state.servicios.length > 0
    ? state.servicios.map(s => ({ nombre: s.nombre, color: s.color || '#3B72F2' }))
    : [
        { nombre:'Neurología',   color:'#3B72F2' },
        { nombre:'Psiquiatría',  color:'#8B5CF6' },
        { nombre:'Kinesiología', color:'#22C55E' },
        { nombre:'General',      color:'#F59E0B' },
        { nombre:'Laboratorio',  color:'#EF4444' },
      ];
  cont.innerHTML = lista.map(s => {
    const sel = recServicioSeleccionado === s.nombre;
    const c   = s.color;
    const bg  = sel ? c + '22' : 'white';
    const brd = sel ? c : 'var(--border)';
    const txt = sel ? c : 'var(--text-muted)';
    return `<button class="rec-svc-btn" onclick="recSelSvc('${esc(s.nombre)}','${esc(c)}')"
      style="border-color:${brd};background:${bg};color:${txt}">
      <span class="rec-svc-dot" style="background:${c}"></span>${esc(s.nombre)}
    </button>`;
  }).join('');
}

function recSelSvc(nombre, color) {
  recServicioSeleccionado = nombre;
  recServicioColor = color || '#3B72F2';
  _recPoblarServiciosBtns();
}

async function crearTurnoRecepcion() {
  const nombre = document.getElementById('rec-nombre')?.value.trim();
  const doc    = document.getElementById('rec-doc')?.value.trim();
  if (!nombre) {
    showToast('El nombre del paciente es obligatorio', 'error');
    document.getElementById('rec-nombre')?.focus();
    return;
  }
  if (!recServicioSeleccionado) {
    showToast('Selecciona el servicio antes de emitir el turno', 'error');
    return;
  }
  try {
    const data = await API.post('/api/turnos', { paciente: nombre, documento: doc || null, servicio: recServicioSeleccionado });
    const t = normalizarTurno(data.turno);
    if (state.turnos.findIndex(x => x.dbId === t.dbId) < 0) state.turnos.push(t);

    // Mostrar ticket emitido
    document.getElementById('rec-ticket-code').textContent = t.codigo;
    document.getElementById('rec-ticket-name').textContent = t.patient;
    document.getElementById('rec-ticket-svc').textContent  = t.service;
    const ticketBox = document.getElementById('rec-ultimo-ticket');
    if (ticketBox) ticketBox.style.display = 'block';

    // Limpiar formulario para siguiente paciente
    document.getElementById('rec-nombre').value = '';
    document.getElementById('rec-doc').value = '';
    recServicioSeleccionado = '';
    _recPoblarServiciosBtns();
    renderRecQueue();
    document.getElementById('rec-nombre').focus();

    showToast(`✅ Turno ${t.codigo} — ${nombre}`, 'success');
    addNotif('turno', `Turno ${t.codigo} creado`, `${nombre} · ${t.service}`);
  } catch (e) {
    showToast('Error al crear turno: ' + e.message, 'error');
  }
}

function renderRecQueue() {
  const elActivos = document.getElementById('rec-activos-list');
  const elEspera  = document.getElementById('rec-queue-list');
  const cntEl     = document.getElementById('rec-queue-count');
  if (!elEspera) return;

  const enFila    = state.turnos.filter(t => t.estado === 'En fila');
  const activos   = state.turnos.filter(t => t.estado === 'Llamando' || t.estado === 'Atendiendo');
  if (cntEl) cntEl.textContent = enFila.length;

  // Activos (siendo atendidos / llamando)
  if (elActivos) {
    if (!activos.length) {
      elActivos.innerHTML = '';
    } else {
      elActivos.innerHTML = activos.map(t => {
        const bg = t.estado === 'Atendiendo' ? '#DCFCE7' : '#EEF2FF';
        const bc = t.estado === 'Atendiendo' ? '#86EFAC' : '#BFDBFE';
        const tc = t.estado === 'Atendiendo' ? '#16A34A' : '#2563EB';
        return `<div style="padding:10px 12px;border-radius:9px;background:${bg};border:1px solid ${bc};margin-bottom:6px">
          <div style="display:flex;align-items:center;justify-content:space-between">
            <span style="font-family:'DM Mono',monospace;font-size:15px;font-weight:700;color:${tc}">${esc(t.codigo)}</span>
            ${badgeHTML(t.estado)}
          </div>
          <div style="font-size:13px;font-weight:500;margin-top:3px">${esc(t.patient)}</div>
          <div style="font-size:11.5px;color:var(--text-muted);margin-top:2px">${esc(t.service)} · ${esc(t.modulo !== '—' ? t.modulo : 'Sin módulo aún')}</div>
        </div>`;
      }).join('');
    }
  }

  // En fila (esperando)
  if (!enFila.length) {
    elEspera.innerHTML = activos.length ? '' : `<div style="text-align:center;padding:28px 12px;color:var(--text-muted)">
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"
        style="opacity:.25;margin-bottom:8px;display:block;margin-left:auto;margin-right:auto">
        <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
      </svg>
      <p style="font-size:13px">Sin pacientes en espera
    </div>`;
    return;
  }
  elEspera.innerHTML = enFila.map(t => {
    const wait   = t.tsCreated ? Math.floor((Date.now() - t.tsCreated) / 60000) : 0;
    const wColor = wait > 20 ? '#EF4444' : wait > 10 ? '#F59E0B' : 'var(--text-muted)';
    return `<div style="padding:10px 12px;border-radius:9px;background:white;border:1px solid var(--border);margin-bottom:6px">
      <div style="display:flex;align-items:center;justify-content:space-between">
        <span style="font-family:'DM Mono',monospace;font-size:15px;font-weight:700;color:var(--primary)">${esc(t.codigo)}</span>
        <span style="font-size:11.5px;font-weight:600;color:${wColor}">${wait} min</span>
      </div>
      <div style="font-size:13px;font-weight:500;margin-top:3px">${esc(t.patient)}</div>
      <div style="font-size:11.5px;color:var(--text-muted);margin-top:2px">${esc(t.service)}</div>
    </div>`;
  }).join('');
}

// ══════════════════════════════════════════════════
//  MÓDULO DE ATENCIÓN — ASIGNACIÓN RÁPIDA DE MÓDULO
// ══════════════════════════════════════════════════
async function aplicarModuloRapido(modulo) {
  if (!currentUser) return;
  
  // Si intenta cambiar de módulo, validar permisos
  const moduloActual = currentUser?.modulo || 'Sin módulo';
  if (modulo !== moduloActual && modulo !== 'Sin módulo') {
    // Verificar si el módulo ya está siendo usado por otro usuario
    const usuarioEnModulo = state.users.find(u => u.modulo === modulo && u.id !== currentUser.id && u.active);
    
    // Si está siendo usado y NO es admin, denegar
    if (usuarioEnModulo && currentUser?.rol !== 'Administrador') {
      showToast(`⛔ El módulo ${modulo} está siendo usado por ${usuarioEnModulo.nombre || usuarioEnModulo.name}`, 'error');
      // Revertir el selector al módulo actual
      document.getElementById('panel-modulo-quick').value = moduloActual;
      return;
    }
  }
  
  // Si el usuario actual ya tiene un módulo, solo admin puede quitarlo
  if (moduloActual !== 'Sin módulo' && modulo === 'Sin módulo' && currentUser?.rol !== 'Administrador') {
    showToast('⛔ Solo administradores pueden liberar un módulo', 'error');
    // Revertir el selector
    document.getElementById('panel-modulo-quick').value = moduloActual;
    return;
  }
  
  const key = 'nt_mimodulo_' + (currentUser.username || currentUser.id);
  localStorage.setItem(key, modulo);
  currentUser.modulo = modulo;

  // Actualizar en state.users también
  const userInState = state.users.find(u => u.id === currentUser.id);
  if (userInState) userInState.modulo = modulo;

  // Actualizar visualmente en sidebar
  const roleEl = document.getElementById('sidebar-user-role');
  if (roleEl) roleEl.textContent = (currentUser.rol || '') + (modulo && modulo !== 'Sin módulo' ? ' · ' + modulo : '');

  // Sincronizar selector de config
  const configSel = document.getElementById('mi-modulo-select');
  if (configSel) configSel.value = modulo;

  // Persistir en servidor (no bloquear si falla)
  if (currentUser.id) {
    try { await API.patch(`/api/usuarios/${currentUser.id}/modulo`, { modulo }); } catch (_) {}
  }
  showToast('✅ Módulo: ' + modulo);
  renderPanel();
  renderInicio(); // Actualizar vista de módulos
}

function renderPanel() {
  // Poblar y sincronizar el selector rápido de módulo
  const mqSel = document.getElementById('panel-modulo-quick');
  if (mqSel) {
    const modList = state.modulos.length > 0
      ? state.modulos.map(m => m.nombre)
      : ['Módulo 01','Módulo 02','Módulo 03','Módulo 04','Módulo 05','Módulo 06','Módulo 07','Módulo 08'];
    const curMod = currentUser?.modulo || 'Sin módulo';
    const isAdmin = currentUser?.rol === 'Administrador';
    
    // Generar opciones: mostrar todos para admin, filtrados para usuarios normales
    const options = [`<option value="Sin módulo">Sin módulo asignado</option>`];
    modList.forEach(m => {
      const usuarioEnModulo = state.users.find(u => u.modulo === m && u.active);
      const esModuloDelUsuario = m === curMod;
      const puedeUsarlo = !usuarioEnModulo || esModuloDelUsuario || isAdmin;
      
      if (puedeUsarlo) {
        const suffix = usuarioEnModulo && !esModuloDelUsuario && isAdmin 
          ? ` (${usuarioEnModulo.nombre || usuarioEnModulo.name})` 
          : '';
        options.push(`<option value="${esc(m)}"${m === curMod ? ' selected' : ''}>${esc(m)}${suffix}</option>`);
      } else if (usuarioEnModulo) {
        // Para usuarios normales, mostrar módulos en uso como deshabilitados
        options.push(`<option value="${esc(m)}" disabled>${esc(m)} (En uso)</option>`);
      }
    });
    
    mqSel.innerHTML = options.join('');
    mqSel.value = curMod;
  }

  // Show operator badge
  const opName  = currentUser?.nombre || currentUser?.name || 'Sistema';
  const opMod   = currentUser?.modulo || 'Sin módulo';
  const opNameEl = document.getElementById('panel-operator-name');
  const opModEl  = document.getElementById('panel-modulo-label');
  if (opNameEl) opNameEl.textContent = opName;
  if (opModEl)  opModEl.textContent  = opMod !== 'Sin módulo' ? opMod : 'Sin módulo asignado';

  const serving = state.turnos.filter(t => t.estado === 'Atendiendo');
  const calling = state.turnos.filter(t => t.estado === 'Llamando');
  const waiting = state.turnos.filter(t => t.estado === 'En fila');
  // Priorizar el turno del módulo de ESTE operador; si no, el primero global
  const myMod = opMod !== 'Sin módulo' ? opMod : null;
  const current = (myMod && serving.find(t => t.modulo === myMod))
    || (myMod && calling.find(t => t.modulo === myMod))
    || serving[0] || calling[0] || waiting[0];

  if (current) {
    document.getElementById('panel-turno-id').textContent     = current.id;
    document.getElementById('panel-patient-name').textContent = current.patient;
    const modLabel = current.modulo && current.modulo !== '—' ? current.modulo : current.service;
    const estadoBadge = current.estado === 'Llamando'
      ? `<span style="display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:700;background:#EEF2FF;color:#3B72F2;padding:2px 9px;border-radius:20px;margin-left:8px">● LLAMANDO</span>`
      : current.estado === 'Atendiendo'
      ? `<span style="display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:700;background:#DCFCE7;color:#16A34A;padding:2px 9px;border-radius:20px;margin-left:8px">● ATENDIENDO</span>`
      : '';
    document.getElementById('panel-patient-info').innerHTML = `${modLabel}${estadoBadge}`;
    updatePanelTimers(current);
  } else {
    document.getElementById('panel-turno-id').textContent    = '—';
    document.getElementById('panel-patient-name').textContent = 'Sin turno activo';
    document.getElementById('panel-patient-info').textContent = 'Presione "Siguiente" para llamar el próximo turno';
  }

  const allWaiting = [...calling, ...waiting];
  document.getElementById('queue-count').textContent = allWaiting.length + ' Total';
  const queueEl = document.getElementById('queue-list');
  queueEl.innerHTML = allWaiting.slice(0, 6).map(t => {
    const color   = getSvcColor(t.id[0]);
    const waitMs  = getWaitTime(t);
    const llamandoBadge = t.estado==='Llamando' ? `<span style="color:var(--primary);font-size:10px;font-weight:700;margin-left:4px">● LLAMANDO</span>` : '';
    return `<div class="queue-item" onclick="selectQueueItem('${t.id}')">
      <div class="queue-item-top">
        <div class="queue-id" style="color:${color}">${t.id}</div>
        <div class="queue-wait">Espera: <span class="live-wait-${t.id.replace('-','_')}">${fmtMMSS(waitMs)}</span></div>
      </div>
      <div class="queue-name">${t.patient}</div>
      <div class="queue-location">${t.modulo !== '—' ? t.modulo : 'Sin módulo'}${llamandoBadge}</div>
    </div>`;
  }).join('');

  if (panelTimerInterval) clearInterval(panelTimerInterval);
  panelTimerInterval = setInterval(() => {
    const myM = (currentUser?.modulo && currentUser.modulo !== 'Sin módulo') ? currentUser.modulo : null;
    const cur = (myM && state.turnos.find(t=>(t.estado==='Atendiendo'||t.estado==='Llamando') && t.modulo===myM))
      || state.turnos.find(t=>t.estado==='Atendiendo')
      || state.turnos.find(t=>t.estado==='Llamando')
      || state.turnos.find(t=>t.estado==='En fila');
    if (cur) updatePanelTimers(cur);
    state.turnos.filter(t=>t.estado==='En fila'||t.estado==='Llamando').forEach(t => {
      const el = document.querySelector(`.live-wait-${t.id.replace('-','_')}`);
      if (el) el.textContent = fmtMMSS(getWaitTime(t));
    });
  }, 1000);
}

function updatePanelTimers(t) {
  const waitEl    = document.getElementById('panel-wait-time');
  const serviceEl = document.getElementById('panel-service-time');
  if (waitEl)    waitEl.textContent    = fmtMMSS(getWaitTime(t)) + ' min';
  
  // Mostrar tiempo de atención en vivo (HH:MM:SS)
  if (serviceEl) {
    if (t.estado === 'Atendiendo' || t.estado === 'Llamando') {
      // Tiempo en vivo mientras se atiende
      const startTime = t.tsAtendidoStart || t.tsAtendido || Date.now();
      const currentTime = Date.now();
      const durationMs = currentTime - startTime;
      const hours = Math.floor(durationMs / 3600000);
      const minutes = Math.floor((durationMs % 3600000) / 60000);
      const seconds = Math.floor((durationMs % 60000) / 1000);
      const liveTime = `${String(hours).padStart(2,'0')}:${String(minutes).padStart(2,'0')}:${String(seconds).padStart(2,'0')}`;
      serviceEl.textContent = liveTime + ' ⏱';
    } else if (t.attendingDuration) {
      // Mostrar tiempo finalizado
      serviceEl.textContent = t.attendingDuration + ' ✓';
    } else {
      serviceEl.textContent = '00:00:00';
    }
  }
}

function selectQueueItem(id) {
  const t = state.turnos.find(x => x.id === id);
  if (!t) return;
  document.getElementById('panel-turno-id').textContent = t.id;
  document.getElementById('panel-patient-name').textContent = t.patient;
  document.getElementById('panel-patient-info').textContent = `${t.service} • ${t.modulo}`;
}

/* ── CONVERSIÓN NÚMEROS A PALABRAS ─────────────── */
function numberToWords(n) {
  if (n === 0) return 'cero';
  const ones   = ['', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve'];
  const teens  = ['diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve'];
  const tens   = ['', '', 'veinte', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];
  const scales = ['', 'mil', 'millón', 'mil millones', 'billón'];

  function convert(num, scale) {
    if (num === 0) return '';
    let result = '';
    
    const hundreds = Math.floor(num / 100);
    if (hundreds > 0) {
      const h = ['', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos', 'seiscientos', 'setecientos', 'ochocientos', 'novecientos'];
      result += h[hundreds] + ' ';
    }
    
    const remainder = num % 100;
    if (remainder >= 10 && remainder < 20) {
      result += teens[remainder - 10] + ' ';
    } else {
      const t = Math.floor(remainder / 10);
      const o = remainder % 10;
      if (t > 0) result += tens[t] + (o > 0 ? ' y ' : ' ');
      if (o > 0) result += ones[o] + ' ';
    }
    
    if (scale > 0) result += scales[scale] + ' ';
    return result.trim();
  }

  let num = Math.abs(Math.floor(n));
  if (num === 0) return 'cero';
  
  let result = '';
  let scale = 0;
  while (num > 0) {
    const chunk = num % 1000;
    if (chunk > 0) {
      result = convert(chunk, scale) + ' ' + result;
    }
    num = Math.floor(num / 1000);
    scale++;
  }
  
  return result.trim().replace(/\s+/g, ' ');
}

/* ── TTS ENGINE (SÍNTESIS DE VOZ) ───────────────── */
const TTS = {
  synth: window.speechSynthesis,
  voices: [],
  settings: { lang:'es-ES', rate:0.88, pitch:1.05, volume:1, voice:null, repeat:2, delay:1200 },
  isAvailable: !!window.speechSynthesis,
  isSpeaking: false,

  init() {
    if (!this.isAvailable) {
      console.warn('⚠️ Síntesis de voz no disponible en este navegador');
      return;
    }
    try {
      const load = () => {
        this.voices = this.synth.getVoices().filter(v => v.lang.startsWith('es'));
        if (!this.voices.length) this.voices = this.synth.getVoices();
        this.pickBestVoice();
        this.populateVoiceSelect();
      };
      load();
      this.synth.addEventListener('voiceschanged', load);
    } catch(e) {
      console.error('❌ Error inicializando TTS:', e.message);
    }
  },

  pickBestVoice() {
    // Preferred Spanish voices in priority order
    const preferred = ['Google español', 'Microsoft Sabina', 'Monica', 'Paulina', 'Jorge', 'Google español de Estados Unidos'];
    for (const name of preferred) {
      const v = this.voices.find(v => v.name.includes(name.split(' ')[1]) || v.name === name);
      if (v) { this.settings.voice = v; return; }
    }
    if (this.voices.length) this.settings.voice = this.voices[0];
  },

  populateVoiceSelect() {
    const sel = document.getElementById('tts-voice-select');
    if (!sel) return;
    sel.innerHTML = this.voices.map(v =>
      `<option value="${v.name}" ${this.settings.voice?.name===v.name?'selected':''}>${v.name} (${v.lang})</option>`
    ).join('');
  },

  // MEJORADO: Convierte ID a texto hablado: "G-122" → "Turno G ciento veintidós"
  formatTurnoId(id) {
    if (!id) return '';
    const idStr = String(id).trim();
    const parts = idStr.split('-');
    
    if (parts.length === 2) {
      const prefijo = parts[0].toUpperCase();
      const numero = parseInt(parts[1], 10);
      
      if (!isNaN(numero)) {
        const numeroEnPalabras = numberToWords(numero);
        return `${prefijo} ${numeroEnPalabras}`;
      }
    }
    
    return idStr;
  },

  // MEJORADO: Construye un anuncio profesional y natural
  buildMessage(turno) {
    if (!turno || !turno.id) return '';
    
    try {
      const turnoAnunciado = this.formatTurnoId(turno.id);
      
      // Obtener nombre del paciente — normalizar desde diferentes fuentes posibles
      let pacienteNombre = (turno.patient || turno.paciente || turno.nombre || 'paciente').trim();
      
      // Limpieza agresiva: remover TODO lo que no sea letra, número, espacio
      // Esto evita que caracteres especiales causen deletreo
      pacienteNombre = pacienteNombre
        .normalize('NFD')  // Descomponer caracteres acentuados
        .replace(/[\u0300-\u036f]/g, '')  // Remover acentos
        .replace(/[^a-záéíóúñA-ZÁÉÍÓÚÑ0-9\s]/g, '')  // Solo letras, números y espacios
        .replace(/\s+/g, ' ')  // Normalizar espacios
        .trim()
        .toLowerCase();
      
      // Validación final
      if (!pacienteNombre || pacienteNombre.length === 0) {
        pacienteNombre = 'paciente';
      }
      
      // Construir mensaje base
      let mensaje = `Turno ${turnoAnunciado}. Paciente ${pacienteNombre}.`;
      
      // Agregar módulo si existe
      if (turno.modulo && turno.modulo !== '—' && turno.modulo.trim()) {
        // Limpiar también el nombre del módulo
        let moduloLimpio = turno.modulo
          .replace(/[^a-záéíóúñA-ZÁÉÍÓÚÑ0-9\s]/g, '')
          .trim();
        if (moduloLimpio) {
          mensaje += ` Por favor diríjase al ${moduloLimpio}.`;
        }
      }
      
      return mensaje;
    } catch(e) {
      console.error('❌ Error en buildMessage:', e.message);
      return `Turno ${turno.id || 'desconocido'}`;
    }
  },

  // MEJORADO: Reproduce el anuncio con control total de propiedades
  speak(turno) {
    if (!this.isAvailable) {
      showToast('⚠️ Síntesis de voz no disponible en este navegador', 'error');
      return;
    }
    
    if (!turno || !turno.id) {
      console.error('❌ TTS.speak(): Turno inválido', turno);
      showToast('❌ Error: Datos del turno inválidos', 'error');
      return;
    }

    // Cancelar cualquier síntesis en curso
    if (this.synth.speaking) {
      this.synth.cancel();
    }
    
    this.isSpeaking = true;

    try {
      showCallingOverlay(turno);
      const mensaje = this.buildMessage(turno);
      let contador = 0;
      const repeticiones = parseInt(this.settings.repeat) || 2;
      const delayMs = parseInt(this.settings.delay) || 1200;

      const reproducirUnaVez = () => {
        try {
          const utterance = new SpeechSynthesisUtterance(mensaje);
          
          // Aplicar configuración de voz
          if (this.settings.voice && this.settings.voice.name) {
            utterance.voice = this.settings.voice;
          }
          
          utterance.lang   = this.settings.lang || 'es-ES';
          utterance.rate   = parseFloat(this.settings.rate)   || 0.88;
          utterance.pitch  = parseFloat(this.settings.pitch)  || 1.05;
          utterance.volume = Math.min(1, Math.max(0.1, parseFloat(this.settings.volume) || 1));

          utterance.onend = () => {
            contador++;
            if (contador < repeticiones) {
              // Esperar antes de repetir
              setTimeout(reproducirUnaVez, delayMs);
            } else {
              // Síntesis completada
              this.isSpeaking = false;
              hideCallingOverlay();
              console.log('✅ Síntesis completada:', mensaje.substring(0, 30) + '...');
            }
          };

          utterance.onerror = (evento) => {
            console.error('❌ Error de síntesis:', evento.error);
            this.isSpeaking = false;
            hideCallingOverlay();
            showToast('❌ Error en síntesis de voz: ' + evento.error, 'error');
          };

          this.synth.speak(utterance);
        } catch(error) {
          console.error('❌ Error en reproducirUnaVez():', error.message);
          this.isSpeaking = false;
          hideCallingOverlay();
          showToast('❌ Error al reproducir voz', 'error');
        }
      };

      reproducirUnaVez();
    } catch(error) {
      console.error('❌ Error en TTS.speak():', error.message);
      this.isSpeaking = false;
      hideCallingOverlay();
      showToast('❌ Error al reproducir anuncio', 'error');
    }
  },

  stop() {
    try {
      if (this.synth && this.synth.speaking) {
        this.synth.cancel();
      }
      this.isSpeaking = false;
      hideCallingOverlay();
      console.log('✅ Síntesis detenida');
    } catch(error) {
      console.error('❌ Error al detener TTS:', error.message);
    }
  }
};

/* ── CALLING OVERLAY ───────────────────────────────
   Muestra turno siendo llamado con animaciones visuales y sonoras
 */
function showCallingOverlay(turno) {
  let overlay = document.getElementById('calling-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'calling-overlay';
    overlay.setAttribute('role', 'alert');
    overlay.setAttribute('aria-live', 'assertive');
    overlay.setAttribute('aria-atomic', 'true');
    overlay.innerHTML = `
      <div class="calling-box">
        <div class="calling-waves">
          <span aria-hidden="true"></span><span aria-hidden="true"></span><span aria-hidden="true"></span><span aria-hidden="true"></span>
        </div>
        <div class="calling-label" aria-live="polite">LLAMANDO</div>
        <div class="calling-id" id="co-id" aria-label="Código de turno"></div>
        <div class="calling-name" id="co-name" aria-label="Nombre del paciente"></div>
        <div class="calling-modulo" id="co-modulo" aria-label="Módulo de atención"></div>
        <button 
          class="calling-stop" 
          onclick="TTS.stop()"
          aria-label="Detener reproducción de voz"
          title="Detiene inmediatamente la síntesis de voz">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>
          Detener
        </button>
      </div>`;
    document.body.appendChild(overlay);
  }
  document.getElementById('co-id').textContent   = turno.id || '—';
  document.getElementById('co-name').textContent  = turno.patient || '—';
  document.getElementById('co-modulo').textContent = (turno.modulo && turno.modulo !== '—') ? turno.modulo : '';
  overlay.classList.add('visible');
}

function hideCallingOverlay() {
  const overlay = document.getElementById('calling-overlay');
  if (overlay) overlay.classList.remove('visible');
}

// llamarTurno definido arriba (versión API)

// siguienteTurno definido arriba (versión API)

function finalizarTurno() { finalizarTurnoAPI(''); }
function cancelarTurno()  { cancelarTurnoAPI(); }
function atenderTurno()   { atenderTurnoAPI(); }

// ── ESTADÍSTICAS POR FUNCIONARIO ─────────────────
async function renderEstadisticasFuncionarios() {
  const tbody = document.getElementById('est-func-body');
  if (!tbody) return;
  tbody.innerHTML = '<td colspan="4" style="text-align:center;padding:24px;color:var(--text-muted)">Cargando...</td>';
  try {
    const data = await API.get('/api/estadisticas');
    const rows = data.estadisticas || [];
    if (!rows.length) {
      tbody.innerHTML = '<td colspan="4" style="text-align:center;padding:24px;color:var(--text-muted)">Sin datos para hoy</td>';
      return;
    }
    const colors = ['#3B72F2','#8B5CF6','#F97316','#22C55E','#F59E0B','#EF4444'];
    tbody.innerHTML = rows.map(r => {
      const nom = r.usuario || '—';
      const ini = nom.split(' ').map(x=>x[0]).join('').slice(0,2).toUpperCase();
      const col = colors[nom.charCodeAt(0) % colors.length];
      const tProm = r.tiempo_promedio_atencion != null ? `<span class="timer-pill timer-blue">${parseFloat(r.tiempo_promedio_atencion).toFixed(1)} min</span>` : '—';
      const modulo = r.modulo_principal || '—';
      return `
        <td><div style="display:flex;align-items:center;gap:8px">
          <div style="width:30px;height:30px;border-radius:50%;background:${col};color:white;font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0">${esc(ini)}</div>
          <span style="font-weight:600;font-size:13px">${esc(nom.split(' ').slice(0,3).join(' '))}</span>
        </div></td>
        <td style="font-weight:700;color:var(--primary);font-size:15px">${r.turnos_atendidos}</td>
        <td>${tProm}</td>
        <td style="color:var(--text-muted);font-size:12.5px">${esc(modulo)}</td>
      `;
    }).join('');
  } catch(e) {
    tbody.innerHTML = `<td colspan="4" style="text-align:center;padding:24px;color:var(--danger)">${esc(e.message)}</td>`;
  }
}

// ── HISTORIAL ─────────────────────────────────────
let histPage = 1;
const HIST_PER_PAGE = 5;

function renderHistorial() {
  const search    = (document.getElementById('hist-search')?.value || '').toLowerCase().trim();
  const svcFilter = document.getElementById('hist-servicio')?.value || '';
  const estFilter = document.getElementById('hist-estado')?.value || '';
  const opFilter  = document.getElementById('hist-operador')?.value || '';
  const periodo   = document.getElementById('hist-periodo')?.value || 'todo';

  // Populate operator dropdown dynamically (once)
  const opSel = document.getElementById('hist-operador');
  if (opSel && opSel.options.length <= 1) {
    const ops = [...new Set(state.turnos.filter(t=>t.atendidoPor).map(t=>t.atendidoPor))].sort();
    ops.forEach(op => {
      const o = document.createElement('option');
      o.value = op; o.textContent = op.split(' ').slice(0,2).join(' ');
      opSel.appendChild(o);
    });
  }

  // Period filter
  const now = Date.now();
  const periodoMs = { hoy: 86400000, '7': 7*86400000, '30': 30*86400000 };

  let list = state.turnos.filter(t => ['Finalizado','Cancelado','No atendido'].includes(t.estado));
  if (periodo !== 'todo' && periodoMs[periodo]) list = list.filter(t => t.tsCreated && (now - t.tsCreated) <= periodoMs[periodo]);
  if (svcFilter) list = list.filter(t => t.service === svcFilter);
  if (estFilter) list = list.filter(t => t.estado === estFilter);
  if (opFilter)  list = list.filter(t => t.atendidoPor === opFilter);
  if (search)    list = list.filter(t =>
    t.patient.toLowerCase().includes(search) ||
    t.id.toLowerCase().includes(search) ||
    (t.doc||'').includes(search) ||
    (t.service||'').toLowerCase().includes(search)
  );

  // Summary bar
  const sumBar = document.getElementById('hist-summary-bar');
  if (sumBar) {
    const fin = list.filter(t=>t.estado==='Finalizado');
    const can = list.filter(t=>t.estado==='Cancelado');
    const waits = fin.filter(t=>t.tsCreated&&t.tsAtendido).map(t=>(t.tsAtendido-t.tsCreated)/60000);
    const avgW = waits.length ? Math.round(waits.reduce((a,b)=>a+b,0)/waits.length) : 0;
    const svcs  = fin.filter(t=>t.tsAtendido&&t.tsFin).map(t=>(t.tsFin-t.tsAtendido)/60000);
    const avgS = svcs.length ? Math.round(svcs.reduce((a,b)=>a+b,0)/svcs.length) : 0;
    const pill = (label, val, bg, col) =>
      `<div style="display:flex;align-items:center;gap:6px;padding:7px 12px;background:${bg};border-radius:8px;font-size:12.5px">
        <span style="color:${col};font-weight:700">${val}</span>
        <span style="color:var(--text-muted)">${label}</span>
      </div>`;
    sumBar.innerHTML =
      pill('registros', list.length, 'var(--bg)', 'var(--primary)') +
      pill('finalizados', fin.length, '#DCFCE7', '#16A34A') +
      pill('cancelados', can.length, '#FEE2E2', '#DC2626') +
      (avgW ? pill('espera prom.', avgW+'m', '#EEF2FF', 'var(--primary)') : '') +
      (avgS ? pill('atención prom.', avgS+'m', '#FEF3C7', '#D97706') : '');
  }

  const total = list.length;
  const pages = Math.max(1, Math.ceil(total/HIST_PER_PAGE));
  if (histPage > pages) histPage = 1;
  const start = (histPage-1)*HIST_PER_PAGE;
  const slice = list.slice(start, start+HIST_PER_PAGE);

  const tbody = document.getElementById('historial-table-body');
  if (!slice.length) {
    tbody.innerHTML = `<td colspan="9" style="text-align:center;padding:28px;color:var(--text-muted)">
      <div style="font-size:24px;margin-bottom:8px">🔍</div>
      <div style="font-size:13px">Sin resultados para los filtros actuales</div>
      <button onclick="clearHistFiltros()" style="margin-top:10px;padding:6px 16px;background:var(--primary-light);color:var(--primary);border:none;border-radius:8px;font-family:inherit;font-size:12px;font-weight:600;cursor:pointer">Limpiar filtros</button>
    </td>`;
  } else {
    tbody.innerHTML = slice.map(t => {
      const color   = getSvcColor(t.id[0]);
      const waitMs  = t.tsCreated && t.tsAtendido ? msBetween(t.tsCreated, t.tsAtendido) : null;
      const svcMs   = getServiceTime(t);
      const waitStr = waitMs ? `<span class="timer-pill timer-blue">${fmtDuration(waitMs)}</span>` : '—';
      // Mostrar attendingDuration si existe (HH:MM:SS), sino usar el cálculo de svcMs
      const svcStr  = t.attendingDuration 
        ? `<span class="timer-pill timer-green" style="background:#DCFCE7;color:#16A34A">${t.attendingDuration}</span>` 
        : svcMs ? `<span class="timer-pill timer-gray">${fmtDuration(svcMs)}</span>` : '—';
      const opName  = t.atendidoPor ? t.atendidoPor.split(' ').slice(0,2).join(' ') : '—';
      const notaIcon = t.nota
        ? `<span title="${esc(t.nota)}" style="cursor:help;font-size:14px">📝</span>`
        : '<span style="color:var(--border)">—</span>';
      return `
        <td><span class="turno-id" style="cursor:pointer;color:${color}" onclick="openTurnoDetailById('${esc(t.id)}')">${esc(t.id)}</span></td>
        <td style="font-weight:500">${esc(t.patient)}</td>
        <td><span style="display:flex;align-items:center;gap:5px"><span style="width:7px;height:7px;border-radius:50%;background:${color};display:inline-block"></span>${esc(t.service)}</span></td>
        <td style="font-size:12px;color:var(--text-muted)">${esc(opName)}</td>
        <td style="color:var(--text-muted);font-family:'DM Mono',monospace;font-size:12.5px">${tsToHHMM(t.tsCreated)}</td>
        <td>${waitStr}</td>
        <td>${svcStr}</td>
        <td>${badgeHTML(t.estado)}</td>
        <td style="text-align:center">${notaIcon}</td>
      `;
    }).join('');
  }

  document.getElementById('historial-pagination-info').textContent =
    total ? `Mostrando ${Math.min(start+1,total)}–${Math.min(start+HIST_PER_PAGE,total)} de ${total} resultado${total!==1?'s':''}` : '';
  const btns = document.getElementById('historial-pagination-btns');
  btns.innerHTML = `<button class="page-btn" onclick="changeHistPage(${histPage-1})" ${histPage===1?'disabled':''}>‹</button>` +
    Array.from({length:Math.min(pages,5)},(_,i)=>i+1).map(p=>`<button class="page-btn ${p===histPage?'active':''}" onclick="changeHistPage(${p})">${p}</button>`).join('') +
    (pages>5?`<span style="padding:0 4px;color:var(--text-muted)">…</span><button class="page-btn ${histPage===pages?'active':''}" onclick="changeHistPage(${pages})">${pages}</button>`:'') +
    `<button class="page-btn" onclick="changeHistPage(${histPage+1})" ${histPage===pages?'disabled':''}>›</button>`;
}
function changeHistPage(p) {
  const pages = Math.max(1, Math.ceil(state.turnos.filter(t=>['Finalizado','Cancelado','No atendido'].includes(t.estado)).length/HIST_PER_PAGE));
  if (p<1||p>pages) return;
  histPage=p; renderHistorial();
}
function filterHistorial() { histPage=1; renderHistorial(); }
function clearHistFiltros() {
  ['hist-search','hist-servicio','hist-estado','hist-operador','hist-periodo'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = el.tagName==='SELECT' ? el.options[0].value : '';
  });
  // Reset operator dropdown to rebuild on next render
  const opSel = document.getElementById('hist-operador');
  if (opSel) { while(opSel.options.length>1) opSel.remove(1); }
  filterHistorial();
}

// ── TV ────────────────────────────────────────────
// ── TV ────────────────────────────────────────────
let tvInterval = null;

function _renderTVNow() {
  // Actualiza el panel TV principal y fullscreen si está abierta (llamado por SSE y siguienteTurno)
  const isAdmin = currentUser?.role === 'Administrador';
  if (document.getElementById('tv-queue-list')) {
    _renderTVContent('tv-time','tv-date','tv-queue-list','tv-serving-list','tv-queue-count','tv-serving-count', isAdmin);
  }
  const fs = document.getElementById('tv-fullscreen');
  if (fs && fs.classList.contains('open')) {
    _renderTVContent('tvf-time','tvf-date','tvf-queue-list','tvf-serving-list','tvf-queue-count','tvf-serving-count', isAdmin);
  }
}

let tvClockInterval = null;
function renderTV() {
  registerTVWindow(true); // Registrar que TV está abierta
  const isAdmin = currentUser?.role === 'Administrador';
  _renderTVContent('tv-time','tv-date','tv-queue-list','tv-serving-list','tv-queue-count','tv-serving-count', isAdmin);
  if (tvInterval) clearInterval(tvInterval);
  // refresh data every 2s (backup por si SSE no llega)
  tvInterval = setInterval(_renderTVNow, 2000);
  // El reloj ya corre con _tvClockInit (definido al pie del archivo)
}

function _renderTVContent(timeId,dateId,queueId,servingId,queueCountId,servingCountId, isAdmin = false) {
  const now = new Date();
  const te = document.getElementById(timeId);
  const de = document.getElementById(dateId);
  if (te) te.textContent = fmtHHMM(now);
  if (de) de.textContent = fmtDateTV(now);

  const queue   = state.turnos.filter(t => t.estado==='En fila');
  const serving = state.turnos.filter(t => t.estado==='Atendiendo'||t.estado==='Llamando');

  const qce = document.getElementById(queueCountId);
  if (qce) qce.textContent = queue.length + ' en fila';
  const sce = document.getElementById(servingCountId);
  if (sce) sce.textContent = serving.length + ' activos';

  // Estimated wait pill (preview only) — Solo visible para admin
  const estEl = document.getElementById('tv-est-wait');
  if (estEl) {
    if (isAdmin) {
      const est = calcEstimatedWait();
      if (est !== null && queue.length > 0) {
        estEl.style.display = 'block';
        estEl.textContent = `⏱ Espera estimada: ~${est} min`;
      } else {
        estEl.style.display = 'none';
      }
    } else {
      estEl.style.display = 'none';
    }
  }

  // QUEUE
  const qEl = document.getElementById(queueId);
  if (qEl) {
    if (!queue.length) {
      qEl.innerHTML = '<div class="tv-empty"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>Sin turnos en espera</div>';
    } else {
      qEl.innerHTML = queue.slice(0,6).map((t,i) => {
        const color   = getSvcColor(t.id[0]);
        const waitMin = isAdmin ? Math.floor(getWaitTime(t)/60000) : null;
        const wClass  = waitMin>=30?'hot':waitMin>=15?'warm':'';
        const waitDisplay = isAdmin ? `<div class="tv-queue-wait ${wClass}">${waitMin>0?waitMin+' min':'&lt;1 min'}</div>` : '';
        return `<div class="tv-queue-item">
          <div class="tv-queue-left">
            <div class="tv-queue-num">${i+1}</div>
            <div class="tv-queue-info">
              <div class="tv-queue-id" style="color:${color}">${esc(t.id)}</div>
              <div class="tv-queue-name">${esc(t.patient)}</div>
            </div>
          </div>
          ${waitDisplay}
        </div>`;
      }).join('');
    }
  }

  // SERVING
  const sEl = document.getElementById(servingId);
  if (sEl) {
    if (!serving.length) {
      sEl.innerHTML = '<div class="tv-empty"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>Ningún turno siendo atendido</div>';
    } else {
      sEl.innerHTML = serving.slice(0,5).map(t => {
        const color       = getSvcColor(t.id[0]);
        const isLlamando  = t.estado==='Llamando';
        const cardClass   = isLlamando?'llamando':'atendiendo';
        const statusColor = isLlamando?'#60A5FA':'#4ADE80';
        const dotColor    = isLlamando?'#3B72F2':'#22C55E';
        const statusLabel = isLlamando?'LLAMANDO':'ATENDIENDO';
        const moduloRaw   = t.modulo!=='—'?t.modulo:'Sin asignar';
        const moduloNum   = moduloRaw.match(/\d+$/)?.[0] || moduloRaw.replace(/^Módulo\s*/i,'');
        const svcMs       = getServiceTime(t);
        // Operator who called
        const opName      = t.atendidoPor || null;
        const opColor     = opName ? getSvcColor(opName[0]) : '#475569';
        const operatorHTML = opName 
          ? `<div class="tv-serving-operator">
               <div class="tv-serving-operator-dot" style="background:${opColor}"></div>
               Llamado por ${esc(opName.split(' ').slice(0,2).join(' '))}
             </div>`
          : '';
        return `<div class="tv-serving-card ${cardClass}">
          <div class="tv-serving-left">
            <div class="tv-serving-status" style="color:${statusColor}">
              <span class="tv-serving-status-dot" style="background:${dotColor}"></span>
              ${statusLabel}
            </div>
            <div class="tv-serving-turno" style="color:${color}">${esc(t.id)}</div>
            <div class="tv-serving-patient">${esc(t.patient)}</div>
            ${operatorHTML}
          </div>
          <div class="tv-serving-right">
            <div class="tv-serving-modulo-label">Módulo</div>
            <div class="tv-serving-modulo-val" style="color:${isLlamando?'#FDE68A':'white'}">${esc(moduloNum)}</div>
            <div class="tv-serving-svc">${esc(t.service)}</div>
            ${svcMs?`<div class="tv-serving-timer">&#9201; ${fmtMMSS(svcMs)}</div>`:''}
          </div>
        </div>`;
      }).join('');
    }
  }
}

// ── TV FULLSCREEN ─────────────────────────────────
function openTVFullscreen() {
  let fs = document.getElementById('tv-fullscreen');
  if (!fs) {
    fs = document.createElement('div');
    fs.id = 'tv-fullscreen';
    fs.innerHTML = `
      <button class="tv-exit-btn" onclick="closeTVFullscreen()">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3"/></svg>
        ESC / Salir
      </button>
      <div class="tv-screen ${tvTheme==='light'?'tv-light':''}">
        <!-- CALL ANNOUNCEMENT BANNER -->
        <div class="tv-call-banner" id="tv-banner-fs">
          <div class="tv-call-banner-icon">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
            </svg>
          </div>
          <div class="tv-call-banner-main">
            <div class="tv-call-banner-label">Llamando ahora</div>
            <div class="tv-call-banner-turno" id="tv-banner-turno-fs">—</div>
            <div class="tv-call-banner-patient" id="tv-banner-patient-fs">—</div>
          </div>
          <div class="tv-call-banner-right">
            <div class="tv-call-banner-dirijase">Diríjase al</div>
            <div class="tv-call-banner-modulo-num" id="tv-banner-modulo-fs">—</div>
            <div class="tv-call-banner-modulo-label" id="tv-banner-modsvc-fs">—</div>
            <div class="tv-call-banner-operator" id="tv-banner-operator-fs">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
              <span>—</span>
            </div>
          </div>
        </div>
        <div class="tv-header">
          <div class="tv-logo">
            <div class="tv-logo-img">
              <svg width="22" height="22" viewBox="0 0 48 48" fill="none">
                <circle cx="24" cy="13" r="7" fill="white" opacity=".95"/>
                <path d="M10 38c0-7.73 6.27-14 14-14s14 6.27 14 14" stroke="white" stroke-width="3" stroke-linecap="round" fill="none" opacity=".9"/>
                <circle cx="35" cy="35" r="5" stroke="#FDE68A" stroke-width="2.5" fill="none"/>
                <path d="M30 30 Q28 24 24 24" stroke="#FDE68A" stroke-width="2.5" stroke-linecap="round" fill="none"/>
                <path d="M33 35 h4" stroke="#FDE68A" stroke-width="2" stroke-linecap="round"/>
                <path d="M35 33 v4" stroke="#FDE68A" stroke-width="2" stroke-linecap="round"/>
              </svg>
            </div>
            <div>
              <div class="tv-logo-text">NeuroTurn</div>
              <div class="tv-logo-org">Neurocoop</div>
            </div>
          </div>
          <div class="tv-clock-block">
            <div class="tv-time" id="tvf-time">--:--</div>
            <div class="tv-date" id="tvf-date">--</div>
          </div>
        </div>
        <div class="tv-body">
          <div class="tv-col tv-col-left">
            <div class="tv-col-title">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
              Turnos en fila
              <span id="tvf-queue-count" class="tv-col-count"></span>
            </div>
            <div id="tvf-queue-list"></div>
          </div>
          <div class="tv-col">
            <div class="tv-col-title">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              Siendo atendidos
              <span id="tvf-serving-count" class="tv-col-count"></span>
            </div>
            <div id="tvf-serving-list"></div>
          </div>
        </div>
        <div class="tv-footer">
          <div class="tv-aviso">
            <div class="tv-aviso-badge">Aviso</div>
            <div class="tv-ticker-wrap"><span class="tv-ticker-text">Por favor, tenga su documento de identidad a mano &nbsp;·&nbsp; El sistema le llamará por su código de turno &nbsp;·&nbsp; Neurocoop – Comprometidos con su salud &nbsp;·&nbsp; NeuroTurn: Sistema Inteligente de Turnos Médicos</span></div>
          </div>
          <div class="tv-network"><div class="tv-network-dot"></div>NeuroTurn Live</div>
        </div>
      </div>`;
    document.body.appendChild(fs);
    document.addEventListener('keydown', e => { if(e.key==='Escape') closeTVFullscreen(); });
  }
  fs.classList.add('open');
  const isAdmin = currentUser?.role === 'Administrador';
  _renderTVContent('tvf-time','tvf-date','tvf-queue-list','tvf-serving-list','tvf-queue-count','tvf-serving-count', isAdmin);
  if (fs.requestFullscreen) fs.requestFullscreen().catch(()=>{});
}

function closeTVFullscreen() {
  registerTVWindow(false); // Registrar que TV se cerró
  document.getElementById('tv-fullscreen')?.classList.remove('open');
  if (document.fullscreenElement) document.exitFullscreen().catch(()=>{});
}

let tvTheme = 'dark'; // 'dark' | 'light'
function toggleTVTheme() {
  tvTheme = tvTheme === 'dark' ? 'light' : 'dark';
  const isDark  = tvTheme === 'dark';
  const preview = document.getElementById('tv-preview-screen');
  const btn     = document.getElementById('tv-theme-toggle');
  if (preview) preview.classList.toggle('tv-light', !isDark);
  const fsScreen = document.querySelector('#tv-fullscreen .tv-screen');
  if (fsScreen) fsScreen.classList.toggle('tv-light', !isDark);
  if (btn) {
    btn.innerHTML = isDark
      ? `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg> Modo claro`
      : `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg> Modo oscuro`;
  }
}

// ── TV CALL ANNOUNCEMENT BANNER ───────────────────
let tvBannerTimer = null;
function showTVCallBanner(turno) {
  const modRaw  = turno.modulo || '—';
  const modNum  = modRaw.match(/\d+$/)?.[0] || modRaw.replace(/^Módulo\s*/i,'');
  const opName  = turno.atendidoPor || currentUser?.name || 'Sistema';
  const opShort = opName.split(' ').slice(0,2).join(' ');

  // Fill both preview and fullscreen banners
  [
    { banner:'tv-banner-preview', turnoId:'tv-banner-turno-preview', patient:'tv-banner-patient-preview', modulo:'tv-banner-modulo-preview', modsvc:'tv-banner-modsvc-preview', operator:'tv-banner-operator-preview' },
    { banner:'tv-banner-fs',      turnoId:'tv-banner-turno-fs',      patient:'tv-banner-patient-fs',      modulo:'tv-banner-modulo-fs',      modsvc:'tv-banner-modsvc-fs',      operator:'tv-banner-operator-fs' },
  ].forEach(ids => {
    const bannerEl = document.getElementById(ids.banner);
    if (!bannerEl) return;
    const set = (id, val) => { const el=document.getElementById(id); if(el) el.textContent = val; };
    set(ids.turnoId,  turno.id);
    set(ids.patient,  turno.patient);
    set(ids.modulo,   modNum);
    set(ids.modsvc,   turno.service + ' · ' + modRaw);
    const opEl = document.getElementById(ids.operator);
    if (opEl) opEl.querySelector('span').textContent = 'Atendido por ' + opShort;
    bannerEl.classList.add('active');
  });

  // Auto-dismiss after 7 seconds
  if (tvBannerTimer) clearTimeout(tvBannerTimer);
  tvBannerTimer = setTimeout(() => hideTVCallBanner(), 7000);
}

function hideTVCallBanner() {
  document.querySelectorAll('.tv-call-banner').forEach(el => el.classList.remove('active'));
}

// ── USUARIOS ──────────────────────────────────────
let userFilter = '';
function filterUsuarios(q) { userFilter = q.toLowerCase(); renderUsuarios(); }

function renderUsuarios() {
  const list = userFilter
    ? state.users.filter(u => u.name.toLowerCase().includes(userFilter) || u.role.toLowerCase().includes(userFilter))
    : state.users;
  const tbody = document.getElementById('user-table-body');
  if (!tbody) return;
  tbody.innerHTML = list.map((u,i) => {
    const initials = u.name.split(' ').map(x=>x[0]).join('').slice(0,2).toUpperCase();
    const lastAccess = ['Hace 2 min','Hace 15 min','Hace 1 hora','Ayer','Hace 3 días','Hoy'][i%6];
    return `
      <td>
        <div style="display:flex;align-items:center;gap:10px">
          <div style="width:34px;height:34px;border-radius:50%;background:${u.color};display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:white;flex-shrink:0">${esc(initials)}</div>
          <div>
            <div style="font-weight:600;font-size:13.5px">${esc(u.name)}</div>
            <div style="font-size:11.5px;color:var(--text-muted)">${esc(u.email||'usuario@neuroturn.com')}</div>
          </div>
        </div>
      </td>
      <td><span class="badge" style="background:var(--primary-light);color:var(--primary)">${esc(u.role)}</span></td>
      <td style="color:var(--text-muted);font-size:13px;font-family:'DM Mono',monospace">${esc(u.username||'—')}</td>
      <td style="color:var(--text-muted)">${esc(u.modulo||'Sin módulo')}</td>
      <td>${u.active ? '<span class="badge badge-atendiendo">Activo</span>' : '<span class="badge badge-cancelado">Inactivo</span>'}</td>
      <td style="color:var(--text-muted);font-size:12.5px">${lastAccess}</td>
      <td>
        <div class="action-icons">
          <div class="icon-btn" title="Editar" onclick="editUser(${i})"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></div>
          <div class="icon-btn" title="${u.active?'Desactivar':'Activar'}" onclick="toggleUser(${i})">${u.active?'<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>':'<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>'}</div>
          <div class="icon-btn" title="Eliminar" onclick="deleteUser(${i})" style="color:var(--danger)"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg></div>
        </div>
      </td>
    `;
  }).join('');
}

let editUserIdx = -1;
function openNewUser() {
  editUserIdx = -1;
  document.getElementById('modal-user-title').textContent = 'Nuevo Usuario';
  ['user-name','user-username','user-password','user-email'].forEach(id => { const el=document.getElementById(id); if(el) el.value=''; });
  openModal('modal-user');
}
function editUser(i) {
  editUserIdx = i;
  const u = state.users[i];
  document.getElementById('modal-user-title').textContent = 'Editar Usuario';
  document.getElementById('user-name').value     = u.name;
  document.getElementById('user-username').value = u.username || '';
  document.getElementById('user-password').value = ''; // leave blank = keep existing
  document.getElementById('user-email').value    = u.email || '';
  document.getElementById('user-role').value     = u.role;
  document.getElementById('user-modulo').value   = u.modulo || 'Sin módulo';
  document.getElementById('user-status').value   = u.active ? 'true' : 'false';
  openModal('modal-user');
}
function saveUser() {
  const name     = document.getElementById('user-name').value.trim();
  const username = document.getElementById('user-username').value.trim();
  const password = document.getElementById('user-password').value.trim();
  const email    = document.getElementById('user-email').value.trim();
  const role     = document.getElementById('user-role').value;
  const modulo   = document.getElementById('user-modulo').value;
  const active   = document.getElementById('user-status').value === 'true';
  if (!name) { showToast('Ingrese el nombre completo', 'error'); return; }
  if (!username) { showToast('Ingrese el nombre de usuario', 'error'); return; }
  // Check duplicate username (excluding self on edit)
  const dupIdx = state.users.findIndex(u => u.username === username);
  if (dupIdx >= 0 && dupIdx !== editUserIdx) { showToast('El nombre de usuario ya existe', 'error'); return; }
  const colors = ['#3B72F2','#8B5CF6','#22C55E','#F97316','#F59E0B','#EF4444','#06B6D4','#84CC16'];
  if (editUserIdx >= 0) {
    const existing = state.users[editUserIdx];
    state.users[editUserIdx] = { ...existing, name, username, email, role, modulo, active,
      password: password || existing.password }; // keep old password if blank
    showToast('Usuario actualizado', 'success');
  } else {
    if (!password) { showToast('Ingrese una contraseña', 'error'); return; }
    state.users.push({ name, username, password, email, role, modulo, active, color: colors[state.users.length % colors.length] });
    showToast('Usuario creado: ' + name, 'success');
  }
  saveState(); closeModal('modal-user'); renderUsuarios();
}
function toggleUser(i) {
  state.users[i].active = !state.users[i].active;
  saveState(); renderUsuarios();
  showToast(state.users[i].active ? 'Usuario activado' : 'Usuario desactivado', 'success');
}
function deleteUser(i) {
  const u = state.users[i];
  // Primera confirmación: modal de aviso
  openConfirmDeleteUser(i, u.name, u.role);
}

// ── LIMPIAR TURNOS DEL DÍA ───────────────────────
function abrirModalLimpiarDia() {
  const activos = state.turnos.filter(t => t.estado === 'En fila' || t.estado === 'Llamando' || t.estado === 'Atendiendo');
  const resumen = document.getElementById('limpiar-resumen');
  if (resumen) {
    const enFila    = activos.filter(t => t.estado === 'En fila').length;
    const llamando  = activos.filter(t => t.estado === 'Llamando').length;
    const atendiendo= activos.filter(t => t.estado === 'Atendiendo').length;
    resumen.innerHTML = `
      <div style="display:flex;gap:16px;flex-wrap:wrap;margin-top:4px">
        <span>🟡 En fila: <strong>${enFila}</strong></span>
        <span>🔵 Llamando: <strong>${llamando}</strong></span>
        <span>🟢 Atendiendo: <strong>${atendiendo}</strong></span>
        <span style="border-top:1px solid #FECACA;width:100%;padding-top:6px;font-weight:700">Total a eliminar: ${activos.length} turno${activos.length !== 1 ? 's' : ''}</span>
      </div>`;
  }
  // Reset to step 1
  document.getElementById('limpiar-step1').style.display = 'block';
  document.getElementById('limpiar-step2').style.display = 'none';
  const inp = document.getElementById('limpiar-confirm-input');
  if (inp) inp.value = '';
  const btn = document.getElementById('btn-limpiar-final');
  if (btn) { btn.disabled = true; btn.style.opacity = '.4'; }
  openModal('modal-limpiar-dia');
}

function limpiarDiaStep2() {
  document.getElementById('limpiar-step1').style.display = 'none';
  document.getElementById('limpiar-step2').style.display = 'block';
  setTimeout(() => document.getElementById('limpiar-confirm-input')?.focus(), 100);
}

function limpiarDiaBack() {
  document.getElementById('limpiar-step1').style.display = 'block';
  document.getElementById('limpiar-step2').style.display = 'none';
}

function checkLimpiarConfirm() {
  const val = document.getElementById('limpiar-confirm-input')?.value || '';
  const ok  = val.trim().toUpperCase() === 'LIMPIAR';
  const btn = document.getElementById('btn-limpiar-final');
  if (btn) { btn.disabled = !ok; btn.style.opacity = ok ? '1' : '.4'; }
}

function ejecutarLimpiarDia() {
  const antes = state.turnos.length;
  state.turnos = state.turnos.filter(t => t.estado === 'Finalizado' || t.estado === 'Cancelado');
  const eliminados = antes - state.turnos.length;
  saveState();
  renderDashboard(); renderTurnos(); renderInicio();
  closeModal('modal-limpiar-dia');
  showToast(`🗑 ${eliminados} turno${eliminados !== 1 ? 's' : ''} activo${eliminados !== 1 ? 's' : ''} eliminado${eliminados !== 1 ? 's' : ''}`, 'success');
  addNotif('sistema', 'Turnos del día limpiados', `${eliminados} turnos eliminados por ${currentUser?.name?.split(' ')[0] || 'Admin'}`);
}

// ── DOUBLE-CONFIRM DELETE USER ────────────────────
let pendingDeleteUserIdx = null;
let pendingDeleteUsername = '';

function openConfirmDeleteUser(i, name, role) {
  pendingDeleteUserIdx = i;
  pendingDeleteUsername = state.users[i].username || name.split(' ')[0].toLowerCase();
  // Fill step 1
  const initials = name.split(' ').map(x=>x[0]).join('').slice(0,2).toUpperCase();
  const col = state.users[i].color || '#3B72F2';
  const av = document.getElementById('del-user-avatar');
  if (av) { av.textContent = initials; av.style.background = col; }
  document.getElementById('del-user-name').textContent  = name;
  document.getElementById('del-user-role').textContent  = role;
  document.getElementById('del-user-name2').textContent = name;
  // Show step 1, hide step 2
  document.getElementById('delete-user-step1').style.display = 'block';
  document.getElementById('delete-user-step2').style.display = 'none';
  const inp = document.getElementById('del-user-confirm-input');
  if (inp) inp.value = '';
  const hint = document.getElementById('del-confirm-hint');
  if (hint) hint.textContent = `Usuario: "${pendingDeleteUsername}"`;
  const btn = document.getElementById('btn-delete-user-final');
  if (btn) { btn.disabled = true; btn.style.opacity = '.4'; }
  openModal('modal-delete-user');
}

function deleteUserStep2() {
  document.getElementById('delete-user-step1').style.display = 'none';
  document.getElementById('delete-user-step2').style.display = 'block';
  setTimeout(() => document.getElementById('del-user-confirm-input')?.focus(), 100);
}

function deleteUserBack() {
  document.getElementById('delete-user-step1').style.display = 'block';
  document.getElementById('delete-user-step2').style.display = 'none';
}

function checkDeleteConfirm() {
  const val = document.getElementById('del-user-confirm-input')?.value || '';
  const btn = document.getElementById('btn-delete-user-final');
  const ok  = val.trim().toLowerCase() === pendingDeleteUsername.toLowerCase();
  if (btn) { btn.disabled = !ok; btn.style.opacity = ok ? '1' : '.4'; }
}

function deleteUserConfirmed() {
  if (pendingDeleteUserIdx === null) return;
  const name = state.users[pendingDeleteUserIdx].name;
  state.users.splice(pendingDeleteUserIdx, 1);
  saveState(); renderUsuarios();
  closeModal('modal-delete-user');
  showToast(`Usuario ${name} eliminado`, 'success');
  addNotif('sistema', 'Usuario eliminado', `${name} fue eliminado del sistema`);
  pendingDeleteUserIdx = null;
}

// ── ARCHIVO MENSUAL ───────────────────────────────
// Stored in localStorage under 'neuroturn_archivos' as array of { mes, label, data, archivedAt }
const ARCHIVOS_KEY = 'neuroturn_archivos';

function loadArchivos() {
  try { return JSON.parse(localStorage.getItem(ARCHIVOS_KEY) || '[]'); } catch { return []; }
}
function saveArchivos(arr) { localStorage.setItem(ARCHIVOS_KEY, JSON.stringify(arr)); }

function archivarMes() {
  const now     = new Date();
  const mesKey  = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  const mesLabel= now.toLocaleDateString('es',{month:'long',year:'numeric'});
  const turnos  = state.turnos;
  if (!turnos.length) { showToast('No hay turnos para archivar', ''); return; }

  const archivos = loadArchivos();
  // Check if already archived this month
  if (archivos.find(a => a.mes === mesKey)) {
    if (!confirm(`Ya existe un archivo para ${mesLabel}.\n¿Sobreescribir con los datos actuales?`)) return;
    const idx = archivos.findIndex(a => a.mes === mesKey);
    archivos.splice(idx, 1);
  }

  const archivo = {
    mes: mesKey,
    label: mesLabel.charAt(0).toUpperCase() + mesLabel.slice(1),
    archivedAt: now.toISOString(),
    archivedBy: currentUser?.name || 'Sistema',
    totalTurnos: turnos.length,
    finalizados: turnos.filter(t=>t.estado==='Finalizado').length,
    cancelados:  turnos.filter(t=>t.estado==='Cancelado').length,
    data: JSON.parse(JSON.stringify(turnos)) // deep copy
  };
  archivos.unshift(archivo);
  // Keep max 24 months
  if (archivos.length > 24) archivos.pop();
  saveArchivos(archivos);

  // Clear active queue (keep only finished/cancelled for audit)
  state.turnos = state.turnos.filter(t => t.estado === 'Finalizado' || t.estado === 'Cancelado');
  // Reset counter for new month
  state.counter = 100;
  saveState();

  renderArchivos();
  renderDashboard(); renderTurnos();
  showToast(`✅ ${archivo.label} archivado — ${turnos.length} turnos guardados`, 'success');
  addNotif('sistema', `Mes archivado: ${archivo.label}`, `${turnos.length} turnos guardados · Por: ${currentUser?.name?.split(' ')[0]||'Sistema'}`);
}

let currentArchivoData = null;
let currentArchivoIdx  = null;

function verArchivo(i) {
  const archivos = loadArchivos();
  const a = archivos[i];
  if (!a) return;
  currentArchivoData = a;
  currentArchivoIdx  = i;

  // Title
  document.getElementById('archivo-modal-mes-display').textContent = a.label;
  // Rename row hidden
  const renRow = document.getElementById('archivo-rename-row');
  if (renRow) renRow.style.display = 'none';
  const renInput = document.getElementById('archivo-rename-input');
  if (renInput) renInput.value = a.label;
  // Nota
  const notaEl = document.getElementById('archivo-nota-texto');
  if (notaEl) notaEl.value = a.nota || '';
  // Switch to datos tab
  switchArchivoTab('datos');

  const fin = a.data.filter(t=>t.estado==='Finalizado');
  const can = a.data.filter(t=>t.estado==='Cancelado');
  const waitTimes = fin.filter(t=>t.tsCreated&&t.tsAtendido).map(t=>(t.tsAtendido-t.tsCreated)/60000);
  const avgWait = waitTimes.length ? Math.round(waitTimes.reduce((x,y)=>x+y,0)/waitTimes.length) : 0;

  document.getElementById('archivo-modal-stats').innerHTML = `
    <div class="card stat-card"><div class="stat-icon" style="background:#EEF2FF">📋</div><div class="stat-label">Total turnos</div><div class="stat-value">${a.totalTurnos}</div></div>
    <div class="card stat-card"><div class="stat-icon" style="background:#DCFCE7">✅</div><div class="stat-label">Finalizados</div><div class="stat-value">${fin.length}</div></div>
    <div class="card stat-card"><div class="stat-icon" style="background:#FEE2E2">❌</div><div class="stat-label">Cancelados</div><div class="stat-value">${can.length}</div></div>
    <div class="card stat-card"><div class="stat-icon" style="background:#FEF3C7">⏱</div><div class="stat-label">Espera prom.</div><div class="stat-value blue">${avgWait} min</div></div>`;

  document.getElementById('archivo-modal-table').innerHTML = a.data.map(t => {
    const color = getSvcColor(t.id[0]);
    const waitMs = t.tsCreated && t.tsAtendido ? t.tsAtendido - t.tsCreated : null;
    return `
      <td style="font-family:'DM Mono',monospace;font-weight:800;color:${color}">${t.id}</td>
      <td>${t.patient}</td>
      <td>${t.service}</td>
      <td>${badgeHTML(t.estado)}</td>
      <td style="font-size:12px;color:var(--text-muted)">${t.atendidoPor ? t.atendidoPor.split(' ').slice(0,2).join(' ') : '—'}</td>
      <td>${waitMs ? fmtDuration(waitMs) : '—'}</td>
    `;
  }).join('');
  openModal('modal-archivo');
}

function switchArchivoTab(tab) {
  document.getElementById('archivo-tab-datos').style.display = tab==='datos' ? '' : 'none';
  document.getElementById('archivo-tab-notas').style.display = tab==='notas' ? '' : 'none';
  ['datos','notas'].forEach(t => {
    const btn = document.getElementById('tab-'+t);
    const active = t === tab;
    btn.style.background  = active ? 'white' : 'none';
    btn.style.color       = active ? 'var(--primary)' : 'var(--text-muted)';
    btn.style.fontWeight  = active ? '600' : '500';
    btn.style.boxShadow   = active ? '0 1px 3px rgba(0,0,0,.08)' : 'none';
  });
}

function toggleRenameArchivo() {
  const row = document.getElementById('archivo-rename-row');
  const visible = row.style.display === 'flex';
  row.style.display = visible ? 'none' : 'flex';
  row.style.flexDirection = 'column';
  if (!visible) {
    const inp = document.getElementById('archivo-rename-input');
    if (inp) { inp.value = currentArchivoData?.label || ''; inp.focus(); inp.select(); }
  }
}

function guardarRenombreArchivo() {
  const newLabel = document.getElementById('archivo-rename-input')?.value.trim();
  if (!newLabel) { showToast('Ingresa un nombre válido', 'error'); return; }
  if (currentArchivoIdx === null) return;
  const archivos = loadArchivos();
  archivos[currentArchivoIdx].label = newLabel;
  saveArchivos(archivos);
  currentArchivoData.label = newLabel;
  document.getElementById('archivo-modal-mes-display').textContent = newLabel;
  document.getElementById('archivo-rename-row').style.display = 'none';
  renderArchivos();
  showToast('Archivo renombrado', 'success');
}

function guardarNotaArchivo() {
  if (currentArchivoIdx === null) return;
  const nota = document.getElementById('archivo-nota-texto')?.value.trim() || '';
  const archivos = loadArchivos();
  archivos[currentArchivoIdx].nota = nota;
  saveArchivos(archivos);
  currentArchivoData.nota = nota;
  showToast('Nota guardada', 'success');
}

function confirmarEliminarArchivo() {
  if (currentArchivoIdx === null) return;
  const label = currentArchivoData?.label || 'este archivo';
  if (!confirm(`¿Eliminar el archivo "${label}"?\n\nEsta acción no se puede deshacer.`)) return;
  const archivos = loadArchivos();
  archivos.splice(currentArchivoIdx, 1);
  saveArchivos(archivos);
  closeModal('modal-archivo');
  renderArchivos();
  showToast(`Archivo "${label}" eliminado`, 'success');
  addNotif('sistema', 'Archivo eliminado', `"${label}" fue eliminado del historial`);
  currentArchivoData = null; currentArchivoIdx = null;
}

function descargarArchivoActual() {
  if (currentArchivoIdx === null) return;
  descargarArchivo(currentArchivoIdx);
}

function descargarArchivo(i) {
  const archivos = loadArchivos();
  const a = archivos[i];
  if (!a) return;
  const blob = new Blob([JSON.stringify(a, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href  = url; link.download = `neuroturn_${a.mes}.json`;
  link.click(); URL.revokeObjectURL(url);
  showToast(`Archivo ${a.label} descargado`, 'success');
}

// ── MI MÓDULO DE TRABAJO ──────────────────────────
function loadMiModulo() {
  if (!currentUser) return;
  const key = 'nt_mimodulo_' + (currentUser.username || currentUser.id);
  const saved = localStorage.getItem(key);
  if (saved) {
    currentUser.modulo = saved;
    const roleEl = document.getElementById('sidebar-user-role');
    if (roleEl) roleEl.textContent = (currentUser.rol || '') + (saved && saved !== 'Sin módulo' ? ' · ' + saved : '');
  }
  const sel = document.getElementById('mi-modulo-select');
  if (sel) sel.value = currentUser.modulo || 'Sin módulo';
}

function guardarMiModulo() {
  const sel = document.getElementById('mi-modulo-select');
  if (!sel || !currentUser) return;
  const modulo = sel.value;
  const key = 'nt_mimodulo_' + (currentUser.username || currentUser.id);
  localStorage.setItem(key, modulo);
  currentUser.modulo = modulo;
  const roleEl = document.getElementById('sidebar-user-role');
  if (roleEl) roleEl.textContent = (currentUser.rol || '') + (modulo && modulo !== 'Sin módulo' ? ' · ' + modulo : '');
  const statusEl = document.getElementById('mi-modulo-status');
  if (statusEl) { statusEl.textContent = '✓ Módulo guardado: ' + modulo; statusEl.style.display = 'block'; setTimeout(() => { statusEl.style.display = 'none'; }, 3000); }
  showToast('✅ Módulo actualizado: ' + modulo, 'success');
}

function renderArchivos() {
  const archivos = loadArchivos();
  const el = document.getElementById('archivos-mensuales-list');
  if (!el) return;
  // sync mi-modulo-select with saved value each time config page renders
  const selMod = document.getElementById('mi-modulo-select');
  if (selMod && currentUser) selMod.value = currentUser.modulo || 'Sin módulo';
  if (!archivos.length) {
    el.innerHTML = '<div style="font-size:13px;color:var(--text-muted);padding:10px 0">No hay archivos mensuales aún. El primer archivo se creará al presionar "Archivar mes actual".</div>';
    return;
  }
  el.innerHTML = archivos.map((a, i) => {
    const tasaAten = a.totalTurnos ? Math.round(a.finalizados/a.totalTurnos*100) : 0;
    const archivedDate = new Date(a.archivedAt).toLocaleDateString('es',{day:'numeric',month:'short',year:'numeric'});
    const hasNota = !!a.nota;
    return `<div style="display:flex;align-items:center;justify-content:space-between;padding:12px 14px;background:var(--bg);border-radius:10px;margin-bottom:8px;border:1px solid var(--border);gap:12px;flex-wrap:wrap">
      <div style="display:flex;align-items:center;gap:10px">
        <div style="width:38px;height:38px;border-radius:10px;background:var(--primary-light);display:flex;align-items:center;justify-content:center;flex-shrink:0">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>
        </div>
        <div>
          <div style="font-size:13.5px;font-weight:700;display:flex;align-items:center;gap:5px">
            ${a.label}
            ${hasNota ? `<span title="Tiene nota" style="font-size:10px;background:#EEF2FF;color:var(--primary);padding:1px 6px;border-radius:20px">📝</span>` : ''}
          </div>
          <div style="font-size:11px;color:var(--text-muted)">Guardado el ${archivedDate} · Por ${(a.archivedBy||'Sistema').split(' ')[0]}</div>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:14px">
        <div style="text-align:center">
          <div style="font-size:17px;font-weight:800;color:var(--primary)">${a.totalTurnos}</div>
          <div style="font-size:10px;color:var(--text-muted)">turnos</div>
        </div>
        <div style="text-align:center">
          <div style="font-size:17px;font-weight:800;color:#16A34A">${a.finalizados}</div>
          <div style="font-size:10px;color:var(--text-muted)">atendidos</div>
        </div>
        <div style="text-align:center">
          <div style="font-size:17px;font-weight:800;color:var(--text-muted)">${tasaAten}%</div>
          <div style="font-size:10px;color:var(--text-muted)">tasa</div>
        </div>
        <div style="display:flex;gap:6px">
          <button class="btn-sm" onclick="verArchivo(${i})" style="display:flex;align-items:center;gap:4px;font-size:11.5px">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/></svg>
            Ver / Editar
          </button>
          <button class="btn-sm" onclick="descargarArchivo(${i})" style="display:flex;align-items:center;gap:4px;font-size:11.5px">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            JSON
          </button>
        </div>
      </div>
    </div>`;
  }).join('');
}

function exportArchivoExcel() {
  if (!currentArchivoData) return;
  const rows = currentArchivoData.data.map(t => ({
    Turno: t.id, Paciente: t.patient, Servicio: t.service, Estado: t.estado,
    Módulo: t.modulo, Operador: t.atendidoPor||'—',
    Creado: tsToHHMM(t.tsCreated), Llamado: tsToHHMM(t.tsLlamado),
    Atendido: tsToHHMM(t.tsAtendido), Finalizado: tsToHHMM(t.tsFin),
    'Espera (min)': t.tsCreated&&t.tsAtendido ? Math.round((t.tsAtendido-t.tsCreated)/60000) : '',
    Nota: t.nota || ''
  }));
  try {
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, currentArchivoData.label.substring(0,31));
    XLSX.writeFile(wb, `neuroturn_${currentArchivoData.mes}.xlsx`);
    showToast('Excel exportado', 'success');
  } catch(e) { showToast('Error al exportar: ' + e.message, 'error'); }
}

// ── SERVICIOS ─────────────────────────────────────
function renderServicios() {
  const tbody = document.getElementById('servicios-table-body');
  tbody.innerHTML = state.servicios.map((s,i) => `
    
      <td style="color:var(--text-muted);font-family:'DM Mono',monospace;font-size:12.5px">${s.id}</td>
      <td style="font-weight:500">${s.name}</td>
      <td><span class="turno-id">${s.prefix}-###</span></td>
      <td style="color:var(--text-muted)">${s.modulos}</td>
      <td style="font-weight:600">${s.turnos}</td>
      <td>${s.active?'<span class="badge badge-atendiendo">Activo</span>':'<span class="badge badge-cancelado">Inactivo</span>'}</td>
      <td>
        <div class="action-icons">
          <div class="icon-btn" title="Eliminar" onclick="deleteServicio(${i})" style="color:var(--danger)"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg></div>
        </div>
      </td>
    
  `).join('');
}

// ── MÓDULOS ───────────────────────────────────────
function renderModulos() {
  const tbody = document.getElementById('modulos-table-body');
  tbody.innerHTML = state.modulos.map((m,i) => `
    
      <td style="font-weight:600;font-family:'DM Mono',monospace">${m.id}</td>
      <td style="font-weight:500">${m.name}</td>
      <td>${m.service}</td>
      <td>${m.active?'<span class="badge badge-atendiendo">Activo</span>':'<span class="badge badge-cancelado">Inactivo</span>'}</td>
      <td><span class="turno-id">${m.atendiendo}</span></td>
      <td>
        <div class="action-icons">
          <div class="icon-btn" title="Eliminar" onclick="deleteModulo(${i})" style="color:var(--danger)"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg></div>
        </div>
      </td>
    
  `).join('');
}

// ── GENERAR DATOS DE PRUEBA PARA HOY ──────────────
function generarDatosPruebaHoy() {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  
  const operadores = ['Juan García', 'María López', 'Carlos Ruiz', 'Ana Martínez', 'Pedro Sánchez'];
  const servicios = ['Módulo 1', 'Módulo 2', 'Módulo 3', 'Módulo 4'];
  const estados = ['Finalizado', 'Cancelado', 'Finalizado', 'Finalizado', 'no_atendido'];
  
  const turnos = [];
  
  // Generar 25 turnos distribuidos entre 8:00 y 18:00
  for (let i = 1; i <= 25; i++) {
    const hora = 8 + Math.floor(Math.random() * 10);
    const minuto = Math.floor(Math.random() * 60);
    
    const tsCreated = new Date(hoy.getTime());
    tsCreated.setHours(hora, minuto);
    
    const estado = estados[Math.floor(Math.random() * estados.length)];
    const espera = 2 + Math.random() * 25; // 2-27 minutos
    const duracion = 5 + Math.random() * 20; // 5-25 minutos
    
    const tsAtendido = estado !== 'Cancelado' && estado !== 'no_atendido' 
      ? new Date(tsCreated.getTime() + espera * 60000)
      : null;
    
    const tsFin = tsAtendido && estado === 'Finalizado'
      ? new Date(tsAtendido.getTime() + duracion * 60000)
      : null;
    
    const operador = operadores[Math.floor(Math.random() * operadores.length)];
    const servicio = servicios[Math.floor(Math.random() * servicios.length)];
    
    turnos.push({
      id: String(i),
      codigo: 'M-' + String(100 + i),
      dbId: i,
      patient: `Paciente ${i}`,
      doc: String(1000000 + i),
      service: servicio,
      modulo: '—',
      estado: estado,
      atendidoPor: estado === 'no_atendido' ? null : operador,
      registradoPor: 'Admin',
      nota: null,
      tsCreated: tsCreated.getTime(),
      tsLlamado: tsAtendido ? tsAtendido.getTime() : null,
      tsAtendido: tsAtendido ? tsAtendido.getTime() : null,
      tsFin: tsFin ? tsFin.getTime() : null
    });
  }
  
  return turnos;
}

function openModal(id) {
  document.getElementById(id).classList.add('open');
  if (id === 'modal-turno') updatePrefixPreview();
}
function closeModal(id) { document.getElementById(id).classList.remove('open'); }
      const fechaDesde = parseFecha(desde);
      const fechaHasta = parseFecha(hasta);
      fechaHasta.setHours(23, 59, 59);
      
      console.log('[Reportes] Rango de búsqueda:', {
        desde: fechaDesde.toLocaleString(),
        hasta: fechaHasta.toLocaleString()
      });
      
      // DEBUG: mostrar primeros 3 turnos
      turnos.slice(0, 3).forEach(t => {
        console.log('[Reportes] Muestra Turno:', {
          codigo: t.codigo,
          tsCreated: t.tsCreated,
          fecha: t.tsCreated ? new Date(t.tsCreated).toLocaleString() : 'N/A',
          valido: new Date(t.tsCreated || 0) >= fechaDesde && new Date(t.tsCreated || 0) <= fechaHasta
        });
      });
      
      const turnosFiltrados = turnos.filter(t => {
        const fechaTurno = new Date(t.tsCreated || 0);
        const enRango = fechaTurno >= fechaDesde && fechaTurno <= fechaHasta;
        return enRango;
      });
      
      console.log('[Reportes] Turnos filtrados:', turnosFiltrados.length, 'de', turnos.length);
      
      // ===== KPIs PRINCIPALES =====
      const finalizados = turnosFiltrados.filter(t => t.estado === 'Finalizado');
      const cancelados = turnosFiltrados.filter(t => t.estado === 'Cancelado');
      const noAtendidos = turnosFiltrados.filter(t => t.estado === 'no_atendido');
      const pendientes = turnosFiltrados.filter(t => t.estado === 'Pendiente' || t.estado === 'Llamado');
      
      // Tiempos
      const tiemposEspera = finalizados
        .filter(t => t.tsCreated && t.tsAtendido)
        .map(t => (t.tsAtendido - t.tsCreated) / 60000);
      const tiemposServicio = finalizados
        .filter(t => t.tsAtendido && t.tsFin)
        .map(t => (t.tsFin - t.tsAtendido) / 60000);
      
      const avgEspera = tiemposEspera.length ? (tiemposEspera.reduce((a,b)=>a+b,0)/tiemposEspera.length).toFixed(1) : 0;
      const maxEspera = tiemposEspera.length ? Math.max(...tiemposEspera).toFixed(1) : 0;
      const minEspera = tiemposEspera.length ? Math.min(...tiemposEspera).toFixed(1) : 0;
      const avgServicio = tiemposServicio.length ? (tiemposServicio.reduce((a,b)=>a+b,0)/tiemposServicio.length).toFixed(1) : 0;
      
      // Porcentajes
      const tasaExito = turnosFiltrados.length > 0 ? ((finalizados.length / turnosFiltrados.length) * 100).toFixed(1) : 0;
      const tasaCancelacion = turnosFiltrados.length > 0 ? ((cancelados.length / turnosFiltrados.length) * 100).toFixed(1) : 0;
      
      // TOP Operador
      const operadoresMap = {};
      finalizados.forEach(t => {
        const op = t.atendidoPor || 'Sin asignar';
        operadoresMap[op] = (operadoresMap[op] || 0) + 1;
      });
      const operadorTop = Object.entries(operadoresMap).sort((a,b)=>b[1]-a[1])[0];
      
      // TOP Servicio
      const serviciosMap = {};
      turnosFiltrados.forEach(t => {
        const svc = t.service || 'Sin servicio';
        serviciosMap[svc] = (serviciosMap[svc] || 0) + 1;
      });
      const servicioTop = Object.entries(serviciosMap).sort((a,b)=>b[1]-a[1])[0];
      
      // Renderizar KPIs expandido
      document.getElementById('kpi-total').innerHTML = `
        <div style="font-size:28px;font-weight:700;color:var(--primary)">${turnosFiltrados.length}</div>
        <div style="font-size:11px;color:var(--text-muted);margin-top:4px">Turnos Totales</div>`;
      
      document.getElementById('kpi-atendidos').innerHTML = `
        <div style="font-size:28px;font-weight:700;color:var(--success)">${finalizados.length}</div>
        <div style="font-size:11px;color:var(--text-muted);margin-top:4px;font-weight:600">${tasaExito}% Éxito</div>`;
      
      document.getElementById('kpi-cancelados').innerHTML = `
        <div style="font-size:28px;font-weight:700;color:var(--danger)">${cancelados.length}</div>
        <div style="font-size:11px;color:var(--text-muted);margin-top:4px;font-weight:600">${tasaCancelacion}% Cancelación</div>`;
      
      document.getElementById('kpi-no-atendidos').innerHTML = `
        <div style="font-size:28px;font-weight:700;color:var(--warning)">${noAtendidos.length}</div>
        <div style="font-size:11px;color:var(--text-muted);margin-top:4px">No Atendidos</div>`;
      
      document.getElementById('kpi-operador-top').innerHTML = `
        <div style="font-size:18px;font-weight:700;color:var(--primary)">${operadorTop ? operadorTop[0].split(' ')[0] : 'N/A'}</div>
        <div style="font-size:11px;color:var(--text-muted);margin-top:4px">${operadorTop ? operadorTop[1] + ' atendidos' : 'Sin datos'}</div>`;
      
      // ===== HISTOGRAMA TIEMPOS ESPERA =====
      const histBuckets = [0,0,0,0,0,0]; // 0-5, 5-10, 10-15, 15-20, 20-30, 30+
      tiemposEspera.forEach(min => {
        if (min < 5) histBuckets[0]++;
        else if (min < 10) histBuckets[1]++;
        else if (min < 15) histBuckets[2]++;
        else if (min < 20) histBuckets[3]++;
        else if (min < 30) histBuckets[4]++;
        else histBuckets[5]++;
      });
      
      const histData = [
        { rango: '0-5m', cant: histBuckets[0], color: '#22C55E' },
        { rango: '5-10m', cant: histBuckets[1], color: '#4ADE80' },
        { rango: '10-15m', cant: histBuckets[2], color: '#FDE047' },
        { rango: '15-20m', cant: histBuckets[3], color: '#FB923C' },
        { rango: '20-30m', cant: histBuckets[4], color: '#EF4444' },
        { rango: '+30m', cant: histBuckets[5], color: '#991B1B' }
      ];
      const maxHist = Math.max(...histData.map(h => h.cant), 1);
      document.getElementById('histograma-espera').innerHTML = histData.map((h, idx) =>
        `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:6px">
          <span style="font-size:12px;font-weight:700;color:var(--text);min-height:18px">${h.cant}</span>
          <div style="width:100%;background:linear-gradient(180deg, ${h.color} 0%, ${h.color}CC 100%);border-radius:6px;height:${Math.max((h.cant/maxHist)*140, 6)}px;opacity:${h.cant ? 1 : 0.15};transition:all 0.2s;cursor:pointer;box-shadow:0 2px 8px ${h.color}40" onmouseover="this.style.filter='brightness(1.15)';this.style.transform='scale(1.05)'" onmouseout="this.style.filter='none';this.style.transform='scale(1)'"></div>
        </div>`
      ).join('');
      document.getElementById('histograma-labels').innerHTML = histData.map(h =>
        `<div style="flex:1;text-align:center;font-size:11px;color:var(--text);font-weight:700">${h.rango}</div>`
      ).join('');
      
      // ===== TURNOS POR HORA =====
      const horasBuckets = {};
      for (let h = 8; h <= 20; h++) horasBuckets[h] = 0;
      turnosFiltrados.forEach(t => {
        const h = new Date(t.tsCreated || 0).getHours();
        if (h >= 8 && h <= 20) horasBuckets[h]++;
      });
      const horasArray = Object.entries(horasBuckets).map(([h, cant]) => ({
        hora: String(h).padStart(2,'0') + ':00',
        total: cant
      }));
      const maxHora = Math.max(...horasArray.map(h => h.total), 1);
      document.getElementById('turnos-por-hora').innerHTML = horasArray.map((h, idx) =>
        `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:6px">
          <span style="font-size:12px;font-weight:700;color:var(--text);min-height:18px">${h.total}</span>
          <div style="width:100%;background:linear-gradient(180deg, #8B5CF6 0%, #5B21B6 100%);border-radius:6px;height:${Math.max((h.total/maxHora)*140, 6)}px;opacity:${h.total ? 1 : 0.15};transition:all 0.2s;cursor:pointer;box-shadow:0 2px 8px #8B5CF640" onmouseover="this.style.filter='brightness(1.15)';this.style.transform='scale(1.05)'" onmouseout="this.style.filter='none';this.style.transform='scale(1)'"></div>
          <span style="font-size:11px;color:var(--text);font-weight:700;min-height:18px">${h.hora}</span>
        </div>`
      ).join('');
      
      // ===== TABLA OPERADORES DETALLADA =====
      const operadores = Object.entries(operadoresMap).map(([nombre, atendidos]) => {
        const turnos_op = turnosFiltrados.filter(t => t.atendidoPor === nombre);
        const esperas = turnos_op
          .filter(t => t.tsCreated && t.tsAtendido)
          .map(t => (t.tsAtendido - t.tsCreated) / 60000);
        const servicios = turnos_op
          .filter(t => t.tsAtendido && t.tsFin)
          .map(t => (t.tsFin - t.tsAtendido) / 60000);
        const cancelados_op = turnos_op.filter(t => t.estado === 'Cancelado').length;
        
        return {
          nombre,
          atendidos,
          cancelados: cancelados_op,
          espera_prom: esperas.length ? (esperas.reduce((a,b)=>a+b,0)/esperas.length).toFixed(1) : 'N/A',
          servicio_prom: servicios.length ? (servicios.reduce((a,b)=>a+b,0)/servicios.length).toFixed(1) : 'N/A',
          cancelacion: atendidos + cancelados_op > 0 ? ((cancelados_op / (atendidos + cancelados_op)) * 100).toFixed(1) : 0,
          tasa_exito: atendidos + cancelados_op > 0 ? ((atendidos / (atendidos + cancelados_op)) * 100).toFixed(1) : 0
        };
      }).sort((a,b) => b.atendidos - a.atendidos);
      
      document.getElementById('tabla-operadores').innerHTML = operadores.map((op, idx) =>
        `<tr style="border-bottom:1px solid #E5E7EB;background:${idx % 2 === 0 ? '#FFFFFF' : '#F9FAFB'};transition:all 0.2s;hover-bg:linear-gradient(90deg, #EFF6FF 0%, transparent 100%)" onmouseover="this.style.backgroundColor='#EFF6FF'" onmouseout="this.style.backgroundColor='${idx % 2 === 0 ? '#FFFFFF' : '#F9FAFB'}'">
          <td style="padding:16px 20px;color:var(--text);font-weight:700;font-size:14px">${op.nombre}</td>
          <td style="padding:16px 20px;text-align:center"><span style="background:linear-gradient(135deg, #3B72F2 0%, #5B8FFF 100%);color:white;padding:6px 12px;border-radius:6px;font-weight:700;display:inline-block;min-width:40px">${op.atendidos}</span></td>
          <td style="padding:16px 20px;text-align:center;color:var(--text);font-weight:600">${op.espera_prom}<span style="font-size:11px;color:var(--text-muted);margin-left:2px">min</span></td>
          <td style="padding:16px 20px;text-align:center;color:var(--text);font-weight:600">${op.servicio_prom}<span style="font-size:11px;color:var(--text-muted);margin-left:2px">min</span></td>
        `
      ).join('') || '<td colspan="4" style="padding:32px 20px;text-align:center;color:var(--text-muted)">📊 Sin datos disponibles</td>';
      
      // ===== TABLA SERVICIOS DETALLADA =====
      const servicios_arr = Object.entries(serviciosMap).map(([servicio, total]) => {
        const turnos_svc = turnosFiltrados.filter(t => t.service === servicio);
        const finalizados_svc = turnos_svc.filter(t => t.estado === 'Finalizado').length;
        const cancelados_svc = turnos_svc.filter(t => t.estado === 'Cancelado').length;
        const esperas_svc = turnos_svc
          .filter(t => t.tsCreated && t.tsAtendido)
          .map(t => (t.tsAtendido - t.tsCreated) / 60000);
        
        return {
          servicio,
          total,
          finalizados: finalizados_svc,
          cancelados: cancelados_svc,
          espera_prom: esperas_svc.length ? (esperas_svc.reduce((a,b)=>a+b,0)/esperas_svc.length).toFixed(1) : 'N/A',
          porcentaje: total > 0 ? ((finalizados_svc / total) * 100).toFixed(0) : 0
        };
      }).sort((a,b) => b.total - a.total);
      
      document.getElementById('tabla-servicios').innerHTML = servicios_arr.map((s, idx) =>
        `<tr style="border-bottom:1px solid #E5E7EB;background:${idx % 2 === 0 ? '#FFFFFF' : '#F9FAFB'};transition:all 0.2s" onmouseover="this.style.backgroundColor='#EFF6FF'" onmouseout="this.style.backgroundColor='${idx % 2 === 0 ? '#FFFFFF' : '#F9FAFB'}'">
          <td style="padding:16px 20px;color:var(--text);font-weight:700;font-size:14px">${s.servicio}</td>
          <td style="padding:16px 20px;text-align:center"><span style="background:linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%);color:white;padding:6px 12px;border-radius:6px;font-weight:700;display:inline-block;min-width:40px">${s.total}</span></td>
          <td style="padding:16px 20px;text-align:center"><span style="color:white;background:linear-gradient(135deg, #22C55E 0%, #4ADE80 100%);padding:6px 10px;border-radius:6px;font-weight:700;display:inline-block;min-width:35px">${s.finalizados}</span></td>
          <td style="padding:16px 20px;text-align:center"><span style="color:white;background:linear-gradient(135deg, #EF4444 0%, #F87171 100%);padding:6px 10px;border-radius:6px;font-weight:700;display:inline-block;min-width:35px">${s.cancelados}</span></td>
          <td style="padding:16px 20px;text-align:center">
            <div style="background:${s.porcentaje > 80 ? 'linear-gradient(135deg, #22C55E 0%, #4ADE80 100%)' : s.porcentaje > 50 ? 'linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)' : 'linear-gradient(135deg, #EF4444 0%, #F87171 100%)'};border-radius:6px;padding:6px 12px;font-weight:700;color:white;display:inline-block;min-width:45px">${s.porcentaje}%</div>
          </td>
        `
      ).join('') || '<td colspan="5" style="padding:32px 20px;text-align:center;color:var(--text-muted)">📊 Sin datos disponibles</td>';
      
      // Guardar para exportación
      window.reportesData = {
        periodo: { desde, hasta: hasta + ' 23:59' },
        kpis: { 
          total: turnosFiltrados.length, 
          finalizados: finalizados.length, 
          cancelados: cancelados.length,
          noAtendidos: noAtendidos.length,
          pendientes: pendientes.length,
          avgEspera, 
          maxEspera,
          minEspera,
          avgServicio,
          tasaExito,
          tasaCancelacion,
          operadorTop, 
          servicioTop 
        },
        operadores,
        servicios: servicios_arr,
        turnos: turnosFiltrados
      };
      
      console.log('[Reportes] ✅ Dashboard cargado:', { total: turnosFiltrados.length, operadores: operadores.length, servicios: servicios_arr.length });
      
    } catch (e) {
      console.error('[Reportes Error]', e);
      showToast('⚠️ Error procesando reportes: ' + e.message, 'error');
    }
  }
  
  // Cargar datos iniciales
  await cargarReportes();
}

// Exportar Excel
async function exportarReportesExcel() {
  if (!window.reportesData) return;
  const d = window.reportesData;
  
  try {
    const wb = XLSX.utils.book_new();
    
    // Hoja 1: KPIs Generales
    const kpiData = [
      ['REPORTE DE ESTADÍSTICAS', ''],
      ['Período', `${d.periodo.desde} a ${d.periodo.hasta}`],
      [''],
      ['INDICADOR', 'VALOR', '% DEL TOTAL'],
      ['Total Turnos', d.kpis.total, '100%'],
      ['Finalizados', d.kpis.finalizados, d.kpis.tasaExito + '%'],
      ['Cancelados', d.kpis.cancelados, d.kpis.tasaCancelacion + '%'],
      ['No Atendidos', d.kpis.noAtendidos, d.kpis.noAtendidos > 0 ? ((d.kpis.noAtendidos/d.kpis.total)*100).toFixed(1) + '%' : '0%'],
      ['Pendientes', d.kpis.pendientes, d.kpis.pendientes > 0 ? ((d.kpis.pendientes/d.kpis.total)*100).toFixed(1) + '%' : '0%'],
      [''],
      ['TIEMPOS PROMEDIO', '', ''],
      ['Espera Mínima (min)', d.kpis.minEspera, ''],
      ['Espera Promedio (min)', d.kpis.avgEspera, ''],
      ['Espera Máxima (min)', d.kpis.maxEspera, ''],
      ['Duración Promedio Servicio (min)', d.kpis.avgServicio, ''],
      [''],
      ['TOP RENDIMIENTO', '', ''],
      ['Operador Más Activo', d.kpis.operadorTop ? d.kpis.operadorTop[0] + ' (' + d.kpis.operadorTop[1] + ' atendidos)' : 'N/A', ''],
      ['Servicio Más Solicitado', d.kpis.servicioTop ? d.kpis.servicioTop[0] + ' (' + d.kpis.servicioTop[1] + ' turnos)' : 'N/A', '']
    ];
    const ws1 = XLSX.utils.aoa_to_sheet(kpiData);
    ws1['!cols'] = [{ wch: 30 }, { wch: 25 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, ws1, 'Resumen KPIs');
    
    // Hoja 2: Rendimiento por Operador
    if (d.operadores && d.operadores.length) {
      const opData = [
        ['RENDIMIENTO POR OPERADOR'],
        ['Operador', 'Turnos Atendidos', 'Cancelados', 'Espera Prom (min)', 'Servicio Prom (min)', '% Éxito', '% Cancelación'],
        ...d.operadores.map(op => [op.nombre, op.atendidos, op.cancelados, op.espera_prom, op.servicio_prom, op.tasa_exito + '%', op.cancelacion + '%'])
      ];
      const ws2 = XLSX.utils.aoa_to_sheet(opData);
      ws2['!cols'] = [{ wch: 20 }, { wch: 18 }, { wch: 12 }, { wch: 18 }, { wch: 18 }, { wch: 12 }, { wch: 15 }];
      XLSX.utils.book_append_sheet(wb, ws2, 'Operadores');
    }
    
    // Hoja 3: Comparativo por Servicio
    if (d.servicios && d.servicios.length) {
      const servData = [
        ['COMPARATIVO POR SERVICIO'],
        ['Servicio', 'Total Turnos', 'Finalizados', 'Cancelados', 'Espera Prom (min)', '% Completación'],
        ...d.servicios.map(s => [s.servicio, s.total, s.finalizados, s.cancelados, s.espera_prom, s.porcentaje + '%'])
      ];
      const ws3 = XLSX.utils.aoa_to_sheet(servData);
      ws3['!cols'] = [{ wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 18 }, { wch: 18 }];
      XLSX.utils.book_append_sheet(wb, ws3, 'Servicios');
    }
    
    // Hoja 4: Detalle Completo de Turnos
    if (d.turnos && d.turnos.length) {
      const turnoData = [
        ['DETALLE DE TURNOS'],
        ['ID', 'Número', 'Servicio', 'Estado', 'Atendido Por', 'Fecha/Hora', 'Espera (min)', 'Duración Servicio (min)'],
        ...d.turnos.map(t => [
          t.id || '',
          t.codigo || '',
          t.service || '',
          t.estado || '',
          t.atendidoPor || 'Sin asignar',
          t.tsCreated ? new Date(t.tsCreated).toLocaleString() : '',
          t.tsCreated && t.tsAtendido ? ((t.tsAtendido - t.tsCreated) / 60000).toFixed(1) : '',
          t.tsAtendido && t.tsFin ? ((t.tsFin - t.tsAtendido) / 60000).toFixed(1) : ''
        ])
      ];
      const ws4 = XLSX.utils.aoa_to_sheet(turnoData);
      ws4['!cols'] = [{ wch: 8 }, { wch: 12 }, { wch: 18 }, { wch: 12 }, { wch: 18 }, { wch: 18 }, { wch: 12 }, { wch: 18 }];
      XLSX.utils.book_append_sheet(wb, ws4, 'Detalle Turnos');
    }
    
    const fecha = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `neuroturn-reporte-${fecha}.xlsx`);
    showToast('✅ Reporte Excel exportado: neuroturn-reporte-' + fecha + '.xlsx', 'success');
  } catch (e) {
    showToast('Error exportando Excel: ' + e.message, 'error');
  }
}

function openModal(id) {
  document.getElementById(id).classList.add('open');
  if (id === 'modal-turno') updatePrefixPreview();
}
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

function updatePrefixPreview() {
  const svc = document.getElementById('new-patient-service')?.value || 'Módulo 1';
  const prefixes = {'Módulo 1':'M', 'Módulo 2':'M', 'Módulo 3':'M', 'Módulo 4':'M'};
  const prefix = prefixes[svc] || 'M';
  const next = (state.counter || 100) + 1;
  const el = document.getElementById('turno-preview');
  const colors = {M:'#3B72F2'};
  if (el) { el.textContent = `${prefix}-${next}`; el.style.color = colors[prefix]||'var(--primary)'; }
}

function openNewTurno() { openModal('modal-turno'); }
async function saveTurno() {
  const paciente   = document.getElementById('new-patient-name')?.value.trim();
  const documento  = document.getElementById('new-patient-doc')?.value.trim() || '';
  const servicio   = document.getElementById('new-patient-service')?.value || 'Módulo 1';
  if (!paciente) { showToast('Ingrese el nombre del paciente', 'error'); return; }

  const btn = document.querySelector('#modal-turno .btn-save');
  if (btn) { btn.disabled = true; btn.textContent = 'Creando...'; }
  try {
    const data = await API.post('/api/turnos', { paciente, documento, servicio });
    const t = normalizarTurno(data.turno);
    if (state.turnos.findIndex(x => x.dbId === t.dbId) < 0) state.turnos.unshift(t);
    closeModal('modal-turno');
    showToast(`✅ Turno ${t.codigo} creado para ${paciente}`, 'success');
    addNotif('turno', `Turno ${t.codigo} creado`, `${paciente} · ${servicio}`);
    renderTurnos(); renderDashboard(); renderPanel();
    if (document.getElementById('new-patient-name')) document.getElementById('new-patient-name').value = '';
    if (document.getElementById('new-patient-doc'))  document.getElementById('new-patient-doc').value  = '';
  } catch(e) {
    showToast('Error al crear turno: ' + e.message, 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Crear Turno'; }
  }
}

function openNewServicio() { document.getElementById('modal-svc-title').textContent='Nuevo Servicio'; document.getElementById('svc-name').value=''; openModal('modal-servicio'); }
function saveServicio() {
  const name = document.getElementById('svc-name').value.trim();
  const prefix = document.getElementById('svc-prefix').value.trim().toUpperCase() || name[0];
  const active = document.getElementById('svc-status').value==='true';
  if (!name) { showToast('Ingrese el nombre','error'); return; }
  const id = 'SVC-' + String(state.servicios.length+1).padStart(2,'0');
  state.servicios.push({ id, name, prefix, modulos:0, turnos:0, active });
  saveState(); closeModal('modal-servicio'); renderServicios();
  showToast('Servicio ' + name + ' creado','success');
}
function deleteServicio(i) {
  if (!confirm('¿Eliminar servicio ' + state.servicios[i].name + '?')) return;
  state.servicios.splice(i,1); saveState(); renderServicios();
  showToast('Servicio eliminado','success');
}
function openNewModulo() { document.getElementById('modal-mod-title').textContent='Nuevo Módulo'; document.getElementById('mod-name').value=''; openModal('modal-modulo'); }
function saveModulo() {
  const name = document.getElementById('mod-name').value.trim();
  const service = document.getElementById('mod-service').value;
  const active = document.getElementById('mod-status').value==='true';
  if (!name) { showToast('Ingrese el nombre','error'); return; }
  const id = 'Módulo ' + String(state.modulos.length+1).padStart(2,'0');
  state.modulos.push({ id, name, service, active, atendiendo:'—' });
  saveState(); closeModal('modal-modulo'); renderModulos();
  showToast('Módulo ' + name + ' creado','success');
}
function deleteModulo(i) {
  if (!confirm('¿Eliminar módulo ' + state.modulos[i].name + '?')) return;
  state.modulos.splice(i,1); saveState(); renderModulos();
  showToast('Módulo eliminado','success');
}

// ── SEARCH ────────────────────────────────────────
function globalSearch(q) {
  if (!q) return;
  const t = state.turnos.find(x => x.id.toLowerCase().includes(q.toLowerCase()) || x.patient.toLowerCase().includes(q.toLowerCase()));
  if (t) showToast(`Encontrado: ${t.id} — ${t.patient}`);
}

// ── EXPORT FUNCTIONS ─────────────────────────────
function exportarExcel(source) {
  let data, filename;
  const turnos = state.turnos;

  if (source === 'historial') {
    // Exportar historial con todos los tiempos
    const hist = turnos.filter(t => ['Finalizado','Cancelado','No atendido'].includes(t.estado));
    data = [['Turno','Paciente','Documento','Servicio','Operador','Módulo','Hora Llegada','Hora Inicio Atención','Hora Finalización','Tiempo Espera (min)','Tiempo Atención (min)','Estado'],
      ...hist.map(t => {
        const waitMin = t.tsCreated && t.tsLlamado ? Math.round((t.tsLlamado-t.tsCreated)/60000) : (t.tsCreated && t.tsAtendido ? Math.round((t.tsAtendido-t.tsCreated)/60000) : '');
        const svcMin  = t.tsAtendido && t.tsFin    ? Math.round((t.tsFin-t.tsAtendido)/60000)      : '';
        return [t.id, t.patient, t.doc || '', t.service, t.atendidoPor || '', t.modulo, tsToHHMM(t.tsCreated), tsToHHMM(t.tsAtendido), tsToHHMM(t.tsFin), waitMin, svcMin, t.estado];
      })];
    filename = 'neuroturn_historial.xlsx';
  } else {
    // Exportar todos los turnos del día con tiempos completos
    data = [['Turno','Paciente','Documento','Servicio','Operador','Módulo','Hora Llegada','Hora Inicio Atención','Hora Finalización','Tiempo Espera (min)','Tiempo Atención (min)','Estado'],
      ...turnos.map(t => {
        const waitMin = t.tsCreated && t.tsLlamado ? Math.round((t.tsLlamado-t.tsCreado)/60000) : (t.tsCreated && t.tsAtendido ? Math.round((t.tsAtendido-t.tsCreated)/60000) : '');
        const svcMin  = t.tsAtendido && t.tsFin    ? Math.round((t.tsFin-t.tsAtendido)/60000)      : '';
        return [t.id, t.patient, t.doc || '', t.service, t.atendidoPor || '', t.modulo, tsToHHMM(t.tsCreated), tsToHHMM(t.tsAtendido), tsToHHMM(t.tsFin), waitMin, svcMin, t.estado];
      })];
    filename = 'neuroturn_turnos.xlsx';
  }

  if (window.XLSX) {
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Turnos');
    // Style header row
    const range = XLSX.utils.decode_range(ws['!ref']);
    for (let C = range.s.c; C <= range.e.c; C++) {
      const addr = XLSX.utils.encode_cell({r:0, c:C});
      if (!ws[addr]) continue;
      ws[addr].s = { font:{bold:true}, fill:{fgColor:{rgb:'3B72F2'}} };
    }
    XLSX.writeFile(wb, filename);
    showToast('✅ Excel exportado: ' + filename, 'success');
  } else {
    // Fallback to CSV
    const csv = data.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
    const url  = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href=url; a.download=filename.replace('.xlsx','.csv'); a.click();
    showToast('Exportado como CSV', 'success');
  }
}

async function exportDashboardPDF() {
  showToast('Generando PDF...', '');
  try {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p','mm','a4');
    const now = new Date().toLocaleString('es');

    // Header
    doc.setFillColor(59, 114, 242);
    doc.rect(0, 0, 210, 28, 'F');
    doc.setTextColor(255,255,255);
    doc.setFontSize(18); doc.setFont(undefined,'bold');
    doc.text('NeuroTurn – Dashboard', 14, 12);
    doc.setFontSize(9); doc.setFont(undefined,'normal');
    doc.text('Generado: ' + now, 14, 20);

    doc.setTextColor(17,24,39);
    // Stats
    const turnos = state.turnos;
    const fin = turnos.filter(t=>t.estado==='Finalizado');
    const esp = turnos.filter(t=>t.estado==='En fila');
    const stats = [
      ['Turnos atendidos hoy', turnos.filter(t=>t.estado==='Finalizado'||t.estado==='Atendiendo'||t.estado==='Llamando').length],
      ['En espera', esp.length],
      ['Finalizados', fin.length],
      ['Cancelados', turnos.filter(t=>t.estado==='Cancelado').length],
    ];
    let y = 38;
    doc.setFontSize(12); doc.setFont(undefined,'bold');
    doc.text('Resumen del día', 14, y); y += 8;
    stats.forEach(([label,val]) => {
      doc.setFontSize(10); doc.setFont(undefined,'normal');
      doc.text(label + ':', 14, y);
      doc.setFont(undefined,'bold'); doc.text(String(val), 80, y);
      doc.setFont(undefined,'normal'); y += 7;
    });

    // Table
    y += 6;
    doc.setFontSize(12); doc.setFont(undefined,'bold');
    doc.text('Últimos turnos', 14, y); y += 7;

    const headers = ['Turno','Paciente','Servicio','Estado','Hora'];
    const colW = [25,55,35,30,25];
    doc.setFillColor(238,242,255);
    doc.rect(14, y-5, 186, 7, 'F');
    doc.setFontSize(9); doc.setFont(undefined,'bold');
    let x = 14;
    headers.forEach((h,i) => { doc.text(h, x+1, y); x+=colW[i]; });
    y += 4;
    doc.setFont(undefined,'normal');
    const recent = [...turnos].sort((a,b)=>(b.tsCreated||0)-(a.tsCreated||0)).slice(0,15);
    recent.forEach(t => {
      y += 6;
      if (y > 270) { doc.addPage(); y = 20; }
      x = 14;
      [t.id, t.patient.slice(0,20), t.service, t.estado, tsToHHMM(t.tsCreated)].forEach((v,i) => {
        doc.text(String(v), x+1, y); x+=colW[i];
      });
      doc.setDrawColor(229,231,235);
      doc.line(14, y+2, 200, y+2);
    });

    doc.save('neuroturn_dashboard.pdf');
    showToast('✅ PDF exportado', 'success');
  } catch(e) {
    showToast('Error al generar PDF: ' + e.message, 'error');
  }
}

async function exportHistorialPDF() {
  showToast('Generando PDF del historial...', '');
  try {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('l','mm','a4'); // landscape for more columns
    const now = new Date().toLocaleString('es');

    doc.setFillColor(59, 114, 242);
    doc.rect(0, 0, 297, 28, 'F');
    doc.setTextColor(255,255,255);
    doc.setFontSize(16); doc.setFont(undefined,'bold');
    doc.text('NeuroTurn – Historial de Turnos', 14, 12);
    doc.setFontSize(9); doc.setFont(undefined,'normal');
    doc.text('Generado: ' + now, 14, 20);

    doc.setTextColor(17,24,39);
    let y = 38;
    const hist = state.turnos.filter(t=>['Finalizado','Cancelado','No atendido'].includes(t.estado));

    const headers = ['Turno','Paciente','Servicio','Módulo','Hora Creación','Hora Atención','T.Espera','T.Atención','Estado'];
    const colW = [22,48,28,28,25,25,20,22,25];
    doc.setFillColor(238,242,255);
    doc.rect(14, y-5, 269, 7, 'F');
    doc.setFontSize(8); doc.setFont(undefined,'bold');
    let x = 14;
    headers.forEach((h,i)=>{ doc.text(h, x+1, y); x+=colW[i]; });
    y+=4; doc.setFont(undefined,'normal');

    hist.forEach(t => {
      y+=6;
      if(y>190){ doc.addPage(); y=20; }
      const waitMin = t.tsCreated&&t.tsAtendido ? Math.round((t.tsAtendido-t.tsCreated)/60000)+'m' : '—';
      const svcMin  = t.tsAtendido&&t.tsFin     ? Math.round((t.tsFin-t.tsAtendido)/60000)+'m'     : '—';
      x=14;
      [t.id, t.patient.slice(0,18), t.service, t.modulo.replace('Módulo','Mód.'), tsToHHMM(t.tsCreated), tsToHHMM(t.tsAtendido), waitMin, svcMin, t.estado]
        .forEach((v,i)=>{ doc.text(String(v), x+1, y); x+=colW[i]; });
      doc.setDrawColor(229,231,235);
      doc.line(14,y+2,283,y+2);
    });

    doc.save('neuroturn_historial.pdf');
    showToast('✅ PDF del historial exportado', 'success');
  } catch(e) {
    showToast('Error al generar PDF: ' + e.message, 'error');
  }
}

// ── TOAST ─────────────────────────────────────────
function showToast(msg, type='') {
  const c = document.getElementById('toast-container');
  const t = document.createElement('div');
  t.className = 'toast ' + type;
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

// ── TV CLOCK — arranca al cargar (actualiza cada segundo) ─────────
const _tvClockInit = setInterval(() => {
  const t = fmtHHMM(new Date());
  const d = fmtDateTV(new Date());
  ['tv-time','tvf-time'].forEach(id=>{ const el=document.getElementById(id); if(el) el.textContent=t; });
  ['tv-date','tvf-date'].forEach(id=>{ const el=document.getElementById(id); if(el) el.textContent=d; });
}, 1000);

// ── MODAL CLOSE ON BACKDROP ───────────────────────
document.querySelectorAll('.modal-overlay').forEach(m => {
  m.addEventListener('click', e => { if(e.target===m) m.classList.remove('open'); });
});



// ── VENTANA TELEVISOR REGISTRO (para reproducir audio en todos los equipos con TV abierta) ──────────
let tvWindowOpen = false;

function registerTVWindow(isOpen) {
  tvWindowOpen = isOpen;
  // Cuando abre/cierra la ventana TV, registra el estado
  if (isOpen) {
    console.log('📺 Ventana Televisor abierta — este equipo recibirá audio de llamados');
    API.post('/api/devices/register-tv', { open: true }).catch(e => console.log('TV register:', e.message));
  } else {
    console.log('📺 Ventana Televisor cerrada');
    API.post('/api/devices/register-tv', { open: false }).catch(e => console.log('TV unregister:', e.message));
  }
}

// Reproducir audio en el cliente (si tiene TV abierta)
function playCallAudio() {
  // DESACTIVADO: Sonido de llamada removido
  // if (!tvWindowOpen) return;
  // try {
  //   const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  //   const oscillator = audioContext.createOscillator();
  //   const gain = audioContext.createGain();
  //   oscillator.connect(gain);
  //   gain.connect(audioContext.destination);
  //   const startTime = audioContext.currentTime;
  //   for (let i = 0; i < 3; i++) {
  //     oscillator.frequency.setValueAtTime(800, startTime + i * 0.7);
  //     gain.gain.setValueAtTime(0.3, startTime + i * 0.7);
  //     gain.gain.setValueAtTime(0, startTime + i * 0.7 + 0.5);
  //   }
  //   oscillator.start(startTime);
  //   oscillator.stop(startTime + 2.1);
  // } catch (e) {
  //   console.log('Audio play:', e.message);
  // }
}

// ── PAUSA DE MÓDULO ───────────────────────────────
// Usa la variable moduloPaused declarada anteriormente

function toggleModuloPause() {
  if (!btn) return;
  if (moduloPaused) {
    btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="5 3 19 12 5 21 5 3"/></svg> Reanudar módulo`;
    btn.style.background = '#FEF3C7'; btn.style.color = '#D97706'; btn.style.borderColor = '#FDE68A';
    showToast(`⏸ ${currentUser?.modulo || 'Módulo'} en pausa — no recibirá nuevos turnos`, 'warning');
    addNotif('sistema', 'Módulo en pausa', `${currentUser?.modulo || 'Módulo'} pausado por ${currentUser?.name?.split(' ')[0]}`);
  } else {
    btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg> Pausar módulo`;
    btn.style.background = ''; btn.style.color = ''; btn.style.borderColor = '';
    showToast(`▶ ${currentUser?.modulo || 'Módulo'} reanudado`, 'success');
    addNotif('sistema', 'Módulo reanudado', `${currentUser?.modulo || 'Módulo'} vuelve a recibir turnos`);
  }
  renderPanel();
}

// ── NOTA RÁPIDA AL FINALIZAR ──────────────────────
let pendingFinalizarId = null;

function pedirNotaYFinalizar() {
  const id = document.getElementById('panel-turno-id').textContent;
  if (!id || id==='—') return;
  const t = state.turnos.find(x=>x.id===id);
  if (!t) return;
  pendingFinalizarId = id;
  document.getElementById('nota-turno-id').textContent = id;
  document.getElementById('nota-paciente').textContent = t.patient;
  document.getElementById('nota-servicio').textContent = t.service;
  document.getElementById('nota-texto').value = t.nota || '';
  openModal('modal-nota');
}

async function guardarNotaYFinalizar() {
  const nota = document.getElementById('nota-texto').value.trim();
  const id = pendingFinalizarId;
  closeModal('modal-nota');
  pendingFinalizarId = null;
  // Usar la función API — pone el código del turno en el panel-turno-id temp
  const t = state.turnos.find(x => x.id === id || x.codigo === id);
  if (t) {
    document.getElementById('panel-turno-id').textContent = t.codigo || t.id;
    await finalizarTurnoAPI(nota);
  }
}

// ── BÚSQUEDA GLOBAL MEJORADA ──────────────────────
function globalSearch(q) {
  if (!q || q.length < 2) {
    const panel = document.getElementById('search-results-panel');
    if (panel) panel.style.display = 'none';
    return;
  }
  const ql = q.toLowerCase();
  const results = state.turnos.filter(t =>
    t.id.toLowerCase().includes(ql) ||
    t.patient.toLowerCase().includes(ql) ||
    t.doc.includes(ql) ||
    t.service.toLowerCase().includes(ql)
  ).slice(0, 8);

  let panel = document.getElementById('search-results-panel');
  if (!panel) {
    panel = document.createElement('div');
    panel.id = 'search-results-panel';
    panel.style.cssText = 'position:absolute;top:56px;left:0;right:0;background:white;border:1px solid var(--border);border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,.12);z-index:500;max-height:320px;overflow-y:auto;display:none';
    document.querySelector('.search-box').style.position = 'relative';
    document.querySelector('.search-box').appendChild(panel);
  }

  if (!results.length) {
    panel.style.display = 'block';
    panel.innerHTML = '<div style="padding:16px;text-align:center;color:var(--text-muted);font-size:13px">Sin resultados para "'+q+'"</div>';
    return;
  }
  panel.style.display = 'block';
  panel.innerHTML = results.map(t => {
    const color = getSvcColor(t.id[0]);
    const badge = {Finalizado:'#DCFCE7|#16A34A',Cancelado:'#FEE2E2|#DC2626','En fila':'#F3F4F6|#6B7280',Llamando:'#EEF2FF|#3B72F2',Atendiendo:'#DCFCE7|#16A34A'}[t.estado]||'#F3F4F6|#6B7280';
    const [bb,bc] = badge.split('|');
    return `<div onclick="cerrarSearch();openTurnoDetailById('${esc(t.id)}')" style="padding:10px 14px;display:flex;align-items:center;gap:10px;cursor:pointer;border-bottom:1px solid var(--border-light);transition:background .1s" onmouseenter="this.style.background='var(--bg)'" onmouseleave="this.style.background=''">
      <div style="font-family:'DM Mono',monospace;font-size:14px;font-weight:800;color:${color};min-width:52px">${esc(t.id)}</div>
      <div style="flex:1;min-width:0">
        <div style="font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(t.patient)}</div>
        <div style="font-size:11px;color:var(--text-muted)">${esc(t.service)} · Doc. ****${esc(t.doc)}</div>
      </div>
      <div style="font-size:10.5px;font-weight:700;padding:2px 8px;border-radius:20px;background:${bb};color:${bc};white-space:nowrap">${esc(t.estado)}</div>
    </div>`;
  }).join('');
}

function cerrarSearch() {
  document.getElementById('search-input').value = '';
  const panel = document.getElementById('search-results-panel');
  if (panel) panel.style.display = 'none';
}
document.addEventListener('click', e => {
  const box = document.querySelector('.search-box');
  if (box && !box.contains(e.target)) cerrarSearch();
});

// ── BACKUP Y RESTORE ──────────────────────────────
function backupData() {
  const data = { version: '1.0', date: new Date().toISOString(), state };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `neuroturn_backup_${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('✅ Backup descargado correctamente', 'success');
  addNotif('sistema', 'Backup generado', 'Archivo JSON descargado — ' + new Date().toLocaleDateString('es'));
}

function restoreData(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result);
      if (!data.state) throw new Error('Formato inválido');
      if (!confirm(`¿Restaurar backup del ${new Date(data.date).toLocaleDateString('es')}?\nSe perderán los datos actuales.`)) return;
      state = data.state;
      saveState();
      renderDashboard(); renderTurnos(); renderInicio();
      showToast('✅ Backup restaurado correctamente', 'success');
      addNotif('sistema', 'Backup restaurado', 'Datos cargados desde ' + file.name);
    } catch(err) {
      showToast('❌ Archivo inválido — ' + err.message, 'error');
    }
    input.value = '';
  };
  reader.readAsText(file);
}

// ── CONFIRMAR ZONA DE PELIGRO ─────────────────────
function confirmarAccionPeligrosa(accion, label) {
  const pin = prompt(`⚠️ ZONA DE PELIGRO\n\nEscribe CONFIRMAR para ${label}:`);
  if (pin !== 'CONFIRMAR') { showToast('Acción cancelada', ''); return; }
  accion();
}

// ── TIEMPO ESTIMADO EN TV ─────────────────────────
function calcEstimatedWait() {
  const waiting = state.turnos.filter(t => t.estado === 'En fila').length;
  const fin = state.turnos.filter(t => t.estado === 'Finalizado' && t.tsAtendido && t.tsCreated);
  if (!fin.length || !waiting) return null;
  const avgMs = fin.reduce((a,t)=>a+(t.tsAtendido-t.tsCreated),0) / fin.length;
  const activeModules = new Set(state.turnos.filter(t=>t.estado==='Atendiendo'||t.estado==='Llamando').map(t=>t.modulo)).size || 1;
  const estimatedMin = Math.round((avgMs / 1000 / 60) * (waiting / activeModules));
  return Math.min(estimatedMin, 90); // cap at 90 min
}

// ── INIT ──────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  try {
    console.log('NeuroTurn v2.2 iniciando...');
    
    // 1. Mostrar auth screen por defecto
    const authScreen = document.getElementById('auth-screen');
    const appDiv = document.getElementById('app');
    
    if (authScreen) {
      authScreen.style.display = 'flex';
      console.log('✅ Auth screen visible');
    }
    
    if (appDiv) {
      appDiv.style.display = 'none';
      console.log('✅ App hidden');
    }
    
    // 2. Inicializar TTS
    try {
      if (window.TTS && window.TTS.init) {
        TTS.init();
        console.log('✅ TTS initialized');
      }
    } catch (e) {
      console.warn('TTS init skipped:', e.message);
    }
    
    // 3. Setup listeners
    try {
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          const registro = document.getElementById('registro-overlay');
          if (registro && registro.classList.contains('open')) {
            registro.classList.remove('open');
          }
        }
      });
      console.log('✅ Keyboard listeners ready');
    } catch (e) {
      console.warn('Listeners setup error:', e.message);
    }
    
    // 4. Restaurar sesión si existe token
    try {
      const token = getToken && getToken();
      if (token) {
        console.log('Token encontrado, verificando...');
        if (window.API && window.API.get) {
          API.get('/api/auth/me')
            .then(res => {
              if (res && (res.usuario || res.user)) {
                console.log('✅ Sesión válida');
                if (window.onLoginSuccess) {
                  onLoginSuccess();
                }
              }
            })
            .catch(e => console.warn('Token inválido:', e.message));
        }
      }
    } catch (e) {
      console.warn('Session restore skipped:', e.message);
    }
    
    console.log('✅ Inicialización completada');
  } catch (e) {
    console.error('❌ Error en inicialización:', e.message, e);
  }
   
  // ── GESTIÓN DE ANUNCIOS ─────────────────────────
  window.listaAnuncios = JSON.parse(localStorage.getItem('anuncios') || '[]');
  window.anuncioEnProyeccion = null;

  window.crearAnuncio = function() {
    const tipo = document.getElementById('tipo-anuncio')?.value || 'texto';
    const contenido = document.getElementById('contenido-anuncio')?.value?.trim();
    const duracion = parseInt(document.getElementById('duracion-anuncio')?.value) || 5;

    if (!contenido) {
      showToast('Por favor, ingresa el contenido del anuncio', 'error');
      return;
    }

    const anuncio = {
      id: Date.now(),
      tipo,
      contenido,
      duracion,
      creado: new Date().toLocaleString('es-AR'),
      activo: false
    };

    window.listaAnuncios.push(anuncio);
    localStorage.setItem('anuncios', JSON.stringify(window.listaAnuncios));
    
    document.getElementById('contenido-anuncio').value = '';
    showToast('✓ Anuncio creado exitosamente', 'success');
    renderAnuncios();
  };

  window.renderAnuncios = function() {
    const tbody = document.getElementById('anuncios-tbody');
    if (!tbody) return;

    if (window.listaAnuncios.length === 0) {
      tbody.innerHTML = '<td colspan="6" style="text-align:center;padding:32px;color:var(--text-light)"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="opacity:.5;margin-bottom:8px;display:block;margin-left:auto;margin-right:auto"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="9" y1="9" x2="15" y2="9"/><line x1="9" y1="15" x2="15" y2="15"/></svg>Sin anuncios creados</td>';
      return;
    }

    tbody.innerHTML = window.listaAnuncios.map(a => `
      
        <td><span class="turno-id">#${a.id}</span></td>
        <td><span class="badge badge-atendiendo" style="background:var(--primary-light);color:var(--primary)">${a.tipo}</span></td>
        <td>${a.contenido.substring(0, 50)}${a.contenido.length > 50 ? '...' : ''}</td>
        <td>${a.duracion}s</td>
        <td>${a.creado}</td>
        <td>
          <div class="action-icons">
            <button class="icon-btn" title="Proyectar" onclick="proyectarAnuncioEspecifico(${a.id})">▶</button>
            <button class="icon-btn" title="Editar" onclick="editarAnuncio(${a.id})">✎</button>
            <button class="icon-btn" title="Eliminar" onclick="eliminarAnuncio(${a.id})">✕</button>
          </div>
        </td>
      
    `).join('');
  };

  window.proyectarAnuncioEspecifico = function(id) {
    const anuncio = window.listaAnuncios.find(a => a.id === id);
    if (!anuncio) return;
    
    window.anuncioEnProyeccion = anuncio;
    const estado = document.getElementById('estado-proyeccion');
    if (estado) {
      estado.textContent = 'En Proyección ▶';
      estado.style.color = 'var(--success)';
    }
    
    showToast(`✓ Proyectando: "${anuncio.contenido.substring(0, 30)}..."`, 'success');
    
    setTimeout(() => {
      if (estado) {
        estado.textContent = 'Inactivo';
        estado.style.color = 'var(--primary)';
      }
      window.anuncioEnProyeccion = null;
    }, anuncio.duracion * 1000);
  };

  window.proyectarAnuncio = function() {
    const tipo = document.getElementById('tipo-anuncio')?.value;
    const contenido = document.getElementById('contenido-anuncio')?.value?.trim();
    const duracion = parseInt(document.getElementById('duracion-anuncio')?.value) || 5;

    if (!contenido) {
      showToast('Por favor, ingresa el contenido del anuncio', 'error');
      return;
    }

    const estado = document.getElementById('estado-proyeccion');
    if (estado) {
      estado.textContent = 'En Proyección ▶';
      estado.style.color = 'var(--success)';
    }

    showToast(`✓ Proyectando anuncio por ${duracion}s`, 'success');

    setTimeout(() => {
      if (estado) {
        estado.textContent = 'Inactivo';
        estado.style.color = 'var(--primary)';
      }
    }, duracion * 1000);
  };

  window.reproducirVoz = function() {
    const contenido = document.getElementById('contenido-anuncio')?.value?.trim();
    if (!contenido) {
      showToast('Por favor, ingresa un mensaje', 'error');
      return;
    }

    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(contenido);
      utterance.lang = 'es-ES';
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      speechSynthesis.speak(utterance);
      showToast('🔊 Reproduciendo mensaje...', 'success');
    } else {
      showToast('Síntesis de voz no disponible en este navegador', 'error');
    }
  };

  window.pausarAnuncio = function() {
    if ('speechSynthesis' in window) {
      speechSynthesis.pause();
      showToast('⏸ Anuncio pausado', 'info');
    }
  };

  window.detenerAnuncio = function() {
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
      showToast('⊗ Anuncio detenido', 'info');
    }
    const estado = document.getElementById('estado-proyeccion');
    if (estado) {
      estado.textContent = 'Inactivo';
      estado.style.color = 'var(--primary)';
    }
  };

  window.editarAnuncio = function(id) {
    const anuncio = window.listaAnuncios.find(a => a.id === id);
    if (!anuncio) return;
    
    document.getElementById('tipo-anuncio').value = anuncio.tipo;
    document.getElementById('contenido-anuncio').value = anuncio.contenido;
    document.getElementById('duracion-anuncio').value = anuncio.duracion;
    
    eliminarAnuncio(id);
    showToast('Anuncio cargado para editar', 'info');
  };

  window.eliminarAnuncio = function(id) {
    window.listaAnuncios = window.listaAnuncios.filter(a => a.id !== id);
    localStorage.setItem('anuncios', JSON.stringify(window.listaAnuncios));
    renderAnuncios();
    showToast('✓ Anuncio eliminado', 'success');
  };

  // Inicializar tabla en primera carga
  window.addEventListener('load', () => {
    setTimeout(() => renderAnuncios(), 500);
  });
});
