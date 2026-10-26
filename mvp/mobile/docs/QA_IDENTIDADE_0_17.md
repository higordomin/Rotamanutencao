# RotaManutenção 0.17 — vínculo histórico persistente por equipamento

## Objetivo
Histórico de OS ligado a um **ID estável do equipamento**, independentemente de alterações futuras de TAG, nome ou área, mantendo o app 100% offline, sem contas ou sincronização.

## Mudança de dados
- Coluna **`executions.asset_id TEXT NULL`** adicionada de modo aditivo na inicialização. Não há nenhuma remoção ou recriação de tabelas.
- **Sem FOREIGN KEY** nessa coluna: é um identificador histórico. Se o equipamento for excluído do cadastro, as execuções antigas retêm o ID, a identificação textual e suas fotos. A OS ativa segue o comportamento legado (`ON DELETE SET NULL`).
- Índice `idx_executions_asset_id` após a migração.
- Cada execução nova, completa ou parcial, registra o `asset_id` da OS na mesma transação do histórico e das fotos, após revalidar a OS contra alterações concorrentes.
- O texto `asset_label` permanece como retrato imutável da TAG/nome/área na data da execução.

## Migração de 0.16 para 0.17
- Detecta `asset_id` ausente via `PRAGMA table_info(executions)`.
- Adiciona a coluna preservando as linhas antigas.
- Associa execução legada ao ativo somente se seu retrato textual corresponder **exatamente a um único cadastro atual**. Duplicações, renomeações antigas e fotografias de OS sem equipamento permanecem com `asset_id=NULL`, sem invenção de vínculo.
- O backfill é transacional. O banco legado continua íntegro se o vínculo não puder ser recuperado.
- A tela de histórico por TAG prefere ID, e só recorre ao retrato literal quando o ID é nulo.

## Backup e restauração
- Exportação local JSON passa de **v8 para v9**, preservando o campo `executions.asset_id` inclusive em referências a ativos removidos.
- O validador v9 exige `asset_id` nulo ou ID não vazio em cada execução. Permite ativo histórico já removido — o vínculo é referencial e não é chave estrangeira.
- Importa backups **v2 a v8**: executa inferência conservadora do ID por retrato único, sem sobrescrever o texto antigo.
- Rotas, pontos, fotos, ordens arquivadas e eventos mantêm formato e regras existentes.

## Cenários de teste
1. Backup v9 com ID correto, TAG/nome alterados e ativo removido é válido.
2. V9 sem campo ID, com ID vazio ou numérico é rejeitado; v8 sem ID continua aceito.
3. Histórico com ID conhecido permanece na mesma TAG após renomear todos os seus campos.
4. ID existente prevalece sobre texto parecido que pertença a outro cadastro.
5. Dois cadastros com mesmo retrato não causam backfill histórico ambíguo.
6. SQLite smoke: atualização desde banco legado, preservação do ID, de fotos e integridade das chaves estrangeiras após editar ou excluir um ativo.
7. `npm run check`, `npm test`, Expo export Android, SQLite smoke e Gradle release QA.
8. Atualizar instalação QA 0.16 para 0.17 **por cima**, após exportar backup externo; abrir OS, histórico, fotos e rotas reais no aparelho.
9. Nunca testar restauração sobre dados únicos; usar aparelho ou ambiente descartável.
10. Confirmar Android QA `br.com.rotamanutencao.qa`, versão `0.17.0`, code 170 e certificado de teste fixo.

## Limites conhecidos
- Registros antigos com retrato que não corresponde unicamente ao equipamento **não podem ter identidade histórica garantida**; permanecem visíveis no histórico geral. Não preencher o ID baseado somente na OS atual.
- Vínculo estável por ID foi implementado nas **execuções de OS**; execuções dos checklists de rotas ainda preservam retrato textual, sem nova migração de identidade.
- A tela mantém a janela de até 500 execuções recentes; o backup exporta todo o histórico.
- Testes de CI não substituem teste físico e homologação de uso em produção.
