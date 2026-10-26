import React,{useMemo} from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import {brazilianDate} from './calendar';
import {localDate} from './logic';
import {buildHomeOverview,homeEntryStatus} from './homeOverview';
import {INDUSTRIAL as C,INTERACTION} from './design31';
import type {WorkOrder} from './types';
import type {Route} from './routes';

/**
 * Tela de trabalho, não segundo calendário: uma prioridade destacada,
 * no máximo duas próximas ações e um CTA evidente para começar.
 * Todos os contadores vêm da mesma regra de 0.21 (sem duplicar OS/rotas).
 */
export function HomeScreen({orders,routes,onOpenAgenda,onNewOrder,onOpenRoute,onOpenOrder}:{
  orders:WorkOrder[];routes:Route[];
  onOpenAgenda:()=>void;onNewOrder:()=>void;
  onOpenRoute:(id:string)=>void;onOpenOrder:(id:string)=>void;
}){
  const today=localDate();
  const overview=useMemo(()=>buildHomeOverview(orders,routes,today,3),[orders,routes,today]);
  const main=overview.entries[0];
  const remaining=overview.entries.slice(1);
  const open=(entry:typeof main)=>{
    if(!entry)return;
    if(entry.kind==='route')onOpenRoute(entry.id);
    else onOpenOrder(entry.id);
  };
  const tone=(entry:NonNullable<typeof main>)=>entry.overdue?C.danger:
    entry.blocked||entry.attention?C.caution:C.success;
  return <View style={s.page}>
    <View style={s.intro}>
      <Text style={s.eyebrow}>MEU DIA · {brazilianDate(today)}</Text>
      <Text style={s.heading}>O que vamos fazer hoje?</Text>
      <Text style={s.help}>Veja sua prioridade e abra o serviço com um toque.</Text>
    </View>

    <View style={s.metrics}>
      <Pressable accessibilityRole="button" accessibilityLabel={overview.attention+' atividades que precisam de atenção'}
        onPress={onOpenAgenda} style={s.metric}>
        <Text style={[s.metricValue,{color:overview.attention?C.caution:C.success}]}>{overview.attention}</Text>
        <Text style={s.metricName}>Atenção</Text>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={overview.today+' serviços para hoje'}
        onPress={onOpenAgenda} style={s.metric}>
        <Text style={s.metricValue}>{overview.today}</Text>
        <Text style={s.metricName}>Hoje</Text>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={overview.upcoming+' serviços na próxima semana'}
        onPress={onOpenAgenda} style={s.metric}>
        <Text style={s.metricValue}>{overview.upcoming}</Text>
        <Text style={s.metricName}>Próximos</Text>
      </Pressable>
    </View>

    {main?<View style={s.featured}>
      <View style={s.cardTop}>
        <Text style={s.sectionEyebrow}>PRÓXIMA ATIVIDADE</Text>
        <View style={[s.statusPill,{backgroundColor:tone(main)+'1A'}]}>
          <Text style={[s.statusText,{color:tone(main)}]}>{homeEntryStatus(main)}</Text>
        </View>
      </View>
      <Text style={s.featuredTitle}>{main.title}</Text>
      <Text style={s.meta} numberOfLines={2}>
        {main.kind==='route'?'Rota de manutenção':'Ordem de serviço'}
        {main.area?' · '+main.area:''}
        {main.dueDate?' · '+brazilianDate(main.dueDate):''}
      </Text>
      <Pressable accessibilityRole="button"
        accessibilityLabel={'Abrir '+(main.kind==='route'?'rota':'ordem de serviço')+': '+main.title}
        onPress={()=>open(main)} style={s.primary}>
        <Text style={s.primaryText}>Abrir atividade</Text>
        <Text style={s.primaryArrow}>→</Text>
      </Pressable>
    </View>:<View style={s.empty}>
      <Text style={s.emptyHeading}>Tudo organizado por aqui.</Text>
      <Text style={s.help}>Nenhuma atividade urgente ou prevista para os próximos sete dias.</Text>
      <Pressable accessibilityRole="button" onPress={onNewOrder} style={s.primary}>
        <Text style={s.primaryText}>Criar primeira OS</Text>
        <Text style={s.primaryArrow}>＋</Text>
      </Pressable>
    </View>}

    {remaining.length>0&&<View style={s.moreGroup}>
      <View style={s.rowBetween}>
        <Text style={s.sectionTitle}>Depois disso</Text>
        <Pressable accessibilityRole="button" onPress={onOpenAgenda} style={s.inlineLink}>
          <Text style={s.link}>Ver agenda  ›</Text>
        </Pressable>
      </View>
      {remaining.map(entry=><Pressable key={entry.kind+':'+entry.id}
        accessibilityRole="button"
        accessibilityLabel={`Abrir ${entry.kind==='route'?'rota':'OS'} ${entry.title}`}
        onPress={()=>open(entry)} style={s.nextItem}>
        <View style={[s.statusMark,{backgroundColor:tone(entry)}]}/>
        <View style={s.nextBody}>
          <Text style={s.nextTitle} numberOfLines={1}>{entry.title}</Text>
          <Text style={s.nextMeta} numberOfLines={1}>
            {homeEntryStatus(entry)}{entry.dueDate?' · '+brazilianDate(entry.dueDate):''}
          </Text>
        </View>
        <Text style={s.chevron}>›</Text>
      </Pressable>)}
    </View>}

    <View style={s.actions}>
      <Pressable accessibilityRole="button" onPress={onOpenAgenda} style={s.secondary}>
        <Text style={s.secondaryText}>▦  Ver agenda</Text>
      </Pressable>
      <Pressable accessibilityRole="button" onPress={onNewOrder} style={s.secondary}>
        <Text style={s.secondaryText}>＋  Nova OS</Text>
      </Pressable>
    </View>
    {overview.totalRelevant>overview.entries.length&&<Text style={s.footerNote}>
      Outras {overview.totalRelevant-overview.entries.length} atividades estão na Agenda.
    </Text>}
  </View>;
}

