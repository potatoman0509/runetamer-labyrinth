/**
 * Option C: Comprehensive Per-Species & Per-Equipment Visual Appearance Engine
 * Covers Hero + all 150 monsters (151 bespoke anatomical rigs) x all 13 base templates,
 * all 40 handcrafted Unique items, all 6 rarity tiers, enhancement forge glints (+4/+7/+10),
 * and all 8 4-piece Set auras on the 32x32 8-frame pixel grid.
 */

import { MONSTER_LIST } from '../game/data/monsters';
import type { EquipmentItem, Rarity, SetId, UniqueEffectId, UnitInstance } from '../game/types';
import { MONSTER_SPRITE_RECIPES } from './monsterSpriteAtlas';
import type { PixelGrid } from './hdSprites';

export type WeaponVisualKind =
  | 'sword'
  | 'greatsword'
  | 'staff'
  | 'scepter'
  | 'axe'
  | 'scythe'
  | 'dagger'
  | 'twinblade'
  | 'lance';

export type ArmorVisualKind = 'leather' | 'plate' | 'robe' | 'cloak' | 'carapace' | 'fortress';

export type RelicVisualKind =
  | 'crown'
  | 'halo'
  | 'amulet'
  | 'compass'
  | 'chalice'
  | 'hourglass'
  | 'void_heart'
  | 'gauntlet'
  | 'fang'
  | 'scale';

export type RuneVisualKind = 'red' | 'blue' | 'green' | 'gold' | 'violet' | 'prism';

export interface ParsedEquipAppearance {
  weapon?: { key: string; rarity: Rarity; enh: number; uniqueId?: UniqueEffectId };
  armor?: { key: string; rarity: Rarity; enh: number; uniqueId?: UniqueEffectId };
  relic?: { key: string; rarity: Rarity; enh: number; uniqueId?: UniqueEffectId };
  rune?: { key: string; rarity: Rarity; enh: number; uniqueId?: UniqueEffectId };
  setId?: SetId;
}

export interface WeaponAppearance {
  kind: WeaponVisualKind;
  blade: string;
  edge: string;
  hilt: string;
  glow: string;
}

export interface ArmorAppearance {
  kind: ArmorVisualKind;
  main: string;
  shade: string;
  light: string;
  trim: string;
  cape: string;
  capeShade: string;
  pauldron: boolean;
}

export interface RelicAppearance {
  kind: RelicVisualKind;
  primary: string;
  highlight: string;
  gem: string;
}

export interface RuneAppearance {
  kind: RuneVisualKind;
  core: string;
  glow: string;
}

export interface ResolvedEquipAppearance {
  weapon?: WeaponAppearance;
  armor?: ArmorAppearance;
  relic?: RelicAppearance;
  rune?: RuneAppearance;
  setAuraColor?: string;
  maxEnhance: number;
}

export interface SpeciesEquipRig {
  speciesKey: string;
  handX: number;
  handY: number;
  gripMode: 'raised' | 'forward' | 'side' | 'floating';
  armorX: number;
  armorY: number;
  armorW: number;
  armorH: number;
  headX: number;
  headY: number;
  capeX: number;
  capeY: number;
  relicX: number;
  relicY: number;
  runeX: number;
  runeY: number;
  bobAmp: number;
  weaponScale: number; // 0.7..1.05
}

const RARITY_PALETTE: Record<Rarity, { main: string; light: string; trim: string; glow: string }> = {
  common: { main: '#9ba3b5', light: '#dce2f0', trim: '#6e7585', glow: '#b8c4d9' },
  uncommon: { main: '#57c478', light: '#b5ffca', trim: '#2b7a44', glow: '#7ef29f' },
  rare: { main: '#58b4f5', light: '#c4ecff', trim: '#256099', glow: '#8ae0ff' },
  epic: { main: '#b97aff', light: '#ebd4ff', trim: '#63339e', glow: '#d6a6ff' },
  legendary: { main: '#f5be38', light: '#fff4ad', trim: '#9e6211', glow: '#ffe56b' },
  mythic: { main: '#ff5277', light: '#fff2a6', trim: '#9e1938', glow: '#7ce8ff' },
};

const SET_AURA_COLORS: Record<SetId, string> = {
  forest_guard: '#6dff8b',
  ancient_rune: '#e0a663',
  crimson_fury: '#ff6347',
  astral_mage: '#7ce8ff',
  golden_greed: '#ffe675',
  lunar_blade: '#c4b8ff',
  frost_monarch: '#8ae8ff',
  seraph_radiance: '#fff4a8',
  blood_pact: '#ff476e',
  void_walker: '#b47cff',
};

const UNIQUE_WEAPON_STYLES: Partial<Record<UniqueEffectId, WeaponAppearance>> = {
  sunblade_heal: { kind: 'sword', blade: '#ffd954', edge: '#fffce0', hilt: '#d97b24', glow: '#fff2a6' },
  twin_fang_strike: { kind: 'twinblade', blade: '#c2f0ff', edge: '#ffffff', hilt: '#f0b840', glow: '#7ce8ff' },
  sun_king_staff: { kind: 'staff', blade: '#ffe066', edge: '#ffffff', hilt: '#9c541c', glow: '#ff9638' },
  berserker_axe: { kind: 'axe', blade: '#ff4f42', edge: '#ffd6c2', hilt: '#5c241c', glow: '#ff8247' },
  giant_slayer_blade: { kind: 'greatsword', blade: '#a8b7d4', edge: '#ffffff', hilt: '#d49a2a', glow: '#ffe570' },
  meteor_scepter: { kind: 'scepter', blade: '#b97aff', edge: '#7ce8ff', hilt: '#f0c446', glow: '#ffe86b' },
  vampire_scythe: { kind: 'scythe', blade: '#e83858', edge: '#ffd6e0', hilt: '#421728', glow: '#ff668a' },
  storm_bowblade: { kind: 'twinblade', blade: '#5ce6ff', edge: '#ffffff', hilt: '#255c8f', glow: '#a8f9ff' },
  frostbite_blade: { kind: 'sword', blade: '#75dcff', edge: '#f0fcff', hilt: '#2b5e8c', glow: '#b8f5ff' },
  seraph_lance: { kind: 'lance', blade: '#ffe875', edge: '#ffffff', hilt: '#c98a1e', glow: '#7ce8ff' },
  eclipse_reaper_scythe: { kind: 'scythe', blade: '#a85cff', edge: '#ff7096', hilt: '#241436', glow: '#d48aff' },
  prism_wand: { kind: 'scepter', blade: '#7ce8ff', edge: '#ff9ce6', hilt: '#ffe86b', glow: '#ffffff' },
};

