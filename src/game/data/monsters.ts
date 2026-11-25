import type {
  DungeonBiomeId,
  ElementType,
  MonsterRole,
  MonsterSpecies,
  MonsterTier,
  SkillDef,
  StatusEffectType,
} from '../types';

export const ROLE_LABELS: Record<MonsterRole, { label: string; color: string }> = {
  tank: { label: '前衛', color: '#4d96d6' },
  striker: { label: '物理', color: '#e06448' },
  mage: { label: '魔法', color: '#39b59a' },
  support: { label: '支援', color: '#63ba59' },
  speed: { label: '速攻', color: '#e6a837' },
};

export const TIER_LABELS: Record<MonsterTier, { label: string; color: string }> = {
  normal: { label: 'ノーマル', color: '#8f9bb8' },
  elite: { label: 'エリート', color: '#e8a238' },
  boss: { label: 'ボス', color: '#e84d60' },
};

export const HERO_SPECIES: MonsterSpecies = {
  id: 'hero',
  name: 'ルーンテイマー',
  title: '迷宮を統べる旅人',
  biome: 'hero',
  tier: 'normal',
  isBoss: false,
  role: 'striker',
  element: 'holy',
  spriteKey: 'hero',
  baseStats: { hp: 126, mp: 40, atk: 23, mag: 19, def: 13, spd: 16 },
  growth: { hp: 17, mp: 3.8, atk: 4.0, mag: 3.2, def: 2.1, spd: 1.05 },
  skills: [
    {
      id: 'rune_slash',
      name: 'ルーンスラッシュ',
      mpCost: 8,
      target: 'single_enemy',
      element: 'holy',
      power: 1.65,
      statScale: 'hybrid',
      kind: 'damage',
      critBonus: 8,
      description: '攻魔依存・会心+8%の光斬撃',
    },
    {
      id: 'tamer_command',
      name: 'テイマーの号令',
      mpCost: 14,
      target: 'all_allies',
      element: 'holy',
      power: 0.85,
      statScale: 'mag',
      kind: 'buff_atk',
      description: '味方全体の攻魔強化＆小回復',
    },
  ],
  passiveName: '絆のルーン',
  passiveDesc: 'MF+8%・攻撃+6%',
  passiveBonus: { magicFind: 8, atkPct: 6 },
  recruitRate: 0,
};

type SkillPreset =
  | 'slash'
  | 'cleave'
  | 'flurry'
  | 'crush'
  | 'bolt'
  | 'nova'
  | 'meteor'
  | 'drain'
  | 'heal_one'
  | 'heal_all'
  | 'shield_all'
  | 'buff_atk'
  | 'buff_def'
  | 'poison_strike'
  | 'burn_blast'
  | 'freeze_lance'
  | 'break_rend'
  | 'snipe';

interface MonsterSeed {
  id: string;
  name: string;
  title: string;
  biome: DungeonBiomeId;
  tier: MonsterTier;
  role: MonsterRole;
  element: ElementType;
  s1: [string, SkillPreset];
  s2: [string, SkillPreset];
  passive: [string, keyof MonsterSpecies['passiveBonus'], number];
}

const ROLE_BASE: Record<MonsterRole, MonsterSpecies['baseStats']> = {
  tank: { hp: 138, mp: 32, atk: 18, mag: 14, def: 22, spd: 11 },
  striker: { hp: 112, mp: 34, atk: 26, mag: 14, def: 13, spd: 16 },
  mage: { hp: 96, mp: 54, atk: 13, mag: 27, def: 11, spd: 15 },
  support: { hp: 108, mp: 50, atk: 14, mag: 23, def: 14, spd: 15 },
  speed: { hp: 100, mp: 38, atk: 22, mag: 18, def: 11, spd: 23 },
};

const ROLE_GROWTH: Record<MonsterRole, MonsterSpecies['growth']> = {
  tank: { hp: 20, mp: 3.0, atk: 3.0, mag: 2.2, def: 3.5, spd: 0.8 },
  striker: { hp: 15.5, mp: 3.2, atk: 4.4, mag: 2.2, def: 2.1, spd: 1.15 },
  mage: { hp: 13.5, mp: 5.5, atk: 2.0, mag: 4.6, def: 1.8, spd: 1.05 },
  support: { hp: 15.0, mp: 5.0, atk: 2.2, mag: 3.9, def: 2.2, spd: 1.0 },
  speed: { hp: 14.0, mp: 3.8, atk: 3.7, mag: 3.1, def: 1.8, spd: 1.55 },
};

const BIOME_STAT_MULT: Record<DungeonBiomeId, number> = {
  forest: 1.0,
  ruins: 1.08,
  volcano: 1.16,
  abyss: 1.24,
  glacier: 1.32,
  sanctum: 1.4,
};

const TIER_STAT_MULT: Record<MonsterTier, number> = {
  normal: 1.0,
  elite: 1.24,
  boss: 1.46,
};

const PASSIVE_LABELS: Record<keyof MonsterSpecies['passiveBonus'], [string, string]> = {
  atkPct: ['攻撃+', '%'],
  magPct: ['魔力+', '%'],
  defPct: ['防御+', '%'],
  hpPct: ['HP+', '%'],
  critRate: ['会心+', '%'],
  lifesteal: ['吸血+', '%'],
  regenPct: ['再生+', '%'],
  magicFind: ['MF+', '%'],
  doubleHit: ['追撃+', '%'],
  spdFlat: ['素早さ+', ''],
  goldFind: ['金貨+', '%'],
};

function buildSkill(
  idPrefix: string,
  name: string,
  preset: SkillPreset,
  element: ElementType,
  tier: MonsterTier,
): SkillDef {
  const tierPowerBoost = tier === 'boss' ? 1.18 : tier === 'elite' ? 1.08 : 1.0;
  const p = (v: number) => Number((v * tierPowerBoost).toFixed(2));
  const status = (type: StatusEffectType, chance: number, turns: number) => ({
    type,
    chance,
    turns,
  });

  switch (preset) {
    case 'slash':
      return {
        id: `${idPrefix}_slash`,
        name,
        mpCost: 8,
        target: 'single_enemy',
        element,
        power: p(1.65),
        statScale: 'atk',
        kind: 'damage',
        critBonus: 8,
        description: '単体に鋭い物理斬撃',
      };
    case 'cleave':
      return {
        id: `${idPrefix}_cleave`,
        name,
        mpCost: 11,
        target: 'all_enemies',
        element,
        power: p(1.18),
        statScale: 'atk',
        kind: 'damage',
        description: '敵全体へ薙ぎ払い攻撃',
      };
    case 'flurry':
      return {
        id: `${idPrefix}_flurry`,
        name,
        mpCost: 11,
        target: 'single_enemy',
        element,
        power: p(0.66),
        statScale: 'atk',
        kind: 'damage',
        hits: 3,
        critBonus: 10,
        description: '単体へ高速3連撃',
      };
    case 'crush':
      return {
        id: `${idPrefix}_crush`,
        name,
        mpCost: 10,
        target: 'single_enemy',
        element,
        power: p(1.72),
        statScale: 'def',
        kind: 'damage',
        description: '防御依存の重打撃',
      };
    case 'bolt':
      return {
        id: `${idPrefix}_bolt`,
        name,
        mpCost: 9,
        target: 'single_enemy',
        element,
        power: p(1.75),
        statScale: 'mag',
        kind: 'damage',
        description: '単体へ高威力魔法弾',
      };
    case 'nova':
      return {
        id: `${idPrefix}_nova`,
        name,
        mpCost: 12,
        target: 'all_enemies',
        element,
        power: p(1.2),
        statScale: 'mag',
        kind: 'damage',
        description: '敵全体へ魔力波動',
      };
    case 'meteor':
      return {
        id: `${idPrefix}_meteor`,
        name,
        mpCost: 16,
        target: 'all_enemies',
        element,
        power: p(1.38),
        statScale: 'hybrid',
        kind: 'damage',
        critBonus: 8,
        description: '敵全体へ攻魔依存の強襲',
      };
    case 'drain':
      return {
        id: `${idPrefix}_drain`,
        name,
        mpCost: 11,
        target: 'single_enemy',
        element,
        power: p(1.42),
        statScale: 'hybrid',
        kind: 'drain',
        description: '攻撃しつつHP吸収',
      };
    case 'heal_one':
      return {
        id: `${idPrefix}_healo`,
        name,
        mpCost: 9,
        target: 'single_ally',
        element,
        power: p(1.45),
        statScale: 'mag',
        kind: 'heal',
        description: '味方単体を回復＆状態治療',
      };
    case 'heal_all':
      return {
        id: `${idPrefix}_heala`,
        name,
        mpCost: 13,
        target: 'all_allies',
        element,
        power: p(1.12),
        statScale: 'mag',
        kind: 'heal',
        description: '味方全体を回復＆状態治療',
      };
    case 'shield_all':
      return {
        id: `${idPrefix}_shield`,
        name,
        mpCost: 12,
        target: 'all_allies',
        element,
        power: p(1.12),
        statScale: 'def',
        kind: 'shield',
        description: '味方全体に防護バリア',
      };
    case 'buff_atk':
      return {
        id: `${idPrefix}_batk`,
        name,
        mpCost: 12,
        target: 'all_allies',
        element,
        power: p(0.85),
        statScale: 'mag',
        kind: 'buff_atk',
        description: '味方全体の攻魔強化＆小回復',
      };
    case 'buff_def':
      return {
        id: `${idPrefix}_bdef`,
        name,
        mpCost: 11,
        target: 'all_allies',
        element,
        power: p(1.0),
        statScale: 'def',
        kind: 'buff_def',
        description: '味方全体の防御強化＆小盾',
      };
    case 'poison_strike':
      return {
        id: `${idPrefix}_pois`,
        name,
        mpCost: 10,
        target: 'single_enemy',
        element,
        power: p(1.45),
        statScale: 'atk',
        kind: 'damage',
        statusEffect: status('poison', 0.6, 3),
        description: '単体攻撃・高率で毒付与',
      };
    case 'burn_blast':
      return {
        id: `${idPrefix}_burn`,
        name,
        mpCost: 12,
        target: 'all_enemies',
        element,
        power: p(1.12),
        statScale: 'mag',
        kind: 'damage',
        statusEffect: status('burn', 0.5, 3),
        description: '全体炎撃・火傷付与',
      };
    case 'freeze_lance':
      return {
        id: `${idPrefix}_frz`,
        name,
        mpCost: 12,
        target: 'single_enemy',
        element,
        power: p(1.52),
        statScale: 'mag',
        kind: 'damage',
        statusEffect: status('freeze', 0.42, 1),
        description: '単体氷撃・凍結付与',
      };
    case 'break_rend':
      return {
        id: `${idPrefix}_brk`,
        name,
        mpCost: 11,
        target: 'single_enemy',
        element,
        power: p(1.5),
        statScale: 'atk',
        kind: 'damage',
        statusEffect: status('def_break', 0.62, 3),
        description: '単体強撃・防御低下付与',
      };
    case 'snipe':
      return {
        id: `${idPrefix}_snipe`,
        name,
        mpCost: 10,
        target: 'single_enemy',
        element,
        power: p(1.58),
        statScale: 'atk',
        kind: 'damage',
        critBonus: 22,
        statusBonus: 1.25,
        description: '高会心・状態異常敵へ追撃増',
      };
  }
}

