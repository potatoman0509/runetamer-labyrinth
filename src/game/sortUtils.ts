import { calculateItemScore, RARITY_META } from './data/equipment';
import { getSpecies, MONSTER_LIST } from './data/monsters';
import { computeUnitStats } from './stats';
import type {
  ActiveShrineBuffs,
  EquipmentItem,
  EquipSlot,
  GameSave,
  MonsterTier,
  UnitInstance,
} from './types';

export type SortDirection = 'desc' | 'asc';

export type RanchSortKey =
  | 'power'
  | 'level'
  | 'atk'
  | 'mag'
  | 'def'
  | 'spd'
  | 'hp'
  | 'tier'
  | 'awakening'
  | 'dex';

export const RANCH_SORT_OPTIONS: { value: RanchSortKey; label: string }[] = [
  { value: 'power', label: '戦力順' },
  { value: 'level', label: 'Lv順' },
  { value: 'atk', label: 'ATK順' },
  { value: 'mag', label: 'MAG順' },
  { value: 'def', label: 'DEF順' },
  { value: 'spd', label: 'SPD順' },
  { value: 'hp', label: 'HP順' },
  { value: 'tier', label: '格順' },
  { value: 'awakening', label: '覚醒★順' },
  { value: 'dex', label: '図鑑順' },
];

export type EquipSortKey =
  | 'score'
  | 'diff'
  | 'rarity'
  | 'itemLevel'
  | 'enhance'
  | 'slot'
  | 'sellValue'
  | 'atk'
  | 'mag'
  | 'def';

export const EQUIP_SORT_OPTIONS: { value: EquipSortKey; label: string }[] = [
  { value: 'score', label: '評価順' },
  { value: 'diff', label: '装備差分順' },
  { value: 'rarity', label: 'レア度順' },
  { value: 'itemLevel', label: 'iLv順' },
  { value: 'enhance', label: '強化値順' },
  { value: 'slot', label: '部位順' },
  { value: 'sellValue', label: '売値G順' },
  { value: 'atk', label: 'ATK重視' },
  { value: 'mag', label: 'MAG重視' },
  { value: 'def', label: '耐久重視' },
];

const TIER_RANK: Record<MonsterTier, number> = {
  normal: 1,
  elite: 2,
  boss: 3,
};

const SLOT_ORDER: Record<EquipSlot, number> = {
  weapon: 1,
  armor: 2,
  relic: 3,
  rune: 4,
};

const DEX_INDEX_MAP = new Map<string, number>(MONSTER_LIST.map((sp, idx) => [sp.id, idx]));

export function sortRanchMonsters(
  units: UnitInstance[],
  save: GameSave,
  shrineBuffs: ActiveShrineBuffs,
  invMap: Map<string, EquipmentItem>,
  sortKey: RanchSortKey,
  dir: SortDirection,
): UnitInstance[] {
  const mult = dir === 'desc' ? -1 : 1;
  const statsCache = new Map(
    units.map((u) => [u.id, computeUnitStats(u, save, shrineBuffs, invMap)]),
  );

  const metric = (u: UnitInstance): number => {
    const st = statsCache.get(u.id)!;
    const sp = getSpecies(u.speciesId);
    switch (sortKey) {
      case 'power':
        return st.powerScore;
      case 'level':
        return u.level;
      case 'atk':
        return st.atk;
      case 'mag':
        return st.mag;
      case 'def':
        return st.def;
      case 'spd':
        return st.spd;
      case 'hp':
        return st.maxHp;
      case 'tier':
        return TIER_RANK[sp.tier];
      case 'awakening':
        return u.awakening * 10 + (u.trueEvolved ? 2 : u.evolved ? 1 : 0);
      case 'dex':
        return DEX_INDEX_MAP.get(u.speciesId) ?? 9999;
    }
  };

  return [...units].sort((a, b) => {
    const ma = metric(a);
    const mb = metric(b);
    if (ma !== mb) {
      // Dex sort defaults intuitively: asc = #001..#150, desc = #150..#001
      return (ma - mb) * mult;
    }
    const pa = statsCache.get(a.id)!.powerScore;
    const pb = statsCache.get(b.id)!.powerScore;
    if (pa !== pb) return pb - pa;
    return a.id.localeCompare(b.id);
  });
}

function getEquipStatWeight(item: EquipmentItem, focus: 'atk' | 'mag' | 'def'): number {
  const enhMult = 1 + item.enhanceLevel * 0.14;
  let total = 0;
  if (focus === 'atk') {
    total += (item.baseStats.atk ?? 0) * enhMult * 3;
    for (const af of item.affixes) {
      if (af.stat === 'atkPct') total += af.value * 4;
      if (af.stat === 'critRate' || af.stat === 'critDmg' || af.stat === 'doubleHit') {
        total += af.value * 2;
      }
    }
  } else if (focus === 'mag') {
    total += (item.baseStats.mag ?? 0) * enhMult * 3;
    for (const af of item.affixes) {
      if (af.stat === 'magPct') total += af.value * 4;
      if (af.stat === 'critRate' || af.stat === 'critDmg') total += af.value * 1.5;
    }
  } else {
    total += (item.baseStats.def ?? 0) * enhMult * 3 + (item.baseStats.hp ?? 0) * enhMult * 0.4;
    for (const af of item.affixes) {
      if (af.stat === 'defPct' || af.stat === 'hpPct') total += af.value * 4;
      if (af.stat === 'regenPct' || af.stat === 'lifesteal') total += af.value * 2;
    }
  }
  return total;
}

export function sortEquipmentItems(
  items: EquipmentItem[],
  unit: UnitInstance,
  invMap: Map<string, EquipmentItem>,
  equippedOwnerMap: Map<string, string>,
  sortKey: EquipSortKey,
  dir: SortDirection,
): EquipmentItem[] {
  const mult = dir === 'desc' ? -1 : 1;
  const scoreCache = new Map(items.map((it) => [it.id, calculateItemScore(it)]));

  const metric = (item: EquipmentItem): number => {
    switch (sortKey) {
      case 'score':
        return scoreCache.get(item.id)!;
      case 'diff': {
        const ownerId = equippedOwnerMap.get(item.id);
        if (ownerId === unit.id) return 0;
        const curSlotId = unit.equipped[item.slot];
        const curItem = curSlotId ? invMap.get(curSlotId) : null;
        return scoreCache.get(item.id)! - (curItem ? calculateItemScore(curItem) : 0);
      }
      case 'rarity':
        return RARITY_META[item.rarity].rank;
      case 'itemLevel':
        return item.itemLevel;
      case 'enhance':
        return item.enhanceLevel;
      case 'slot':
        return SLOT_ORDER[item.slot];
      case 'sellValue':
        return item.sellValue;
      case 'atk':
        return getEquipStatWeight(item, 'atk');
      case 'mag':
        return getEquipStatWeight(item, 'mag');
      case 'def':
        return getEquipStatWeight(item, 'def');
    }
  };

  return [...items].sort((a, b) => {
    const ma = metric(a);
    const mb = metric(b);
    if (ma !== mb) return (ma - mb) * mult;
    const sa = scoreCache.get(a.id)!;
    const sb = scoreCache.get(b.id)!;
    if (sa !== sb) return sb - sa;
    return a.id.localeCompare(b.id);
  });
}
