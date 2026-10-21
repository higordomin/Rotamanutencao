# RotaManutenção 0.9 — Fotos nos pontos das rotas

## Novidades
- Cada ponto de uma execução de rota aceita até **4 fotos** do celular (câmera ou galeria).
- As imagens são copiadas para a pasta privada do aplicativo e associadas ao ponto no SQLite.
- O formulário mostra as fotos existentes e novas miniaturas. Uma foto nova pode ser removida **antes** de salvar.
- As fotos entram na seção de evidências do **PDF consolidado**, associadas ao equipamento e ao ponto de checklist.
- O backup JSON avança para **v6**: inclui fotos das OS e dos pontos de rota, com validação de referências e limite por ponto. Importa v2/v3/v4/v5/v6.
- Não há login, nuvem nem compartilhamento automático. Os registros continuam no aparelho.

## Proteção dos dados
A migração do SQLite é aditiva: cria `route_run_photos` sem excluir tabelas ou registros anteriores.
As fotos novas são copiadas antes do commit SQLite e limpas se a transação falhar.
O restauro de arquivos v6 usa preparação em pasta privada antes de trocar o banco em transação: erros devem preservar os dados antigos.
Histórico e fotografias de um ponto permanecem ligados à execução, mesmo que o cadastro da rota seja removido.

## Como atualizar de 0.8 para 0.9
1. Na 0.8, **exporte backup v5** e salve fora do aplicativo; confira seu tamanho.
2. Instale o APK 0.9 sobre 0.8, sem desinstalar. O ID QA continua `br.com.rotamanutencao.qa`; `versionCode` passa de 80 a 90.
3. Confira TAGs, OS, histórico de rotas anteriores e PDFs.
4. Cadastre ou inicie uma rota de teste. Registre uma **Anomalia** com texto, uma foto e resultado salvo.
5. Verifique a miniatura, feche/reabra offline, gere o PDF: a imagem deve aparecer com o ponto correto.
6. Registre outro ponto com duas fotos e confira o limite de quatro imagens.
7. Exporte backup v6 e entre em **Dados → Verificar arquivo**; confira o número de fotos dos pontos.
8. Restaure somente em instalação separada de testes ou com dados descartáveis. A restauração **substitui os registros existentes**.
9. Confirme que fotos, anomalias, OS, histórico e PDF continuam disponíveis após a restauração.

## Limitações e segurança
- As fotos salvas em pontos não podem ser excluídas individualmente pela interface nesta versão. Uma foto nova pode ser descartada antes de salvar.
- Relatórios com mais de 16 MB de fotos serão recusados para evitar esgotamento de memória do Android; nesse caso, é necessário dividir a rota/relatório.
- Backups v6 **não são restauráveis por APKs antigos**. Guarde a cópia v5 anterior.
- Backup JSON contém imagens sem criptografia; não compartilhe material confidencial da fábrica sem autorização.
- Não substitui procedimentos de segurança industrial, liberação para manutenção ou LOTO.
- A assinatura QA é de testes, não certificada para publicação comercial.

## Critérios de QA
CI Node, TypeScript, Expo bundle, SQLite migration/snapshot, Gradle e certificado precisam passar; depois confirmar os fluxos em dispositivo real. Não declarar sucesso no Android sem teste do usuário.
