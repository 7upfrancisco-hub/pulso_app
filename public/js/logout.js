// Boton "Cerrar sesion" compartido por las pantallas protegidas
// (perfil, rescatista, admin). Requiere #logout-link en la pagina.

(function () {
  const link = document.getElementById('logout-link');
  if (!link) return;

  link.addEventListener('click', async (event) => {
    event.preventDefault();
    try {
      await PulsoApi.post('/api/auth/logout', {});
    } catch (err) {
      // aunque falle la llamada, igual mandamos al login
    }
    window.location.href = '/login';
  });
})();
