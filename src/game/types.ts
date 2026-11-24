export type BiomeId = 'village' | 'forest' | 'ruins' | 'volcano' | 'abyss';
export type DungeonBiomeId = 'forest' | 'ruins' | 'volcano' | 'abyss';

export type Rarity =
  | 'common'
  | 'uncommon'
  | 'rare'
  | 'epic'
  | 'legendary'
  | 'mythic';

export type EquipSlot = 'weapon' | 'armor' | 'relic' | 'rune';

export type ElementType = 'physical' | 'nature' | 'earth' | 'fire' | 'star' | 'holy';

export type MonsterRole = 'tank' | 'striker' | 'mage' | 'support' | 'speed';

export type SetId =
  | 'forest_guard'
  | 'ancient_rune'
  | 'crimson_fury'
  | 'astral_mage'
  | 'golden_greed'
  | 'lunar_blade';

export type AffixStat =
  | 'atkPct'
  | 'magPct'
  | 'defPct'
  | 'hpPct'
  | 'spdFlat'
  | 'critRate'
  | 'critDmg'
  | 'lifesteal'
  | 'doubleHit'
  | 'magicFind'
  | 'goldFind'
  | 'expFind'
  | 'regenPct';

export type UniqueEffectId =
  | 'sunblade_heal'
  | 'twin_fang_strike'
  | 'sun_king_staff'
  | 'berserker_axe'
  | 'world_tree_armor'
  | 'golden_aegis'
  | 'dragonscale_thorns'
  | 'clover_luck'
  | 'crimson_chalice'
  | 'chronos_hourglass'
  | 'astral_compass'
  | 'echo_crit_rune'
  | 'phoenix_ash_rune'
  | 'sage_star_rune'
  | 'giant_slayer_blade'
  | 'meteor_scepter'
  | 'vampire_scythe'
  | 'storm_bowblade'
  | 'starlight_mantle'
  | 'mithril_fortress'
  | 'blazing_cloak'
  | 'forge_heart_amulet'
  | 'mimic_crown'
  | 'titan_gauntlet_relic'
  | 'overdrive_rune'
  | 'guardian_vow_rune';

export interface Affix {
  stat: AffixStat;
  label: string;
  value: number;
  isPercent: boolean;
  masterworked?: boolean;
}

export interface EquipmentItem {
  id: string;
  name: string;
  slot: EquipSlot;
  iconKey: string;
  rarity: Rarity;
  itemLevel: number;
  worldTier: number;
  enhanceLevel: number;
  rerollCount: number;
  setId?: SetId;
  baseStats: {
    atk?: number;
    mag?: number;
    def?: number;
    hp?: number;
    spd?: number;
  };
  affixes: Affix[];
  uniqueId?: UniqueEffectId;
  uniqueName?: string;
  uniqueDesc?: string;
  locked: boolean;
  sellValue: number;
}

export type SkillTarget = 'single_enemy' | 'all_enemies' | 'self' | 'single_ally' | 'all_allies';

export interface SkillDef {
  id: string;
  name: string;
  mpCost: number;
  target: SkillTarget;
  element: ElementType;
  power: number;
  statScale: 'atk' | 'mag' | 'def' | 'hybrid';
  kind: 'damage' | 'heal' | 'shield' | 'buff_atk' | 'buff_def' | 'drain';
  hits?: number;
  critBonus?: number;
  bossBonus?: number; // extra mult vs boss/elite
  description: string;
}

export interface MonsterSpecies {
  id: string;
  name: string;
  title: string;
  biome: DungeonBiomeId | 'hero' | 'special';
  isBoss: boolean;
  role: MonsterRole;
  element: ElementType;
  spriteKey: string;
  baseStats: {
    hp: number;
    mp: number;
    atk: number;
    mag: number;
    def: number;
    spd: number;
  };
  growth: {
    hp: number;
    mp: number;
    atk: number;
    mag: number;
    def: number;
    spd: number;
  };
  skills: [SkillDef, SkillDef];
  passiveName: string;
  passiveDesc: string;
  passiveBonus: Partial<{
    atkPct: number;
    magPct: number;
    defPct: number;
    hpPct: number;
    critRate: number;
    lifesteal: number;
    regenPct: number;
    magicFind: number;
    doubleHit: number;
    spdFlat: number;
    goldFind: number;
  }>;
  recruitRate: number;
}

export interface EquippedSet {
  weapon: string | null;
  armor: string | null;
  relic: string | null;
  rune: string | null;
}

export interface UnitInstance {
  id: string;
  speciesId: string;
  level: number;
  exp: number;
  awakening: number;
  evolved?: boolean; // Extreme Evolution (【極】)
  hp: number;
  mp: number;
  equipped: EquippedSet;
}

export interface ActiveSetCount {
  setId: SetId;
  count: number;
}

