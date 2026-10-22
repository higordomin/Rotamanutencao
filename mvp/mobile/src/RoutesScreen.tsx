import React,{useCallback,useEffect,useMemo,useState} from 'react';
import {Alert,KeyboardAvoidingView,Platform,Pressable,ScrollView,StyleSheet,Text,TextInput,View,Image} from 'react-native';
import type {Asset,PhotoDraft} from './types';
import {selectPhoto,evidenceUri} from './evidence';
import {addRoutePoint,createRoute,deleteRoute,deleteRoutePoint,finishRouteRun,
  listRoutePoints,listRouteRuns,listRoutes,listRunItems,listRunPhotos,recordRoutePoint,quickCompleteRoutePoint,startRouteRun,MAX_ROUTE_PHOTOS,
  type Route,type RoutePoint,type RouteRun,type RouteRunItem,type RouteRunPhoto} from './routes';
import {exportRoutePdf} from './routeReport';
import {CalendarPicker} from './CalendarPicker';
import {brazilianDate} from './calendar';
import {localDate} from './logic';
import {routePlanInput,routePlanningState} from './routeSchedule';
import {ROUTE_INTERVALS,previewRouteDates,scheduleNeedsConfirmation} from './routeProgramming';
import {updateRouteSchedule} from './routes';
import {routeProgress,visibleRouteItems} from './quickRouteActions';

const c={bg:'#08101E',panel:'#111E31',field:'#16273D',line:'#24394F',text:'#EFF6FF',
  muted:'#9CB0C8',blue:'#47B7F6',amber:'#FFD075',red:'#FF7D8B',green:'#5DD7AC'};
