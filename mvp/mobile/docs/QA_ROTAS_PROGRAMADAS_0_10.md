# RotaManutenção 0.10 — Programação de rotas preventivas

## Nova funcionalidade
- Cadastre rota avulsa (0 dias) ou periódica, informando intervalo em dias e primeira data por calendário visual.
- A aba Rotas destaca: **Pendências**, **Vencidas**, **Hoje** e **Programadas**.
- Permite alterar periodicidade e próxima data sem remover equipamentos, pontos, históricos ou fotos.
- Ao finalizar uma execução com TODOS os pontos feitos e sem anomalias, programa a próxima data com base **na data local de conclusão** + intervalo.
- Se a rota tiver qualquer **Anomalia** ou **Não executado**, grava a quantidade de pontos pendentes e **não altera a próxima data**, mesmo que a rota seja finalizada administrativamente.
- Uma nova execução completamente regularizada limpa o alerta anterior e calcula o prazo seguinte.
- Sem login, nuvem ou notificações em segundo plano nesta fase. Os indicadores aparecem quando o usuário abre a aba Rotas.

## Preservação dos dados
- Identificador Android estável `br.com.rotamanutencao.qa`, `versionCode=100` (anterior=90).
- SQLite cria quatro colunas adicionais na tabela `routes` (`recurrence_days`, `next_due_date`, `attention_count`, `attention_at`). As rotas antigas tornam-se **avulsas**, com seus pontos/histórico/fotos mantidos.
- Backup **v7** inclui as datas e a pendência das rotas. Importa arquivos v2, v3, v4, v5, v6 e v7.
- Backups v7 **não** abrem nos APKs antigos. Mantenha um backup v6 obtido na 0.9 antes de atualizar.

## Testes manuais no Android
1. Na 0.9, exportar backup v6 para local externo e confirmar arquivo não vazio.
2. Instalar 0.10 **por cima** da 0.9 (não desinstalar).
3. Confirmar que rotas antigas, OS, TAGs, histórico e fotografias continuam acessíveis.
4. Criar uma rota de teste periódica a cada 30 dias com primeira data pelo calendário; adicionar dois pontos.
5. Concluir ambos os pontos e finalizar rota. Próxima data deve ser **30 dias depois do dia atual**, sem considerar a data inicial vencida.
6. Criar outra rota com 7 dias de periodicidade. Marcar um ponto como **Anomalia** e outro como **Não executado**.
7. Finalizar a execução: a rota deve indicar **2 pendências**, sem reagendar a próxima data. Os históricos e PDFs continuam indicando os resultados.
8. Iniciar outra execução, registrar todos os pontos como Executado, finalizar e confirmar que a pendência desapareceu e o prazo avança 7 dias.
9. Editar uma rota da versão 0.9 para periodicidade 15 dias e escolher a data no calendário.
10. Fechar o app, desligar a internet, reabrir: conferir alertas, datas e histórico.
11. Exportar backup v7, verificar contagem de rotas periódicas e com pendências. Restaurar apenas em instalação de testes com dados descartáveis.

## Escopo e segurança
- Esta versão não emite notificações Android nem cria um sistema compartilhado de PCM.
- Reprogramações e pendências não substituem a inspeção nem a liberação de máquina.
- Nenhum registro confidencial da empresa deve ser compartilhado sem autorização.
- Assinatura de desenvolvimento somente para QA. Validar no Android físico antes de considerar versão estável.
