# QA — RotaManutenção 0.18: histórico dos pontos de rotas por TAG

## Entregas
- A execução de cada ponto da rota preserva **`asset_id`** (identidade histórica, sem FK), além do retrato de TAG/nome/área, na mesma transação em que a rota é iniciada.
- Editar o cadastro ou excluir o ponto/rota não elimina o histórico ou as fotos anteriores.
- Aba **Ativos → Histórico** passa a mostrar **Pontos de rota deste equipamento** com rota, ponto, data, status (executado/anomalia/não executado/pendente), lubrificante, gramas, observação, quantidade de fotos e primeira imagem. Lista até 300 registros recentes, paginada 25 por vez.
- Um arquivo JSON local **v10** exporta e restaura o campo histórico dos itens, e continua aceitando arquivos v2–v9.

## Migração do SQLite
- Alteração aditiva: `ALTER TABLE route_run_items ADD COLUMN asset_id TEXT`, sem chave estrangeira, sem apagar registros existentes.
- Só se executa se a coluna ainda não existir. Cria índice `idx_route_run_items_asset`.
- Pontos anteriores à 0.18 são vinculados quando o retrato textual corresponder **exatamente a apenas um** equipamento cadastrado. Correspondências ambíguas permanecem `NULL`, consultáveis no histórico geral da rota. Não se usam correspondências aproximadas nem o cadastro atual do ponto removido.
- Fotos de rota permanecem referenciadas pelos respectivos itens, sem mudança de nomes ou conteúdo.

## Backup
- Validador v10 exige `route_run_items[*].asset_id`: `null` ou identificador não vazio até 100 caracteres. Permite IDs de equipamentos já excluídos.
- v5–v9 podem ter histórico sem `asset_id`; restauração usa a mesma inferência conservadora por retrato único no conjunto de equipamentos do próprio backup.
- Atualização do app 0.17 para 0.18 requer **exportar e guardar backup antes de instalar**.
- Um backup exportado na 0.18 (v10) **não é restaurável** no app 0.17. Não use desinstalação para atualizar.

## Testes automatizados e físicos
1. `npm run check`, `npm test`, `npx expo export --platform android --output-dir dist`, `python3 tests/sqlite_smoke.py`.
2. `PRAGMA quick_check` e `PRAGMA foreign_key_check` depois de migrar base antiga com ponto, rota e foto preservados.
3. Criar TAG, incluí-la em rota, executar um ponto e anexar foto. Ir em **Ativos → Histórico** e conferir ponto, ocorrência e foto.
4. Alterar TAG, nome e setor do ativo. O ponto e o histórico da OS devem continuar aparecendo por ID estável.
5. Remover ponto e rota, acessar o histórico do equipamento; os registros e fotos devem permanecer.
6. Marcar um ponto como anomalia e conferir motivo, status e foto no histórico da TAG.
7. Restaurar backup v9 em **ambiente descartável**, conferir que pontos antigos de retratos únicos recebem ID; retratos ambíguos ficam no histórico geral e nunca são atribuídos a TAG incorreta.
8. Restaurar backup v10 em ambiente descartável, comparar quantidades e imagens.
9. Validar `br.com.rotamanutencao.qa` com `versionCode=180` e certificado QA previsto pelo workflow.
10. Testar fisicamente no Android com atualização direta do APK anterior (sem desinstalação).

## Limites e próximo incremento
- A visão por TAG de pontos das rotas limita a consulta aos 300 itens recentes por equipamento; isso não restringe o backup, que mantém todos os dados válidos.
- Não existe integração ou sincronização com sistemas da empresa: app individual e offline.
- Próximo: relatórios integrados de OS e rotas por intervalo, com resumo para compartilhamento como PDF, e melhoria dos filtros da agenda.
