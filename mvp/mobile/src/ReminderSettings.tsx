import React,{useEffect,useState} from 'react';
import {Alert,Platform,Pressable,StyleSheet,Text,View} from 'react-native';
import DateTimePicker,{DateTimePickerAndroid} from '@react-native-community/datetimepicker';
import {activateReminders,chooseReminderTime,getReminderScheduleBreakdown,
  deactivateReminders,getReminderSettings,scheduleReminderTest,syncLocalReminders,
  getLocalReminderPreview} from './localReminders';
import type {ReminderPreviewLine} from './reminderPreview';
import {reminderTimeLabel} from './reminderPlan';

const C={panel:'#111E31',border:'#24394F',bg:'#08101E',text:'#EFF6FF',
  muted:'#9CB0C8',blue:'#47B7F6',green:'#5DD7AC',yellow:'#FFD075'};

export function ReminderSettings(){
  const [enabled,setEnabled]=useState(false);
  const [hour,setHour]=useState(14);
  const [minute,setMinute]=useState(0);
  const [schedule,setSchedule]=useState({total:0,daily:0,priority:0});
  const [loading,setLoading]=useState(true);
  const [working,setWorking]=useState(false);
  const [iosClock,setIosClock]=useState(false);
  const [testTime,setTestTime]=useState<string|null>(null);
  const [previewOpen,setPreviewOpen]=useState(false);
  const [previewBusy,setPreviewBusy]=useState(false);
  const [preview,setPreview]=useState<ReminderPreviewLine[]>([]);
  const [previewError,setPreviewError]=useState<string|null>(null);
  const load=async()=>{
    const [settings,scheduled]=await Promise.all([getReminderSettings(),getReminderScheduleBreakdown()]);
    setEnabled(settings.enabled);setHour(settings.hour);setMinute(settings.minute);setSchedule(scheduled);
  };
  useEffect(()=>{
    let live=true;
    void load().catch(e=>{if(live)Alert.alert('Lembretes indisponíveis',String(e));})
      .finally(()=>{if(live)setLoading(false);});
    return()=>{live=false;};
  },[]);
  const act=async(fn:()=>Promise<unknown>)=>{
    if(working)return;
    setWorking(true);
    try{await fn();await load();setPreviewOpen(false);setPreview([]);}
    catch(e){Alert.alert('Não foi possível alterar os lembretes',e instanceof Error?e.message:String(e));}
    finally{setWorking(false);}
  };
  const dateValue=()=>{
    const date=new Date();
    date.setHours(hour,minute,0,0);
    return date;
  };
  const openClock=()=>{
    if(working||loading)return;
    if(Platform.OS==='android'){
      DateTimePickerAndroid.open({
        value:dateValue(),mode:'time',display:'clock',is24Hour:true,
        onChange:(event,selected)=>{
          if(event.type==='set'&&selected){
            void act(()=>chooseReminderTime(selected.getHours(),selected.getMinutes()));
          }
        },
      });
    }else setIosClock(true);
  };
  const showPreview=async()=>{
    if(working||loading||previewBusy)return;
    if(previewOpen){setPreviewOpen(false);return;}
    setPreviewBusy(true);setPreviewError(null);
    try{
      const data=await getLocalReminderPreview();
      setPreview(data);setPreviewOpen(true);
    }catch(e){
      setPreviewError(e instanceof Error?e.message:String(e));
      setPreviewOpen(true);
    }finally{setPreviewBusy(false);}
  };
  const showTest=async()=>{
    if(working||loading)return;
    setWorking(true);
    try {
      const at=await scheduleReminderTest();
      const msg=at.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
      setTestTime(msg);
      Alert.alert('Teste programado',`Aviso local previsto para aproximadamente ${msg} (daqui a 2 minutos). Bloqueie a tela ou deixe o aplicativo em segundo plano.`);
      await load();
    }catch(e){
      Alert.alert('Teste não programado',e instanceof Error?e.message:String(e));
    }finally{setWorking(false);}
  };
  return <View style={s.card}>
    <Text style={s.heading}>Lembretes locais de manutenção</Text>
    <Text style={s.note}>Um resumo diário da programação e alertas individuais somente para
      situações prioritárias: anomalias, impedimentos, atrasos e OS de prioridade Alta.
      Funciona sem internet, login ou envio de dados para servidores.</Text>
    <Text style={[s.state,{color:enabled?C.green:C.muted}]}>
      {loading?'Carregando…':enabled?'● Lembretes ativados':'○ Lembretes desativados'}
    </Text>
    <Text style={s.note}>Horário do resumo diário (relógio Android)</Text>
    <Pressable accessibilityRole="button" accessibilityLabel="Escolher horário do lembrete"
      disabled={working||loading} onPress={openClock} style={s.clockButton}>
      <Text style={s.clockIcon}>◷</Text>
      <View style={{flex:1}}>
        <Text style={s.clockTime}>{reminderTimeLabel(hour,minute)}</Text>
        <Text style={s.note}>Toque para escolher hora e minuto</Text>
      </View>
      <Text style={{color:C.blue,fontWeight:'800'}}>Alterar</Text>
    </Pressable>
    {Platform.OS==='ios'&&iosClock&&<View>
      <DateTimePicker value={dateValue()} mode="time" display="spinner" onChange={(_event,selected)=>{
        if(selected)void act(()=>chooseReminderTime(selected.getHours(),selected.getMinutes()));
      }}/>
      <Pressable onPress={()=>setIosClock(false)} style={s.action}>
        <Text style={s.actionText}>Fechar relógio</Text>
      </Pressable>
    </View>}
    <View style={s.row}>
      <Pressable accessibilityRole="button" disabled={working||loading}
        style={[s.action,{backgroundColor:enabled?C.border:C.blue}]}
        onPress={()=>{void act(async()=>{
          if(enabled)await deactivateReminders();
          else await activateReminders();
        });}}>
        <Text style={[s.actionText,enabled&&{color:C.text}]}>
          {working?'Aguarde…':enabled?'Desativar lembretes':'Ativar lembretes'}
        </Text>
      </Pressable>
      {enabled&&<Pressable accessibilityRole="button" disabled={working}
        style={[s.action,{backgroundColor:C.border}]}
        onPress={()=>{void act(()=>syncLocalReminders());}}>
        <Text style={[s.actionText,{color:C.text}]}>Revisar avisos</Text>
      </Pressable>}
    </View>
    {enabled&&<View style={s.testBox}>
      <Text style={[s.note,{color:C.text,fontWeight:'800'}]}>Verificar se o Android recebe notificações</Text>
      <Text style={s.note}>Este teste independe de OS e rotas; programe um aviso para daqui a 2 minutos.</Text>
      <Pressable accessibilityRole="button" disabled={working} onPress={()=>{void showTest();}}
        style={[s.action,{alignSelf:'flex-start',backgroundColor:C.blue}]}>
        <Text style={s.actionText}>🔔 Testar notificação em 2 minutos</Text>
      </Pressable>
      {!!testTime&&<Text style={[s.note,{color:C.green}]}>Teste programado para aproximadamente {testTime}. Confira a bandeja de notificações.</Text>}
    </View>}
    <View style={s.testBox}>
      <Text style={[s.note,{color:C.text,fontWeight:'800'}]}>Agendamentos no Android</Text>
      <Text style={s.note}>📅 {schedule.daily} resumo(s) diários programados para os próximos sete dias.</Text>
      <Text style={s.note}>⚠ {schedule.priority} alerta(s) prioritários individuais programados.</Text>
      <Text style={s.note}>Total: {schedule.total} notificações de manutenção. O teste de dois minutos
        não faz parte dessa contagem.</Text>
    </View>
    <View style={s.testBox}>
      <Pressable accessibilityRole="button" accessibilityState={{expanded:previewOpen}}
        disabled={working||loading||previewBusy} onPress={()=>{void showPreview();}}
        style={s.previewToggle}>
        <Text style={[s.actionText,{color:C.blue}]}>
          {previewBusy?'Consultando...':previewOpen?'Ocultar prévia':'Ver próximos avisos previstos'}
        </Text>
        <Text style={{color:C.blue,fontWeight:'800'}}>{previewOpen?'⌃':'⌄'}</Text>
      </Pressable>
      {previewOpen&&<>
        <Text style={s.note}>Simulação com as OS e rotas atuais. Não agenda,
          cancela ou altera notificações. Entrega depende do Android.</Text>
        {!!previewError&&<Text style={[s.note,{color:C.yellow}]}>{previewError}</Text>}
        {preview.length===0&&!previewError&&<Text style={s.note}>Nenhum aviso previsto.</Text>}
        {preview.map(item=><View key={item.key} style={s.previewLine}>
          <Text style={[s.note,{color:C.text,fontWeight:'800'}]}>
            {new Date(item.at).toLocaleString('pt-BR')} · {item.kind==='daily'?'Resumo diário':'Alerta prioritário'}
          </Text>
          <Text style={s.note}>{item.title}</Text>
        </View>)}
      </>}
    </View>
    <Text style={s.note}>O texto dos resumos é preparado a partir das OS e rotas registradas quando
      você abre o aplicativo ou altera uma manutenção. Dados modificados com o aplicativo fechado
      só serão refletidos após uma nova sincronização local.</Text>
    <Text style={s.note}>Se o horário escolhido já passou hoje, o aviso de hoje não é enviado retroativamente:
      um aviso pendente será programado para o próximo horário possível, normalmente amanhã.</Text>
    <Text style={[s.note,{color:C.yellow}]}>O Android pode atrasar avisos devido às permissões e
      à economia de bateria. Se o teste não chegar, confira as notificações do aplicativo e o
      canal “Manutenções e rotas” nas configurações do Android. O aplicativo não consulta o banco com a tela fechada.</Text>
  </View>;
}
const s=StyleSheet.create({
  card:{backgroundColor:C.panel,borderColor:C.border,borderWidth:1,borderRadius:14,padding:16,gap:10,marginVertical:10},
  heading:{fontSize:17,fontWeight:'800',color:C.text},
  note:{color:C.muted,fontSize:12,lineHeight:18},
  state:{fontSize:14,fontWeight:'800',marginTop:4},
  row:{flexDirection:'row',flexWrap:'wrap',gap:8},
  clockButton:{flexDirection:'row',gap:12,alignItems:'center',backgroundColor:C.bg,
    borderWidth:1,borderColor:C.blue,borderRadius:12,padding:12,minHeight:72},
  clockIcon:{fontSize:32,color:C.blue},
  clockTime:{fontSize:26,color:C.text,fontWeight:'900'},
  action:{paddingHorizontal:14,minHeight:44,justifyContent:'center',borderRadius:10,backgroundColor:C.blue},
  actionText:{color:C.bg,fontWeight:'800',fontSize:12},
  testBox:{backgroundColor:C.bg,borderColor:C.border,borderWidth:1,borderRadius:12,padding:12,gap:9},
  previewToggle:{minHeight:44,flexDirection:'row',alignItems:'center',
    justifyContent:'space-between',gap:9},
  previewLine:{borderTopWidth:1,borderTopColor:C.border,paddingVertical:7,gap:3},
});
