# RotaManutenção — produto local-first, evolução SaaS

## Problema de base: PCM x execução

No chão de fábrica, urgências interrompem rotas; parte das OS fica sem evidência, algumas dependem da liberação da produção e outras aguardam peças. Sem um registro simples, o PCM não consegue diferenciar **esquecida**, **impedida** e **concluída**, nem replanejar corretamente. O MVP foca no técnico e no registro rápido, antes de adicionar hierarquia corporativa.

## MVP 0.3 — implementado em código (sem APK validado)

- Cadastro de equipamentos com TAG e área.
- Registro de atividades avulsas ou preventivas por periodicidade em dias, com prioridade e especialidade.
- Indicadores separados: atrasadas, impedidas e hoje.
- Registro e liberação de impedimentos ('aguardando peça', 'produção', 'parada', 'segurança', 'recursos', motivo livre), com log de eventos.
- Busca por TAG/equipamento, filtros e lista virtualizada de OS.
- Execução com descrição e até seis fotos; relatório PDF por execução; histórico local.
- Backup JSON v3 com histórico de impedimentos; restauração de backups v2 e v3 com validação prévia e transação SQLite.
- Estado básico de erro de abertura do banco: nenhum reset automático.
- Testes de regras/calendário e validação dos backups, teste de migração SQLite, pipeline GitHub Actions (a executar no GitHub).

## Não implementado; não prometer ao cliente

- APK compilado/testado, PDF validado em celular, restauração validada em celular.
- Checklists multipontos e rotas ordenadas, temporizador, horas homem, material consumido, QR Codes, notificações locais.
- Relatórios consolidados do período, MTTR/MTBF com dados confiáveis, SLA real, dashboard de PCM.
- Sincronização e autorização multiempresa, pagamentos, assinatura, monetização, API, audit trail imutável.

## Próximos incrementos em ordem de valor

1. **Gate Android:** `npm install`, Expo check, TypeScript, teste físico em celular e APK preview com EAS.
2. **Fluxo técnico industrial:** rotas com vários pontos, checklist com estado de cada ponto, consumo real de lubrificante e registro de anomalia que gera OS corretiva.
3. **Controle do PCM:** fila de impedimentos, motivo, responsável, reserva de peça, janela de parada, custo real e indicadores de cumprimento.
4. **Confiabilidade:** backup robusto criptografado com arquivos de imagem, exportação CSV e recuperação validada.
5. **SaaS multiempresa:** isolar dados por `tenant_id`, RLS, autenticação, RBAC, trilha de auditoria, consentimento para sincronização e integração de pagamentos. Implantar apenas após revisão de segurança.

## Estratégia comercial

Começar com equipes pequenas e manutenção preventiva/lubrificação. Validar demanda com profissionais externos, não utilizar dados reais de empregadores sem autorização. A assinatura empresa é uma hipótese; preço e funcionalidades devem ser testados com clientes, não tratados como receita garantida.
