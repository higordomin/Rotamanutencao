# QA 0.38 — Aplicativo simples para o colaborador

## Problema observado em campo

A lista de OS apresentava seis ações, indicadores, fichas e filtros simultaneamente.
Mesmo o criador do aplicativo relatou dificuldade de saber para onde seguir.

**Objetivo:** abrir o aplicativo e conseguir criar uma OS em poucos toques, sem
cadastrar os milhares de equipamentos da fábrica. Cadastro detalhado de TAG
somente para máquinas críticas escolhidas pelo próprio usuário.

## Fluxo principal

1. Início apresenta um botão grande **Criar OS**, um resumo curto, próxima
   atividade e acesso a Agenda e Minhas OS. Não duplica calendários nem gráficos.
2. Cadastro da OS apresenta em primeiro plano apenas:
   serviço, setor, descrição/lista de bombas/TAGs, data e repetição
   (uma vez, 7 dias, 30 dias ou número livre).
3. A **descrição** aceita listas extensas, incluindo OS mensais com mais de
   20–30 equipamentos, sem criar itens no catálogo. Nenhuma TAG é obrigatória.
4. O grupo **Mais detalhes (opcional)** permite categoria, prioridade,
   escolher uma TAG prioritária e cadastrar um equipamento diretamente
   sem perder o rascunho da OS. O novo cadastro aparece na seleção após salvar.
5. OS na listagem mostram título, setor, data, situação e apenas
   **Registrar serviço / Liberar** e **Mais opções**. Edição, duplicação,
   arquivamento, exclusão com verificação de histórico e impedimento continuam
   acessíveis ao expandir detalhes.
6. Pesquisa única por título, setor ou TAG. Filtros especiais ficam escondidos
   até tocar em **Outros filtros**; o rótulo indica filtros avançados ativos.
7. Primeiro uso ensina somente **Criar OS → Registrar serviço**, informa
   que equipamento é opcional e que os dados ficam no aparelho.

## O que não muda

- Design Industrial Dark e notificações locais existentes.
- SQLite e backup JSON v12; sem migração, perda de OS ou foto.
- Setor próprio de cada OS; pode existir sem equipamento.
- Formato de OS em execução, data de próxima recorrência, prioridades e
  histórico; exclusão segura da 0.36.
- Sem login, nuvem, sincronização, supervisão ou compartilhamento.
- Dados antigos de rotas continuam no banco/backup, mas a aba não aparece.

## Cenários de teste no Android

1. Antes da atualização, fazer **backup externo** e validar o arquivo.
   Instalar 0.38 por cima da QA anterior **sem desinstalar ou limpar dados**.
2. Primeira instalação vazia: só dois passos, uma chamada para criar OS e
   equipamento opcional.
3. Criar OS `Lubrificar bombas — Sala de Cortes` com descrição contendo
   30 TAGs e *nenhum* equipamento cadastrado. Programar para 30 dias.
4. Pesquisar `sala de cortes` e localizar a OS; visualizar a data e registrar.
5. Abrir Mais opções na OS; editar, duplicar, impedir, arquivar, reativar e
   excluir uma OS nova, respeitando a proteção do histórico.
6. Cadastrar um equipamento crítico enquanto preenche uma OS: voltar ao
   rascunho, selecionar a nova TAG e salvar.
7. Abrir OS antiga com TAG existente, atualizar e executar; conferir fotos.
8. Verificar notificação de OS para data próxima, agenda e lembretes já existentes.
9. Restaurar backup em base fictícia, confirmando TAG, setor e fotos antigos.
10. Conferir tema e acesso rápido em tela pequena e fontes Android ampliadas.

## Critérios de liberação

TypeScript, testes Node, SQLite smoke, export Android e APK QA
`br.com.rotamanutencao.qa`, versionCode 380 aprovados.
A 0.37 não foi confirmada em aparelho por causa de dificuldades de download.
Não promover 0.38 ao main sem o usuário testar no Android.

## Decisão sobre múltiplos equipamentos

Não usar seleção múltipla obrigatória no catálogo. A OS permanece vinculada
a **zero ou uma TAG cadastrada** e a descrição pode listar livremente dezenas
de equipamentos. Não criar relações adicionais nem migrar o banco só para
reproduzir uma OS de papel.
