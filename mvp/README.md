# RotaManutenção — MVP 0.1

Início do aplicativo Android **individual e offline**. Base para futuro SaaS de manutenção industrial. Os dados desta versão ficam apenas no dispositivo e não são enviados para um servidor.

## O que já está implementado

- Painel com atividades atrasadas, para hoje e futuras.
- Cadastro, edição e exclusão de equipamentos com TAG e área.
- Cadastro, edição e exclusão de atividades de lubrificação, mecânica, elétrica ou inspeção.
- Prioridade, descrição, equipamento vinculado, data programada e periodicidade em dias.
- Registro de execução com observações e reagendamento automático das atividades recorrentes.
- Histórico local das 500 execuções mais recentes (a base preserva todas).
- Persistência local em SQLite, sem login, conexão ou nuvem.

## O que **ainda não** está implementado

- Geração de PDF, anexos fotográficos, importação/exportação de backup, lembretes locais.
- Rota composta por múltiplos pontos ordenados, checklist de ponto de lubrificação e QR Code.
- Autenticação, sincronização entre aparelhos, dashboard web, planos pagos e cobrança.
- APK compilado e testes em aparelho Android. O código é um ponto de partida, não uma versão pronta para uso em produção.

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
- `mobile/src/db.ts`: banco SQLite, CRUD, controle de periodicidade e registros.
- `mobile/src/types.ts`: tipos do domínio.
- `docs/PRODUTO.md`: limites e roadmap da evolução comercial.
- `docs/SAAS_DATABASE.sql`: esboço de banco multiempresa com políticas de isolamento (fase seguinte).

## Política de dados

Não inclua registros confidenciais de empregadores nos testes sem autorização. A exclusão de uma atividade apaga também o histórico associado; faça backup antes de excluir quando exportação estiver disponível.

## Próximos marcos

1. Testar no Android e corrigir usabilidade e falhas.
2. Adicionar fotos, relatórios PDF, exportação/importação de backup.
3. Adicionar rotas multipontos e notificações locais.
4. Validar demanda com profissionais e pequenas equipes.
5. Implementar contas empresariais, sincronização segura e painel web em projeto separado.
