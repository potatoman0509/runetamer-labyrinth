import type { BiomeId, DungeonBiomeId } from '../types';

export interface BiomeDef {
  id: BiomeId;
  name: string;
  shortName: string;
  subtitle: string;
  bossSpeciesId?: string;
  floorRangeLabel: string;
  palette: {
    skyTop: string;
    skyBottom: string;
    groundPrimary: string;
    groundSecondary: string;
    wallTop: string;
    wallFront: string;
    accent: string;
    particle: string;
    badgeBg: string;
    badgeText: string;
  };
}

export const BIOMES: Record<BiomeId, BiomeDef> = {
  village: {
    id: 'village',
    name: '始まりの村',
    shortName: '始まりの村',
    subtitle: '拠点',
    floorRangeLabel: '拠点',
    palette: {
      skyTop: '#6cb7e8',
      skyBottom: '#bfe5ff',
      groundPrimary: '#63a64b',
      groundSecondary: '#54963f',
      wallTop: '#9c633b',
      wallFront: '#6e4225',
      accent: '#f5d259',
      particle: '#fff5b8',
      badgeBg: '#3c6e37',
      badgeText: '#f4fae8',
    },
  },
  forest: {
    id: 'forest',
    name: '始まりの森',
    shortName: '始まりの森',
    subtitle: '古樹の迷宮',
    bossSpeciesId: 'ancient_treant',
    floorRangeLabel: '1〜5F',
    palette: {
      skyTop: '#2f6a4f',
      skyBottom: '#65a86b',
      groundPrimary: '#528f44',
      groundSecondary: '#447d38',
      wallTop: '#235933',
      wallFront: '#1a3f26',
      accent: '#a9e663',
      particle: '#d8ff8a',
      badgeBg: '#2e6b3e',
      badgeText: '#ecffe6',
    },
  },
  ruins: {
    id: 'ruins',
    name: '古代遺跡',
    shortName: '古代遺跡',
    subtitle: '石造りの回廊',
    bossSpeciesId: 'rune_golem',
    floorRangeLabel: '6〜10F',
    palette: {
      skyTop: '#3e4a5e',
      skyBottom: '#6f7e94',
      groundPrimary: '#868b96',
      groundSecondary: '#737885',
      wallTop: '#565c6b',
      wallFront: '#393e4a',
      accent: '#63d8e8',
      particle: '#a8f2ff',
      badgeBg: '#46546b',
      badgeText: '#e6f5ff',
    },
  },
  volcano: {
    id: 'volcano',
    name: '溶岩洞窟',
    shortName: '溶岩洞窟',
    subtitle: '灼熱の竜窟',
    bossSpeciesId: 'crimson_wyrm',
    floorRangeLabel: '11〜15F',
    palette: {
      skyTop: '#4f1e18',
      skyBottom: '#a63a21',
      groundPrimary: '#593b36',
      groundSecondary: '#472d29',
      wallTop: '#7a2b1e',
      wallFront: '#3d1914',
      accent: '#ff8b33',
      particle: '#ffd266',
      badgeBg: '#8c2d1c',
      badgeText: '#fff0db',
    },
  },
  abyss: {
    id: 'abyss',
    name: '星屑の深淵',
    shortName: '星屑の深淵',
    subtitle: '星光の境界',
    bossSpeciesId: 'star_devourer',
    floorRangeLabel: '16〜20F',
    palette: {
      skyTop: '#162040',
      skyBottom: '#334d82',
      groundPrimary: '#2c385e',
      groundSecondary: '#222d4d',
      wallTop: '#1c2647',
      wallFront: '#121830',
      accent: '#f7d560',
      particle: '#fff3ad',
      badgeBg: '#273a6b',
      badgeText: '#fff6d6',
    },
  },
  glacier: {
    id: 'glacier',
    name: '氷結回廊',
    shortName: '氷結回廊',
    subtitle: '白銀の極寒界',
    bossSpeciesId: 'glacier_leviathan',
    floorRangeLabel: '21〜25F',
    palette: {
      skyTop: '#183754',
      skyBottom: '#4b8fb8',
      groundPrimary: '#7cb5d4',
      groundSecondary: '#5f9bc0',
      wallTop: '#336a91',
      wallFront: '#204966',
      accent: '#9cf2ff',
      particle: '#e3fbff',
      badgeBg: '#29658a',
      badgeText: '#e8fbff',
    },
  },
  sanctum: {
    id: 'sanctum',
    name: '黄金聖域',
    shortName: '黄金聖域',
    subtitle: '終焉の神殿',
    bossSpeciesId: 'seraph_omega',
    floorRangeLabel: '26〜30F',
    palette: {
      skyTop: '#4a2b52',
      skyBottom: '#b8833e',
      groundPrimary: '#c9a66b',
      groundSecondary: '#ad884e',
      wallTop: '#8a6230',
      wallFront: '#543818',
      accent: '#ffe875',
      particle: '#fff6ba',
      badgeBg: '#8c611e',
      badgeText: '#fff7d4',
    },
  },
};

export const DUNGEON_BIOME_ORDER: DungeonBiomeId[] = [
  'forest',
  'ruins',
  'volcano',
  'abyss',
  'glacier',
  'sanctum',
];

export function getBiomeForFloor(floor: number): DungeonBiomeId {
  if (floor <= 0) return 'forest';
  const index = Math.floor(((floor - 1) % 30) / 5);
  return DUNGEON_BIOME_ORDER[index] ?? 'forest';
}

export function isBossFloor(floor: number): boolean {
  return floor > 0 && floor % 5 === 0;
}

export function getBiomeBossId(biome: DungeonBiomeId): string {
  return BIOMES[biome].bossSpeciesId ?? 'ancient_treant';
}

export function getFloorCycle(floor: number): number {
  return Math.floor((Math.max(1, floor) - 1) / 30);
}
