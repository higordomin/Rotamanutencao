# RotaManutenção — Android

Aplicativo Android de manutenção industrial para uso **individual e 100% offline**.
Versão atual em testes: **0.35.0** (acabamento visual Industrial Dark).
Versão consolidada no GitHub (`main`): **0.34.0**, aprovada em teste de uso real.

## Funcionalidades

- Equipamentos por TAG/nome/setor, pesquisa e seleção por ID estável
- Ordens de serviço: mecânica, elétrica, lubrificação, segurança e inspeção
- Rotas e checklists, recorrência, agenda e foco do turno
- Evidência fotográfica, registros de impedimentos e anomalias
- Histórico de serviços, exportação de relatórios PDF
- Lembretes locais no Android, com opção de permissões de alarmes
- Backup JSON v11, verificação de backup e restauração confirmada

Sem login, sincronização, nuvem, servidor, supervisor ou telemetria.

## Interface

Identidade Industrial Dark centralizada em `src/design31.ts` (cores, tamanho de
toque, tipografia, espaçamento e status). As dez telas principais têm estilos
padronizados, incluindo formulários, Agenda, calendário, relatórios e lembretes.
O `tests/visualConsistency35.test.mjs` verifica essa regra automaticamente.
O calendário segue a experiência 0.21 previamente aprovada, sem alteração de lógica.

## Testes locais

```sh
cd mvp/mobile
npm install --no-audit --no-fund
npm run check
npm test
python3 tests/sqlite_smoke.py
npx expo export --platform android --output-dir dist
```

Para gerar o APK de testes use o workflow
`.github/workflows/android-apk-preview.yml` com `ROTA_PREVIEW=1`.
A versão 0.35 usa `br.com.rotamanutencao.qa` / `versionCode=350` e a
mesma assinatura QA das anteriores; o pacote de produção é diferente.

## Atualizar com segurança

1. Exportar um backup JSON e guardar uma cópia fora do aparelho.
2. Instalar o APK QA mais recente **por cima** do QA instalado, sem desinstalar.
3. Validar OS, TAG, rotas, fotos, agenda, lembretes e backup.
4. Nunca limpar o armazenamento local para resolver erro de instalação.

Não confundir um APK com todos os testes passando com a validação em um Android real.
O checklist final está em `docs/QA_VISUAL_0_35.md`.

## Segurança no trabalho

O aplicativo organiza registros, mas não substitui liberação de máquinas,
procedimentos de bloqueio/etiquetagem (LOTO), APR ou procedimentos de segurança.
Fotos e backup não são criptografados; não compartilhe dados confidenciais.
