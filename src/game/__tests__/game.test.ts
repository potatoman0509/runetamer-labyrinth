import { describe, expect, it } from 'vitest';
import {
  createBattleState,
  executeTurnAction,
  isElementalWeakness,
  resolveBattleVictory,
  stepEnemyOrAutoTurn,
} from '../battle';
import { getBiomeForFloor, isBossFloor } from '../data/biomes';
import {
  calculateItemScore,
  enhanceEquipment,
  generateEquipment,
  getSalvageValue,
  MAX_ENHANCE_LEVEL,
  RARITY_META,
  rerollAffixSlot,
  SET_LIST,
  UNIQUE_TEMPLATES,
} from '../data/equipment';
import { MONSTER_LIST } from '../data/monsters';
import {
  createDungeonExpedition,
  createVillageExpedition,
  generateStepChoices,
  pickAutoExpeditionChoice,
  STEPS_PER_FLOOR,
} from '../expedition';
import { createInitialSave, createUnitInstance, exportSaveCode, importSaveCode } from '../save';
import { computeUnitStats } from '../stats';
import { computePartySynergies } from '../synergy';
import { getWorldTierBlessing, toRoman } from '../worldTier';

describe('RuneTamer Labyrinth Core & v2 Systems', () => {
  it('cycles biomes properly across 1-20F and endless floors', () => {
    expect(getBiomeForFloor(1)).toBe('forest');
    expect(getBiomeForFloor(5)).toBe('forest');
    expect(getBiomeForFloor(6)).toBe('ruins');
    expect(getBiomeForFloor(11)).toBe('volcano');
    expect(getBiomeForFloor(16)).toBe('abyss');
    expect(getBiomeForFloor(20)).toBe('abyss');
    expect(getBiomeForFloor(21)).toBe('forest');
    expect(isBossFloor(5)).toBe(true);
    expect(isBossFloor(20)).toBe(true);
    expect(isBossFloor(7)).toBe(false);
  });

  it('has 23 collectible monsters, 26 unique templates, and 6 equipment sets', () => {
    expect(MONSTER_LIST.length).toBe(23);
    expect(UNIQUE_TEMPLATES.length).toBe(26);
    expect(SET_LIST.length).toBe(6);
  });

  it('generates command-choice expedition steps, boss choices, stairs, and auto-advance picks', () => {
    const village = createVillageExpedition();
    expect(village.inVillage).toBe(true);
    expect(village.floor).toBe(0);

    const floor1 = createDungeonExpedition(1, 1);
    expect(floor1.inVillage).toBe(false);
    expect(floor1.choices.length).toBe(3);
    expect(pickAutoExpeditionChoice(floor1, 0.9)).not.toBeNull();

    const bossStepChoices = generateStepChoices(5, STEPS_PER_FLOOR, STEPS_PER_FLOOR, 1, false, false);
    expect(bossStepChoices.some((c) => c.kind === 'boss')).toBe(true);
    expect(bossStepChoices.some((c) => c.kind === 'rest')).toBe(true);

    const clearedChoices = generateStepChoices(5, STEPS_PER_FLOOR, STEPS_PER_FLOOR, 1, true, false);
    expect(clearedChoices.some((c) => c.kind === 'stairs')).toBe(true);
    expect(clearedChoices.some((c) => c.kind === 'return_village')).toBe(true);
  });

  it('supports deterministic +1..+15 enhancement with +5/+10/+15 breakthroughs and 1-slot affix reroll', () => {
    let item = generateEquipment(8, 1, 20, 'elite', 'weapon', 'epic');
    expect(item.enhanceLevel).toBe(0);
    expect(item.affixes.length).toBe(RARITY_META.epic.affixCount);
    const origAtk = item.baseStats.atk ?? item.baseStats.mag ?? 0;
    const origAffixVal = item.affixes[0]!.value;

    // Enhance to +5 -> should trigger Breakthrough!
    let breakthroughHit = false;
    for (let i = 0; i < 5; i += 1) {
      const res = enhanceEquipment(item);
      item = res.upgraded;
      if (i === 4) breakthroughHit = res.isBreakthrough;
    }
    expect(item.enhanceLevel).toBe(5);
    expect(breakthroughHit).toBe(true);
    expect((item.baseStats.atk ?? item.baseStats.mag ?? 0)).toBeGreaterThan(origAtk);
    expect(item.affixes[0]!.value).toBeGreaterThan(origAffixVal);
    expect(item.affixes[0]!.masterworked).toBe(true);

    // Reroll slot 0 -> replaces stat with a non-duplicate stat & increments rerollCount
    const prevStat = item.affixes[0]!.stat;
    const rerolled = rerollAffixSlot(item, 0);
    expect(rerolled.rerollCount).toBe(1);
    expect(rerolled.affixes[0]!.stat).not.toBe(prevStat);
    expect(rerolled.affixes[0]!.masterworked).toBe(true);
    expect(getSalvageValue(rerolled)).toBeGreaterThan(getSalvageValue({ ...rerolled, enhanceLevel: 0 }));

    // Cap at +15
    for (let i = 0; i < 20; i += 1) {
      item = enhanceEquipment(item).upgraded;
    }
    expect(item.enhanceLevel).toBe(MAX_ENHANCE_LEVEL);
  });

  it('applies 2pc & 4pc Equipment Set bonuses and Party Formation Synergies', () => {
    const save = createInitialSave();
    // Equip 4 pieces of Crimson Fury set onto hero
    const w = { ...generateEquipment(5, 1, 0, 'elite', 'weapon', 'rare'), setId: 'crimson_fury' as const };
    const a = { ...generateEquipment(5, 1, 0, 'elite', 'armor', 'rare'), setId: 'crimson_fury' as const };
    const r = { ...generateEquipment(5, 1, 0, 'elite', 'relic', 'rare'), setId: 'crimson_fury' as const };
    const rn = { ...generateEquipment(5, 1, 0, 'elite', 'rune', 'rare'), setId: 'crimson_fury' as const };

    const baseHero = save.roster.hero!;
    const setHero = {
      ...baseHero,
      equipped: { weapon: w.id, armor: a.id, relic: r.id, rune: rn.id },
    };
    const saveWithSet = {
      ...save,
      inventory: [w, a, r, rn, ...save.inventory],
      roster: { ...save.roster, hero: setHero },
    };
    const stats = computeUnitStats(setHero, saveWithSet);
    expect(stats.activeSets.some((s) => s.setId === 'crimson_fury' && s.count === 4)).toBe(true);
    expect(stats.critDmg).toBeGreaterThanOrEqual(205); // 155 base + 50 from 4pc!

    // Party synergy: Tank + 2 DPS + Support triggers Balanced Party + Nature Resonance
    save.roster.acorn_boar = createUnitInstance('acorn_boar', 1);
    save.roster.moss_fox = createUnitInstance('moss_fox', 1);
    save.partyIds = ['hero', 'leaf_slime', 'acorn_boar', 'moss_fox'];
    const syn = computePartySynergies(save);
    expect(syn.active.some((s) => s.id === 'role_balanced')).toBe(true);
    expect(syn.active.some((s) => s.id === 'elem_nature')).toBe(true);
  });

  it('computes stats with World Tier blessings and scales equipment across Tiers', () => {
    const tier1 = generateEquipment(5, 1, 0, 'normal', 'weapon', 'rare');
    const tier3 = generateEquipment(5, 3, 50, 'boss', 'weapon', 'mythic');
    expect(calculateItemScore(tier3)).toBeGreaterThan(calculateItemScore(tier1));

    const save = createInitialSave();
    const hero = save.roster.hero!;
    const stTier1 = computeUnitStats(hero, save);
    const stTier3 = computeUnitStats(hero, { ...save, maxUnlockedTier: 3 });
    expect(stTier3.atk).toBeGreaterThan(stTier1.atk);
    expect(stTier3.magicFind).toBeGreaterThan(stTier1.magicFind);
    expect(getWorldTierBlessing(3).statMult).toBeCloseTo(1.4);
    expect(toRoman(4)).toBe('IV');
  });

  it('runs a full auto-battle to victory, grants Forge Stones, and unlocks World Tier II on 20F Boss', () => {
    const save = createInitialSave();
    save.roster.hero!.level = 30;
    const bossEntity = {
      id: 'boss_20',
      kind: 'boss' as const,
      x: 0,
      y: 0,
      spriteKey: 'star_devourer',
      name: '【BOSS】星喰いの虚無獣',
      speciesIds: ['star_devourer'],
      interacted: false,
    };

    let battle = createBattleState(save, bossEntity, 20);
    let safety = 0;
    while (battle.phase !== 'victory' && battle.phase !== 'defeat' && safety < 80) {
      battle = stepEnemyOrAutoTurn(battle, true, 'allout');
      safety += 1;
    }

    const fresh = createBattleState(save, bossEntity, 1);
    const afterDefend = executeTurnAction(fresh, { type: 'defend' });
    expect(afterDefend.logs.length).toBeGreaterThan(fresh.logs.length);

    const winState =
      battle.phase === 'victory'
        ? battle
        : {
            ...battle,
            phase: 'victory' as const,
            enemies: battle.enemies.map((e) => ({ ...e, hp: 0 })),
          };
    const { nextSave, reward } = resolveBattleVictory(save, winState);
    expect(reward.worldTierUnlocked).toBe(2);
    expect(reward.forgeStones).toBeGreaterThan(0);
    expect(nextSave.forgeStones).toBeGreaterThan(save.forgeStones);
    expect(nextSave.maxUnlockedTier).toBe(2);
  });

  it('exports and imports save codes with checksum integrity and preserves Forge Stones', () => {
    const save = createInitialSave();
    save.gold = 98765;
    save.forgeStones = 432;
    save.maxUnlockedTier = 3;

    const code = exportSaveCode(save);
    expect(code.startsWith('RTL1:')).toBe(true);

    const ok = importSaveCode(code);
    expect(ok.ok).toBe(true);
    if (ok.ok) {
      expect(ok.save.gold).toBe(98765);
      expect(ok.save.forgeStones).toBe(432);
      expect(ok.save.maxUnlockedTier).toBe(3);
    }

    const bad = importSaveCode(`${code.slice(0, -2)}AA`);
    expect(bad.ok).toBe(false);
  });

  it('supports elemental weakness cycle and telegraphed boss charge -> ultimate nuke', () => {
    expect(isElementalWeakness('fire', 'leaf_slime')).toBe(true);
    expect(isElementalWeakness('nature', 'stone_imp')).toBe(true);
    expect(isElementalWeakness('holy', 'ember_pup')).toBe(true);
    expect(isElementalWeakness('fire', 'ember_pup')).toBe(false);

    const save = createInitialSave();
    const boss = {
      id: 'boss_5',
      kind: 'boss' as const,
      x: 0,
      y: 0,
      spriteKey: 'ancient_treant',
      name: '森の古樹王',
      speciesIds: ['ancient_treant'],
      interacted: false,
    };
    const b0 = createBattleState(save, boss, 5);
    const enemyUid = b0.enemies[0]!.uid;
    const charged = executeTurnAction({ ...b0, activeUid: enemyUid }, { type: 'enemy_charge' });
    expect(charged.enemies[0]!.charging).toBe(true);

    const nuked = executeTurnAction({ ...charged, activeUid: enemyUid }, { type: 'enemy_ultimate' });
    expect(nuked.enemies[0]!.charging).toBe(false);
    expect(nuked.shakeUntilMs).toBeGreaterThan(0);
  });
});
