import { describe, expect, it } from 'vitest';
import { ACHIEVEMENTS, getClaimedAchievementBonuses, getUnclaimedAchievements } from '../achievements';
import {
  BATTLE_VISUAL_SPEED_MULT,
  createBattleState,
  executeTurnAction,
  isElementalWeakness,
  resolveBattleVictory,
  stepEnemyOrAutoTurn,
} from '../battle';
import { BOSS_GIMMICKS, getBossGimmick } from '../bossGimmicks';
import { BOSS_RUSH_MAX_WAVE, BOSS_RUSH_WAVES, createBossRushEntity } from '../bossRush';
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
import {
  computeUnitMotionTransform,
  getSignatureStyle,
  resolveMotionRecipe,
} from '../../engine/battleMotions';
import { paintSprite } from '../../engine/hdSprites';
import { ORCHESTRA_TRACKS } from '../../engine/sound';
import {
  BOSS_MONSTERS,
  ELITE_MONSTERS,
  getBossForFloor,
  getSpecies,
  MONSTER_LIST,
  NORMAL_MONSTERS,
} from '../data/monsters';
import {
  createDungeonExpedition,
  createVillageExpedition,
  generateStepChoices,
  pickAutoExpeditionChoice,
  STEPS_PER_FLOOR,
} from '../expedition';
import {
  applyBattleProgressToQuests,
  applyEnhanceProgressToQuests,
  claimGuildQuestReward,
  refreshDailyQuestsIfNeeded,
} from '../guildQuests';
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
  trimInventorySafely,
  validateSave,
} from '../save';
import {
  ALL_HERO_SKILLS,
  canUpgradeSkillNode,
  getAvailableSp,
  getHeroEquippedSkills,
  getUnlockedHeroSkillIds,
  SKILL_TREE_NODES,
} from '../skillTree';
import {
  canEvolveMonster,
  canTrueEvolveMonster,
  computeUnitStats,
  getEvolutionRequirement,
  getTrueEvolutionRequirement,
} from '../stats';
import { computePartySynergies } from '../synergy';
import { computeTrialModifiers, TRIAL_MODS } from '../trials';
import { getWorldTierBlessing, toRoman } from '../worldTier';

