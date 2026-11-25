import { getSignatureStyle } from '../engine/battleMotions';
import { getBossGimmick, SHIFT_ELEMENTS } from './bossGimmicks';
import { BOSS_RUSH_MAX_WAVE, getBossRushWave } from './bossRush';
import { getBiomeForFloor } from './data/biomes';
import { generateEquipment, getSalvageValue, RARITY_META } from './data/equipment';
import { getSpecies } from './data/monsters';
import { applyBattleProgressToQuests } from './guildQuests';
import { createUnitInstance, trimInventorySafely } from './save';
import { getHeroEquippedSkills } from './skillTree';
import { computeUnitStats, expForNextLevel, getPartyAggregatedLootBonuses } from './stats';
import { computePartySynergies } from './synergy';
import { computeTrialModifiers } from './trials';
import type {
  ActiveShrineBuffs,
  AutoSellThreshold,
  BattleReward,
  BattleState,
  BattleTactic,
  BattleUnitState,
  ElementType,
  EquipmentItem,
  GameSave,
  MapEntity,
  Rarity,
  SkillDef,
  StatusEffectType,
} from './types';
import { getActiveTierModifiers, toRoman } from './worldTier';

let battleIdSeq = 1;
let effectSeq = 1;

// 0.75x battle visual speed => 4/3x (~1.333x) animation durations
export const BATTLE_VISUAL_SPEED_MULT = 0.75;
const BATTLE_VISUAL_DURATION_SCALE = 1 / BATTLE_VISUAL_SPEED_MULT;

function scaleVisualMs(baseMs: number): number {
  return Math.round(baseMs * BATTLE_VISUAL_DURATION_SCALE);
}

function nextEffectId(): string {
  effectSeq += 1;
  return `fx_${effectSeq}_${Date.now().toString(36)}`;
}

const WEAKNESS_MAP: Partial<Record<ElementType, ElementType>> = {
  fire: 'nature',
  nature: 'earth',
  earth: 'star',
  star: 'holy',
  holy: 'fire',
};

export function getUnitEffectiveElement(unit: Pick<BattleUnitState, 'speciesId' | 'shiftElement'>): ElementType {
  return unit.shiftElement ?? getSpecies(unit.speciesId).element;
}

export function isElementalWeakness(
  attackElement: ElementType,
  defenderSpeciesId: string,
  overrideElement?: ElementType,
): boolean {
  const defElem = overrideElement ?? getSpecies(defenderSpeciesId).element;
  return WEAKNESS_MAP[attackElement] === defElem;
}

export function shouldAutoSell(rarity: Rarity, threshold: AutoSellThreshold): boolean {
  if (threshold === 'none') return false;
  return RARITY_META[rarity].rank <= RARITY_META[threshold].rank;
}

export interface CreateBattleOptions {
  shrineBuffs?: ActiveShrineBuffs;
  hpPotions?: number;
  mpPotions?: number;
  initialLimitGauge?: number;
  bossRushWave?: number;
}

export function createBattleState(
  save: GameSave,
  entity: MapEntity,
  floor: number,
  shrineBuffsOrOpts?: ActiveShrineBuffs | CreateBattleOptions,
): BattleState {
  battleIdSeq += 1;
  const opts: CreateBattleOptions =
    shrineBuffsOrOpts && 'powerBonus' in shrineBuffsOrOpts
      ? { shrineBuffs: shrineBuffsOrOpts }
      : (shrineBuffsOrOpts ?? {});
  const shrineBuffs = opts.shrineBuffs;
  const bossRushWave = opts.bossRushWave;

  const biome = bossRushWave
    ? getBossRushWave(bossRushWave).biome
    : getBiomeForFloor(floor);
  const tierMods = getActiveTierModifiers(save.worldTier);
  const trials = computeTrialModifiers(save.activeTrials);
  const invMap = new Map(save.inventory.map((it) => [it.id, it]));
  const syn = computePartySynergies(save);
  const heroSkills = getHeroEquippedSkills(save);

  const allies: BattleUnitState[] = save.partyIds
    .map((id) => save.roster[id])
    .filter((u): u is NonNullable<typeof u> => Boolean(u))
    .map((u) => {
      const sp = getSpecies(u.speciesId);
      const st = computeUnitStats(u, save, shrineBuffs, invMap);
      const activeSetIds4pc = st.activeSets
        .filter((s) => s.count >= 4)
        .map((s) => s.setId);
      const hp = Math.min(st.maxHp, Math.max(1, u.hp));
      const mp = Math.min(st.maxMp, Math.max(0, u.mp));

      let startShieldPct = syn.startShieldPct;
      if (st.uniqueEffects.includes('golden_aegis')) startShieldPct += 12;
      if (activeSetIds4pc.includes('ancient_rune')) startShieldPct += 12;

      const startSpd = st.uniqueEffects.includes('chronos_hourglass')
        ? Math.round(st.spd * 1.15)
        : st.spd;

      const isTrueEvolved = Boolean(u.trueEvolved) && u.speciesId !== 'hero';
      const isEvolved = (Boolean(u.evolved) || isTrueEvolved) && u.speciesId !== 'hero';
      return {
        uid: `ally_${u.id}`,
        isAlly: true,
        speciesId: u.speciesId,
        name: isTrueEvolved ? `【真】${sp.name}` : isEvolved ? `【極】${sp.name}` : sp.name,
        spriteKey: sp.spriteKey,
        level: u.level,
        isBoss: false,
        isElite: false,
        evolved: isEvolved,
        trueEvolved: isTrueEvolved,
        hp,
        maxHp: st.maxHp,
        mp,
        maxMp: st.maxMp,
        shield: Math.min(
          Math.round(st.maxHp * 0.55),
          Math.round((st.maxHp * startShieldPct) / 100),
        ),
        atk: st.atk,
        mag: st.mag,
        def: st.def,
        spd: startSpd,
        critRate: st.critRate,
        critDmg: st.critDmg,
        lifesteal: st.lifesteal,
        doubleHit: st.doubleHit,
        regenPct: st.regenPct,
        damageTakenMult: st.damageTakenMult,
        skillPowerBonusPct: st.skillPowerBonusPct,
        weaknessBonusPct: st.weaknessBonusPct,
        mpRegenBonus: st.mpRegenBonus,
        armorPenPct: st.armorPenPct,
        statusDmgBonusPct: st.statusDmgBonusPct,
        uniqueEffects: st.uniqueEffects,
        activeSetIds4pc,
        defending: false,
        charging: false,
        enraged: false,
        poisonTurns: 0,
        burnTurns: 0,
        freezeTurns: 0,
        defBreakTurns: 0,
        atkBuffTurns: 0,
        defBuffTurns: 0,
        phoenixUsed: false,
        skills: u.speciesId === 'hero' ? heroSkills : sp.skills,
        lungeUntilMs: 0,
        hurtUntilMs: 0,
      };
    });

  const vowCount = allies.filter((a) => a.uniqueEffects.includes('guardian_vow_rune')).length;
  if (vowCount > 0) {
    for (const a of allies) {
      a.shield = Math.min(
        Math.round(a.maxHp * 0.55),
        a.shield + Math.round(a.maxHp * 0.06 * vowCount),
      );
    }
  }

  const isBossBattle = entity.kind === 'boss';
  const isEliteBattle = entity.kind === 'elite';
  const isRareBattle = entity.kind === 'rare_enemy';
  const speciesIds =
    entity.speciesIds && entity.speciesIds.length > 0 ? entity.speciesIds : ['leaf_slime'];

  const floorLevel = Math.max(1, Math.round(floor * 1.35 + (save.worldTier - 1) * 20));
  const floorHpMult = Math.pow(1.148, Math.max(0, floor - 1));
  const floorAtkMult = Math.pow(1.118, Math.max(0, floor - 1));
  const floorDefMult = Math.pow(1.092, Math.max(0, floor - 1));
  const curseMult = 1 + (shrineBuffs?.curseEnemyBonus ?? 0);

  const enemies: BattleUnitState[] = speciesIds.map((spId, idx) => {
    const sp = getSpecies(spId);
    const isBossUnit = sp.isBoss || (isBossBattle && idx === 0);
    const isEliteUnit =
      !isBossUnit && (sp.tier === 'elite' || ((isEliteBattle || isRareBattle) && idx === 0));

    const hpRoleMult = isBossUnit ? 3.85 : isRareBattle ? 2.3 : isEliteUnit ? 2.15 : 1.28;
    const atkRoleMult = isBossUnit ? 1.65 : isRareBattle ? 1.48 : isEliteUnit ? 1.45 : 1.22;
    const defRoleMult = isBossUnit ? 1.55 : isEliteUnit ? 1.38 : 1.15;

    // v10 slight enemy buff (+12% HP, +10% ATK/MAG, +8% DEF, +2 SPD) + Trial modifiers
    const maxHp = Math.max(
      64,
      Math.round(
        (sp.baseStats.hp * 0.95 + sp.growth.hp * (floor - 1) * 0.85) *
          floorHpMult *
          hpRoleMult *
          tierMods.enemyHpMult *
          curseMult *
          1.12 *
          trials.enemyHpMult,
      ),
    );
    const atk = Math.max(
      18,
      Math.round(
        (sp.baseStats.atk * 0.96 + sp.growth.atk * (floor - 1) * 0.72) *
          floorAtkMult *
          atkRoleMult *
          tierMods.enemyAtkMult *
          curseMult *
          1.1 *
          trials.enemyAtkMult,
      ),
    );
    const mag = Math.max(
      18,
      Math.round(
        (sp.baseStats.mag * 0.96 + sp.growth.mag * (floor - 1) * 0.72) *
          floorAtkMult *
          atkRoleMult *
          tierMods.enemyAtkMult *
          curseMult *
          1.1 *
          trials.enemyAtkMult,
      ),
    );
    const def = Math.max(
      9,
      Math.round(
        (sp.baseStats.def * 0.92 + sp.growth.def * (floor - 1) * 0.62) *
          floorDefMult *
          defRoleMult *
          tierMods.enemyDefMult *
          1.08 *
          trials.enemyDefMult,
      ),
    );
    const spd = Math.max(
      12,
      Math.round(
        (sp.baseStats.spd * 1.05 + floor * 0.85 + (save.worldTier - 1) * 4 + 2) *
          trials.enemySpdMult,
      ),
    );

    return {
      uid: `enemy_${idx}_${spId}`,
      isAlly: false,
      speciesId: spId,
      name: isBossUnit ? `${sp.name}` : isRareBattle ? `✦${sp.name}` : isEliteUnit ? `★${sp.name}` : sp.name,
      spriteKey: sp.spriteKey,
      level: floorLevel,
      isBoss: isBossUnit,
      isElite: isEliteUnit || isRareBattle,
      evolved: false,
      trueEvolved: false,
      hp: maxHp,
      maxHp,
      mp: 999,
      maxMp: 999,
      shield: isBossUnit ? Math.round(maxHp * 0.16) : 0,
      atk,
      mag,
      def,
      spd,
      critRate: isBossUnit ? 20 : isEliteUnit ? 15 : 10,
      critDmg: 168,
      lifesteal: 0,
      doubleHit: isBossUnit ? 16 : 0,
      regenPct: isBossUnit ? 3 : 0,
      damageTakenMult: 1.0,
      skillPowerBonusPct: 0,
      weaknessBonusPct: 0,
      mpRegenBonus: 0,
      armorPenPct: 0,
      statusDmgBonusPct: 0,
      uniqueEffects: [],
      activeSetIds4pc: [],
      defending: false,
      charging: false,
      enraged: isBossUnit && trials.bossStartsEnraged,
      poisonTurns: 0,
      burnTurns: 0,
      freezeTurns: 0,
      defBreakTurns: 0,
      atkBuffTurns: 0,
      defBuffTurns: 0,
      phoenixUsed: false,
      skills: sp.skills,
      lungeUntilMs: 0,
      hurtUntilMs: 0,
    };
  });

  const state: BattleState = {
    id: `btl_${battleIdSeq}`,
    biome,
    floor,
    worldTier: save.worldTier,
    entityId: entity.id,
    isBossBattle,
    isEliteBattle,
    isRareBattle,
    bossRushWave,
    activeTrials: [...(save.activeTrials ?? [])],
    turn: 1,
    limitGauge: Math.min(100, Math.max(0, opts.initialLimitGauge ?? 15)),
    hpPotions: trials.noPotions ? 0 : (opts.hpPotions ?? 1),
    mpPotions: trials.noPotions ? 0 : (opts.mpPotions ?? 1),
    allies,
    enemies,
    turnQueue: [],
    activeUid: null,
    phase: 'animating',
    logs: [
      bossRushWave
        ? `🏟 ${getBossRushWave(bossRushWave).title}`
        : isBossBattle
          ? `☠ 階層ボス「${enemies.find((e) => e.isBoss)?.name ?? entity.name}」が現れた`
          : isRareBattle
            ? `✦ 希少魔物「${enemies[0]?.name}」が現れた`
            : isEliteBattle
              ? `★ 強敵の群れが現れた`
              : `${enemies[0]?.name ?? '魔物'}の群れが現れた`,
    ],
    floatingTexts: [],
    vfx: [],
    shakeUntilMs: 0,
    reward: null,
  };

  rebuildTurnQueue(state);
  advanceToNextActor(state);
  return state;
}

