# RotaManutenção 0.21.2 — Agenda no estilo da prévia conceitual

## Origem
Pedido do usuário: a Agenda da 0.21 deve seguir a prévia conceitual apresentada no planejamento — tela escura, três indicadores, faixa de sete dias e atividades em linhas compactas. O Início simplificado da 0.21.1 deve continuar como está.

## Mudanças somente de interface
- Título curto **Minha agenda de manutenção**.
- Três indicadores alinhados: **Atrasadas**, **Para hoje**, **Programadas**. O terceiro indica serviços com próxima data futura no planejamento real.
- Calendário com **faixa semanal sempre visível**, dia selecionado destacado, pequenos pontos nos dias que têm atividade e setas para navegar por semanas.
- Alternância **Dia/Semana/Mês**: o modo Mês revela a grade mensal; tocar em qualquer dia abre diretamente as atividades daquele dia.
- **Atividades do dia** em cartões de uma linha principal, com marcador de cor, título, especialidade/rota, setor, estado e abertura pelo toque.
- Atalho discreto **Editar** para programação de cada OS continua disponível.
- Por padrão são mostrados cinco serviços; **Mostrar todas** permite ver a lista completa do período.
- Filtros por tipo/área/especialidade ficam em uma seção **Filtros** recolhida por padrão, mantendo os critérios anteriores e indicativo de filtros ativos.
- Pendências, atrasos e anomalias **fora do período** permanecem recuperáveis em seção específica, recolhida por padrão e com quantidade visível.
- Zero escrita automática: conclusão, bloqueio, edição e roteiros continuam abrindo os formulários e fluxos anteriores.

## Testes
1. `npm run check`, `npm test`, `npx expo export --platform android --output-dir dist` e `python3 tests/sqlite_smoke.py`.
2. `tests/agendaVisual.test.mjs`: limite de linhas, expansão, prioridade de alerta/atraso e ausência de mutação dos dados.
3. Testes 0.21 preexistentes preservados: dia/semana/mês, calendário civil, filtros, backlog, OS arquivadas/concluídas excluídas.
4. APK QA versão 0.21.2, versionCode 212, ID `br.com.rotamanutencao.qa`, assinatura do QA anterior verificada no GitHub Actions.
5. Nenhuma migração no SQLite; backup local JSON **v10** preservado.

## Roteiro de teste em aparelho Android
1. Exportar backup antes da atualização. Instalar 0.21.2 sobre 0.21.1, sem desinstalar.
2. Abrir Agenda e conferir visual do topo, três indicadores, barra semanal com dia atual e lista compacta.
3. Tocar em um dia com pontos e outro vazio. Conferir lista por data real.
4. Navegar semana anterior/próxima, selecionar Semana e Mês, navegar meses, inclusive virada de ano.
5. Abrir OS normal, OS bloqueada (mostra impedimento), botão Editar e rota. Validar que são os registros corretos.
6. Expandir Filtros e escolher tipo, área e especialidade; os indicadores e as bolinhas de agenda devem seguir os filtros.
7. Expandir Pendências fora do período; verificar OS vencida, parcial e rotas com anomalia mesmo com outro mês selecionado.
8. Verificar manutenção do Início 0.21.1, histórico, relatórios e backups; reiniciar o app para confirmar permanência dos dados.

A interface usa o conceito como referência, adaptado à largura e aos controles nativos do Android. Não há captura de tela física validada nesta mudança.
