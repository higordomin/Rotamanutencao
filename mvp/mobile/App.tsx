import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, Pressable,
  SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TextInput, View,
} from 'react-native';
import {
  initializeDatabase, listAssets, listExecutions, listOrders, localDate,
  completeOrder, removeAsset, removeOrder, saveAsset, saveOrder, validDate,
} from './src/db';
import type {Asset, AssetDraft, Category, Execution, OrderDraft, Priority, WorkOrder} from './src/types';

const COLORS = {
  bg: '#08101E', panel: '#111E31', panel2: '#16273D', border: '#24394F',
  text: '#EFF6FF', muted: '#9CB0C8', accent: '#47B7F6', green: '#5DD7AC',
  red: '#FF7D8B', yellow: '#FFD075',
};
type Tab = 'Início' | 'Atividades' | 'Ativos' | 'Histórico';
type ModalType = 'asset' | 'order' | 'complete' | null;
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

function FormField({label, value, onChangeText, placeholder, multiline = false, keyboardType}: {
  label: string; value: string; onChangeText: (v: string) => void; placeholder?: string;
  multiline?: boolean; keyboardType?: 'default' | 'numeric';
}) {
  return <View style={{marginBottom: 16}}>
    <Text style={styles.fieldLabel}>{label}</Text>
    <TextInput accessibilityLabel={label} placeholder={placeholder}
      placeholderTextColor={COLORS.muted} selectionColor={COLORS.accent}
      multiline={multiline} keyboardType={keyboardType} value={value} onChangeText={onChangeText}
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
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dialog, setDialog] = useState<ModalType>(null);
  const [assetDraft, setAssetDraft] = useState<AssetDraft>(initialAsset());
  const [orderDraft, setOrderDraft] = useState<OrderDraft>(initialOrder());
  const [recurrenceInput, setRecurrenceInput] = useState('30');
  const [editingAsset, setEditingAsset] = useState<string | undefined>();
  const [editingOrder, setEditingOrder] = useState<string | undefined>();
  const [completingOrder, setCompletingOrder] = useState<WorkOrder | null>(null);
  const [completionNotes, setCompletionNotes] = useState('');

  const refresh = useCallback(async () => {
    const [a, o, e] = await Promise.all([listAssets(), listOrders(), listExecutions()]);
    setAssets(a); setOrders(o); setExecutions(e);
  }, []);

  useEffect(() => {
    (async () => {
      try { await initializeDatabase(); await refresh(); }
      catch (e) { Alert.alert('Erro no banco de dados', String(e)); }
      finally { setReady(true); }
    })();
  }, [refresh]);

  const today = localDate();
  const pending = useMemo(() => orders.filter(o => o.status === 'pending'), [orders]);
  const overdue = pending.filter(o => o.due_date < today);
  const todayTasks = pending.filter(o => o.due_date === today);
  const upcoming = pending.filter(o => o.due_date > today);

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
    setDialog('complete');
  };
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
    const overdueOrder = order.status === 'pending' && order.due_date < today;
    const done = order.status === 'completed';
    return <View key={order.id} style={styles.card}>
      <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10}}>
        <View style={{flex: 1}}>
          <Text style={styles.cardTitle}>{order.title}</Text>
          <Text style={styles.detail}>{order.asset_name || 'Sem equipamento'} · {order.category}</Text>
        </View>
        <Pill text={done ? 'Concluída' : overdueOrder ? 'Atrasada' : order.due_date === today ? 'Hoje' : 'Programada'}
          tone={done ? 'green' : overdueOrder ? 'red' : order.due_date === today ? 'yellow' : 'blue'}/>
      </View>
      {!!order.description && <Text style={styles.description}>{order.description}</Text>}
      <View style={styles.chips}>
        <Pill text={`📅 ${order.due_date}`}/>
        <Pill text={order.recurrence_days === 0 ? 'Avulsa' : `A cada ${order.recurrence_days} dias`}/>
        <Pill text={`Prioridade ${order.priority}`} tone={order.priority === 'Alta' ? 'red' : 'blue'}/>
      </View>
      <View style={styles.cardActions}>
        {!done && <Action label="✓ Executar" onPress={() => openComplete(order)}/>}
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
    {items.length === 0 ? <Text style={styles.empty}>{empty}</Text> : items.map(orderCard)}
  </View>;

  const content = () => {
    if (tab === 'Início') return <>
      <View style={styles.hero}>
        <Text style={styles.heroEyebrow}>RESUMO DA SUA MANUTENÇÃO</Text>
        <Text style={styles.heroTitle}>Sua rotina, sob controle.</Text>
        <Text style={styles.heroSub}>Rotas e serviços organizados, mesmo sem internet.</Text>
        <View style={styles.metrics}>
          <View style={styles.metric}><Text style={[styles.metricValue, {color: COLORS.red}]}>{overdue.length}</Text><Text style={styles.metricLabel}>Atrasadas</Text></View>
          <View style={styles.metric}><Text style={[styles.metricValue, {color: COLORS.yellow}]}>{todayTasks.length}</Text><Text style={styles.metricLabel}>Hoje</Text></View>
          <View style={styles.metric}><Text style={[styles.metricValue, {color: COLORS.green}]}>{executions.length}</Text><Text style={styles.metricLabel}>Execuções*</Text></View>
        </View>
      </View>
      <View style={styles.quickActions}>
        <Action label="+ Nova atividade" onPress={() => openOrder()}/>
        <Action label="+ Equipamento" secondary onPress={() => openAsset()}/>
      </View>
      {section('Atrasadas', overdue, 'Nenhuma atividade atrasada.')}
      {section('Para hoje', todayTasks, 'Nenhuma atividade programada para hoje.')}
      {section('Próximas', upcoming.slice(0, 5), 'Sem atividades futuras.')}
      <Text style={styles.hint}>* Mostradas até as 500 execuções mais recentes.</Text>
    </>;
    if (tab === 'Atividades') return <>
      <View style={styles.pageHeading}><View><Text style={styles.sectionTitle}>Rotas e atividades</Text><Text style={styles.detail}>{orders.length} cadastradas</Text></View>
        <Action label="+ Nova" onPress={() => openOrder()}/></View>
      {orders.length === 0 ? <Text style={styles.empty}>Crie uma atividade para iniciar sua rota.</Text> : orders.map(orderCard)}
    </>;
    if (tab === 'Ativos') return <>
      <View style={styles.pageHeading}><View><Text style={styles.sectionTitle}>Equipamentos</Text><Text style={styles.detail}>{assets.length} cadastrados</Text></View>
        <Action label="+ Novo" onPress={() => openAsset()}/></View>
      {assets.length === 0 ? <Text style={styles.empty}>Cadastre seu primeiro equipamento.</Text> : assets.map(assetCard)}
    </>;
    return <>
      <Text style={styles.sectionTitle}>Histórico de execuções</Text>
      <Text style={[styles.detail, {marginBottom: 16}]}>Cada execução fica registrada no aparelho.</Text>
      {executions.length === 0 ? <Text style={styles.empty}>Nenhum serviço executado ainda.</Text>
        : executions.map(execution => <View key={execution.id} style={styles.card}>
          <View style={{flexDirection: 'row', justifyContent: 'space-between', gap: 12}}>
            <Text style={[styles.cardTitle, {flex: 1}]}>{execution.order_title}</Text>
            <Pill text="Executada" tone="green"/>
          </View>
          <Text style={styles.detail}>{new Date(execution.executed_at).toLocaleString('pt-BR')}</Text>
          {!!execution.notes && <Text style={styles.description}>{execution.notes}</Text>}
          <Text style={styles.description}>Prazo anterior: {execution.previous_due_date}</Text>
          {!!execution.next_due_date && <Text style={styles.detail}>Próxima execução: {execution.next_due_date}</Text>}
        </View>)}
    </>;
  };

  return <SafeAreaView style={styles.safe}>
    <StatusBar barStyle="light-content" backgroundColor={COLORS.bg}/>
    <View style={styles.topbar}>
      <View style={styles.logo}><Text style={{fontWeight: '900', color: COLORS.bg, fontSize: 20}}>R</Text></View>
      <View style={{flex: 1}}><Text style={styles.brand}>Rota<Text style={{color: COLORS.accent}}>Manutenção</Text></Text>
        <Text style={styles.brandSub}>MVP OFFLINE · USO INDIVIDUAL</Text></View>
      <Pill text="● Local" tone="green"/>
    </View>
    {!ready ? <View style={[styles.safe, {justifyContent: 'center'}]}><ActivityIndicator color={COLORS.accent} size="large"/></View>
      : <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">{content()}</ScrollView>}
    <View style={styles.nav}>
      {([{label: 'Início', icon: '⌂'}, {label: 'Atividades', icon: '☑'},
        {label: 'Ativos', icon: '⚙'}, {label: 'Histórico', icon: '◷'}] as const).map(item =>
        <Pressable key={item.label} accessibilityRole="tab" accessibilityState={{selected: tab === item.label}}
          onPress={() => setTab(item.label)} style={styles.navItem}>
          <Text style={[styles.navIcon, tab === item.label && {color: COLORS.accent}]}>{item.icon}</Text>
          <Text style={[styles.navLabel, tab === item.label && {color: COLORS.accent}]}>{item.label}</Text>
        </Pressable>)}
    </View>
    <Modal animationType="slide" visible={dialog !== null} transparent onRequestClose={() => setDialog(null)}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalBackdrop}>
        <SafeAreaView style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.sectionTitle}>{dialog === 'asset' ? (editingAsset ? 'Editar equipamento' : 'Novo equipamento')
              : dialog === 'order' ? (editingOrder ? 'Editar atividade' : 'Nova atividade') : 'Registrar execução'}</Text>
            <Pressable onPress={() => setDialog(null)}><Text style={{color: COLORS.muted, fontSize: 24}}>×</Text></Pressable>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" style={{maxHeight: '85%'}}>
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
              <FormField label="Data programada * (AAAA-MM-DD)" placeholder="2026-10-20"
                value={orderDraft.due_date} onChangeText={v => setOrderDraft({...orderDraft, due_date: v})}/>
              {!validDate(orderDraft.due_date) && <Text style={{color: COLORS.red, marginBottom: 14}}>Digite uma data válida.</Text>}
              <FormField label="Repetir a cada quantos dias? (0 = avulsa)" keyboardType="numeric"
                value={recurrenceInput} onChangeText={setRecurrenceInput}/>
              <Text style={[styles.hint, {marginBottom: 15}]}>Ao executar uma atividade recorrente, a próxima data será calculada a partir do dia da execução.</Text>
              <Action disabled={busy || !validDate(orderDraft.due_date) || !/^\d+$/.test(recurrenceInput)} label={busy ? 'Salvando...' : 'Salvar atividade'}
                onPress={() => { void handle(() => saveOrder({...orderDraft, recurrence_days: Number(recurrenceInput)}, editingOrder)); }}/>
            </>}
            {dialog === 'complete' && completingOrder && <>
              <Text style={[styles.cardTitle, {marginBottom: 8}]}>{completingOrder.title}</Text>
              <Text style={[styles.detail, {marginBottom: 20}]}>
                {completingOrder.recurrence_days ? `Reagendamento automático a cada ${completingOrder.recurrence_days} dias` : 'Atividade avulsa: será concluída'}
              </Text>
              <FormField label="O que foi realizado?" placeholder="Descreva o serviço executado e anomalias encontradas..."
                multiline value={completionNotes} onChangeText={setCompletionNotes}/>
              <Action disabled={busy} label={busy ? 'Registrando...' : 'Confirmar execução'}
                onPress={() => { void handle(() => completeOrder(completingOrder, completionNotes)); }}/>
            </>}
            <View style={{height: 30}}/>
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: COLORS.bg},
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
  navItem: {flex: 1, alignItems: 'center', paddingTop: 8},
  navIcon: {fontSize: 21, color: COLORS.muted},
  navLabel: {fontSize: 10, color: COLORS.muted, fontWeight: '700', marginTop: 2},
  modalBackdrop: {flex: 1, justifyContent: 'flex-end', backgroundColor: '#02060EBB'},
  modalCard: {padding: 20, paddingTop: 19, backgroundColor: COLORS.panel, borderTopLeftRadius: 24,
    borderTopRightRadius: 24, maxHeight: '93%', borderWidth: 1, borderColor: COLORS.border},
  modalHeader: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 21},
  fieldLabel: {color: COLORS.text, fontSize: 12, fontWeight: '700', marginBottom: 8},
  field: {borderWidth: 1, borderColor: COLORS.border, borderRadius: 10,
    backgroundColor: COLORS.bg, paddingHorizontal: 13, paddingVertical: 11, color: COLORS.text, fontSize: 14},
  choice: {borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, paddingVertical: 9, paddingHorizontal: 12},
  choiceActive: {backgroundColor: COLORS.accent, borderColor: COLORS.accent},
});
