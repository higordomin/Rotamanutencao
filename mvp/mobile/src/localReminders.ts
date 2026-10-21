import * as Notifications from 'expo-notifications';
import {Platform} from 'react-native';
import {getDatabase,listOrders} from './db';
import {listRoutes} from './routes';
import {planReminders,validReminderTime,type ReminderInput,type ReminderCandidate} from './reminderPlan';

const CHANNEL='rotamanutencao-lembretes-v2';
const OWNER='rotamanutencao-local-v1';
const TEST_OWNER='rotamanutencao-local-test-v1';
type Preferences={enabled:boolean;hour:number;minute:number};
let syncQueue:Promise<void>=Promise.resolve();

Notifications.setNotificationHandler({
  handleNotification:async()=>({
    shouldShowBanner:true,shouldShowList:true,
    shouldPlaySound:true,shouldSetBadge:false,
  }),
});

async function createChannel():Promise<void>{
  if(Platform.OS==='android'){
    await Notifications.setNotificationChannelAsync(CHANNEL,{
      name:'Manutenções e rotas',
      importance:Notifications.AndroidImportance.HIGH,
      sound:'default',
      vibrationPattern:[0,250],
      lightColor:'#47B7F6',
    });
  }
}
async function readPreferences():Promise<Preferences>{
  const db=await getDatabase();
  const values=await db.getAllAsync<{key:string;value:string}>(`SELECT key,value FROM app_settings
    WHERE key IN ('reminders.enabled','reminders.hour','reminders.minute')`);
  const settings=new Map(values.map(x=>[x.key,x.value]));
  const hour=Number(settings.get('reminders.hour')??14);
  const minute=Number(settings.get('reminders.minute')??0);
  const valid=validReminderTime(hour,minute);
  return {enabled:settings.get('reminders.enabled')==='1',hour:valid?hour:14,minute:valid?minute:0};
}
export async function getReminderSettings():Promise<Preferences>{
  return readPreferences();
}
async function setPreference(key:string,value:string):Promise<void>{
  const db=await getDatabase();
  await db.runAsync(`INSERT INTO app_settings(key,value) VALUES(?,?)
    ON CONFLICT(key) DO UPDATE SET value=excluded.value`,key,value);
}
async function cancelOwned(includeTest=false):Promise<void>{
  const requests=await Notifications.getAllScheduledNotificationsAsync();
  for(const request of requests){
    if(request.content.data?.rotaOwner===OWNER || (includeTest && request.content.data?.rotaOwner===TEST_OWNER))
      await Notifications.cancelScheduledNotificationAsync(request.identifier);
  }
}
function notificationContent(candidate:ReminderCandidate){
  const desc=candidate.kind==='attention'?'Pendência na rota: verifique os pontos não executados ou com anomalias.'
    :candidate.kind==='blocked'?'Atividade impedida: confira o bloqueio antes de iniciar o serviço.'
    :candidate.kind==='overdue'?'Prazo vencido: revise a atividade e a programação.'
    :'Confira a programação prevista para esta manutenção.';
  return {
    title:`${candidate.type==='route'?'Rota':'OS'} • ${candidate.title}`,
    body:desc,
    data:{rotaOwner:OWNER,entityType:candidate.type,entityKey:candidate.key},
  };
}
async function resync():Promise<number>{
  const settings=await readPreferences();
  if(!settings.enabled){await cancelOwned(true);return 0;}
  const permission=await Notifications.getPermissionsAsync();
  if(!permission.granted){await cancelOwned();return 0;}
  await createChannel();
  const [orders,routes]=await Promise.all([listOrders(),listRoutes()]);
  const items:ReminderInput[]=[
    ...orders.map(order=>({id:order.id,type:'order' as const,title:order.title,
      dueDate:order.due_date,blocked:!!order.block_reason,completed:order.status==='completed'})),
    ...routes.map(route=>({id:route.id,type:'route' as const,title:route.title,
      dueDate:route.next_due_date,attentionCount:route.attention_count,
      completed:false})),
  ];
  const next=planReminders(items,new Date(),settings.hour,settings.minute);
  // Não apaga notificações agendadas por outros aplicativos ou módulos.
  await cancelOwned();
  for(const entry of next){
    await Notifications.scheduleNotificationAsync({
      content:notificationContent(entry),
      trigger:{type:Notifications.SchedulableTriggerInputTypes.DATE,
        date:entry.date,channelId:CHANNEL},
    });
  }
  return next.length;
}
export function syncLocalReminders():Promise<void>{
  // Serializa chamadas de abrir app, salvar OS e concluir rota.
  const task=syncQueue.catch(()=>{}).then(resync).then(()=>{});
  syncQueue=task;
  return task;
}
export async function activateReminders():Promise<number>{
  await createChannel();
  let permission=await Notifications.getPermissionsAsync();
  if(!permission.granted)permission=await Notifications.requestPermissionsAsync();
  if(!permission.granted)throw new Error('Notificações não autorizadas. Habilite-as nas configurações do Android.');
  await setPreference('reminders.enabled','1');
  try{
    await syncLocalReminders();
    const requests=await Notifications.getAllScheduledNotificationsAsync();
    return requests.filter(x=>x.content.data?.rotaOwner===OWNER).length;
  }catch(e){
    await setPreference('reminders.enabled','0');
    await cancelOwned();
    throw e;
  }
}
export async function deactivateReminders():Promise<void>{
  await setPreference('reminders.enabled','0');
  await syncLocalReminders();
}
export async function chooseReminderTime(hour:number,minute:number):Promise<void>{
  if(!validReminderTime(hour,minute))throw new Error('Horário inválido.');
  const old=await readPreferences();
  const db=await getDatabase();
  await db.withExclusiveTransactionAsync(async tx=>{
    await tx.runAsync(`INSERT INTO app_settings(key,value) VALUES('reminders.hour',?)
      ON CONFLICT(key) DO UPDATE SET value=excluded.value`,String(hour));
    await tx.runAsync(`INSERT INTO app_settings(key,value) VALUES('reminders.minute',?)
      ON CONFLICT(key) DO UPDATE SET value=excluded.value`,String(minute));
  });
  try{await syncLocalReminders();}
  catch(e){
    await db.withExclusiveTransactionAsync(async tx=>{
      await tx.runAsync("UPDATE app_settings SET value=? WHERE key='reminders.hour'",String(old.hour));
      await tx.runAsync("UPDATE app_settings SET value=? WHERE key='reminders.minute'",String(old.minute));
    });
    throw e;
  }
}
/** Diagnóstico isolado: testa entrega mesmo sem OS pendente, sem mexer nos lembretes regulares. */
export async function scheduleReminderTest():Promise<Date>{
  const settings=await readPreferences();
  if(!settings.enabled)throw new Error('Ative os lembretes antes de testar.');
  await createChannel();
  const permission=await Notifications.getPermissionsAsync();
  if(!permission.granted)throw new Error('Permissão do Android não concedida para notificações.');
  const requests=await Notifications.getAllScheduledNotificationsAsync();
  for(const request of requests){
    if(request.content.data?.rotaOwner===TEST_OWNER)
      await Notifications.cancelScheduledNotificationAsync(request.identifier);
  }
  const at=new Date(Date.now()+2*60*1000);
  await Notifications.scheduleNotificationAsync({
    content:{
      title:'RotaManutenção • Aviso de teste',
      body:'Este é o teste das notificações locais. Nenhuma OS foi alterada.',
      data:{rotaOwner:TEST_OWNER,kind:'test'},
    },
    trigger:{type:Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds:120,repeats:false,channelId:CHANNEL},
  });
  const check=await Notifications.getAllScheduledNotificationsAsync();
  if(!check.some(x=>x.content.data?.rotaOwner===TEST_OWNER))
    throw new Error('Android não confirmou o agendamento do teste.');
  return at;
}
export async function countScheduledReminders():Promise<number>{
  const requests=await Notifications.getAllScheduledNotificationsAsync();
  return requests.filter(x=>x.content.data?.rotaOwner===OWNER).length;
}
