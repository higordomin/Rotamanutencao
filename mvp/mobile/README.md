# Android MVP 0.4 — Chão de fábrica

Versão individual, offline e sem login. Inclui registro de equipamentos e OS, impedimentos, execução com fotografias, relatório PDF e backup JSON local. **Não é a versão SaaS.**

## Execução e testes no computador

```bash
cd mobile
npm install --no-audit --no-fund
npx expo install --check
npm run check
npm test
python3 tests/sqlite_smoke.py
npx expo export --platform android --output-dir dist
```

## APK interno de testes

Após login com uma conta Expo, `eas build --platform android --profile preview` gera um build de teste do APK na infraestrutura EAS. Não temos um APK comprovadamente funcional até realizar o build e os testes físicos no Android. Veja `docs/QA_ACCEPTANCE.md` e `docs/CHANGELOG_0_4.md`.

## Cuidados

As fotos são locais; o backup JSON contém imagens sem criptografia. Nunca envie backups por canais públicos. Use dados sintéticos/autorizados. O aplicativo não substitui LOTO, ordens formais de liberação, análise de risco ou procedimentos de segurança industrial.
