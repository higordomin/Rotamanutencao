import React, {useState} from 'react';
import {ActivityIndicator,Alert,Pressable,StyleSheet,Text,View} from 'react-native';
import {CalendarPicker} from './CalendarPicker';
import {brazilianDate} from './calendar';
import {localDate} from './logic';
import {validateReportPeriod,REPORT_SPECIALTIES,type ReportSpecialty} from './consolidatedReportModel';
import {exportConsolidatedPdf} from './consolidatedReport';
import {INDUSTRIAL as THEME,INTERACTION,SPACING,TYPE,RADII} from './design31';

const C={panel:THEME.surface,surface:THEME.elevated,border:THEME.border,
  text:THEME.ink,muted:THEME.muted,accent:THEME.accent,bg:THEME.background};
function pastDays(days:number):string {
  const now=new Date();
  now.setHours(12,0,0,0);
  now.setDate(now.getDate()-(days-1));
  return localDate(now);
}

/** Relatórios técnicos manuais, locais. Nenhum upload ou gravação no banco. */
export function ConsolidatedReportPanel(){
  const [start,setStart]=useState(()=>pastDays(7));
  const [end,setEnd]=useState(()=>localDate());
  const [includePhotos,setIncludePhotos]=useState(true);
  const [specialty,setSpecialty]=useState<ReportSpecialty>('Todas');
  const [showSpecialties,setShowSpecialties]=useState(false);
  const [picker,setPicker]=useState<'start'|'end'|null>(null);
  const [busy,setBusy]=useState(false);
  const setPreset=(days:number)=>{
    setStart(pastDays(days));setEnd(localDate());setPicker(null);
  };
  const generate=async()=>{
    if(busy)return;
    try{validateReportPeriod(start,end);}
    catch(e){Alert.alert('Período inválido',e instanceof Error?e.message:String(e));return;}
    setBusy(true);
    try{await exportConsolidatedPdf(start,end,includePhotos,specialty);}
    catch(e){Alert.alert('Não foi possível gerar PDF',e instanceof Error?e.message:String(e));}
    finally{setBusy(false);}
  };
  return <View style={styles.card}>
    <Text accessibilityRole="header" style={styles.title}>Relatório consolidado em PDF</Text>
    <Text style={styles.help}>Reúne OS concluídas ou parciais, rotas finalizadas, anomalias,
      e pendências atuais. Pode compartilhar pelo WhatsApp ou salvar no celular.
      Não precisa de internet para gerar o arquivo.</Text>
    <Text style={styles.label}>Período das execuções</Text>
    <View style={styles.row}>
      {([1,7,30] as const).map(days=><Pressable key={days} accessibilityRole="button"
        disabled={busy} onPress={()=>setPreset(days)} style={styles.smallButton}>
        <Text style={styles.smallText}>{days===1?'Hoje':`Últimos ${days} dias`}</Text>
      </Pressable>)}
    </View>
    <View style={styles.row}>
      <Pressable disabled={busy} accessibilityRole="button" accessibilityLabel="Escolher data inicial"
        style={styles.dateButton} onPress={()=>setPicker(picker==='start'?null:'start')}>
        <Text style={styles.dateLabel}>Início</Text>
        <Text style={styles.dateValue}>{brazilianDate(start)}</Text>
      </Pressable>
      <Pressable disabled={busy} accessibilityRole="button" accessibilityLabel="Escolher data final"
        style={styles.dateButton} onPress={()=>setPicker(picker==='end'?null:'end')}>
        <Text style={styles.dateLabel}>Fim</Text>
        <Text style={styles.dateValue}>{brazilianDate(end)}</Text>
      </Pressable>
    </View>
    {picker&&<CalendarPicker key={picker} value={picker==='start'?start:end}
      onSelect={date=>{if(picker==='start')setStart(date);else setEnd(date);setPicker(null);}}
      onCancel={()=>setPicker(null)}/>}
    <Text style={styles.label}>Especialidade</Text>
    <Pressable accessibilityRole="button" accessibilityState={{expanded:showSpecialties}}
      disabled={busy} onPress={()=>setShowSpecialties(v=>!v)} style={styles.dateButton}>
      <Text style={styles.dateValue}>{specialty==='Todas'?'Todas as especialidades':specialty}  ▾</Text>
      <Text style={styles.help}>Toque para filtrar atividades. Rotas entram apenas na opção Todas.</Text>
    </Pressable>
    {showSpecialties&&<View style={styles.row}>
      {REPORT_SPECIALTIES.map(item=><Pressable key={item} accessibilityRole="button"
        accessibilityState={{selected:specialty===item}} disabled={busy}
        onPress={()=>{setSpecialty(item);setShowSpecialties(false);}}
        style={[styles.smallButton,specialty===item&&{backgroundColor:C.accent}]}>
        <Text style={[styles.smallText,specialty===item&&{color:C.bg}]}>{item}</Text>
      </Pressable>)}
    </View>}
    {specialty!=='Todas'&&<Text style={styles.help}>
      Somente OS da especialidade {specialty}; rotas multidisciplinares ficam fora deste filtro.
      Selecione Todas para incluí-las.
    </Text>}
    <Pressable accessibilityRole="checkbox" accessibilityLabel="Incluir fotos no relatório"
      accessibilityState={{checked:includePhotos}} disabled={busy} onPress={()=>setIncludePhotos(v=>!v)}
      style={styles.checkRow}>
      <Text style={styles.checkbox}>{includePhotos?'☑':'☐'}</Text>
      <Text style={styles.checkLabel}>Incluir fotos das execuções (até 24 fotos e 16 MB)</Text>
    </Pressable>
    <Text style={styles.help}>Período máximo de 90 dias. Pendências são exibidas conforme
      o estado atual, independentemente do período selecionado. Fotos não são enviadas
      automaticamente: o arquivo só é compartilhado quando você escolher o destino.</Text>
    <Pressable accessibilityRole="button" disabled={busy} onPress={()=>{void generate();}}
      style={[styles.button,busy&&{opacity:0.55}]}>
      {busy?<ActivityIndicator color={C.bg}/>:<Text style={styles.buttonText}>Gerar e compartilhar PDF</Text>}
    </Pressable>
  </View>;
}
const styles=StyleSheet.create({
  card:{padding:SPACING.lg,backgroundColor:C.panel,borderColor:C.border,borderWidth:1,borderRadius:RADII.card,marginTop:SPACING.group,gap:SPACING.md},
  title:{fontSize:TYPE.section,color:C.text,fontWeight:'900'},
  help:{color:C.muted,fontSize:TYPE.caption,lineHeight:19},
  label:{color:C.text,fontSize:TYPE.body,fontWeight:'700',marginTop:SPACING.xs},
  row:{flexDirection:'row',gap:SPACING.sm,flexWrap:'wrap'},
  smallButton:{paddingHorizontal:12,paddingVertical:11,backgroundColor:C.surface,borderRadius:RADII.chip,
    borderWidth:1,borderColor:C.border,minHeight:INTERACTION.minTouch,justifyContent:'center'},
  smallText:{color:C.accent,fontWeight:'800',fontSize:TYPE.caption},
  dateButton:{flex:1,minWidth:115,minHeight:INTERACTION.minTouch,padding:13,backgroundColor:C.surface,borderWidth:1,borderColor:C.border,borderRadius:RADII.field},
  dateLabel:{fontSize:TYPE.caption,fontWeight:'700',color:C.muted},
  dateValue:{fontSize:TYPE.bodyLarge,fontWeight:'800',color:C.text,marginTop:4},
  checkRow:{flexDirection:'row',alignItems:'center',gap:10,paddingVertical:11,minHeight:INTERACTION.minTouch},
  checkbox:{fontSize:23,color:C.accent},
  checkLabel:{flex:1,color:C.text,fontSize:TYPE.body,fontWeight:'700',lineHeight:20},
  button:{backgroundColor:C.accent,minHeight:INTERACTION.minTouch,padding:12,borderRadius:RADII.field,alignItems:'center',justifyContent:'center'},
  buttonText:{fontSize:TYPE.body,fontWeight:'900',color:C.bg},
});