const UNIQUE_ARMOR_STYLES: Partial<Record<UniqueEffectId, ArmorAppearance>> = {
  world_tree_armor: {
    kind: 'leather',
    main: '#3ca858',
    shade: '#1e5c30',
    light: '#8cf096',
    trim: '#d9b25f',
    cape: '#2d7a40',
    capeShade: '#184724',
    pauldron: true,
  },
  golden_aegis: {
    kind: 'plate',
    main: '#f2c144',
    shade: '#9c6b17',
    light: '#fff5b8',
    trim: '#7ce8ff',
    cape: '#c93838',
    capeShade: '#7d1b1b',
    pauldron: true,
  },
  dragonscale_thorns: {
    kind: 'carapace',
    main: '#c9382b',
    shade: '#6e1614',
    light: '#ff7a52',
    trim: '#ffe066',
    cape: '#8c1f1a',
    capeShade: '#4a0c0c',
    pauldron: true,
  },
  starlight_mantle: {
    kind: 'cloak',
    main: '#384694',
    shade: '#1c2354',
    light: '#7592f0',
    trim: '#ffe875',
    cape: '#2b3478',
    capeShade: '#161a45',
    pauldron: false,
  },
  mithril_fortress: {
    kind: 'fortress',
    main: '#b8d0eb',
    shade: '#597496',
    light: '#ffffff',
    trim: '#6beeff',
    cape: '#3b5c8f',
    capeShade: '#1f3354',
    pauldron: true,
  },
  blazing_cloak: {
    kind: 'cloak',
    main: '#e85224',
    shade: '#8c2210',
    light: '#ffb84d',
    trim: '#ffe866',
    cape: '#ff6e26',
    capeShade: '#9e2412',
    pauldron: false,
  },
  glacier_plate: {
    kind: 'plate',
    main: '#75c4eb',
    shade: '#2b6799',
    light: '#e0f8ff',
    trim: '#ffffff',
    cape: '#3b82bd',
    capeShade: '#1d456e',
    pauldron: true,
  },
  seraph_robe: {
    kind: 'robe',
    main: '#f5ebd1',
    shade: '#baa473',
    light: '#ffffff',
    trim: '#f5c749',
    cape: '#ffe896',
    capeShade: '#c4962b',
    pauldron: true,
  },
  abyssal_carapace: {
    kind: 'carapace',
    main: '#523482',
    shade: '#241442',
    light: '#9e75e0',
    trim: '#ff66a8',
    cape: '#301a54',
    capeShade: '#170a2e',
    pauldron: true,
  },
};

const UNIQUE_RELIC_STYLES: Partial<Record<UniqueEffectId, RelicAppearance>> = {
  clover_luck: { kind: 'amulet', primary: '#54db73', highlight: '#c6ff9c', gem: '#ffe866' },
  crimson_chalice: { kind: 'chalice', primary: '#f0b840', highlight: '#fff3a8', gem: '#ff385c' },
  chronos_hourglass: { kind: 'hourglass', primary: '#f5c749', highlight: '#fff5be', gem: '#6beeff' },
  astral_compass: { kind: 'compass', primary: '#ffe066', highlight: '#ffffff', gem: '#8a75ff' },
  forge_heart_amulet: { kind: 'amulet', primary: '#ff7a33', highlight: '#ffe070', gem: '#7ce8ff' },
  mimic_crown: { kind: 'crown', primary: '#f5c23b', highlight: '#fff7bd', gem: '#ff4d6d' },
  titan_gauntlet_relic: { kind: 'gauntlet', primary: '#d99e38', highlight: '#ffe88f', gem: '#ff6640' },
  fenrir_fang_relic: { kind: 'fang', primary: '#b5ecff', highlight: '#ffffff', gem: '#4ec6ff' },
  halo_diadem: { kind: 'halo', primary: '#ffe86b', highlight: '#ffffff', gem: '#7ce8ff' },
  void_heart_relic: { kind: 'void_heart', primary: '#8f47d6', highlight: '#e0b8ff', gem: '#ff4d88' },
  crystal_scale_relic: { kind: 'scale', primary: '#7ce8ff', highlight: '#ffffff', gem: '#ff9ce6' },
};

const UNIQUE_RUNE_STYLES: Partial<Record<UniqueEffectId, RuneAppearance>> = {
  echo_crit_rune: { kind: 'gold', core: '#ffe059', glow: '#ffffff' },
  phoenix_ash_rune: { kind: 'red', core: '#ff6a33', glow: '#ffe570' },
  sage_star_rune: { kind: 'blue', core: '#7ce8ff', glow: '#d9b5ff' },
  overdrive_rune: { kind: 'red', core: '#ff3858', glow: '#ff9c66' },
  guardian_vow_rune: { kind: 'gold', core: '#ffe875', glow: '#7ef2a6' },
  blizzard_rune: { kind: 'blue', core: '#6beeff', glow: '#ffffff' },
  judgment_rune: { kind: 'violet', core: '#c475ff', glow: '#ff7aa8' },
  eternal_tamer_rune: { kind: 'prism', core: '#7ce8ff', glow: '#ffe570' },
};

const VALID_RARITIES = new Set<Rarity>(['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic']);

function serializeSlot(item: EquipmentItem | null | undefined): string {
  if (!item) return '';
  const uniq = item.uniqueId ?? '';
  return `${item.iconKey}~${item.rarity}~${item.enhanceLevel}~${uniq}`;
}

export function getUnitEquipVisualKey(
  unit: UnitInstance,
  invMap: Map<string, EquipmentItem>,
): string {
  const w = unit.equipped.weapon ? invMap.get(unit.equipped.weapon) : undefined;
  const a = unit.equipped.armor ? invMap.get(unit.equipped.armor) : undefined;
  const r = unit.equipped.relic ? invMap.get(unit.equipped.relic) : undefined;
  const u = unit.equipped.rune ? invMap.get(unit.equipped.rune) : undefined;
  if (!w && !a && !r && !u) return '';

  const setCounts: Partial<Record<SetId, number>> = {};
  for (const it of [w, a, r, u]) {
    if (it?.setId) {
      setCounts[it.setId] = (setCounts[it.setId] ?? 0) + 1;
    }
  }
  const activeSet = (Object.entries(setCounts).find(([, c]) => (c ?? 0) >= 4)?.[0] as SetId | undefined) ?? '';

  return [serializeSlot(w), serializeSlot(a), serializeSlot(r), serializeSlot(u), activeSet].join('|');
}

