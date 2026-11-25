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
  | 'battle_horde'
  | 'elite'
  | 'boss'
  | 'rare_encounter'
  | 'chest'
  | 'gold_chest'
  | 'suspicious_chest'
  | 'mystery_bag'
  | 'curse_altar'
  | 'merchant'
  | 'gambler'
  | 'wandering_smith'
  | 'shrine_heal'
  | 'shrine_power'
  | 'shrine_fortune'
  | 'fountain_mp'
  | 'alchemy_pot'
  | 'rune_tablet'
  | 'training_ground'
  | 'expedition_shortcut'
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
  prefix?: string,
): ExpeditionChoice {
  const pack = makeEnemyPack(biome, 1, 3);
  const lead = getSpecies(pack[0]!);
  const tagPrefix = prefix ? `${prefix}：` : '';
  return {
    id: nextChoiceId(),
    kind: 'battle',
    title: `${tagPrefix}${lead.name}${pack.length > 1 ? `ほか${pack.length - 1}体` : ''}`,
    subtitle: '経験値・金貨・仲間化',
    tag: '戦闘',
    tagColor: '#5c6a85',
    spriteKey: lead.spriteKey,
    speciesIds: pack,
    advancesStep,
  };
}

function buildHordeBattleChoice(
  biome: DungeonBiomeId,
  advancesStep: boolean,
): ExpeditionChoice {
  const pack = makeEnemyPack(biome, 3, 4);
  const lead = getSpecies(pack[0]!);
  return {
    id: nextChoiceId(),
    kind: 'battle_horde',
    title: `群れ：${lead.name}たち${pack.length}体`,
    subtitle: '多数戦で経験値・仲間チャンス',
    tag: '群れ戦',
    tagColor: '#6b548a',
    spriteKey: lead.spriteKey,
    speciesIds: pack,
    advancesStep,
  };
}

