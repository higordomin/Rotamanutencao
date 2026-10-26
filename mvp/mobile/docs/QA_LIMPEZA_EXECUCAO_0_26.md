# QA — RotaManutenção 0.26.0 | Limpeza segura e execução ágil

## Política de limpeza — segurança em primeiro lugar
- **Referências preservadas:** `feat/mvp024-anomalias-os-corretivas` (penúltima referência de recuperação) e `feat/mvp025-catalogo-seletor-equipamentos` (base estável, CI aprovada).
- Alterações apenas na branch `feat/mvp026-limpeza-segura-execucao-rapida`; `main`, 0.24 e 0.25 permanecem intocados.
- Três arquivos legados removidos **somente nesta nova branch**: `RotaManutencao_Kit_GitHub.zip`, `blank.yml` (CI “Hello world”) e `compilar-apk.yml.` (compilador antigo apontando para ZIP inexistente). Todas as versões antigas continuam rastreáveis no histórico Git e nas branches anteriores.
- **Nenhum registro do aparelho é excluído**: TAG, OS, rotas, execuções, ocorrências, fotos, backup JSON v11 ou histórico.
- A tela Dados ganhou **Otimizar banco sem apagar dados**, sob confirmação. Executa `PRAGMA quick_check` e `foreign_key_check`, roda `PRAGMA optimize` e compara contagens antes/depois; não executa `DELETE`, `VACUUM`, `DROP TABLE` nem apaga arquivos.
- A limpeza do repositório não é ganho de velocidade do app; o benefício no aparelho vem de menos itens renderizados e melhor acesso às consultas.
- Para liberações futuras: sempre exportar backup externo antes da instalação. **Nunca tocar em "Limpar armazenamento" do Android ou desinstalar para ganhar espaço**, pois o app é offline e guarda dados no dispositivo.

## 0.26 — Execução rápida
- Filtro local por nome de ponto, TAG e equipamento, inclusive sem acento.
- Botão para localizar **próximo pendente**, sem concluir automaticamente.
- Carregamento visual de 15 pontos por vez; "Carregar mais" apresenta o restante sem perder itens do banco.
- Fotografia e vínculos de corretivas agrupados por ID uma vez por atualização em vez de varrer todas as fotos para cada linha.
- Atalhos **Anomalia** e **Não executado** abrem registro detalhado; não gravam sem o toque em **Salvar** e exigem justificativa pelo validador existente.
- Fluxos originais de retomada, finalização somente sem pendências, geração de OS corretiva e PDF permanecem.

## Testes
1. `npm run check`, `npm test`, `python3 tests/sqlite_smoke.py`, `npx expo export --platform android --output-dir dist`.
2. APK QA 0.26.0, versionCode 260, assinatura QA fixa. Instalar **por cima** da 0.25 no mesmo pacote; não desinstalar.
3. Em rota de 100 pontos, pesquisar texto acentuado, setor, TAG e nome; comparar contagem real, filtros e paginar até 100. Garantir que todos aparecem.
4. "Próximo pendente" deve **apenas localizar**, sem escrever na base. "Registrar executado" só grava após toque explícito.
5. Atalhos "Anomalia" e "Não executado" devem abrir campo de observação; cancelar não grava; salvar sem justificativa deve ser recusado.
6. Após executar e voltar, retomar rota aberta com estados e fotos anteriores, finalizar apenas após todos os pontos tratados.
7. Em Dados, exportar e verificar backup externo, inspecionar integridade, usar "Otimizar banco"; comparar contagens, fotos e chaves antes/depois. Simular corrupção em banco **descartável**, nunca na base real.
8. Regressão: calendário, agenda visual 0.21.2, seleção de TAG 0.25, ocorrências + OS corretivas 0.24, PDFs e imports backup v2–v11.
9. Testar rolagem e teclado no Android físico, baixa memória, offline. Só declarar a versão validada no aparelho após verificação manual.

## Próxima versão
0.27: relatórios PDF profissionais para múltiplas especialidades, sem campos fixos de quantidade de lubrificante.
