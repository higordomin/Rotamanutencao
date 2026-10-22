import React,{useMemo} from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import {brazilianDate} from './calendar';
import {localDate} from './logic';
import {buildHomeOverview,homeEntryStatus} from './homeOverview';
import type {WorkOrder} from './types';
import type {Route} from './routes';

/** Painel compacto: contexto, três métricas exclusivas, até três ações e dois atalhos. */
export function HomeScreen({orders,routes,onOpenAgenda,onNewOrder,onOpenRoute,onOpenOrder}:{
  orders:WorkOrder[];routes:Route[];
  onOpenAgenda:()=>void;onNewOrder:()=>void;
  onOpenRoute:(id:string)=>void;onOpenOrder:(id:string)=>void;
}){
  const today=localDate();
  const overview=useMemo(()=>buildHomeOverview(orders,routes,today,3),[orders,routes,today]);
  const hasAlerts=overview.attention>0;
  return <View style={styles.page}>
    <View style={styles.head}>
      <Text style={styles.eyebrow}>PAINEL DO DIA · {brazilianDate(today)}</Text>
      <Text style={styles.heading}>{hasAlerts?'Sua próxima prioridade':'Sua manutenção, em dia'}</Text>
      <Text style={styles.muted}>{hasAlerts
        ? 'Comece pelo que precisa de atenção. O restante está na Agenda.'
        : 'Consulte rapidamente o que está programado para você.'}</Text>
    </View>

    <View style={styles.stats}>
      <Pressable accessibilityRole="button" accessibilityLabel={`Abrir agenda, ${overview.attention} pontos de atenção`}
        onPress={onOpenAgenda} style={styles.stat}>
        <Text style={[styles.statNumber,{color:hasAlerts?'#FFD075':'#5DD7AC'}]}>{overview.attention}</Text>
        <Text style={styles.statLabel}>Atenção</Text>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={`Abrir agenda, ${overview.today} serviços para hoje sem alerta`}
        onPress={onOpenAgenda} style={styles.stat}>
        <Text style={styles.statNumber}>{overview.today}</Text>
        <Text style={styles.statLabel}>Hoje</Text>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={`Abrir agenda, ${overview.upcoming} serviços nos próximos sete dias`}
        onPress={onOpenAgenda} style={styles.stat}>
        <Text style={styles.statNumber}>{overview.upcoming}</Text>
        <Text style={styles.statLabel}>Próx. 7 dias</Text>
      </Pressable>
    </View>
    <Text style={styles.caption}>Cada OS ou rota é contada uma só vez. Atenção inclui atrasos, impedimentos e anomalias.</Text>

    <View style={styles.listHead}>
      <Text style={styles.sectionTitle}>Próximas ações</Text>
      <Pressable accessibilityRole="button" onPress={onOpenAgenda}>
        <Text style={styles.link}>Ver tudo na Agenda ›</Text>
      </Pressable>
    </View>
    {overview.entries.length===0?<View style={styles.empty}>
      <Text style={styles.emptyTitle}>Nenhuma ação urgente ou prevista para esta semana.</Text>
      <Text style={styles.muted}>Para outros períodos ou rotas avulsas, consulte a Agenda e a aba Rotas.</Text>
    </View>:overview.entries.map(entry=><Pressable key={entry.kind+':'+entry.id}
      accessibilityRole="button" accessibilityLabel={`Abrir ${entry.kind==='route'?'rota':'OS'}: ${entry.title}`}
      onPress={()=>entry.kind==='route'?onOpenRoute(entry.id):onOpenOrder(entry.id)}
      style={styles.item}>
      <View style={{flex:1,gap:3}}>
        <View style={styles.itemLine}>
          <Text style={[styles.status,{color:entry.overdue?'#FF7D8B':entry.attention||entry.blocked?'#FFD075':'#5DD7AC'}]}>
            {homeEntryStatus(entry)}
          </Text>
          <Text style={styles.kind}>{entry.kind==='route'?'ROTA':'OS'}</Text>
        </View>
        <Text numberOfLines={2} style={styles.itemTitle}>{entry.title}</Text>
        <Text numberOfLines={1} style={styles.itemMeta}>
          {entry.area}{entry.dueDate?' · '+brazilianDate(entry.dueDate):''}
        </Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </Pressable>)}
    {overview.totalRelevant>overview.entries.length&&<Text style={styles.caption}>
      Outras {overview.totalRelevant-overview.entries.length} atividade(s) estão disponíveis na Agenda.
    </Text>}

    <View style={styles.buttons}>
      <Pressable accessibilityRole="button" onPress={onOpenAgenda} style={styles.primary}>
        <Text style={styles.primaryText}>Abrir agenda</Text>
      </Pressable>
      <Pressable accessibilityRole="button" onPress={onNewOrder} style={styles.secondary}>
        <Text style={styles.secondaryText}>+ Nova OS</Text>
      </Pressable>
    </View>
  </View>;
}

const styles=StyleSheet.create({
  page:{gap:11,paddingBottom:14},
  head:{paddingTop:7,gap:7},
  eyebrow:{color:'#47B7F6',fontWeight:'800',fontSize:10,letterSpacing:.7},
  heading:{color:'#EFF6FF',fontWeight:'900',fontSize:21},
  muted:{color:'#9CB0C8',fontSize:12,lineHeight:18},
  stats:{flexDirection:'row',gap:8,marginTop:6},
  stat:{flex:1,paddingVertical:15,paddingHorizontal:8,backgroundColor:'#111E31',
    borderWidth:1,borderColor:'#24394F',borderRadius:12,alignItems:'center',gap:4,minHeight:78},
  statNumber:{color:'#47B7F6',fontSize:24,fontWeight:'900'},
  statLabel:{color:'#9CB0C8',fontSize:11,fontWeight:'700',textAlign:'center'},
  caption:{color:'#8398B4',fontSize:10,lineHeight:15},
  listHead:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:8,marginTop:10},
  sectionTitle:{fontSize:15,color:'#EFF6FF',fontWeight:'800'},
  link:{color:'#47B7F6',fontWeight:'800',fontSize:11,paddingVertical:9},
  item:{backgroundColor:'#111E31',borderWidth:1,borderColor:'#24394F',
    borderRadius:11,padding:13,flexDirection:'row',alignItems:'center',gap:10},
  itemLine:{flexDirection:'row',gap:8,alignItems:'center'},
  status:{fontSize:11,fontWeight:'800'},
  kind:{fontSize:10,color:'#9CB0C8',fontWeight:'700'},
  itemTitle:{color:'#EFF6FF',fontWeight:'800',fontSize:14},
  itemMeta:{color:'#9CB0C8',fontSize:11},
  chevron:{fontSize:24,color:'#47B7F6'},
  empty:{padding:15,borderColor:'#24394F',borderWidth:1,borderRadius:11,gap:5},
  emptyTitle:{fontWeight:'800',fontSize:13,color:'#EFF6FF'},
  buttons:{flexDirection:'row',gap:8,marginTop:9},
  primary:{flex:1,minHeight:44,backgroundColor:'#47B7F6',borderRadius:10,
    alignItems:'center',justifyContent:'center',paddingHorizontal:8},
  primaryText:{color:'#08101E',fontSize:13,fontWeight:'900'},
  secondary:{flex:1,minHeight:44,backgroundColor:'#16273D',borderRadius:10,
    borderColor:'#24394F',borderWidth:1,alignItems:'center',justifyContent:'center',paddingHorizontal:8},
  secondaryText:{color:'#EFF6FF',fontSize:13,fontWeight:'800'},
});
