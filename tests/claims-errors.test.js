const { test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const storage = require('../lib/store');

test('claims preserve validation messages and hide private storage failures', async () => {
  const previousFactory = storage.createStore;
  const previousOrigin = process.env.SITE_URL;
  const previousLoadEnv = require('../lib/env').loadLocalEnv;
  let server;
  try {
    // Isolate the route from local credentials, files and external services.
    require('../lib/env').loadLocalEnv = () => {};
    storage.createStore = () => ({
      read: async (key, fallback) => structuredClone(fallback),
      update: async (key, fallback, change) => {
        if (key === 'claims') throw new Error('private_storage_host_and_path');
        return change(structuredClone(fallback));
      },
    });
    server = http.createServer(require('../server'));
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const origin = `http://127.0.0.1:${server.address().port}`;
    process.env.SITE_URL = origin;
    const submit = async body => {
      const response = await fetch(`${origin}/api/reclamaciones`, { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      return { status: response.status, data: await response.json() };
    };
    const invalid = await submit({});
    assert.equal(invalid.status, 400);
    assert.match(invalid.data.message, /Selecciona si es reclamo o queja/);
    const failed = await submit({ type: 'reclamo', consumer_name: 'Cliente', document_type: 'DNI', document_number: '12345678', email: 'test@example.test', phone: '999999999', product: 'Flores', detail: 'Detalle', request: 'Respuesta', accepted_privacy: true });
    assert.equal(failed.status, 500);
    assert.doesNotMatch(JSON.stringify(failed.data), /private_storage/);
    assert.match(failed.data.message, /No pudimos registrar/);
  } finally {
    storage.createStore = previousFactory;
    require('../lib/env').loadLocalEnv = previousLoadEnv;
    if (previousOrigin === undefined) delete process.env.SITE_URL;
    else process.env.SITE_URL = previousOrigin;
    if (server) await new Promise(resolve => server.close(resolve));
  }
});
