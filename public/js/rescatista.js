// Interfaz de busqueda para RESCATISTA: escaneo de QR por camara y busqueda
// manual por DNI o Codigo PULSO. Ambos caminos reusan renderRescueView
// (rescueView.js).
//
// El escaneo decodifica cada frame con jsQR (public/js/vendor/jsQR.js,
// libreria de terceros MIT vendorizada -- ver ese archivo). Antes usaba la
// Web API nativa BarcodeDetector, pero esa API no existe en WebKit (Safari
// y CUALQUIER navegador en iOS, porque todos corren sobre WebKit ahi por
// requisito de Apple, no solo Safari) -- por eso el escaneo nunca andaba
// desde un iPhone. jsQR decodifica a mano sobre un <canvas>, asi que solo
// depende de getUserMedia (camara), que si esta soportado en todos lados.
(function () {
  const searchForm = document.getElementById('search-form');
  const searchInput = document.getElementById('search-input');
  const resultBox = document.getElementById('result');
  const scanBtn = document.getElementById('scan-btn');
  const scanStopBtn = document.getElementById('scan-stop-btn');
  const scanArea = document.getElementById('scan-area');
  const video = document.getElementById('scan-video');
  const canvas = document.getElementById('scan-canvas');
  const canvasCtx = canvas.getContext('2d', { willReadFrequently: true });

  let stream = null;
  let scanning = false;

  function showError(message) {
    resultBox.innerHTML = `<div class="alert alert-error">${message}</div>`;
  }

  function showLoading() {
    resultBox.innerHTML = '<p class="muted center">Buscando…</p>';
  }

  async function searchByDniOrCode(rawValue) {
    const value = rawValue.trim();
    if (!value) {
      showError('Ingresá un DNI o Código PULSO.');
      return;
    }

    const isPulsoCode = /^pu-/i.test(value);
    const param = isPulsoCode
      ? `pulso_code=${encodeURIComponent(value)}`
      : `dni=${encodeURIComponent(value)}`;

    showLoading();
    try {
      const data = await PulsoApi.get(`/api/participants/rescue?${param}`);
      resultBox.innerHTML = renderRescueView(data);
    } catch (err) {
      showError('No se encontró ningún participante con ese dato.');
    }
  }

  searchForm.addEventListener('submit', (event) => {
    event.preventDefault();
    searchByDniOrCode(searchInput.value);
  });

  function stopScan() {
    scanning = false;
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      stream = null;
    }
    scanArea.hidden = true;
  }

  function handleScannedValue(rawValue) {
    // El QR de PULSO codifica una URL /r/:id. La resolucion (fetch + log
    // de acceso QR) la hace esa misma pagina.
    try {
      const url = new URL(rawValue, window.location.origin);
      if (/^\/r\/[^/]+$/.test(url.pathname)) {
        window.location.href = url.pathname;
        return;
      }
    } catch (err) {
      // no era una URL valida, cae al mensaje de error
    }
    showError('El QR escaneado no corresponde a un participante PULSO.');
  }

  function scanLoop() {
    if (!scanning) return;

    // HAVE_ENOUGH_DATA: recien ahi el video tiene un frame real para leer:
    // dibujarlo antes deja el canvas en blanco y jsQR nunca encuentra nada.
    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvasCtx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const frame = canvasCtx.getImageData(0, 0, canvas.width, canvas.height);
      const code = window.jsQR(frame.data, frame.width, frame.height, { inversionAttempts: 'dontInvert' });
      if (code && code.data) {
        stopScan();
        handleScannedValue(code.data);
        return;
      }
    }
    requestAnimationFrame(scanLoop);
  }

  scanBtn.addEventListener('click', async () => {
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      video.srcObject = stream;
      await video.play();
      scanArea.hidden = false;
      scanning = true;
      scanLoop();
    } catch (err) {
      showError('No se pudo acceder a la cámara del dispositivo. Revisá los permisos de cámara del navegador.');
    }
  });

  scanStopBtn.addEventListener('click', stopScan);
})();
