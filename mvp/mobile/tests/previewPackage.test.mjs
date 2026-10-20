import test from 'node:test';
import assert from 'node:assert/strict';
import resolveAppConfig from '../app.config.js';

const base = {
  name: 'RotaManutenção',
  android: {package: 'br.com.rotamanutencao.app'},
};

test('app normal preserva o identificador da instalação 0.4', () => {
  const previous = process.env.ROTA_PREVIEW;
  try {
    delete process.env.ROTA_PREVIEW;
    const resolved = resolveAppConfig({config: base});
    assert.equal(resolved.android.package, 'br.com.rotamanutencao.app');
  } finally {
    if (previous === undefined) delete process.env.ROTA_PREVIEW;
    else process.env.ROTA_PREVIEW = previous;
  }
});

test('app QA usa pacote Android isolado e nome próprio', () => {
  const previous = process.env.ROTA_PREVIEW;
  try {
    process.env.ROTA_PREVIEW = '1';
    const resolved = resolveAppConfig({config: base});
    assert.equal(resolved.android.package, 'br.com.rotamanutencao.preview05');
    assert.equal(resolved.name, 'RotaManutenção QA 0.5');
    assert.equal(base.android.package, 'br.com.rotamanutencao.app');
  } finally {
    if (previous === undefined) delete process.env.ROTA_PREVIEW;
    else process.env.ROTA_PREVIEW = previous;
  }
});