function parseSlotToken(token: string | undefined) {
  if (!token) return undefined;
  const [key, rRaw, enhRaw, uniqRaw] = token.split('~');
  if (!key) return undefined;
  const rarity: Rarity = VALID_RARITIES.has(rRaw as Rarity) ? (rRaw as Rarity) : 'common';
  const enh = Math.max(0, Number.parseInt(enhRaw ?? '0', 10) || 0);
  const uniqueId = uniqRaw ? (uniqRaw as UniqueEffectId) : undefined;
  return { key, rarity, enh, uniqueId };
}

export function parseEquipVisualKey(equipKey?: string): ParsedEquipAppearance | null {
  if (!equipKey) return null;
  const parts = equipKey.split('|');
  const weapon = parseSlotToken(parts[0]);
  const armor = parseSlotToken(parts[1]);
  const relic = parseSlotToken(parts[2]);
  const rune = parseSlotToken(parts[3]);
  const setId = parts[4] ? (parts[4] as SetId) : undefined;
  if (!weapon && !armor && !relic && !rune && !setId) return null;
  return { weapon, armor, relic, rune, setId };
}

export function resolveEquipmentAppearance(equipKey?: string): ResolvedEquipAppearance | null {
  const parsed = parseEquipVisualKey(equipKey);
  if (!parsed) return null;

  let maxEnhance = 0;

  let weapon: WeaponAppearance | undefined;
  if (parsed.weapon) {
    maxEnhance = Math.max(maxEnhance, parsed.weapon.enh);
    if (parsed.weapon.uniqueId && UNIQUE_WEAPON_STYLES[parsed.weapon.uniqueId]) {
      weapon = UNIQUE_WEAPON_STYLES[parsed.weapon.uniqueId];
    } else {
      const rp = RARITY_PALETTE[parsed.weapon.rarity];
      const kind: WeaponVisualKind =
        parsed.weapon.key === 'staff'
          ? 'staff'
          : parsed.weapon.key === 'axe'
            ? 'axe'
            : parsed.weapon.key === 'dagger'
              ? 'dagger'
              : 'sword';
      weapon = {
        kind,
        blade: rp.main,
        edge: rp.light,
        hilt: parsed.weapon.rarity === 'common' ? '#6e4024' : rp.trim,
        glow: rp.glow,
      };
    }
  }

  let armor: ArmorAppearance | undefined;
  if (parsed.armor) {
    maxEnhance = Math.max(maxEnhance, parsed.armor.enh);
    if (parsed.armor.uniqueId && UNIQUE_ARMOR_STYLES[parsed.armor.uniqueId]) {
      armor = UNIQUE_ARMOR_STYLES[parsed.armor.uniqueId];
    } else {
      const rp = RARITY_PALETTE[parsed.armor.rarity];
      const kind: ArmorVisualKind =
        parsed.armor.key === 'plate'
          ? 'plate'
          : parsed.armor.key === 'robe'
            ? 'robe'
            : 'leather';
      armor = {
        kind,
        main:
          kind === 'robe' && parsed.armor.rarity === 'common'
            ? '#3e62a8'
            : kind === 'leather' && parsed.armor.rarity === 'common'
              ? '#8c5632'
              : rp.main,
        shade: rp.trim,
        light: rp.light,
        trim: parsed.armor.rarity === 'common' ? '#d6a442' : rp.glow,
        cape: parsed.armor.rarity === 'common' ? '#c93c38' : rp.trim,
        capeShade: '#261724',
        pauldron: kind === 'plate' || parsed.armor.rarity !== 'common',
      };
    }
  }

  let relic: RelicAppearance | undefined;
  if (parsed.relic) {
    maxEnhance = Math.max(maxEnhance, parsed.relic.enh);
    if (parsed.relic.uniqueId && UNIQUE_RELIC_STYLES[parsed.relic.uniqueId]) {
      relic = UNIQUE_RELIC_STYLES[parsed.relic.uniqueId];
    } else {
      const rp = RARITY_PALETTE[parsed.relic.rarity];
      const kind: RelicVisualKind =
        parsed.relic.key === 'chalice'
          ? 'chalice'
          : parsed.relic.key === 'compass'
            ? 'compass'
            : 'amulet';
      relic = {
        kind,
        primary: parsed.relic.rarity === 'common' ? '#f5c23b' : rp.main,
        highlight: rp.light,
        gem: rp.glow,
      };
    }
  }

  let rune: RuneAppearance | undefined;
  if (parsed.rune) {
    maxEnhance = Math.max(maxEnhance, parsed.rune.enh);
    if (parsed.rune.uniqueId && UNIQUE_RUNE_STYLES[parsed.rune.uniqueId]) {
      rune = UNIQUE_RUNE_STYLES[parsed.rune.uniqueId];
    } else {
      const rp = RARITY_PALETTE[parsed.rune.rarity];
      const kind: RuneVisualKind =
        parsed.rune.key === 'rune_red'
          ? 'red'
          : parsed.rune.key === 'rune_blue'
            ? 'blue'
            : 'green';
      rune = {
        kind,
        core: kind === 'red' ? '#ff594d' : kind === 'blue' ? '#58c9ff' : '#5ce079',
        glow: parsed.rune.rarity === 'common' ? '#ffffff' : rp.glow,
      };
    }
  }

  return {
    weapon,
    armor,
    relic,
    rune,
    setAuraColor: parsed.setId ? SET_AURA_COLORS[parsed.setId] : undefined,
    maxEnhance,
  };
}

// ===== PER-SPECIES BESPOKE RIG TABLE (ALL 151 UNITS: HERO + 150 MONSTERS) =====

