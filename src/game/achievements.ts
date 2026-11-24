import type { GameSave } from './types';

export interface AchievementDef {
  id: string;
  title: string;
  desc: string;
  target: number;
  rewardStones: number;
  rewardSp: number;
  permStatPct: number;
  permMf: number;
  getValue: (save: GameSave) => number;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: 'kill_15',
    title: '迷宮の洗礼',
    desc: '魔物を累計15体討伐する',
    target: 15,
    rewardStones: 8,
    rewardSp: 1,
    permStatPct: 2,
    permMf: 3,
    getValue: (s) => s.stats.totalKills,
  },
  {
    id: 'kill_80',
    title: '百戦錬磨の狩人',
    desc: '魔物を累計80体討伐する',
    target: 80,
    rewardStones: 20,
    rewardSp: 1,
    permStatPct: 3,
    permMf: 5,
    getValue: (s) => s.stats.totalKills,
  },
  {
    id: 'kill_250',
    title: '深淵の殲滅者',
    desc: '魔物を累計250体討伐する',
    target: 250,
    rewardStones: 45,
    rewardSp: 2,
    permStatPct: 4,
    permMf: 8,
    getValue: (s) => s.stats.totalKills,
  },
  {
    id: 'floor_5',
    title: '始まりの森の覇者',
    desc: '迷宮 5F に到達する',
    target: 5,
    rewardStones: 12,
    rewardSp: 1,
    permStatPct: 2,
    permMf: 4,
    getValue: (s) => s.stats.highestFloorReached,
  },
  {
    id: 'floor_10',
    title: '古代石の踏破者',
    desc: '迷宮 10F に到達する',
    target: 10,
    rewardStones: 22,
    rewardSp: 1,
    permStatPct: 3,
    permMf: 6,
    getValue: (s) => s.stats.highestFloorReached,
  },
  {
    id: 'floor_20',
    title: '星屑の深淵へ',
    desc: '迷宮 20F に到達する',
    target: 20,
    rewardStones: 40,
    rewardSp: 2,
    permStatPct: 5,
    permMf: 10,
    getValue: (s) => s.stats.highestFloorReached,
  },
  {
    id: 'floor_30',
    title: '果てなき深淵の開拓者',
    desc: 'エンドレス迷宮 30F に到達する',
    target: 30,
    rewardStones: 70,
    rewardSp: 2,
    permStatPct: 6,
    permMf: 15,
    getValue: (s) => s.stats.highestFloorReached,
  },
  {
    id: 'boss_3',
    title: '巨悪を討つ者',
    desc: '階層ボスを累計3体撃破する',
    target: 3,
    rewardStones: 18,
    rewardSp: 1,
    permStatPct: 3,
    permMf: 5,
    getValue: (s) => s.stats.totalBossKills,
  },
  {
    id: 'boss_15',
    title: 'ボススレイヤー',
    desc: '階層ボスを累計15体撃破する',
    target: 15,
    rewardStones: 50,
    rewardSp: 2,
    permStatPct: 5,
    permMf: 10,
    getValue: (s) => s.stats.totalBossKills,
  },
  {
    id: 'forge_5',
    title: '初めてのブレイクスルー',
    desc: '装備を ＋5 まで鍛冶強化する',
    target: 5,
    rewardStones: 15,
    rewardSp: 1,
    permStatPct: 2,
    permMf: 4,
    getValue: (s) => Math.max(s.stats.maxEnhanceReached, ...s.inventory.map((i) => i.enhanceLevel)),
  },
  {
    id: 'forge_15',
    title: '伝説の名工',
    desc: '装備を最大 ＋15 まで極める',
    target: 15,
    rewardStones: 60,
    rewardSp: 2,
    permStatPct: 5,
    permMf: 10,
    getValue: (s) => Math.max(s.stats.maxEnhanceReached, ...s.inventory.map((i) => i.enhanceLevel)),
  },
  {
    id: 'reroll_5',
    title: '神OPを求めて',
    desc: 'OP再鍛造を累計5回行う',
    target: 5,
    rewardStones: 20,
    rewardSp: 1,
    permStatPct: 2,
    permMf: 6,
    getValue: (s) => s.stats.totalRerolls,
  },
  {
    id: 'mon_8',
    title: '魔物使いの素質',
    desc: 'モンスター図鑑を8種埋める',
    target: 8,
    rewardStones: 18,
    rewardSp: 1,
    permStatPct: 3,
    permMf: 6,
    getValue: (s) => s.discoveredMonsters.length,
  },
  {
    id: 'mon_18',
    title: '伝説のルーンテイマー',
    desc: 'モンスター図鑑を18種埋める',
    target: 18,
    rewardStones: 55,
    rewardSp: 2,
    permStatPct: 6,
    permMf: 14,
    getValue: (s) => s.discoveredMonsters.length,
  },
  {
    id: 'uniq_5',
    title: '秘宝コレクター',
    desc: 'ユニーク装備を5種発見する',
    target: 5,
    rewardStones: 28,
    rewardSp: 1,
    permStatPct: 4,
    permMf: 10,
    getValue: (s) => s.discoveredUniques.length,
  },
  {
    id: 'evolve_1',
    title: '極進化の覚醒',
    desc: '仲間モンスターを1体「極進化」させる',
    target: 1,
    rewardStones: 25,
    rewardSp: 1,
    permStatPct: 4,
    permMf: 6,
    getValue: (s) =>
      Math.max(
        s.stats.totalEvolutions,
        Object.values(s.roster).filter((u) => u.evolved).length,
      ),
  },
  {
    id: 'tier_2',
    title: '新たな世界ランク',
    desc: '世界ランク Tier II を解放する',
    target: 2,
    rewardStones: 45,
    rewardSp: 2,
    permStatPct: 6,
    permMf: 15,
    getValue: (s) => s.maxUnlockedTier,
  },
  {
    id: 'rush_5',
    title: '闘技場の王者',
    desc: 'ボスラッシュ闘技場 Wave 5 を完全制覇する',
    target: 5,
    rewardStones: 80,
    rewardSp: 2,
    permStatPct: 8,
    permMf: 20,
    getValue: (s) => s.bossRushBestWave,
  },
];

export const ACHIEVEMENT_MAP: Record<string, AchievementDef> = Object.fromEntries(
  ACHIEVEMENTS.map((a) => [a.id, a]),
);

export function getUnclaimedAchievements(save: GameSave): AchievementDef[] {
  const claimed = new Set(save.claimedAchievements ?? []);
  return ACHIEVEMENTS.filter((a) => !claimed.has(a.id) && a.getValue(save) >= a.target);
}

export function getClaimedAchievementBonuses(
  save: Pick<GameSave, 'claimedAchievements'>,
): { statPct: number; mfBonus: number; bonusSp: number } {
  let statPct = 0;
  let mfBonus = 0;
  let bonusSp = 0;
  for (const id of save.claimedAchievements ?? []) {
    const def = ACHIEVEMENT_MAP[id];
    if (!def) continue;
    statPct += def.permStatPct;
    mfBonus += def.permMf;
    bonusSp += def.rewardSp;
  }
  return { statPct, mfBonus, bonusSp };
}
