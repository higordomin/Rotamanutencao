# QA 0.39 — Periodicidades prontas de OS

## Pedido do usuário
Na criação/edição de OS, oferecer periodicidades pré-definidas: diária, semanal, mensal,
bimestral, trimestral, quadrimestral, semestral e anual, **mantendo intervalo livre em dias**.

## Experiência simplificada
- O formulário mostra somente `Repetição da OS` e o valor atual.
- Um toque expande as opções: Uma vez, Diária, Semanal, Mensal, Bimestral, Trimestral,
  Quadrimestral, Semestral, Anual e Personalizado em dias.
- A seleção fecha as opções. O intervalo personalizado exige número inteiro entre
  0 e 36500 e precisa ser confirmado.
- OS antigas de 30 dias reaparecem como Mensal; valores antigos personalizados
  (ex.: 15, 21, 45 dias) permanecem como Personalizado.
- Na lista, os detalhes da OS mostram o nome da frequência e os dias.

## Valores e semântica
A programação de OS já usa **dias corridos**, computados após a execução.
Não foi implementada repetição por **meses de calendário** ou vencimento fixo
no mesmo dia do mês. Presets:
- Uma vez = 0; Diária = 1; Semanal = 7
- Mensal = 30; Bimestral = 60; Trimestral = 90
- Quadrimestral = 120; Semestral = 180; Anual = 365

A interface explicita os intervalos usados. A diferenciação entre meses
calendários e dias fixos é relevante para auditoria industrial. Nenhuma
migração SQLite, backup ou mudança no planejamento das notificações.

## Testes
1. Criar OS avulsa e OS diária, semanal, mensal, bimestral, trimestral,
   quadrimestral, semestral e anual.
2. Criar OS personalizada com 15 ou 45 dias; fechar e reabrir para conferir.
3. Editar OS antiga com recorrência 30 dias e confirmar preset Mensal.
4. Cancelar seleção expandida sem alterar a OS; reabrir e conferir valor atual.
5. Rejeitar intervalo negativo, texto e valor superior a 36500.
6. Executar OS recorrente fictícia e conferir próximo vencimento e notificação.
7. Confirmar que formulário e interface continuam compactos no Android.
8. Instalar por cima da 0.38 QA, **sem limpar dados**, após fazer backup externo.

## Critérios de liberação
TypeScript, testes Node, SQLite smoke, export Android, APK QA `0.39.0`,
`versionCode=390`, pacote `br.com.rotamanutencao.qa` e assinatura consistente.
Não promover ao main sem teste físico do usuário.
