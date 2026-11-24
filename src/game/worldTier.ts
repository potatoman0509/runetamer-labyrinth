import { generateEquipment } from './data/equipment';
import type { EquipmentItem } from './types';

export interface WorldTierBlessing {
  unlockedTier: number;
  statMult: number;
  magicFindBonus: number;
  expBonusPct: number;
  goldBonusPct: number;
}

export function toRoman(n: number): string {
  const table: [number, string][] = [
    [100, 'C'],
    [90, 'XC'],
    [50, 'L'],
    [40, 'XL'],
    [10, 'X'],
    [9, 'IX'],
    [5, 'V'],
    [4, 'IV'],
    [1, 'I'],
  ];
  let rem = Math.max(1, Math.floor(n));
  let out = '';
  for (const [val, sym] of table) {
    while (rem >= val) {
      out += sym;
      rem -= val;
    }
  }
  return out;
}

export function getWorldTierBlessing(maxUnlockedTier: number): WorldTierBlessing {
  const extra = Math.max(0, maxUnlockedTier - 1);
  return {
    unlockedTier: maxUnlockedTier,
    statMult: 1 + extra * 0.14,
    magicFindBonus: extra * 25,
    expBonusPct: extra * 30,
    goldBonusPct: extra * 35,
  };
}

export function getActiveTierModifiers(activeTier: number) {
  const extra = Math.max(0, activeTier - 1);
  return {
    tier: activeTier,
    label: `Tier ${toRoman(activeTier)}`,
    enemyHpMult: Math.pow(2.55, extra),
    enemyAtkMult: Math.pow(2.08, extra),
    enemyDefMult: Math.pow(1.85, extra),
    expMult: Math.pow(2.25, extra),
    goldMult: Math.pow(2.4, extra),
    eliteChance: Math.min(0.5, 0.18 + extra * 0.06),
    mythicHintPct: Math.min(35, 3 + extra * 5),
    itemLevelBonus: extra * 24,
  };
}

export function getShopPrice(item: EquipmentItem): number {
  return Math.max(40, Math.round(item.sellValue * 4.2));
}

export function generateShopInventory(
  highestFloor: number,
  worldTier: number,
  partyMagicFind: number,
): EquipmentItem[] {
  const refFloor = Math.max(2, highestFloor + 1);
  return [
    generateEquipment(refFloor, worldTier, partyMagicFind + 12, 'shop', 'weapon'),
    generateEquipment(refFloor, worldTier, partyMagicFind + 12, 'shop', 'armor'),
    generateEquipment(refFloor, worldTier, partyMagicFind + 16, 'shop', 'relic'),
    generateEquipment(refFloor, worldTier, partyMagicFind + 16, 'shop', 'rune'),
    generateEquipment(refFloor + 2, worldTier, partyMagicFind + 38, 'gold_chest'),
  ];
}
