/**
 * RotaManutenção — Industrial Dark.
 * Fonte única de design para as telas Android offline.
 * Não importa React Native: tokens fáceis de testar e reutilizar.
 */
export const INDUSTRIAL={
  background:'#0B1220',
  surface:'#142238',
  elevated:'#1A2D45',
  border:'#2B415B',
  ink:'#F1F6FF',
  muted:'#A6BAD2',
  accent:'#4BB9F4',
  success:'#61DBB1',
  caution:'#FFCF78',
  danger:'#FF8295',
} as const;

export const INTERACTION={
  minTouch:48,
  radius:15,
  smallRadius:11,
} as const;

export const SPACING={
  xs:4,sm:8,md:12,lg:16,xl:20,xxl:24,
  screen:16,group:14,
} as const;

export const TYPE={
  eyebrow:11,
  caption:12,
  body:14,
  bodyLarge:15,
  section:18,
  title:23,
  hero:26,
  number:26,
} as const;

export const RADII={
  chip:10,
  field:12,
  card:16,
  major:18,
  pill:999,
} as const;

/** Contraste consistente entre status funcionais, independentemente da tela. */
export const STATUS_TONE={
  overdue:INDUSTRIAL.danger,
  blocked:INDUSTRIAL.caution,
  attention:INDUSTRIAL.caution,
  completed:INDUSTRIAL.success,
  scheduled:INDUSTRIAL.accent,
} as const;
