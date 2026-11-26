import { getClaimedAchievementBonuses } from './achievements';
import { HERO_SPECIES } from './data/monsters';
import type { GameSave, SkillDef } from './types';

export type SkillBranch = 'sword' | 'assassin' | 'void' | 'magic' | 'alchemy' | 'command';

export type SkillNodeKind = 'origin' | 'minor' | 'notable' | 'skill' | 'keystone';

export type KeystoneId =
  | 'resolute_edge'
  | 'blood_magic'
  | 'glass_cannon'
  | 'iron_fortress'
  | 'lone_wolf'
  | 'tamer_sovereign'
  | 'crit_overload'
  | 'eldritch_ward'
  | 'plague_bearer'
  | 'greed_monarch';

export interface SkillNodeEffects {
  heroAtkPct?: number;
  heroMagPct?: number;
  heroDefPct?: number;
  heroHpPct?: number;
  heroSpdFlat?: number;
  heroCritRate?: number;
  heroCritDmg?: number;
  heroDoubleHit?: number;
  heroLifesteal?: number;
  heroRegenPct?: number;
  heroWeaknessBonusPct?: number;
  heroMpRegenBonus?: number;
  heroSkillPowerBonusPct?: number;
  heroArmorPenPct?: number;
  heroStatusDmgBonusPct?: number;
  heroMagicFind?: number;
  heroStoneFind?: number;
  heroGoldFind?: number;
  heroExpFind?: number;
  allyMonsterAllStatPct?: number;
  heroDamageTakenPct?: number; // negative = damage reduction, positive = more damage taken
  heroStartShieldPct?: number;
}

export interface SkillTreeNodeDef {
  id: string;
  branch: SkillBranch | 'origin';
  kind: SkillNodeKind;
  name: string;
  maxLevel: number;
  x: number;
  y: number;
  neighbors: string[];
  desc: string;
  upside?: string;
  downside?: string;
  effects: SkillNodeEffects;
  unlocksSkillId?: string;
  keystoneId?: KeystoneId;
}

export const ORIGIN_NODE_ID = 'origin_rune';
export const SKILL_TREE_CANVAS_SIZE = 1600;
export const SKILL_TREE_CENTER = 800;

export const BRANCH_META: Record<
  SkillBranch,
  { label: string; shortLabel: string; color: string; angleDeg: number }
> = {
  sword: { label: '⚔剣聖', shortLabel: '剣聖', color: '#e6634c', angleDeg: -90 },
  assassin: { label: '⚡迅雷', shortLabel: '迅雷', color: '#f0b842', angleDeg: -30 },
  void: { label: '🌑禁忌', shortLabel: '禁忌', color: '#a864f5', angleDeg: 30 },
  magic: { label: '✦魔導', shortLabel: '魔導', color: '#58b8f5', angleDeg: 90 },
  alchemy: { label: '💎秘宝', shortLabel: '秘宝', color: '#3bc9a8', angleDeg: 150 },
  command: { label: '🛡統率', shortLabel: '統率', color: '#5cc478', angleDeg: 210 },
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

function polar(radius: number, angleDeg: number): { x: number; y: number } {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: Math.round(SKILL_TREE_CENTER + Math.cos(rad) * radius),
    y: Math.round(SKILL_TREE_CENTER + Math.sin(rad) * radius),
  };
}

interface RawNodeSpec {
  id: string;
  branch: SkillBranch | 'origin';
  kind: SkillNodeKind;
  name: string;
  maxLevel: number;
  radius: number;
  angleDeg: number;
  desc: string;
  upside?: string;
  downside?: string;
  effects: SkillNodeEffects;
  unlocksSkillId?: string;
  keystoneId?: KeystoneId;
}

