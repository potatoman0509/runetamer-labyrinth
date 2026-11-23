import { generateEquipment } from './data/equipment';
import type { EquipmentItem } from './types';

export interface WorldTierBlessing {
  unlockedTier: number;
  statMult: number; // e.g., 1.0, 1.18, 1.36...
  magicFindBonus: number; // +25% per unlocked tier beyond 1
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

/**
 * Permanent account-wide blessings earned by unlocking higher World Tiers.
 * Applies even when farming lower tiers!
 */
export function getWorldTierBlessing(maxUnlockedTier: number): WorldTierBlessing {
  const extra = Math.max(0, maxUnlockedTier - 1);
  return {
    unlockedTier: maxUnlockedTier,
    statMult: 1 + extra * 0.2,
    magicFindBonus: extra * 30,
    expBonusPct: extra * 35,
    goldBonusPct: extra * 40,
  };
}

/**
 * Active World Tier difficulty and reward scaling.
 */
export function getActiveTierModifiers(activeTier: number) {
  const extra = Math.max(0, activeTier - 1);
  return {
    tier: activeTier,
    label: `Tier ${toRoman(activeTier)}`,
    enemyHpMult: Math.pow(2.35, extra),
    enemyAtkMult: Math.pow(1.95, extra),
    enemyDefMult: Math.pow(1.75, extra),
    expMult: Math.pow(2.2, extra),
    goldMult: Math.pow(2.4, extra),
    eliteChance: Math.min(0.45, 0.16 + extra * 0.06),
    mythicHintPct: Math.min(35, 3 + extra * 5),
    itemLevelBonus: extra * 22,
  };
}

export function getShopPrice(item: EquipmentItem): number {
  return Math.max(40, Math.round(item.sellValue * 3.8));
}

export function generateShopInventory(
  highestFloor: number,
  worldTier: number,
  partyMagicFind: number,
): EquipmentItem[] {
  const refFloor = Math.max(2, highestFloor + 1);
  return [
    generateEquipment(refFloor, worldTier, partyMagicFind + 15, 'shop', 'weapon'),
    generateEquipment(refFloor, worldTier, partyMagicFind + 15, 'shop', 'armor'),
    generateEquipment(refFloor, worldTier, partyMagicFind + 20, 'shop', 'relic'),
    generateEquipment(refFloor, worldTier, partyMagicFind + 20, 'shop', 'rune'),
    generateEquipment(refFloor + 2, worldTier, partyMagicFind + 45, 'gold_chest'),
  ];
}
