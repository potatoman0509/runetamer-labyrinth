import { getSpecies } from './data/monsters';
import type { ElementType, GameSave, MonsterRole } from './types';

export interface PartySynergyBonus {
  id: string;
  name: string;
  desc: string;
  color: string;
  atkPct?: number;
  magPct?: number;
  defPct?: number;
  hpPct?: number;
  critRate?: number;
  regenPct?: number;
  magicFind?: number;
  goldFind?: number;
  spdFlat?: number;
  startShieldPct?: number;
}

export interface AggregatedSynergy {
  active: PartySynergyBonus[];
  atkPct: number;
  magPct: number;
  defPct: number;
  hpPct: number;
  critRate: number;
  regenPct: number;
  magicFind: number;
  goldFind: number;
  spdFlat: number;
  startShieldPct: number;
}

export function computePartySynergies(
  save: Pick<GameSave, 'partyIds' | 'roster'>,
): AggregatedSynergy {
  const speciesList = save.partyIds
    .map((id) => save.roster[id])
    .filter((u): u is NonNullable<typeof u> => Boolean(u))
    .map((u) => getSpecies(u.speciesId));

  const elemCounts: Record<ElementType, number> = {
    physical: 0,
    nature: 0,
    earth: 0,
    fire: 0,
    star: 0,
    holy: 0,
  };
  const roleCounts: Record<MonsterRole, number> = {
    tank: 0,
    striker: 0,
    mage: 0,
    support: 0,
    speed: 0,
  };

  for (const sp of speciesList) {
    elemCounts[sp.element] += 1;
    roleCounts[sp.role] += 1;
  }

  const active: PartySynergyBonus[] = [];

  // Element Synergies (2+ or 3+ matching elements)
  if (elemCounts.nature >= 2) {
    const tier = elemCounts.nature >= 3 ? 2 : 1;
    active.push({
      id: 'elem_nature',
      name: `森の共鳴(${elemCounts.nature})`,
      desc: `HP+${tier * 12}% / 毎T再生+${tier * 3}%`,
      color: '#4ea854',
      hpPct: tier * 12,
      regenPct: tier * 3,
    });
  }
  if (elemCounts.earth >= 2) {
    const tier = elemCounts.earth >= 3 ? 2 : 1;
    active.push({
      id: 'elem_earth',
      name: `大地の共鳴(${elemCounts.earth})`,
      desc: `防御+${tier * 16}% / 開幕盾+${tier * 8}%`,
      color: '#9e7c52',
      defPct: tier * 16,
      startShieldPct: tier * 8,
    });
  }
  if (elemCounts.fire >= 2) {
    const tier = elemCounts.fire >= 3 ? 2 : 1;
    active.push({
      id: 'elem_fire',
      name: `紅蓮の共鳴(${elemCounts.fire})`,
      desc: `攻撃+${tier * 12}% / 会心+${tier * 5}%`,
      color: '#d95338',
      atkPct: tier * 12,
      critRate: tier * 5,
    });
  }
  if (elemCounts.star >= 2) {
    const tier = elemCounts.star >= 3 ? 2 : 1;
    active.push({
      id: 'elem_star',
      name: `星辰の共鳴(${elemCounts.star})`,
      desc: `魔力+${tier * 14}% / 素早さ+${tier * 4}`,
      color: '#4888d6',
      magPct: tier * 14,
      spdFlat: tier * 4,
    });
  }
  if (elemCounts.holy >= 2) {
    const tier = elemCounts.holy >= 3 ? 2 : 1;
    active.push({
      id: 'elem_holy',
      name: `聖光の共鳴(${elemCounts.holy})`,
      desc: `MF+${tier * 18}% / 金貨+${tier * 20}%`,
      color: '#d9a42b',
      magicFind: tier * 18,
      goldFind: tier * 20,
    });
  }

  // Role Formation Synergies
  const hasTank = roleCounts.tank >= 1;
  const hasDps = roleCounts.striker + roleCounts.mage + roleCounts.speed >= 2;
  const hasSupport = roleCounts.support >= 1;

  if (hasTank && hasDps && hasSupport) {
    active.push({
      id: 'role_balanced',
      name: '黄金バランス編成',
      desc: '全能力+10% / 毎T再生+3%',
      color: '#3b8c6e',
      atkPct: 10,
      magPct: 10,
      defPct: 10,
      hpPct: 10,
      regenPct: 3,
    });
  }
  if (roleCounts.striker + roleCounts.mage + roleCounts.speed >= 3) {
    active.push({
      id: 'role_blitz',
      name: '猛攻パーティ',
      desc: '攻撃/魔力+12% / 会心+6%',
      color: '#c94a4a',
      atkPct: 12,
      magPct: 12,
      critRate: 6,
    });
  }
  if (roleCounts.tank >= 2) {
    active.push({
      id: 'role_fortress',
      name: '鉄壁の陣',
      desc: '防御+22% / 開幕盾+12%',
      color: '#4272a8',
      defPct: 22,
      startShieldPct: 12,
    });
  }

  return active.reduce<AggregatedSynergy>(
    (acc, s) => ({
      active: acc.active,
      atkPct: acc.atkPct + (s.atkPct ?? 0),
      magPct: acc.magPct + (s.magPct ?? 0),
      defPct: acc.defPct + (s.defPct ?? 0),
      hpPct: acc.hpPct + (s.hpPct ?? 0),
      critRate: acc.critRate + (s.critRate ?? 0),
      regenPct: acc.regenPct + (s.regenPct ?? 0),
      magicFind: acc.magicFind + (s.magicFind ?? 0),
      goldFind: acc.goldFind + (s.goldFind ?? 0),
      spdFlat: acc.spdFlat + (s.spdFlat ?? 0),
      startShieldPct: acc.startShieldPct + (s.startShieldPct ?? 0),
    }),
    {
      active,
      atkPct: 0,
      magPct: 0,
      defPct: 0,
      hpPct: 0,
      critRate: 0,
      regenPct: 0,
      magicFind: 0,
      goldFind: 0,
      spdFlat: 0,
      startShieldPct: 0,
    },
  );
}
