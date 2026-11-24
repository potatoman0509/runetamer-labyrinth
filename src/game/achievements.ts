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
  { id: 'kill_15', title: '迷宮の洗礼', desc: '魔物15体討伐', target: 15, rewardStones: 8, rewardSp: 1, permStatPct: 1, permMf: 2, getValue: (s) => s.stats.totalKills },
  { id: 'kill_80', title: '百戦錬磨', desc: '魔物80体討伐', target: 80, rewardStones: 18, rewardSp: 1, permStatPct: 2, permMf: 4, getValue: (s) => s.stats.totalKills },
  { id: 'kill_250', title: '深淵の殲滅者', desc: '魔物250体討伐', target: 250, rewardStones: 40, rewardSp: 2, permStatPct: 3, permMf: 6, getValue: (s) => s.stats.totalKills },
  { id: 'kill_600', title: '絶滅の覇者', desc: '魔物600体討伐', target: 600, rewardStones: 70, rewardSp: 2, permStatPct: 4, permMf: 8, getValue: (s) => s.stats.totalKills },

  { id: 'floor_5', title: '始まりの森踏破', desc: '5F到達', target: 5, rewardStones: 10, rewardSp: 1, permStatPct: 1, permMf: 3, getValue: (s) => s.stats.highestFloorReached },
  { id: 'floor_10', title: '古代遺跡踏破', desc: '10F到達', target: 10, rewardStones: 18, rewardSp: 1, permStatPct: 2, permMf: 4, getValue: (s) => s.stats.highestFloorReached },
  { id: 'floor_20', title: '星屑の深淵踏破', desc: '20F到達', target: 20, rewardStones: 35, rewardSp: 1, permStatPct: 3, permMf: 6, getValue: (s) => s.stats.highestFloorReached },
  { id: 'floor_25', title: '氷結回廊踏破', desc: '25F到達', target: 25, rewardStones: 50, rewardSp: 2, permStatPct: 3, permMf: 8, getValue: (s) => s.stats.highestFloorReached },
  { id: 'floor_30', title: '黄金聖域踏破', desc: '30F到達', target: 30, rewardStones: 70, rewardSp: 2, permStatPct: 4, permMf: 10, getValue: (s) => s.stats.highestFloorReached },
  { id: 'floor_45', title: '無限迷宮の開拓者', desc: '45F到達', target: 45, rewardStones: 100, rewardSp: 2, permStatPct: 5, permMf: 14, getValue: (s) => s.stats.highestFloorReached },

  { id: 'boss_3', title: '巨悪を討つ者', desc: 'ボス3体撃破', target: 3, rewardStones: 16, rewardSp: 1, permStatPct: 2, permMf: 4, getValue: (s) => s.stats.totalBossKills },
  { id: 'boss_15', title: 'ボススレイヤー', desc: 'ボス15体撃破', target: 15, rewardStones: 45, rewardSp: 1, permStatPct: 3, permMf: 6, getValue: (s) => s.stats.totalBossKills },
  { id: 'boss_40', title: '神殺しの英雄', desc: 'ボス40体撃破', target: 40, rewardStones: 85, rewardSp: 2, permStatPct: 4, permMf: 10, getValue: (s) => s.stats.totalBossKills },

  { id: 'forge_5', title: '初突破', desc: '装備を+5強化', target: 5, rewardStones: 12, rewardSp: 1, permStatPct: 1, permMf: 3, getValue: (s) => Math.max(s.stats.maxEnhanceReached, ...s.inventory.map((i) => i.enhanceLevel)) },
  { id: 'forge_15', title: '伝説の名工', desc: '装備を+15強化', target: 15, rewardStones: 50, rewardSp: 1, permStatPct: 3, permMf: 6, getValue: (s) => Math.max(s.stats.maxEnhanceReached, ...s.inventory.map((i) => i.enhanceLevel)) },
  { id: 'forge_20', title: '神域の鍛冶神', desc: '装備を+20強化', target: 20, rewardStones: 95, rewardSp: 2, permStatPct: 5, permMf: 12, getValue: (s) => Math.max(s.stats.maxEnhanceReached, ...s.inventory.map((i) => i.enhanceLevel)) },
  { id: 'reroll_5', title: 'OP厳選師', desc: 'OP再鍛造5回', target: 5, rewardStones: 18, rewardSp: 1, permStatPct: 1, permMf: 4, getValue: (s) => s.stats.totalRerolls },
  { id: 'reroll_25', title: '神OP探究者', desc: 'OP再鍛造25回', target: 25, rewardStones: 55, rewardSp: 1, permStatPct: 3, permMf: 8, getValue: (s) => s.stats.totalRerolls },

  { id: 'mon_8', title: '魔物使いの素質', desc: '魔物図鑑8種', target: 8, rewardStones: 16, rewardSp: 1, permStatPct: 2, permMf: 4, getValue: (s) => s.discoveredMonsters.length },
  { id: 'mon_18', title: 'ルーンテイマー', desc: '魔物図鑑18種', target: 18, rewardStones: 45, rewardSp: 1, permStatPct: 3, permMf: 8, getValue: (s) => s.discoveredMonsters.length },
  { id: 'mon_30', title: '万魔の主', desc: '魔物図鑑30種', target: 30, rewardStones: 90, rewardSp: 2, permStatPct: 5, permMf: 14, getValue: (s) => s.discoveredMonsters.length },

  { id: 'uniq_5', title: '秘宝コレクター', desc: '固有装備5種', target: 5, rewardStones: 24, rewardSp: 1, permStatPct: 2, permMf: 6, getValue: (s) => s.discoveredUniques.length },
  { id: 'uniq_15', title: '聖遺物収集家', desc: '固有装備15種', target: 15, rewardStones: 60, rewardSp: 2, permStatPct: 4, permMf: 12, getValue: (s) => s.discoveredUniques.length },
  { id: 'uniq_30', title: '秘宝の覇王', desc: '固有装備30種', target: 30, rewardStones: 110, rewardSp: 2, permStatPct: 5, permMf: 18, getValue: (s) => s.discoveredUniques.length },

  { id: 'evolve_1', title: '極進化の覚醒', desc: '極進化1体', target: 1, rewardStones: 22, rewardSp: 1, permStatPct: 2, permMf: 4, getValue: (s) => Math.max(s.stats.totalEvolutions, Object.values(s.roster).filter((u) => u.evolved).length) },
  { id: 'true_evolve_1', title: '真極の超越', desc: '真極進化1体', target: 1, rewardStones: 55, rewardSp: 2, permStatPct: 4, permMf: 8, getValue: (s) => Math.max(s.stats.totalTrueEvolutions, Object.values(s.roster).filter((u) => u.trueEvolved).length) },

  { id: 'tier_2', title: '世界ランクⅡ', desc: 'Tier II解放', target: 2, rewardStones: 40, rewardSp: 2, permStatPct: 4, permMf: 10, getValue: (s) => s.maxUnlockedTier },
  { id: 'tier_3', title: '世界ランクⅢ', desc: 'Tier III解放', target: 3, rewardStones: 80, rewardSp: 2, permStatPct: 5, permMf: 15, getValue: (s) => s.maxUnlockedTier },

  { id: 'rush_5', title: '闘技場の王者', desc: '闘技場Wave5制覇', target: 5, rewardStones: 60, rewardSp: 2, permStatPct: 4, permMf: 10, getValue: (s) => s.bossRushBestWave },
  { id: 'rush_8', title: '終焉闘技場の覇神', desc: '闘技場Wave8制覇', target: 8, rewardStones: 120, rewardSp: 3, permStatPct: 6, permMf: 18, getValue: (s) => s.bossRushBestWave },
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
