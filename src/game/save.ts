import { createStarterWeapon } from './data/equipment';
import { HERO_SPECIES, SPECIES_MAP } from './data/monsters';
import { computeUnitStats } from './stats';
import type { EquipmentItem, GameSave, UnitInstance } from './types';
import { generateShopInventory } from './worldTier';

export const SAVE_STORAGE_KEY = 'runetamer_labyrinth_save_v1';
export const ACTIVE_SLOT_STORAGE_KEY = 'runetamer_labyrinth_active_slot_v1';
export const CURRENT_SAVE_VERSION = 10;

export type SaveSlotId = 1 | 2 | 3;
export const SAVE_SLOT_IDS: SaveSlotId[] = [1, 2, 3];

export interface SaveSlotSummary {
  slot: SaveSlotId;
  exists: boolean;
  savedAt: number;
  heroLevel: number;
  worldTier: number;
  highestFloor: number;
  gold: number;
  forgeStones: number;
  partySprites: string[];
}

export function getSlotStorageKey(slot: SaveSlotId): string {
  // Slot 1 reuses the legacy storage key so existing players keep their save seamlessly
  if (slot === 1) return SAVE_STORAGE_KEY;
  return `runetamer_labyrinth_save_slot_${slot}`;
}

export function getActiveSaveSlot(): SaveSlotId {
  try {
    const raw = localStorage.getItem(ACTIVE_SLOT_STORAGE_KEY);
    if (raw === '2') return 2;
    if (raw === '3') return 3;
  } catch {
    // Ignore storage access errors
  }
  return 1;
}

export function setActiveSaveSlot(slot: SaveSlotId): void {
  try {
    localStorage.setItem(ACTIVE_SLOT_STORAGE_KEY, String(slot));
  } catch {
    // Ignore storage access errors
  }
}

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
    evolved: false,
    trueEvolved: false,
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
    forgeStones: 12,
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
    heroSkillTree: {},
    heroEquippedSkillIds: [HERO_SPECIES.skills[0].id, HERO_SPECIES.skills[1].id],
    claimedAchievements: [],
    bossRushBestWave: 0,
    activeTrials: [],
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
      totalEvolutions: 0,
      totalTrueEvolutions: 0,
      bossRushClears: 0,
      trialClears: 0,
      maxEnhanceReached: 0,
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

export function saveGameToSlot(slot: SaveSlotId, save: GameSave): number {
  const now = Date.now();
  try {
    const payload: GameSave = { ...save, savedAt: now };
    localStorage.setItem(getSlotStorageKey(slot), JSON.stringify(payload));
  } catch {
    // Ignore storage quota / sandboxed iframe errors gracefully
  }
  return now;
}

export function loadGameFromSlot(slot: SaveSlotId): GameSave | null {
  try {
    const raw = localStorage.getItem(getSlotStorageKey(slot));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GameSave;
    return validateSave(parsed);
  } catch {
    return null;
  }
}

export function deleteSaveSlot(slot: SaveSlotId): void {
  try {
    localStorage.removeItem(getSlotStorageKey(slot));
  } catch {
    // Ignore
  }
}

export function getSaveSlotSummary(slot: SaveSlotId): SaveSlotSummary {
  const data = loadGameFromSlot(slot);
  if (!data) {
    return {
      slot,
      exists: false,
      savedAt: 0,
      heroLevel: 0,
      worldTier: 1,
      highestFloor: 0,
      gold: 0,
      forgeStones: 0,
      partySprites: [],
    };
  }
  const partySprites = data.partyIds
    .map((id) => data.roster[id])
    .filter((u): u is UnitInstance => Boolean(u))
    .map((u) => (SPECIES_MAP[u.speciesId] ?? HERO_SPECIES).spriteKey);

  return {
    slot,
    exists: true,
    savedAt: data.savedAt,
    heroLevel: data.roster.hero?.level ?? 1,
    worldTier: data.worldTier,
    highestFloor: data.stats.highestFloorReached,
    gold: data.gold,
    forgeStones: data.forgeStones,
    partySprites,
  };
}

export function listSaveSlotSummaries(): SaveSlotSummary[] {
  return SAVE_SLOT_IDS.map((slot) => getSaveSlotSummary(slot));
}

