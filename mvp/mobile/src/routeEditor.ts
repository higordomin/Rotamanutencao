/** Reordenação estável e verificável, independente de Android ou SQLite. */
export type MoveDirection='up'|'down';
export function reorderedPointIds(ids:readonly string[],pointId:string,direction:MoveDirection):string[]{
  if(ids.length>100 || new Set(ids).size!==ids.length || ids.some(x=>!x.trim()))
    throw new Error('Lista de pontos inválida.');
  if(direction!=='up'&&direction!=='down')throw new Error('Direção inválida.');
  const index=ids.indexOf(pointId);
  if(index<0)throw new Error('O ponto não pertence à rota.');
  const output=[...ids];
  const target=index+(direction==='up'?-1:1);
  if(target<0||target>=output.length)return output;
  [output[index],output[target]]=[output[target],output[index]];
  return output;
}

/** Duplicar como modelo: nunca reaproveitar IDs, prazos, resultados ou avisos antigos. */
export function copyRouteTitle(title:string):string{
  const name=title.trim();
  if(!name)throw new Error('Nome da rota inválido.');
  return ('Cópia de '+name).slice(0,200);
}
