// Renderizado compartido de "lo que ve un RESCATISTA": lo usan tanto la
// resolucion por QR (/r/:id) como la busqueda manual en /rescatista, para
// no duplicar el HTML de esta pantalla en dos lugares.

function pulsoEscapeHtml(value) {
  const div = document.createElement('div');
  div.textContent = value === null || value === undefined ? '' : String(value);
  return div.innerHTML;
}

function pulsoValueOrEmpty(value, emptyLabel) {
  const text = (value || '').toString().trim();
  if (!text) return `<span class="rescue-value empty">${emptyLabel}</span>`;
  return `<span class="rescue-value">${pulsoEscapeHtml(text)}</span>`;
}

function pulsoFormatDate(sqliteDatetime) {
  if (!sqliteDatetime) return '—';
  // SQLite datetime('now') guarda "YYYY-MM-DD HH:MM:SS" en UTC.
  const iso = `${sqliteDatetime.replace(' ', 'T')}Z`;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return sqliteDatetime;
  return date.toLocaleString('es-AR');
}

function renderRescueView(data) {
  const bloodLabel = data.blood_group
    ? `${pulsoEscapeHtml(data.blood_group)}${pulsoEscapeHtml(data.rh_factor || '')}`
    : null;

  return `
    <div class="rescue-banner">PULSO — Información de salud declarada</div>
    <div class="card">
      <div class="rescue-name">${pulsoEscapeHtml(data.full_name)}</div>
      <div class="rescue-code muted">${pulsoEscapeHtml(data.pulso_code)}</div>

      <div class="rescue-field">
        <div class="rescue-label">Grupo sanguíneo</div>
        ${bloodLabel
          ? `<span class="rescue-blood">${bloodLabel}</span>`
          : '<span class="rescue-value empty">No declarado</span>'}
      </div>

      <div class="rescue-field">
        <div class="rescue-label">Alergias</div>
        ${pulsoValueOrEmpty(data.allergies, 'Sin alergias declaradas')}
      </div>

      <div class="rescue-field">
        <div class="rescue-label">Enfermedades / antecedentes declarados</div>
        ${pulsoValueOrEmpty(data.medical_conditions, 'Sin antecedentes declarados')}
      </div>

      <div class="rescue-field">
        <div class="rescue-label">Medicación declarada</div>
        ${pulsoValueOrEmpty(data.medications, 'Sin medicación declarada')}
      </div>

      <div class="rescue-field">
        <div class="rescue-label">Contacto de emergencia</div>
        <div class="rescue-value">${pulsoEscapeHtml(data.emergency_contact_name)}</div>
        <div class="rescue-value">${pulsoEscapeHtml(data.emergency_contact_phone)}</div>
      </div>
    </div>

    <p class="declared-note">
      Información declarada por el participante. Última actualización: ${pulsoFormatDate(data.updated_at)}.
    </p>
  `;
}
