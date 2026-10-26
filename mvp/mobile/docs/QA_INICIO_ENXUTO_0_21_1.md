# RotaManutenção 0.21.1 — QA Página Inicial Enxuta

## Contexto e decisão de UX
O usuário testou a versão 0.21 no Android, aprovou a Agenda e relatou a página inicial excessivamente poluída e com informações repetidas.
A antiga página inicial duplicava três KPIs no hero, outros três indicadores do painel operacional, até oito cartões grandes e até cinco blocos repetidos de listas com cartões completos (impedidas, parciais, atrasadas, hoje e próximas).

## Resultado
- Nova página **Início** minimalista: título curto, data local, **3 números exclusivos**, **até 3 cartões compactos** e **2 atalhos**.
- Indicadores não se sobrepõem: **Atenção** (atraso, impedimento, execução parcial ou anomalia em rota), **Hoje** (sem alerta), **Próx. 7 dias** (sem alerta); cada OS/rota está em exatamente uma categoria.
- A fila apresenta atenção primeiro, depois tarefas para hoje e próximos sete dias. Atividades de alta prioridade e vencimentos mais antigos ganham precedência dentro das categorias.
- Um cartão é uma única área clicável; para OS impedida abre o impedimento, para outra OS abre execução; para rota abre a rota existente. O link e botão **Abrir agenda** permitem ver todo o planejamento.
- Dois atalhos finais: **Abrir agenda** e **+ Nova OS**. Equipamentos/relatórios/rotas/históricos permanecem acessíveis nas abas existentes; nenhum dado foi removido.
- Removidos exclusivamente do **Início**: hero longo, segunda fileira redundante de KPIs, painel operacional expandido, cartões múltiplos e os cinco blocos com tarefas duplicadas.
- A aba **Agenda 0.21 permanece inalterada** (Dia/Semana/Mês, filtros, backlog e link de OS/rota).
- Sem alteração de SQLite, backup, agendamentos, OS, status, fotos ou PDF. Backup **v10** permanece.

## QA automático
- `npm run check`, `npm test`, `npx expo export --platform android --output-dir dist`, `python3 tests/sqlite_smoke.py`.
- Testes exclusivos do Início: contagem sem sobreposição de OS vencida e impedida, prioridade, rotas com anomalia, limitador de três cartões, OS arquivadas/concluídas não aparecem, futuro fora da semana não lota o início, dados originais não alterados.
- QA Android `0.21.1` `versionCode=211`, mesmo package `br.com.rotamanutencao.qa` e mesma assinatura QA 0.21.

## Verificação em aparelho
1. Fazer backup local v10 em 0.21 e preservar cópia fora do app.
2. Instalar 0.21.1 **por cima** do 0.21, sem desinstalar ou limpar dados.
3. Abrir a aba Início: somente três números, três linhas no máximo e dois atalhos; rolagem muito menor.
4. Conferir que OS atrasada e impedida é contabilizada **uma vez só** em Atenção; que OS de hoje sem alerta aparece em Hoje; que uma rota com anomalia fica em Atenção.
5. Tocar em um dos três cartões e verificar que o formulário correto da OS ou a rota selecionada abre.
6. Conferir os atalhos Abrir agenda e Nova OS.
7. Abrir a aba Agenda: visualizar dia/semana/mês, filtros, backlog; confirmar que não houve mudança.
8. Abrir abas Atividades, Rotas, Ativos, Dados e Histórico; verificar dados, fotos, geração de PDF e backup v10.
9. Reabrir o app, atualizar registros e conferir que os números são atualizados a partir dos dados reais.

## Limitação
O Início é um resumo operacional e exibe no máximo três ações. Para a lista integral de atividades e prazos use a Agenda.
