import type { ElementType } from './types';

export interface ElementMeta {
  label: string;
  icon: string;
  color: string;
  weakTo: ElementType | null;
}

export const ELEMENT_META: Record<ElementType, ElementMeta> = {
  nature: { label: '自然', icon: '🌿', color: '#58d679', weakTo: 'fire' },
  earth: { label: '大地', icon: '🪨', color: '#c49a6c', weakTo: 'nature' },
  fire: { label: '炎', icon: '🔥', color: '#ff7043', weakTo: 'holy' },
  star: { label: '星', icon: '⭐', color: '#b48cff', weakTo: 'earth' },
  holy: { label: '聖', icon: '✨', color: '#ffe570', weakTo: 'star' },
  physical: { label: '物理', icon: '⚔', color: '#d0d7e6', weakTo: null },
};

export const SHIFT_ELEMENTS: ElementType[] = ['nature', 'earth', 'fire', 'star', 'holy'];

export interface BossGimmickDef {
  bossId: string;
  name: string;
  shortDesc: string;
}

export const BOSS_GIMMICKS: Record<string, BossGimmickDef> = {
  ancient_treant: {
    bossId: 'ancient_treant',
    name: '根絡み再生',
    shortDesc: '毎T再生・攻撃時毒・怒り時障壁',
  },
  rune_golem: {
    bossId: 'rune_golem',
    name: '魔導障壁',
    shortDesc: '2T毎バリア展開・障壁中軽減＆反射',
  },
  crimson_wyrm: {
    bossId: 'crimson_wyrm',
    name: '灼熱鱗',
    shortDesc: '毎T全体火傷波・火傷対象へ火力増',
  },
  star_devourer: {
    bossId: 'star_devourer',
    name: '虚無吸引',
    shortDesc: '攻撃時MP吸収・毎T攻撃強化',
  },
  glacier_leviathan: {
    bossId: 'glacier_leviathan',
    name: '絶対零度波',
    shortDesc: '2T毎全体凍結波・凍結対象へ追撃',
  },
  seraph_omega: {
    bossId: 'seraph_omega',
    name: '聖光審判',
    shortDesc: '3T毎浄化＆全体防御低下＋聖光盾',
  },
  abyss_kraken: {
    bossId: 'abyss_kraken',
    name: '墨汁呪縛',
    shortDesc: '毎T全体毒＆防低下・異常対象へ火力増',
  },
  chronos_mantis: {
    bossId: 'chronos_mantis',
    name: '時空加速',
    shortDesc: '毎T加速・高率2回行動・奥義時凍結',
  },
  asura_emperor: {
    bossId: 'asura_emperor',
    name: '修羅乱舞',
    shortDesc: '背水火力増・全攻撃追撃＆自己強化',
  },
  genesis_orrery: {
    bossId: 'genesis_orrery',
    name: '万象反転',
    shortDesc: '毎T属性シフト・偶数T星辰バリア',
  },
};

export function getBossGimmick(speciesId: string): BossGimmickDef | null {
  return BOSS_GIMMICKS[speciesId] ?? null;
}

export function getWeaknessElementFor(defenderElement: ElementType): ElementType | null {
  return ELEMENT_META[defenderElement]?.weakTo ?? null;
}