const EXPLICIT_SPECIES_RIGS: Record<string, Partial<SpeciesEquipRig>> = {
  hero: { handX: 22, handY: 19, gripMode: 'raised', armorX: 10, armorY: 14, armorW: 11, armorH: 10, headX: 15, headY: 3, capeX: 7, capeY: 14, relicX: 6, relicY: 9, runeX: 26, runeY: 22, bobAmp: 0.9, weaponScale: 1 },
  leaf_slime: { handX: 24, handY: 20, gripMode: 'side', armorX: 9, armorY: 20, armorW: 13, armorH: 5, headX: 15, headY: 9, capeX: 5, capeY: 19, relicX: 5, relicY: 11, runeX: 26, runeY: 12, bobAmp: 1.2, weaponScale: 0.85 },
  gold_slime: { handX: 24, handY: 20, gripMode: 'side', armorX: 9, armorY: 20, armorW: 13, armorH: 5, headX: 15, headY: 5, capeX: 5, capeY: 19, relicX: 5, relicY: 10, runeX: 26, runeY: 11, bobAmp: 1.2, weaponScale: 0.85 },
  frost_slime: { handX: 24, handY: 20, gripMode: 'side', armorX: 9, armorY: 20, armorW: 13, armorH: 5, headX: 15, headY: 5, capeX: 5, capeY: 19, relicX: 5, relicY: 10, runeX: 26, runeY: 11, bobAmp: 1.2, weaponScale: 0.85 },
  acorn_boar: { handX: 7, handY: 20, gripMode: 'forward', armorX: 10, armorY: 14, armorW: 12, armorH: 7, headX: 10, headY: 8, capeX: 18, capeY: 14, relicX: 5, relicY: 12, runeX: 26, runeY: 10, bobAmp: 0.9, weaponScale: 0.88 },
  moss_fox: { handX: 7, handY: 19, gripMode: 'forward', armorX: 11, armorY: 15, armorW: 10, armorH: 7, headX: 10, headY: 7, capeX: 19, capeY: 14, relicX: 5, relicY: 10, runeX: 26, runeY: 10, bobAmp: 0.9, weaponScale: 0.88 },
  ember_pup: { handX: 7, handY: 19, gripMode: 'forward', armorX: 11, armorY: 15, armorW: 10, armorH: 7, headX: 10, headY: 7, capeX: 19, capeY: 14, relicX: 5, relicY: 10, runeX: 26, runeY: 10, bobAmp: 0.9, weaponScale: 0.88 },
  lunar_wolf: { handX: 7, handY: 19, gripMode: 'forward', armorX: 11, armorY: 15, armorW: 10, armorH: 7, headX: 10, headY: 6, capeX: 19, capeY: 14, relicX: 5, relicY: 10, runeX: 26, runeY: 10, bobAmp: 0.9, weaponScale: 0.92 },
  ice_wolf: { handX: 7, handY: 19, gripMode: 'forward', armorX: 11, armorY: 15, armorW: 10, armorH: 7, headX: 10, headY: 6, capeX: 19, capeY: 14, relicX: 5, relicY: 10, runeX: 26, runeY: 10, bobAmp: 0.9, weaponScale: 0.92 },
  fenrir_lord: { handX: 7, handY: 19, gripMode: 'forward', armorX: 10, armorY: 14, armorW: 12, armorH: 8, headX: 10, headY: 4, capeX: 19, capeY: 14, relicX: 5, relicY: 10, runeX: 26, runeY: 9, bobAmp: 1.0, weaponScale: 0.95 },
  prism_sphinx: { handX: 7, handY: 19, gripMode: 'forward', armorX: 11, armorY: 15, armorW: 10, armorH: 7, headX: 10, headY: 5, capeX: 19, capeY: 14, relicX: 5, relicY: 10, runeX: 26, runeY: 10, bobAmp: 1.0, weaponScale: 0.92 },
  thorn_sprite: { handX: 22, handY: 18, gripMode: 'raised', armorX: 12, armorY: 15, armorW: 8, armorH: 8, headX: 15, headY: 6, capeX: 9, capeY: 15, relicX: 6, relicY: 9, runeX: 26, runeY: 22, bobAmp: 1.5, weaponScale: 0.85 },
  owl_sage: { handX: 22, handY: 19, gripMode: 'raised', armorX: 11, armorY: 14, armorW: 9, armorH: 8, headX: 15, headY: 5, capeX: 8, capeY: 14, relicX: 5, relicY: 9, runeX: 26, runeY: 12, bobAmp: 1.3, weaponScale: 0.9 },
  nebula_owl: { handX: 22, handY: 19, gripMode: 'raised', armorX: 11, armorY: 14, armorW: 9, armorH: 8, headX: 15, headY: 5, capeX: 8, capeY: 14, relicX: 5, relicY: 9, runeX: 26, runeY: 12, bobAmp: 1.3, weaponScale: 0.9 },
  crystal_bat: { handX: 23, handY: 18, gripMode: 'floating', armorX: 12, armorY: 15, armorW: 8, armorH: 6, headX: 15, headY: 7, capeX: 9, capeY: 15, relicX: 6, relicY: 8, runeX: 26, runeY: 21, bobAmp: 1.8, weaponScale: 0.85 },
  phoenix_chick: { handX: 23, handY: 17, gripMode: 'floating', armorX: 12, armorY: 15, armorW: 8, armorH: 7, headX: 15, headY: 6, capeX: 8, capeY: 15, relicX: 5, relicY: 8, runeX: 26, runeY: 21, bobAmp: 1.6, weaponScale: 0.88 },
  crimson_wyrm: { handX: 23, handY: 17, gripMode: 'raised', armorX: 11, armorY: 14, armorW: 10, armorH: 9, headX: 15, headY: 4, capeX: 7, capeY: 13, relicX: 5, relicY: 7, runeX: 27, runeY: 22, bobAmp: 1.4, weaponScale: 1 },
  ancient_treant: { handX: 24, handY: 17, gripMode: 'raised', armorX: 10, armorY: 14, armorW: 12, armorH: 9, headX: 15, headY: 3, capeX: 6, capeY: 14, relicX: 5, relicY: 7, runeX: 27, runeY: 23, bobAmp: 0.7, weaponScale: 1 },
  stone_imp: { handX: 22, handY: 18, gripMode: 'raised', armorX: 11, armorY: 15, armorW: 9, armorH: 8, headX: 15, headY: 6, capeX: 8, capeY: 15, relicX: 5, relicY: 9, runeX: 26, runeY: 22, bobAmp: 1.1, weaponScale: 0.9 },
  shield_knight: { handX: 22, handY: 18, gripMode: 'raised', armorX: 10, armorY: 13, armorW: 11, armorH: 10, headX: 15, headY: 4, capeX: 7, capeY: 13, relicX: 5, relicY: 8, runeX: 27, runeY: 22, bobAmp: 0.8, weaponScale: 1 },
  astral_knight: { handX: 22, handY: 18, gripMode: 'raised', armorX: 10, armorY: 13, armorW: 11, armorH: 10, headX: 15, headY: 4, capeX: 7, capeY: 13, relicX: 5, relicY: 8, runeX: 27, runeY: 22, bobAmp: 0.9, weaponScale: 1 },
  rune_golem: { handX: 24, handY: 17, gripMode: 'side', armorX: 9, armorY: 12, armorW: 14, armorH: 11, headX: 15, headY: 3, capeX: 6, capeY: 13, relicX: 5, relicY: 7, runeX: 27, runeY: 23, bobAmp: 0.7, weaponScale: 1 },
  glacier_golem: { handX: 24, handY: 17, gripMode: 'side', armorX: 9, armorY: 12, armorW: 14, armorH: 11, headX: 15, headY: 3, capeX: 6, capeY: 13, relicX: 5, relicY: 7, runeX: 27, runeY: 23, bobAmp: 0.7, weaponScale: 1 },
  snow_valkyrie: { handX: 22, handY: 18, gripMode: 'raised', armorX: 10, armorY: 13, armorW: 11, armorH: 10, headX: 15, headY: 4, capeX: 7, capeY: 13, relicX: 5, relicY: 8, runeX: 27, runeY: 22, bobAmp: 0.9, weaponScale: 1 },
  cherub_spark: { handX: 22, handY: 17, gripMode: 'raised', armorX: 12, armorY: 14, armorW: 8, armorH: 8, headX: 15, headY: 3, capeX: 8, capeY: 14, relicX: 5, relicY: 7, runeX: 26, runeY: 22, bobAmp: 1.5, weaponScale: 0.9 },
  golden_paladin: { handX: 22, handY: 18, gripMode: 'raised', armorX: 10, armorY: 13, armorW: 11, armorH: 10, headX: 15, headY: 4, capeX: 7, capeY: 13, relicX: 5, relicY: 8, runeX: 27, runeY: 22, bobAmp: 0.8, weaponScale: 1 },
  solar_phoenix: { handX: 23, handY: 17, gripMode: 'floating', armorX: 11, armorY: 14, armorW: 10, armorH: 8, headX: 15, headY: 4, capeX: 7, capeY: 14, relicX: 5, relicY: 7, runeX: 27, runeY: 22, bobAmp: 1.5, weaponScale: 0.95 },
  seraph_omega: { handX: 24, handY: 17, gripMode: 'floating', armorX: 11, armorY: 13, armorW: 10, armorH: 9, headX: 15, headY: 2, capeX: 7, capeY: 14, relicX: 4, relicY: 7, runeX: 27, runeY: 22, bobAmp: 1.6, weaponScale: 1 },
  crystal_dragon: { handX: 23, handY: 17, gripMode: 'raised', armorX: 11, armorY: 14, armorW: 10, armorH: 9, headX: 15, headY: 4, capeX: 7, capeY: 13, relicX: 5, relicY: 7, runeX: 27, runeY: 22, bobAmp: 1.4, weaponScale: 1 },
  eclipse_reaper: { handX: 22, handY: 18, gripMode: 'raised', armorX: 11, armorY: 14, armorW: 10, armorH: 9, headX: 15, headY: 4, capeX: 7, capeY: 14, relicX: 5, relicY: 8, runeX: 27, runeY: 22, bobAmp: 1.4, weaponScale: 1 },
  magma_crab: { handX: 24, handY: 18, gripMode: 'side', armorX: 10, armorY: 17, armorW: 12, armorH: 7, headX: 15, headY: 9, capeX: 6, capeY: 16, relicX: 5, relicY: 9, runeX: 27, runeY: 10, bobAmp: 0.8, weaponScale: 0.9 },
  ash_witch: { handX: 22, handY: 18, gripMode: 'raised', armorX: 11, armorY: 14, armorW: 10, armorH: 10, headX: 15, headY: 4, capeX: 7, capeY: 14, relicX: 5, relicY: 8, runeX: 26, runeY: 22, bobAmp: 1.1, weaponScale: 0.95 },
  star_jelly: { handX: 24, handY: 18, gripMode: 'floating', armorX: 10, armorY: 14, armorW: 11, armorH: 7, headX: 15, headY: 6, capeX: 6, capeY: 14, relicX: 5, relicY: 8, runeX: 27, runeY: 20, bobAmp: 1.5, weaponScale: 0.88 },
  void_herald: { handX: 22, handY: 18, gripMode: 'floating', armorX: 11, armorY: 14, armorW: 10, armorH: 9, headX: 15, headY: 4, capeX: 7, capeY: 14, relicX: 5, relicY: 8, runeX: 27, runeY: 22, bobAmp: 1.5, weaponScale: 0.95 },
  star_devourer: { handX: 24, handY: 18, gripMode: 'floating', armorX: 10, armorY: 14, armorW: 12, armorH: 8, headX: 15, headY: 4, capeX: 6, capeY: 14, relicX: 5, relicY: 7, runeX: 27, runeY: 22, bobAmp: 1.4, weaponScale: 1 },
  glacier_leviathan: { handX: 23, handY: 16, gripMode: 'floating', armorX: 9, armorY: 14, armorW: 13, armorH: 8, headX: 14, headY: 5, capeX: 6, capeY: 14, relicX: 5, relicY: 8, runeX: 27, runeY: 22, bobAmp: 1.2, weaponScale: 1 },
  abyss_kraken: { handX: 24, handY: 18, gripMode: 'side', armorX: 10, armorY: 14, armorW: 12, armorH: 7, headX: 15, headY: 4, capeX: 6, capeY: 14, relicX: 5, relicY: 8, runeX: 27, runeY: 21, bobAmp: 1.2, weaponScale: 0.95 },
  chronos_mantis: { handX: 22, handY: 17, gripMode: 'raised', armorX: 11, armorY: 14, armorW: 10, armorH: 8, headX: 15, headY: 4, capeX: 7, capeY: 14, relicX: 5, relicY: 8, runeX: 27, runeY: 22, bobAmp: 1.0, weaponScale: 0.95 },
  asura_emperor: { handX: 23, handY: 16, gripMode: 'raised', armorX: 10, armorY: 13, armorW: 12, armorH: 10, headX: 15, headY: 3, capeX: 6, capeY: 13, relicX: 4, relicY: 8, runeX: 27, runeY: 22, bobAmp: 0.9, weaponScale: 1 },
  genesis_orrery: { handX: 24, handY: 17, gripMode: 'floating', armorX: 11, armorY: 13, armorW: 10, armorH: 8, headX: 15, headY: 3, capeX: 6, capeY: 13, relicX: 4, relicY: 8, runeX: 27, runeY: 22, bobAmp: 1.5, weaponScale: 1 },
};

