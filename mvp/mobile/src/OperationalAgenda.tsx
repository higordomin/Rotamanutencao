import React,{useEffect,useMemo,useState} from 'react';
import {Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import type {WorkOrder} from './types';
import type {Route} from './routes';
import {localDate} from './logic';
import {brazilianDate,monthGrid,pageFromDate,shiftMonth} from './calendar';
import {
  agendaAreas,agendaDayCounts,agendaPeriod,agendaSummary,agendaWindow,
  buildAgendaEntries,filterAgenda,shiftAgendaDate,weekRange,
  type AgendaEntry,type AgendaType,type AgendaSpecialty,type AgendaView,
} from './operationalAgenda';
import {agendaPreviewRows,agendaVisualLabel,agendaVisualStatus} from './agendaVisual';
import {buildShiftFocus,shiftFocusPreview} from './shiftFocus';
import {readWeeklyProductivity,type WeeklyProductivity} from './weeklyProductivity';

const C={bg:'#08101E',panel:'#111E31',field:'#16273D',line:'#24394F',
  text:'#EFF6FF',muted:'#9CB0C8',blue:'#47B7F6',amber:'#FFD075',
  red:'#FF7D8B',green:'#5DD7AC'};
const MONTHS=['janeiro','fevereiro','março','abril','maio','junho','julho',
  'agosto','setembro','outubro','novembro','dezembro'];
const WEEKDAYS=['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'];
const SPECIALTIES:AgendaSpecialty[]=['Todas','Lubrificação','Mecânica','Elétrica','Inspeção','Segurança'];

function Chip({title,selected,onPress}:{title:string;selected:boolean;onPress:()=>void}){
  return <Pressable accessibilityRole="button" accessibilityState={{selected}}
    style={[s.chip,selected&&s.chipActive]} onPress={onPress}>
    <Text style={[s.chipText,selected&&{color:C.bg}]}>{title}</Text>
  </Pressable>;
}

/** Um único toque abre a OS ou rota. Editar OS continua acessível, mas discreto. */
function ActivityRow({item,onOpenRoute,onOpenOrder}:{
  item:AgendaEntry;
  onOpenRoute:(id:string)=>void;
  onOpenOrder:(id:string,mode:'execute'|'edit')=>void;
}){
  const state=agendaVisualStatus(item);
  const color=state==='overdue'?C.red:state==='blocked'||state==='attention'?C.amber:
    state==='today'?C.green:C.blue;
  const open=()=>item.kind==='route'?onOpenRoute(item.id):onOpenOrder(item.id,'execute');
  return <View style={s.activityRow}>
    <Pressable accessibilityRole="button" accessibilityLabel={`Abrir ${item.kind==='route'?'rota':'OS'} ${item.title}`}
      onPress={open} style={s.activityMain}>
      <View style={[s.activityMarker,{borderColor:color+'66',backgroundColor:color+'18'}]}>
        <Text style={[s.activitySymbol,{color}]}>{item.kind==='route'?'⇢':'●'}</Text>
      </View>
      <View style={{flex:1,gap:3}}>
        <Text style={s.activityTitle} numberOfLines={2}>{item.title}</Text>
        <Text style={s.activitySubtitle} numberOfLines={1}>
          {item.kind==='route'?'Rota':item.specialty} · {item.area}
        </Text>
        <Text style={[s.activityState,{color}]}>{agendaVisualLabel(item)}
          {item.priority==='Alta'?' · Prioridade alta':''}
          {item.dueDate&&!item.today?' · '+brazilianDate(item.dueDate):''}
        </Text>
      </View>
      <Text style={s.chevron}>›</Text>
    </Pressable>
    {item.kind==='order'&&<Pressable accessibilityRole="button"
      accessibilityLabel={`Editar programação da OS ${item.title}`}
      style={s.editLink} onPress={()=>onOpenOrder(item.id,'edit')}>
      <Text style={s.editText}>Editar</Text>
    </Pressable>}
  </View>;
}

/** Agenda visual baseada na prévia 0.21, mantendo todo o planejamento e filtros. */
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
  const [filtersOpen,setFiltersOpen]=useState(false);
  const [backlogOpen,setBacklogOpen]=useState(false);
  const [moreScheduled,setMoreScheduled]=useState(false);
  const [moreBacklog,setMoreBacklog]=useState(false);
  const [shiftMode,setShiftMode]=useState(false);
  const [productivity,setProductivity]=useState<WeeklyProductivity|null>(null);
  const [productivityError,setProductivityError]=useState(false);
  const today=localDate();
  const entries=useMemo(()=>buildAgendaEntries(orders,routes,today),[orders,routes,today]);
  const areas=useMemo(()=>agendaAreas(entries),[entries]);
  const filtered=useMemo(()=>filterAgenda(entries,{type,specialty,area}),[entries,type,specialty,area]);
  const {scheduled,backlog}=useMemo(()=>agendaWindow(filtered,day,view),[filtered,day,view]);
  const counts=useMemo(()=>agendaDayCounts(filtered),[filtered]);
  const stats=useMemo(()=>agendaSummary(filtered,today),[filtered,today]);
  const shift=useMemo(()=>buildShiftFocus(filtered,today),[filtered,today]);
  useEffect(()=>{
    if(!shiftMode)return;
    let active=true;
    void readWeeklyProductivity(today).then(result=>{
      if(active){setProductivity(result);setProductivityError(false);}
    }).catch(()=>{if(active){setProductivity(null);setProductivityError(true);}});
    return()=>{active=false;};
  },[shiftMode,orders,routes,today]);
  const week=useMemo(()=>weekRange(day),[day]);
  const page=pageFromDate(day);
  const grid=useMemo(()=>monthGrid(page),[page.year,page.month]);
  const period=agendaPeriod(day,view);
  const hasFilters=type!=='all'||specialty!=='Todas'||!!area;

  const focus=(target:string,newView:AgendaView=view)=>{
    setDay(target);setView(newView);setMoreScheduled(false);setMoreBacklog(false);
  };
  const changeFilter=()=>{
    setMoreScheduled(false);setMoreBacklog(false);
  };
  const move=(delta:-1|1)=>{
    try{
      if(view==='month'){
        const p=shiftMonth(page,delta);
        if(p)focus(`${String(p.year).padStart(4,'0')}-${String(p.month).padStart(2,'0')}-01`,'month');
      }else focus(shiftAgendaDate(day,delta*7),view);
    }catch{/* navegação não ultrapassa os limites da agenda */}
  };
  const selectType=(value:AgendaType)=>{
    setType(value);if(value==='route')setSpecialty('Todas');changeFilter();
  };
  const mainRows=agendaPreviewRows(scheduled,moreScheduled);
  const backlogRows=agendaPreviewRows(backlog,moreBacklog);
  const shiftRows=shiftFocusPreview(shift.entries,moreScheduled);
  const currentRows=shiftMode?shiftRows:mainRows;
  const currentCount=shiftMode?shift.total:scheduled.length;

  return <ScrollView style={s.bg} keyboardShouldPersistTaps="handled"
    contentContainerStyle={s.page}>
    <View style={s.header}>
      <Text style={s.heading}>Minha agenda de manutenção</Text>
      <Text style={s.subheading}>OS e rotas organizadas para o seu dia.</Text>
    </View>

    <View style={s.metrics}>
      <View style={s.metric}>
        <Text style={[s.metricValue,{color:C.red}]}>{stats.overdue}</Text>
        <Text style={s.metricLabel}>Atrasadas</Text>
      </View>
      <View style={s.metric}>
        <Text style={[s.metricValue,{color:C.green}]}>{stats.today}</Text>
        <Text style={s.metricLabel}>Para hoje</Text>
      </View>
      <View style={s.metric}>
        <Text style={[s.metricValue,{color:C.blue}]}>{stats.future}</Text>
        <Text style={s.metricLabel}>Programadas</Text>
      </View>
    </View>

    <View style={s.focusControls}>
      <Text style={s.focusHelp}>Use a agenda tradicional ou foque no que exige ação.</Text>
      <Pressable accessibilityRole="button" accessibilityState={{selected:shiftMode}}
        accessibilityLabel={shiftMode?'Voltar ao calendário':'Ativar foco do turno'}
        onPress={()=>{setShiftMode(v=>!v);setMoreScheduled(false);setMoreBacklog(false);}}
        style={[s.focusButton,shiftMode&&s.focusButtonActive]}>
        <Text style={[s.focusButtonText,shiftMode&&{color:C.bg}]}>
          {shiftMode?'← Ver calendário':'⚡ Foco do turno'}
        </Text>
      </Pressable>
    </View>
    {shiftMode&&<View style={s.shiftPanel}>
      <Text style={s.sectionTitle}>Prioridades do turno</Text>
      <Text style={s.hint}>Uma linha por OS ou rota. Impedimentos exigem liberação;
        esta tela não executa nem conclui serviços automaticamente.</Text>
      <View style={s.focusNumbers}>
        <Text style={s.focusMetric}>⚠ {shift.attention} ocorrência(s)</Text>
        <Text style={s.focusMetric}>↻ {shift.overdue} atraso(s)</Text>
        <Text style={s.focusMetric}>⛔ {shift.blocked} impedimento(s)</Text>
        <Text style={s.focusMetric}>📅 {shift.dueToday} para hoje</Text>
        <Text style={s.focusMetric}>↑ {shift.highSoon} alta(s) nos próximos 7 dias</Text>
      </View>
      <View style={s.weekSummary}>
        <Text style={s.filterTitle}>Registros dos últimos 7 dias</Text>
        {productivity?<Text style={s.weekText}>
          ✓ {productivity.osCompleted} OS concluída(s) ·
          ↻ {productivity.osPartial} execução(ões) parcial(is) ·
          ⇢ {productivity.routesFinished} rota(s) finalizada(s)
        </Text>:<Text style={s.hint}>{productivityError?'Não foi possível consultar os registros.':'Consultando registros locais…'}</Text>}
        <Text style={s.hint}>Contagens reais do SQLite; não representam horas trabalhadas ou produtividade percentual.</Text>
      </View>
    </View>}
    {!shiftMode&&<View style={s.calendarPanel}>
      <View style={s.calendarHeader}>
        <Pressable accessibilityRole="button" accessibilityLabel="Semana ou mês anterior"
          onPress={()=>move(-1)} style={s.arrow}>
          <Text style={s.arrowText}>‹</Text>
        </Pressable>
        <View style={{flex:1,alignItems:'center',gap:3}}>
          <Text style={s.periodTitle}>{MONTHS[page.month-1]} de {page.year}</Text>
          <Text style={s.periodCaption}>{view==='month'?'Visão mensal':
            `${brazilianDate(week.start)} — ${brazilianDate(week.end)}`}</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Próxima semana ou mês"
          onPress={()=>move(1)} style={s.arrow}>
          <Text style={s.arrowText}>›</Text>
        </Pressable>
      </View>
      <View style={s.weekStrip}>
        {week.dates.map((date,index)=>{
          const selected=date===day;
          const n=counts.get(date)??0;
          return <Pressable key={date} accessibilityRole="button"
            accessibilityLabel={`${brazilianDate(date)}: ${n} atividade(s). Ver dia.`}
            accessibilityState={{selected}}
            style={[s.weekDay,selected&&s.weekDaySelected]}
            onPress={()=>focus(date,'day')}>
            <Text style={[s.weekLabel,selected&&{color:C.bg}]}>{WEEKDAYS[index]}</Text>
            <Text style={[s.weekNumber,selected&&{color:C.bg}]}>{Number(date.slice(-2))}</Text>
            <View style={[s.dayIndicator,n>0&&{backgroundColor:selected?C.bg:C.blue}]}/>
          </Pressable>;
        })}
      </View>
      <View style={s.modeBar}>
        <View style={s.modeButtons}>
          <Chip title="Dia" selected={view==='day'} onPress={()=>focus(day,'day')}/>
          <Chip title="Semana" selected={view==='week'} onPress={()=>focus(day,'week')}/>
          <Chip title="Mês" selected={view==='month'} onPress={()=>focus(day,'month')}/>
        </View>
        <Pressable accessibilityRole="button" onPress={()=>focus(today,'day')} style={s.todayBtn}>
          <Text style={s.todayText}>Hoje</Text>
        </Pressable>
      </View>
      {view==='month'&&<View style={s.monthCalendar}>
        <View style={s.monthGrid}>
          {WEEKDAYS.map(x=><View key={x} style={s.monthCell}>
            <Text style={s.monthWeekLabel}>{x}</Text>
          </View>)}
          {grid.map((date,index)=><View key={date??'empty-'+index} style={s.monthCell}>
            {date&&<Pressable accessibilityRole="button"
              accessibilityLabel={`Abrir dia ${brazilianDate(date)}, ${counts.get(date)??0} atividade(s)`}
              accessibilityState={{selected:date===day}}
              style={[s.monthDate,date===today&&s.todayOutline,date===day&&s.monthSelected]}
              onPress={()=>focus(date,'day')}>
              <Text style={[s.monthNumber,date===day&&{color:C.bg}]}>{Number(date.slice(-2))}</Text>
              <View style={[s.dayIndicator,(counts.get(date)??0)>0&&{backgroundColor:date===day?C.bg:C.blue}]}/>
            </Pressable>}
          </View>)}
        </View>
      </View>}
    </View>}

    <View style={s.listPanel}>
      <View style={s.listHeading}>
        <View style={{flex:1}}>
          <Text style={s.sectionTitle}>{shiftMode?'Fila de prioridades':
            view==='day'?'Atividades do dia':
            view==='week'?'Atividades da semana':'Atividades do mês'}</Text>
          <Text style={s.smallDate}>{shiftMode?'Atenção, vencidas, hoje e OS Alta próximas':
            view==='day'?brazilianDate(day):
              `${brazilianDate(period.start)} a ${brazilianDate(period.end)}`}
          </Text>
        </View>
        <Text style={s.total}>{currentCount}</Text>
      </View>
      {currentCount===0?<View style={s.empty}>
        <Text style={s.emptyTitle}>{shiftMode?
          'Nenhuma pendência prioritária identificada.':'Nenhuma atividade programada neste período.'}</Text>
        <Text style={s.emptyDetail}>{shiftMode?
          'Confira o calendário para atividades futuras ou rotas avulsas.':
          'Selecione outro dia ou confira as pendências.'}</Text>
      </View>:<View style={s.activityList}>
        {currentRows.map(entry=><ActivityRow key={entry.kind+':'+entry.id} item={entry}
          onOpenRoute={onOpenRoute} onOpenOrder={onOpenOrder}/>)}
      </View>}
      {!moreScheduled&&currentCount>currentRows.length&&
        <Pressable accessibilityRole="button" style={s.showAll} onPress={()=>setMoreScheduled(true)}>
          <Text style={s.link}>Mostrar todas as {currentCount} atividades ›</Text>
        </Pressable>}
      <View style={s.bottomActions}>
        <Pressable accessibilityRole="button" accessibilityState={{expanded:filtersOpen}}
          onPress={()=>setFiltersOpen(x=>!x)} style={s.outlineButton}>
          <Text style={s.outlineText}>☷ Filtros{hasFilters?' • ativos':''} {filtersOpen?'⌃':'⌄'}</Text>
        </Pressable>
      </View>
      {filtersOpen&&<View style={s.filterPanel}>
        <Text style={s.filterTitle}>Tipo de atividade</Text>
        <View style={s.filterRow}>
          <Chip title="Todas" selected={type==='all'} onPress={()=>selectType('all')}/>
          <Chip title="OS" selected={type==='order'} onPress={()=>selectType('order')}/>
          <Chip title="Rotas" selected={type==='route'} onPress={()=>selectType('route')}/>
        </View>
        <Text style={s.filterTitle}>Especialidade</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={s.filterRow}>{SPECIALTIES.map(value=><Chip key={value} title={value}
            selected={specialty===value} onPress={()=>{
              setSpecialty(value);
              if(value!=='Todas'&&type==='route')setType('all');
              changeFilter();
            }}/>)}</View>
        </ScrollView>
        <Text style={s.hint}>O filtro de especialidade se aplica às OS; rotas ainda não têm essa classificação.</Text>
        <Text style={s.filterTitle}>Área ou setor</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={s.filterRow}>
            <Chip title="Todas" selected={!area} onPress={()=>{setArea('');changeFilter();}}/>
            {areas.map(value=><Chip key={value} title={value} selected={area===value}
              onPress={()=>{setArea(value);changeFilter();}}/>)}
          </View>
        </ScrollView>
        {hasFilters&&<Pressable accessibilityRole="button" style={s.clearButton}
          onPress={()=>{setType('all');setSpecialty('Todas');setArea('');changeFilter();}}>
          <Text style={s.link}>Limpar filtros</Text>
        </Pressable>}
      </View>}
    </View>

    {!shiftMode&&backlog.length>0&&<View style={s.backlogPanel}>
      <Pressable accessibilityRole="button" accessibilityState={{expanded:backlogOpen}}
        style={s.backlogToggle} onPress={()=>setBacklogOpen(x=>!x)}>
        <Text style={s.backlogTitle}>⚠ Pendências fora do período</Text>
        <Text style={s.backlogCount}>{backlog.length} {backlogOpen?'⌃':'⌄'}</Text>
      </Pressable>
      <Text style={s.backlogInfo}>Atrasos, impedimentos e anomalias continuam visíveis aqui.</Text>
      {backlogOpen&&<>
        <View style={s.activityList}>{backlogRows.map(entry=><ActivityRow
          key={entry.kind+':'+entry.id} item={entry}
          onOpenRoute={onOpenRoute} onOpenOrder={onOpenOrder}/>)}</View>
        {!moreBacklog&&backlog.length>backlogRows.length&&<Pressable accessibilityRole="button"
          style={s.showAll} onPress={()=>setMoreBacklog(true)}>
          <Text style={s.link}>Mostrar todas as {backlog.length} pendências ›</Text>
        </Pressable>}
      </>}
    </View>}
    <Text style={s.hint}>A agenda mostra apenas o próximo prazo cadastrado. Foco do turno é uma visão de prioridades, não uma escala de trabalho ou uma confirmação de serviços.</Text>
  </ScrollView>;
}