const s=StyleSheet.create({
  page:{gap:16,paddingBottom:22},
  intro:{gap:7,paddingTop:6},
  eyebrow:{fontSize:11,color:C.accent,letterSpacing:1,fontWeight:'900'},
  heading:{fontSize:26,lineHeight:32,fontWeight:'900',color:C.ink},
  help:{color:C.muted,fontSize:14,lineHeight:21},
  metrics:{flexDirection:'row',gap:9},
  metric:{flex:1,minHeight:89,backgroundColor:C.surface,borderColor:C.border,
    borderWidth:1,borderRadius:15,alignItems:'center',justifyContent:'center',gap:4,padding:8},
  metricValue:{fontSize:27,fontWeight:'900',color:C.ink},
  metricName:{fontSize:12,fontWeight:'700',color:C.muted},
  featured:{padding:18,borderRadius:18,backgroundColor:C.surface,borderWidth:1,
    borderColor:C.border,gap:10},
  cardTop:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:8},
  sectionEyebrow:{fontSize:10,color:C.accent,fontWeight:'900',letterSpacing:1.1},
  statusPill:{paddingHorizontal:9,paddingVertical:6,borderRadius:8,maxWidth:'55%'},
  statusText:{fontSize:11,fontWeight:'800'},
  featuredTitle:{fontSize:19,lineHeight:26,color:C.ink,fontWeight:'900'},
  meta:{color:C.muted,fontSize:13,lineHeight:19},
  primary:{backgroundColor:C.accent,borderRadius:INTERACTION.smallRadius,
    minHeight:INTERACTION.minTouch,flexDirection:'row',justifyContent:'space-between',
    alignItems:'center',paddingHorizontal:16,marginTop:8},
  primaryText:{color:C.background,fontWeight:'900',fontSize:14},
  primaryArrow:{color:C.background,fontWeight:'900',fontSize:22},
  empty:{padding:18,borderRadius:17,backgroundColor:C.surface,borderWidth:1,
    borderColor:C.border,gap:10},
  emptyHeading:{color:C.success,fontSize:17,fontWeight:'900'},
  moreGroup:{gap:8},
  rowBetween:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},
  sectionTitle:{color:C.ink,fontSize:17,fontWeight:'900'},
  inlineLink:{minHeight:44,justifyContent:'center',paddingHorizontal:8},
  link:{color:C.accent,fontSize:12,fontWeight:'800'},
  nextItem:{minHeight:69,flexDirection:'row',alignItems:'center',padding:13,
    gap:12,backgroundColor:C.surface,borderRadius:13,borderWidth:1,borderColor:C.border},
  statusMark:{width:4,height:35,borderRadius:4},
  nextBody:{flex:1,gap:5},nextTitle:{color:C.ink,fontSize:14,fontWeight:'800'},
  nextMeta:{color:C.muted,fontSize:12},
  chevron:{fontSize:25,color:C.accent},
  actions:{flexDirection:'row',gap:9},
  secondary:{flex:1,minHeight:INTERACTION.minTouch,borderRadius:INTERACTION.smallRadius,
    borderColor:C.border,backgroundColor:C.elevated,borderWidth:1,
    alignItems:'center',justifyContent:'center',padding:10},
  secondaryText:{color:C.ink,fontSize:13,fontWeight:'800'},
  footerNote:{color:C.muted,fontSize:11,lineHeight:17,textAlign:'center'},
});
