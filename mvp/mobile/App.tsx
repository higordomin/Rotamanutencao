import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  ActivityIndicator, Alert, AppState, Keyboard, KeyboardAvoidingView, Modal, Platform, Pressable,
  SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TextInput, View, Image, FlatList,
} from 'react-native';
import {
  initializeDatabase, listAssets, listExecutions, listOrders, localDate,
  completeOrder, removeAsset, removeOrder, saveAsset, saveOrder, validDate, listAllPhotos,
  setImpediment, releaseImpediment, listRecentEvents,
} from './src/db';
import type {Asset, AssetDraft, Category, Execution, ExecutionPhoto, PhotoDraft, OrderDraft, Priority, WorkOrder, OrderEvent, ExecutionResult} from './src/types';
import {taskState, taskSummary} from './src/logic';
import {evidenceUri, selectPhoto, MAX_PHOTOS_PER_EXECUTION} from './src/evidence';
import {exportExecutionPdf} from './src/report';
import {exportBackup, pickBackupFile, restoreBackup} from './src/backup';
import {inspectBackup} from './src/backupInspection';
import {CalendarPicker} from './src/CalendarPicker';
import {brazilianDate} from './src/calendar';
import {RoutesScreen} from './src/RoutesScreen';
import {ReminderSettings} from './src/ReminderSettings';
import {syncLocalReminders} from './src/localReminders';