function hashSeed(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function buildSpecies(seed: MonsterSeed): MonsterSpecies {
  const rb = ROLE_BASE[seed.role];
  const rg = ROLE_GROWTH[seed.role];
  const bm = BIOME_STAT_MULT[seed.biome];
  const tm = TIER_STAT_MULT[seed.tier];
  const h = hashSeed(seed.id);
  const jitter = (shift: number) => 0.94 + (((h >> shift) & 15) / 15) * 0.12;

  const baseStats = {
    hp: Math.round(rb.hp * bm * tm * jitter(0)),
    mp: Math.round(rb.mp * (0.95 + (bm - 1) * 0.5) * (seed.tier === 'boss' ? 1.25 : 1) * jitter(4)),
    atk: Math.round(rb.atk * bm * tm * jitter(8)),
    mag: Math.round(rb.mag * bm * tm * jitter(12)),
    def: Math.round(rb.def * bm * tm * jitter(16)),
    spd: Math.round(rb.spd * (0.98 + (bm - 1) * 0.35) * (seed.tier === 'boss' ? 1.12 : seed.tier === 'elite' ? 1.06 : 1) * jitter(20)),
  };

  const growth = {
    hp: Number((rg.hp * (0.96 + (bm - 1) * 0.3) * (seed.tier === 'boss' ? 1.22 : seed.tier === 'elite' ? 1.1 : 1)).toFixed(1)),
    mp: Number((rg.mp * (seed.tier === 'boss' ? 1.15 : 1)).toFixed(1)),
    atk: Number((rg.atk * (0.96 + (bm - 1) * 0.25) * (seed.tier === 'boss' ? 1.18 : seed.tier === 'elite' ? 1.08 : 1)).toFixed(2)),
    mag: Number((rg.mag * (0.96 + (bm - 1) * 0.25) * (seed.tier === 'boss' ? 1.18 : seed.tier === 'elite' ? 1.08 : 1)).toFixed(2)),
    def: Number((rg.def * (0.96 + (bm - 1) * 0.25) * (seed.tier === 'boss' ? 1.18 : seed.tier === 'elite' ? 1.08 : 1)).toFixed(2)),
    spd: Number((rg.spd * (seed.tier === 'boss' ? 1.1 : 1)).toFixed(2)),
  };

  const [pName, pKey, pVal] = seed.passive;
  const [pPrefix, pSuffix] = PASSIVE_LABELS[pKey];

  return {
    id: seed.id,
    name: seed.name,
    title: seed.title,
    biome: seed.biome,
    tier: seed.tier,
    isBoss: seed.tier === 'boss',
    role: seed.role,
    element: seed.element,
    spriteKey: seed.id,
    baseStats,
    growth,
    skills: [
      buildSkill(`${seed.id}_1`, seed.s1[0], seed.s1[1], seed.element, seed.tier),
      buildSkill(`${seed.id}_2`, seed.s2[0], seed.s2[1], seed.element, seed.tier),
    ],
    passiveName: pName,
    passiveDesc: `${pPrefix}${pVal}${pSuffix}`,
    passiveBonus: { [pKey]: pVal },
    recruitRate: seed.tier === 'boss' ? 0.16 : seed.tier === 'elite' ? 0.2 : 0.28,
  };
}

// =========================================================================
// 150 COMPLETELY DISTINCT MONSTERS (NO VARIANTS / NO RESKINS)
//   - BOSS:   10
//   - ELITE:  30 (5 per biome)
//   - NORMAL: 110 (19 forest, 18 ruins, 18 volcano, 18 abyss, 18 glacier, 19 sanctum)
// =========================================================================
const MONSTER_SEEDS: MonsterSeed[] = [
  // ==================== BOSSES (10) ====================
  { id: 'ancient_treant', name: '森の古樹王', title: '千年巨樹', biome: 'forest', tier: 'boss', role: 'tank', element: 'nature', s1: ['世界樹の鉄槌', 'crush'], s2: ['深緑の再生域', 'heal_all'], passive: ['古樹の根', 'regenPct', 6] },
  { id: 'rune_golem', name: 'ルーン巨神', title: '古代守護像', biome: 'ruins', tier: 'boss', role: 'tank', element: 'earth', s1: ['刻印崩壊拳', 'break_rend'], s2: ['古代石壁結界', 'shield_all'], passive: ['巨神装甲', 'defPct', 16] },
  { id: 'crimson_wyrm', name: '紅蓮の覇竜', title: '溶岩の主', biome: 'volcano', tier: 'boss', role: 'striker', element: 'fire', s1: ['業火ブレス', 'burn_blast'], s2: ['竜爪乱舞', 'flurry'], passive: ['覇竜鱗', 'atkPct', 15] },
  { id: 'star_devourer', name: '星喰いの虚無獣', title: '深淵の捕食者', biome: 'abyss', tier: 'boss', role: 'mage', element: 'star', s1: ['星屑崩壊波', 'meteor'], s2: ['虚無吸収', 'drain'], passive: ['星界の胃袋', 'magPct', 16] },
  { id: 'glacier_leviathan', name: '氷海巨鯨リヴァイアサン', title: '極寒の海皇', biome: 'glacier', tier: 'boss', role: 'tank', element: 'star', s1: ['絶零の大津波', 'freeze_lance'], s2: ['氷殻の護り', 'buff_def'], passive: ['極氷巨体', 'hpPct', 18] },
  { id: 'seraph_omega', name: '終焉の熾天使オメガ', title: '六翼の裁定者', biome: 'sanctum', tier: 'boss', role: 'support', element: 'holy', s1: ['終焉の聖光', 'meteor'], s2: ['熾天の恩寵', 'heal_all'], passive: ['六翼の光輪', 'magPct', 15] },
  { id: 'abyss_kraken', name: '深海覇王クラーケン', title: '千腕の海魔', biome: 'glacier', tier: 'boss', role: 'mage', element: 'star', s1: ['大渦メイルシュトローム', 'nova'], s2: ['墨毒の拘束', 'poison_strike'], passive: ['深海触腕', 'doubleHit', 10] },
  { id: 'chronos_mantis', name: '時空鎌王クロノマンティス', title: '刻を断つ刃', biome: 'ruins', tier: 'boss', role: 'speed', element: 'earth', s1: ['時断ち連鎌', 'flurry'], s2: ['刻削ぎの一閃', 'snipe'], passive: ['加速歯車', 'spdFlat', 8] },
  { id: 'asura_emperor', name: '千手修羅帝アスラ', title: '六臂の戦神', biome: 'volcano', tier: 'boss', role: 'striker', element: 'fire', s1: ['修羅六連撃', 'flurry'], s2: ['阿修羅業火陣', 'burn_blast'], passive: ['修羅闘気', 'critRate', 10] },
  { id: 'genesis_orrery', name: '創世天球神アルケミア', title: '万象を回す星盤', biome: 'sanctum', tier: 'boss', role: 'mage', element: 'holy', s1: ['創世軌道砲', 'meteor'], s2: ['天球の号令', 'buff_atk'], passive: ['天球の叡智', 'magicFind', 14] },

  // ==================== ELITES (30: 5 PER BIOME) ====================
  // Forest Elites (5)
  { id: 'stag_monarch', name: '森王エルク', title: '白銀角の主', biome: 'forest', tier: 'elite', role: 'tank', element: 'nature', s1: ['巨角突撃', 'crush'], s2: ['森王の威光', 'buff_def'], passive: ['巨角の護り', 'hpPct', 12] },
  { id: 'mandrake_queen', name: 'マンドラゴラ女王', title: '絶叫の薬根', biome: 'forest', tier: 'elite', role: 'support', element: 'nature', s1: ['魅了の絶叫', 'nova'], s2: ['豊穣の霊薬', 'heal_all'], passive: ['霊根の芳香', 'regenPct', 4] },
  { id: 'horn_beetle_king', name: 'ヘラクレス甲王', title: '黄金甲殻', biome: 'forest', tier: 'elite', role: 'striker', element: 'earth', s1: ['巨角かち上げ', 'break_rend'], s2: ['甲王タックル', 'crush'], passive: ['黄金外殻', 'defPct', 11] },
  { id: 'dryad_oracle', name: '樹精巫女ドライアド', title: '森の預言者', biome: 'forest', tier: 'elite', role: 'mage', element: 'nature', s1: ['荊棘の嵐', 'nova'], s2: ['森霊の癒し', 'heal_one'], passive: ['木霊の加護', 'magPct', 11] },
  { id: 'emerald_basilisk', name: '翡翠のバジリスク', title: '石化睨みの怪', biome: 'forest', tier: 'elite', role: 'speed', element: 'nature', s1: ['石化毒牙', 'poison_strike'], s2: ['翡翠疾走', 'snipe'], passive: ['魔眼の威圧', 'critRate', 7] },

  // Ruins Elites (5)
  { id: 'mimic', name: '宝箱ミミック', title: '強欲の罠箱', biome: 'ruins', tier: 'elite', role: 'speed', element: 'earth', s1: ['強欲の大顎', 'drain'], s2: ['金貨の嵐', 'cleave'], passive: ['財宝嗅覚', 'goldFind', 18] },
  { id: 'shield_knight', name: '鉄壁の盾騎士', title: '遺跡の白銀衛', biome: 'ruins', tier: 'elite', role: 'tank', element: 'earth', s1: ['大盾破砕', 'crush'], s2: ['不落の陣形', 'shield_all'], passive: ['白銀の誓い', 'defPct', 12] },
  { id: 'gargoyle_warden', name: '尖塔のガーゴイル', title: '石翼の監視者', biome: 'ruins', tier: 'elite', role: 'striker', element: 'earth', s1: ['急降下石爪', 'slash'], s2: ['石化の咆哮', 'break_rend'], passive: ['石像硬化', 'defPct', 10] },
  { id: 'pharaoh_mummy', name: '呪詛のミイラ王', title: '王墓の支配者', biome: 'ruins', tier: 'elite', role: 'mage', element: 'star', s1: ['王墓の呪縛', 'poison_strike'], s2: ['砂嵐の呪文', 'nova'], passive: ['不朽の包帯', 'hpPct', 11] },
  { id: 'clockwork_centaur', name: '歯車騎兵ケンタウロス', title: '自動人馬兵', biome: 'ruins', tier: 'elite', role: 'speed', element: 'earth', s1: ['突撃槍連打', 'flurry'], s2: ['蒸気加速', 'buff_atk'], passive: ['精密機構', 'spdFlat', 6] },

  // Volcano Elites (5)
  { id: 'ash_witch', name: '灰の魔女', title: '焦土の黒衣', biome: 'volcano', tier: 'elite', role: 'mage', element: 'fire', s1: ['灰燼の業火', 'burn_blast'], s2: ['紅蓮魔弾', 'bolt'], passive: ['燃え殻魔術', 'magPct', 12] },
  { id: 'ifrit_djinn', name: '炎魔人イフリート', title: '紅蓮の魔神', biome: 'volcano', tier: 'elite', role: 'striker', element: 'fire', s1: ['地獄の業炎拳', 'burn_blast'], s2: ['灼熱連打', 'flurry'], passive: ['炎帝の血', 'atkPct', 12] },
  { id: 'obsidian_minotaur', name: '黒曜のミノタウロス', title: '迷宮の牛頭戦士', biome: 'volcano', tier: 'elite', role: 'tank', element: 'fire', s1: ['黒曜戦斧断', 'break_rend'], s2: ['雄叫び鼓舞', 'buff_atk'], passive: ['剛牛の肉体', 'hpPct', 13] },
  { id: 'magma_hydra', name: '三頭蛇ヒュドラ', title: '不死の多首怪', biome: 'volcano', tier: 'elite', role: 'striker', element: 'fire', s1: ['三頭噛み砕き', 'flurry'], s2: ['猛毒炎息', 'poison_strike'], passive: ['首再生', 'regenPct', 5] },
  { id: 'hellhound_cerberus', name: '地獄番犬ケルベロス', title: '冥門の三頭犬', biome: 'volcano', tier: 'elite', role: 'speed', element: 'fire', s1: ['三連火牙', 'flurry'], s2: ['冥炎の遠吠え', 'burn_blast'], passive: ['冥界嗅覚', 'doubleHit', 8] },

  // Abyss Elites (5)
  { id: 'void_herald', name: '虚無の使徒', title: '星界の先触れ', biome: 'abyss', tier: 'elite', role: 'mage', element: 'star', s1: ['虚無崩壊波', 'meteor'], s2: ['星界の啓示', 'buff_atk'], passive: ['星界の導き', 'magicFind', 12] },
  { id: 'eclipse_reaper', name: '黒蝕の死神', title: '魂刈りの大鎌', biome: 'abyss', tier: 'elite', role: 'striker', element: 'star', s1: ['魂刈り大鎌', 'drain'], s2: ['黒蝕破甲', 'break_rend'], passive: ['死神の収穫', 'lifesteal', 7] },
  { id: 'beholder_tyrant', name: '百眼魔球ビホルダー', title: '全視の暴君', biome: 'abyss', tier: 'elite', role: 'mage', element: 'star', s1: ['魔眼斉射', 'nova'], s2: ['虚空凝視', 'freeze_lance'], passive: ['全視の瞳', 'critRate', 8] },
  { id: 'nebula_manta', name: '星海エイ・マンタレイ', title: '銀河の滑空者', biome: 'abyss', tier: 'elite', role: 'speed', element: 'star', s1: ['星屑滑空斬', 'cleave'], s2: ['銀河閃光', 'snipe'], passive: ['星流滑空', 'spdFlat', 7] },
  { id: 'dullahan_rider', name: '首なし騎士デュラハン', title: '冥馬の亡霊', biome: 'abyss', tier: 'elite', role: 'striker', element: 'star', s1: ['亡霊の断頭刃', 'snipe'], s2: ['黒馬蹂躙', 'cleave'], passive: ['不死の執念', 'atkPct', 11] },

  // Glacier Elites (5)
  { id: 'yeti_chieftain', name: '雪原巨獣イエティ', title: '白銀の雪男長', biome: 'glacier', tier: 'elite', role: 'tank', element: 'earth', s1: ['雪崩ハンマー', 'crush'], s2: ['吹雪の雄叫び', 'buff_def'], passive: ['極寒剛毛', 'hpPct', 13] },
  { id: 'frost_valkyrie', name: '白銀戦乙女ワルキューレ', title: '氷槍の選定者', biome: 'glacier', tier: 'elite', role: 'speed', element: 'holy', s1: ['氷槍一閃', 'freeze_lance'], s2: ['戦乙女の連舞', 'flurry'], passive: ['氷翼の疾風', 'spdFlat', 7] },
  { id: 'mammoth_colossus', name: '氷河マンモス', title: '万年氷の巨象', biome: 'glacier', tier: 'elite', role: 'tank', element: 'earth', s1: ['巨牙粉砕', 'break_rend'], s2: ['氷壁突進', 'shield_all'], passive: ['氷河巨牙', 'defPct', 12] },
  { id: 'aurora_pegasus', name: '極光のペガサス', title: '天翔ける白馬', biome: 'glacier', tier: 'elite', role: 'support', element: 'holy', s1: ['オーロラの癒し', 'heal_all'], s2: ['極光閃蹄', 'bolt'], passive: ['天馬の羽根', 'spdFlat', 6] },
  { id: 'blizzard_wendigo', name: '凍飢獣ウェンディゴ', title: '鹿骨の氷魔', biome: 'glacier', tier: 'elite', role: 'striker', element: 'star', s1: ['凍てつく捕食', 'drain'], s2: ['絶対零度爪', 'freeze_lance'], passive: ['凍土の飢え', 'lifesteal', 7] },

  // Sanctum Elites (5)
  { id: 'prism_sphinx', name: '虹晶スフィンクス', title: '謎を司る聖賢', biome: 'sanctum', tier: 'elite', role: 'mage', element: 'holy', s1: ['審判の謎光', 'nova'], s2: ['虹晶障壁', 'shield_all'], passive: ['聖賢の知識', 'magPct', 12] },
  { id: 'solar_griffin', name: '太陽のグリフォン', title: '黄金翼の聖獣', biome: 'sanctum', tier: 'elite', role: 'speed', element: 'holy', s1: ['急降下聖爪', 'snipe'], s2: ['太陽翼旋風', 'cleave'], passive: ['黄金の翼', 'doubleHit', 8] },
  { id: 'celestial_kirin', name: '聖獣キリン', title: '雷光を纏う瑞獣', biome: 'sanctum', tier: 'elite', role: 'support', element: 'holy', s1: ['瑞光の祝福', 'heal_all'], s2: ['紫電の角撃', 'bolt'], passive: ['瑞獣の加護', 'magicFind', 10] },
  { id: 'golden_anubis', name: '冥界審判アヌビス', title: '天秤の裁き手', biome: 'sanctum', tier: 'elite', role: 'striker', element: 'holy', s1: ['魂の天秤斬', 'break_rend'], s2: ['冥審の杖撃', 'drain'], passive: ['審判の眼', 'critRate', 8] },
  { id: 'cherub_throne', name: '灼光輪オファニム', title: '千眼の聖車輪', biome: 'sanctum', tier: 'elite', role: 'tank', element: 'holy', s1: ['聖輪炎光', 'burn_blast'], s2: ['絶対光輪壁', 'shield_all'], passive: ['不滅の聖輪', 'defPct', 13] },

  // ==================== NORMALS (110) ====================
  // Forest Normals (19)
  { id: 'leaf_slime', name: 'リーフスライム', title: '朝露の癒し手', biome: 'forest', tier: 'normal', role: 'support', element: 'nature', s1: ['癒しのしずく', 'heal_all'], s2: ['リーフスプラッシュ', 'nova'], passive: ['朝露の恵み', 'regenPct', 3] },
  { id: 'acorn_boar', name: 'ドングリイノシシ', title: '堅殻の突撃猪', biome: 'forest', tier: 'normal', role: 'tank', element: 'earth', s1: ['殻突進', 'crush'], s2: ['堅実ガード', 'buff_def'], passive: ['堅いドングリ殻', 'defPct', 8] },
  { id: 'moss_fox', name: 'コケギツネ', title: '森影の疾風', biome: 'forest', tier: 'normal', role: 'speed', element: 'nature', s1: ['木漏れ日連爪', 'flurry'], s2: ['森風の鼓舞', 'buff_atk'], passive: ['森の健脚', 'spdFlat', 4] },
  { id: 'thorn_sprite', name: 'イバラ妖精', title: '棘を操る小妖精', biome: 'forest', tier: 'normal', role: 'mage', element: 'nature', s1: ['イバラの鞭', 'poison_strike'], s2: ['花嵐', 'nova'], passive: ['妖精の悪戯', 'magPct', 8] },
  { id: 'cap_mushroom', name: '胞子キノコ', title: '眠り胞子茸', biome: 'forest', tier: 'normal', role: 'support', element: 'nature', s1: ['毒胞子散布', 'poison_strike'], s2: ['菌糸の癒し', 'heal_one'], passive: ['胞子幕', 'hpPct', 7] },
  { id: 'dew_frog', name: '雫カエル', title: '水辺の跳躍者', biome: 'forest', tier: 'normal', role: 'speed', element: 'nature', s1: ['水鉄砲', 'bolt'], s2: ['大跳躍キック', 'slash'], passive: ['跳躍力', 'spdFlat', 4] },
  { id: 'pine_hedgehog', name: '松毬ハリネズミ', title: '針鎧の小獣', biome: 'forest', tier: 'normal', role: 'tank', element: 'earth', s1: ['針玉アタック', 'crush'], s2: ['丸まり防御', 'buff_def'], passive: ['松針ガード', 'defPct', 8] },
  { id: 'clover_rabbit', name: '四葉ウサギ', title: '幸運の白兎', biome: 'forest', tier: 'normal', role: 'speed', element: 'nature', s1: ['うさぎ連脚', 'flurry'], s2: ['四葉の祈り', 'heal_one'], passive: ['四葉の幸運', 'magicFind', 8] },
  { id: 'bark_turtle', name: '樹皮ガメ', title: '苔甲羅の長老亀', biome: 'forest', tier: 'normal', role: 'tank', element: 'nature', s1: ['甲羅体当たり', 'crush'], s2: ['樹皮バリア', 'shield_all'], passive: ['重厚甲羅', 'defPct', 9] },
  { id: 'nectar_bee', name: '蜜針ハチ', title: '森の針射手', biome: 'forest', tier: 'normal', role: 'striker', element: 'nature', s1: ['毒針突き', 'poison_strike'], s2: ['急所狙い針', 'snipe'], passive: ['鋭針', 'critRate', 6] },
  { id: 'fern_chameleon', name: '羊歯カメレオン', title: '擬態の狩人', biome: 'forest', tier: 'normal', role: 'speed', element: 'nature', s1: ['舌打ち強襲', 'snipe'], s2: ['葉隠れ連撃', 'flurry'], passive: ['擬態先制', 'critRate', 5] },
  { id: 'bloom_alraune', name: '向日葵アルラウネ', title: '陽光の精霊花', biome: 'forest', tier: 'normal', role: 'mage', element: 'nature', s1: ['ソーラー花弁', 'nova'], s2: ['蜜の癒し', 'heal_all'], passive: ['光合成', 'regenPct', 3] },
  { id: 'amber_squirrel', name: '琥珀リス', title: '樹上の収集家', biome: 'forest', tier: 'normal', role: 'speed', element: 'nature', s1: ['木の実連投', 'flurry'], s2: ['琥珀のかじり', 'slash'], passive: ['木の実貯蓄', 'goldFind', 10] },
  { id: 'ivy_serpent', name: '蔦ヘビ', title: '絡みつく緑蛇', biome: 'forest', tier: 'normal', role: 'striker', element: 'nature', s1: ['猛毒の牙', 'poison_strike'], s2: ['蔦締め付け', 'break_rend'], passive: ['蛇の執念', 'atkPct', 7] },
  { id: 'moss_snail', name: '苔カタツムリ', title: '螺旋殻の歩み', biome: 'forest', tier: 'normal', role: 'tank', element: 'nature', s1: ['粘液ショット', 'poison_strike'], s2: ['殻こもり壁', 'shield_all'], passive: ['螺旋の守り', 'hpPct', 9] },
  { id: 'bambo_tanuki', name: '竹林タヌキ', title: '化け葉の太鼓叩き', biome: 'forest', tier: 'normal', role: 'support', element: 'nature', s1: ['腹鼓の号令', 'buff_atk'], s2: ['竹槍突き', 'slash'], passive: ['商売上手', 'goldFind', 12] },
  { id: 'canopy_monkey', name: '樹冠サル', title: '枝渡りの暴れん坊', biome: 'forest', tier: 'normal', role: 'striker', element: 'physical', s1: ['連打ひっかき', 'flurry'], s2: ['枝落とし強打', 'break_rend'], passive: ['野生の腕力', 'atkPct', 8] },
  { id: 'pollen_moth', name: '鱗粉ガ', title: '月夜に舞う大蛾', biome: 'forest', tier: 'normal', role: 'mage', element: 'nature', s1: ['毒鱗粉の風', 'poison_strike'], s2: ['羽ばたき魔波', 'nova'], passive: ['燐光鱗粉', 'magPct', 8] },
  { id: 'root_badger', name: '根掘りアナグマ', title: '大爪の穴掘り獣', biome: 'forest', tier: 'normal', role: 'striker', element: 'earth', s1: ['大爪破砕', 'break_rend'], s2: ['土煙アタック', 'cleave'], passive: ['掘り出し勘', 'magicFind', 7] },

  // Ruins Normals (18)
  { id: 'stone_imp', name: '石の小鬼', title: '遺跡のいたずら者', biome: 'ruins', tier: 'normal', role: 'striker', element: 'earth', s1: ['砕石スマッシュ', 'break_rend'], s2: ['投石連打', 'flurry'], passive: ['石肌', 'atkPct', 7] },
  { id: 'crystal_bat', name: '水晶コウモリ', title: '反響する翼', biome: 'ruins', tier: 'normal', role: 'speed', element: 'star', s1: ['吸血バイト', 'drain'], s2: ['超音波衝撃', 'nova'], passive: ['夜行吸血', 'lifesteal', 5] },
  { id: 'owl_sage', name: '賢者フクロウ', title: '古書を守る梟', biome: 'ruins', tier: 'normal', role: 'support', element: 'holy', s1: ['叡智の回復光', 'heal_all'], s2: ['星知の光弾', 'bolt'], passive: ['賢者の知恵', 'magPct', 8] },
  { id: 'rattle_skeleton', name: 'カタカタ骸骨', title: '古戦場の骨兵', biome: 'ruins', tier: 'normal', role: 'striker', element: 'physical', s1: ['錆剣斬り', 'slash'], s2: ['骨投げ連撃', 'flurry'], passive: ['不屈の骨', 'doubleHit', 5] },
  { id: 'clay_terracotta', name: '埴輪兵士', title: '土偶の槍衛兵', biome: 'ruins', tier: 'normal', role: 'tank', element: 'earth', s1: ['土槍突き', 'crush'], s2: ['土壁の陣', 'buff_def'], passive: ['素焼き装甲', 'defPct', 8] },
  { id: 'dust_scarab', name: '黄金スカラベ', title: '太陽の聖甲虫', biome: 'ruins', tier: 'normal', role: 'support', element: 'earth', s1: ['黄金玉転がし', 'crush'], s2: ['聖虫の祝福', 'buff_atk'], passive: ['黄金収集', 'goldFind', 14] },
  { id: 'crypt_spider', name: '地下墓クモ', title: '銀糸の待ち伏せ', biome: 'ruins', tier: 'normal', role: 'speed', element: 'earth', s1: ['毒糸咬み', 'poison_strike'], s2: ['網張り連撃', 'flurry'], passive: ['糸罠の極意', 'spdFlat', 4] },
  { id: 'cursed_grimoire', name: '浮遊魔導書', title: '自律する禁書', biome: 'ruins', tier: 'normal', role: 'mage', element: 'star', s1: ['禁呪ページ展開', 'nova'], s2: ['魔文字弾', 'bolt'], passive: ['魔導知識', 'magPct', 9] },
  { id: 'rust_automaton', name: '錆びたカラクリ', title: '古代のゼンマイ兵', biome: 'ruins', tier: 'normal', role: 'tank', element: 'earth', s1: ['鉄腕ハンマー', 'crush'], s2: ['鉄板展開', 'shield_all'], passive: ['重鉄フレーム', 'hpPct', 9] },
  { id: 'sand_scorpion', name: '砂岩サソリ', title: '尾針の暗殺虫', biome: 'ruins', tier: 'normal', role: 'striker', element: 'earth', s1: ['猛毒尾針', 'poison_strike'], s2: ['挟撃シザーズ', 'snipe'], passive: ['砂漠の毒尾', 'critRate', 6] },
  { id: 'marble_bust', name: '動く大理石像', title: '意志持つ彫刻', biome: 'ruins', tier: 'normal', role: 'mage', element: 'earth', s1: ['石眼の怪光', 'bolt'], s2: ['大理石障壁', 'shield_all'], passive: ['彫刻の威厳', 'defPct', 8] },
  { id: 'lantern_wisp', name: '古灯ウィスプ', title: '迷い火の案内人', biome: 'ruins', tier: 'normal', role: 'mage', element: 'fire', s1: ['鬼火の輪', 'burn_blast'], s2: ['魂灯り', 'drain'], passive: ['揺らぐ灯火', 'magPct', 8] },
  { id: 'tomb_jackal', name: '遺跡ジャッカル', title: '墓守の野犬', biome: 'ruins', tier: 'normal', role: 'speed', element: 'earth', s1: ['砂塵の咬撃', 'slash'], s2: ['急所噛み裂き', 'snipe'], passive: ['墓荒らしの勘', 'spdFlat', 5] },
  { id: 'bronze_candelabra', name: '青銅の燭台鬼', title: '三本蝋燭の怪', biome: 'ruins', tier: 'normal', role: 'mage', element: 'fire', s1: ['蝋燭炎波', 'burn_blast'], s2: ['熱蝋落とし', 'bolt'], passive: ['消えぬ炎', 'magPct', 8] },
  { id: 'mosaic_lizard', name: '壁画トカゲ', title: '彩石の鱗爬虫', biome: 'ruins', tier: 'normal', role: 'speed', element: 'earth', s1: ['尾打ち連撃', 'flurry'], s2: ['彩石突進', 'slash'], passive: ['壁走り', 'spdFlat', 5] },
  { id: 'relic_urn', name: '呪いの壺', title: '封印の古陶器', biome: 'ruins', tier: 'normal', role: 'tank', element: 'earth', s1: ['怨念噴出', 'poison_strike'], s2: ['鉄壺の守り', 'buff_def'], passive: ['硬質陶器', 'hpPct', 9] },
  { id: 'obelisk_eye', name: 'オベリスクの瞳', title: '監視する石碑', biome: 'ruins', tier: 'normal', role: 'mage', element: 'star', s1: ['監視レーザー', 'bolt'], s2: ['石碑の共鳴', 'nova'], passive: ['古代測距', 'critRate', 6] },
  { id: 'cobweb_rat', name: '遺跡ネズミ', title: '抜け道の小盗賊', biome: 'ruins', tier: 'normal', role: 'speed', element: 'physical', s1: ['前歯かじり', 'break_rend'], s2: ['素早い逃走斬', 'flurry'], passive: ['小銭拾い', 'goldFind', 10] },

  // Volcano Normals (18)
  { id: 'magma_crab', name: '溶岩ガニ', title: '赤熱の甲殻', biome: 'volcano', tier: 'normal', role: 'tank', element: 'fire', s1: ['灼熱シザー', 'break_rend'], s2: ['溶岩殻ガード', 'shield_all'], passive: ['耐熱甲殻', 'defPct', 9] },
  { id: 'phoenix_chick', name: '不死鳥のヒナ', title: '小さな再生の炎', biome: 'volcano', tier: 'normal', role: 'support', element: 'fire', s1: ['再生の炎羽', 'heal_all'], s2: ['火の粉の舞', 'burn_blast'], passive: ['不死の幼羽', 'regenPct', 4] },
  { id: 'cinder_salamander', name: '熾火サラマンダー', title: '溶岩泳ぐ火蜥蜴', biome: 'volcano', tier: 'normal', role: 'striker', element: 'fire', s1: ['炎尾なぎ払い', 'cleave'], s2: ['灼熱噛みつき', 'burn_blast'], passive: ['炎の皮膚', 'atkPct', 8] },
  { id: 'sulfur_vulture', name: '硫黄ハゲワシ', title: '噴煙の滑空鳥', biome: 'volcano', tier: 'normal', role: 'speed', element: 'fire', s1: ['急降下くちばし', 'snipe'], s2: ['硫黄煙幕', 'poison_strike'], passive: ['上昇気流', 'spdFlat', 5] },
  { id: 'coal_mole', name: '石炭モグラ', title: '地中採掘の黒獣', biome: 'volcano', tier: 'normal', role: 'tank', element: 'earth', s1: ['地中突き上げ', 'crush'], s2: ['炭殻防御', 'buff_def'], passive: ['鉱脈探索', 'magicFind', 8] },
  { id: 'flare_centipede', name: '紅蓮ムカデ', title: '百足の炎節虫', biome: 'volcano', tier: 'normal', role: 'striker', element: 'fire', s1: ['百足連撃', 'flurry'], s2: ['焼灼毒牙', 'poison_strike'], passive: ['多脚連打', 'doubleHit', 6] },
  { id: 'basalt_rhino', name: '玄武岩サイ', title: '溶岩角の重戦車', biome: 'volcano', tier: 'normal', role: 'tank', element: 'earth', s1: ['岩角突進', 'crush'], s2: ['玄武岩装甲', 'buff_def'], passive: ['重戦車皮膚', 'hpPct', 10] },
  { id: 'ember_locust', name: '火の粉バッタ', title: '跳ね飛ぶ紅蓮蝗', biome: 'volcano', tier: 'normal', role: 'speed', element: 'fire', s1: ['火の粉キック', 'slash'], s2: ['灼熱大群波', 'cleave'], passive: ['炎跳躍', 'spdFlat', 5] },
  { id: 'lava_eel', name: '溶岩ウナギ', title: 'マグマの長魚', biome: 'volcano', tier: 'normal', role: 'striker', element: 'fire', s1: ['マグマ巻き付き', 'burn_blast'], s2: ['熱電撃', 'bolt'], passive: ['灼熱体液', 'atkPct', 8] },
  { id: 'smoke_hyena', name: '黒煙ハイエナ', title: '灰原の群れ狩人', biome: 'volcano', tier: 'normal', role: 'speed', element: 'fire', s1: ['黒煙急襲', 'snipe'], s2: ['砕骨噛み', 'break_rend'], passive: ['群れの嗅覚', 'critRate', 6] },
  { id: 'forge_goblin', name: '鍛冶ゴブリン', title: '槌振るう小鬼鍛冶', biome: 'volcano', tier: 'normal', role: 'striker', element: 'physical', s1: ['大槌フルスイング', 'break_rend'], s2: ['鍛冶の鼓舞', 'buff_atk'], passive: ['鍛冶師の腕', 'atkPct', 8] },
  { id: 'ash_armadillo', name: '灰殻アルマジロ', title: '転がる火球甲羅', biome: 'volcano', tier: 'normal', role: 'tank', element: 'earth', s1: ['火球ローリング', 'cleave'], s2: ['灰甲羅シールド', 'shield_all'], passive: ['耐熱丸甲', 'defPct', 9] },
  { id: 'flame_bomb', name: '爆裂火玉ボム', title: '膨張する炎霊', biome: 'volcano', tier: 'normal', role: 'mage', element: 'fire', s1: ['大爆発フレア', 'burn_blast'], s2: ['熱波弾', 'bolt'], passive: ['臨界火薬', 'magPct', 9] },
  { id: 'cinder_iguana', name: '火山イグアナ', title: '背びれ燃ゆる大蜥蜴', biome: 'volcano', tier: 'normal', role: 'striker', element: 'fire', s1: ['灼熱背びれ斬', 'slash'], s2: ['火炎ブレス', 'burn_blast'], passive: ['火山鱗', 'atkPct', 8] },
  { id: 'magma_ant', name: '熔鉄アリ', title: '鉄顎の働き蟻', biome: 'volcano', tier: 'normal', role: 'striker', element: 'fire', s1: ['熔鉄アゴ挟み', 'break_rend'], s2: ['蟻酸炎', 'poison_strike'], passive: ['怪力顎', 'atkPct', 8] },
  { id: 'volcano_ram', name: '灼熱オオツノヒツジ', title: '螺旋炎角の雄羊', biome: 'volcano', tier: 'normal', role: 'tank', element: 'fire', s1: ['炎角ヘッドバット', 'crush'], s2: ['熱羊毛ガード', 'buff_def'], passive: ['不燃羊毛', 'hpPct', 9] },
  { id: 'blazing_crow', name: '火炎ガラス', title: '黒羽纏う火鳥', biome: 'volcano', tier: 'normal', role: 'speed', element: 'fire', s1: ['紅蓮ダイブ', 'snipe'], s2: ['炎羽ばらまき', 'burn_blast'], passive: ['黒炎翼', 'spdFlat', 5] },
  { id: 'soot_weasel', name: '煤カマイタチ', title: '熱風の旋風鼬', biome: 'volcano', tier: 'normal', role: 'speed', element: 'fire', s1: ['熱風かまいたち', 'flurry'], s2: ['煤煙一閃', 'cleave'], passive: ['旋風脚', 'doubleHit', 6] },

  // Abyss Normals (18)
  { id: 'star_jelly', name: '星海クラゲ', title: '銀河を漂う水母', biome: 'abyss', tier: 'normal', role: 'support', element: 'star', s1: ['星光の癒し', 'heal_all'], s2: ['銀河しびれ触手', 'nova'], passive: ['星海浮遊', 'regenPct', 4] },
  { id: 'lunar_wolf', name: '銀月のオオカミ', title: '満月を仰ぐ銀狼', biome: 'abyss', tier: 'normal', role: 'speed', element: 'star', s1: ['月牙連撃', 'flurry'], s2: ['銀月の遠吠え', 'buff_atk'], passive: ['月下の疾走', 'spdFlat', 5] },
  { id: 'astral_nautilus', name: '星殻オウムガイ', title: '古代螺旋の星貝', biome: 'abyss', tier: 'normal', role: 'tank', element: 'star', s1: ['星殻ジェット', 'crush'], s2: ['黄金螺旋結界', 'shield_all'], passive: ['星殻装甲', 'defPct', 9] },
  { id: 'comet_seahorse', name: '彗星タツノオトシゴ', title: '尾星曳く海竜馬', biome: 'abyss', tier: 'normal', role: 'mage', element: 'star', s1: ['彗星泡弾', 'bolt'], s2: ['流星群の調べ', 'nova'], passive: ['彗星の尾', 'magPct', 9] },
  { id: 'cosmos_butterfly', name: '銀河アゲハ', title: '星雲模様の彩蝶', biome: 'abyss', tier: 'normal', role: 'mage', element: 'star', s1: ['星雲の舞', 'nova'], s2: ['夢幻の癒し', 'heal_one'], passive: ['星屑羽', 'magicFind', 9] },
  { id: 'eclipse_cat', name: '黒蝕ネコ', title: '影踏む妖猫', biome: 'abyss', tier: 'normal', role: 'speed', element: 'star', s1: ['影爪連打', 'flurry'], s2: ['黒蝕の急襲', 'snipe'], passive: ['猫の反射神経', 'critRate', 7] },
  { id: 'gravity_urchin', name: '重力ウニ', title: '引力を纏う棘球', biome: 'abyss', tier: 'normal', role: 'tank', element: 'star', s1: ['重力プレス', 'crush'], s2: ['棘引力バリア', 'buff_def'], passive: ['重力場', 'hpPct', 10] },
  { id: 'phantom_jester', name: '虚空の道化師', title: '星玉操る奇術師', biome: 'abyss', tier: 'normal', role: 'speed', element: 'star', s1: ['奇術トランプ乱射', 'flurry'], s2: ['道化の嘲笑', 'break_rend'], passive: ['トリックスター', 'doubleHit', 6] },
  { id: 'mirror_wraith', name: '鏡面の幽霊', title: '虚像を映す亡霊', biome: 'abyss', tier: 'normal', role: 'mage', element: 'star', s1: ['鏡反射光線', 'bolt'], s2: ['魂吸い鏡', 'drain'], passive: ['鏡面幻惑', 'magPct', 9] },
  { id: 'starlight_firefly', name: '星光ホタル', title: '深淵を照らす蛍火', biome: 'abyss', tier: 'normal', role: 'support', element: 'star', s1: ['蛍火の導き', 'heal_all'], s2: ['星閃光', 'nova'], passive: ['導きの光', 'magicFind', 9] },
  { id: 'cosmic_dragonfly', name: '星界トンボ', title: '光速羽ばたく蜻蛉', biome: 'abyss', tier: 'normal', role: 'speed', element: 'star', s1: ['光速ダイブ', 'snipe'], s2: ['複眼連撃', 'flurry'], passive: ['超音速羽', 'spdFlat', 6] },
  { id: 'prism_starfish', name: '星屑ヒトデ', title: '五芒星の星海生物', biome: 'abyss', tier: 'normal', role: 'support', element: 'star', s1: ['五芒星の癒し', 'heal_one'], s2: ['星回転投げ', 'cleave'], passive: ['五芒再生', 'regenPct', 4] },
  { id: 'shadow_panther', name: '影豹パンサー', title: '闇を駆ける黒豹', biome: 'abyss', tier: 'normal', role: 'striker', element: 'star', s1: ['闇裂き爪', 'slash'], s2: ['影噛み破甲', 'break_rend'], passive: ['暗黒捕食者', 'atkPct', 9] },
  { id: 'night_peacock', name: '夜天クジャク', title: '銀河尾羽の孔雀', biome: 'abyss', tier: 'normal', role: 'mage', element: 'star', s1: ['銀河尾羽展開', 'nova'], s2: ['星眼魅了', 'freeze_lance'], passive: ['夜天の誇り', 'magPct', 9] },
  { id: 'nebula_angler', name: '深淵チョウチンアンコウ', title: '星灯りで誘う怪魚', biome: 'abyss', tier: 'normal', role: 'striker', element: 'star', s1: ['深淵大顎', 'drain'], s2: ['誘惑の星灯', 'bolt'], passive: ['深淵捕食', 'lifesteal', 6] },
  { id: 'astral_hermit', name: '星宿ヤドカリ', title: '隕石を背負う甲殻', biome: 'abyss', tier: 'normal', role: 'tank', element: 'star', s1: ['隕石ハサミ撃', 'crush'], s2: ['隕石シェルター', 'shield_all'], passive: ['隕石殻', 'defPct', 9] },
  { id: 'dark_marionette', name: '糸操りマリオネット', title: '星糸で踊る木偶', biome: 'abyss', tier: 'normal', role: 'mage', element: 'star', s1: ['星糸斬撃', 'cleave'], s2: ['呪い人形劇', 'poison_strike'], passive: ['絡繰りの糸', 'critRate', 6] },
  { id: 'chrono_chinchilla', name: '星毛チンチラ', title: '銀毛跳ねる小獣', biome: 'abyss', tier: 'normal', role: 'speed', element: 'star', s1: ['星毛ラッシュ', 'flurry'], s2: ['時戻しの毛玉', 'heal_one'], passive: ['星毛の俊敏', 'spdFlat', 5] },

  // Glacier Normals (18)
  { id: 'ice_penguin', name: '氷冠ペンギン', title: '極寒の紳士鳥', biome: 'glacier', tier: 'normal', role: 'support', element: 'holy', s1: ['氷上スライド', 'cleave'], s2: ['極寒エール', 'buff_atk'], passive: ['氷上滑走', 'spdFlat', 5] },
  { id: 'glacier_walrus', name: '巨牙セイウチ', title: '氷海の重鎮', biome: 'glacier', tier: 'normal', role: 'tank', element: 'earth', s1: ['氷牙スマッシュ', 'break_rend'], s2: ['厚脂肪ガード', 'buff_def'], passive: ['極寒脂肪', 'hpPct', 10] },
  { id: 'snow_seal', name: '白雪アザラシ', title: '流氷の癒し子', biome: 'glacier', tier: 'normal', role: 'support', element: 'nature', s1: ['白雪の癒し', 'heal_all'], s2: ['冷気バブル', 'freeze_lance'], passive: ['白雪の綿毛', 'regenPct', 4] },
  { id: 'polar_bear', name: '極氷シロクマ', title: '氷原の白き覇者', biome: 'glacier', tier: 'normal', role: 'striker', element: 'physical', s1: ['豪腕氷爪', 'slash'], s2: ['極北ベアハッグ', 'break_rend'], passive: ['極北の怪力', 'atkPct', 9] },
  { id: 'frost_narwhal', name: '氷角イッカク', title: '螺旋槍の氷鯨', biome: 'glacier', tier: 'normal', role: 'striker', element: 'star', s1: ['螺旋氷槍突き', 'freeze_lance'], s2: ['貫通突撃', 'snipe'], passive: ['氷螺旋角', 'critRate', 7] },
  { id: 'glacier_muskox', name: '氷原ジャコウウシ', title: '毛皮鎧の重牛', biome: 'glacier', tier: 'normal', role: 'tank', element: 'earth', s1: ['氷角突進', 'crush'], s2: ['円陣防壁', 'shield_all'], passive: ['極寒長毛', 'defPct', 10] },
  { id: 'arctic_lynx', name: '雪林オオヤマネコ', title: '音なき雪の狩人', biome: 'glacier', tier: 'normal', role: 'speed', element: 'physical', s1: ['白銀連爪', 'flurry'], s2: ['雪隠れ急襲', 'snipe'], passive: ['雪原の視力', 'critRate', 7] },
  { id: 'frost_otter', name: '氷川カワウソ', title: '凍流の軽業師', biome: 'glacier', tier: 'normal', role: 'speed', element: 'nature', s1: ['氷礫投げ連打', 'flurry'], s2: ['川流れヒール', 'heal_one'], passive: ['凍川の泳ぎ', 'spdFlat', 5] },
  { id: 'blizzard_albatross', name: '吹雪アホウドリ', title: '極風を切る巨翼鳥', biome: 'glacier', tier: 'normal', role: 'speed', element: 'holy', s1: ['吹雪ウイング', 'cleave'], s2: ['氷風ダイブ', 'freeze_lance'], passive: ['極風滑空', 'spdFlat', 6] },
  { id: 'permafrost_lobster', name: '凍甲ロブスター', title: '永久凍土の大海老', biome: 'glacier', tier: 'normal', role: 'tank', element: 'earth', s1: ['凍結大ハサミ', 'freeze_lance'], s2: ['凍甲ガード', 'buff_def'], passive: ['永久凍甲', 'defPct', 9] },
  { id: 'hail_puffin', name: '雹ツノメドリ', title: '彩嘴の海鳥', biome: 'glacier', tier: 'normal', role: 'speed', element: 'star', s1: ['雹弾ショット', 'bolt'], s2: ['急降下くちばし', 'snipe'], passive: ['寒流潜水', 'doubleHit', 6] },
  { id: 'glacier_ibex', name: '氷崖アイベックス', title: '絶壁跳ねる大角羊', biome: 'glacier', tier: 'normal', role: 'striker', element: 'earth', s1: ['絶壁かち割り', 'break_rend'], s2: ['氷崖ラッシュ', 'slash'], passive: ['絶壁の蹄', 'atkPct', 9] },
  { id: 'frost_snowman', name: '雪ダルマ精霊', title: '凍気が宿る雪人形', biome: 'glacier', tier: 'normal', role: 'mage', element: 'star', s1: ['大雪玉転がし', 'freeze_lance'], s2: ['吹雪ノヴァ', 'nova'], passive: ['万年雪核', 'magPct', 9] },
  { id: 'aurora_clione', name: '流氷クリオネ', title: '氷海の天使貝', biome: 'glacier', tier: 'normal', role: 'mage', element: 'holy', s1: ['バッカルコーン捕食', 'drain'], s2: ['流氷光波', 'nova'], passive: ['流氷の舞', 'magPct', 9] },
  { id: 'tundra_wolverine', name: '凍原クズリ', title: '不屈の凶猛イタチ熊', biome: 'glacier', tier: 'normal', role: 'striker', element: 'physical', s1: ['狂乱引き裂き', 'flurry'], s2: ['凍牙ブレイク', 'break_rend'], passive: ['凍原の闘争心', 'lifesteal', 6] },
  { id: 'snow_crane', name: '白銀ツル', title: '雪原に舞う霊鳥', biome: 'glacier', tier: 'normal', role: 'support', element: 'holy', s1: ['鶴の恩返し', 'heal_all'], s2: ['白銀羽撃', 'bolt'], passive: ['千年の翼', 'regenPct', 4] },
  { id: 'frost_stoat', name: '白銀オコジョ', title: '純白の閃光小獣', biome: 'glacier', tier: 'normal', role: 'speed', element: 'nature', s1: ['純白連咬', 'flurry'], s2: ['雪煙フェイント', 'snipe'], passive: ['閃光ステップ', 'spdFlat', 6] },
  { id: 'rime_spirit_bell', name: '凍鈴ツララ精', title: '氷柱を鳴らす音霊', biome: 'glacier', tier: 'normal', role: 'mage', element: 'star', s1: ['絶対零度の鐘音', 'freeze_lance'], s2: ['氷晶共鳴波', 'nova'], passive: ['澄んだ氷音', 'magPct', 9] },

  // Sanctum Normals (19)
  { id: 'cherub_spark', name: '光のケルビム', title: '聖歌を奏でる小天使', biome: 'sanctum', tier: 'normal', role: 'support', element: 'holy', s1: ['聖歌ヒール', 'heal_all'], s2: ['光矢ショット', 'bolt'], passive: ['天使の祝福', 'regenPct', 4] },
  { id: 'sun_lion', name: '太陽ライオン', title: '黄金鬣の百獣王', biome: 'sanctum', tier: 'normal', role: 'striker', element: 'holy', s1: ['太陽王の牙', 'slash'], s2: ['黄金咆哮', 'buff_atk'], passive: ['百獣の誇り', 'atkPct', 10] },
  { id: 'holy_unicorn', name: '聖角ユニコーン', title: '浄化の一角白馬', biome: 'sanctum', tier: 'normal', role: 'support', element: 'holy', s1: ['浄化の聖角', 'heal_all'], s2: ['聖光突撃', 'bolt'], passive: ['純潔の角', 'magPct', 9] },
  { id: 'gilded_swan', name: '黄金ハクチョウ', title: '聖池の金翼白鳥', biome: 'sanctum', tier: 'normal', role: 'mage', element: 'holy', s1: ['黄金羽嵐', 'nova'], s2: ['聖湖の癒し', 'heal_one'], passive: ['優雅な光翼', 'magPct', 9] },
  { id: 'ivory_camel', name: '聖砂ラクダ', title: '聖宝運ぶ白亜駱駝', biome: 'sanctum', tier: 'normal', role: 'tank', element: 'earth', s1: ['聖砂スタンプ', 'crush'], s2: ['キャラバン障壁', 'shield_all'], passive: ['聖宝運搬', 'goldFind', 15] },
  { id: 'radiant_dove', name: '聖光ハト', title: '平和告げる白鳩', biome: 'sanctum', tier: 'normal', role: 'support', element: 'holy', s1: ['平和の祈り', 'heal_all'], s2: ['聖翼ガード', 'shield_all'], passive: ['聖なる翼', 'regenPct', 4] },
  { id: 'halo_gazelle', name: '光輪ガゼル', title: '神殿駆ける羚羊', biome: 'sanctum', tier: 'normal', role: 'speed', element: 'holy', s1: ['光輪跳躍蹴り', 'flurry'], s2: ['聖角一閃', 'snipe'], passive: ['神殿疾走', 'spdFlat', 6] },
  { id: 'sanctum_flamingo', name: '紅玉フラミンゴ', title: '聖泉に立つ紅鶴', biome: 'sanctum', tier: 'normal', role: 'mage', element: 'holy', s1: ['紅玉光波', 'nova'], s2: ['紅炎の舞', 'burn_blast'], passive: ['紅玉羽毛', 'magPct', 9] },
  { id: 'sun_meerkat', name: '見張りミーアキャット', title: '聖門の哨戒獣', biome: 'sanctum', tier: 'normal', role: 'speed', element: 'earth', s1: ['哨戒連打', 'flurry'], s2: ['警戒の合図', 'buff_atk'], passive: ['鋭い見張り目', 'magicFind', 10] },
  { id: 'brass_harp', name: '聖音のハープ精', title: '自動奏でる黄金竪琴', biome: 'sanctum', tier: 'normal', role: 'support', element: 'holy', s1: ['鎮魂の旋律', 'heal_all'], s2: ['戦意の協奏曲', 'buff_atk'], passive: ['聖音の響き', 'magPct', 9] },
  { id: 'sacred_ibis', name: '神殿トキ', title: '書記官の聖鳥', biome: 'sanctum', tier: 'normal', role: 'mage', element: 'holy', s1: ['聖刻ビーム', 'bolt'], s2: ['神託の光雨', 'nova'], passive: ['神殿書記', 'magicFind', 10] },
  { id: 'gilded_pangolin', name: '黄金センザンコウ', title: '金鱗丸まる聖獣', biome: 'sanctum', tier: 'normal', role: 'tank', element: 'earth', s1: ['金鱗転がり', 'crush'], s2: ['黄金鱗障壁', 'shield_all'], passive: ['金鱗装甲', 'defPct', 10] },
  { id: 'prism_cicada', name: '虹晶セミ', title: '七色羽鳴らす聖蝉', biome: 'sanctum', tier: 'normal', role: 'speed', element: 'star', s1: ['虹音ソニック', 'nova'], s2: ['七色急襲', 'snipe'], passive: ['七色共鳴', 'spdFlat', 6] },
  { id: 'sacred_alpaca', name: '聖域アルパカ', title: '黄金綿毛の聖獣', biome: 'sanctum', tier: 'normal', role: 'support', element: 'holy', s1: ['聖毛クッション', 'shield_all'], s2: ['ふわふわ癒し', 'heal_all'], passive: ['聖綿毛', 'hpPct', 10] },
  { id: 'radiant_ladybug', name: '聖紋テントウムシ', title: '七星背負う聖虫', biome: 'sanctum', tier: 'normal', role: 'support', element: 'nature', s1: ['七星の恵み', 'heal_one'], s2: ['聖紋タックル', 'slash'], passive: ['七星幸運', 'magicFind', 11] },
  { id: 'halo_bellflower', name: '聖鐘スズラン精', title: '光鈴揺らす花精', biome: 'sanctum', tier: 'normal', role: 'mage', element: 'holy', s1: ['聖鐘の響き', 'nova'], s2: ['光花の癒し', 'heal_all'], passive: ['聖花の香り', 'regenPct', 4] },
  { id: 'marble_hippo', name: '白亜カバ', title: '聖河の巨顎守護者', biome: 'sanctum', tier: 'normal', role: 'tank', element: 'earth', s1: ['白亜の大顎', 'break_rend'], s2: ['聖河の防壁', 'buff_def'], passive: ['白亜巨体', 'hpPct', 11] },
  { id: 'gilded_falcon', name: '黄金ハヤブサ', title: '天を裂く金隼', biome: 'sanctum', tier: 'normal', role: 'speed', element: 'holy', s1: ['天裂きダイブ', 'snipe'], s2: ['金翼三連斬', 'flurry'], passive: ['神速降下', 'doubleHit', 7] },
  { id: 'celestial_okapi', name: '聖林オカピ', title: '縞模様の聖森獣', biome: 'sanctum', tier: 'normal', role: 'speed', element: 'holy', s1: ['聖蹄連打', 'flurry'], s2: ['聖林の加護', 'buff_def'], passive: ['聖森の歩み', 'spdFlat', 6] },
];

export const MONSTER_LIST: MonsterSpecies[] = MONSTER_SEEDS.map(buildSpecies);

// Legacy ID aliases so pre-v11 browser saves never break when old variant IDs are loaded
export const LEGACY_SPECIES_ALIAS: Record<string, string> = {
  gold_slime: 'dust_scarab',
  frost_slime: 'snow_seal',
  ember_pup: 'cinder_salamander',
  ice_wolf: 'arctic_lynx',
  glacier_golem: 'mammoth_colossus',
  snow_valkyrie: 'frost_valkyrie',
  fenrir_lord: 'glacier_leviathan',
  nebula_owl: 'night_peacock',
  astral_knight: 'dullahan_rider',
  golden_paladin: 'golden_anubis',
  solar_phoenix: 'solar_griffin',
  crystal_dragon: 'genesis_orrery',
};

export const SPECIES_MAP: Record<string, MonsterSpecies> = {
  hero: HERO_SPECIES,
  ...Object.fromEntries(MONSTER_LIST.map((m) => [m.id, m])),
};

export function resolveSpeciesId(id: string): string {
  return LEGACY_SPECIES_ALIAS[id] ?? id;
}

export function getSpecies(id: string): MonsterSpecies {
  const resolved = resolveSpeciesId(id);
  return SPECIES_MAP[resolved] ?? HERO_SPECIES;
}

export const BOSS_MONSTERS: MonsterSpecies[] = MONSTER_LIST.filter((m) => m.tier === 'boss');
export const ELITE_MONSTERS: MonsterSpecies[] = MONSTER_LIST.filter((m) => m.tier === 'elite');
export const NORMAL_MONSTERS: MonsterSpecies[] = MONSTER_LIST.filter((m) => m.tier === 'normal');

export function getBiomeNormalMonsters(biome: DungeonBiomeId): MonsterSpecies[] {
  return NORMAL_MONSTERS.filter((m) => m.biome === biome);
}

export function getBiomeEliteMonsters(biome: DungeonBiomeId): MonsterSpecies[] {
  return ELITE_MONSTERS.filter((m) => m.biome === biome);
}

export function getBossForFloor(floor: number): MonsterSpecies {
  const bossIdx = Math.max(0, Math.floor((Math.max(5, floor) - 5) / 5)) % BOSS_MONSTERS.length;
  return BOSS_MONSTERS[bossIdx] ?? BOSS_MONSTERS[0]!;
}
