import type {
  Affix,
  AffixStat,
  EquipmentItem,
  EquipSlot,
  Rarity,
  SetId,
  UniqueEffectId,
} from '../types';

export interface RarityMeta {
  id: Rarity;
  label: string;
  shortLabel: string;
  color: string;
  bg: string;
  border: string;
  powerMult: number;
  affixCount: number;
  sellMult: number;
  salvageBase: number;
  rank: number;
}

export const RARITY_ORDER: Rarity[] = [
  'common',
  'uncommon',
  'rare',
  'epic',
  'legendary',
  'mythic',
];

export const RARITY_META: Record<Rarity, RarityMeta> = {
  common: {
    id: 'common',
    label: 'コモン',
    shortLabel: 'C',
    color: '#d8d5cc',
    bg: 'rgba(120, 118, 112, 0.2)',
    border: '#7d7a72',
    powerMult: 1.0,
    affixCount: 0,
    sellMult: 1,
    salvageBase: 1,
    rank: 0,
  },
  uncommon: {
    id: 'uncommon',
    label: 'アンコモン',
    shortLabel: 'UC',
    color: '#6ee07c',
    bg: 'rgba(66, 166, 82, 0.2)',
    border: '#49a858',
    powerMult: 1.22,
    affixCount: 1,
    sellMult: 2,
    salvageBase: 2,
    rank: 1,
  },
  rare: {
    id: 'rare',
    label: 'レア',
    shortLabel: 'R',
    color: '#68b8ff',
    bg: 'rgba(54, 128, 204, 0.22)',
    border: '#4898e6',
    powerMult: 1.5,
    affixCount: 2,
    sellMult: 4,
    salvageBase: 4,
    rank: 2,
  },
  epic: {
    id: 'epic',
    label: 'エピック',
    shortLabel: 'E',
    color: '#e69cff',
    bg: 'rgba(156, 84, 196, 0.24)',
    border: '#b565db',
    powerMult: 1.9,
    affixCount: 3,
    sellMult: 8,
    salvageBase: 8,
    rank: 3,
  },
  legendary: {
    id: 'legendary',
    label: 'レジェンド',
    shortLabel: 'L',
    color: '#ffb84d',
    bg: 'rgba(219, 138, 36, 0.24)',
    border: '#e89b2d',
    powerMult: 2.45,
    affixCount: 4,
    sellMult: 18,
    salvageBase: 16,
    rank: 4,
  },
  mythic: {
    id: 'mythic',
    label: 'ミシック',
    shortLabel: 'M',
    color: '#ff6e7f',
    bg: 'rgba(224, 67, 94, 0.28)',
    border: '#ff7084',
    powerMult: 3.25,
    affixCount: 5,
    sellMult: 40,
    salvageBase: 34,
    rank: 5,
  },
};

export const SLOT_LABELS: Record<EquipSlot, string> = {
  weapon: '武器',
  armor: '防具',
  relic: '遺物',
  rune: 'ルーン',
};

// ===== 6 EQUIPMENT SETS (2pc & 4pc bonuses) =====
export interface SetDef {
  id: SetId;
  name: string;
  color: string;
  bonus2Desc: string;
  bonus4Desc: string;
}

export const SET_LIST: SetDef[] = [
  {
    id: 'forest_guard',
    name: '森の守護',
    color: '#63d471',
    bonus2Desc: '最大HP+18%',
    bonus4Desc: '毎T再生+8%＆被ダメージ-12%',
  },
  {
    id: 'ancient_rune',
    name: '古代ルーン',
    color: '#69c9e8',
    bonus2Desc: '防御+22%',
    bonus4Desc: '開幕バリア+25%＆防御の30%を攻魔へ加算',
  },
  {
    id: 'crimson_fury',
    name: '紅蓮の狂戦',
    color: '#ff785a',
    bonus2Desc: '攻撃+20%',
    bonus4Desc: '会心倍率+50%＆吸血+10%',
  },
  {
    id: 'astral_mage',
    name: '星屑の魔導',
    color: '#7da8ff',
    bonus2Desc: '魔力+22%',
    bonus4Desc: 'スキル威力+28%＆毎T MP+8',
  },
  {
    id: 'golden_greed',
    name: '黄金トレハン',
    color: '#ffd65c',
    bonus2Desc: 'トレハン+35%',
    bonus4Desc: '金貨+45%・EXP+35%・鍛冶石獲得+40%',
  },
  {
    id: 'lunar_blade',
    name: '銀月の連撃',
    color: '#d4b8ff',
    bonus2Desc: '素早さ+10＆会心率+10%',
    bonus4Desc: '追撃率+22%＆物理攻撃+20%',
  },
];