function getAllUnits(state: BattleState): BattleUnitState[] {
  return [...state.allies, ...state.enemies];
}

export function findBattleUnit(state: BattleState, uid: string | null): BattleUnitState | undefined {
  if (!uid) return undefined;
  return getAllUnits(state).find((u) => u.uid === uid);
}

function rebuildTurnQueue(state: BattleState): void {
  const living = getAllUnits(state).filter((u) => u.hp > 0);
  living.sort((a, b) => {
    const scoreA = a.spd * (0.94 + Math.random() * 0.12);
    const scoreB = b.spd * (0.94 + Math.random() * 0.12);
    return scoreB - scoreA;
  });
  state.turnQueue = living.map((u) => u.uid);
}

export function getSkillMpCost(actor: BattleUnitState, skill: SkillDef): number {
  let mult = 1;
  if (
    actor.uniqueEffects.includes('sun_king_staff') &&
    (skill.statScale === 'mag' || skill.statScale === 'hybrid')
  ) {
    mult *= 0.85;
  }
  if (actor.uniqueEffects.includes('prism_wand')) {
    mult *= 0.85;
  }
  return Math.max(1, Math.round(skill.mpCost * mult));
}

function isTargetAfflicted(u: BattleUnitState): boolean {
  return u.poisonTurns > 0 || u.burnTurns > 0 || u.freezeTurns > 0 || u.defBreakTurns > 0;
}

function addLimitGauge(state: BattleState, baseAmount: number): void {
  const hasEternal = state.allies.some(
    (a) => a.hp > 0 && a.uniqueEffects.includes('eternal_tamer_rune'),
  );
  const gain = hasEternal ? Math.round(baseAmount * 1.2) : baseAmount;
  state.limitGauge = Math.min(100, state.limitGauge + gain);
}

function applyStatusEffect(
  state: BattleState,
  target: BattleUnitState,
  type: StatusEffectType,
  chance: number,
  turns: number,
): boolean {
  if (target.hp <= 0) return false;
  const effectiveChance = type === 'freeze' && target.isBoss ? chance * 0.5 : chance;
  if (Math.random() >= effectiveChance) return false;
  const now = Date.now();
  if (type === 'poison') {
    target.poisonTurns = Math.max(target.poisonTurns, turns);
    state.floatingTexts.push({
      id: nextEffectId(),
      targetUid: target.uid,
      text: '☠毒',
      color: '#c975ff',
      createdAt: now,
    });
  } else if (type === 'burn') {
    target.burnTurns = Math.max(target.burnTurns, turns);
    state.floatingTexts.push({
      id: nextEffectId(),
      targetUid: target.uid,
      text: '🔥火傷',
      color: '#ff8a47',
      createdAt: now,
    });
    state.vfx.push({
      id: nextEffectId(),
      targetUid: target.uid,
      element: 'burn',
      createdAt: now,
    });
  } else if (type === 'freeze') {
    target.freezeTurns = Math.max(target.freezeTurns, turns);
    state.floatingTexts.push({
      id: nextEffectId(),
      targetUid: target.uid,
      text: '❄凍結',
      color: '#7ce8ff',
      isCrit: true,
      createdAt: now,
    });
    state.vfx.push({
      id: nextEffectId(),
      targetUid: target.uid,
      element: 'freeze',
      createdAt: now,
    });
  } else if (type === 'def_break') {
    target.defBreakTurns = Math.max(target.defBreakTurns, turns);
    state.floatingTexts.push({
      id: nextEffectId(),
      targetUid: target.uid,
      text: '💔防低下',
      color: '#d48aff',
      createdAt: now,
    });
  }
  return true;
}

interface VfxMeta {
  attackerUid?: string;
  speciesId?: string;
  skillId?: string;
}

function applyHealing(
  state: BattleState,
  target: BattleUnitState,
  amount: number,
  allowOverhealShield: boolean,
  cleanseStatus = false,
  caster?: BattleUnitState,
  vfxMeta?: VfxMeta,
): number {
  if (target.hp <= 0) return 0;
  const trials = computeTrialModifiers(state.activeTrials);
  let healMult = trials.healMult;
  if (caster?.activeSetIds4pc.includes('seraph_radiance')) healMult *= 1.14;
  if (caster?.uniqueEffects.includes('halo_diadem')) healMult *= 1.12;
  const actual = Math.max(1, Math.round(amount * healMult));
  const missing = target.maxHp - target.hp;
  const healed = Math.min(missing, actual);
  target.hp += healed;
  if (cleanseStatus) {
    target.poisonTurns = 0;
    target.burnTurns = 0;
    target.freezeTurns = 0;
  }

  if (allowOverhealShield && actual > missing) {
    const overflow = Math.min(Math.round(target.maxHp * 0.24), actual - missing);
    target.shield = Math.min(Math.round(target.maxHp * 0.5), target.shield + overflow);
  }

  state.floatingTexts.push({
    id: nextEffectId(),
    targetUid: target.uid,
    text: `+${actual}`,
    color: '#6dff92',
    createdAt: Date.now(),
  });
  state.vfx.push({
    id: nextEffectId(),
    targetUid: target.uid,
    element: 'heal',
    createdAt: Date.now(),
    ...vfxMeta,
  });
  return healed;
}

