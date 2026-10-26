import React from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import {INDUSTRIAL as C,INTERACTION,SPACING,TYPE,RADII} from './design31';
import {FIRST_USE_STEPS} from './firstUse34';

/** Guia breve e contextual; nunca cria exemplos dentro da base local. */
export function FirstUseGuide({onNewAsset,onNewOrder,onOpenAgenda}:{
  onNewAsset:()=>void;onNewOrder:()=>void;onOpenAgenda:()=>void;
}){
  return <View style={s.page}>
    <Text style={s.eyebrow}>BEM-VINDO AO ROTAMANUTENÇÃO</Text>
    <Text accessibilityRole="header" style={s.heading}>Sua manutenção, organizada.</Text>
    <Text style={s.subtitle}>
      Tudo funciona sem internet e sem cadastro de usuário. Comece por uma atividade ou adicione um equipamento.
    </Text>
    <View style={s.steps}>
      {FIRST_USE_STEPS.map(step=><View key={step.number} style={s.step}>
        <View style={s.numberBox}><Text style={s.number}>{step.number}</Text></View>
        <View style={{flex:1,gap:4}}>
          <Text style={s.stepTitle}>{step.title}</Text>
          <Text style={s.stepDesc}>{step.description}</Text>
        </View>
      </View>)}
    </View>
    <Pressable accessibilityRole="button" onPress={onNewOrder} style={s.primary}>
      <Text style={s.primaryText}>＋ Criar primeira OS</Text>
      <Text style={s.primaryText}>→</Text>
    </Pressable>
    <Pressable accessibilityRole="button" onPress={onNewAsset} style={s.secondary}>
      <Text style={s.secondaryText}>⚙ Cadastrar equipamento</Text>
    </Pressable>
    <Pressable accessibilityRole="button" onPress={onOpenAgenda} style={s.agendaLink}>
      <Text style={s.agendaLinkText}>Conhecer a agenda  ›</Text>
    </Pressable>
    <View style={s.privacy}>
      <Text style={s.privacyTitle}>● Seus dados ficam no aparelho</Text>
      <Text style={s.privacyDesc}>
        Depois de registrar os primeiros serviços, faça backups pela área Mais → Relatórios e dados → Backup e dados.
      </Text>
    </View>
  </View>;
}
const s=StyleSheet.create({
  page:{gap:13,paddingBottom:24,paddingTop:8},
  eyebrow:{fontSize:11,color:C.accent,fontWeight:'900',letterSpacing:1},
  heading:{fontSize:TYPE.hero,lineHeight:33,fontWeight:'900',color:C.ink},
  subtitle:{fontSize:TYPE.body,lineHeight:22,color:C.muted,marginBottom:3},
  steps:{gap:1,backgroundColor:C.surface,borderWidth:1,borderColor:C.border,
    borderRadius:RADII.card,paddingHorizontal:15,paddingVertical:7},
  step:{flexDirection:'row',gap:12,alignItems:'center',paddingVertical:13,
    borderBottomColor:C.border,borderBottomWidth:.5},
  numberBox:{width:34,height:34,borderRadius:10,backgroundColor:C.elevated,
    alignItems:'center',justifyContent:'center'},
  number:{color:C.accent,fontSize:17,fontWeight:'900'},
  stepTitle:{fontSize:TYPE.body,fontWeight:'800',color:C.ink},
  stepDesc:{fontSize:TYPE.caption,lineHeight:19,color:C.muted},
  primary:{minHeight:INTERACTION.minTouch+4,borderRadius:RADII.field,backgroundColor:C.accent,
    paddingHorizontal:16,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},
  primaryText:{fontSize:15,fontWeight:'900',color:C.background},
  secondary:{minHeight:INTERACTION.minTouch,borderRadius:12,backgroundColor:C.elevated,
    borderWidth:1,borderColor:C.border,alignItems:'center',justifyContent:'center'},
  secondaryText:{fontSize:14,fontWeight:'800',color:C.ink},
  agendaLink:{alignItems:'center',justifyContent:'center',minHeight:INTERACTION.minTouch},
  agendaLinkText:{color:C.accent,fontSize:13,fontWeight:'800'},
  privacy:{gap:6,backgroundColor:C.surface,borderRadius:13,padding:14,marginTop:4},
  privacyTitle:{color:C.success,fontWeight:'800',fontSize:12},
  privacyDesc:{fontSize:12,color:C.muted,lineHeight:18},
});
