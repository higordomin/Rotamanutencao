# RotaManutenção — QA da versão 0.16 (fluxo por TAG)

## Objetivo
Melhorar a operação em campo para lubrificação, mecânica, elétrica e inspeção: localizar um equipamento, abrir rapidamente uma OS vinculada e visualizar os seus registros sem depender de Internet.

## Funcionalidades
- Na aba **Ativos**, pesquisa imediata de equipamento por **TAG, nome ou setor** (ignora caixa e acentos).
- Cada equipamento possui **+ Nova OS**, que abre o formulário normal com o ativo correto já selecionado.
- **Ver OS** mostra as ordens ativas vinculadas ao ID exato do ativo; o filtro também funciona para OS arquivadas.
- **Histórico** mostra as execuções com o retrato de equipamento idêntico ao cadastro atual, incluindo eventos parciais; **Concluídas** continua exibindo somente as conclusões de fato.
- Um aviso de **TAG selecionada** permite limpar o filtro e criar outra OS vinculada rapidamente.
- Navegar manualmente pela barra inferior volta à visão geral (sem filtros invisíveis).

## Limite conhecido do histórico por TAG
Nesta versão não se adiciona uma coluna nova de vínculo histórico nem se migra backup. As execuções guardam um retrato textual com TAG/nome/setor no instante da operação. A comparação exata evita juntar TAGs com prefixos parecidos, mas uma renomeação de TAG/nome/área pode fazer registros antigos aparecerem somente em **Histórico geral**. O histórico não é apagado, regravado ou alterado. A consulta em tela permanece limitada aos últimos 500 registros já definidos pela versão anterior. Não usar esse filtro como relatório de rastreabilidade auditada; vínculo por ID de equipamento imutável requer migração planejada de banco e backup.

## Compatibilidade e segurança
- Nenhuma modificação nas tabelas SQLite, históricos, fotos, PDFs ou backup local JSON **v8**.
- Mesmo pacote QA `br.com.rotamanutencao.qa`, mesmo certificado e política de assinatura; `versionCode=160` (0.15 tinha 150).
- Offline, individual, sem login, sincronização ou telemetria.
- Branch empilhada em `feat/mvp015-agilidade-os`; não publicar em `main` sem integrar/revisar as etapas anteriores.

## Aceitação manual Android
1. Fazer exportação de backup local v8 antes de instalar nova versão. Atualizar sobre 0.15 SEM desinstalar.
2. Em Ativos, pesquisar `M-101`, `miudos`, nome e área. Resultado deve ser coerente com o cadastro.
3. Usar **+ Nova OS** de um ativo e confirmar que TAG/equipamento correto está pré-selecionado, sem outros campos preenchidos indevidamente.
4. Salvar OS, verificar que aparece no ativo, em Ver OS e no planejamento normal.
5. Confirmar que filtrar TAG A não traz OS da TAG B com código parcialmente parecido.
6. Executar OS com foto, verificar histórico geral e histórico da TAG, incluindo PDF e sem fotos perdidas.
7. Arquivar uma OS; verificá-la na visão por TAG e restaurá-la, mantendo o histórico.
8. Renomear o equipamento com histórico: verificar aviso e integridade dos registros no histórico geral.
9. Validar navegação inferior sem filtro oculto; bloquear/liberar uma OS e conferir que o histórico existente não muda.
10. Conferir pacote, certificado QA, TypeScript, testes Node, export Expo, SQLite smoke e build Gradle.

## Próxima etapa
Planejar vínculo imutável `asset_id` em cada execução, com migração aditiva, atualização de formato de backup, restauração legada e testes reais antes de afirmar rastreabilidade permanente por TAG.
