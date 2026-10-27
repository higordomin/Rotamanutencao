# QA 0.36 — Excluir OS com segurança

## Necessidade
Usuário pediu a possibilidade de excluir ordens de serviço (OS). A opção
`Excluir OS` está nas OS ativas e arquivadas, com confirmação destrutiva.

## Regras
- **Excluir** remove definitivamente uma OS cadastrada por engano que não tenha
  execução, foto, evento de impedimento/liberação, execução parcial,
  conclusão ou vínculo corretivo com uma anomalia de rota.
- A mesma regra vale para OS arquivadas sem histórico: podem ser excluídas.
- **Arquivar** continua sendo a solução para OS que tenham histórico. É
  reversível, remove a OS do planejamento e preserva fotos, execuções e vínculos.
- A inspeção da OS consulta o banco, não somente os últimos 500 históricos na tela.
- Após o alerta de confirmação, o SQL faz um único DELETE condicional com ID
  e `updated_at` esperados, verificando novamente os vínculos no mesmo comando.
  Se a OS mudou nesse intervalo, o DELETE é recusado.
- Nenhuma execução, foto ou anomalia existente é apagada.
- Após sucesso, todas as listas, agenda e lembretes são atualizados pelo fluxo
  de `refresh()` existente.
- Sem login, nuvem, migração de schema ou alteração do backup JSON v11.

## Testes automáticos
- Testes Node da política pura: histórico, execução, corretiva, eventos,
  bloqueio, parcial, concluída e UI com confirmação explícita.
- Smoke SQLite executa o **mesmo comando SQL de src/db.ts** para OS nova,
  OS arquivada sem histórico, edição concorrente, concluída, impedida,
  parcial, evento, execução/foto e OS corretiva vinculada.
- Verificar `PRAGMA foreign_key_check` no final.
- TypeScript, export Android e APK QA (versionCode 360).

## Teste no Android
1. Faça backup externo antes de instalar; instale 0.36 sobre 0.35
   **sem desinstalar nem limpar dados**.
2. Crie uma OS avulsa fictícia, não execute; toque em Excluir OS e depois
   Cancelar — ela permanece.
3. Toque novamente e confirme Excluir OS — ela desaparece da lista, agenda
   e lembretes após a atualização.
4. Crie uma OS fictícia, arquive sem executar e teste Excluir OS em Arquivadas.
5. Tente excluir uma OS com execução/foto e outra vinculada a anomalia de rota:
   o app explica a proteção e preserva o histórico.
6. Tente excluir uma OS com registro de impedimento, bloqueio ou execução
   parcial — o app orienta Arquivar.
7. Reabra o app, gere PDF, verifique histórico, backup, TAGs e integridade.
8. Teste sem internet; selecione uma TAG; verifique o Android com font size maior.

## Compatibilidade
Identificador `br.com.rotamanutencao.qa`, assinatura QA preservada e
versionCode **360**. APK QA 0.36 não atualiza o pacote de produção.
O 0.35 segue estável no `main` até o usuário aprovar o 0.36 no aparelho.
