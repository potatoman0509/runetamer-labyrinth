import { getClaimedAchievementBonuses } from './achievements';
import { HERO_SPECIES } from './data/monsters';
import type { GameSave, SkillDef } from './types';

export type SkillBranch = 'sword' | 'magic' | 'command';

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
  sword: { label: '⚔ 剣聖', color: '#e6634c' },
  magic: { label: '✦ 魔導', color: '#58b8f5' },
  command: { label: '🛡 統率', color: '#5cc478' },
};

export const HERO_EXTRA_SKILLS: Record<string, SkillDef> = {
  meteor_flurry: {
    id: 'meteor_flurry',
    name: '流星乱舞',
    mpCost: 14,
    target: 'single_enemy',
    element: 'physical',
    power: 0.92,
    hits: 3,
    statScale: 'atk',
    kind: 'damage',
    critBonus: 18,
    description: '剣聖スキル：高会心の物理3連撃',
  },
  star_shatter: {
    id: 'star_shatter',
    name: '神速・星砕き',
    mpCost: 20,
    target: 'single_enemy',
    element: 'holy',
    power: 2.7,
    statScale: 'atk',
    kind: 'damage',
    critBonus: 25,
    bossBonus: 1.35,
    description: '剣聖奥義：ボス/強敵へ特効の渾身一閃',
  },
  thunder_storm: {
    id: 'thunder_storm',
    name: 'サンダーストーム',
    mpCost: 16,
    target: 'all_enemies',
    element: 'holy',
    power: 1.75,
    statScale: 'mag',
    kind: 'damage',
    critBonus: 10,
    description: '魔導スキル：聖雷で敵全体を薙ぎ払う',
  },
  astral_nova: {
    id: 'astral_nova',
    name: 'アストラル・ノヴァ',
    mpCost: 24,
    target: 'all_enemies',
    element: 'star',
    power: 2.35,
    statScale: 'mag',
    kind: 'damage',
    critBonus: 18,
    description: '魔導奥義：星光を降らせる究極全体魔法',
  },
  sacred_aegis: {
    id: 'sacred_aegis',
    name: '聖光の守護陣',
    mpCost: 16,
    target: 'all_allies',
    element: 'holy',
    power: 1.85,
    statScale: 'def',
    kind: 'shield',
    description: '統率スキル：味方全員へ鉄壁の聖光バリア',
  },
  immortal_order: {
    id: 'immortal_order',
    name: '不滅の号令',
    mpCost: 20,
    target: 'all_allies',
    element: 'holy',
    power: 1.7,
    statScale: 'mag',
    kind: 'buff_atk',
    description: '統率奥義：全体火力強化＋大回復＆毒浄化',
  },
};

export const ALL_HERO_SKILLS: Record<string, SkillDef> = {
  [HERO_SPECIES.skills[0].id]: HERO_SPECIES.skills[0],
  [HERO_SPECIES.skills[1].id]: HERO_SPECIES.skills[1],
  ...HERO_EXTRA_SKILLS,
};

