import { BIOMES } from '../game/data/biomes';
import type { BiomeId, DungeonMap, MapEntity, TileKind } from '../game/types';
import { getSpriteCanvas } from './pixelSprites';

export const TILE_PIXEL_SIZE = 32; // 16x16 logical pixel art scaled 2x crisp

function drawTile(
  ctx: CanvasRenderingContext2D,
  biome: BiomeId,
  tile: TileKind,
  gx: number,
  gy: number,
  px: number,
  py: number,
  timeMs: number,
): void {
  const s = TILE_PIXEL_SIZE;
  const pal = BIOMES[biome].palette;
  const hash = (gx * 37 + gy * 17) & 7;

  // Base floor
  ctx.fillStyle = (gx + gy) % 2 === 0 ? pal.groundPrimary : pal.groundSecondary;
  ctx.fillRect(px, py, s, s);

  if (tile === 'floor' || tile === 'floor_alt') {
    // Subtle 16-bit texture speckles
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    if (hash === 0 || hash === 3) {
      ctx.fillRect(px + 6, py + 8, 4, 2);
      ctx.fillRect(px + 20, py + 22, 4, 2);
    } else if (hash === 2) {
      ctx.fillRect(px + 14, py + 12, 2, 4);
    }

    if (tile === 'floor_alt') {
      if (biome === 'village' || biome === 'forest') {
        // Warm wildflowers / clover
        ctx.fillStyle = '#387d36';
        ctx.fillRect(px + 8, py + 18, 4, 6);
        ctx.fillRect(px + 20, py + 10, 4, 6);
        ctx.fillStyle = hash % 2 === 0 ? '#ffe56b' : '#ffb8cf';
        ctx.fillRect(px + 8, py + 14, 4, 4);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(px + 20, py + 8, 4, 4);
      } else if (biome === 'ruins') {
        // Glowing carved floor rune
        ctx.fillStyle = '#5c6373';
        ctx.fillRect(px + 4, py + 4, s - 8, s - 8);
        ctx.fillStyle = pal.accent;
        ctx.globalAlpha = 0.55 + Math.sin(timeMs / 450 + gx + gy) * 0.25;
        ctx.fillRect(px + 12, py + 8, 8, 2);
        ctx.fillRect(px + 15, py + 8, 2, 16);
        ctx.fillRect(px + 10, py + 18, 12, 2);
        ctx.globalAlpha = 1;
      } else if (biome === 'volcano') {
        // Glowing ember cracks
        ctx.fillStyle = '#381e1c';
        ctx.fillRect(px + 6, py + 14, 18, 4);
        ctx.fillStyle = '#ff8b33';
        ctx.globalAlpha = 0.65 + Math.sin(timeMs / 300 + gx) * 0.25;
        ctx.fillRect(px + 8, py + 15, 14, 2);
        ctx.globalAlpha = 1;
      } else if (biome === 'abyss') {
        // Twinkling floor stars
        const twinkle = 0.45 + Math.sin(timeMs / 350 + gx * 2 + gy) * 0.45;
        ctx.fillStyle = '#fff5b8';
        ctx.globalAlpha = twinkle;
        ctx.fillRect(px + 10, py + 10, 4, 4);
        ctx.fillRect(px + 22, py + 20, 2, 2);
        ctx.globalAlpha = 1;
      }
    }
    return;
  }

  if (tile === 'road') {
    // Warm village cobblestones
    ctx.fillStyle = '#d4b483';
    ctx.fillRect(px, py, s, s);
    ctx.fillStyle = '#bd9a68';
    ctx.fillRect(px + 2, py + 2, 12, 10);
    ctx.fillRect(px + 16, py + 4, 14, 10);
    ctx.fillRect(px + 4, py + 16, 14, 12);
    ctx.fillRect(px + 20, py + 18, 10, 10);
    ctx.fillStyle = '#e8cfa0';
    ctx.fillRect(px + 4, py + 4, 8, 2);
    ctx.fillRect(px + 18, py + 6, 8, 2);
    ctx.fillRect(px + 6, py + 18, 8, 2);
    return;
  }

  if (tile === 'wall') {
    // 2.5D top-down RPG wall with top bevel & front face
    ctx.fillStyle = pal.wallFront;
    ctx.fillRect(px, py, s, s);
    ctx.fillStyle = pal.wallTop;
    ctx.fillRect(px, py, s, s - 10);
    // Brick / foliage highlight
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fillRect(px + 2, py + 2, s - 4, 4);
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.fillRect(px, py + s - 12, s, 2);
    if (biome === 'forest') {
      // Dense forest canopy bush wall
      ctx.fillStyle = '#337a42';
      ctx.fillRect(px + 4, py + 4, 10, 10);
      ctx.fillRect(px + 16, py + 6, 12, 10);
      ctx.fillStyle = '#5bb559';
      ctx.fillRect(px + 6, py + 4, 6, 4);
      ctx.fillRect(px + 18, py + 6, 6, 4);
    } else if (biome === 'volcano') {
      ctx.fillStyle = '#b33d20';
      ctx.fillRect(px + 4, py + 8, 10, 4);
      ctx.fillRect(px + 18, py + 14, 10, 4);
    } else if (biome === 'abyss') {
      ctx.fillStyle = '#3a5496';
      ctx.fillRect(px + 6, py + 6, 6, 6);
      ctx.fillStyle = '#ffe570';
      ctx.fillRect(px + 22, py + 10, 2, 2);
    }
    return;
  }

  if (tile === 'tree') {
    // Lush sunlit village border tree
    ctx.fillStyle = '#54963f';
    ctx.fillRect(px, py, s, s);
    ctx.fillStyle = '#633c22';
    ctx.fillRect(px + 12, py + 20, 8, 10);
    ctx.fillStyle = '#236634';
    ctx.fillRect(px + 4, py + 4, 24, 18);
    ctx.fillStyle = '#399446';
    ctx.fillRect(px + 6, py + 2, 20, 14);
    ctx.fillStyle = '#73cf61';
    ctx.fillRect(px + 8, py + 4, 10, 6);
    return;
  }

  if (tile === 'water') {
    const wave = Math.floor(timeMs / 400 + gx) % 2 === 0;
    ctx.fillStyle = biome === 'volcano' ? '#e84c22' : '#3588d4';
    ctx.fillRect(px, py, s, s);
    ctx.fillStyle = biome === 'volcano' ? '#ffcf54' : '#7dd6ff';
    ctx.fillRect(px + (wave ? 4 : 10), py + 8, 10, 3);
    ctx.fillRect(px + (wave ? 14 : 6), py + 20, 12, 3);
    return;
  }

  if (tile === 'house_roof') {
    // Warm terracotta 16-bit village roof
    ctx.fillStyle = '#b54635';
    ctx.fillRect(px, py, s, s);
    ctx.fillStyle = '#d96248';
    ctx.fillRect(px + 2, py + 4, s - 4, 6);
    ctx.fillRect(px + 2, py + 16, s - 4, 6);
    ctx.fillStyle = '#7d2a1f';
    ctx.fillRect(px, py + s - 4, s, 4);
    return;
  }

  if (tile === 'house_wall') {
    // Timber & cream plaster house wall with warm glowing window
    ctx.fillStyle = '#f2e3c2';
    ctx.fillRect(px, py, s, s);
    ctx.fillStyle = '#7d4d2a';
    ctx.fillRect(px, py, 4, s);
    ctx.fillRect(px + s - 4, py, 4, s);
    ctx.fillRect(px, py + s - 4, s, 4);
    // Window
    ctx.fillStyle = '#5c381f';
    ctx.fillRect(px + 8, py + 6, 16, 14);
    ctx.fillStyle = '#ffe580';
    ctx.fillRect(px + 10, py + 8, 12, 10);
    ctx.fillStyle = '#5c381f';
    ctx.fillRect(px + 15, py + 8, 2, 10);
    ctx.fillRect(px + 10, py + 12, 12, 2);
    return;
  }

  if (tile === 'stairs_down') {
    ctx.fillStyle = '#23202e';
    ctx.fillRect(px + 4, py + 4, s - 8, s - 8);
    // Stone steps going down with warm beacon glow
    for (let step = 0; step < 4; step += 1) {
      ctx.fillStyle = step % 2 === 0 ? '#b8ad95' : '#8f846e';
      ctx.fillRect(px + 6 + step * 3, py + 6 + step * 4, s - 12 - step * 3, 4);
    }
    const pulse = 0.45 + Math.sin(timeMs / 280) * 0.35;
    ctx.strokeStyle = `rgba(255, 224, 102, ${pulse})`;
    ctx.lineWidth = 2;
    ctx.strokeRect(px + 3, py + 3, s - 6, s - 6);
    return;
  }

  if (tile === 'dungeon_gate') {
    // Grand stone archway portal into the Labyrinth!
    ctx.fillStyle = '#4e5566';
    ctx.fillRect(px, py, s, s);
    ctx.fillStyle = '#7c8599';
    ctx.fillRect(px + 2, py + 2, s - 4, 6);
    ctx.fillRect(px + 2, py + 2, 6, s - 4);
    ctx.fillRect(px + s - 8, py + 2, 6, s - 4);
    // Swirl portal inside
    const glow = 0.7 + Math.sin(timeMs / 260) * 0.25;
    ctx.fillStyle = '#1b264f';
    ctx.fillRect(px + 8, py + 8, s - 16, s - 8);
    ctx.fillStyle = `rgba(110, 232, 255, ${glow})`;
    ctx.fillRect(px + 11, py + 11, s - 22, s - 14);
    ctx.fillStyle = '#fff5b8';
    ctx.fillRect(px + 14, py + 14, 4, 8);
    return;
  }

  // Facility floor tile base (actual sprite drawn as entity)
  if (tile === 'fountain' || tile === 'altar' || tile === 'ranch' || tile === 'shop' || tile === 'shrine') {
    ctx.fillStyle = '#d4b483';
    ctx.fillRect(px, py, s, s);
  }
}

