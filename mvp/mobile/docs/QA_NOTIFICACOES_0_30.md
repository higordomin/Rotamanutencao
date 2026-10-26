# QA — RotaManutenção 0.30.0 | Alarmes pontuais e mensagens personalizadas

## Motivo
Relato real de atrasos de ~20 minutos no Android. O sistema anterior acrescentava artificialmente 2 minutos para avisos prioritários e não declarava a permissão especial `SCHEDULE_EXACT_ALARM` no app.json. O restante do atraso é compatível com restrições do Android/Doze/fabricante, mas a causa exata exige observação no aparelho.

## Entregas
1. **Fim do atraso intencional de 2 minutos**: alertas individuais disparam no minuto configurado, sem horas retroativas.
2. **Permissão de alarmes exatos** declarada para o Android. Não se confunde com `POST_NOTIFICATIONS`; no Android 14+ geralmente precisa de autorização adicional pelo usuário. A configuração inclui um atalho para solicitar o acesso e orientações de navegação manual.
3. **Bateria sem restrições** e canal de notificações são recomendados na tela; não é feito bypass de proteção do Android nem solicitada otimização sem autorização.
4. **Conteúdo objetivo/detalhado** e **TAG visível/oculta** ajustáveis na tela Dados → Lembretes. As preferências são persistidas em `app_settings` existente (sem tabelas novas, migração ou alteração no JSON backup v11), com tentativa de reversão se reagendamento falhar.
5. Texto curto e estruturado: resumo diário com totais e alertas, aviso de OS/rota com título, tipo, prioridade, TAG (se conhecida e habilitada), prazo e especialidade no modo detalhado. Sem inventar TAG para rotas multidisciplinares.
6. A prévia mostra título **e** corpo segundo as mesmas regras do Android. O teste de 2 minutos agora usa gatilho DATE, igual ao dos avisos reais, e exibe o horário esperado.
7. Preserve `noticeFingerprint` e substituição segura da 0.29: agendas idênticas não são recriadas; em falha de reagendamento, os antigos continuam.

## Limitações
- Expo 57 (`expo-notifications ~57.0.19`) não expõe o modo `delivery:'alarmClock'` presente a partir da versão 58; não tentamos forçar API de outra versão.
- Mesmo com acesso a alarmes exatos, não é possível prometer entrega exatamente no minuto em todos os aparelhos. O sistema pode suspender/restringir notificações; usuário deve validar.
- Os sete resumos futuros são instantâneos da base local no momento do agendamento. Não há execução de SQL em background com a tela fechada.
- A autorização do Android não é concedida pela instalação do APK e não é lida automaticamente pela API Expo 57: a UI apresenta instruções e botão para pedir acesso via configurações.
- OS concluídas e fotos não são modificadas. A UI dos avisos não envia TAG/título a nenhum servidor.

## QA em dispositivo físico
- Antes de atualizar, exportar backup externo e verificar o JSON. **Não desinstalar nem limpar o armazenamento do aplicativo.**
- Atualizar QA 0.29 → 0.30, verificando mesmo packageName `br.com.rotamanutencao.qa` e assinatura QA, versionCode 300.
- Na tela do Android, confirmar permissão **Alarmes e lembretes** habilitada especificamente para o RotaManutenção. Se desabilitada, simular atraso no teste de 2 minutos, habilitar e repetir.
- Definir bateria do app para **sem restrições** e permitir notificações. Os nomes exatos variam conforme fabricante.
- Escolher horário +2 min e rodar o teste; comparar hora exibida no corpo à hora que a notificação realmente aparece na bandeja. Repetir com tela apagada e em segundo plano por 10 minutos.
- Escolher 05:37; criar OS Alta e rota com anomalia, revisar aviso; **não pode surgir 05:39** por código.
- Alternar Objetivo/Detalhado e TAG ligado/desligado. Com TAG desligada não deve aparecer TAG na OS; em rota sem TAG não deve inventar dado.
- Prévia deve exibir título e corpo, e **não agendar ou cancelar avisos**. Confirmar contagem estável com abrir/fechar prévia.
- Revisar se OS concluída não aparece nos avisos individuais; atraso, impedimento e atenção usam textos corretos.
- Estressar armazenamento offline, calendário, PDFs, execução de rotas e backup JSON. Verificar que os testes e APK sejam aprovados na CI.
- Não integrar na `main` até QA real no celular.