function applyDamage(
  state: BattleState,
  attacker: BattleUnitState,
  defender: BattleUnitState,
  rawDamage: number,
  element: BattleState['vfx'][number]['element'],
  isCrit: boolean,
  isWeak = false,
  vfxMeta?: VfxMeta,
): number {
  if (defender.hp <= 0) return 0;
  const now = Date.now();
  let dmgMult = defender.damageTakenMult;
  if (defender.uniqueEffects.includes('abyssal_carapace') && isTargetAfflicted(attacker)) {
    dmgMult *= 0.88;
  }
  // Boss Gimmick: Rune Golem takes -20% damage while shield holds
  if (!defender.isAlly && defender.speciesId === 'rune_golem' && defender.shield > 0) {
    dmgMult *= 0.8;
  }
  let dmg = Math.max(1, Math.round(rawDamage * dmgMult));
  if (defender.defending) {
    dmg = Math.max(1, Math.round(dmg * 0.45));
  }

  let absorbed = 0;
  if (defender.shield > 0) {
    absorbed = Math.min(defender.shield, dmg);
    defender.shield -= absorbed;
    dmg -= absorbed;
  }

  const wasAlive = defender.hp > 0;
  defender.hp = Math.max(0, defender.hp - dmg);
  defender.hurtUntilMs = now + scaleVisualMs(320);

  if (defender.isAlly && dmg + absorbed > 0) {
    addLimitGauge(state, 11);
  }

  if (isCrit || isWeak || element === 'ultimate' || element === 'limit_break') {
    state.shakeUntilMs = Math.max(
      state.shakeUntilMs,
      now + scaleVisualMs(element === 'ultimate' || element === 'limit_break' ? 420 : 240),
    );
  }

  if (!defender.isAlly && defender.isBoss && !defender.enraged && defender.hp > 0 && defender.hp / defender.maxHp <= 0.5) {
    defender.enraged = true;
    state.logs.push(`🔥 ${defender.name}が激昂した`);
    state.floatingTexts.push({
      id: nextEffectId(),
      targetUid: defender.uid,
      text: '🔥怒り!',
      color: '#ff5768',
      isCrit: true,
      createdAt: now,
    });
    // Boss Gimmick: Ancient Treant gains bark barrier & DEF UP on enrage
    if (defender.speciesId === 'ancient_treant') {
      defender.defBuffTurns = Math.max(defender.defBuffTurns, 3);
      defender.shield = Math.min(
        Math.round(defender.maxHp * 0.35),
        defender.shield + Math.round(defender.maxHp * 0.12),
      );
      state.logs.push(`🌳 ${defender.name}の根絡み障壁が展開`);
    }
  }

  if (
    defender.hp === 0 &&
    defender.uniqueEffects.includes('phoenix_ash_rune') &&
    !defender.phoenixUsed
  ) {
    defender.phoenixUsed = true;
    defender.hp = Math.max(1, Math.round(defender.maxHp * 0.18));
    state.logs.push(`${defender.name}の不死鳥の灰ルーンが輝き、踏みとどまった`);
    state.floatingTexts.push({
      id: nextEffectId(),
      targetUid: defender.uid,
      text: '復活!',
      color: '#ffcf5c',
      isCrit: true,
      createdAt: now,
    });
  }

  if (wasAlive && defender.hp === 0 && attacker.uniqueEffects.includes('vampire_scythe') && attacker.hp > 0) {
    applyHealing(
      state,
      attacker,
      Math.round(attacker.maxHp * 0.12),
      attacker.uniqueEffects.includes('crimson_chalice'),
      false,
      attacker,
    );
  }

  const totalDealt = dmg + absorbed;
  state.floatingTexts.push({
    id: nextEffectId(),
    targetUid: defender.uid,
    text: isWeak ? `WEAK ${totalDealt}!` : isCrit ? `${totalDealt}!` : `${totalDealt}`,
    color: isWeak ? '#ffe66b' : isCrit ? '#ffcf5c' : defender.isAlly ? '#ff7c7c' : '#ffffff',
    isCrit: isCrit || isWeak,
    isWeak,
    createdAt: now,
  });
  state.vfx.push({
    id: nextEffectId(),
    targetUid: defender.uid,
    element,
    createdAt: now,
    ...vfxMeta,
  });

  // Boss on-hit gimmicks when hitting allies
  if (!attacker.isAlly && defender.isAlly && defender.hp > 0 && totalDealt > 0) {
    if (attacker.speciesId === 'ancient_treant') {
      applyStatusEffect(state, defender, 'poison', 0.3, 3);
    }
    if (attacker.speciesId === 'star_devourer' && defender.mp > 0) {
      const drained = Math.min(defender.mp, 10);
      defender.mp -= drained;
      state.floatingTexts.push({
        id: nextEffectId(),
        targetUid: defender.uid,
        text: `MP-${drained}`,
        color: '#b48cff',
        createdAt: now,
      });
    }
  }

  if (attacker.lifesteal > 0 && attacker.hp > 0 && totalDealt > 0) {
    const drain = Math.max(1, Math.round((totalDealt * attacker.lifesteal) / 100));
    applyHealing(
      state,
      attacker,
      drain,
      attacker.uniqueEffects.includes('crimson_chalice'),
      false,
      attacker,
    );
  }

  if (
    defender.uniqueEffects.includes('dragonscale_thorns') &&
    attacker.hp > 0 &&
    totalDealt > 0
  ) {
    const reflect = Math.max(1, Math.round(totalDealt * 0.18));
    attacker.hp = Math.max(0, attacker.hp - reflect);
    state.floatingTexts.push({
      id: nextEffectId(),
      targetUid: attacker.uid,
      text: `反射${reflect}`,
      color: '#ff964f',
      createdAt: now,
    });
  }

  // Boss Gimmick: Rune Golem reflects 14% damage while barrier absorbed damage
  if (
    !defender.isAlly &&
    defender.speciesId === 'rune_golem' &&
    absorbed > 0 &&
    attacker.isAlly &&
    attacker.hp > 0
  ) {
    const reflect = Math.max(2, Math.round(totalDealt * 0.14));
    attacker.hp = Math.max(1, attacker.hp - reflect);
    state.floatingTexts.push({
      id: nextEffectId(),
      targetUid: attacker.uid,
      text: `障壁反射${reflect}`,
      color: '#7ce8ff',
      createdAt: now,
    });
  }

  if (
    defender.uniqueEffects.includes('glacier_plate') &&
    !attacker.isAlly &&
    attacker.hp > 0 &&
    totalDealt > 0
  ) {
    applyStatusEffect(state, attacker, 'freeze', 0.18, 1);
  }

  return totalDealt;
}

function calcDamageNumber(
  attacker: BattleUnitState,
  defender: BattleUnitState,
  power: number,
  statScale: 'atk' | 'mag' | 'def' | 'hybrid',
  element: ElementType,
  isSkill: boolean,
  isAoE: boolean,
  critBonus = 0,
  bossBonus = 1,
  statusBonus = 1,
): { amount: number; isCrit: boolean; isWeak: boolean } {
  const atkBuff = (attacker.atkBuffTurns > 0 ? 1.24 : 1) * (attacker.enraged ? 1.28 : 1);
  const defBuff = defender.defBuffTurns > 0 ? 1.26 : 1;

  let offense: number;
  if (statScale === 'mag') offense = attacker.mag * atkBuff;
  else if (statScale === 'def') offense = attacker.def * (attacker.defBuffTurns > 0 ? 1.26 : 1);
  else if (statScale === 'hybrid') offense = (attacker.atk * 0.56 + attacker.mag * 0.56) * atkBuff;
  else offense = attacker.atk * atkBuff;

  const defBreakMult = defender.defBreakTurns > 0 ? 0.75 : 1;
  const armorPenMult = Math.max(0.25, 1 - attacker.armorPenPct / 100);
  const defense = defender.def * defBuff * defBreakMult * armorPenMult;
  const mitigation = 100 / (100 + defense * 1.18);
  let dmg = offense * power * (0.93 + Math.random() * 0.14) * mitigation;

  // Player offensive skill scaling
  if (attacker.isAlly && isSkill) {
    dmg *= 0.86;
  }

  // Boss offensive gimmicks
  if (!attacker.isAlly && attacker.isBoss) {
    if (attacker.speciesId === 'crimson_wyrm' && defender.burnTurns > 0) {
      dmg *= 1.2;
    }
    if (attacker.speciesId === 'glacier_leviathan' && defender.freezeTurns > 0) {
      dmg *= 1.25;
    }
    if (attacker.speciesId === 'abyss_kraken' && isTargetAfflicted(defender)) {
      dmg *= 1.22;
    }
    if (attacker.speciesId === 'asura_emperor') {
      const missingRatio = Math.max(0, 1 - attacker.hp / attacker.maxHp);
      dmg *= 1 + missingRatio * 0.45;
    }
  }

  if (attacker.burnTurns > 0) {
    dmg *= 0.88;
  }
  if (defender.freezeTurns > 0) {
    dmg *= 1.15;
  }

  if (isSkill && attacker.skillPowerBonusPct > 0) {
    dmg *= 1 + attacker.skillPowerBonusPct / 100;
  }
  if (bossBonus > 1 && (defender.isBoss || defender.isElite)) {
    dmg *= bossBonus;
  }
  if (isTargetAfflicted(defender)) {
    if (statusBonus > 1) dmg *= statusBonus;
    if (attacker.statusDmgBonusPct > 0) dmg *= 1 + attacker.statusDmgBonusPct / 100;
  }
  if (defender.freezeTurns > 0 && attacker.uniqueEffects.includes('frostbite_blade')) {
    dmg *= 1.16;
  }

  const isWeak = isElementalWeakness(element, defender.speciesId, defender.shiftElement);
  if (isWeak) {
    dmg *= 1.4 + attacker.weaknessBonusPct / 100;
  }

  if (attacker.uniqueEffects.includes('berserker_axe')) {
    const missingPct = Math.max(0, (1 - attacker.hp / attacker.maxHp) * 100);
    dmg *= 1 + missingPct * 0.006;
  }
  if (attacker.uniqueEffects.includes('giant_slayer_blade') && (defender.isBoss || defender.isElite)) {
    dmg *= 1.22;
  }
  if (isSkill && isAoE && attacker.uniqueEffects.includes('meteor_scepter')) {
    dmg *= 1.16;
  }
  if (attacker.uniqueEffects.includes('blazing_cloak') && attacker.hp / attacker.maxHp >= 0.5) {
    dmg *= 1.1;
  }
  if (attacker.uniqueEffects.includes('titan_gauntlet_relic') && statScale === 'atk') {
    dmg *= 1.14;
  }
  if (attacker.uniqueEffects.includes('overdrive_rune')) {
    dmg *= 1.12;
  }
  if (isSkill && attacker.uniqueEffects.includes('chronos_hourglass')) {
    dmg *= 1.09;
  }
  if (
    isSkill &&
    attacker.uniqueEffects.includes('sun_king_staff') &&
    (statScale === 'mag' || statScale === 'hybrid')
  ) {
    dmg *= 1.15;
  }
  if (element === 'holy' && attacker.uniqueEffects.includes('seraph_lance')) {
    dmg *= 1.16;
  }
  if (isSkill && attacker.activeSetIds4pc.includes('astral_mage')) {
    dmg *= 1.14;
  }
  if (statScale === 'atk' && attacker.activeSetIds4pc.includes('lunar_blade')) {
    dmg *= 1.1;
  }

  let extraCrit = critBonus;
  if (attacker.activeSetIds4pc.includes('blood_pact') && attacker.hp / attacker.maxHp <= 0.5) {
    dmg *= 1.18;
    extraCrit += 8;
  }
  if (isSkill && isAoE && attacker.uniqueEffects.includes('meteor_scepter')) {
    extraCrit += 6;
  }

  const critChance = Math.min(96, attacker.critRate + extraCrit);
  const isCrit = Math.random() * 100 < critChance;
  if (isCrit) {
    dmg *= attacker.critDmg / 100;
  }

  return { amount: Math.max(1, Math.round(dmg)), isCrit, isWeak };
}

