export type BiomeId = 'village' | 'forest' | 'ruins' | 'volcano' | 'abyss' | 'glacier' | 'sanctum';
export type DungeonBiomeId = 'forest' | 'ruins' | 'volcano' | 'abyss' | 'glacier' | 'sanctum';

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
  | 'lunar_blade'
  | 'frost_monarch'
  | 'seraph_radiance'
  | 'blood_pact'
  | 'void_walker';

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
  | 'guardian_vow_rune'
  // v6+ New Uniques (14 -> total 40)
  | 'frostbite_blade'
  | 'seraph_lance'
  | 'eclipse_reaper_scythe'
  | 'prism_wand'
  | 'glacier_plate'
  | 'seraph_robe'
  | 'abyssal_carapace'
  | 'fenrir_fang_relic'
  | 'halo_diadem'
  | 'void_heart_relic'
  | 'crystal_scale_relic'
  | 'blizzard_rune'
  | 'judgment_rune'
  | 'eternal_tamer_rune';

export type StatusEffectType = 'poison' | 'burn' | 'freeze' | 'def_break';

export type TrialModId =
  | 'iron_foes'
  | 'drought'
  | 'no_potions'
  | 'swift_foes'
  | 'blood_boss';

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
  bossBonus?: number;
  statusBonus?: number; // extra mult vs afflicted targets
  statusEffect?: {
    type: StatusEffectType;
    chance: number;
    turns: number;
  };
  description: string;
}

export type MonsterTier = 'normal' | 'elite' | 'boss';

export interface MonsterSpecies {
  id: string;
  name: string;
  title: string;
  biome: DungeonBiomeId | 'hero' | 'special';
  tier: MonsterTier;
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
  trueEvolved?: boolean; // True Evolution (【真】)
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
  armorPenPct: number;
  statusDmgBonusPct: number;
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
  trueEvolved: boolean;
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
  armorPenPct: number;
  statusDmgBonusPct: number;
  uniqueEffects: UniqueEffectId[];
  activeSetIds4pc: SetId[];
  defending: boolean;
  charging: boolean;
  enraged: boolean;
  poisonTurns: number;
  burnTurns: number;
  freezeTurns: number;
  defBreakTurns: number;
  atkBuffTurns: number;
  defBuffTurns: number;
  phoenixUsed: boolean;
  skills: [SkillDef, SkillDef];
  shiftElement?: ElementType;
  bossTurnCount?: number;
  lungeUntilMs: number;
  hurtUntilMs: number;
  activeMotion?: BattleUnitMotion;
}

export interface BattleUnitMotion {
  speciesId: string;
  skillId: string;
  skillName?: string;
  element: ElementType;
  kind: SkillDef['kind'] | 'attack' | 'defend' | 'ultimate' | 'limit_break' | 'charge';
  hits?: number;
  isAoE?: boolean;
  startedAt: number;
  durationMs: number;
  targetUids: string[];
}

export interface BattleCinematic {
  id: string;
  actorUid: string;
  speciesId: string;
  skillId: string;
  title: string;
  element: ElementType;
  startedAt: number;
  durationMs: number;
  targetUids: string[];
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
  attackerUid?: string;
  speciesId?: string;
  skillId?: string;
  element: ElementType | 'heal' | 'shield' | 'buff' | 'ultimate' | 'limit_break' | 'freeze' | 'burn';
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
  benchLeveledUpIds?: string[];
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
  bossRushWave?: number; // 1..10 if in Boss Rush Arena
  activeTrials: TrialModId[];
  turn: number;
  limitGauge: number; // 0..100
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
  activeCinematic?: BattleCinematic | null;
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

export type GuildQuestObjective =
  | 'kills'
  | 'elites'
  | 'bosses'
  | 'biome_kills'
  | 'trial_boss'
  | 'boss_rush_wave'
  | 'enhance';

export interface GuildQuestItem {
  id: string;
  category: 'daily' | 'cycle';
  title: string;
  objective: GuildQuestObjective;
  biome?: DungeonBiomeId;
  target: number;
  progress: number;
  rewardGold: number;
  rewardStones: number;
  claimed: boolean;
}

export interface GuildQuestState {
  dailyDateKey: string;
  cycleNumber: number;
  daily: GuildQuestItem[];
  cycle: GuildQuestItem[];
}

export interface GameSettings {
  autoBattle: boolean;
  battleSpeed: BattleSpeed;
  battleTactic: BattleTactic;
  autoSell: AutoSellThreshold;
  autoLootMode: AutoLootMode;
  soundMuted: boolean;
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
  totalTrueEvolutions: number;
  bossRushClears: number;
  trialClears: number;
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
  encounteredMonsters: string[];
  discoveredMonsters: string[];
  favoriteMonsters: string[];
  discoveredUniques: UniqueEffectId[];
  shopItems: EquipmentItem[];
  shopRefreshedAtTier: number;
  heroSkillTree: Record<string, number>;
  heroEquippedSkillIds: [string, string];
  claimedAchievements: string[];
  bossRushBestWave: number;
  activeTrials: TrialModId[];
  guildQuests: GuildQuestState;
  settings: GameSettings;
  stats: GameStats;
}
