// Hoja de credenciales imprimibles: Nombre + Código PULSO + QR de todos los
// participantes, en una grilla pensada para recortar. El QR ya viene
// generado del servidor (misma funcion que usa /perfil), asi que aca no se
// arma nada nuevo, solo se pinta.

(function () {
  const grid = document.getElementById('credentials-grid');
  const alertBox = document.getElementById('credentials-alert');
  const printBtn = document.getElementById('print-btn');

  function escapeHtml(value) {
    const div = document.createElement('div');
    div.textContent = value == null ? '' : String(value);
    return div.innerHTML;
  }

  function render(rows) {
    if (rows.length === 0) {
      grid.innerHTML = '<p class="muted center no-print">Todavía no hay participantes registrados.</p>';
      return;
    }

    grid.innerHTML = rows
      .map((row) => `
        <div class="credential-card">
          <img src="${row.qr}" alt="QR de ${escapeHtml(row.full_name)}">
          <div class="credential-name">${escapeHtml(row.full_name)}</div>
          <div class="credential-code">${escapeHtml(row.pulso_code)}</div>
        </div>
      `)
      .join('');
  }

  async function load() {
    try {
      const rows = await PulsoApi.get('/api/admin/credentials');
      render(rows);
    } catch (err) {
      alertBox.innerHTML = '<div class="alert alert-error">No se pudieron cargar las credenciales.</div>';
      grid.innerHTML = '';
    }
  }

  printBtn.addEventListener('click', () => window.print());

  load();
})();
