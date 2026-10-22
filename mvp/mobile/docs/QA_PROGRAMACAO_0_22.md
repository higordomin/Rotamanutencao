# QA — RotaManutenção 0.22.0 | Programação de rotas

## Escopo
Evoluir a programação sem desorganizar o Início e a Agenda aprovados na 0.21.2 nem alterar os registros de lubrificação da 0.21.3.

**Planejamento no celular (offline)**

- Rota avulsa (sem prazo automático) ou intervalos em **dias fixos**: 7, 15, 30, 60, 90, 180, 365 e valor personalizado de 1 a 36500 dias.
- Cadastro de rota: nome, área, intervalo, primeira data pelo calendário. Prévia de três datas hipotéticas. A tela explica que essas datas **não são criadas na Agenda**.
- Edição de rota: mostra a programação existente e permite alterar intervalo/data, inclusive programar uma rota antes avulsa.
- Vencimento já ultrapassado ou anomalias pendentes: reprogramação exige confirmação explícita. Uma alteração de data **não** resolve pendências de manutenção.
- Bloqueia salvar programação se existe execução da rota em andamento; a guarda é validada dentro de uma transação SQLite, evitando inconsistência entre início de rota e alteração.
- Finalização regular segue calculando o vencimento futuro a partir da **data efetiva de conclusão da execução**, em dias corridos. Se tiver anomalia ou ponto não executado, não avança automaticamente o vencimento.
- Lista e Agenda recebem somente `next_due_date` salvo. O histórico e o backup JSON v10 seguem intactos.
- Continuidade do uso individual, sem login, internet, compartilhamento ou supervisão.

## Testes automatizados
- `npm run check` e `npm test`: intervalos, datas de ano novo e bissexto, validações, previsão sem gravação, confirmação de reprogramação de atrasadas, preservação de alerta de anomalias.
- `python3 tests/sqlite_smoke.py`: retenção de `attention_count` e `attention_at` depois de reagendar, checagem de execução aberta, integridade das tabelas.
- `npx expo export --platform android --output-dir dist`.
- APK QA **0.22.0**, Android `versionCode=220`, `br.com.rotamanutencao.qa`, mesma assinatura QA das versões 0.21.x.

## Roteiro de validação física
1. Na 0.21.3, exportar um backup local para fora do aparelho e verificar o arquivo.
2. Instalar APK 0.22.0 sobre a instalação anterior, sem desinstalar/limpar dados.
3. Criar rota: escolher 7 dias, depois 15 dias, depois 45 personalizados; conferir primeira data e prévia na virada do mês.
4. Criar rota avulsa (0), verificar que não cria vencimentos fictícios; abrir e **Programar rota** com 30 dias e primeira data.
5. Criar rota programada para ontem; alterar para semana que vem: aplicativo deve pedir confirmação sobre retirada do aviso de atraso.
6. Finalizar uma rota sem anomalias; conferir próxima data = data de finalização + intervalo e visualização no calendário.
7. Finalizar com anomalia; conferir que status de pendência e data continuam presentes após tentar reprogramar.
8. Iniciar execução e abrir programação: botão de salvar deve estar indisponível até finalizar execução.
9. Verificar que o calendário mensal, os filtros da Agenda, o Início enxuto, relatórios PDF, fotos e históricos continuam disponíveis.
10. Reiniciar aplicativo e confirmar que periodicidade e data continuam salvas; conferir exportação e restauração de backup v10.

## Limitações intencionais
- Intervalos são de **dias corridos**, não de meses calendário (30 dias não significa sempre um mês). A prévia é apenas visual, não um lote de OS futuras.
- Não oferece confirmação automática de execução ou liberação de máquina.
- A validação completa dos controles de toque em hardware Android depende do usuário.
