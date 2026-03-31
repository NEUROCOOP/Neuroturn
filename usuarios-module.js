/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║   MÓDULO DE GESTIÓN DE USUARIOS                                  ║
 * ║   NeuroTurn — Administración de operadores y roles               ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

'use strict';

// ── HELPERS ─────────────────────────────────────────
function _filtrarLista() {
  const q = usuariosState.filtro.toLowerCase();
  return usuariosState.usuarios.filter(u =>
    u.username.toLowerCase().includes(q) ||
    u.nombre.toLowerCase().includes(q) ||
    (u.email || '').toLowerCase().includes(q)
  );
}

// ── ESTADO LOCAL ────────────────────────────────────
let usuariosState = {
  usuarios: [],
  editando: null,
  filtro: '',
  page: 1,
  perPage: 8
};

const ROLES = [
    { id: 'admin', label: 'Administrador', color: '#3B72F2' },
    { id: 'medico', label: 'Médico', color: '#8B5CF6' },
    { id: 'enfermero', label: 'Enfermero', color: '#22C55E' },
    { id: 'recepcion', label: 'Recepcionista', color: '#F59E0B' },
    { id: 'operador', label: 'Operador', color: '#06B6D4' },
    { id: 'linea', label: 'Linea de Frente', color: '#EC4899' }
];

const MODULOS = [
  'Módulo 01', 'Módulo 02', 'Módulo 03', 'Módulo 04',
  'Módulo 05', 'Módulo 06', 'Módulo 07', 'Módulo 08'
];

