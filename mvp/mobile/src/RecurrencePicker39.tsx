import React,{useState} from 'react';
import {Keyboard,Pressable,StyleSheet,Text,TextInput,View} from 'react-native';
import {INDUSTRIAL as C,INTERACTION,RADII,SPACING,TYPE} from './design31';
import {
  RECURRENCE_PRESETS,recurrenceSummary,recurrencePreset,validRecurrenceInput,
} from './recurrencePresets39';

/**
 * Seletor compacto: mostra só a frequência escolhida. As nove opções e o
 * intervalo livre só aparecem quando o colaborador pede para alterar.
 * Mantém recurrence_days (sem migração, sem alterar notificações).
 */
export function RecurrencePicker39({value,onChange}:{
  value:string;onChange:(days:string)=>void;
}){
  const [expanded,setExpanded]=useState(false);
  const [customOpen,setCustomOpen]=useState(false);
  const [custom,setCustom]=useState('');
  const selected=validRecurrenceInput(value)?Number(value):null;
  const isCustom=selected!==null&&!recurrencePreset(selected);
  const choose=(days:number)=>{
    onChange(String(days));
    setExpanded(false);
    setCustomOpen(false);
    Keyboard.dismiss();
  };
  const startCustom=()=>{
    setCustom(isCustom?value:'');
    setCustomOpen(true);
  };
  return <View style={s.container}>
    <Text style={s.label}>Repetição da OS</Text>
    <Pressable accessibilityRole="button"
      accessibilityLabel={'Repetição atual: '+recurrenceSummary(value)+'. Alterar'}
      accessibilityState={{expanded}}
      onPress={()=>{Keyboard.dismiss();setExpanded(v=>!v);setCustomOpen(false);}}
      style={s.preview}>
      <View style={{flex:1,gap:4}}>
        <Text style={s.current}>{recurrenceSummary(value)}</Text>
        <Text style={s.help}>Toque para alterar a frequência</Text>
      </View>
      <Text style={s.chevron}>{expanded?'⌃':'⌄'}</Text>
    </Pressable>
    {expanded&&<View style={s.choices}>
      {RECURRENCE_PRESETS.map(option=>
        <Pressable key={option.key} accessibilityRole="button"
          accessibilityState={{selected:selected===option.days&&!customOpen}}
          accessibilityLabel={option.label+', '+(option.days===0?'sem repetição':
            `a cada ${option.days} dias`)}
          onPress={()=>choose(option.days)}
          style={[s.choice,selected===option.days&&!customOpen&&s.choiceActive]}>
          <Text style={[s.choiceLabel,selected===option.days&&!customOpen&&s.choiceLabelActive]}>
            {option.label}
          </Text>
          <Text style={[s.choiceDays,selected===option.days&&!customOpen&&s.choiceLabelActive]}>
            {option.days===0?'Sem repetição':option.days===1?'1 dia':`${option.days} dias`}
          </Text>
        </Pressable>)}
      <Pressable accessibilityRole="button"
        accessibilityState={{selected:customOpen||isCustom}}
        onPress={startCustom} style={[s.choice,(customOpen||isCustom)&&s.choiceActive]}>
        <Text style={[s.choiceLabel,(customOpen||isCustom)&&s.choiceLabelActive]}>
          Personalizado em dias
        </Text>
        <Text style={[s.choiceDays,(customOpen||isCustom)&&s.choiceLabelActive]}>
          Definir intervalo
        </Text>
      </Pressable>
      {customOpen&&<View style={s.custom}>
        <Text style={s.label}>Repetir a cada quantos dias?</Text>
        <TextInput accessibilityLabel="Intervalo personalizado em dias"
          placeholder="Ex.: 15" placeholderTextColor={C.muted}
          keyboardType="numeric" autoCorrect={false} value={custom}
          maxLength={5} onChangeText={setCustom}
          style={s.input} selectTextOnFocus/>
        <Pressable accessibilityRole="button"
          accessibilityState={{disabled:!validRecurrenceInput(custom)}}
          disabled={!validRecurrenceInput(custom)}
          onPress={()=>choose(Number(custom))}
          style={[s.submit,!validRecurrenceInput(custom)&&{opacity:.5}]}>
          <Text style={s.submitLabel}>Usar este intervalo</Text>
        </Pressable>
      </View>}
      <Text style={s.note}>
        As opções mensal, bimestral, trimestral, quadrimestral e semestral
        usam intervalos fixos de 30, 60, 90, 120 e 180 dias.
        Anual usa 365 dias.
      </Text>
    </View>}
  </View>;
}

const s=StyleSheet.create({
  container:{marginBottom:SPACING.lg,gap:8},
  label:{color:C.ink,fontSize:TYPE.body,fontWeight:'800'},
  preview:{minHeight:INTERACTION.minTouch+12,padding:SPACING.md,
    backgroundColor:C.elevated,borderColor:C.border,borderWidth:1,
    borderRadius:RADII.field,flexDirection:'row',alignItems:'center',gap:9},
  current:{color:C.ink,fontSize:TYPE.body,fontWeight:'800'},
  help:{color:C.muted,fontSize:TYPE.caption},
  chevron:{fontSize:20,color:C.accent,fontWeight:'800'},
  choices:{flexDirection:'row',flexWrap:'wrap',gap:7,
    padding:SPACING.md,backgroundColor:C.surface,borderRadius:RADII.field,
    borderWidth:1,borderColor:C.border},
  choice:{width:'48%',flexGrow:1,minHeight:62,justifyContent:'center',gap:3,
    padding:10,backgroundColor:C.elevated,borderRadius:RADII.chip,
    borderWidth:1,borderColor:C.border},
  choiceActive:{borderColor:C.accent,backgroundColor:C.accent+'1B'},
  choiceLabel:{color:C.ink,fontSize:TYPE.body,fontWeight:'800'},
  choiceDays:{color:C.muted,fontSize:TYPE.caption},
  choiceLabelActive:{color:C.accent},
  custom:{width:'100%',gap:8,paddingTop:SPACING.sm},
  input:{minHeight:INTERACTION.minTouch,color:C.ink,fontSize:TYPE.body,
    backgroundColor:C.elevated,borderColor:C.border,borderWidth:1,
    borderRadius:RADII.field,paddingHorizontal:14},
  submit:{minHeight:INTERACTION.minTouch,backgroundColor:C.accent,
    justifyContent:'center',alignItems:'center',borderRadius:RADII.field},
  submitLabel:{color:C.background,fontSize:TYPE.body,fontWeight:'900'},
  note:{width:'100%',fontSize:TYPE.caption,color:C.muted,lineHeight:19,
    marginTop:SPACING.xs},
});