export const SET_MAP: Record<SetId, SetDef> = Object.fromEntries(
  SET_LIST.map((s) => [s.id, s]),
) as Record<SetId, SetDef>;

interface BaseTemplate {
  name: string;
  slot: EquipSlot;
  iconKey: string;
  weights: { atk?: number; mag?: number; def?: number; hp?: number; spd?: number };
}

const BASE_TEMPLATES: Record<EquipSlot, BaseTemplate[]> = {
  weapon: [
    { name: 'ルーンソード', slot: 'weapon', iconKey: 'sword', weights: { atk: 1.15, mag: 0.35 } },
    { name: '古樹の大杖', slot: 'weapon', iconKey: 'staff', weights: { mag: 1.25, atk: 0.2 } },
    { name: '紅蓮の戦斧', slot: 'weapon', iconKey: 'axe', weights: { atk: 1.35, hp: 0.6 } },
    { name: '疾風の双短剣', slot: 'weapon', iconKey: 'dagger', weights: { atk: 0.95, spd: 0.45 } },
  ],
  armor: [
    { name: '旅人の革鎧', slot: 'armor', iconKey: 'armor', weights: { def: 1.0, hp: 2.6 } },
    { name: '騎士の白銀鎧', slot: 'armor', iconKey: 'plate', weights: { def: 1.35, hp: 2.2 } },
    { name: '賢者の星衣', slot: 'armor', iconKey: 'robe', weights: { def: 0.8, mag: 0.55, hp: 2.0 } },
  ],
  relic: [
    { name: '太陽の護符', slot: 'relic', iconKey: 'amulet', weights: { hp: 2.2, atk: 0.45, mag: 0.45 } },
    { name: '旅人の羅針盤', slot: 'relic', iconKey: 'compass', weights: { spd: 0.5, atk: 0.5, def: 0.4 } },
    { name: '黄金の聖杯', slot: 'relic', iconKey: 'chalice', weights: { hp: 3.0, mag: 0.55 } },
  ],
  rune: [
    { name: '剛力の刻印石', slot: 'rune', iconKey: 'rune_red', weights: { atk: 0.85, hp: 1.2 } },
    { name: '星光の刻印石', slot: 'rune', iconKey: 'rune_blue', weights: { mag: 0.9, spd: 0.35 } },
    { name: '守護の刻印石', slot: 'rune', iconKey: 'rune_green', weights: { def: 0.85, hp: 2.1 } },
  ],
};

const PREFIXES: Record<Rarity, string[]> = {
  common: ['素朴な', '古びた', '旅の'],
  uncommon: ['良質な', '研がれた', '森の'],
  rare: ['精巧な', '蒼輝の', '古代の'],
  epic: ['英雄の', '秘宝の', '星導の'],
  legendary: ['王家の', '覇王の', '太陽の'],
  mythic: ['神話の', '創世の', '星神の'],
};

interface AffixDef {
  stat: AffixStat;
  label: string;
  min: number;
  max: number;
  scalePerLevel: number;
  isPercent: boolean;
}

const AFFIX_POOL: AffixDef[] = [
  { stat: 'atkPct', label: '攻撃', min: 5, max: 14, scalePerLevel: 0.25, isPercent: true },
  { stat: 'magPct', label: '魔力', min: 5, max: 14, scalePerLevel: 0.25, isPercent: true },
  { stat: 'defPct', label: '防御', min: 5, max: 14, scalePerLevel: 0.22, isPercent: true },
  { stat: 'hpPct', label: '最大HP', min: 6, max: 16, scalePerLevel: 0.25, isPercent: true },
  { stat: 'spdFlat', label: '素早さ', min: 2, max: 7, scalePerLevel: 0.12, isPercent: false },
  { stat: 'critRate', label: '会心率', min: 3, max: 9, scalePerLevel: 0.08, isPercent: true },
  { stat: 'critDmg', label: '会心倍率', min: 10, max: 28, scalePerLevel: 0.35, isPercent: true },
  { stat: 'lifesteal', label: '吸血', min: 3, max: 9, scalePerLevel: 0.07, isPercent: true },
  { stat: 'doubleHit', label: '追撃率', min: 4, max: 11, scalePerLevel: 0.08, isPercent: true },
  { stat: 'magicFind', label: 'トレハン', min: 8, max: 22, scalePerLevel: 0.35, isPercent: true },
  { stat: 'goldFind', label: '金貨増', min: 10, max: 26, scalePerLevel: 0.4, isPercent: true },
  { stat: 'expFind', label: '経験値増', min: 8, max: 22, scalePerLevel: 0.35, isPercent: true },
  { stat: 'regenPct', label: '毎T再生', min: 2, max: 6, scalePerLevel: 0.05, isPercent: true },
];

