# RotaManutenção — definição do produto

**Posicionamento:** aplicativo simples para executar e documentar rotinas de manutenção industrial. Primeiro para técnicos; depois para equipes com um painel compartilhado.

## Público-alvo inicial

Profissionais autônomos de manutenção, lubrificadores, mecânicos, eletricistas, pequenas indústrias e prestadores com até 5 técnicos. Validar com entrevistas antes de definir preço.

## Princípios não negociáveis

1. O plano gratuito individual funciona sem login, internet, equipe ou supervisão.
2. Dados de trabalho ficam no aparelho; a sincronização exige opt-in e conta empresarial.
3. O SaaS não deve bloquear o acesso aos dados locais do técnico após o fim de uma assinatura.
4. Atividades de segurança são decididas e confirmadas por profissionais, não por IA automaticamente.
5. Cada empresa só acessa suas próprias informações; toda operação de nuvem exige autorização por organização e auditoria.

## Telas do MVP local

- **Início:** vencidos, hoje, próximos, quantidade de execuções recentes.
- **Atividades:** lista, edição, prioridade, tipo, vencimento, periodicidade, execução.
- **Equipamentos:** TAG, nome, área e vínculo com atividades.
- **Histórico:** data da execução, atividade, observações e próxima data.

## MVP 0.2 (implementação inicial, ainda não validada em Android)

- Captura/seleção de até 6 fotos JPEG/PNG por execução.
- PDF técnico por execução e menu de compartilhamento.
- Backup JSON v2 exportável, importação validada com confirmação destrutiva.
- Migração SQLite da base anterior.

## Próxima iteração local

- Rota com múltiplos itens e posições ordenadas; ponto de lubrificação com produto, quantidade, frequência e instrução.
- Otimizar fotos, relatórios consolidados por rota e assinatura técnica opcional.
- Criptografar backups e permitir arquivos grandes com exportação em streaming.
- Notificação local de vencimento e filtros por setor, tipo e prioridade.
- Testes automatizados para cálculo de periodicidade, integridade do histórico e migração de banco.

## Expansão SaaS

Organização (empresa), membros (papéis: admin, supervisor, técnico), inventário de ativos, modelos de rota, atividades atribuídas, execução com evidências, histórico, painel web, exportação PDF, faturamento. Sincronização offline-first exige política de conflitos e IDs imutáveis.

## Métricas de validação

- Quantos profissionais usam o app 2+ vezes por semana.
- Quantas atividades concluídas são registradas por usuário.
- Percentual que gera ou compartilha relatório.
- Quantas pequenas equipes pedem acesso multiusuário.
- Quantas aceitam pagar após 30 dias de teste.

## Preços para hipótese, não ainda validados

Gratuito individual, Profissional R$29,90/mês, Equipe (até 5) R$149,90/mês. Testar disposição a pagar antes de integrar cobrança.
