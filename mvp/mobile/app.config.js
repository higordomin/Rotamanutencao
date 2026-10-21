/**
 * Identificadores fixos. NÃO incluir número da versão no applicationId.
 * QA utiliza assinatura de desenvolvimento APENAS para testes.
 * Para produção, usar uma chave de assinatura privada protegida fora do GitHub.
 */
const QA_PACKAGE = 'br.com.rotamanutencao.qa';
module.exports = ({config}) => {
  if (!Number.isSafeInteger(config.android?.versionCode) || config.android.versionCode < 1)
    throw new Error('Defina um android.versionCode inteiro positivo no app.json.');
  if (process.env.ROTA_PREVIEW !== '1') return config;
  return {
    ...config,
    name: 'RotaManutenção',
    android: {
      ...(config.android || {}),
      package: QA_PACKAGE,
    },
  };
};
