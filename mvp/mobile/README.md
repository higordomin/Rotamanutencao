# RotaManutenção — Android

Aplicativo Android para manutenção industrial, **individual e 100% offline**.
Versão estável no GitHub (`main`): **0.35.0 — Industrial Dark**.
A versão 0.34 continua disponível no histórico como base estável anterior.

## Funcionalidades

- Equipamentos por TAG/nome/setor, pesquisa e seleção por ID estável
- Ordens de serviço: mecânica, elétrica, lubrificação, segurança e inspeção
- Rotas e checklists, recorrência, agenda e foco do turno
- Evidência fotográfica, registros de impedimentos e anomalias
- Histórico de serviços e relatórios PDF
- Lembretes locais no Android, com configuração de permissões de alarmes
- Backup JSON v11, verificação de arquivo e restauração local

Sem login, sincronização, nuvem, servidor, supervisor ou telemetria.

## Interface

Identidade Industrial Dark centralizada em `src/design31.ts` (cores, tamanho
de toque, tipografia, espaçamento e status). As dez telas principais usam
estilos padronizados, incluindo formulários, Agenda, calendário, relatórios
e lembretes. `tests/visualConsistency35.test.mjs` verifica essa regra.
A Agenda mantém a lógica da experiência 0.21 aprovada anteriormente.

## Validação e versão Android

A 0.35 foi aprovada no aparelho Android pelo usuário. CI do GitHub:
**233/233 testes**, TypeScript, exportação Android e SQLite smoke aprovados.
APK de teste compilado com `versionCode=350` e pacote
`br.com.rotamanutencao.qa`, assinatura de QA preservada.
Aprovação neste aparelho não substitui testes de compatibilidade em
outros dispositivos.

## Testes locais

```sh
cd mvp/mobile
npm install --no-audit --no-fund
npm run check
npm test
python3 tests/sqlite_smoke.py
npx expo export --platform android --output-dir dist
```

O APK QA é gerado pelo workflow `.github/workflows/android-apk-preview.yml`
com `ROTA_PREVIEW=1`. Pacote de produção é diferente do de QA.

## Atualizar com segurança

1. Exportar backup JSON e guardar uma cópia fora do aparelho.
2. Instalar o novo APK QA **por cima**, sem desinstalar nem limpar dados.
3. Conferir OS, TAG, rotas, fotos, agenda, lembretes e backup.
4. Em caso de problema, não apagar o armazenamento local.

Checklist: `docs/QA_VISUAL_0_35.md`.

## Segurança no trabalho

O aplicativo organiza registros, mas não substitui liberação de máquinas,
LOTO, APR ou outros procedimentos de segurança.
Fotos e backups não são criptografados; evite compartilhar dados confidenciais.
