# Android MVP 0.3

Veja README e documentação na pasta pai, `docs/PRODUTO.md` e `docs/QA_ACCEPTANCE.md`.

Fluxo offline: ativos -> atividades -> impedimento opcional -> liberação -> execução/fotos -> histórico/PDF -> backup. Sem contas, sem acesso à nuvem e sem aplicação empresarial neste MVP.

Executar: `npm install && npx expo install --check && npm run check && npm test && npx expo start`.
Para smoke SQLite: `python3 tests/sqlite_smoke.py`.

**Estado:** teste local de regras e migração passou, mas Android real e dependências não foram validados neste ambiente. Verifique permissões, PDF com imagens, recuperação de backup, teclado e performance antes de qualquer utilização em produção.
