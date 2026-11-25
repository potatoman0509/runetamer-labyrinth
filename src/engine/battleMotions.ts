/**
 * Hybrid Combat Motion & Signature Cinematic Engine (Option C)
 * - Bespoke signature animations & screen cinematics for Hero (all 10 skills + Limit Break)
 *   and all 10 Bosses (all boss skills + bespoke Boss Ultimates).
 * - Procedural per-(monster x skill) unique motion & VFX recipes covering all 150 monsters,
 *   300 monster skills, 151 basic attacks, and 40 Boss/Elite ultimates (501+ unique signatures).
 */

import { getSpecies } from '../game/data/monsters';
import type {
  BattleCinematic,
  BattleUnitMotion,
  BattleUnitState,
  BattleVfx,
  ElementType,
  SkillDef,
} from '../game/types';
import { MONSTER_SPRITE_RECIPES } from './monsterSpriteAtlas';

export type BodyMotionStyle =
  | 'dash_slash'
  | 'leap_slam'
  | 'spin_whirl'
  | 'coil_strike'
  | 'swoop_dive'
  | 'float_cast'
  | 'rear_breath'
  | 'tremor_stomp'
  | 'blink_flurry'
  | 'spiral_ascend'
  | 'guard_fortify'
  | 'pulse_chant'
  | 'tentacle_whip'
  | 'orbit_surge';

export type EffectPattern =
  | 'slash_arc'
  | 'cross_slash'
  | 'multi_claw'
  | 'pierce_lance'
  | 'breath_stream'
  | 'homing_orbs'
  | 'meteor_drop'
  | 'rising_pillars'
  | 'vortex_ring'
  | 'shockwave_quake'
  | 'venom_cloud'
  | 'holy_rays'
  | 'heal_ribbons'
  | 'aegis_dome';

export type SignatureStyle =
  | 'hero_rune_slash'
  | 'hero_tamer_command'
  | 'hero_meteor_flurry'
  | 'hero_star_shatter'
  | 'hero_thunder_storm'
  | 'hero_astral_nova'
  | 'hero_sacred_aegis'
  | 'hero_immortal_order'
  | 'hero_abyss_flame'
  | 'hero_final_judgment'
  | 'hero_limit_break'
  | 'boss_ancient_treant'
  | 'boss_rune_golem'
  | 'boss_crimson_wyrm'
  | 'boss_star_devourer'
  | 'boss_glacier_leviathan'
  | 'boss_seraph_omega'
  | 'boss_abyss_kraken'
  | 'boss_chronos_mantis'
  | 'boss_asura_emperor'
  | 'boss_genesis_orrery';

export interface MotionRecipe {
  signatureKey: string;
  bodyMotion: BodyMotionStyle;
  effectPattern: EffectPattern;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  afterimages: number; // 0..4
  particleCount: number; // 6..20
  arcAngle: number; // -1.2..1.2 rad
  scalePeak: number; // 1.0..1.34
  reachRatio: number; // 0.15..0.85
  spinTurns: number; // 0..2
  signature?: SignatureStyle;
}

const ELEMENT_PALETTE: Record<ElementType, [string, string, string]> = {
  nature: ['#6dff8b', '#c6ff80', '#238c47'],
  earth: ['#e0a663', '#ffe5a3', '#8c5527'],
  fire: ['#ff6a33', '#ffe366', '#b81d13'],
  star: ['#b48cff', '#7ce8ff', '#5c2fa6'],
  holy: ['#ffe675', '#ffffff', '#d49a2a'],
  physical: ['#ffffff', '#ffd875', '#8ca4cc'],
};

const ARCHETYPE_DEFAULT_BODY: Record<string, BodyMotionStyle> = {
  whale: 'rear_breath',
  kraken: 'tentacle_whip',
  mantis: 'blink_flurry',
  asura: 'blink_flurry',
  orrery: 'orbit_surge',
  beast: 'dash_slash',
  avian: 'swoop_dive',
  serpent: 'coil_strike',
  insect: 'coil_strike',
  shell: 'tremor_stomp',
  plant: 'spiral_ascend',
  humanoid: 'dash_slash',
  ghost: 'float_cast',
  fish: 'swoop_dive',
  object: 'orbit_surge',
  spider: 'leap_slam',
  frog: 'leap_slam',
  biped: 'leap_slam',
};

const HERO_SIGNATURE_MAP: Record<string, SignatureStyle> = {
  rune_slash: 'hero_rune_slash',
  tamer_command: 'hero_tamer_command',
  meteor_flurry: 'hero_meteor_flurry',
  star_shatter: 'hero_star_shatter',
  thunder_storm: 'hero_thunder_storm',
  astral_nova: 'hero_astral_nova',
  sacred_aegis: 'hero_sacred_aegis',
  immortal_order: 'hero_immortal_order',
  abyss_flame: 'hero_abyss_flame',
  final_judgment: 'hero_final_judgment',
  limit_break: 'hero_limit_break',
};

const BOSS_SIGNATURE_MAP: Record<string, SignatureStyle> = {
  ancient_treant: 'boss_ancient_treant',
  rune_golem: 'boss_rune_golem',
  crimson_wyrm: 'boss_crimson_wyrm',
  star_devourer: 'boss_star_devourer',
  glacier_leviathan: 'boss_glacier_leviathan',
  seraph_omega: 'boss_seraph_omega',
  abyss_kraken: 'boss_abyss_kraken',
  chronos_mantis: 'boss_chronos_mantis',
  asura_emperor: 'boss_asura_emperor',
  genesis_orrery: 'boss_genesis_orrery',
};

