import { getClaimedAchievementBonuses } from './achievements';
import { HERO_SPECIES } from './data/monsters';
import type { GameSave, SkillDef } from './types';

export type SkillBranch = 'sword' | 'magic' | 'command' | 'void';

export interface SkillTreeNodeDef {
  id: string;
  branch: SkillBranch;
  tier: number; // 1..5
  name: string;
  maxLevel: number;
  requires?: string;
  desc: string;
  unlocksSkillId?: string;
}

export const BRANCH_META: Record<SkillBranch, { label: string; color: string }> = {
  sword: { label: '⚔剣聖', color: '#e6634c' },
  magic: { label: '✦魔導', color: '#58b8f5' },
  command: { label: '🛡統率', color: '#5cc478' },
  void: { label: '🌑禁忌', color: '#a864f5' },
};

export const HERO_EXTRA_SKILLS: Record<string, SkillDef> = {
  meteor_flurry: {
    id: 'meteor_flurry',
    name: '流星乱舞',
    mpCost: 15,
    target: 'single_enemy',
    element: 'physical',
    power: 0.78,
    hits: 3,
    statScale: 'atk',
    kind: 'damage',
    critBonus: 14,
    description: '高会心の物理3連撃',
  },
  star_shatter: {
    id: 'star_shatter',
    name: '神速・星砕き',
    mpCost: 22,
    target: 'single_enemy',
    element: 'holy',
    power: 2.25,
    statScale: 'atk',
    kind: 'damage',
    critBonus: 18,
    bossBonus: 1.25,
    statusEffect: { type: 'def_break', chance: 0.75, turns: 3 },
    description: 'ボス特効・防御低下付与',
  },
  thunder_storm: {
    id: 'thunder_storm',
    name: 'サンダーストーム',
    mpCost: 18,
    target: 'all_enemies',
    element: 'holy',
    power: 1.45,
    statScale: 'mag',
    kind: 'damage',
    critBonus: 8,
    description: '全体聖雷魔法',
  },
  astral_nova: {
    id: 'astral_nova',
    name: 'アストラル・ノヴァ',
    mpCost: 26,
    target: 'all_enemies',
    element: 'star',
    power: 1.95,
    statScale: 'mag',
    kind: 'damage',
    critBonus: 12,
    statusEffect: { type: 'freeze', chance: 0.35, turns: 1 },
    description: '全体星魔法・凍結付与',
  },
  sacred_aegis: {
    id: 'sacred_aegis',
    name: '聖光の守護陣',
    mpCost: 18,
    target: 'all_allies',
    element: 'holy',
    power: 1.45,
    statScale: 'def',
    kind: 'shield',
    description: '全体バリア展開',
  },
  immortal_order: {
    id: 'immortal_order',
    name: '不滅の号令',
    mpCost: 22,
    target: 'all_allies',
    element: 'holy',
    power: 1.35,
    statScale: 'mag',
    kind: 'buff_atk',
    description: '全体火力UP・回復',
  },
  abyss_flame: {
    id: 'abyss_flame',
    name: 'アビスフレイム',
    mpCost: 18,
    target: 'all_enemies',
    element: 'fire',
    power: 1.35,
    statScale: 'hybrid',
    kind: 'damage',
    statusEffect: { type: 'burn', chance: 0.8, turns: 3 },
    description: '全体炎撃・火傷付与',
  },
  final_judgment: {
    id: 'final_judgment',
    name: '終焉の断罪',
    mpCost: 25,
    target: 'single_enemy',
    element: 'star',
    power: 2.1,
    statScale: 'hybrid',
    kind: 'damage',
    critBonus: 15,
    statusBonus: 1.45,
    description: '状態異常特効の単体奥義',
  },
};

export const ALL_HERO_SKILLS: Record<string, SkillDef> = {
  [HERO_SPECIES.skills[0].id]: HERO_SPECIES.skills[0],
  [HERO_SPECIES.skills[1].id]: HERO_SPECIES.skills[1],
  ...HERO_EXTRA_SKILLS,
};