export function formatSavedAt(ts: number): string {
  if (!ts || !Number.isFinite(ts)) return '--/-- --:--';
  const d = new Date(ts);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${mm}/${dd} ${hh}:${mi}`;
}

export function saveGameToLocal(save: GameSave): void {
  saveGameToSlot(getActiveSaveSlot(), save);
}

export function loadGameFromLocal(): GameSave | null {
  return loadGameFromSlot(getActiveSaveSlot());
}

export function clearLocalSave(): void {
  deleteSaveSlot(getActiveSaveSlot());
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
    return { ok: false, error: '形式が無効。RTL1: で始まるコードを入力してください。' };
  }
  const parts = trimmed.split(':');
  if (parts.length !== 3) {
    return { ok: false, error: 'セーブコードが破損しています。' };
  }
  const [, checksum, encoded] = parts;
  if (!encoded || simpleChecksum(encoded) !== checksum) {
    return { ok: false, error: 'チェックサム不一致。コピー漏れを確認してください。' };
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

interface ExportedSaveFileEnvelope {
  format: 'runetamer-labyrinth-save';
  version: number;
  exportedAt: number;
  checksum: string;
  save: GameSave;
}

export function exportSaveJson(save: GameSave): string {
  const now = Date.now();
  const payload: GameSave = { ...save, savedAt: now };
  const serialized = JSON.stringify(payload);
  const envelope: ExportedSaveFileEnvelope = {
    format: 'runetamer-labyrinth-save',
    version: CURRENT_SAVE_VERSION,
    exportedAt: now,
    checksum: simpleChecksum(serialized),
    save: payload,
  };
  return JSON.stringify(envelope, null, 2);
}

export function importSaveJson(
  rawText: string,
): { ok: true; save: GameSave } | { ok: false; error: string } {
  const trimmed = rawText.trim();
  if (!trimmed) {
    return { ok: false, error: 'ファイルが空です。' };
  }
  // Allow loading a plain text file containing an RTL1 save code too
  if (trimmed.startsWith('RTL1:')) {
    return importSaveCode(trimmed);
  }
  try {
    const parsed = JSON.parse(trimmed) as Partial<ExportedSaveFileEnvelope> & Partial<GameSave>;
    if (parsed && parsed.format === 'runetamer-labyrinth-save' && parsed.save) {
      const serialized = JSON.stringify(parsed.save);
      if (parsed.checksum && simpleChecksum(serialized) !== parsed.checksum) {
        return { ok: false, error: 'ファイルが破損または改ざんされています。' };
      }
      const valid = validateSave(parsed.save);
      if (!valid) {
        return { ok: false, error: 'セーブファイルの内容が無効です。' };
      }
      return { ok: true, save: valid };
    }
    // Fallback: direct GameSave JSON
    const valid = validateSave(parsed);
    if (!valid) {
      return { ok: false, error: '対応していないファイル形式です。' };
    }
    return { ok: true, save: valid };
  } catch {
    return { ok: false, error: 'JSONの読み込みに失敗しました。' };
  }
}

export function buildSaveFileName(slot: SaveSlotId): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `runetamer_slot${slot}_${yyyy}${mm}${dd}_${hh}${mi}.json`;
}

function normalizeItem(it: Partial<EquipmentItem>): EquipmentItem {
  return {
    ...(it as EquipmentItem),
    enhanceLevel: typeof it.enhanceLevel === 'number' ? it.enhanceLevel : 0,
    rerollCount: typeof it.rerollCount === 'number' ? it.rerollCount : 0,
    affixes: Array.isArray(it.affixes) ? it.affixes : [],
    baseStats: it.baseStats && typeof it.baseStats === 'object' ? it.baseStats : {},
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
  const safeRoster: Record<string, UnitInstance> = {};
  for (const [k, u] of Object.entries(s.roster)) {
    if (!u || typeof u !== 'object' || !u.speciesId) continue;
    safeRoster[k] = {
      ...u,
      level: typeof u.level === 'number' && u.level >= 1 ? u.level : 1,
      exp: typeof u.exp === 'number' && u.exp >= 0 ? u.exp : 0,
      awakening: typeof u.awakening === 'number' && u.awakening >= 0 ? u.awakening : 0,
      evolved: Boolean(u.evolved) || Boolean(u.trueEvolved),
      trueEvolved: Boolean(u.trueEvolved),
      hp: typeof u.hp === 'number' && u.hp >= 0 ? u.hp : 100,
      mp: typeof u.mp === 'number' && u.mp >= 0 ? u.mp : 20,
      equipped: {
        weapon: u.equipped?.weapon ?? null,
        armor: u.equipped?.armor ?? null,
        relic: u.equipped?.relic ?? null,
        rune: u.equipped?.rune ?? null,
      },
    };
  }
  if (!safeRoster.hero) return null;

  const safeParty = s.partyIds.filter((id) => Boolean(safeRoster[id]));
  if (!safeParty.includes('hero')) safeParty.unshift('hero');

  const safeEquippedSkills: [string, string] =
    Array.isArray(s.heroEquippedSkillIds) && s.heroEquippedSkillIds.length === 2
      ? [String(s.heroEquippedSkillIds[0]), String(s.heroEquippedSkillIds[1])]
      : fallback.heroEquippedSkillIds;

  const validTrialIds = new Set(['iron_foes', 'drought', 'no_potions', 'swift_foes', 'blood_boss']);
  const safeTrials = Array.isArray(s.activeTrials)
    ? s.activeTrials.filter((id): id is GameSave['activeTrials'][number] => validTrialIds.has(String(id)))
    : [];

  return {
    ...fallback,
    ...s,
    version: CURRENT_SAVE_VERSION,
    savedAt: typeof s.savedAt === 'number' && Number.isFinite(s.savedAt) ? s.savedAt : fallback.savedAt,
    gold: typeof s.gold === 'number' && Number.isFinite(s.gold) ? s.gold : fallback.gold,
    forgeStones:
      typeof s.forgeStones === 'number' && Number.isFinite(s.forgeStones)
        ? s.forgeStones
        : fallback.forgeStones,
    worldTier: typeof s.worldTier === 'number' && s.worldTier >= 1 ? s.worldTier : 1,
    maxUnlockedTier:
      typeof s.maxUnlockedTier === 'number' && s.maxUnlockedTier >= 1 ? s.maxUnlockedTier : 1,
    partyIds: safeParty.slice(0, 4),
    roster: safeRoster,
    inventory: s.inventory.filter((it) => Boolean(it && it.id && it.slot)).map(normalizeItem),
    heroSkillTree:
      s.heroSkillTree && typeof s.heroSkillTree === 'object' ? s.heroSkillTree : {},
    heroEquippedSkillIds: safeEquippedSkills,
    claimedAchievements: Array.isArray(s.claimedAchievements) ? s.claimedAchievements : [],
    bossRushBestWave:
      typeof s.bossRushBestWave === 'number' && s.bossRushBestWave >= 0
        ? s.bossRushBestWave
        : 0,
    activeTrials: safeTrials,
    settings: {
      ...fallback.settings,
      ...(s.settings ?? {}),
      autoLootMode: s.settings?.autoLootMode === 'salvage' ? 'salvage' : 'sell',
    },
    stats: {
      ...fallback.stats,
      ...(s.stats ?? {}),
      totalForgeUpgrades:
        typeof s.stats?.totalForgeUpgrades === 'number' ? s.stats.totalForgeUpgrades : 0,
      totalRerolls: typeof s.stats?.totalRerolls === 'number' ? s.stats.totalRerolls : 0,
      totalEvolutions:
        typeof s.stats?.totalEvolutions === 'number' ? s.stats.totalEvolutions : 0,
      totalTrueEvolutions:
        typeof s.stats?.totalTrueEvolutions === 'number' ? s.stats.totalTrueEvolutions : 0,
      bossRushClears:
        typeof s.stats?.bossRushClears === 'number' ? s.stats.bossRushClears : 0,
      trialClears:
        typeof s.stats?.trialClears === 'number' ? s.stats.trialClears : 0,
      maxEnhanceReached:
        typeof s.stats?.maxEnhanceReached === 'number' ? s.stats.maxEnhanceReached : 0,
    },
    highestFloorByTier: { ...fallback.highestFloorByTier, ...(s.highestFloorByTier ?? {}) },
    discoveredMonsters: Array.isArray(s.discoveredMonsters)
      ? s.discoveredMonsters
      : fallback.discoveredMonsters,
    discoveredUniques: Array.isArray(s.discoveredUniques) ? s.discoveredUniques : [],
    shopItems:
      Array.isArray(s.shopItems) && s.shopItems.length > 0
        ? s.shopItems.filter((it) => Boolean(it && it.id && it.slot)).map(normalizeItem)
        : fallback.shopItems,
  };
}