function buildConstellationTree(): {
  nodes: SkillTreeNodeDef[];
  edges: Array<[string, string]>;
} {
  const rawNodes: RawNodeSpec[] = [];
  const rawEdges: Array<[string, string]> = [];

  const addNode = (spec: RawNodeSpec) => {
    rawNodes.push(spec);
  };
  const connect = (a: string, b: string) => {
    rawEdges.push([a, b]);
  };

  // ===== 1. CENTRAL ORIGIN =====
  addNode({
    id: ORIGIN_NODE_ID,
    branch: 'origin',
    kind: 'origin',
    name: '始原のルーン',
    maxLevel: 1,
    radius: 0,
    angleDeg: 0,
    desc: '全ての星座の起点・常時解放',
    effects: {},
  });

  // ===== 2. SIX RADIAL SECTORS (6 x 14 = 84 NODES) =====
  interface SectorConfig {
    branch: SkillBranch;
    prefix: string;
    entry: { name: string; desc: string; effects: SkillNodeEffects };
    inL: { name: string; desc: string; effects: SkillNodeEffects };
    inR: { name: string; desc: string; effects: SkillNodeEffects };
    notL: { name: string; desc: string; effects: SkillNodeEffects };
    notR: { name: string; desc: string; effects: SkillNodeEffects };
    hub: { name: string; desc: string; effects: SkillNodeEffects };
    mid1: {
      kind: 'skill' | 'notable';
      name: string;
      desc: string;
      effects: SkillNodeEffects;
      unlocksSkillId?: string;
    };
    midL: { name: string; desc: string; effects: SkillNodeEffects };
    midR: { name: string; desc: string; effects: SkillNodeEffects };
    outL: { name: string; desc: string; effects: SkillNodeEffects };
    outR: { name: string; desc: string; effects: SkillNodeEffects };
    spine: { name: string; desc: string; effects: SkillNodeEffects };
    apex: {
      kind: 'skill' | 'notable';
      name: string;
      desc: string;
      effects: SkillNodeEffects;
      unlocksSkillId?: string;
    };
    keystone: {
      id: string;
      keystoneId: KeystoneId;
      name: string;
      desc: string;
      upside: string;
      downside: string;
      effects: SkillNodeEffects;
    };
  }

  const sectors: SectorConfig[] = [
    // ----- 1. SWORD (-90°) -----
    {
      branch: 'sword',
      prefix: 'sw',
      entry: { name: '剣士の鍛錬', desc: '攻撃+6%/Lv', effects: { heroAtkPct: 6 } },
      inL: { name: '鋭刃の構え', desc: '攻撃+5%・会心+2%/Lv', effects: { heroAtkPct: 5, heroCritRate: 2 } },
      inR: { name: '剛腕の一撃', desc: '攻撃+6%・HP+4%/Lv', effects: { heroAtkPct: 6, heroHpPct: 4 } },
      notL: {
        name: '剣豪の極み',
        desc: '攻撃+16%・会心+6%・会心倍率+16%',
        effects: { heroAtkPct: 16, heroCritRate: 6, heroCritDmg: 16 },
      },
      notR: {
        name: '斬鉄の剛腕',
        desc: '攻撃+18%・防御貫通+10%',
        effects: { heroAtkPct: 18, heroArmorPenPct: 10 },
      },
      hub: { name: '闘気の循環', desc: '攻撃+5%・吸血+2%/Lv', effects: { heroAtkPct: 5, heroLifesteal: 2 } },
      mid1: {
        kind: 'skill',
        name: '流星乱舞',
        desc: '物理3連撃を解放・攻撃+8%',
        effects: { heroAtkPct: 8 },
        unlocksSkillId: 'meteor_flurry',
      },
      midL: { name: '連撃の呼吸', desc: '追撃+4%・素早さ+2/Lv', effects: { heroDoubleHit: 4, heroSpdFlat: 2 } },
      midR: { name: '鮮血の刃', desc: '吸血+3%・攻撃+5%/Lv', effects: { heroLifesteal: 3, heroAtkPct: 5 } },
      outL: {
        name: '無双乱撃',
        desc: '追撃+12%・会心倍率+22%',
        effects: { heroDoubleHit: 12, heroCritDmg: 22 },
      },
      outR: {
        name: '血塗れの剣聖',
        desc: '攻撃+20%・吸血+9%',
        effects: { heroAtkPct: 20, heroLifesteal: 9 },
      },
      spine: { name: '星剣の修練', desc: '攻撃+7%・貫通+4%/Lv', effects: { heroAtkPct: 7, heroArmorPenPct: 4 } },
      apex: {
        kind: 'skill',
        name: '神速・星砕き',
        desc: 'ボス特効奥義を解放・攻撃+12%',
        effects: { heroAtkPct: 12 },
        unlocksSkillId: 'star_shatter',
      },
      keystone: {
        id: 'ks_resolute_edge',
        keystoneId: 'resolute_edge',
        name: '不動の剛剣',
        desc: '会心不可 / 攻撃+55%・防御貫通+35%',
        upside: '攻撃+55%・防御貫通+35%',
        downside: '会心率が常に0%になる',
        effects: { heroAtkPct: 55, heroArmorPenPct: 35 },
      },
    },

    // ----- 2. ASSASSIN (-30°) -----
    {
      branch: 'assassin',
      prefix: 'as',
      entry: { name: '疾風の歩法', desc: '素早さ+3・会心+2%/Lv', effects: { heroSpdFlat: 3, heroCritRate: 2 } },
      inL: { name: '急所見切り', desc: '会心+3%・会心倍率+8%/Lv', effects: { heroCritRate: 3, heroCritDmg: 8 } },
      inR: { name: '影歩の瞬発', desc: '素早さ+4・追撃+3%/Lv', effects: { heroSpdFlat: 4, heroDoubleHit: 3 } },
      notL: {
        name: '致命の閃光',
        desc: '会心+10%・会心倍率+26%',
        effects: { heroCritRate: 10, heroCritDmg: 26 },
      },
      notR: {
        name: '神速の残像',
        desc: '素早さ+12・追撃+10%・被ダメ-5%',
        effects: { heroSpdFlat: 12, heroDoubleHit: 10, heroDamageTakenPct: -5 },
      },
      hub: { name: '雷鳴の脈動', desc: '攻撃+5%・魔力+5%・素早さ+2/Lv', effects: { heroAtkPct: 5, heroMagPct: 5, heroSpdFlat: 2 } },
      mid1: {
        kind: 'notable',
        name: '迅雷の刻印',
        desc: '追撃+12%・会心+8%・素早さ+8',
        effects: { heroDoubleHit: 12, heroCritRate: 8, heroSpdFlat: 8 },
      },
      midL: { name: '凶刃の冴え', desc: '会心倍率+12%・攻撃+4%/Lv', effects: { heroCritDmg: 12, heroAtkPct: 4 } },
      midR: { name: '虚空の瞬歩', desc: '素早さ+4・貫通+4%/Lv', effects: { heroSpdFlat: 4, heroArmorPenPct: 4 } },
      outL: {
        name: '暗殺者の矜持',
        desc: '会心+12%・会心倍率+32%・貫通+10%',
        effects: { heroCritRate: 12, heroCritDmg: 32, heroArmorPenPct: 10 },
      },
      outR: {
        name: '連迅の極致',
        desc: '追撃+15%・素早さ+14',
        effects: { heroDoubleHit: 15, heroSpdFlat: 14 },
      },
      spine: { name: '雷光加速', desc: '素早さ+5・会心+3%/Lv', effects: { heroSpdFlat: 5, heroCritRate: 3 } },
      apex: {
        kind: 'notable',
        name: '天翔ける星雷',
        desc: '攻撃+16%・魔力+16%・追撃+14%・会心+10%',
        effects: { heroAtkPct: 16, heroMagPct: 16, heroDoubleHit: 14, heroCritRate: 10 },
      },
      keystone: {
        id: 'ks_glass_cannon',
        keystoneId: 'glass_cannon',
        name: '硝子の覇王',
        desc: '被ダメ+35% / 攻撃・魔力+60%・会心倍率+45%',
        upside: '攻撃+60%・魔力+60%・会心倍率+45%',
        downside: '被ダメージ+35%',
        effects: { heroAtkPct: 60, heroMagPct: 60, heroCritDmg: 45, heroDamageTakenPct: 35 },
      },
    },

    // ----- 3. VOID (30°) -----
    {
      branch: 'void',
      prefix: 'vd',
      entry: { name: '破甲の刻印', desc: '防御貫通+5%/Lv', effects: { heroArmorPenPct: 5 } },
      inL: { name: '深淵の蝕み', desc: '状態異常特効+8%/Lv', effects: { heroStatusDmgBonusPct: 8 } },
      inR: { name: '虚無の脈流', desc: '攻撃+5%・魔力+5%/Lv', effects: { heroAtkPct: 5, heroMagPct: 5 } },
      notL: {
        name: '呪詛増幅',
        desc: '状態異常特効+24%・貫通+10%',
        effects: { heroStatusDmgBonusPct: 24, heroArmorPenPct: 10 },
      },
      notR: {
        name: '境界の魔剣',
        desc: '攻撃+14%・魔力+14%・スキル威力+10%',
        effects: { heroAtkPct: 14, heroMagPct: 14, heroSkillPowerBonusPct: 10 },
      },
      hub: { name: '虚無の迅速', desc: '素早さ+3・貫通+4%/Lv', effects: { heroSpdFlat: 3, heroArmorPenPct: 4 } },
      mid1: {
        kind: 'skill',
        name: 'アビスフレイム',
        desc: '全体炎撃・火傷を解放・魔力+8%',
        effects: { heroMagPct: 8 },
        unlocksSkillId: 'abyss_flame',
      },
      midL: { name: '奈落の焼印', desc: '状態異常特効+10%・攻撃+4%/Lv', effects: { heroStatusDmgBonusPct: 10, heroAtkPct: 4 } },
      midR: { name: '崩界の波動', desc: '防御貫通+6%・スキル威力+5%/Lv', effects: { heroArmorPenPct: 6, heroSkillPowerBonusPct: 5 } },
      outL: {
        name: '終末の烙印',
        desc: '状態異常特効+30%・会心+8%',
        effects: { heroStatusDmgBonusPct: 30, heroCritRate: 8 },
      },
      outR: {
        name: '星界貫通',
        desc: '防御貫通+20%・スキル威力+14%',
        effects: { heroArmorPenPct: 20, heroSkillPowerBonusPct: 14 },
      },
      spine: { name: '深淵共鳴', desc: '攻撃+6%・魔力+6%・異常特効+6%/Lv', effects: { heroAtkPct: 6, heroMagPct: 6, heroStatusDmgBonusPct: 6 } },
      apex: {
        kind: 'skill',
        name: '終焉の断罪',
        desc: '状態異常特効奥義を解放・貫通+10%',
        effects: { heroArmorPenPct: 10 },
        unlocksSkillId: 'final_judgment',
      },
      keystone: {
        id: 'ks_lone_wolf',
        keystoneId: 'lone_wolf',
        name: '孤高の覇者',
        desc: '仲間全能力-25% / 主人公全能力+50%・追撃+20%',
        upside: '主人公のHP/攻撃/魔力/防御+50%・追撃+20%',
        downside: '仲間モンスターの全能力-25%',
        effects: {
          heroHpPct: 50,
          heroAtkPct: 50,
          heroMagPct: 50,
          heroDefPct: 50,
          heroDoubleHit: 20,
          allyMonsterAllStatPct: -25,
        },
      },
    },

    // ----- 4. MAGIC (90°) -----
    {
      branch: 'magic',
      prefix: 'mg',
      entry: { name: '星辰の魔力', desc: '魔力+6%/Lv', effects: { heroMagPct: 6 } },
      inL: { name: '弱点看破', desc: 'WEAK+8%・毎T MP+2/Lv', effects: { heroWeaknessBonusPct: 8, heroMpRegenBonus: 2 } },
      inR: { name: '詠唱加速', desc: 'スキル威力+5%・魔力+4%/Lv', effects: { heroSkillPowerBonusPct: 5, heroMagPct: 4 } },
      notL: {
        name: '元素支配',
        desc: 'WEAK+24%・魔力+15%・毎T MP+4',
        effects: { heroWeaknessBonusPct: 24, heroMagPct: 15, heroMpRegenBonus: 4 },
      },
      notR: {
        name: '魔力暴走',
        desc: 'スキル威力+18%・魔力+14%',
        effects: { heroSkillPowerBonusPct: 18, heroMagPct: 14 },
      },
      hub: { name: 'マナの泉脈', desc: '毎T MP+2・魔力+5%/Lv', effects: { heroMpRegenBonus: 2, heroMagPct: 5 } },
      mid1: {
        kind: 'skill',
        name: 'サンダーストーム',
        desc: '全体聖雷魔法を解放・魔力+8%',
        effects: { heroMagPct: 8 },
        unlocksSkillId: 'thunder_storm',
      },
      midL: { name: '星霊の加護', desc: 'WEAK+9%・会心+2%/Lv', effects: { heroWeaknessBonusPct: 9, heroCritRate: 2 } },
      midR: { name: '大魔導の印', desc: 'スキル威力+6%・貫通+4%/Lv', effects: { heroSkillPowerBonusPct: 6, heroArmorPenPct: 4 } },
      outL: {
        name: '星読の賢者',
        desc: 'WEAK+28%・毎T MP+6・会心+6%',
        effects: { heroWeaknessBonusPct: 28, heroMpRegenBonus: 6, heroCritRate: 6 },
      },
      outR: {
        name: '万象収束',
        desc: '魔力+22%・スキル威力+20%',
        effects: { heroMagPct: 22, heroSkillPowerBonusPct: 20 },
      },
      spine: { name: '星核共鳴', desc: '魔力+7%・スキル威力+5%/Lv', effects: { heroMagPct: 7, heroSkillPowerBonusPct: 5 } },
      apex: {
        kind: 'skill',
        name: 'アストラル・ノヴァ',
        desc: '全体星魔法・凍結を解放・魔力+12%',
        effects: { heroMagPct: 12 },
        unlocksSkillId: 'astral_nova',
      },
      keystone: {
        id: 'ks_blood_magic',
        keystoneId: 'blood_magic',
        name: '血の魔導',
        desc: '最大HP-25% / 毎T MP+12・スキル威力+40%',
        upside: '毎ターンMP+12・スキル威力+40%',
        downside: '最大HP-25%',
        effects: { heroMpRegenBonus: 12, heroSkillPowerBonusPct: 40, heroHpPct: -25 },
      },
    },

    // ----- 5. ALCHEMY (150°) -----
    {
      branch: 'alchemy',
      prefix: 'al',
      entry: { name: '秘宝の嗅覚', desc: 'MF+10%・鍛冶石+8%/Lv', effects: { heroMagicFind: 10, heroStoneFind: 8 } },
      inL: { name: '黄金錬成', desc: '金貨+12%・MF+8%/Lv', effects: { heroGoldFind: 12, heroMagicFind: 8 } },
      inR: { name: '叡智の薬瓶', desc: 'EXP+10%・HP再生+2%/Lv', effects: { heroExpFind: 10, heroRegenPct: 2 } },
      notL: {
        name: '大富豪の眼',
        desc: 'MF+26%・金貨+28%・鍛冶石+20%',
        effects: { heroMagicFind: 26, heroGoldFind: 28, heroStoneFind: 20 },
      },
      notR: {
        name: '賢者の霊薬',
        desc: 'EXP+25%・HP再生+5%・毎T MP+4',
        effects: { heroExpFind: 25, heroRegenPct: 5, heroMpRegenBonus: 4 },
      },
      hub: { name: '鍛冶炉の祝福', desc: '鍛冶石+10%・HP+5%/Lv', effects: { heroStoneFind: 10, heroHpPct: 5 } },
      mid1: {
        kind: 'notable',
        name: 'トレハン大師',
        desc: 'MF+32%・鍛冶石+25%・仲間全能力+8%',
        effects: { heroMagicFind: 32, heroStoneFind: 25, allyMonsterAllStatPct: 8 },
      },
      midL: { name: '秘石採掘', desc: '鍛冶石+12%・MF+8%/Lv', effects: { heroStoneFind: 12, heroMagicFind: 8 } },
      midR: { name: '不老の秘薬', desc: 'HP+6%・HP再生+2%/Lv', effects: { heroHpPct: 6, heroRegenPct: 2 } },
      outL: {
        name: '神話発掘者',
        desc: 'MF+40%・鍛冶石+32%',
        effects: { heroMagicFind: 40, heroStoneFind: 32 },
      },
      outR: {
        name: '生命のエリクサー',
        desc: 'HP+18%・HP再生+6%・被ダメ-6%',
        effects: { heroHpPct: 18, heroRegenPct: 6, heroDamageTakenPct: -6 },
      },
      spine: { name: '錬金の極意', desc: 'MF+12%・EXP+10%・金貨+10%/Lv', effects: { heroMagicFind: 12, heroExpFind: 10, heroGoldFind: 10 } },
      apex: {
        kind: 'notable',
        name: '賢者の石',
        desc: 'MF+45%・鍛冶石+40%・攻撃+12%・魔力+12%',
        effects: { heroMagicFind: 45, heroStoneFind: 40, heroAtkPct: 12, heroMagPct: 12 },
      },
      keystone: {
        id: 'ks_tamer_sovereign',
        keystoneId: 'tamer_sovereign',
        name: '百獣の王冠',
        desc: '主人公火力-25% / 仲間モンスター全能力+45%',
        upside: '仲間モンスターの全能力+45%',
        downside: '主人公の攻撃・魔力-25%',
        effects: { allyMonsterAllStatPct: 45, heroAtkPct: -25, heroMagPct: -25 },
      },
    },

    // ----- 6. COMMAND (210°) -----
    {
      branch: 'command',
      prefix: 'cm',
      entry: { name: '鉄壁の心', desc: 'HP+7%・防御+6%/Lv', effects: { heroHpPct: 7, heroDefPct: 6 } },
      inL: { name: 'テイマーの絆', desc: '仲間全能力+5%/Lv', effects: { allyMonsterAllStatPct: 5 } },
      inR: { name: '堅守の盾', desc: '防御+7%・被ダメ-2%/Lv', effects: { heroDefPct: 7, heroDamageTakenPct: -2 } },
      notL: {
        name: '獣王の指揮',
        desc: '仲間全能力+16%・HP+12%',
        effects: { allyMonsterAllStatPct: 16, heroHpPct: 12 },
      },
      notR: {
        name: '金剛不壊',
        desc: '防御+22%・HP+16%・被ダメ-7%',
        effects: { heroDefPct: 22, heroHpPct: 16, heroDamageTakenPct: -7 },
      },
      hub: { name: '守護の誓い', desc: 'HP+6%・仲間全能力+4%/Lv', effects: { heroHpPct: 6, allyMonsterAllStatPct: 4 } },
      mid1: {
        kind: 'skill',
        name: '聖光の守護陣',
        desc: '全体バリアを解放・防御+10%',
        effects: { heroDefPct: 10 },
        unlocksSkillId: 'sacred_aegis',
      },
      midL: { name: '共鳴の咆哮', desc: '仲間全能力+6%/Lv', effects: { allyMonsterAllStatPct: 6 } },
      midR: { name: '城塞の構え', desc: 'HP+8%・防御+7%/Lv', effects: { heroHpPct: 8, heroDefPct: 7 } },
      outL: {
        name: '百獣連帯',
        desc: '仲間全能力+20%・HP再生+4%',
        effects: { allyMonsterAllStatPct: 20, heroRegenPct: 4 },
      },
      outR: {
        name: '聖騎士の鎧',
        desc: '防御+26%・被ダメ-9%・開幕シールド+12%',
        effects: { heroDefPct: 26, heroDamageTakenPct: -9, heroStartShieldPct: 12 },
      },
      spine: { name: '不屈の統率', desc: 'HP+8%・仲間全能力+5%/Lv', effects: { heroHpPct: 8, allyMonsterAllStatPct: 5 } },
      apex: {
        kind: 'skill',
        name: '不滅の号令',
        desc: '全体火力UP・回復を解放・仲間+10%',
        effects: { allyMonsterAllStatPct: 10 },
        unlocksSkillId: 'immortal_order',
      },
      keystone: {
        id: 'ks_iron_fortress',
        keystoneId: 'iron_fortress',
        name: '不落の要塞',
        desc: '素早さ-18 / 防御+65%・HP+40%・被ダメ-18%',
        upside: '防御+65%・最大HP+40%・被ダメ-18%',
        downside: '素早さ-18',
        effects: { heroDefPct: 65, heroHpPct: 40, heroDamageTakenPct: -18, heroSpdFlat: -18 },
      },
    },
  ];

  for (const s of sectors) {
    const a = BRANCH_META[s.branch].angleDeg;
    const p = s.prefix;

    addNode({ id: `${p}_entry`, branch: s.branch, kind: 'minor', name: s.entry.name, maxLevel: 2, radius: 130, angleDeg: a, desc: s.entry.desc, effects: s.entry.effects });
    addNode({ id: `${p}_inL`, branch: s.branch, kind: 'minor', name: s.inL.name, maxLevel: 2, radius: 225, angleDeg: a - 14, desc: s.inL.desc, effects: s.inL.effects });
    addNode({ id: `${p}_inR`, branch: s.branch, kind: 'minor', name: s.inR.name, maxLevel: 2, radius: 225, angleDeg: a + 14, desc: s.inR.desc, effects: s.inR.effects });
    addNode({ id: `${p}_notL`, branch: s.branch, kind: 'notable', name: s.notL.name, maxLevel: 1, radius: 315, angleDeg: a - 19, desc: s.notL.desc, effects: s.notL.effects });
    addNode({ id: `${p}_notR`, branch: s.branch, kind: 'notable', name: s.notR.name, maxLevel: 1, radius: 315, angleDeg: a + 19, desc: s.notR.desc, effects: s.notR.effects });
    addNode({ id: `${p}_hub`, branch: s.branch, kind: 'minor', name: s.hub.name, maxLevel: 2, radius: 315, angleDeg: a, desc: s.hub.desc, effects: s.hub.effects });
    addNode({
      id: `${p}_mid1`,
      branch: s.branch,
      kind: s.mid1.kind,
      name: s.mid1.name,
      maxLevel: 1,
      radius: 405,
      angleDeg: a,
      desc: s.mid1.desc,
      effects: s.mid1.effects,
      unlocksSkillId: s.mid1.unlocksSkillId,
    });
    addNode({ id: `${p}_midL`, branch: s.branch, kind: 'minor', name: s.midL.name, maxLevel: 2, radius: 465, angleDeg: a - 16, desc: s.midL.desc, effects: s.midL.effects });
    addNode({ id: `${p}_midR`, branch: s.branch, kind: 'minor', name: s.midR.name, maxLevel: 2, radius: 465, angleDeg: a + 16, desc: s.midR.desc, effects: s.midR.effects });
    addNode({ id: `${p}_outL`, branch: s.branch, kind: 'notable', name: s.outL.name, maxLevel: 1, radius: 550, angleDeg: a - 16, desc: s.outL.desc, effects: s.outL.effects });
    addNode({ id: `${p}_outR`, branch: s.branch, kind: 'notable', name: s.outR.name, maxLevel: 1, radius: 550, angleDeg: a + 16, desc: s.outR.desc, effects: s.outR.effects });
    addNode({ id: `${p}_spine`, branch: s.branch, kind: 'minor', name: s.spine.name, maxLevel: 2, radius: 555, angleDeg: a, desc: s.spine.desc, effects: s.spine.effects });
    addNode({
      id: `${p}_apex`,
      branch: s.branch,
      kind: s.apex.kind,
      name: s.apex.name,
      maxLevel: 1,
      radius: 640,
      angleDeg: a,
      desc: s.apex.desc,
      effects: s.apex.effects,
      unlocksSkillId: s.apex.unlocksSkillId,
    });
    addNode({
      id: s.keystone.id,
      branch: s.branch,
      kind: 'keystone',
      name: s.keystone.name,
      maxLevel: 1,
      radius: 730,
      angleDeg: a,
      desc: s.keystone.desc,
      upside: s.keystone.upside,
      downside: s.keystone.downside,
      effects: s.keystone.effects,
      keystoneId: s.keystone.keystoneId,
    });

    // Sector internal graph (PoE wheel + twin lanes)
    connect(ORIGIN_NODE_ID, `${p}_entry`);
    connect(`${p}_entry`, `${p}_inL`);
    connect(`${p}_entry`, `${p}_inR`);
    connect(`${p}_inL`, `${p}_notL`);
    connect(`${p}_inR`, `${p}_notR`);
    connect(`${p}_inL`, `${p}_hub`);
    connect(`${p}_inR`, `${p}_hub`);
    connect(`${p}_notL`, `${p}_hub`);
    connect(`${p}_notR`, `${p}_hub`);
    connect(`${p}_hub`, `${p}_mid1`);
    connect(`${p}_notL`, `${p}_midL`);
    connect(`${p}_notR`, `${p}_midR`);
    connect(`${p}_mid1`, `${p}_midL`);
    connect(`${p}_mid1`, `${p}_midR`);
    connect(`${p}_midL`, `${p}_outL`);
    connect(`${p}_midR`, `${p}_outR`);
    connect(`${p}_midL`, `${p}_spine`);
    connect(`${p}_midR`, `${p}_spine`);
    connect(`${p}_outL`, `${p}_apex`);
    connect(`${p}_outR`, `${p}_apex`);
    connect(`${p}_spine`, `${p}_apex`);
    connect(`${p}_apex`, s.keystone.id);
  }

  // ===== 3. SIX OUTER RING BRIDGES (6 x 3 = 18 NODES, INCLUDING 4 HYBRID KEYSTONES) =====
  interface BridgeConfig {
    id: string;
    angleDeg: number;
    leftPrefix: string;
    rightPrefix: string;
    branch: SkillBranch;
    inNode: { name: string; desc: string; effects: SkillNodeEffects };
    outNode: { name: string; desc: string; effects: SkillNodeEffects };
    rimNode: {
      id: string;
      kind: 'keystone' | 'notable';
      keystoneId?: KeystoneId;
      name: string;
      desc: string;
      upside?: string;
      downside?: string;
      effects: SkillNodeEffects;
    };
  }

  const bridges: BridgeConfig[] = [
    // Sword (-90) <-> Assassin (-30) at -60°
    {
      id: 'br_sw_as',
      angleDeg: -60,
      leftPrefix: 'sw',
      rightPrefix: 'as',
      branch: 'sword',
      inNode: { name: '閃剣の渡り', desc: '攻撃+5%・会心+3%/Lv', effects: { heroAtkPct: 5, heroCritRate: 3 } },
      outNode: { name: '裂空の歩み', desc: '会心倍率+10%・追撃+4%/Lv', effects: { heroCritDmg: 10, heroDoubleHit: 4 } },
      rimNode: {
        id: 'ks_crit_overload',
        kind: 'keystone',
        keystoneId: 'crit_overload',
        name: '臨界超過',
        desc: '防御-25%・被ダメ+15% / 会心+35%・会心倍率+60%',
        upside: '会心率+35%・会心倍率+60%',
        downside: '防御-25%・被ダメージ+15%',
        effects: { heroCritRate: 35, heroCritDmg: 60, heroDefPct: -25, heroDamageTakenPct: 15 },
      },
    },
    // Assassin (-30) <-> Void (30) at 0°
    {
      id: 'br_as_vd',
      angleDeg: 0,
      leftPrefix: 'as',
      rightPrefix: 'vd',
      branch: 'assassin',
      inNode: { name: '影蝕の回路', desc: '素早さ+3・異常特効+7%/Lv', effects: { heroSpdFlat: 3, heroStatusDmgBonusPct: 7 } },
      outNode: { name: '虚影の刃', desc: '貫通+6%・会心+3%/Lv', effects: { heroArmorPenPct: 6, heroCritRate: 3 } },
      rimNode: {
        id: 'not_shadow_void',
        kind: 'notable',
        name: '宵闇の双刃',
        desc: '追撃+14%・防御貫通+16%・異常特効+18%',
        effects: { heroDoubleHit: 14, heroArmorPenPct: 16, heroStatusDmgBonusPct: 18 },
      },
    },
    // Void (30) <-> Magic (90) at 60°
    {
      id: 'br_vd_mg',
      angleDeg: 60,
      leftPrefix: 'vd',
      rightPrefix: 'mg',
      branch: 'void',
      inNode: { name: '星蝕の詠唱', desc: '魔力+5%・異常特効+7%/Lv', effects: { heroMagPct: 5, heroStatusDmgBonusPct: 7 } },
      outNode: { name: '災厄の魔紋', desc: 'スキル威力+6%・貫通+5%/Lv', effects: { heroSkillPowerBonusPct: 6, heroArmorPenPct: 5 } },
      rimNode: {
        id: 'ks_plague_bearer',
        kind: 'keystone',
        keystoneId: 'plague_bearer',
        name: '災厄の伝播',
        desc: '攻撃・魔力-15% / 状態異常特効+75%・貫通+25%',
        upside: '状態異常特効+75%・防御貫通+25%',
        downside: '攻撃-15%・魔力-15%',
        effects: { heroStatusDmgBonusPct: 75, heroArmorPenPct: 25, heroAtkPct: -15, heroMagPct: -15 },
      },
    },
    // Magic (90) <-> Alchemy (150) at 120°
    {
      id: 'br_mg_al',
      angleDeg: 120,
      leftPrefix: 'mg',
      rightPrefix: 'al',
      branch: 'magic',
      inNode: { name: '星晶の蒸留', desc: '魔力+5%・MF+9%/Lv', effects: { heroMagPct: 5, heroMagicFind: 9 } },
      outNode: { name: '魔導障壁', desc: '開幕シールド+8%・毎T MP+2/Lv', effects: { heroStartShieldPct: 8, heroMpRegenBonus: 2 } },
      rimNode: {
        id: 'ks_eldritch_ward',
        kind: 'keystone',
        keystoneId: 'eldritch_ward',
        name: '星界の防壁',
        desc: '吸血無効 / 開幕シールド+35%・魔力+35%',
        upside: '戦闘開始時シールド(最大HP35%)・魔力+35%',
        downside: '吸血効果が常に0%になる',
        effects: { heroStartShieldPct: 35, heroMagPct: 35 },
      },
    },
    // Alchemy (150) <-> Command (210) at 180°
    {
      id: 'br_al_cm',
      angleDeg: 180,
      leftPrefix: 'al',
      rightPrefix: 'cm',
      branch: 'alchemy',
      inNode: { name: '兵站の知恵', desc: '仲間全能力+4%・MF+8%/Lv', effects: { allyMonsterAllStatPct: 4, heroMagicFind: 8 } },
      outNode: { name: '黄金の陣形', desc: 'HP+6%・鍛冶石+10%/Lv', effects: { heroHpPct: 6, heroStoneFind: 10 } },
      rimNode: {
        id: 'ks_greed_monarch',
        kind: 'keystone',
        keystoneId: 'greed_monarch',
        name: '強欲の玉座',
        desc: '被ダメ+20% / MF+80%・鍛冶石+60%・金貨+50%',
        upside: 'MF+80%・鍛冶石+60%・金貨+50%',
        downside: '被ダメージ+20%',
        effects: { heroMagicFind: 80, heroStoneFind: 60, heroGoldFind: 50, heroDamageTakenPct: 20 },
      },
    },
    // Command (210) <-> Sword (270 / -90) at 240°
    {
      id: 'br_cm_sw',
      angleDeg: 240,
      leftPrefix: 'cm',
      rightPrefix: 'sw',
      branch: 'command',
      inNode: { name: '騎士団の誓い', desc: '攻撃+5%・防御+5%/Lv', effects: { heroAtkPct: 5, heroDefPct: 5 } },
      outNode: { name: '覇王の進軍', desc: 'HP+6%・攻撃+5%・仲間+4%/Lv', effects: { heroHpPct: 6, heroAtkPct: 5, allyMonsterAllStatPct: 4 } },
      rimNode: {
        id: 'not_golden_aegis',
        kind: 'notable',
        name: '聖王の双璧',
        desc: '攻撃+16%・防御+18%・仲間全能力+14%',
        effects: { heroAtkPct: 16, heroDefPct: 18, allyMonsterAllStatPct: 14 },
      },
    },
  ];

  for (const br of bridges) {
    const inId = `${br.id}_in`;
    const outId = `${br.id}_out`;

    addNode({
      id: inId,
      branch: br.branch,
      kind: 'minor',
      name: br.inNode.name,
      maxLevel: 2,
      radius: 365,
      angleDeg: br.angleDeg,
      desc: br.inNode.desc,
      effects: br.inNode.effects,
    });
    addNode({
      id: outId,
      branch: br.branch,
      kind: 'minor',
      name: br.outNode.name,
      maxLevel: 2,
      radius: 530,
      angleDeg: br.angleDeg,
      desc: br.outNode.desc,
      effects: br.outNode.effects,
    });
    addNode({
      id: br.rimNode.id,
      branch: br.branch,
      kind: br.rimNode.kind,
      name: br.rimNode.name,
      maxLevel: 1,
      radius: 675,
      angleDeg: br.angleDeg,
      desc: br.rimNode.desc,
      upside: br.rimNode.upside,
      downside: br.rimNode.downside,
      effects: br.rimNode.effects,
      keystoneId: br.rimNode.keystoneId,
    });

    connect(`${br.leftPrefix}_notR`, inId);
    connect(`${br.rightPrefix}_notL`, inId);
    connect(inId, outId);
    connect(`${br.leftPrefix}_outR`, outId);
    connect(`${br.rightPrefix}_outL`, outId);
    connect(outId, br.rimNode.id);
  }

  // Build symmetric neighbor lists
  const adj = new Map<string, Set<string>>();
  for (const n of rawNodes) {
    adj.set(n.id, new Set<string>());
  }
  const uniqueEdges: Array<[string, string]> = [];
  const edgeKeys = new Set<string>();

  for (const [u, v] of rawEdges) {
    if (!adj.has(u) || !adj.has(v) || u === v) continue;
    adj.get(u)!.add(v);
    adj.get(v)!.add(u);
    const key = u < v ? `${u}|${v}` : `${v}|${u}`;
    if (!edgeKeys.has(key)) {
      edgeKeys.add(key);
      uniqueEdges.push([u, v]);
    }
  }

  const nodes: SkillTreeNodeDef[] = rawNodes.map((r) => {
    const pos = polar(r.radius, r.angleDeg);
    return {
      id: r.id,
      branch: r.branch,
      kind: r.kind,
      name: r.name,
      maxLevel: r.maxLevel,
      x: pos.x,
      y: pos.y,
      neighbors: Array.from(adj.get(r.id) ?? []),
      desc: r.desc,
      upside: r.upside,
      downside: r.downside,
      effects: r.effects,
      unlocksSkillId: r.unlocksSkillId,
      keystoneId: r.keystoneId,
    };
  });

  return { nodes, edges: uniqueEdges };
}

