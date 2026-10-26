# RotaManutenção

Aplicativo Android individual e **offline** para rotas de manutenção, OS, inspeção,
segurança, elétrica, mecânica e lubrificação. Sem login, nuvem, supervisão ou sincronização.

## Versões de referência
- **0.28 — em validação:** `feat/mvp028-agenda-foco-turno-produtividade`
- **0.27 — CI aprovada:** `feat/mvp027-relatorios-pdf-profissionais`
- **0.26 — CI e compilação APK aprovadas:** `feat/mvp026-limpeza-segura-execucao-rapida`
- **0.25 — última base com CI aprovada:** `feat/mvp025-catalogo-seletor-equipamentos`
- **0.24 — referência anterior:** `feat/mvp024-anomalias-os-corretivas`

O `main` ainda contém a estrutura inicial do repositório: não instalar APKs gerados
a partir do `main` antigo esperando encontrar todas as funcionalidades modernas.

## Organização
- Código: `mvp/mobile/` (React Native + Expo + SQLite).
- Testes: `mvp/mobile/tests/`.
- QA da 0.28: `mvp/mobile/docs/QA_FOCO_TURNO_0_28.md`.
- CI ativa: `mobile-ci.yml` e `android-apk-preview.yml`.
- A 0.28 mantém o esquema de backup JSON **v11**, todos os registros locais, PDFs offline, calendário original e lembretes locais.

Antes de atualizar, exporte e confira um backup salvo **fora** do aplicativo.
Não desinstale nem limpe o armazenamento Android: dados do usuário são locais.
