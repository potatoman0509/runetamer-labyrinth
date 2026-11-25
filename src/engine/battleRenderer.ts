import { BIOMES } from '../game/data/biomes';
import type { BattleState, BattleUnitState, DungeonBiomeId } from '../game/types';
import {
  computeUnitMotionTransform,
  drawSignatureCinematic,
  drawSkillTrajectoryVfx,
} from './battleMotions';
import { ANIM_FRAME_COUNT, getSpriteCanvas } from './pixelSprites';

function drawBattleBackdrop(
  ctx: CanvasRenderingContext2D,
  biome: DungeonBiomeId,
  w: number,
  h: number,
  timeMs: number,
): void {
  const pal = BIOMES[biome].palette;
  const horizonY = Math.round(h * 0.45);

  // Fine 16-bit SNES stepped sky gradient
  const bands = 8;
  for (let i = 0; i < bands; i += 1) {
    ctx.fillStyle = i < 4 ? pal.skyTop : pal.skyBottom;
    ctx.globalAlpha = i < 4 ? 1 - i * 0.08 : 0.65 + (i - 4) * 0.09;
    const by = Math.round((horizonY / bands) * i);
    ctx.fillRect(0, by, w, Math.ceil(horizonY / bands) + 1);
  }
  ctx.globalAlpha = 1;

  if (biome === 'forest') {
    const sway = Math.round(Math.sin(timeMs / 700) * 2);
    for (let x = -10; x < w + 24; x += 30) {
      ctx.fillStyle = '#1e4d2e';
      ctx.fillRect(x, horizonY - 26, 24, 28);
      ctx.fillStyle = '#2d6e3f';
      ctx.fillRect(x + 4 + sway, horizonY - 36, 18, 20);
      ctx.fillStyle = '#53a655';
      ctx.fillRect(x + 7 + sway, horizonY - 38, 10, 6);
    }
    // Animated sunlit shafts
    const beamAlpha = 0.08 + Math.sin(timeMs / 900) * 0.04;
    ctx.fillStyle = `rgba(255, 250, 196, ${beamAlpha})`;
    ctx.fillRect(w * 0.18, 0, 22, horizonY + 45);
    ctx.fillRect(w * 0.52, 0, 14, horizonY + 35);
    ctx.fillRect(w * 0.78, 0, 18, horizonY + 40);
  } else if (biome === 'ruins') {
    for (let x = 20; x < w; x += 66) {
      ctx.fillStyle = '#3b4252';
      ctx.fillRect(x, 8, 18, horizonY - 6);
      ctx.fillStyle = '#5f6a80';
      ctx.fillRect(x + 2, 8, 4, horizonY - 8);
      // Flickering wall torch!
      const flicker = Math.floor(timeMs / 110 + x) % 3;
      ctx.fillStyle = '#7d4d2a';
      ctx.fillRect(x + 17, 34, 4, 8);
      ctx.fillStyle = '#ff8026';
      ctx.fillRect(x + 16, 27 - flicker, 6, 7 + flicker);
      ctx.fillStyle = '#ffe86b';
      ctx.fillRect(x + 17, 29 - flicker, 4, 4);
      // Glowing carved rune
      ctx.fillStyle = '#6beeff';
      ctx.globalAlpha = 0.5 + Math.sin(timeMs / 360 + x) * 0.35;
      ctx.fillRect(x + 8, 22, 2, 16);
      ctx.fillRect(x + 6, 28, 6, 2);
      ctx.globalAlpha = 1;
    }
  } else if (biome === 'volcano') {
    ctx.fillStyle = '#2e1210';
    for (let x = 0; x < w; x += 42) {
      ctx.fillRect(x, horizonY - 32, 34, 32);
      ctx.fillRect(x + 8, horizonY - 46, 16, 16);
    }
    // Bubbling magma river along horizon
    ctx.fillStyle = '#e8451e';
    ctx.fillRect(0, horizonY - 10, w, 12);
    ctx.fillStyle = '#ff962e';
    ctx.fillRect(0, horizonY - 7, w, 5);
    ctx.fillStyle = '#ffe566';
    const shift = Math.floor(timeMs / 130) % 24;
    for (let x = -24; x < w + 24; x += 24) {
      ctx.fillRect(x + shift, horizonY - 6, 10, 2);
      const bubble = Math.floor(timeMs / 240 + x) % 4 === 0;
      if (bubble) ctx.fillRect(x + 4, horizonY - 11, 4, 3);
    }
  } else if (biome === 'abyss') {
    // Crescent moon & shooting star
    ctx.fillStyle = '#fff5be';
    ctx.fillRect(w - 54, 14, 16, 16);
    ctx.fillStyle = pal.skyTop;
    ctx.fillRect(w - 48, 12, 12, 12);

    const shootPhase = (timeMs % 4200) / 4200;
    if (shootPhase < 0.22) {
      const t = shootPhase / 0.22;
      const sx = Math.round(w * (0.85 - t * 0.6));
      const sy = Math.round(12 + t * 44);
      ctx.fillStyle = '#fff9d6';
      ctx.fillRect(sx, sy, 4, 2);
      ctx.fillStyle = 'rgba(124, 232, 255, 0.55)';
      ctx.fillRect(sx + 4, sy - 2, 10, 2);
    }

    for (let i = 0; i < 30; i += 1) {
      const sx = (i * 43 + 11) % w;
      const sy = (i * 23 + 6) % (horizonY - 6);
      ctx.fillStyle = i % 3 === 0 ? '#7ce8ff' : '#fff5c2';
      ctx.globalAlpha = 0.3 + ((Math.sin(timeMs / 280 + i) + 1) / 2) * 0.7;
      ctx.fillRect(sx, sy, i % 5 === 0 ? 2 : 1, i % 5 === 0 ? 2 : 1);
    }
    ctx.globalAlpha = 1;
  } else if (biome === 'glacier') {
    // Shimmering aurora ribbons
    for (let x = 0; x < w; x += 6) {
      const wave = Math.round(Math.sin(timeMs / 550 + x * 0.04) * 7);
      ctx.fillStyle = 'rgba(110, 245, 220, 0.24)';
      ctx.fillRect(x, 12 + wave, 6, 12);
      ctx.fillStyle = 'rgba(130, 195, 255, 0.2)';
      ctx.fillRect(x, 22 + wave, 6, 8);
    }
    // Crystalline ice spires
    for (let x = -4; x < w + 20; x += 38) {
      ctx.fillStyle = '#3b73a8';
      ctx.fillRect(x, horizonY - 28, 22, 30);
      ctx.fillStyle = '#7ad4f5';
      ctx.fillRect(x + 4, horizonY - 40, 12, 32);
      ctx.fillStyle = '#dffaff';
      ctx.fillRect(x + 8, horizonY - 46, 4, 24);
    }
  } else if (biome === 'sanctum') {
    // Radiant golden sun halo
    const cx = Math.round(w * 0.5);
    const cy = Math.round(horizonY * 0.48);
    ctx.strokeStyle = 'rgba(255, 232, 120, 0.45)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, 26 + Math.sin(timeMs / 400) * 3, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255, 248, 200, 0.32)';
    ctx.fillRect(cx - 10, cy - 10, 20, 20);
    // Marbled golden temple pillars
    for (let x = 16; x < w; x += 72) {
      ctx.fillStyle = '#d4b46a';
      ctx.fillRect(x, 4, 16, horizonY - 2);
      ctx.fillStyle = '#fff3c4';
      ctx.fillRect(x + 2, 4, 4, horizonY - 2);
      ctx.fillStyle = '#ffe566';
      ctx.fillRect(x - 2, 6, 20, 4);
      ctx.fillRect(x - 2, horizonY - 6, 20, 4);
    }
  }

  // Fine perspective pixel ground with subtle dither tiles
  ctx.fillStyle = pal.groundPrimary;
  ctx.fillRect(0, horizonY, w, h - horizonY);
  ctx.fillStyle = pal.groundSecondary;
  const rows = 6;
  const rh = Math.ceil((h - horizonY) / rows);
  for (let row = 0; row < rows; row += 1) {
    if (row % 2 === 1) ctx.fillRect(0, horizonY + row * rh, w, rh);
  }
  ctx.fillStyle = 'rgba(0,0,0,0.34)';
  ctx.fillRect(0, horizonY, w, 2);
}

