# RotaManutenção 0.23 — Edição e reutilização de rotas (QA)

## Solicitação e foco
Após a 0.22.1 ser testada e aprovada, concluir a etapa de gestão avançada das rotas no Android: **editar pontos, alterar a ordem e duplicar uma rota como modelo**. Sem login, sem cloud, sem quantidade de lubrificante, sem alterar a Agenda aprovada.

## O que foi implementado
- Abrir rota > Pontos cadastrados > **Editar ponto**: alterar atividade e equipamento/TAG vinculada. A edição é explícita; botão Salvar. Não altera os itens das execuções antigas.
- Setas de **subir/descer** em cada ponto: troca a posição com a atividade vizinha, mantendo IDs e todos os pontos. Normaliza posições herdadas e respeita a ordem na execução seguinte.
- **Duplicar como modelo** em uma rota: requer confirmação; cria nova rota nomeada `Cópia de …` com o checklist e as TAGs atuais; salva como **avulsa**, sem copiar vencimento, periodicidade, alertas de anomalias, execuções, fotos ou históricos. O usuário configura a periodicidade da nova rota ao utilizá-la.
- Não copia valores legados de lubrificante nem quantidades.
- Bloqueia *inserir, editar, reordenar ou remover pontos* com uma execução aberta, **também na transação SQLite**; instrução de finalizar a execução aparece na tela.
- Histórico de execuções, fotos, status e anomalias são preservados ao editar ou reorganizar o checklist.
- Listagem compacta, programações da 0.22, Agenda, Início e backup JSON v10 preservados sem migração.

## Testes automáticos
1. `npm run check`, `npm test`, `npx expo export --platform android --output-dir dist` e `python3 tests/sqlite_smoke.py`.
2. `tests/routeEditor.test.mjs`: ordem, extremidades, IDs duplicados, invalidade e geração de título seguro.
3. Smoke SQLite: mudança de TAG e atividade, ordem, cópia limpa com novos IDs, preservação de snapshots e evidências de execução já encerrada.
4. Android QA **0.23.0**, `versionCode=230`, `br.com.rotamanutencao.qa`, mesma assinatura de atualização das versões anteriores.

## Testar na prática
1. Abrir a versão anterior (0.22.1) e exportar backup local v10 para outro local.
2. Instalar 0.23.0 **por cima**, sem desinstalar ou limpar os dados.
3. Criar rota de inspeção com três ou mais pontos. Abrir e tocar **Editar ponto**, alterar a atividade/TAG e salvar.
4. Usar ↑ e ↓ até alterar a ordem; iniciar nova execução e confirmar que os pontos aparecem nessa sequência.
5. **Duplicar como modelo**, voltar à listagem e encontrar a rota "Cópia de …". Ela não deve ter prazo nem execuções anteriores; definir nova programação se necessário.
6. Finalizar uma rota e registrar uma foto; depois editar um ponto do checklist. O relatório anterior deverá continuar com título, TAG, status e fotos originais.
7. Iniciar uma execução e voltar ao cadastro: ações de adicionar/editar/reordenar/remover devem ser bloqueadas até finalizar.
8. Confirmar que não há campo de lubrificante, funcionamento offline, calendários e relatórios.
9. Fechar/abrir app e verificar persistência da ordem, TAG, título e cópia no backup.

## Observações
- Não é permitido duplicar uma rota se existir algum ponto sem TAG/equipamento válido: o usuário deve corrigir primeiro.
- Cópias como modelo **não criam ordens de serviço futuras automaticamente**.
- A atualização exige validação final de toque e aparência no Android físico; CI não substitui uso em campo.
