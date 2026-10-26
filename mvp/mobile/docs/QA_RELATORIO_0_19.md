# RotaManutenção 0.19 — QA do relatório consolidado PDF

## Entrega
- Em **Dados → Relatório consolidado em PDF**, escolher Hoje, Últimos 7 dias, Últimos 30 dias ou intervalo personalizado no calendário.
- PDF técnico combina **execuções de OS (concluídas e parciais)**, **rotas finalizadas**, pontos executados, anomalias, pontos não executados e **pendências abertas na data da emissão**.
- Mostra resumo quantitativo, especialidade, equipamento/TAG como retrato textual, data, motivo, lubrificante, gramas e observações. Fotos de OS e pontos de rotas entram por opção explícita.
- Compartilhamento local pelo menu do Android, compatível com salvar ou WhatsApp; nenhum envio automático para servidores.
- O sistema **não altera** o banco, recorrências, fotos, ordem de histórico ou o formato do backup.

## Corte temporal e precisão
- Intervalo máximo de 90 dias (inclusive).
- OS entram pela data/hora de **execução**, convertida para o dia local do celular; rotas pela data de **finalização**.
- Pendências listam OS **atuais**, ativas e pendentes, com bloqueio, execução parcial ou vencimento anterior à data local. Não representam o estado retroativo no intervalo, e essa distinção aparece no PDF.
- Rotas em andamento não entram como rotas finalizadas.
- Até 200 execuções de OS, 100 rotas finalizadas, 300 pontos de rota e 200 pendências atuais. Limites excedidos **geram erro explícito**, não relatórios cortados silenciosamente.
- Com fotos: até 24 imagens no relatório, 5 MB por arquivo, 16 MB no conjunto. Excesso/missing image = erro claro, com opção de intervalo menor ou de desmarcar fotos.
- Relatório vazio sem pendências não gera PDF.

## Compatibilidade
- Mesmo SQLite, mesmo backup JSON **v10** (exporta e importa versões 2–10).
- Versão Android **0.19.0**, versionCode **190**, variante QA `br.com.rotamanutencao.qa`, mesmo certificado QA de 0.18.
- App offline/individual, sem contas/nuvem/supervisão.
- PR empilhado sobre o MVP 0.18.

## Testes
1. `npm run check`, `npm test`, `npx expo export --platform android --output-dir dist`, `python3 tests/sqlite_smoke.py`.
2. Criar OS com execução concluída, outra parcial, rota finalizada com anomalia e foto, e uma OS bloqueada. Gerar PDF para Hoje e Últimos 7 dias.
3. Conferir contagens e pendências atuais, especialidade e datas. Checar fotos de OS e rota, incluindo o caso de um arquivo ausente (mensagem, sem PDF enganoso).
4. Desmarcar fotos, gerar PDF sem anexos e salvar/compartilhar.
5. Testar data final anterior à inicial e intervalo acima de 90 dias: erro sem alterar registros.
6. Conferir no celular que acentos e caracteres HTML (<, >, &) são renderizados como texto legível e que tabelas não cortam os dados.
7. Testar PDF com rotas excluídas do cadastro, preservando históricos finalizados.
8. Exportar backup v10 no 0.18, instalar APK QA 0.19 **sobre o anterior, nunca desinstalar**, conferir rotas/OS/fotos e backup.
9. Conferir assinatura Android, CI e build nativo.
10. A aprovação de CI não substitui validação física, inclusive compartilhamento pelo WhatsApp, impressão e tamanho de PDF.

## Próximos incrementos candidatos
- 0.20: fluxo de registro rápido e reutilização de apontamentos de graxa por ponto, sem alterar históricas.
- 0.21: calendário operacional por periodicidade e janelas de execução.
