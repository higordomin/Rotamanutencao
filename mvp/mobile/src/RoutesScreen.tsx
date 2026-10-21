import React,{useCallback,useEffect,useMemo,useState} from 'react';
import {Alert,KeyboardAvoidingView,Platform,Pressable,ScrollView,StyleSheet,Text,TextInput,View,Image} from 'react-native';
import type {Asset,PhotoDraft} from './types';
import {selectPhoto,evidenceUri} from './evidence';
import {addRoutePoint,createRoute,deleteRoute,deleteRoutePoint,finishRouteRun,
  listRoutePoints,listRouteRuns,listRoutes,listRunItems,listRunPhotos,recordRoutePoint,startRouteRun,MAX_ROUTE_PHOTOS,
  type Route,type RoutePoint,type RouteRun,type RouteRunItem,type RouteRunPhoto} from './routes';
import {exportRoutePdf} from './routeReport';

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
function RunItem({item,onSaved,disabled,photos}:{item:RouteRunItem;onSaved:()=>Promise<void>;
  disabled:boolean;photos:RouteRunPhoto[]}){
  const [status,setStatus]=useState<RouteRunItem['status']>(item.status);
  const [notes,setNotes]=useState(item.notes);
  const [lubricant,setLubricant]=useState(item.lubricant);
  const [grams,setGrams]=useState(String(item.quantity_grams));
  const [working,setWorking]=useState(false);
  const [draftPhotos,setDraftPhotos]=useState<PhotoDraft[]>([]);
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
    try{await recordRoutePoint(item.id,status,notes,lubricant,grams,draftPhotos);
      setDraftPhotos([]);await onSaved();}
    catch(e){Alert.alert('Registro não salvo',e instanceof Error?e.message:String(e));}
    finally{setWorking(false);}
  };
  return <View style={s.card}>
    <Text style={s.title}>{item.position+1}. {item.point_title}</Text>
    <Text style={s.sub}>{item.asset_label||'Equipamento removido do cadastro'}</Text>
    <Text style={s.sub}>Resultado atual: {item.status==='pending'?'Pendente':item.status==='done'?'Executado':item.status==='anomaly'?'Anomalia':'Não executado'}</Text>
    {!disabled&&<>
      <View style={s.row}>
        {(['done','anomaly','skipped'] as const).map(st=><Pressable key={st}
          accessibilityRole="button" accessibilityState={{selected:status===st}}
          style={[s.chip,status===st&&s.chipActive]} onPress={()=>setStatus(st)}>
          <Text style={[s.chipText,status===st&&{color:c.bg}]}>{st==='done'?'✓ Executado':st==='anomaly'?'⚠ Anomalia':'— Não feito'}</Text>
        </Pressable>)}
      </View>
      <Input label="Lubrificante utilizado" value={lubricant} onChange={setLubricant} placeholder="Ex.: NEVASTANE HD2T"/>
      {status==='skipped' ? <Text style={[s.note,{color:c.amber}]}>Não executado: quantidade aplicada será registrada como 0 g.</Text>
        : <Input label="Quantidade aplicada (g)" value={grams} onChange={setGrams} numeric placeholder="0"/>}
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
    {photos.length>0&&<View style={s.row}>
      {photos.map(photo=><Image key={photo.id} source={{uri:evidenceUri(photo.filename)}} style={s.thumbnail}/>)}
    </View>}
    {!!item.recorded_at&&<Text style={s.sub}>Registrado em {new Date(item.recorded_at).toLocaleString('pt-BR')}</Text>}
    {disabled&&!!item.notes&&<Text style={s.note}>{item.notes}</Text>}
  </View>;
}
export function RoutesScreen({assets}:{assets:Asset[]}){
  const [routes,setRoutes]=useState<Route[]>([]);
  const [runs,setRuns]=useState<RouteRun[]>([]);
  const [points,setPoints]=useState<RoutePoint[]>([]);
  const [items,setItems]=useState<RouteRunItem[]>([]);
  const [savedPhotos,setSavedPhotos]=useState<RouteRunPhoto[]>([]);
  const [selected,setSelected]=useState<string|null>(null);
  const [activeRun,setActiveRun]=useState<string|null>(null);
  const [name,setName]=useState(''),[area,setArea]=useState('');
  const [assetId,setAssetId]=useState<string|null>(null),[assetSearch,setAssetSearch]=useState('');
  const [task,setTask]=useState(''),[lubricant,setLubricant]=useState(''),[grams,setGrams]=useState('0');
  const [busy,setBusy]=useState(false);
  const refresh=useCallback(async()=>{
    const [a,b]=await Promise.all([listRoutes(),listRouteRuns()]);
    setRoutes(a);setRuns(b);
    if(selected)setPoints(await listRoutePoints(selected));
    if(activeRun){const [parts,images]=await Promise.all([listRunItems(activeRun),listRunPhotos(activeRun)]);
      setItems(parts);setSavedPhotos(images);}
  },[selected,activeRun]);
  useEffect(()=>{void refresh().catch(e=>Alert.alert('Erro ao carregar rotas',String(e)));},[refresh]);
  const current=routes.find(r=>r.id===selected);
  const run=runs.find(r=>r.id===activeRun);
  const visible=useMemo(()=>assets.filter(a=>[a.code,a.name,a.area].join(' ').toLowerCase().includes(assetSearch.trim().toLowerCase())).slice(0,12),[assets,assetSearch]);
  const pending=items.filter(i=>i.status==='pending').length;
  const anomalies=items.filter(i=>i.status==='anomaly').length;
  const skipped=items.filter(i=>i.status==='skipped').length;
  const execute=async(action:()=>Promise<void>)=>{
    if(busy)return;
    setBusy(true);
    try{await action();await refresh();}
    catch(e){Alert.alert('Operação não realizada',e instanceof Error?e.message:String(e));}
    finally{setBusy(false);}
  };
  return <KeyboardAvoidingView style={{flex:1,backgroundColor:c.bg}} behavior={Platform.OS==='ios'?'padding':'height'}>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.page}>
      <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:10}}>
        <View style={{flex:1}}><Text style={s.heading}>Rotas de manutenção</Text>
          <Text style={s.sub}>Checklists offline • lubrificação e inspeções</Text></View>
        {(selected||activeRun)&&<Btn text="← Voltar" outline onPress={()=>{
          if(activeRun)setActiveRun(null);else setSelected(null);setItems([]);setSavedPhotos([]);
        }}/>}
      </View>
      {activeRun&&run?<>
        <View style={s.card}>
          <Text style={s.title}>{run.route_title}</Text>
          <Text style={s.sub}>Iniciada: {new Date(run.started_at).toLocaleString('pt-BR')}</Text>
          <Text style={s.note}>{items.length-pending}/{items.length} registrados • {anomalies} anomalia(s) • {skipped} não executado(s)</Text>
          {run.finished_at?
            <Text style={[s.note,{color:c.green}]}>Finalizada: {new Date(run.finished_at).toLocaleString('pt-BR')}</Text>:
            <Text style={[s.note,{color:c.amber}]}>Finalize apenas quando todos os pontos tiverem resultado.</Text>}
          <View style={s.row}>
            {run.finished_at?
              <Btn text="Gerar PDF da rota" onPress={()=>{void execute(()=>exportRoutePdf(run,items,savedPhotos));}}/>:
              <Btn text="Finalizar rota" disabled={pending>0||busy} onPress={()=>{void execute(async()=>{await finishRouteRun(run.id);await refresh();});}}/>}
          </View>
        </View>
        {items.map(item=><RunItem key={item.id} item={item} disabled={!!run.finished_at}
          photos={savedPhotos.filter(photo=>photo.item_id===item.id)} onSaved={refresh}/>)}
      </>:selected&&current?<>
        <View style={s.card}>
          <Text style={s.title}>{current.title}</Text>
          <Text style={s.sub}>{current.area||'Sem setor'} • {points.length} ponto(s)</Text>
          <View style={s.row}>
            <Btn disabled={busy||points.length===0} text="▶ Iniciar rota" onPress={()=>{void execute(async()=>{
              const id=await startRouteRun(selected);setActiveRun(id);setItems(await listRunItems(id));
            });}}/>
            <Btn outline text="Excluir rota" disabled={busy} onPress={()=>Alert.alert('Excluir rota?', 'Os históricos já registrados serão preservados, mas os pontos atuais serão removidos.',[
              {text:'Cancelar',style:'cancel'},{text:'Excluir',style:'destructive',onPress:()=>{void execute(async()=>{await deleteRoute(selected);setSelected(null);setPoints([]);});}}
            ])}/>
          </View>
        </View>
        {runs.filter(r=>r.route_id===selected).slice(0,8).map(r=><View key={r.id} style={s.card}>
          <Text style={s.title}>Execução em {new Date(r.started_at).toLocaleString('pt-BR')}</Text>
          <Text style={s.sub}>{r.finished_at?'Finalizada':'Em andamento'}</Text>
          <Btn outline text={r.finished_at?'Ver relatório':'Continuar execução'} onPress={()=>{setActiveRun(r.id);void listRunItems(r.id).then(setItems);}}/>
        </View>)}
        <Text style={s.heading}>Pontos cadastrados</Text>
        {points.map(p=><View style={s.card} key={p.id}>
          <Text style={s.title}>{p.position+1}. {p.title}</Text>
          <Text style={s.sub}>{[p.asset_code,p.asset_name,p.asset_area].filter(Boolean).join(' · ')||'Equipamento removido'}</Text>
          <Text style={s.sub}>{p.lubricant||'Sem lubrificante'} • {p.quantity_grams} g</Text>
          <Btn outline text="Remover ponto" disabled={busy} onPress={()=>Alert.alert('Remover ponto?','O histórico de execuções anteriores não será alterado.',[
            {text:'Cancelar',style:'cancel'},{text:'Remover',style:'destructive',onPress:()=>{void execute(()=>deleteRoutePoint(p.id));}}
          ])}/>
        </View>)}
        <View style={s.card}>
          <Text style={s.heading}>Adicionar ponto à rota</Text>
          <Input label="Buscar equipamento / TAG" value={assetSearch} onChange={setAssetSearch}/>
          {visible.map(a=><Pressable key={a.id} style={[s.asset,assetId===a.id&&{borderColor:c.blue}]}
            accessibilityRole="button" accessibilityState={{selected:assetId===a.id}} onPress={()=>setAssetId(a.id)}>
            <Text style={s.note}>{assetId===a.id?'●':'○'} {a.code||'Sem TAG'} · {a.name}</Text>
            <Text style={s.sub}>{a.area}</Text>
          </Pressable>)}
          {!visible.length&&<Text style={s.sub}>Cadastre um equipamento na aba Ativos antes de adicionar pontos.</Text>}
          <Input label="Atividade do ponto *" value={task} onChange={setTask} placeholder="Ex.: Engraxar mancal lado acionamento"/>
          <Input label="Lubrificante" value={lubricant} onChange={setLubricant} placeholder="Ex.: NEVASTANE HD2T"/>
          <Input label="Quantidade prevista (gramas)" numeric value={grams} onChange={setGrams}/>
          <View style={{marginTop:12}}><Btn text="Adicionar ponto" disabled={busy||!assetId} onPress={()=>{void execute(async()=>{
            await addRoutePoint(selected,assetId||'',task,lubricant,grams);setTask('');setGrams('0');
          });}}/></View>
        </View>
      </>:<>
        <View style={s.card}>
          <Text style={s.heading}>Nova rota</Text>
          <Input label="Nome da rota *" value={name} onChange={setName} placeholder="Ex.: Lubrificação — Paletização"/>
          <Input label="Setor / área" value={area} onChange={setArea} placeholder="Ex.: Utilidades"/>
          <View style={{marginTop:12}}><Btn text="Criar rota" disabled={busy} onPress={()=>{void execute(async()=>{
            await createRoute(name,area);setName('');setArea('');
          });}}/></View>
        </View>
        {routes.map(r=><View style={s.card} key={r.id}>
          <Text style={s.title}>{r.title}</Text>
          <Text style={s.sub}>{r.area||'Sem setor'} • {r.point_count??0} pontos</Text>
          <View style={s.row}><Btn text="Abrir rota" outline onPress={()=>{setSelected(r.id);void listRoutePoints(r.id).then(setPoints);}}/></View>
        </View>)}
        {runs.filter(r=>r.route_id===null).slice(0,8).map(r=><View key={r.id} style={s.card}>
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
 row:{flexDirection:'row',flexWrap:'wrap',gap:8,marginTop:12},
 btn:{backgroundColor:c.blue,minHeight:41,borderRadius:10,paddingHorizontal:13,paddingVertical:10,justifyContent:'center',alignItems:'center'},
 btnText:{color:c.bg,fontWeight:'800',fontSize:12},
 outline:{backgroundColor:c.field,borderColor:c.line,borderWidth:1},
 chip:{backgroundColor:c.field,borderRadius:9,borderWidth:1,borderColor:c.line,paddingVertical:10,paddingHorizontal:10},
 chipActive:{backgroundColor:c.blue,borderColor:c.blue},
 chipText:{color:c.text,fontSize:12,fontWeight:'700'},
 asset:{backgroundColor:c.field,borderRadius:8,padding:9,borderColor:c.line,borderWidth:1,marginTop:5},
});
