# QA — RotaManutenção 0.25.0 | Cadastro e seleção de equipamentos

## Base e integridade
- Branch baseada diretamente em `feat/mvp024-anomalias-os-corretivas`, preservando anomalias, OS corretivas, rotas, histórico e backup JSON v11.
- **Sem migração** SQLite; `Asset.id` continua a ser a identidade estável e nenhuma operação é disparada ao pesquisar/abrir o seletor.
- `version=0.25.0`, `versionCode=250`, pacote QA `br.com.rotamanutencao.qa`. Assinatura QA mantida pelo workflow.
- Offline e individual; sem login, nuvem, sincronização nem quantidade de lubrificante.

## Mudanças
1. Aba Ativos: TAG em destaque, nome + setor, quantidade de atividades, detalhes recolhidos por padrão; busca por palavras, TAG, nome e setor.
2. Filtros por setor e ordenação numérica de TAG (EQ-2 antes de EQ-10). Lote inicial de 30 com **Mostrar mais**, sem corte silencioso.
3. Seletor único `AssetPicker` em **Atividades (criar/editar OS)** e **Rotas (criar/editar ponto)**.
4. Seletor apresenta busca fixa, setores, `FlatList` virtualizada, seleção por ID e botão **Confirmar**; **Cancelar** não altera formulário. Em OS é permitido limpar; em ponto de rota é obrigatório selecionar.
5. Se o equipamento anteriormente associado sumiu do cadastro, exibir aviso, sem atribuir automaticamente outra TAG parecida.

## Testes de aceitação no Android
- Faça backup v11 na versão instalada ANTES de atualizar por cima. **Não desinstale o aplicativo**, pois apagaria dados locais.
- Cadastre 100+ equipamentos de teste (ou restaure backup descartável). Pesquise por TAG parcial, nome, setor, acentos, letras maiúsculas e múltiplas palavras.
- Filtre por setor; use **Mostrar mais** até o fim. Confirme TAGs `EQ-2` e `EQ-10` em ordem natural e nenhuma linha perdida.
- Crie uma OS; abra seletor, marque uma TAG, cancele — formulário continua inalterado. Reabra, selecione outra, confirme e salve; edite a OS e confira vínculo.
- Crie uma rota e dois pontos com equipamentos distintos; edite o equipamento de um ponto, confira que outro não mudou.
- Teste `Limpar` no formulário de OS. Não permita salvar ponto de rota sem equipamento. Simule equipamento excluído e confirme que o seletor exige nova escolha.
- Feche/reabra o app. Verifique histórico por ID, anomalias e OS corretivas da 0.24, fotos, PDF, agenda e backup/restauração em base descartável.
- Teste teclado Android, scroll após pesquisar, botão físico Voltar, alvos de toque e uso sem sinal.

## Automação
```sh
cd mvp/mobile
npm install --no-audit --no-fund
npm run check
npm test
python3 tests/sqlite_smoke.py
npx expo export --platform android --output-dir dist
```
O PR aciona CI de código e o workflow **Android APK de teste**. Só considerar validado depois de jobs verdes e teste prático no aparelho.

## Limitações
- Não há cadastro direto dentro do seletor: o técnico deve criar o equipamento na aba Ativos antes de vinculá-lo.
- O registro de anomalia da 0.24 já usa a TAG do ponto; quando gera OS corretiva, preserva o ID do equipamento, sem necessidade de escolher novamente.
- Não alterar o banco nem o formato de backup: JSON v11 continua válido.
