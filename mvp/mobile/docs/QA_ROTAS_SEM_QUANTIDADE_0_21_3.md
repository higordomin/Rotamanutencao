# RotaManutenção 0.21.3 — Rotas simplificadas, sem quantidade de lubrificante

## Solicitação
Melhorar a organização da Rota de Manutenção e retirar a **quantidade de lubrificante usado**. O nome do lubrificante é mantido por ser útil para identificar o produto, mas não é necessário informar gramas.

## Novidades
- Tela **Suas rotas** mais compacta, ordenada por pendências e prazo; toque na linha abre a rota.
- Formulário de **Nova rota** recolhido por padrão.
- Dentro de uma rota: **Adicionar ponto** recolhido; lista mostra 8 pontos inicialmente, com opção de expandir. O histórico de execuções fica recolhido por padrão.
- Se houver execução em andamento, botão **Continuar rota** em vez de tentar iniciar outra execução.
- Durante a execução, barra de progresso, filtros por pendentes/ocorrências e ação direta de **Registrar executado**.
- Ao cadastrar pontos, informar equipamento/TAG, atividade do ponto e opcionalmente o **nome do lubrificante**; sem peso/gramas.
- Ao registrar resultado, informar status, observações e fotos se necessário; **sem quantidade aplicada**. Anomalia ou ponto não executado continua exigindo justificativa.
- PDFs novos das rotas e consolidado, histórico por TAG e listas de ponto deixam de exibir a coluna de quantidade.
- A Agenda e o Início das versões 0.21.2 e 0.21.1 permanecem inalterados funcionalmente.

## Proteção de dados
- **Sem migração destrutiva**: a coluna antiga `quantity_grams` permanece no SQLite e no backup JSON v10, preservando valores históricos de execuções já registradas.
- Pontos novos são salvos com 0 no campo técnico legado, por compatibilidade; o app não interpreta esse 0 como medição física.
- Ao iniciar rota nova, os snapshots novos não copiam a antiga quantidade prevista.
- Ao registrar ponto que ainda estava pendente em uma execução iniciada antes da atualização, o campo técnico é zerado porque o app não coletou quantidade. **Valores dos pontos que já haviam sido executados não são alterados ao editar observações**.
- Não apagar banco, arquivos ou fotos; atualizar por cima da 0.21.2 com backup externo antes.

## QA automático
1. TypeScript `npm run check`, Node `npm test`, Expo Android export, smoke SQLite.
2. `tests/quickRouteActions.test.mjs`: atalho não grava quantidade nem assume medições de backups anteriores.
3. `tests/sqlite_smoke.py`: gravação atômica de ponto sem quantidade, sem alterar pontos não executados, sem duplicidade.
4. `tests/routesNoAmount.test.mjs`: UI, PDF de rota/consolidado e histórico não expõem quantidade; campo legado permanece.
5. `tests/consolidatedReport.test.mjs`: PDF consolidado omite quantidades antigas.
6. APK QA versão **0.21.3**, versionCode **213**, ID `br.com.rotamanutencao.qa`, mesma assinatura QA de 0.21.2.

## Testar no Android
1. Em 0.21.2, exportar um backup externo e verificar o arquivo.
2. Instalar 0.21.3 por cima, sem desinstalar nem limpar dados.
3. Abrir Rotas: conferir lista reduzida, criar rota, adicionar ponto sem gramas.
4. Em rota já existente, abrir a lista de pontos e conferir que quantidades antigas não aparecem.
5. Executar novo ponto, registrar como realizado, anomalia ou não executado. Confirmar que só ocorre após toque explícito e que anomalia/não executado pede justificativa.
6. Abrir o formulário detalhado, anexar foto e salvar, mantendo histórico.
7. Iniciar uma rota e voltar à listagem: ao reabrir, botão **Continuar rota** deve abrir a mesma execução.
8. Gerar PDF de rota concluída, relatório consolidado e histórico por equipamento, sem coluna gramas.
9. Conferir funcionamento da Agenda, Início, Atividades e backup v10 após atualização.

### Ressalvas
Não testado fisicamente num celular neste fluxo. A coluna técnica legada existe para compatibilidade do backup; **0 não significa quantidade aplicada**.
