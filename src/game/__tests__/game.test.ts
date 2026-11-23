import { describe, expect, it } from 'vitest';
import {
  createBattleState,
  executeTurnAction,
  resolveBattleVictory,
  stepEnemyOrAutoTurn,
} from '../battle';
import { getBiomeForFloor, isBossFloor } from '../data/biomes';
import {
  calculateItemScore,
  generateEquipment,
  RARITY_META,
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
import { createInitialSave, exportSaveCode, importSaveCode } from '../save';
import { computeUnitStats } from '../stats';
import { getWorldTierBlessing, toRoman } from '../worldTier';

describe('RuneTamer Labyrinth Core Systems', () => {
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

  it('has 20 collectible monsters and 14 unique templates', () => {
    expect(MONSTER_LIST.length).toBe(20);
    expect(UNIQUE_TEMPLATES.length).toBe(14);
  });

  it('generates command-choice expedition steps, boss choices, stairs, and auto-advance picks', () => {
    const village = createVillageExpedition();
    expect(village.inVillage).toBe(true);
    expect(village.floor).toBe(0);

    const floor1 = createDungeonExpedition(1, 1);
    expect(floor1.inVillage).toBe(false);
    expect(floor1.choices.length).toBe(3);
    expect(pickAutoExpeditionChoice(floor1, 0.9)).not.toBeNull();

    // Boss floor final step offers boss fight + campfire rest
    const bossStepChoices = generateStepChoices(5, STEPS_PER_FLOOR, STEPS_PER_FLOOR, 1, false, false);
    expect(bossStepChoices.some((c) => c.kind === 'boss')).toBe(true);
    expect(bossStepChoices.some((c) => c.kind === 'rest')).toBe(true);

    // Cleared final step offers stairs down + farm + return to village
    const clearedChoices = generateStepChoices(5, STEPS_PER_FLOOR, STEPS_PER_FLOOR, 1, true, false);
    expect(clearedChoices.some((c) => c.kind === 'stairs')).toBe(true);
    expect(clearedChoices.some((c) => c.kind === 'return_village')).toBe(true);
  });

  it('generates scaled hack-and-slash equipment across rarities and World Tiers', () => {
    const tier1 = generateEquipment(5, 1, 0, 'normal', 'weapon', 'rare');
    const tier3 = generateEquipment(5, 3, 50, 'boss', 'weapon', 'mythic');

    expect(tier1.affixes.length).toBe(RARITY_META.rare.affixCount);
    expect(tier3.affixes.length).toBe(RARITY_META.mythic.affixCount);
    expect(calculateItemScore(tier3)).toBeGreaterThan(calculateItemScore(tier1));
  });

  it('computes stats with equipped items and permanent World Tier blessings', () => {
    const save = createInitialSave();
    const hero = save.roster.hero!;
    const stTier1 = computeUnitStats(hero, save);
    const stTier3 = computeUnitStats(hero, { ...save, maxUnlockedTier: 3 });

    expect(stTier3.atk).toBeGreaterThan(stTier1.atk);
    expect(stTier3.magicFind).toBeGreaterThan(stTier1.magicFind);
    expect(getWorldTierBlessing(3).statMult).toBeCloseTo(1.4);
    expect(toRoman(4)).toBe('IV');
  });

  it('runs a full auto-battle to victory and unlocks World Tier II on Floor 20 Boss kill', () => {
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
    expect(nextSave.maxUnlockedTier).toBe(2);
    expect(nextSave.gold).toBeGreaterThan(save.gold);
  });

  it('exports and imports save codes with checksum integrity', () => {
    const save = createInitialSave();
    save.gold = 98765;
    save.maxUnlockedTier = 3;

    const code = exportSaveCode(save);
    expect(code.startsWith('RTL1:')).toBe(true);

    const ok = importSaveCode(code);
    expect(ok.ok).toBe(true);
    if (ok.ok) {
      expect(ok.save.gold).toBe(98765);
      expect(ok.save.maxUnlockedTier).toBe(3);
    }

    const bad = importSaveCode(`${code.slice(0, -2)}AA`);
    expect(bad.ok).toBe(false);
  });
});