export interface UniqueTemplate {
  id: UniqueEffectId;
  name: string;
  slot: EquipSlot;
  iconKey: string;
  minTier: number;
  desc: string;
  weights: { atk?: number; mag?: number; def?: number; hp?: number; spd?: number };
  guaranteedAffix: { stat: AffixStat; label: string; value: number; isPercent: boolean };
}

// ===== 26 HANDCRAFTED UNIQUE EQUIPMENT TEMPLATES =====
export const UNIQUE_TEMPLATES: UniqueTemplate[] = [
  // Weapons (8)
  {
    id: 'sunblade_heal',
    name: '陽だまりの聖剣',
    slot: 'weapon',
    iconKey: 'sword',
    minTier: 1,
    desc: '攻撃時、味方全体のHPを最大HPの4%回復',
    weights: { atk: 1.35, mag: 0.55 },
    guaranteedAffix: { stat: 'atkPct', label: '攻撃', value: 18, isPercent: true },
  },
  {
    id: 'twin_fang_strike',
    name: '双月牙の短剣',
    slot: 'weapon',
    iconKey: 'dagger',
    minTier: 1,
    desc: '通常攻撃・物理スキル時に35%で追加攻撃',
    weights: { atk: 1.15, spd: 0.7 },
    guaranteedAffix: { stat: 'doubleHit', label: '追撃率', value: 15, isPercent: true },
  },
  {
    id: 'sun_king_staff',
    name: '太陽王の錫杖',
    slot: 'weapon',
    iconKey: 'staff',
    minTier: 1,
    desc: '魔法スキル威力+35%＆消費MP-25%',
    weights: { mag: 1.5, hp: 1.1 },
    guaranteedAffix: { stat: 'magPct', label: '魔力', value: 22, isPercent: true },
  },
  {
    id: 'berserker_axe',
    name: '狂戦士の紅斧',
    slot: 'weapon',
    iconKey: 'axe',
    minTier: 1,
    desc: '減少HP1%ごとに与ダメージ+1.2%',
    weights: { atk: 1.55, hp: 1.0 },
    guaranteedAffix: { stat: 'critDmg', label: '会心倍率', value: 35, isPercent: true },
  },
  {
    id: 'giant_slayer_blade',
    name: '巨神殺しの大剣',
    slot: 'weapon',
    iconKey: 'sword',
    minTier: 1,
    desc: 'ボス・強敵への与ダメージ+45%',
    weights: { atk: 1.5, def: 0.35 },
    guaranteedAffix: { stat: 'atkPct', label: '攻撃', value: 24, isPercent: true },
  },
  {
    id: 'meteor_scepter',
    name: '星降りの魔笏',
    slot: 'weapon',
    iconKey: 'staff',
    minTier: 1,
    desc: '全体攻撃スキルの威力+35%＆会心率+12%',
    weights: { mag: 1.55, spd: 0.45 },
    guaranteedAffix: { stat: 'critRate', label: '会心率', value: 12, isPercent: true },
  },
  {
    id: 'vampire_scythe',
    name: '紅月の吸血鎌',
    slot: 'weapon',
    iconKey: 'axe',
    minTier: 1,
    desc: '吸血+20%＆敵を倒すたびHP25%回復',
    weights: { atk: 1.4, mag: 0.45 },
    guaranteedAffix: { stat: 'lifesteal', label: '吸血', value: 20, isPercent: true },
  },
  {
    id: 'storm_bowblade',
    name: '迅雷の双刃剣',
    slot: 'weapon',
    iconKey: 'dagger',
    minTier: 2,
    desc: '素早さの120%を攻撃力に加算',
    weights: { atk: 1.1, spd: 1.0 },
    guaranteedAffix: { stat: 'spdFlat', label: '素早さ', value: 14, isPercent: false },
  },

  // Armor (6)
  {
    id: 'world_tree_armor',
    name: '世界樹の翠鎧',
    slot: 'armor',
    iconKey: 'armor',
    minTier: 1,
    desc: '毎ターン開始時に最大HPの10%を自動再生',
    weights: { def: 1.25, hp: 3.4 },
    guaranteedAffix: { stat: 'hpPct', label: '最大HP', value: 22, isPercent: true },
  },
  {
    id: 'golden_aegis',
    name: '古代王の黄金鎧',
    slot: 'armor',
    iconKey: 'plate',
    minTier: 1,
    desc: '戦闘開始時、最大HP25%分のバリアを展開',
    weights: { def: 1.55, hp: 2.8 },
    guaranteedAffix: { stat: 'defPct', label: '防御', value: 22, isPercent: true },
  },
  {
    id: 'dragonscale_thorns',
    name: '竜鱗の紅蓮鎧',
    slot: 'armor',
    iconKey: 'plate',
    minTier: 1,
    desc: '被ダメージの35%を攻撃者に自動反射',
    weights: { def: 1.45, atk: 0.45, hp: 2.6 },
    guaranteedAffix: { stat: 'atkPct', label: '攻撃', value: 14, isPercent: true },
  },
  {
    id: 'starlight_mantle',
    name: '星光の外套',
    slot: 'armor',
    iconKey: 'robe',
    minTier: 1,
    desc: '被ダメージ-15%＆毎ターンMP+8回復',
    weights: { def: 1.0, mag: 0.85, hp: 2.4 },
    guaranteedAffix: { stat: 'magPct', label: '魔力', value: 18, isPercent: true },
  },
  {
    id: 'mithril_fortress',
    name: '白銀要塞の重鎧',
    slot: 'armor',
    iconKey: 'plate',
    minTier: 1,
    desc: '防御力の35%を攻撃力に加算＆被ダメ-10%',
    weights: { def: 1.7, hp: 3.2 },
    guaranteedAffix: { stat: 'defPct', label: '防御', value: 28, isPercent: true },
  },
  {
    id: 'blazing_cloak',
    name: '不死鳥の炎マント',
    slot: 'armor',
    iconKey: 'robe',
    minTier: 2,
    desc: 'HP50%以上で与ダメ+22%＆毎T再生+6%',
    weights: { def: 1.15, atk: 0.55, mag: 0.55, hp: 2.6 },
    guaranteedAffix: { stat: 'hpPct', label: '最大HP', value: 24, isPercent: true },
  },

  // Relics (7)
  {
    id: 'clover_luck',
    name: '幸運の四葉遺物',
    slot: 'relic',
    iconKey: 'amulet',
    minTier: 1,
    desc: 'トレハン+45%＆ゴールド獲得+40%',
    weights: { hp: 2.0, spd: 0.45, atk: 0.4, mag: 0.4 },
    guaranteedAffix: { stat: 'magicFind', label: 'トレハン', value: 45, isPercent: true },
  },
  {
    id: 'crimson_chalice',
    name: '吸血伯の紅玉杯',
    slot: 'relic',
    iconKey: 'chalice',
    minTier: 1,
    desc: '吸血+18%＆HP満タン超過の回復をバリアに変換',
    weights: { hp: 2.6, atk: 0.55, mag: 0.55 },
    guaranteedAffix: { stat: 'lifesteal', label: '吸血', value: 18, isPercent: true },
  },
  {
    id: 'chronos_hourglass',
    name: '時の砂時計',
    slot: 'relic',
    iconKey: 'compass',
    minTier: 1,
    desc: '素早さ大幅UP＆全スキル威力+20%',
    weights: { spd: 0.9, atk: 0.6, mag: 0.6 },
    guaranteedAffix: { stat: 'spdFlat', label: '素早さ', value: 12, isPercent: false },
  },
  {
    id: 'astral_compass',
    name: '星辰の羅針盤',
    slot: 'relic',
    iconKey: 'compass',
    minTier: 2,
    desc: '会心率+15%＆会心倍率+45%',
    weights: { atk: 0.75, mag: 0.75, spd: 0.6 },
    guaranteedAffix: { stat: 'critRate', label: '会心率', value: 15, isPercent: true },
  },
  {
    id: 'forge_heart_amulet',
    name: '鍛冶神の炉心護符',
    slot: 'relic',
    iconKey: 'amulet',
    minTier: 1,
    desc: '鍛冶石の獲得量+60%＆攻撃/魔力+15%',
    weights: { atk: 0.6, mag: 0.6, hp: 2.4 },
    guaranteedAffix: { stat: 'magicFind', label: 'トレハン', value: 30, isPercent: true },
  },
  {
    id: 'mimic_crown',
    name: 'ミミック王の黄金冠',
    slot: 'relic',
    iconKey: 'chalice',
    minTier: 1,
    desc: '金貨+65%・トレハン+35%・被ダメ+10%',
    weights: { atk: 0.75, mag: 0.75, spd: 0.5 },
    guaranteedAffix: { stat: 'goldFind', label: '金貨増', value: 65, isPercent: true },
  },
  {
    id: 'titan_gauntlet_relic',
    name: '巨人の剛力篭手',
    slot: 'relic',
    iconKey: 'amulet',
    minTier: 1,
    desc: '通常攻撃・物理スキル威力+30%＆最大HP+15%',
    weights: { atk: 0.95, hp: 2.8 },
    guaranteedAffix: { stat: 'atkPct', label: '攻撃', value: 20, isPercent: true },
  },

  // Runes (5)
  {
    id: 'echo_crit_rune',
    name: '連撃の古ルーン',
    slot: 'rune',
    iconKey: 'rune_red',
    minTier: 1,
    desc: '会心発生時、必ず50%威力の追撃が発生',
    weights: { atk: 1.0, spd: 0.4 },
    guaranteedAffix: { stat: 'critRate', label: '会心率', value: 12, isPercent: true },
  },
  {
    id: 'phoenix_ash_rune',
    name: '不死鳥の灰ルーン',
    slot: 'rune',
    iconKey: 'rune_green',
    minTier: 1,
    desc: '戦闘中1度だけ致死ダメージをHP35%で踏みとどまる',
    weights: { hp: 2.8, def: 0.9 },
    guaranteedAffix: { stat: 'regenPct', label: '毎T再生', value: 6, isPercent: true },
  },
  {
    id: 'sage_star_rune',
    name: '賢者の星ルーン',
    slot: 'rune',
    iconKey: 'rune_blue',
    minTier: 2,
    desc: '毎ターンMP+12回復＆魔力+25%',
    weights: { mag: 1.15, hp: 1.5 },
    guaranteedAffix: { stat: 'magPct', label: '魔力', value: 25, isPercent: true },
  },
  {
    id: 'overdrive_rune',
    name: '限界突破の赤ルーン',
    slot: 'rune',
    iconKey: 'rune_red',
    minTier: 1,
    desc: '全与ダメージ+25%・毎ターンHP5%消費',
    weights: { atk: 1.1, mag: 1.1 },
    guaranteedAffix: { stat: 'critDmg', label: '会心倍率', value: 40, isPercent: true },
  },
  {
    id: 'guardian_vow_rune',
    name: '聖騎士の誓いルーン',
    slot: 'rune',
    iconKey: 'rune_green',
    minTier: 1,
    desc: '戦闘開始時に味方全体へ最大HP12%分のバリア',
    weights: { def: 1.1, hp: 2.5 },
    guaranteedAffix: { stat: 'defPct', label: '防御', value: 20, isPercent: true },
  },
];

