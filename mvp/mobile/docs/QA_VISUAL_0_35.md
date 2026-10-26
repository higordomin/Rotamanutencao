# QA 0.35 — Padronização visual completa Industrial Dark

## Escopo

A 0.35 é uma atualização **somente de interface e configuração visual**, sobre a
base 0.34 consolidada no `main` após testes reais reportados pelo usuário.

As dez áreas de UI agora usam `src/design31.ts`:
- `App.tsx`: barra, OS, formulários, histórico e central de dados;
- `HomeScreen.tsx`, `MoreMenu.tsx`, `FirstUseGuide.tsx`;
- `OperationalAgenda.tsx` e `CalendarPicker.tsx` (sem refazer a agenda 0.21);
- `RoutesScreen.tsx`, `AssetPicker.tsx`;
- `ConsolidatedReportPanel.tsx`, `ReminderSettings.tsx`.

Tokens padronizados: fundo azul-grafite, cartões, bordas, campos,
destaque ciano, status verde/âmbar/vermelho, fonte mínima e alvos principais de toque ≥ 48 dp.
Configuração do ícone adaptativo Android e de notificações usa o mesmo fundo/acento.
Testes automáticos rejeitam códigos de cor soltos nas telas e verificam a
identidade da UI e da configuração do Android.

Nenhuma alteração de schema SQLite, assinatura QA, nome de pacote,
algoritmo de OS/rotas, JSON backup v11, calendário, lembretes ou PDFs.

## Critérios Android — obrigatórios antes de liberar

1. Backup verificado fora do aplicativo; instalar QA 0.35 sobre QA 0.34,
   **sem desinstalar e sem limpar dados**.
2. Telas Início, Agenda, OS, Rotas, Mais/Equipamentos/Histórico/Relatórios:
   procurar cores, contrastes, cabeçalhos e botões consistentes.
3. Fontes ampliadas Android (pelo menos 1,3×), navegação por leitor de tela,
   toque nas abas, seleção de datas com 7 colunas e seletor de TAG.
4. Celulares estreitos de 320–360 dp: chips de filtro, modal de equipamento,
   três resultados de rota e botões de relatório sem cortes.
5. Agenda mês, semana e dia, modo Foco do turno, pendências e calendário 0.21:
   **nenhuma alteração de lógica**.
6. Criar, completar parcialmente, impedir, liberar, arquivar e reativar uma OS;
   abrir OS do equipamento e consultar o histórico.
7. Rota com foto e anomalia/OS corretiva: executar, retomar, finalizar e
   gerar PDF; fotos anteriores continuam acessíveis.
8. Relatório consolidado, filtros, período, exportação; lembretes Android,
   aparência, prévia, permissões e teste de 2 minutos.
9. Conferir backup JSON v11, integridade do banco e atualização sem perda
   de fotos, OS, rotas, datas ou TAGs.
10. QA Android versão `0.35.0`/`versionCode=350`, pacote e certificado QA
    intactos. TypeScript, Node, SQLite e export Android precisam passar.

## Resultado da validação — 26/10/2026

- CI GitHub: TypeScript, export Android, 233/233 testes Node e smoke SQLite aprovados.
- APK Android QA 0.35.0 (versionCode 350): compilação, identificação e certificado aprovados.
- Usuário confirmou funcionamento da versão 0.35 no aparelho após instalação.
- Versão promovida à base estável `main` pelo PR #52, sem migração destrutiva.
- Testes físicos em outros modelos e configurações Android continuam recomendados.

## Higiene do repositório

`main` foi consolidado na 0.34 pelo PR #51 e atualizado à 0.35 pelo PR #52.
Histórico Git e branches anteriores foram preservados; PRs antigos foram encerrados
como substituídos. Nenhum dado local do usuário é alterado por essa organização.