const BUILT_TREE = buildConstellationTree();

export const SKILL_TREE_NODES: SkillTreeNodeDef[] = BUILT_TREE.nodes;
export const SKILL_TREE_EDGES: Array<[string, string]> = BUILT_TREE.edges;

export const SKILL_NODE_MAP: Record<string, SkillTreeNodeDef> = Object.fromEntries(
  SKILL_TREE_NODES.map((n) => [n.id, n]),
);

export function sanitizeSkillTree(raw: Record<string, number> | undefined | null): Record<string, number> {
  if (!raw || typeof raw !== 'object') return {};
  const cleaned: Record<string, number> = {};
  for (const [id, lv] of Object.entries(raw)) {
    const def = SKILL_NODE_MAP[id];
    if (!def || def.kind === 'origin') continue;
    const safeLv = Math.min(def.maxLevel, Math.max(0, Math.floor(Number(lv) || 0)));
    if (safeLv > 0) cleaned[id] = safeLv;
  }
  return cleaned;
}

export function getTotalEarnedSp(
  save: Pick<GameSave, 'roster' | 'maxUnlockedTier' | 'claimedAchievements'> & {
    stats?: Pick<GameSave['stats'], 'highestFloorReached'>;
  },
): number {
  const heroLv = save.roster.hero?.level ?? 1;
  const ach = getClaimedAchievementBonuses(save);
  const highestFloor = save.stats?.highestFloorReached ?? 1;
  const floorSp = Math.floor(Math.max(0, highestFloor - 1) / 3);
  return heroLv * 2 + Math.max(0, save.maxUnlockedTier - 1) * 6 + floorSp + ach.bonusSp;
}

