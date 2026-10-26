import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {INDUSTRIAL} from '../src/design31.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const config = JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8')).expo;

function checkPng(name) {
  const file = path.join(root, 'assets', name);
  const data = fs.readFileSync(file);
  assert.ok(data.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])), 'Cabeçalho PNG');
  assert.equal(data.readUInt32BE(16), 1024);
  assert.equal(data.readUInt32BE(20), 1024);
  assert.ok(data.length > 10000, 'Imagem inesperadamente pequena');
}

test('launcher icon com tamanho correto é gerado pelo postinstall', () => checkPng('icon.png'));
test('adaptive foreground para Android é PNG 1024x1024', () => checkPng('adaptive-icon.png'));
test('configuração Expo aponta para ícone e Android adaptive icon', () => {
  assert.equal(config.icon, './assets/icon.png');
  assert.equal(config.android.adaptiveIcon.foregroundImage, './assets/adaptive-icon.png');
  assert.equal(config.android.adaptiveIcon.backgroundColor, INDUSTRIAL.background);
});
