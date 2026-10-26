# RotaManutenção

Aplicativo Android individual e **offline** para rotas de manutenção, OS, inspeção,
segurança, elétrica, mecânica e lubrificação. Sem login, nuvem, supervisão ou sincronização.

## Versões de referência
- **0.33 — em validação:** `feat/mvp033-equipamentos-historico-dados`
- **0.32 — CI aprovada:** `feat/mvp032-execucao-guiada-rotas-os`
- **0.31 — CI aprovada:** `feat/mvp031-design-industrial-navegacao`
- **0.30 — CI/APK aprovados:** `feat/mvp030-avisos-pontuais-personalizados`
- **0.29 — CI aprovada:** `feat/mvp029-estabilizacao-confiabilidade`
- **0.28 — CI aprovada:** `feat/mvp028-agenda-foco-turno-produtividade`
- **0.27 — CI aprovada:** `feat/mvp027-relatorios-pdf-profissionais`
- **0.26 — CI e compilação APK aprovadas:** `feat/mvp026-limpeza-segura-execucao-rapida`
- **0.25 — última base com CI aprovada:** `feat/mvp025-catalogo-seletor-equipamentos`
- **0.24 — referência anterior:** `feat/mvp024-anomalias-os-corretivas`

O `main` ainda contém a estrutura inicial do repositório: não instalar APKs gerados
a partir do `main` antigo esperando encontrar todas as funcionalidades modernas.

## Organização
- Código: `mvp/mobile/` (React Native + Expo + SQLite).
- Testes: `mvp/mobile/tests/`.
- QA da 0.33: `mvp/mobile/docs/QA_EQUIPAMENTOS_DADOS_0_33.md`.
- CI ativa: `mobile-ci.yml` e `android-apk-preview.yml`.
- A 0.33 mantém o backup JSON **v11**; organiza a seleção de TAG, o histórico e as abas de Relatórios/Lembretes/Backup para facilitar o uso, sem mexer nos registros.

Antes de atualizar, exporte e confira um backup salvo **fora** do aplicativo.
Não desinstale nem limpe o armazenamento Android: dados do usuário são locais.
