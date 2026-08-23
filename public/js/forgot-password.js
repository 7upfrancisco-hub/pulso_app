// Paso 1 de "olvidé mi contraseña": pide el DNI y muestra siempre el mismo
// mensaje genérico (exista o no ese DNI), para no dejar adivinar qué DNIs
// están registrados.

(function () {
  const form = document.getElementById('forgot-form');
  const alertBox = document.getElementById('form-alert');
  const submitBtn = document.getElementById('submit-btn');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    alertBox.innerHTML = '';

    const dni = new FormData(form).get('dni').trim();

    submitBtn.disabled = true;
    submitBtn.textContent = 'Enviando...';

    try {
      const { message } = await PulsoApi.post('/api/auth/forgot-password', { dni });
      alertBox.innerHTML = `<div class="alert alert-info">${message}</div>`;
      form.reset();
    } catch (err) {
      alertBox.innerHTML = `<div class="alert alert-error">${err.message || 'No se pudo procesar el pedido.'}</div>`;
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Enviar enlace';
    }
  });
})();