interface UnitAnchor {
  x: number;
  y: number;
  scale: number;
}

function getUnitPositions(
  state: BattleState,
  w: number,
  h: number,
): Map<string, UnitAnchor> {
  const map = new Map<string, UnitAnchor>();
  const topY = Math.round(h * 0.46);
  const usableH = Math.round(h * 0.48);

  // 32x32 HD sprites rendered at crisp 2x (64x64) and bosses at 2x-3x (64-96px)!
  const baseScale = w < 320 ? 1 : 2;
  const bossScale = w < 380 ? 2 : 3;

  const eCount = state.enemies.length;
  state.enemies.forEach((e, idx) => {
    const t = eCount === 1 ? 0.5 : idx / (eCount - 1);
    const x = Math.round(w * (e.isBoss ? 0.24 : idx % 2 === 0 ? 0.18 : 0.31));
    const y = Math.round(topY + 12 + t * (usableH - 28));
    map.set(e.uid, { x, y, scale: e.isBoss ? bossScale : baseScale });
  });

  const aCount = state.allies.length;
  state.allies.forEach((a, idx) => {
    const t = aCount === 1 ? 0.5 : idx / (aCount - 1);
    const x = Math.round(w * (idx % 2 === 0 ? 0.75 : 0.86));
    const y = Math.round(topY + 10 + t * (usableH - 26));
    map.set(a.uid, { x, y, scale: baseScale });
  });

  return map;
}

