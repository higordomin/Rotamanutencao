# Validação de atualização sem perda de dados — QA 0.7 → 0.7.1

A 0.7.1 é a mesma aplicação **RotaManutenção QA** da 0.7, com:
- **mesmo pacote:** `br.com.rotamanutencao.qa`
- **mesmo certificado QA** (o CI compara a impressão digital)
- **versionCode 71** (anterior: 70)
- cabeçalho indica `MVP 0.7.1`

## Roteiro obrigatório em um celular Android

1. Mantenha os aplicativos 0.4–0.6 como estão; esta série não os altera.
2. Instale **primeiro a QA 0.7**, ainda separada da 0.6.
3. Cadastre um equipamento fictício com TAG `TESTE-QA-07`, uma OS de lubrificação recorrente e um impedimento.
4. Libere o impedimento; registre uma execução **Parcial** com anotação e foto.
5. Exporte backup JSON do 0.7 e salve fora do aplicativo. Confirme tamanho não zero.
6. Sem desinstalar o 0.7, toque no APK 0.7.1. Android deve oferecer **Atualizar**.
7. Abra a aplicação: o cabeçalho deve indicar **MVP 0.7.1**; apenas um ícone **RotaManutenção QA** deve permanecer instalado.
8. Confirme TAG, dados SQLite, pendências, fotos, histórico e PDF sem precisar restaurar backup.
9. Ative modo avião, feche e reabra: registros devem continuar disponíveis.
10. Só depois marque o teste como concluído. Em caso de falha, não desinstale nem limpe dados; capture o erro.

## Segurança

- APK QA é assinado com chave de desenvolvimento de template; não distribuir comercialmente.
- **Não** importar dados reais/confidenciais sem autorização.
- Atualização preserva dados apenas se o pacote, assinatura e migrations forem compatíveis. A compilação sozinha não prova o comportamento de instalação.
- A assinatura de produção continua pendente de configuração privada.
