import { getSpecies } from './data/monsters';
import type {
  ActiveShrineBuffs,
  ComputedUnitStats,
  EquipmentItem,
  EquipSlot,
  GameSave,
  UniqueEffectId,
  UnitInstance,
} from './types';
import { getWorldTierBlessing } from './worldTier';

export function expForNextLevel(level: number): number {
  return Math.round(32 + level * 22 + Math.pow(level, 1.72) * 8);
}

export function getCompendiumBonusPct(
  discoveredMonstersCount: number,
  discoveredUniquesCount: number,
): { statPct: number; mfBonus: number } {
  return {
    statPct: discoveredMonstersCount * 2 + discoveredUniquesCount * 3,
    mfBonus: discoveredMonstersCount * 2 + discoveredUniquesCount * 5,
  };
}

export function getEquippedItemsForUnit(
  unit: UnitInstance,
  inventoryMap: Map<string, EquipmentItem>,
): EquipmentItem[] {
  const slots: EquipSlot[] = ['weapon', 'armor', 'relic', 'rune'];
  const items: EquipmentItem[] = [];
  for (const s of slots) {
    const id = unit.equipped[s];
    if (id) {
      const item = inventoryMap.get(id);
      if (item) items.push(item);
    }
  }
  return items;
}

export function computeUnitStats(
  unit: UnitInstance,
  save: Pick<
    GameSave,
    'inventory' | 'maxUnlockedTier' | 'discoveredMonsters' | 'discoveredUniques'
  >,
  shrineBuffs?: ActiveShrineBuffs,
  inventoryMapOverride?: Map<string, EquipmentItem>,
): ComputedUnitStats {
  const sp = getSpecies(unit.speciesId);
  const lvl = Math.max(1, unit.level);
  const invMap =
    inventoryMapOverride ?? new Map(save.inventory.map((it) => [it.id, it]));
  const equipped = getEquippedItemsForUnit(unit, invMap);

  // Awakening bonus: +8% all base stats per star (from duplicate monster recruits)
  const awakenMult = 1 + unit.awakening * 0.08;
  const blessing = getWorldTierBlessing(save.maxUnlockedTier);
  const comp = getCompendiumBonusPct(
    save.discoveredMonsters.length,
    save.discoveredUniques.length,
  );

  let flatHp = (sp.baseStats.hp + sp.growth.hp * (lvl - 1)) * awakenMult;
  let flatMp = (sp.baseStats.mp + sp.growth.mp * (lvl - 1)) * awakenMult;
  let flatAtk = (sp.baseStats.atk + sp.growth.atk * (lvl - 1)) * awakenMult;
  let flatMag = (sp.baseStats.mag + sp.growth.mag * (lvl - 1)) * awakenMult;
  let flatDef = (sp.baseStats.def + sp.growth.def * (lvl - 1)) * awakenMult;
  let flatSpd = (sp.baseStats.spd + sp.growth.spd * (lvl - 1)) * (1 + unit.awakening * 0.03);

  let atkPct = (sp.passiveBonus.atkPct ?? 0) + comp.statPct;
  let magPct = (sp.passiveBonus.magPct ?? 0) + comp.statPct;
  let defPct = (sp.passiveBonus.defPct ?? 0) + comp.statPct;
  let hpPct = (sp.passiveBonus.hpPct ?? 0) + comp.statPct;
  let spdFlat = sp.passiveBonus.spdFlat ?? 0;
  let critRate = 6 + (sp.passiveBonus.critRate ?? 0);
  let critDmg = 155;
  let lifesteal = sp.passiveBonus.lifesteal ?? 0;
  let doubleHit = sp.passiveBonus.doubleHit ?? 0;
  let regenPct = sp.passiveBonus.regenPct ?? 0;
  let magicFind = (sp.passiveBonus.magicFind ?? 0) + blessing.magicFindBonus + comp.mfBonus;
  let goldFind = blessing.goldBonusPct;
  let expFind = blessing.expBonusPct;
  const uniqueEffects: UniqueEffectId[] = [];

  for (const item of equipped) {
    flatHp += item.baseStats.hp ?? 0;
    flatAtk += item.baseStats.atk ?? 0;
    flatMag += item.baseStats.mag ?? 0;
    flatDef += item.baseStats.def ?? 0;
    flatSpd += item.baseStats.spd ?? 0;

    for (const af of item.affixes) {
      switch (af.stat) {
        case 'atkPct':
          atkPct += af.value;
          break;
        case 'magPct':
          magPct += af.value;
          break;
        case 'defPct':
          defPct += af.value;
          break;
        case 'hpPct':
          hpPct += af.value;
          break;
        case 'spdFlat':
          spdFlat += af.value;
          break;
        case 'critRate':
          critRate += af.value;
          break;
        case 'critDmg':
          critDmg += af.value;
          break;
        case 'lifesteal':
          lifesteal += af.value;
          break;
        case 'doubleHit':
          doubleHit += af.value;
          break;
        case 'magicFind':
          magicFind += af.value;
          break;
        case 'goldFind':
          goldFind += af.value;
          break;
        case 'expFind':
          expFind += af.value;
          break;
        case 'regenPct':
          regenPct += af.value;
          break;
      }
    }

    if (item.uniqueId && !uniqueEffects.includes(item.uniqueId)) {
      uniqueEffects.push(item.uniqueId);
    }
  }

  // Unique passive stat boosts
  if (uniqueEffects.includes('clover_luck')) {
    goldFind += 40;
  }
  if (uniqueEffects.includes('astral_compass')) {
    critDmg += 45;
  }

  const powerMult = 1 + (shrineBuffs?.powerBonus ?? 0);
  magicFind += shrineBuffs?.fortuneBonus ?? 0;

  const maxHp = Math.max(
    40,
    Math.round(flatHp * (1 + hpPct / 100) * blessing.statMult),
  );
  const maxMp = Math.max(20, Math.round(flatMp * (1 + (blessing.statMult - 1) * 0.5)));
  const atk = Math.max(
    8,
    Math.round(flatAtk * (1 + atkPct / 100) * blessing.statMult * powerMult),
  );
  const mag = Math.max(
    8,
    Math.round(flatMag * (1 + magPct / 100) * blessing.statMult * powerMult),
  );
  const def = Math.max(
    5,
    Math.round(flatDef * (1 + defPct / 100) * blessing.statMult),
  );
  const spd = Math.max(5, Math.round(flatSpd + spdFlat));

  const clampedCritRate = Math.min(95, critRate);
  const clampedDoubleHit = Math.min(80, doubleHit);
  const clampedLifesteal = Math.min(60, lifesteal);

  const powerScore = Math.round(
    maxHp * 0.35 +
      Math.max(atk, mag) * 4.2 +
      Math.min(atk, mag) * 1.1 +
      def * 2.5 +
      spd * 2 +
      clampedCritRate * 3 +
      clampedDoubleHit * 3,
  );

  return {
    maxHp,
    maxMp,
    atk,
    mag,
    def,
    spd,
    critRate: clampedCritRate,
    critDmg,
    lifesteal: clampedLifesteal,
    doubleHit: clampedDoubleHit,
    regenPct,
    magicFind,
    goldFind,
    expFind,
    uniqueEffects,
    powerScore,
  };
}

export function getPartyAggregatedLootBonuses(
  save: GameSave,
  shrineBuffs?: ActiveShrineBuffs,
): { magicFind: number; goldFind: number; expFind: number } {
  const invMap = new Map(save.inventory.map((it) => [it.id, it]));
  let mf = 0;
  let gf = 0;
  let ef = 0;
  let count = 0;
  for (const id of save.partyIds) {
    const unit = save.roster[id];
    if (!unit) continue;
    const st = computeUnitStats(unit, save, shrineBuffs, invMap);
    mf += st.magicFind;
    gf += st.goldFind;
    ef += st.expFind;
    count += 1;
  }
  if (count === 0) return { magicFind: 0, goldFind: 0, expFind: 0 };
  // Average party bonuses plus synergy for extra members
  const scale = 1 / Math.max(1, Math.pow(count, 0.55));
  return {
    magicFind: Math.round(mf * scale),
    goldFind: Math.round(gf * scale),
    expFind: Math.round(ef * scale),
  };
}