export const SKILL_TREE_NODES: SkillTreeNodeDef[] = [
  // ===== 剣聖 =====
  {
    id: 'sw_atk',
    branch: 'sword',
    tier: 1,
    name: '剛剣の極意',
    maxLevel: 3,
    desc: '攻撃+11%/Lv',
  },
  {
    id: 'sw_crit',
    branch: 'sword',
    tier: 2,
    name: '必殺の一閃',
    maxLevel: 3,
    requires: 'sw_atk',
    desc: '会心+5%・会心倍率+14%/Lv',
  },
  {
    id: 'sw_flurry',
    branch: 'sword',
    tier: 3,
    name: '流星乱舞',
    maxLevel: 1,
    requires: 'sw_crit',
    unlocksSkillId: 'meteor_flurry',
    desc: '物理3連撃を解放',
  },
  {
    id: 'sw_double',
    branch: 'sword',
    tier: 4,
    name: '追撃と吸血',
    maxLevel: 3,
    requires: 'sw_flurry',
    desc: '追撃+7%・吸血+4%/Lv',
  },
  {
    id: 'sw_shatter',
    branch: 'sword',
    tier: 5,
    name: '神速・星砕き',
    maxLevel: 1,
    requires: 'sw_double',
    unlocksSkillId: 'star_shatter',
    desc: 'ボス特効・防御低下を解放',
  },

  // ===== 魔導 =====
  {
    id: 'mg_mag',
    branch: 'magic',
    tier: 1,
    name: '星辰の魔力',
    maxLevel: 3,
    desc: '魔力+11%/Lv',
  },
  {
    id: 'mg_weak',
    branch: 'magic',
    tier: 2,
    name: '弱点看破',
    maxLevel: 3,
    requires: 'mg_mag',
    desc: 'WEAK+14%・毎T MP+3/Lv',
  },
  {
    id: 'mg_storm',
    branch: 'magic',
    tier: 3,
    name: 'サンダーストーム',
    maxLevel: 1,
    requires: 'mg_weak',
    unlocksSkillId: 'thunder_storm',
    desc: '全体聖雷魔法を解放',
  },
  {
    id: 'mg_amp',
    branch: 'magic',
    tier: 4,
    name: '魔力暴走',
    maxLevel: 3,
    requires: 'mg_storm',
    desc: 'スキル威力+11%/Lv',
  },
  {
    id: 'mg_nova',
    branch: 'magic',
    tier: 5,
    name: 'アストラル・ノヴァ',
    maxLevel: 1,
    requires: 'mg_amp',
    unlocksSkillId: 'astral_nova',
    desc: '全体星魔法・凍結を解放',
  },

  // ===== 統率 =====
  {
    id: 'cm_def',
    branch: 'command',
    tier: 1,
    name: '鉄壁の心',
    maxLevel: 3,
    desc: 'HP+12%・防御+11%/Lv',
  },
  {
    id: 'cm_bond',
    branch: 'command',
    tier: 2,
    name: 'テイマーの絆',
    maxLevel: 3,
    requires: 'cm_def',
    desc: '仲間全員の全能力+6%/Lv',
  },
  {
    id: 'cm_aegis',
    branch: 'command',
    tier: 3,
    name: '聖光の守護陣',
    maxLevel: 1,
    requires: 'cm_bond',
    unlocksSkillId: 'sacred_aegis',
    desc: '全体バリアを解放',
  },
  {
    id: 'cm_loot',
    branch: 'command',
    tier: 4,
    name: '秘宝の嗅覚',
    maxLevel: 3,
    requires: 'cm_aegis',
    desc: 'MF+16%・鍛冶石+14%/Lv',
  },
  {
    id: 'cm_order',
    branch: 'command',
    tier: 5,
    name: '不滅の号令',
    maxLevel: 1,
    requires: 'cm_loot',
    unlocksSkillId: 'immortal_order',
    desc: '全体火力UP・回復を解放',
  },

  // ===== 禁忌 =====
  {
    id: 'vd_pen',
    branch: 'void',
    tier: 1,
    name: '破甲の刻印',
    maxLevel: 3,
    desc: '防御貫通+8%/Lv',
  },
  {
    id: 'vd_status',
    branch: 'void',
    tier: 2,
    name: '呪詛増幅',
    maxLevel: 3,
    requires: 'vd_pen',
    desc: '状態異常の敵へ与ダメ+12%/Lv',
  },
  {
    id: 'vd_flame',
    branch: 'void',
    tier: 3,
    name: 'アビスフレイム',
    maxLevel: 1,
    requires: 'vd_status',
    unlocksSkillId: 'abyss_flame',
    desc: '全体炎撃・火傷を解放',
  },
  {
    id: 'vd_haste',
    branch: 'void',
    tier: 4,
    name: '虚無の迅速',
    maxLevel: 3,
    requires: 'vd_flame',
    desc: '素早さ+5・攻撃/魔力+7%/Lv',
  },
  {
    id: 'vd_judge',
    branch: 'void',
    tier: 5,
    name: '終焉の断罪',
    maxLevel: 1,
    requires: 'vd_haste',
    unlocksSkillId: 'final_judgment',
    desc: '状態異常特効奥義を解放',
  },
];

