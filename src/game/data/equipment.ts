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
    powerMult: 0.88,
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
    powerMult: 1.06,
    affixCount: 1,
    sellMult: 2,
    salvageBase: 1,
    rank: 1,
  },
  rare: {
    id: 'rare',
    label: 'レア',
    shortLabel: 'R',
    color: '#68b8ff',
    bg: 'rgba(54, 128, 204, 0.22)',
    border: '#4898e6',
    powerMult: 1.26,
    affixCount: 2,
    sellMult: 4,
    salvageBase: 3,
    rank: 2,
  },
  epic: {
    id: 'epic',
    label: 'エピック',
    shortLabel: 'E',
    color: '#e69cff',
    bg: 'rgba(156, 84, 196, 0.24)',
    border: '#b565db',
    powerMult: 1.54,
    affixCount: 3,
    sellMult: 8,
    salvageBase: 6,
    rank: 3,
  },
  legendary: {
    id: 'legendary',
    label: 'レジェンド',
    shortLabel: 'L',
    color: '#ffb84d',
    bg: 'rgba(219, 138, 36, 0.24)',
    border: '#e89b2d',
    powerMult: 1.92,
    affixCount: 4,
    sellMult: 16,
    salvageBase: 12,
    rank: 4,
  },
  mythic: {
    id: 'mythic',
    label: 'ミシック',
    shortLabel: 'M',
    color: '#ff6e7f',
    bg: 'rgba(224, 67, 94, 0.28)',
    border: '#ff7084',
    powerMult: 2.45,
    affixCount: 5,
    sellMult: 34,
    salvageBase: 26,
    rank: 5,
  },
};

export const SLOT_LABELS: Record<EquipSlot, string> = {
  weapon: '武器',
  armor: '防具',
  relic: '遺物',
  rune: 'ルーン',
};