const ARCHETYPE_BASE_RIGS: Record<string, Omit<SpeciesEquipRig, 'speciesKey'>> = {
  whale: { handX: 23, handY: 17, gripMode: 'floating', armorX: 9, armorY: 14, armorW: 13, armorH: 8, headX: 14, headY: 5, capeX: 6, capeY: 14, relicX: 5, relicY: 8, runeX: 27, runeY: 22, bobAmp: 1.1, weaponScale: 0.95 },
  kraken: { handX: 24, handY: 18, gripMode: 'side', armorX: 10, armorY: 14, armorW: 12, armorH: 7, headX: 15, headY: 4, capeX: 6, capeY: 14, relicX: 5, relicY: 8, runeX: 27, runeY: 21, bobAmp: 1.1, weaponScale: 0.95 },
  mantis: { handX: 22, handY: 17, gripMode: 'raised', armorX: 11, armorY: 14, armorW: 10, armorH: 8, headX: 15, headY: 4, capeX: 7, capeY: 14, relicX: 5, relicY: 8, runeX: 27, runeY: 22, bobAmp: 1.0, weaponScale: 0.95 },
  asura: { handX: 23, handY: 16, gripMode: 'raised', armorX: 10, armorY: 13, armorW: 12, armorH: 10, headX: 15, headY: 3, capeX: 6, capeY: 13, relicX: 4, relicY: 8, runeX: 27, runeY: 22, bobAmp: 0.9, weaponScale: 1 },
  orrery: { handX: 24, handY: 17, gripMode: 'floating', armorX: 11, armorY: 13, armorW: 10, armorH: 8, headX: 15, headY: 4, capeX: 6, capeY: 14, relicX: 5, relicY: 8, runeX: 27, runeY: 22, bobAmp: 1.4, weaponScale: 0.92 },
  beast: { handX: 7, handY: 19, gripMode: 'forward', armorX: 11, armorY: 15, armorW: 10, armorH: 7, headX: 10, headY: 6, capeX: 19, capeY: 14, relicX: 5, relicY: 10, runeX: 26, runeY: 10, bobAmp: 0.9, weaponScale: 0.9 },
  avian: { handX: 23, handY: 17, gripMode: 'floating', armorX: 12, armorY: 14, armorW: 8, armorH: 7, headX: 15, headY: 5, capeX: 8, capeY: 14, relicX: 5, relicY: 8, runeX: 26, runeY: 21, bobAmp: 1.4, weaponScale: 0.88 },
  serpent: { handX: 22, handY: 16, gripMode: 'floating', armorX: 12, armorY: 16, armorW: 8, armorH: 7, headX: 11, headY: 6, capeX: 18, capeY: 15, relicX: 5, relicY: 8, runeX: 26, runeY: 21, bobAmp: 1.0, weaponScale: 0.9 },
  insect: { handX: 22, handY: 18, gripMode: 'side', armorX: 11, armorY: 15, armorW: 10, armorH: 7, headX: 15, headY: 6, capeX: 8, capeY: 15, relicX: 5, relicY: 9, runeX: 26, runeY: 21, bobAmp: 1.0, weaponScale: 0.88 },
  shell: { handX: 23, handY: 19, gripMode: 'side', armorX: 10, armorY: 15, armorW: 12, armorH: 7, headX: 15, headY: 8, capeX: 7, capeY: 16, relicX: 5, relicY: 10, runeX: 26, runeY: 11, bobAmp: 0.8, weaponScale: 0.88 },
  plant: { handX: 23, handY: 18, gripMode: 'side', armorX: 11, armorY: 16, armorW: 10, armorH: 7, headX: 15, headY: 4, capeX: 7, capeY: 16, relicX: 5, relicY: 9, runeX: 26, runeY: 21, bobAmp: 0.8, weaponScale: 0.88 },
  humanoid: { handX: 22, handY: 18, gripMode: 'raised', armorX: 11, armorY: 14, armorW: 10, armorH: 9, headX: 15, headY: 4, capeX: 7, capeY: 14, relicX: 5, relicY: 8, runeX: 26, runeY: 22, bobAmp: 1.0, weaponScale: 0.98 },
  ghost: { handX: 23, handY: 17, gripMode: 'floating', armorX: 11, armorY: 14, armorW: 9, armorH: 8, headX: 15, headY: 4, capeX: 7, capeY: 14, relicX: 5, relicY: 8, runeX: 26, runeY: 22, bobAmp: 1.5, weaponScale: 0.9 },
  fish: { handX: 23, handY: 17, gripMode: 'floating', armorX: 10, armorY: 14, armorW: 10, armorH: 7, headX: 14, headY: 7, capeX: 18, capeY: 14, relicX: 5, relicY: 9, runeX: 26, runeY: 21, bobAmp: 1.3, weaponScale: 0.88 },
  object: { handX: 23, handY: 18, gripMode: 'floating', armorX: 10, armorY: 13, armorW: 12, armorH: 9, headX: 15, headY: 5, capeX: 7, capeY: 13, relicX: 5, relicY: 8, runeX: 26, runeY: 21, bobAmp: 1.1, weaponScale: 0.92 },
  spider: { handX: 22, handY: 18, gripMode: 'forward', armorX: 11, armorY: 16, armorW: 10, armorH: 6, headX: 15, headY: 9, capeX: 8, capeY: 16, relicX: 5, relicY: 10, runeX: 26, runeY: 10, bobAmp: 0.9, weaponScale: 0.86 },
  frog: { handX: 22, handY: 19, gripMode: 'side', armorX: 10, armorY: 16, armorW: 11, armorH: 6, headX: 15, headY: 8, capeX: 7, capeY: 16, relicX: 5, relicY: 10, runeX: 26, runeY: 11, bobAmp: 1.0, weaponScale: 0.86 },
  biped: { handX: 23, handY: 17, gripMode: 'raised', armorX: 10, armorY: 13, armorW: 11, armorH: 9, headX: 15, headY: 4, capeX: 7, capeY: 14, relicX: 5, relicY: 8, runeX: 26, runeY: 22, bobAmp: 1.0, weaponScale: 0.96 },
};

