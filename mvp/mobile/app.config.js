/**
 * O APK de QA usa applicationId diferente e não interfere nos dados da versão 0.4.
 * NÃO use ROTA_PREVIEW em builds comerciais, nem armazene credenciais aqui.
 */
module.exports = ({config}) => {
  if (process.env.ROTA_PREVIEW !== '1') return config;
  return {
    ...config,
    name: 'RotaManutenção QA 0.6',
    android: {
      ...(config.android || {}),
      package: 'br.com.rotamanutencao.preview06',
    },
  };
};