// ── FUNCIONES DE RENDERIZADO ────────────────────────
async function renderUsuarios() {
  const contenedor = document.getElementById('usuarios-container');
  if (!contenedor) return;

  // Cargar usuarios
  await cargarUsuarios();

  // Stats rápidos
  const statsEl = document.getElementById('usuarios-stats');
  if (statsEl) {
    const total = usuariosState.usuarios.length;
    const activos = usuariosState.usuarios.filter(u => u.activo !== false).length;
    const inactivos = total - activos;
    const admins = usuariosState.usuarios.filter(u => (u.rol || '').toLowerCase() === 'administrador' || u.rol === 'admin').length;
    statsEl.innerHTML = `
      <div class="usuarios-stat-card">
        <div style="width:36px;height:36px;border-radius:8px;background:var(--primary-light);display:flex;align-items:center;justify-content:center">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
        </div>
        <div><div class="usuarios-stat-num">${total}</div><div class="usuarios-stat-label">Total</div></div>
      </div>
      <div class="usuarios-stat-card">
        <div style="width:36px;height:36px;border-radius:8px;background:var(--success-light);display:flex;align-items:center;justify-content:center">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--success)" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <div><div class="usuarios-stat-num" style="color:var(--success)">${activos}</div><div class="usuarios-stat-label">Activos</div></div>
      </div>
      <div class="usuarios-stat-card">
        <div style="width:36px;height:36px;border-radius:8px;background:var(--danger-light);display:flex;align-items:center;justify-content:center">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
        </div>
        <div><div class="usuarios-stat-num" style="color:var(--danger)">${inactivos}</div><div class="usuarios-stat-label">Inactivos</div></div>
      </div>
      <div class="usuarios-stat-card">
        <div style="width:36px;height:36px;border-radius:8px;background:var(--warning-light);display:flex;align-items:center;justify-content:center">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--warning)" stroke-width="2"><path d="M12 15v2"/><path d="M12 11h.01"/><path d="M3.34 19a10 10 0 1117.32 0"/></svg>
        </div>
        <div><div class="usuarios-stat-num" style="color:var(--warning)">${admins}</div><div class="usuarios-stat-label">Admins</div></div>
      </div>`;
  }

  // Tabla de usuarios
  const filtered = _filtrarLista();

  const totalPages = Math.ceil(filtered.length / usuariosState.perPage);
  if (usuariosState.page > totalPages && totalPages > 0) {
    usuariosState.page = totalPages;
  }

  const start = (usuariosState.page - 1) * usuariosState.perPage;
  const slice = filtered.slice(start, start + usuariosState.perPage);

  // Renderizar tabla
  const tbody = document.getElementById('usuarios-table-body');
  tbody.innerHTML = slice.map((usuario, idx) => {
    // Buscar rol por id o por label (case-insensitive)
    let rolObj = ROLES.find(r => r.id === usuario.rol);
    if (!rolObj) {
      rolObj = ROLES.find(r => r.label.toLowerCase() === (usuario.rol || '').toLowerCase());
    }
    // Fallback si no se encuentra
    if (!rolObj) {
      rolObj = { id: 'unknown', label: usuario.rol || 'Desconocido', color: '#999' };
    }
    
    const estado = usuario.activo ? 'Activo' : 'Inactivo';
    const estadoClass = usuario.activo ? 'activo' : 'inactivo';
    const modulosList = (usuario.modulos || []).join(', ') || '—';

    return `
    <tr class="usuario-row ${!usuario.activo ? 'usuario-inactivo' : ''}">
      <td>
        <div class="usuario-avatar" style="background:${rolObj?.color || '#999'}">${usuario.nombre[0]}</div>
      </td>
      <td>
        <div class="usuario-name">${esc(usuario.nombre)}</div>
        <div class="usuario-username">@${esc(usuario.username)}</div>
      </td>
      <td>
        <div style="font-size:12px;color:var(--text-muted)">${esc(usuario.email || '—')}</div>
      </td>
      <td>
        <span class="badge-rol" style="background:${rolObj?.color}22;color:${rolObj?.color}">
          ${rolObj?.label || usuario.rol}
        </span>
      </td>
      <td>
        <div style="max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px;color:var(--text-muted)">
          ${modulosList}
        </div>
      </td>
      <td>
        <span class="badge-estado badge-${estadoClass}">${estado}</span>
      </td>
      <td>
        <div style="font-size:10px;color:var(--text-muted)">
          ${usuario.ultimoAcceso ? tsToHHMM(usuario.ultimoAcceso) : 'Sin acceso'}
        </div>
      </td>
      <td>
        <div class="action-icons">
          <div class="icon-btn" title="Editar" onclick="editarUsuario(${start + idx})">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </div>
          <div class="icon-btn" title="${usuario.activo ? 'Desactivar' : 'Activar'}" onclick="toggleUsuario(${start + idx})" style="color:${usuario.activo ? '#F59E0B' : '#22C55E'}">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              ${usuario.activo ? 
                '<circle cx="12" cy="12" r="1"/><path d="M12 1v6m0 6v6"/>' :
                '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>'
              }
            </svg>
          </div>
          <div class="icon-btn" title="Cambiar contraseña" onclick="abrirCambioPassword(${start + idx})" style="color:#3B72F2">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
          </div>
          <div class="icon-btn" title="Eliminar" onclick="confirmarEliminarUsuario(${start + idx})" style="color:#EF4444">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
          </div>
          <div class="icon-btn" title="Ver historial" onclick="abrirHistorialUsuario(${start + idx})" style="color:#8B5CF6">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          </div>
        </div>
      </td>
    </tr>`;
  }).join('');

  // Paginación
  const paginInfo = document.getElementById('usuarios-pagination-info');
  const btnsPag = document.getElementById('usuarios-pagination-btns');

  if (filtered.length === 0) {
    paginInfo.textContent = 'Sin usuarios' + (usuariosState.filtro ? ' para esta búsqueda' : '');
    btnsPag.innerHTML = '';
    return;
  }

  paginInfo.textContent =
    `Mostrando ${start + 1}-${Math.min(start + usuariosState.perPage, filtered.length)} de ${filtered.length} usuarios`;

  btnsPag.innerHTML = `
    <button class="page-btn" onclick="changeUsuariosPage(${usuariosState.page - 1})" ${usuariosState.page === 1 ? 'disabled' : ''}>‹</button>
    ${Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(p =>
      `<button class="page-btn ${p === usuariosState.page ? 'active' : ''}" onclick="changeUsuariosPage(${p})">${p}</button>`
    ).join('')}
    ${totalPages > 5 ? `<button class="page-btn" disabled>…</button>` : ''}
    <button class="page-btn" onclick="changeUsuariosPage(${usuariosState.page + 1})" ${usuariosState.page === totalPages ? 'disabled' : ''}>›</button>
  `;
}

function changeUsuariosPage(p) {
  const filtered = _filtrarLista();
  const totalPages = Math.ceil(filtered.length / usuariosState.perPage);
  if (p < 1 || p > totalPages) return;
  usuariosState.page = p;
  renderUsuarios();
}

// ── CRUD USUARIOS ────────────────────────────────────
async function cargarUsuarios() {
  try {
    const res = await API.get('/api/usuarios');
    if (res.ok && Array.isArray(res.usuarios)) {
      usuariosState.usuarios = res.usuarios;
    }
  } catch (e) {
    showToast('Error: ' + e.message, 'error');
  }
}

async function crearUsuario() {
  const nombre = document.getElementById('form-nombre').value.trim();
  const username = document.getElementById('form-username').value.trim();
  const email = document.getElementById('form-email').value.trim();
  const password = document.getElementById('form-password').value;
  const rol = document.getElementById('form-rol').value;
  const modulos = Array.from(document.getElementById('form-modulos').selectedOptions).map(o => o.value);

  if (!nombre || !username || !password || !rol) {
    showToast('Completa todos los campos requeridos', 'error');
    return;
  }

  if (password.length < 6) {
    showToast('La contraseña debe tener al menos 6 caracteres', 'error');
    return;
  }

  try {
    const res = await API.post('/api/usuarios', {
      nombre, username, email, password, rol, modulos
    });

    if (res.ok) {
      showToast('✓ Usuario creado exitosamente', 'success');
      cerrarFormularioUsuario();
      await renderUsuarios();
    } else {
      showToast(res.mensaje || 'Error al crear usuario', 'error');
    }
  } catch (e) {
    showToast('Error: ' + e.message, 'error');
  }
}