export const UNIQUE_MAP: Record<UniqueEffectId, UniqueTemplate> = Object.fromEntries(
  UNIQUE_TEMPLATES.map((u) => [u.id, u]),
) as Record<UniqueEffectId, UniqueTemplate>;

let uidCounter = 1;
export function nextItemId(): string {
  uidCounter += 1;
  return `eq_${Date.now().toString(36)}_${uidCounter.toString(36)}_${Math.floor(Math.random() * 9999).toString(36)}`;
}

function randRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

export type LootSource = 'normal' | 'elite' | 'boss' | 'rare_enemy' | 'chest' | 'gold_chest' | 'shop';

export function rollRarity(
  worldTier: number,
  magicFind: number,
  source: LootSource,
): Rarity {
  const mfFactor = 1 + Math.max(0, magicFind) / 100;
  const tierBoost = 1 + (Math.max(1, worldTier) - 1) * 0.45;
  const luck = mfFactor * tierBoost;

  let weights: Record<Rarity, number>;
  if (source === 'boss' || source === 'rare_enemy') {
    weights = {
      common: 0,
      uncommon: 0,
      rare: 18,
      epic: 38 * Math.pow(luck, 0.25),
      legendary: 31 * Math.pow(luck, 0.55),
      mythic: 13 * Math.pow(luck, 0.85),
    };
  } else if (source === 'gold_chest' || source === 'elite') {
    weights = {
      common: 0,
      uncommon: 12,
      rare: 34,
      epic: 32 * Math.pow(luck, 0.35),
      legendary: 16 * Math.pow(luck, 0.65),
      mythic: 4.5 * Math.pow(luck, 0.9),
    };
  } else if (source === 'chest' || source === 'shop') {
    weights = {
      common: 10,
      uncommon: 26,
      rare: 34,
      epic: 20 * Math.pow(luck, 0.4),
      legendary: 8 * Math.pow(luck, 0.7),
      mythic: 2 * Math.pow(luck, 0.95),
    };
  } else {
    weights = {
      common: 36,
      uncommon: 32,
      rare: 20 * Math.pow(luck, 0.3),
      epic: 9 * Math.pow(luck, 0.55),
      legendary: 2.5 * Math.pow(luck, 0.8),
      mythic: 0.5 * Math.pow(luck, 1.05),
    };
  }

  const total = RARITY_ORDER.reduce((sum, r) => sum + weights[r], 0);
  let roll = Math.random() * total;
  for (const r of RARITY_ORDER) {
    roll -= weights[r];
    if (roll <= 0) return r;
  }
  return 'rare';
}

