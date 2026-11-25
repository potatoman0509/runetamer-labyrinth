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

export const BOSS_RUSH_MAX_WAVE = 10;

// All 10 Unique Bosses featured sequentially across 10 Waves!
export const BOSS_RUSH_WAVES: BossRushWaveDef[] = [
  {
    wave: 1,
    title: 'W1 森の古樹王',
    biome: 'forest',
    equivFloor: 6,
    speciesIds: ['ancient_treant', 'stag_monarch'],
    leadSprite: 'ancient_treant',
    bonusStones: 6,
    rewardHint: '💎+6 / レア級',
  },
  {
    wave: 2,
    title: 'W2 ルーン巨神',
    biome: 'ruins',
    equivFloor: 11,
    speciesIds: ['rune_golem', 'shield_knight'],
    leadSprite: 'rune_golem',
    bonusStones: 10,
    rewardHint: '💎+10 / エピック級',
  },
  {
    wave: 3,
    title: 'W3 紅蓮の覇竜',
    biome: 'volcano',
    equivFloor: 16,
    speciesIds: ['crimson_wyrm', 'ifrit_djinn'],
    leadSprite: 'crimson_wyrm',
    bonusStones: 15,
    rewardHint: '💎+15 / 高レア装備',
  },
  {
    wave: 4,
    title: 'W4 星喰いの虚無獣',
    biome: 'abyss',
    equivFloor: 21,
    speciesIds: ['star_devourer', 'void_herald'],
    leadSprite: 'star_devourer',
    bonusStones: 20,
    rewardHint: '💎+20 / レジェンド級',
  },
  {
    wave: 5,
    title: 'W5 氷海巨鯨リヴァイアサン',
    biome: 'glacier',
    equivFloor: 25,
    speciesIds: ['glacier_leviathan', 'frost_valkyrie'],
    leadSprite: 'glacier_leviathan',
    bonusStones: 30,
    rewardHint: '💎+30 / 高率ミシック',
  },
  {
    wave: 6,
    title: 'W6 終焉の熾天使オメガ',
    biome: 'sanctum',
    equivFloor: 30,
    speciesIds: ['seraph_omega', 'prism_sphinx'],
    leadSprite: 'seraph_omega',
    bonusStones: 40,
    rewardHint: '💎+40 / 聖域装備',
  },
  {
    wave: 7,
    title: 'W7 深海覇王クラーケン',
    biome: 'glacier',
    equivFloor: 35,
    speciesIds: ['abyss_kraken', 'blizzard_wendigo'],
    leadSprite: 'abyss_kraken',
    bonusStones: 52,
    rewardHint: '💎+52 / 深海固有級',
  },
  {
    wave: 8,
    title: 'W8 時空鎌王クロノマンティス',
    biome: 'ruins',
    equivFloor: 40,
    speciesIds: ['chronos_mantis', 'clockwork_centaur'],
    leadSprite: 'chronos_mantis',
    bonusStones: 66,
    rewardHint: '💎+66 / 時空固有級',
  },
  {
    wave: 9,
    title: 'W9 千手修羅帝アスラ',
    biome: 'volcano',
    equivFloor: 45,
    speciesIds: ['asura_emperor', 'obsidian_minotaur'],
    leadSprite: 'asura_emperor',
    bonusStones: 82,
    rewardHint: '💎+82 / 修羅固有級',
  },
  {
    wave: 10,
    title: 'W10 EX 創世天球神アルケミア',
    biome: 'sanctum',
    equivFloor: 50,
    speciesIds: ['genesis_orrery', 'eclipse_reaper', 'cherub_throne'],
    leadSprite: 'genesis_orrery',
    bonusStones: 110,
    rewardHint: '💎+110 / ミシック確定',
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
