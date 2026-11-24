import { getClaimedAchievementBonuses } from './achievements';
import { getSpecies } from './data/monsters';
import { computeSkillTreeBonuses } from './skillTree';
import { computePartySynergies } from './synergy';
import { computeTrialModifiers } from './trials';
import type {
  ActiveSetCount,
  ActiveShrineBuffs,
  ComputedUnitStats,
  EquipmentItem,
  EquipSlot,
  GameSave,
  SetId,
  UniqueEffectId,
  UnitInstance,
} from './types';
import { getWorldTierBlessing } from './worldTier';

export function expForNextLevel(level: number): number {
  return Math.round(34 + level * 24 + Math.pow(level, 1.75) * 8.5);
}

export function getCompendiumBonusPct(
  discoveredMonstersCount: number,
  discoveredUniquesCount: number,
): { statPct: number; mfBonus: number } {
  return {
    statPct: Math.round(discoveredMonstersCount * 1.2 + discoveredUniquesCount * 1.8),
    mfBonus: Math.round(discoveredMonstersCount * 1.5 + discoveredUniquesCount * 3.5),
  };
}

export function getEvolutionRequirement(unit: UnitInstance): {
  minLevel: number;
  stoneCost: number;
  discounted: boolean;
} {
  const discounted = unit.awakening >= 2;
  return {
    minLevel: 10,
    stoneCost: discounted ? 15 : 35,
    discounted,
  };
}

export function canEvolveMonster(unit: UnitInstance, forgeStones: number): boolean {
  if (unit.id === 'hero' || unit.evolved) return false;
  const req = getEvolutionRequirement(unit);
  return unit.level >= req.minLevel && forgeStones >= req.stoneCost;
}

export function getTrueEvolutionRequirement(unit: UnitInstance): {
  minLevel: number;
  stoneCost: number;
  discounted: boolean;
} {
  const discounted = unit.awakening >= 4;
  return {
    minLevel: 25,
    stoneCost: discounted ? 30 : 60,
    discounted,
  };
}

