# QA — RotaManutenção 0.24.0 | Ocorrências e OS corretivas

## Objetivo
Registrar anomalias encontradas durante rotas de inspeção, elétrica, mecânica, segurança ou lubrificação e, se o técnico decidir, criar uma **OS corretiva avulsa vinculada à ocorrência**.

## Como funciona
- Em uma rota, abra o ponto e escolha **Anomalia**; descreva o problema (mínimo 10 caracteres) e adicione fotos se necessário. Salve o registro.
- A ocorrência aparece no histórico do ponto e no botão recolhível **Ocorrências registradas**, na lista de Rotas (últimas 100; até 20 exibidas por vez).
- Um ponto já salvo como anomalia mostra **+ Gerar OS corretiva**; escolher especialidade (Mecânica, Elétrica, Segurança, Inspeção, Lubrificação), prioridade e confirmar a criação.
- A OS nasce como **avulsa**, programada para hoje, vinculada pelo ID do equipamento/TAG e com título, anotação da anomalia, rota e retrato do equipamento.
- Cada ocorrência pode ter **uma única OS corretiva**. O banco usa transação e chaves únicas para impedir duplicação inclusive por toque duplo.
- Um ponto com OS vinculada mostra **Em aberto, Impedida, Parcial, Concluída ou Arquivada** e dá acesso à aba Atividades para acompanhamento.
- Concluir uma OS **não zera automaticamente** o aviso de anomalia da rota: a condição deve ser verificada em campo. A edição do resultado da anomalia depois de vinculada não pode apagá-la silenciosamente.
- A seção Ocorrências é recolhida por padrão, preservando o design compacto que o usuário aprovou.
- Uma ocorrência de ponto com equipamento removido não gera OS até restabelecer o vínculo por TAG, evitando associar a OS ao ativo errado.

## Banco local e backup
- Criada a tabela `route_corrective_links` com `item_id` único e `order_id` único, chaves estrangeiras para os registros existentes.
- **Backup JSON v11** inclui a nova coleção `route_corrective_links`; valida IDs, datas, referência a OS e item com status Anomalia antes da restauração.
- **Backups v2 até v10** permanecem aceitos, sem coleção de vínculos; restaurar v10 não inventa corretivas.
- Restauração v11 apaga primeiro os links antigos e os reinsere **após** OS e pontos, dentro de transação; fotos antigas não são apagadas antes do sucesso da transação.
- SQL inicial usa `CREATE TABLE IF NOT EXISTS`, sem apagar tabelas ou migrar colunas legadas destrutivamente.
- Dados continuam individuais e offline; sem login, nuvem, supervisão, ou sincronização.

## Testes automáticos
1. `npm run check`, `npm test`, `python3 tests/sqlite_smoke.py`, `npx expo export --platform android --output-dir dist`.
2. Testes Node `correctiveOrders.test.mjs` para confirmação, vínculos, SQL e backup.
3. Testes de backup: v11 válido; sem links, repetição de vínculo, OS inexistente ou item não-anômalo inválidos; v10 antigo ainda importável.
4. Smoke SQLite: vínculo único, FK e integridade, OS muda para concluída sem alterar a anomalia, restauração/remoção de links sem perder OS.
5. APK QA **0.24.0**, `versionCode=240`, ID `br.com.rotamanutencao.qa`, assinatura de teste persistente.

## Verificação no Android
1. Exportar um backup externo na 0.23, verificar seu arquivo e instalar 0.24 por cima sem desinstalar.
2. Iniciar uma rota, registrar anomalia com foto e descrição, salvar; confirmar que aparece no quadro de Ocorrências.
3. Selecionar especialidade Segurança, prioridade Alta; confirmar criação da OS; abrir Atividades e encontrá-la com a TAG original.
4. Reabrir ocorrência e tentar criar outra OS: o botão deve ser substituído pelo acompanhamento, sem OS duplicada.
5. Concluir parcialmente ou bloquear a OS; conferir o estado após retornar à rota. Concluir a OS, confirmar estado, sem ocultar pendência da rota automaticamente.
6. Exportar backup v11 com vínculo; verificar e restaurar em base descartável de testes, confirmar relação, registros e fotos.
7. Confirmar calendário, programação, edição/reordenação de rotas 0.23 e lista de equipamentos intactos.
8. Evitar uso com dados sigilosos do empregador sem autorização. Testes automatizados não substituem inspeção prática.

## Próximo incremento
**0.25 — Melhorar lista de equipamentos e seletor reutilizável** em rotas, OS e corretivas (ver `ROADMAP_APOS_0_23.md`).
