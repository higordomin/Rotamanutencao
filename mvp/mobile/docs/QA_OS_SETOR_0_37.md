# QA 0.37 — Ordens de Serviço por setor, sem Rotas

## Objetivo do usuário
Profissional de manutenção com muitos setores: pesquisar `sala de cortes`
e encontrar todas as OS do setor, sem percorrer centenas de botões.
A navegação é **Início / Agenda / OS / Mais**. Rotas deixam de ser uma área de
trabalho do aplicativo.

## Entregas
- Campo próprio **Setor da OS** (máx. 120 caracteres), separado do cadastro de
  equipamento e da TAG; aceita nomes novos e sugestões dos já usados em OS e equipamentos.
- Sugestões com até 6 opções na tela. O conjunto de setores é ilimitado no cadastro.
- Busca geral por descrição, setor, OS, TAG, equipamento e especialidade, sem acentos ou distinção de caixa.
- **Filtrar ordens por setor**, pesquisa parcial e sem acentos, incluindo OS sem equipamento.
- Agenda exibe apenas ordens de serviço com setor próprio e permite pesquisar setor.
- Aba Rotas retirada; atalhos e histórico de rotas saem da interface operacional.
- Relatório consolidado atual reúne somente OS.
- Tabelas/rotas históricas são preservadas para não destruir dados antigos.
  As informações de rota continuam incluídas no backup, sem novo cadastro/execução por essa interface.
- Migração SQL aditiva `work_orders.sector`: copia a área do equipamento nas OS antigas quando disponível.
- Backup JSON **v12** conserva o campo. Backups 2–11 continuam aceitos e o setor é recuperado do equipamento quando possível.
- Não altera a exclusão segura de OS implementada na 0.36.

## Teste prático
1. Fazer backup externo na versão atualmente instalada. Não desinstalar o app.
2. Instalar QA `0.37.0`/`versionCode=370` por cima da versão 0.36.
3. Confirmar quatro abas: Início, Agenda, OS e Mais; não deve existir a aba Rotas.
4. Criar OS no setor **Sala de Cortes** sem equipamento. Criar outra OS no mesmo setor.
5. Cadastrar OS em Embalagem. Pesquisar `sala de cortes` na OS: devem surgir só as duas.
6. Pesquisar `cortes`, `SALA DE CORTES` e nomes com acentos, verificar busca.
7. Cadastrar dezenas de setores com nomes diferentes, digitar parte do setor para acessar sugestões.
8. Selecionar setor ao editar OS, vinculando e desvinculando equipamento sem sobrescrever setor manual.
9. Verificar que OS antigas vinculadas a equipamentos receberam o setor correspondente.
10. Testar Agenda, filtros por setor, execução, fotos, exclusão de OS sem histórico, arquivamento e restauração de backup.
11. Exportar backup v12, conferir OS com setor e importação do v11 em base fictícia.
12. Confirmar que dados históricos anteriores continuam intactos.

## Condição de liberação
CI (TypeScript, Node, SQLite, export Android) e APK QA com assinatura habitual.
Não integrar no `main` até o usuário aprovar no Android. Base 0.35 permanece estável.
