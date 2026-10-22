import React,{useMemo,useState} from 'react';
import {Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import type {WorkOrder,Category} from './types';
import type {Route} from './routes';
import {localDate} from './logic';
import {brazilianDate,monthGrid,pageFromDate,shiftMonth} from './calendar';
import {
  agendaAreas,agendaDayCounts,agendaPeriod,agendaSummary,agendaWindow,
  buildAgendaEntries,filterAgenda,shiftAgendaDate,weekRange,
  type AgendaEntry,type AgendaType,type AgendaSpecialty,type AgendaView,
} from './operationalAgenda';

const C={bg:'#08101E',panel:'#111E31',field:'#16273D',line:'#24394F',
  text:'#EFF6FF',muted:'#9CB0C8',blue:'#47B7F6',amber:'#FFD075',
  red:'#FF7D8B',green:'#5DD7AC'};
const MONTHS=['janeiro','fevereiro','março','abril','maio','junho','julho',
  'agosto','setembro','outubro','novembro','dezembro'];
const DAYS=['S','T','Q','Q','S','S','D'];
const SPECIALTIES:AgendaSpecialty[]=['Todas','Lubrificação','Mecânica','Elétrica','Inspeção'];

function Chip({title,selected,onPress}:{title:string;selected:boolean;onPress:()=>void}){
  return <Pressable accessibilityRole="button" accessibilityState={{selected}}
    style={[s.chip,selected&&s.chipSelected]} onPress={onPress}>
    <Text style={[s.chipLabel,selected&&{color:C.bg}]}>{title}</Text>
  </Pressable>;
}
function AgendaCard({entry,onOpenRoute,onOpenOrder}:{
  entry:AgendaEntry;onOpenRoute:(id:string)=>void;
  onOpenOrder:(id:string,mode:'execute'|'edit')=>void;
}){
  const label=entry.attention?'⚠ Pendência'
    :entry.blocked?'⚠ Impedida':entry.overdue?'● Vencida'
      :entry.today?'● Hoje':entry.unscheduled?'● Sem data':'● Programada';
  const color=entry.overdue?C.red:entry.attention||entry.blocked?C.amber:
    entry.today?C.green:C.blue;
  return <View style={s.card}>
    <View style={s.lineRow}>
      <Text style={s.kind}>{entry.kind==='route'?'ROTA':'ORDEM DE SERVIÇO'}</Text>
      <Text style={[s.status,{color}]}>{label}</Text>
    </View>
    <Text style={s.cardTitle}>{entry.title}</Text>
    <Text style={s.detail}>{entry.subtitle} · {entry.area}</Text>
    <Text style={s.detail}>Prazo: {entry.dueDate?brazilianDate(entry.dueDate):'Sem data programada'}</Text>
    {entry.priority==='Alta'&&<Text style={[s.detail,{color:C.red,fontWeight:'800'}]}>Prioridade alta</Text>}
    {entry.partial&&<Text style={[s.detail,{color:C.amber}]}>Execução parcial — retorno necessário</Text>}
    {entry.blocked&&<Text style={[s.detail,{color:C.amber}]}>OS impedida — consulte o motivo</Text>}
    <View style={s.lineRow}>
      {entry.kind==='route'?
        <Pressable accessibilityRole="button" style={s.primary}
          onPress={()=>onOpenRoute(entry.id)}><Text style={s.primaryText}>Abrir rota ›</Text></Pressable>:
        <>
          <Pressable accessibilityRole="button" style={s.primary}
            onPress={()=>onOpenOrder(entry.id,'execute')}>
            <Text style={s.primaryText}>{entry.blocked?'Ver impedimento':'Executar OS'} ›</Text>
          </Pressable>
          <Pressable accessibilityRole="button" style={s.secondary}
            onPress={()=>onOpenOrder(entry.id,'edit')}>
            <Text style={s.secondaryText}>Editar programação</Text>
          </Pressable>
        </>}
    </View>
  </View>;
}

/** Agenda de leitura dos dados locais: só as ações explícitas abrem OS ou rotas. */
export function OperationalAgenda({orders,routes,onOpenRoute,onOpenOrder}:{
  orders:WorkOrder[];routes:Route[];
  onOpenRoute:(id:string)=>void;
  onOpenOrder:(id:string,mode:'execute'|'edit')=>void;
}){
  const [day,setDay]=useState(()=>localDate());
  const [view,setView]=useState<AgendaView>('day');
  const [type,setType]=useState<AgendaType>('all');
  const [specialty,setSpecialty]=useState<AgendaSpecialty>('Todas');
  const [area,setArea]=useState('');
  const [showMore,setShowMore]=useState(false);
  const [showBacklog,setShowBacklog]=useState(true);
  const today=localDate();
  const entries=useMemo(()=>buildAgendaEntries(orders,routes,today),[orders,routes,today]);
  const areas=useMemo(()=>agendaAreas(entries),[entries]);
  const filtered=useMemo(()=>filterAgenda(entries,{type,specialty,area}),[entries,type,specialty,area]);
  const {scheduled,backlog}=useMemo(()=>agendaWindow(filtered,day,view),[filtered,day,view]);
  const counts=useMemo(()=>agendaDayCounts(filtered),[filtered]);
  const stats=useMemo(()=>agendaSummary(filtered,today),[filtered,today]);
  const period=agendaPeriod(day,view);
  const page=pageFromDate(day);
  const grid=useMemo(()=>monthGrid(page),[page.year,page.month]);
  const week=useMemo(()=>weekRange(day),[day]);
  const setFocus=(next:string,nextView:AgendaView=view)=>{
    setDay(next);setView(nextView);setShowMore(false);
  };
  const move=(delta:-1|1)=>{
    try{
      if(view==='month'){
        const target=shiftMonth(page,delta);
        if(target)setFocus(`${String(target.year).padStart(4,'0')}-${String(target.month).padStart(2,'0')}-01`);
      }else setFocus(shiftAgendaDate(day,delta*(view==='week'?7:1)));
    }catch{/* fora dos limites da agenda */}
  };
  const changeType=(value:AgendaType)=>{
    setType(value);setShowMore(false);
    if(value==='route')setSpecialty('Todas');
  };
  const visibleScheduled=showMore?scheduled:scheduled.slice(0,40);
  const visibleBacklog=showMore?backlog:backlog.slice(0,40);
  return <ScrollView style={s.bg} keyboardShouldPersistTaps="handled"
    contentContainerStyle={s.page}>
    <View style={s.heading}>
      <Text style={s.title}>Agenda de manutenção</Text>
      <Text style={s.detail}>OS e rotas do seu aparelho, sem login nem internet.</Text>
    </View>
    <View style={s.stats}>
      <View style={s.metric}><Text style={[s.metricNumber,{color:C.red}]}>{stats.overdue}</Text><Text style={s.metricLabel}>Atrasadas</Text></View>
      <View style={s.metric}><Text style={[s.metricNumber,{color:C.green}]}>{stats.today}</Text><Text style={s.metricLabel}>Hoje</Text></View>
      <View style={s.metric}><Text style={[s.metricNumber,{color:C.amber}]}>{stats.attention}</Text><Text style={s.metricLabel}>Pendências</Text></View>
    </View>
    <Text style={s.helper}>{stats.orders} OS · {stats.routes} rotas · {stats.future} programadas no futuro.
      Os indicadores podem se sobrepor (ex.: uma OS impedida e atrasada).</Text>
    <View style={s.section}>
      <Text style={s.sectionTitle}>Visualização</Text>
      <View style={s.lineRow}>
        <Chip title="Dia" selected={view==='day'} onPress={()=>setFocus(day,'day')}/>
        <Chip title="Semana" selected={view==='week'} onPress={()=>setFocus(day,'week')}/>
        <Chip title="Mês" selected={view==='month'} onPress={()=>setFocus(day,'month')}/>
      </View>
      <View style={[s.lineRow,{justifyContent:'space-between',marginTop:12}]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Período anterior" onPress={()=>move(-1)}
          style={s.arrow}><Text style={s.arrowText}>‹</Text></Pressable>
        <View style={{alignItems:'center',flex:1}}>
          <Text style={s.period}>{view==='day'?brazilianDate(day):
            view==='week'?brazilianDate(period.start)+' a '+brazilianDate(period.end):
            MONTHS[page.month-1]+' de '+page.year}</Text>
          <Pressable accessibilityRole="button" onPress={()=>setFocus(today,'day')}>
            <Text style={s.todayLink}>Ir para hoje</Text>
          </Pressable>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Próximo período" onPress={()=>move(1)}
          style={s.arrow}><Text style={s.arrowText}>›</Text></Pressable>
      </View>
      {view==='week'&&<View style={s.grid}>
        {week.dates.map((date,index)=>{
          const selected=date===day;
          return <Pressable key={date} accessibilityRole="button"
            accessibilityLabel={`Ver ${brazilianDate(date)}, ${counts.get(date)??0} atividade(s)`}
            accessibilityState={{selected}}
            onPress={()=>setFocus(date,'day')} style={[s.dayCell,selected&&s.daySelected]}>
            <Text style={s.weekLetter}>{DAYS[index]}</Text>
            <Text style={[s.dayNumber,selected&&{color:C.bg}]}>{Number(date.slice(-2))}</Text>
            <Text style={[s.dayCount,selected&&{color:C.bg}]}>{counts.get(date)??'·'}</Text>
          </Pressable>;
        })}
      </View>}
      {view==='month'&&<>
        <View style={s.grid}>{DAYS.map((d,i)=><View key={i} style={s.dayCell}><Text style={s.weekLetter}>{d}</Text></View>)}</View>
        <View style={s.grid}>{grid.map((date,index)=>
          <View key={date??'gap'+index} style={s.dayCell}>
            {date&&<Pressable accessibilityRole="button" style={[s.calendarDate,
              date===today&&s.todayOutline,date===day&&s.daySelected]}
              accessibilityLabel={`Abrir dia ${brazilianDate(date)}, ${counts.get(date)??0} atividade(s)`}
              accessibilityState={{selected:date===day}}
              onPress={()=>setFocus(date,'day')}>
              <Text style={[s.dayNumber,date===day&&{color:C.bg}]}>{Number(date.slice(-2))}</Text>
              <Text style={[s.dayCount,date===day&&{color:C.bg}]}>{counts.get(date)??'·'}</Text>
            </Pressable>}
          </View>
        )}</View>
      </>}
    </View>
    <View style={s.section}>
      <Text style={s.sectionTitle}>Filtrar atividades</Text>
      <View style={s.lineRow}>
        <Chip title="Tudo" selected={type==='all'} onPress={()=>changeType('all')}/>
        <Chip title="OS" selected={type==='order'} onPress={()=>changeType('order')}/>
        <Chip title="Rotas" selected={type==='route'} onPress={()=>changeType('route')}/>
      </View>
      <Text style={s.filterLabel}>Especialidade</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={s.lineRow}>{SPECIALTIES.map(item=><Chip key={item} title={item}
          selected={specialty===item} onPress={()=>{setSpecialty(item);setShowMore(false);
            if(item!=='Todas'&&type==='route')setType('all');}}/>)}</View>
      </ScrollView>
      <Text style={s.helper}>Rotas não possuem especialidade cadastrada nesta versão.
        Selecionar uma especialidade exibe somente OS correspondentes.</Text>
      <Text style={s.filterLabel}>Área / setor</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={s.lineRow}>
          <Chip title="Todas as áreas" selected={!area} onPress={()=>{setArea('');setShowMore(false);}}/>
          {areas.map(item=><Chip key={item} title={item} selected={area===item}
            onPress={()=>{setArea(item);setShowMore(false);}}/>)}
        </View>
      </ScrollView>
    </View>
    <View style={s.section}>
      <Text style={s.sectionTitle}>{view==='day'?'Programadas neste dia':
        view==='week'?'Programadas nesta semana':'Programadas neste mês'} ({scheduled.length})</Text>
      {!scheduled.length&&<Text style={s.helper}>Nenhuma atividade com prazo nesse período e nos filtros escolhidos.</Text>}
      {visibleScheduled.map(item=><AgendaCard key={item.kind+item.id} entry={item}
        onOpenRoute={onOpenRoute} onOpenOrder={onOpenOrder}/>)}
      {!showMore&&scheduled.length>40&&<Pressable style={s.secondary} onPress={()=>setShowMore(true)}>
        <Text style={s.secondaryText}>Mostrar todas as {scheduled.length} atividades deste período</Text>
      </Pressable>}
    </View>
    <View style={s.section}>
      <Pressable accessibilityRole="button"
        accessibilityState={{expanded:showBacklog}}
        onPress={()=>setShowBacklog(v=>!v)} style={s.lineRow}>
        <Text style={[s.sectionTitle,{flex:1}]}>Fora do período: atrasos e pendências ({backlog.length})</Text>
        <Text style={s.arrowText}>{showBacklog?'⌄':'›'}</Text>
      </Pressable>
      <Text style={s.helper}>Impedimentos, anomalias, execuções parciais e tarefas vencidas
        continuam visíveis aqui quando não estão no intervalo selecionado.</Text>
      {showBacklog&&<>
        {!backlog.length&&<Text style={s.helper}>Nenhum retorno fora do período.</Text>}
        {visibleBacklog.map(item=><AgendaCard key={item.kind+item.id} entry={item}
          onOpenRoute={onOpenRoute} onOpenOrder={onOpenOrder}/>)}
        {!showMore&&backlog.length>40&&<Pressable style={s.secondary} onPress={()=>setShowMore(true)}>
          <Text style={s.secondaryText}>Mostrar todas as {backlog.length} pendências</Text>
        </Pressable>}
      </>}
    </View>
    <Text style={s.helper}>A agenda apresenta apenas a próxima data atualmente cadastrada.
      A recorrência futura só aparece após a execução e o reagendamento.
      Nenhuma manutenção é marcada como realizada automaticamente.</Text>
  </ScrollView>;
}

const s=StyleSheet.create({
  bg:{flex:1,backgroundColor:C.bg},page:{padding:16,paddingBottom:70,gap:12},
  heading:{padding:5},title:{color:C.text,fontSize:21,fontWeight:'900'},
  detail:{color:C.muted,fontSize:12,marginTop:5,lineHeight:17},
  helper:{color:C.muted,fontSize:11,lineHeight:17,marginTop:4},
  stats:{flexDirection:'row',gap:8},
  metric:{flex:1,backgroundColor:C.panel,borderWidth:1,borderColor:C.line,
    padding:12,borderRadius:12},
  metricNumber:{fontWeight:'900',fontSize:24},metricLabel:{color:C.muted,fontSize:11},
  section:{backgroundColor:C.panel,padding:12,borderRadius:13,
    borderWidth:1,borderColor:C.line,gap:8},
  sectionTitle:{color:C.text,fontSize:15,fontWeight:'800'},
  lineRow:{flexDirection:'row',gap:7,flexWrap:'wrap',alignItems:'center'},
  chip:{paddingVertical:10,paddingHorizontal:12,borderWidth:1,borderColor:C.line,
    backgroundColor:C.field,borderRadius:9,minHeight:40},
  chipSelected:{backgroundColor:C.blue,borderColor:C.blue},
  chipLabel:{fontSize:12,color:C.text,fontWeight:'700'},
  arrow:{width:42,height:42,backgroundColor:C.field,alignItems:'center',justifyContent:'center',
    borderRadius:10,borderWidth:1,borderColor:C.line},
  arrowText:{fontSize:25,color:C.text},
  period:{fontSize:14,fontWeight:'800',color:C.text,textAlign:'center'},
  todayLink:{color:C.blue,fontSize:12,fontWeight:'700',padding:7},
  grid:{flexDirection:'row',flexWrap:'wrap',marginTop:7},
  dayCell:{width:'14.285714%',alignItems:'center',justifyContent:'center',minHeight:48},
  daySelected:{backgroundColor:C.blue,borderRadius:10},
  todayOutline:{borderColor:C.blue,borderWidth:1,borderRadius:10},
  calendarDate:{height:46,width:42,alignItems:'center',justifyContent:'center'},
  dayNumber:{fontSize:13,fontWeight:'800',color:C.text},
  dayCount:{color:C.blue,fontSize:10,fontWeight:'800'},
  weekLetter:{color:C.muted,fontSize:10,fontWeight:'700'},
  filterLabel:{fontSize:12,fontWeight:'700',color:C.text,marginTop:5},
  card:{backgroundColor:C.field,borderRadius:10,borderWidth:1,borderColor:C.line,
    padding:12,gap:5,marginTop:5},
  kind:{fontSize:10,fontWeight:'800',color:C.muted,letterSpacing:.3},
  status:{fontSize:11,fontWeight:'800'},
  cardTitle:{color:C.text,fontSize:14,fontWeight:'800'},
  primary:{backgroundColor:C.blue,borderRadius:9,paddingVertical:10,
    paddingHorizontal:12,minHeight:40,justifyContent:'center'},
  primaryText:{color:C.bg,fontWeight:'800',fontSize:12},
  secondary:{borderWidth:1,borderColor:C.line,backgroundColor:C.panel,
    borderRadius:9,padding:10,minHeight:40,justifyContent:'center'},
  secondaryText:{color:C.text,fontWeight:'700',fontSize:11},
});
