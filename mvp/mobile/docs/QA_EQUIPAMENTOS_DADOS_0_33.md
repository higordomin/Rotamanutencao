# QA 0.33 — Equipamentos, histórico e dados mais intuitivos

## Escopo
- Lista de equipamentos: TAG em destaque, nome, setor, quantidade factual de OS e painel de ações que só abre ao tocar na TAG. Cadastro inicial orientado quando não houver equipamentos.
- Seletor de TAG em OS/rotas: título mais claro, busca visível, linhas com TAG maior e marcação gráfica do ID selecionado; confirmação explícita "Usar TAG". Não altera a seleção ao cancelar.
- Relatórios e dados: três áreas **Relatórios**, **Lembretes** e **Backup e dados** em vez de painéis todos expandidos simultaneamente.
- Histórico: contagem factual de execuções, orientações mais diretas; links por equipamento, por ID, PDFs e fotografias preservados.
- Sem alterações de schema SQLite, backups JSON v11, chave do equipamento, pendências ou fotos.
- QA 0.33.0, versionCode 330, pacote e assinatura QA constantes.

## Verificação no Android
1. Backup externo confirmado e instalação sobre QA 0.32. Nunca desinstalar nem limpar dados.
2. Entrar em Mais → Equipamentos; procurar pela TAG, nome e setor; expandir cartão, criar OS, ver atividades e histórico.
3. Abrir seleção de TAG em OS e rota; marcar uma TAG, cancelar: **não deve alterar** a seleção anterior. Confirmar: deve preservar ID correto, mesmo com TAGs semelhantes.
4. Listas grandes (100+ equipamentos), filtros por setor e paginação: verificar responsividade, lista vazia e acentos.
5. Mais → Relatórios e dados: alternar três seções; conferir que os botões continuam disponíveis sem duplicidade.
6. Gerar PDF de período, configurar aviso, conferir backup JSON, validação, diagnóstico e restauração **apenas em base descartável**.
7. Confirmar que navegação e visual da 0.31 e execução da 0.32 foram preservados.
8. Validar visão em Android 360dp, 390dp, fonte ampliada e offline.

## Higiene
Documentação antiga contém roteiros de regressão e referências; preservar. Nenhuma exclusão foi considerada comprovadamente segura/necessária nesta etapa.