async function actualizarUsuario() {
  if (!usuariosState.editando) return;

  const nombre = document.getElementById('form-nombre').value.trim();
  const email = document.getElementById('form-email').value.trim();
  const rol = document.getElementById('form-rol').value;
  const modulos = Array.from(document.getElementById('form-modulos').selectedOptions).map(o => o.value);

  if (!nombre || !rol) {
    showToast('Completa los campos requeridos', 'error');
    return;
  }

  try {
    const res = await API.patch(`/api/usuarios/${usuariosState.editando.id}`, {
      nombre, email, rol, modulos
    });

    if (res.ok) {
      showToast('✓ Usuario actualizado', 'success');
      cerrarFormularioUsuario();
      await renderUsuarios();
    } else {
      showToast(res.mensaje || 'Error al actualizar', 'error');
    }
  } catch (e) {
    showToast('Error: ' + e.message, 'error');
  }
}

async function eliminarUsuario(usuarioId) {
  try {
    const res = await API.del(`/api/usuarios/${usuarioId}`);
    if (res.ok) {
      showToast('✓ Usuario eliminado', 'success');
      await renderUsuarios();
    } else {
      showToast(res.mensaje || 'Error al eliminar', 'error');
    }
  } catch (e) {
    showToast('Error: ' + e.message, 'error');
  }
}

async function eliminarUsuarioConPassword(usuarioId, password) {
  try {
    const res = await API.del(`/api/usuarios/${usuarioId}`, {
      password_confirmacion: password
    });
    if (res.ok) {
      showToast('✓ Usuario eliminado correctamente', 'success');
      await renderUsuarios();
    } else {
      showToast(res.error || res.mensaje || 'Error al eliminar', 'error');
    }
  } catch (e) {
    showToast('Error: ' + e.message, 'error');
  }
}

// ── FORM MANAGEMENT ─────────────────────────────────
function abrirFormularioNuevoUsuario() {
  usuariosState.editando = null;
  document.getElementById('form-titulo').textContent = 'Crear nuevo usuario';
  document.getElementById('form-username').disabled = false;
  document.getElementById('form-password-group').style.display = 'block';
  document.getElementById('form-nombre').value = '';
  document.getElementById('form-username').value = '';
  document.getElementById('form-email').value = '';
  document.getElementById('form-password').value = '';
  document.getElementById('form-rol').value = 'operador';
  document.getElementById('form-modulos').value = [];
  document.getElementById('btn-form-submit').textContent = 'Crear usuario';
  document.getElementById('btn-form-submit').onclick = crearUsuario;
  openModal('modal-usuario-form');
}

function editarUsuario(idx) {
  const filtered = _filtrarLista();
  const usuario = filtered[idx];
  if (!usuario) return;

  usuariosState.editando = usuario;
  document.getElementById('form-titulo').textContent = `Editar usuario: ${usuario.username}`;
  document.getElementById('form-username').disabled = true;
  document.getElementById('form-password-group').style.display = 'none';
  document.getElementById('form-nombre').value = usuario.nombre;
  document.getElementById('form-username').value = usuario.username;
  document.getElementById('form-email').value = usuario.email || '';
  document.getElementById('form-rol').value = usuario.rol;
  
  // Seleccionar módulos
  const select = document.getElementById('form-modulos');
  for (let opt of select.options) {
    opt.selected = (usuario.modulos || []).includes(opt.value);
  }
  
  document.getElementById('btn-form-submit').textContent = 'Guardar cambios';
  document.getElementById('btn-form-submit').onclick = actualizarUsuario;
  openModal('modal-usuario-form');
}

function cerrarFormularioUsuario() {
  closeModal('modal-usuario-form');
  usuariosState.editando = null;
}

// ── ACCIONES ESPECIALES ─────────────────────────────
function abrirCambioPassword(idx) {
  const filtered = _filtrarLista();
  const usuario = filtered[idx];
  if (!usuario) return;

  usuariosState.editando = usuario;
  document.getElementById('cambio-username').textContent = usuario.username;
  document.getElementById('cambio-password-nueva').value = '';
  document.getElementById('cambio-password-confirmada').value = '';
  openModal('modal-cambio-password');
}