function triggerBossTurnGimmick(state: BattleState, boss: BattleUnitState): void {
  if (boss.isAlly || !boss.isBoss || boss.hp <= 0) return;
  const g = getBossGimmick(boss.speciesId);
  if (!g) return;
  const turnNo = (boss.bossTurnCount ?? 0) + 1;
  boss.bossTurnCount = turnNo;
  const livingAllies = state.allies.filter((a) => a.hp > 0);
  const now = Date.now();

  switch (boss.speciesId) {
    case 'ancient_treant': {
      if (boss.hp < boss.maxHp) {
        const heal = Math.max(5, Math.round(boss.maxHp * 0.04));
        applyHealing(state, boss, heal, false, false);
      }
      break;
    }
    case 'rune_golem': {
      if (turnNo % 2 === 1) {
        const sh = Math.round(boss.maxHp * 0.12);
        boss.shield = Math.min(Math.round(boss.maxHp * 0.3), boss.shield + sh);
        state.logs.push(`⚙ ${boss.name}の魔導障壁・盾+${sh}`);
        state.vfx.push({ id: nextEffectId(), targetUid: boss.uid, element: 'shield', createdAt: now });
      }
      break;
    }
    case 'crimson_wyrm': {
      let hit = false;
      for (const a of livingAllies) {
        if (applyStatusEffect(state, a, 'burn', 0.25, 2)) hit = true;
      }
      if (hit) state.logs.push(`🔥 ${boss.name}の灼熱鱗が火傷を撒く`);
      break;
    }
    case 'star_devourer': {
      boss.atkBuffTurns = Math.max(boss.atkBuffTurns, 2);
      state.floatingTexts.push({
        id: nextEffectId(),
        targetUid: boss.uid,
        text: '虚無増幅',
        color: '#b48cff',
        createdAt: now,
      });
      break;
    }
    case 'glacier_leviathan': {
      if (turnNo % 2 === 0) {
        let froze = false;
        for (const a of livingAllies) {
          if (applyStatusEffect(state, a, 'freeze', 0.25, 1)) froze = true;
        }
        state.logs.push(
          froze ? `❄ ${boss.name}の絶対零度波で凍結発生` : `❄ ${boss.name}が絶対零度波を放った`,
        );
      }
      break;
    }
    case 'seraph_omega': {
      if (turnNo % 3 === 0) {
        boss.poisonTurns = 0;
        boss.burnTurns = 0;
        boss.defBreakTurns = 0;
        const sh = Math.round(boss.maxHp * 0.1);
        boss.shield = Math.min(Math.round(boss.maxHp * 0.3), boss.shield + sh);
        for (const a of livingAllies) {
          applyStatusEffect(state, a, 'def_break', 0.45, 2);
        }
        state.logs.push(`✨ ${boss.name}の聖光審判・異常浄化＆全体防低下`);
      }
      break;
    }
    case 'abyss_kraken': {
      let afflicted = false;
      for (const a of livingAllies) {
        if (applyStatusEffect(state, a, 'poison', 0.3, 3)) afflicted = true;
        if (applyStatusEffect(state, a, 'def_break', 0.25, 2)) afflicted = true;
      }
      if (afflicted) state.logs.push(`🐙 ${boss.name}の墨汁呪縛がパーティを蝕む`);
      break;
    }
    case 'chronos_mantis': {
      boss.spd += 4;
      state.floatingTexts.push({
        id: nextEffectId(),
        targetUid: boss.uid,
        text: '時空加速',
        color: '#7ce8ff',
        createdAt: now,
      });
      break;
    }
    case 'asura_emperor': {
      if (turnNo % 2 === 1) {
        boss.atkBuffTurns = Math.max(boss.atkBuffTurns, 3);
        state.logs.push(`⚔ ${boss.name}の修羅闘気が高まる`);
      }
      break;
    }
    case 'genesis_orrery': {
      const nextElem = SHIFT_ELEMENTS[turnNo % SHIFT_ELEMENTS.length]!;
      boss.shiftElement = nextElem;
      if (turnNo % 2 === 0) {
        const sh = Math.round(boss.maxHp * 0.12);
        boss.shield = Math.min(Math.round(boss.maxHp * 0.32), boss.shield + sh);
      }
      state.logs.push(`🌌 ${boss.name}の万象反転・属性シフト発動`);
      state.vfx.push({ id: nextEffectId(), targetUid: boss.uid, element: nextElem, createdAt: now });
      break;
    }
  }
}

function startUnitTurnPassives(state: BattleState, actor: BattleUnitState): void {
  actor.defending = false;
  if (actor.atkBuffTurns > 0) actor.atkBuffTurns -= 1;
  if (actor.defBuffTurns > 0) actor.defBuffTurns -= 1;
  if (actor.defBreakTurns > 0) actor.defBreakTurns -= 1;

  if (actor.poisonTurns > 0 && actor.hp > 0) {
    actor.poisonTurns -= 1;
    const dot = Math.max(2, Math.round(actor.maxHp * 0.06));
    actor.hp = Math.max(1, actor.hp - dot);
    state.floatingTexts.push({
      id: nextEffectId(),
      targetUid: actor.uid,
      text: `☠-${dot}`,
      color: '#c975ff',
      createdAt: Date.now(),
    });
  }

  if (actor.burnTurns > 0 && actor.hp > 0) {
    actor.burnTurns -= 1;
    const dot = Math.max(2, Math.round(actor.maxHp * 0.05));
    actor.hp = Math.max(1, actor.hp - dot);
    state.floatingTexts.push({
      id: nextEffectId(),
      targetUid: actor.uid,
      text: `🔥-${dot}`,
      color: '#ff8a47',
      createdAt: Date.now(),
    });
  }

  if (actor.isAlly) {
    let mpGain = 4 + actor.mpRegenBonus;
    if (actor.uniqueEffects.includes('sage_star_rune')) mpGain += 6;
    if (actor.uniqueEffects.includes('starlight_mantle')) mpGain += 4;
    if (actor.activeSetIds4pc.includes('astral_mage')) mpGain += 4;
    actor.mp = Math.min(actor.maxMp, actor.mp + mpGain);
  }

  if (actor.uniqueEffects.includes('overdrive_rune') && actor.hp > 1) {
    const cost = Math.max(1, Math.round(actor.maxHp * 0.06));
    actor.hp = Math.max(1, actor.hp - cost);
  }

  let totalRegenPct = actor.regenPct;
  if (actor.uniqueEffects.includes('world_tree_armor')) {
    totalRegenPct += 5;
  }
  if (totalRegenPct > 0 && actor.hp > 0 && actor.hp < actor.maxHp) {
    const amt = Math.max(1, Math.round((actor.maxHp * totalRegenPct) / 100));
    applyHealing(state, actor, amt, actor.uniqueEffects.includes('crimson_chalice'), false, actor);
  }

  triggerBossTurnGimmick(state, actor);
}

export type PlayerActionCommand =
  | { type: 'attack'; targetUid?: string }
  | { type: 'skill'; skillIndex: 0 | 1; targetUid?: string }
  | { type: 'defend' }
  | { type: 'flee' }
  | { type: 'limit_break' }
  | { type: 'use_hp_potion' }
  | { type: 'use_mp_potion' }
  | { type: 'enemy_charge' }
  | { type: 'enemy_ultimate' };

