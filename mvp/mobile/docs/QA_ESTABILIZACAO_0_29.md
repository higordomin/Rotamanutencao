# QA — RotaManutenção 0.29.0 | Estabilização de confiança

## Regras de preservação e limites
- Base direta da branch 0.28. **Nenhuma tabela, migração SQLite ou mudança no formato de backup JSON v11.**
- Não elimina OS, fotos, histórico, rotas, lembretes configurados, equipamentos ou dados antigos.
- Android QA: `br.com.rotamanutencao.qa`, `version=0.29.0`, `versionCode=290`; continuidade das versões QA anteriores.
- `main` permanece na estrutura inicial; manter 0.24–0.28 e PRs anteriores até concluir QA nativa e definir promoção.
- O APK QA da 0.29 **não deve ser considerado produção** apenas pela CI.

## Correções efetivas
1. **Avisos locais em duas fases:** agenda completa dos novos avisos e *só depois* cancela os IDs antigos pertencentes ao aplicativo. Em caso de falha na criação, retira os novos avisos parciais e preserva os antigos.
2. **Revisão idempotente:** compara assinatura compacta da lista planejada com assinaturas dos avisos existentes, incluindo dia/hora, título e corpo. Agenda idêntica não é recriada a cada abertura do aplicativo. Versões anteriores sem assinatura são migradas na primeira revisão.
3. **Aviso explícito de possível duplicação:** falha ao cancelar aviso antigo **não apaga** os avisos novos; a revisão informa que alguns antigos podem permanecer.
4. **Trava síncrona de comandos:** toques rápidos concorrentes em OS/backup, edição de rota, fotos e registro por ponto são ignorados durante a operação corrente. A trava é liberada no sucesso e na falha.
5. **Inicialização robusta:** após erro de abertura/migração do SQLite, ativação do aplicativo não tenta ler automaticamente uma base que falhou. A opção de Tentar novamente permanece.

## Testes automáticos
- `actionGuard.test.mjs`: toque duplo, recuperação após erro, instâncias independentes.
- `reminderReconcile.test.mjs`: assinatura estável, mudança real detectada, agenda nova criada antes de cancelar a antiga, rollback após falha, aviso de duplicações, zero itens.
- Regressões v0.1–0.28, incluindo backup v11, rota com OS corretiva, QA PDF, agenda e foco do turno.
- `npm run check`, `npm test`, `python3 tests/sqlite_smoke.py`, `npx expo export --platform android --output-dir dist` e compilação APK nativa.

## Verificação obrigatória no Android (antes de promover)
1. **Backup antes de instalar:** Dados → Exportar backup. Salve fora do app e use Verificar arquivo. Não desinstale nem limpe dados do Android.
2. Atualize a QA 0.28 para 0.29 por cima. Reabra e confira TAGs, rotas, execuções, fotos, calendário 0.21 e lembretes.
3. Ative avisos, escolha horário, veja quantos agendados, feche e reabra o app diversas vezes, confira que o total permaneça estável e que o aviso teste chegue.
4. Altere o prazo de uma OS e confira que o agendamento seja revisado apenas após a alteração. Teste também OS impedida e anomalia da rota.
5. Em **base de teste descartável**, simule falha/negação de permissão ou erro de agendamento. Confirme que erros não removem avisos anteriores indevidamente (pode haver limites do sistema Android).
6. Em uma OS de teste, toque rapidamente duas vezes em Confirmar. Deve haver apenas um apontamento. Repita com execução rápida, anexos e botões de rota; nenhuma foto duplicada.
7. Verifique exportação PDF com e sem evidência; teste backup exportado/restaurado **apenas em base de teste**; confira a integridade SQLite antes e depois.
8. Teste com 100+ equipamentos e rota longa, aparelho com pouca memória, tela bloqueada, app offline, trocas de abas e retorno do segundo plano.
9. Verifique se os comandos não ficam permanentemente bloqueados após erro real de arquivo, DB ou compartilhamento.
10. Verifique e documente os resultados visuais antes de mesclar as branches 0.25–0.29 na linha principal.

**Aprovação em CI não comprova entrega real de notificações no Android, desempenho no aparelho ou integridade de backup exportado.**
