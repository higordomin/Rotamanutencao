# RotaManutenção 0.21 — QA da Agenda Inteligente

## Objetivo
Agenda de **leitura** offline das OS e rotas existentes, sem alterar as regras de periodicidade, bloqueios, execução ou histórico.

## Funcionalidade
- Nova aba **Agenda**, com atalho destacado na página inicial.
- Exibição **Dia / Semana / Mês**, navegação anterior/próximo período e **Ir para hoje**.
- Na semana, seg–dom com quantidade de atividades por dia; no mês, calendário com quantidade por dia. Toque em dia para ver detalhes.
- Quadro com OS ativas pendentes e rotas recorrentes com data cadastrada; rotas avulsas só entram se houver anomalia pendente.
- Visibilidade de OS bloqueadas, execuções parciais, rotas com anomalia, prazos vencidos e atividades previstas para hoje, inclusive fora da janela de calendário no **backlog**.
- Filtros por tipo (OS ou rota), área e especialidade. Rotas ainda não têm especialidade; filtro de especialidade restringe OS, como indicado na tela.
- Ações nos cartões: **Executar OS** (abre o formulário existente), **Ver impedimento**, **Editar programação da OS** ou **Abrir rota**.
- Datas vêm dos campos `due_date` e `next_due_date` atuais, **não de projeções automáticas futuras**. A periodicidade só calcula o próximo prazo nas rotinas de execução já existentes.
- Indicadores de atrasadas, para hoje e pendências podem se sobrepor: um serviço bloqueado e atrasado conta nos dois indicadores.
- A aba não cria, conclui, posterga, compartilha nem envia registros de forma automática.

## Compatibilidade Android
- Expo `0.21.0`, `versionCode=210`, pacote QA `br.com.rotamanutencao.qa` e certificado QA fixo das versões anteriores.
- Sem migração SQLite, sem alteração no schema/backup **JSON v10**. Versões 2–10 continuam restauráveis.
- Atualizar por cima da `0.20`; **não desinstalar nem limpar dados**. Exporte e confira backup antes.
- Branch empilhada sobre `feat/mvp020-registro-rapido-campo`; PR de revisão não se mescla isoladamente à `main`.

## Verificações automáticas
1. `npm run check`, `npm test`, export Android Expo, smoke SQLite.
2. Testes de datas civis para virada de ano, fevereiro bissexto, segunda-feira como primeiro dia da semana.
3. Exclusão de OS concluídas e arquivadas do planejamento; preservação de OS parciais e bloqueadas e rotas com anomalia sem data.
4. Filtro exato de especialidade e área, sem inventar categoria para rotas.
5. Backlog para pendências fora do período; sem duplicar item na lista do mesmo período.
6. Validação de APK, `versionCode=210`, ID QA e assinatura QA, mais publicação do APK Android.

## Verificações manuais necessárias
1. Exporte backup v10 externo e instale o 0.21 por cima do 0.20.
2. Na aba Agenda, veja Dia, Semana e Mês, navegue pela mudança de mês e ano e confira os dias contra dados reais.
3. Crie uma OS vencida, outra para hoje e outra futura; compare com a aba Atividades.
4. Impeça uma OS e registre outra parcialmente; confira os alertas e o backlog ao navegar para outro mês.
5. Crie uma rota recorrente, finalize com anomalia e confirme que não desaparece do backlog.
6. Toque em **Executar OS**, **Ver impedimento**, **Editar programação** e **Abrir rota**; confira a atividade correta.
7. Finalize OS/rota e volte à agenda; estado e contagens precisam atualizar sem afetar históricos.
8. Teste lista de áreas e filtros por especialidade e tipo de registro. Confira se rotas são ocultas com filtro por especialidade.
9. Confirme navegação nas abas, compatibilidade do backup e os PDFs existentes.

## Limitações explícitas
A agenda mostra somente **a próxima data programada** de cada OS/rota. Ela não simula diversas ocorrências futuras nem representa capacidade operacional ou horas estimadas de trabalho. A especialidade das rotas ainda não está cadastrada. Essas evoluções podem integrar versões posteriores.