export function getSpentSp(save: Pick<GameSave, 'heroSkillTree'>): number {
  let sum = 0;
  for (const [id, lv] of Object.entries(save.heroSkillTree ?? {})) {
    if (id === ORIGIN_NODE_ID || !SKILL_NODE_MAP[id]) continue;
    sum += Math.max(0, lv);
  }
  return sum;
}

export function getAvailableSp(
  save: Pick<GameSave, 'roster' | 'maxUnlockedTier' | 'claimedAchievements' | 'heroSkillTree'> & {
    stats?: Pick<GameSave['stats'], 'highestFloorReached'>;
  },
): number {
  return Math.max(0, getTotalEarnedSp(save) - getSpentSp(save));
}

export function isNodeAllocated(
  tree: Record<string, number> | undefined,
  nodeId: string,
): boolean {
  if (nodeId === ORIGIN_NODE_ID) return true;
  return (tree?.[nodeId] ?? 0) > 0;
}

export function canUpgradeSkillNode(
  save: Pick<GameSave, 'roster' | 'maxUnlockedTier' | 'claimedAchievements' | 'heroSkillTree'> & {
    stats?: Pick<GameSave['stats'], 'highestFloorReached'>;
  },
  nodeId: string,
): boolean {
  const def = SKILL_NODE_MAP[nodeId];
  if (!def || def.kind === 'origin') return false;
  if (getAvailableSp(save) <= 0) return false;
  const cur = save.heroSkillTree[nodeId] ?? 0;
  if (cur >= def.maxLevel) return false;
  if (cur > 0) return true;
  // Level 0 -> 1 requires at least one allocated neighbor (or Origin)
  return def.neighbors.some((nb) => isNodeAllocated(save.heroSkillTree, nb));
}