function buildSpeciesRig(speciesKey: string): SpeciesEquipRig {
  const recipe = MONSTER_SPRITE_RECIPES[speciesKey];
  const base =
    recipe && ARCHETYPE_BASE_RIGS[recipe.body]
      ? ARCHETYPE_BASE_RIGS[recipe.body]!
      : ARCHETYPE_BASE_RIGS.humanoid!;
  const ov = EXPLICIT_SPECIES_RIGS[speciesKey];
  const rig: SpeciesEquipRig = {
    speciesKey,
    ...base,
    ...ov,
  };

  // Adjust crown/weapon clearance based on bespoke monster parts (horns, antlers, halo, triple head)
  if (!ov && recipe) {
    if (recipe.part1 === 'antlers' || recipe.part1 === 'bull_horns' || recipe.part1 === 'crown') {
      rig.headY = Math.max(2, rig.headY - 2);
    }
    if (recipe.part1 === 'triple_head') {
      rig.headY = Math.max(2, rig.headY - 1);
      rig.relicX = Math.max(3, rig.relicX - 1);
    }
    if (recipe.part1 === 'wings' || recipe.part2 === 'wings') {
      rig.runeY = Math.min(25, rig.runeY + 2);
    }
  }
  return rig;
}

export const SPECIES_EQUIP_RIGS: Record<string, SpeciesEquipRig> = Object.fromEntries([
  ['hero', buildSpeciesRig('hero')],
  ...MONSTER_LIST.map((sp) => [sp.id, buildSpeciesRig(sp.id)]),
]);

