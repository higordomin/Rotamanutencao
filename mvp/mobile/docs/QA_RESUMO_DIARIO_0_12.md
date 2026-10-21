# RotaManutenção 0.12 — Resumo diário e alertas prioritários

## O que mudou
- **Resumo diário único**, enviado no horário livre configurado pelo relógio Android. Exemplo: 05:30.
- Apresenta contagem de OS e rotas programadas **para o próprio dia**; quando disponíveis, separa as OS por categoria (lubrificação, mecânica, elétrica e inspeção).
- Informa também quantas tarefas estão atrasadas, OS impedidas e rotas com anomalias no momento em que o agendamento é calculado.
- **Alertas individuais somente para situações prioritárias**: rota com anomalia/ponto não executado; OS impedida; OS/rota atrasada; OS de prioridade **Alta** no vencimento.
- OS e rotas normais entram apenas no resumo, não são disparadas individualmente. Isso evita inundar o telefone com dezenas de notificações simultâneas.
- Alertas prioritários aparecem cerca de **dois minutos após** o horário escolhido para o resumo, quando possível, para diferenciá-los na central de notificações.
- O aplicativo programa resumos dos **próximos sete dias** e até 33 alertas prioritários (máximo 40 agendamentos). Replaneja ao abrir/retomar, alterar OS, finalizar rota, mudar o horário ou clicar **Revisar avisos**.
- Preserva relógio Android com hora/minuto, teste independente de dois minutos, canal com som, armazenamento local e escolha de desativar todas as notificações.

## Exemplo realista
Se amanhã existem 4 OS normais e 1 rota, às 05:30 haverá **um resumo**:
"RotaManutenção • Programação de hoje"
"4 OS e 1 rota programadas para hoje. Lubrificação: 2; Mecânica: 1; Elétrica: 1."

Se também existir uma rota com anomalia, ela pode gerar um segundo alerta às 05:32:
"⚠ Rota com pendência • Paletização"
"2 ponto(s) com anomalia ou não executados. Consulte a rota antes de regularizar."

## Limitações importantes
- **Sem processamento em background:** os textos são preparados e salvos no Android quando o aplicativo é aberto ou seus registros são alterados. Se uma OS for concluída em outro sistema ou os dados mudarem sem abrir o app, o resumo já agendado pode ficar desatualizado.
- O agendamento antecipado cobre até **7 dias**. Para continuar recebendo resumos atualizados após esse período, é necessário abrir o aplicativo. Não há promessa de notificações indefinidas sem atividade no app.
- O horário escolhido é o horário local do telefone. Economia de bateria, permissões, modo Não Perturbe e gerenciamento OEM podem atrasar a entrega.
- Resumos aparecem até nos dias com zero OS; o texto informa que não há atividades programadas.
- O resumo inclui títulos de OS/rotas nos avisos prioritários; informações potencialmente sensíveis podem aparecer na tela bloqueada. Use títulos sem informações confidenciais.
- Alertas não substituem PCM formal, procedimentos de segurança, LOTO ou liberação de máquina.
- Esta versão continua offline, individual, sem login, servidor, compartilhamento nem sincronização.
- Não altera o schema do banco nem o formato dos backups: continua **JSON v7**.

## Instalação segura e roteiro de QA
1. Na versão 0.11.1, exporte um backup **v7** e confirme que está salvo fora do aplicativo.
2. Instale a 0.12 por cima da 0.11.1, **sem desinstalar**. O identificador é `br.com.rotamanutencao.qa`, versionCode **120**.
3. Confirme suas OS, equipamentos/TAG, rotas, fotografias, relatórios e históricos.
4. Vá em **Dados → Lembretes locais**, escolha 05:30 pelo relógio e ative os avisos.
5. Crie 4 OS normais e uma rota para amanhã. Em **Revisar avisos**, verifique que o aplicativo tem sete resumos agendados, **sem alertas individuais** para essas cinco tarefas.
6. Crie uma OS impedida e uma rota com anomalia. Atualize: devem aparecer dois alertas prioritários adicionais, sem cinco alertas para as OS normais.
7. Confirme a chegada do resumo às 05:30; confira contagem/categorias, depois o alerta prioritário às 05:32. O Android pode agrupar ou atrasar notificações.
8. Use **Testar notificação em 2 minutos** para verificar a entrega sem esperar pelo próximo horário do resumo.
9. Conclua a OS e finalize a rota corretamente. Volte à aba Dados e toque **Revisar avisos** para retirar alertas obsoletos.
10. Faça testes no modo avião e com aplicativo em segundo plano. Não desinstale nem limpe dados para resolver falhas de notificação.

## Aceite
CI TypeScript, Expo Android bundle, Node unit tests de agregação/limites, SQLite e compilação Gradle com verificação de assinatura. O funcionamento no telefone, especialmente em 05:30 após noite em espera, precisa de confirmação humana.
