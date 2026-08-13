// Interfaz de busqueda para RESCATISTA: escaneo de QR por camara (Web API
// nativa BarcodeDetector, sin librerias externas) y busqueda manual por
// DNI o Codigo PULSO. Ambos caminos reusan renderRescueView (rescueView.js).

(function () {
  const searchForm = document.getElementById('search-form');
  const searchInput = document.getElementById('search-input');
  const resultBox = document.getElementById('result');
  const scanBtn = document.getElementById('scan-btn');
  const scanStopBtn = document.getElementById('scan-stop-btn');
  const scanArea = document.getElementById('scan-area');
  const video = document.getElementById('scan-video');

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

  async function scanLoop(detector) {
    if (!scanning) return;
    try {
      const barcodes = await detector.detect(video);
      if (barcodes.length > 0) {
        const rawValue = barcodes[0].rawValue || '';
        stopScan();
        handleScannedValue(rawValue);
        return;
      }
    } catch (err) {
      // frame no decodificable, seguir intentando
    }
    requestAnimationFrame(() => scanLoop(detector));
  }

  scanBtn.addEventListener('click', async () => {
    if (!('BarcodeDetector' in window)) {
      showError('Tu navegador no soporta el escaneo de QR desde la web. Usá la búsqueda manual.');
      return;
    }

    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      video.srcObject = stream;
      await video.play();
      scanArea.hidden = false;
      scanning = true;
      const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
      scanLoop(detector);
    } catch (err) {
      showError('No se pudo acceder a la cámara del dispositivo.');
    }
  });

  scanStopBtn.addEventListener('click', stopScan);
})();
