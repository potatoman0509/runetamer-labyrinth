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
  | 'sage_star_rune';

export interface Affix {
  stat: AffixStat;
  label: string;
  value: number;
  isPercent: boolean;
}

export interface EquipmentItem {
  id: string;
  name: string;
  slot: EquipSlot;
  iconKey: string;
  rarity: Rarity;
  itemLevel: number;
  worldTier: number;
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
  power: number; // multiplier on atk or mag (or heal)
  statScale: 'atk' | 'mag' | 'def' | 'hybrid';
  kind: 'damage' | 'heal' | 'shield' | 'buff_atk' | 'buff_def' | 'drain';
  hits?: number;
  critBonus?: number;
  description: string;
}

export interface MonsterSpecies {
  id: string;
  name: string;
  title: string;
  biome: DungeonBiomeId | 'hero';
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
  }>;
  recruitRate: number; // 0..1 base recruit rate when defeated
}

export interface EquippedSet {
  weapon: string | null;
  armor: string | null;
  relic: string | null;
  rune: string | null;
}

export interface UnitInstance {
  id: string; // 'hero' or speciesId
  speciesId: string;
  level: number;
  exp: number;
  awakening: number; // duplicate recruitment stars (0..10+)
  hp: number;
  mp: number;
  equipped: EquippedSet;
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
  uniqueEffects: UniqueEffectId[];
  powerScore: number;
}

export type TileKind =
  | 'void'
  | 'wall'
  | 'floor'
  | 'floor_alt'
  | 'water'
  | 'tree'
  | 'road'
  | 'house_wall'
  | 'house_roof'
  | 'stairs_down'
  | 'dungeon_gate'
  | 'fountain'
  | 'shrine'
  | 'altar'
  | 'ranch'
  | 'shop';

export type EntityKind = 'enemy' | 'elite' | 'boss' | 'chest' | 'gold_chest' | 'shrine' | 'npc';

export interface MapEntity {
  id: string;
  kind: EntityKind;
  x: number;
  y: number;
  spriteKey: string;
  name: string;
  speciesIds?: string[]; // enemy encounter composition
  interacted: boolean;
  shrineType?: 'heal' | 'power' | 'fortune';
  npcAction?: 'fountain' | 'ranch' | 'shop' | 'altar' | 'gate';
}

export interface DungeonMap {
  biome: BiomeId;
  floor: number; // 0 for hub village
  width: number;
  height: number;
  tiles: TileKind[][];
  explored: boolean[][];
  entities: MapEntity[];
  playerX: number;
  playerY: number;
  stairsX: number;
  stairsY: number;
  bossDefeated: boolean;
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
  uniqueEffects: UniqueEffectId[];
  defending: boolean;
  atkBuffTurns: number;
  defBuffTurns: number;
  phoenixUsed: boolean;
  skills: [SkillDef, SkillDef];
  lungeTimer: number;
  hurtTimer: number;
}

export interface BattleFloatingText {
  id: string;
  targetUid: string;
  text: string;
  color: string;
  isCrit?: boolean;
  createdAt: number;
}

export interface BattleVfx {
  id: string;
  targetUid: string;
  element: ElementType | 'heal' | 'shield' | 'buff';
  createdAt: number;
}

export interface BattleReward {
  exp: number;
  gold: number;
  items: EquipmentItem[];
  autoSoldCount: number;
  autoSoldGold: number;
  recruited: { speciesId: string; isNew: boolean; newAwakening: number }[];
  leveledUpIds: string[];
  worldTierUnlocked: number | null;
}

export interface BattleState {
  id: string;
  biome: DungeonBiomeId;
  floor: number;
  worldTier: number;
  entityId: string;
  isBossBattle: boolean;
  isEliteBattle: boolean;
  turn: number;
  allies: BattleUnitState[];
  enemies: BattleUnitState[];
  turnQueue: string[]; // uids
  activeUid: string | null;
  phase: 'player_input' | 'animating' | 'victory' | 'defeat' | 'fled';
  logs: string[];
  floatingTexts: BattleFloatingText[];
  vfx: BattleVfx[];
  reward: BattleReward | null;
}

export type AutoSellThreshold = 'none' | 'common' | 'uncommon' | 'rare' | 'epic';

export interface ActiveShrineBuffs {
  powerBonus: number; // e.g., 0.25 for +25% ATK/MAG
  fortuneBonus: number; // e.g., 40 for +40% MF
}

export interface GameSettings {
  autoBattle: boolean;
  battleSpeed: BattleSpeed;
  battleTactic: BattleTactic;
  autoSell: AutoSellThreshold;
}

export interface GameStats {
  totalKills: number;
  totalBossKills: number;
  totalChestsOpened: number;
  totalItemsLooted: number;
  totalMythicsFound: number;
  highestFloorReached: number;
}

export interface GameSave {
  version: number;
  savedAt: number;
  gold: number;
  worldTier: number; // active world tier (1+)
  maxUnlockedTier: number; // unlocked world tier (1+)
  highestFloorByTier: Record<number, number>;
  partyIds: string[]; // ['hero', ...up to 3 monster ids]
  roster: Record<string, UnitInstance>; // hero + recruited monsters
  inventory: EquipmentItem[];
  discoveredMonsters: string[];
  discoveredUniques: UniqueEffectId[];
  shopItems: EquipmentItem[];
  shopRefreshedAtTier: number;
  settings: GameSettings;
  stats: GameStats;
}
