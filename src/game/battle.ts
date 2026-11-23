import { getBiomeForFloor } from './data/biomes';
import { generateEquipment, RARITY_META } from './data/equipment';
import { getSpecies } from './data/monsters';
import { createUnitInstance } from './save';
import { computeUnitStats, expForNextLevel, getPartyAggregatedLootBonuses } from './stats';
import type {
  ActiveShrineBuffs,
  AutoSellThreshold,
  BattleReward,
  BattleState,
  BattleTactic,
  BattleUnitState,
  EquipmentItem,
  GameSave,
  MapEntity,
  Rarity,
  SkillDef,
} from './types';
import { getActiveTierModifiers, toRoman } from './worldTier';

let battleIdSeq = 1;
let effectSeq = 1;

function nextEffectId(): string {
  effectSeq += 1;
  return `fx_${effectSeq}_${Date.now().toString(36)}`;
}

export function shouldAutoSell(rarity: Rarity, threshold: AutoSellThreshold): boolean {
  if (threshold === 'none') return false;
  return RARITY_META[rarity].rank <= RARITY_META[threshold].rank;
}

export function createBattleState(
  save: GameSave,
  entity: MapEntity,
  floor: number,
  shrineBuffs?: ActiveShrineBuffs,
): BattleState {
  battleIdSeq += 1;
  const biome = getBiomeForFloor(floor);
  const tierMods = getActiveTierModifiers(save.worldTier);
  const invMap = new Map(save.inventory.map((it) => [it.id, it]));

  const allies: BattleUnitState[] = save.partyIds
    .map((id) => save.roster[id])
    .filter((u): u is NonNullable<typeof u> => Boolean(u))
    .map((u) => {
      const sp = getSpecies(u.speciesId);
      const st = computeUnitStats(u, save, shrineBuffs, invMap);
      const hp = Math.min(st.maxHp, Math.max(1, u.hp));
      const mp = Math.min(st.maxMp, Math.max(0, u.mp));
      const startShield = st.uniqueEffects.includes('golden_aegis')
        ? Math.round(st.maxHp * 0.25)
        : 0;
      const startSpd = st.uniqueEffects.includes('chronos_hourglass')
        ? Math.round(st.spd * 1.35)
        : st.spd;

      return {
        uid: `ally_${u.id}`,
        isAlly: true,
        speciesId: u.speciesId,
        name: sp.name,
        spriteKey: sp.spriteKey,
        level: u.level,
        isBoss: false,
        isElite: false,
        hp,
        maxHp: st.maxHp,
        mp,
        maxMp: st.maxMp,
        shield: startShield,
        atk: st.atk,
        mag: st.mag,
        def: st.def,
        spd: startSpd,
        critRate: st.critRate,
        critDmg: st.critDmg,
        lifesteal: st.lifesteal,
        doubleHit: st.doubleHit,
        regenPct: st.regenPct,
        uniqueEffects: st.uniqueEffects,
        defending: false,
        atkBuffTurns: 0,
        defBuffTurns: 0,
        phoenixUsed: false,
        skills: sp.skills,
        lungeTimer: 0,
        hurtTimer: 0,
      };
    });

  const isBossBattle = entity.kind === 'boss';
  const isEliteBattle = entity.kind === 'elite';
  const speciesIds = entity.speciesIds && entity.speciesIds.length > 0 ? entity.speciesIds : ['leaf_slime'];

  // Enemy floor scaling curve: smooth early game, thrilling deep endless + World Tier curve
  const floorLevel = Math.max(1, Math.round(floor * 1.15 + (save.worldTier - 1) * 18));
  const floorMult = Math.pow(1.095, Math.max(0, floor - 1));

  const enemies: BattleUnitState[] = speciesIds.map((spId, idx) => {
    const sp = getSpecies(spId);
    const isBossUnit = sp.isBoss || (isBossBattle && idx === 0);
    const isEliteUnit = !isBossUnit && isEliteBattle && idx === 0;

    const hpRoleMult = isBossUnit ? 2.65 : isEliteUnit ? 1.55 : 0.88;
    const atkRoleMult = isBossUnit ? 1.32 : isEliteUnit ? 1.18 : 0.92;
    const defRoleMult = isBossUnit ? 1.22 : isEliteUnit ? 1.12 : 0.85;

    const maxHp = Math.max(
      34,
      Math.round(
        (sp.baseStats.hp * 0.72 + sp.growth.hp * (floor - 1) * 0.65) *
          floorMult *
          hpRoleMult *
          tierMods.enemyHpMult,
      ),
    );
    const atk = Math.max(
      9,
      Math.round(
        (sp.baseStats.atk * 0.68 + sp.growth.atk * (floor - 1) * 0.52) *
          Math.pow(1.075, Math.max(0, floor - 1)) *
          atkRoleMult *
          tierMods.enemyAtkMult,
      ),
    );
    const mag = Math.max(
      9,
      Math.round(
        (sp.baseStats.mag * 0.68 + sp.growth.mag * (floor - 1) * 0.52) *
          Math.pow(1.075, Math.max(0, floor - 1)) *
          atkRoleMult *
          tierMods.enemyAtkMult,
      ),
    );
    const def = Math.max(
      4,
      Math.round(
        (sp.baseStats.def * 0.65 + sp.growth.def * (floor - 1) * 0.45) *
          Math.pow(1.06, Math.max(0, floor - 1)) *
          defRoleMult *
          tierMods.enemyDefMult,
      ),
    );
    const spd = Math.max(
      7,
      Math.round(sp.baseStats.spd * 0.85 + floor * 0.6 + (save.worldTier - 1) * 3),
    );

    return {
      uid: `enemy_${idx}_${spId}`,
      isAlly: false,
      speciesId: spId,
      name: isBossUnit ? `${sp.name}` : isEliteUnit ? `★${sp.name}` : sp.name,
      spriteKey: sp.spriteKey,
      level: floorLevel,
      isBoss: isBossUnit,
      isElite: isEliteUnit,
      hp: maxHp,
      maxHp,
      mp: 999,
      maxMp: 999,
      shield: 0,
      atk,
      mag,
      def,
      spd,
      critRate: isBossUnit ? 12 : isEliteUnit ? 9 : 5,
      critDmg: 145,
      lifesteal: 0,
      doubleHit: 0,
      regenPct: 0,
      uniqueEffects: [],
      defending: false,
      atkBuffTurns: 0,
      defBuffTurns: 0,
      phoenixUsed: false,
      skills: sp.skills,
      lungeTimer: 0,
      hurtTimer: 0,
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
    turn: 1,
    allies,
    enemies,
    turnQueue: [],
    activeUid: null,
    phase: 'animating',
    logs: [
      isBossBattle
        ? `階層ボス「${enemies.find((e) => e.isBoss)?.name ?? entity.name}」が立ちはだかった！`
        : isEliteBattle
          ? `黄金のオーラを纏う強敵の群れが現れた！`
          : `${enemies[0]?.name ?? '魔物'}たちが現れた！`,
    ],
    floatingTexts: [],
    vfx: [],
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
  if (
    actor.uniqueEffects.includes('sun_king_staff') &&
    (skill.statScale === 'mag' || skill.statScale === 'hybrid')
  ) {
    return Math.max(1, Math.round(skill.mpCost * 0.75));
  }
  return skill.mpCost;
}

function applyHealing(
  state: BattleState,
  target: BattleUnitState,
  amount: number,
  allowOverhealShield: boolean,
): number {
  if (target.hp <= 0) return 0;
  const actual = Math.max(1, Math.round(amount));
  const missing = target.maxHp - target.hp;
  const healed = Math.min(missing, actual);
  target.hp += healed;

  if (allowOverhealShield && actual > missing) {
    const overflow = Math.min(Math.round(target.maxHp * 0.4), actual - missing);
    target.shield = Math.min(Math.round(target.maxHp * 0.6), target.shield + overflow);
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
): number {
  if (defender.hp <= 0) return 0;
  let dmg = Math.max(1, Math.round(rawDamage));
  if (defender.defending) {
    dmg = Math.max(1, Math.round(dmg * 0.55));
  }

  // Absorb with shield first
  let absorbed = 0;
  if (defender.shield > 0) {
    absorbed = Math.min(defender.shield, dmg);
    defender.shield -= absorbed;
    dmg -= absorbed;
  }

  defender.hp = Math.max(0, defender.hp - dmg);
  defender.hurtTimer = 280;

  // Phoenix Ash Rune death prevention
  if (
    defender.hp === 0 &&
    defender.uniqueEffects.includes('phoenix_ash_rune') &&
    !defender.phoenixUsed
  ) {
    defender.phoenixUsed = true;
    defender.hp = Math.max(1, Math.round(defender.maxHp * 0.35));
    state.logs.push(`${defender.name}の不死鳥の灰ルーンが輝き、踏みとどまった！`);
    state.floatingTexts.push({
      id: nextEffectId(),
      targetUid: defender.uid,
      text: '復活!',
      color: '#ffcf5c',
      isCrit: true,
      createdAt: Date.now(),
    });
  }

  state.floatingTexts.push({
    id: nextEffectId(),
    targetUid: defender.uid,
    text: isCrit ? `${dmg + absorbed}!` : `${dmg + absorbed}`,
    color: isCrit ? '#ffe156' : defender.isAlly ? '#ff7c7c' : '#ffffff',
    isCrit,
    createdAt: Date.now(),
  });
  state.vfx.push({
    id: nextEffectId(),
    targetUid: defender.uid,
    element,
    createdAt: Date.now(),
  });

  // Lifesteal
  const totalDealt = dmg + absorbed;
  if (attacker.lifesteal > 0 && attacker.hp > 0 && totalDealt > 0) {
    const drain = Math.max(1, Math.round((totalDealt * attacker.lifesteal) / 100));
    applyHealing(
      state,
      attacker,
      drain,
      attacker.uniqueEffects.includes('crimson_chalice'),
    );
  }

  // Dragonscale Thorns reflection
  if (
    defender.uniqueEffects.includes('dragonscale_thorns') &&
    attacker.hp > 0 &&
    totalDealt > 0
  ) {
    const reflect = Math.max(1, Math.round(totalDealt * 0.35));
    attacker.hp = Math.max(0, attacker.hp - reflect);
    state.floatingTexts.push({
      id: nextEffectId(),
      targetUid: attacker.uid,
      text: `反射${reflect}`,
      color: '#ff964f',
      createdAt: Date.now(),
    });
  }

  return totalDealt;
}

function calcDamageNumber(
  attacker: BattleUnitState,
  defender: BattleUnitState,
  power: number,
  statScale: 'atk' | 'mag' | 'def' | 'hybrid',
  isSkill: boolean,
  critBonus = 0,
): { amount: number; isCrit: boolean } {
  const atkBuff = attacker.atkBuffTurns > 0 ? 1.3 : 1;
  const defBuff = defender.defBuffTurns > 0 ? 1.32 : 1;

  let offense: number;
  if (statScale === 'mag') offense = attacker.mag * atkBuff;
  else if (statScale === 'def') offense = attacker.def * (attacker.defBuffTurns > 0 ? 1.32 : 1);
  else if (statScale === 'hybrid') offense = (attacker.atk * 0.58 + attacker.mag * 0.58) * atkBuff;
  else offense = attacker.atk * atkBuff;

  const defense = defender.def * defBuff;
  const mitigation = 100 / (100 + defense * 1.15);
  let dmg = offense * power * (0.93 + Math.random() * 0.14) * mitigation;

  // Unique modifiers
  if (attacker.uniqueEffects.includes('berserker_axe')) {
    const missingPct = Math.max(0, (1 - attacker.hp / attacker.maxHp) * 100);
    dmg *= 1 + missingPct * 0.012;
  }
  if (isSkill && attacker.uniqueEffects.includes('chronos_hourglass')) {
    dmg *= 1.2;
  }
  if (
    isSkill &&
    attacker.uniqueEffects.includes('sun_king_staff') &&
    (statScale === 'mag' || statScale === 'hybrid')
  ) {
    dmg *= 1.35;
  }

  const critChance = Math.min(98, attacker.critRate + critBonus);
  const isCrit = Math.random() * 100 < critChance;
  if (isCrit) {
    dmg *= attacker.critDmg / 100;
  }

  return { amount: Math.max(1, Math.round(dmg)), isCrit };
}

function startUnitTurnPassives(state: BattleState, actor: BattleUnitState): void {
  actor.defending = false;
  if (actor.atkBuffTurns > 0) actor.atkBuffTurns -= 1;
  if (actor.defBuffTurns > 0) actor.defBuffTurns -= 1;

  // Natural MP recovery per turn
  const mpGain = actor.uniqueEffects.includes('sage_star_rune') ? 15 : 4;
  if (actor.isAlly) {
    actor.mp = Math.min(actor.maxMp, actor.mp + mpGain);
  }

  // HP Regen (passive + affixes + World Tree Armor)
  let totalRegenPct = actor.regenPct;
  if (actor.uniqueEffects.includes('world_tree_armor')) {
    totalRegenPct += 10;
  }
  if (totalRegenPct > 0 && actor.hp > 0 && actor.hp < actor.maxHp) {
    const amt = Math.max(1, Math.round((actor.maxHp * totalRegenPct) / 100));
    applyHealing(state, actor, amt, actor.uniqueEffects.includes('crimson_chalice'));
  }
}

export type PlayerActionCommand =
  | { type: 'attack'; targetUid?: string }
  | { type: 'skill'; skillIndex: 0 | 1; targetUid?: string }
  | { type: 'defend' }
  | { type: 'flee' };

export function chooseAutoAction(
  state: BattleState,
  actor: BattleUnitState,
  tactic: BattleTactic,
): PlayerActionCommand {
  const livingEnemies = state.enemies.filter((e) => e.hp > 0);
  const livingAllies = state.allies.filter((a) => a.hp > 0);
  if (livingEnemies.length === 0) return { type: 'attack' };

  const targetEnemy =
    livingEnemies.find((e) => e.isBoss) ??
    [...livingEnemies].sort((a, b) => a.hp - b.hp)[0]!;

  if (tactic === 'conserve') {
    // Only use healing if an ally is below 55% HP
    const injured = livingAllies.some((a) => a.hp / a.maxHp < 0.55);
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

  // Check urgent heal
  const avgHpRatio =
    livingAllies.reduce((s, a) => s + a.hp / a.maxHp, 0) / Math.max(1, livingAllies.length);
  const anyoneLow = livingAllies.some((a) => a.hp / a.maxHp < 0.62);

  for (const idx of [0, 1] as const) {
    const sk = actor.skills[idx];
    if (sk.kind === 'heal' && (anyoneLow || avgHpRatio < 0.72) && actor.mp >= getSkillMpCost(actor, sk)) {
      return { type: 'skill', skillIndex: idx };
    }
  }

  // Shield or Buff if allies lack buffs/shield
  for (const idx of [0, 1] as const) {
    const sk = actor.skills[idx];
    const cost = getSkillMpCost(actor, sk);
    if (actor.mp < cost) continue;
    if (sk.kind === 'shield' && livingAllies.every((a) => a.shield === 0)) {
      if (tactic === 'allout' || state.isBossBattle || state.isEliteBattle) {
        return { type: 'skill', skillIndex: idx };
      }
    }
    if (sk.kind === 'buff_atk' && actor.atkBuffTurns === 0) {
      if (tactic === 'allout' || state.isBossBattle) {
        return { type: 'skill', skillIndex: idx };
      }
    }
    if (sk.kind === 'buff_def' && actor.defBuffTurns === 0 && (state.isBossBattle || state.isEliteBattle)) {
      return { type: 'skill', skillIndex: idx };
    }
  }

  // Offensive skills
  const canUseOffensive =
    tactic === 'allout' ||
    state.isBossBattle ||
    state.isEliteBattle ||
    actor.mp >= actor.maxMp * 0.4;

  if (canUseOffensive) {
    // Prefer AoE when >= 2 enemies, single-target nuke otherwise
    const candidates = ([0, 1] as const)
      .map((idx) => ({ idx, sk: actor.skills[idx], cost: getSkillMpCost(actor, actor.skills[idx]) }))
      .filter((c) => (c.sk.kind === 'damage' || c.sk.kind === 'drain') && actor.mp >= c.cost);

    if (candidates.length > 0) {
      candidates.sort((a, b) => {
        const aScore =
          a.sk.target === 'all_enemies' && livingEnemies.length >= 2
            ? a.sk.power * livingEnemies.length * 0.85
            : a.sk.power * (a.sk.hits ?? 1);
        const bScore =
          b.sk.target === 'all_enemies' && livingEnemies.length >= 2
            ? b.sk.power * livingEnemies.length * 0.85
            : b.sk.power * (b.sk.hits ?? 1);
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

  // Prefer targeting tanks slightly more often
  const target = livingAllies[Math.floor(Math.random() * livingAllies.length)]!;
  const skillChance = actor.isBoss ? 0.55 : actor.isElite ? 0.42 : 0.28;

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
  // Shallow-clone state & units cleanly for immutable React updates
  const state: BattleState = {
    ...prev,
    allies: prev.allies.map((u) => ({ ...u, lungeTimer: 0, hurtTimer: 0 })),
    enemies: prev.enemies.map((u) => ({ ...u, lungeTimer: 0, hurtTimer: 0 })),
    turnQueue: [...prev.turnQueue],
    logs: [...prev.logs].slice(-12),
    floatingTexts: prev.floatingTexts.filter((f) => Date.now() - f.createdAt < 1100),
    vfx: prev.vfx.filter((v) => Date.now() - v.createdAt < 450),
  };

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
      state.logs.push('ボス戦からは逃げられない！');
      advanceToNextActor(state);
      return state;
    }
    state.logs.push('パーティは素早く撤退した！');
    state.phase = 'fled';
    state.activeUid = null;
    return state;
  }

  if (action.type === 'defend') {
    actor.defending = true;
    actor.mp = Math.min(actor.maxMp, actor.mp + 10);
    state.logs.push(`${actor.name}は身を固めてMPを回復した。`);
    state.vfx.push({
      id: nextEffectId(),
      targetUid: actor.uid,
      element: 'shield',
      createdAt: Date.now(),
    });
    advanceToNextActor(state);
    return state;
  }

  actor.lungeTimer = 260;

  if (action.type === 'attack') {
    const target =
      livingFoes.find((f) => f.uid === action.targetUid) ?? livingFoes[0];
    if (target) {
      const { amount, isCrit } = calcDamageNumber(actor, target, 1.0, 'atk', false);
      const dealt = applyDamage(state, actor, target, amount, 'physical', isCrit);
      state.logs.push(
        `${actor.name}の攻撃！${target.name}に${dealt}ダメージ${isCrit ? '（会心！）' : ''}`,
      );

      // Sunblade team heal
      if (actor.uniqueEffects.includes('sunblade_heal')) {
        for (const fr of livingFriends) {
          applyHealing(state, fr, Math.round(fr.maxHp * 0.04), false);
        }
      }

      // Echo Crit Rune guaranteed followup
      if (isCrit && actor.uniqueEffects.includes('echo_crit_rune') && target.hp > 0) {
        const echoDmg = Math.max(1, Math.round(amount * 0.5));
        const eDealt = applyDamage(state, actor, target, echoDmg, 'star', false);
        state.logs.push(`連撃ルーン発動！さらに${eDealt}追撃！`);
      }

      // Double hit / Twin Fang extra strike
      const extraChance =
        actor.doubleHit + (actor.uniqueEffects.includes('twin_fang_strike') ? 35 : 0);
      if (target.hp > 0 && Math.random() * 100 < extraChance) {
        const extra = calcDamageNumber(actor, target, 0.72, 'atk', false);
        const xDealt = applyDamage(state, actor, target, extra.amount, 'physical', extra.isCrit);
        state.logs.push(`${actor.name}の追撃！${target.name}に${xDealt}ダメージ！`);
      }
    }
  } else if (action.type === 'skill') {
    const skill = actor.skills[action.skillIndex];
    const cost = actor.isAlly ? getSkillMpCost(actor, skill) : 0;
    if (actor.isAlly && actor.mp < cost) {
      // Fallback to attack if out of MP
      return executeTurnAction(prev, { type: 'attack', targetUid: action.targetUid });
    }
    if (actor.isAlly) {
      actor.mp -= cost;
    }

    if (skill.kind === 'heal') {
      const targets =
        skill.target === 'all_allies'
          ? livingFriends
          : [
              [...livingFriends].sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0] ??
                actor,
            ];
      const baseHeal = Math.max(14, actor.mag * skill.power);
      for (const t of targets) {
        applyHealing(
          state,
          t,
          baseHeal * (0.94 + Math.random() * 0.12),
          actor.uniqueEffects.includes('crimson_chalice'),
        );
      }
      state.logs.push(`${actor.name}の「${skill.name}」！味方のHPが回復した！`);
    } else if (skill.kind === 'shield') {
      const targets = skill.target === 'all_allies' ? livingFriends : [actor];
      const shieldAmt = Math.max(18, Math.round(actor.def * skill.power * 1.45));
      for (const t of targets) {
        t.shield = Math.min(Math.round(t.maxHp * 0.75), t.shield + shieldAmt);
        state.floatingTexts.push({
          id: nextEffectId(),
          targetUid: t.uid,
          text: `盾+${shieldAmt}`,
          color: '#73d6ff',
          createdAt: Date.now(),
        });
        state.vfx.push({
          id: nextEffectId(),
          targetUid: t.uid,
          element: 'shield',
          createdAt: Date.now(),
        });
      }
      state.logs.push(`${actor.name}の「${skill.name}」！バリアを展開！`);
    } else if (skill.kind === 'buff_atk' || skill.kind === 'buff_def') {
      const targets = skill.target === 'all_allies' ? livingFriends : [actor];
      for (const t of targets) {
        if (skill.kind === 'buff_atk') {
          t.atkBuffTurns = 4;
          if (skill.power >= 0.85) {
            applyHealing(state, t, Math.round(actor.mag * skill.power * 0.65), false);
          }
        } else {
          t.defBuffTurns = 4;
          const shieldAmt = Math.max(12, Math.round(actor.def * skill.power * 0.9));
          t.shield = Math.min(Math.round(t.maxHp * 0.75), t.shield + shieldAmt);
        }
        state.floatingTexts.push({
          id: nextEffectId(),
          targetUid: t.uid,
          text: skill.kind === 'buff_atk' ? '火力UP!' : '防御UP!',
          color: '#ffd866',
          createdAt: Date.now(),
        });
        state.vfx.push({
          id: nextEffectId(),
          targetUid: t.uid,
          element: 'buff',
          createdAt: Date.now(),
        });
      }
      state.logs.push(`${actor.name}の「${skill.name}」！味方全体が強化された！`);
    } else {
      // Damage or Drain skill
      const targets =
        skill.target === 'all_enemies'
          ? livingFoes
          : [livingFoes.find((f) => f.uid === action.targetUid) ?? livingFoes[0]!].filter(Boolean);
      const hits = skill.hits ?? 1;
      let totalDmg = 0;
      let hadCrit = false;

      for (const t of targets) {
        for (let h = 0; h < hits; h += 1) {
          if (t.hp <= 0) break;
          const { amount, isCrit } = calcDamageNumber(
            actor,
            t,
            skill.power,
            skill.statScale,
            true,
            skill.critBonus ?? 0,
          );
          if (isCrit) hadCrit = true;
          const dealt = applyDamage(state, actor, t, amount, skill.element, isCrit);
          totalDmg += dealt;

          if (isCrit && actor.uniqueEffects.includes('echo_crit_rune') && t.hp > 0) {
            const echoDealt = applyDamage(
              state,
              actor,
              t,
              Math.max(1, Math.round(amount * 0.5)),
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
          Math.max(5, Math.round(totalDmg * 0.45)),
          actor.uniqueEffects.includes('crimson_chalice'),
        );
      }
      if (actor.uniqueEffects.includes('sunblade_heal')) {
        for (const fr of livingFriends) {
          applyHealing(state, fr, Math.round(fr.maxHp * 0.04), false);
        }
      }

      // Twin Fang trigger on physical skills
      if (
        actor.uniqueEffects.includes('twin_fang_strike') &&
        skill.statScale === 'atk' &&
        targets[0] &&
        targets[0].hp > 0 &&
        Math.random() < 0.35
      ) {
        const extra = calcDamageNumber(actor, targets[0], 0.75, 'atk', false);
        const xDealt = applyDamage(state, actor, targets[0], extra.amount, 'physical', extra.isCrit);
        totalDmg += xDealt;
      }

      state.logs.push(
        `${actor.name}の「${skill.name}」！計${totalDmg}ダメージ${hadCrit ? '（会心！）' : ''}`,
      );
    }
  }

  // Check Victory or Defeat
  if (state.enemies.every((e) => e.hp <= 0)) {
    state.phase = 'victory';
    state.activeUid = null;
    state.logs.push('魔物の群れを撃破した！');
    return state;
  }
  if (state.allies.every((a) => a.hp <= 0)) {
    state.phase = 'defeat';
    state.activeUid = null;
    state.logs.push('パーティは力尽きた…村へ帰還します。');
    return state;
  }

  advanceToNextActor(state);
  return state;
}

function advanceToNextActor(state: BattleState): void {
  if (state.phase === 'victory' || state.phase === 'defeat' || state.phase === 'fled') {
    return;
  }

  // Find next alive actor in queue
  let safety = 0;
  while (safety < 20) {
    safety += 1;
    if (state.turnQueue.length === 0) {
      state.turn += 1;
      rebuildTurnQueue(state);
    }
    const nextUid = state.turnQueue.shift() ?? null;
    const unit = findBattleUnit(state, nextUid);
    if (unit && unit.hp > 0) {
      startUnitTurnPassives(state, unit);
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

/**
 * Applies victory rewards to the save state immutably and returns both the updated GameSave
 * and a detailed BattleReward summary for the victory UI!
 */
export function resolveBattleVictory(
  save: GameSave,
  battle: BattleState,
  shrineBuffs?: ActiveShrineBuffs,
): { nextSave: GameSave; reward: BattleReward } {
  const tierMods = getActiveTierModifiers(battle.worldTier);
  const partyBonuses = getPartyAggregatedLootBonuses(save, shrineBuffs);

  const floorScale = 1 + (battle.floor - 1) * 0.32 + Math.pow(battle.floor, 1.28) * 0.08;
  const battleTypeMult = battle.isBossBattle ? 3.2 : battle.isEliteBattle ? 1.85 : 1.0;

  const exp = Math.max(
    18,
    Math.round(
      24 *
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
      18 *
        battle.enemies.length *
        floorScale *
        battleTypeMult *
        tierMods.goldMult *
        (1 + partyBonuses.goldFind / 100),
    ),
  );

  // Clone save pieces
  const roster = { ...save.roster };
  const leveledUpIds: string[] = [];

  // Sync post-battle HP/MP & apply EXP to active party
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

  // Generate Loot Drops!
  const dropCount = battle.isBossBattle
    ? 3
    : battle.isEliteBattle
      ? 2
      : Math.random() < 0.72
        ? 1
        : 0;

  const keptItems: EquipmentItem[] = [];
  let autoSoldCount = 0;
  let autoSoldGold = 0;
  let mythicsFound = 0;
  const discoveredUniques = new Set(save.discoveredUniques);

  for (let i = 0; i < dropCount; i += 1) {
    const source = battle.isBossBattle
      ? 'boss'
      : battle.isEliteBattle
        ? 'elite'
        : 'normal';
    const item = generateEquipment(
      battle.floor,
      battle.worldTier,
      partyBonuses.magicFind,
      source,
    );
    if (item.rarity === 'mythic') mythicsFound += 1;
    if (item.uniqueId) discoveredUniques.add(item.uniqueId);

    if (!item.uniqueId && shouldAutoSell(item.rarity, save.settings.autoSell)) {
      autoSoldCount += 1;
      autoSoldGold += item.sellValue;
    } else {
      keptItems.push(item);
    }
  }

  // Monster Recruitment rolls! (Simple, rewarding, never wasted!)
  const discoveredMonsters = new Set(save.discoveredMonsters);
  const recruited: BattleReward['recruited'] = [];
  const partyIds = [...save.partyIds];
  const heroLevel = roster.hero?.level ?? 1;

  // Deduplicate species in the defeated enemy pack so max 1 recruit roll per species per fight
  const uniqueEnemySpecies = Array.from(new Set(battle.enemies.map((e) => e.speciesId)));
  for (const spId of uniqueEnemySpecies) {
    const sp = getSpecies(spId);
    const isAlreadyOwned = Boolean(roster[spId]);
    // Generous recruit rate for undiscovered monsters so collection feels awesome!
    const chance = isAlreadyOwned ? sp.recruitRate * 0.45 : Math.min(0.85, sp.recruitRate * 1.45);

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

  // Check World Tier Unlock (Beating Floor 20+ Boss on your current highest unlocked tier!)
  let maxUnlockedTier = save.maxUnlockedTier;
  let worldTierUnlocked: number | null = null;
  if (
    battle.isBossBattle &&
    battle.floor >= 20 &&
    battle.worldTier >= save.maxUnlockedTier
  ) {
    maxUnlockedTier = save.maxUnlockedTier + 1;
    worldTierUnlocked = maxUnlockedTier;
  }

  const nextHighestByTier = {
    ...save.highestFloorByTier,
    [battle.worldTier]: Math.max(
      save.highestFloorByTier[battle.worldTier] ?? 1,
      battle.floor + (battle.isBossBattle ? 1 : 0),
    ),
  };

  const nextInventory = [...keptItems, ...save.inventory].slice(0, 140);

  const nextSave: GameSave = {
    ...save,
    gold: save.gold + gold + autoSoldGold,
    maxUnlockedTier,
    highestFloorByTier: nextHighestByTier,
    partyIds,
    roster,
    inventory: nextInventory,
    discoveredMonsters: Array.from(discoveredMonsters),
    discoveredUniques: Array.from(discoveredUniques),
    stats: {
      ...save.stats,
      totalKills: save.stats.totalKills + battle.enemies.length,
      totalBossKills: save.stats.totalBossKills + (battle.isBossBattle ? 1 : 0),
      totalItemsLooted: save.stats.totalItemsLooted + dropCount,
      totalMythicsFound: save.stats.totalMythicsFound + mythicsFound,
      highestFloorReached: Math.max(save.stats.highestFloorReached, battle.floor),
    },
  };

  // Full heal leveled-up units & newly joined units to their new max stats
  for (const id of [...leveledUpIds, ...recruited.filter((r) => r.isNew).map((r) => r.speciesId)]) {
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
      items: keptItems,
      autoSoldCount,
      autoSoldGold,
      recruited,
      leveledUpIds,
      worldTierUnlocked,
    },
  };
}
