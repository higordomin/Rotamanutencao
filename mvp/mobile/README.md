# RotaManutenção Android — MVP 0.2

Aplicativo **individual, sem login e sem sincronização**, com persistência em SQLite no aparelho.

## Funcionalidades nesta versão

- Cadastro de equipamentos, atividades e periodicidade em dias.
- Conclusão de atividade com observações, reagendamento e histórico.
- Até **6 fotografias JPEG/PNG por execução**, capturadas pela câmera ou escolhidas na galeria. Limite de **5 MB por fotografia**.
- Relatório PDF individual de execução com campos técnicos e fotos, gerado offline e compartilhado pelo menu nativo Android.
- Exportação de backup JSON versão 2 com **todos** os registros e imagens em Base64, e restauração mediante confirmação para substituir os dados atuais.
- Migração não destrutiva da estrutura SQLite usada no MVP 0.1.
- Ao excluir uma atividade, os registros e fotos associados são excluídos; o app avisa antes.

## Rodar no Expo Go

Requer Node.js 22 ou superior e acesso à instalação de pacotes npm.

```bash
cd mobile
npm install
npx expo install --fix
npm run check
npx expo start
```

Para compilar APK de teste: `eas build --platform android --profile preview` após login/configuração EAS da sua conta.

## Arquivos de destaque

- `App.tsx`: 5 abas (Início, Atividades, Ativos, Histórico, Dados) e formulários.
- `src/db.ts`: SQLite, migração, execução com anexos e operações de restore.
- `src/evidence.ts`: câmera/galeria e fotos persistidas no sandbox do aplicativo.
- `src/report.ts`: PDF e compartilhamento local.
- `src/backup.ts`: validação, importação/exportação e recuperação dos anexos.
- `docs/QA.md`: testes manuais necessários para aprovação em Android.

## Cuidados com backup

**Backup é um arquivo JSON legível, NÃO criptografado.** Quem tiver acesso a ele pode visualizar dados e fotos. Escolha um destino privado ao compartilhá-lo. Confira se o arquivo foi salvo fora do aplicativo; não basta apenas abrir a janela de compartilhamento.

A exportação rejeita backups grandes (limite conservador de ~20 MB no tamanho de texto JSON; importação de até 60 MB). Esta é uma proteção de memória de uma versão de testes: exportação em streaming e compactação são tarefas futuras. **Desinstalar o app sem backup pode apagar todos os dados.**

Restauração **substitui** os dados locais existentes. O arquivo é validado antes da confirmação e as novas fotos são gravadas antes da troca transacional do banco. Caso haja falha, pode haver arquivos sem vínculo; o banco deve permanecer no estado anterior se a transação não concluir.

## Status de validação

- ✅ Sintaxe TypeScript/TSX e checagem estática com contratos simulados.
- ✅ Teste SQLite em memória: migração de v0.1, chaves estrangeiras e restauração.
- ✅ Testes lógicos: backup íntegro vs vínculos inválidos e escapamento de HTML de relatório.
- ⏳ Instalação completa das dependências e compilação real do projeto: não verificadas neste ambiente.
- ⏳ Testes no Android físico, permissões, impressão com fotos e importação/exportação pelo seletor do aparelho: pendentes.

Não há backend, autenticação, contas ou pagamento. Os dados não são enviados automaticamente a servidores. **O menu de compartilhamento envia o arquivo somente se o usuário escolher um aplicativo/destino.**
