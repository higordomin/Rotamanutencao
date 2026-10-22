# RotaManutenção 0.20 — QA de registro rápido de pontos

## Objetivo
Agilizar os apontamentos das rotas de lubrificação no chão de fábrica, sem login, internet, sincronização, supervisor ou exclusão dos dados existentes.

## Alterações
- Cada ponto pendente de rota aberta oferece **✓ Registrar executado (previsto)**, com nome e quantidade do lubrificante previamente cadastrados em destaque.
- O botão **não faz nenhuma medição**: o operador confirma explicitamente que o serviço foi realizado antes de tocar. O app registra a quantidade prevista como aplicada, sem observações ou fotos inventadas.
- O registro é feito na **mesma transação SQLite**, somente se o ponto ainda estiver pendente e a rota ainda estiver aberta. Dois toques simultâneos não resultam em duas gravações.
- O cadastro da rota e seu planejamento não são alterados.
- **Registrar com detalhes / anomalia** abre formulário existente: executado, anomalia ou não executado, quantidade diferente, observações e até quatro fotos. Nenhuma dessas funções foi removida.
- Formulários ficam recolhidos por padrão para reduzir rolagem. Pontos já registrados podem ser reabertos para correção manual.
- Os filtros **Todos / Pendentes / Ocorrências** permitem localizar rapidamente o que falta e o que requer retorno.
- Após gravar, o ponto sai imediatamente do filtro de pendentes; histórico e fotos anteriores são mantidos.

## Compatibilidade
- App 0.20.0, Android QA `br.com.rotamanutencao.qa`, `versionCode=200` e mesmo certificado dos builds QA anteriores.
- **Nenhuma migração SQLite** e nenhum campo novo no backup: JSON **v10** permanece compatível.
- Atualizar **por cima da 0.19**, sem desinstalar, após exportar backup externo.
- PR empilhado sobre `feat/mvp019-relatorio-consolidado`; não fazer merge em main isoladamente.

## QA automatizado
1. `npm run check`, `npm test`, `npx expo export --platform android --output-dir dist`, `python3 tests/sqlite_smoke.py`.
2. Rascunho rápido não altera dados anteriores e rejeita ponto inexistente ou já registrado.
3. Gramas inválidos (negativo, não finito, >100000 ou mais de 3 decimais) são rejeitados.
4. SQLite impede regravação de ponto já executado e bloqueia registro rápido após finalizar rota.
5. Filtros incluem apenas pendentes ou pontos com anomalia/não executado, mantendo a contagem.
6. O build deve validar ID QA, versionCode 200, assinatura e publicação do APK.

## Testes manuais no Android
1. Exportar backup externo e instalar 0.20 sobre o APK 0.19 sem desinstalar.
2. Criar rota com no mínimo três pontos de lubrificação: um previsto para 3,5 g, um para 0 g e outro com lubrificante diferente.
3. Iniciar a rota; observar a indicação explícita de que o atalho usa valores planejados.
4. Marcar como executado **somente após execução real**. Confirmar resultado, data, gramas, texto e ausência de fotos fabricadas.
5. Usar filtro Pendentes: ponto salvo deve desaparecer, e demais permanecer.
6. Em outro ponto, escolher **Registrar com detalhes / anomalia**, alterar quantidade, justificar e anexar foto; salvar e verificar filtro Ocorrências.
7. Verificar que voltar, continuar rota e visualizar o histórico não apagam os registros.
8. Ao finalizar rota, tentar registrar novamente: controles não devem permitir; SQL deve rejeitar.
9. Conferir relatórios da rota, consolidado PDF, OS existentes e backup v10.

## Próxima etapa
O calendário operacional diário com rotas e OS por recorrência, vencimento e pendências; a versão 0.20 não muda as regras de periodicidade.
