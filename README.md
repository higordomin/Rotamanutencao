# RotaManutenção

Aplicativo Android individual, **offline**, para manutenção industrial:
OS, rotas, inspeção, segurança, mecânica, elétrica e lubrificação.
Sem login, nuvem, supervisão ou sincronização.

## Versão estável

- **`main` — 0.35.0 (Industrial Dark)**: padronização visual concluída,
  [PR #52](https://github.com/higordomin/Rotamanutencao/pull/52) integrado.
  Usuário confirmou funcionamento no Android após instalação do APK 0.35.
- **0.34.0 — versão estável anterior**, consolidada no
  [PR #51](https://github.com/higordomin/Rotamanutencao/pull/51).
- Branches e PRs antigos mantidos no GitHub para rastreabilidade e referência.

## Organização

- Aplicativo: `mvp/mobile/` (Expo/React Native e SQLite).
- Tema Industrial Dark: `mvp/mobile/src/design31.ts`.
- Testes: `mvp/mobile/tests/`.
- QA de regressão visual 0.35: `mvp/mobile/docs/QA_VISUAL_0_35.md`.
- CI: `.github/workflows/mobile-ci.yml`.
- Android QA: `.github/workflows/android-apk-preview.yml`.

## Validação da 0.35

- 233/233 testes automatizados aprovados.
- TypeScript, exportação Android e smoke do SQLite aprovados.
- APK QA `br.com.rotamanutencao.qa`, `versionCode=350`, compilado e assinado com êxito.
- Usuário reportou funcionamento normal no aparelho, confirmando aprovação para
  consolidar a 0.35. Isso não elimina a necessidade de testes em outros modelos Android.

## Segurança de atualizações

Dados, fotos, OS, rotas e históricos ficam exclusivamente no aparelho.
**Antes de instalar qualquer novo APK**, exporte e verifique um backup guardado
fora do aplicativo; instale **por cima** da versão QA instalada,
sem desinstalar nem limpar os dados. Os backups usam JSON v11.

O APK QA não é uma publicação Google Play e não substitui liberação de
serviço, LOTO, APR ou outros procedimentos de segurança industrial.
