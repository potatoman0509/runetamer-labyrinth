import { describe, expect, it } from 'vitest';
import { ACHIEVEMENTS, getClaimedAchievementBonuses, getUnclaimedAchievements } from '../achievements';
import {
  createBattleState,
  executeTurnAction,
  isElementalWeakness,
  resolveBattleVictory,
  stepEnemyOrAutoTurn,
} from '../battle';
import { BOSS_RUSH_WAVES, createBossRushEntity } from '../bossRush';
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
import {
  createInitialSave,
  createUnitInstance,
  deleteSaveSlot,
  exportSaveCode,
  exportSaveJson,
  getSlotStorageKey,
  importSaveCode,
  importSaveJson,
  listSaveSlotSummaries,
  loadGameFromSlot,
  SAVE_STORAGE_KEY,
  saveGameToSlot,
} from '../save';
import {
  canUpgradeSkillNode,
  getAvailableSp,
  getHeroEquippedSkills,
  getUnlockedHeroSkillIds,
  SKILL_TREE_NODES,
} from '../skillTree';
import { canEvolveMonster, computeUnitStats, getEvolutionRequirement } from '../stats';
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

  it('supports Hero Skill Tree SP, prerequisites, active skill unlocks, and ally-wide Tamer Bond bonus', () => {
    expect(SKILL_TREE_NODES.length).toBe(15);
    const save = createInitialSave();
    save.roster.hero!.level = 10;
    expect(getAvailableSp(save)).toBe(10);

    // Prerequisite check: sw_crit requires sw_atk
    expect(canUpgradeSkillNode(save, 'sw_atk')).toBe(true);
    expect(canUpgradeSkillNode(save, 'sw_crit')).toBe(false);

    const baseHeroAtk = computeUnitStats(save.roster.hero!, save).atk;
    const baseSlimeAtk = computeUnitStats(save.roster.leaf_slime!, save).atk;

    const treeSave = {
      ...save,
      heroSkillTree: {
        sw_atk: 2,
        sw_crit: 1,
        sw_flurry: 1,
        cm_def: 1,
        cm_bond: 2,
      },
      heroEquippedSkillIds: ['meteor_flurry', 'star_slash'] as [string, string],
    };

    expect(getUnlockedHeroSkillIds(treeSave)).toContain('meteor_flurry');
    const [sk0] = getHeroEquippedSkills(treeSave);
    expect(sk0.id).toBe('meteor_flurry');
    expect(computeUnitStats(treeSave.roster.hero!, treeSave).atk).toBeGreaterThan(baseHeroAtk);
    // Tamer Bond boosts monster allies!
    expect(computeUnitStats(treeSave.roster.leaf_slime!, treeSave).atk).toBeGreaterThan(baseSlimeAtk);
  });

  it('supports swift free-action HP/MP potions and 100% Limit Break breaking enemy Charge', () => {
    const save = createInitialSave();
    const boss = createBossRushEntity(1);
    const b0 = createBattleState(save, boss, 6, {
      hpPotions: 3,
      mpPotions: 2,
      initialLimitGauge: 100,
    });
    const activeBefore = b0.activeUid;
    // Damage & poison ally, drain MP, set enemy charging
    const hurtState = {
      ...b0,
      allies: b0.allies.map((a) => ({
        ...a,
        hp: Math.max(1, Math.floor(a.maxHp * 0.3)),
        mp: 0,
        poisonTurns: 2,
      })),
      enemies: b0.enemies.map((e, i) => (i === 0 ? { ...e, charging: true } : e)),
    };

    // Use HP potion -> heals & cleanses poison without consuming turn
    const afterHpPot = executeTurnAction(hurtState, { type: 'use_hp_potion' });
    expect(afterHpPot.hpPotions).toBe(2);
    expect(afterHpPot.activeUid).toBe(activeBefore);
    expect(afterHpPot.allies[0]!.hp).toBeGreaterThan(hurtState.allies[0]!.hp);
    expect(afterHpPot.allies[0]!.poisonTurns).toBe(0);

    // Use MP potion -> restores MP without consuming turn
    const afterMpPot = executeTurnAction(afterHpPot, { type: 'use_mp_potion' });
    expect(afterMpPot.mpPotions).toBe(1);
    expect(afterMpPot.activeUid).toBe(activeBefore);
    expect(afterMpPot.allies[0]!.mp).toBeGreaterThan(0);

    // Trigger Limit Break -> consumes 100% gauge, breaks enemy charging, damages enemies (including boss shield), shields allies!
    const afterLimit = executeTurnAction(afterMpPot, { type: 'limit_break' });
    expect(afterLimit.limitGauge).toBe(0);
    expect(afterLimit.enemies[0]!.charging).toBe(false);
    expect(afterLimit.enemies[0]!.hp + afterLimit.enemies[0]!.shield).toBeLessThan(
      afterMpPot.enemies[0]!.hp + afterMpPot.enemies[0]!.shield,
    );
    expect(afterLimit.enemies[1]!.hp).toBeLessThan(afterMpPot.enemies[1]!.hp);
    expect(afterLimit.allies[0]!.shield).toBeGreaterThan(0);
  });

  it('supports Monster Extreme Evolution requirements, discount, and +35% stat / +25% skill power boost', () => {
    const save = createInitialSave();
    const slime = save.roster.leaf_slime!;
    expect(canEvolveMonster(slime, 50)).toBe(false); // Lv1 < Lv10

    const lv10Slime = { ...slime, level: 10, awakening: 0 };
    expect(getEvolutionRequirement(lv10Slime).stoneCost).toBe(35);
    expect(canEvolveMonster(lv10Slime, 34)).toBe(false);
    expect(canEvolveMonster(lv10Slime, 35)).toBe(true);

    const awakenedSlime = { ...lv10Slime, awakening: 2 };
    expect(getEvolutionRequirement(awakenedSlime).stoneCost).toBe(15);
    expect(canEvolveMonster(awakenedSlime, 15)).toBe(true);

    const baseStats = computeUnitStats(lv10Slime, { ...save, roster: { ...save.roster, leaf_slime: lv10Slime } });
    const evoSlime = { ...lv10Slime, evolved: true };
    const evoStats = computeUnitStats(evoSlime, { ...save, roster: { ...save.roster, leaf_slime: evoSlime } });
    expect(evoStats.maxHp).toBeGreaterThan(Math.round(baseStats.maxHp * 1.25));
    expect(evoStats.skillPowerBonusPct).toBe(baseStats.skillPowerBonusPct + 25);
  });

  it('guarantees a Mythic drop and records clear stats on Boss Rush Arena Wave 5 victory', () => {
    expect(BOSS_RUSH_WAVES.length).toBe(5);
    const save = createInitialSave();
    const wave5 = createBossRushEntity(5);
    const b0 = createBattleState(save, wave5, 25, { bossRushWave: 5 });
    const winState = {
      ...b0,
      phase: 'victory' as const,
      enemies: b0.enemies.map((e) => ({ ...e, hp: 0 })),
    };
    const { nextSave, reward } = resolveBattleVictory(save, winState);
    expect(reward.items.some((i) => i.rarity === 'mythic')).toBe(true);
    expect(nextSave.bossRushBestWave).toBe(5);
    expect(nextSave.stats.bossRushClears).toBe(1);
    expect(reward.forgeStones).toBeGreaterThanOrEqual(60);
  });

  it('tracks 18 Achievements and applies permanent stat, MF, and bonus SP rewards when claimed', () => {
    expect(ACHIEVEMENTS.length).toBe(18);
    const save = createInitialSave();
    save.stats.totalKills = 20;
    const unclaimed = getUnclaimedAchievements(save);
    expect(unclaimed.some((a) => a.id === 'kill_15')).toBe(true);

    const baseSp = getAvailableSp(save);
    const baseAtk = computeUnitStats(save.roster.hero!, save).atk;

    const claimedSave = {
      ...save,
      claimedAchievements: ['kill_15', 'rush_5'],
    };
    const bonuses = getClaimedAchievementBonuses(claimedSave);
    expect(bonuses.statPct).toBe(10); // 2 + 8
    expect(bonuses.mfBonus).toBe(23); // 3 + 20
    expect(bonuses.bonusSp).toBe(3); // 1 + 2
    expect(getAvailableSp(claimedSave)).toBe(baseSp + 3);
    expect(computeUnitStats(claimedSave.roster.hero!, claimedSave).atk).toBeGreaterThan(baseAtk);
  });

  it('supports 3-slot Adventure Book storage with Slot 1 legacy compatibility and JSON file export/import', () => {
    expect(getSlotStorageKey(1)).toBe(SAVE_STORAGE_KEY);
    expect(getSlotStorageKey(2)).not.toBe(SAVE_STORAGE_KEY);
    expect(getSlotStorageKey(3)).not.toBe(getSlotStorageKey(2));

    // In-memory localStorage shim for Node Vitest runner
    const store = new Map<string, string>();
    const prevStorage = globalThis.localStorage;
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => {
          store.set(k, v);
        },
        removeItem: (k: string) => {
          store.delete(k);
        },
      },
    });

    try {
      const s1 = createInitialSave();
      s1.gold = 1111;
      s1.roster.hero!.level = 7;
      saveGameToSlot(1, s1);

      const s2 = createInitialSave();
      s2.gold = 2222;
      s2.roster.hero!.level = 15;
      s2.worldTier = 2;
      saveGameToSlot(2, s2);

      const summaries = listSaveSlotSummaries();
      expect(summaries.length).toBe(3);
      expect(summaries[0]!.exists).toBe(true);
      expect(summaries[0]!.heroLevel).toBe(7);
      expect(summaries[1]!.exists).toBe(true);
      expect(summaries[1]!.heroLevel).toBe(15);
      expect(summaries[2]!.exists).toBe(false);

      expect(loadGameFromSlot(1)?.gold).toBe(1111);
      expect(loadGameFromSlot(2)?.gold).toBe(2222);

      deleteSaveSlot(2);
      expect(loadGameFromSlot(2)).toBeNull();

      // JSON file export/import with checksum validation + RTL1 fallback
      const jsonText = exportSaveJson(s2);
      const okJson = importSaveJson(jsonText);
      expect(okJson.ok).toBe(true);
      if (okJson.ok) {
        expect(okJson.save.gold).toBe(2222);
        expect(okJson.save.worldTier).toBe(2);
      }

      const tampered = jsonText.replace('2222', '9999');
      expect(importSaveJson(tampered).ok).toBe(false);

      const codeFallback = importSaveJson(exportSaveCode(s1));
      expect(codeFallback.ok).toBe(true);
      if (codeFallback.ok) {
        expect(codeFallback.save.gold).toBe(1111);
      }
    } finally {
      Object.defineProperty(globalThis, 'localStorage', {
        configurable: true,
        value: prevStorage,
      });
    }
  });
});
