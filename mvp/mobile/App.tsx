import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  ActivityIndicator, Alert, AppState, BackHandler, Keyboard, KeyboardAvoidingView, Modal, Platform, Pressable,
  SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TextInput, View, Image, FlatList,
} from 'react-native';
import {
  initializeDatabase, listAssets, listExecutions, listOrders, localDate,
  completeOrder, removeAsset, archiveOrder, restoreArchivedOrder, listArchivedOrders,
  saveAsset, saveOrder, validDate, listAllPhotos,
  setImpediment, releaseImpediment, listRecentEvents,
} from './src/db';
import type {Asset, AssetDraft, Category, Execution, ExecutionPhoto, PhotoDraft, OrderDraft, Priority, WorkOrder, OrderEvent, ExecutionResult} from './src/types';
import {taskState} from './src/logic';
import {evidenceUri, selectPhoto, MAX_PHOTOS_PER_EXECUTION} from './src/evidence';
import {exportExecutionPdf} from './src/report';
import {exportBackup, pickBackupFile, restoreBackup} from './src/backup';
import {inspectBackup} from './src/backupInspection';
import {CalendarPicker} from './src/CalendarPicker';
import {brazilianDate} from './src/calendar';
import {RoutesScreen} from './src/RoutesScreen';
import {OperationalAgenda} from './src/OperationalAgenda';
import {listRoutes,listAssetRouteHistory,type AssetRouteHistoryItem,type Route} from './src/routes';
import {HomeScreen} from './src/HomeScreen';
import {ReminderSettings} from './src/ReminderSettings';
import {ConsolidatedReportPanel} from './src/ConsolidatedReportPanel';
import {syncLocalReminders} from './src/localReminders';
import {filterCompletedExecutions} from './src/completedExecutions';
import {inspectLocalStorage} from './src/storageDiagnostics';
import {optimizeLocalDatabase} from './src/storageMaintenance';
import {duplicateOrderDraft, needsPriorityAttention} from './src/operatorActions';
import {preselectAsset, executionBelongsToAssetSnapshot, buildLegacyAssetIndex} from './src/assetWorkflow';
import {assetAreas,findCatalogAssets} from './src/assetCatalog';
import {AssetPicker} from './src/AssetPicker';
import {createActionGuard} from './src/actionGuard';
import {MoreMenu} from './src/MoreMenu';
import {bottomTabs,visibleTab,morePage,type AppTab} from './src/navigation31';
import {INDUSTRIAL as THEME,INTERACTION} from './src/design31';

const COLORS = {
  bg: THEME.background, panel: THEME.surface, panel2: THEME.elevated,
  border: THEME.border, text: THEME.ink, muted: THEME.muted,
  accent: THEME.accent, green: THEME.success,
  red: THEME.danger, yellow: THEME.caution,
};
type ModalType = 'asset' | 'order' | 'complete' | 'block' | 'archive' | null;
type OrderFilter = 'Todas' | 'Pendentes' | 'Impedidas' | 'Prioritárias' | 'Concluídas' | 'Arquivadas';
type ActivityListItem = {kind:'order';value:WorkOrder}|{kind:'execution';value:Execution};
const categories: Category[] = ['Lubrificação', 'Mecânica', 'Elétrica', 'Inspeção', 'Segurança'];
const priorities: Priority[] = ['Baixa', 'Média', 'Alta'];
const initialOrder = (): OrderDraft => ({
  title: '', description: '', category: 'Lubrificação', priority: 'Média',
  asset_id: null, recurrence_days: 30, due_date: localDate(),
});
const initialAsset = (): AssetDraft => ({name: '', code: '', area: ''});

function Pill({text, tone = 'blue'}: {text: string; tone?: 'blue' | 'green' | 'red' | 'yellow'}) {
  const color = tone === 'green' ? COLORS.green : tone === 'red' ? COLORS.red
    : tone === 'yellow' ? COLORS.yellow : COLORS.accent;
  return <View style={[styles.pill, {borderColor: color + '55', backgroundColor: color + '15'}]}>
    <Text style={{fontSize: 11, fontWeight: '700', color}}>{text}</Text>
  </View>;
}

function Action({label, onPress, secondary = false, dangerous = false, disabled = false}: {
  label: string; onPress: () => void; secondary?: boolean; dangerous?: boolean; disabled?: boolean;
}) {
  return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress}
    style={[styles.button, secondary && styles.secondaryButton, dangerous && {backgroundColor: '#573144'},
      disabled && {opacity: 0.45}]}>
    <Text style={[styles.buttonText, secondary && {color: COLORS.text}]}>{label}</Text>
  </Pressable>;
}

function FormField({label, value, onChangeText, placeholder, multiline = false, keyboardType, onFocus}: {
  label: string; value: string; onChangeText: (v: string) => void; placeholder?: string;
  multiline?: boolean; keyboardType?: 'default' | 'numeric'; onFocus?: () => void;
}) {
  return <View style={{marginBottom: 16}}>
    <Text style={styles.fieldLabel}>{label}</Text>
    <TextInput accessibilityLabel={label} placeholder={placeholder}
      placeholderTextColor={COLORS.muted} selectionColor={COLORS.accent}
      multiline={multiline} keyboardType={keyboardType} value={value} onChangeText={onChangeText}
      onFocus={onFocus} returnKeyType={multiline ? 'default' : 'done'}
      onSubmitEditing={multiline ? undefined : () => Keyboard.dismiss()}
      style={[styles.field, multiline && {height: 84, textAlignVertical: 'top'}]}/>
  </View>;
}

function Choices<T extends string>({label, options, value, onChange}: {
  label: string; options: readonly T[]; value: T; onChange: (v: T) => void;
}) {
  return <View style={{marginBottom: 16}}>
    <Text style={styles.fieldLabel}>{label}</Text>
    <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 8}}>
      {options.map((option) => <Pressable key={option} onPress={() => onChange(option)}
        style={[styles.choice, value === option && styles.choiceActive]}>
        <Text style={{color: value === option ? COLORS.bg : COLORS.text,
          fontWeight: '700', fontSize: 12}}>{option}</Text>
      </Pressable>)}
    </View>
  </View>;
}