function rollSingleAffix(
  itemLevel: number,
  worldTier: number,
  rarityRank: number,
  excludeStats: Set<AffixStat>,
): Affix | null {
  const pool = AFFIX_POOL.filter((a) => !excludeStats.has(a.stat));
  if (pool.length === 0) return null;
  const def = pick(pool);
  const raw =
    randRange(def.min, def.max) +
    itemLevel * def.scalePerLevel * (0.7 + rarityRank * 0.15);
  const val = Math.max(1, Math.round(raw * (1 + (worldTier - 1) * 0.12)));
  return {
    stat: def.stat,
    label: def.label,
    value: val,
    isPercent: def.isPercent,
  };
}

export function generateEquipment(
  floor: number,
  worldTier: number,
  magicFind: number,
  source: LootSource = 'normal',
  forcedSlot?: EquipSlot,
  forcedRarity?: Rarity,
): EquipmentItem {
  const safeFloor = Math.max(1, floor);
  const safeTier = Math.max(1, worldTier);
  const rarity = forcedRarity ?? rollRarity(safeTier, magicFind, source);
  const meta = RARITY_META[rarity];

  const itemLevel = Math.max(
    1,
    Math.round(safeFloor + (safeTier - 1) * 22 + randRange(-1, 2)),
  );

  let uniqueTemplate: UniqueTemplate | undefined;
  const uniqueChance =
    rarity === 'mythic' ? 0.65 : rarity === 'legendary' ? 0.34 : 0;
  if (uniqueChance > 0 && Math.random() < uniqueChance) {
    const eligible = UNIQUE_TEMPLATES.filter(
      (u) => u.minTier <= safeTier && (!forcedSlot || u.slot === forcedSlot),
    );
    if (eligible.length > 0) {
      uniqueTemplate = pick(eligible);
    }
  }

  const slot: EquipSlot =
    uniqueTemplate?.slot ??
    forcedSlot ??
    pick<EquipSlot>(['weapon', 'armor', 'relic', 'rune']);

  const baseTemplate = uniqueTemplate
    ? {
        name: uniqueTemplate.name,
        slot: uniqueTemplate.slot,
        iconKey: uniqueTemplate.iconKey,
        weights: uniqueTemplate.weights,
      }
    : pick(BASE_TEMPLATES[slot]);

  // Roll Equipment Set on Rare+ items! (Even uniques can occasionally belong to a set on Epic+/Mythic!)
  let setId: SetId | undefined;
  const setChance =
    meta.rank >= 4 ? 0.7 : meta.rank === 3 ? 0.6 : meta.rank === 2 ? 0.45 : 0;
  if (setChance > 0 && Math.random() < setChance) {
    setId = pick(SET_LIST).id;
  }

  const tierPower = Math.pow(1.42, safeTier - 1);
  const floorPower = (10 + itemLevel * 2.4 + Math.pow(itemLevel, 1.24) * 0.52) * tierPower;
  const rollMult = meta.powerMult * randRange(0.92, 1.12);

  const baseStats: EquipmentItem['baseStats'] = {};
  if (baseTemplate.weights.atk) {
    baseStats.atk = Math.max(2, Math.round(floorPower * 0.42 * baseTemplate.weights.atk * rollMult));
  }
  if (baseTemplate.weights.mag) {
    baseStats.mag = Math.max(2, Math.round(floorPower * 0.42 * baseTemplate.weights.mag * rollMult));
  }
  if (baseTemplate.weights.def) {
    baseStats.def = Math.max(2, Math.round(floorPower * 0.34 * baseTemplate.weights.def * rollMult));
  }
  if (baseTemplate.weights.hp) {
    baseStats.hp = Math.max(10, Math.round(floorPower * 1.15 * baseTemplate.weights.hp * rollMult));
  }
  if (baseTemplate.weights.spd) {
    baseStats.spd = Math.max(
      1,
      Math.round((2 + itemLevel * 0.16 + safeTier * 1.8) * baseTemplate.weights.spd * Math.sqrt(meta.powerMult)),
    );
  }

  const affixes: Affix[] = [];
  const usedStats = new Set<AffixStat>();
  if (uniqueTemplate) {
    const g = uniqueTemplate.guaranteedAffix;
    const scaled = Math.round(g.value * (1 + (safeTier - 1) * 0.18));
    affixes.push({ ...g, value: scaled });
    usedStats.add(g.stat);
  }

  while (affixes.length < meta.affixCount) {
    const next = rollSingleAffix(itemLevel, safeTier, meta.rank, usedStats);
    if (!next) break;
    usedStats.add(next.stat);
    affixes.push(next);
  }

  const name = uniqueTemplate
    ? `★${uniqueTemplate.name}`
    : `${pick(PREFIXES[rarity])}${baseTemplate.name}`;

  const sellValue = Math.max(
    8,
    Math.round((12 + itemLevel * 6) * meta.sellMult * Math.pow(1.35, safeTier - 1)),
  );

  return {
    id: nextItemId(),
    name,
    slot,
    iconKey: baseTemplate.iconKey,
    rarity,
    itemLevel,
    worldTier: safeTier,
    enhanceLevel: 0,
    rerollCount: 0,
    setId,
    baseStats,
    affixes,
    uniqueId: uniqueTemplate?.id,
    uniqueName: uniqueTemplate?.name,
    uniqueDesc: uniqueTemplate?.desc,
    locked: Boolean(uniqueTemplate) || rarity === 'mythic',
    sellValue,
  };
}

