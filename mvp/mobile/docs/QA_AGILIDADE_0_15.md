# RotaManutenção — MVP 0.15: agilidade do técnico na operação

## Objetivo
Reduzir retrabalho de digitação e permitir encontrar rapidamente OS de maior prioridade no chão de fábrica, sem alterar histórico, SQLite ou backups.

## Entrega
- Botão **Duplicar** nas OS ativas: abre formulário com título, descrição, especialidade, prioridade, equipamento/TAG e periodicidade iguais aos da origem.
- **Prazo da nova OS é hoje**, independentemente da data original. O técnico deve revisar a data no calendário antes de salvar.
- Salvar cria **nova OS pendente** com identificador novo no SQLite; não copia bloqueio, status parcial/concluído, arquivos, eventos ou execuções da origem.
- OS arquivadas não possuem atalho de duplicação; regra de domínio também rejeita duplicação de registro arquivado.
- Filtro **Prioritárias** na aba OS: atividades ativas, pendentes e de prioridade Alta, incluindo impedidas (porque exigem providências).
- Não altera o filtro **Concluídas**, que continua exibindo execuções históricas.

## Compatibilidade
- Sem migração SQL e sem mudanças no formato de backup JSON **v8**.
- Mesmo identificador da variante QA `br.com.rotamanutencao.qa` e mesma política de assinatura.
- Versão 0.15.0, `versionCode=150` (0.14 tinha 140).
- Branch empilhada sobre `feat/mvp014-protecao-historico`; não aplicar a `main` sem revisão de toda a sequência.
- App offline, uso individual, sem contas ou sincronização.

## Testes
1. Rodar `npm run check` e `npm test` em `mvp/mobile`.
2. Rodar `npx expo export --platform android --output-dir dist`.
3. Rodar `python3 tests/sqlite_smoke.py`.
4. Confirmar no Android o filtro **Prioritárias**: Alta pendente/impedida entra, Média e Concluída não.
5. Duplicar OS recorrente com histórico e fotos: confirmar dados preenchidos, prazo de hoje e **novo ID** após salvar.
6. Confirmar que original, fotos, bloqueio, histórico e programação anteriores continuam intactos.
7. Atualizar APK QA 0.14 para 0.15 **sem desinstalar**, somente após exportar backup v8 e conferir SHA-256 do certificado.
8. Teste físico de restauração somente em ambiente descartável; não declarar produção homologada por CI verde.

## Critérios para liberação
Testes de CI e compilação nativa Gradle/assinatura QA; validação manual em Android físico, inclusive abertura de formulário com teclado, calendário e ciclo de execução após duplicar.

## Próximas melhorias candidatas
Atalhos por TAG no checklist e análise de tempo de execução da OS (início/término) como etapa separada, sem alteração silenciosa do banco ou histórico.
