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

export const BOSS_RUSH_WAVES: BossRushWaveDef[] = [
  {
    wave: 1,
    title: 'Wave 1：森の古樹王',
    biome: 'forest',
    equivFloor: 6,
    speciesIds: ['ancient_treant', 'moss_fox'],
    leadSprite: 'ancient_treant',
    bonusStones: 10,
    rewardHint: '鍛冶石+10 / 高レア装備',
  },
  {
    wave: 2,
    title: 'Wave 2：ルーンゴーレム',
    biome: 'ruins',
    equivFloor: 11,
    speciesIds: ['rune_golem', 'owl_sage'],
    leadSprite: 'rune_golem',
    bonusStones: 16,
    rewardHint: '鍛冶石+16 / エピック+級',
  },
  {
    wave: 3,
    title: 'Wave 3：灼熱の炎竜',
    biome: 'volcano',
    equivFloor: 16,
    speciesIds: ['crimson_wyrm', 'ash_witch'],
    leadSprite: 'crimson_wyrm',
    bonusStones: 24,
    rewardHint: '鍛冶石+24 / レジェンド級',
  },
  {
    wave: 4,
    title: 'Wave 4：星喰いの虚無獣',
    biome: 'abyss',
    equivFloor: 21,
    speciesIds: ['star_devourer', 'astral_knight'],
    leadSprite: 'star_devourer',
    bonusStones: 35,
    rewardHint: '鍛冶石+35 / 固有ユニーク高確率',
  },
  {
    wave: 5,
    title: 'Wave 5 (EX)：虚無の使徒＆財宝連合',
    biome: 'abyss',
    equivFloor: 25,
    speciesIds: ['void_herald', 'gold_slime', 'mimic'],
    leadSprite: 'void_herald',
    bonusStones: 60,
    rewardHint: '鍛冶石+60 / ミシック装備確定！',
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
