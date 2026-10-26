#!/usr/bin/env node
'use strict';
/** Gera ícones determinísticos em PNG a partir dos SVG versionados.
 * O Expo exige PNG para icon/adaptiveIcon. Executar após npm install.
 * Não utiliza rede, credenciais ou conteúdo de usuário.
 */
const fs = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');

const root = path.resolve(__dirname, '..');
const assetDir = path.join(root, 'assets');
const targets = [
  ['brand-icon.svg', 'icon.png'],
  ['brand-foreground.svg', 'adaptive-icon.png'],
];

async function main() {
  for (const [source, target] of targets) {
    const svg = fs.readFileSync(path.join(assetDir, source));
    const out = path.join(assetDir, target);
    const output = await sharp(svg, {density: 192})
      .resize(1024, 1024, {fit: 'contain'})
      .png({compressionLevel: 9, palette: false})
      .toBuffer();
    const details = await sharp(output).metadata();
    if (details.width !== 1024 || details.height !== 1024 || details.format !== 'png') {
      throw new Error('Ícone gerado em dimensão/formato inesperado: ' + target);
    }
    fs.writeFileSync(out, output);
    console.log('Marca RotaManutenção: ' + target + ' (' + output.length + ' bytes)');
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
