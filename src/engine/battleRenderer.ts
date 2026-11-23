import { BIOMES } from '../game/data/biomes';
import type { BattleState, BattleUnitState, DungeonBiomeId } from '../game/types';
import { getSpriteCanvas } from './pixelSprites';

function drawBattleBackdrop(
  ctx: CanvasRenderingContext2D,
  biome: DungeonBiomeId,
  w: number,
  h: number,
  timeMs: number,
): void {
  const pal = BIOMES[biome].palette;
  const horizonY = Math.round(h * 0.44);

  // Sky / upper cavern gradient bands (pixel-stepped for 16-bit look!)
  const bands = 6;
  for (let i = 0; i < bands; i += 1) {
    ctx.fillStyle = i < 3 ? pal.skyTop : pal.skyBottom;
    ctx.globalAlpha = i < 3 ? 1 - i * 0.12 : 0.65 + (i - 3) * 0.12;
    const by = Math.round((horizonY / bands) * i);
    const bh = Math.ceil(horizonY / bands) + 1;
    ctx.fillRect(0, by, w, bh);
  }
  ctx.globalAlpha = 1;

  // Distant biome silhouettes
  if (biome === 'forest') {
    // Distant warm forest canopy hills
    ctx.fillStyle = '#255c37';
    for (let x = -10; x < w + 20; x += 38) {
      ctx.fillRect(x, horizonY - 26, 28, 28);
      ctx.fillStyle = '#367d46';
      ctx.fillRect(x + 6, horizonY - 34, 18, 20);
      ctx.fillStyle = '#255c37';
    }
    // Sunbeams
    ctx.fillStyle = 'rgba(255, 248, 184, 0.12)';
    ctx.fillRect(w * 0.2, 0, 26, horizonY + 40);
    ctx.fillRect(w * 0.65, 0, 18, horizonY + 30);
  } else if (biome === 'ruins') {
    // Ancient stone pillars with glowing cyan runes
    for (let x = 24; x < w; x += 74) {
      ctx.fillStyle = '#474f61';
      ctx.fillRect(x, 12, 18, horizonY - 10);
      ctx.fillStyle = '#68738a';
      ctx.fillRect(x + 2, 12, 4, horizonY - 12);
      ctx.fillStyle = '#6beeff';
      ctx.globalAlpha = 0.55 + Math.sin(timeMs / 400 + x) * 0.3;
      ctx.fillRect(x + 8, 28, 3, 14);
      ctx.fillRect(x + 8, 52, 3, 10);
      ctx.globalAlpha = 1;
    }
  } else if (biome === 'volcano') {
    // Distant lava waterfall & jagged basalt crags
    ctx.fillStyle = '#331512';
    for (let x = 0; x < w; x += 48) {
      ctx.fillRect(x, horizonY - 30, 36, 30);
      ctx.fillRect(x + 10, horizonY - 44, 16, 16);
    }
    // Glowing magma river along horizon
    ctx.fillStyle = '#ff6d24';
    ctx.fillRect(0, horizonY - 8, w, 10);
    ctx.fillStyle = '#ffe066';
    const shift = Math.floor(timeMs / 180) % 24;
    for (let x = -24; x < w + 24; x += 24) {
      ctx.fillRect(x + shift, horizonY - 5, 10, 3);
    }
  } else if (biome === 'abyss') {
    // Twinkling starfield + crescent moon
    ctx.fillStyle = '#fff3ad';
    ctx.fillRect(w - 58, 18, 18, 18);
    ctx.fillStyle = pal.skyTop;
    ctx.fillRect(w - 52, 16, 14, 14);
    for (let i = 0; i < 24; i += 1) {
      const sx = (i * 47 + 13) % w;
      const sy = (i * 29 + 7) % (horizonY - 8);
      ctx.fillStyle = i % 3 === 0 ? '#7ce8ff' : '#fff5c2';
      ctx.globalAlpha = 0.35 + ((Math.sin(timeMs / 320 + i) + 1) / 2) * 0.65;
      ctx.fillRect(sx, sy, i % 4 === 0 ? 3 : 2, i % 4 === 0 ? 3 : 2);
    }
    ctx.globalAlpha = 1;
  }

  // Battleground floor with warm checkered perspective stripes
  ctx.fillStyle = pal.groundPrimary;
  ctx.fillRect(0, horizonY, w, h - horizonY);
  ctx.fillStyle = pal.groundSecondary;
  for (let row = 0; row < 5; row += 1) {
    const ry = horizonY + row * Math.ceil((h - horizonY) / 5);
    if (row % 2 === 1) {
      ctx.fillRect(0, ry, w, Math.ceil((h - horizonY) / 5));
    }
  }
  // Horizon border
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fillRect(0, horizonY, w, 3);
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
  const topY = Math.round(h * 0.43);
  const usableH = Math.round(h * 0.5);

  const baseScale = w < 350 ? 2 : 3;
  const bossScale = w < 350 ? 3 : 4;

  // Enemies on left side (facing right)
  const eCount = state.enemies.length;
  state.enemies.forEach((e, idx) => {
    const t = eCount === 1 ? 0.5 : idx / (eCount - 1);
    const x = Math.round(w * (e.isBoss ? 0.25 : idx % 2 === 0 ? 0.2 : 0.31));
    const y = Math.round(topY + 12 + t * (usableH - 30));
    map.set(e.uid, { x, y, scale: e.isBoss ? bossScale : baseScale });
  });

  // Allies on right side (facing left)
  const aCount = state.allies.length;
  state.allies.forEach((a, idx) => {
    const t = aCount === 1 ? 0.5 : idx / (aCount - 1);
    const x = Math.round(w * (idx % 2 === 0 ? 0.76 : 0.85));
    const y = Math.round(topY + 10 + t * (usableH - 28));
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
  const alpha = Math.max(0, 1 - progress);
  ctx.save();
  ctx.globalAlpha = alpha;

  if (element === 'heal') {
    ctx.fillStyle = '#7aff99';
    for (let i = 0; i < 6; i += 1) {
      const ang = (i / 6) * Math.PI * 2 + progress * 2;
      const rx = x + Math.cos(ang) * (10 + progress * 14);
      const ry = y - progress * 22 + Math.sin(ang) * 6;
      ctx.fillRect(Math.round(rx) - 2, Math.round(ry) - 4, 4, 8);
      ctx.fillRect(Math.round(rx) - 4, Math.round(ry) - 2, 8, 4);
    }
  } else if (element === 'shield' || element === 'buff') {
    ctx.strokeStyle = element === 'shield' ? '#70dcff' : '#ffe066';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y, 14 + progress * 16, 0, Math.PI * 2);
    ctx.stroke();
  } else {
    // Elemental / Slash burst pixels
    const colorMap: Record<string, [string, string]> = {
      physical: ['#ffffff', '#ffe082'],
      nature: ['#80ff72', '#d9ff8c'],
      earth: ['#d9a066', '#ffe3a3'],
      fire: ['#ff6833', '#ffe566'],
      star: ['#7ce8ff', '#fff08a'],
      holy: ['#fff7b8', '#7ce8ff'],
    };
    const [c1, c2] = colorMap[element] ?? ['#ffffff', '#ffe066'];
    // Diagonal slash line
    ctx.strokeStyle = c1;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x - 18, y - 16 + progress * 10);
    ctx.lineTo(x + 18, y + 16 - progress * 10);
    ctx.stroke();

    // Burst sparks
    for (let i = 0; i < 8; i += 1) {
      const ang = (i / 8) * Math.PI * 2;
      const dist = 6 + progress * 24;
      ctx.fillStyle = i % 2 === 0 ? c1 : c2;
      ctx.fillRect(
        Math.round(x + Math.cos(ang) * dist) - 2,
        Math.round(y + Math.sin(ang) * dist) - 2,
        5,
        5,
      );
    }
  }

  ctx.restore();
}

