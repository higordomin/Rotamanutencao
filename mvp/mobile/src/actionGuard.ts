/**
 * Trava síncrona de operações assíncronas iniciadas por toques no Android.
 * O bloqueio acontece antes do primeiro await e é liberado após falha/sucesso.
 * Cada tela/cartão deve ter a própria instância; não é um estado global.
 */
export function createActionGuard() {
  let busy=false;
  return {
    get busy(){return busy;},
    async run(task:()=>Promise<void>):Promise<boolean>{
      if(busy)return false;
      busy=true;
      try { await task(); return true; }
      finally { busy=false; }
    },
  };
}