export const SKILL_TREE_NODES: SkillTreeNodeDef[] = [
  // ===== 剣聖ルート =====
  {
    id: 'sw_atk',
    branch: 'sword',
    tier: 1,
    name: '剛剣の極意',
    maxLevel: 3,
    desc: '主人公の攻撃+14%/Lv',
  },
  {
    id: 'sw_crit',
    branch: 'sword',
    tier: 2,
    name: '必殺の一閃',
    maxLevel: 3,
    requires: 'sw_atk',
    desc: '会心率+6%・会心倍率+18%/Lv',
  },
  {
    id: 'sw_flurry',
    branch: 'sword',
    tier: 3,
    name: 'スキル:流星乱舞',
    maxLevel: 1,
    requires: 'sw_crit',
    unlocksSkillId: 'meteor_flurry',
    desc: '物理3連撃スキル「流星乱舞」解放',
  },
  {
    id: 'sw_double',
    branch: 'sword',
    tier: 4,
    name: '追撃と吸血',
    maxLevel: 3,
    requires: 'sw_flurry',
    desc: '追撃率+10%・吸血+5%/Lv',
  },
  {
    id: 'sw_shatter',
    branch: 'sword',
    tier: 5,
    name: '奥義:神速・星砕き',
    maxLevel: 1,
    requires: 'sw_double',
    unlocksSkillId: 'star_shatter',
    desc: 'ボス特効の究極一閃「神速・星砕き」解放',
  },

  // ===== 魔導ルート =====
  {
    id: 'mg_mag',
    branch: 'magic',
    tier: 1,
    name: '星辰の魔力',
    maxLevel: 3,
    desc: '主人公の魔力+14%/Lv',
  },
  {
    id: 'mg_weak',
    branch: 'magic',
    tier: 2,
    name: '弱点看破と循環',
    maxLevel: 3,
    requires: 'mg_mag',
    desc: 'WEAK倍率+20%・毎T MP+4/Lv',
  },
  {
    id: 'mg_storm',
    branch: 'magic',
    tier: 3,
    name: 'スキル:サンダーストーム',
    maxLevel: 1,
    requires: 'mg_weak',
    unlocksSkillId: 'thunder_storm',
    desc: '全体聖雷魔法「サンダーストーム」解放',
  },
  {
    id: 'mg_amp',
    branch: 'magic',
    tier: 4,
    name: '魔力暴走',
    maxLevel: 3,
    requires: 'mg_storm',
    desc: '主人公の全スキル威力+15%/Lv',
  },
  {
    id: 'mg_nova',
    branch: 'magic',
    tier: 5,
    name: '奥義:アストラル・ノヴァ',
    maxLevel: 1,
    requires: 'mg_amp',
    unlocksSkillId: 'astral_nova',
    desc: '究極星魔法「アストラル・ノヴァ」解放',
  },

  // ===== 統率・守護ルート =====
  {
    id: 'cm_def',
    branch: 'command',
    tier: 1,
    name: '鉄壁の心',
    maxLevel: 3,
    desc: '主人公のHP+16%・防御+14%/Lv',
  },
  {
    id: 'cm_bond',
    branch: 'command',
    tier: 2,
    name: 'テイマーの絆',
    maxLevel: 3,
    requires: 'cm_def',
    desc: '仲間モンスター全員の全能力+9%/Lv！',
  },
  {
    id: 'cm_aegis',
    branch: 'command',
    tier: 3,
    name: 'スキル:聖光の守護陣',
    maxLevel: 1,
    requires: 'cm_bond',
    unlocksSkillId: 'sacred_aegis',
    desc: '全体鉄壁バリア「聖光の守護陣」解放',
  },
  {
    id: 'cm_loot',
    branch: 'command',
    tier: 4,
    name: '秘宝の嗅覚',
    maxLevel: 3,
    requires: 'cm_aegis',
    desc: 'トレハン+22%・鍛冶石獲得+18%/Lv',
  },
  {
    id: 'cm_order',
    branch: 'command',
    tier: 5,
    name: '奥義:不滅の号令',
    maxLevel: 1,
    requires: 'cm_loot',
    unlocksSkillId: 'immortal_order',
    desc: '全体火力UP＋大回復「不滅の号令」解放',
  },
];

export const SKILL_NODE_MAP: Record<string, SkillTreeNodeDef> = Object.fromEntries(
  SKILL_TREE_NODES.map((n) => [n.id, n]),
);

export function getTotalEarnedSp(save: Pick<GameSave, 'roster' | 'maxUnlockedTier' | 'claimedAchievements'>): number {
  const heroLv = save.roster.hero?.level ?? 1;
  const ach = getClaimedAchievementBonuses(save);
  // 1 SP right at Lv1 + 1 per level + 2 per unlocked World Tier beyond 1 + Achievement bonus SP
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
    // Hero-only bonuses
    heroAtkPct: lv('sw_atk') * 14,
    heroCritRate: lv('sw_crit') * 6,
    heroCritDmg: lv('sw_crit') * 18,
    heroDoubleHit: lv('sw_double') * 10,
    heroLifesteal: lv('sw_double') * 5,
    heroMagPct: lv('mg_mag') * 14,
    heroWeaknessBonusPct: lv('mg_weak') * 20,
    heroMpRegenBonus: lv('mg_weak') * 4,
    heroSkillPowerBonusPct: lv('mg_amp') * 15,
    heroHpPct: lv('cm_def') * 16,
    heroDefPct: lv('cm_def') * 14,
    heroMagicFind: lv('cm_loot') * 22,
    heroStoneFind: lv('cm_loot') * 18,
    // Monster ally-wide bonus!
    allyMonsterAllStatPct: lv('cm_bond') * 9,
  };
}
