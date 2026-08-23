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

      <button type="button" class="btn btn-primary mt-16" id="edit-btn">Editar mi perfil</button>
    `;

    document.getElementById('edit-btn').addEventListener('click', () => renderEdit(participant));
  }

  // Formulario de edicion: NO incluye nombre, DNI ni grupo sanguineo/factor
  // Rh a proposito -- son datos que no cambian (o que si cambian, requieren
  // mas cuidado que un campo de texto libre), a diferencia de alergias,
  // medicacion o el contacto de emergencia, que si se actualizan con el
  // tiempo. Para corregir esos datos fijos hay que contactar a un admin.
  function renderEdit(participant) {
    const bloodType = participant.blood_type || 'no declarado';

    content.innerHTML = `
      <h1>Editar mi perfil</h1>

      <div class="card">
        <div class="rescue-field">
          <div class="rescue-label">Nombre</div>
          <div class="rescue-value">${escapeHtml(participant.full_name)}</div>
        </div>
        <div class="rescue-field">
          <div class="rescue-label">DNI</div>
          <div class="rescue-value">${escapeHtml(participant.dni)}</div>
        </div>
        <div class="rescue-field">
          <div class="rescue-label">Grupo sanguíneo y factor</div>
          <div class="rescue-value">${escapeHtml(bloodType)}</div>
        </div>
      </div>
      <p class="hint">Si hay un error, contactá a un admin.</p>

      <div id="edit-alert"></div>

      <form id="edit-form" class="card" novalidate>
        <fieldset>
          <legend>Datos personales</legend>
          <div class="field">
            <label for="age">Edad *</label>
            <input type="number" id="age" name="age" required min="0" max="120">
          </div>
        </fieldset>

        <fieldset>
          <legend>Perfil de salud (declarado por vos)</legend>
          <div class="field">
            <label for="allergies">Alergias</label>
            <textarea id="allergies" name="allergies" placeholder="Ej: Penicilina. Dejar en blanco si no tenés."></textarea>
          </div>
          <div class="field">
            <label for="medical_conditions">Enfermedades o antecedentes relevantes</label>
            <textarea id="medical_conditions" name="medical_conditions" placeholder="Ej: Asma, epilepsia, diabetes..."></textarea>
          </div>
          <div class="field">
            <label for="medications">Medicación</label>
            <textarea id="medications" name="medications" placeholder="Ej: Salbutamol (rescate)"></textarea>
          </div>
        </fieldset>

        <fieldset>
          <legend>Contacto de emergencia</legend>
          <div class="field">
            <label for="emergency_contact_name">Nombre del contacto *</label>
            <input type="text" id="emergency_contact_name" name="emergency_contact_name" required>
          </div>
          <div class="field">
            <label for="emergency_contact_phone">Teléfono del contacto *</label>
            <input type="tel" id="emergency_contact_phone" name="emergency_contact_phone" required placeholder="Ej: +54 9 11 1234-5678">
          </div>
        </fieldset>

        <button type="submit" class="btn btn-primary" id="save-btn">Guardar cambios</button>
        <button type="button" class="btn btn-outline mt-16" id="cancel-edit-btn">Cancelar</button>
      </form>
    `;

    const form = document.getElementById('edit-form');
    // Se asignan por .value (no interpolando en el HTML) para no tener que
    // escapar comillas dentro de texto libre como alergias/antecedentes.
    form.elements.age.value = participant.age ?? '';
    form.elements.allergies.value = participant.allergies || '';
    form.elements.medical_conditions.value = participant.medical_conditions || '';
    form.elements.medications.value = participant.medications || '';
    form.elements.emergency_contact_name.value = participant.emergency_contact_name || '';
    form.elements.emergency_contact_phone.value = participant.emergency_contact_phone || '';

    const editAlert = document.getElementById('edit-alert');
    const saveBtn = document.getElementById('save-btn');

    document.getElementById('cancel-edit-btn').addEventListener('click', load);

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      editAlert.innerHTML = '';

      const formData = new FormData(form);
      const payload = {
        age: Number(formData.get('age')),
        allergies: formData.get('allergies').trim(),
        medical_conditions: formData.get('medical_conditions').trim(),
        medications: formData.get('medications').trim(),
        emergency_contact_name: formData.get('emergency_contact_name').trim(),
        emergency_contact_phone: formData.get('emergency_contact_phone').trim(),
      };

      saveBtn.disabled = true;
      saveBtn.textContent = 'Guardando...';

      try {
        await PulsoApi.put(`/api/participants/${id}`, payload);
        await load();
      } catch (err) {
        editAlert.innerHTML = `<div class="alert alert-error">${err.message || 'No se pudieron guardar los cambios.'}</div>`;
        saveBtn.disabled = false;
        saveBtn.textContent = 'Guardar cambios';
      }
    });
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
