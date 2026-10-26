# QA 0.31 — Industrial Dark e navegação simplificada

## Escopo
Primeira etapa de redesign (0.31/0.32/0.33/0.34). Interface do app local no Android. Reorganiza **apresentação**, não dados.

- Barra inferior **Início | Agenda | OS | Rotas | Mais** com alvos de toque maiores.
- `Mais` contém equipamentos, histórico, relatórios/dados (inclui lembretes, backup, integridade).
- Subpáginas `Ativos`, `Histórico`, `Dados` mantidas internamente, incluindo link direto ao histórico de TAG existente.
- Back físico Android em uma subpágina de `Mais` volta ao menu `Mais` (modais conservam comportamento próprio).
- Novo início com três contadores mutuamente exclusivos da regra anterior, **uma próxima atividade prioritária** e até duas adicionais.
- Identidade Industrial Dark centralizada para Início, menu, cabeçalho, navegação e controles globais. Telas restantes são redesenhadas nas etapas 0.32–0.34.
- Os sete dias e os estados de OS/rota são **lidos dos dados existentes**, não criados ou concluídos pela interface.
- `app.json`: 0.31.0, versionCode 310, mesmo pacote e assinatura de QA.
- **Sem migrações** SQLite, sem mudança no JSON backup v11, sem acesso à nuvem, login ou compartilhamento de dados.

## Instalação e testes nativos
1. Exportar e guardar backup fora do aparelho antes de atualizar; **não desinstalar nem limpar os dados**.
2. Instalar QA 0.31 sobre QA 0.30, verificar TAGs, número de OS e rotas, históricos/fotos e notificações.
3. Confirmar exatamente cinco abas; `Mais` abre Equipamentos, Histórico, Relatórios e dados; botão físico voltar regressa corretamente.
4. Abrir OS/rota a partir do painel; concluir em banco de teste e conferir histórico e agenda.
5. Abrir histórico por equipamento via botão da TAG e confirmar que o filtro não é perdido ao navegar.
6. Confirmar que menu `Mais` não executa manutenção sozinho e não cria registros artificiais.
7. Conferir aparelhos 360/390/440 dp; fontes ampliadas e tela com várias OS atrasadas. Verificar contraste, truncamento, botões de toque ≥48dp.
8. Testar agenda clássica 0.21, modo Foco do turno 0.28, PDFs e alertas exatos da 0.30 sem regressão.
9. Inspecionar os APKs QA, package `br.com.rotamanutencao.qa`, versionCode 310 e assinatura consistente.
10. Verificar execução offline e restauração de backup **somente com dados descartáveis**.

## Higiene de repositório
A pasta `mvp/mobile/docs/` contém roteiros de QA das versões anteriores. **Não foram excluídos**: são evidências importantes para testes de regressão.
Branches antigas com PRs encadeados permanecem preservadas até consolidar mudanças.
Arquivos de código não foram apagados sem demonstração de que não são referenciados. Apagar históricos do Git não melhora o desempenho do aplicativo no celular.
