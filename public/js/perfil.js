// Vista propia del participante: Nombre, Codigo PULSO, QR y Estado del
// perfil. El id sale del path (/perfil/:id).

(function () {
  const content = document.getElementById('content');
  const id = window.location.pathname.split('/').filter(Boolean).pop();

  function escapeHtml(value) {
    const div = document.createElement('div');
    div.textContent = value == null ? '' : String(value);
    return div.innerHTML;
  }

  function render(participant, qr) {
    const statusLabel = participant.status === 'activo' ? 'Activo' : 'Incompleto';
    const statusClass = participant.status === 'activo' ? 'badge-active' : 'badge-inactive';

    content.innerHTML = `
      <h1>Mi Identidad PULSO</h1>

      <div class="card center">
        <span class="badge ${statusClass}">${statusLabel}</span>
        <h2 class="mt-16">${escapeHtml(participant.full_name)}</h2>
        <div class="pulso-code-display">${escapeHtml(participant.pulso_code)}</div>
        <p class="hint mb-0">Este Código PULSO también sirve para que te encuentren.</p>
      </div>

      <div class="qr-box">
        <img src="${qr.qr}" alt="QR de PULSO">
        <p class="hint">Mostrá este QR o tu Código PULSO ante personal de emergencia.</p>
      </div>

      <div class="alert alert-info mt-16">
        Perfil de salud declarado por vos. Podés actualizarlo cuando quieras; el QR no cambia.
      </div>
    `;
  }

  async function load() {
    if (!id) {
      content.innerHTML = '<div class="alert alert-error">Falta el identificador del perfil.</div>';
      return;
    }

    try {
      const [participant, qr] = await Promise.all([
        PulsoApi.get(`/api/participants/${id}`),
        PulsoApi.get(`/api/participants/${id}/qr`),
      ]);
      render(participant, qr);
    } catch (err) {
      content.innerHTML = '<div class="alert alert-error">No se encontró este perfil PULSO.</div>';
    }
  }

  load();
})();