// ===== BLACKSMITHING: SALVAGE / ENHANCE (+15 w/ BREAKTHROUGHS) / 1-SLOT REROLL =====
export const MAX_ENHANCE_LEVEL = 15;

export function getSalvageValue(item: EquipmentItem): number {
  const base = RARITY_META[item.rarity].salvageBase;
  const tierBonus = 1 + (item.worldTier - 1) * 0.4;
  const enhanceRefund = item.enhanceLevel * 2;
  return Math.max(1, Math.round(base * tierBonus) + enhanceRefund);
}

export function getEnhanceCost(item: EquipmentItem): { stones: number; gold: number; isBreakthrough: boolean } {
  const nextLv = item.enhanceLevel + 1;
  const isBreakthrough = nextLv === 5 || nextLv === 10 || nextLv === 15;
  const rarityFactor = 1 + RARITY_META[item.rarity].rank * 0.25;
  const stones = Math.max(
    1,
    Math.round((2 + nextLv * 1.4 + (isBreakthrough ? 4 : 0)) * rarityFactor),
  );
  const gold = Math.max(
    25,
    Math.round((30 + item.itemLevel * 8 + nextLv * 25) * rarityFactor * (isBreakthrough ? 1.5 : 1)),
  );
  return { stones, gold, isBreakthrough };
}