function fnv1a(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function getSignatureStyle(speciesId: string, skillId: string): SignatureStyle | undefined {
  if (skillId === 'limit_break') return 'hero_limit_break';
  if (speciesId === 'hero' && HERO_SIGNATURE_MAP[skillId]) {
    return HERO_SIGNATURE_MAP[skillId];
  }
  if (BOSS_SIGNATURE_MAP[speciesId] && skillId !== 'basic_attack') {
    return BOSS_SIGNATURE_MAP[speciesId];
  }
  return undefined;
}

export function resolveMotionRecipe(
  speciesId: string,
  skillId: string,
  opts?: {
    element?: ElementType;
    kind?: BattleUnitMotion['kind'];
    hits?: number;
    isAoE?: boolean;
    skill?: SkillDef;
  },
): MotionRecipe {
  const sp = getSpecies(speciesId);
  const atlas = MONSTER_SPRITE_RECIPES[speciesId];
  const elem: ElementType = opts?.element ?? opts?.skill?.element ?? sp.element;
  const kind: BattleUnitMotion['kind'] = opts?.kind ?? opts?.skill?.kind ?? 'attack';
  const hits = opts?.hits ?? opts?.skill?.hits ?? 1;
  const isAoE = opts?.isAoE ?? opts?.skill?.target === 'all_enemies';

  const seed = fnv1a(`${speciesId}::${skillId}`);
  const signature = getSignatureStyle(speciesId, skillId);

  // Determine body motion based on archetype + skill kind + deterministic variation
  let bodyMotion: BodyMotionStyle = atlas
    ? (ARCHETYPE_DEFAULT_BODY[atlas.body] ?? 'dash_slash')
    : speciesId === 'hero'
      ? 'dash_slash'
      : sp.role === 'mage'
        ? 'float_cast'
        : sp.role === 'tank'
          ? 'tremor_stomp'
          : sp.role === 'support'
            ? 'pulse_chant'
            : 'dash_slash';

  if (kind === 'defend' || kind === 'shield') {
    bodyMotion = 'guard_fortify';
  } else if (kind === 'heal' || kind === 'buff_atk' || kind === 'buff_def') {
    bodyMotion = seed % 2 === 0 ? 'pulse_chant' : 'spiral_ascend';
  } else if (kind === 'charge') {
    bodyMotion = 'spiral_ascend';
  } else if (kind === 'limit_break') {
    bodyMotion = 'blink_flurry';
  } else if (kind === 'ultimate') {
    const ultBodies: BodyMotionStyle[] = [
      'spiral_ascend',
      'rear_breath',
      'blink_flurry',
      'tremor_stomp',
      'orbit_surge',
    ];
    bodyMotion = ultBodies[seed % ultBodies.length]!;
  } else if (skillId !== 'basic_attack') {
    if (hits >= 2) {
      bodyMotion = seed % 2 === 0 ? 'blink_flurry' : 'spin_whirl';
    } else if (opts?.skill?.statScale === 'mag') {
      const magBodies: BodyMotionStyle[] = ['float_cast', 'spiral_ascend', 'rear_breath', 'orbit_surge'];
      bodyMotion = magBodies[seed % magBodies.length]!;
    } else if (opts?.skill?.statScale === 'def') {
      bodyMotion = seed % 2 === 0 ? 'tremor_stomp' : 'leap_slam';
    } else if (isAoE) {
      const aoeBodies: BodyMotionStyle[] = ['spin_whirl', 'swoop_dive', 'rear_breath', 'leap_slam'];
      bodyMotion = aoeBodies[seed % aoeBodies.length]!;
    } else {
      const physBodies: BodyMotionStyle[] = [
        'dash_slash',
        'leap_slam',
        'coil_strike',
        'swoop_dive',
        'tentacle_whip',
      ];
      bodyMotion = physBodies[seed % physBodies.length]!;
    }
  }

  // Determine effect pattern tailored to kind, element, status, hits, AoE & unique seed
  let effectPattern: EffectPattern;
  if (kind === 'heal') {
    effectPattern = 'heal_ribbons';
  } else if (kind === 'shield' || kind === 'defend' || kind === 'buff_def') {
    effectPattern = 'aegis_dome';
  } else if (kind === 'buff_atk') {
    effectPattern = 'holy_rays';
  } else if (opts?.skill?.statusEffect?.type === 'poison') {
    effectPattern = 'venom_cloud';
  } else if (opts?.skill?.statusEffect?.type === 'freeze') {
    effectPattern = 'rising_pillars';
  } else if (hits >= 3) {
    effectPattern = seed % 2 === 0 ? 'cross_slash' : 'multi_claw';
  } else if (hits === 2) {
    effectPattern = seed % 2 === 0 ? 'multi_claw' : 'homing_orbs';
  } else if (skillId === 'basic_attack') {
    const basicFx: EffectPattern[] = ['slash_arc', 'multi_claw', 'pierce_lance', 'shockwave_quake'];
    effectPattern = basicFx[seed % basicFx.length]!;
  } else if (elem === 'fire') {
    const fireFx: EffectPattern[] = ['breath_stream', 'rising_pillars', 'meteor_drop'];
    effectPattern = fireFx[seed % fireFx.length]!;
  } else if (elem === 'star') {
    const starFx: EffectPattern[] = ['vortex_ring', 'meteor_drop', 'homing_orbs'];
    effectPattern = starFx[seed % starFx.length]!;
  } else if (elem === 'holy') {
    const holyFx: EffectPattern[] = ['holy_rays', 'pierce_lance', 'cross_slash'];
    effectPattern = holyFx[seed % holyFx.length]!;
  } else if (elem === 'earth') {
    const earthFx: EffectPattern[] = ['shockwave_quake', 'meteor_drop', 'rising_pillars'];
    effectPattern = earthFx[seed % earthFx.length]!;
  } else if (elem === 'nature') {
    const natFx: EffectPattern[] = ['venom_cloud', 'rising_pillars', 'breath_stream'];
    effectPattern = natFx[seed % natFx.length]!;
  } else {
    const physFx: EffectPattern[] = ['slash_arc', 'cross_slash', 'pierce_lance', 'shockwave_quake'];
    effectPattern = physFx[seed % physFx.length]!;
  }

  // Blend species atlas colors with element palette so every monster x skill has a unique chromatic identity
  const [e1, e2, e3] = ELEMENT_PALETTE[elem];
  const primaryColor = atlas && seed % 3 === 0 ? atlas.light : e1;
  const secondaryColor = atlas ? atlas.accent : e2;
  const accentColor = atlas && seed % 2 === 0 ? atlas.body : e3;

  const afterimages =
    bodyMotion === 'blink_flurry' || bodyMotion === 'dash_slash' || bodyMotion === 'swoop_dive'
      ? 2 + (seed % 3)
      : bodyMotion === 'spin_whirl' || bodyMotion === 'orbit_surge'
        ? 2
        : 1;
  const particleCount = 7 + (seed % 11) + (isAoE ? 3 : 0);
  const arcAngle = (((seed >> 4) % 240) - 120) / 100; // -1.20 .. +1.19 rad
  const scalePeak = 1.06 + ((seed >> 8) % 24) / 100; // 1.06 .. 1.29
  const reachRatio =
    bodyMotion === 'float_cast' || bodyMotion === 'pulse_chant' || bodyMotion === 'guard_fortify'
      ? 0.14 + ((seed >> 12) % 12) / 100
      : 0.42 + ((seed >> 12) % 36) / 100;
  const spinTurns = bodyMotion === 'spin_whirl' || bodyMotion === 'orbit_surge' ? 1 + (seed % 2) : 0;

  const signatureKey = [
    speciesId,
    skillId,
    bodyMotion,
    effectPattern,
    primaryColor,
    secondaryColor,
    particleCount,
    arcAngle.toFixed(2),
    scalePeak.toFixed(2),
    reachRatio.toFixed(2),
  ].join('|');

  return {
    signatureKey,
    bodyMotion,
    effectPattern,
    primaryColor,
    secondaryColor,
    accentColor,
    afterimages,
    particleCount,
    arcAngle,
    scalePeak,
    reachRatio,
    spinTurns,
    signature,
  };
}

export interface UnitMotionTransform {
  offsetX: number;
  offsetY: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
  afterimageOffsets: Array<{ dx: number; dy: number; alpha: number }>;
  glowColor: string | null;
}

export function computeUnitMotionTransform(
  unit: BattleUnitState,
  now: number,
  unitPos: { x: number; y: number },
  targetPos: { x: number; y: number } | null,
): UnitMotionTransform {
  const neutral: UnitMotionTransform = {
    offsetX: 0,
    offsetY: 0,
    scaleX: 1,
    scaleY: 1,
    rotation: 0,
    afterimageOffsets: [],
    glowColor: null,
  };

  const motion = unit.activeMotion;
  if (!motion) {
    if (now < unit.lungeUntilMs) {
      const p = 1 - (unit.lungeUntilMs - now) / 340;
      const arc = Math.sin(Math.max(0, Math.min(1, p)) * Math.PI);
      const dx = Math.round((unit.isAlly ? -28 : 28) * arc);
      return {
        ...neutral,
        offsetX: dx,
        afterimageOffsets: Math.abs(dx) > 6 ? [{ dx: dx * 0.5, dy: 0, alpha: 0.25 }] : [],
      };
    }
    return neutral;
  }

  const elapsed = now - motion.startedAt;
  if (elapsed < 0 || elapsed > motion.durationMs) return neutral;
  const t = elapsed / motion.durationMs; // 0..1
  const recipe = resolveMotionRecipe(motion.speciesId, motion.skillId, {
    element: motion.element,
    kind: motion.kind,
    hits: motion.hits,
    isAoE: motion.isAoE,
  });

  const dir = unit.isAlly ? -1 : 1;
  const distX = targetPos ? (targetPos.x - unitPos.x) * recipe.reachRatio : dir * 48;
  const distY = targetPos ? (targetPos.y - unitPos.y) * (recipe.reachRatio * 0.55) : 0;
  const bell = Math.sin(t * Math.PI);
  const punch = t < 0.35 ? t / 0.35 : Math.max(0, 1 - (t - 0.35) / 0.65);

  let offsetX = 0;
  let offsetY = 0;
  let scaleX = 1;
  let scaleY = 1;
  let rotation = 0;
  const afterimageOffsets: Array<{ dx: number; dy: number; alpha: number }> = [];

  switch (recipe.bodyMotion) {
    case 'dash_slash': {
      offsetX = distX * punch;
      offsetY = distY * punch - Math.sin(t * Math.PI) * 5;
      scaleX = 1 + bell * 0.16;
      scaleY = 1 - bell * 0.08;
      rotation = dir * bell * 0.16;
      for (let i = 1; i <= recipe.afterimages; i += 1) {
        const f = Math.max(0, 1 - i * 0.28);
        afterimageOffsets.push({ dx: offsetX * f, dy: offsetY * f, alpha: 0.3 / i });
      }
      break;
    }
    case 'leap_slam': {
      offsetX = distX * bell;
      offsetY = distY * bell - Math.sin(t * Math.PI) * 40;
      const slamSquash = t > 0.65 && t < 0.85 ? 0.22 : 0;
      scaleX = 1 + slamSquash;
      scaleY = 1 - slamSquash + (t < 0.5 ? 0.12 : 0);
      rotation = dir * (t - 0.5) * 0.45;
      afterimageOffsets.push({ dx: offsetX * 0.7, dy: offsetY - 12, alpha: 0.24 });
      break;
    }
    case 'spin_whirl': {
      offsetX = distX * bell;
      offsetY = distY * bell - Math.sin(t * Math.PI) * 14;
      rotation = dir * t * Math.PI * 2 * Math.max(1, recipe.spinTurns);
      scaleX = 1 + bell * 0.12;
      scaleY = 1 + bell * 0.12;
      afterimageOffsets.push({ dx: offsetX * 0.6, dy: offsetY * 0.6, alpha: 0.25 });
      break;
    }
    case 'coil_strike': {
      const coil = t < 0.28 ? -t / 0.28 : 0;
      const lunge = t >= 0.28 ? Math.sin(((t - 0.28) / 0.72) * Math.PI) : 0;
      offsetX = coil * dir * 16 + distX * lunge;
      offsetY = distY * lunge;
      scaleX = 1 + lunge * 0.24 - Math.abs(coil) * 0.15;
      scaleY = 1 - lunge * 0.12 + Math.abs(coil) * 0.14;
      afterimageOffsets.push({ dx: offsetX * 0.5, dy: offsetY * 0.5, alpha: 0.22 });
      break;
    }
    case 'swoop_dive': {
      const arcY = t < 0.45 ? -Math.sin((t / 0.45) * Math.PI * 0.5) * 38 : -38 * (1 - (t - 0.45) / 0.55);
      offsetX = distX * bell;
      offsetY = distY * bell + arcY;
      rotation = dir * (t < 0.45 ? -0.25 : 0.3);
      for (let i = 1; i <= recipe.afterimages; i += 1) {
        afterimageOffsets.push({
          dx: offsetX * (1 - i * 0.25),
          dy: offsetY * (1 - i * 0.2),
          alpha: 0.26 / i,
        });
      }
      break;
    }
    case 'float_cast': {
      offsetX = dir * bell * 10;
      offsetY = -bell * 22;
      scaleX = 1 + bell * (recipe.scalePeak - 1);
      scaleY = 1 + bell * (recipe.scalePeak - 1);
      break;
    }
    case 'rear_breath': {
      const pull = t < 0.32 ? -Math.sin((t / 0.32) * Math.PI * 0.5) : Math.sin(((t - 0.32) / 0.68) * Math.PI);
      offsetX = dir * pull * 18;
      offsetY = -Math.abs(pull) * 8;
      scaleX = 1 + Math.max(0, pull) * 0.2;
      scaleY = 1 + Math.max(0, -pull) * 0.14;
      rotation = dir * pull * 0.14;
      break;
    }
    case 'tremor_stomp': {
      offsetX = distX * 0.65 * bell;
      offsetY = t < 0.4 ? -Math.sin((t / 0.4) * Math.PI * 0.5) * 18 : Math.sin(t * 26) * 4;
      scaleX = 1 + (t >= 0.4 ? 0.22 * (1 - t) : -0.06);
      scaleY = 1 + (t < 0.4 ? 0.14 : -0.14 * (1 - t));
      break;
    }
    case 'blink_flurry': {
      const step = Math.floor(t * 4);
      const jitterX = (step % 2 === 0 ? 1 : -1) * 12;
      const jitterY = ((step % 3) - 1) * 14;
      offsetX = distX * 0.85 * bell + jitterX * bell;
      offsetY = distY * 0.85 * bell + jitterY * bell;
      for (let i = 1; i <= 3; i += 1) {
        afterimageOffsets.push({
          dx: offsetX - dir * i * 16,
          dy: offsetY + (i % 2 === 0 ? -9 : 9),
          alpha: 0.32 / i,
        });
      }
      break;
    }
    case 'spiral_ascend': {
      offsetX = Math.cos(t * Math.PI * 3) * 10 * bell;
      offsetY = -bell * 26;
      scaleX = 1 + bell * 0.18;
      scaleY = 1 + bell * 0.18;
      break;
    }
    case 'guard_fortify': {
      offsetX = -dir * bell * 8;
      scaleX = 1 + bell * 0.18;
      scaleY = 1 - bell * 0.08;
      break;
    }
    case 'pulse_chant': {
      const pulse = Math.sin(t * Math.PI * 3) * 0.12;
      offsetY = -bell * 12;
      scaleX = 1 + pulse;
      scaleY = 1 - pulse;
      break;
    }
    case 'tentacle_whip': {
      offsetX = distX * 0.6 * bell;
      offsetY = Math.sin(t * Math.PI * 3) * 10 * bell;
      scaleX = 1 + bell * 0.3;
      scaleY = 1 - bell * 0.14;
      afterimageOffsets.push({ dx: offsetX * 0.55, dy: -offsetY, alpha: 0.22 });
      break;
    }
    case 'orbit_surge': {
      const ang = t * Math.PI * 2;
      offsetX = distX * 0.65 * bell + Math.cos(ang) * 14 * bell;
      offsetY = distY * 0.5 * bell + Math.sin(ang) * 16 * bell;
      rotation = dir * ang;
      afterimageOffsets.push({ dx: offsetX * 0.6, dy: offsetY * 0.6, alpha: 0.26 });
      break;
    }
  }

  return {
    offsetX: Math.round(offsetX),
    offsetY: Math.round(offsetY),
    scaleX,
    scaleY,
    rotation,
    afterimageOffsets,
    glowColor: recipe.primaryColor,
  };
}

export function drawSkillTrajectoryVfx(
  ctx: CanvasRenderingContext2D,
  fx: BattleVfx,
  targetPos: { x: number; y: number },
  attackerPos: { x: number; y: number } | null,
  progress: number, // 0..1
): boolean {
  if (!fx.speciesId || !fx.skillId) return false;
  const elem: ElementType =
    fx.element === 'nature' ||
    fx.element === 'earth' ||
    fx.element === 'fire' ||
    fx.element === 'star' ||
    fx.element === 'holy' ||
    fx.element === 'physical'
      ? fx.element
      : 'physical';
  const recipe = resolveMotionRecipe(fx.speciesId, fx.skillId, { element: elem });
  const alpha = Math.max(0, 1 - progress * 0.9);
  const tx = targetPos.x;
  const ty = targetPos.y;
  const ax = attackerPos?.x ?? tx + 60;
  const ay = attackerPos?.y ?? ty;

  ctx.save();
  ctx.globalAlpha = alpha;

  switch (recipe.effectPattern) {
    case 'slash_arc': {
      ctx.save();
      ctx.translate(tx, ty);
      ctx.rotate(recipe.arcAngle);
      ctx.strokeStyle = recipe.primaryColor;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, 0, 22 + progress * 8, -Math.PI * 0.7 + progress * 0.9, -Math.PI * 0.05 + progress * 1.45);
      ctx.stroke();
      ctx.strokeStyle = recipe.secondaryColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 16 + progress * 6, -Math.PI * 0.65 + progress * 0.9, -Math.PI * 0.1 + progress * 1.45);
      ctx.stroke();
      ctx.restore();
      break;
    }
    case 'cross_slash': {
      const len = 14 + progress * 24;
      ctx.strokeStyle = recipe.primaryColor;
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(tx - len, ty - len * 0.8);
      ctx.lineTo(tx + len, ty + len * 0.8);
      ctx.moveTo(tx + len, ty - len * 0.8);
      ctx.lineTo(tx - len, ty + len * 0.8);
      ctx.stroke();
      ctx.strokeStyle = recipe.secondaryColor;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(tx, ty, 8 + progress * 22, 0, Math.PI * 2);
      ctx.stroke();
      break;
    }
    case 'multi_claw': {
      ctx.save();
      ctx.translate(tx, ty);
      ctx.rotate(recipe.arcAngle * 0.5);
      for (let c = -1; c <= 1; c += 1) {
        const yOff = c * 7;
        const xStart = -22 + progress * 8;
        const xEnd = -22 + progress * 46;
        ctx.strokeStyle = c === 0 ? recipe.primaryColor : recipe.secondaryColor;
        ctx.lineWidth = c === 0 ? 3 : 2;
        ctx.beginPath();
        ctx.moveTo(xStart, yOff - 8);
        ctx.lineTo(xEnd, yOff + 8);
        ctx.stroke();
      }
      ctx.restore();
      break;
    }
    case 'pierce_lance': {
      const lx = ax + (tx - ax) * Math.min(1, progress * 1.35);
      const ly = ay + (ty - ay) * Math.min(1, progress * 1.35);
      ctx.strokeStyle = recipe.primaryColor;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(lx, ly);
      ctx.stroke();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(lx, ly);
      ctx.stroke();
      ctx.fillStyle = recipe.secondaryColor;
      ctx.fillRect(Math.round(lx) - 4, Math.round(ly) - 4, 8, 8);
      break;
    }
    case 'breath_stream': {
      const count = recipe.particleCount;
      for (let i = 0; i < count; i += 1) {
        const frac = Math.min(1, Math.max(0, progress * 1.35 - (i / count) * 0.45));
        const bx = ax + (tx - ax) * frac + Math.sin(i * 2.1 + progress * 8) * (4 + frac * 10);
        const by = ay + (ty - ay) * frac + Math.cos(i * 1.7 + progress * 8) * (3 + frac * 9);
        const sz = 3 + (i % 3) * 2;
        ctx.fillStyle = i % 3 === 0 ? '#fff9d6' : i % 2 === 0 ? recipe.primaryColor : recipe.secondaryColor;
        ctx.fillRect(Math.round(bx - sz / 2), Math.round(by - sz / 2), sz, sz);
      }
      break;
    }
    case 'homing_orbs': {
      const orbs = Math.min(5, Math.max(3, Math.floor(recipe.particleCount / 3)));
      for (let i = 0; i < orbs; i += 1) {
        const p = Math.min(1, Math.max(0, progress * 1.25 - i * 0.08));
        const curve = (i % 2 === 0 ? -1 : 1) * (24 + i * 8) * Math.sin(p * Math.PI);
        const ox = ax + (tx - ax) * p;
        const oy = ay + (ty - ay) * p + curve;
        ctx.fillStyle = i % 2 === 0 ? recipe.primaryColor : recipe.secondaryColor;
        ctx.beginPath();
        ctx.arc(ox, oy, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(Math.round(ox) - 1, Math.round(oy) - 1, 2, 2);
      }
      break;
    }
    case 'meteor_drop': {
      const drops = 3;
      for (let i = 0; i < drops; i += 1) {
        const p = Math.min(1, Math.max(0, progress * 1.3 - i * 0.12));
        const ox = tx + (i - 1) * 14;
        const startX = ox + 30;
        const startY = ty - 68;
        const mx = startX + (ox - startX) * p;
        const my = startY + (ty - startY) * p;
        ctx.strokeStyle = recipe.secondaryColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(mx + 12, my - 18);
        ctx.lineTo(mx, my);
        ctx.stroke();
        ctx.fillStyle = recipe.primaryColor;
        ctx.fillRect(Math.round(mx) - 4, Math.round(my) - 4, 8, 8);
        if (p > 0.85) {
          ctx.strokeStyle = '#fff5b8';
          ctx.beginPath();
          ctx.arc(ox, ty, (p - 0.85) * 90, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
      break;
    }
    case 'rising_pillars': {
      for (let i = -1; i <= 1; i += 1) {
        const px = tx + i * 11;
        const h = Math.round((18 + progress * 34) * (i === 0 ? 1.15 : 0.85));
        ctx.fillStyle = i === 0 ? recipe.primaryColor : recipe.secondaryColor;
        ctx.fillRect(Math.round(px) - 3, Math.round(ty + 18 - h), 6, h);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(Math.round(px) - 1, Math.round(ty + 18 - h), 2, Math.max(4, h - 6));
      }
      break;
    }
    case 'vortex_ring': {
      const r = 10 + progress * 26;
      ctx.strokeStyle = recipe.primaryColor;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(tx, ty, r, progress * 4, progress * 4 + Math.PI * 1.45);
      ctx.stroke();
      ctx.strokeStyle = recipe.secondaryColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(tx, ty, r * 0.65, -progress * 5, -progress * 5 + Math.PI * 1.3);
      ctx.stroke();
      for (let i = 0; i < 8; i += 1) {
        const ang = (i / 8) * Math.PI * 2 + progress * 4;
        const d = r * 0.85;
        ctx.fillStyle = i % 2 === 0 ? recipe.primaryColor : '#ffffff';
        ctx.fillRect(Math.round(tx + Math.cos(ang) * d) - 2, Math.round(ty + Math.sin(ang) * d) - 2, 4, 4);
      }
      break;
    }
    case 'shockwave_quake': {
      ctx.strokeStyle = recipe.primaryColor;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(tx, ty + 14, 14 + progress * 30, 5 + progress * 9, 0, 0, Math.PI * 2);
      ctx.stroke();
      for (let i = 0; i < 8; i += 1) {
        const dx = (i - 3.5) * 8 * (0.4 + progress);
        const dy = -Math.sin(progress * Math.PI) * (16 + (i % 3) * 8);
        ctx.fillStyle = i % 2 === 0 ? recipe.primaryColor : recipe.accentColor;
        ctx.fillRect(Math.round(tx + dx) - 2, Math.round(ty + 12 + dy) - 2, 4, 4);
      }
      break;
    }
    case 'venom_cloud': {
      for (let i = 0; i < recipe.particleCount; i += 1) {
        const ang = (i / recipe.particleCount) * Math.PI * 2 + progress * 1.8;
        const d = 4 + progress * (18 + (i % 3) * 7);
        const sz = 4 + (i % 3) * 2;
        ctx.fillStyle = i % 2 === 0 ? recipe.primaryColor : recipe.secondaryColor;
        ctx.fillRect(Math.round(tx + Math.cos(ang) * d - sz / 2), Math.round(ty + Math.sin(ang) * d * 0.7 - sz / 2), sz, sz);
      }
      break;
    }
    case 'holy_rays': {
      for (let i = -1; i <= 1; i += 1) {
        const rx = tx + i * 10;
        const rw = i === 0 ? 8 : 4;
        ctx.fillStyle = i === 0 ? '#ffffff' : recipe.primaryColor;
        ctx.fillRect(Math.round(rx - rw / 2), Math.round(ty - 64 + progress * 18), rw, 78);
      }
      break;
    }
    case 'heal_ribbons': {
      for (let i = 0; i < 10; i += 1) {
        const ang = (i / 10) * Math.PI * 2 + progress * 4;
        const rx = tx + Math.cos(ang) * (15 * (1 - progress * 0.35));
        const ry = ty + 14 - progress * 36 + Math.sin(ang) * 4;
        ctx.fillStyle = i % 2 === 0 ? '#7aff99' : '#fff5b8';
        ctx.fillRect(Math.round(rx) - 1, Math.round(ry) - 3, 2, 6);
        ctx.fillRect(Math.round(rx) - 3, Math.round(ry) - 1, 6, 2);
      }
      break;
    }
    case 'aegis_dome': {
      const r = 16 + progress * 16;
      ctx.strokeStyle = recipe.primaryColor;
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let s = 0; s <= 6; s += 1) {
        const a = (s / 6) * Math.PI * 2 + progress;
        const px = tx + Math.cos(a) * r;
        const py = ty + Math.sin(a) * r;
        if (s === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
      break;
    }
  }

  ctx.restore();
  return true;
}

/**
 * Renders Bespoke Signature Cinematics for Hero Skills & All 10 Bosses
 */
export function drawSignatureCinematic(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  cinematic: BattleCinematic,
  anchors: Map<string, { x: number; y: number; scale: number }>,
  now: number,
): void {
  const elapsed = now - cinematic.startedAt;
  if (elapsed < 0 || elapsed > cinematic.durationMs) return;
  const p = elapsed / cinematic.durationMs; // 0..1
  const style = getSignatureStyle(cinematic.speciesId, cinematic.skillId);
  if (!style) return;

  const actorPos = anchors.get(cinematic.actorUid) ?? { x: w * 0.5, y: h * 0.65, scale: 2 };
  const targetPositions = cinematic.targetUids
    .map((uid) => anchors.get(uid))
    .filter((pt): pt is { x: number; y: number; scale: number } => Boolean(pt));
  const avgTarget =
    targetPositions.length > 0
      ? {
          x: targetPositions.reduce((s, pt) => s + pt.x, 0) / targetPositions.length,
          y: targetPositions.reduce((s, pt) => s + pt.y, 0) / targetPositions.length,
        }
      : { x: w * 0.5, y: h * 0.65 };

  const fade = p < 0.15 ? p / 0.15 : p > 0.8 ? (1 - p) / 0.2 : 1;

  ctx.save();
  // Dramatic theatrical vignette dim
  ctx.fillStyle = `rgba(6, 4, 16, ${0.34 * fade})`;
  ctx.fillRect(0, 0, w, h);

  ctx.globalAlpha = Math.max(0, Math.min(1, fade));

  switch (style) {
    case 'hero_limit_break': {
      // Rainbow prism convergence + giant golden supernova!
      const cx = avgTarget.x;
      const cy = avgTarget.y;
      const cols = ['#ffe566', '#7ce8ff', '#ff7ce0', '#7aff99'];
      for (let i = 0; i < 4; i += 1) {
        ctx.strokeStyle = cols[i]!;
        ctx.lineWidth = 4 - i * 0.6;
        ctx.beginPath();
        ctx.arc(cx, cy, 12 + p * (55 + i * 16), 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      const beam = 20 + p * 75;
      ctx.beginPath();
      ctx.moveTo(cx - beam, cy);
      ctx.lineTo(cx + beam, cy);
      ctx.moveTo(cx, cy - beam);
      ctx.lineTo(cx, cy + beam);
      ctx.stroke();
      break;
    }
    case 'hero_rune_slash': {
      // Sweeping golden rune arc + runic sparkle cross
      const cx = avgTarget.x;
      const cy = avgTarget.y;
      ctx.strokeStyle = '#ffe570';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(cx, cy, 34, -Math.PI * 0.8 + p * 1.2, Math.PI * 0.25 + p * 1.25);
      ctx.stroke();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, 26, -Math.PI * 0.7 + p * 1.2, Math.PI * 0.15 + p * 1.25);
      ctx.stroke();
      break;
    }
    case 'hero_star_shatter': {
      // High-speed holy-star cross-cleave + shattering star shards
      const cx = avgTarget.x;
      const cy = avgTarget.y;
      ctx.strokeStyle = '#6beeff';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(cx - 46, cy - 32);
      ctx.lineTo(cx + 46, cy + 32);
      ctx.moveTo(cx + 46, cy - 32);
      ctx.lineTo(cx - 46, cy + 32);
      ctx.stroke();
      for (let i = 0; i < 8; i += 1) {
        const ang = (i / 8) * Math.PI * 2 + p * 1.5;
        const dist = 8 + p * 46;
        ctx.fillStyle = i % 2 === 0 ? '#ffe570' : '#ffffff';
        ctx.fillRect(Math.round(cx + Math.cos(ang) * dist) - 3, Math.round(cy + Math.sin(ang) * dist) - 3, 6, 6);
      }
      break;
    }
    case 'hero_meteor_flurry': {
      // Triple diagonal crimson-gold meteor slash trails
      const cx = avgTarget.x;
      const cy = avgTarget.y;
      for (let s = 0; s < 3; s += 1) {
        const sy = cy - 18 + s * 18;
        ctx.strokeStyle = s === 1 ? '#ffffff' : '#ffcf5c';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(cx - 42 + p * 12, sy - 16);
        ctx.lineTo(cx + 42 - p * 8, sy + 16);
        ctx.stroke();
      }
      break;
    }
    case 'hero_thunder_storm': {
      // Jagged holy lightning bolts striking down across targets
      const pts = targetPositions.length > 0 ? targetPositions : [avgTarget];
      for (const pt of pts) {
        ctx.strokeStyle = '#ffe866';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(pt.x, 0);
        ctx.lineTo(pt.x - 10, pt.y * 0.35);
        ctx.lineTo(pt.x + 12, pt.y * 0.65);
        ctx.lineTo(pt.x, pt.y + 8);
        ctx.stroke();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
      break;
    }
    case 'hero_astral_nova': {
      // Expanding astral constellation rings + stardust burst
      const cx = avgTarget.x;
      const cy = avgTarget.y;
      for (let i = 0; i < 8; i += 1) {
        const ang = (i / 8) * Math.PI * 2 + p * 3.8;
        const r = 10 + p * 58;
        ctx.fillStyle = i % 2 === 0 ? '#7ce8ff' : '#ffe570';
        ctx.fillRect(Math.round(cx + Math.cos(ang) * r) - 3, Math.round(cy + Math.sin(ang) * r) - 3, 6, 6);
      }
      ctx.strokeStyle = '#b48cff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, cy, 14 + p * 46, 0, Math.PI * 2);
      ctx.stroke();
      break;
    }
    case 'hero_abyss_flame': {
      // Roaring violet-crimson abyss fire wave across enemies
      for (let i = 0; i < 12; i += 1) {
        const fx = Math.round(w * (0.08 + i * 0.045));
        const fh = Math.round(20 + Math.sin(p * Math.PI + i * 0.7) * 44);
        ctx.fillStyle = i % 2 === 0 ? '#ff5733' : '#9c4dff';
        ctx.fillRect(fx - 5, Math.round(avgTarget.y + 24 - fh), 10, fh);
        ctx.fillStyle = '#ffe570';
        ctx.fillRect(fx - 2, Math.round(avgTarget.y + 24 - fh * 0.65), 4, Math.round(fh * 0.65));
      }
      break;
    }
    case 'hero_final_judgment': {
      // Dimensional violet-white rift bisecting the battlefield
      ctx.strokeStyle = '#c475ff';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(0, avgTarget.y - 36 + p * 20);
      ctx.lineTo(w, avgTarget.y + 28 - p * 20);
      ctx.stroke();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(0, avgTarget.y - 36 + p * 20);
      ctx.lineTo(w, avgTarget.y + 28 - p * 20);
      ctx.stroke();
      break;
    }
    case 'hero_sacred_aegis': {
      // Crystalline hexagonal sacred shields over all allies
      for (const pt of targetPositions) {
        const r = 18 + p * 18;
        ctx.strokeStyle = '#7ce8ff';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        for (let s = 0; s <= 6; s += 1) {
          const a = (s / 6) * Math.PI * 2 + p;
          const px = pt.x + Math.cos(a) * r;
          const py = pt.y + Math.sin(a) * r;
          if (s === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();
      }
      break;
    }
    case 'hero_tamer_command':
    case 'hero_immortal_order': {
      // Radiant golden command pillars descending on all allies
      const isImmortal = style === 'hero_immortal_order';
      for (const pt of targetPositions) {
        const pw = isImmortal ? 14 : 9;
        ctx.fillStyle = isImmortal ? 'rgba(255, 224, 96, 0.42)' : 'rgba(124, 232, 255, 0.34)';
        ctx.fillRect(Math.round(pt.x - pw / 2), 0, pw, h);
        ctx.strokeStyle = isImmortal ? '#ffe570' : '#7aff99';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 16 + p * 20, 0, Math.PI * 2);
        ctx.stroke();
      }
      break;
    }
    case 'boss_ancient_treant': {
      // Giant emerald roots erupting under every ally + spore storm
      for (const pt of targetPositions) {
        const rh = Math.round(16 + p * 48);
        ctx.fillStyle = '#2d8a45';
        ctx.fillRect(Math.round(pt.x) - 5, Math.round(pt.y + 22 - rh), 10, rh);
        ctx.fillStyle = '#8cf084';
        ctx.fillRect(Math.round(pt.x) - 2, Math.round(pt.y + 22 - rh), 4, rh);
      }
      break;
    }
    case 'boss_rune_golem': {
      // Massive cyan runic beam cannon from golem across the field
      ctx.fillStyle = 'rgba(107, 238, 255, 0.45)';
      const beamH = Math.round(16 + Math.sin(p * Math.PI) * 20);
      ctx.fillRect(actorPos.x, Math.round(avgTarget.y - beamH / 2), w - actorPos.x, beamH);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(actorPos.x, Math.round(avgTarget.y - 3), w - actorPos.x, 6);
      break;
    }
    case 'boss_crimson_wyrm': {
      // Diagonal inferno breath torrent from wyrm across all allies
      for (let i = 0; i < 18; i += 1) {
        const frac = (p * 1.4 + i / 18) % 1;
        const bx = actorPos.x + (w - actorPos.x) * frac;
        const by = actorPos.y - 14 + (avgTarget.y - actorPos.y + 18) * frac + Math.sin(i * 2.3 + p * 10) * 14;
        ctx.fillStyle = i % 3 === 0 ? '#fff5b8' : i % 2 === 0 ? '#ff7b24' : '#d92626';
        ctx.fillRect(Math.round(bx) - 5, Math.round(by) - 5, 10, 10);
      }
      break;
    }
    case 'boss_star_devourer': {
      // Swirling black-hole gravity well pulling starlight inward
      const cx = avgTarget.x;
      const cy = avgTarget.y;
      ctx.fillStyle = '#0d061c';
      ctx.beginPath();
      ctx.arc(cx, cy, 14 + Math.sin(p * Math.PI) * 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#c475ff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, cy, 20 + Math.sin(p * Math.PI) * 18, 0, Math.PI * 2);
      ctx.stroke();
      for (let i = 0; i < 12; i += 1) {
        const ang = (i / 12) * Math.PI * 2 + p * 5;
        const dist = (1 - p) * 58 + 10;
        ctx.fillStyle = i % 2 === 0 ? '#7ce8ff' : '#ffe570';
        ctx.fillRect(Math.round(cx + Math.cos(ang) * dist) - 2, Math.round(cy + Math.sin(ang) * dist) - 2, 4, 4);
      }
      break;
    }
    case 'boss_glacier_leviathan': {
      // Massive falling glacial icicle spears + frost wave
      for (let i = 0; i < 7; i += 1) {
        const ix = Math.round(w * (0.45 + i * 0.08));
        const iy = Math.round(-20 + p * (h * 0.95));
        ctx.fillStyle = '#7ce8ff';
        ctx.fillRect(ix - 3, iy - 18, 6, 26);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(ix - 1, iy - 16, 2, 20);
      }
      break;
    }
    case 'boss_seraph_omega': {
      // Towering golden judgment pillars of light from heaven
      for (const pt of targetPositions) {
        const pw = Math.round(12 + Math.sin(p * Math.PI) * 14);
        ctx.fillStyle = 'rgba(255, 232, 112, 0.55)';
        ctx.fillRect(Math.round(pt.x - pw / 2), 0, pw, h);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(Math.round(pt.x - 2), 0, 4, h);
      }
      break;
    }
    case 'boss_abyss_kraken': {
      // Dark abyssal tsunami & whipping tentacle bands
      for (let t = 0; t < 4; t += 1) {
        const ty = Math.round(h * (0.48 + t * 0.11));
        ctx.strokeStyle = t % 2 === 0 ? '#8c47c9' : '#4ec9b0';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(actorPos.x, ty);
        ctx.quadraticCurveTo(w * 0.55, ty + Math.sin(p * 12 + t) * 24, w * 0.95, ty);
        ctx.stroke();
      }
      break;
    }
    case 'boss_chronos_mantis': {
      // Golden celestial clock face + silver time-stop slashes
      const cx = Math.round(w * 0.5);
      const cy = Math.round(h * 0.45);
      ctx.strokeStyle = 'rgba(255, 229, 112, 0.75)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(cx, cy, 38, 0, Math.PI * 2);
      ctx.stroke();
      // Clock hands stopping abruptly
      const handAng = p < 0.45 ? p * 12 : 0.45 * 12;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(handAng) * 32, cy + Math.sin(handAng) * 32);
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(handAng * 0.3) * 20, cy + Math.sin(handAng * 0.3) * 20);
      ctx.stroke();
      if (p >= 0.45) {
        ctx.strokeStyle = '#e8faff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(avgTarget.x - 44, avgTarget.y - 26);
        ctx.lineTo(avgTarget.x + 44, avgTarget.y + 26);
        ctx.moveTo(avgTarget.x + 44, avgTarget.y - 26);
        ctx.lineTo(avgTarget.x - 44, avgTarget.y + 26);
        ctx.stroke();
      }
      break;
    }
    case 'boss_asura_emperor': {
      // Six-directional crimson barrage slashes!
      const cx = avgTarget.x;
      const cy = avgTarget.y;
      for (let s = 0; s < 6; s += 1) {
        const ang = (s / 6) * Math.PI + p * 1.4;
        const len = 36 + p * 22;
        ctx.strokeStyle = s % 2 === 0 ? '#ff4d5e' : '#ffe566';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(cx - Math.cos(ang) * len, cy - Math.sin(ang) * len);
        ctx.lineTo(cx + Math.cos(ang) * len, cy + Math.sin(ang) * len);
        ctx.stroke();
      }
      break;
    }
    case 'boss_genesis_orrery': {
      // Rotating 5-element planetary rings + genesis convergence beam!
      const cx = Math.round(w * 0.5);
      const cy = Math.round(h * 0.5);
      const ringColors = ['#6dff8b', '#e0a663', '#ff6a33', '#b48cff', '#ffe675'];
      for (let i = 0; i < 5; i += 1) {
        const r = 18 + i * 11;
        ctx.strokeStyle = ringColors[i]!;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(cx, cy, r * 1.35, r * 0.55, p * 2 + i * 0.5, 0, Math.PI * 2);
        ctx.stroke();
      }
      break;
    }
  }

  // Crisp SFC-style Skill Cut-In Name Banner at top of battle stage
  const bannerY = Math.round(h * 0.08);
  ctx.fillStyle = 'rgba(14, 10, 26, 0.85)';
  ctx.fillRect(Math.round(w * 0.14), bannerY, Math.round(w * 0.72), 20);
  ctx.strokeStyle = '#ffe570';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(Math.round(w * 0.14), bannerY, Math.round(w * 0.72), 20);
  ctx.font = 'bold 11px "DotGothic16", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff5be';
  ctx.fillText(`✦ ${cinematic.title} ✦`, Math.round(w * 0.5), bannerY + 14);

  ctx.restore();
}
