import React,{useEffect,useMemo,useState} from 'react';
import {FlatList,Keyboard,Modal,Pressable,SafeAreaView,ScrollView,StyleSheet,Text,TextInput,View} from 'react-native';
import type {Asset} from './types';
import {assetAreas,findCatalogAssets,selectedCatalogAsset} from './assetCatalog';
import {INDUSTRIAL as C,INTERACTION} from './design31';

const c={bg:C.background,panel:C.surface,field:C.elevated,line:C.border,
  ink:C.ink,muted:C.muted,blue:C.accent,green:C.success,red:C.danger};

/**
 * Seletor único de OS e pontos de rota. Alterações são confirmadas explicitamente;
 * cancelar não modifica o formulário chamador. Nunca associa pela TAG textual.
 */
export function AssetPicker({assets,value,onChange,label='Equipamento / TAG',allowNone=false,disabled=false}:{
  assets:Asset[];value:string|null;onChange:(assetId:string|null)=>void;
  label?:string;allowNone?:boolean;disabled?:boolean;
}){
  const [open,setOpen]=useState(false);
  const [search,setSearch]=useState('');
  const [area,setArea]=useState('');
  const [draftId,setDraftId]=useState<string|null>(value);
  useEffect(()=>{if(open){setDraftId(value);setSearch('');setArea('');}},[open,value]);
  const selected=useMemo(()=>selectedCatalogAsset(assets,value),[assets,value]);
  const draft=useMemo(()=>selectedCatalogAsset(assets,draftId),[assets,draftId]);
  const rows=useMemo(()=>findCatalogAssets(assets,search,area),[assets,search,area]);
  const areas=useMemo(()=>assetAreas(assets),[assets]);
  const close=()=>{Keyboard.dismiss();setOpen(false);};
  const confirm=()=>{
    if(draftId&&!draft)return;
    if(!draftId&&!allowNone)return;
    onChange(draftId);
    close();
  };
  return <View style={styles.group}>
    <Text style={styles.label}>{label}</Text>
    <Pressable accessibilityRole="button" accessibilityLabel={'Selecionar '+label}
      disabled={disabled} onPress={()=>setOpen(true)}
      style={[styles.preview,disabled&&{opacity:.45}]}>
      <View style={{flex:1}}>
        <Text style={styles.tag}>{selected ? selected.code||'Sem TAG' : value ? 'TAG não encontrada' : 'Selecionar equipamento'}</Text>
        <Text style={styles.sub}>{selected ? [selected.name,selected.area||'Sem setor'].join(' · ')
          :value?'O equipamento foi removido. Escolha outro.':'Buscar pelo código, nome ou setor'}</Text>
      </View>
      <Text style={styles.change}>Alterar ›</Text>
    </Pressable>
    <Modal visible={open} animationType="slide" onRequestClose={close}>
      <SafeAreaView style={styles.modal}>
        <View style={styles.header}>
          <View style={{flex:1}}><Text accessibilityRole="header" style={styles.heading}>Qual equipamento?</Text>
            <Text style={styles.sub}>Busque pelo código TAG, nome ou setor · {assets.length} cadastrados</Text></View>
          <Pressable accessibilityRole="button" accessibilityLabel="Cancelar seleção de equipamento"
            style={styles.outline} onPress={close}><Text style={styles.link}>Cancelar</Text></Pressable>
        </View>
        <TextInput autoCorrect={false} autoCapitalize="none"
          accessibilityLabel="Pesquisar por TAG, nome ou setor"
          placeholder="Digite a TAG ou o nome..." placeholderTextColor={c.muted}
          value={search} onChangeText={setSearch} style={styles.search}/>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="always" style={{flexGrow:0,maxHeight:57}}
          contentContainerStyle={styles.areaRow}>
          <Pressable accessibilityRole="button" accessibilityState={{selected:!area}}
            onPress={()=>setArea('')} style={[styles.chip,!area&&styles.chipActive]}>
            <Text style={[styles.chipText,!area&&styles.chipTextActive]}>Todos os setores</Text>
          </Pressable>
          {areas.map(item=><Pressable key={item} accessibilityRole="button"
            accessibilityState={{selected:area===item}} onPress={()=>setArea(item)}
            style={[styles.chip,area===item&&styles.chipActive]}>
            <Text style={[styles.chipText,area===item&&styles.chipTextActive]}>{item}</Text>
          </Pressable>)}
        </ScrollView>
        <Text style={styles.count}>{rows.length} encontrado(s){draft&&' · Seleção marcada abaixo'}</Text>
        <FlatList data={rows} keyExtractor={item=>item.id}
          keyboardShouldPersistTaps="handled" initialNumToRender={15}
          maxToRenderPerBatch={18} windowSize={7} removeClippedSubviews={false}
          style={{flex:1}} contentContainerStyle={{paddingHorizontal:16,paddingBottom:12}}
          ListEmptyComponent={<Text style={styles.empty}>{assets.length===0
            ?'Nenhum equipamento cadastrado. Cadastre-o na aba Ativos.'
            :'Nenhum resultado. Experimente outro termo ou setor.'}</Text>}
          renderItem={({item})=><Pressable accessibilityRole="radio"
            accessibilityState={{selected:draftId===item.id}}
            accessibilityLabel={[item.code||'Sem TAG',item.name,item.area||'Sem setor'].join(', ')}
            onPress={()=>setDraftId(item.id)}
            style={[styles.row,draftId===item.id&&styles.rowActive]}>
            <View style={{flex:1}}>
              <Text style={styles.tag}>{item.code||'Sem TAG'}</Text>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.sub}>{item.area||'Sem setor'}</Text>
            </View>
            <View style={[styles.radio,draftId===item.id&&styles.radioSelected]}>
              <Text style={{fontSize:16,color:draftId===item.id?c.bg:c.muted,fontWeight:'900'}}>
                {draftId===item.id?'✓':''}
              </Text>
            </View>
          </Pressable>}/>
        <View style={styles.footer}>
          <View style={{flex:1}}>
            <Text style={styles.footerLabel}>EQUIPAMENTO SELECIONADO</Text>
            <Text numberOfLines={2} style={styles.name}>{draft?[draft.code||'Sem TAG',draft.name].join(' · ')
              :draftId?'Equipamento removido':'Nenhum equipamento'}</Text>
          </View>
          {allowNone&&<Pressable accessibilityRole="button" style={styles.outline}
            onPress={()=>setDraftId(null)}><Text style={styles.link}>Limpar</Text></Pressable>}
          <Pressable accessibilityRole="button"
            disabled={(!allowNone&&!draftId)||!!(draftId&&!draft)}
            style={[styles.submit,((!allowNone&&!draftId)||!!(draftId&&!draft))&&{opacity:.45}]}
            onPress={confirm}><Text style={styles.submitText}>Usar TAG</Text></Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  </View>;
}
const styles=StyleSheet.create({
  group:{marginBottom:16},label:{color:c.ink,fontSize:12,fontWeight:'700',marginBottom:7},
  preview:{backgroundColor:c.field,borderColor:c.line,borderWidth:1,borderRadius:12,
    padding:13,flexDirection:'row',alignItems:'center',minHeight:64,gap:10},
  tag:{color:c.blue,fontWeight:'900',fontSize:17},name:{color:c.ink,fontSize:14,fontWeight:'700'},
  sub:{color:c.muted,fontSize:12,marginTop:3,lineHeight:18},
  change:{color:c.blue,fontSize:12,fontWeight:'800'},
  modal:{flex:1,backgroundColor:c.bg},header:{flexDirection:'row',alignItems:'center',gap:12,
    paddingHorizontal:16,paddingTop:18,paddingBottom:12},
  heading:{color:c.ink,fontSize:24,fontWeight:'900'},
  outline:{padding:10,borderWidth:1,borderColor:c.line,borderRadius:9},
  link:{color:c.blue,fontSize:12,fontWeight:'800'},
  search:{marginHorizontal:16,marginBottom:6,backgroundColor:c.field,borderColor:c.blue,
    borderWidth:1,borderRadius:11,color:c.ink,paddingHorizontal:13,paddingVertical:13},
  areaRow:{paddingHorizontal:16,gap:8,alignItems:'center',paddingVertical:9},
  chip:{paddingHorizontal:12,paddingVertical:9,backgroundColor:c.field,borderColor:c.line,
    borderWidth:1,borderRadius:9},chipActive:{backgroundColor:c.blue,borderColor:c.blue},
  chipText:{color:c.ink,fontSize:12,fontWeight:'700'},chipTextActive:{color:c.bg},
  count:{paddingHorizontal:16,paddingVertical:9,fontSize:12,color:c.muted},
  radio:{width:28,height:28,borderRadius:14,borderWidth:2,borderColor:c.line,
    alignItems:'center',justifyContent:'center'},
  radioSelected:{backgroundColor:c.green,borderColor:c.green},
  row:{backgroundColor:c.panel,marginBottom:8,borderWidth:1,borderColor:c.line,
    borderRadius:11,paddingHorizontal:13,paddingVertical:12,flexDirection:'row',
    gap:14,alignItems:'center',minHeight:78},
  rowActive:{borderColor:c.green,backgroundColor:c.green+'13'},
  empty:{textAlign:'center',color:c.muted,padding:30,lineHeight:22},
  footer:{borderTopWidth:1,borderColor:c.line,padding:12,gap:9,
    flexDirection:'row',alignItems:'center',backgroundColor:c.panel},
  footerLabel:{color:c.muted,fontSize:10,marginBottom:3,fontWeight:'800',letterSpacing:.6},
  submit:{backgroundColor:c.blue,paddingHorizontal:16,paddingVertical:13,
    minHeight:INTERACTION.minTouch,justifyContent:'center',borderRadius:11},
  submitText:{color:c.bg,fontSize:13,fontWeight:'900'},
});
