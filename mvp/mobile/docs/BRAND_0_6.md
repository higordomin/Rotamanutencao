# RotaManutenção 0.6 — Ícone e identidade visual

## Problema
As versões 0.4–0.5 não possuíam `expo.icon` nem `expo.android.adaptiveIcon`. O Android não tinha um ícone de marca configurado e a tela principal exibiu apenas um quadrado com "R".

## Correção
- SVG vetorial profissional com **engrenagem + R** em azul, grafite e branco.
- `scripts/generate-icons.cjs`: rasteriza os SVGs em PNG 1024x1024 no `npm install` (Sharp), **sem acesso à rede** e sem usar dados do usuário.
- Ícone completo para Android e foreground transparente separado para ícone adaptativo.
- A própria interface utiliza o mesmo arquivo no cabeçalho, evitando identidades inconsistentes.
- O APK QA usa `br.com.rotamanutencao.preview06` para não apagar/alterar bancos antigos.

## Compilar
No diretório `mvp/mobile`:

```bash
npm install
npm run assets
npm run check
npm test
npx expo prebuild --platform android --no-install
cd android && ./gradlew :app:assembleRelease
```

A pipeline Android do projeto executa essas etapas automaticamente. Os PNGs são gerados no próprio processo de compilação, preservando os SVGs como origem única.

## Testar no aparelho
1. Instale o novo QA 0.6, sem desinstalar os apps anteriores.
2. Veja na tela inicial do Android: ícone deve ser uma engrenagem em azul/branco com R.
3. Ao abrir o app, confira se o cabeçalho usa o mesmo ícone.
4. Se o launcher guardar o ícone antigo em cache, reinicie a tela inicial ou o celular.
5. Teste criação/edição de OS, execução parcial e concluída, PDF e backup com dados fictícios.
6. Não publique em produção até validar os testes e ter chave Android de assinatura estável.

Observação: o banner de marketing é apenas uma proposta visual, **não representa capturas reais do aplicativo**.
