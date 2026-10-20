# RotaManutenção QA 0.5 — Execução parcial (piloto)
 
## Problema resolvido
Um serviço pode ser parcialmente executado e ainda necessitar de peça, parada ou atividade complementar. A interface anterior permitia inserir a frase "Executado parcialmente" e mesmo assim fechar/reagendar a OS como completa.

## Novas regras
- No registro da execução escolha **Concluída** ou **Parcial**.
- **Parcial:** exige descrição de 10–1000 caracteres sobre o que foi realizado e o que ficou pendente; preserva a data e o status pendente da OS; grava execução histórica, fotos e motivo da pendência; não cria evento de "concluído" nem antecipa a recorrência.
- **Concluída:** registra execução e evento; limpa o marcador de pendência; encerra OS avulsa ou calcula próxima data para recorrente.
- O card da OS mostra **Parcial** e o motivo; o painel destaca as pendências.
- PDF indica claramente a diferença entre execução parcial e concluída.
- Backup formato **v4** contém resultado e pendência. Restaura arquivos v2/v3/v4. **Apps antigos não restauram backups v4**, então mantenha também o backup anterior se necessário.
- Os registros e fotos permanecem 100% locais. Não há sincronização ou painel PCM compartilhado nesta etapa.

## Plano de aceitação Android
1. Instale a variante **RotaManutenção QA 0.5** (identificador `br.com.rotamanutencao.preview05`) sem apagar as versões antigas.
2. Crie OS preventiva com periodicidade 30 dias e data definida.
3. Marque **Parcial**, tente salvar sem descrição: deve recusar. Escreva por exemplo: "Mancal 1 lubrificado; mancal 2 aguarda parada de produção".
4. Tire foto, salve e confira: OS permanece pendente e prazo **não muda**; motivo parcial visível no painel.
5. Abra Histórico, confira a indicação Parcial e gere PDF, que deve indicar "pendência aberta".
6. Reabra a OS, escolha **Concluída**, finalize e confirme que o motivo parcial some e a próxima data foi calculada a partir do dia da conclusão.
7. Exporte backup v4, valide o arquivo e restaure **apenas em uma instalação de teste**; compare status, pendências, fotos, datas e histórico.
8. Reinicie o app em modo avião e confira persistência.
9. Crie e registre parcial também em OS avulsa; ela não deve ser marcada como concluída.
10. Teste bloqueio por falta de peça e a impossibilidade de executar OS impedida sem liberação.

**Cuidado:** não registrar equipamentos da fábrica, fotografias ou informações confidenciais sem autorização. O app não substitui bloqueio e etiquetagem de energia, liberação de máquina nem permissões de serviço.

## Não validado remotamente
Os testes no dispositivo (foto, PDF, desempenho, backup + restauração) dependem de testes reais. Não apresentar como versão 1.0 ou pronta para implantação até passar no checklist.
