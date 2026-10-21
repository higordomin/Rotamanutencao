/** Validation pure, testável no Node sem dependências do Android. */
export function gramAmount(input:string|number):number {
  const parsed=typeof input==='string'?Number(input.trim().replace(',','.')):input;
  if(!Number.isFinite(parsed)||parsed<0||parsed>100000
    || Math.abs(Math.round(parsed*1000)-parsed*1000)>1e-7)
    throw new Error('Quantidade inválida: informe gramas entre 0 e 100000, até 3 casas decimais.');
  return parsed;
}
export function routeResult(status:'pending'|'done'|'anomaly'|'skipped',notes:string) {
  if(!['done','anomaly','skipped'].includes(status))throw new Error('Escolha o resultado do ponto.');
  const message=notes.trim();
  if(message.length>1000)throw new Error('Observação do ponto excede 1000 caracteres.');
  if(status!=='done'&&message.length<10)throw new Error('Explique a anomalia ou motivo de não execução (mínimo 10 caracteres).');
  return message;
}