export function resolveSpeciesEquipRig(speciesKey: string): SpeciesEquipRig {
  return SPECIES_EQUIP_RIGS[speciesKey] ?? buildSpeciesRig(speciesKey);
}

// ===== PIXEL RENDERERS FOR HERO & ALL 150 MONSTERS =====

export function drawWeaponAt(
  g: PixelGrid,
  weapon: WeaponAppearance,
  hx: number,
  hy: number,
  mode: SpeciesEquipRig['gripMode'],
  phase: number,
  scale = 1,
): void {
  const sy = Math.round(Math.sin(phase) * 1.3);
  const y0 = hy + sy;
  const dirX = mode === 'forward' ? -1 : 1;
  const reach = Math.round(8 * scale);

  switch (weapon.kind) {
    case 'staff':
    case 'scepter': {
      const tipX = Math.max(1, Math.min(30, hx + dirX * 2));
      const topY = Math.max(2, y0 - Math.round(11 * scale));
      g.line(hx, Math.min(29, y0 + 5), tipX, topY, weapon.hilt, 1);
      g.ellipse(tipX, topY, 2.2, 2.2, weapon.blade, weapon.hilt, weapon.edge);
      g.px(tipX, topY, weapon.glow);
      if (weapon.kind === 'scepter') {
        g.px(tipX - 2, topY, weapon.edge);
        g.px(tipX + 2, topY, weapon.edge);
      }
      break;
    }
    case 'axe': {
      const tipX = Math.max(2, Math.min(29, hx + dirX * Math.round(5 * scale)));
      const tipY = Math.max(3, y0 - reach);
      g.line(hx, Math.min(28, y0 + 3), tipX, tipY, weapon.hilt, 1);
      g.rect(tipX - 2, tipY, 5, 4, weapon.blade);
      g.line(tipX + (dirX > 0 ? 2 : -2), tipY - 1, tipX + (dirX > 0 ? 3 : -3), tipY + 4, weapon.edge, 1);
      break;
    }
    case 'scythe': {
      const topX = Math.max(2, Math.min(29, hx + dirX * 3));
      const topY = Math.max(2, y0 - Math.round(11 * scale));
      g.line(hx, Math.min(29, y0 + 4), topX, topY, weapon.hilt, 2);
      g.line(topX, topY, topX - dirX * 7, topY + 2, weapon.blade, 2);
      g.line(topX - dirX * 7, topY + 2, topX - dirX * 9, topY + 5, weapon.edge, 1);
      break;
    }
    case 'lance': {
      const tipX = Math.max(1, Math.min(30, hx + dirX * Math.round(7 * scale)));
      const tipY = Math.max(1, y0 - Math.round(12 * scale));
      g.line(hx - dirX, Math.min(29, y0 + 4), tipX, tipY, weapon.hilt, 1);
      g.line(hx + dirX * 2, y0 - 4, tipX, tipY, weapon.blade, 2);
      g.px(tipX, tipY, weapon.edge);
      g.rect(hx - 1, y0 - 1, 3, 2, weapon.glow);
      break;
    }
    case 'dagger':
    case 'twinblade': {
      const tipX = Math.max(2, Math.min(29, hx + dirX * Math.round(4 * scale)));
      const tipY = Math.max(4, y0 - Math.round(6 * scale));
      g.line(hx, y0, tipX, tipY, weapon.blade, 1);
      g.px(tipX, tipY, weapon.edge);
      g.rect(hx - 1, y0, 3, 1, weapon.hilt);
      if (weapon.kind === 'twinblade') {
        g.line(hx, y0 + 2, hx - dirX * 3, Math.min(28, y0 + 6), weapon.edge, 1);
      }
      break;
    }
    case 'greatsword': {
      const tipX = Math.max(2, Math.min(29, hx + dirX * Math.round(6 * scale)));
      const tipY = Math.max(2, y0 - Math.round(11 * scale));
      g.line(hx, y0, tipX, tipY, weapon.blade, 2);
      g.line(hx, y0 - 1, tipX - dirX, tipY + 1, weapon.edge, 1);
      g.rect(hx - 2, y0, 5, 2, weapon.hilt);
      g.rect(hx - 1, y0 + 2, 2, 3, weapon.hilt);
      break;
    }
    case 'sword':
    default: {
      const tipX = Math.max(2, Math.min(29, hx + dirX * Math.round(5 * scale)));
      const tipY = Math.max(3, y0 - Math.round(9 * scale));
      g.line(hx, y0, tipX, tipY, weapon.blade, 2);
      g.line(hx, y0 - 1, tipX - dirX, tipY + 1, weapon.edge, 1);
      g.rect(hx - 2, y0 - 1, 4, 2, weapon.hilt);
      g.rect(hx - 1, y0 + 1, 2, 3, '#6e4024');
      break;
    }
  }

  if (Math.cos(phase) > 0.25) {
    g.px(hx + dirX * 4, Math.max(2, y0 - reach), weapon.glow);
  }
}