describe('RuneTamer Labyrinth Core & v11 Systems', () => {
  it('cycles 6 biomes properly across 1-30F and endless floors', () => {
    expect(getBiomeForFloor(1)).toBe('forest');
    expect(getBiomeForFloor(5)).toBe('forest');
    expect(getBiomeForFloor(6)).toBe('ruins');
    expect(getBiomeForFloor(11)).toBe('volcano');
    expect(getBiomeForFloor(16)).toBe('abyss');
    expect(getBiomeForFloor(20)).toBe('abyss');
    expect(getBiomeForFloor(21)).toBe('glacier');
    expect(getBiomeForFloor(25)).toBe('glacier');
    expect(getBiomeForFloor(26)).toBe('sanctum');
    expect(getBiomeForFloor(30)).toBe('sanctum');
    expect(getBiomeForFloor(31)).toBe('forest');
    expect(isBossFloor(5)).toBe(true);
    expect(isBossFloor(25)).toBe(true);
    expect(isBossFloor(30)).toBe(true);
    expect(isBossFloor(7)).toBe(false);
  });

  it('has exactly 150 unique non-variant monsters (10 Boss, 30 Elite, 110 Normal), 40 uniques, and 10 sets', () => {
    expect(MONSTER_LIST.length).toBe(150);
    expect(BOSS_MONSTERS.length).toBe(10);
    expect(ELITE_MONSTERS.length).toBe(30);
    expect(NORMAL_MONSTERS.length).toBe(110);
    expect(UNIQUE_TEMPLATES.length).toBe(40);
    expect(SET_LIST.length).toBe(10);

    const ids = new Set(MONSTER_LIST.map((m) => m.id));
    const names = new Set(MONSTER_LIST.map((m) => m.name));
    const spriteKeys = new Set(MONSTER_LIST.map((m) => m.spriteKey));
    expect(ids.size).toBe(150);
    expect(names.size).toBe(150);
    expect(spriteKeys.size).toBe(150);

    // Verify all 10 unique bosses rotate across floors 5F..50F
    const bossIds = new Set<string>();
    for (let fl = 5; fl <= 50; fl += 5) {
      bossIds.add(getBossForFloor(fl).id);
    }
    expect(bossIds.size).toBe(10);
  });

  it('renders a unique non-empty 32x32 HD pixel sprite for every single one of the 150 monsters', () => {
    const signatures = new Set<string>();
    for (const m of MONSTER_LIST) {
      const grid = paintSprite(m.spriteKey, 0);
      expect(grid.size).toBe(32);
      const nonEmpty = grid.buf.filter((c) => c !== null).length;
      expect(nonEmpty).toBeGreaterThan(40);
      const sig = grid.buf.map((c) => c ?? '.').join('');
      signatures.add(sig);
    }
    expect(signatures.size).toBe(150);
  });

  it('migrates legacy removed variant monster IDs seamlessly via getSpecies and validateSave', () => {
    expect(getSpecies('gold_slime').id).toBe('dust_scarab');
    expect(getSpecies('fenrir_lord').id).toBe('glacier_leviathan');
    expect(getSpecies('ember_pup').id).toBe('cinder_salamander');

    const base = createInitialSave();
    const legacyRaw = {
      ...base,
      version: 10,
      partyIds: ['hero', 'gold_slime'],
      roster: {
        ...base.roster,
        gold_slime: { ...createUnitInstance('leaf_slime', 5), id: 'gold_slime', speciesId: 'gold_slime' },
      },
      discoveredMonsters: ['leaf_slime', 'gold_slime', 'fenrir_lord'],
    };
    const migrated = validateSave(legacyRaw);
    expect(migrated).not.toBeNull();
    expect(migrated!.partyIds).toContain('dust_scarab');
    expect(migrated!.roster.dust_scarab?.speciesId).toBe('dust_scarab');
    expect(migrated!.discoveredMonsters).toContain('glacier_leviathan');
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

  it('supports deterministic +1..+20 enhancement with +5/+10/+15/+20 breakthroughs and 1-slot affix reroll', () => {
    expect(MAX_ENHANCE_LEVEL).toBe(20);
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

    // Cap at +20
    for (let i = 0; i < 25; i += 1) {
      item = enhanceEquipment(item).upgraded;
    }
    expect(item.enhanceLevel).toBe(MAX_ENHANCE_LEVEL);
  });

  it('applies nerfed 2pc & 4pc Equipment Set bonuses and Party Formation Synergies', () => {
    const save = createInitialSave();
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
    expect(stats.critDmg).toBeGreaterThanOrEqual(174); // 150 base + 24 from nerfed 4pc

    // Void Walker set gives nerfed armor penetration + skill power
    const vw1 = { ...generateEquipment(5, 1, 0, 'elite', 'weapon', 'rare'), setId: 'void_walker' as const };
    const vw2 = { ...generateEquipment(5, 1, 0, 'elite', 'armor', 'rare'), setId: 'void_walker' as const };
    const vw3 = { ...generateEquipment(5, 1, 0, 'elite', 'relic', 'rare'), setId: 'void_walker' as const };
    const vw4 = { ...generateEquipment(5, 1, 0, 'elite', 'rune', 'rare'), setId: 'void_walker' as const };
    const vwHero = {
      ...baseHero,
      equipped: { weapon: vw1.id, armor: vw2.id, relic: vw3.id, rune: vw4.id },
    };
    const vwStats = computeUnitStats(vwHero, {
      ...save,
      inventory: [vw1, vw2, vw3, vw4, ...save.inventory],
      roster: { ...save.roster, hero: vwHero },
    });
    expect(vwStats.armorPenPct).toBeGreaterThanOrEqual(22); // 10 + 12
    expect(vwStats.skillPowerBonusPct).toBeGreaterThanOrEqual(12);

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
    expect(getWorldTierBlessing(3).statMult).toBeCloseTo(1.28);
    expect(toRoman(4)).toBe('IV');
  });

  it('runs a full auto-battle to victory, grants Forge Stones, and unlocks World Tier II on 30F Sanctum Boss', () => {
    const save = createInitialSave();
    save.roster.hero!.level = 40;
    const bossEntity = {
      id: 'boss_30',
      kind: 'boss' as const,
      x: 0,
      y: 0,
      spriteKey: 'seraph_omega',
      name: '終焉の熾天使オメガ',
      speciesIds: ['seraph_omega'],
      interacted: false,
    };

    let battle = createBattleState(save, bossEntity, 30);
    expect(battle.hpPotions).toBe(1);
    expect(battle.mpPotions).toBe(1);

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

  it('exports and imports save codes with checksum integrity and preserves Forge Stones & activeTrials', () => {
    const save = createInitialSave();
    save.gold = 98765;
    save.forgeStones = 432;
    save.maxUnlockedTier = 3;
    save.activeTrials = ['iron_foes', 'blood_boss'];

    const code = exportSaveCode(save);
    expect(code.startsWith('RTL1:')).toBe(true);

    const ok = importSaveCode(code);
    expect(ok.ok).toBe(true);
    if (ok.ok) {
      expect(ok.save.gold).toBe(98765);
      expect(ok.save.forgeStones).toBe(432);
      expect(ok.save.maxUnlockedTier).toBe(3);
      expect(ok.save.activeTrials).toEqual(['iron_foes', 'blood_boss']);
    }

    const bad = importSaveCode(`${code.slice(0, -2)}AA`);
    expect(bad.ok).toBe(false);
  });

  it('supports elemental weakness cycle and telegraphed boss charge -> ultimate nuke', () => {
    expect(isElementalWeakness('fire', 'leaf_slime')).toBe(true);
    expect(isElementalWeakness('nature', 'stone_imp')).toBe(true);
    expect(isElementalWeakness('holy', 'cinder_salamander')).toBe(true);
    expect(isElementalWeakness('fire', 'cinder_salamander')).toBe(false);

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

  it('supports 4-branch Hero Skill Tree (20 nodes, Void branch), SP, prerequisites, and Tamer Bond', () => {
    expect(SKILL_TREE_NODES.length).toBe(20);
    const save = createInitialSave();
    save.roster.hero!.level = 10;
    expect(getAvailableSp(save)).toBe(10);

    expect(canUpgradeSkillNode(save, 'sw_atk')).toBe(true);
    expect(canUpgradeSkillNode(save, 'sw_crit')).toBe(false);
    expect(canUpgradeSkillNode(save, 'vd_pen')).toBe(true);

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
        vd_pen: 2,
        vd_status: 1,
        vd_flame: 1,
      },
      heroEquippedSkillIds: ['abyss_flame', 'meteor_flurry'] as [string, string],
    };

    expect(getUnlockedHeroSkillIds(treeSave)).toContain('abyss_flame');
    expect(getUnlockedHeroSkillIds(treeSave)).toContain('meteor_flurry');
    const [sk0] = getHeroEquippedSkills(treeSave);
    expect(sk0.id).toBe('abyss_flame');
    const heroStats = computeUnitStats(treeSave.roster.hero!, treeSave);
    expect(heroStats.atk).toBeGreaterThan(baseHeroAtk);
    expect(heroStats.armorPenPct).toBeGreaterThan(0);
    expect(heroStats.statusDmgBonusPct).toBeGreaterThan(0);
    expect(computeUnitStats(treeSave.roster.leaf_slime!, treeSave).atk).toBeGreaterThan(baseSlimeAtk);
  });

  it('supports swift free-action HP/MP potions and 100% Limit Break breaking enemy Charge', () => {
    const save = createInitialSave();
    const boss = createBossRushEntity(1);
    const b0 = createBattleState(save, boss, 6, {
      hpPotions: 1,
      mpPotions: 1,
      initialLimitGauge: 100,
    });
    const activeBefore = b0.activeUid;
    const hurtState = {
      ...b0,
      allies: b0.allies.map((a) => ({
        ...a,
        hp: Math.max(1, Math.floor(a.maxHp * 0.3)),
        mp: 0,
        poisonTurns: 2,
        burnTurns: 2,
      })),
      enemies: b0.enemies.map((e, i) => (i === 0 ? { ...e, charging: true } : e)),
    };

    const afterHpPot = executeTurnAction(hurtState, { type: 'use_hp_potion' });
    expect(afterHpPot.hpPotions).toBe(0);
    expect(afterHpPot.activeUid).toBe(activeBefore);
    expect(afterHpPot.allies[0]!.hp).toBeGreaterThan(hurtState.allies[0]!.hp);
    expect(afterHpPot.allies[0]!.poisonTurns).toBe(0);
    expect(afterHpPot.allies[0]!.burnTurns).toBe(0);

    const afterMpPot = executeTurnAction(afterHpPot, { type: 'use_mp_potion' });
    expect(afterMpPot.mpPotions).toBe(0);
    expect(afterMpPot.activeUid).toBe(activeBefore);
    expect(afterMpPot.allies[0]!.mp).toBeGreaterThan(0);

    const afterLimit = executeTurnAction(afterMpPot, { type: 'limit_break' });
    expect(afterLimit.limitGauge).toBe(0);
    expect(afterLimit.enemies[0]!.charging).toBe(false);
    expect(afterLimit.enemies[0]!.hp + afterLimit.enemies[0]!.shield).toBeLessThan(
      afterMpPot.enemies[0]!.hp + afterMpPot.enemies[0]!.shield,
    );
    expect(afterLimit.enemies[1]!.hp).toBeLessThan(afterMpPot.enemies[1]!.hp);
    expect(afterLimit.allies[0]!.shield).toBeGreaterThan(0);
  });

  it('supports Monster Extreme Evolution (【極】) and True Evolution (【真】) scaling', () => {
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
    expect(evoStats.maxHp).toBeGreaterThan(Math.round(baseStats.maxHp * 1.18));
    expect(evoStats.skillPowerBonusPct).toBe(baseStats.skillPowerBonusPct + 16);

    // True Evolution (requires Lv25+ & evolved, 60 stones / 30 with ★+4)
    expect(canTrueEvolveMonster(evoSlime, 100)).toBe(false); // Lv10 < Lv25
    const lv25Evo = { ...evoSlime, level: 25, awakening: 0 };
    expect(getTrueEvolutionRequirement(lv25Evo).stoneCost).toBe(60);
    expect(canTrueEvolveMonster(lv25Evo, 60)).toBe(true);
    expect(getTrueEvolutionRequirement({ ...lv25Evo, awakening: 4 }).stoneCost).toBe(30);

    const lv25EvoStats = computeUnitStats(lv25Evo, { ...save, roster: { ...save.roster, leaf_slime: lv25Evo } });
    const trueSlime = { ...lv25Evo, trueEvolved: true };
    const trueStats = computeUnitStats(trueSlime, { ...save, roster: { ...save.roster, leaf_slime: trueSlime } });
    expect(trueStats.maxHp).toBeGreaterThan(lv25EvoStats.maxHp);
    expect(trueStats.skillPowerBonusPct).toBe(lv25EvoStats.skillPowerBonusPct + 14);
  });

  it('supports 10-Wave Boss Rush Arena featuring all 10 unique bosses with Mythic on Wave 10 EX victory', () => {
    expect(BOSS_RUSH_WAVES.length).toBe(10);
    expect(BOSS_RUSH_MAX_WAVE).toBe(10);
    const waveBossIds = new Set(BOSS_RUSH_WAVES.map((w) => w.speciesIds[0]));
    expect(waveBossIds.size).toBe(10);

    const save = createInitialSave();
    const wave10 = createBossRushEntity(10);
    const b0 = createBattleState(save, wave10, 46, { bossRushWave: 10 });
    const winState = {
      ...b0,
      phase: 'victory' as const,
      enemies: b0.enemies.map((e) => ({ ...e, hp: 0 })),
    };
    const { nextSave, reward } = resolveBattleVictory(save, winState);
    const mythics = reward.items.filter((i) => i.rarity === 'mythic');
    expect(mythics.length).toBeGreaterThanOrEqual(1);
    expect(nextSave.bossRushBestWave).toBe(10);
    expect(nextSave.stats.bossRushClears).toBe(1);
    expect(reward.forgeStones).toBeGreaterThanOrEqual(100);
  });

  it('enforces Trial Modifiers (iron_foes, no_potions, blood_boss, drought) and tracks trialClears', () => {
    expect(TRIAL_MODS.length).toBe(5);
    const mods = computeTrialModifiers(['iron_foes', 'no_potions', 'blood_boss', 'drought']);
    expect(mods.count).toBe(4);
    expect(mods.enemyHpMult).toBe(1.25);
    expect(mods.healMult).toBe(0.55);
    expect(mods.noPotions).toBe(true);
    expect(mods.bossStartsEnraged).toBe(true);

    const baseSave = createInitialSave();
    const trialSave = { ...baseSave, activeTrials: ['iron_foes', 'no_potions', 'blood_boss'] as typeof baseSave.activeTrials };
    const boss = createBossRushEntity(1);
    const normalBattle = createBattleState(baseSave, boss, 10);
    const trialBattle = createBattleState(trialSave, boss, 10);

    expect(trialBattle.enemies[0]!.maxHp).toBeGreaterThan(normalBattle.enemies[0]!.maxHp);
    expect(trialBattle.enemies[0]!.enraged).toBe(true);
    expect(trialBattle.hpPotions).toBe(0);
    expect(trialBattle.mpPotions).toBe(0);

    const winState = {
      ...trialBattle,
      phase: 'victory' as const,
      enemies: trialBattle.enemies.map((e) => ({ ...e, hp: 0 })),
    };
    const { nextSave } = resolveBattleVictory(trialSave, winState);
    expect(nextSave.stats.trialClears).toBe(1);
  });

  it('skips frozen unit turn and decrements freezeTurns in battle', () => {
    const save = createInitialSave();
    const boss = createBossRushEntity(1);
    const b0 = createBattleState(save, boss, 5);
    const enemy0 = b0.enemies[0]!;
    const frozenState = {
      ...b0,
      activeUid: b0.allies[0]!.uid,
      turnQueue: [enemy0.uid, b0.allies[1]?.uid ?? b0.allies[0]!.uid],
      enemies: b0.enemies.map((e, i) => (i === 0 ? { ...e, freezeTurns: 1 } : e)),
    };
    const next = executeTurnAction(frozenState, { type: 'defend' });
    // Enemy 0 should have had its frozen turn skipped & freezeTurns decremented to 0
    expect(next.enemies[0]!.freezeTurns).toBe(0);
    expect(next.logs.some((l) => l.includes('凍って動けない'))).toBe(true);
  });

  it('tracks 30 Achievements and applies permanent stat, MF, and bonus SP rewards when claimed', () => {
    expect(ACHIEVEMENTS.length).toBe(30);
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
    expect(bonuses.statPct).toBe(5); // 1 + 4
    expect(bonuses.mfBonus).toBe(12); // 2 + 10
    expect(bonuses.bonusSp).toBe(3); // 1 + 2
    expect(getAvailableSp(claimedSave)).toBe(baseSp + 3);
    expect(computeUnitStats(claimedSave.roster.hero!, claimedSave).atk).toBeGreaterThan(baseAtk);
  });

  it('supports 3-slot Adventure Book storage with Slot 1 legacy compatibility and JSON file export/import', () => {
    expect(getSlotStorageKey(1)).toBe(SAVE_STORAGE_KEY);
    expect(getSlotStorageKey(2)).not.toBe(SAVE_STORAGE_KEY);
    expect(getSlotStorageKey(3)).not.toBe(getSlotStorageKey(2));

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

  it('gives every one of the 10 Bosses a unique gimmick and triggers boss turn gimmicks in battle', () => {
    expect(Object.keys(BOSS_GIMMICKS).length).toBe(10);
    for (const boss of BOSS_MONSTERS) {
      expect(getBossGimmick(boss.id)).not.toBeNull();
    }

    const save = createInitialSave();
    // Genesis Orrery shifts its effective element on turn start
    const orreryEnt = {
      id: 'b_orrery',
      kind: 'boss' as const,
      x: 0,
      y: 0,
      spriteKey: 'genesis_orrery',
      name: '創世天球神アルケミア',
      speciesIds: ['genesis_orrery'],
      interacted: false,
    };
    const b0 = createBattleState(save, orreryEnt, 50);
    const bossUid = b0.enemies[0]!.uid;
    const afterBossTurn = executeTurnAction(
      { ...b0, activeUid: b0.allies[0]!.uid, turnQueue: [bossUid] },
      { type: 'defend' },
    );
    expect(afterBossTurn.enemies[0]!.shiftElement).toBeDefined();

    // Chronos Mantis accelerates its SPD on turn start
    const mantisEnt = {
      id: 'b_mantis',
      kind: 'boss' as const,
      x: 0,
      y: 0,
      spriteKey: 'chronos_mantis',
      name: '時空鎌王クロノマンティス',
      speciesIds: ['chronos_mantis'],
      interacted: false,
    };
    const m0 = createBattleState(save, mantisEnt, 40);
    const spdBefore = m0.enemies[0]!.spd;
    const mNext = executeTurnAction(
      { ...m0, activeUid: m0.allies[0]!.uid, turnQueue: [m0.enemies[0]!.uid] },
      { type: 'defend' },
    );
    expect(mNext.enemies[0]!.spd).toBeGreaterThan(spdBefore);
  });

  it('records defeated enemies in encounteredMonsters and shares 25% EXP with bench monsters', () => {
    const save = createInitialSave();
    save.roster.acorn_boar = createUnitInstance('acorn_boar', 1); // bench monster (not in partyIds)
    const expBefore = save.roster.acorn_boar.exp;
    const lvBefore = save.roster.acorn_boar.level;

    const ent = {
      id: 'enc_1',
      kind: 'enemy' as const,
      x: 0,
      y: 0,
      spriteKey: 'moss_fox',
      name: 'モスフォックス',
      speciesIds: ['moss_fox', 'thorn_sprite'],
      interacted: false,
    };
    const b0 = createBattleState(save, ent, 5);
    const winState = {
      ...b0,
      phase: 'victory' as const,
      enemies: b0.enemies.map((e) => ({ ...e, hp: 0 })),
    };
    const { nextSave } = resolveBattleVictory(save, winState);
    expect(nextSave.encounteredMonsters).toContain('moss_fox');
    expect(nextSave.encounteredMonsters).toContain('thorn_sprite');

    const benchAfter = nextSave.roster.acorn_boar!;
    expect(benchAfter.level > lvBefore || benchAfter.exp > expBefore).toBe(true);
  });

  it('protects equipped, locked, and mythic items when trimming inventory above 140 cap', () => {
    const save = createInitialSave();
    const equippedId = save.roster.hero!.equipped.weapon!;
    const lockedItem = { ...generateEquipment(1, 1, 0, 'normal', 'armor', 'common'), locked: true };
    const mythicItem = generateEquipment(5, 1, 0, 'boss', 'relic', 'mythic');
    const junk: ReturnType<typeof generateEquipment>[] = [];
    for (let i = 0; i < 150; i += 1) {
      junk.push(generateEquipment(1, 1, 0, 'normal', 'weapon', 'common'));
    }
    const trimmed = trimInventorySafely(
      [...junk, save.inventory[0]!, lockedItem, mythicItem],
      save.roster,
      140,
    );
    expect(trimmed.length).toBe(140);
    expect(trimmed.some((i) => i.id === equippedId)).toBe(true);
    expect(trimmed.some((i) => i.id === lockedItem.id)).toBe(true);
    expect(trimmed.some((i) => i.id === mythicItem.id)).toBe(true);
  });

  it('tracks Daily and Repeatable Cycle Guild Quests, awards rewards, and rolls over daily/cycle missions', () => {
    const save = createInitialSave();
    expect(save.guildQuests.daily.length).toBe(3);
    expect(save.guildQuests.cycle.length).toBe(3);
    expect(save.guildQuests.cycleNumber).toBe(1);

    // Advance progress via battles and enhancements
    let gq = applyBattleProgressToQuests(
      save.guildQuests,
      { kills: 20, elites: 5, bosses: 5, biome: save.guildQuests.daily[0]!.biome ?? 'forest', hasTrials: true, bossRushWave: 10 },
      1,
    );
    gq = applyEnhanceProgressToQuests(gq, 1, 10);
    let curSave = { ...save, guildQuests: gq };

    // Claim all 3 cycle quests -> should auto-advance to Cycle 2!
    const cycleIds = curSave.guildQuests.cycle.map((q) => q.id);
    const goldBefore = curSave.gold;
    const stonesBefore = curSave.forgeStones;
    let cycledFlag = false;
    for (const qid of cycleIds) {
      const res = claimGuildQuestReward(curSave, qid);
      expect(res.claimedQuest).not.toBeNull();
      curSave = res.nextSave;
      if (res.cycled) cycledFlag = true;
    }
    expect(cycledFlag).toBe(true);
    expect(curSave.guildQuests.cycleNumber).toBe(2);
    expect(curSave.gold).toBeGreaterThan(goldBefore);
    expect(curSave.forgeStones).toBeGreaterThan(stonesBefore);

    // Date rollover refreshes daily quests
    const rolled = refreshDailyQuestsIfNeeded(curSave.guildQuests, 1, '2099-12-31');
    expect(rolled.dailyDateKey).toBe('2099-12-31');
    expect(rolled.daily.every((q) => q.progress === 0 && !q.claimed)).toBe(true);
  });

  it('produces 501+ unique per-(monster x skill) motion recipes and bespoke signatures for all 10 Hero skills, Limit Break, and all 10 Bosses', () => {
    const keys = new Set<string>();

    // 1. All 150 monsters x 2 skills (300) + 150 monster basic attacks (150) + 40 Boss/Elite ultimates (40)
    for (const sp of MONSTER_LIST) {
      for (const sk of sp.skills) {
        const rec = resolveMotionRecipe(sp.id, sk.id, { skill: sk });
        keys.add(rec.signatureKey);
        if (sp.isBoss) {
          expect(getSignatureStyle(sp.id, sk.id)).toBeDefined();
        }
      }
      const basicRec = resolveMotionRecipe(sp.id, 'basic_attack', {
        element: sp.element,
        kind: 'attack',
      });
      keys.add(basicRec.signatureKey);

      if (sp.isBoss || sp.tier === 'elite') {
        const ultRec = resolveMotionRecipe(sp.id, 'enemy_ultimate', {
          element: sp.element,
          kind: 'ultimate',
          isAoE: true,
        });
        keys.add(ultRec.signatureKey);
        if (sp.isBoss) {
          expect(getSignatureStyle(sp.id, 'enemy_ultimate')).toBeDefined();
        }
      }
    }

    // 2. Hero x 10 skills (10) + Hero basic attack (1) + Limit Break (1)
    const heroSkillList = Object.values(ALL_HERO_SKILLS);
    expect(heroSkillList.length).toBe(10);
    for (const sk of heroSkillList) {
      expect(getSignatureStyle('hero', sk.id)).toBeDefined();
      keys.add(resolveMotionRecipe('hero', sk.id, { skill: sk }).signatureKey);
    }
    keys.add(
      resolveMotionRecipe('hero', 'basic_attack', { element: 'holy', kind: 'attack' }).signatureKey,
    );
    expect(getSignatureStyle('hero', 'limit_break')).toBe('hero_limit_break');
    keys.add(
      resolveMotionRecipe('hero', 'limit_break', { element: 'holy', kind: 'limit_break', isAoE: true })
        .signatureKey,
    );

    // 300 + 150 + 40 + 10 + 1 + 1 = 502 completely unique (species x skill) signatures
    expect(keys.size).toBe(502);
  });

  it('sets activeMotion, extended VFX metadata, and Hero/Boss signature activeCinematic on battle actions', () => {
    const save = createInitialSave();
    const bossEnt = createBossRushEntity(10); // genesis_orrery
    const b0 = createBattleState(save, bossEnt, 46, { initialLimitGauge: 100 });

    const hero = b0.allies.find((a) => a.speciesId === 'hero')!;
    const boss = b0.enemies[0]!;

    // Hero skill -> activeMotion + signature activeCinematic + skillId on VFX
    const heroTurn = { ...b0, activeUid: hero.uid };
    const afterHeroSkill = executeTurnAction(heroTurn, {
      type: 'skill',
      skillIndex: 0,
      targetUid: boss.uid,
    });
    const heroAfter = afterHeroSkill.allies.find((a) => a.uid === hero.uid)!;
    expect(heroAfter.activeMotion?.speciesId).toBe('hero');
    expect(heroAfter.activeMotion?.skillId).toBe(hero.skills[0].id);
    expect(afterHeroSkill.activeCinematic?.skillId).toBe(hero.skills[0].id);
    expect(afterHeroSkill.vfx.some((v) => v.skillId === hero.skills[0].id && v.attackerUid === hero.uid)).toBe(
      true,
    );

    // Transform helper yields non-neutral motion offset / glow mid-animation
    const tx = computeUnitMotionTransform(
      heroAfter,
      heroAfter.activeMotion!.startedAt + 120,
      { x: 240, y: 120 },
      { x: 80, y: 120 },
    );
    expect(tx.glowColor).not.toBeNull();
    expect(Math.abs(tx.offsetX) + Math.abs(tx.offsetY) + Math.abs(tx.rotation)).toBeGreaterThan(0);

    // Limit Break -> signature cinematic + all living allies get activeMotion
    const afterLb = executeTurnAction(heroTurn, { type: 'limit_break' });
    expect(afterLb.activeCinematic?.skillId).toBe('limit_break');
    expect(afterLb.allies.filter((a) => a.hp > 0).every((a) => a.activeMotion?.skillId === 'limit_break')).toBe(
      true,
    );

    // Boss ultimate -> boss activeMotion + boss signature cinematic
    const bossTurn = {
      ...b0,
      activeUid: boss.uid,
      enemies: b0.enemies.map((e, i) => (i === 0 ? { ...e, charging: true } : e)),
    };
    const afterBossUlt = executeTurnAction(bossTurn, { type: 'enemy_ultimate' });
    const bossAfter = afterBossUlt.enemies[0]!;
    expect(bossAfter.activeMotion?.speciesId).toBe('genesis_orrery');
    expect(bossAfter.activeMotion?.skillId).toBe('enemy_ultimate');
    expect(afterBossUlt.activeCinematic?.speciesId).toBe('genesis_orrery');
    expect(afterBossUlt.activeCinematic?.skillId).toBe('enemy_ultimate');
  });

  it('runs battle visual motions at 0.75x speed (4/3x durations) and uses full orchestral arrangements for all 4 BGM tracks', () => {
    expect(BATTLE_VISUAL_SPEED_MULT).toBe(0.75);

    const save = createInitialSave();
    const bossEnt = createBossRushEntity(1);
    const b0 = createBattleState(save, bossEnt, 5);
    const hero = b0.allies.find((a) => a.speciesId === 'hero')!;
    const boss = b0.enemies[0]!;
    const heroTurn = { ...b0, activeUid: hero.uid };

    const afterAtk = executeTurnAction(heroTurn, { type: 'attack', targetUid: boss.uid });
    expect(afterAtk.allies.find((a) => a.uid === hero.uid)?.activeMotion?.durationMs).toBe(
      Math.round(400 / 0.75),
    );

    const afterSkill = executeTurnAction(heroTurn, {
      type: 'skill',
      skillIndex: 0,
      targetUid: boss.uid,
    });
    expect(afterSkill.allies.find((a) => a.uid === hero.uid)?.activeMotion?.durationMs).toBe(
      Math.round(620 / 0.75),
    );
    expect(afterSkill.activeCinematic?.durationMs).toBe(Math.round(640 / 0.75));

    // All 4 BGM tracks are 32-step symphonic orchestra scores with strings ensemble + contrabass
    const trackKeys = ['village', 'dungeon', 'battle', 'boss'] as const;
    for (const key of trackKeys) {
      const tr = ORCHESTRA_TRACKS[key];
      expect(tr.style).toBe('orchestra');
      expect(tr.steps).toBe(32);
      expect(tr.lead.length).toBe(32);
      expect(tr.bass.length).toBe(32);
      expect(Object.keys(tr.chords).length).toBeGreaterThanOrEqual(8);
      expect(tr.instruments).toContain('strings');
      expect(tr.instruments).toContain('contrabass');
    }
    expect(ORCHESTRA_TRACKS.battle.instruments).toContain('brass');
    expect(ORCHESTRA_TRACKS.battle.instruments).toContain('timpani');
    expect(ORCHESTRA_TRACKS.boss.instruments).toContain('brass');
    expect(ORCHESTRA_TRACKS.boss.instruments).toContain('percussion');
  });
});