export function chooseAutoAction(
  state: BattleState,
  actor: BattleUnitState,
  tactic: BattleTactic,
): PlayerActionCommand {
  const livingEnemies = state.enemies.filter((e) => e.hp > 0);
  const livingAllies = state.allies.filter((a) => a.hp > 0);
  if (livingEnemies.length === 0) return { type: 'attack' };

  const anyCharging = livingEnemies.some((e) => e.charging);

  // Auto-fire Limit Break immediately when 100% AND (enemy charging OR boss/elite battle)!
  if (state.limitGauge >= 100 && (anyCharging || state.isBossBattle || state.isEliteBattle)) {
    return { type: 'limit_break' };
  }

  const targetEnemy =
    livingEnemies.find((e) => e.charging) ??
    livingEnemies.find((e) => e.isBoss) ??
    [...livingEnemies].sort((a, b) => a.hp - b.hp)[0]!;

  if (anyCharging && tactic !== 'allout') {
    for (const idx of [0, 1] as const) {
      const sk = actor.skills[idx];
      if ((sk.kind === 'shield' || sk.kind === 'buff_def') && actor.mp >= getSkillMpCost(actor, sk)) {
        return { type: 'skill', skillIndex: idx };
      }
    }
    if (actor.hp / actor.maxHp < 0.85 && actor.shield < actor.maxHp * 0.2) {
      return { type: 'defend' };
    }
  }

  if (tactic === 'conserve') {
    const injured = livingAllies.some((a) => a.hp / a.maxHp < 0.65);
    if (injured) {
      for (const idx of [0, 1] as const) {
        const sk = actor.skills[idx];
        if (sk.kind === 'heal' && actor.mp >= getSkillMpCost(actor, sk)) {
          return { type: 'skill', skillIndex: idx };
        }
      }
    }
    return { type: 'attack', targetUid: targetEnemy.uid };
  }

  const avgHpRatio =
    livingAllies.reduce((s, a) => s + a.hp / a.maxHp, 0) / Math.max(1, livingAllies.length);
  const anyoneLow = livingAllies.some((a) => a.hp / a.maxHp < 0.68);

  for (const idx of [0, 1] as const) {
    const sk = actor.skills[idx];
    if (sk.kind === 'heal' && (anyoneLow || avgHpRatio < 0.78) && actor.mp >= getSkillMpCost(actor, sk)) {
      return { type: 'skill', skillIndex: idx };
    }
  }

  for (const idx of [0, 1] as const) {
    const sk = actor.skills[idx];
    const cost = getSkillMpCost(actor, sk);
    if (actor.mp < cost) continue;
    if (sk.kind === 'shield' && livingAllies.every((a) => a.shield === 0)) {
      return { type: 'skill', skillIndex: idx };
    }
    if (sk.kind === 'buff_atk' && actor.atkBuffTurns === 0) {
      if (tactic === 'allout' || state.isBossBattle || state.isEliteBattle) {
        return { type: 'skill', skillIndex: idx };
      }
    }
    if (sk.kind === 'buff_def' && actor.defBuffTurns === 0 && (state.isBossBattle || state.isEliteBattle)) {
      return { type: 'skill', skillIndex: idx };
    }
  }

  const canUseOffensive =
    tactic === 'allout' ||
    state.isBossBattle ||
    state.isEliteBattle ||
    state.isRareBattle ||
    actor.mp >= actor.maxMp * 0.35;

  if (canUseOffensive) {
    const candidates = ([0, 1] as const)
      .map((idx) => ({ idx, sk: actor.skills[idx], cost: getSkillMpCost(actor, actor.skills[idx]) }))
      .filter((c) => (c.sk.kind === 'damage' || c.sk.kind === 'drain') && actor.mp >= c.cost);

    if (candidates.length > 0) {
      candidates.sort((a, b) => {
        const aWeak = isElementalWeakness(a.sk.element, targetEnemy.speciesId, targetEnemy.shiftElement) ? 1.45 : 1;
        const bWeak = isElementalWeakness(b.sk.element, targetEnemy.speciesId, targetEnemy.shiftElement) ? 1.45 : 1;
        const aScore =
          (a.sk.target === 'all_enemies' && livingEnemies.length >= 2
            ? a.sk.power * livingEnemies.length * 0.85
            : a.sk.power * (a.sk.hits ?? 1)) * aWeak;
        const bScore =
          (b.sk.target === 'all_enemies' && livingEnemies.length >= 2
            ? b.sk.power * livingEnemies.length * 0.85
            : b.sk.power * (b.sk.hits ?? 1)) * bWeak;
        return bScore - aScore;
      });
      return { type: 'skill', skillIndex: candidates[0]!.idx, targetUid: targetEnemy.uid };
    }
  }

  return { type: 'attack', targetUid: targetEnemy.uid };
}

function chooseEnemyAction(state: BattleState, actor: BattleUnitState): PlayerActionCommand {
  const livingAllies = state.allies.filter((a) => a.hp > 0);
  if (livingAllies.length === 0) return { type: 'attack' };

  if (actor.charging) {
    return { type: 'enemy_ultimate' };
  }

  if ((actor.isBoss && state.turn % 3 === 2) || (actor.isElite && state.turn >= 2 && Math.random() < 0.28)) {
    return { type: 'enemy_charge' };
  }

  const target =
    Math.random() < 0.4
      ? [...livingAllies].sort((a, b) => a.hp - b.hp)[0]!
      : livingAllies[Math.floor(Math.random() * livingAllies.length)]!;

  const skillChance = actor.isBoss ? 0.68 : actor.isElite ? 0.55 : 0.4;
  if (Math.random() < skillChance) {
    const offensiveIdx = ([0, 1] as const).filter(
      (i) => actor.skills[i].kind === 'damage' || actor.skills[i].kind === 'drain',
    );
    if (offensiveIdx.length > 0) {
      const pickIdx = offensiveIdx[Math.floor(Math.random() * offensiveIdx.length)]!;
      return { type: 'skill', skillIndex: pickIdx, targetUid: target.uid };
    }
  }
  return { type: 'attack', targetUid: target.uid };
}

