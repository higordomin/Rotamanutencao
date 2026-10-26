# QA — RotaManutenção 0.28.0 | Foco do turno, agenda e lembretes

## Política de dados
- Base: `feat/mvp027-relatorios-pdf-profissionais`. Branches anteriores mantidas.
- App offline e individual, sem login, cloud ou gerenciamento/supervisão.
- Esquema SQLite e backup JSON **v11 não modificados**; nenhuma migração.
- Histórico, fotos, TAGs, rotas, ocorrências, alertas e OS permanecem.
- APK de teste `br.com.rotamanutencao.qa`, versão `0.28.0`, `versionCode=280`.

## Novidades
1. Agenda **mantém a visão visual 0.21** por dia, semana e mês. Botão opcional **Foco do turno** substitui temporariamente o calendário e a lista de pendências por fila única de trabalho, preservando a navegação original.
2. A fila destaca rotas com anomalia, atrasos, impedimentos, OS parciais, serviços de hoje e OS de prioridade Alta para os próximos 7 dias. Não inclui serviços regulares longínquos nem inventa data para rota avulsa normal. Mesmo item não aparece duas vezes por estar atrasado e bloqueado simultaneamente.
3. O foco apresenta contagens separadas de ocorrências, atrasos, impedimentos e vencimentos **que podem se sobrepor**. O número total de itens únicos aparece na fila. Os filtros por área, tipo e especialidade continuam aplicados à fila.
4. Histórico factual últimos 7 dias consulta diretamente a base SQLite (sem limite de 500 histórico de tela) para contar OS concluídas, execuções parciais e rotas finalizadas. **Não** calcula produtividade percentual, duração, horas trabalhadas ou desempenho de funcionário.
5. Em Dados/Lembretes, prévia recolhida e opt-in: próximos avisos calculados das OS/rotas e preferências atuais. **A prévia nunca agenda, remove nem reprograma notificações**. Avisos verdadeiramente agendados continuam contados à parte.
6. Planejador e prévia usam a mesma transformação de dados para não divergir. Nenhum agendamento extra silencioso.

## QA Android obrigatório
- Antes de atualizar por cima da QA 0.27: exportar backup, verificar arquivo e guardar fora do app. **Não desinstalar nem limpar armazenamento**.
- Testar agenda dia/semana/mês antes e depois de alternar Foco do turno. Retornar ao calendário mantém seleção, filtros e navegação. Abrir OS e rota direto da fila.
- Criar uma OS atrasada com impedimento, outra parcial, rota avulsa com anomalia e OS Alta em 3 dias. Conferir que cada ID está uma vez na fila; filtros funcionam; OS Alta normal após 8 dias não entra.
- Verificar 0, 8 e 100 itens; conferir botão Mostrar todas, estados de OS bloqueadas e voltar.
- Criar e concluir OS, reabrir Agenda e conferir contagem semanal; validar parcial não contada como concluída. Finalizar rota e verificar total do histórico semanal.
- Com notificações habilitadas, tocar Ver próximos avisos previstos, conferir data/hora; verificar que a quantidade de agendamentos Android **não muda** antes e depois.
- Com notificações desativadas, prévia é simulação, não concede permissões automaticamente.
- Testar aviso em 2 minutos, canais Android, economia de bateria, app em segundo plano, e verificar funcionamento offline.
- Regressão v0.25 equipamentos, v0.26 otimização, v0.27 PDFs com fotos, agenda 0.21, backup v11, OS corretivas v0.24.

## CI
`npm run check` + `npx expo export --platform android --output-dir dist` + `npm test` + `python3 tests/sqlite_smoke.py`. Compilação APK release QA separada.

O sucesso da CI e a compilação não substituem instalação, legibilidade e teste das notificações em Android real.
