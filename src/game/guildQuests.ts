import { BIOMES } from './data/biomes';
import type {
  DungeonBiomeId,
  GameSave,
  GuildQuestItem,
  GuildQuestState,
} from './types';

const ALL_BIOMES: DungeonBiomeId[] = ['forest', 'ruins', 'volcano', 'abyss', 'glacier', 'sanctum'];

export function getTodayDateKey(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function hashDateKey(dateKey: string): number {
  let h = 2166136261;
  for (let i = 0; i < dateKey.length; i += 1) {
    h ^= dateKey.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function generateDailyQuests(dateKey: string, worldTier: number): GuildQuestItem[] {
  const seed = hashDateKey(dateKey);
  const tierScale = 1 + (Math.max(1, worldTier) - 1) * 0.45;
  const biome = ALL_BIOMES[seed % ALL_BIOMES.length]!;
  const biomeLabel = BIOMES[biome].shortName;

  return [
    {
      id: `daily_${dateKey}_biome`,
      category: 'daily',
      title: `${biomeLabel}の魔物を8体討伐`,
      objective: 'biome_kills',
      biome,
      target: 8,
      progress: 0,
      rewardGold: Math.round(220 * tierScale),
      rewardStones: Math.round(10 * tierScale),
      claimed: false,
    },
    {
      id: `daily_${dateKey}_elite`,
      category: 'daily',
      title: 'エリート・希少魔物を3体討伐',
      objective: 'elites',
      target: 3,
      progress: 0,
      rewardGold: Math.round(300 * tierScale),
      rewardStones: Math.round(16 * tierScale),
      claimed: false,
    },
    {
      id: `daily_${dateKey}_boss`,
      category: 'daily',
      title: seed % 2 === 0 ? '試練刻印ONでボスを1体討伐' : '階層ボスを2体討伐',
      objective: seed % 2 === 0 ? 'trial_boss' : 'bosses',
      target: seed % 2 === 0 ? 1 : 2,
      progress: 0,
      rewardGold: Math.round(420 * tierScale),
      rewardStones: Math.round(24 * tierScale),
      claimed: false,
    },
  ];
}

export function generateCycleQuests(cycleNumber: number, worldTier: number): GuildQuestItem[] {
  const c = Math.max(1, cycleNumber);
  const tierScale = 1 + (Math.max(1, worldTier) - 1) * 0.45;
  const cycleMult = 1 + Math.min(8, c - 1) * 0.15;
  const biome = ALL_BIOMES[(c - 1) % ALL_BIOMES.length]!;
  const biomeLabel = BIOMES[biome].shortName;

  const killTarget = 10 + Math.min(20, (c - 1) * 2);
  const enhanceTarget = 2 + (c % 3);
  const rushTarget = Math.min(10, 2 + ((c - 1) % 5) * 2);

  return [
    {
      id: `cycle_${c}_kills`,
      category: 'cycle',
      title: `周回${c}・魔物を${killTarget}体討伐`,
      objective: 'kills',
      target: killTarget,
      progress: 0,
      rewardGold: Math.round(180 * tierScale * cycleMult),
      rewardStones: Math.round(9 * tierScale),
      claimed: false,
    },
    {
      id: `cycle_${c}_enhance`,
      category: 'cycle',
      title: c % 2 === 1 ? `周回${c}・${biomeLabel}で魔物を6体討伐` : `周回${c}・装備を${enhanceTarget}回強化`,
      objective: c % 2 === 1 ? 'biome_kills' : 'enhance',
      biome: c % 2 === 1 ? biome : undefined,
      target: c % 2 === 1 ? 6 : enhanceTarget,
      progress: 0,
      rewardGold: Math.round(240 * tierScale * cycleMult),
      rewardStones: Math.round(12 * tierScale),
      claimed: false,
    },
    {
      id: `cycle_${c}_rush`,
      category: 'cycle',
      title: `周回${c}・闘技場W${rushTarget}突破またはボス2体討伐`,
      objective: c % 2 === 0 ? 'boss_rush_wave' : 'bosses',
      target: c % 2 === 0 ? rushTarget : 2,
      progress: 0,
      rewardGold: Math.round(350 * tierScale * cycleMult),
      rewardStones: Math.round(18 * tierScale),
      claimed: false,
    },
  ];
}

export function createInitialGuildQuests(worldTier = 1, dateKey = getTodayDateKey()): GuildQuestState {
  return {
    dailyDateKey: dateKey,
    cycleNumber: 1,
    daily: generateDailyQuests(dateKey, worldTier),
    cycle: generateCycleQuests(1, worldTier),
  };
}

export function refreshDailyQuestsIfNeeded(
  state: GuildQuestState | undefined,
  worldTier: number,
  todayKey = getTodayDateKey(),
): GuildQuestState {
  if (!state || !Array.isArray(state.daily) || !Array.isArray(state.cycle)) {
    return createInitialGuildQuests(worldTier, todayKey);
  }
  if (state.dailyDateKey !== todayKey) {
    return {
      ...state,
      dailyDateKey: todayKey,
      daily: generateDailyQuests(todayKey, worldTier),
    };
  }
  return state;
}

export interface GuildBattleProgressEvent {
  kills: number;
  elites: number;
  bosses: number;
  biome: DungeonBiomeId;
  hasTrials: boolean;
  bossRushWave?: number;
}

function advanceQuestList(list: GuildQuestItem[], ev: GuildBattleProgressEvent): GuildQuestItem[] {
  return list.map((q) => {
    if (q.claimed || q.progress >= q.target) return q;
    let delta = 0;
    let setVal: number | null = null;
    if (q.objective === 'kills') delta = ev.kills;
    else if (q.objective === 'elites') delta = ev.elites;
    else if (q.objective === 'bosses') delta = ev.bosses;
    else if (q.objective === 'biome_kills' && q.biome === ev.biome) delta = ev.kills;
    else if (q.objective === 'trial_boss' && ev.hasTrials) delta = ev.bosses;
    else if (q.objective === 'boss_rush_wave' && ev.bossRushWave) {
      setVal = Math.max(q.progress, ev.bossRushWave);
    }
    const nextProgress =
      setVal !== null ? Math.min(q.target, setVal) : Math.min(q.target, q.progress + delta);
    if (nextProgress === q.progress) return q;
    return { ...q, progress: nextProgress };
  });
}

export function applyBattleProgressToQuests(
  state: GuildQuestState,
  ev: GuildBattleProgressEvent,
  worldTier: number,
): GuildQuestState {
  const fresh = refreshDailyQuestsIfNeeded(state, worldTier);
  return {
    ...fresh,
    daily: advanceQuestList(fresh.daily, ev),
    cycle: advanceQuestList(fresh.cycle, ev),
  };
}

export function applyEnhanceProgressToQuests(
  state: GuildQuestState,
  worldTier: number,
  count = 1,
): GuildQuestState {
  const fresh = refreshDailyQuestsIfNeeded(state, worldTier);
  const bump = (list: GuildQuestItem[]) =>
    list.map((q) =>
      q.objective === 'enhance' && !q.claimed && q.progress < q.target
        ? { ...q, progress: Math.min(q.target, q.progress + count) }
        : q,
    );
  return {
    ...fresh,
    daily: bump(fresh.daily),
    cycle: bump(fresh.cycle),
  };
}

export function getClaimableGuildQuestCount(save: GameSave): number {
  const gq = save.guildQuests;
  if (!gq) return 0;
  return [...gq.daily, ...gq.cycle].filter((q) => !q.claimed && q.progress >= q.target).length;
}

export function claimGuildQuestReward(
  save: GameSave,
  questId: string,
): { nextSave: GameSave; claimedQuest: GuildQuestItem | null; cycled: boolean } {
  const gq = refreshDailyQuestsIfNeeded(save.guildQuests, save.worldTier);
  let targetQuest: GuildQuestItem | null = null;

  const mark = (list: GuildQuestItem[]) =>
    list.map((q) => {
      if (q.id === questId && !q.claimed && q.progress >= q.target) {
        targetQuest = q;
        return { ...q, claimed: true };
      }
      return q;
    });

  let nextDaily = mark(gq.daily);
  let nextCycle = mark(gq.cycle);
  if (!targetQuest) {
    return { nextSave: save, claimedQuest: null, cycled: false };
  }

  let nextCycleNum = gq.cycleNumber;
  let cycled = false;
  if (nextCycle.every((q) => q.claimed)) {
    nextCycleNum += 1;
    nextCycle = generateCycleQuests(nextCycleNum, save.worldTier);
    cycled = true;
  }

  const claimed: GuildQuestItem = targetQuest;
  const nextSave: GameSave = {
    ...save,
    gold: save.gold + claimed.rewardGold,
    forgeStones: save.forgeStones + claimed.rewardStones,
    guildQuests: {
      dailyDateKey: gq.dailyDateKey,
      cycleNumber: nextCycleNum,
      daily: nextDaily,
      cycle: nextCycle,
    },
  };
  return { nextSave, claimedQuest: claimed, cycled };
}
