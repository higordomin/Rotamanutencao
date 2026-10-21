# Política de versões e atualizações do RotaManutenção — MVP 0.7

## IDs Android que não devem mudar

| Ambiente | Android applicationId | Assinatura | Distribuição |
|---|---|---|---|
| QA estável (a partir da 0.7) | `br.com.rotamanutencao.qa` | debug/template (somente testes) | APK GitHub Actions |
| Produção (futuro) | `br.com.rotamanutencao.app` | chave PRIVADA de produção, guardada em cofre | canal oficial |
| QA legados 0.4–0.6 | nomes antigos variados | debug/template | manutenção temporária |

**Atenção:** a QA 0.7 é a primeira versão instalada com o novo ID fixo. Ela NÃO substitui o aplicativo QA 0.6. A migração 0.6→0.7 exige exportar backup JSON v4 e restaurá-lo no novo app após verificar o arquivo. Manter o 0.6 instalado até comprovar que TAGs, OS, histórico, fotos e PDFs estão presentes.

## Regras de atualização

1. Mantenha o **mesmo applicationId** para QA em todas as versões 0.7.x futuras.
2. Aumente obrigatoriamente `expo.android.versionCode` a cada APK atualizador (0.7 = 70; 0.7.1 = 71), sem recuar.
3. A assinatura da QA deve ter o mesmo certificado; o CI compara o SHA-256 do certificado da versão 0.7 à base observada nos APKs de teste, abortando se diferir.
4. Nunca distribua a chave de desenvolvimento como assinatura comercial. Chave de debug conhecida não garante autenticidade.
5. No QA, a compilação `assembleRelease` gerada pelo template utiliza uma assinatura de desenvolvimento; **não é release segura**.
6. Nunca grave keystore nem senha no Git, na documentação, em mensagens ou em logs. Para publicar a versão comercial, configure credenciais com controle de acesso restrito e use assinatura de release apropriada.
7. Atualizações preservam dados em condições normais no Android quando ID e assinatura são iguais; mesmo assim **backup e teste real são obrigatórios**, e mudanças no schema devem ser não destrutivas.

## Teste de atualização in-place a executar a partir da 0.7.1

1. Instale 0.7 QA estável e cadastre dados fictícios: 1 equipamento com TAG, 1 OS recorrente, 1 impedimento e 1 execução parcial com foto.
2. Exporte um backup e confirme o arquivo em pasta externa.
3. Sem desinstalar a 0.7, instale um APK **0.7.1** compilado com o **mesmo ID** e certificado e com versionCode 71.
4. O Android deve oferecer **Atualizar**, não **Instalar novo aplicativo**.
5. Abra o app: confirme TAGs, OS, datas, fotos, execução parcial, exportação de PDF e recuperação offline sem resetar banco.
6. Valide `versionCode` e certificado dos dois APKs com `aapt` e `apksigner`.
7. Se algo falhar, NÃO limpe dados nem desinstale; use os APKs e backups para diagnosticar.

## Limitações atuais

- Não existem login, sync, painel web ou multiempresa nesta versão; isso virá com o SaaS.
- Backup JSON inclui fotos sem criptografia, portanto guarde fora de meios públicos.
- A empresa ou técnico precisa cumprir permissões de segurança industrial e políticas locais.
- APKs de QA são internos: não compartilhar como produto oficial nem anunciar pronto para venda.

## CI

O GitHub Actions publica o APK de QA com retenção temporária. Ele verifica:
- Expo TypeScript, testes e geração do bundle
- compilação Gradle nativa
- APK com `br.com.rotamanutencao.qa`, `versionCode=70`
- certificado de QA conhecido

A assinatura de produção **não foi configurada** e exige credenciais secretas em sistema apropriado.
