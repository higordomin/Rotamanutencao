# RotaManutenção 0.36 — Importação de MPs (primeira entrega)

## Objetivo
Importar arquivos autorizados **XLSX** ou **CSV** exportados do IBM Maximo, diretamente no Android e sem rede. O arquivo de exemplo da unidade **não** fica no código-fonte nem no GitHub.

## Mapeamento
- MP → identidade estável \`mp_code\`, com unicidade SQLite.
- Descrição → título da atividade, sem repetir manualmente.
- Descrição Ativo → rótulo do equipamento na atividade; **não** cadastra ativo automaticamente.
- Duração → minutos previstos (\`HH:MM\`).
- Frequência + Unidade → intervalo em dias; quando o título concorda (MENSAL, BIMESTRAL, TRIMESTRAL, QUADRIMESTRAL, SEMESTRAL, ANUAL), usa meses do calendário na execução.
- Data Reprogramada válida, senão Data Prevista válida → primeira programação. Essas colunas **não** são identificadas como "Fim Programado" da O.S. gerada.
- Última OS criada → referência histórica, não deve ser exibida como número de uma nova ordem.
- Posição numérica → não é nome de setor e portanto não deve ser exibida como tal.
- Descrição da tarefa → **não** existe nesse relatório de MP; não preencher com textos inferidos.

## Garantias
- Exige prévia + confirmação antes de importar.
- Importação transacional: erro de banco desfaz inclusão parcial.
- Ignora MPs já cadastradas, incluindo arquivadas; não altera registros ou histórico existentes.
- MPs sem data válida são contadas e não são agendadas com vencimento artificial.
- Arquivos não enviados à rede e não incorporados ao backup; **os dados efetivamente importados** entram no backup JSON v12.
- Restaura backups legados v2–v11 (metadados novos usam valores padrão).
- Manual de atividades existente continua funcional.

## Teste de aceitação (em aparelho de testes)
1. Exportar e verificar um backup da instalação 0.35, fora do aplicativo.
2. Instalar APK QA 0.36 por cima do QA anterior; não limpar os dados.
3. Atividades → Importar MPs (Excel/CSV) → selecionar arquivo.
4. Conferir prévia: quantidade, vencimentos, duração, modalidade de recorrência e avisos. No exemplo recebido em novembro/2026 são 65 MPs com 2 sem data válida nas colunas de programação.
5. Confirmar; repetir a importação e confirmar que as MPs existentes não se duplicam.
6. Executar uma MP mensal completa; conferir próxima data a partir do dia da execução, em mês de calendário.
7. Registrar execução parcial; confirmar que não reagenda.
8. Exportar backup JSON v12, restaurar em ambiente seguro, comparar MPs e histórico.
9. Conferir as OS manuais, equipamentos, rotas, fotos e notificações da 0.35.

## Limitações desta entrega
- Não busca informações por login ou API do Maximo.
- Não lê PDFs individuais de O.S. nem a seção de tarefas.
- MPs sem data válida aguardam exportação corrigida ou cadastro manual.
- Não sincroniza futuras O.S. novas geradas no Maximo, nem atualiza MPs já importadas.
- Importa o primeiro separador XLSX; modelos de outras versões do Maximo exigirão mapeamento adicional.

Nunca armazenar arquivos internos da empresa em repositório público.