export interface ComputedUnitStats {
  maxHp: number;
  maxMp: number;
  atk: number;
  mag: number;
  def: number;
  spd: number;
  critRate: number;
  critDmg: number;
  lifesteal: number;
  doubleHit: number;
  regenPct: number;
  magicFind: number;
  goldFind: number;
  expFind: number;
  stoneFind: number;
  damageTakenMult: number;
  skillPowerBonusPct: number;
  weaknessBonusPct: number;
  mpRegenBonus: number;
  uniqueEffects: UniqueEffectId[];
  activeSets: ActiveSetCount[];
  powerScore: number;
}

export type EntityKind = 'enemy' | 'elite' | 'boss' | 'rare_enemy' | 'chest' | 'gold_chest' | 'shrine' | 'npc';

export interface MapEntity {
  id: string;
  kind: EntityKind;
  x: number;
  y: number;
  spriteKey: string;
  name: string;
  speciesIds?: string[];
  interacted: boolean;
}

export type BattleTactic = 'balanced' | 'allout' | 'conserve';
export type BattleSpeed = 1 | 2 | 4;

export interface BattleUnitState {
  uid: string;
  isAlly: boolean;
  speciesId: string;
  name: string;
  spriteKey: string;
  level: number;
  isBoss: boolean;
  isElite: boolean;
  evolved: boolean;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  shield: number;
  atk: number;
  mag: number;
  def: number;
  spd: number;
  critRate: number;
  critDmg: number;
  lifesteal: number;
  doubleHit: number;
  regenPct: number;
  damageTakenMult: number;
  skillPowerBonusPct: number;
  weaknessBonusPct: number;
  mpRegenBonus: number;
  uniqueEffects: UniqueEffectId[];
  activeSetIds4pc: SetId[];
  defending: boolean;
  charging: boolean;
  enraged: boolean;
  poisonTurns: number;
  atkBuffTurns: number;
  defBuffTurns: number;
  phoenixUsed: boolean;
  skills: [SkillDef, SkillDef];
  lungeUntilMs: number;
  hurtUntilMs: number;
}

export interface BattleFloatingText {
  id: string;
  targetUid: string;
  text: string;
  color: string;
  isCrit?: boolean;
  isWeak?: boolean;
  createdAt: number;
}

export interface BattleVfx {
  id: string;
  targetUid: string;
  element: ElementType | 'heal' | 'shield' | 'buff' | 'ultimate' | 'limit_break';
  createdAt: number;
}

export interface BattleReward {
  exp: number;
  gold: number;
  forgeStones: number;
  items: EquipmentItem[];
  autoProcessedCount: number;
  autoProcessedMode: 'sell' | 'salvage';
  autoSoldGold: number;
  autoSalvagedStones: number;
  recruited: { speciesId: string; isNew: boolean; newAwakening: number }[];
  leveledUpIds: string[];
  worldTierUnlocked: number | null;
  bossRushWaveCleared?: number;
}

export interface BattleState {
  id: string;
  biome: DungeonBiomeId;
  floor: number;
  worldTier: number;
  entityId: string;
  isBossBattle: boolean;
  isEliteBattle: boolean;
  isRareBattle: boolean;
  bossRushWave?: number; // 1..5 if in Boss Rush Arena
  turn: number;
  limitGauge: number; // 0..100 shared party Limit Break gauge!
  hpPotions: number;
  mpPotions: number;
  allies: BattleUnitState[];
  enemies: BattleUnitState[];
  turnQueue: string[];
  activeUid: string | null;
  phase: 'player_input' | 'animating' | 'victory' | 'defeat' | 'fled';
  logs: string[];
  floatingTexts: BattleFloatingText[];
  vfx: BattleVfx[];
  shakeUntilMs: number;
  reward: BattleReward | null;
}

export type AutoSellThreshold = 'none' | 'common' | 'uncommon' | 'rare' | 'epic';
export type AutoLootMode = 'sell' | 'salvage';

export interface ActiveShrineBuffs {
  powerBonus: number;
  fortuneBonus: number;
  curseEnemyBonus: number;
}

export interface GameSettings {
  autoBattle: boolean;
  battleSpeed: BattleSpeed;
  battleTactic: BattleTactic;
  autoSell: AutoSellThreshold;
  autoLootMode: AutoLootMode;
}

export interface GameStats {
  totalKills: number;
  totalBossKills: number;
  totalChestsOpened: number;
  totalItemsLooted: number;
  totalMythicsFound: number;
  highestFloorReached: number;
  totalForgeUpgrades: number;
  totalRerolls: number;
  totalEvolutions: number;
  bossRushClears: number;
  maxEnhanceReached: number;
}

export interface GameSave {
  version: number;
  savedAt: number;
  gold: number;
  forgeStones: number;
  worldTier: number;
  maxUnlockedTier: number;
  highestFloorByTier: Record<number, number>;
  partyIds: string[];
  roster: Record<string, UnitInstance>;
  inventory: EquipmentItem[];
  discoveredMonsters: string[];
  discoveredUniques: UniqueEffectId[];
  shopItems: EquipmentItem[];
  shopRefreshedAtTier: number;
  heroSkillTree: Record<string, number>;
  heroEquippedSkillIds: [string, string];
  claimedAchievements: string[];
  bossRushBestWave: number;
  settings: GameSettings;
  stats: GameStats;
}
