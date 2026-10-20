# Primeiro teste de backup no Android — MVP 0.4.1

## Segurança antes de qualquer restauração

- **Não desinstalar** o APK 0.4 que já contém registros de teste até salvar e conferir uma cópia externa.
- **Não apagar os dados do aplicativo** para simular restauração.
- Salvar o JSON fora do aplicativo (pasta privada), confirmar arquivo visível e tamanho maior que zero.
- No MVP 0.4.1, usar **Dados → Verificar arquivo**; escolher o mesmo JSON e comparar contagens com as telas.
- A inspeção valida estrutura e referências, **não substitui dados** e **não é uma prova completa de restauração** nem de ausência de corrupção binária.
- Apenas depois, executar testes destrutivos de restauração em aparelho/perfil separado, com dados de exemplo.

## Checklists

1. Criar 1 equipamento (TAG e área), 1 OS recorrente, 1 impedimento; liberar impedimento; executar 1 OS com foto.
2. Exportar backup JSON e conferir seu tamanho e presença no gerenciador de arquivos.
3. Sem reinstalar e com dados preservados, selecionar **Verificar arquivo** e confirmar as contagens.
4. Tentar inspecionar JSON truncado e confirmar erro e ausência de exclusão de dados.
5. Se houver outro aparelho de teste, instalar e restaurar o backup lá; comparar TAG, atividades, histórico, bloqueios e fotos.
6. Registrar modelo do aparelho, versão Android e qualquer alerta de erro.

## Limitação de assinatura

A assinatura da versão 0.4 foi feita na compilação de teste. Uma futura compilação pode usar outra chave e o Android recusar a atualização in-place. É necessário implementar uma **chave estável** fora do repositório para versões seguintes. Não desinstalar para contornar o problema até verificar backups.
