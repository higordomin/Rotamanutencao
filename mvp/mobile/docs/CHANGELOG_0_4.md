# Revisão técnica — 0.4.0

## Correções e melhorias

1. **Concorrência/OS desatualizada:** ao concluir, o sistema valida a versão (`updated_at`), situação, bloqueio, data e periodicidade antes de copiar fotos e novamente na transação SQLite. Uma alteração posterior exige recarregar os dados, evitando lançar execução a partir de um formulário antigo. O histórico captura a TAG/nome/área existentes no momento da gravação.
2. **Restauração robusta:** os nomes de arquivos são registrados antes da escrita, para limpeza também de uma cópia incompleta. A substituição das linhas SQLite continua transacional. Fotos antigas são removidas somente depois do commit.
3. **Cópia de fotografia:** tentativa de remover arquivo incompleto quando falha a operação de cópia.
4. **Backup coerente:** consultas ao SQLite realizadas dentro de uma transação exclusiva (snapshot), em vez de cinco leituras independentes concorrentes. Backup permanece JSON v3, compatível com v2.
5. **Pesquisa real por TAG e área** em atividades, em vez de somente nome do equipamento.
6. **Uso no chão de fábrica:** anotação rápida de execução com edição livre; painel mostra também quantas atividades impedidas já passaram do prazo; dashboard limitado a 8 cards por seção com opção de abrir toda a lista; histórico carrega 40 execuções por etapa, preservando acesso às demais.
7. **Diagnóstico e CI:** adicionados testes isolados para alteração concorrente e arquivos parcialmente copiados; CI tenta compilar bundle Metro Android; caminhos de gatilho de workflow corrigidos.
8. **Dependências:** React Native ajustado para 0.86.3, versão mantida pelo Expo SDK 57 após correção publicada em agosto de 2026.

## Validação efetivamente concluída

- `npm test` (21 testes de regras e restauração): aprovado localmente.
- `python3 tests/sqlite_smoke.py`: aprovado localmente.
- Parser TypeScript/TSX: sem erros de sintaxe.
- **Não validado:** `npm install`, `npm run check` contra tipos reais do Expo, exportação Metro, APK/EAS, Android físico, PDF/câmera, escrita real sob pouco armazenamento.

## Bloqueios restantes de liberação

- GitHub Actions deve executar no PR após instalar dependências do registro npm. Inspecionar logs e corrigir erros de compilação, caso existam.
- Criar build EAS preview com conta Expo autorizada; instalar Android e executar roteiro `QA_ACCEPTANCE.md`.
- Restauração JSON ainda contém fotos sem criptografia. Exigir mídia privada e validação de integridade antes de uso com qualquer dado sensível.
- Em fábrica, não armazenar fotos ou informações de terceiros sem autorização.

## Priorização PCM × execução

A OS precisa apresentar **atividade**, **TAG**, **prazo**, **prioridade** e **impedimento**, e o técnico deve conseguir registrar conclusão e evidências rapidamente. A tela de PCM empresarial futura deve extrair indicadores de motivos de bloqueio, preventivas executadas/atrasadas e equipamentos com pendências — sem inferir dados inexistentes.
