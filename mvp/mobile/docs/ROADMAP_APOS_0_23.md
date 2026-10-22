# RotaManutenção — Roadmap após 0.23 (uso individual, offline)

> Documento de planejamento, **não é uma implementação**. A versão 0.23 foi validada pelo usuário em aparelho Android. Mudanças seguintes devem manter a instalação por cima das versões existentes, as TAGs e os históricos, as fotos e o backup local. Sem login, sincronização, supervisão ou nuvem.

## 0.24 — Gestão de anomalias e ocorrências
- Registrar anomalia em um ponto de rota com descrição, prioridade e fotos.
- Criar opcionalmente OS corretiva a partir da anomalia, já vinculada ao equipamento por ID estável e ao ponto de origem, **sem lançar OS duplicada sem confirmação**.
- Acompanhar estados da ocorrência e a OS resultante; concluir uma execução de rota não deve ocultar uma anomalia pendente.
- Operar offline; não afirmar que registro no app substitui LOTO, liberação de equipamento ou aprovações formais.

## 0.25 — Equipamentos: lista e seleção redesenhadas (prioridade explícita do usuário)

O usuário relatou que **a lista de equipamentos cadastrados precisa melhorar, assim como a seleção de equipamento nas OS e rotas**. Tratar como **um fluxo único**: primeiro localizar a TAG, depois confirmar exatamente o equipamento correto. Evitar duplicar componentes de busca em telas diferentes.

### Lista de equipamentos (Ativos)
- Lista enxuta, escaneável, com **TAG em destaque**, nome do equipamento e área/setor na segunda linha; cartões compactos, sem repetir informações.
- **Busca local rápida** por TAG/código, nome e setor, sem depender de internet; ignorar maiúsculas/minúsculas e espaços extras.
- Filtro por área/setor e ordenação estável (ex.: TAG/nome); estados úteis de vazio e "nenhum resultado".
- Abrir detalhes e histórico do equipamento a partir da mesma linha; manter ID estável para não misturar registros após renomear uma TAG.
- Evitar carregar uma lista enorme de uma vez; considerar paginação ou lista virtualizada conforme a quantidade real de registros.

### Seletor de equipamento nas OS e rotas
- Substituir a seleção atual baseada em pequena lista de resultados (hoje limitada visualmente) por **um seletor reutilizável**, acessível a partir de cadastro/edição de OS, cadastro/edição de ponto de rota e futura criação de OS corretiva.
- Campo de busca sempre visível por TAG, nome e área; resultados mostram **TAG + nome + setor** para diferenciar equipamentos semelhantes.
- Destacar claramente o equipamento escolhido e permitir **confirmar, trocar ou limpar seleção** sem apagar o restante do formulário.
- Quando já há seleção, abrir o seletor no contexto do equipamento atual, sem perdê-lo.
- Suportar lista longa sem truncamento silencioso; retorno claro quando um registro foi excluído ou não existe.
- Não criar equipamento automaticamente ao digitar uma TAG nem selecionar implicitamente o primeiro resultado; exigir toque/confirmação explícita.

### Critérios de aceitação no chão de fábrica
1. Em uma base de teste com 100+ equipamentos e TAGs parecidas, localizar o correto por código, nome e setor.
2. Selecionar uma TAG durante cadastro de OS, criação de ponto e edição de ponto, sem voltar ao começo do formulário.
3. Alterar a busca, trocar a TAG escolhida e cancelar sem alterações inesperadas.
4. Criar rota com vários pontos vinculados a diferentes equipamentos; conferir identidade por ID no histórico e nos PDFs.
5. Testar offline, teclado Android, rolagem, alvo de toque, alto contraste e lista vazia.
6. Verificar que nenhuma migração destrutiva é necessária, mantendo SQLite, backups existentes e dados antigos.

## 0.26 — Execução ainda mais rápida no campo
- Checklists com menos toques, pendências e ocorrências mais visíveis e retomada de execução interrompida.
- Avaliar atalhos e filtros por setor/prioridade; não marcar serviço como concluído sem ação explícita.

## 0.27 — Relatórios profissionais
- PDF de rota e consolidado com fotos, serviços executados, ocorrências, pendências e histórico por equipamento.
- Sem campos fixos de lubrificação em fluxos multidisciplinares.

## 0.28 — Planejamento e produtividade
- Agenda, lembretes locais, periodicidades e identificação de atrasos, com filtros úteis para uso individual.

## 0.29 — Estabilização e versão consolidada
- Testes de integração, desempenho, validação de backups/restauração, redução de bugs e refinamento visual.
- Teste real em aparelho após cada APK; manter versão Android e assinatura QA compatíveis.

## Princípios constantes
- **Offline e individual**: nada de login, nuvem, supervisão ou compartilhamento automático.
- **Multidisciplinar**: lubrificação, mecânica, elétrica, segurança e inspeção com o mesmo checklist, sem perguntar "lubrificante usado".
- **Histórico preservado**: equipamentos vinculados por ID estável, fotos e anotações de execuções antigas não podem ser sobrescritos por mudanças no cadastro.
- **Interface compacta**: priorizar busca e ação principal; controles secundários somente quando necessários.
- **Atualizações verificáveis**: TypeScript, testes Node, smoke SQLite, build APK QA e validação física no Android, com backup antes de atualizar.

### Sequência
A melhoria da **lista e do seletor de equipamentos fica na 0.25**, imediatamente após a gestão de anomalias da 0.24, e passa a ser considerada requisito de UX dos fluxos que utilizam TAG/equipamento.
