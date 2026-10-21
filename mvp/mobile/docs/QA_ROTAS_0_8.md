# RotaManutenção 0.8 — Rotas offline por equipamentos

## O que foi implementado

- Aba **Rotas** com cadastro de rotas por setor.
- Pontos por equipamento TAG, descrição do trabalho, graxa/lubrificante e quantidade prevista em gramas (até 3 casas decimais).
- Cada execução cria **um snapshot** dos pontos da rota, com ordem e identificação, para preservar o histórico mesmo se o cadastro mudar.
- Registro individual: **Executado**, **Anomalia**, **Não executado**. Anomalia/não executado exigem justificativa.
- Finalização exige todos os pontos registrados. Rotas com anomalias ou pontos não executados preservam esses estados no relatório, sem fingir que o serviço foi executado.
- PDF consolidado com data e resultados por ponto.
- Backup JSON **v5**, incluindo rotas, pontos, execuções e resultados; restaura v2/v3/v4/v5. A restauração substitui todos os dados mediante confirmação.
- Todas as operações continuam locais, offline e sem login.

## Migração e atualização

O app usa o **mesmo identificador QA** da versão 0.7.2 (`br.com.rotamanutencao.qa`) e versionCode **80**. O schema SQLite é aditivo: as tabelas novas são criadas sem apagar as OS, fotos e impedimentos.
O APK 0.8 é assinado com o certificado de desenvolvimento QA usado na 0.7.2, desde que a verificação automática do CI passe.
**Não desinstale** a 0.7.2 para instalar a 0.8; instale por cima.

O backup v5 não é compatível com versões antigas que suportam até o v4. Faça uma exportação v4 na versão antiga **antes** de atualizar, e mantenha essa cópia em local privado.

## Plano de teste Android

1. Antes da atualização: na 0.7.2, exporte um backup JSON, confirme que foi salvo fora do app.
2. Instale 0.8 por cima, usando **Atualizar**; confira TAGs, OS, PDFs e fotos antigos.
3. Cadastre dois equipamentos fictícios na aba Ativos.
4. Crie a rota `Lubrificação de teste` e dois pontos, um com graxa de exemplo e quantidade `3,5` gramas.
5. Inicie a rota. Registre o primeiro ponto como Executado.
6. Registre o segundo como Anomalia com justificativa maior que 10 caracteres.
7. Feche/reabra sem internet: o progresso deve permanecer registrado.
8. Finalize a rota e gere PDF; o segundo ponto deve aparecer como Anomalia, sem ser confundido com execução conforme.
9. Exclua um ponto do cadastro e confirme que o histórico da rota finalizada continua acessível.
10. Exporte o backup v5, use **Verificar arquivo** e confira os novos contadores.
11. Em outra instalação com dados fictícios, teste restauração v5 e confira integridade, registros e PDF.
12. Tente finalizar uma rota com ponto pendente: deve recusar.

## Limitações do MVP 0.8

- Anexos fotográficos continuam disponíveis nas **OS**, mas **fotos por ponto de rota** ainda não foram incluídas neste módulo.
- O módulo novo não agenda rotas periodicamente; mantém histórico de execuções manuais.
- Sem painel web ou sincronização PCM; projeto ainda não é SaaS publicado.
- PDF depende de compartilhamento disponível no Android.
- Não inclua informação real e confidencial da fábrica sem autorização.
- Segurança industrial/LOTO e liberação operacional precisam ser cumpridas fora do aplicativo.

## Critério de liberação

Aprovar TypeScript, bundle Expo, testes de regras, validação de backups, testes SQLite, Gradle e fingerprint do certificado; depois os testes físicos acima. Caso falhe qualquer etapa, não chamar a versão de validada.
