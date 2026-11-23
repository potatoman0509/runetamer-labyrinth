import { getBiomeBossId, getBiomeForFloor, isBossFloor } from './data/biomes';
import { getBiomeNormalMonsters, getSpecies } from './data/monsters';
import type { BiomeId, DungeonBiomeId } from './types';
import { getActiveTierModifiers } from './worldTier';

export type ExpeditionChoiceKind =
  | 'battle'
  | 'elite'
  | 'boss'
  | 'chest'
  | 'gold_chest'
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
  advancesStep: boolean;
}

export interface ExpeditionState {
  inVillage: boolean;
  biome: BiomeId;
  floor: number; // 0 in village
  step: number; // 1..maxSteps
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
    lastEventText: '陽だまりの始まりの村。準備を整えて迷宮へ出発しよう！',
    marchUntilMs: 0,
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
  const tierMods = getActiveTierModifiers(worldTier);
  const normalPool = getBiomeNormalMonsters(biome);

  // Final step of the floor: Boss encounter or Stairs Down!
  if (step >= maxSteps) {
    if (bossFloor && !bossDefeated) {
      const bossId = getBiomeBossId(biome);
      const bossSp = getSpecies(bossId);
      const escort1 = pick(normalPool).id;
      const escort2 = pick(normalPool).id;
      const bossPack = floor >= 10 ? [escort1, bossId, escort2] : [bossId, escort1];

      const choices: ExpeditionChoice[] = [
        {
          id: nextChoiceId(),
          kind: 'boss',
          title: `【階層ボス】${bossSp.name}に挑む`,
          subtitle:
            floor >= 20
              ? '撃破で次階層解放＆世界ランク昇格条件を達成！'
              : '撃破で装備3点確定＆高確率でボスが仲間に！',
          tag: 'BOSS戦',
          tagColor: '#d94848',
          spriteKey: bossSp.spriteKey,
          speciesIds: bossPack,
          advancesStep: false,
        },
      ];

      if (!restUsedOnFloor) {
        choices.push({
          id: nextChoiceId(),
          kind: 'rest',
          title: 'ボス前の焚き火で休息する',
          subtitle: 'パーティ全員のHP/MPを50%回復して決戦に備える',
          tag: '回復',
          tagColor: '#3a9c5a',
          spriteKey: 'fountain',
          advancesStep: false,
        });
      }

      const grindPack = makeEnemyPack(biome, 2, 3);
      const grindLead = getSpecies(grindPack[0]!);
      choices.push({
        id: nextChoiceId(),
        kind: 'elite',
        title: `周囲の強敵と戦って鍛える（${grindLead.name}他）`,
        subtitle: 'レベル上げと装備厳選をしてからボスへ挑戦',
        tag: '★強敵',
        tagColor: '#c98820',
        spriteKey: grindLead.spriteKey,
        speciesIds: grindPack,
        advancesStep: false,
      });

      return choices;
    }

    // Floor cleared -> Descend to next floor, farm current floor, or return to village
    const farmPack = makeEnemyPack(biome, 2, 3);
    const farmLead = getSpecies(farmPack[0]!);
    return [
      {
        id: nextChoiceId(),
        kind: 'stairs',
        title: `次の階層（${floor + 1}F）へ降りる`,
        subtitle: `さらに深い階層へ進み、より高iLvの装備と魔物を探す`,
        tag: '次階へ',
        tagColor: '#358f55',
        spriteKey: 'altar',
        advancesStep: true,
      },
      {
        id: nextChoiceId(),
        kind: 'elite',
        title: `${floor}Fの強敵を狩って稼ぐ（${farmLead.name}他）`,
        subtitle: 'この階層に留まって装備ドロップ＆仲間集めを続行',
        tag: '★稼ぎ戦',
        tagColor: '#c98820',
        spriteKey: farmLead.spriteKey,
        speciesIds: farmPack,
        advancesStep: false,
      },
      {
        id: nextChoiceId(),
        kind: 'return_village',
        title: '始まりの村へ帰還する',
        subtitle: '装備と金貨を持ち帰り、泉で全回復＆商店・祭壇を利用',
        tag: '帰還',
        tagColor: '#4c658a',
        spriteKey: 'fountain',
        advancesStep: false,
      },
    ];
  }

  // Regular Exploration Step (1 .. maxSteps-1): Present 3 distinct tactical command choices!
  const normalPack = makeEnemyPack(biome, 1, 3);
  const normalLead = getSpecies(normalPack[0]!);

  const elitePack = makeEnemyPack(biome, 2, 3);
  const eliteLead = getSpecies(elitePack[0]!);