function drawVfxEffect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  element: BattleState['vfx'][number]['element'],
  progress: number, // 0..1
): void {
  const alpha = Math.max(0, 1 - progress * 0.92);
  ctx.save();
  ctx.globalAlpha = alpha;

  if (element === 'limit_break') {
    // Dazzling triple rainbow/gold shockwave rings + golden crossbeam + 16 starburst pixels!
    const rings: Array<[string, number, number]> = [
      ['#ffe566', 14 + progress * 44, 4],
      ['#7ce8ff', 10 + progress * 34, 3],
      ['#ff7ce0', 6 + progress * 24, 2],
    ];
    for (const [col, rad, lw] of rings) {
      ctx.strokeStyle = col;
      ctx.lineWidth = lw;
      ctx.beginPath();
      ctx.arc(x, y, rad, 0, Math.PI * 2);
      ctx.stroke();
    }
    // Golden crossbeam
    const beamLen = 14 + progress * 38;
    ctx.strokeStyle = '#fff9d6';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x - beamLen, y);
    ctx.lineTo(x + beamLen, y);
    ctx.moveTo(x, y - beamLen);
    ctx.lineTo(x, y + beamLen);
    ctx.stroke();
    // 16 starburst pixels
    const palette = ['#ffe566', '#7ce8ff', '#ff7ce0', '#7aff99'];
    for (let i = 0; i < 16; i += 1) {
      const ang = (i / 16) * Math.PI * 2 + progress * 3.2;
      const d = 6 + progress * (34 + (i % 2) * 10);
      ctx.fillStyle = palette[i % palette.length]!;
      ctx.fillRect(
        Math.round(x + Math.cos(ang) * d) - 2,
        Math.round(y + Math.sin(ang) * d) - 2,
        4,
        4,
      );
    }
  } else if (element === 'ultimate') {
    // Dramatic Boss Ultimate Double Shockwave + Lightning!
    const r1 = 10 + progress * 38;
    const r2 = 6 + progress * 24;
    ctx.strokeStyle = '#ff4d6a';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(x, y, r1, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = '#ffe566';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, r2, 0, Math.PI * 2);
    ctx.stroke();
    for (let i = 0; i < 12; i += 1) {
      const ang = (i / 12) * Math.PI * 2 + progress * 2.5;
      const d = 8 + progress * 32;
      ctx.fillStyle = i % 2 === 0 ? '#ff667a' : '#fff5b8';
      ctx.fillRect(Math.round(x + Math.cos(ang) * d) - 2, Math.round(y + Math.sin(ang) * d) - 2, 4, 4);
    }
  } else if (element === 'heal') {
    // DQ6 rising healing ribbons & sparkles
    for (let i = 0; i < 8; i += 1) {
      const ang = (i / 8) * Math.PI * 2 + progress * 3.5;
      const rx = x + Math.cos(ang) * (14 * (1 - progress * 0.4));
      const ry = y + 10 - progress * 32 + Math.sin(ang) * 5;
      ctx.fillStyle = i % 2 === 0 ? '#7aff99' : '#fff5b8';
      ctx.fillRect(Math.round(rx) - 1, Math.round(ry) - 3, 2, 6);
      ctx.fillRect(Math.round(rx) - 3, Math.round(ry) - 1, 6, 2);
    }
  } else if (element === 'shield' || element === 'buff') {
    ctx.strokeStyle = element === 'shield' ? '#70dcff' : '#ffe066';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y, 16 + progress * 18, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(x, y, 10 + progress * 14, 0, Math.PI * 2);
    ctx.stroke();
  } else if (element === 'freeze') {
    // Cyan crystal shatter burst
    ctx.strokeStyle = '#7ce8ff';
    ctx.lineWidth = 3;
    ctx.strokeRect(
      Math.round(x - 12 - progress * 8),
      Math.round(y - 12 - progress * 8),
      Math.round(24 + progress * 16),
      Math.round(24 + progress * 16),
    );
    for (let i = 0; i < 8; i += 1) {
      const ang = (i / 8) * Math.PI * 2 + 0.3;
      const dist = 6 + progress * 26;
      ctx.fillStyle = i % 2 === 0 ? '#7ce8ff' : '#ffffff';
      ctx.fillRect(Math.round(x + Math.cos(ang) * dist) - 2, Math.round(y + Math.sin(ang) * dist) - 2, 4, 4);
    }
  } else if (element === 'burn' || element === 'fire') {
    // Rising pixel fire pillar + embers
    for (let i = 0; i < 10; i += 1) {
      const spread = (i - 4.5) * 4;
      const rise = progress * 32 + (i % 3) * 6;
      ctx.fillStyle = i % 3 === 0 ? '#fff5b8' : i % 2 === 0 ? '#ff962e' : '#e63b24';
      ctx.fillRect(Math.round(x + spread), Math.round(y + 12 - rise), 4, 6);
    }
  } else if (element === 'star' || element === 'holy') {
    // Cascading starlight meteors + starburst
    ctx.strokeStyle = '#fff5b8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - 24, y - 24);
    ctx.lineTo(x + 24 * progress, y + 24 * progress);
    ctx.moveTo(x + 24, y - 24);
    ctx.lineTo(x - 24 * progress, y + 24 * progress);
    ctx.stroke();
    for (let i = 0; i < 10; i += 1) {
      const ang = (i / 10) * Math.PI * 2 + progress * 2;
      const d = 4 + progress * 28;
      ctx.fillStyle = i % 2 === 0 ? '#7ce8ff' : '#ffe566';
      ctx.fillRect(Math.round(x + Math.cos(ang) * d) - 2, Math.round(y + Math.sin(ang) * d) - 2, 4, 4);
    }
  } else {
    // DQ6 fluid curved pixel slash arc + sparks
    const colorMap: Record<string, [string, string]> = {
      physical: ['#ffffff', '#ffe082'],
      nature: ['#80ff72', '#d9ff8c'],
      earth: ['#d9a066', '#ffe3a3'],
    };
    const [c1, c2] = colorMap[element] ?? ['#ffffff', '#ffe066'];
    ctx.strokeStyle = c1;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(x, y, 22, -Math.PI * 0.75 + progress * 0.8, -Math.PI * 0.1 + progress * 1.4);
    ctx.stroke();
    for (let i = 0; i < 8; i += 1) {
      const ang = (i / 8) * Math.PI * 2;
      const dist = 6 + progress * 24;
      ctx.fillStyle = i % 2 === 0 ? c1 : c2;
      ctx.fillRect(Math.round(x + Math.cos(ang) * dist) - 2, Math.round(y + Math.sin(ang) * dist) - 2, 4, 4);
    }
  }

  ctx.restore();
}