function Btn({text,onPress,disabled=false,outline=false}:{text:string;onPress:()=>void;disabled?:boolean;outline?:boolean}){
  return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress}
    style={[s.btn,outline&&s.outline,disabled&&{opacity:.45}]}>
    <Text style={[s.btnText,outline&&{color:c.text}]}>{text}</Text>
  </Pressable>;
}
function Input({label,value,onChange,placeholder,numeric=false,multiline=false}:{label:string;value:string;onChange:(v:string)=>void;placeholder?:string;numeric?:boolean;multiline?:boolean}){
  return <View style={{marginTop:12}}>
    <Text style={s.label}>{label}</Text>
    <TextInput accessibilityLabel={label} style={[s.input,multiline&&{height:82,textAlignVertical:'top'}]}
      value={value} onChangeText={onChange} placeholder={placeholder}
      placeholderTextColor={c.muted} selectionColor={c.blue} keyboardType={numeric?'decimal-pad':'default'}
      multiline={multiline}/>
  </View>;
}
function ScheduleSummary({route}:{route:Route}) {
  const state=routePlanningState(route);
  const text=state==='attention'?`⚠ ${route.attention_count} ponto(s) exigem retorno`
    :state==='overdue'?'● Rota atrasada'
    :state==='today'?'● Para hoje'
    :state==='upcoming'?'● Programada':'— Rota avulsa';
  const color=state==='attention'||state==='overdue'?c.red:state==='today'?c.amber:state==='upcoming'?c.green:c.muted;
  return <View style={{marginTop:7,gap:4}}>
    <Text style={[s.note,{color,fontWeight:'800',marginTop:2}]}>{text}</Text>
    {route.recurrence_days>0&&<Text style={s.sub}>
      Próximo prazo: {route.next_due_date?brazilianDate(route.next_due_date):'Sem data'} · A cada {route.recurrence_days} dias
    </Text>}
    {state==='attention'&&<Text style={[s.sub,{color:c.amber}]}>
      Reprogramar não resolve anomalias; mantenha o retorno pendente.
    </Text>}
  </View>;
}
/** Presets rápidos sem perder a possibilidade de digitar um intervalo próprio. */
function ProgrammingFields({recurrence,onRecurrence,date,onDate,pickerOpen,onPickerOpen,onPickerClose,first=false}:{
  recurrence:string;onRecurrence:(value:string)=>void;
  date:string;onDate:(value:string)=>void;
  pickerOpen:boolean;onPickerOpen:()=>void;onPickerClose:()=>void;first?:boolean;
}){
  let forecast:string[]=[];let issue='';
  try{forecast=previewRouteDates(recurrence,recurrence.trim()==='0'?null:date,3);}
  catch(err){issue=err instanceof Error?err.message:String(err);}
  return <View style={s.planningBox}>
    <Text style={s.title}>Programação</Text>
    <Text style={s.sub}>Defina em quantos dias a manutenção deve voltar a ocorrer.</Text>
    <View style={s.presetRow}>
      {ROUTE_INTERVALS.map(item=><Pressable key={item.days} accessibilityRole="button"
        accessibilityState={{selected:recurrence===String(item.days)}}
        style={[s.preset,recurrence===String(item.days)&&s.presetActive]}
        onPress={()=>onRecurrence(String(item.days))}>
        <Text style={[s.presetText,recurrence===String(item.days)&&{color:c.bg}]}>{item.label}</Text>
      </Pressable>)}
    </View>
    <Input label="Intervalo personalizado (dias)" numeric value={recurrence}
      onChange={onRecurrence} placeholder="Ex.: 45"/>
    {recurrence.trim()!=='0'&&<>
      <Text style={s.label}>{first?'Primeira execução':'Próximo vencimento'}</Text>
      <Btn outline text={'📅 '+brazilianDate(date)} onPress={onPickerOpen}/>
      {pickerOpen&&<CalendarPicker value={date} onSelect={value=>{onDate(value);onPickerClose();}}
        onCancel={onPickerClose}/>}
    </>}
    {!!issue&&<Text style={[s.sub,{color:c.red}]}>{issue}</Text>}
    {!issue&&forecast.length>0&&<View style={s.forecast}>
      <Text style={[s.label,{color:c.blue}]}>Prévia das datas</Text>
      {forecast.map((value,index)=><Text key={value} style={s.sub}>
        {index===0?'Próxima execução':'Estimativa '+index}: {brazilianDate(value)}
      </Text>)}
      <Text style={s.hint}>Apenas simulação. O próximo prazo real será calculado quando a rota terminar sem pendências; estas datas não criam serviços na Agenda.</Text>
    </View>}
    {recurrence.trim()==='0'&&<Text style={s.hint}>
      Avulsa: sem vencimento periódico. A rota continua disponível para execução manual.
    </Text>}
  </View>;
}
function RunItem({item,onSaved,disabled,photos}:{item:RouteRunItem;onSaved:()=>Promise<void>;
  disabled:boolean;photos:RouteRunPhoto[]}){
  const [status,setStatus]=useState<RouteRunItem['status']>(item.status);
  const [notes,setNotes]=useState(item.notes);
  const [lubricant,setLubricant]=useState(item.lubricant);
  const [working,setWorking]=useState(false);
  const [expanded,setExpanded]=useState(false);
  const [draftPhotos,setDraftPhotos]=useState<PhotoDraft[]>([]);
  const pristine=status===item.status && notes===item.notes
    && lubricant===item.lubricant
    && draftPhotos.length===0;
  const quickSave=async()=>{
    if(working || disabled || !pristine || item.status!=='pending')return;
    setWorking(true);
    try{
      await quickCompleteRoutePoint(item.id);
      await onSaved();
    }catch(e){
      Alert.alert('Registro rápido não realizado',e instanceof Error?e.message:String(e));
    }finally{setWorking(false);}
  };
  const addPhoto=async(camera:boolean)=>{
    if(working || photos.length+draftPhotos.length>=MAX_ROUTE_PHOTOS)return;
    try {
      const photo=await selectPhoto(camera);
      if(photo) setDraftPhotos(current=>current.length+photos.length>=MAX_ROUTE_PHOTOS?current:[...current,photo]);
    }catch(error){Alert.alert('Não foi possível adicionar foto',error instanceof Error?error.message:String(error));}
  };
  const save=async()=>{
    if(working)return;
    setWorking(true);
    try{await recordRoutePoint(item.id,status,notes,lubricant,draftPhotos);
      setDraftPhotos([]);await onSaved();}
    catch(e){Alert.alert('Registro não salvo',e instanceof Error?e.message:String(e));}
    finally{setWorking(false);}
  };
  return <View style={s.card}>
    <Text style={s.title}>{item.position+1}. {item.point_title}</Text>
    <Text style={s.sub}>{item.asset_label||'Equipamento removido do cadastro'}</Text>
    <Text style={[s.sub,{color:item.status==='anomaly'||item.status==='skipped'?c.amber:item.status==='done'?c.green:c.muted}]}>
      {item.status==='pending'?'○ Pendente':item.status==='done'?'✓ Executado':item.status==='anomaly'?'⚠ Anomalia':'— Não executado'}
      {item.lubricant?' · '+item.lubricant:''}
    </Text>
    {!disabled&&<>
      {item.status==='pending'&&<View style={{marginTop:10}}>
        <View style={s.row}>
          <Btn text={working?'Salvando...':'✓ Registrar executado'}
            disabled={working||!pristine} onPress={()=>{void quickSave();}}/>
        </View>
        {!pristine&&<Text style={s.sub}>Há dados editados ou fotos não salvas. Salve os detalhes para preservá-los.</Text>}
      </View>}
      <View style={s.row}>
        <Btn text={expanded?'Fechar detalhes':item.status==='pending'?'Registrar com detalhes / anomalia':'Editar registro'}
          outline disabled={working} onPress={()=>setExpanded(v=>!v)}/>
      </View>
      {expanded&&<>
      <View style={s.row}>
        {(['done','anomaly','skipped'] as const).map(st=><Pressable key={st}
          accessibilityRole="button" accessibilityState={{selected:status===st}}
          style={[s.chip,status===st&&s.chipActive]} onPress={()=>setStatus(st)}>
          <Text style={[s.chipText,status===st&&{color:c.bg}]}>{st==='done'?'✓ Executado':st==='anomaly'?'⚠ Anomalia':'— Não feito'}</Text>
        </Pressable>)}
      </View>
      <Input label="Lubrificante utilizado" value={lubricant} onChange={setLubricant} placeholder="Ex.: NEVASTANE HD2T"/>
      <Input label={status==='done'?'Observações (opcional)':'Justificativa / anomalia (obrigatória)'}
        value={notes} onChange={setNotes} multiline placeholder="Informe o que foi observado, sem dados confidenciais"/>
      <Text style={[s.label,{marginTop:14}]}>Fotos deste ponto ({photos.length+draftPhotos.length}/{MAX_ROUTE_PHOTOS})</Text>
      <View style={s.row}>
        <Btn text="📷 Fotografar" outline disabled={working||photos.length+draftPhotos.length>=MAX_ROUTE_PHOTOS}
          onPress={()=>{void addPhoto(true);}}/>
        <Btn text="+ Galeria" outline disabled={working||photos.length+draftPhotos.length>=MAX_ROUTE_PHOTOS}
          onPress={()=>{void addPhoto(false);}}/>
      </View>
      <Text style={s.sub}>As novas fotos serão anexadas quando você salvar o resultado do ponto.</Text>
      {draftPhotos.length>0&&<View style={s.row}>
        {draftPhotos.map((photo,index)=><Pressable key={photo.uri+index} accessibilityRole="button"
          accessibilityLabel={`Remover foto nova ${index+1}`}
          onPress={()=>setDraftPhotos(p=>p.filter((_,i)=>i!==index))}>
          <Image source={{uri:photo.uri}} style={s.thumbnail}/>
          <Text style={[s.sub,{color:c.amber}]}>Remover</Text>
        </Pressable>)}
      </View>}
      <View style={{marginTop:12}}><Btn text={working?'Salvando...':'Salvar registro do ponto'} disabled={working} onPress={()=>{void save();}}/></View>
      </>}
    </>}
    {photos.length>0&&<View style={s.row}>
      {photos.map(photo=><Image key={photo.id} source={{uri:evidenceUri(photo.filename)}} style={s.thumbnail}/>)}
    </View>}
    {!!item.recorded_at&&<Text style={s.sub}>Registrado em {new Date(item.recorded_at).toLocaleString('pt-BR')}</Text>}
    {disabled&&!!item.notes&&<Text style={s.note}>{item.notes}</Text>}
  </View>;
}
export function RoutesScreen({assets,onDataChanged,initialRouteId}:{assets:Asset[];
  onDataChanged?:()=>void;initialRouteId?:string|null}){
  const [routes,setRoutes]=useState<Route[]>([]);
  const [runs,setRuns]=useState<RouteRun[]>([]);
  const [points,setPoints]=useState<RoutePoint[]>([]);
  const [items,setItems]=useState<RouteRunItem[]>([]);
  const [savedPhotos,setSavedPhotos]=useState<RouteRunPhoto[]>([]);
  const [selected,setSelected]=useState<string|null>(null);
  const [activeRun,setActiveRun]=useState<string|null>(null);
  const [runFilter,setRunFilter]=useState<'all'|'pending'|'attention'>('all');
  const [name,setName]=useState(''),[area,setArea]=useState('');
  const [period,setPeriod]=useState('0'),[firstDue,setFirstDue]=useState(localDate());
  const [editingSchedule,setEditingSchedule]=useState(false);
  const [editPeriod,setEditPeriod]=useState('0'),[editDue,setEditDue]=useState(localDate());
  const [calendarMode,setCalendarMode]=useState<'new'|'edit'|null>(null);
  const [assetId,setAssetId]=useState<string|null>(null),[assetSearch,setAssetSearch]=useState('');
  const [task,setTask]=useState(''),[lubricant,setLubricant]=useState('');
  const [createOpen,setCreateOpen]=useState(false);
  const [addPointOpen,setAddPointOpen]=useState(false);
  const [historyOpen,setHistoryOpen]=useState(false);
  const [archiveOpen,setArchiveOpen]=useState(false);
  const [showAllPoints,setShowAllPoints]=useState(false);
  const [busy,setBusy]=useState(false);
  const refresh=useCallback(async()=>{
    const [a,b]=await Promise.all([listRoutes(),listRouteRuns()]);
    setRoutes(a);setRuns(b);
    if(selected)setPoints(await listRoutePoints(selected));
    if(activeRun){const [parts,images]=await Promise.all([listRunItems(activeRun),listRunPhotos(activeRun)]);
      setItems(parts);setSavedPhotos(images);}
  },[selected,activeRun]);
  useEffect(()=>{void refresh().catch(e=>Alert.alert('Erro ao carregar rotas',String(e)));},[refresh]);
  useEffect(()=>{
    if(initialRouteId){
      setSelected(initialRouteId);
      setActiveRun(null);
      void listRoutePoints(initialRouteId).then(setPoints).catch(e=>{
        Alert.alert('Rota não disponível',String(e));
      });
    }
  },[initialRouteId]);
  const current=routes.find(r=>r.id===selected);
  const overdueCount=routes.filter(r=>routePlanningState(r)==='overdue').length;
  const attentionCount=routes.filter(r=>routePlanningState(r)==='attention').length;
  const todayCount=routes.filter(r=>routePlanningState(r)==='today').length;
  const run=runs.find(r=>r.id===activeRun);
  const routeInProgress=runs.find(r=>r.route_id===selected&&r.finished_at===null);
  const visible=useMemo(()=>assets.filter(a=>[a.code,a.name,a.area].join(' ').toLowerCase().includes(assetSearch.trim().toLowerCase())).slice(0,12),[assets,assetSearch]);
  const {pending,attention}=routeProgress(items);
  // Em rota finalizada os filtros de apontamento não aparecem; mostrar sempre o histórico completo.
  const filteredItems=useMemo(()=>visibleRouteItems(items,run?.finished_at?'all':runFilter),
    [items,runFilter,run?.finished_at]);
  const execute=async(action:()=>Promise<void>)=>{
    if(busy)return;
    setBusy(true);
    try{await action();await refresh();onDataChanged?.();}
    catch(e){Alert.alert('Operação não realizada',e instanceof Error?e.message:String(e));}
    finally{setBusy(false);}
  };
  return <KeyboardAvoidingView style={{flex:1,backgroundColor:c.bg}} behavior={Platform.OS==='ios'?'padding':'height'}>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.page}>
      <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:10}}>
        <View style={{flex:1}}><Text style={s.heading}>Rotas de manutenção</Text>
          <Text style={s.sub}>Checklists offline • rotas programadas</Text></View>
        {(selected||activeRun)&&<Btn text="← Voltar" outline onPress={()=>{
          if(activeRun)setActiveRun(null);else setSelected(null);setRunFilter('all');setItems([]);setSavedPhotos([]);
        }}/>}
      </View>
      {activeRun&&run?<>
        <View style={s.card}>
          <Text style={s.title}>{run.route_title}</Text>
          <Text style={s.sub}>Iniciada: {new Date(run.started_at).toLocaleString('pt-BR')}</Text>
          <View style={s.progressTrack}><View style={[s.progressBar,{width:`${items.length?Math.round((items.length-pending)*100/items.length):0}%`}]}/></View>
          <Text style={s.sub}>{items.length-pending}/{items.length} pontos registrados
            {attention>0?` · ⚠ ${attention} ocorrência(s)`:''}</Text>
          {run.finished_at?
            <Text style={[s.sub,{color:c.green}]}>Finalizada: {new Date(run.finished_at).toLocaleString('pt-BR')}</Text>:
            <Text style={s.sub}>Confirme cada ponto após a manutenção. Anomalias e não execuções exigem justificativa.</Text>}
          <View style={s.row}>
            {run.finished_at?
              <Btn text="Gerar PDF da rota" onPress={()=>{void execute(()=>exportRoutePdf(run,items,savedPhotos));}}/>:
              <Btn text="Finalizar rota" disabled={pending>0||busy} onPress={()=>{void execute(async()=>{await finishRouteRun(run.id);await refresh();});}}/>}
          </View>
        </View>
        {!run.finished_at&&<View style={s.filterCard}>
          <Text style={s.label}>Filtrar pontos</Text>
          <View style={s.row}>
            <Btn text={`Todos (${items.length})`} outline={runFilter!=='all'} onPress={()=>setRunFilter('all')}/>
            <Btn text={`Pendentes (${pending})`} outline={runFilter!=='pending'} onPress={()=>setRunFilter('pending')}/>
            <Btn text={`Ocorrências (${attention})`} outline={runFilter!=='attention'} onPress={()=>setRunFilter('attention')}/>
          </View>
        </View>}
        {filteredItems.length===0&&<Text style={s.note}>
          {runFilter==='pending'?'Nenhum ponto pendente neste momento.':
            runFilter==='attention'?'Nenhuma anomalia ou ponto não executado registrado.':
            'Esta execução ainda não contém pontos.'}
        </Text>}
        {filteredItems.map(item=><RunItem key={item.id+':'+(item.recorded_at??'pending')}
          item={item} disabled={!!run.finished_at}
          photos={savedPhotos.filter(photo=>photo.item_id===item.id)} onSaved={refresh}/>)}
      </>:selected&&current?<>
        <View style={s.card}>
          <Text style={s.title}>{current.title}</Text>
          <Text style={s.sub}>{current.area||'Sem setor'} • {points.length} ponto(s)</Text>
          <ScheduleSummary route={current}/>
          <View style={{marginTop:8}}>
            <Btn outline text={editingSchedule?'Fechar programação':current.recurrence_days===0?'Programar rota':'Editar programação'} onPress={()=>{
              if(editingSchedule){setEditingSchedule(false);setCalendarMode(null);}
              else {setEditPeriod(String(current.recurrence_days));setEditDue(current.next_due_date??localDate());setEditingSchedule(true);}
            }}/>
          </View>
          {editingSchedule&&<View>
            <ProgrammingFields recurrence={editPeriod} onRecurrence={setEditPeriod}
              date={editDue} onDate={setEditDue}
              pickerOpen={calendarMode==='edit'}
              onPickerOpen={()=>setCalendarMode('edit')}
              onPickerClose={()=>setCalendarMode(null)}/>
            {!!routeInProgress&&<Text style={[s.sub,{color:c.amber}]}>
              Há uma execução em andamento. Finalize-a antes de reprogramar esta rota.
            </Text>}
            <View style={{marginTop:12}}>
              <Btn text="Salvar programação" disabled={busy||!!routeInProgress} onPress={()=>{
                try{
                  const target=routePlanInput(editPeriod,editPeriod.trim()==='0'?null:editDue);
                  const warning=scheduleNeedsConfirmation(current,target);
                  const save=()=>{void execute(async()=>{
                    await updateRouteSchedule(current.id,editPeriod,target.next_due_date);
                    setEditingSchedule(false);setCalendarMode(null);
                  });};
                  if(warning.needed){
                    Alert.alert('Confirmar reprogramação',
                      warning.reason==='attention'?
                        'Esta rota possui anomalias ou serviços não executados. O aviso de pendência continuará ativo mesmo com a nova data. Deseja salvar?':
                        'Esta rota está atrasada. Reprogramar para depois pode retirar o aviso de atraso. Confirma a alteração?',
                      [{text:'Cancelar',style:'cancel'},{text:'Confirmar',onPress:save}]);
                  }else save();
                }catch(error){Alert.alert('Programação inválida',error instanceof Error?error.message:String(error));}
              }}/>
            </View>
            <Text style={s.sub}>O histórico, as fotos e as ocorrências já registradas não serão apagados.</Text>
          </View>}
          <View style={s.row}>
            <Btn disabled={busy||(!routeInProgress&&points.length===0)}
              text={routeInProgress?'▶ Continuar rota':'▶ Iniciar rota'} onPress={()=>{void execute(async()=>{
                const id=routeInProgress?.id??await startRouteRun(selected);
                setRunFilter('pending');setActiveRun(id);setItems(await listRunItems(id));
              });}}/>
            <Btn outline text="Excluir rota" disabled={busy} onPress={()=>Alert.alert('Excluir rota?', 'Os históricos já registrados serão preservados, mas os pontos atuais serão removidos.',[
              {text:'Cancelar',style:'cancel'},{text:'Excluir',style:'destructive',onPress:()=>{void execute(async()=>{await deleteRoute(selected);setSelected(null);setPoints([]);});}}
            ])}/>
          </View>
        </View>
        {runs.some(r=>r.route_id===selected)&&<Btn
          outline text={historyOpen?'Ocultar execuções anteriores':'Histórico de execuções'} onPress={()=>setHistoryOpen(x=>!x)}/>}
        {historyOpen&&runs.filter(r=>r.route_id===selected).slice(0,8).map(r=><View key={r.id} style={s.compactCard}>
          <Text style={s.title}>Execução em {new Date(r.started_at).toLocaleString('pt-BR')}</Text>
          <Text style={s.sub}>{r.finished_at?'Finalizada':'Em andamento'}</Text>
          <Btn outline text={r.finished_at?'Ver relatório':'Continuar execução'} onPress={()=>{setRunFilter('all');setActiveRun(r.id);void listRunItems(r.id).then(setItems);}}/>
        </View>)}
        <Text style={s.heading}>Pontos cadastrados</Text>
        {points.length===0&&<Text style={s.sub}>Ainda não há pontos cadastrados nesta rota.</Text>}
        {(showAllPoints?points:points.slice(0,8)).map(p=><View style={s.pointCard} key={p.id}>
          <Text style={s.title}>{p.position+1}. {p.title}</Text>
          <Text style={s.sub}>{[p.asset_code,p.asset_name,p.asset_area].filter(Boolean).join(' · ')||'Equipamento removido'}</Text>
          {!!p.lubricant&&<Text style={s.sub}>Lubrificante: {p.lubricant}</Text>}
          <Btn outline text="Remover ponto" disabled={busy} onPress={()=>Alert.alert('Remover ponto?','O histórico de execuções anteriores não será alterado.',[
            {text:'Cancelar',style:'cancel'},{text:'Remover',style:'destructive',onPress:()=>{void execute(()=>deleteRoutePoint(p.id));}}
          ])}/>
        </View>)}
        {points.length>8&&<Btn outline
          text={showAllPoints?'Recolher pontos':`Ver todos os ${points.length} pontos`}
          onPress={()=>setShowAllPoints(v=>!v)}/>}
        <Btn outline text={addPointOpen?'Cancelar novo ponto':'+ Adicionar ponto à rota'}
          onPress={()=>setAddPointOpen(x=>!x)}/>
        {addPointOpen&&<View style={s.card}>
          <Text style={s.title}>Novo ponto da rota</Text>
          <Input label="Buscar equipamento / TAG" value={assetSearch} onChange={setAssetSearch}/>
          {visible.map(a=><Pressable key={a.id} style={[s.asset,assetId===a.id&&{borderColor:c.blue}]}
            accessibilityRole="button" accessibilityState={{selected:assetId===a.id}} onPress={()=>setAssetId(a.id)}>
            <Text style={s.note}>{assetId===a.id?'●':'○'} {a.code||'Sem TAG'} · {a.name}</Text>
            <Text style={s.sub}>{a.area}</Text>
          </Pressable>)}
          {!visible.length&&<Text style={s.sub}>Cadastre um equipamento na aba Ativos antes de adicionar pontos.</Text>}
          <Input label="Atividade do ponto *" value={task} onChange={setTask} placeholder="Ex.: Engraxar mancal lado acionamento"/>
          <Input label="Lubrificante" value={lubricant} onChange={setLubricant} placeholder="Ex.: NEVASTANE HD2T"/>
          <View style={{marginTop:12}}><Btn text="Adicionar ponto" disabled={busy||!assetId} onPress={()=>{void execute(async()=>{
            await addRoutePoint(selected,assetId||'',task,lubricant);setTask('');setLubricant('');setAddPointOpen(false);setShowAllPoints(true);
          });}}/></View>
        </View>}
      </>:<>
        <View style={s.rowHeader}>
          <View style={{flex:1}}>
            <Text style={s.heading}>Suas rotas</Text>
            <Text style={s.sub}>{routes.length} cadastrada(s) · por prazo e pendências</Text>
          </View>
          <Btn text={createOpen?'Cancelar':'+ Nova rota'} outline={createOpen}
            onPress={()=>setCreateOpen(x=>!x)}/>
        </View>
        {createOpen&&<View style={s.card}>
          <Text style={s.title}>Nova rota</Text>
          <Input label="Nome da rota *" value={name} onChange={setName} placeholder="Ex.: Lubrificação — Paletização"/>
          <Input label="Setor / área" value={area} onChange={setArea} placeholder="Ex.: Utilidades"/>
          <ProgrammingFields recurrence={period} onRecurrence={setPeriod}
            date={firstDue} onDate={setFirstDue} first
            pickerOpen={calendarMode==='new'}
            onPickerOpen={()=>setCalendarMode('new')}
            onPickerClose={()=>setCalendarMode(null)}/>}
          <View style={{marginTop:12}}><Btn text="Criar rota" disabled={busy} onPress={()=>{void execute(async()=>{
            await createRoute(name,area,period,period.trim()==='0'?null:firstDue);
            setName('');setArea('');setPeriod('0');setFirstDue(localDate());setCalendarMode(null);setCreateOpen(false);
          });}}/></View>
        </View>}
        <Text style={[s.note,{fontWeight:'800'}]}>
          {attentionCount} com pendências • {overdueCount} vencida(s) • {todayCount} para hoje
        </Text>
        {!routes.length&&<Text style={s.sub}>Nenhuma rota cadastrada. Toque em “+ Nova rota” para começar.</Text>}
        {routes.map(r=>{
          const state=routePlanningState(r);
          const color=state==='attention'||state==='overdue'?c.red:state==='today'?c.amber:c.green;
          const label=state==='attention'?'Pendência':state==='overdue'?'Vencida':
            state==='today'?'Hoje':state==='upcoming'?'Programada':'Avulsa';
          return <Pressable key={r.id} accessibilityRole="button"
            accessibilityLabel={`Abrir rota ${r.title}`}
            style={s.routeLine} onPress={()=>{setSelected(r.id);setHistoryOpen(false);
              setAddPointOpen(false);setShowAllPoints(false);void listRoutePoints(r.id).then(setPoints);}}>
            <View style={{flex:1,gap:4}}>
              <Text style={s.title}>{r.title}</Text>
              <Text style={s.sub}>{r.area||'Sem setor'} · {r.point_count??0} ponto(s)</Text>
              <Text style={[s.sub,{color,fontWeight:'800'}]}>{label}
                {r.next_due_date?' · '+brazilianDate(r.next_due_date):''}
              </Text>
            </View>
            <Text style={[s.title,{color:c.blue}]}>›</Text>
          </Pressable>;
        })}
        {runs.some(r=>r.route_id===null)&&<Btn outline
          text={archiveOpen?'Ocultar execuções de rotas excluídas':'Ver execuções de rotas excluídas'}
          onPress={()=>setArchiveOpen(x=>!x)}/>}
        {archiveOpen&&runs.filter(r=>r.route_id===null).slice(0,8).map(r=><View key={r.id} style={s.compactCard}>
          <Text style={s.title}>Histórico: {r.route_title}</Text>
          <Text style={s.sub}>{new Date(r.started_at).toLocaleString('pt-BR')}</Text>
          <Btn text="Ver execução arquivada" outline onPress={()=>{setActiveRun(r.id);void listRunItems(r.id).then(setItems);}}/>
        </View>)}
      </>}
    </ScrollView>
  </KeyboardAvoidingView>;
}
const s=StyleSheet.create({
 thumbnail:{width:96,height:78,borderRadius:8,backgroundColor:c.field},
 page:{padding:16,paddingBottom:65,gap:11},card:{backgroundColor:c.panel,borderRadius:14,borderWidth:1,borderColor:c.line,padding:15,gap:5},
 heading:{fontSize:17,fontWeight:'800',color:c.text,marginBottom:6},
 title:{fontSize:15,fontWeight:'800',color:c.text},
 label:{fontSize:12,fontWeight:'700',color:c.muted,marginBottom:6},
 sub:{fontSize:12,color:c.muted,lineHeight:18},
 note:{fontSize:13,color:c.text,marginTop:8,lineHeight:19},
 input:{color:c.text,backgroundColor:c.field,borderWidth:1,borderColor:c.line,paddingHorizontal:12,minHeight:45,borderRadius:9},
 row:{flexDirection:'row',flexWrap:'wrap',gap:8,marginTop:9},
 planningBox:{backgroundColor:c.field,borderRadius:12,padding:12,marginTop:10,gap:6},
 presetRow:{flexDirection:'row',flexWrap:'wrap',gap:6,marginTop:4},
 preset:{borderColor:c.line,borderWidth:1,borderRadius:8,paddingHorizontal:11,
   paddingVertical:10,minHeight:40,justifyContent:'center'},
 presetActive:{backgroundColor:c.blue,borderColor:c.blue},
 presetText:{color:c.text,fontWeight:'800',fontSize:12},
 forecast:{backgroundColor:c.panel,padding:11,borderRadius:10,marginTop:5,gap:4},
 hint:{fontSize:11,color:c.muted,lineHeight:16,marginTop:3},
 rowHeader:{flexDirection:'row',alignItems:'center',gap:10,marginBottom:5},
 compactCard:{backgroundColor:c.panel,borderRadius:11,borderWidth:1,borderColor:c.line,padding:11,gap:4},
 pointCard:{backgroundColor:c.panel,borderRadius:11,borderWidth:1,borderColor:c.line,padding:10,gap:4},
 filterCard:{backgroundColor:c.panel,borderRadius:11,borderWidth:1,borderColor:c.line,padding:10,gap:3},
 routeLine:{backgroundColor:c.panel,borderRadius:12,borderWidth:1,borderColor:c.line,
   padding:13,flexDirection:'row',alignItems:'center',gap:10,minHeight:78},
 progressTrack:{marginTop:9,height:7,borderRadius:6,backgroundColor:c.field,overflow:'hidden'},
 progressBar:{height:7,backgroundColor:c.green,borderRadius:6},
 btn:{backgroundColor:c.blue,minHeight:41,borderRadius:10,paddingHorizontal:13,paddingVertical:10,justifyContent:'center',alignItems:'center'},
 btnText:{color:c.bg,fontWeight:'800',fontSize:12},
 outline:{backgroundColor:c.field,borderColor:c.line,borderWidth:1},
 chip:{backgroundColor:c.field,borderRadius:9,borderWidth:1,borderColor:c.line,paddingVertical:10,paddingHorizontal:10},
 chipActive:{backgroundColor:c.blue,borderColor:c.blue},
 chipText:{color:c.text,fontSize:12,fontWeight:'700'},
 asset:{backgroundColor:c.field,borderRadius:8,padding:9,borderColor:c.line,borderWidth:1,marginTop:5},
});