export function renderBattleScene(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  state: BattleState,
  timeMs: number,
  selectedTargetUid: string | null,
): Map<string, UnitAnchor> {
  ctx.imageSmoothingEnabled = false;
  drawBattleBackdrop(ctx, state.biome, width, height, timeMs);

  const anchors = getUnitPositions(state, width, height);
  const allUnits: BattleUnitState[] = [...state.enemies, ...state.allies];

  // Sort by Y for clean depth overlap
  allUnits.sort((a, b) => (anchors.get(a.uid)?.y ?? 0) - (anchors.get(b.uid)?.y ?? 0));

  for (const unit of allUnits) {
    const pos = anchors.get(unit.uid);
    if (!pos) continue;

    const isDead = unit.hp <= 0;
    const bob = isDead ? 0 : Math.round(Math.sin(timeMs / 220 + pos.y) * 2);
    const lungeOffset =
      unit.lungeTimer > 0 ? (unit.isAlly ? -16 : 16) : 0;
    const shakeX =
      unit.hurtTimer > 0 ? Math.round(Math.sin(timeMs / 24) * 5) : 0;

    const drawScale = Math.round(pos.scale);
    const sprite = getSpriteCanvas(unit.spriteKey, drawScale, unit.isAlly);
    const sw = sprite.width;
    const sh = sprite.height;

    const cx = pos.x + lungeOffset + shakeX;
    const cy = pos.y + bob;

    // Ground shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.36)';
    ctx.fillRect(Math.round(cx - sw * 0.36), Math.round(pos.y + sh * 0.34), Math.round(sw * 0.72), 6);

    // Selected enemy target reticle
    if (!unit.isAlly && !isDead && selectedTargetUid === unit.uid) {
      const pulse = 0.65 + Math.sin(timeMs / 150) * 0.3;
      ctx.strokeStyle = `rgba(255, 224, 92, ${pulse})`;
      ctx.lineWidth = 2;
      ctx.strokeRect(
        Math.round(cx - sw / 2 - 4),
        Math.round(cy - sh / 2 - 4),
        sw + 8,
        sh + 8,
      );
    }

    // Active turn golden pointer above acting unit
    if (state.activeUid === unit.uid && !isDead) {
      const arrowY = Math.round(cy - sh / 2 - 12 + Math.sin(timeMs / 140) * 3);
      ctx.fillStyle = '#ffe359';
      ctx.beginPath();
      ctx.moveTo(cx, arrowY + 7);
      ctx.lineTo(cx - 6, arrowY);
      ctx.lineTo(cx + 6, arrowY);
      ctx.closePath();
      ctx.fill();
    }

    ctx.save();
    if (isDead) {
      ctx.globalAlpha = 0.28;
    }
    ctx.drawImage(sprite, Math.round(cx - sw / 2), Math.round(cy - sh / 2));

    // Shield bubble
    if (!isDead && unit.shield > 0) {
      ctx.strokeStyle = 'rgba(115, 214, 255, 0.75)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, sw * 0.52, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();

    // Overhead mini HP/Shield bar for enemies (and subtle bar for allies)
    if (!isDead && !unit.isAlly) {
      const bw = unit.isBoss ? 68 : 46;
      const bx = Math.round(cx - bw / 2);
      const by = Math.round(cy - sh / 2 - 9);
      ctx.fillStyle = 'rgba(16, 15, 24, 0.85)';
      ctx.fillRect(bx - 1, by - 1, bw + 2, 7);
      ctx.fillStyle = '#3b2429';
      ctx.fillRect(bx, by, bw, 5);
      const ratio = Math.max(0, Math.min(1, unit.hp / unit.maxHp));
      ctx.fillStyle = unit.isBoss ? '#ff5768' : unit.isElite ? '#ffba3b' : '#eb5959';
      ctx.fillRect(bx, by, Math.round(bw * ratio), 5);
    }
  }

  // Render Pixel VFX Bursts
  const now = Date.now();
  for (const fx of state.vfx) {
    const elapsed = now - fx.createdAt;
    if (elapsed > 420) continue;
    const anchor = anchors.get(fx.targetUid);
    if (!anchor) continue;
    drawVfxEffect(ctx, anchor.x, anchor.y, fx.element, elapsed / 420);
  }

  // Render Floating Damage / Heal Numbers
  for (const ft of state.floatingTexts) {
    const elapsed = now - ft.createdAt;
    if (elapsed > 950) continue;
    const anchor = anchors.get(ft.targetUid);
    if (!anchor) continue;
    const progress = elapsed / 950;
    const fx = anchor.x;
    const fy = anchor.y - 18 - progress * 26;
    ctx.save();
    ctx.globalAlpha = Math.max(0, 1 - Math.max(0, progress - 0.55) * 2.2);
    ctx.font = ft.isCrit
      ? 'bold 17px "DotGothic16", sans-serif'
      : 'bold 14px "DotGothic16", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#14121d';
    ctx.fillText(ft.text, fx + 2, fy + 2);
    ctx.fillText(ft.text, fx - 1, fy - 1);
    ctx.fillStyle = ft.color;
    ctx.fillText(ft.text, fx, fy);
    ctx.restore();
  }

  return anchors;
}