export function renderBattleScene(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  state: BattleState,
  rawTimeMs: number,
  selectedTargetUid: string | null,
): Map<string, UnitAnchor> {
  ctx.imageSmoothingEnabled = false;
  const now = Date.now();
  const timeMs = rawTimeMs * 0.75; // 0.75x battle visual animation speed

  // Impact camera shake on crits / WEAK hits / Boss Ultimates!
  const shaking = now < state.shakeUntilMs;
  const camShakeX = shaking ? Math.round(Math.sin(timeMs * 0.09) * 4) : 0;
  const camShakeY = shaking ? Math.round(Math.cos(timeMs * 0.11) * 3) : 0;

  ctx.save();
  ctx.translate(camShakeX, camShakeY);

  drawBattleBackdrop(ctx, state.biome, width, height, timeMs);

  const anchors = getUnitPositions(state, width, height);
  const allUnits: BattleUnitState[] = [...state.enemies, ...state.allies];
  allUnits.sort((a, b) => (anchors.get(a.uid)?.y ?? 0) - (anchors.get(b.uid)?.y ?? 0));

  for (const unit of allUnits) {
    const pos = anchors.get(unit.uid);
    if (!pos) continue;

    const isDead = unit.hp <= 0;
    // Silky DQ6 8-frame pixel animation (~11fps idle, faster when enraged or charging!)
    const frameInterval = unit.charging ? 60 : unit.enraged ? 75 : 92;
    const frameSeed = Math.abs(unit.uid.charCodeAt(unit.uid.length - 1) ?? 0);
    const frameIdx =
      isDead || unit.freezeTurns > 0
        ? 0
        : (Math.floor(timeMs / frameInterval) + frameSeed) % ANIM_FRAME_COUNT;

    // Compute average target position for targeted body motion (dash, leap, swoop, whip, etc.)
    let targetPos: { x: number; y: number } | null = null;
    if (unit.activeMotion && unit.activeMotion.targetUids.length > 0) {
      let sx = 0;
      let sy = 0;
      let count = 0;
      for (const tuid of unit.activeMotion.targetUids) {
        const pt = anchors.get(tuid);
        if (pt) {
          sx += pt.x;
          sy += pt.y;
          count += 1;
        }
      }
      if (count > 0) {
        targetPos = { x: sx / count, y: sy / count };
      }
    }

    const motionTx = isDead
      ? {
          offsetX: 0,
          offsetY: 0,
          scaleX: 1,
          scaleY: 1,
          rotation: 0,
          afterimageOffsets: [],
          glowColor: null,
        }
      : computeUnitMotionTransform(unit, now, pos, targetPos);

    const isHurt = now < unit.hurtUntilMs;
    const hurtShakeX = isHurt ? Math.round(Math.sin(timeMs * 0.08) * 5) : 0;

    const drawScale = Math.round(pos.scale);
    const sprite = getSpriteCanvas(unit.spriteKey, drawScale, unit.isAlly, false, frameIdx, unit.equipKey);
    const sw = sprite.width;
    const sh = sprite.height;

    const cx = pos.x + motionTx.offsetX + hurtShakeX;
    const cy = pos.y + motionTx.offsetY;

    // Ground shadow (stays grounded and shrinks slightly when leaping)
    const leapShrink = Math.max(0.55, 1 + Math.min(0, motionTx.offsetY) / 90);
    const shadowW = Math.round(sw * 0.6 * leapShrink);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.36)';
    ctx.fillRect(
      Math.round(cx - shadowW * 0.5),
      Math.round(pos.y + sh * 0.38),
      shadowW,
      5,
    );

    // Subtle casting aura glow when unit is actively executing a skill/motion
    if (!isDead && motionTx.glowColor) {
      ctx.save();
      ctx.globalAlpha = 0.28;
      ctx.fillStyle = motionTx.glowColor;
      ctx.beginPath();
      ctx.arc(cx, cy, sw * 0.48, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // True Evolution prism double halo OR Extreme Evolution golden halo
    if (!isDead && unit.trueEvolved) {
      const r = sw * 0.43 + Math.sin(timeMs / 180 + frameSeed) * 2;
      ctx.strokeStyle = 'rgba(130, 238, 255, 0.88)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy + 2, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255, 160, 240, 0.78)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(cx, cy + 2, r - 4, 0, Math.PI * 2);
      ctx.stroke();
    } else if (!isDead && unit.evolved) {
      const r = sw * 0.4 + Math.sin(timeMs / 210 + frameSeed) * 2;
      ctx.strokeStyle = 'rgba(255, 224, 96, 0.78)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy + 2, r, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Charging crimson warning aura!
    if (!isDead && unit.charging) {
      const r = sw * 0.45 + Math.sin(timeMs / 90) * 4;
      ctx.strokeStyle = 'rgba(255, 68, 92, 0.92)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
      // Crackling charge sparks orbiting inward
      for (let i = 0; i < 6; i += 1) {
        const ang = (timeMs / 160) + (i / 6) * Math.PI * 2;
        ctx.fillStyle = i % 2 === 0 ? '#ff667a' : '#ffe566';
        ctx.fillRect(
          Math.round(cx + Math.cos(ang) * r) - 2,
          Math.round(cy + Math.sin(ang) * r) - 2,
          4,
          4,
        );
      }
    } else if (!isDead && unit.enraged) {
      // Boss Enrage fiery ring
      const r = sw * 0.42 + Math.sin(timeMs / 130) * 2;
      ctx.strokeStyle = 'rgba(255, 130, 48, 0.78)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Selected enemy reticle
    if (!unit.isAlly && !isDead && selectedTargetUid === unit.uid) {
      const pulse = 0.65 + Math.sin(timeMs / 150) * 0.3;
      ctx.strokeStyle = `rgba(255, 224, 92, ${pulse})`;
      ctx.lineWidth = 2;
      ctx.strokeRect(
        Math.round(cx - sw / 2 - 2),
        Math.round(cy - sh / 2 - 2),
        sw + 4,
        sh + 4,
      );
    }

    // Active turn golden pointer
    if (state.activeUid === unit.uid && !isDead) {
      const arrowY = Math.round(cy - sh / 2 - 12 + Math.sin(timeMs / 130) * 3);
      ctx.fillStyle = '#ffe359';
      ctx.beginPath();
      ctx.moveTo(cx, arrowY + 7);
      ctx.lineTo(cx - 5, arrowY);
      ctx.lineTo(cx + 5, arrowY);
      ctx.closePath();
      ctx.fill();
    }

    // Articulated motion-blur pixel afterimages
    if (!isDead && motionTx.afterimageOffsets.length > 0) {
      ctx.save();
      for (const ai of motionTx.afterimageOffsets) {
        ctx.globalAlpha = ai.alpha;
        ctx.drawImage(
          sprite,
          Math.round(pos.x + ai.dx - sw / 2),
          Math.round(pos.y + ai.dy - sh / 2),
        );
      }
      ctx.restore();
    }

    ctx.save();
    if (isDead) {
      ctx.globalAlpha = 0.26;
    } else if (isHurt && Math.floor(timeMs / 45) % 2 === 0) {
      ctx.globalAlpha = 0.55;
    }
    ctx.save();
    ctx.translate(Math.round(cx), Math.round(cy));
    if (motionTx.rotation !== 0) {
      ctx.rotate(motionTx.rotation);
    }
    if (motionTx.scaleX !== 1 || motionTx.scaleY !== 1) {
      ctx.scale(motionTx.scaleX, motionTx.scaleY);
    }
    ctx.drawImage(sprite, -Math.round(sw / 2), -Math.round(sh / 2));
    ctx.restore();

    // Evolved / True Evolved rising sparkles
    if (!isDead && (unit.evolved || unit.trueEvolved)) {
      const prism = ['#7ce8ff', '#ff9ce6', '#ffe86b', '#ffffff'];
      const count = unit.trueEvolved ? 7 : 5;
      for (let s = 0; s < count; s += 1) {
        const phase = ((timeMs / 860) + s * (1 / count) + frameSeed * 0.13) % 1;
        const sx = cx + Math.sin(timeMs / 240 + s * 1.7 + frameSeed) * (sw * 0.36);
        const sy = cy + sh * 0.3 - phase * (sh * 0.9);
        ctx.fillStyle = unit.trueEvolved
          ? prism[s % prism.length]!
          : s % 2 === 0
            ? '#ffe86b'
            : '#fff9d6';
        ctx.globalAlpha = Math.max(0.15, 1 - phase * 0.8);
        ctx.fillRect(Math.round(sx) - 1, Math.round(sy) - 1, 2, 2);
      }
      ctx.globalAlpha = 1;
    }

    // Shield bubble
    if (!isDead && unit.shield > 0) {
      ctx.strokeStyle = 'rgba(115, 214, 255, 0.78)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, sw * 0.44, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Freeze crystalline ice encasement
    if (!isDead && unit.freezeTurns > 0) {
      ctx.fillStyle = 'rgba(124, 232, 255, 0.28)';
      ctx.fillRect(Math.round(cx - sw * 0.38), Math.round(cy - sh * 0.38), Math.round(sw * 0.76), Math.round(sh * 0.76));
      ctx.strokeStyle = '#a8f4ff';
      ctx.lineWidth = 2;
      ctx.strokeRect(Math.round(cx - sw * 0.38), Math.round(cy - sh * 0.38), Math.round(sw * 0.76), Math.round(sh * 0.76));
    }

    // Burn flickering ember pixels
    if (!isDead && unit.burnTurns > 0) {
      const fy = cy + 6 - ((timeMs / 18) % 20);
      ctx.fillStyle = '#ff7b24';
      ctx.fillRect(Math.round(cx - 10), Math.round(fy), 3, 4);
      ctx.fillStyle = '#ffe566';
      ctx.fillRect(Math.round(cx + 8), Math.round(fy + 5), 3, 3);
    }

    // Def Break cracked violet mark
    if (!isDead && unit.defBreakTurns > 0) {
      ctx.fillStyle = '#d48aff';
      ctx.fillRect(Math.round(cx - 3), Math.round(cy + sh * 0.28), 6, 2);
      ctx.fillRect(Math.round(cx - 1), Math.round(cy + sh * 0.28 - 2), 2, 6);
    }

    // Poison floating violet droplets
    if (!isDead && unit.poisonTurns > 0) {
      const py = cy - 6 - ((timeMs / 22) % 16);
      ctx.fillStyle = '#d47cff';
      ctx.fillRect(Math.round(cx - 8), Math.round(py), 3, 3);
      ctx.fillRect(Math.round(cx + 6), Math.round(py + 6), 3, 3);
    }
    ctx.restore();

    // Overhead HP bar + Charge/Enrage tags for enemies
    if (!isDead && !unit.isAlly) {
      const bw = unit.isBoss ? 68 : 48;
      const bx = Math.round(cx - bw / 2);
      const by = Math.round(cy - sh / 2 - 8);
      ctx.fillStyle = 'rgba(16, 15, 24, 0.88)';
      ctx.fillRect(bx - 1, by - 1, bw + 2, 7);
      ctx.fillStyle = '#3b2429';
      ctx.fillRect(bx, by, bw, 5);
      const ratio = Math.max(0, Math.min(1, unit.hp / unit.maxHp));
      ctx.fillStyle = unit.charging ? '#ff385c' : unit.isBoss ? '#ff5768' : unit.isElite ? '#ffba3b' : '#eb5959';
      ctx.fillRect(bx, by, Math.round(bw * ratio), 5);

      if (unit.charging) {
        ctx.font = 'bold 10px "DotGothic16", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#14121d';
        ctx.fillText('⚠大技!', cx + 1, by - 3);
        ctx.fillStyle = '#ff667a';
        ctx.fillText('⚠大技!', cx, by - 4);
      } else if (unit.enraged) {
        ctx.font = 'bold 10px "DotGothic16", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ff9638';
        ctx.fillText('🔥怒り', cx, by - 4);
      }
    }
  }

  // Render Per-(Species x Skill) Trajectory VFX (with legacy elemental fallback, 0.75x speed)
  const vfxDurMs = 747;
  const legacyVfxDurMs = 613;
  for (const fx of state.vfx) {
    const elapsed = now - fx.createdAt;
    if (elapsed > vfxDurMs) continue;
    const anchor = anchors.get(fx.targetUid);
    if (!anchor) continue;
    const attackerAnchor = fx.attackerUid ? (anchors.get(fx.attackerUid) ?? null) : null;
    const progress = elapsed / vfxDurMs;
    const drawn = drawSkillTrajectoryVfx(ctx, fx, anchor, attackerAnchor, progress);
    if (!drawn) {
      drawVfxEffect(ctx, anchor.x, anchor.y, fx.element, Math.min(1, elapsed / legacyVfxDurMs));
    }
  }

  // Render Bespoke Hero & 10-Boss Signature Screen Cinematics
  if (state.activeCinematic) {
    drawSignatureCinematic(ctx, width, height, state.activeCinematic, anchors, now);
  }

  // Render Crisp Outlined Floating Numbers (0.75x speed)
  const floatDurMs = 1307;
  for (const ft of state.floatingTexts) {
    const elapsed = now - ft.createdAt;
    if (elapsed > floatDurMs) continue;
    const anchor = anchors.get(ft.targetUid);
    if (!anchor) continue;
    const progress = elapsed / floatDurMs;
    const fx = anchor.x;
    const fy = anchor.y - 18 - progress * 28;
    ctx.save();
    ctx.globalAlpha = Math.max(0, 1 - Math.max(0, progress - 0.55) * 2.2);
    ctx.font =
      ft.isCrit || ft.isWeak
        ? 'bold 16px "DotGothic16", sans-serif'
        : 'bold 13px "DotGothic16", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#14121d';
    ctx.fillText(ft.text, fx + 2, fy + 2);
    ctx.fillText(ft.text, fx - 1, fy - 1);
    ctx.fillStyle = ft.color;
    ctx.fillText(ft.text, fx, fy);
    ctx.restore();
  }

  ctx.restore();
  return anchors;
}
