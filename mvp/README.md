# RotaManutenção — MVP 0.2 (branch de desenvolvimento)

Início do aplicativo Android **individual e offline**. Base para futuro SaaS de manutenção industrial. Os dados desta versão ficam apenas no dispositivo e não são enviados para um servidor.

## O que já está implementado no código

- Painel, equipamentos, atividades, periodicidade e histórico offline no SQLite.
- Registro de até 6 fotografias por execução (JPEG/PNG, 5 MB por foto).
- Relatório PDF técnico por execução com observações e imagens.
- Backup JSON local completo com fotos incorporadas, validação e restauração mediante confirmação.
- Migração da versão de banco usada no MVP 0.1 sem apagar registros.

## O que ainda falta

- APK compilado e validação em Android real (dependências npm não puderam ser instaladas neste ambiente).
- Rota multipontos, checklists, lembretes locais e QR Code.
- Compactação/criptografia de backup, exportação em streaming para bases grandes e cobertura automatizada no aparelho.
- Versão SaaS com painel web, contas, sincronização e cobrança (não implementada).

## Executar no computador

Requer Node.js >=22.13 e npm. Entre em `mobile/` e execute:

```bash
npm install
npx expo install --fix
npm run check
npx expo start
```

Depois abra com o Expo Go no aparelho compatível com a mesma versão do SDK. Para construir um **APK de teste**, utilize o [EAS Build](https://docs.expo.dev/build/introduction/) após configurar a conta Expo:

```bash
npm install --global eas-cli
eas login
eas build --platform android --profile preview
```

O perfil preview em `mobile/eas.json` solicita `android.buildType = apk`. Isso não publica automaticamente o app na Google Play.

## Estrutura

- `mobile/App.tsx`: telas, formulários, navegação local e ações.
- `mobile/src/db.ts`: banco SQLite, CRUD, periodicidade, registros e migração.
- `mobile/src/evidence.ts`: gerenciamento de fotos.
- `mobile/src/report.ts`: geração de PDF.
- `mobile/src/backup.ts`: exportação e restauração.
- `mobile/docs/QA.md`: checklist de testes pendentes no Android.
- `mobile/src/types.ts`: tipos do domínio.
- `docs/PRODUTO.md`: limites e roadmap da evolução comercial.
- `docs/SAAS_DATABASE.sql`: esboço de banco multiempresa com políticas de isolamento (fase seguinte).

## Política de dados

Não inclua registros confidenciais de empregadores nos testes sem autorização. A exclusão de uma atividade apaga também o histórico associado; faça backup antes de excluir. O backup JSON não é criptografado.

## Próximos marcos

1. Testar no Android e corrigir usabilidade e falhas.
2. Validar fotos, relatórios PDF e backup da versão 0.2 em aparelho real e corrigir falhas.
3. Adicionar rotas multipontos e notificações locais.
4. Validar demanda com profissionais e pequenas equipes.
5. Implementar contas empresariais, sincronização segura e painel web em projeto separado.
