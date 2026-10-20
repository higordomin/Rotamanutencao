# RotaManutenção — MVP 0.4 (revisão de segurança, estabilidade e uso offline)

Aplicativo Android local para técnicos de manutenção e lubrificação, mecânica, elétrica e inspeção. **Sem login, nuvem, sincronização ou supervisão** nesta etapa.

### O que funciona no código

- Equipamentos com TAG e área, atividades recorrentes, prioridades, calendário implícito (prazo por OS) e histórico.
- Motivos de impedimento, liberação e trilha de eventos.
- Busca por título, descrição, TAG, área e equipamento.
- Registro de execução, anotações rápidas, fotos, relatório PDF e backup/restauração local.
- Proteção contra gravação sobre uma OS modificada, migrações SQLite e rollback em falhas.
- Painel reduzido e histórico paginado na interface para reduzir renderizações.

### Estado de qualidade

- 21 testes automatizados Node e smoke test SQLite passaram localmente; parser TS/TSX sem erros.
- **Não há APK compilado nem teste real em Android.** A instalação das dependências Expo não pôde ser feita neste ambiente. O CI tenta validar a exportação do bundle Android.
- Backup JSON com fotos não é criptografado. Não inserir dados industriais confidenciais sem autorização.

### Próximas etapas

1. Verificar GitHub Actions e concluir typecheck/bundle Android com dependências reais.
2. Compilar APK preview pelo EAS, executar a matriz manual em `mobile/docs/QA_ACCEPTANCE.md` e corrigir eventuais falhas reais.
3. Implementar rotas multipontos/checklists e, só após estabilização, plataforma SaaS de equipes e PCM.

Veja `mobile/docs/CHANGELOG_0_4.md` e `mobile/README.md`.