/**
 * Deterministic enhancement (+1 up to +15).
 * Increases base stats every level, and triggers a Masterwork Breakthrough at +5, +10, +15
 * that boosts EVERY affix on the item by +25%!
 */
export function enhanceEquipment(item: EquipmentItem): {
  upgraded: EquipmentItem;
  isBreakthrough: boolean;
} {
  if (item.enhanceLevel >= MAX_ENHANCE_LEVEL) {
    return { upgraded: item, isBreakthrough: false };
  }
  const nextLv = item.enhanceLevel + 1;
  const isBreakthrough = nextLv === 5 || nextLv === 10 || nextLv === 15;

  const bump = (v?: number, minAdd = 2) =>
    v !== undefined ? v + Math.max(minAdd, Math.round(v * 0.085)) : undefined;

  const nextBase: EquipmentItem['baseStats'] = {
    ...(item.baseStats.atk !== undefined ? { atk: bump(item.baseStats.atk, 2) } : {}),
    ...(item.baseStats.mag !== undefined ? { mag: bump(item.baseStats.mag, 2) } : {}),
    ...(item.baseStats.def !== undefined ? { def: bump(item.baseStats.def, 2) } : {}),
    ...(item.baseStats.hp !== undefined ? { hp: bump(item.baseStats.hp, 6) } : {}),
    ...(item.baseStats.spd !== undefined ? { spd: bump(item.baseStats.spd, 1) } : {}),
  };

  const nextAffixes = isBreakthrough
    ? item.affixes.map((af) => ({
        ...af,
        value: Math.max(af.value + 1, Math.round(af.value * 1.25)),
        masterworked: true,
      }))
    : item.affixes;

  return {
    isBreakthrough,
    upgraded: {
      ...item,
      enhanceLevel: nextLv,
      baseStats: nextBase,
      affixes: nextAffixes,
      sellValue: Math.round(item.sellValue * 1.12),
    },
  };
}