const s=StyleSheet.create({
  bg:{flex:1,backgroundColor:C.bg},page:{padding:15,paddingBottom:72,gap:13},
  header:{gap:5,paddingVertical:4},heading:{color:C.text,fontSize:20,fontWeight:'900'},
  subheading:{color:C.muted,fontSize:12},
  focusControls:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8},
  focusHelp:{color:C.muted,fontSize:11,flex:1,lineHeight:16},
  focusButton:{paddingHorizontal:12,paddingVertical:12,borderRadius:10,
    borderWidth:1,borderColor:C.blue,backgroundColor:C.field,minHeight:44},
  focusButtonActive:{backgroundColor:C.blue},
  focusButtonText:{fontSize:12,color:C.blue,fontWeight:'800'},
  shiftPanel:{backgroundColor:C.panel,borderRadius:13,borderWidth:1,borderColor:C.line,padding:13,gap:10},
  focusNumbers:{flexDirection:'row',flexWrap:'wrap',gap:7},
  focusMetric:{backgroundColor:C.field,color:C.text,fontSize:11,fontWeight:'700',
    paddingHorizontal:9,paddingVertical:7,borderRadius:8,overflow:'hidden'},
  weekSummary:{gap:6,borderTopWidth:1,borderTopColor:C.line,paddingTop:10},
  weekText:{color:C.green,fontSize:12,lineHeight:19,fontWeight:'800'},
  metrics:{flexDirection:'row',gap:8},
  metric:{flex:1,alignItems:'center',justifyContent:'center',paddingVertical:13,
    minHeight:76,borderRadius:11,backgroundColor:C.panel,borderWidth:1,borderColor:C.line},
  metricValue:{fontSize:24,fontWeight:'900'},
  metricLabel:{color:C.muted,fontSize:11,marginTop:4,fontWeight:'700',textAlign:'center'},
  calendarPanel:{backgroundColor:C.panel,borderRadius:15,borderWidth:1,
    borderColor:C.line,padding:13,gap:12},
  calendarHeader:{flexDirection:'row',alignItems:'center',gap:7},
  arrow:{width:38,height:40,borderRadius:9,alignItems:'center',justifyContent:'center',
    backgroundColor:C.field},
  arrowText:{color:C.blue,fontSize:27,fontWeight:'500'},
  periodTitle:{color:C.text,fontWeight:'900',fontSize:16,textTransform:'capitalize'},
  periodCaption:{color:C.muted,fontWeight:'600',fontSize:10},
  weekStrip:{flexDirection:'row',justifyContent:'space-between',gap:3},
  weekDay:{flex:1,minWidth:0,alignItems:'center',justifyContent:'center',
    minHeight:63,borderRadius:10,backgroundColor:C.field,gap:5,paddingVertical:8},
  weekDaySelected:{backgroundColor:C.blue},
  weekLabel:{color:C.muted,fontSize:10,fontWeight:'700'},
  weekNumber:{color:C.text,fontSize:15,fontWeight:'900'},
  dayIndicator:{width:5,height:5,borderRadius:3,backgroundColor:'transparent'},
  modeBar:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:5},
  modeButtons:{flexDirection:'row',gap:6,flexWrap:'wrap',flex:1},
  chip:{borderWidth:1,borderColor:C.line,backgroundColor:C.field,
    paddingVertical:7,paddingHorizontal:11,minHeight:34,borderRadius:8,justifyContent:'center'},
  chipActive:{backgroundColor:C.blue,borderColor:C.blue},
  chipText:{color:C.text,fontSize:11,fontWeight:'800'},
  todayBtn:{paddingHorizontal:9,paddingVertical:8},
  todayText:{color:C.blue,fontSize:12,fontWeight:'800'},
  monthCalendar:{borderTopWidth:1,borderTopColor:C.line,paddingTop:10},
  monthGrid:{flexDirection:'row',flexWrap:'wrap'},
  monthCell:{width:'14.285714%',minHeight:46,alignItems:'center',justifyContent:'center'},
  monthWeekLabel:{color:C.muted,fontSize:10,fontWeight:'700'},
  monthDate:{width:40,height:43,alignItems:'center',justifyContent:'center',
    borderRadius:9,gap:2},
  monthNumber:{color:C.text,fontSize:13,fontWeight:'800'},
  monthSelected:{backgroundColor:C.blue},
  todayOutline:{borderWidth:1,borderColor:C.blue},
  listPanel:{backgroundColor:C.panel,borderRadius:15,borderWidth:1,
    borderColor:C.line,padding:13,gap:11},
  listHeading:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},
  sectionTitle:{color:C.text,fontSize:15,fontWeight:'900'},
  smallDate:{color:C.muted,fontSize:10,marginTop:4},
  total:{color:C.blue,fontSize:15,fontWeight:'800'},
  activityList:{backgroundColor:C.field,borderRadius:10,overflow:'hidden'},
  activityRow:{borderBottomWidth:1,borderBottomColor:C.line,paddingVertical:2},
  activityMain:{flexDirection:'row',alignItems:'center',gap:9,paddingHorizontal:9,
    paddingTop:9,paddingBottom:5,minHeight:66},
  activityMarker:{width:32,height:32,borderRadius:10,borderWidth:1,
    alignItems:'center',justifyContent:'center'},
  activitySymbol:{fontWeight:'900',fontSize:18},
  activityTitle:{fontWeight:'800',fontSize:13,color:C.text},
  activitySubtitle:{fontSize:10,color:C.muted},
  activityState:{fontSize:10,fontWeight:'700'},
  chevron:{color:C.muted,fontSize:22},
  editLink:{alignSelf:'flex-end',marginRight:13,paddingVertical:4,paddingHorizontal:6,
    minHeight:30,justifyContent:'center'},
  editText:{color:C.blue,fontSize:10,fontWeight:'700'},
  showAll:{alignSelf:'center',padding:10,minHeight:40,justifyContent:'center'},
  link:{color:C.blue,fontWeight:'800',fontSize:12},
  bottomActions:{flexDirection:'row',gap:8,justifyContent:'flex-end'},
  outlineButton:{borderWidth:1,borderColor:C.line,borderRadius:9,
    paddingHorizontal:12,paddingVertical:10},
  outlineText:{color:C.text,fontSize:11,fontWeight:'800'},
  filterPanel:{gap:9,borderTopWidth:1,borderTopColor:C.line,paddingTop:12},
  filterRow:{flexDirection:'row',flexWrap:'wrap',gap:7},
  filterTitle:{color:C.text,fontSize:12,fontWeight:'800'},
  hint:{color:C.muted,fontSize:10,lineHeight:16},
  clearButton:{paddingVertical:9,alignSelf:'flex-start'},
  backlogPanel:{backgroundColor:C.panel,borderRadius:12,padding:12,borderWidth:1,
    borderColor:C.line,gap:7},
  backlogToggle:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',
    minHeight:35,gap:9},
  backlogTitle:{color:C.amber,fontSize:13,fontWeight:'800',flex:1},
  backlogCount:{color:C.amber,fontSize:12,fontWeight:'800'},
  backlogInfo:{color:C.muted,fontSize:10,lineHeight:16},
  empty:{padding:13,gap:5,backgroundColor:C.field,borderRadius:9},
  emptyTitle:{color:C.text,fontSize:12,fontWeight:'800'},
  emptyDetail:{color:C.muted,fontSize:11},
});