export const SKILL_NODE_MAP: Record<string, SkillTreeNodeDef> = Object.fromEntries(
  SKILL_TREE_NODES.map((n) => [n.id, n]),
);

export function getTotalEarnedSp(save: Pick<GameSave, 'roster' | 'maxUnlockedTier' | 'claimedAchievements'>): number {
  const heroLv = save.roster.hero?.level ?? 1;
  const ach = getClaimedAchievementBonuses(save);
  return heroLv + Math.max(0, save.maxUnlockedTier - 1) * 2 + ach.bonusSp;
}

export function getSpentSp(save: Pick<GameSave, 'heroSkillTree'>): number {
  return Object.values(save.heroSkillTree ?? {}).reduce((sum, lv) => sum + Math.max(0, lv), 0);
}

export function getAvailableSp(
  save: Pick<GameSave, 'roster' | 'maxUnlockedTier' | 'claimedAchievements' | 'heroSkillTree'>,
): number {
  return Math.max(0, getTotalEarnedSp(save) - getSpentSp(save));
}

export function canUpgradeSkillNode(
  save: Pick<GameSave, 'roster' | 'maxUnlockedTier' | 'claimedAchievements' | 'heroSkillTree'>,
  nodeId: string,
): boolean {
  const def = SKILL_NODE_MAP[nodeId];
  if (!def) return false;
  if (getAvailableSp(save) <= 0) return false;
  const cur = save.heroSkillTree[nodeId] ?? 0;
  if (cur >= def.maxLevel) return false;
  if (def.requires && (save.heroSkillTree[def.requires] ?? 0) <= 0) return false;
  return true;
}

export function getUnlockedHeroSkillIds(save: Pick<GameSave, 'heroSkillTree'>): string[] {
  const ids = [HERO_SPECIES.skills[0].id, HERO_SPECIES.skills[1].id];
  for (const node of SKILL_TREE_NODES) {
    if (node.unlocksSkillId && (save.heroSkillTree[node.id] ?? 0) > 0) {
      ids.push(node.unlocksSkillId);
    }
  }
  return ids;
}

export function getHeroEquippedSkills(
  save: Pick<GameSave, 'heroSkillTree' | 'heroEquippedSkillIds'>,
): [SkillDef, SkillDef] {
  const unlocked = new Set(getUnlockedHeroSkillIds(save));
  const [id0, id1] = save.heroEquippedSkillIds ?? [
    HERO_SPECIES.skills[0].id,
    HERO_SPECIES.skills[1].id,
  ];
  const s0 = unlocked.has(id0) && ALL_HERO_SKILLS[id0] ? ALL_HERO_SKILLS[id0]! : HERO_SPECIES.skills[0];
  const s1 = unlocked.has(id1) && ALL_HERO_SKILLS[id1] ? ALL_HERO_SKILLS[id1]! : HERO_SPECIES.skills[1];
  return [s0, s1];
}

export function computeSkillTreeBonuses(save: Pick<GameSave, 'heroSkillTree'>) {
  const t = save.heroSkillTree ?? {};
  const lv = (id: string) => Math.max(0, t[id] ?? 0);

  return {
    heroAtkPct: lv('sw_atk') * 11 + lv('vd_haste') * 7,
    heroCritRate: lv('sw_crit') * 5,
    heroCritDmg: lv('sw_crit') * 14,
    heroDoubleHit: lv('sw_double') * 7,
    heroLifesteal: lv('sw_double') * 4,
    heroMagPct: lv('mg_mag') * 11 + lv('vd_haste') * 7,
    heroWeaknessBonusPct: lv('mg_weak') * 14,
    heroMpRegenBonus: lv('mg_weak') * 3,
    heroSkillPowerBonusPct: lv('mg_amp') * 11,
    heroHpPct: lv('cm_def') * 12,
    heroDefPct: lv('cm_def') * 11,
    heroMagicFind: lv('cm_loot') * 16,
    heroStoneFind: lv('cm_loot') * 14,
    heroArmorPenPct: lv('vd_pen') * 8,
    heroStatusDmgBonusPct: lv('vd_status') * 12,
    heroSpdFlat: lv('vd_haste') * 5,
    allyMonsterAllStatPct: lv('cm_bond') * 6,
  };
}
