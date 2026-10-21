# RotaManutenção 0.13 — Painel operacional de chão de fábrica

## Objetivo

Reunir **OS e rotas** na tela **Início**, com as atividades urgentes primeiro e ações diretas,
para reduzir trocas de aba durante uma ronda de manutenção.

## Entregue
- **Painel operacional** na tela inicial, com uma lista de OS e rotas, ordenada por pendências,
  impedimentos, atrasos, vencimento de hoje e próximas atividades em até sete dias.
- **Pendências de rotas** aparecem mesmo sem data, inclusive rotas avulsas com anomalia.
- OS impedida continua bloqueada; ação permite consultar impedimento, não executar
  incorretamente. OS comum tem **Executar OS** e **Editar OS**.
- Rota tem botão **Abrir rota**, levando ao cadastro/checklist da rota correspondente,
  sem pesquisar o nome ou TAG em outra aba.
- Identificação por **TAG/equipamento/setor** na OS; setor e data na rota.
- Destaque de OS de prioridade Alta e com execução parcial.
- Indicadores agregados: pendências, vencidas, serviços para hoje e quantidade de OS/rotas.
- Inicialmente exibe oito itens com controle **Ver mais**; a consulta é offline,
  não cria contas, não transmite dados e não modifica status apenas por abrir o painel.
- A tela atualiza automaticamente quando OS/rotas são modificadas ou quando o app volta
  ao primeiro plano.
- Mantidos: relatórios PDF, evidências fotográficas, backup JSON v7, calendário,
  resumos diários 0.12 e alertas prioritários.

## Atualização segura
- Mesma identificação QA `br.com.rotamanutencao.qa`, assinatura de testes e versionCode **130**,
  permitindo atualizar o APK 0.12 (code 120) por cima.
- **Sem migração de schema**: não altera tabelas, backups ou arquivos de evidência.
- Antes de instalar, exporte backup v7 na 0.12 para uma pasta fora do app.
- Instale 0.13 **sem desinstalar**. Confira OS, fotos, rotas, histórico, horários e notificações.

## Testes no dispositivo
1. Cadastrar uma OS vencida, uma para hoje, uma parcial, uma impedida e uma para a semana.
2. Cadastrar duas rotas: uma para hoje e uma com anomalia não resolvida, inclusive avulsa.
3. Na tela **Início**, confirmar que rota pendente fica acima das demais; tarefas
   impedidas e atrasadas vêm antes das normais; o botão *Ver mais* mostra registros adicionais.
4. Tocar **Abrir rota** e confirmar que abre a rota correta, com seus pontos e fotos.
5. Voltar à tela inicial, tocar **Executar OS** e salvar uma execução fictícia. Verificar
   que o painel se atualiza (a OS sai da lista ou muda o vencimento conforme recorrência).
6. Tocar **Ver impedimento** em uma OS impedida. Confirmar que não executa OS bloqueada
   sem liberação.
7. Desligar a internet e repetir. Fechar/reabrir e confirmar os dados locais persistidos.
8. Exportar/inspecionar backup v7; conferir fotos e históricos antigos.
9. Verificar que resumo diário e notificações de prioridade seguem habilitados quando
   já haviam sido ativados na 0.12.

## Limitações
- É uma visão de execução individual, **não** um painel de supervisão, login ou SaaS.
- Mostra atrasos e próximos sete dias; tarefas além da semana continuam na aba Atividades
  e rotas futuras na aba Rotas.
- O painel depende da atualização dos dados locais; não reflete alterações externas,
  já que não existe sincronização.
- OS e rotas não devem ser usadas para substituir práticas de segurança de manutenção
  (LOTO, análise de risco, liberação da operação).
- Não confundir CI/compilação Android aprovada com teste físico: a conferência acima
  depende de retorno do usuário.
