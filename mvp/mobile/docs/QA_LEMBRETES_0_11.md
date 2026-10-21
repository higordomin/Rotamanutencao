# RotaManutenção 0.11 — Lembretes locais no Android

## Implementado
- Aba **Dados → Lembretes locais de manutenção**: ativar/desativar, escolher 08:00, 14:00 ou 19:00 e revisar os avisos agendados.
- **Desativados por padrão**; pede autorização de notificações apenas mediante ação explícita do usuário.
- Notificações **pontuais**, sem servidor: OS pendentes, OS impedidas, rotas com anomalias, vencidas ou próximas do prazo.
- Prioriza pendências e vencimentos; agenda **até 40 notificações** futuras referentes aos próximos 45 dias. O app não verifica o SQLite com o aplicativo fechado.
- Reprograma as notificações quando o app é aberto/retoma primeiro plano, uma OS é modificada ou uma rota é registrada/concluída.
- Preferências (ativo/horário) somente no SQLite local: tabela nova `app_settings`, sem remover OS, rotas, fotos ou backups.
- Ao desativar, cancela **apenas** as notificações pertencentes ao RotaManutenção.
- Sem Firebase, login, token de push, contas ou conexão com a internet.

## Limites e condições
- O Android pode atrasar ou suprimir notificações devido a permissões, economia de bateria e configurações do fabricante. Não há garantia de entrega em segundo exato.
- Alterações em dados feitas com o app fechado não são consultadas por um serviço de fundo. Ao reabrir, o plano é recalculado.
- Os avisos são lembretes e não equivalem a bloqueio operacional, plano oficial de PCM ou alarme de segurança.
- O agendamento cobre vencimentos próximos e pendências existentes quando o app foi aberto; atividades a mais de 45 dias são incluídas em futuras aberturas.
- Caso a permissão Android seja revogada, o app precisa de permissão novamente. Os registros não são afetados.
- O pacote usa `br.com.rotamanutencao.qa` com versionCode **110**, preparado para instalar por cima da 0.10 (versionCode 100).
- A assinatura é QA, não release comercial; manter backup antes de atualizar.

## Testes no Android
1. Na 0.10, exporte backup JSON v7 para pasta externa, confira o arquivo, e não desinstale o aplicativo.
2. Instale o APK 0.11 por cima, usando a opção **Atualizar**. Confirme histórico/OS/rotas/fotos sem restaurar.
3. Vá em Dados → Lembretes. Confirme desativados inicialmente, escolha horário adequado e toque **Ativar lembretes**.
4. Na caixa de permissão do Android, permita as notificações; verifique a contagem de agendamentos.
5. Crie OS futura e rota próxima do prazo: use o botão **Revisar avisos** e confira se a contagem é atualizada.
6. Conclua a OS e a rota: a contagem deve mudar conforme os agendamentos existentes.
7. Para testar entrega, escolha horário de lembrete próximo do relógio local e crie um vencimento para o dia vigente; respeite economia de bateria.
8. Registre anomalia na rota, confira que pendência tem prioridade.
9. Desative: verifique que a contagem zera. Ative novamente: agenda de acordo com o banco local.
10. Feche o app, ative modo avião e confira notificações no horário agendado. Teste após reinício do telefone; documente o resultado, pois a entrega pode variar.
11. Gere backup e PDF e confirme que fotografias e registros antigos seguem intactos.

## Critério de liberação
TypeScript, Metro/Expo, testes de planejamento, SQLite, Gradle e certificado devem passar. Teste real de entrega com o app fechado permanece obrigatório. Não afirmar notificações funcionando no dispositivo sem confirmação do usuário.
