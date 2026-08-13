// Dashboard de ADMIN: metricas + tabla con busqueda por nombre/DNI/Codigo
// PULSO. Sin autenticacion todavia (vista de prueba del MVP).

(function () {
  const statsGrid = document.getElementById('stats-grid');
  const searchInput = document.getElementById('search-input');
  const tableBody = document.getElementById('table-body');
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
      tableBody.innerHTML = '<tr><td colspan="5">Sin resultados.</td></tr>';
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
        </tr>
      `)
      .join('');
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
    tableBody.innerHTML = '<tr><td colspan="5">Buscando…</td></tr>';
    try {
      const query = term ? `?search=${encodeURIComponent(term)}` : '';
      const rows = await PulsoApi.get(`/api/admin/participants${query}`);
      renderTable(rows);
    } catch (err) {
      tableBody.innerHTML = '<tr><td colspan="5">No se pudo cargar el listado.</td></tr>';
    }
  }

  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => loadTable(searchInput.value.trim()), 250);
  });

  loadStats();
  loadTable('');
})();