function buildEliteBattleChoice(
  biome: DungeonBiomeId,
  advancesStep: boolean,
  prefix?: string,
): ExpeditionChoice {
  const pack = makeElitePack(biome);
  const lead = getSpecies(pack[0]!);
  const label = prefix ?? pick(['★強敵', '★精鋭護衛', '★異形の主']);
  return {
    id: nextChoiceId(),
    kind: 'elite',
    title: `${label}：${lead.name}`,
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

function buildMerchantChoice(merchantCost: number, advancesStep: boolean): ExpeditionChoice {
  return {
    id: nextChoiceId(),
    kind: 'merchant',
    title: `行商人・${merchantCost.toLocaleString()}G`,
    subtitle: '鍛冶石・レア以上装備・回復',
    tag: '行商人',
    tagColor: '#3a7ab5',
    spriteKey: 'merchant',
    merchantCostGold: merchantCost,
    advancesStep,
  };
}

function buildGamblerChoice(betCost: number, advancesStep: boolean): ExpeditionChoice {
  return {
    id: nextChoiceId(),
    kind: 'gambler',
    title: `謎の賭博師・${betCost.toLocaleString()}G`,
    subtitle: '勝利で2.4倍G・鍛冶石進呈',
    tag: '賭博',
    tagColor: '#913d9c',
    spriteKey: 'merchant',
    merchantCostGold: betCost,
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
  const betCost = Math.max(30, Math.round(merchantCost * 0.7));

  // Final step: Boss encounter or Stairs Down (5 varied tactical choices)
  if (step >= maxSteps) {
    if (bossFloor && !bossDefeated) {
      const bossSp = getBossForFloor(floor);
      const bossId = bossSp.id;
      const escort1 = pick(normalPool).id;
      const escort2 = pick(normalPool).id;
      const bossPack = floor >= 10 ? [escort1, bossId, escort2] : [bossId, escort1];

      const prepChoice = !restUsedOnFloor
        ? {
            id: nextChoiceId(),
            kind: 'rest' as const,
            title: '焚き火で休む',
            subtitle: '全員のHP・MPを30%回復',
            tag: '回復',
            tagColor: '#3a9c5a',
            spriteKey: 'fountain',
            advancesStep: false,
          }
        : buildNormalBattleChoice(biome, false);

      const specialBattle =
        Math.random() < 0.35
          ? buildRareChoice(biome, false)
          : buildEliteBattleChoice(biome, false);

      const sideUtility = pick<ExpeditionChoice>([
        buildMerchantChoice(merchantCost, false),
        buildGamblerChoice(betCost, false),
        buildHordeBattleChoice(biome, false),
      ]);

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
        prepChoice,
        specialBattle,
        sideUtility,
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

    const clearedHighThreat =
      Math.random() < 0.3
        ? buildRareChoice(biome, false)
        : buildEliteBattleChoice(biome, false, `${floor}F強敵`);

    const clearedSkirmish =
      Math.random() < 0.45
        ? buildHordeBattleChoice(biome, false)
        : buildNormalBattleChoice(biome, false);

    const clearedUtility = pick<ExpeditionChoice>([
      buildMerchantChoice(merchantCost, false),
      buildGamblerChoice(betCost, false),
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
        : buildNormalBattleChoice(biome, false, '残党'),
    ]);

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
      clearedHighThreat,
      clearedSkirmish,
      clearedUtility,
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

  // ===== REGULAR STEP (1 .. maxSteps-1): 5 Distinct Choices Drawn From Rich Event Pools =====
  const useHordePrimary = Math.random() < 0.34;
  const combatPrimary = useHordePrimary
    ? buildHordeBattleChoice(biome, true)
    : buildNormalBattleChoice(biome, true, pick(['先遣隊', '巡回', undefined]));

  const rareRate = 0.28 + (worldTier - 1) * 0.03;
  const combatSecondary =
    Math.random() < rareRate
      ? buildRareChoice(biome, true)
      : !useHordePrimary && Math.random() < 0.28
        ? buildHordeBattleChoice(biome, true)
        : buildEliteBattleChoice(biome, true);

  const lootPool: ExpeditionChoice[] = [
    {
      id: nextChoiceId(),
      kind: 'chest',
      title: '古びた宝箱',
      subtitle: '装備1点・鍛冶石・金貨',
      tag: '宝箱',
      tagColor: '#b57b2a',
      spriteKey: 'chest',
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
      kind: 'mystery_bag',
      title: '謎の落とし物袋',
      subtitle: '金貨・鍛冶石・装備・罠の4択',
      tag: '落とし物',
      tagColor: '#8f6d2b',
      spriteKey: 'chest',
      advancesStep: true,
    },
  ];

  const encounterPool: ExpeditionChoice[] = [
    {
      id: nextChoiceId(),
      kind: 'wandering_smith',
      title: '旅の鍛冶師',
      subtitle: '装備中の武具を無料で+1強化',
      tag: '無料強化',
      tagColor: '#c96f28',
      spriteKey: 'blacksmith',
      advancesStep: true,
    },
    buildMerchantChoice(merchantCost, true),
    buildGamblerChoice(betCost, true),
    {
      id: nextChoiceId(),
      kind: 'rune_tablet',
      title: '古代のルーン碑',
      subtitle: '全員EXP獲得＋ランダム小祝福',
      tag: 'ルーン碑',
      tagColor: '#6f49b8',
      spriteKey: 'altar',
      advancesStep: true,
    },
    {
      id: nextChoiceId(),
      kind: 'training_ground',
      title: '練武の祭場',
      subtitle: 'HP15%消費で大量EXP・鍛冶石',
      tag: '特訓場',
      tagColor: '#9c5628',
      spriteKey: 'blacksmith',
      advancesStep: true,
    },
  ];

  const supportPool: ExpeditionChoice[] = [
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
      kind: 'fountain_mp',
      title: '魔力の泉',
      subtitle: '全員MP全回復・HP25%回復',
      tag: 'MP泉',
      tagColor: '#2c7dc9',
      spriteKey: 'fountain',
      advancesStep: true,
    },
    {
      id: nextChoiceId(),
      kind: 'shrine_power',
      title: '剛力の祠',
      subtitle: '探索中の攻撃・魔力+18%',
      tag: '火力UP',
      tagColor: '#c94c38',
      spriteKey: 'shrine',
      advancesStep: true,
    },
    {
      id: nextChoiceId(),
      kind: 'shrine_fortune',
      title: '幸運の祠',
      subtitle: '探索中のトレハン+30%',
      tag: '幸運UP',
      tagColor: '#2f8ab5',
      spriteKey: 'shrine',
      advancesStep: true,
    },
    {
      id: nextChoiceId(),
      kind: 'alchemy_pot',
      title: '秘薬の錬金釜',
      subtitle: 'HP/MP秘薬+1補充・鍛冶石',
      tag: '秘薬調合',
      tagColor: '#2d9c7a',
      spriteKey: 'shrine',
      advancesStep: true,
    },
    {
      id: nextChoiceId(),
      kind: 'curse_altar',
      title: '呪いの祭壇',
      subtitle: 'HP消費・敵強化でMF+65%と装備',
      tag: '呪い祭壇',
      tagColor: '#9e2e4f',
      spriteKey: 'curse_altar',
      advancesStep: true,
    },
  ];

  if (step + 1 < maxSteps) {
    supportPool.push({
      id: nextChoiceId(),
      kind: 'expedition_shortcut',
      title: '隠し抜け道',
      subtitle: '進行STEP+2＆鍛冶石・金貨',
      tag: '近道',
      tagColor: '#388e7c',
      spriteKey: 'altar',
      advancesStep: true,
    });
  }

  return [
    combatPrimary,
    combatSecondary,
    pick(lootPool),
    pick(encounterPool),
    pick(supportPool),
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
    const heal = exp.choices.find(
      (c) => c.kind === 'shrine_heal' || c.kind === 'rest' || c.kind === 'fountain_mp',
    );
    if (heal) return heal;
  }

  const boss = exp.choices.find((c) => c.kind === 'boss');
  if (boss) return boss;

  const order: ExpeditionChoiceKind[] = [
    'expedition_shortcut',
    'rare_encounter',
    'wandering_smith',
    'gold_chest',
    'suspicious_chest',
    'alchemy_pot',
    'rune_tablet',
    'mystery_bag',
    'shrine_fortune',
    'shrine_power',
    'chest',
    'training_ground',
    'elite',
    'battle_horde',
    'battle',
    'merchant',
    'gambler',
    'shrine_heal',
    'fountain_mp',
  ];
  for (const kind of order) {
    const match = exp.choices.find((c) => c.kind === kind);
    if (match) return match;
  }
  return exp.choices[0] ?? null;
}