function drawArmorOverlay(
  g: PixelGrid,
  armor: ArmorAppearance,
  rig: SpeciesEquipRig,
  bob: number,
): void {
  const ax = Math.round(rig.armorX);
  const ay = Math.round(rig.armorY + bob);
  const aw = Math.max(6, Math.round(rig.armorW));
  const ah = Math.max(4, Math.round(rig.armorH));

  // Mantle / Cloak shoulder drape
  if (armor.kind === 'cloak' || armor.kind === 'robe') {
    g.rect(Math.max(2, ax - 2), ay, 3, Math.min(9, ah + 1), armor.cape);
    g.rect(Math.min(28, ax + aw - 1), ay, 3, Math.min(9, ah + 1), armor.capeShade);
  }

  // Chestplate / Carapace / Tunic band across torso (respects eyes above armorY)
  const plateTop = ay + 1;
  const plateH = Math.max(3, Math.min(5, ah - 1));
  g.rect(ax + 1, plateTop, Math.max(4, aw - 2), plateH, armor.main);
  g.rect(ax + 1, plateTop, Math.max(2, Math.floor(aw * 0.45)), Math.max(1, plateH - 2), armor.light);
  g.rect(ax + 1, plateTop + plateH - 1, Math.max(4, aw - 2), 1, armor.trim);

  if (armor.pauldron) {
    g.rect(Math.max(2, ax - 1), ay, 3, 3, armor.light);
    g.rect(Math.min(27, ax + aw - 2), ay, 3, 3, armor.shade);
  }

  if (armor.kind === 'carapace') {
    g.px(ax, ay - 1, armor.trim);
    g.px(ax + aw - 1, ay - 1, armor.trim);
  }
}

function drawRelicOrCrown(
  g: PixelGrid,
  relic: RelicAppearance,
  rig: SpeciesEquipRig,
  phase: number,
  bob: number,
): void {
  if (relic.kind === 'crown') {
    const cx = Math.round(rig.headX - 3);
    const cy = Math.max(1, Math.round(rig.headY + bob - 2));
    g.rect(cx, cy + 1, 7, 2, relic.primary);
    g.px(cx, cy, relic.highlight);
    g.px(cx + 3, cy - 1, relic.highlight);
    g.px(cx + 6, cy, relic.highlight);
    g.px(cx + 3, cy + 1, relic.gem);
    return;
  }

  if (relic.kind === 'halo') {
    const cx = Math.round(rig.headX - 4);
    const cy = Math.max(1, Math.round(rig.headY + bob - 2 + Math.sin(phase) * 0.6));
    g.rect(cx, cy, 9, 2, relic.primary);
    g.px(cx + 4, cy, relic.highlight);
    g.px(cx + 2, cy, relic.gem);
    return;
  }

  const ry = Math.round(rig.relicY + Math.sin(phase + 1.1) * 1.6);
  const rx = rig.relicX;
  g.ellipse(rx, ry, 2.2, 2.2, relic.primary, '#1d1626', relic.highlight);
  g.px(rx, ry, relic.gem);
  if (relic.kind === 'hourglass' || relic.kind === 'compass') {
    g.px(rx, ry - 2, relic.highlight);
    g.px(rx, ry + 2, relic.highlight);
  }
}

function drawOrbitRune(
  g: PixelGrid,
  rune: RuneAppearance,
  rig: SpeciesEquipRig,
  phase: number,
): void {
  const rx = Math.max(2, Math.min(29, Math.round(rig.runeX + Math.cos(phase) * 1.4)));
  const ry = Math.max(2, Math.min(29, Math.round(rig.runeY + Math.sin(phase * 1.5) * 2)));
  g.px(rx, ry - 1, rune.glow);
  g.px(rx - 1, ry, rune.core);
  g.px(rx, ry, '#ffffff');
  g.px(rx + 1, ry, rune.core);
  g.px(rx, ry + 1, rune.glow);
}

export function applyEquipmentVisualsToMonster(
  g: PixelGrid,
  speciesKey: string,
  phase: number,
  appearance: ResolvedEquipAppearance,
): void {
  const rig = resolveSpeciesEquipRig(speciesKey);
  const bob = Math.round(Math.sin(phase) * rig.bobAmp);

  // Active 4-piece Set Aura rim points
  if (appearance.setAuraColor) {
    const col = appearance.setAuraColor;
    for (let i = 0; i < 4; i += 1) {
      const ang = phase + (i * Math.PI) / 2;
      const sx = Math.max(1, Math.min(30, Math.round(15.5 + Math.cos(ang) * 12)));
      const sy = Math.max(2, Math.min(29, Math.round(16 + Math.sin(ang) * 10)));
      g.px(sx, sy, col);
    }
  }

  if (appearance.armor) {
    drawArmorOverlay(g, appearance.armor, rig, bob);
  }
  if (appearance.weapon) {
    drawWeaponAt(g, appearance.weapon, rig.handX, rig.handY + bob, rig.gripMode, phase, rig.weaponScale);
  }
  if (appearance.relic) {
    drawRelicOrCrown(g, appearance.relic, rig, phase, bob);
  }
  if (appearance.rune) {
    drawOrbitRune(g, appearance.rune, rig, phase);
  }
  if (appearance.maxEnhance >= 4) {
    const glint = appearance.maxEnhance >= 8 ? '#7ce8ff' : '#ffe875';
    const gx = Math.round(15 + Math.cos(phase * 1.3) * 10);
    const gy = Math.round(8 + Math.sin(phase * 1.3) * 3);
    g.px(gx, gy, glint);
  }

  g.outline('#171421');
}

export function applyHeroExtraAccessories(
  g: PixelGrid,
  phase: number,
  appearance: ResolvedEquipAppearance,
): void {
  const rig = resolveSpeciesEquipRig('hero');
  const breath = Math.round(Math.sin(phase) * rig.bobAmp);
  if (appearance.setAuraColor) {
    for (let i = 0; i < 4; i += 1) {
      const ang = phase + (i * Math.PI) / 2;
      g.px(
        Math.max(1, Math.min(30, Math.round(15.5 + Math.cos(ang) * 12))),
        Math.max(2, Math.min(29, Math.round(16 + Math.sin(ang) * 10))),
        appearance.setAuraColor,
      );
    }
  }
  if (appearance.relic) {
    drawRelicOrCrown(g, appearance.relic, rig, phase, breath);
  }
  if (appearance.rune) {
    drawOrbitRune(g, appearance.rune, rig, phase);
  }
  if (appearance.maxEnhance >= 4) {
    const glint = appearance.maxEnhance >= 8 ? '#7ce8ff' : '#ffe875';
    g.px(Math.round(23 + Math.cos(phase) * 3), Math.max(2, 6 + breath), glint);
  }
}
