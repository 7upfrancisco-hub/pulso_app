// Helper minimo de fetch compartido por todas las paginas de PULSO.
// JS puro, sin dependencias externas.

const PulsoApi = {
  async request(path, options = {}) {
    const res = await fetch(path, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });

    let body = null;
    try {
      body = await res.json();
    } catch (err) {
      body = null;
    }

    if (!res.ok) {
      const error = new Error((body && body.error) || `Error ${res.status}`);
      error.status = res.status;
      error.body = body;
      throw error;
    }

    return body;
  },

  get(path) {
    return this.request(path);
  },

  post(path, data) {
    return this.request(path, { method: 'POST', body: JSON.stringify(data) });
  },
};
