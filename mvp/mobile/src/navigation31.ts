/** Navegação visível simplificada, sem remover páginas nem registros antigos. */
export const bottomTabs=[
  {label:'Início',caption:'Início',icon:'⌂'},
  {label:'Agenda',caption:'Agenda',icon:'▦'},
  {label:'Atividades',caption:'OS',icon:'☑'},
  {label:'Rotas',caption:'Rotas',icon:'⇢'},
  {label:'Mais',caption:'Mais',icon:'⋯'},
] as const;
export const moreDestinations=[
  {label:'Ativos',title:'Equipamentos',subtitle:'Localizar TAGs, cadastrar e editar equipamentos',icon:'⚙'},
  {label:'Histórico',title:'Histórico',subtitle:'Consultar execuções e evidências registradas',icon:'◷'},
  {label:'Dados',title:'Relatórios e dados',subtitle:'PDF, lembretes, backup e configurações locais',icon:'▣'},
] as const;
export type AppTab=typeof bottomTabs[number]['label']|typeof moreDestinations[number]['label'];
export function visibleTab(tab:AppTab):typeof bottomTabs[number]['label']{
  return moreDestinations.some(x=>x.label===tab)?'Mais':tab as typeof bottomTabs[number]['label'];
}
export function morePage(tab:AppTab):boolean{
  return moreDestinations.some(x=>x.label===tab);
}
