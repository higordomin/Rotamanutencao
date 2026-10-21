import * as Notifications from 'expo-notifications';
import {Platform} from 'react-native';
import {getDatabase,listOrders} from './db';
import {listRoutes} from './routes';
import {planReminders,isReminderHour,type ReminderInput,type ReminderCandidate} from './reminderPlan';

const CHANNEL='rotamanutencao-lembretes';
const OWNER='rotamanutencao-local-v1';
type Preferences={enabled:boolean;hour:number};
let syncQueue:Promise<void>=Promise.resolve();

Notifications.setNotificationHandler({
  handleNotification:async()=>({
    shouldShowBanner:true,shouldShowList:true,
    shouldPlaySound:false,shouldSetBadge:false,
  }),
});

async function createChannel():Promise<void>{
  if(Platform.OS==='android'){
    await Notifications.setNotificationChannelAsync(CHANNEL,{
      name:'Manutenções e rotas',
      importance:Notifications.AndroidImportance.DEFAULT,
      sound:null,
      vibrationPattern:[0,250],
      lightColor:'#47B7F6',
    });
  }
}
async function readPreferences():Promise<Preferences>{
  const db=await getDatabase();
  const values=await db.getAllAsync<{key:string;value:string}>(`SELECT key,value FROM app_settings
    WHERE key IN ('reminders.enabled','reminders.hour')`);
  const settings=new Map(values.map(x=>[x.key,x.value]));
  const hour=Number(settings.get('reminders.hour')??14);
  return {enabled:settings.get('reminders.enabled')==='1',hour:isReminderHour(hour)?hour:14};
}
export async function getReminderSettings():Promise<Preferences>{
  return readPreferences();
}
async function setPreference(key:string,value:string):Promise<void>{
  const db=await getDatabase();
  await db.runAsync(`INSERT INTO app_settings(key,value) VALUES(?,?)
    ON CONFLICT(key) DO UPDATE SET value=excluded.value`,key,value);
}
async function cancelOwned():Promise<void>{
  const requests=await Notifications.getAllScheduledNotificationsAsync();
  for(const request of requests){
    if(request.content.data?.rotaOwner===OWNER)
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
  if(!settings.enabled){await cancelOwned();return 0;}
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
  const next=planReminders(items,new Date(),settings.hour);
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
export async function chooseReminderHour(hour:number):Promise<void>{
  if(!isReminderHour(hour))throw new Error('Horário inválido.');
  const old=await readPreferences();
  await setPreference('reminders.hour',String(hour));
  try{await syncLocalReminders();}
  catch(e){await setPreference('reminders.hour',String(old.hour));throw e;}
}
export async function countScheduledReminders():Promise<number>{
  const requests=await Notifications.getAllScheduledNotificationsAsync();
  return requests.filter(x=>x.content.data?.rotaOwner===OWNER).length;
}
