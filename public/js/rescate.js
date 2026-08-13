// Resuelve la URL que codifica el QR (/r/:id): el token sale del path,
// se consulta la vista de rescate y se registra el acceso tipo QR en el
// backend (lo hace el propio endpoint /api/participants/rescue).

(function () {
  const content = document.getElementById('content');
  const token = window.location.pathname.split('/').filter(Boolean).pop();

  PulsoApi.get(`/api/participants/rescue?token=${encodeURIComponent(token)}`)
    .then((data) => {
      content.innerHTML = renderRescueView(data);
    })
    .catch(() => {
      content.innerHTML =
        '<div class="alert alert-error">No se encontró ningún participante con este código QR.</div>';
    });
})();