async function guardarNuevaPassword() {
  if (!usuariosState.editando) return;

  const nueva = document.getElementById('cambio-password-nueva').value;
  const confirmada = document.getElementById('cambio-password-confirmada').value;

  if (!nueva || !confirmada) {
    showToast('Completa ambos campos', 'error');
    return;
  }

  if (nueva !== confirmada) {
    showToast('Las contraseñas no coinciden', 'error');
    return;
  }

  if (nueva.length < 6) {
    showToast('La contraseña debe tener al menos 6 caracteres', 'error');
    return;
  }

  try {
    const res = await API.patch(`/api/usuarios/${usuariosState.editando.id}/password`, {
      password: nueva
    });

    if (res.ok) {
      showToast('✓ Contraseña actualizada', 'success');
      closeModal('modal-cambio-password');
      usuariosState.editando = null;
    } else {
      showToast(res.mensaje || 'Error al actualizar contraseña', 'error');
    }
  } catch (e) {
    showToast('Error: ' + e.message, 'error');
  }
}

function confirmarEliminarUsuario(idx) {
  const filtered = _filtrarLista();
  const usuario = filtered[idx];
  if (!usuario) return;

  usuariosState.editando = usuario;
  document.getElementById('eliminar-username').textContent = usuario.username;
  document.getElementById('eliminar-nombre').textContent = usuario.nombre;
  document.getElementById('eliminar-username-confirm').textContent = usuario.username;
  document.getElementById('eliminar-confirmacion').value = '';
  document.getElementById('eliminar-password').value = '';
  openModal('modal-confirmar-eliminar');
}

function confirmarEliminarFinal() {
  if (!usuariosState.editando) return;
  
  const input = document.getElementById('eliminar-confirmacion').value.toLowerCase();
  const expectedText = usuariosState.editando.username.toLowerCase();
  const passwordAdmin = document.getElementById('eliminar-password').value;

  if (input !== expectedText) {
    showToast('Texto de confirmación incorrecto', 'error');
    return;
  }

  if (!passwordAdmin || passwordAdmin.trim() === '') {
    showToast('Ingresa la contraseña del administrador', 'error');
    return;
  }

  eliminarUsuarioConPassword(usuariosState.editando.id, passwordAdmin);
  closeModal('modal-confirmar-eliminar');
  usuariosState.editando = null;
}

async function toggleUsuario(idx) {
  const filtered = _filtrarLista();
  const usuario = filtered[idx];
  if (!usuario) return;

  try {
    const res = await API.patch(`/api/usuarios/${usuario.id}`, {
      activo: !usuario.activo
    });

    if (res.ok) {
      showToast(`✓ Usuario ${!usuario.activo ? 'activado' : 'desactivado'}`, 'success');
      await renderUsuarios();
    } else {
      showToast(res.mensaje || 'Error', 'error');
    }
  } catch (e) {
    showToast('Error: ' + e.message, 'error');
  }
}

// ── HISTORIAL DE ACCESOS ────────────────────────────
async function abrirHistorialUsuario(idx) {
  const filtered = _filtrarLista();
  const usuario = filtered[idx];
  if (!usuario) return;

  try {
    const res = await API.get(`/api/usuarios/${usuario.id}/historial`);
    if (res.ok && Array.isArray(res.historial)) {
      const lista = document.getElementById('historial-lista');
      lista.innerHTML = res.historial.length > 0 ? res.historial.map(h => `
        <div class="historial-item">
          <div class="historial-fecha">${tsToHHMM(h.timestamp || Date.now())}</div>
          <div class="historial-accion">${esc(h.accion || 'Acceso')}</div>
          <div class="historial-ip" style="font-size:11px;color:var(--text-muted)">${esc(h.ip || '—')}</div>
        </div>
      `).join('') : '<div style="text-align:center;padding:24px;color:var(--text-muted)">Sin historial de accesos</div>';
      
      document.getElementById('historial-username').textContent = usuario.username;
      openModal('modal-historial');
    }
  } catch (e) {
    showToast('Error: ' + e.message, 'error');
  }
}

// ── BÚSQUEDA Y FILTROS ──────────────────────────────
function filtrarUsuarios(q) {
  usuariosState.filtro = q;
  usuariosState.page = 1;
  renderUsuarios();
}

// ── EXPORTAR ────────────────────────────────────────
function exportarUsuariosExcel() {
  const data = usuariosState.usuarios.map(u => ({
    'Usuario': u.username,
    'Nombre': u.nombre,
    'Email': u.email || '—',
    'Rol': ROLES.find(r => r.id === u.rol)?.label || u.rol,
    'Módulos': (u.modulos || []).join(', '),
    'Estado': u.activo ? 'Activo' : 'Inactivo',
    'Último acceso': u.ultimoAcceso ? tsToHHMM(u.ultimoAcceso) : '—'
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Usuarios');
  XLSX.write(wb, { bookType: 'xlsx', type: 'binary', filename: 'usuarios.xlsx' });
}