export function canRefundSkillNode(
  save: Pick<GameSave, 'heroSkillTree'>,
  nodeId: string,
): boolean {
  const def = SKILL_NODE_MAP[nodeId];
  if (!def || def.kind === 'origin') return false;
  const cur = save.heroSkillTree[nodeId] ?? 0;
  if (cur <= 0) return false;
  if (cur > 1) return true;

  // Removing the last point must keep all remaining allocated nodes connected to ORIGIN_NODE_ID
  const remaining = new Set<string>();
  for (const [id, lv] of Object.entries(save.heroSkillTree ?? {})) {
    if (id !== nodeId && id !== ORIGIN_NODE_ID && lv > 0 && SKILL_NODE_MAP[id]) {
      remaining.add(id);
    }
  }
  if (remaining.size === 0) return true;

  const visited = new Set<string>([ORIGIN_NODE_ID]);
  const queue: string[] = [ORIGIN_NODE_ID];
  while (queue.length > 0) {
    const curId = queue.shift()!;
    const curDef = SKILL_NODE_MAP[curId];
    if (!curDef) continue;
    for (const nb of curDef.neighbors) {
      if (!visited.has(nb) && remaining.has(nb)) {
        visited.add(nb);
        queue.push(nb);
      }
    }
  }
  return visited.size - 1 === remaining.size;
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

export interface ComputedSkillTreeBonuses {
  heroAtkPct: number;
  heroMagPct: number;
  heroDefPct: number;
  heroHpPct: number;
  heroSpdFlat: number;
  heroCritRate: number;
  heroCritDmg: number;
  heroDoubleHit: number;
  heroLifesteal: number;
  heroRegenPct: number;
  heroWeaknessBonusPct: number;
  heroMpRegenBonus: number;
  heroSkillPowerBonusPct: number;
  heroArmorPenPct: number;
  heroStatusDmgBonusPct: number;
  heroMagicFind: number;
  heroStoneFind: number;
  heroGoldFind: number;
  heroExpFind: number;
  allyMonsterAllStatPct: number;
  heroDamageTakenPct: number;
  heroStartShieldPct: number;
  activeKeystones: KeystoneId[];
}

export function computeSkillTreeBonuses(
  save: Pick<GameSave, 'heroSkillTree'>,
): ComputedSkillTreeBonuses {
  const t = save.heroSkillTree ?? {};
  const acc: ComputedSkillTreeBonuses = {
    heroAtkPct: 0,
    heroMagPct: 0,
    heroDefPct: 0,
    heroHpPct: 0,
    heroSpdFlat: 0,
    heroCritRate: 0,
    heroCritDmg: 0,
    heroDoubleHit: 0,
    heroLifesteal: 0,
    heroRegenPct: 0,
    heroWeaknessBonusPct: 0,
    heroMpRegenBonus: 0,
    heroSkillPowerBonusPct: 0,
    heroArmorPenPct: 0,
    heroStatusDmgBonusPct: 0,
    heroMagicFind: 0,
    heroStoneFind: 0,
    heroGoldFind: 0,
    heroExpFind: 0,
    allyMonsterAllStatPct: 0,
    heroDamageTakenPct: 0,
    heroStartShieldPct: 0,
    activeKeystones: [],
  };

  for (const [id, rawLv] of Object.entries(t)) {
    const def = SKILL_NODE_MAP[id];
    if (!def || def.kind === 'origin') continue;
    const lv = Math.min(def.maxLevel, Math.max(0, Math.floor(rawLv || 0)));
    if (lv <= 0) continue;

    const e = def.effects;
    if (e.heroAtkPct) acc.heroAtkPct += e.heroAtkPct * lv;
    if (e.heroMagPct) acc.heroMagPct += e.heroMagPct * lv;
    if (e.heroDefPct) acc.heroDefPct += e.heroDefPct * lv;
    if (e.heroHpPct) acc.heroHpPct += e.heroHpPct * lv;
    if (e.heroSpdFlat) acc.heroSpdFlat += e.heroSpdFlat * lv;
    if (e.heroCritRate) acc.heroCritRate += e.heroCritRate * lv;
    if (e.heroCritDmg) acc.heroCritDmg += e.heroCritDmg * lv;
    if (e.heroDoubleHit) acc.heroDoubleHit += e.heroDoubleHit * lv;
    if (e.heroLifesteal) acc.heroLifesteal += e.heroLifesteal * lv;
    if (e.heroRegenPct) acc.heroRegenPct += e.heroRegenPct * lv;
    if (e.heroWeaknessBonusPct) acc.heroWeaknessBonusPct += e.heroWeaknessBonusPct * lv;
    if (e.heroMpRegenBonus) acc.heroMpRegenBonus += e.heroMpRegenBonus * lv;
    if (e.heroSkillPowerBonusPct) acc.heroSkillPowerBonusPct += e.heroSkillPowerBonusPct * lv;
    if (e.heroArmorPenPct) acc.heroArmorPenPct += e.heroArmorPenPct * lv;
    if (e.heroStatusDmgBonusPct) acc.heroStatusDmgBonusPct += e.heroStatusDmgBonusPct * lv;
    if (e.heroMagicFind) acc.heroMagicFind += e.heroMagicFind * lv;
    if (e.heroStoneFind) acc.heroStoneFind += e.heroStoneFind * lv;
    if (e.heroGoldFind) acc.heroGoldFind += e.heroGoldFind * lv;
    if (e.heroExpFind) acc.heroExpFind += e.heroExpFind * lv;
    if (e.allyMonsterAllStatPct) acc.allyMonsterAllStatPct += e.allyMonsterAllStatPct * lv;
    if (e.heroDamageTakenPct) acc.heroDamageTakenPct += e.heroDamageTakenPct * lv;
    if (e.heroStartShieldPct) acc.heroStartShieldPct += e.heroStartShieldPct * lv;

    if (def.keystoneId) {
      acc.activeKeystones.push(def.keystoneId);
    }
  }

  return acc;
}
