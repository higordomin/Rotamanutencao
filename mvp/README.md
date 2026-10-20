# RotaManutenção — MVP 0.3

Aplicativo Android (Expo + SQLite) **local e individual**, voltado para lubrificação, mecânica, elétrica e inspeção de equipamentos. Sem login, nuvem ou supervisão.

## Recursos presentes no código

- Ativos com TAG/área e atividades por periodicidade.
- Listagem virtualizada com busca e filtros.
- Priorização de atrasadas, impedidas e para hoje.
- Impedimentos com motivo, liberação e histórico de eventos (auditoria local básica).
- Execuções, fotos, relatório PDF e exportação/recuperação por backup JSON (v3, compatível com v2).
- Banco SQLite persistente e migração sem descarte intencional de dados legados.

**Estado real:** código-fonte atualizado e 14 testes automatizados Node e testes de migração SQLite concluídos no ambiente local. **Ainda falta instalar as dependências Expo, compilar um APK e testar no Android físico.** Não anunciar como versão estável para produção.

## Rodar e verificar

```bash
cd mobile
npm install
npx expo install --check
npm run check
npm test
python3 tests/sqlite_smoke.py
npx expo start
```

Um APK de preview depende de autenticação e build remoto do Expo (EAS). Após cadastrar/entrar em uma conta Expo:

```bash
npm install -g eas-cli
eas login
eas build --platform android --profile preview
```

Veja `mobile/docs/QA_ACCEPTANCE.md` antes de instalar em uso real.

## Organização do repositório

- `mobile/App.tsx`: interface, listagem e fluxos do técnico.
- `mobile/src/db.ts`: SQL, OS, migração, logs e operações transacionais.
- `mobile/src/logic.ts`: regras puras de calendário e classificação.
- `mobile/src/backupValidation.ts`: validação de backups v2/v3.
- `mobile/src/evidence.ts`, `backup.ts`, `report.ts`: evidências, backup e relatório.
- `mobile/tests/`: testes automatizados locais.
- `docs/PRODUTO.md`: visão, lacunas e evolução comercial.

## Segurança e privacidade

As imagens e dados ficam no dispositivo, mas a cópia JSON com fotos **não é criptografada**. Faça exportação para local seguro antes de desinstalar ou restaurar. Use somente dados autorizados de suas próprias atividades ou dados sintéticos. O aplicativo não substitui procedimentos de segurança industrial.
