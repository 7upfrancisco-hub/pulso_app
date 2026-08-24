// Dashboard de ADMIN: metricas + tabla con busqueda por nombre/DNI/Codigo
// PULSO, tablas de cuentas de Rescatista/Admin, alta de esas cuentas, y
// registro de accesos.

(function () {
  const statsGrid = document.getElementById('stats-grid');
  const searchInput = document.getElementById('search-input');
  const tableBody = document.getElementById('table-body');
  const rescatistaBody = document.getElementById('rescatista-table-body');
  const adminBody = document.getElementById('admin-table-body');
  const userForm = document.getElementById('user-form');
  const userFormAlert = document.getElementById('user-form-alert');
  const accessLogBody = document.getElementById('access-log-body');
  let searchTimer = null;

  const ACCESS_TYPE_LABELS = { QR: 'QR', DNI: 'DNI', CODIGO_PULSO: 'Código PULSO' };

  function escapeHtml(value) {
    const div = document.createElement('div');
    div.textContent = value == null ? '' : String(value);
    return div.innerHTML;
  }

  // Supabase/Postgres ya devuelve ISO 8601 con offset (ej:
  // "2026-08-20T22:00:19.49+00:00"), que Date() parsea directo. Antes esta
  // funcion asumia el formato viejo de SQLite ("YYYY-MM-DD HH:MM:SS") y
  // le pegaba una "Z" al final, lo que rompia el parseo silenciosamente
  // (Date invalido) y mostraba la fecha cruda sin formatear en la tabla.
  function formatDate(isoDatetime) {
    if (!isoDatetime) return '—';
    const date = new Date(isoDatetime);
    if (Number.isNaN(date.getTime())) return isoDatetime;
    return date.toLocaleString('es-AR');
  }

  // Menu "⋯" con Cambiar contraseña/Borrar, compartido por las tres tablas
  // de cuentas (participantes, rescatistas, admins). `extraHtml` permite
  // sumar botones propios de una tabla (ej: "Corregir nombre/grupo" solo
  // tiene sentido para participantes).
  function rowMenuHtml(dni, extraHtml = '') {
    return `
      <div class="row-menu">
        <button type="button" class="btn-icon" data-menu-toggle aria-haspopup="true" aria-expanded="false" aria-label="Más acciones">⋯</button>
        <div class="row-menu-dropdown" data-menu-dropdown hidden>
          ${extraHtml}
          <button type="button" data-reset-dni="${escapeHtml(dni)}">Cambiar contraseña</button>
          <button type="button" class="danger" data-delete-dni="${escapeHtml(dni)}">Borrar</button>
        </div>
      </div>
    `;
  }

  function closeAllMenus() {
    document.querySelectorAll('[data-menu-dropdown]').forEach((menu) => { menu.hidden = true; });
    document.querySelectorAll('[data-menu-toggle]').forEach((btn) => btn.setAttribute('aria-expanded', 'false'));
  }

  // Conecta el menu de acciones de una tabla: `onChange` se llama despues de
  // borrar o cambiar una contraseña, para que cada tabla se refresque a su
  // manera (la de participantes tambien actualiza las metricas). `onEdit`
  // es opcional: solo la tabla de participantes la usa (para "Corregir
  // nombre/grupo").
  function bindRowActions(tbody, onChange, onEdit) {
    tbody.addEventListener('click', async (event) => {
      const toggleBtn = event.target.closest('[data-menu-toggle]');
      if (toggleBtn) {
        const dropdown = toggleBtn.nextElementSibling;
        const wasOpen = !dropdown.hidden;
        closeAllMenus();
        if (!wasOpen) {
          dropdown.hidden = false;
          toggleBtn.setAttribute('aria-expanded', 'true');
        }
        return;
      }

      const editBtn = event.target.closest('[data-edit-id]');
      if (editBtn) {
        closeAllMenus();
        await onEdit(editBtn.dataset.editId);
        return;
      }

      const deleteBtn = event.target.closest('[data-delete-dni]');
      const resetBtn = event.target.closest('[data-reset-dni]');
      if (!deleteBtn && !resetBtn) return;

      closeAllMenus();

      if (deleteBtn) {
        const dni = deleteBtn.dataset.deleteDni;
        if (!confirm(`¿Borrar definitivamente la cuenta y la ficha del DNI ${dni}? Esta acción no se puede deshacer.`)) {
          return;
        }
        deleteBtn.disabled = true;
        try {
          await PulsoApi.delete(`/api/admin/accounts/${encodeURIComponent(dni)}`);
          await onChange();
        } catch (err) {
          alert(err.message || 'No se pudo borrar.');
          deleteBtn.disabled = false;
        }
        return;
      }

      const dni = resetBtn.dataset.resetDni;
      const password = prompt(`Nueva contraseña para el DNI ${dni} (mínimo 6 caracteres):`);
      if (!password) return;

      resetBtn.disabled = true;
      try {
        await PulsoApi.put(`/api/admin/accounts/${encodeURIComponent(dni)}/password`, { password });
        alert('Contraseña actualizada.');
      } catch (err) {
        alert(err.message || 'No se pudo cambiar la contraseña.');
      } finally {
        resetBtn.disabled = false;
      }
    });
  }

  // Cierra cualquier menú abierto al clickear afuera.
  document.addEventListener('click', (event) => {
    if (!event.target.closest('.row-menu')) closeAllMenus();
  });

  function renderStats(stats) {
    const tiles = [
      { label: 'Total de participantes', value: stats.total },
      { label: 'Registrados (últimos 7 días)', value: stats.recentlyRegistered },
      { label: 'Con alergias declaradas', value: stats.withAllergies },
      { label: 'Con medicación declarada', value: stats.withMedications },
      { label: 'Con enfermedades declaradas', value: stats.withMedicalConditions },
    ];

    statsGrid.innerHTML = tiles
      .map((tile) => `
        <div class="stat-tile">
          <div class="stat-value">${tile.value}</div>
          <div class="stat-label">${tile.label}</div>
        </div>
      `)
      .join('');
  }

  function renderTable(rows) {
    if (rows.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="6">Sin resultados.</td></tr>';
      return;
    }

    tableBody.innerHTML = rows
      .map((row) => `
        <tr>
          <td>${escapeHtml(row.full_name)}</td>
          <td>${escapeHtml(row.dni)}</td>
          <td>${escapeHtml(row.pulso_code)}</td>
          <td>${escapeHtml(row.blood_type)}</td>
          <td>${formatDate(row.updated_at)}</td>
          <td class="table-actions">${rowMenuHtml(row.dni, `<button type="button" data-edit-id="${escapeHtml(row.id)}">Corregir nombre/grupo</button>`)}</td>
        </tr>
      `)
      .join('');
  }

  const BLOOD_GROUPS = ['', 'O', 'A', 'B', 'AB'];
  const RH_FACTORS = ['', '+', '-'];

  // Nombre y grupo sanguineo/factor Rh quedaron afuera de la autoedicion
  // del participante (public/js/perfil.js) a proposito, porque son datos
  // que no deberian cambiar por accidente. Esta es la unica via para
  // corregir un error real en esos campos: una secuencia de prompts (igual
  // que "Cambiar contraseña"), no un formulario aparte, para no sumar un
  // componente de UI nuevo por una accion que un admin usa rara vez.
  async function handleEditParticipant(id) {
    let participant;
    try {
      participant = await PulsoApi.get(`/api/participants/${id}`);
    } catch (err) {
      alert(err.message || 'No se pudo cargar el participante.');
      return;
    }

    const firstName = prompt('Nombre:', participant.first_name || '');
    if (firstName === null) return;
    if (!firstName.trim()) return alert('El nombre no puede quedar vacío.');

    const lastName = prompt('Apellido:', participant.last_name || '');
    if (lastName === null) return;
    if (!lastName.trim()) return alert('El apellido no puede quedar vacío.');

    const bloodGroupInput = prompt('Grupo sanguíneo (O, A, B, AB, o vacío si no se sabe):', participant.blood_group || '');
    if (bloodGroupInput === null) return;
    const bloodGroup = bloodGroupInput.trim().toUpperCase();
    if (!BLOOD_GROUPS.includes(bloodGroup)) {
      return alert('Grupo sanguíneo inválido. Tiene que ser O, A, B, AB o vacío.');
    }

    const rhInput = prompt('Factor Rh (+, -, o vacío si no se sabe):', participant.rh_factor || '');
    if (rhInput === null) return;
    const rhFactor = rhInput.trim();
    if (!RH_FACTORS.includes(rhFactor)) {
      return alert('Factor Rh inválido. Tiene que ser +, - o vacío.');
    }

    try {
      await PulsoApi.put(`/api/participants/${id}`, {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        blood_group: bloodGroup,
        rh_factor: rhFactor,
      });
      await loadTable(searchInput.value.trim());
    } catch (err) {
      alert(err.message || 'No se pudieron guardar los cambios.');
    }
  }

  // Tabla de cuentas de Rescatista/Admin: no tienen ficha de participante,
  // asi que solo se muestra DNI/Email/Alta (no hay nombre en `profiles`).
  function renderAccountsTable(tbody, rows) {
    if (rows.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4">Sin cuentas todavía.</td></tr>';
      return;
    }

    tbody.innerHTML = rows
      .map((row) => `
        <tr>
          <td>${escapeHtml(row.dni)}</td>
          <td>${escapeHtml(row.email)}</td>
          <td>${formatDate(row.created_at)}</td>
          <td class="table-actions">${rowMenuHtml(row.dni)}</td>
        </tr>
      `)
      .join('');
  }

  function renderAccessLogs(rows) {
    if (rows.length === 0) {
      accessLogBody.innerHTML = '<tr><td colspan="5">Todavía no hay accesos registrados.</td></tr>';
      return;
    }

    accessLogBody.innerHTML = rows
      .map((row) => `
        <tr>
          <td>${escapeHtml(row.full_name)}</td>
          <td>${escapeHtml(row.dni)}</td>
          <td>${escapeHtml(row.pulso_code)}</td>
          <td>${escapeHtml(ACCESS_TYPE_LABELS[row.access_type] || row.access_type)}</td>
          <td>${formatDate(row.accessed_at)}</td>
        </tr>
      `)
      .join('');
  }

  async function loadAccessLogs() {
    try {
      const rows = await PulsoApi.get('/api/admin/access-logs');
      renderAccessLogs(rows);
    } catch (err) {
      accessLogBody.innerHTML = '<tr><td colspan="5">No se pudo cargar el registro de accesos.</td></tr>';
    }
  }

  async function loadStats() {
    try {
      const stats = await PulsoApi.get('/api/admin/stats');
      renderStats(stats);
    } catch (err) {
      statsGrid.innerHTML = '<div class="alert alert-error">No se pudieron cargar las métricas.</div>';
    }
  }

  async function loadTable(term) {
    tableBody.innerHTML = '<tr><td colspan="6">Buscando…</td></tr>';
    try {
      const query = term ? `?search=${encodeURIComponent(term)}` : '';
      const rows = await PulsoApi.get(`/api/admin/participants${query}`);
      renderTable(rows);
    } catch (err) {
      tableBody.innerHTML = '<tr><td colspan="6">No se pudo cargar el listado.</td></tr>';
    }
  }

  async function loadAccounts(role, tbody) {
    tbody.innerHTML = '<tr><td colspan="4">Cargando…</td></tr>';
    try {
      const rows = await PulsoApi.get(`/api/admin/accounts?role=${role}`);
      renderAccountsTable(tbody, rows);
    } catch (err) {
      tbody.innerHTML = '<tr><td colspan="4">No se pudo cargar el listado.</td></tr>';
    }
  }

  bindRowActions(tableBody, () => Promise.all([loadStats(), loadTable(searchInput.value.trim())]), handleEditParticipant);
  bindRowActions(rescatistaBody, () => loadAccounts('rescatista', rescatistaBody));
  bindRowActions(adminBody, () => loadAccounts('admin', adminBody));

  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => loadTable(searchInput.value.trim()), 250);
  });

  userForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    userFormAlert.innerHTML = '';

    const formData = new FormData(userForm);
    const payload = {
      dni: formData.get('dni').trim(),
      role: formData.get('role'),
      email: formData.get('email').trim(),
      password: formData.get('password'),
    };

    try {
      await PulsoApi.post('/api/admin/users', payload);
      userFormAlert.innerHTML = '<div class="alert alert-info">Cuenta creada.</div>';
      userForm.reset();
      await loadAccounts(payload.role, payload.role === 'admin' ? adminBody : rescatistaBody);
    } catch (err) {
      userFormAlert.innerHTML = `<div class="alert alert-error">${err.message || 'No se pudo crear la cuenta.'}</div>`;
    }
  });

  loadStats();
  loadTable('');
  loadAccounts('rescatista', rescatistaBody);
  loadAccounts('admin', adminBody);
  loadAccessLogs();
})();
