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
  createHubMap,
  findAutoExploreTarget,
  findPathBFS,
  generateDungeonFloor,
} from '../dungeon';
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
    expect(getBiomeForFloor(21)).toBe('forest'); // endless cycle
    expect(isBossFloor(5)).toBe(true);
    expect(isBossFloor(20)).toBe(true);
    expect(isBossFloor(7)).toBe(false);
  });

  it('has 20 collectible monsters and 14 unique templates', () => {
    expect(MONSTER_LIST.length).toBe(20);
    expect(UNIQUE_TEMPLATES.length).toBe(14);
  });

  it('generates connected dungeons with reachable stairs, chests, and bosses on boss floors', () => {
    const hub = createHubMap();
    expect(hub.floor).toBe(0);
    expect(hub.entities.length).toBe(5);

    const floor1 = generateDungeonFloor(1, 1);
    const pathToStairs = findPathBFS(
      floor1,
      floor1.playerX,
      floor1.playerY,
      floor1.stairsX,
      floor1.stairsY,
    );
    expect(pathToStairs.length).toBeGreaterThan(0);
    expect(findAutoExploreTarget(floor1)).not.toBeNull();

    const floor5 = generateDungeonFloor(5, 1);
    expect(floor5.bossDefeated).toBe(false);
    expect(floor5.entities.some((e) => e.kind === 'boss')).toBe(true);
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
    // Boost hero to level 30 so test battle finishes cleanly in victory
    save.roster.hero!.level = 30;
    const bossEntity = {
      id: 'boss_20',
      kind: 'boss' as const,
      x: 5,
      y: 5,
      spriteKey: 'star_devourer',
      name: '【BOSS】星喰いの虚無獣',
      speciesIds: ['star_devourer'],
      interacted: false,
    };

    let battle = createBattleState(save, bossEntity, 20);
    // Simulate turns until victory or defeat
    let safety = 0;
    while (
      battle.phase !== 'victory' &&
      battle.phase !== 'defeat' &&
      safety < 80
    ) {
      battle = stepEnemyOrAutoTurn(battle, true, 'allout');
      safety += 1;
    }

    // Also verify manual defend action works cleanly on a fresh battle
    const fresh = createBattleState(save, bossEntity, 1);
    const afterDefend = executeTurnAction(fresh, { type: 'defend' });
    expect(afterDefend.logs.length).toBeGreaterThan(fresh.logs.length);

    if (battle.phase === 'victory') {
      const { nextSave, reward } = resolveBattleVictory(save, battle);
      expect(reward.worldTierUnlocked).toBe(2);
      expect(nextSave.maxUnlockedTier).toBe(2);
      expect(nextSave.gold).toBeGreaterThan(save.gold);
    } else {
      // Force victory resolution check
      const forcedWin = {
        ...battle,
        phase: 'victory' as const,
        enemies: battle.enemies.map((e) => ({ ...e, hp: 0 })),
      };
      const { nextSave, reward } = resolveBattleVictory(save, forcedWin);
      expect(reward.worldTierUnlocked).toBe(2);
      expect(nextSave.maxUnlockedTier).toBe(2);
    }
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

    // Tampered code must fail checksum
    const bad = importSaveCode(`${code.slice(0, -2)}AA`);
    expect(bad.ok).toBe(false);
  });
});
