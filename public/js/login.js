// Login unico para los 3 roles: DNI + contraseña. El backend resuelve el
// rol y a donde redirigir (perfil / rescatista / admin).

(function () {
  const form = document.getElementById('login-form');
  const alertBox = document.getElementById('form-alert');
  const submitBtn = document.getElementById('submit-btn');

  function showAlert(message) {
    alertBox.innerHTML = `<div class="alert alert-error">${message}</div>`;
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    alertBox.innerHTML = '';

    const formData = new FormData(form);
    const payload = {
      dni: formData.get('dni').trim(),
      password: formData.get('password'),
    };

    submitBtn.disabled = true;
    submitBtn.textContent = 'Ingresando...';

    try {
      const { redirectTo } = await PulsoApi.post('/api/auth/login', payload);
      window.location.href = redirectTo;
    } catch (err) {
      showAlert(err.message || 'No se pudo iniciar sesión.');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Ingresar';
    }
  });
})();
