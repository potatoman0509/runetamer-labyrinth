import type { DungeonBiomeId, MapEntity } from './types';

export interface BossRushWaveDef {
  wave: number;
  title: string;
  biome: DungeonBiomeId;
  equivFloor: number;
  speciesIds: string[];
  leadSprite: string;
  bonusStones: number;
  rewardHint: string;
}

export const BOSS_RUSH_MAX_WAVE = 8;

export const BOSS_RUSH_WAVES: BossRushWaveDef[] = [
  {
    wave: 1,
    title: 'W1 森の古樹王',
    biome: 'forest',
    equivFloor: 6,
    speciesIds: ['ancient_treant', 'moss_fox'],
    leadSprite: 'ancient_treant',
    bonusStones: 8,
    rewardHint: '💎+8 / 高レア装備',
  },
  {
    wave: 2,
    title: 'W2 ルーンゴーレム',
    biome: 'ruins',
    equivFloor: 11,
    speciesIds: ['rune_golem', 'owl_sage'],
    leadSprite: 'rune_golem',
    bonusStones: 14,
    rewardHint: '💎+14 / エピック級',
  },
  {
    wave: 3,
    title: 'W3 灼熱の炎竜',
    biome: 'volcano',
    equivFloor: 16,
    speciesIds: ['crimson_wyrm', 'ash_witch'],
    leadSprite: 'crimson_wyrm',
    bonusStones: 20,
    rewardHint: '💎+20 / レジェンド級',
  },
  {
    wave: 4,
    title: 'W4 星喰いの虚無獣',
    biome: 'abyss',
    equivFloor: 21,
    speciesIds: ['star_devourer', 'astral_knight'],
    leadSprite: 'star_devourer',
    bonusStones: 28,
    rewardHint: '💎+28 / 固有装備高率',
  },
  {
    wave: 5,
    title: 'W5 虚無の使徒連合',
    biome: 'abyss',
    equivFloor: 25,
    speciesIds: ['void_herald', 'gold_slime', 'mimic'],
    leadSprite: 'void_herald',
    bonusStones: 45,
    rewardHint: '💎+45 / ミシック確定',
  },
  {
    wave: 6,
    title: 'W6 氷皇フェンリル',
    biome: 'glacier',
    equivFloor: 28,
    speciesIds: ['fenrir_lord', 'snow_valkyrie'],
    leadSprite: 'fenrir_lord',
    bonusStones: 60,
    rewardHint: '💎+60 / 極寒固有級',
  },
  {
    wave: 7,
    title: 'W7 終焉の熾天使',
    biome: 'sanctum',
    equivFloor: 32,
    speciesIds: ['seraph_omega', 'solar_phoenix'],
    leadSprite: 'seraph_omega',
    bonusStones: 80,
    rewardHint: '💎+80 / 聖域ミシック級',
  },
  {
    wave: 8,
    title: 'W8 EX 真・終焉連合',
    biome: 'sanctum',
    equivFloor: 36,
    speciesIds: ['seraph_omega', 'crystal_dragon', 'eclipse_reaper'],
    leadSprite: 'crystal_dragon',
    bonusStones: 110,
    rewardHint: '💎+110 / ミシック2点確定',
  },
];

export function getBossRushWave(wave: number): BossRushWaveDef {
  return BOSS_RUSH_WAVES[Math.max(0, Math.min(BOSS_RUSH_WAVES.length - 1, wave - 1))]!;
}

export function createBossRushEntity(wave: number): MapEntity {
  const def = getBossRushWave(wave);
  return {
    id: `boss_rush_w${def.wave}`,
    kind: 'boss',
    x: 0,
    y: 0,
    spriteKey: def.leadSprite,
    name: def.title,
    speciesIds: def.speciesIds,
    interacted: false,
  };
}
