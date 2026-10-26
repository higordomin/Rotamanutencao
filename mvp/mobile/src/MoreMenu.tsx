import React from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import {INDUSTRIAL as C,SPACING,TYPE,RADII} from './design31';
import {moreDestinations,type AppTab} from './navigation31';

/** Páginas secundárias continuam intactas e são abertas por este menu. */
export function MoreMenu({onOpen}:{onOpen:(tab:AppTab)=>void}){
  return <View style={s.page}>
    <Text style={s.eyebrow}>FERRAMENTAS</Text>
    <Text accessibilityRole="header" style={s.heading}>Mais opções</Text>
    <Text style={s.help}>Equipamentos, histórico e informações do aplicativo em um só lugar.</Text>
    <View style={s.group}>
      {moreDestinations.map((destination,index)=><Pressable
        key={destination.label} accessibilityRole="button"
        accessibilityLabel={destination.title}
        accessibilityHint={destination.subtitle}
        onPress={()=>onOpen(destination.label)}
        style={[s.link,index===0&&s.first,index===moreDestinations.length-1&&s.last]}>
        <View style={s.iconBox}><Text style={s.icon}>{destination.icon}</Text></View>
        <View style={s.textGroup}>
          <Text style={s.name}>{destination.title}</Text>
          <Text style={s.desc}>{destination.subtitle}</Text>
        </View>
        <Text style={s.arrow}>›</Text>
      </Pressable>)}
    </View>
    <View style={s.offline}>
      <Text style={s.offlineTitle}>● Seus dados continuam no aparelho</Text>
      <Text style={s.offlineDescription}>
        Nenhuma conta ou conexão necessária. Salve regularmente um backup externo na área Relatórios e dados.
      </Text>
    </View>
  </View>;
}
const s=StyleSheet.create({
  page:{paddingTop:8,gap:9,paddingBottom:24},
  eyebrow:{fontSize:11,fontWeight:'800',letterSpacing:1.5,color:C.accent},
  heading:{fontSize:TYPE.hero,fontWeight:'900',color:C.ink},
  help:{fontSize:TYPE.body,color:C.muted,lineHeight:21,marginBottom:SPACING.group},
  group:{borderWidth:1,borderColor:C.border,borderRadius:RADII.card,overflow:'hidden'},
  link:{minHeight:88,backgroundColor:C.surface,padding:SPACING.group,flexDirection:'row',
    gap:13,alignItems:'center',borderTopWidth:1,borderTopColor:C.border},
  first:{borderTopWidth:0},last:{borderBottomWidth:0},
  iconBox:{width:44,height:44,backgroundColor:C.elevated,borderRadius:13,
    justifyContent:'center',alignItems:'center'},
  icon:{fontSize:23,color:C.accent},
  textGroup:{flex:1,gap:4},name:{fontSize:16,color:C.ink,fontWeight:'800'},
  desc:{fontSize:TYPE.caption,color:C.muted,lineHeight:19},
  arrow:{fontSize:27,color:C.accent},
  offline:{marginTop:15,padding:15,borderRadius:14,backgroundColor:C.surface,
    borderWidth:1,borderColor:C.border,gap:6},
  offlineTitle:{color:C.success,fontSize:13,fontWeight:'800'},
  offlineDescription:{color:C.muted,fontSize:12,lineHeight:19},
});
