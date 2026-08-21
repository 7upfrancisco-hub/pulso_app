// Logica de la pagina de registro de participante: carga el texto vigente
// de la declaracion jurada, valida el aceptado obligatorio y crea el
// participante via la API. Al terminar, redirige a su perfil (nombre,
// Codigo PULSO, QR, estado).

(function () {
  const form = document.getElementById('registro-form');
  const alertBox = document.getElementById('form-alert');
  const declarationText = document.getElementById('declaration-text');
  const submitBtn = document.getElementById('submit-btn');
  let declarationVersion = null;

  function showAlert(message, type) {
    alertBox.innerHTML = `<div class="alert alert-${type}">${message}</div>`;
  }

  function clearAlert() {
    alertBox.innerHTML = '';
  }

  PulsoApi.get('/api/declaration')
    .then((declaration) => {
      declarationVersion = declaration.version;
      declarationText.textContent = declaration.text;
    })
    .catch(() => {
      declarationText.textContent =
        'No se pudo cargar el texto de la declaración jurada. Recargá la página.';
    });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearAlert();

    const formData = new FormData(form);
    const declarationAccepted = formData.get('declaration_accepted') === 'on';

    if (!declarationAccepted) {
      showAlert('Debés aceptar la declaración jurada para continuar.', 'error');
      return;
    }

    const payload = {
      first_name: formData.get('first_name').trim(),
      last_name: formData.get('last_name').trim(),
      dni: formData.get('dni').trim(),
      age: Number(formData.get('age')),
      blood_group: formData.get('blood_group'),
      rh_factor: formData.get('rh_factor'),
      allergies: formData.get('allergies').trim(),
      medical_conditions: formData.get('medical_conditions').trim(),
      medications: formData.get('medications').trim(),
      emergency_contact_name: formData.get('emergency_contact_name').trim(),
      emergency_contact_phone: formData.get('emergency_contact_phone').trim(),
      email: formData.get('email').trim(),
      password: formData.get('password'),
      declaration_accepted: true,
      declaration_version: declarationVersion,
    };

    submitBtn.disabled = true;
    submitBtn.textContent = 'Generando...';

    try {
      const { redirectTo } = await PulsoApi.post('/api/auth/register', payload);
      window.location.href = redirectTo;
    } catch (err) {
      if (err.status === 409) {
        showAlert(err.message || 'Ya existe una cuenta registrada con ese DNI.', 'error');
      } else if (err.status === 400) {
        showAlert(err.message || 'Revisá los datos obligatorios.', 'error');
      } else {
        showAlert('No se pudo completar el registro. Intentá de nuevo.', 'error');
      }
      submitBtn.disabled = false;
      submitBtn.textContent = 'Generar mi Identidad PULSO';
    }
  });
})();
