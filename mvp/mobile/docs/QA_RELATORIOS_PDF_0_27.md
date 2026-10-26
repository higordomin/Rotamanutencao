# QA — RotaManutenção 0.27.0 | Relatórios técnicos PDF

## Escopo
- Base direta: `feat/mvp026-limpeza-segura-execucao-rapida`. Nunca atualizar o `main` inicial nem remover branches de recuperação 0.24–0.26 sem revisão.
- App individual e offline. **Nenhuma nova tabela, migração, upload, assinatura automática ou mudança no JSON de backup v11.**
- APK QA `br.com.rotamanutencao.qa`, versão 0.27.0, `versionCode=270`. Instalar sobre a QA anterior somente após backup externo.

## Entregas
1. OS individual: PDF A4 consistente, identificação da execução, TAG/equipamento, especialidade, resultado concluído/parcial, datas, observações e fotografias, sem inventar assinatura ou aprovação.
2. Rotas: PDF A4 com totais executados, anomalias e não executados, pontos/tags/justificativas e fotos com legenda. Nunca exibe quantidade/lubrificante exigidos por outras especialidades.
3. Consolidado: período de até 90 dias; escolha da especialidade recolhida por padrão. **Todas** inclui OS, rotas e pendências; ao selecionar Mecânica/Elétrica/Inspeção/Segurança/Lubrificação apresenta somente as OS daquela categoria, suas fotos e pendências; as rotas **não são atribuídas artificialmente** a uma categoria.
4. Proteção: escape HTML em texto livre, MIME base64 restrito, limites de até 24 fotografias e 16 MB no total, imagens ausentes geram erro explícito, PDFs sem dados não são inventados.
5. Saída via `expo-print`/compartilhamento local Android, sem conectividade e sem gravação de dados em SQLite.

## Verificação automatizada
- `npm run check`: TypeScript.
- `npm test`: modelos de PDF puros, teste de recorte por categoria, regressões v0.1–v0.26.
- `python3 tests/sqlite_smoke.py`: estrutura e operações SQLite.
- `npx expo export --platform android --output-dir dist`: empacotamento.
- Build nativo APK QA: workflow Android APK de teste.

## Aceitação no aparelho
1. Exportar backup completo, **salvar fora do app e verificar** antes de instalar a 0.27. Nunca desinstalar/limpar dados.
2. Gerar PDF de OS com fotos e com caracteres `<`, `&`, acentos e quebras de linha; verificar texto, qualidade, datas e compartilhamento.
3. Gerar PDF de OS parcial: estado parcial destacado, sem data de nova conclusão ou falso atestado.
4. Executar rota multidisciplinar com anomalia e ponto não realizado, finalizar, gerar PDF, conferir 3 resultados e anexos.
5. No consolidado, testar **Todas** e individualmente Elétrica, Mecânica, Inspeção, Segurança e Lubrificação. Conferir que não aparecem OS de outros tipos quando filtrado e que rotas ficam fora dos filtros específicos.
6. Gerar sem fotos e com fotos; testar 25 fotos e 16 MB em base de QA descartável, verificando erros claros sem perda de dados.
7. Verificar legibilidade A4, quebra de página, anexos e compartilhamento WhatsApp/salvar no dispositivo; a experiência pode variar conforme o Android.
8. Regressão: início limpo, criação/edição equipamentos e rotas, histórico, OS corretivas, agenda, lembretes, backup/restauração descartável, otimização não destrutiva 0.26.

**O sucesso da CI não equivale a validação visual no dispositivo físico.**
