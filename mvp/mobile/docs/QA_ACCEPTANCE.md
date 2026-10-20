# Plano de aceitação do RotaManutenção 0.3 (Android)

**Status:** nenhum teste em dispositivo foi concluído nesta entrega. A matriz abaixo é obrigatória antes da distribuição para uso real.

## Gate de qualidade e segurança

1. Instalar dependências com `npm install`, `npx expo install --check` e `npm run check` sem erros.
2. Executar `npm test` e `python3 tests/sqlite_smoke.py`.
3. Compilar APK `eas build --platform android --profile preview`; registrar URL, hash SHA-256, data, versão, aparelho e versão Android.
4. Fazer testes de regressão nos dados existentes **somente depois** de exportar backup e restaurá-lo em outro dispositivo/perfil de teste.
5. Desligar Wi-Fi e dados móveis antes de rodar o fluxo de campo. Nenhuma função básica pode depender de rede.
6. Não executar a aplicação com dados confidenciais de empregadores ou fotografias industriais sem autorização.

## Casos manuais (marcar após execução real)

| ID | Cenário | Resultado esperado | Status |
|---|---|---|---|
| A01 | Primeira abertura, sem internet | Banco criado, tela inicial carregada | Pendente |
| A02 | Cadastro/edição de ativo com TAG/área | Dados persistem após fechar e reabrir | Pendente |
| A03 | Criar preventiva com prioridade, ativo e periodicidade | OS aparece na lista e no calendário implícito | Pendente |
| A04 | Busca por TAG, nome e descrição com 2.000+ OS | Resultados corretos; lista rolável sem travar | Pendente |
| A05 | Filtro Pendentes / Impedidas / Concluídas | Exclusivos; impedimentos não desaparecem | Pendente |
| A06 | Registrar impedimento 'Aguardando peças' | OS bloqueada, motivo persistido, evento criado | Pendente |
| A07 | Tentar concluir uma OS impedida | A ação não permite execução até liberar | Pendente |
| A08 | Liberar impedimento | OS volta a pendente; histórico inclui liberação | Pendente |
| A09 | Concluir atividade avulsa | OS concluída; uma execução e um evento registrados | Pendente |
| A10 | Concluir recorrente atrasada de 30 dias | Próxima data calculada a partir do dia da execução | Pendente |
| A11 | Anexar câmera e galeria: 1 a 6 imagens | JPG/PNG persistem em armazenamento privado | Pendente |
| A12 | Testar imagem inválida e >5 MB | Rejeição com mensagem; nada corrompido | Pendente |
| A13 | Gerar PDF de execução com 6 imagens | PDF completo, legível, sem corte ou travamento | Pendente |
| A14 | Gerar PDF com acentos, &, < e texto longo | Texto corretamente escapado; imagens visíveis | Pendente |
| A15 | Exportar backup com fotos e impedimentos | JSON v3 criado; compartilhamento só por ação explícita | Pendente |
| A16 | Restaurar v3 em ambiente limpo | Quantidades, fotos, bloqueios e histórico preservados | Pendente |
| A17 | Restaurar backup legado v2 | Migração para o modelo de dados atual sem perda | Pendente |
| A18 | Backup com dados inválidos ou arquivo truncado | Rejeição antes de apagar registros | Pendente |
| A19 | Cancelar seleção/confirmacão de restauração | Dados permanecem intactos | Pendente |
| A20 | Reinstalação e perda proposital do banco de teste | Aviso de risco confirmado; recuperação só por backup externo | Pendente |
| A21 | Trocar de aplicativo e voltar após meia-noite | Indicadores e classificação por data atualizam | Pendente |
| A22 | Android modo claro/escuro, teclado aberto, fonte maior | Navegação, campos e botões acessíveis | Pendente |
| A23 | Interromper armazenamento durante cópia de foto | Execução permanece íntegra; erro apresentado | Pendente |
| A24 | Excluir ativo com OS vinculadas | OS permanece, vínculo removido com segurança | Pendente |
| A25 | Excluir OS com fotos e histórico | Exclusão confirmada e referências removidas | Pendente |
| A26 | Fechar e reabrir após 1 hora em segundo plano | O aplicativo carrega sem dados perdidos | Pendente |
| A27 | Restauração com pouco espaço em disco | Não sobrescrever registros atuais se fotos falharem | Pendente |

## Restrições conhecidas

- **Não há APK comprovadamente funcional** até passar pelo build e teste em Android real.
- JSON com fotos incorporadas não é criptografado; distribuir apenas por canais privados confiáveis.
- Backup de base grande possui limite conservador de exportação. Ainda não há arquivo incremental, streaming nem criptografia.
- Aplicativo **não substitui** procedimento de segurança, bloqueio e etiquetagem de energia (LOTO), liberação formal de serviço ou permissões operacionais.
- Histórico é associado à OS. Exclusão intencional de OS apaga suas execuções; exportar antes.
- Não há sincronização, contas, assinatura, controle de equipe nem sistema web nesta versão.

## Critério para versão 1.0 de produção

Zerar bugs bloqueantes nos cenários A01–A19 e A23–A27; observar uso real de um piloto autorizado em mais de um aparelho Android, medindo tempo de registro e frequência de falhas. Só anunciar distribuição comercial depois de auditoria de privacidade e recuperação de dados.
