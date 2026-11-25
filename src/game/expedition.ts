import { getBiomeForFloor, isBossFloor } from './data/biomes';
import {
  ELITE_MONSTERS,
  getBiomeEliteMonsters,
  getBiomeNormalMonsters,
  getBossForFloor,
  getSpecies,
} from './data/monsters';
import type { BiomeId, DungeonBiomeId } from './types';

export type ExpeditionChoiceKind =
  | 'battle'
  | 'elite'
  | 'boss'
  | 'rare_encounter'
  | 'chest'
  | 'gold_chest'
  | 'suspicious_chest'
  | 'curse_altar'
  | 'merchant'
  | 'wandering_smith'
  | 'shrine_heal'
  | 'shrine_power'
  | 'shrine_fortune'
  | 'rest'
  | 'stairs'
  | 'return_village';

export interface ExpeditionChoice {
  id: string;
  kind: ExpeditionChoiceKind;
  title: string;
  subtitle: string;
  tag: string;
  tagColor: string;
  spriteKey: string;
  speciesIds?: string[];
  merchantCostGold?: number;
  advancesStep: boolean;
}

export interface ExpeditionState {
  inVillage: boolean;
  biome: BiomeId;
  floor: number;
  step: number;
  maxSteps: number;
  bossDefeated: boolean;
  restUsedOnFloor: boolean;
  choices: ExpeditionChoice[];
  lastEventText: string;
  marchUntilMs: number;
}

export const STEPS_PER_FLOOR = 4;

