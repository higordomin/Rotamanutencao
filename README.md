# RotaManutenção

Aplicativo Android individual, **offline**, para manutenção industrial:
OS, rotas, inspeção, segurança, mecânica, elétrica e lubrificação.
Sem login, nuvem, supervisão ou sincronização.

## Código oficial e versão em teste

- **`main` — 0.34.0 consolidada**: versão funcional testada em Android pelo usuário
  e integrada no [PR #51](https://github.com/higordomin/Rotamanutencao/pull/51).
- **0.35.0 — padronização visual:** branch
  `feat/mvp035-padronizacao-visual-completa`, aguardando testes físicos.
- Histórico das versões e etapas anteriores preservado nas branches e no GitHub.

O `main` não é mais o esqueleto antigo: é a base consolidada em 0.34.
As melhorias 0.35 são desenvolvidas separadamente para proteger essa base.

## Organização

- Aplicativo: `mvp/mobile/` (Expo/React Native e SQLite).
- Tema Industrial Dark: `mvp/mobile/src/design31.ts`.
- Testes: `mvp/mobile/tests/`.
- QA 0.34: `mvp/mobile/docs/QA_PRIMEIRO_USO_0_34.md`.
- QA 0.35: `mvp/mobile/docs/QA_VISUAL_0_35.md`.
- CI: `.github/workflows/mobile-ci.yml`.
- Android QA: `.github/workflows/android-apk-preview.yml`.

## Segurança de atualizações

Os dados, fotos, OS, rotas e históricos ficam exclusivamente no aparelho.
**Antes de instalar um APK novo**, exporte e verifique um backup guardado fora
do aplicativo; instale **por cima** da versão QA instalada, sem desinstalar
nem limpar os dados. Os backups usam formato local JSON v11.

A assinatura e ID QA (`br.com.rotamanutencao.qa`) são preservados. O APK de
QA não é uma publicação Google Play, e não substitui liberação de serviço,
LOTO, APR ou outros procedimentos de segurança industrial.
