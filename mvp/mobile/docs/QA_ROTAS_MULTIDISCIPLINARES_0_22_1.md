# QA 0.22.1 — Rotas multidisciplinares sem lubrificante

## Requisito
O usuário confirmou que a 0.22 funciona e pediu retirar **por completo** o campo “Lubrificante utilizado” porque a rota também serve à manutenção mecânica, elétrica, segurança e inspeção.

## O que mudou
- Nenhum campo de lubrificante em **Adicionar ponto à rota**, **Registrar com detalhes**, listagem de pontos, execução, PDF de rota, relatório consolidado e histórico de equipamento/TAG.
- Exemplos de atividade e nome de rota genéricos (inspeção de motor, verificação de proteção e sensores).
- Cadastro do ponto exige TAG/equipamento e descrição da atividade; não há requisito de material, produto ou gramas.
- Registro rápido confirma somente a execução, mantendo filtros de pendentes/ocorrências, fotos e justificativa para anomalia e não execução.
- PDFs novos contêm ponto/equipamento, resultado, observações e fotos; sem coluna específica de produto.
- O banco guarda **as colunas legadas** `lubricant` e `quantity_grams` para restaurar backups v10 e reter dados antigos, **sem exibi-las** nas rotas nem nos novos PDFs.
- Novos pontos e novas execuções armazenam valor técnico vazio para lubrificante, sem copiar produtos de cadastros antigos. Edição de resultados históricos não apaga o valor anteriormente registrado.
- Não houve migração destrutiva ou modificação no calendário, Início, programação, periodicidade nem lógica de anomalias.

## Testes automáticos
1. `npm run check`, `npm test`, `npx expo export --platform android --output-dir dist`, `python3 tests/sqlite_smoke.py`.
2. `tests/routesNoAmount.test.mjs`: sem menções a produto nas telas, PDFs e história, mas schema/backup compatíveis.
3. `tests/quickRouteActions.test.mjs`: execução de ponto pendente independe de qualquer produto legado.
4. `tests/consolidatedReport.test.mjs`: PDF consolida OS e rotas sem imprimir material antigo, mantendo observações e evidências.
5. APK QA **0.22.1**, `versionCode=221`, ID `br.com.rotamanutencao.qa`, assinatura QA persistente para instalar por cima da 0.22.

## Validar no Android
1. Exportar o backup local na 0.22 e copiar para fora do aparelho.
2. Instalar 0.22.1 por cima da versão anterior, **sem desinstalar**.
3. Criar uma rota de inspeção de segurança e uma de manutenção elétrica, cadastrar pontos sem nenhum produto.
4. Executar ponto por registro rápido; depois criar uma ocorrência e usar fotos/observações no registro detalhado.
5. Abrir uma rota antiga de lubrificação: nomes dos materiais históricos não devem aparecer nem ser apagados do backup.
6. Gerar PDF de rota finalizada, relatório consolidado e histórico de TAG, sem coluna Lubrificante.
7. Confirmar Agenda, Início, periodicidade, fotos, dados e geração de backup v10.
8. Reiniciar app para verificar persistência. Teste físico de navegação e aparência depende do usuário.

## Observação
A ausência da quantidade e do produto **não comprova execução da manutenção**. O registro precisa de toque explícito depois do serviço físico.
