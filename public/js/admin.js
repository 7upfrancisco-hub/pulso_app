// Dashboard de ADMIN: metricas + tabla con busqueda por nombre/DNI/Codigo
// PULSO, y alta de cuentas de Rescatista/Admin.

(function () {
  const statsGrid = document.getElementById('stats-grid');
  const searchInput = document.getElementById('search-input');
  const tableBody = document.getElementById('table-body');
  const userForm = document.getElementById('user-form');
  const userFormAlert = document.getElementById('user-form-alert');
  let searchTimer = null;

  function escapeHtml(value) {
    const div = document.createElement('div');
    div.textContent = value == null ? '' : String(value);
    return div.innerHTML;
  }

  function formatDate(sqliteDatetime) {
    if (!sqliteDatetime) return '—';
    const date = new Date(`${sqliteDatetime.replace(' ', 'T')}Z`);
    if (Number.isNaN(date.getTime())) return sqliteDatetime;
    return date.toLocaleString('es-AR');
  }

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
          <td class="table-actions">
            <button type="button" class="btn btn-outline" data-reset-dni="${escapeHtml(row.dni)}">Cambiar contraseña</button>
            <button type="button" class="btn btn-danger" data-delete-dni="${escapeHtml(row.dni)}">Borrar</button>
          </td>
        </tr>
      `)
      .join('');
  }

  // Borra la cuenta completa (perfil + login) y la ficha asociadas a ese
  // DNI. Pensado para liberar DNIs de prueba que ya no pueden loguearse.
  tableBody.addEventListener('click', async (event) => {
    const deleteBtn = event.target.closest('[data-delete-dni]');
    const resetBtn = event.target.closest('[data-reset-dni]');
    if (!deleteBtn && !resetBtn) return;

    if (deleteBtn) {
      const dni = deleteBtn.dataset.deleteDni;
      if (!confirm(`¿Borrar definitivamente la cuenta y la ficha del DNI ${dni}? Esta acción no se puede deshacer.`)) {
        return;
      }
      deleteBtn.disabled = true;
      try {
        await PulsoApi.delete(`/api/admin/accounts/${encodeURIComponent(dni)}`);
        await Promise.all([loadStats(), loadTable(searchInput.value.trim())]);
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
    } catch (err) {
      userFormAlert.innerHTML = `<div class="alert alert-error">${err.message || 'No se pudo crear la cuenta.'}</div>`;
    }
  });

  loadStats();
  loadTable('');
})();
