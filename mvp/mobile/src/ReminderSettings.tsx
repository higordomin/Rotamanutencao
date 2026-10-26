import React,{useEffect,useState} from 'react';
import {Alert,Linking,Platform,Pressable,StyleSheet,Text,View} from 'react-native';
import DateTimePicker,{DateTimePickerAndroid} from '@react-native-community/datetimepicker';
import {activateReminders,chooseReminderTime,getReminderScheduleBreakdown,
  deactivateReminders,getReminderSettings,scheduleReminderTest,syncLocalReminders,
  getLocalReminderPreview,saveNotificationAppearance} from './localReminders';
import {appearanceLabel,type NoticeAppearance,type NotificationStyle} from './notificationContent';
import type {ReminderPreviewLine} from './reminderPreview';
import {reminderTimeLabel} from './reminderPlan';
import {INDUSTRIAL as THEME,INTERACTION,SPACING,TYPE,RADII} from './design31';

const C={panel:THEME.surface,field:THEME.elevated,border:THEME.border,
  bg:THEME.background,text:THEME.ink,muted:THEME.muted,
  blue:THEME.accent,green:THEME.success,yellow:THEME.caution};

export function ReminderSettings(){
  const [enabled,setEnabled]=useState(false);
  const [hour,setHour]=useState(14);
  const [minute,setMinute]=useState(0);
  const [schedule,setSchedule]=useState({total:0,daily:0,priority:0});
  const [loading,setLoading]=useState(true);
  const [working,setWorking]=useState(false);
  const [iosClock,setIosClock]=useState(false);
  const [testTime,setTestTime]=useState<string|null>(null);
  const [appearance,setAppearance]=useState<NoticeAppearance>({style:'objetivo',showTag:true});
  const [previewOpen,setPreviewOpen]=useState(false);
  const [previewBusy,setPreviewBusy]=useState(false);
  const [preview,setPreview]=useState<ReminderPreviewLine[]>([]);
  const [previewError,setPreviewError]=useState<string|null>(null);
  const load=async()=>{
    const [settings,scheduled]=await Promise.all([getReminderSettings(),getReminderScheduleBreakdown()]);
    setEnabled(settings.enabled);setHour(settings.hour);setMinute(settings.minute);
    setAppearance(settings.appearance);setSchedule(scheduled);
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
  const setContent=async(next:NoticeAppearance)=>{
    await act(()=>saveNotificationAppearance(next));
  };
  const openAndroidTimingSettings=async()=>{
    try{
      if(Platform.OS==='android'){
        await Linking.sendIntent('android.settings.REQUEST_SCHEDULE_EXACT_ALARM');
      }else await Linking.openSettings();
    }catch{
      try{await Linking.openSettings();}
      catch(e){Alert.alert('Configurações indisponíveis',String(e));}
    }
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
    <Text accessibilityRole="header" style={s.heading}>Lembretes locais de manutenção</Text>
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
    <View style={s.testBox}>
      <Text style={[s.note,{color:C.text,fontWeight:'800'}]}>Como o aviso aparece</Text>
      <Text style={s.note}>Escolha a quantidade de informações nas notificações.</Text>
      <View style={s.row}>
        {(['objetivo','detalhado'] as NotificationStyle[]).map(style=><Pressable key={style}
          accessibilityRole="button" accessibilityState={{selected:appearance.style===style}}
          disabled={working||loading}
          onPress={()=>{void setContent({...appearance,style});}}
          style={[s.appearanceChoice,appearance.style===style&&s.appearanceActive]}>
          <Text style={[s.actionText,{color:appearance.style===style?C.bg:C.text}]}>
            {appearanceLabel(style)}
          </Text>
        </Pressable>)}
      </View>
      <Pressable accessibilityRole="button" accessibilityState={{checked:appearance.showTag}}
        disabled={working||loading} onPress={()=>{void setContent({...appearance,showTag:!appearance.showTag});}}
        style={s.previewToggle}>
        <Text style={[s.note,{color:C.text,fontWeight:'800'}]}>
          {appearance.showTag?'☑':'☐'} Mostrar TAG do equipamento nas OS
        </Text>
      </Pressable>
      <View style={s.exampleBox}>
        <Text style={[s.note,{color:C.blue,fontWeight:'800'}]}>Exemplo • {appearanceLabel(appearance.style)}</Text>
        <Text style={[s.note,{color:C.text,fontWeight:'800'}]}>OS • Prioridade alta: Inspecionar redutor</Text>
        <Text style={s.note}>
          {appearance.showTag?'TAG RD-101 · ':''}
          {appearance.style==='detalhado'?'Mecânica · Prazo 26/10/2026 · ':''}
          Atividade importante. Confira a programação.
        </Text>
      </View>
    </View>
    {Platform.OS==='android'&&<View style={s.testBox}>
      <Text style={[s.note,{color:C.text,fontWeight:'800'}]}>Pontualidade no Android</Text>
      <Text style={s.note}>Para reduzir atrasos, permita alarmes exatos nas configurações do Android:
        Configurações → Apps → Acesso especial → Alarmes e lembretes → RotaManutenção → Permitir.
        Também escolha bateria sem restrições e mantenha o canal de notificações ativado.</Text>
      <Pressable accessibilityRole="button" style={[s.action,{backgroundColor:C.border,alignSelf:'flex-start'}]}
        onPress={()=>{void openAndroidTimingSettings();}}>
        <Text style={[s.actionText,{color:C.text}]}>Abrir permissões de alarmes</Text>
      </Pressable>
      <Text style={s.note}>A permissão de notificações e a de alarmes exatos são diferentes.
        No Android 14+, a de alarmes pode vir desativada. Isso não garante pontualidade
        absoluta em dispositivos com restrições do fabricante.</Text>
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
      <Text style={s.note}>Teste com o mesmo gatilho de data dos avisos normais.
        O texto exibirá o horário programado. Compare com a hora real de chegada.</Text>
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
        <Text style={s.note}>Simulação do título e texto que aparecem na notificação.
          Não agenda, cancela ou altera avisos. Entrega depende do Android.</Text>
        {!!previewError&&<Text style={[s.note,{color:C.yellow}]}>{previewError}</Text>}
        {preview.length===0&&!previewError&&<Text style={s.note}>Nenhum aviso previsto.</Text>}
        {preview.map(item=><View key={item.key} style={s.previewLine}>
          <Text style={[s.note,{color:C.text,fontWeight:'800'}]}>
            {new Date(item.at).toLocaleString('pt-BR')} · {item.kind==='daily'?'Resumo diário':'Alerta prioritário'}
          </Text>
          <Text style={[s.note,{color:C.text,fontWeight:'800'}]}>{item.title}</Text>
          <Text style={s.note}>{item.body}</Text>
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
  card:{backgroundColor:C.panel,borderColor:C.border,borderWidth:1,borderRadius:RADII.card,padding:SPACING.lg,gap:SPACING.md,marginVertical:SPACING.sm},
  heading:{fontSize:TYPE.section,fontWeight:'900',color:C.text},
  note:{color:C.muted,fontSize:TYPE.caption,lineHeight:19},
  state:{fontSize:14,fontWeight:'800',marginTop:4},
  row:{flexDirection:'row',flexWrap:'wrap',gap:8},
  clockButton:{flexDirection:'row',gap:12,alignItems:'center',backgroundColor:C.field,
    borderWidth:1,borderColor:C.border,borderRadius:RADII.field,padding:14,minHeight:76},
  clockIcon:{fontSize:32,color:C.blue},
  clockTime:{fontSize:26,color:C.text,fontWeight:'900'},
  action:{paddingHorizontal:14,minHeight:INTERACTION.minTouch,justifyContent:'center',borderRadius:RADII.chip,backgroundColor:C.blue},
  actionText:{color:C.bg,fontWeight:'800',fontSize:TYPE.caption},
  testBox:{backgroundColor:C.field,borderColor:C.border,borderWidth:1,borderRadius:RADII.field,padding:SPACING.md,gap:9},
  previewToggle:{minHeight:INTERACTION.minTouch,flexDirection:'row',alignItems:'center',
    justifyContent:'space-between',gap:9},
  previewLine:{borderTopWidth:1,borderTopColor:C.border,paddingVertical:7,gap:3},
  appearanceChoice:{paddingHorizontal:14,minHeight:INTERACTION.minTouch,borderRadius:RADII.chip,borderWidth:1,
    borderColor:C.border,backgroundColor:C.panel,justifyContent:'center'},
  appearanceActive:{backgroundColor:C.blue,borderColor:C.blue},
  exampleBox:{backgroundColor:C.panel,borderWidth:1,borderColor:C.border,
    borderRadius:RADII.field,padding:12,gap:6},
});
