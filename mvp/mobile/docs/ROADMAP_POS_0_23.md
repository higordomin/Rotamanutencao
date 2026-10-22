# Planejamento pós-0.23 — RotaManutenção

**Atualizado em:** 22/10/2026  
**Situação:** planejamento, não implementado.  
**Referência:** feedback após aprovação da versão 0.23.0 no Android.

## Objetivo do produto
Aplicativo de manutenção para uso individual no chão de fábrica, 100% offline, sem login, nuvem, supervisão ou sincronização. Atende lubrificação, mecânica, elétrica, inspeção e segurança. Preservar dados locais, histórico, fotos e backup JSON v10.

## Ordem priorizada

| Versão pretendida | Entrega | Objetivo |
| --- | --- | --- |
| **0.24** | Gestão de anomalias e OS corretiva vinculada | Um problema encontrado numa rota permanece rastreável e pode gerar ação corretiva sem duplicar cadastro de equipamento. |
| **0.25 — PRIORIDADE SOLICITADA** | **Cadastro, listagem e seleção inteligente de equipamentos/TAGs** | Achar equipamentos rapidamente, reconhecer o ativo correto antes de cadastrar OS ou ponto de rota, melhorar lista de Ativos. |
| **0.26** | Execução mais rápida no campo | Menos toques, continuidade do checklist, filtros de pendentes e retomada de execuções. |
| **0.27** | Relatórios profissionais | Exportação de OS, rotas, evidências e anomalias, com apresentação clara. |
| **0.28** | Planejamento e produtividade | Lembretes locais, prioridades, prazos, filtros por área e recorrências. |
| **0.29** | Estabilização e consolidação | Revisão visual, testes completos, backup/restauração e integridade do banco. |

*As versões são propostas de planejamento e podem ser ajustadas após testes reais.*

## 0.25 — melhoria da lista de equipamentos

### A. Aba Ativos: lista limpa e escalável
- Cada item deve mostrar primeiro **TAG/código**, seguido do **nome do equipamento** e **setor/área** em uma linha secundária legível.
- Campo de busca em destaque: procurar por TAG, nome e área, com tolerância a maiúsculas/minúsculas e acentos.
- **Filtro por setor/área** e ordenação clara por código ou nome; não repetir contadores e informações desnecessárias.
- Área de ação compacta: tocar no item abre detalhes/edição do equipamento. Não misturar várias ações pequenas em cada linha.
- Estado vazio útil quando não houver ativos ou nenhum resultado corresponder à busca.
- Lista virtualizada para comportar centenas ou milhares de equipamentos sem criar todos os componentes visuais de uma vez.
- Validar TAGs duplicadas de maneira compatível com equipamentos legados; **não mesclar nem excluir ativos automaticamente**.

### B. Seleção de equipamentos nas Rotas e OS
- Criar um **seletor reutilizável** (mesma interface e mesmo filtro na criação/edição de pontos das rotas e nas OS).
- Em vez de exibir uma longa lista dentro do formulário, abrir uma tela/modal de seleção com **busca instantânea por TAG, nome ou setor**.
- Mostrar TAG, nome e setor em linhas compactas; **destacar a escolha atual** e mostrar a TAG selecionada no formulário.
- Não truncar resultados silenciosamente aos **12 primeiros equipamentos**; usar rolagem/paginação local/virtualização apropriada.
- Permitir limpar busca, voltar sem alterar escolha e confirmar seleção de forma previsível.
- Se o equipamento for renomeado ou excluído depois, não associar registros históricos a outra TAG por coincidência textual: preservar vínculo por **ID estável** e retratos de execução.
- As funções de criação/edição devem manter as validações e a preservação de anexos já existentes.

### C. Critérios de aceitação e QA
1. Um equipamento chamado **Motor de Esteira** com TAG **MT-204** e área **Paletização** aparece em buscas por `MT-204`, `esteira` ou `paletizacao`.
2. A pesquisa alcança equipamentos que anteriormente ficariam depois dos 12 primeiros resultados.
3. Selecionar ativo numa rota e numa OS vincula o **ID correto**, mesmo que existam nomes iguais em setores diferentes.
4. Alterar o texto de busca, cancelar ou voltar não altera uma seleção já salva.
5. A lista continua utilizável com centenas de registros, inclusive offline; performance validada em dispositivo Android.
6. Editar/excluir um ativo não modifica históricos antigos nem vincula execuções a ativo incorreto.
7. Backup anterior deve restaurar sem perder IDs, nomes, áreas ou histórico de rotas e OS.
8. Verificar acessibilidade de toque, teclado Android e contraste no tema escuro.

## Guardas comuns das próximas versões
- Nenhuma exclusão/migração destrutiva sem backup e plano de compatibilidade.
- Rotas continuam multidisciplinares, sem campos exclusivos de lubrificante.
- Não lançar tarefas/execuções automaticamente ao modificar calendário, ativos ou checklist.
- Cada versão deve ter testes automatizados e APK QA atualizável **por cima da anterior**, mantendo assinatura e dados locais.
- **Não confundir planejado com implementado**: todo item desta página depende de desenvolvimento, testes e validação real.
