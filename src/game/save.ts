import { createStarterWeapon } from './data/equipment';
import { HERO_SPECIES, SPECIES_MAP } from './data/monsters';
import { computeUnitStats } from './stats';
import type { EquipmentItem, GameSave, UnitInstance } from './types';
import { generateShopInventory } from './worldTier';

export const SAVE_STORAGE_KEY = 'runetamer_labyrinth_save_v1';
export const CURRENT_SAVE_VERSION = 2;

export function createUnitInstance(speciesId: string, level = 1): UnitInstance {
  const sp = SPECIES_MAP[speciesId] ?? HERO_SPECIES;
  const hp = Math.round(sp.baseStats.hp + sp.growth.hp * (level - 1));
  const mp = Math.round(sp.baseStats.mp + sp.growth.mp * (level - 1));
  return {
    id: speciesId,
    speciesId,
    level,
    exp: 0,
    awakening: 0,
    hp,
    mp,
    equipped: {
      weapon: null,
      armor: null,
      relic: null,
      rune: null,
    },
  };
}

export function createInitialSave(): GameSave {
  const starterWeapon = createStarterWeapon();
  const hero = createUnitInstance('hero', 1);
  hero.equipped.weapon = starterWeapon.id;

  const starterSlime = createUnitInstance('leaf_slime', 1);

  const baseSave: GameSave = {
    version: CURRENT_SAVE_VERSION,
    savedAt: Date.now(),
    gold: 120,
    forgeStones: 12, // Start with enough stones to try Blacksmithing right away!
    worldTier: 1,
    maxUnlockedTier: 1,
    highestFloorByTier: { 1: 1 },
    partyIds: ['hero', 'leaf_slime'],
    roster: {
      hero,
      leaf_slime: starterSlime,
    },
    inventory: [starterWeapon],
    discoveredMonsters: ['leaf_slime'],
    discoveredUniques: [],
    shopItems: [],
    shopRefreshedAtTier: 1,
    settings: {
      autoBattle: false,
      battleSpeed: 1,
      battleTactic: 'balanced',
      autoSell: 'none',
      autoLootMode: 'sell',
    },
    stats: {
      totalKills: 0,
      totalBossKills: 0,
      totalChestsOpened: 0,
      totalItemsLooted: 1,
      totalMythicsFound: 0,
      highestFloorReached: 1,
      totalForgeUpgrades: 0,
      totalRerolls: 0,
    },
  };

  for (const id of baseSave.partyIds) {
    const u = baseSave.roster[id];
    if (u) {
      const st = computeUnitStats(u, baseSave);
      u.hp = st.maxHp;
      u.mp = st.maxMp;
    }
  }
  baseSave.shopItems = generateShopInventory(1, 1, 15);
  return baseSave;
}

export function saveGameToLocal(save: GameSave): void {
  try {
    const payload: GameSave = { ...save, savedAt: Date.now() };
    localStorage.setItem(SAVE_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore storage quota / sandboxed iframe errors gracefully
  }
}

export function loadGameFromLocal(): GameSave | null {
  try {
    const raw = localStorage.getItem(SAVE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GameSave;
    return validateSave(parsed);
  } catch {
    return null;
  }
}

export function clearLocalSave(): void {
  try {
    localStorage.removeItem(SAVE_STORAGE_KEY);
  } catch {
    // Ignore
  }
}

function simpleChecksum(str: string): string {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function toBase64Utf8(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 1) {
    bin += String.fromCharCode(bytes[i]!);
  }
  return btoa(bin);
}

function fromBase64Utf8(b64: string): string {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) {
    bytes[i] = bin.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

export function exportSaveCode(save: GameSave): string {
  const json = JSON.stringify({ ...save, savedAt: Date.now() });
  const encoded = toBase64Utf8(json);
  const sum = simpleChecksum(encoded);
  return `RTL1:${sum}:${encoded}`;
}

export function importSaveCode(code: string): { ok: true; save: GameSave } | { ok: false; error: string } {
  const trimmed = code.trim();
  if (!trimmed.startsWith('RTL1:')) {
    return { ok: false, error: 'セーブコードの形式が正しくありません（RTL1: で始まる必要があります）。' };
  }
  const parts = trimmed.split(':');
  if (parts.length !== 3) {
    return { ok: false, error: 'セーブコードが破損しています。' };
  }
  const [, checksum, encoded] = parts;
  if (!encoded || simpleChecksum(encoded) !== checksum) {
    return { ok: false, error: 'チェックサムが一致しません。コピー漏れがないか確認してください。' };
  }
  try {
    const json = fromBase64Utf8(encoded);
    const parsed = JSON.parse(json) as GameSave;
    const valid = validateSave(parsed);
    if (!valid) {
      return { ok: false, error: 'セーブデータ構造が無効です。' };
    }
    return { ok: true, save: valid };
  } catch {
    return { ok: false, error: 'セーブコードの復号に失敗しました。' };
  }
}

function normalizeItem(it: Partial<EquipmentItem>): EquipmentItem {
  return {
    ...(it as EquipmentItem),
    enhanceLevel: typeof it.enhanceLevel === 'number' ? it.enhanceLevel : 0,
    rerollCount: typeof it.rerollCount === 'number' ? it.rerollCount : 0,
  };
}

export function validateSave(data: unknown): GameSave | null {
  if (!data || typeof data !== 'object') return null;
  const s = data as Partial<GameSave>;
  if (
    typeof s.version !== 'number' ||
    !s.roster ||
    !s.roster.hero ||
    !Array.isArray(s.partyIds) ||
    !Array.isArray(s.inventory)
  ) {
    return null;
  }
  const fallback = createInitialSave();
  return {
    ...fallback,
    ...s,
    version: CURRENT_SAVE_VERSION,
    forgeStones: typeof s.forgeStones === 'number' ? s.forgeStones : fallback.forgeStones,
    inventory: s.inventory.map(normalizeItem),
    settings: { ...fallback.settings, ...(s.settings ?? {}) },
    stats: { ...fallback.stats, ...(s.stats ?? {}) },
    highestFloorByTier: { ...fallback.highestFloorByTier, ...(s.highestFloorByTier ?? {}) },
    discoveredMonsters: Array.isArray(s.discoveredMonsters) ? s.discoveredMonsters : fallback.discoveredMonsters,
    discoveredUniques: Array.isArray(s.discoveredUniques) ? s.discoveredUniques : [],
    shopItems:
      Array.isArray(s.shopItems) && s.shopItems.length > 0
        ? s.shopItems.map(normalizeItem)
        : fallback.shopItems,
  };
}