const COLORS = {
  bg: '#08101E', panel: '#111E31', panel2: '#16273D', border: '#24394F',
  text: '#EFF6FF', muted: '#9CB0C8', accent: '#47B7F6', green: '#5DD7AC',
  red: '#FF7D8B', yellow: '#FFD075',
};
type Tab = 'Início' | 'Atividades' | 'Rotas' | 'Ativos' | 'Histórico' | 'Dados';
type ModalType = 'asset' | 'order' | 'complete' | 'block' | null;
type OrderFilter = 'Todas' | 'Pendentes' | 'Impedidas' | 'Concluídas';
const categories: Category[] = ['Lubrificação', 'Mecânica', 'Elétrica', 'Inspeção'];
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
  const [tab, setTab] = useState<Tab>('Início');
  const [assets, setAssets] = useState<Asset[]>([]);
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [evidence, setEvidence] = useState<ExecutionPhoto[]>([]);
  const [events, setEvents] = useState<OrderEvent[]>([]);
  const [search, setSearch] = useState('');
  const [orderFilter, setOrderFilter] = useState<OrderFilter>('Todas');
  const [historyPageSize, setHistoryPageSize] = useState(40);
  const [ready, setReady] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dialog, setDialog] = useState<ModalType>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const modalScrollRef = useRef<ScrollView>(null);
  const [assetDraft, setAssetDraft] = useState<AssetDraft>(initialAsset());
  const [orderDraft, setOrderDraft] = useState<OrderDraft>(initialOrder());
  const [recurrenceInput, setRecurrenceInput] = useState('30');
  const [editingAsset, setEditingAsset] = useState<string | undefined>();
  const [editingOrder, setEditingOrder] = useState<string | undefined>();
  const [completingOrder, setCompletingOrder] = useState<WorkOrder | null>(null);
  const [completionNotes, setCompletionNotes] = useState('');
  const [completionResult, setCompletionResult] = useState<ExecutionResult>('completed');
  const [blockReason, setBlockReason] = useState('');
  const [draftPhotos, setDraftPhotos] = useState<PhotoDraft[]>([]);

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
    const [a, o, e, p, ev] = await Promise.all([listAssets(), listOrders(), listExecutions(), listAllPhotos(), listRecentEvents()]);
    setAssets(a); setOrders(o); setExecutions(e); setEvidence(p); setEvents(ev);
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
      if (state === 'active' && ready) void refresh().catch(err => {
        Alert.alert('Erro ao atualizar', String(err));
      });
    });
    return () => subscription.remove();
  }, [ready, refresh]);

  const today = localDate();
  const stateOf = (order: WorkOrder) => taskState(order, today);
  const counts = useMemo(() => taskSummary(orders, today), [orders, today]);
  const overdue = orders.filter(o => stateOf(o) === 'overdue');
  const todayTasks = orders.filter(o => stateOf(o) === 'today');
  const upcoming = orders.filter(o => stateOf(o) === 'upcoming');
  const blocked = orders.filter(o => stateOf(o) === 'blocked');
  const partialOrders = orders.filter(o => o.status === 'pending' && !!o.partial_reason?.trim());
  const partialAvailable = partialOrders.filter(o => stateOf(o) !== 'blocked');
  const evidenceByExecution = useMemo(() => {
    const grouped = new Map<string, ExecutionPhoto[]>();
    for (const photo of evidence) grouped.set(photo.execution_id, [...(grouped.get(photo.execution_id) ?? []), photo]);
    return grouped;
  }, [evidence]);
  const visibleOrders = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('pt-BR');
    return orders.filter(order => {
      const state = taskState(order, today);
      if (orderFilter === 'Pendentes' && ['completed', 'blocked'].includes(state)) return false;
      if (orderFilter === 'Impedidas' && state !== 'blocked') return false;
      if (orderFilter === 'Concluídas' && state !== 'completed') return false;
      return !term || [order.title, order.description, order.asset_name || '', order.asset_code || '', order.asset_area || '', order.category, order.block_reason, order.partial_reason]
        .some(value => value.toLocaleLowerCase('pt-BR').includes(term));
    });
  }, [orders, search, orderFilter, today]);

  const handle = async (action: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    try { await action(); await refresh(); setDialog(null); }
    catch (e) { Alert.alert('Não foi possível concluir', e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  };

  const openAsset = (asset?: Asset) => {
    setEditingAsset(asset?.id);
    setAssetDraft(asset ? {name: asset.name, code: asset.code, area: asset.area} : initialAsset());
    setDialog('asset');
  };
  const openOrder = (order?: WorkOrder) => {
    setCalendarOpen(false);
    setEditingOrder(order?.id);
    setRecurrenceInput(String(order?.recurrence_days ?? 30));
    setOrderDraft(order ? {
      title: order.title, description: order.description, category: order.category,
      priority: order.priority, asset_id: order.asset_id,
      recurrence_days: order.recurrence_days, due_date: order.due_date,
    } : initialOrder());
    setDialog('order');
  };
  const openComplete = (order: WorkOrder) => {
    setCompletingOrder(order);
    setCompletionNotes('');
    setCompletionResult('completed');
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
    if (busy) return;
    setBusy(true);
    try { await action(); }
    catch (e) { Alert.alert('Não foi possível concluir', e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
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

  const confirmDeleteOrder = (order: WorkOrder) => Alert.alert(
    'Excluir atividade?', 'A atividade e todo o seu histórico de execução serão apagados do aparelho.',
    [{text: 'Cancelar', style: 'cancel'}, {text: 'Excluir', style: 'destructive',
      onPress: () => { void handle(() => removeOrder(order.id)); }}],
  );
  const confirmDeleteAsset = (asset: Asset) => Alert.alert(
    'Excluir equipamento?', 'As atividades vinculadas serão mantidas, mas perderão o vínculo com o equipamento.',
    [{text: 'Cancelar', style: 'cancel'}, {text: 'Excluir', style: 'destructive',
      onPress: () => { void handle(() => removeAsset(asset.id)); }}],
  );

  function orderCard(order: WorkOrder) {
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
        <Pill text={done ? 'Concluída' : isBlocked ? 'Impedida' : isPartial ? 'Parcial' : overdueOrder ? 'Atrasada' : order.due_date === today ? 'Hoje' : 'Programada'}
          tone={done ? 'green' : isBlocked || overdueOrder ? 'red' : isPartial || order.due_date === today ? 'yellow' : 'blue'}/>
      </View>
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
        {!done && !isBlocked && <Action label="✓ Executar" onPress={() => openComplete(order)}/>}
        {!done && (isBlocked
          ? <Action label="Liberar" secondary disabled={busy} onPress={() => { void handle(() => releaseImpediment(order.id)); }}/>
          : <Action label="⚠ Impedimento" secondary disabled={busy} onPress={() => openBlock(order)}/>)}
        <Action label="Editar" secondary onPress={() => openOrder(order)}/>
        <Pressable accessibilityRole="button" onPress={() => confirmDeleteOrder(order)} style={{padding: 11}}>
          <Text style={{color: COLORS.red, fontWeight: '700'}}>Excluir</Text>
        </Pressable>
      </View>
    </View>;
  }

  function assetCard(asset: Asset) {
    const count = orders.filter(o => o.asset_id === asset.id).length;
    return <View key={asset.id} style={styles.card}>
      <Text style={styles.cardTitle}>{asset.name}</Text>
      <Text style={styles.detail}>{asset.code || 'Sem código'} · {asset.area || 'Sem área'}</Text>
      <Text style={styles.description}>{count} atividade(s) vinculada(s)</Text>
      <View style={styles.cardActions}>
        <Action label="Editar" secondary onPress={() => openAsset(asset)}/>
        <Pressable accessibilityRole="button" onPress={() => confirmDeleteAsset(asset)} style={{padding: 11}}>
          <Text style={{color: COLORS.red, fontWeight: '700'}}>Excluir</Text>
        </Pressable>
      </View>
    </View>;
  }

  const section = (name: string, items: WorkOrder[], empty: string) => <View style={{marginTop: 21}}>
    <Text style={styles.sectionTitle}>{name} <Text style={{color: COLORS.muted}}>({items.length})</Text></Text>
    {items.length === 0 ? <Text style={styles.empty}>{empty}</Text> : items.slice(0, 8).map(orderCard)}
    {items.length > 8 && <Action secondary label={`Ver outras ${items.length - 8} atividades`} onPress={() => {
      setOrderFilter(name.startsWith('Impedidas') ? 'Impedidas' : 'Pendentes'); setTab('Atividades');
    }}/>}
  </View>;

  const content = () => {
    if (tab === 'Início') return <>
      <View style={styles.hero}>
        <Text style={styles.heroEyebrow}>RESUMO DA SUA MANUTENÇÃO</Text>
        <Text style={styles.heroTitle}>Sua rotina, sob controle.</Text>
        <Text style={styles.heroSub}>Rotas e serviços organizados, mesmo sem internet.</Text>
        {blocked.some(o => o.due_date < today) && <Text style={[styles.detail, {color: COLORS.yellow, marginBottom: 9}]}>
          {blocked.filter(o => o.due_date < today).length} atividade(s) impedida(s) também estão vencidas.
        </Text>}
        <View style={styles.metrics}>
          <View style={styles.metric}><Text style={[styles.metricValue, {color: COLORS.red}]}>{counts.overdue}</Text><Text style={styles.metricLabel}>Atrasadas</Text></View>
          <View style={styles.metric}><Text style={[styles.metricValue, {color: COLORS.yellow}]}>{counts.blocked}</Text><Text style={styles.metricLabel}>Impedidas</Text></View>
          <View style={styles.metric}><Text style={[styles.metricValue, {color: COLORS.green}]}>{counts.today}</Text><Text style={styles.metricLabel}>Hoje</Text></View>
        </View>
      </View>
      {partialOrders.length > 0 && <Text style={[styles.detail, {color: COLORS.yellow, marginTop: 8}]}>
        {partialOrders.length} atividade(s) com execução parcial e pendência registrada.
      </Text>}
      <View style={styles.quickActions}>
        <Action label="+ Nova atividade" onPress={() => openOrder()}/>
        <Action label="+ Equipamento" secondary onPress={() => openAsset()}/>
      </View>
      {section('Impedidas / aguardando liberação', blocked, 'Nenhuma atividade impedida.')}
      {partialAvailable.length > 0 && section('Execuções parciais / pendências', partialAvailable, '')}
      {section('Atrasadas', overdue, 'Nenhuma atividade atrasada.')}
      {section('Para hoje', todayTasks, 'Nenhuma atividade programada para hoje.')}
      {section('Próximas', upcoming.slice(0, 5), 'Sem atividades futuras.')}
      <Text style={styles.hint}>Atividades impedidas continuam registradas e não desaparecem do planejamento. O histórico fica armazenado neste aparelho.</Text>
    </>;
    if (tab === 'Ativos') return <>
      <View style={styles.pageHeading}><View><Text style={styles.sectionTitle}>Equipamentos</Text><Text style={styles.detail}>{assets.length} cadastrados</Text></View>
        <Action label="+ Novo" onPress={() => openAsset()}/></View>
      {assets.length === 0 ? <Text style={styles.empty}>Cadastre seu primeiro equipamento.</Text> : assets.map(assetCard)}
    </>;
    if (tab === 'Dados') return <>
      <Text style={styles.sectionTitle}>Seus dados</Text>
      <ReminderSettings/>
      <Text style={styles.description}>Todas as informações ficam neste aparelho. Não existe login, nuvem nem sincronização nesta versão.</Text>
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
              `Equipamentos: ${summary.assets}\nAtividades: ${summary.orders}\nImpedimentos ativos: ${summary.impediments}\n` +
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
      <Text style={styles.hint}>Formato local versão 7 (restaura também versões 2, 3, 4, 5 e 6) · tamanho máximo de arquivo 60 MB (limite conservador de exportação menor). Arquivos JSON não são criptografados: guarde-os com cuidado.</Text>
    </>;
    return <>
      <Text style={styles.sectionTitle}>Histórico de execuções</Text>
      <Text style={[styles.detail, {marginBottom: 16}]}>Cada execução fica registrada no aparelho.</Text>
      {executions.length === 0 ? <Text style={styles.empty}>Nenhum serviço executado ainda.</Text>
        : executions.slice(0, historyPageSize).map(execution => <View key={execution.id} style={styles.card}>
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
      {executions.length > historyPageSize && <Action secondary label={`Carregar mais registros (${executions.length - historyPageSize} restantes)`} onPress={() => setHistoryPageSize(n => n + 40)}/> }
      {events.length > 0 && <>
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
        <Text style={styles.brandSub}>MVP 0.11.1 · OFFLINE · USO INDIVIDUAL</Text></View>
      <Pill text="● Local" tone="green"/>
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
      : tab === 'Rotas' ? <RoutesScreen assets={assets} onDataChanged={()=>{
          void syncLocalReminders().catch(err=>console.warn('Falha ao atualizar lembretes:',String(err)));
        }}/>
      : tab === 'Atividades' ? <FlatList
          data={visibleOrders}
          keyExtractor={item => item.id}
          renderItem={({item}) => orderCard(item)}
          initialNumToRender={12}
          maxToRenderPerBatch={12}
          windowSize={7}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scroll}
          ListHeaderComponent={<>
            <View style={styles.pageHeading}><View><Text style={styles.sectionTitle}>Rotas e atividades</Text>
              <Text style={styles.detail}>{orders.length} cadastradas</Text></View>
              <Action label="+ Nova" onPress={() => openOrder()}/></View>
            <TextInput accessibilityLabel="Buscar atividades" placeholder="Buscar por TAG, equipamento ou atividade..."
              placeholderTextColor={COLORS.muted} value={search} onChangeText={setSearch} style={styles.searchField}/>
            <View style={styles.filters}>
              {(['Todas', 'Pendentes', 'Impedidas', 'Concluídas'] as const).map(filter =>
                <Pressable key={filter} accessibilityRole="button" accessibilityState={{selected: orderFilter === filter}}
                  onPress={() => setOrderFilter(filter)} style={[styles.choice, orderFilter === filter && styles.choiceActive]}>
                  <Text style={{color: orderFilter === filter ? COLORS.bg : COLORS.text, fontWeight: '700', fontSize: 12}}>{filter}</Text>
                </Pressable>)}
            </View>
          </>}
          ListEmptyComponent={<Text style={styles.empty}>Nenhuma atividade encontrada. Ajuste a busca ou crie uma atividade.</Text>}
        />
      : <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">{content()}</ScrollView>}
    <View style={styles.nav}>
      {([{label: 'Início', icon: '⌂', caption:'Início'}, {label: 'Atividades', icon: '☑', caption:'OS'},
        {label: 'Rotas', icon: '⇢',caption:'Rotas'},
        {label: 'Ativos', icon: '⚙',caption:'Ativos'}, {label: 'Histórico', icon: '◷',caption:'Hist.'}, {label:'Dados',icon:'▣',caption:'Dados'}] as const).map(item =>
        <Pressable key={item.label} accessibilityRole="tab" accessibilityState={{selected: tab === item.label}}
          onPress={() => setTab(item.label)} style={styles.navItem}>
          <Text style={[styles.navIcon, tab === item.label && {color: COLORS.accent}]}>{item.icon}</Text>
          <Text style={[styles.navLabel, tab === item.label && {color: COLORS.accent}]}>{item.caption}</Text>
        </Pressable>)}
    </View>
    <Modal animationType="slide" visible={dialog !== null} transparent onRequestClose={closeDialog}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalBackdrop}>
        <SafeAreaView style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.sectionTitle}>{calendarOpen ? 'Selecionar data' : dialog === 'asset' ? (editingAsset ? 'Editar equipamento' : 'Novo equipamento')
              : dialog === 'order' ? (editingOrder ? 'Editar atividade' : 'Nova atividade')
              : dialog === 'block' ? 'Registrar impedimento' : 'Registrar execução'}</Text>
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
              <FormField label="Atividade *" placeholder="Ex.: Lubrificar mancais" value={orderDraft.title}
                onChangeText={v => setOrderDraft({...orderDraft, title: v})}/>
              <FormField label="Descrição" placeholder="Pontos, graxa, procedimentos..." multiline
                value={orderDraft.description} onChangeText={v => setOrderDraft({...orderDraft, description: v})}/>
              <Choices label="Especialidade" value={orderDraft.category} options={categories}
                onChange={v => setOrderDraft({...orderDraft, category: v})}/>
              <Choices label="Prioridade" value={orderDraft.priority} options={priorities}
                onChange={v => setOrderDraft({...orderDraft, priority: v})}/>
              <Text style={styles.fieldLabel}>Equipamento</Text>
              <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16}}>
                <Pressable onPress={() => setOrderDraft({...orderDraft, asset_id: null})}
                  style={[styles.choice, orderDraft.asset_id === null && styles.choiceActive]}>
                  <Text style={{color: orderDraft.asset_id === null ? COLORS.bg : COLORS.text}}>Nenhum</Text>
                </Pressable>
                {assets.map(a => <Pressable key={a.id} onPress={() => setOrderDraft({...orderDraft, asset_id: a.id})}
                  style={[styles.choice, orderDraft.asset_id === a.id && styles.choiceActive]}>
                  <Text style={{color: orderDraft.asset_id === a.id ? COLORS.bg : COLORS.text}}>{a.name}</Text>
                </Pressable>)}
              </View>
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
              <Text style={styles.fieldLabel}>Resultado do serviço *</Text>
              <View style={[styles.filters, {marginTop: 2, marginBottom: 8}]}>
                <Pressable accessibilityRole="button"
                  accessibilityState={{selected: completionResult === 'completed'}}
                  style={[styles.choice, completionResult === 'completed' && styles.choiceActive]}
                  onPress={() => setCompletionResult('completed')}>
                  <Text style={{color: completionResult === 'completed' ? COLORS.bg : COLORS.text, fontWeight: '800'}}>✓ Concluída</Text>
                </Pressable>
                <Pressable accessibilityRole="button"
                  accessibilityState={{selected: completionResult === 'partial'}}
                  style={[styles.choice, completionResult === 'partial' && styles.choiceActive]}
                  onPress={() => setCompletionResult('partial')}>
                  <Text style={{color: completionResult === 'partial' ? COLORS.bg : COLORS.text, fontWeight: '800'}}>◐ Parcial</Text>
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
              <Text style={styles.fieldLabel}>Anotação rápida (opcional)</Text>
              <View style={styles.filters}>
                {['Executado conforme programação, sem anomalias observadas.',
                  'Executado parcialmente: há pendências a detalhar.',
                  'Anomalia identificada: detalhar causa e ação necessária.'].map(message =>
                  <Pressable key={message} accessibilityRole="button" onPress={() => {
                    if (message.startsWith('Executado parcialmente')) setCompletionResult('partial');
                    setCompletionNotes(prev => prev.trim() ? `${prev.trim()}\n${message}` : message);
                  }}
                    style={styles.choice}><Text style={{fontSize: 12, color: COLORS.text}}>{message}</Text></Pressable>)}
              </View>
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
  topbar: {paddingHorizontal: 18, paddingTop: 16, paddingBottom: 14, flexDirection: 'row', alignItems: 'center', gap: 11,
    borderBottomWidth: 1, borderBottomColor: COLORS.border},
  logo: {width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.accent},
  brand: {fontSize: 18, fontWeight: '800', color: COLORS.text},
  brandSub: {fontSize: 9, fontWeight: '700', color: COLORS.muted, letterSpacing: 0.7},
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
  button: {backgroundColor: COLORS.accent, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 13,
    alignItems: 'center', justifyContent: 'center', minHeight: 40},
  secondaryButton: {backgroundColor: COLORS.panel2, borderColor: COLORS.border, borderWidth: 1},
  buttonText: {color: COLORS.bg, fontWeight: '800', fontSize: 12},
  sectionTitle: {color: COLORS.text, fontSize: 19, fontWeight: '800'},
  card: {padding: 15, backgroundColor: COLORS.panel, borderRadius: 13, marginTop: 11, borderWidth: 1,
    borderColor: COLORS.border},
  cardTitle: {fontSize: 15, fontWeight: '800', color: COLORS.text, lineHeight: 21},
  detail: {fontSize: 12, color: COLORS.muted, marginTop: 5},
  description: {fontSize: 12, color: COLORS.muted, lineHeight: 18, marginTop: 11},
  chips: {flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 15},
  pill: {borderRadius: 6, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 5, alignSelf: 'flex-start'},
  cardActions: {flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 7, marginTop: 16},
  pageHeading: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8},
  empty: {padding: 17, marginTop: 10, color: COLORS.muted, borderWidth: 1, borderStyle: 'dashed',
    borderColor: COLORS.border, borderRadius: 12},
  hint: {fontSize: 11, color: COLORS.muted, lineHeight: 16, marginTop: 13},
  nav: {flexDirection: 'row', borderTopWidth: 1, borderTopColor: COLORS.border, paddingBottom: 9,
    backgroundColor: COLORS.bg},
  navItem: {flex: 1, alignItems: 'center', paddingTop: 8, minHeight: 52, justifyContent: 'center'},
  navIcon: {fontSize: 21, color: COLORS.muted},
  navLabel: {fontSize: 10, color: COLORS.muted, fontWeight: '700', marginTop: 2},
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
  searchField: {borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, padding: 12, color: COLORS.text, backgroundColor: COLORS.panel2, marginTop: 14, fontSize: 14},
  filters: {flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 12, marginBottom: 8},
  eventRow: {padding: 12, borderBottomWidth: 1, borderColor: COLORS.border},
});
