import React,{useMemo,useState} from 'react';
import {Keyboard,Pressable,StyleSheet,Text,TextInput,View} from 'react-native';
import {INDUSTRIAL as C,INTERACTION,RADII,TYPE} from './design31';
import {sectorSuggestions,MAX_SECTOR_LENGTH} from './sectors37';

/** Sugestões locais sem limite de cadastro, lista visual limitada a 6 resultados. */
export function SectorInput({value,onChange,options,label,placeholder}:{
  value:string;onChange:(value:string)=>void;options:readonly string[];
  label:string;placeholder?:string;
}){
  const [open,setOpen]=useState(false);
  const choices=useMemo(()=>sectorSuggestions(options,value,6),[options,value]);
  return <View style={s.container}>
    <Text style={s.label}>{label}</Text>
    <TextInput accessibilityLabel={label}
      value={value} onChangeText={value=>{onChange(value);setOpen(true);}}
      onFocus={()=>setOpen(true)}
      placeholder={placeholder??'Digite para encontrar ou cadastrar um setor'}
      placeholderTextColor={C.muted}
      maxLength={MAX_SECTOR_LENGTH} selectionColor={C.accent}
      style={s.input} autoCapitalize="words"/>
    {open&&choices.length>0&&<View style={s.options}>
      <Text style={s.hint}>Setores cadastrados — toque para selecionar</Text>
      {choices.map(choice=><Pressable key={choice} accessibilityRole="button"
        accessibilityLabel={'Selecionar setor '+choice}
        style={s.option}
        onPress={()=>{onChange(choice);setOpen(false);Keyboard.dismiss();}}>
        <Text style={s.optionText} numberOfLines={2}>{choice}</Text>
      </Pressable>)}
    </View>}
    {open&&<Pressable accessibilityRole="button" onPress={()=>{setOpen(false);Keyboard.dismiss();}}
      style={s.close}><Text style={s.closeText}>Fechar sugestões</Text></Pressable>}
  </View>;
}
const s=StyleSheet.create({
  container:{gap:7,marginBottom:14},
  label:{color:C.ink,fontSize:TYPE.body,fontWeight:'800'},
  input:{borderWidth:1,borderColor:C.border,backgroundColor:C.elevated,
    borderRadius:RADII.field,minHeight:INTERACTION.minTouch,paddingHorizontal:14,
    paddingVertical:12,color:C.ink,fontSize:TYPE.body},
  options:{borderWidth:1,borderColor:C.border,borderRadius:RADII.field,
    backgroundColor:C.surface,padding:6,gap:3},
  hint:{color:C.muted,fontSize:TYPE.caption,padding:7},
  option:{minHeight:INTERACTION.minTouch,paddingHorizontal:12,paddingVertical:10,
    backgroundColor:C.elevated,borderRadius:RADII.chip,justifyContent:'center'},
  optionText:{color:C.ink,fontSize:TYPE.body,fontWeight:'700'},
  close:{alignSelf:'flex-end',minHeight:40,justifyContent:'center',paddingHorizontal:8},
  closeText:{color:C.accent,fontSize:TYPE.caption,fontWeight:'700'},
});