let choiceSeq = 1;
function nextChoiceId(): string {
  choiceSeq += 1;
  return `ch_${choiceSeq}_${Math.floor(Math.random() * 9999).toString(36)}`;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function makeEnemyPack(biome: DungeonBiomeId, minSize: number, maxSize: number): string[] {
  const pool = getBiomeNormalMonsters(biome);
  const count = minSize + Math.floor(Math.random() * (maxSize - minSize + 1));
  const ids: string[] = [];
  for (let i = 0; i < count; i += 1) {
    ids.push(pick(pool).id);
  }
  return ids;
}

function makeElitePack(biome: DungeonBiomeId): string[] {
  const elites = getBiomeEliteMonsters(biome);
  const normals = getBiomeNormalMonsters(biome);
  const lead = pick(elites.length > 0 ? elites : ELITE_MONSTERS);
  const escortCount = Math.random() < 0.55 ? 2 : 1;
  const ids = [lead.id];
  for (let i = 0; i < escortCount; i += 1) {
    ids.push(pick(normals).id);
  }
  return ids;
}

export function createVillageExpedition(): ExpeditionState {
  return {
    inVillage: true,
    biome: 'village',
    floor: 0,
    step: 0,
    maxSteps: STEPS_PER_FLOOR,
    bossDefeated: true,
    restUsedOnFloor: false,
    choices: [],
    lastEventText: '始まりの村。',
    marchUntilMs: 0,
  };
}

function buildNormalBattleChoice(
  biome: DungeonBiomeId,
  advancesStep: boolean,
  variantTitle?: string,
): ExpeditionChoice {
  const pack = makeEnemyPack(biome, 1, 3);
  const lead = getSpecies(pack[0]!);
  return {
    id: nextChoiceId(),
    kind: 'battle',
    title:
      variantTitle ??
      `${lead.name}${pack.length > 1 ? `ほか${pack.length - 1}体` : ''}`,
    subtitle: '経験値・金貨・仲間化',
    tag: '戦闘',
    tagColor: '#5c6a85',
    spriteKey: lead.spriteKey,
    speciesIds: pack,
    advancesStep,
  };
}

function buildEliteBattleChoice(
  biome: DungeonBiomeId,
  advancesStep: boolean,
  prefix = '★強敵',
): ExpeditionChoice {
  const pack = makeElitePack(biome);
  const lead = getSpecies(pack[0]!);
  return {
    id: nextChoiceId(),
    kind: 'elite',
    title: `${prefix}：${lead.name}`,
    subtitle: 'エリート戦・装備・鍛冶石',
    tag: '★強敵',
    tagColor: '#c9781c',
    spriteKey: lead.spriteKey,
    speciesIds: pack,
    advancesStep,
  };
}

function buildRareChoice(biome: DungeonBiomeId, advancesStep: boolean): ExpeditionChoice {
  const biomeElites = getBiomeEliteMonsters(biome);
  const rareSp = pick(biomeElites.length > 0 ? biomeElites : ELITE_MONSTERS);
  return {
    id: nextChoiceId(),
    kind: 'rare_encounter',
    title: `✦希少：${rareSp.name}`,
    subtitle: '鍛冶石・金貨・高レア装備',
    tag: '✦希少',
    tagColor: '#d99a1e',
    spriteKey: rareSp.spriteKey,
    speciesIds: [rareSp.id],
    advancesStep,
  };
}

export function generateStepChoices(
  floor: number,
  step: number,
  maxSteps: number,
  worldTier: number,
  bossDefeated: boolean,
  restUsedOnFloor: boolean,
): ExpeditionChoice[] {
  const biome = getBiomeForFloor(floor);
  const bossFloor = isBossFloor(floor);
  const normalPool = getBiomeNormalMonsters(biome);
  const merchantCost = Math.max(40, Math.round((55 + floor * 14) * Math.pow(1.9, worldTier - 1)));

  // Final step: Boss encounter or Stairs Down (10 balanced tactical choices)
  if (step >= maxSteps) {
    if (bossFloor && !bossDefeated) {
      const bossSp = getBossForFloor(floor);
      const bossId = bossSp.id;
      const escort1 = pick(normalPool).id;
      const escort2 = pick(normalPool).id;
      const bossPack = floor >= 10 ? [escort1, bossId, escort2] : [bossId, escort1];

      return [
        {
          id: nextChoiceId(),
          kind: 'boss',
          title: `階層ボス：${bossSp.name}`,
          subtitle:
            floor >= 30
              ? '撃破で次階層・世界ランク解放'
              : '装備・鍛冶石・ボス仲間化',
          tag: 'BOSS',
          tagColor: '#d94848',
          spriteKey: bossSp.spriteKey,
          speciesIds: bossPack,
          advancesStep: false,
        },
        !restUsedOnFloor
          ? {
              id: nextChoiceId(),
              kind: 'rest',
              title: '焚き火で休む',
              subtitle: '全員のHP・MPを30%回復',
              tag: '回復',
              tagColor: '#3a9c5a',
              spriteKey: 'fountain',
              advancesStep: false,
            }
          : buildNormalBattleChoice(biome, false),
        buildEliteBattleChoice(biome, false, '★強敵'),
        buildEliteBattleChoice(biome, false, '★強敵群'),
        buildRareChoice(biome, false),
        buildNormalBattleChoice(biome, false),
        buildNormalBattleChoice(biome, false),
        {
          id: nextChoiceId(),
          kind: 'merchant',
          title: `行商人・${merchantCost.toLocaleString()}G`,
          subtitle: '鍛冶石・レア以上装備・回復',
          tag: '行商人',
          tagColor: '#3a7ab5',
          spriteKey: 'merchant',
          merchantCostGold: merchantCost,
          advancesStep: false,
        },
        {
          id: nextChoiceId(),
          kind: 'curse_altar',
          title: '呪いの祭壇',
          subtitle: 'HP-25%・敵強化でMF+65%',
          tag: '呪い祭壇',
          tagColor: '#9e2e4f',
          spriteKey: 'curse_altar',
          advancesStep: false,
        },
        {
          id: nextChoiceId(),
          kind: 'return_village',
          title: '始まりの村へ戻る',
          subtitle: '全回復・秘薬補充',
          tag: '帰還',
          tagColor: '#4c658a',
          spriteKey: 'fountain',
          advancesStep: false,
        },
      ];
    }

    return [
      {
        id: nextChoiceId(),
        kind: 'stairs',
        title: `${floor + 1}Fへ降りる`,
        subtitle: '深層へ進む',
        tag: '次階へ',
        tagColor: '#358f55',
        spriteKey: 'altar',
        advancesStep: true,
      },
      buildEliteBattleChoice(biome, false, `${floor}F強敵`),
      buildEliteBattleChoice(biome, false, '★連戦'),
      buildRareChoice(biome, false),
      buildNormalBattleChoice(biome, false),
      buildNormalBattleChoice(biome, false),
      buildNormalBattleChoice(biome, false),
      {
        id: nextChoiceId(),
        kind: 'merchant',
        title: `行商人・${merchantCost.toLocaleString()}G`,
        subtitle: '鍛冶石・レア以上装備・回復',
        tag: '行商人',
        tagColor: '#3a7ab5',
        spriteKey: 'merchant',
        merchantCostGold: merchantCost,
        advancesStep: false,
      },
      !restUsedOnFloor
        ? {
            id: nextChoiceId(),
            kind: 'rest',
            title: '焚き火で休む',
            subtitle: '全員のHP・MPを30%回復',
            tag: '回復',
            tagColor: '#3a9c5a',
            spriteKey: 'fountain',
            advancesStep: false,
          }
        : buildNormalBattleChoice(biome, false),
      {
        id: nextChoiceId(),
        kind: 'return_village',
        title: '始まりの村へ戻る',
        subtitle: '全回復・秘薬補充',
        tag: '帰還',
        tagColor: '#4c658a',
        spriteKey: 'fountain',
        advancesStep: false,
      },
    ];
  }

  // ===== REGULAR STEP (1 .. maxSteps-1): 10 Rich Tactical Choices =====
  const rareHit = Math.random() < 0.25 + (worldTier - 1) * 0.03;

  return [
    buildNormalBattleChoice(biome, true),
    buildNormalBattleChoice(biome, true),
    rareHit ? buildRareChoice(biome, true) : buildNormalBattleChoice(biome, true),
    buildEliteBattleChoice(biome, true, '★強敵'),
    {
      id: nextChoiceId(),
      kind: 'suspicious_chest',
      title: '怪しい秘宝箱',
      subtitle: '秘宝かミミックの強襲',
      tag: '怪しい箱',
      tagColor: '#b55632',
      spriteKey: 'mimic',
      speciesIds: ['mimic'],
      advancesStep: true,
    },
    {
      id: nextChoiceId(),
      kind: 'gold_chest',
      title: '黄金の宝箱',
      subtitle: '高レア装備・鍛冶石・金貨',
      tag: '黄金箱',
      tagColor: '#d99a1e',
      spriteKey: 'gold_chest',
      advancesStep: true,
    },
    {
      id: nextChoiceId(),
      kind: 'chest',
      title: '宝箱を開ける',
      subtitle: '装備1点・鍛冶石・金貨',
      tag: '宝箱',
      tagColor: '#b57b2a',
      spriteKey: 'chest',
      advancesStep: true,
    },
    Math.random() < 0.55
      ? {
          id: nextChoiceId(),
          kind: 'wandering_smith',
          title: '旅の鍛冶師',
          subtitle: '装備中の武具を無料で+1強化',
          tag: '無料強化',
          tagColor: '#c96f28',
          spriteKey: 'blacksmith',
          advancesStep: true,
        }
      : {
          id: nextChoiceId(),
          kind: 'curse_altar',
          title: '呪いの祭壇',
          subtitle: 'HP-25%・敵強化でMF+65%',
          tag: '呪い祭壇',
          tagColor: '#9e2e4f',
          spriteKey: 'curse_altar',
          advancesStep: true,
        },
    {
      id: nextChoiceId(),
      kind: 'merchant',
      title: `行商人・${merchantCost.toLocaleString()}G`,
      subtitle: '鍛冶石・レア以上装備・回復',
      tag: '行商人',
      tagColor: '#3a7ab5',
      spriteKey: 'merchant',
      merchantCostGold: merchantCost,
      advancesStep: true,
    },
    pick<ExpeditionChoice>([
      {
        id: nextChoiceId(),
        kind: 'shrine_heal',
        title: '癒しの祠',
        subtitle: '全員のHP・MPを全回復',
        tag: '全回復',
        tagColor: '#369657',
        spriteKey: 'shrine',
        advancesStep: true,
      },
      {
        id: nextChoiceId(),
        kind: 'shrine_power',
        title: '剛力の祠',
        subtitle: '探索中の攻撃・魔力+25%',
        tag: '火力UP',
        tagColor: '#c94c38',
        spriteKey: 'shrine',
        advancesStep: true,
      },
      {
        id: nextChoiceId(),
        kind: 'shrine_fortune',
        title: '幸運の祠',
        subtitle: '探索中のトレハン+45%',
        tag: '幸運UP',
        tagColor: '#2f8ab5',
        spriteKey: 'shrine',
        advancesStep: true,
      },
    ]),
  ];
}

export function createDungeonExpedition(floor: number, worldTier: number): ExpeditionState {
  const safeFloor = Math.max(1, floor);
  const biome = getBiomeForFloor(safeFloor);
  const bossDefeated = !isBossFloor(safeFloor);
  return {
    inVillage: false,
    biome,
    floor: safeFloor,
    step: 1,
    maxSteps: STEPS_PER_FLOOR,
    bossDefeated,
    restUsedOnFloor: false,
    choices: generateStepChoices(safeFloor, 1, STEPS_PER_FLOOR, worldTier, bossDefeated, false),
    lastEventText: `${safeFloor}Fへ到着した。`,
    marchUntilMs: Date.now() + 550,
  };
}

export function pickAutoExpeditionChoice(
  exp: ExpeditionState,
  partyAvgHpRatio: number,
): ExpeditionChoice | null {
  if (exp.inVillage || exp.choices.length === 0) return null;

  const stairs = exp.choices.find((c) => c.kind === 'stairs');
  if (stairs) return stairs;

  if (partyAvgHpRatio < 0.6) {
    const heal = exp.choices.find((c) => c.kind === 'shrine_heal' || c.kind === 'rest');
    if (heal) return heal;
  }

  const boss = exp.choices.find((c) => c.kind === 'boss');
  if (boss) return boss;

  const order: ExpeditionChoiceKind[] = [
    'rare_encounter',
    'wandering_smith',
    'gold_chest',
    'suspicious_chest',
    'shrine_fortune',
    'shrine_power',
    'elite',
    'chest',
    'battle',
    'merchant',
    'shrine_heal',
  ];
  for (const kind of order) {
    const match = exp.choices.find((c) => c.kind === kind);
    if (match) return match;
  }
  return exp.choices[0] ?? null;
}
