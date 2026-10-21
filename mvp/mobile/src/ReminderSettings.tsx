import React,{useEffect,useState} from 'react';
import {Alert,Pressable,StyleSheet,Text,View} from 'react-native';
import {activateReminders,chooseReminderHour,countScheduledReminders,
  deactivateReminders,getReminderSettings,syncLocalReminders} from './localReminders';
import {REMINDER_HOURS} from './reminderPlan';

const C={panel:'#111E31',border:'#24394F',bg:'#08101E',text:'#EFF6FF',
  muted:'#9CB0C8',blue:'#47B7F6',green:'#5DD7AC',yellow:'#FFD075'};

export function ReminderSettings(){
  const [enabled,setEnabled]=useState(false);
  const [hour,setHour]=useState(14);
  const [count,setCount]=useState(0);
  const [loading,setLoading]=useState(true);
  const [working,setWorking]=useState(false);
  const load=async()=>{
    const [settings,scheduled]=await Promise.all([getReminderSettings(),countScheduledReminders()]);
    setEnabled(settings.enabled);setHour(settings.hour);setCount(scheduled);
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
    try{await fn();await load();}
    catch(e){Alert.alert('Não foi possível alterar os lembretes',e instanceof Error?e.message:String(e));}
    finally{setWorking(false);}
  };
  return <View style={s.card}>
    <Text style={s.heading}>Lembretes locais de manutenção</Text>
    <Text style={s.note}>Opcional, sem internet e sem login. Avisos para OS e rotas próximas do prazo,
      vencidas, impedidas ou com pendências. Sem envio de dados para servidores.</Text>
    <Text style={[s.state,{color:enabled?C.green:C.muted}]}>
      {loading?'Carregando…':enabled?'● Lembretes ativados':'○ Lembretes desativados'}
    </Text>
    <Text style={s.note}>Horário dos avisos</Text>
    <View style={s.row}>
      {REMINDER_HOURS.map(h=><Pressable key={h} accessibilityRole="button"
        accessibilityState={{selected:hour===h}}
        disabled={working||loading}
        onPress={()=>{void act(()=>chooseReminderHour(h));}}
        style={[s.option,hour===h&&s.active]}>
        <Text style={[s.optionText,hour===h&&{color:C.bg}]}>{h}:00</Text>
      </Pressable>)}
    </View>
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
    <Text style={s.note}>{count} lembrete(s) agendado(s). O aplicativo atualiza os avisos ao ser aberto ou
      quando você altera uma OS ou rota. Limite de 40 agendamentos futuros, priorizando pendências.</Text>
    <Text style={[s.note,{color:C.yellow}]}>A entrega depende das permissões e das regras de economia
      de bateria do Android. Não há consulta ao banco com o app fechado; rotas além de 45 dias
      serão programadas ao abrir o aplicativo novamente. Os avisos não substituem o planejamento oficial.</Text>
  </View>;
}
const s=StyleSheet.create({
  card:{backgroundColor:C.panel,borderColor:C.border,borderWidth:1,borderRadius:14,padding:16,gap:10,marginVertical:10},
  heading:{fontSize:17,fontWeight:'800',color:C.text},
  note:{color:C.muted,fontSize:12,lineHeight:18},
  state:{fontSize:14,fontWeight:'800',marginTop:4},
  row:{flexDirection:'row',flexWrap:'wrap',gap:8},
  option:{backgroundColor:C.bg,paddingHorizontal:18,paddingVertical:11,borderRadius:10,borderWidth:1,borderColor:C.border},
  active:{backgroundColor:C.blue,borderColor:C.blue},
  optionText:{color:C.text,fontWeight:'800'},
  action:{paddingHorizontal:14,minHeight:44,justifyContent:'center',borderRadius:10},
  actionText:{color:C.bg,fontWeight:'800',fontSize:12},
});
