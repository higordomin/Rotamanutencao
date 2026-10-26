import test from 'node:test';
import assert from 'node:assert/strict';
import resolveAppConfig from '../app.config.js';
import fs from 'node:fs';

const expo = JSON.parse(fs.readFileSync(new URL('../app.json', import.meta.url), 'utf8')).expo;
const base = {name: expo.name, android: {...expo.android}};
const previous = process.env.ROTA_PREVIEW;

test('produção mantém ID Android fixo e versionCode 310', () => {
  try {
    delete process.env.ROTA_PREVIEW;
    const result = resolveAppConfig({config: base});
    assert.equal(result.android.package, 'br.com.rotamanutencao.app');
    assert.equal(result.android.versionCode, 310);
  } finally {
    if (previous === undefined) delete process.env.ROTA_PREVIEW;
    else process.env.ROTA_PREVIEW = previous;
  }
});

test('QA 0.31.0 usa ID fixo, separado da produção e versões legadas', () => {
  try {
    process.env.ROTA_PREVIEW = '1';
    const result = resolveAppConfig({config: base});
    assert.equal(result.android.package, 'br.com.rotamanutencao.qa');
    assert.equal(result.name, 'RotaManutenção');
    assert.equal(result.android.versionCode, 310);
    assert.equal(base.android.package, 'br.com.rotamanutencao.app');
  } finally {
    if (previous === undefined) delete process.env.ROTA_PREVIEW;
    else process.env.ROTA_PREVIEW = previous;
  }
});

test('versões futuras preservam ID QA e incrementam somente versionCode', () => {
  try {
    process.env.ROTA_PREVIEW = '1';
    const next = {...base,android:{...base.android,versionCode:311}};
    const result = resolveAppConfig({config: next});
    assert.equal(result.android.package, 'br.com.rotamanutencao.qa');
    assert.equal(result.android.versionCode, 311);
  } finally {
    if (previous === undefined) delete process.env.ROTA_PREVIEW;
    else process.env.ROTA_PREVIEW = previous;
  }
});

test('configuração sem versionCode explícito falha para evitar updates errados', () => {
  assert.throws(() => resolveAppConfig({config:{...base,android:{package:'br.com.rotamanutencao.app'}}}), /versionCode/);
});


test('Android declara acesso especial a alarmes pontuais sem prometer concessão automática', () => {
  assert.ok(expo.android.permissions?.includes('android.permission.SCHEDULE_EXACT_ALARM'));
  assert.ok(expo.android.permissions?.includes('android.permission.POST_NOTIFICATIONS'));
});
