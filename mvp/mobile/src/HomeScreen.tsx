import React,{useMemo} from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import {brazilianDate} from './calendar';
import {localDate} from './logic';
import {buildHomeOverview,homeEntryStatus} from './homeOverview';
import {INDUSTRIAL as C,INTERACTION,RADII,SPACING,TYPE} from './design31';
import type {WorkOrder} from './types';

/** Tela inicial com uma tarefa em destaque e um único caminho principal: criar OS. */
export function HomeScreen({orders,onOpenAgenda,onNewOrder,onOpenOrders,onOpenOrder}:{
  orders:WorkOrder[];
  onOpenAgenda:()=>void;onNewOrder:()=>void;onOpenOrders:()=>void;
  onOpenOrder:(id:string)=>void;
}){
  const today=localDate();
  const overview=useMemo(()=>buildHomeOverview(orders,[],today,1),[orders,today]);
  const next=overview.entries[0];
  return <View style={s.page}>
    <View style={s.intro}>
      <Text style={s.eyebrow}>MEU TRABALHO · {brazilianDate(today)}</Text>
      <Text accessibilityRole="header" style={s.heading}>O que você precisa fazer?</Text>
      <Text style={s.help}>Organize suas tarefas sem precisar cadastrar todos os equipamentos.</Text>
    </View>
    <Pressable accessibilityRole="button" accessibilityLabel="Criar ordem de serviço"
      onPress={onNewOrder} style={s.primary}>
      <View style={{flex:1,gap:4}}>
        <Text style={s.primaryTitle}>＋ Criar OS</Text>
        <Text style={s.primarySub}>Anote uma atividade e a data</Text>
      </View>
      <Text style={s.primaryArrow}>›</Text>
    </Pressable>
    <View style={s.summary}>
      <Text style={s.summaryText}>
        {overview.attention>0?`${overview.attention} serviço(s) precisam de atenção`:
          overview.today>0?`${overview.today} serviço(s) para hoje`:
          'Nenhum serviço urgente por enquanto.'}
      </Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Abrir agenda"
        onPress={onOpenAgenda} style={s.summaryLink}>
        <Text style={s.summaryLinkText}>Agenda ›</Text>
      </Pressable>
    </View>
    {next&&<View style={s.nextCard}>
      <Text style={s.eyebrow}>PRÓXIMO SERVIÇO</Text>
      <Text style={s.taskTitle} numberOfLines={2}>{next.title}</Text>
      <Text style={s.taskMeta} numberOfLines={2}>
        {next.area}{next.dueDate?' · '+brazilianDate(next.dueDate):''}
      </Text>
      <Text style={s.taskStatus}>{homeEntryStatus(next)}</Text>
      <Pressable accessibilityRole="button"
        accessibilityLabel={'Abrir ordem de serviço '+next.title}
        onPress={()=>onOpenOrder(next.id)} style={s.openTask}>
        <Text style={s.openTaskText}>Abrir serviço</Text>
        <Text style={s.openTaskText}>›</Text>
      </Pressable>
    </View>}
    <Pressable accessibilityRole="button" onPress={onOpenOrders} style={s.allOrders}>
      <Text style={s.allOrdersText}>Ver todas as minhas OS</Text>
      <Text style={s.allOrdersArrow}>›</Text>
    </Pressable>
  </View>;
}

const s=StyleSheet.create({
  page:{gap:SPACING.lg,paddingBottom:SPACING.xxl,paddingTop:SPACING.sm},
  intro:{gap:7},
  eyebrow:{fontSize:TYPE.caption,fontWeight:'800',color:C.muted,letterSpacing:.5},
  heading:{fontSize:TYPE.hero,fontWeight:'900',color:C.ink},
  help:{fontSize:TYPE.body,color:C.muted,lineHeight:21},
  primary:{flexDirection:'row',alignItems:'center',minHeight:90,padding:SPACING.xl,
    borderRadius:RADII.card,backgroundColor:C.accent,gap:SPACING.md},
  primaryTitle:{fontSize:TYPE.section,fontWeight:'900',color:C.background},
  primarySub:{fontSize:TYPE.caption,color:C.background,lineHeight:18},
  primaryArrow:{fontSize:30,color:C.background,fontWeight:'800'},
  summary:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',
    gap:8,paddingVertical:SPACING.md,borderBottomWidth:1,borderColor:C.border},
  summaryText:{fontSize:TYPE.body,color:C.ink,flex:1,lineHeight:20,fontWeight:'700'},
  summaryLink:{padding:10,minHeight:INTERACTION.minTouch,justifyContent:'center'},
  summaryLinkText:{fontSize:TYPE.caption,color:C.accent,fontWeight:'800'},
  nextCard:{padding:SPACING.lg,backgroundColor:C.surface,borderRadius:RADII.card,
    borderWidth:1,borderColor:C.border,gap:SPACING.sm},
  taskTitle:{color:C.ink,fontSize:TYPE.section,fontWeight:'800'},
  taskMeta:{color:C.muted,fontSize:TYPE.body,lineHeight:20},
  taskStatus:{color:C.caution,fontSize:TYPE.caption,fontWeight:'800'},
  openTask:{minHeight:INTERACTION.minTouch,backgroundColor:C.elevated,
    paddingHorizontal:SPACING.lg,borderRadius:RADII.field,marginTop:SPACING.xs,
    flexDirection:'row',alignItems:'center',justifyContent:'space-between'},
  openTaskText:{color:C.accent,fontSize:TYPE.body,fontWeight:'800'},
  allOrders:{minHeight:INTERACTION.minTouch,flexDirection:'row',
    justifyContent:'space-between',alignItems:'center',paddingHorizontal:SPACING.lg},
  allOrdersText:{color:C.ink,fontSize:TYPE.body,fontWeight:'700'},
  allOrdersArrow:{color:C.accent,fontSize:24},
});
