import type {PlannedNotice} from './dailyNoticePlan.ts';

/** Identificação de uma agenda de notificações, sem títulos no campo data do Android. */
export function noticeFingerprint(item:Pick<PlannedNotice,
  'key'|'kind'|'title'|'body'|'date'|'target'>):string {
  if(Number.isNaN(item.date.getTime()))throw new Error('Data de notificação inválida.');
  const text=JSON.stringify([item.key,item.kind,item.title,item.body,
    item.date.toISOString(),item.target??null]);
  // Identificador compacto, não utilizado como assinatura de segurança.
  let a=2166136261,b=2246822519;
  for(let i=0;i<text.length;i++){
    const c=text.charCodeAt(i);
    a=Math.imul(a^c,16777619)>>>0;
    b=Math.imul(b^c,3266489917)>>>0;
  }
  return `v029:${a.toString(36)}:${b.toString(36)}:${text.length}`;
}
export function sameNoticePlan(
  existingSignatures:readonly (string|null|undefined)[],
  planned:readonly PlannedNotice[],
):boolean {
  if(existingSignatures.length!==planned.length)return false;
  const seen=new Map<string,number>();
  for(const value of existingSignatures) {
    if(!value)return false; // avisos anteriores à 0.29 são atualizados uma vez.
    seen.set(value,(seen.get(value)??0)+1);
  }
  for(const item of planned) {
    const fingerprint=noticeFingerprint(item);
    const count=seen.get(fingerprint)??0;
    if(!count)return false;
    if(count===1)seen.delete(fingerprint); else seen.set(fingerprint,count-1);
  }
  return seen.size===0;
}
/**
 * Segurança de substituição: instala todos os avisos novos ANTES de retirar antigos.
 * Falha durante criação desfaz somente os avisos novos, preservando a agenda anterior.
 * Falha ao cancelar antigo mantém os novos ativos, sinalizando possível duplicação.
 */
export async function replaceScheduledNoticesSafely<T>(
  oldIds:readonly string[],next:readonly T[],
  schedule:(item:T)=>Promise<string>,
  cancel:(identifier:string)=>Promise<void>,
):Promise<number>{
  const newIds:string[]=[];
  try{
    for(const item of next)newIds.push(await schedule(item));
  }catch(error){
    await Promise.allSettled(newIds.map(cancel));
    throw error;
  }
  const settled=await Promise.allSettled(oldIds.map(cancel));
  if(settled.some(x=>x.status==='rejected'))
    throw new Error('Novos lembretes programados, mas alguns antigos não puderam ser removidos. Revise os avisos para evitar duplicações.');
  return newIds.length;
}
