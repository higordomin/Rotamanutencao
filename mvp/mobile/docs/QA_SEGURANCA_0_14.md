# RotaManutenção 0.14 — Segurança do histórico e diagnóstico local

## Mudança crítica: arquivamento reversível das ordens de serviço

Antes da 0.14, excluir uma OS removia por cascata as suas execuções,
os registros de impedimento e as fotos. Na 0.14, **Arquivar OS**
é a operação padrão de retirada do planejamento, sem apagar a OS do
banco, as execuções, as imagens ou os eventos de histórico.

- Ao arquivar, o usuário fornece **motivo obrigatório de 10 a 500 caracteres**.
- Na aba **OS → Arquivadas** aparecem data e motivo; o botão
  **Reativar OS** devolve a OS ao planejamento e às notificações.
- OS arquivada não entra na lista ativa, no painel de OS e nos lembretes,
  mas suas execuções anteriores permanecem em **Concluídas** e **Histórico**.
- A operação **não zera** os dados da OS: prazos e eventuais impedimentos
  existentes retornam quando o usuário a reativa.
- O caminho de execução, edição, bloqueio e liberação valida no SQLite
  se o registro foi arquivado, evitando alterar uma OS com formulário antigo.
- Removida a ação de exclusão permanente da tela de OS. A API legada
  `removeOrder` também passou a arquivar com motivo, não apagar.

## Banco de dados e backup

- Migração aditiva no SQLite `work_orders`:
  `archived_at TEXT`, `archive_reason TEXT NOT NULL DEFAULT ''`.
- Em aparelhos 0.13.1, todas as OS existentes começam **ativas**.
- Backup JSON passa a **v8** com motivo/data das arquivadas e importa
  versões **v2 a v8**. Cada arquivo inclui inclusive OS arquivadas e todas
  as suas execuções e fotos.
- Continuam disponíveis o backup JSON e a restauração transacional. A
  restauração **substitui todos os dados atuais**; faça backup antes.
- A aba Dados ganhou **Diagnóstico de integridade local**, que verifica
  SQLite `quick_check`, relações de chaves estrangeiras e a existência
  de até 2000 arquivos de fotos (não apaga nada).
- Se houver mais de 2000 fotografias, o relatório informa quantas **não**
  foram inspecionadas, sem declarar diagnóstico completo.
- **Backup compactado e criptografado ainda não fazem parte da 0.14**.
  Eles exigem outra implementação/teste e continuam no backlog.
- Os limites existentes do backup JSON e da listagem histórica permanecem;
  não declarar estes limites como resolvidos.

## Atualização sobre 0.13.1

1. **Exportar backup v7 pela 0.13.1** e guardar fora do app antes de atualizar.
2. Instalar APK 0.14 **por cima**, sem desinstalar. ID Android QA
   `br.com.rotamanutencao.qa`; `versionCode` de 131 para **140**.
3. Confirmar equipamentos, OS, histórico, fotos, rotas e horário dos avisos.
4. Criar OS fictícia, executar com foto, confirmar em **Concluídas**,
   depois arquivar com motivo.
5. Confirmar a OS fora de **Todas/Pendentes** e do painel, presente em
   **Arquivadas** com data/motivo e histórico preservado.
6. Reativar a OS. Confirmar que as fotos e histórico continuam intactos
   e que a OS retorna ao planejamento.
7. Abrir **Dados → Verificar dados do aparelho** e conferir se há
   referências inválidas ou fotos ausentes. Se houver problemas,
   não desinstalar nem limpar dados.
8. Exportar backup v8, verificar o arquivo e testar a restauração
   **somente num ambiente com dados fictícios/descartáveis**.
9. Confirmar que resumos diários e lembretes da 0.13.1 foram preservados.

## Critérios de liberação
- TypeScript, Expo bundle, testes de backup (v8 e importação v7),
  SQLite legado/rollback, Gradle e assinatura QA verificados.
- Teste do aparelho físico e restauração real continuam pendentes de
  confirmação humana. CI verde não garante entrega de notificações
  ou existência de fotos armazenadas no dispositivo.

O aplicativo permanece offline e individual, sem login ou nuvem.
