# RotaManutenção 0.13.1 — Corrigir filtro Concluídas

## Problema relatado no Android 0.13
Ao abrir **OS → Concluídas**, com quatro OS cadastradas, o aplicativo mostrava
"Nenhuma atividade encontrada". Captura de tela fornecida pelo usuário.

### Causa confirmada no código
No arquivo `App.tsx`, o filtro `Concluídas` verificava apenas
`work_orders.status === 'completed'`. Para OS recorrentes, a operação de
conclusão registra uma linha na tabela `executions`, mas mantém a OS atual
como `pending` e calcula a próxima data. O histórico existe e era exibido
na aba Histórico, porém não entrava em Concluídas.

## Correção
- A aba **OS → Concluídas** agora exibe os registros de **execução concluída**
  (`executions.result = 'completed'`), inclusive das OS recorrentes.
- Uma OS executada duas vezes aparece como **duas execuções históricas**;
  não duplica a OS cadastrada nem transforma a próxima manutenção em concluída.
- Cada registro lista data/hora da execução, prazo que foi atendido, próxima data
  se recorrente, categoria, identificação de equipamento/TAG, observações,
  miniaturas de fotos e botão **Gerar PDF**.
- A busca aceita título, TAG, equipamento, categoria, notas e data de execução.
- Registros `partial` continuam sendo parciais e **não** aparecem como conclusão.
- O contador ao lado do filtro agora informa quantas execuções concluídas estão
  visíveis, em vez de repetir somente o número de OS cadastradas.
- Mensagem vazia específica explica que OS recorrentes voltam ao estado pendente
  após uma execução.
- O filtro usa os registros históricos já carregados (os **500 mais recentes**
  do histórico). Backup JSON guarda todo o histórico, não apenas os 500 exibidos.

## Preservação de dados e instalação
- Somente mudanças de **leitura/apresentação**, sem alterações no banco ou na
  função de execução. Backup **v7** e todas as fotos/rotas permanecem compatíveis.
- Mantém Android `br.com.rotamanutencao.qa` e a assinatura QA estável.
  Nova versão **0.13.1** (`versionCode=131`) atualiza a 0.13
  (`versionCode=130`) sobre a mesma instalação.
- Antes de instalar: em Dados, exporte o JSON de backup v7 para local privado
  fora do aplicativo. **Não desinstale a 0.13.**

## Teste de aceitação
1. Confirmar que o número de OS e as fotos/rotas não mudaram após a atualização.
2. Criar OS recorrente de teste e executá-la como **Concluída**.
3. Conferir que a OS aparece em **Pendentes** com nova data e a
   execução realizada aparece em **Concluídas**.
4. Abrir Concluídas, procurar por título ou TAG, confirmar data/hora, foto
   (se anexada) e PDF.
5. Executar uma mesma OS recorrente novamente: confirmar duas execuções em
   Concluídas, sem duplicar a OS cadastrada.
6. Registrar uma OS **Parcial**: não deve aparecer em Concluídas, mas
   permanecer com pendência/histórico.
7. Em OS avulsa, marcar Concluída: seu registro deve aparecer no mesmo filtro.
8. Testar offline e com o aplicativo reiniciado.

**Não declare o teste físico aprovado antes de receber confirmação do usuário.**