export function getRerollCost(item: EquipmentItem): { stones: number; gold: number } {
  const rank = RARITY_META[item.rarity].rank;
  const tries = item.rerollCount;
  const stones = Math.max(2, Math.round((3 + rank * 2) * (1 + tries * 0.35)));
  const gold = Math.max(40, Math.round((50 + item.itemLevel * 12) * (1 + tries * 0.4)));
  return { stones, gold };
}

/**
 * Rerolls a single chosen affix slot into a fresh non-duplicate affix.
 * Preserves Breakthrough scaling bonuses already earned on the item!
 */
export function rerollAffixSlot(item: EquipmentItem, affixIndex: number): EquipmentItem {
  if (affixIndex < 0 || affixIndex >= item.affixes.length) return item;
  const used = new Set<AffixStat>(item.affixes.map((a) => a.stat));
  const fresh = rollSingleAffix(
    item.itemLevel,
    item.worldTier,
    RARITY_META[item.rarity].rank,
    used,
  );
  if (!fresh) return item;

  // Apply existing breakthrough multiplier if item is already +5 / +10 / +15
  const breakthroughs = Math.floor(item.enhanceLevel / 5);
  if (breakthroughs > 0) {
    fresh.value = Math.max(fresh.value + 1, Math.round(fresh.value * Math.pow(1.25, breakthroughs)));
    fresh.masterworked = true;
  }

  const nextAffixes = item.affixes.map((af, idx) => (idx === affixIndex ? fresh : af));
  return {
    ...item,
    rerollCount: item.rerollCount + 1,
    affixes: nextAffixes,
  };
}

export function calculateItemScore(item: EquipmentItem): number {
  const b = item.baseStats;
  let score =
    (b.atk ?? 0) * 3.2 +
    (b.mag ?? 0) * 3.2 +
    (b.def ?? 0) * 2.8 +
    (b.hp ?? 0) * 0.65 +
    (b.spd ?? 0) * 4.5;
  for (const af of item.affixes) {
    score += af.value * 4.5;
  }
  if (item.setId) score *= 1.06;
  if (item.uniqueId) score *= 1.25;
  return Math.round(score);
}

export function createStarterWeapon(): EquipmentItem {
  return {
    id: 'starter_rune_sword',
    name: '見習いのルーン剣',
    slot: 'weapon',
    iconKey: 'sword',
    rarity: 'uncommon',
    itemLevel: 1,
    worldTier: 1,
    enhanceLevel: 0,
    rerollCount: 0,
    baseStats: { atk: 12, mag: 6 },
    affixes: [{ stat: 'magicFind', label: 'トレハン', value: 12, isPercent: true }],
    locked: false,
    sellValue: 25,
  };
}
