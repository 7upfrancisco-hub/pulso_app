// Hoja de credenciales imprimibles: Nombre + Código PULSO + QR de todos los
// participantes, en una grilla pensada para recortar. El QR ya viene
// generado del servidor (misma funcion que usa /perfil), asi que aca no se
// arma nada nuevo, solo se pinta.
//
// Arranca sin nada tildado: hay que elegir a mano quién se imprime. El
// buscador y "Seleccionar todo/Ninguno" operan sobre lo que está filtrado en
// pantalla, pero la selección en si se guarda por Código PULSO y sobrevive a
// cambios de búsqueda: lo que se imprime es lo tildado, sin importar qué
// esté filtrado en ese momento.

(function () {
  const grid = document.getElementById('credentials-grid');
  const alertBox = document.getElementById('credentials-alert');
  const printBtn = document.getElementById('print-btn');
  const searchInput = document.getElementById('search-input');
  const selectAllBtn = document.getElementById('select-all-btn');
  const selectNoneBtn = document.getElementById('select-none-btn');
  const selectedCountEl = document.getElementById('selected-count');

  let rows = [];
  const selected = new Set();

  function escapeHtml(value) {
    const div = document.createElement('div');
    div.textContent = value == null ? '' : String(value);
    return div.innerHTML;
  }

  function matchesSearch(row, query) {
    if (!query) return true;
    return `${row.full_name} ${row.pulso_code}`.toLowerCase().includes(query);
  }

  function visibleRows() {
    const query = searchInput.value.trim().toLowerCase();
    return rows.filter((row) => matchesSearch(row, query));
  }

  function updateCount() {
    selectedCountEl.textContent = String(selected.size);
  }

  function render() {
    if (rows.length === 0) {
      grid.innerHTML = '<p class="muted center no-print">Todavía no hay participantes registrados.</p>';
      updateCount();
      return;
    }

    const query = searchInput.value.trim().toLowerCase();

    grid.innerHTML = rows
      .map((row) => {
        const filterHidden = matchesSearch(row, query) ? '' : ' filter-hidden';
        const isSelected = selected.has(row.pulso_code);
        return `
          <div class="credential-card${filterHidden}${isSelected ? '' : ' unselected'}" data-code="${escapeHtml(row.pulso_code)}">
            <label class="credential-select no-print">
              <input type="checkbox" class="credential-checkbox"${isSelected ? ' checked' : ''}>
              Imprimir
            </label>
            <img src="${row.qr}" alt="QR de ${escapeHtml(row.full_name)}">
            <div class="credential-name">${escapeHtml(row.full_name)}</div>
            <div class="credential-code">${escapeHtml(row.pulso_code)}</div>
          </div>
        `;
      })
      .join('');

    updateCount();
  }

  grid.addEventListener('change', (event) => {
    if (!event.target.classList.contains('credential-checkbox')) return;
    const card = event.target.closest('.credential-card');
    const code = card.dataset.code;
    if (event.target.checked) selected.add(code);
    else selected.delete(code);
    card.classList.toggle('unselected', !event.target.checked);
    updateCount();
  });

  searchInput.addEventListener('input', render);

  selectAllBtn.addEventListener('click', () => {
    visibleRows().forEach((row) => selected.add(row.pulso_code));
    render();
  });

  selectNoneBtn.addEventListener('click', () => {
    visibleRows().forEach((row) => selected.delete(row.pulso_code));
    render();
  });

  async function load() {
    try {
      rows = await PulsoApi.get('/api/admin/credentials');
      render();
    } catch (err) {
      alertBox.innerHTML = '<div class="alert alert-error">No se pudieron cargar las credenciales.</div>';
      grid.innerHTML = '';
    }
  }

  printBtn.addEventListener('click', () => {
    if (selected.size === 0) {
      alertBox.innerHTML = '<div class="alert alert-error">Seleccioná al menos una credencial para imprimir.</div>';
      return;
    }
    alertBox.innerHTML = '';
    window.print();
  });

  load();
})();