export interface RenderMapOptions {
  map: DungeonMap;
  timeMs: number;
  targetTile: { x: number; y: number } | null;
  heroFacingLeft: boolean;
  cameraRef: { x: number; y: number };
}

export function renderDungeonMap(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  opts: RenderMapOptions,
): { camX: number; camY: number } {
  const { map, timeMs, targetTile, heroFacingLeft, cameraRef } = opts;
  ctx.imageSmoothingEnabled = false;

  const s = TILE_PIXEL_SIZE;
  const targetCamX = map.playerX * s + s / 2 - width / 2;
  const targetCamY = map.playerY * s + s / 2 - height / 2;

  // Smooth camera lerp
  cameraRef.x += (targetCamX - cameraRef.x) * 0.24;
  cameraRef.y += (targetCamY - cameraRef.y) * 0.24;

  const camX = Math.round(cameraRef.x);
  const camY = Math.round(cameraRef.y);

  // Fill background void
  ctx.fillStyle = '#14131c';
  ctx.fillRect(0, 0, width, height);

  const startX = Math.max(0, Math.floor(camX / s) - 1);
  const endX = Math.min(map.width - 1, Math.ceil((camX + width) / s) + 1);
  const startY = Math.max(0, Math.floor(camY / s) - 1);
  const endY = Math.min(map.height - 1, Math.ceil((camY + height) / s) + 1);

  for (let y = startY; y <= endY; y += 1) {
    for (let x = startX; x <= endX; x += 1) {
      const px = x * s - camX;
      const py = y * s - camY;
      if (!map.explored[y]![x]) {
        ctx.fillStyle = '#14131c';
        ctx.fillRect(px, py, s, s);
        continue;
      }
      drawTile(ctx, map.biome, map.tiles[y]![x]!, x, y, px, py, timeMs);
    }
  }

  // Draw tap-to-move target marker
  if (targetTile) {
    const tx = targetTile.x * s - camX;
    const ty = targetTile.y * s - camY;
    const pulse = 0.55 + Math.sin(timeMs / 180) * 0.35;
    ctx.strokeStyle = `rgba(255, 232, 102, ${pulse})`;
    ctx.lineWidth = 2;
    ctx.strokeRect(tx + 4, ty + 4, s - 8, s - 8);
  }

  // Draw Entities (chests, shrines, NPCs, symbol enemies, elites, bosses)
  const bob = Math.sin(timeMs / 240) * 2;
  for (const ent of map.entities) {
    if (ent.interacted) continue;
    if (!map.explored[ent.y]?.[ent.x]) continue;
    if (ent.kind === 'npc' && ent.npcAction === 'gate') {
      // Gate is drawn as tile; add floating label
      drawFloatingLabel(ctx, ent.x * s - camX + s / 2, ent.y * s - camY - 4, '迷宮へ', '#ffe670');
      continue;
    }

    const ex = ent.x * s - camX;
    const ey = ent.y * s - camY;

    // Ground shadow
    ctx.fillStyle = 'rgba(0,0,0,0.32)';
    ctx.fillRect(ex + 6, ey + s - 6, s - 12, 4);

    // Aura rings for Elite / Boss / Gold Chest
    if (ent.kind === 'boss') {
      const r = 13 + Math.sin(timeMs / 160) * 2;
      ctx.strokeStyle = 'rgba(255, 86, 86, 0.85)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(ex + s / 2, ey + s / 2 + 4, r, 0, Math.PI * 2);
      ctx.stroke();
    } else if (ent.kind === 'elite' || ent.kind === 'gold_chest') {
      const r = 12 + Math.sin(timeMs / 190) * 2;
      ctx.strokeStyle = 'rgba(255, 218, 74, 0.85)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(ex + s / 2, ey + s / 2 + 4, r, 0, Math.PI * 2);
      ctx.stroke();
    }

    const sprite = getSpriteCanvas(ent.spriteKey, 2, false);
    const yOffset = ent.kind === 'chest' || ent.kind === 'gold_chest' || ent.kind === 'shrine' ? 0 : Math.round(bob);
    ctx.drawImage(sprite, ex, ey - 3 + yOffset);

    // Helpful labels in village or for boss
    if (ent.kind === 'npc') {
      const shortMap: Record<NonNullable<MapEntity['npcAction']>, string> = {
        fountain: '回復の泉',
        ranch: '牧場',
        shop: '商店',
        altar: '世界ランク',
        gate: '迷宮',
      };
      if (ent.npcAction) {
        drawFloatingLabel(ctx, ex + s / 2, ey - 6, shortMap[ent.npcAction], '#fff5cf');
      }
    } else if (ent.kind === 'boss') {
      drawFloatingLabel(ctx, ex + s / 2, ey - 8, 'BOSS', '#ff7070');
    } else if (ent.kind === 'elite') {
      drawFloatingLabel(ctx, ex + s / 2, ey - 8, '★強敵', '#ffe066');
    }
  }

  // Draw Hero
  const hx = map.playerX * s - camX;
  const hy = map.playerY * s - camY;
  ctx.fillStyle = 'rgba(0,0,0,0.38)';
  ctx.fillRect(hx + 6, hy + s - 6, s - 12, 4);
  const heroSprite = getSpriteCanvas('hero', 2, heroFacingLeft);
  const heroBob = Math.round(Math.sin(timeMs / 190) * 1.5);
  ctx.drawImage(heroSprite, hx, hy - 5 + heroBob);

  // Ambient floating biome particles (pollen, dust, embers, starlight)
  const particleColor = BIOMES[map.biome].palette.particle;
  ctx.fillStyle = particleColor;
  for (let i = 0; i < 14; i += 1) {
    const px = ((i * 89 + Math.floor(timeMs * 0.015 * ((i % 3) + 1))) % (width + 20)) - 10;
    const py =
      ((i * 53 + (map.biome === 'volcano' ? -timeMs * 0.025 : timeMs * 0.01)) % (height + 20) +
        height +
        20) %
        (height + 20) -
      10;
    ctx.globalAlpha = 0.25 + ((Math.sin(timeMs / 300 + i) + 1) / 2) * 0.45;
    ctx.fillRect(Math.round(px), Math.round(py), 2, 2);
  }
  ctx.globalAlpha = 1;

  // Draw compact corner minimap inside dungeon
  if (map.floor > 0) {
    drawMinimap(ctx, map, width);
  }

  return { camX, camY };
}

