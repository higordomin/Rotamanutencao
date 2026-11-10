import React,{useState} from 'react';
import {ActivityIndicator,Alert,Modal,Pressable,SafeAreaView,ScrollView,StyleSheet,Text,View} from 'react-native';
import {INDUSTRIAL as THEME} from './design31';
import {pickMpFile} from './mpWorkbook';
import {importMpItems} from './mpImportDb';
import type {MpPreview} from './mpImport';

export function MpImportPanel({visible,onClose,onImported}:{
  visible:boolean;onClose:()=>void;onImported:()=>Promise<void>;
}){
  const [preview,setPreview]=useState<MpPreview|null>(null);
  const [busy,setBusy]=useState(false);
  const pick=async()=>{
    if(busy)return;
    setBusy(true);
    try{
      const chosen=await pickMpFile();
      if(chosen)setPreview(chosen);
    }catch(e){Alert.alert('Não foi possível ler a planilha',e instanceof Error?e.message:String(e));}
    finally{setBusy(false);}
  };
  const commit=async()=>{
    if(!preview||busy)return;
    setBusy(true);
    try{
      const result=await importMpItems(preview.items,preview.rejected.length);
      await onImported();
      setPreview(null);
      Alert.alert('Importação concluída',
        [result.created+' MPs cadastradas.',result.duplicates+' já existentes (preservadas).',
          result.missingDates+' sem data válida (não importadas).',
          result.rejected+' linhas inválidas (não importadas).'].join('\n'));
      onClose();
    }catch(e){Alert.alert('Importação não realizada',e instanceof Error?e.message:String(e));}
    finally{setBusy(false);}
  };
  const confirm=()=>{
    if(!preview||busy)return;
    Alert.alert('Importar MPs?',
      'O aplicativo criará novas atividades sem alterar registros existentes. '+
      'As MPs sem data válida não serão incluídas na agenda. Faça um backup antes de importar.',
      [{text:'Cancelar',style:'cancel'},{text:'Importar',onPress:()=>{void commit();}}]);
  };
  const validCount=preview?.items.filter(item=>item.due_date!==null).length??0;
  const missingCount=(preview?.items.length??0)-validCount;
  return <Modal visible={visible} animationType="slide" onRequestClose={()=>{if(!busy)onClose();}}>
    <SafeAreaView style={styles.page}>
      <View style={styles.header}>
        <View style={{flex:1}}>
          <Text style={styles.title}>Importar MPs do Maximo</Text>
          <Text style={styles.sub}>Planilha XLSX ou CSV · processamento local</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Fechar importação"
          disabled={busy} onPress={onClose} style={styles.close}>
          <Text style={styles.text}>✕</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={{padding:18,paddingBottom:45}}>
        <Text style={styles.text}>
          Importe MPs e gere atividades recorrentes. O número da “Última OS criada”
          será apenas uma referência histórica, não uma nova O.S. do IBM.
        </Text>
        <Text style={styles.muted}>
          Não exige cadastrar equipamentos. A posição numérica não será interpretada como nome de setor.
          Instruções das tarefas não presentes na planilha não serão inventadas.
        </Text>
        <Pressable accessibilityRole="button" disabled={busy} onPress={()=>{void pick();}}
          style={[styles.button,busy&&{opacity:.5}]}>
          <Text style={styles.buttonText}>{busy?'Processando...':'Selecionar Excel ou CSV'}</Text>
        </Pressable>
        {busy&&<ActivityIndicator color={THEME.accent} style={{marginTop:16}}/>}
        {preview&&<>
          <View style={styles.summary}>
            <Text style={styles.subtitle}>Conferência antes de salvar</Text>
            <Text style={styles.text}>{preview.items.length} MPs reconhecidas</Text>
            <Text style={styles.text}>{validCount} com data programável</Text>
            <Text style={styles.warning}>{missingCount} sem data válida (serão ignoradas)</Text>
            <Text style={styles.muted}>{preview.rejected.length} linhas rejeitadas</Text>
          </View>
          {preview.items.slice(0,12).map(item=><View style={styles.item} key={item.mp_code}>
            <Text style={styles.code}>{item.mp_code} · {item.duration_minutes===null?'Tempo não informado':item.duration_minutes+' min'}</Text>
            <Text style={styles.text}>{item.title}</Text>
            <Text style={styles.muted}>Data: {item.due_date??'ausente'} · Repetição: {item.recurrence_months?
              item.recurrence_months+' mês(es)':item.recurrence_days+' dia(s)'}</Text>
            {!!item.warning&&<Text style={styles.warning}>{item.warning}</Text>}
          </View>)}
          {preview.items.length>12&&<Text style={styles.muted}>
            Exibindo 12 de {preview.items.length} MPs. Todas serão verificadas ao importar.
          </Text>}
          {preview.rejected.slice(0,4).map((message,i)=><Text style={styles.warning} key={i}>{message}</Text>)}
          <Pressable accessibilityRole="button" disabled={busy||validCount===0} onPress={confirm}
            style={[styles.button,{marginTop:22},(busy||validCount===0)&&{opacity:.5}]}>
            <Text style={styles.buttonText}>Confirmar importação ({validCount} programáveis)</Text>
          </Pressable>
        </>}
        <Text style={[styles.muted,{marginTop:20}]}>
          Segurança: faça backup do RotaManutenção antes de atualizar o APK. A importação é aditiva,
          não substitui registros e funciona sem nuvem.
        </Text>
      </ScrollView>
    </SafeAreaView>
  </Modal>;
}
const styles=StyleSheet.create({
  page:{flex:1,backgroundColor:THEME.background},
  header:{padding:18,paddingTop:28,flexDirection:'row',alignItems:'center',borderBottomColor:THEME.border,borderBottomWidth:1},
  title:{fontSize:19,fontWeight:'900',color:THEME.ink},
  subtitle:{fontSize:15,fontWeight:'800',color:THEME.ink,marginBottom:7},
  sub:{fontSize:11,color:THEME.muted,marginTop:4},
  text:{fontSize:13,color:THEME.ink,lineHeight:20,marginBottom:6},
  muted:{fontSize:12,color:THEME.muted,lineHeight:18,marginTop:7},
  warning:{fontSize:12,color:THEME.caution,marginTop:6,lineHeight:18},
  code:{color:THEME.accent,fontWeight:'800',fontSize:12,marginBottom:8},
  summary:{backgroundColor:THEME.surface,borderRadius:12,padding:14,marginTop:18,borderColor:THEME.border,borderWidth:1},
  item:{padding:14,borderRadius:12,backgroundColor:THEME.elevated,marginTop:10,borderColor:THEME.border,borderWidth:1},
  button:{backgroundColor:THEME.accent,padding:14,borderRadius:10,alignItems:'center',marginTop:18,minHeight:44},
  buttonText:{fontWeight:'800',fontSize:13,color:THEME.background},
  close:{padding:10},
});
