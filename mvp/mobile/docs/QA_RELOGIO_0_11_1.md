# RotaManutenção 0.11.1 — Relógio Android e diagnóstico das notificações

## Problema relatado
O usuário escolheu 08h, mas não recebeu aviso. A versão 0.11 tinha três horários fixos e não fornecia um disparo independente para comprovar o funcionamento do Android.

O agendador original pode programar o próximo aviso para amanhã se a seleção ocorrer após 08h. Além disso, apenas rotas/OS elegíveis (próximas, vencidas, impedidas ou com anomalias) geram avisos; zero pendências pode significar zero notificações agendadas.

## Correções
- O botão do horário abre o **relógio nativo do Android**, permitindo escolher qualquer hora e minuto (00:00–23:59), sem digitar.
- As preferências antigas de horário da 0.11 são mantidas; o minuto novo começa em zero.
- Botão **Testar notificação em 2 minutos**, independente do status das OS, que também confirma se o Android aceitou o agendamento.
- Som e prioridade alta para o novo canal `rotamanutencao-lembretes-v2`, já que o canal antigo era silencioso. O comportamento efetivo ainda depende de permissões, volume e configurações do celular.
- Não apaga o teste agendado quando o aplicativo revisa as OS/rotas; desligar lembretes cancela o teste também.
- Contagem de lembretes da manutenção separada da notificação de teste.
- Nenhuma nuvem, conta ou serviço de push. Testes não alteram OS, rotas nem histórico.
- Nova versão `0.11.1`, Android versionCode `111`, mesmo identificador QA da 0.11: `br.com.rotamanutencao.qa`.

## Instalação e teste
1. Na 0.11, exporte backup v7 fora do aplicativo e confira que o arquivo está salvo. **Não desinstale** a 0.11.
2. Instale 0.11.1 por cima. Confira fotos, rotas e OS.
3. Em **Dados → Lembretes locais**, escolha a hora tocando no **relógio**, por exemplo 08:15 ou 08:27, e permita notificações.
4. Pressione **Testar notificação em 2 minutos**. A mensagem mostrará o horário previsto.
5. Deixe o app em segundo plano ou bloqueie a tela e aguarde pelo menos 3 minutos. Confira também a bandeja de notificações; o Android pode atrasar o aviso.
6. Se não aparecer, entre em **Configurações → Aplicativos → RotaManutenção → Notificações** e confira o canal "Manutenções e rotas". Verifique restrição de bateria e modos Não Perturbe/Silencioso.
7. Após receber o teste, crie OS ou rota de teste com vencimento próximo, toque em **Revisar avisos** e confira a contagem (se estiver 0, não há OS/rota elegível).
8. Desative os lembretes e confirme que os agendamentos locais do aplicativo foram cancelados.

## Cuidados
- Não garantir entrega no segundo exato: regras de economia de energia e alarmes do Android podem atrasar ou suprimir a notificação.
- Não fazer testes com equipamento em operação; avisos não substituem procedimentos de segurança industrial, nem calendário PCM oficial.
- Backups v7 permanecem compatíveis com a 0.11; nenhuma migração destrutiva. A preferência `reminders.minute` é adicionada sob demanda.
- O APK ainda exige compilação GitHub/Gradle + testes físicos para confirmação; QA não é release comercial.