export default function App() {
  const [tab, setTab] = useState<AppTab>('Início');
  const [assets, setAssets] = useState<Asset[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [selectedRouteId,setSelectedRouteId] = useState<string|null>(null);
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [archivedOrders,setArchivedOrders]=useState<WorkOrder[]>([]);
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [evidence, setEvidence] = useState<ExecutionPhoto[]>([]);
  const [events, setEvents] = useState<OrderEvent[]>([]);
  const [search, setSearch] = useState('');
  const [assetSearch, setAssetSearch] = useState('');
  const [assetAreaFilter,setAssetAreaFilter] = useState('');
  const [assetPageSize,setAssetPageSize] = useState(30);
  const [expandedAssetId,setExpandedAssetId] = useState<string|null>(null);
  const [assetFilterId, setAssetFilterId] = useState<string | null>(null);
  const [orderFilter, setOrderFilter] = useState<OrderFilter>('Todas');
  const [historyPageSize, setHistoryPageSize] = useState(40);
  const [routeHistoryPageSize,setRouteHistoryPageSize] = useState(25);
  const [routeHistory,setRouteHistory] = useState<AssetRouteHistoryItem[]>([]);
  const [routeHistoryLoading,setRouteHistoryLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dialog, setDialog] = useState<ModalType>(null);
  // Hardware Back regressa das ferramentas ao menu Mais sem perder a tela atual.
  useEffect(()=>{
    if(!morePage(tab))return;
    const subscription=BackHandler.addEventListener('hardwareBackPress',()=>{
      if(dialog!==null)return false; // Modal usa onRequestClose existente.
      setTab('Mais');
      return true;
    });
    return ()=>subscription.remove();
  },[tab,dialog]);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const modalScrollRef = useRef<ScrollView>(null);
  const [assetDraft, setAssetDraft] = useState<AssetDraft>(initialAsset());
  const [orderDraft, setOrderDraft] = useState<OrderDraft>(initialOrder());
  const [duplicateSource, setDuplicateSource] = useState<string | null>(null);
  const [recurrenceInput, setRecurrenceInput] = useState('30');
  const [editingAsset, setEditingAsset] = useState<string | undefined>();
  const [editingOrder, setEditingOrder] = useState<string | undefined>();
  const [completingOrder, setCompletingOrder] = useState<WorkOrder | null>(null);
  const [completionNotes, setCompletionNotes] = useState('');
  const [completionResult, setCompletionResult] = useState<ExecutionResult>('completed');
  const [showNoteTemplates,setShowNoteTemplates]=useState(false);
  const [blockReason, setBlockReason] = useState('');
  const [archiveReason,setArchiveReason]=useState('');
  const [draftPhotos, setDraftPhotos] = useState<PhotoDraft[]>([]);
  // Evita duplicar operações antes de React atualizar o estado busy.
  const operationGuard=useRef(createActionGuard()).current;

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    return () => {show.remove(); hide.remove();};
  }, []);

  const focusLastField = () => {
    // Em alguns teclados Android a janela só termina de redimensionar após o foco.
    setTimeout(() => modalScrollRef.current?.scrollToEnd({animated: true}), 260);
  };

  const closeDialog = () => {
    Keyboard.dismiss();
    if (calendarOpen) setCalendarOpen(false);
    else setDialog(null);
  };

  const refresh = useCallback(async () => {
    const [a, o, e, p, ev, r, archived] = await Promise.all([
      listAssets(), listOrders(), listExecutions(), listAllPhotos(), listRecentEvents(), listRoutes(),
      listArchivedOrders(),
    ]);
    setAssets(a); setOrders(o); setExecutions(e); setEvidence(p); setEvents(ev); setRoutes(r);
    setArchivedOrders(archived);
    void syncLocalReminders().catch(err=>console.warn('Lembretes não atualizados:',String(err)));
  }, []);

  useEffect(() => {
    (async () => {
      try { await initializeDatabase(); await refresh(); }
      catch (e) { setInitError(String(e)); }
      finally { setReady(true); }
    })();
  }, [refresh]);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      // Não consulta uma base ainda não inicializada ou cuja migração falhou.
      if (state === 'active' && ready && !initError) void refresh().catch(err => {
        Alert.alert('Erro ao atualizar', String(err));
      });
    });
    return () => subscription.remove();
  }, [ready, refresh, initError]);

  const selectedAsset = useMemo(() => assets.find(asset => asset.id === assetFilterId) ?? null,
    [assets, assetFilterId]);
  const assetSectorOptions=useMemo(()=>assetAreas(assets),[assets]);
  const visibleAssets = useMemo(() => findCatalogAssets(assets,assetSearch,assetAreaFilter), [assets,assetSearch,assetAreaFilter]);
  const assetOrderCounts=useMemo(()=>{
    const counts=new Map<string,number>();
    for(const order of orders)if(order.asset_id)counts.set(order.asset_id,(counts.get(order.asset_id)||0)+1);
    return counts;
  },[orders]);
  const legacyAssetIndex = useMemo(() => buildLegacyAssetIndex(assets),[assets]);
  useEffect(()=>{
    let cancelled=false;
    setRouteHistory([]);
    if(!selectedAsset || tab!=='Histórico') {
      setRouteHistoryLoading(false);
      return ()=>{cancelled=true;};
    }
    setRouteHistoryLoading(true);
    void listAssetRouteHistory(selectedAsset,assets)
      .then(rows=>{if(!cancelled)setRouteHistory(rows);})
      .catch(err=>{if(!cancelled)Alert.alert('Histórico de rotas indisponível',String(err));})
      .finally(()=>{if(!cancelled)setRouteHistoryLoading(false);});
    return ()=>{cancelled=true;};
  },[selectedAsset,assets,tab]);
  const today = localDate();
  const stateOf = (order: WorkOrder) => taskState(order, today);
  const evidenceByExecution = useMemo(() => {
    const grouped = new Map<string, ExecutionPhoto[]>();
    for (const photo of evidence) grouped.set(photo.execution_id, [...(grouped.get(photo.execution_id) ?? []), photo]);
    return grouped;
  }, [evidence]);
  const visibleOrders = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('pt-BR');
    return orders.filter(order => {
      if (assetFilterId && order.asset_id !== assetFilterId) return false;
      const state = taskState(order, today);
      if (orderFilter === 'Pendentes' && ['completed', 'blocked'].includes(state)) return false;
      if (orderFilter === 'Impedidas' && state !== 'blocked') return false;
      if (orderFilter === 'Prioritárias' && !needsPriorityAttention(order)) return false;
      if (orderFilter === 'Concluídas' || orderFilter === 'Arquivadas') return false; // A aba Concluídas mostra execuções históricas, não estados de OS.
      return !term || [order.title, order.description, order.asset_name || '', order.asset_code || '', order.asset_area || '', order.category, order.block_reason, order.partial_reason]
        .some(value => value.toLocaleLowerCase('pt-BR').includes(term));
    });
  }, [orders, search, orderFilter, today, assetFilterId]);

  const completedExecutions = useMemo(
    () => filterCompletedExecutions(executions,search).filter(execution =>
      !assetFilterId || (!!selectedAsset && executionBelongsToAssetSnapshot(execution, selectedAsset,legacyAssetIndex))),
    [executions,search,assetFilterId,selectedAsset,legacyAssetIndex],
  );
  const historyExecutions = useMemo(() => executions.filter(execution =>
    !assetFilterId || (!!selectedAsset && executionBelongsToAssetSnapshot(execution,selectedAsset,legacyAssetIndex))),
    [executions,assetFilterId,selectedAsset,legacyAssetIndex],
  );
  const archivedVisible=useMemo(()=>{
    const term=search.trim().toLocaleLowerCase('pt-BR');
    return archivedOrders.filter(o=>(!assetFilterId || o.asset_id===assetFilterId) && (!term ||
      [o.title,o.description,o.asset_code||'',o.asset_name||'',o.asset_area||'',o.archive_reason]
        .some(value=>value.toLocaleLowerCase('pt-BR').includes(term))));
  },[archivedOrders,search,assetFilterId]);
  const activityList:ActivityListItem[]=useMemo(()=>orderFilter==='Concluídas'
    ?completedExecutions.map(value=>({kind:'execution' as const,value}))
    :orderFilter==='Arquivadas'
      ?archivedVisible.map(value=>({kind:'order' as const,value}))
      :visibleOrders.map(value=>({kind:'order' as const,value})),
    [orderFilter,completedExecutions,archivedVisible,visibleOrders],
  );

  const handle = async (action: () => Promise<void>) => {
    await operationGuard.run(async()=>{
      setBusy(true);
      try { await action(); await refresh(); setDialog(null); }
      catch (e) { Alert.alert('Não foi possível concluir', e instanceof Error ? e.message : String(e)); }
      finally { setBusy(false); }
    });
  };

  const openAsset = (asset?: Asset) => {
    setEditingAsset(asset?.id);
    setAssetDraft(asset ? {name: asset.name, code: asset.code, area: asset.area} : initialAsset());
    setDialog('asset');
  };
  const openOrder = (order?: WorkOrder, asset?: Asset) => {
    setDuplicateSource(null);
    setCalendarOpen(false);
    setEditingOrder(order?.id);
    setRecurrenceInput(String(order?.recurrence_days ?? 30));
    setOrderDraft(order ? {
      title: order.title, description: order.description, category: order.category,
      priority: order.priority, asset_id: order.asset_id,
      recurrence_days: order.recurrence_days, due_date: order.due_date,
    } : asset ? preselectAsset(initialOrder(),asset) : initialOrder());
    setDialog('order');
  };
  const openDuplicateOrder = (order: WorkOrder) => {
    try {
      const draft = duplicateOrderDraft(order, localDate());
      setCalendarOpen(false);
      setEditingOrder(undefined); // Salvar criará uma OS nova, com ID e histórico próprios.
      setRecurrenceInput(String(draft.recurrence_days));
      setOrderDraft(draft);
      setDuplicateSource(order.title);
      setDialog('order');
    } catch (error) {
      Alert.alert('Não foi possível duplicar', error instanceof Error ? error.message : String(error));
    }
  };
  const openComplete = (order: WorkOrder) => {
    setCompletingOrder(order);
    setCompletionNotes('');
    setCompletionResult('completed');
    setShowNoteTemplates(false);
    setDraftPhotos([]);
    setDialog('complete');
  };
  const openBlock = (order: WorkOrder) => {
    setCompletingOrder(order);
    setBlockReason(order.block_reason || '');
    setDialog('block');
  };
  const addPhoto = async (camera: boolean) => {
    if (busy || draftPhotos.length >= MAX_PHOTOS_PER_EXECUTION) return;
    try {
      const picked = await selectPhoto(camera);
      if (picked) setDraftPhotos(prev => prev.length < MAX_PHOTOS_PER_EXECUTION ? [...prev, picked] : prev);
    } catch (e) { Alert.alert('Foto não adicionada', e instanceof Error ? e.message : String(e)); }
  };
  const runExtra = async (action: () => Promise<void>) => {
    await operationGuard.run(async()=>{
      setBusy(true);
      try { await action(); }
      catch (e) { Alert.alert('Não foi possível concluir', e instanceof Error ? e.message : String(e)); }
      finally { setBusy(false); }
    });
  };
  const requestRestore = () => { void runExtra(async () => {
    const data = await pickBackupFile();
    if (!data) return;
    Alert.alert('Restaurar backup?',
      `Este backup tem ${data.assets.length} equipamento(s), ${data.work_orders.length} atividade(s), ` +
      `${data.executions.length} execução(ões) e ${data.photos.length} foto(s). ` +
      'TODOS os dados atuais deste aparelho serão substituídos. Exporte um backup antes de continuar.',
      [{text: 'Cancelar', style: 'cancel'}, {text: 'Substituir dados', style: 'destructive',
        onPress: () => { void handle(async () => {
          await restoreBackup(data);
          Alert.alert('Restauração concluída', 'Dados substituídos pelo backup selecionado.');
        }); }}]
    );
  }); };

  const openArchiveOrder=(order:WorkOrder)=>{
    setCompletingOrder(order);
    setArchiveReason('');
    setDialog('archive');
  };
  const confirmRestoreOrder=(order:WorkOrder)=>Alert.alert(
    'Reativar OS?',`A OS "${order.title}" voltará ao planejamento, mantendo o histórico anterior.`,
    [{text:'Cancelar',style:'cancel'},
      {text:'Reativar',onPress:()=>{void handle(()=>restoreArchivedOrder(order.id));}}],
  );

  const confirmDeleteAsset = (asset: Asset) => Alert.alert(
    'Excluir equipamento?', 'As atividades vinculadas serão mantidas, mas perderão o vínculo com o equipamento.',
    [{text: 'Cancelar', style: 'cancel'}, {text: 'Excluir', style: 'destructive',
      onPress: () => { void handle(() => removeAsset(asset.id)); }}],
  );

  function orderCard(order: WorkOrder) {
    const archived=!!order.archived_at;
    const state = stateOf(order);
    const overdueOrder = state === 'overdue';
    const done = state === 'completed';
    const isBlocked = state === 'blocked';
    const isPartial = !done && !!order.partial_reason?.trim();
    return <View key={order.id} style={styles.card}>
      <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10}}>
        <View style={{flex: 1}}>
          <Text style={styles.cardTitle}>{order.title}</Text>
          <Text style={styles.detail}>{[order.asset_code, order.asset_name].filter(Boolean).join(' · ') || 'Sem equipamento'} · {order.category}</Text>
        </View>
        <Pill text={archived ? 'Arquivada' : done ? 'Concluída' : isBlocked ? 'Impedida' : isPartial ? 'Parcial' : overdueOrder ? 'Atrasada' : order.due_date === today ? 'Hoje' : 'Programada'}
          tone={done ? 'green' : isBlocked || overdueOrder ? 'red' : isPartial || order.due_date === today ? 'yellow' : 'blue'}/>
      </View>
      {archived&&<View style={styles.blockAlert}>
        <Text style={{color:COLORS.yellow,fontWeight:'800'}}>OS ARQUIVADA — HISTÓRICO PRESERVADO</Text>
        <Text style={styles.description}>Motivo: {order.archive_reason}</Text>
        <Text style={styles.detail}>Arquivada em {new Date(order.archived_at!).toLocaleString('pt-BR')}</Text>
      </View>}
      {!!order.description && <Text style={styles.description}>{order.description}</Text>}
      {isPartial && <View style={[styles.blockAlert, {backgroundColor: '#2B2B3B'}]}>
        <Text style={{color: COLORS.yellow, fontWeight: '800'}}>↻ EXECUÇÃO PARCIAL — PENDÊNCIA ABERTA</Text>
        <Text style={{color: COLORS.text, marginTop: 4}}>{order.partial_reason}</Text>
      </View>}
      {isBlocked && <View style={styles.blockAlert}><Text style={{color: COLORS.yellow, fontWeight: '800'}}>⚠ IMPEDIMENTO</Text><Text style={{color: COLORS.text, marginTop: 4}}>{order.block_reason}</Text></View>}
      <View style={styles.chips}>
        <Pill text={`📅 ${order.due_date}`}/>
        <Pill text={order.recurrence_days === 0 ? 'Avulsa' : `A cada ${order.recurrence_days} dias`}/>
        <Pill text={`Prioridade ${order.priority}`} tone={order.priority === 'Alta' ? 'red' : 'blue'}/>
      </View>
      <View style={styles.cardActions}>
        {archived?
          <Action label="Reativar OS" secondary disabled={busy}
            onPress={()=>confirmRestoreOrder(order)}/>:
          <>
            {!done && !isBlocked && <Action label="✓ Executar" onPress={() => openComplete(order)}/>}
            {!done && (isBlocked
              ? <Action label="Liberar" secondary disabled={busy}
                  onPress={() => { void handle(() => releaseImpediment(order.id)); }}/>
              : <Action label="⚠ Impedimento" secondary disabled={busy}
                  onPress={() => openBlock(order)}/>)}
            <Action label="Editar" secondary onPress={() => openOrder(order)}/>
            <Action label="Duplicar" secondary disabled={busy} onPress={() => openDuplicateOrder(order)}/>
            <Action label="Arquivar" dangerous disabled={busy}
              onPress={()=>openArchiveOrder(order)}/>
          </>}
      </View>
    </View>;
  }

  function completedExecutionCard(execution:Execution) {
    const photos=evidenceByExecution.get(execution.id)??[];
    return <View style={styles.card}>
      <View style={{flexDirection:'row',justifyContent:'space-between',gap:10,alignItems:'center'}}>
        <Text style={[styles.cardTitle,{flex:1}]}>{execution.order_title}</Text>
        <Pill text="✓ Concluída" tone="green"/>
      </View>
      <Text style={styles.detail}>{execution.category}{execution.asset_label?' · '+execution.asset_label:''}</Text>
      <Text style={styles.detail}>Realizada em: {new Date(execution.executed_at).toLocaleString('pt-BR')}</Text>
      <Text style={styles.detail}>Prazo executado: {brazilianDate(execution.previous_due_date)}</Text>
      {execution.next_due_date?
        <Text style={styles.detail}>Próxima manutenção: {brazilianDate(execution.next_due_date)}
          {' (OS recorrente continua pendente)'}</Text>
        :<Text style={styles.detail}>OS avulsa concluída</Text>}
      {!!execution.notes&&<Text style={styles.description}>{execution.notes}</Text>}
      <Text style={styles.detail}>{photos.length} foto(s) da execução</Text>
      {!!photos.length&&<View style={styles.photoRow}>
        {photos.map(photo=><Image key={photo.id} source={{uri:evidenceUri(photo.filename)}}
          style={styles.thumb}/>)}
      </View>}
      <View style={styles.cardActions}>
        <Action label="Gerar PDF" secondary disabled={busy}
          onPress={()=>{void runExtra(()=>exportExecutionPdf(execution,photos));}}/>
      </View>
    </View>;
  }

  const openAssetView = (asset:Asset, view:'orders'|'history') => {
    setAssetFilterId(asset.id);
    setSearch('');
    setHistoryPageSize(40);
    setRouteHistoryPageSize(25);
    if (view === 'orders') { setOrderFilter('Todas'); setTab('Atividades'); }
    else setTab('Histórico');
  };

  const assetContext = selectedAsset ? <View style={styles.card}>
    <Text style={styles.cardTitle}>⚙ TAG selecionada: {selectedAsset.code || 'sem código'}</Text>
    <Text style={styles.detail}>{selectedAsset.name} · {selectedAsset.area || 'Sem área'}</Text>
    <Text style={styles.hint}>Filtro local deste equipamento. Execuções novas mantêm o vínculo pelo ID estável do equipamento, mesmo após renomear a TAG. Registros legados sem vínculo seguro continuam consultáveis no histórico geral.</Text>
    <View style={styles.cardActions}>
      <Action label="Limpar filtro da TAG" secondary onPress={() => setAssetFilterId(null)}/>
      <Action label="+ OS para esta TAG" secondary onPress={() => openOrder(undefined,selectedAsset)}/>
    </View>
  </View> : null;

  function assetCard(asset: Asset) {
    const count=assetOrderCounts.get(asset.id)||0;
    const expanded=expandedAssetId===asset.id;
    return <View key={asset.id} style={[styles.card,{paddingVertical:10,marginBottom:8}]}>
      <Pressable accessibilityRole="button" accessibilityState={{expanded}}
        onPress={()=>setExpandedAssetId(expanded?null:asset.id)}
        style={{flexDirection:'row',gap:12,alignItems:'center',minHeight:51}}>
        <View style={{flex:1,gap:3}}>
          <Text style={[styles.cardTitle,{color:COLORS.accent,fontSize:16}]}>{asset.code||'Sem TAG'}</Text>
          <Text style={{color:COLORS.text,fontSize:13,fontWeight:'700'}}>{asset.name}</Text>
          <Text style={styles.detail}>{asset.area||'Sem setor'} · {count} atividade(s)</Text>
        </View>
        <Text style={{color:COLORS.accent,fontSize:12,fontWeight:'800'}}>{expanded?'Fechar −':'Abrir ›'}</Text>
      </Pressable>
      {expanded&&<View style={[styles.cardActions,{marginTop:12}]}>
        <Action label="+ OS" onPress={()=>openOrder(undefined,asset)}/>
        <Action label="Ver OS" secondary onPress={()=>openAssetView(asset,'orders')}/>
        <Action label="Histórico" secondary onPress={()=>openAssetView(asset,'history')}/>
        <Action label="Editar" secondary onPress={()=>openAsset(asset)}/>
        <Pressable accessibilityRole="button" onPress={()=>confirmDeleteAsset(asset)} style={{padding:11}}>
          <Text style={{color:COLORS.red,fontWeight:'700'}}>Excluir</Text>
        </Pressable>
      </View>}
    </View>;
  }

  const content = () => {
    if (tab === 'Mais')return <MoreMenu onOpen={page=>{
      setAssetFilterId(null);
      setTab(page);
    }}/>;
    if (tab === 'Início') return <HomeScreen
      orders={orders} routes={routes}
      onOpenAgenda={()=>setTab('Agenda')}
      onNewOrder={()=>openOrder()}
      onOpenRoute={id=>{setSelectedRouteId(id);setTab('Rotas');}}
      onOpenOrder={id=>{
        const order=orders.find(o=>o.id===id);
        if(!order){Alert.alert('OS não encontrada','Atualize a lista de atividades.');return;}
        if(order.block_reason?.trim())openBlock(order);
        else openComplete(order);
      }}
    />;
    if (tab === 'Ativos') return <>
      <View style={styles.pageHeading}><View><Text style={styles.sectionTitle}>Equipamentos</Text><Text style={styles.detail}>{assets.length} cadastrados</Text></View>
        <Action label="+ Novo" onPress={() => openAsset()}/></View>
      <TextInput accessibilityLabel="Buscar equipamento por TAG, nome ou setor"
        placeholder="Buscar TAG, nome ou setor..." placeholderTextColor={COLORS.muted}
        value={assetSearch} onChangeText={value=>{setAssetSearch(value);setAssetPageSize(30);}}
        style={styles.searchField}/>
      <ScrollView horizontal keyboardShouldPersistTaps="always" showsHorizontalScrollIndicator={false}
        style={{flexGrow:0,marginVertical:9}}
        contentContainerStyle={{flexDirection:'row',gap:7,alignItems:'center',paddingRight:18}}>
        {['',...assetSectorOptions].map(area=><Pressable key={area||'all'} accessibilityRole="button"
          accessibilityState={{selected:area===assetAreaFilter}}
          onPress={()=>{setAssetAreaFilter(area);setAssetPageSize(30);}}
          style={[styles.choice,area===assetAreaFilter&&styles.choiceActive]}>
          <Text style={{fontSize:12,fontWeight:'700',color:area===assetAreaFilter?COLORS.bg:COLORS.text}}>
            {area||'Todos os setores'}</Text>
        </Pressable>)}
      </ScrollView>
      <Text style={[styles.detail,{marginBottom:9}]}>
        {visibleAssets.length} de {assets.length} equipamento(s) · TAG / nome / setor
      </Text>
      {assets.length===0?<Text style={styles.empty}>Cadastre seu primeiro equipamento.</Text>
        :visibleAssets.length===0?<Text style={styles.empty}>Nenhum equipamento encontrado. Ajuste a busca ou o setor.</Text>
        :visibleAssets.slice(0,assetPageSize).map(assetCard)}
      {visibleAssets.length>assetPageSize&&<Action secondary label={`Mostrar mais (${Math.min(30,visibleAssets.length-assetPageSize)} de ${visibleAssets.length-assetPageSize} restantes)`}
        onPress={()=>setAssetPageSize(v=>v+30)}/>}
    </>;
    if (tab === 'Dados') return <>
      <Text style={styles.sectionTitle}>Seus dados</Text>
      <ConsolidatedReportPanel/>
      <ReminderSettings/>
      <Text style={styles.description}>Todas as informações ficam neste aparelho. Não existe login, nuvem nem sincronização nesta versão.</Text>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Diagnóstico de integridade local</Text>
        <Text style={styles.description}>Verifica o banco SQLite, vínculos entre registros e
          fotografias armazenadas. Somente leitura: não apaga nem corrige arquivos.</Text>
        <View style={styles.cardActions}>
          <Action secondary disabled={busy} label={busy?'Verificando...':'Verificar dados do aparelho'}
            onPress={()=>{void runExtra(async()=>{
              const report=await inspectLocalStorage();
              const healthy=report.databaseOk&&report.foreignKeyErrors===0&&report.missingPhotos===0
                &&report.uncheckedPhotos===0;
              Alert.alert(healthy?'Verificação sem falhas detectadas':'Atenção à integridade',
                `Banco: ${report.databaseDetails}\nReferências inválidas: ${report.foreignKeyErrors}\n`+
                `OS ativas: ${report.activeOrders}\nOS arquivadas: ${report.archivedOrders}\n`+
                `Fotos no banco: ${report.photoRecords}\nFotos examinadas: ${report.verifiedPhotos}\n`+
                `Fotos ausentes: ${report.missingPhotos}\nNão verificadas: ${report.uncheckedPhotos}\n\n`+
                (healthy?'Nenhum problema detectado nos itens verificados. Isso não substitui o teste de restauração do backup.':
                'Se houver fotos ausentes ou vínculos inválidos, não desinstale nem limpe os dados. Preserve seu backup e solicite revisão.'));
            });}}/>
        </View>
      </View>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Otimização segura do banco local</Text>
        <Text style={styles.description}>
          Reorganiza estatísticas internas do SQLite para melhorar consultas.
          Não remove equipamentos, OS, históricos, rotas, fotos nem backups.
          Versões antigas do aplicativo não são apagadas automaticamente.
        </Text>
        <View style={styles.cardActions}>
          <Action secondary disabled={busy} label={busy?'Ocupado...':'Otimizar banco sem apagar dados'}
            onPress={()=>Alert.alert('Otimizar dados locais?',
              'A manutenção é não destrutiva. Para sua segurança, mantenha um backup externo atualizado.',
              [{text:'Cancelar',style:'cancel'},{text:'Otimizar',onPress:()=>{void runExtra(async()=>{
                const result=await optimizeLocalDatabase();
                Alert.alert('Otimização concluída',
                  `Registros preservados: ${result.records}. Fotos preservadas: ${result.photos}. Nenhum histórico foi excluído.`);
              });}}])}/>
        </View>
      </View>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Exportar backup completo</Text>
        <Text style={styles.description}>Inclui equipamentos, atividades, execuções e fotos. Salve o JSON em local seguro fora do aplicativo, por exemplo em uma pasta privada.</Text>
        <View style={styles.cardActions}><Action disabled={busy} label={busy ? 'Preparando...' : 'Exportar backup'}
          onPress={() => { void runExtra(async () => {
            await exportBackup();
            Alert.alert('Arquivo gerado', 'Verifique se o backup foi realmente salvo em um local seguro.');
          }); }}/></View>
      </View>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Verificar arquivo de backup (sem restaurar)</Text>
        <Text style={styles.description}>Confira se um JSON de backup é reconhecido e visualize as quantidades salvas. Seus dados atuais não são alterados.</Text>
        <View style={styles.cardActions}><Action disabled={busy} secondary label="Verificar arquivo"
          onPress={() => { void runExtra(async () => {
            const selected = await pickBackupFile();
            if (!selected) return;
            const summary = inspectBackup(selected);
            Alert.alert('Backup reconhecido',
              `Versão: ${summary.version}\nExportado em: ${new Date(summary.exportedAt).toLocaleString('pt-BR')}\n` +
              `Equipamentos: ${summary.assets}\nAtividades: ${summary.orders}\nArquivadas: ${summary.archivedOrders}\nImpedimentos ativos: ${summary.impediments}\n` +
              `Execuções: ${summary.executions}\nFotos: ${summary.photos}\nEventos: ${summary.events}\n` +
              `Rotas: ${summary.routes}\nRotas periódicas: ${summary.scheduledRoutes}\nRotas com pendências: ${summary.routesWithAttention}\nPontos: ${summary.routePoints}\nExecuções de rota: ${summary.routeRuns}\nFotos dos pontos: ${summary.routePhotos}\n\n` +
              'Verificação estrutural aprovada. Não houve restauração nem alteração dos seus dados. ' +
              'Esta verificação não comprova que o arquivo pode ser restaurado integralmente em qualquer aparelho.');
          }); }}/></View>
      </View>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Restaurar um backup</Text>
        <Text style={styles.description}>Substitui TODOS os registros existentes, depois de sua confirmação. Antes disso, exporte uma cópia do estado atual.</Text>
        <View style={styles.cardActions}><Action disabled={busy} dangerous label="Escolher backup" onPress={requestRestore}/></View>
      </View>
      <Text style={styles.hint}>Formato local versão 11 (compatibilidade com versões anteriores validadas) · tamanho máximo de arquivo 60 MB (limite conservador de exportação menor). Arquivos JSON não são criptografados: guarde-os com cuidado.</Text>
    </>;
    return <>
      <Text style={styles.sectionTitle}>Histórico de execuções</Text>
      {assetContext}
      <Text style={[styles.detail, {marginBottom: 16}]}>Cada execução fica registrada no aparelho. {assetFilterId ? 'Exibindo execuções ligadas à TAG por ID ou, quando legado, por retrato exato.' : 'Mostrando os registros mais recentes.'}</Text>
      {historyExecutions.length === 0 ? <Text style={styles.empty}>{assetFilterId ? 'Nenhuma execução vinculada encontrada. Confira o histórico geral para registros legados ou de equipamentos excluídos.' : 'Nenhum serviço executado ainda.'}</Text>
        : historyExecutions.slice(0, historyPageSize).map(execution => <View key={execution.id} style={styles.card}>
          <View style={{flexDirection: 'row', justifyContent: 'space-between', gap: 12}}>
            <Text style={[styles.cardTitle, {flex: 1}]}>{execution.order_title}</Text>
            <Pill text={execution.result === 'partial' ? 'Parcial' : 'Concluída'} tone={execution.result === 'partial' ? 'yellow' : 'green'}/>
          </View>
          <Text style={styles.detail}>{new Date(execution.executed_at).toLocaleString('pt-BR')}</Text>
          {!!execution.notes && <Text style={styles.description}>{execution.notes}</Text>}
          <Text style={styles.description}>Prazo anterior: {execution.previous_due_date}</Text>
          {execution.result === 'partial'
            ? <Text style={[styles.detail, {color: COLORS.yellow}]}>OS continua pendente. Data não reagendada.</Text>
            : !!execution.next_due_date && <Text style={styles.detail}>Próxima execução: {execution.next_due_date}</Text>}
          {!!execution.asset_label && <Text style={styles.detail}>Equipamento: {execution.asset_label}</Text>}
          <Text style={styles.detail}>{execution.photo_count} foto(s) no registro</Text>
          <View style={styles.photoRow}>
            {(evidenceByExecution.get(execution.id) ?? []).map(photo =>
              <Image key={photo.id} source={{uri: evidenceUri(photo.filename)}} style={styles.thumb}/>)}
          </View>
          <View style={styles.cardActions}>
            <Action disabled={busy} label={busy ? 'Processando...' : 'Gerar PDF'} secondary
              onPress={() => { void runExtra(() => exportExecutionPdf(execution,
                evidenceByExecution.get(execution.id) ?? [])); }}/>
          </View>
        </View>)}
      {historyExecutions.length > historyPageSize && <Action secondary label={`Carregar mais registros (${historyExecutions.length - historyPageSize} restantes)`} onPress={() => setHistoryPageSize(n => n + 40)}/> }
      {selectedAsset && <>
        <Text style={[styles.sectionTitle,{marginTop:26}]}>Pontos de rota deste equipamento</Text>
        <Text style={styles.detail}>Execuções de manutenção e inspeções vinculadas à TAG, com fotos e ocorrências. Até 300 registros recentes por consulta.</Text>
        {routeHistoryLoading ? <ActivityIndicator color={COLORS.accent} style={{marginTop:16}}/> :
          routeHistory.length===0 ? <Text style={styles.empty}>Nenhum ponto de rota vinculado a esta TAG. Registros antigos ambíguos permanecem no histórico geral das rotas.</Text> :
          routeHistory.slice(0,routeHistoryPageSize).map(item=><View key={item.id} style={styles.card}>
            <Text style={styles.cardTitle}>{item.point_title}</Text>
            <Text style={styles.detail}>{item.route_title} · {new Date(item.started_at).toLocaleString('pt-BR')}</Text>
            <Text style={styles.detail}>Equipamento na execução: {item.asset_label||'Sem identificação no retrato'}</Text>
            <View style={styles.chips}>
              <Pill text={item.status==='done'?'Executado':item.status==='anomaly'?'Anomalia':item.status==='skipped'?'Não executado':'Pendente'}
                tone={item.status==='done'?'green':item.status==='anomaly'?'red':'yellow'}/>

            </View>
            {!!item.notes&&<Text style={styles.description}>Registro: {item.notes}</Text>}
            <Text style={styles.detail}>{item.photo_count} foto(s) anexada(s)</Text>
            {!!item.first_photo&&<Image source={{uri:evidenceUri(item.first_photo)}} style={styles.thumb}/>}
          </View>)}
        {routeHistory.length>routeHistoryPageSize&&<Action secondary label={`Carregar mais pontos (${routeHistory.length-routeHistoryPageSize} restantes)`}
          onPress={()=>setRouteHistoryPageSize(size=>size+25)}/>}
      </>}
      {!assetFilterId && events.length > 0 && <>
        <Text style={[styles.sectionTitle, {marginTop: 26}]}>Ocorrências / impedimentos</Text>
        <Text style={styles.detail}>Registros de bloqueio, liberação e execução (últimos 250 eventos).</Text>
        {events.slice(0, 25).map(ev => <View key={ev.id} style={styles.eventRow}>
          <Text style={{color: ev.event_type === 'blocked' ? COLORS.yellow : COLORS.muted, fontWeight: '700'}}>{ev.event_type === 'blocked' ? 'Impedimento' : ev.event_type === 'released' ? 'Liberado' : 'Executado'}</Text>
          <Text style={styles.detail}>{new Date(ev.created_at).toLocaleString('pt-BR')}{ev.reason ? ` • ${ev.reason}` : ''}</Text>
        </View>)}
      </>}
    </>;
  };

  return <SafeAreaView style={styles.safe}>
    <StatusBar barStyle="light-content" backgroundColor={COLORS.bg}/>
    <View style={styles.topbar}>
      <Image source={require('./assets/icon.png')} accessibilityLabel="Logo RotaManutenção" style={styles.logo}/>
      <View style={{flex: 1}}><Text style={styles.brand}>Rota<Text style={{color: COLORS.accent}}>Manutenção</Text></Text>
        <Text style={styles.brandSub}>MANUTENÇÃO SIMPLES · OFFLINE</Text></View>
      <View style={styles.localStatus}><View style={styles.localDot}/>
        <Text style={styles.localText}>Local</Text></View>
    </View>
    {!ready ? <View style={[styles.safe, {justifyContent: 'center'}]}><ActivityIndicator color={COLORS.accent} size="large"/></View>
      : initError ? <View style={styles.scroll}>
          <Text style={styles.sectionTitle}>Não foi possível abrir seus dados</Text>
          <Text style={styles.description}>Os registros existentes não foram apagados. Evite reinstalar o aplicativo até recuperar o banco.</Text>
          <Text style={styles.description}>{initError}</Text>
          <Action label="Tentar novamente" onPress={() => { void (async () => {
            setReady(false);
            try { await initializeDatabase(); await refresh(); setInitError(null); }
            catch (err) { setInitError(String(err)); }
            finally { setReady(true); }
          })(); }}/>
        </View>
      : tab === 'Rotas' ? <RoutesScreen assets={assets} initialRouteId={selectedRouteId}
          onOpenCorrective={title=>{setSearch(title);setOrderFilter('Todas');setTab('Atividades');}}
          onDataChanged={()=>{
            void refresh().catch(err=>console.warn('Falha ao atualizar painel:',String(err)));
          }}/>
      : tab === 'Agenda' ? <OperationalAgenda orders={orders} routes={routes}
           onOpenRoute={id=>{setSelectedRouteId(id);setTab('Rotas');}}
           onOpenOrder={(id,mode)=>{
             const order=orders.find(o=>o.id===id);
             if(!order){Alert.alert('OS indisponível','A atividade pode ter sido arquivada ou alterada.');return;}
             if(mode==='edit')openOrder(order);
             else if(order.block_reason?.trim())openBlock(order);
             else openComplete(order);
           }}/>
       : tab === 'Atividades' ? <FlatList
          data={activityList}
          keyExtractor={item => item.kind+':'+item.value.id}
          renderItem={({item}) => item.kind==='execution'
            ? completedExecutionCard(item.value) : orderCard(item.value)}
          initialNumToRender={12}
          maxToRenderPerBatch={12}
          windowSize={7}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scroll}
          ListHeaderComponent={<>
            {assetContext}
            <View style={styles.pageHeading}><View><Text style={styles.sectionTitle}>Ordens de serviço</Text>
              <Text style={styles.detail}>{orderFilter==='Concluídas'
                ?`${completedExecutions.length} execução(ões) concluída(s)`
                :orderFilter==='Arquivadas'
                ?`${archivedVisible.length} OS arquivada(s)`
                :`${orders.length} ativas • ${archivedOrders.length} arquivadas`}</Text></View>
              <Action label="+ Nova" onPress={() => openOrder()}/></View>
            <TextInput accessibilityLabel="Buscar atividades" placeholder="Buscar por TAG, equipamento ou atividade..."
              placeholderTextColor={COLORS.muted} value={search} onChangeText={setSearch} style={styles.searchField}/>
            <View style={styles.filters}>
              {(['Todas', 'Pendentes', 'Impedidas', 'Prioritárias', 'Concluídas', 'Arquivadas'] as const).map(filter =>
                <Pressable key={filter} accessibilityRole="button" accessibilityState={{selected: orderFilter === filter}}
                  onPress={() => setOrderFilter(filter)} style={[styles.choice, orderFilter === filter && styles.choiceActive]}>
                  <Text style={{color: orderFilter === filter ? COLORS.bg : COLORS.text, fontWeight: '700', fontSize: 12}}>{filter}</Text>
                </Pressable>)}
            </View>
          </>}
          ListEmptyComponent={<Text style={styles.empty}>{orderFilter==='Concluídas'
            ? 'Nenhuma execução concluída encontrada. OS recorrentes já executadas aparecem aqui.'
            :orderFilter==='Arquivadas'
            ?'Nenhuma OS arquivada. As OS arquivadas podem ser reativadas sem perda de fotos ou histórico.'
            :'Nenhuma atividade encontrada. Ajuste a busca ou crie uma atividade.'}</Text>}
        />
      : <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">{content()}</ScrollView>}
    <View accessibilityRole="tablist" style={styles.nav}>
      {bottomTabs.map(item =>{
        const active=visibleTab(tab)===item.label;
        return <Pressable key={item.label} accessibilityRole="tab"
          accessibilityLabel={item.label==='Atividades'?'Ordens de serviço':item.label}
          accessibilityState={{selected:active}}
          onPress={()=>{
            if(item.label==='Rotas')setSelectedRouteId(null);
            setAssetFilterId(null);
            setTab(item.label);
          }}
          style={styles.navItem}>
          <View style={[styles.navIconBox,active&&styles.navIconActive]}>
            <Text style={[styles.navIcon,active&&{color:COLORS.accent}]}>{item.icon}</Text>
          </View>
          <Text style={[styles.navLabel,active&&{color:COLORS.text}]}>{item.caption}</Text>
        </Pressable>;
      })}
    </View>
    <Modal animationType="slide" visible={dialog !== null} transparent onRequestClose={closeDialog}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalBackdrop}>
        <SafeAreaView style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.sectionTitle}>{calendarOpen ? 'Selecionar data' : dialog === 'asset' ? (editingAsset ? 'Editar equipamento' : 'Novo equipamento')
              : dialog === 'order' ? (editingOrder ? 'Editar atividade' : duplicateSource ? 'Duplicar atividade' : 'Nova atividade')
              : dialog === 'block' ? 'Registrar impedimento' : dialog==='archive' ? 'Arquivar OS' : 'Registrar execução'}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel={calendarOpen ? 'Voltar ao formulário' : 'Fechar formulário'}
              onPress={closeDialog}><Text style={{color: COLORS.muted, fontSize: 24}}>{calendarOpen ? '‹' : '×'}</Text></Pressable>
          </View>
          {calendarOpen ? <CalendarPicker value={orderDraft.due_date}
            onSelect={date => {
              setOrderDraft(current => ({...current, due_date: date}));
              setCalendarOpen(false);
            }}
            onCancel={() => setCalendarOpen(false)}/>
          : <ScrollView ref={modalScrollRef} keyboardShouldPersistTaps="handled"
              keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
              style={{flexShrink: 1}} contentContainerStyle={{paddingBottom: keyboardVisible ? 38 : 18}}>
            {dialog === 'asset' && <>
              <FormField label="Nome *" placeholder="Ex.: Esteira transportadora" value={assetDraft.name}
                onChangeText={v => setAssetDraft({...assetDraft, name: v})}/>
              <FormField label="Código / TAG" placeholder="Ex.: EQ-101" value={assetDraft.code}
                onChangeText={v => setAssetDraft({...assetDraft, code: v})}/>
              <FormField label="Área / Setor" placeholder="Ex.: Paletização" value={assetDraft.area}
                onChangeText={v => setAssetDraft({...assetDraft, area: v})}/>
              <Action disabled={busy} label={busy ? 'Salvando...' : 'Salvar equipamento'}
                onPress={() => { void handle(() => saveAsset(assetDraft, editingAsset)); }}/>
            </>}
            {dialog === 'order' && <>
              {duplicateSource && <Text style={styles.description}>Nova OS independente baseada em “{duplicateSource}”. Confira o prazo (ajustado para hoje), equipamento e periodicidade antes de salvar. Fotos, histórico, impedimentos e pendências não serão copiados.</Text>}
              <FormField label="Atividade *" placeholder="Ex.: Lubrificar mancais" value={orderDraft.title}
                onChangeText={v => setOrderDraft({...orderDraft, title: v})}/>
              <FormField label="Descrição" placeholder="Pontos, graxa, procedimentos..." multiline
                value={orderDraft.description} onChangeText={v => setOrderDraft({...orderDraft, description: v})}/>
              <Choices label="Especialidade" value={orderDraft.category} options={categories}
                onChange={v => setOrderDraft({...orderDraft, category: v})}/>
              <Choices label="Prioridade" value={orderDraft.priority} options={priorities}
                onChange={v => setOrderDraft({...orderDraft, priority: v})}/>
              <AssetPicker assets={assets} value={orderDraft.asset_id} allowNone
                onChange={id=>setOrderDraft(current=>({...current,asset_id:id}))}/>
              <Text style={styles.fieldLabel}>Data programada *</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Abrir calendário para escolher data"
                style={styles.dateField} onPress={() => {Keyboard.dismiss(); setCalendarOpen(true);}}>
                <Text style={styles.dateFieldText}>📅  {brazilianDate(orderDraft.due_date)}</Text>
                <Text style={styles.dateFieldHint}>Alterar  ›</Text>
              </Pressable>
              <FormField label="Repetir a cada quantos dias? (0 = avulsa)" keyboardType="numeric"
                value={recurrenceInput} onChangeText={setRecurrenceInput} onFocus={focusLastField}/>
              <Text style={[styles.hint, {marginBottom: 15}]}>Ao executar uma atividade recorrente, a próxima data será calculada a partir do dia da execução.</Text>
              <Action disabled={busy || !validDate(orderDraft.due_date) || !/^\d+$/.test(recurrenceInput)} label={busy ? 'Salvando...' : 'Salvar atividade'}
                onPress={() => { void handle(() => saveOrder({...orderDraft, recurrence_days: Number(recurrenceInput)}, editingOrder)); }}/>
            </>}
            {dialog === 'archive' && completingOrder && <>
              <Text style={styles.cardTitle}>{completingOrder.title}</Text>
              <Text style={styles.description}>Esta OS será removida do planejamento e das notificações,
                mas todas as execuções, fotos e registros anteriores serão preservados.
                Você poderá reativá-la no filtro Arquivadas.</Text>
              <FormField label="Motivo do arquivamento *" multiline
                placeholder="Ex.: Equipamento desativado, plano preventivo substituído"
                value={archiveReason} onChangeText={setArchiveReason}/>
              <Action disabled={busy||archiveReason.trim().length<10||archiveReason.length>500}
                label={busy?'Arquivando...':'Confirmar arquivamento'}
                onPress={()=>{void handle(()=>archiveOrder(completingOrder.id,archiveReason));}}/>
            </>}
            {dialog === 'block' && completingOrder && <>
              <Text style={[styles.cardTitle, {marginBottom: 10}]}>{completingOrder.title}</Text>
              <Text style={styles.description}>Identifique por que esta atividade não pode ser executada agora. Isso ajuda a organizar prioridades e comunicar necessidades ao PCM.</Text>
              <Text style={styles.fieldLabel}>Motivos frequentes</Text>
              <View style={styles.filters}>
                {['Aguardando peças', 'Equipamento em produção', 'Aguardando parada', 'Condição insegura', 'Falta de recurso'].map(reason =>
                  <Pressable key={reason} accessibilityRole="button" onPress={() => setBlockReason(reason)}
                    style={[styles.choice, blockReason === reason && styles.choiceActive]}>
                    <Text style={{color: blockReason === reason ? COLORS.bg : COLORS.text, fontSize: 12}}>{reason}</Text>
                  </Pressable>)}
              </View>
              <FormField label="Motivo do impedimento *" placeholder="Ex.: aguardando vedação para troca do mancal"
                multiline value={blockReason} onChangeText={setBlockReason}/>
              <Action disabled={busy || !blockReason.trim() || blockReason.length > 500}
                label={busy ? 'Registrando...' : 'Salvar impedimento'}
                onPress={() => { void handle(() => setImpediment(completingOrder.id, blockReason)); }}/>
            </>}
            {dialog === 'complete' && completingOrder && <>
              <Text style={[styles.cardTitle, {marginBottom: 8}]}>{completingOrder.title}</Text>
              <Text style={styles.fieldLabel}>Como ficou o serviço?</Text>
              <View style={styles.executionChoices}>
                <Pressable accessibilityRole="button" accessibilityState={{selected:completionResult==='completed'}}
                  onPress={()=>setCompletionResult('completed')}
                  style={[styles.executionChoice,completionResult==='completed'&&styles.executionDone]}>
                  <Text style={[styles.executionChoiceIcon,{color:COLORS.green}]}>✓</Text>
                  <Text style={styles.executionChoiceText}>Concluído</Text>
                </Pressable>
                <Pressable accessibilityRole="button" accessibilityState={{selected:completionResult==='partial'}}
                  onPress={()=>setCompletionResult('partial')}
                  style={[styles.executionChoice,completionResult==='partial'&&styles.executionPartial]}>
                  <Text style={[styles.executionChoiceIcon,{color:COLORS.yellow}]}>◐</Text>
                  <Text style={styles.executionChoiceText}>Parcial</Text>
                </Pressable>
              </View>
              <Text style={[styles.hint, {color: completionResult === 'partial' ? COLORS.yellow : COLORS.muted, marginBottom: 16}]}>
                {completionResult === 'partial'
                  ? 'PARCIAL: a OS ficará pendente, sem adiantar a próxima data. Descreva o que falta fazer.'
                  : completingOrder.recurrence_days
                    ? `CONCLUÍDA: próxima programação a cada ${completingOrder.recurrence_days} dias a partir de hoje.`
                    : 'CONCLUÍDA: atividade avulsa será encerrada.'}
              </Text>
              <FormField label={completionResult === 'partial' ? 'O que foi feito e o que falta executar? *' : 'O que foi realizado?'}  placeholder="Descreva o serviço executado e anomalias encontradas..."
                multiline value={completionNotes} onChangeText={setCompletionNotes}/>
              <Pressable accessibilityRole="button" accessibilityState={{expanded:showNoteTemplates}}
                onPress={()=>setShowNoteTemplates(v=>!v)}
                style={styles.notesToggle}>
                <Text style={styles.notesToggleText}>
                  {showNoteTemplates?'Ocultar sugestões de anotação':'＋ Usar uma anotação sugerida'}
                </Text>
                <Text style={styles.notesToggleText}>{showNoteTemplates?'⌃':'⌄'}</Text>
              </Pressable>
              {showNoteTemplates&&<View style={styles.filters}>
                {['Executado conforme programação, sem anomalias observadas.',
                  'Executado parcialmente: há pendências a detalhar.',
                  'Anomalia identificada: detalhar causa e ação necessária.'].map(message =>
                  <Pressable key={message} accessibilityRole="button" onPress={() => {
                    if (message.startsWith('Executado parcialmente')) setCompletionResult('partial');
                    setCompletionNotes(prev => prev.trim() ? `${prev.trim()}\n${message}` : message);
                  }}
                    style={styles.choice}><Text style={{fontSize: 12, color: COLORS.text}}>{message}</Text></Pressable>)}
              </View>}
              <Text style={styles.fieldLabel}>Evidências fotográficas ({draftPhotos.length}/{MAX_PHOTOS_PER_EXECUTION})</Text>
              <View style={styles.cardActions}>
                <Action label="📷 Tirar foto" secondary disabled={busy || draftPhotos.length >= MAX_PHOTOS_PER_EXECUTION}
                  onPress={() => { void addPhoto(true); }}/>
                <Action label="Adicionar da galeria" secondary disabled={busy || draftPhotos.length >= MAX_PHOTOS_PER_EXECUTION}
                  onPress={() => { void addPhoto(false); }}/>
              </View>
              <View style={styles.photoRow}>
                {draftPhotos.map((photo, index) => <Pressable key={`${photo.uri}-${index}`}
                  accessibilityLabel={`Remover foto ${index + 1}`} onPress={() => setDraftPhotos(prev => prev.filter((_, i) => i !== index))}>
                  <Image source={{uri: photo.uri}} style={styles.thumb}/>
                  <Text style={{color:COLORS.red,fontSize:10,textAlign:'center'}}>Remover</Text>
                </Pressable>)}
              </View>
              <Text style={styles.hint}>Fotos ficam no armazenamento do aplicativo e serão incluídas no PDF e no backup.</Text>
              <View style={{height:14}}/>
              <Action disabled={busy || (completionResult === 'partial' &&
                  (completionNotes.trim().length < 10 || completionNotes.trim().length > 1000))}
                label={busy ? 'Registrando...' : completionResult === 'partial' ? 'Registrar parcial (manter OS aberta)' : 'Confirmar conclusão'}
                onPress={() => { void handle(() => completeOrder(completingOrder, completionNotes, draftPhotos, completionResult)); }}/>
            </>}
            <View style={{height: 30}}/>
          </ScrollView>}
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: COLORS.bg,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) : 0},
  topbar: {paddingHorizontal: 18, paddingTop: 12, paddingBottom: 13, flexDirection: 'row', alignItems: 'center', gap: 11,
    borderBottomWidth: 1, borderBottomColor: COLORS.border},
  logo: {width: 39, height: 39, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.panel2},
  brand: {fontSize: 19, fontWeight: '900', color: COLORS.text},
  brandSub: {fontSize: 10, fontWeight: '700', color: COLORS.muted, letterSpacing: 0.4,marginTop:2},
  localStatus:{flexDirection:'row',alignItems:'center',gap:6,paddingHorizontal:10,
    paddingVertical:7,backgroundColor:COLORS.panel,borderRadius:999},
  localDot:{width:7,height:7,backgroundColor:COLORS.green,borderRadius:7},
  localText:{fontSize:11,color:COLORS.muted,fontWeight:'700'},
  scroll: {padding: 17, paddingBottom: 45},
  hero: {backgroundColor: COLORS.panel2, padding: 19, borderRadius: 18, borderWidth: 1, borderColor: COLORS.border},
  heroEyebrow: {color: COLORS.accent, fontSize: 10, fontWeight: '800', letterSpacing: 1},
  heroTitle: {color: COLORS.text, fontWeight: '800', fontSize: 23, marginTop: 9},
  heroSub: {color: COLORS.muted, fontSize: 13, lineHeight: 20, marginTop: 6},
  metrics: {flexDirection: 'row', marginTop: 18, gap: 8},
  metric: {flex: 1, backgroundColor: COLORS.bg, padding: 10, borderRadius: 11},
  metricValue: {fontWeight: '900', fontSize: 25},
  metricLabel: {color: COLORS.muted, fontSize: 11},
  quickActions: {flexDirection: 'row', gap: 8, marginTop: 16},
  button: {backgroundColor: COLORS.accent, borderRadius: INTERACTION.smallRadius,
    paddingVertical: 10, paddingHorizontal: 13,
    alignItems: 'center', justifyContent: 'center', minHeight: INTERACTION.minTouch},
  secondaryButton: {backgroundColor: COLORS.panel2, borderColor: COLORS.border, borderWidth: 1},
  buttonText: {color: COLORS.bg, fontWeight: '800', fontSize: 12},
  sectionTitle: {color: COLORS.text, fontSize: 20, fontWeight: '900'},
  card: {padding: 16, backgroundColor: COLORS.panel, borderRadius: INTERACTION.radius, marginTop: 11, borderWidth: 1,
    borderColor: COLORS.border},
  cardTitle: {fontSize: 15, fontWeight: '800', color: COLORS.text, lineHeight: 21},
  detail: {fontSize: 12, color: COLORS.muted, marginTop: 5},
  description: {fontSize: 13, color: COLORS.muted, lineHeight: 20, marginTop: 11},
  chips: {flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 15},
  pill: {borderRadius: 6, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 5, alignSelf: 'flex-start'},
  cardActions: {flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 7, marginTop: 16},
  pageHeading: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8},
  empty: {padding: 17, marginTop: 10, color: COLORS.muted, borderWidth: 1, borderStyle: 'dashed',
    borderColor: COLORS.border, borderRadius: 12},
  hint: {fontSize: 11, color: COLORS.muted, lineHeight: 16, marginTop: 13},
  nav: {flexDirection:'row',borderTopWidth:1,borderTopColor:COLORS.border,
    paddingTop:7,paddingBottom:10,backgroundColor:COLORS.panel},
  navItem: {flex:1,alignItems:'center',paddingTop:2,minHeight:58,justifyContent:'center',gap:2},
  navIconBox:{minWidth:48,minHeight:31,borderRadius:14,alignItems:'center',justifyContent:'center'},
  navIconActive:{backgroundColor:COLORS.accent+'20'},
  navIcon: {fontSize:21,color:COLORS.muted,fontWeight:'700'},
  navLabel: {fontSize:11,color:COLORS.muted,fontWeight:'700'},
  modalBackdrop: {flex: 1, justifyContent: 'flex-end', backgroundColor: '#02060EBB'},
  modalCard: {padding: 20, paddingTop: 19, backgroundColor: COLORS.panel, borderTopLeftRadius: 24,
    borderTopRightRadius: 24, height: '92%', width: '100%', maxHeight: '93%', borderWidth: 1, borderColor: COLORS.border},
  modalHeader: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 21},
  fieldLabel: {color: COLORS.text, fontSize: 12, fontWeight: '700', marginBottom: 8},
  dateField: {backgroundColor: COLORS.bg, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 10, minHeight: 55, paddingHorizontal: 13, alignItems: 'center',
    flexDirection: 'row', justifyContent: 'space-between', marginBottom: 18},
  dateFieldText: {color: COLORS.text, fontSize: 16, fontWeight: '700'},
  dateFieldHint: {color: COLORS.accent, fontSize: 12, fontWeight: '700'},
  field: {borderWidth: 1, borderColor: COLORS.border, borderRadius: 10,
    backgroundColor: COLORS.bg, paddingHorizontal: 13, paddingVertical: 11, color: COLORS.text, fontSize: 14},
  choice: {borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, paddingVertical: 9, paddingHorizontal: 12},
  choiceActive: {backgroundColor: COLORS.accent, borderColor: COLORS.accent},
  photoRow: {flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginTop: 12},
  thumb: {width: 76, height: 76, borderRadius: 9, backgroundColor: COLORS.panel2},
  blockAlert: {padding: 12, backgroundColor: '#42351E', borderRadius: 10, marginTop: 12, borderWidth: 1, borderColor: '#8D7040'},
  searchField: {borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, padding: 14,
    minHeight:48,color:COLORS.text, backgroundColor: COLORS.panel2, marginTop:14,fontSize:15},
  filters: {flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 12, marginBottom: 8},
  eventRow: {padding: 12, borderBottomWidth: 1, borderColor: COLORS.border},
  executionChoices:{flexDirection:'row',gap:10,marginTop:8,marginBottom:16},
  executionChoice:{flex:1,minHeight:94,borderRadius:14,borderWidth:1,
    borderColor:COLORS.border,backgroundColor:COLORS.panel2,padding:12,
    justifyContent:'center',alignItems:'center',gap:9},
  executionDone:{backgroundColor:COLORS.green+'17',borderColor:COLORS.green+'99'},
  executionPartial:{backgroundColor:COLORS.yellow+'17',borderColor:COLORS.yellow+'99'},
  executionChoiceIcon:{fontWeight:'900',fontSize:27},
  executionChoiceText:{color:COLORS.text,fontWeight:'800',fontSize:14},
  notesToggle:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',
    minHeight:48,paddingHorizontal:12,paddingVertical:8,borderColor:COLORS.border,
    borderWidth:1,borderRadius:11,backgroundColor:COLORS.panel2,marginBottom:8},
  notesToggleText:{fontSize:13,color:COLORS.accent,fontWeight:'800'},
});