function drawFloatingLabel(
  ctx: CanvasRenderingContext2D,
  cx: number,
  y: number,
  text: string,
  color: string,
): void {
  ctx.font = 'bold 10px "DotGothic16", sans-serif';
  ctx.textAlign = 'center';
  const metrics = ctx.measureText(text);
  const w = metrics.width + 8;
  ctx.fillStyle = 'rgba(20, 18, 30, 0.78)';
  ctx.fillRect(Math.round(cx - w / 2), Math.round(y - 10), Math.round(w), 13);
  ctx.fillStyle = color;
  ctx.fillText(text, Math.round(cx), Math.round(y));
}

function drawMinimap(ctx: CanvasRenderingContext2D, map: DungeonMap, canvasW: number): void {
  const cell = 3;
  const pad = 6;
  const mw = map.width * cell;
  const mh = map.height * cell;
  const ox = canvasW - mw - pad - 6;
  const oy = 8;

  ctx.fillStyle = 'rgba(18, 17, 28, 0.76)';
  ctx.fillRect(ox - 3, oy - 3, mw + 6, mh + 6);
  ctx.strokeStyle = 'rgba(232, 198, 118, 0.55)';
  ctx.lineWidth = 1;
  ctx.strokeRect(ox - 3, oy - 3, mw + 6, mh + 6);

  for (let y = 0; y < map.height; y += 1) {
    for (let x = 0; x < map.width; x += 1) {
      if (!map.explored[y]![x]) continue;
      const t = map.tiles[y]![x]!;
      if (t === 'wall') continue;
      ctx.fillStyle = t === 'stairs_down' ? '#ffe56b' : '#65728f';
      ctx.fillRect(ox + x * cell, oy + y * cell, cell, cell);
    }
  }

  for (const e of map.entities) {
    if (e.interacted || !map.explored[e.y]?.[e.x]) continue;
    if (e.kind === 'boss') ctx.fillStyle = '#ff5454';
    else if (e.kind === 'elite') ctx.fillStyle = '#ffba3b';
    else if (e.kind === 'enemy') ctx.fillStyle = '#e06c6c';
    else if (e.kind === 'chest' || e.kind === 'gold_chest') ctx.fillStyle = '#ffe66b';
    else if (e.kind === 'shrine') ctx.fillStyle = '#6beeff';
    else continue;
    ctx.fillRect(ox + e.x * cell, oy + e.y * cell, cell, cell);
  }

  // Player dot
  ctx.fillStyle = '#6bff8a';
  ctx.fillRect(ox + map.playerX * cell, oy + map.playerY * cell, cell, cell);
}
