# QA 0.32 — Execução guiada de OS e rotas

## Entregas e preservação
- Pontos de rota pendentes oferecem **Executado, Anomalia e Não feito** em três alvos visuais de grande toque, com TAG/equipamento destacado.
- Anomalia e Não feito abrem o formulário existente de justificativa, foto e gravação; Não há salvamento automático desses estados.
- Execução rápida conclui somente pontos pendentes sem texto/fotos editados, pela função testada `mayQuickCompletePoint`.
- Observações e fotografias ficam no botão **Adicionar foto ou observação**, sem remover opção de edição de registros.
- OS: escolha visual clara de Concluído ou Parcial e modelos de anotação recolhidos por padrão. Preservação de resultados parciais e histórico.
- Visual Industrial Dark aplicado à tela de Rotas; botões principais com alvo de toque 48dp.
- **Nenhuma migração, alteração do SQLite, do backup JSON v11 ou da lógica que grava OS e rotas**.
- Pacote QA 0.32.0, versionCode 320, ID e assinatura mantidos.

## Verificações obrigatórias no Android
1. Exportar backup externo verificado e instalar 0.32 em cima da QA 0.31; não remover app nem limpar dados.
2. Abrir rota com vários pontos; confirmar barra de progresso, lista de TAGs e acesso a cada ponto.
3. Toque em **Executado** e confira apenas um registro. Repita rapidamente e confirme ausência de duplicação.
4. Toque em **Anomalia** e **Não feito**: conferir que a justificativa é exigida e o histórico permanece após salvar.
5. Adicionar fotografia, voltar e reabrir detalhes: não usar execução rápida se há edição ou fotos pendentes.
6. Editar ponto já registrado: a UI deve permitir corrigir notas/status pelos mesmos mecanismos anteriores.
7. Abrir anomalia e criar OS corretiva vinculada: não pode criar duas OS por toque repetido; os vínculos permanecem.
8. Na OS, salvar resultado completo e parcial; parcial mantém OS aberta e não reagenda automaticamente.
9. Testar modelos de anotação, fotos, PDFs, agenda e retorno da tela; nenhum campo antigo deve ser descartado silenciosamente.
10. Verificar visibilidade dos três botões em 360 dp, fonte ampliada, ambiente sem sinal e transição para segundo plano.

## Critérios
Testes Node, TypeScript, SQLite e Expo Android aprovados. Build APK assinado QA com versionCode=320 e certificado estável. Não mesclar na main antes da verificação no aparelho.