export function canTrueEvolveMonster(unit: UnitInstance, forgeStones: number): boolean {
  if (unit.id === 'hero' || !unit.evolved || unit.trueEvolved) return false;
  const req = getTrueEvolutionRequirement(unit);
  return unit.level >= req.minLevel && forgeStones >= req.stoneCost;
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
    | 'inventory'
    | 'maxUnlockedTier'
    | 'discoveredMonsters'
    | 'discoveredUniques'
    | 'partyIds'
    | 'roster'
    | 'heroSkillTree'
    | 'claimedAchievements'
  > & { activeTrials?: GameSave['activeTrials'] },
  shrineBuffs?: ActiveShrineBuffs,
  inventoryMapOverride?: Map<string, EquipmentItem>,
): ComputedUnitStats {
  const sp = getSpecies(unit.speciesId);
  const lvl = Math.max(1, unit.level);
  const invMap =
    inventoryMapOverride ?? new Map(save.inventory.map((it) => [it.id, it]));
  const equipped = getEquippedItemsForUnit(unit, invMap);

  const isHero = unit.speciesId === 'hero';
  const evolveMult = !isHero && unit.evolved ? (unit.trueEvolved ? 1.48 : 1.24) : 1.0;
  const awakenMult = (1 + unit.awakening * 0.06) * evolveMult;
  const blessing = getWorldTierBlessing(save.maxUnlockedTier);
  const comp = getCompendiumBonusPct(
    save.discoveredMonsters.length,
    save.discoveredUniques.length,
  );
  const ach = getClaimedAchievementBonuses(save);
  const syn = computePartySynergies(save);
  const tree = computeSkillTreeBonuses(save);

  const allyBondPct = isHero ? 0 : tree.allyMonsterAllStatPct;

  let flatHp = (sp.baseStats.hp + sp.growth.hp * (lvl - 1)) * awakenMult;
  let flatMp = (sp.baseStats.mp + sp.growth.mp * (lvl - 1)) * awakenMult;
  let flatAtk = (sp.baseStats.atk + sp.growth.atk * (lvl - 1)) * awakenMult;
  let flatMag = (sp.baseStats.mag + sp.growth.mag * (lvl - 1)) * awakenMult;
  let flatDef = (sp.baseStats.def + sp.growth.def * (lvl - 1)) * awakenMult;
  let flatSpd =
    (sp.baseStats.spd + sp.growth.spd * (lvl - 1)) *
    (1 + unit.awakening * 0.025) *
    (unit.trueEvolved ? 1.2 : unit.evolved ? 1.1 : 1);

  let atkPct =
    (sp.passiveBonus.atkPct ?? 0) +
    comp.statPct +
    ach.statPct +
    syn.atkPct +
    allyBondPct +
    (isHero ? tree.heroAtkPct : 0);
  let magPct =
    (sp.passiveBonus.magPct ?? 0) +
    comp.statPct +
    ach.statPct +
    syn.magPct +
    allyBondPct +
    (isHero ? tree.heroMagPct : 0);
  let defPct =
    (sp.passiveBonus.defPct ?? 0) +
    comp.statPct +
    ach.statPct +
    syn.defPct +
    allyBondPct +
    (isHero ? tree.heroDefPct : 0);
  let hpPct =
    (sp.passiveBonus.hpPct ?? 0) +
    comp.statPct +
    ach.statPct +
    syn.hpPct +
    allyBondPct +
    (isHero ? tree.heroHpPct : 0);

  let spdFlat = (sp.passiveBonus.spdFlat ?? 0) + syn.spdFlat + (isHero ? tree.heroSpdFlat : 0);
  let critRate =
    5 + (sp.passiveBonus.critRate ?? 0) + syn.critRate + (isHero ? tree.heroCritRate : 0);
  let critDmg = 150 + (isHero ? tree.heroCritDmg : 0);
  let lifesteal = (sp.passiveBonus.lifesteal ?? 0) + (isHero ? tree.heroLifesteal : 0);
  let doubleHit = (sp.passiveBonus.doubleHit ?? 0) + (isHero ? tree.heroDoubleHit : 0);
  let regenPct = (sp.passiveBonus.regenPct ?? 0) + syn.regenPct;
  let magicFind =
    (sp.passiveBonus.magicFind ?? 0) +
    blessing.magicFindBonus +
    comp.mfBonus +
    ach.mfBonus +
    syn.magicFind +
    (isHero ? tree.heroMagicFind : 0);
  let goldFind =
    (sp.passiveBonus.goldFind ?? 0) + blessing.goldBonusPct + syn.goldFind;
  let expFind = blessing.expBonusPct;
  let stoneFind = isHero ? tree.heroStoneFind : 0;
  let damageTakenMult = 1.0;

  let skillPowerBonusPct =
    (isHero ? tree.heroSkillPowerBonusPct : 0) +
    (unit.evolved ? 16 : 0) +
    (unit.trueEvolved ? 14 : 0);
  let weaknessBonusPct = isHero ? tree.heroWeaknessBonusPct : 0;
  let mpRegenBonus = isHero ? tree.heroMpRegenBonus : 0;
  let armorPenPct = isHero ? tree.heroArmorPenPct : 0;
  let statusDmgBonusPct = isHero ? tree.heroStatusDmgBonusPct : 0;

  const uniqueEffects: UniqueEffectId[] = [];
  const setCounts = new Map<SetId, number>();

  for (const item of equipped) {
    flatHp += item.baseStats.hp ?? 0;
    flatAtk += item.baseStats.atk ?? 0;
    flatMag += item.baseStats.mag ?? 0;
    flatDef += item.baseStats.def ?? 0;
    flatSpd += item.baseStats.spd ?? 0;

    if (item.setId) {
      setCounts.set(item.setId, (setCounts.get(item.setId) ?? 0) + 1);
    }

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

  const activeSets: ActiveSetCount[] = [];
  for (const [setId, count] of setCounts.entries()) {
    activeSets.push({ setId, count });
    if (count >= 2) {
      if (setId === 'forest_guard') hpPct += 14;
      else if (setId === 'ancient_rune') defPct += 16;
      else if (setId === 'crimson_fury') atkPct += 15;
      else if (setId === 'astral_mage') magPct += 16;
      else if (setId === 'golden_greed') magicFind += 28;
      else if (setId === 'lunar_blade') {
        spdFlat += 8;
        critRate += 7;
      } else if (setId === 'frost_monarch') {
        defPct += 14;
        magPct += 10;
      } else if (setId === 'seraph_radiance') {
        hpPct += 14;
        magPct += 12;
      } else if (setId === 'blood_pact') {
        lifesteal += 10;
        atkPct += 10;
      } else if (setId === 'void_walker') {
        armorPenPct += 14;
      }
    }
    if (count >= 4) {
      if (setId === 'forest_guard') {
        regenPct += 6;
        damageTakenMult *= 0.91;
      } else if (setId === 'crimson_fury') {
        critDmg += 36;
        lifesteal += 7;
      } else if (setId === 'golden_greed') {
        goldFind += 35;
        expFind += 28;
        stoneFind += 30;
      } else if (setId === 'lunar_blade') {
        doubleHit += 16;
      } else if (setId === 'frost_monarch') {
        statusDmgBonusPct += 22;
      } else if (setId === 'seraph_radiance') {
        regenPct += 5;
      } else if (setId === 'void_walker') {
        armorPenPct += 18;
        skillPowerBonusPct += 18;
      }
    }
  }
  activeSets.sort((a, b) => b.count - a.count);

  // Tightened unique bonuses + 14 new v10 uniques
  if (uniqueEffects.includes('clover_luck')) goldFind += 30;
  if (uniqueEffects.includes('astral_compass')) critDmg += 34;
  if (uniqueEffects.includes('starlight_mantle')) damageTakenMult *= 0.89;
  if (uniqueEffects.includes('mithril_fortress')) damageTakenMult *= 0.92;
  if (uniqueEffects.includes('blazing_cloak')) regenPct += 5;
  if (uniqueEffects.includes('forge_heart_amulet')) {
    stoneFind += 45;
    atkPct += 11;
    magPct += 11;
  }
  if (uniqueEffects.includes('mimic_crown')) {
    magicFind += 28;
    damageTakenMult *= 1.12;
  }
  if (uniqueEffects.includes('titan_gauntlet_relic')) hpPct += 12;
  if (uniqueEffects.includes('seraph_lance')) armorPenPct += 18;
  if (uniqueEffects.includes('prism_wand')) weaknessBonusPct += 25;
  if (uniqueEffects.includes('glacier_plate')) damageTakenMult *= 0.88;
  if (uniqueEffects.includes('seraph_robe')) {
    regenPct += 7;
    mpRegenBonus += 8;
  }
  if (uniqueEffects.includes('fenrir_fang_relic')) spdFlat += 12;
  if (uniqueEffects.includes('halo_diadem')) skillPowerBonusPct += 18;
  if (uniqueEffects.includes('void_heart_relic')) armorPenPct += 22;
  if (uniqueEffects.includes('crystal_scale_relic')) stoneFind += 35;
  if (uniqueEffects.includes('judgment_rune')) statusDmgBonusPct += 28;
  if (uniqueEffects.includes('eternal_tamer_rune')) {
    atkPct += 10;
    magPct += 10;
    defPct += 10;
    hpPct += 10;
  }

  const powerMult = 1 + (shrineBuffs?.powerBonus ?? 0);
  magicFind += shrineBuffs?.fortuneBonus ?? 0;

  const maxHp = Math.max(
    40,
    Math.round(flatHp * (1 + hpPct / 100) * blessing.statMult),
  );
  const maxMp = Math.max(20, Math.round(flatMp * (1 + (blessing.statMult - 1) * 0.45)));
  const def = Math.max(
    5,
    Math.round(flatDef * (1 + defPct / 100) * blessing.statMult),
  );
  const spd = Math.max(5, Math.round(flatSpd + spdFlat));

  let atk = Math.max(
    8,
    Math.round(flatAtk * (1 + atkPct / 100) * blessing.statMult * powerMult),
  );
  let mag = Math.max(
    8,
    Math.round(flatMag * (1 + magPct / 100) * blessing.statMult * powerMult),
  );

  if (uniqueEffects.includes('storm_bowblade')) {
    atk += Math.round(spd * 0.9);
  }
  if (uniqueEffects.includes('mithril_fortress')) {
    atk += Math.round(def * 0.28);
  }
  if (activeSets.some((s) => s.setId === 'ancient_rune' && s.count >= 4)) {
    atk += Math.round(def * 0.22);
    mag += Math.round(def * 0.22);
  }

  const clampedCritRate = Math.min(92, critRate);
  const clampedDoubleHit = Math.min(80, doubleHit);
  const clampedLifesteal = Math.min(55, lifesteal);
  const clampedArmorPen = Math.min(65, armorPenPct);

  const powerScore = Math.round(
    maxHp * 0.35 +
      Math.max(atk, mag) * 4.2 +
      Math.min(atk, mag) * 1.1 +
      def * 2.5 +
      spd * 2 +
      clampedCritRate * 3 +
      clampedDoubleHit * 3 +
      clampedArmorPen * 2,
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
    stoneFind,
    damageTakenMult,
    skillPowerBonusPct,
    weaknessBonusPct,
    mpRegenBonus,
    armorPenPct: clampedArmorPen,
    statusDmgBonusPct,
    uniqueEffects,
    activeSets,
    powerScore,
  };
}

export function getPartyAggregatedLootBonuses(
  save: GameSave,
  shrineBuffs?: ActiveShrineBuffs,
): { magicFind: number; goldFind: number; expFind: number; stoneFind: number } {
  const invMap = new Map(save.inventory.map((it) => [it.id, it]));
  const trials = computeTrialModifiers(save.activeTrials);
  let mf = 0;
  let gf = 0;
  let ef = 0;
  let sf = 0;
  let count = 0;
  for (const id of save.partyIds) {
    const unit = save.roster[id];
    if (!unit) continue;
    const st = computeUnitStats(unit, save, shrineBuffs, invMap);
    mf += st.magicFind;
    gf += st.goldFind;
    ef += st.expFind;
    sf += st.stoneFind;
    count += 1;
  }
  if (count === 0) {
    return {
      magicFind: trials.mfBonus,
      goldFind: 0,
      expFind: trials.expBonusPct,
      stoneFind: trials.stoneBonusPct,
    };
  }
  const scale = 1 / Math.max(1, Math.pow(count, 0.55));
  return {
    magicFind: Math.round(mf * scale) + trials.mfBonus,
    goldFind: Math.round(gf * scale),
    expFind: Math.round(ef * scale) + trials.expBonusPct,
    stoneFind: Math.round(sf * scale) + trials.stoneBonusPct,
  };
}
