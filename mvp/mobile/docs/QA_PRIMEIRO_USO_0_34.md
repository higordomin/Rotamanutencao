# QA 0.34 — Primeira utilização e acessibilidade

## Entregas
- Guia de 4 passos visível **somente quando a base está realmente vazia**: sem ativos, OS, rotas, execuções ou OS arquivadas.
- Explica que equipamento/TAG é opcional, como criar OS/rota, como registrar resultado e consultar histórico.
- Atalhos para criar OS, cadastrar equipamento e abrir Agenda. Os botões usam operações existentes, sem criar dados fictícios.
- Cabeçalhos com `accessibilityRole=header` em Início, Mais, Rotas, seleção de equipamentos, histórico e dados.
- Identidade Industrial Dark e alvos de toque das etapas 0.31–0.33 preservados.
- Código offline, sem nova tabela, sincronização, login ou alteração do backup JSON v11.
- QA 0.34.0, versionCode 340, mesmo identificador e assinatura que a QA anterior.

## Verificação
1. Antes da instalação, backup externo e validação; não desinstalar nem limpar dados de outro APK.
2. Em base de QA vazia, guia aparece em Início; toque em Criar OS e em Cadastrar equipamento — nenhum registro é inserido antes de confirmar os formulários.
3. Criar um equipamento: guia desaparece e painel de manutenção aparece; fechar/reabrir mantém esse comportamento.
4. Testar base contendo somente execuções antigas, somente OS arquivada e somente rota: o guia não deve voltar indevidamente.
5. Testar OS sem TAG; cadastro de equipamento é opcional.
6. Usar leitor de tela e fonte ampliada nas cinco abas, no modal TAG e na execução guiada; confirmar foco e títulos legíveis.
7. Testar novamente navegação, dados, backups, relatórios, notificações e todas as funcionalidades de 0.30.
8. Validar aparelho de 360 dp, modo paisagem quando permitido, tamanhos de fonte e alvos de toque.
9. Confirmação final: TypeScript, testes Node, smoke SQLite, exportação Android e APK de desenvolvimento.
10. Não mesclar branches na main antes dos testes em Android físico.

## Limpeza GitHub
Auditoria por nome de arquivos e diretórios de 0.30–0.34: os roteiros de QA antigos representam histórico de regressão e as branches anteriores formam as bases dos PRs atuais. Não foram encontrados arquivos cuja exclusão fosse comprovadamente segura e útil nesta atualização, portanto **nenhum foi removido**. Excluir histórico não acelera o aplicativo nem os testes Node realizados.