export function executeTurnAction(
  prev: BattleState,
  action: PlayerActionCommand,
): BattleState {
  const now = Date.now();
  const state: BattleState = {
    ...prev,
    allies: prev.allies.map((u) => ({ ...u })),
    enemies: prev.enemies.map((u) => ({ ...u })),
    turnQueue: [...prev.turnQueue],
    logs: [...prev.logs].slice(-12),
    floatingTexts: prev.floatingTexts.filter((f) => now - f.createdAt < scaleVisualMs(1100)),
    vfx: prev.vfx.filter((v) => now - v.createdAt < scaleVisualMs(700)),
    activeCinematic:
      prev.activeCinematic && now - prev.activeCinematic.startedAt < prev.activeCinematic.durationMs
        ? prev.activeCinematic
        : undefined,
  };

  // ===== SWIFT FREE ACTIONS: POTIONS & LIMIT BREAK (Do NOT consume actor's turn!) =====
  if (action.type === 'use_hp_potion') {
    if (state.activeTrials.includes('no_potions') || state.hpPotions <= 0) return prev;
    state.hpPotions -= 1;
    for (const a of state.allies) {
      if (a.hp > 0) {
        applyHealing(state, a, Math.round(a.maxHp * 0.24), false, true);
      }
    }
    state.logs.push(`🧪 回復の秘薬で全員回復・残${state.hpPotions}`);
    return state;
  }

  if (action.type === 'use_mp_potion') {
    if (state.activeTrials.includes('no_potions') || state.mpPotions <= 0) return prev;
    state.mpPotions -= 1;
    for (const a of state.allies) {
      if (a.hp > 0) {
        const gain = Math.max(8, Math.round(a.maxMp * 0.25));
        a.mp = Math.min(a.maxMp, a.mp + gain);
        state.floatingTexts.push({
          id: nextEffectId(),
          targetUid: a.uid,
          text: `MP+${gain}`,
          color: '#73d6ff',
          createdAt: now,
        });
        state.vfx.push({
          id: nextEffectId(),
          targetUid: a.uid,
          element: 'buff',
          createdAt: now,
        });
      }
    }
    state.logs.push(`💧 魔力の霊薬で全員MP回復・残${state.mpPotions}`);
    return state;
  }

  if (action.type === 'limit_break') {
    if (state.limitGauge < 100) return prev;
    state.limitGauge = 0;
    state.shakeUntilMs = now + scaleVisualMs(460);
    const livingAllies = state.allies.filter((a) => a.hp > 0);
    const livingEnemies = state.enemies.filter((e) => e.hp > 0);
    const enemyUids = livingEnemies.map((e) => e.uid);
    const totalPower = livingAllies.reduce((sum, a) => sum + Math.max(a.atk, a.mag), 0);

    for (const a of livingAllies) {
      a.lungeUntilMs = now + scaleVisualMs(420);
      a.activeMotion = {
        speciesId: a.speciesId,
        skillId: 'limit_break',
        kind: 'limit_break',
        element: 'holy',
        isAoE: true,
        targetUids: enemyUids,
        startedAt: now,
        durationMs: scaleVisualMs(680),
      };
      applyHealing(state, a, Math.round(a.maxHp * 0.18), false, true);
      a.shield = Math.min(Math.round(a.maxHp * 0.55), a.shield + Math.round(a.maxHp * 0.12));
    }

    let totalDmg = 0;
    let brokeCount = 0;
    const leadAlly = livingAllies[0] ?? state.allies[0]!;
    const lbVfxMeta: VfxMeta = {
      attackerUid: leadAlly.uid,
      speciesId: leadAlly.speciesId,
      skillId: 'limit_break',
    };
    state.activeCinematic = {
      id: nextEffectId(),
      title: 'ルーンユニゾン',
      actorUid: leadAlly.uid,
      speciesId: leadAlly.speciesId,
      skillId: 'limit_break',
      targetUids: enemyUids,
      element: 'holy',
      startedAt: now,
      durationMs: scaleVisualMs(680),
    };
    for (const e of livingEnemies) {
      if (e.charging) {
        e.charging = false;
        brokeCount += 1;
        state.floatingTexts.push({
          id: nextEffectId(),
          targetUid: e.uid,
          text: 'BREAK!!',
          color: '#7ce8ff',
          isCrit: true,
          createdAt: now,
        });
      }
      const mitigation = 100 / (100 + e.def * 0.8);
      const raw = totalPower * 1.48 * mitigation;
      totalDmg += applyDamage(state, leadAlly, e, raw, 'limit_break', true, false, lbVfxMeta);
    }

    state.logs.push(
      `⚡ ルーンユニゾン発動・計${totalDmg}ダメージ${brokeCount > 0 ? '・大技ブレイク' : ''}`,
    );

    if (state.enemies.every((e) => e.hp <= 0)) {
      state.phase = 'victory';
      state.activeUid = null;
      state.logs.push('魔物の群れを一掃した');
    }
    return state;
  }

  const actor = findBattleUnit(state, state.activeUid);
  if (!actor || actor.hp <= 0) {
    advanceToNextActor(state);
    return state;
  }

  const foes = actor.isAlly ? state.enemies : state.allies;
  const friends = actor.isAlly ? state.allies : state.enemies;
  const livingFoes = foes.filter((f) => f.hp > 0);
  const livingFriends = friends.filter((f) => f.hp > 0);

  if (action.type === 'flee' && actor.isAlly) {
    if (state.isBossBattle) {
      state.logs.push('ボス戦からは逃げられない');
      advanceToNextActor(state);
      return state;
    }
    state.logs.push('戦闘から撤退した');
    state.phase = 'fled';
    state.activeUid = null;
    return state;
  }

  if (action.type === 'defend') {
    const actorElem = actor.shiftElement ?? getSpecies(actor.speciesId).element;
    actor.defending = true;
    actor.poisonTurns = 0;
    actor.burnTurns = 0;
    actor.mp = Math.min(actor.maxMp, actor.mp + 10);
    actor.activeMotion = {
      speciesId: actor.speciesId,
      skillId: 'defend',
      kind: 'defend',
      element: actorElem,
      targetUids: [actor.uid],
      startedAt: now,
      durationMs: scaleVisualMs(360),
    };
    if (actor.isAlly) addLimitGauge(state, 14);
    state.logs.push(`${actor.name}は身を固めた`);
    state.vfx.push({
      id: nextEffectId(),
      targetUid: actor.uid,
      attackerUid: actor.uid,
      speciesId: actor.speciesId,
      skillId: 'defend',
      element: 'shield',
      createdAt: now,
    });
    advanceToNextActor(state);
    return state;
  }

  if (action.type === 'enemy_charge' && !actor.isAlly) {
    const actorElem = actor.shiftElement ?? getSpecies(actor.speciesId).element;
    actor.charging = true;
    actor.activeMotion = {
      speciesId: actor.speciesId,
      skillId: 'charge',
      kind: 'charge',
      element: actorElem,
      targetUids: [actor.uid],
      startedAt: now,
      durationMs: scaleVisualMs(440),
    };
    state.logs.push(`⚠ ${actor.name}が凄まじい魔力を溜めている`);
    state.floatingTexts.push({
      id: nextEffectId(),
      targetUid: actor.uid,
      text: '⚠大技溜め!',
      color: '#ff667a',
      isCrit: true,
      createdAt: now,
    });
    state.vfx.push({
      id: nextEffectId(),
      targetUid: actor.uid,
      attackerUid: actor.uid,
      speciesId: actor.speciesId,
      skillId: 'charge',
      element: 'buff',
      createdAt: now,
    });
    advanceToNextActor(state);
    return state;
  }

  if (action.type === 'enemy_ultimate' && !actor.isAlly) {
    actor.charging = false;
    actor.lungeUntilMs = now + scaleVisualMs(420);
    let totalDmg = 0;
    const elem = actor.shiftElement ?? getSpecies(actor.speciesId).element;
    const targetUids = livingFoes.map((t) => t.uid);
    const ultMeta: VfxMeta = {
      attackerUid: actor.uid,
      speciesId: actor.speciesId,
      skillId: 'enemy_ultimate',
    };
    actor.activeMotion = {
      speciesId: actor.speciesId,
      skillId: 'enemy_ultimate',
      kind: 'ultimate',
      element: elem,
      isAoE: true,
      targetUids,
      startedAt: now,
      durationMs: scaleVisualMs(640),
    };
    if (getSignatureStyle(actor.speciesId, 'enemy_ultimate')) {
      state.activeCinematic = {
        id: nextEffectId(),
        title: `${actor.name}・奥義`,
        actorUid: actor.uid,
        speciesId: actor.speciesId,
        skillId: 'enemy_ultimate',
        targetUids,
        element: elem,
        startedAt: now,
        durationMs: scaleVisualMs(680),
      };
    }
    for (const t of livingFoes) {
      const { amount, isCrit, isWeak } = calcDamageNumber(
        actor,
        t,
        2.4,
        'hybrid',
        elem,
        true,
        true,
        14,
      );
      totalDmg += applyDamage(state, actor, t, amount, 'ultimate', isCrit, isWeak, ultMeta);
      if (t.hp > 0) {
        if (elem === 'fire') {
          applyStatusEffect(state, t, 'burn', 0.45, 3);
        } else if (elem === 'star' || elem === 'holy') {
          applyStatusEffect(state, t, 'def_break', 0.4, 3);
        } else {
          applyStatusEffect(state, t, 'poison', 0.45, 3);
        }
      }
    }
    // Boss Gimmick: Chronos Mantis freezes 1 living ally (Time Stop) on ultimate
    if (actor.speciesId === 'chronos_mantis') {
      const targetFreeze = state.allies.find((a) => a.hp > 0);
      if (targetFreeze) {
        applyStatusEffect(state, targetFreeze, 'freeze', 1, 1);
      }
    }
    state.logs.push(`💥 ${actor.name}の奥義が炸裂・計${totalDmg}ダメージ`);
    if (state.allies.every((a) => a.hp <= 0)) {
      state.phase = 'defeat';
      state.activeUid = null;
      state.logs.push('パーティは全滅した');
      return state;
    }
    advanceToNextActor(state);
    return state;
  }

  actor.lungeUntilMs = now + scaleVisualMs(340);
  if (actor.isAlly) {
    addLimitGauge(state, 10);
  }

  if (action.type === 'attack') {
    const target = livingFoes.find((f) => f.uid === action.targetUid) ?? livingFoes[0];
    if (target) {
      const elem = actor.isAlly ? getSpecies(actor.speciesId).element : 'physical';
      const atkMeta: VfxMeta = {
        attackerUid: actor.uid,
        speciesId: actor.speciesId,
        skillId: 'basic_attack',
      };
      actor.activeMotion = {
        speciesId: actor.speciesId,
        skillId: 'basic_attack',
        kind: 'attack',
        element: elem,
        targetUids: [target.uid],
        startedAt: now,
        durationMs: scaleVisualMs(400),
      };
      const { amount, isCrit, isWeak } = calcDamageNumber(
        actor,
        target,
        1.0,
        'atk',
        elem,
        false,
        false,
      );
      const dealt = applyDamage(state, actor, target, amount, 'physical', isCrit, isWeak, atkMeta);
      state.logs.push(
        `${actor.name}の攻撃・${target.name}に${dealt}ダメージ${isWeak ? ' WEAK' : isCrit ? ' 会心' : ''}`,
      );

      if (target.hp > 0) {
        if (actor.uniqueEffects.includes('frostbite_blade')) {
          applyStatusEffect(state, target, 'freeze', 0.18, 1);
        }
        if (actor.activeSetIds4pc.includes('frost_monarch')) {
          applyStatusEffect(state, target, 'freeze', 0.16, 1);
        }
        if (actor.uniqueEffects.includes('eclipse_reaper_scythe')) {
          applyStatusEffect(state, target, 'def_break', 0.25, 3);
        }
      }

      if (actor.uniqueEffects.includes('sunblade_heal')) {
        for (const fr of livingFriends) {
          applyHealing(state, fr, Math.round(fr.maxHp * 0.02), false, false, actor);
        }
      }

      if (isCrit && actor.uniqueEffects.includes('echo_crit_rune') && target.hp > 0) {
        const echoDmg = Math.max(1, Math.round(amount * 0.26));
        const eDealt = applyDamage(state, actor, target, echoDmg, 'star', false);
        state.logs.push(`連撃ルーン・${eDealt}追撃`);
      }

      const extraChance =
        actor.doubleHit +
        (actor.uniqueEffects.includes('twin_fang_strike') ? 18 : 0) +
        (!actor.isAlly && actor.speciesId === 'asura_emperor' ? 30 : 0);
      if (target.hp > 0 && Math.random() * 100 < extraChance) {
        const extra = calcDamageNumber(actor, target, 0.68, 'atk', elem, false, false);
        const xDealt = applyDamage(
          state,
          actor,
          target,
          extra.amount,
          'physical',
          extra.isCrit,
          extra.isWeak,
          atkMeta,
        );
        state.logs.push(`${actor.name}の追撃・${target.name}に${xDealt}ダメージ`);
      }
    }
  } else if (action.type === 'skill') {
    const skill = actor.skills[action.skillIndex];
    const cost = actor.isAlly ? getSkillMpCost(actor, skill) : 0;
    if (actor.isAlly && actor.mp < cost) {
      return executeTurnAction(prev, { type: 'attack', targetUid: action.targetUid });
    }
    if (actor.isAlly) {
      actor.mp -= cost;
    }

    const isSignature = Boolean(getSignatureStyle(actor.speciesId, skill.id));
    const motionDuration = scaleVisualMs(isSignature ? 620 : 460);
    const skillVfxMeta: VfxMeta = {
      attackerUid: actor.uid,
      speciesId: actor.speciesId,
      skillId: skill.id,
    };

    const setSkillMotionAndCinematic = (targetUids: string[], isAoE: boolean) => {
      actor.activeMotion = {
        speciesId: actor.speciesId,
        skillId: skill.id,
        kind: skill.kind,
        element: skill.element,
        hits: skill.hits,
        isAoE,
        targetUids,
        startedAt: now,
        durationMs: motionDuration,
      };
      if (isSignature) {
        state.activeCinematic = {
          id: nextEffectId(),
          title: skill.name,
          actorUid: actor.uid,
          speciesId: actor.speciesId,
          skillId: skill.id,
          targetUids,
          element: skill.element,
          startedAt: now,
          durationMs: scaleVisualMs(640),
        };
      }
    };

    if (skill.kind === 'heal') {
      const targets =
        skill.target === 'all_allies'
          ? livingFriends
          : [
              [...livingFriends].sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0] ??
                actor,
            ];
      setSkillMotionAndCinematic(
        targets.map((t) => t.uid),
        skill.target === 'all_allies',
      );
      const baseHeal = Math.max(
        16,
        actor.mag * skill.power * (actor.isAlly ? 0.94 : 1.15) * (1 + actor.skillPowerBonusPct / 100),
      );
      for (const t of targets) {
        applyHealing(
          state,
          t,
          baseHeal * (0.94 + Math.random() * 0.12),
          actor.uniqueEffects.includes('crimson_chalice'),
          true,
          actor,
          skillVfxMeta,
        );
      }
      state.logs.push(`${actor.name}の「${skill.name}」・味方を回復`);
    } else if (skill.kind === 'shield') {
      const targets = skill.target === 'all_allies' ? livingFriends : [actor];
      setSkillMotionAndCinematic(
        targets.map((t) => t.uid),
        skill.target === 'all_allies',
      );
      const seraphMult = actor.activeSetIds4pc.includes('seraph_radiance') ? 1.14 : 1;
      const shieldAmt = Math.max(
        20,
        Math.round(
          actor.def *
            skill.power *
            (actor.isAlly ? 1.3 : 1.6) *
            (1 + actor.skillPowerBonusPct / 100) *
            seraphMult,
        ),
      );
      for (const t of targets) {
        t.shield = Math.min(Math.round(t.maxHp * 0.58), t.shield + shieldAmt);
        state.floatingTexts.push({
          id: nextEffectId(),
          targetUid: t.uid,
          text: `盾+${shieldAmt}`,
          color: '#73d6ff',
          createdAt: now,
        });
        state.vfx.push({
          id: nextEffectId(),
          targetUid: t.uid,
          element: 'shield',
          createdAt: now,
          ...skillVfxMeta,
        });
      }
      state.logs.push(`${actor.name}の「${skill.name}」・バリア展開`);
    } else if (skill.kind === 'buff_atk' || skill.kind === 'buff_def') {
      const targets = skill.target === 'all_allies' ? livingFriends : [actor];
      setSkillMotionAndCinematic(
        targets.map((t) => t.uid),
        skill.target === 'all_allies',
      );
      const seraphMult = actor.activeSetIds4pc.includes('seraph_radiance') ? 1.14 : 1;
      for (const t of targets) {
        if (skill.kind === 'buff_atk') {
          t.atkBuffTurns = 4;
          if (skill.power >= 0.85) {
            applyHealing(state, t, Math.round(actor.mag * skill.power * 0.62), false, true, actor);
          }
        } else {
          t.defBuffTurns = 4;
          const shieldAmt = Math.max(15, Math.round(actor.def * skill.power * 0.88 * seraphMult));
          t.shield = Math.min(Math.round(t.maxHp * 0.58), t.shield + shieldAmt);
        }
        state.floatingTexts.push({
          id: nextEffectId(),
          targetUid: t.uid,
          text: skill.kind === 'buff_atk' ? '火力UP!' : '防御UP!',
          color: '#ffd866',
          createdAt: now,
        });
        state.vfx.push({
          id: nextEffectId(),
          targetUid: t.uid,
          element: 'buff',
          createdAt: now,
          ...skillVfxMeta,
        });
      }
      state.logs.push(`${actor.name}の「${skill.name}」・味方を強化`);
    } else {
      const isAoE = skill.target === 'all_enemies';
      const targets = isAoE
        ? livingFoes
        : [livingFoes.find((f) => f.uid === action.targetUid) ?? livingFoes[0]!].filter(Boolean);
      setSkillMotionAndCinematic(
        targets.map((t) => t.uid),
        isAoE,
      );
      const hits = skill.hits ?? 1;
      let totalDmg = 0;
      let hadCrit = false;
      let hadWeak = false;

      for (const t of targets) {
        for (let h = 0; h < hits; h += 1) {
          if (t.hp <= 0) break;
          const { amount, isCrit, isWeak } = calcDamageNumber(
            actor,
            t,
            skill.power,
            skill.statScale,
            skill.element,
            true,
            isAoE,
            skill.critBonus ?? 0,
            skill.bossBonus ?? 1,
            skill.statusBonus ?? 1,
          );
          if (isCrit) hadCrit = true;
          if (isWeak) hadWeak = true;
          const dealt = applyDamage(state, actor, t, amount, skill.element, isCrit, isWeak, skillVfxMeta);
          totalDmg += dealt;

          if (t.hp > 0 && skill.statusEffect) {
            applyStatusEffect(
              state,
              t,
              skill.statusEffect.type,
              skill.statusEffect.chance,
              skill.statusEffect.turns,
            );
          } else if (!actor.isAlly && t.hp > 0 && Math.random() < 0.25) {
            applyStatusEffect(state, t, 'poison', 1, 3);
          }

          if (actor.isAlly && t.hp > 0) {
            if (actor.uniqueEffects.includes('frostbite_blade')) {
              applyStatusEffect(state, t, 'freeze', 0.18, 1);
            }
            if (actor.activeSetIds4pc.includes('frost_monarch')) {
              applyStatusEffect(state, t, 'freeze', 0.16, 1);
            }
            if (actor.uniqueEffects.includes('blizzard_rune')) {
              applyStatusEffect(state, t, 'freeze', 0.18, 1);
            }
            if (actor.uniqueEffects.includes('eclipse_reaper_scythe')) {
              applyStatusEffect(state, t, 'def_break', 0.25, 3);
            }
          }

          if (isCrit && actor.uniqueEffects.includes('echo_crit_rune') && t.hp > 0) {
            const echoDealt = applyDamage(
              state,
              actor,
              t,
              Math.max(1, Math.round(amount * 0.26)),
              'star',
              false,
            );
            totalDmg += echoDealt;
          }
        }
      }

      if (skill.kind === 'drain' && totalDmg > 0) {
        applyHealing(
          state,
          actor,
          Math.max(5, Math.round(totalDmg * 0.3)),
          actor.uniqueEffects.includes('crimson_chalice'),
          false,
          actor,
        );
      }
      if (actor.uniqueEffects.includes('sunblade_heal')) {
        for (const fr of livingFriends) {
          applyHealing(state, fr, Math.round(fr.maxHp * 0.02), false, false, actor);
        }
      }

      const skillFollowup =
        (actor.uniqueEffects.includes('twin_fang_strike') && skill.statScale === 'atk' && Math.random() < 0.18) ||
        (!actor.isAlly && actor.speciesId === 'asura_emperor' && Math.random() < 0.3);
      if (skillFollowup && targets[0] && targets[0].hp > 0) {
        const extra = calcDamageNumber(actor, targets[0], 0.68, 'atk', skill.element, false, false);
        const xDealt = applyDamage(
          state,
          actor,
          targets[0],
          extra.amount,
          'physical',
          extra.isCrit,
          extra.isWeak,
        );
        totalDmg += xDealt;
      }

      state.logs.push(
        `${actor.name}の「${skill.name}」・計${totalDmg}ダメージ${hadWeak ? ' WEAK' : hadCrit ? ' 会心' : ''}`,
      );
    }
  }

  if (state.enemies.every((e) => e.hp <= 0)) {
    state.phase = 'victory';
    state.activeUid = null;
    state.logs.push('魔物の群れを撃破した');
    return state;
  }
  if (state.allies.every((a) => a.hp <= 0)) {
    state.phase = 'defeat';
    state.activeUid = null;
    state.logs.push('パーティは全滅した');
    return state;
  }

  const doubleActChance =
    !actor.isAlly && actor.isBoss && actor.hp > 0 && action.type !== 'enemy_charge'
      ? actor.speciesId === 'chronos_mantis'
        ? actor.enraged
          ? 0.5
          : 0.35
        : actor.enraged
          ? 0.38
          : 0
      : 0;

  if (doubleActChance > 0 && Math.random() < doubleActChance) {
    state.turnQueue.unshift(actor.uid);
    state.logs.push(`🔥 ${actor.name}の2回行動`);
  }

  advanceToNextActor(state);
  return state;
}

