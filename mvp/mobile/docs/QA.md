# Checklist de validação Android — RotaManutenção 0.2

Use **somente dados de testes inventados ou autorizados**. Não inserir informações confidenciais de empregadores.

## Preparação

1. Instale dependências (`npm install`, `npx expo install --fix`, `npm run check`).
2. Inicie pelo Expo Go compatível com o SDK do projeto ou gere APK de preview no EAS Build.
3. Abra com Wi-Fi e dados móveis desligados: criar equipamento e atividade deve funcionar normalmente.

## Fluxos principais

- [ ] Cadastrar e editar equipamento TAG-001; vincular atividade mensal.
- [ ] Criar uma atividade avulsa e uma recorrente (30 dias); recusar data inválida.
- [ ] Executar atividade com texto; salvar uma foto da câmera e outra da galeria.
- [ ] Conferir que as fotos aparecem em Histórico mesmo após fechar e reabrir o aplicativo.
- [ ] Gerar PDF com as duas fotos e observações; conferir abertura e compartilhamento pelo Android.
- [ ] Gerar PDF com caracteres `<`, `&` e aspas nas observações (devem aparecer como texto, não HTML).
- [ ] Exportar backup; **salvar o JSON fora do app**; verificar que o arquivo está presente.
- [ ] Criar um novo equipamento temporário; restaurar o backup; verificar que o temporário desapareceu e registros/fotos originais voltaram.
- [ ] Cancelar restauração no diálogo: nenhum dado deve mudar.
- [ ] Testar arquivo JSON inválido e backup incompatível: restauração deve ser impedida.
- [ ] Testar permissão negada para câmera e cancelamento do seletor de fotos.
- [ ] Excluir uma atividade com foto e verificar aviso e remoção do histórico.
- [ ] Testar migração em instalação que já contém dados da versão 0.1, **sem desinstalar**.
- [ ] Testar armazenamento quase cheio, interrupção do app e backup com mais fotos.
- [ ] Verificar que não existe login, transmissão automática, anúncios, rastreadores ou acesso de empresa.

## Critérios para promover PR a pronto

- `npm run check` passando com dependências reais do Expo.
- APK gerado, instalado e testado em Android.
- Todos os casos críticos de persistência e restauração acima aprovados.
- Revisão técnica de tratamento de dados e de performance dos arquivos de fotos.
