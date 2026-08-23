// Paso 2 de "olvidé mi contraseña". Supabase manda el link del mail con el
// token en el hash de la URL (#access_token=...&type=recovery), no como
// query string: el hash nunca viaja al servidor, así que se lee acá y se
// manda al backend junto con la contraseña nueva. Si el link ya venció,
// Supabase pone #error=...&error_description=... en su lugar.

(function () {
  const form = document.getElementById('reset-form');
  const alertBox = document.getElementById('form-alert');
  const submitBtn = document.getElementById('submit-btn');

  function showError(message) {
    alertBox.innerHTML = `<div class="alert alert-error">${message}</div>`;
    form.style.display = 'none';
  }

  const hashParams = new URLSearchParams(window.location.hash.slice(1));
  const accessToken = hashParams.get('access_token');

  if (hashParams.get('error')) {
    showError(hashParams.get('error_description') || 'El enlace no es válido o ya venció. Pedí uno nuevo desde "Olvidé mi contraseña".');
    return;
  }
  if (!accessToken || hashParams.get('type') !== 'recovery') {
    showError('Este enlace no es válido. Pedí uno nuevo desde "Olvidé mi contraseña".');
    return;
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    alertBox.innerHTML = '';

    const password = new FormData(form).get('password');

    submitBtn.disabled = true;
    submitBtn.textContent = 'Guardando...';

    try {
      await PulsoApi.post('/api/auth/reset-password', { access_token: accessToken, password });
      alertBox.innerHTML = '<div class="alert alert-info">Contraseña actualizada. Redirigiendo al login...</div>';
      form.style.display = 'none';
      setTimeout(() => { window.location.href = '/login'; }, 1500);
    } catch (err) {
      alertBox.innerHTML = `<div class="alert alert-error">${err.message || 'No se pudo actualizar la contraseña.'}</div>`;
      submitBtn.disabled = false;
      submitBtn.textContent = 'Guardar contraseña';
    }
  });
})();