  // Choice 1: Standard Battle
  const choice1: ExpeditionChoice = {
    id: nextChoiceId(),
    kind: 'battle',
    title: `魔物の群れへ進む（${normalLead.name}${normalPack.length > 1 ? `他${normalPack.length - 1}体` : ''}）`,
    subtitle: '堅実に経験値・金貨・仲間化＆装備ドロップを狙う',
    tag: '通常戦',
    tagColor: '#5c6a85',
    spriteKey: normalLead.spriteKey,
    speciesIds: normalPack,
    advancesStep: true,
  };

  // Choice 2: Elite Battle OR Gold Chest (high reward!)
  const isGoldChestRoll = Math.random() < 0.24 + (worldTier - 1) * 0.04;
  const choice2: ExpeditionChoice = isGoldChestRoll
    ? {
        id: nextChoiceId(),
        kind: 'gold_chest',
        title: '輝く黄金の宝箱を開ける',
        subtitle: '高レア装備2点＆大量ゴールドを戦闘無しで獲得！',
        tag: '黄金箱',
        tagColor: '#d99a1e',
        spriteKey: 'gold_chest',
        advancesStep: true,
      }
    : {
        id: nextChoiceId(),
        kind: 'elite',
        title: `黄金オーラの強敵に挑む（★${eliteLead.name}他）`,
        subtitle: `敵が強い代わりに装備2点＆高レア率UP（強敵率${Math.round(tierMods.eliteChance * 100)}%）`,
        tag: '★強敵',
        tagColor: '#c9781c',
        spriteKey: eliteLead.spriteKey,
        speciesIds: elitePack,
        advancesStep: true,
      };

  // Choice 3: Discovery / Utility (Chest, Healing Shrine, Power Shrine, Fortune Shrine, or Camp Rest)
  const utilityRoll = Math.random();
  let choice3: ExpeditionChoice;
  if (utilityRoll < 0.36) {
    choice3 = {
      id: nextChoiceId(),
      kind: 'chest',
      title: '脇道の宝箱を調べる',
      subtitle: '装備1点とゴールドを安全に回収して前進する',
      tag: '宝箱',
      tagColor: '#b57b2a',
      spriteKey: 'chest',
      advancesStep: true,
    };
  } else if (utilityRoll < 0.58) {
    choice3 = {
      id: nextChoiceId(),
      kind: 'shrine_heal',
      title: '癒しの祠に祈る',
      subtitle: 'パーティ全員のHP・MPを完全回復して前進する',
      tag: '全回復',
      tagColor: '#369657',
      spriteKey: 'shrine',
      advancesStep: true,
    };
  } else if (utilityRoll < 0.78) {
    choice3 = {
      id: nextChoiceId(),
      kind: 'shrine_power',
      title: '剛力の祠に触れる',
      subtitle: 'この探索中、味方全体の攻撃・魔力を+25%強化！',
      tag: '火力UP',
      tagColor: '#c94c38',
      spriteKey: 'shrine',
      advancesStep: true,
    };
  } else {
    choice3 = {
      id: nextChoiceId(),
      kind: 'shrine_fortune',
      title: '幸運の祠に祈る',
      subtitle: 'この探索中、トレハン（レア率）+45%アップ！',
      tag: '幸運UP',
      tagColor: '#2f8ab5',
      spriteKey: 'shrine',
      advancesStep: true,
    };
  }

  return [choice1, choice2, choice3];
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
    lastEventText: `${safeFloor}Fへ到着した。進むルートを選択しよう！`,
    marchUntilMs: Date.now() + 550,
  };
}

/**
 * Picks the smartest choice automatically when Auto-Advance is enabled.
 */
export function pickAutoExpeditionChoice(
  exp: ExpeditionState,
  partyAvgHpRatio: number,
): ExpeditionChoice | null {
  if (exp.inVillage || exp.choices.length === 0) return null;

  // Priority 1: Stairs when floor is cleared
  const stairs = exp.choices.find((c) => c.kind === 'stairs');
  if (stairs) return stairs;

  // Priority 2: Heal / Rest if party HP is low
  if (partyAvgHpRatio < 0.6) {
    const heal = exp.choices.find((c) => c.kind === 'shrine_heal' || c.kind === 'rest');
    if (heal) return heal;
  }

  // Priority 3: Boss on boss step
  const boss = exp.choices.find((c) => c.kind === 'boss');
  if (boss) return boss;

  // Priority 4: Gold Chest -> Fortune/Power Shrine -> Elite -> Chest -> Battle
  const order: ExpeditionChoiceKind[] = [
    'gold_chest',
    'shrine_fortune',
    'shrine_power',
    'elite',
    'chest',
    'battle',
    'shrine_heal',
  ];
  for (const kind of order) {
    const match = exp.choices.find((c) => c.kind === kind);
    if (match) return match;
  }
  return exp.choices[0] ?? null;
}
