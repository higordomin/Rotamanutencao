# QA Android — Calendário e teclado (0.4.2)

## O que mudou
- Data programada escolhida por calendário no próprio formulário, sem teclado.
- Navegação de meses, indicação do dia selecionado e dia atual, atalhos Hoje e Amanhã.
- Campo exibido em **DD/MM/AAAA**; banco continua com **AAAA-MM-DD**.
- Modal mais previsível com o teclado, rolagem do formulário, e campo de periodicidade visível.
- Ajuste da margem da barra de status para Android.
- Build de QA instalado como app separado `br.com.rotamanutencao.preview042` para proteger versões antigas.

## Testes em dispositivo obrigatórios (não executados remotamente)
1. Abrir Nova atividade, tocar no campo data. Calendário aparece **sem teclado**.
2. Navegar entre setembro/outubro/novembro, selecionar um dia e conferir data exibida.
3. Testar virada dezembro/janeiro e fevereiro de ano bissexto.
4. Fechar calendário sem selecionar: data anterior deve ficar igual.
5. Abrir formulário de edição e confirmar que data pré-existente está marcada.
6. Com teclado numérico na periodicidade, texto digitado e botão Salvar devem permanecer alcançáveis por rolagem.
7. Testar teclado no nome/descrição da atividade, nas telas de equipamento e impedimento.
8. Modo offline: criar, salvar, fechar, reabrir e confirmar data persistida e cálculo de próxima execução.
9. Testar em Android com fonte ampliada e com navegação por gestos/botões.
10. Não desinstalar nem sobrescrever 0.4/0.4.1 antes de exportar e conferir backup.

## Limites
- Calendário de 1900 a 2100 (mesmo limite da validação do banco).
- As mudanças de interface não alteram o banco, a sincronização ou o formato de backup.
- APK de QA não é atualização sobre o APK anterior; é outra instalação.