// ===== 10 EQUIPMENT SETS (2pc & 4pc bonuses, nerfed for hardcore) =====
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
    bonus2Desc: 'HP+10%',
    bonus4Desc: '再生+4%・被ダメ-6%',
  },
  {
    id: 'ancient_rune',
    name: '古代ルーン',
    color: '#69c9e8',
    bonus2Desc: '防御+11%',
    bonus4Desc: '開幕盾+12%・防御16%を攻魔加算',
  },
  {
    id: 'crimson_fury',
    name: '紅蓮の狂戦',
    color: '#ff785a',
    bonus2Desc: '攻撃+11%',
    bonus4Desc: '会心倍率+24%・吸血+5%',
  },
  {
    id: 'astral_mage',
    name: '星屑の魔導',
    color: '#7da8ff',
    bonus2Desc: '魔力+11%',
    bonus4Desc: 'スキル+14%・毎T MP+4',
  },
  {
    id: 'golden_greed',
    name: '黄金トレハン',
    color: '#ffd65c',
    bonus2Desc: 'MF+18%',
    bonus4Desc: '金貨+24%・EXP+18%・石+20%',
  },
  {
    id: 'lunar_blade',
    name: '銀月の連撃',
    color: '#d4b8ff',
    bonus2Desc: '素早さ+6・会心+5%',
    bonus4Desc: '追撃+11%・物理+10%',
  },
  {
    id: 'frost_monarch',
    name: '氷皇の威光',
    color: '#7ce8ff',
    bonus2Desc: '防御+10%・魔力+7%',
    bonus4Desc: '攻撃時16%凍結・異常敵へ与ダメ+15%',
  },
  {
    id: 'seraph_radiance',
    name: '熾天使の聖光',
    color: '#ffe875',
    bonus2Desc: 'HP+10%・魔力+8%',
    bonus4Desc: '毎T再生+3%・回復/盾効果+14%',
  },
  {
    id: 'blood_pact',
    name: '紅血の契約',
    color: '#ff5c77',
    bonus2Desc: '吸血+7%・攻撃+7%',
    bonus4Desc: 'HP50%以下で与ダメ+18%・会心+8%',
  },
  {
    id: 'void_walker',
    name: '虚無の歩み',
    color: '#c48aff',
    bonus2Desc: '防御貫通+10%',
    bonus4Desc: '防御貫通+12%・スキル威力+12%',
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
  { stat: 'atkPct', label: '攻撃', min: 3, max: 10, scalePerLevel: 0.18, isPercent: true },
  { stat: 'magPct', label: '魔力', min: 3, max: 10, scalePerLevel: 0.18, isPercent: true },
  { stat: 'defPct', label: '防御', min: 3, max: 10, scalePerLevel: 0.16, isPercent: true },
  { stat: 'hpPct', label: '最大HP', min: 4, max: 12, scalePerLevel: 0.18, isPercent: true },
  { stat: 'spdFlat', label: '素早さ', min: 1, max: 5, scalePerLevel: 0.09, isPercent: false },
  { stat: 'critRate', label: '会心率', min: 2, max: 6, scalePerLevel: 0.06, isPercent: true },
  { stat: 'critDmg', label: '会心倍率', min: 7, max: 20, scalePerLevel: 0.25, isPercent: true },
  { stat: 'lifesteal', label: '吸血', min: 2, max: 6, scalePerLevel: 0.05, isPercent: true },
  { stat: 'doubleHit', label: '追撃率', min: 3, max: 8, scalePerLevel: 0.06, isPercent: true },
  { stat: 'magicFind', label: 'トレハン', min: 5, max: 15, scalePerLevel: 0.24, isPercent: true },
  { stat: 'goldFind', label: '金貨増', min: 6, max: 18, scalePerLevel: 0.28, isPercent: true },
  { stat: 'expFind', label: '経験値増', min: 5, max: 15, scalePerLevel: 0.24, isPercent: true },
  { stat: 'regenPct', label: '毎T再生', min: 1, max: 4, scalePerLevel: 0.04, isPercent: true },
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

// ===== 40 HANDCRAFTED UNIQUE EQUIPMENT TEMPLATES =====
export const UNIQUE_TEMPLATES: UniqueTemplate[] = [
  // Weapons (12)
  {
    id: 'sunblade_heal',
    name: '陽だまりの聖剣',
    slot: 'weapon',
    iconKey: 'sword',
    minTier: 1,
    desc: '攻撃時、味方全体のHPを最大HPの2%回復',
    weights: { atk: 1.2, mag: 0.48 },
    guaranteedAffix: { stat: 'atkPct', label: '攻撃', value: 12, isPercent: true },
  },
  {
    id: 'twin_fang_strike',
    name: '双月牙の短剣',
    slot: 'weapon',
    iconKey: 'dagger',
    minTier: 1,
    desc: '通常攻撃・物理スキル時に18%で追加攻撃',
    weights: { atk: 1.05, spd: 0.6 },
    guaranteedAffix: { stat: 'doubleHit', label: '追撃率', value: 10, isPercent: true },
  },
  {
    id: 'sun_king_staff',
    name: '太陽王の錫杖',
    slot: 'weapon',
    iconKey: 'staff',
    minTier: 1,
    desc: '魔法スキル威力+15%・消費MP-15%',
    weights: { mag: 1.32, hp: 0.95 },
    guaranteedAffix: { stat: 'magPct', label: '魔力', value: 14, isPercent: true },
  },
  {
    id: 'berserker_axe',
    name: '狂戦士の紅斧',
    slot: 'weapon',
    iconKey: 'axe',
    minTier: 1,
    desc: '減少HP1%ごとに与ダメージ+0.6%',
    weights: { atk: 1.38, hp: 0.88 },
    guaranteedAffix: { stat: 'critDmg', label: '会心倍率', value: 24, isPercent: true },
  },
  {
    id: 'giant_slayer_blade',
    name: '巨神殺しの大剣',
    slot: 'weapon',
    iconKey: 'sword',
    minTier: 1,
    desc: 'ボス・強敵への与ダメージ+22%',
    weights: { atk: 1.32, def: 0.3 },
    guaranteedAffix: { stat: 'atkPct', label: '攻撃', value: 16, isPercent: true },
  },
  {
    id: 'meteor_scepter',
    name: '星降りの魔笏',
    slot: 'weapon',
    iconKey: 'staff',
    minTier: 1,
    desc: '全体攻撃スキルの威力+16%・会心率+6%',
    weights: { mag: 1.36, spd: 0.38 },
    guaranteedAffix: { stat: 'critRate', label: '会心率', value: 8, isPercent: true },
  },
  {
    id: 'vampire_scythe',
    name: '紅月の吸血鎌',
    slot: 'weapon',
    iconKey: 'axe',
    minTier: 1,
    desc: '吸血+12%・敵撃破時HP12%回復',
    weights: { atk: 1.25, mag: 0.4 },
    guaranteedAffix: { stat: 'lifesteal', label: '吸血', value: 12, isPercent: true },
  },
  {
    id: 'storm_bowblade',
    name: '迅雷の双刃剣',
    slot: 'weapon',
    iconKey: 'dagger',
    minTier: 2,
    desc: '素早さの65%を攻撃力に加算',
    weights: { atk: 1.0, spd: 0.85 },
    guaranteedAffix: { stat: 'spdFlat', label: '素早さ', value: 9, isPercent: false },
  },

  // Armor (9)
  {
    id: 'world_tree_armor',
    name: '世界樹の翠鎧',
    slot: 'armor',
    iconKey: 'armor',
    minTier: 1,
    desc: '毎ターン開始時に最大HPの5%再生',
    weights: { def: 1.12, hp: 3.0 },
    guaranteedAffix: { stat: 'hpPct', label: '最大HP', value: 15, isPercent: true },
  },
  {
    id: 'golden_aegis',
    name: '古代王の黄金鎧',
    slot: 'armor',
    iconKey: 'plate',
    minTier: 1,
    desc: '戦闘開始時、最大HP12%分のバリア展開',
    weights: { def: 1.36, hp: 2.5 },
    guaranteedAffix: { stat: 'defPct', label: '防御', value: 15, isPercent: true },
  },
  {
    id: 'dragonscale_thorns',
    name: '竜鱗の紅蓮鎧',
    slot: 'armor',
    iconKey: 'plate',
    minTier: 1,
    desc: '被ダメージの18%を攻撃者へ反射',
    weights: { def: 1.28, atk: 0.38, hp: 2.3 },
    guaranteedAffix: { stat: 'atkPct', label: '攻撃', value: 10, isPercent: true },
  },
  {
    id: 'starlight_mantle',
    name: '星光の外套',
    slot: 'armor',
    iconKey: 'robe',
    minTier: 1,
    desc: '被ダメージ-8%・毎ターンMP+4回復',
    weights: { def: 0.9, mag: 0.74, hp: 2.15 },
    guaranteedAffix: { stat: 'magPct', label: '魔力', value: 12, isPercent: true },
  },
  {
    id: 'mithril_fortress',
    name: '白銀要塞の重鎧',
    slot: 'armor',
    iconKey: 'plate',
    minTier: 1,
    desc: '防御力の20%を攻撃力に加算・被ダメ-5%',
    weights: { def: 1.5, hp: 2.8 },
    guaranteedAffix: { stat: 'defPct', label: '防御', value: 18, isPercent: true },
  },
  {
    id: 'blazing_cloak',
    name: '不死鳥の炎マント',
    slot: 'armor',
    iconKey: 'robe',
    minTier: 2,
    desc: 'HP50%以上で与ダメ+10%・毎T再生+3%',
    weights: { def: 1.02, atk: 0.48, mag: 0.48, hp: 2.3 },
    guaranteedAffix: { stat: 'hpPct', label: '最大HP', value: 16, isPercent: true },
  },

  // Relics (11)
  {
    id: 'clover_luck',
    name: '幸運の四葉遺物',
    slot: 'relic',
    iconKey: 'amulet',
    minTier: 1,
    desc: 'トレハン+24%・ゴールド獲得+20%',
    weights: { hp: 1.8, spd: 0.4, atk: 0.36, mag: 0.36 },
    guaranteedAffix: { stat: 'magicFind', label: 'トレハン', value: 24, isPercent: true },
  },
  {
    id: 'crimson_chalice',
    name: '吸血伯の紅玉杯',
    slot: 'relic',
    iconKey: 'chalice',
    minTier: 1,
    desc: '吸血+10%・超過回復をバリアに変換',
    weights: { hp: 2.3, atk: 0.48, mag: 0.48 },
    guaranteedAffix: { stat: 'lifesteal', label: '吸血', value: 10, isPercent: true },
  },
  {
    id: 'chronos_hourglass',
    name: '時の砂時計',
    slot: 'relic',
    iconKey: 'compass',
    minTier: 1,
    desc: '素早さUP・全スキル威力+9%',
    weights: { spd: 0.78, atk: 0.52, mag: 0.52 },
    guaranteedAffix: { stat: 'spdFlat', label: '素早さ', value: 8, isPercent: false },
  },
  {
    id: 'astral_compass',
    name: '星辰の羅針盤',
    slot: 'relic',
    iconKey: 'compass',
    minTier: 2,
    desc: '会心率+9%・会心倍率+24%',
    weights: { atk: 0.65, mag: 0.65, spd: 0.52 },
    guaranteedAffix: { stat: 'critRate', label: '会心率', value: 9, isPercent: true },
  },
  {
    id: 'forge_heart_amulet',
    name: '鍛冶神の炉心護符',
    slot: 'relic',
    iconKey: 'amulet',
    minTier: 1,
    desc: '鍛冶石獲得+32%・攻撃/魔力+8%',
    weights: { atk: 0.52, mag: 0.52, hp: 2.1 },
    guaranteedAffix: { stat: 'magicFind', label: 'トレハン', value: 18, isPercent: true },
  },
  {
    id: 'mimic_crown',
    name: 'ミミック王の黄金冠',
    slot: 'relic',
    iconKey: 'chalice',
    minTier: 1,
    desc: '金貨+35%・トレハン+18%・被ダメ+14%',
    weights: { atk: 0.65, mag: 0.65, spd: 0.42 },
    guaranteedAffix: { stat: 'goldFind', label: '金貨増', value: 35, isPercent: true },
  },
  {
    id: 'titan_gauntlet_relic',
    name: '巨人の剛力篭手',
    slot: 'relic',
    iconKey: 'amulet',
    minTier: 1,
    desc: '物理攻撃威力+14%・最大HP+8%',
    weights: { atk: 0.85, hp: 2.4 },
    guaranteedAffix: { stat: 'atkPct', label: '攻撃', value: 14, isPercent: true },
  },

  // Runes (8)
  {
    id: 'echo_crit_rune',
    name: '連撃の古ルーン',
    slot: 'rune',
    iconKey: 'rune_red',
    minTier: 1,
    desc: '会心発生時、26%威力の追撃が発生',
    weights: { atk: 0.9, spd: 0.36 },
    guaranteedAffix: { stat: 'critRate', label: '会心率', value: 8, isPercent: true },
  },
  {
    id: 'phoenix_ash_rune',
    name: '不死鳥の灰ルーン',
    slot: 'rune',
    iconKey: 'rune_green',
    minTier: 1,
    desc: '戦闘中1度だけ致死攻撃をHP18%で耐える',
    weights: { hp: 2.4, def: 0.8 },
    guaranteedAffix: { stat: 'regenPct', label: '毎T再生', value: 4, isPercent: true },
  },
  {
    id: 'sage_star_rune',
    name: '賢者の星ルーン',
    slot: 'rune',
    iconKey: 'rune_blue',
    minTier: 2,
    desc: '毎ターンMP+6回復・魔力+15%',
    weights: { mag: 1.0, hp: 1.35 },
    guaranteedAffix: { stat: 'magPct', label: '魔力', value: 15, isPercent: true },
  },
  {
    id: 'overdrive_rune',
    name: '限界突破の赤ルーン',
    slot: 'rune',
    iconKey: 'rune_red',
    minTier: 1,
    desc: '全与ダメ+12%・毎ターンHP6%消費',
    weights: { atk: 0.96, mag: 0.96 },
    guaranteedAffix: { stat: 'critDmg', label: '会心倍率', value: 26, isPercent: true },
  },
  {
    id: 'guardian_vow_rune',
    name: '聖騎士の誓いルーン',
    slot: 'rune',
    iconKey: 'rune_green',
    minTier: 1,
    desc: '開幕に味方全体へHP6%バリア',
    weights: { def: 0.96, hp: 2.2 },
    guaranteedAffix: { stat: 'defPct', label: '防御', value: 12, isPercent: true },
  },
  {
    id: 'frostbite_blade',
    name: '凍牙の魔氷剣',
    slot: 'weapon',
    iconKey: 'sword',
    minTier: 1,
    desc: '攻撃時18%で凍結・凍結敵へ与ダメ+16%',
    weights: { atk: 1.2, mag: 0.44 },
    guaranteedAffix: { stat: 'atkPct', label: '攻撃', value: 12, isPercent: true },
  },
  {
    id: 'seraph_lance',
    name: '熾天使の黄金槍',
    slot: 'weapon',
    iconKey: 'sword',
    minTier: 2,
    desc: '聖属性攻撃+16%・防御貫通+12%',
    weights: { atk: 1.24, mag: 0.6 },
    guaranteedAffix: { stat: 'critRate', label: '会心率', value: 8, isPercent: true },
  },
  {
    id: 'eclipse_reaper_scythe',
    name: '黒蝕の死神鎌',
    slot: 'weapon',
    iconKey: 'axe',
    minTier: 2,
    desc: '攻撃時25%で防御低下・吸血+8%',
    weights: { atk: 1.32, spd: 0.4 },
    guaranteedAffix: { stat: 'lifesteal', label: '吸血', value: 8, isPercent: true },
  },
  {
    id: 'prism_wand',
    name: '虹晶の真理杖',
    slot: 'weapon',
    iconKey: 'staff',
    minTier: 1,
    desc: '弱点倍率+16%・スキル消費MP-15%',
    weights: { mag: 1.28, spd: 0.36 },
    guaranteedAffix: { stat: 'magPct', label: '魔力', value: 12, isPercent: true },
  },
  {
    id: 'glacier_plate',
    name: '氷皇の白銀重鎧',
    slot: 'armor',
    iconKey: 'plate',
    minTier: 1,
    desc: '被ダメ-7%・被弾時18%で凍結反撃',
    weights: { def: 1.4, hp: 2.7 },
    guaranteedAffix: { stat: 'defPct', label: '防御', value: 15, isPercent: true },
  },
  {
    id: 'seraph_robe',
    name: '終焉聖域の法衣',
    slot: 'armor',
    iconKey: 'robe',
    minTier: 2,
    desc: '毎T再生+4%・毎T MP+4回復',
    weights: { def: 1.02, mag: 0.88, hp: 2.3 },
    guaranteedAffix: { stat: 'hpPct', label: '最大HP', value: 14, isPercent: true },
  },
  {
    id: 'abyssal_carapace',
    name: '深淵の外殻鎧',
    slot: 'armor',
    iconKey: 'armor',
    minTier: 1,
    desc: '状態異常の敵からの被ダメ-12%',
    weights: { def: 1.25, hp: 2.5 },
    guaranteedAffix: { stat: 'hpPct', label: '最大HP', value: 12, isPercent: true },
  },
  {
    id: 'fenrir_fang_relic',
    name: '氷皇の牙首飾り',
    slot: 'relic',
    iconKey: 'amulet',
    minTier: 1,
    desc: '追撃率+10%・素早さ+8',
    weights: { atk: 0.75, spd: 0.75 },
    guaranteedAffix: { stat: 'doubleHit', label: '追撃率', value: 10, isPercent: true },
  },
  {
    id: 'halo_diadem',
    name: '聖天使の光輪冠',
    slot: 'relic',
    iconKey: 'chalice',
    minTier: 2,
    desc: 'スキル威力+12%・回復効果+12%',
    weights: { mag: 0.85, hp: 2.2 },
    guaranteedAffix: { stat: 'magPct', label: '魔力', value: 12, isPercent: true },
  },
  {
    id: 'void_heart_relic',
    name: '虚無の心臓遺物',
    slot: 'relic',
    iconKey: 'compass',
    minTier: 2,
    desc: '防御貫通+15%・会心倍率+22%',
    weights: { atk: 0.8, mag: 0.8 },
    guaranteedAffix: { stat: 'critDmg', label: '会心倍率', value: 22, isPercent: true },
  },
  {
    id: 'crystal_scale_relic',
    name: '晶竜の白銀鱗',
    slot: 'relic',
    iconKey: 'amulet',
    minTier: 1,
    desc: 'トレハン+20%・鍛冶石+20%',
    weights: { def: 0.7, hp: 2.1, spd: 0.44 },
    guaranteedAffix: { stat: 'magicFind', label: 'トレハン', value: 20, isPercent: true },
  },
  {
    id: 'blizzard_rune',
    name: '絶対零度の蒼ルーン',
    slot: 'rune',
    iconKey: 'rune_blue',
    minTier: 1,
    desc: 'スキル時18%で凍結・魔力+10%',
    weights: { mag: 0.92, spd: 0.4 },
    guaranteedAffix: { stat: 'magPct', label: '魔力', value: 10, isPercent: true },
  },
  {
    id: 'judgment_rune',
    name: '終焉断罪の紅ルーン',
    slot: 'rune',
    iconKey: 'rune_red',
    minTier: 2,
    desc: '状態異常の敵へ与ダメ+18%',
    weights: { atk: 0.92, mag: 0.92 },
    guaranteedAffix: { stat: 'critRate', label: '会心率', value: 8, isPercent: true },
  },
  {
    id: 'eternal_tamer_rune',
    name: '万魔統率の翠ルーン',
    slot: 'rune',
    iconKey: 'rune_green',
    minTier: 2,
    desc: '全能力+7%・連携ゲージ獲得+20%',
    weights: { atk: 0.62, mag: 0.62, def: 0.62, hp: 1.95 },
    guaranteedAffix: { stat: 'expFind', label: '経験値増', value: 20, isPercent: true },
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
  const mfFactor = 1 + Math.max(0, magicFind) / 180;
  const tierBoost = 1 + (Math.max(1, worldTier) - 1) * 0.3;
  const luck = mfFactor * tierBoost;

  let weights: Record<Rarity, number>;
  if (source === 'boss' || source === 'rare_enemy') {
    weights = {
      common: 0,
      uncommon: 8,
      rare: 36,
      epic: 34 * Math.pow(luck, 0.2),
      legendary: 17 * Math.pow(luck, 0.44),
      mythic: 5 * Math.pow(luck, 0.68),
    };
  } else if (source === 'gold_chest' || source === 'elite') {
    weights = {
      common: 4,
      uncommon: 26,
      rare: 38,
      epic: 22 * Math.pow(luck, 0.28),
      legendary: 8.5 * Math.pow(luck, 0.5),
      mythic: 1.5 * Math.pow(luck, 0.72),
    };
  } else if (source === 'chest' || source === 'shop') {
    weights = {
      common: 22,
      uncommon: 34,
      rare: 28,
      epic: 11.5 * Math.pow(luck, 0.3),
      legendary: 3.8 * Math.pow(luck, 0.55),
      mythic: 0.7 * Math.pow(luck, 0.78),
    };
  } else {
    weights = {
      common: 52,
      uncommon: 30,
      rare: 12.5 * Math.pow(luck, 0.24),
      epic: 4.3 * Math.pow(luck, 0.45),
      legendary: 1.0 * Math.pow(luck, 0.65),
      mythic: 0.18 * Math.pow(luck, 0.85),
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
    randRange(def.min * 0.82, def.max * 0.85) +
    itemLevel * def.scalePerLevel * (0.55 + rarityRank * 0.1);
  const val = Math.max(1, Math.round(raw * (1 + (worldTier - 1) * 0.08)));
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
    Math.round(safeFloor + (safeTier - 1) * 24 + randRange(-1, 2)),
  );

  let uniqueTemplate: UniqueTemplate | undefined;
  const uniqueChance =
    rarity === 'mythic' ? 0.38 : rarity === 'legendary' ? 0.16 : 0;
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

  let setId: SetId | undefined;
  const setChance =
    meta.rank >= 4 ? 0.48 : meta.rank === 3 ? 0.36 : meta.rank === 2 ? 0.24 : 0;
  if (setChance > 0 && Math.random() < setChance) {
    setId = pick(SET_LIST).id;
  }

  const tierPower = Math.pow(1.28, safeTier - 1);
  const floorPower = (7.5 + itemLevel * 1.75 + Math.pow(itemLevel, 1.18) * 0.36) * tierPower;
  const rollMult = meta.powerMult * randRange(0.88, 1.05);

  const baseStats: EquipmentItem['baseStats'] = {};
  if (baseTemplate.weights.atk) {
    baseStats.atk = Math.max(2, Math.round(floorPower * 0.35 * baseTemplate.weights.atk * rollMult));
  }
  if (baseTemplate.weights.mag) {
    baseStats.mag = Math.max(2, Math.round(floorPower * 0.35 * baseTemplate.weights.mag * rollMult));
  }
  if (baseTemplate.weights.def) {
    baseStats.def = Math.max(2, Math.round(floorPower * 0.28 * baseTemplate.weights.def * rollMult));
  }
  if (baseTemplate.weights.hp) {
    baseStats.hp = Math.max(8, Math.round(floorPower * 0.92 * baseTemplate.weights.hp * rollMult));
  }
  if (baseTemplate.weights.spd) {
    baseStats.spd = Math.max(
      1,
      Math.round((1.5 + itemLevel * 0.11 + safeTier * 1.2) * baseTemplate.weights.spd * Math.sqrt(meta.powerMult)),
    );
  }

  const affixes: Affix[] = [];
  const usedStats = new Set<AffixStat>();
  if (uniqueTemplate) {
    const g = uniqueTemplate.guaranteedAffix;
    const scaled = Math.max(1, Math.round(g.value * 0.72 * (1 + (safeTier - 1) * 0.1)));
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
    6,
    Math.round((10 + itemLevel * 5) * meta.sellMult * Math.pow(1.3, safeTier - 1)),
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

// ===== BLACKSMITHING: SALVAGE / ENHANCE (+20 w/ BREAKTHROUGHS) / 1-SLOT REROLL =====
export const MAX_ENHANCE_LEVEL = 20;

export function getSalvageValue(item: EquipmentItem): number {
  const base = RARITY_META[item.rarity].salvageBase;
  const tierBonus = 1 + (item.worldTier - 1) * 0.35;
  const enhanceRefund = Math.floor(item.enhanceLevel * 1.5);
  return Math.max(1, Math.round(base * tierBonus) + enhanceRefund);
}

export function getEnhanceCost(item: EquipmentItem): { stones: number; gold: number; isBreakthrough: boolean } {
  const nextLv = item.enhanceLevel + 1;
  const isBreakthrough = nextLv === 5 || nextLv === 10 || nextLv === 15 || nextLv === 20;
  const rarityFactor = 1 + RARITY_META[item.rarity].rank * 0.28;
  const stones = Math.max(
    1,
    Math.round((2 + nextLv * 1.65 + (isBreakthrough ? 6 : 0)) * rarityFactor),
  );
  const gold = Math.max(
    30,
    Math.round((35 + item.itemLevel * 9 + nextLv * 32) * rarityFactor * (isBreakthrough ? 1.6 : 1)),
  );
  return { stones, gold, isBreakthrough };
}

export function enhanceEquipment(item: EquipmentItem): {
  upgraded: EquipmentItem;
  isBreakthrough: boolean;
} {
  if (item.enhanceLevel >= MAX_ENHANCE_LEVEL) {
    return { upgraded: item, isBreakthrough: false };
  }
  const nextLv = item.enhanceLevel + 1;
  const isBreakthrough = nextLv === 5 || nextLv === 10 || nextLv === 15 || nextLv === 20;

  const bump = (v?: number, minAdd = 1) =>
    v !== undefined ? v + Math.max(minAdd, Math.round(v * 0.048)) : undefined;

  const nextBase: EquipmentItem['baseStats'] = {
    ...(item.baseStats.atk !== undefined ? { atk: bump(item.baseStats.atk, 1) } : {}),
    ...(item.baseStats.mag !== undefined ? { mag: bump(item.baseStats.mag, 1) } : {}),
    ...(item.baseStats.def !== undefined ? { def: bump(item.baseStats.def, 1) } : {}),
    ...(item.baseStats.hp !== undefined ? { hp: bump(item.baseStats.hp, 3) } : {}),
    ...(item.baseStats.spd !== undefined ? { spd: bump(item.baseStats.spd, 1) } : {}),
  };

  const nextAffixes = isBreakthrough
    ? item.affixes.map((af) => ({
        ...af,
        value: Math.max(af.value + 1, Math.round(af.value * 1.12)),
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
      sellValue: Math.round(item.sellValue * 1.08),
    },
  };
}

export function getRerollCost(item: EquipmentItem): { stones: number; gold: number } {
  const rank = RARITY_META[item.rarity].rank;
  const tries = item.rerollCount;
  const stones = Math.max(2, Math.round((4 + rank * 2) * (1 + tries * 0.4)));
  const gold = Math.max(50, Math.round((60 + item.itemLevel * 14) * (1 + tries * 0.45)));
  return { stones, gold };
}

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

  const breakthroughs = Math.floor(item.enhanceLevel / 5);
  if (breakthroughs > 0) {
    fresh.value = Math.max(fresh.value + 1, Math.round(fresh.value * Math.pow(1.12, breakthroughs)));
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
    baseStats: { atk: 7, mag: 3 },
    affixes: [{ stat: 'magicFind', label: 'トレハン', value: 5, isPercent: true }],
    locked: false,
    sellValue: 20,
  };
}