function advanceToNextActor(state: BattleState): void {
  if (state.phase === 'victory' || state.phase === 'defeat' || state.phase === 'fled') {
    return;
  }

  let safety = 0;
  while (safety < 28) {
    safety += 1;
    if (state.turnQueue.length === 0) {
      state.turn += 1;
      rebuildTurnQueue(state);
    }
    const nextUid = state.turnQueue.shift() ?? null;
    const unit = findBattleUnit(state, nextUid);
    if (unit && unit.hp > 0) {
      startUnitTurnPassives(state, unit);
      if (unit.freezeTurns > 0) {
        unit.freezeTurns -= 1;
        state.logs.push(`❄ ${unit.name}は凍って動けない`);
        state.floatingTexts.push({
          id: nextEffectId(),
          targetUid: unit.uid,
          text: '❄凍結中',
          color: '#7ce8ff',
          createdAt: Date.now(),
        });
        continue;
      }
      state.activeUid = unit.uid;
      state.phase = unit.isAlly ? 'player_input' : 'animating';
      return;
    }
  }
}

export function stepEnemyOrAutoTurn(
  state: BattleState,
  autoBattle: boolean,
  tactic: BattleTactic,
): BattleState {
  const actor = findBattleUnit(state, state.activeUid);
  if (!actor || actor.hp <= 0) return state;
  if (!actor.isAlly) {
    const cmd = chooseEnemyAction(state, actor);
    return executeTurnAction(state, cmd);
  }
  if (autoBattle) {
    const cmd = chooseAutoAction(state, actor, tactic);
    return executeTurnAction(state, cmd);
  }
  return state;
}

export function resolveBattleVictory(
  save: GameSave,
  battle: BattleState,
  shrineBuffs?: ActiveShrineBuffs,
): { nextSave: GameSave; reward: BattleReward } {
  const tierMods = getActiveTierModifiers(battle.worldTier);
  const partyBonuses = getPartyAggregatedLootBonuses(save, shrineBuffs);

  const floorScale = 1 + (battle.floor - 1) * 0.36 + Math.pow(battle.floor, 1.32) * 0.09;
  const battleTypeMult = battle.bossRushWave
    ? 2.6 + battle.bossRushWave * 0.55
    : battle.isBossBattle
      ? 3.2
      : battle.isRareBattle
        ? 2.6
        : battle.isEliteBattle
          ? 1.8
          : 1.05;

  const exp = Math.max(
    20,
    Math.round(
      26 *
        battle.enemies.length *
        floorScale *
        battleTypeMult *
        tierMods.expMult *
        (1 + partyBonuses.expFind / 100),
    ),
  );
  const gold = Math.max(
    12,
    Math.round(
      17 *
        battle.enemies.length *
        floorScale *
        battleTypeMult *
        (battle.isRareBattle ? 1.8 : 1) *
        tierMods.goldMult *
        (1 + partyBonuses.goldFind / 100),
    ),
  );

  const rushBonusStones = battle.bossRushWave
    ? getBossRushWave(battle.bossRushWave).bonusStones
    : 0;
  const baseStones = battle.isRareBattle
    ? 11
    : battle.isBossBattle
      ? 8
      : battle.isEliteBattle
        ? 3
        : 1;
  const forgeStones = Math.max(
    1,
    Math.round(
      (baseStones + rushBonusStones + Math.floor(battle.floor / 5)) *
        (1 + (battle.worldTier - 1) * 0.38) *
        (1 + partyBonuses.stoneFind / 100),
    ),
  );

  const roster = { ...save.roster };
  const leveledUpIds: string[] = [];
  const benchLeveledUpIds: string[] = [];
  const activeAllyIds = new Set(battle.allies.map((a) => a.speciesId));

  for (const allyState of battle.allies) {
    const unitId = allyState.speciesId;
    const existing = roster[unitId];
    if (!existing) continue;

    const updated = {
      ...existing,
      hp: Math.max(1, allyState.hp),
      mp: Math.max(0, allyState.mp),
      exp: existing.exp + exp,
    };

    let leveled = false;
    while (updated.exp >= expForNextLevel(updated.level)) {
      updated.exp -= expForNextLevel(updated.level);
      updated.level += 1;
      leveled = true;
    }
    if (leveled) {
      leveledUpIds.push(unitId);
    }
    roster[unitId] = updated;
  }

  // Share 25% EXP with non-party bench monsters so roster members stay viable
  const benchExp = Math.max(1, Math.round(exp * 0.25));
  for (const [unitId, existing] of Object.entries(roster)) {
    if (unitId === 'hero' || activeAllyIds.has(unitId)) continue;
    const updated = {
      ...existing,
      exp: existing.exp + benchExp,
    };
    let leveled = false;
    while (updated.exp >= expForNextLevel(updated.level)) {
      updated.exp -= expForNextLevel(updated.level);
      updated.level += 1;
      leveled = true;
    }
    if (leveled) {
      benchLeveledUpIds.push(unitId);
    }
    roster[unitId] = updated;
  }

  // Strictly nerfed equipment drop counts
  const dropCount = battle.bossRushWave
    ? battle.bossRushWave >= BOSS_RUSH_MAX_WAVE
      ? 2
      : battle.bossRushWave >= 5
        ? 2
        : 1
    : battle.isBossBattle
      ? 2
      : battle.isRareBattle
        ? 1 + (Math.random() < 0.65 ? 1 : 0)
        : battle.isEliteBattle
          ? 1 + (Math.random() < 0.45 ? 1 : 0)
          : Math.random() < 0.42
            ? 1
            : 0;

  const keptItems: EquipmentItem[] = [];
  let autoProcessedCount = 0;
  let autoSoldGold = 0;
  let autoSalvagedStones = 0;
  let mythicsFound = 0;
  const discoveredUniques = new Set(save.discoveredUniques);
  const mode = save.settings.autoLootMode;

  for (let i = 0; i < dropCount; i += 1) {
    const forcedRarity =
      battle.bossRushWave === BOSS_RUSH_MAX_WAVE && i === 0
        ? ('mythic' as const)
        : undefined;
    const source = battle.isBossBattle
      ? 'boss'
      : battle.isRareBattle
        ? 'rare_enemy'
        : battle.isEliteBattle
          ? 'elite'
          : 'normal';
    const item = generateEquipment(
      battle.floor,
      battle.worldTier,
      partyBonuses.magicFind + (battle.bossRushWave ? battle.bossRushWave * 15 : 0),
      source,
      undefined,
      forcedRarity,
    );
    if (item.rarity === 'mythic') mythicsFound += 1;
    if (item.uniqueId) discoveredUniques.add(item.uniqueId);

    if (!item.uniqueId && shouldAutoSell(item.rarity, save.settings.autoSell)) {
      autoProcessedCount += 1;
      if (mode === 'salvage') {
        autoSalvagedStones += getSalvageValue(item);
      } else {
        autoSoldGold += item.sellValue;
      }
    } else {
      keptItems.push(item);
    }
  }

  const encounteredMonsters = new Set(save.encounteredMonsters ?? save.discoveredMonsters);
  const discoveredMonsters = new Set(save.discoveredMonsters);
  const recruited: BattleReward['recruited'] = [];
  const partyIds = [...save.partyIds];
  const heroLevel = roster.hero?.level ?? 1;

  const uniqueEnemySpecies = Array.from(new Set(battle.enemies.map((e) => e.speciesId)));
  for (const spId of uniqueEnemySpecies) {
    encounteredMonsters.add(spId);
    const sp = getSpecies(spId);
    const isAlreadyOwned = Boolean(roster[spId]);
    const chance = isAlreadyOwned ? sp.recruitRate * 0.35 : Math.min(0.65, sp.recruitRate * 1.1);

    if (Math.random() < chance) {
      discoveredMonsters.add(spId);
      if (!isAlreadyOwned) {
        const joinLevel = Math.max(1, heroLevel - 1);
        const newUnit = createUnitInstance(spId, joinLevel);
        roster[spId] = newUnit;
        if (partyIds.length < 4) {
          partyIds.push(spId);
        }
        recruited.push({ speciesId: spId, isNew: true, newAwakening: 0 });
      } else {
        const prevUnit = roster[spId]!;
        const nextAwakening = prevUnit.awakening + 1;
        roster[spId] = { ...prevUnit, awakening: nextAwakening };
        recruited.push({ speciesId: spId, isNew: false, newAwakening: nextAwakening });
      }
    }
  }

  let maxUnlockedTier = save.maxUnlockedTier;
  let worldTierUnlocked: number | null = null;
  if (
    !battle.bossRushWave &&
    battle.isBossBattle &&
    battle.floor >= 30 &&
    battle.worldTier >= save.maxUnlockedTier
  ) {
    maxUnlockedTier = save.maxUnlockedTier + 1;
    worldTierUnlocked = maxUnlockedTier;
  }

  const nextHighestByTier = battle.bossRushWave
    ? save.highestFloorByTier
    : {
        ...save.highestFloorByTier,
        [battle.worldTier]: Math.max(
          save.highestFloorByTier[battle.worldTier] ?? 1,
          battle.floor + (battle.isBossBattle ? 1 : 0),
        ),
      };

  const nextInventory = trimInventorySafely([...keptItems, ...save.inventory], roster);
  const nextBossRushBest = battle.bossRushWave
    ? Math.max(save.bossRushBestWave, battle.bossRushWave)
    : save.bossRushBestWave;

  const eliteKills = battle.enemies.filter((e) => e.isElite).length;
  const bossKills = battle.enemies.filter((e) => e.isBoss).length;
  const nextGuildQuests = applyBattleProgressToQuests(
    save.guildQuests,
    {
      kills: battle.enemies.length,
      elites: eliteKills,
      bosses: bossKills,
      biome: battle.biome,
      hasTrials: battle.activeTrials.length > 0,
      bossRushWave: battle.bossRushWave,
    },
    battle.worldTier,
  );

  const nextSave: GameSave = {
    ...save,
    gold: save.gold + gold + autoSoldGold,
    forgeStones: save.forgeStones + forgeStones + autoSalvagedStones,
    maxUnlockedTier,
    highestFloorByTier: nextHighestByTier,
    bossRushBestWave: nextBossRushBest,
    partyIds,
    roster,
    inventory: nextInventory,
    encounteredMonsters: Array.from(encounteredMonsters),
    discoveredMonsters: Array.from(discoveredMonsters),
    discoveredUniques: Array.from(discoveredUniques),
    guildQuests: nextGuildQuests,
    stats: {
      ...save.stats,
      totalKills: save.stats.totalKills + battle.enemies.length,
      totalBossKills: save.stats.totalBossKills + (battle.isBossBattle ? 1 : 0),
      totalItemsLooted: save.stats.totalItemsLooted + dropCount,
      totalMythicsFound: save.stats.totalMythicsFound + mythicsFound,
      highestFloorReached: battle.bossRushWave
        ? save.stats.highestFloorReached
        : Math.max(save.stats.highestFloorReached, battle.floor),
      bossRushClears:
        save.stats.bossRushClears + (battle.bossRushWave === BOSS_RUSH_MAX_WAVE ? 1 : 0),
      trialClears:
        save.stats.trialClears +
        (battle.isBossBattle && battle.activeTrials.length > 0 ? 1 : 0),
    },
  };

  for (const id of [
    ...leveledUpIds,
    ...benchLeveledUpIds,
    ...recruited.filter((r) => r.isNew).map((r) => r.speciesId),
  ]) {
    const u = nextSave.roster[id];
    if (u) {
      const st = computeUnitStats(u, nextSave, shrineBuffs);
      nextSave.roster[id] = { ...u, hp: st.maxHp, mp: st.maxMp };
    }
  }

  if (worldTierUnlocked) {
    battle.logs.push(`世界ランク Tier ${toRoman(worldTierUnlocked)} が解放された！`);
  }

  return {
    nextSave,
    reward: {
      exp,
      gold,
      forgeStones,
      items: keptItems,
      autoProcessedCount,
      autoProcessedMode: mode,
      autoSoldGold,
      autoSalvagedStones,
      recruited,
      leveledUpIds,
      benchLeveledUpIds,
      worldTierUnlocked,
      bossRushWaveCleared: battle.bossRushWave,
    },
  };
}
