import { BIOMES } from '../game/data/biomes';
import type { ExpeditionState } from '../game/expedition';
import { getSpecies } from '../game/data/monsters';
import type { GameSave } from '../game/types';
import { getSpriteCanvas } from './pixelSprites';

function drawVillageBackdrop(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  timeMs: number,
): void {
  const horizonY = Math.round(h * 0.5);

  // Warm sunlit sky bands
  const skyColors = ['#58a6e0', '#77bdf0', '#9cd4fa', '#c4e9ff'];
  const bandH = Math.ceil(horizonY / skyColors.length);
  skyColors.forEach((c, i) => {
    ctx.fillStyle = c;
    ctx.fillRect(0, i * bandH, w, bandH + 1);
  });

  // Pixel Sun
  ctx.fillStyle = '#fff5b8';
  ctx.fillRect(w - 58, 16, 22, 22);
  ctx.fillStyle = '#ffe166';
  ctx.fillRect(w - 54, 20, 14, 14);

  // Slowly drifting pixel clouds
  const cloudShift = Math.floor(timeMs * 0.008) % (w + 80);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  const drawCloud = (cx: number, cy: number) => {
    const x = ((cx + cloudShift) % (w + 80)) - 40;
    ctx.fillRect(x, cy, 34, 8);
    ctx.fillRect(x + 6, cy - 6, 22, 6);
  };
  drawCloud(20, 26);
  drawCloud(180, 42);
  drawCloud(310, 22);

  // Distant rolling emerald hills
  ctx.fillStyle = '#498f46';
  for (let x = -12; x < w + 32; x += 48) {
    ctx.fillRect(x, horizonY - 22, 42, 24);
    ctx.fillStyle = '#5eb054';
    ctx.fillRect(x + 8, horizonY - 28, 26, 14);
    ctx.fillStyle = '#498f46';
  }

  // Cozy 16-bit village timber house (left) & Monster Ranch barn (right)
  const drawHouse = (hx: number, hy: number, roofColor: string) => {
    ctx.fillStyle = '#f2e3c2';
    ctx.fillRect(hx + 4, hy, 44, 28);
    ctx.fillStyle = '#7d4d2a';
    ctx.fillRect(hx + 4, hy, 4, 28);
    ctx.fillRect(hx + 44, hy, 4, 28);
    ctx.fillRect(hx + 18, hy + 10, 12, 18); // door
    ctx.fillStyle = '#ffe580';
    ctx.fillRect(hx + 34, hy + 8, 8, 8); // lit window
    // Roof
    ctx.fillStyle = roofColor;
    ctx.fillRect(hx, hy - 10, 52, 12);
    ctx.fillRect(hx + 6, hy - 18, 40, 8);
    ctx.fillRect(hx + 14, hy - 22, 24, 4);
  };
  drawHouse(18, horizonY - 24, '#c44d38');
  drawHouse(w - 76, horizonY - 24, '#3e7a4c');

  // Grassy ground & warm cobblestone plaza road
  ctx.fillStyle = '#5da145';
  ctx.fillRect(0, horizonY, w, h - horizonY);
  ctx.fillStyle = '#4e8f3a';
  ctx.fillRect(0, horizonY, w, 6);

  const roadY = Math.round(h * 0.62);
  const roadH = Math.round(h * 0.26);
  ctx.fillStyle = '#d4b483';
  ctx.fillRect(0, roadY, w, roadH);
  ctx.fillStyle = '#be9b68';
  for (let x = 4; x < w; x += 26) {
    ctx.fillRect(x, roadY + 6, 16, 8);
    ctx.fillRect(x + 12, roadY + 20, 16, 8);
  }

  // Fountain & World Tier Altar props in background plaza
  const fountain = getSpriteCanvas('fountain', 2, false);
  const altar = getSpriteCanvas('altar', 2, false);
  ctx.drawImage(fountain, Math.round(w * 0.24), horizonY - 8);
  ctx.drawImage(altar, Math.round(w * 0.68), horizonY - 8);
}

function drawDungeonParallax(
  ctx: CanvasRenderingContext2D,
  exp: ExpeditionState,
  w: number,
  h: number,
  timeMs: number,
  scrollPx: number,
): void {
  const pal = BIOMES[exp.biome].palette;
  const horizonY = Math.round(h * 0.48);

  // Pixel-stepped sky / cavern wall gradient
  const bands = 5;
  for (let i = 0; i < bands; i += 1) {
    ctx.fillStyle = i < 2 ? pal.skyTop : pal.skyBottom;
    ctx.globalAlpha = i < 2 ? 1 - i * 0.1 : 0.72 + (i - 2) * 0.09;
    const by = Math.round((horizonY / bands) * i);
    ctx.fillRect(0, by, w, Math.ceil(horizonY / bands) + 1);
  }
  ctx.globalAlpha = 1;

  // Parallax landmarks scrolling smoothly when party advances
  const farShift = Math.floor(scrollPx * 0.35);
  const midShift = Math.floor(scrollPx * 0.75);

  if (exp.biome === 'forest') {
    for (let i = -1; i < Math.ceil(w / 44) + 2; i += 1) {
      const tx = i * 44 - (farShift % 44);
      ctx.fillStyle = '#245934';
      ctx.fillRect(tx, horizonY - 36, 32, 38);
      ctx.fillStyle = '#388547';
      ctx.fillRect(tx + 6, horizonY - 46, 20, 22);
      ctx.fillStyle = '#5c3c24';
      ctx.fillRect(tx + 12, horizonY - 12, 8, 14);
    }
    // Sunbeams
    ctx.fillStyle = 'rgba(255, 248, 184, 0.12)';
    ctx.fillRect(w * 0.22, 0, 22, horizonY + 35);
    ctx.fillRect(w * 0.68, 0, 16, horizonY + 25);
  } else if (exp.biome === 'ruins') {
    for (let i = -1; i < Math.ceil(w / 68) + 2; i += 1) {
      const px = i * 68 - (midShift % 68);
      ctx.fillStyle = '#474f61';
      ctx.fillRect(px, 10, 20, horizonY - 8);
      ctx.fillStyle = '#68738a';
      ctx.fillRect(px + 2, 10, 4, horizonY - 10);
      ctx.fillStyle = '#6beeff';
      ctx.globalAlpha = 0.55 + Math.sin(timeMs / 380 + i) * 0.3;
      ctx.fillRect(px + 9, 26, 3, 14);
      ctx.fillRect(px + 9, 48, 3, 10);
      ctx.globalAlpha = 1;
    }
  } else if (exp.biome === 'volcano') {
    for (let i = -1; i < Math.ceil(w / 52) + 2; i += 1) {
      const vx = i * 52 - (farShift % 52);
      ctx.fillStyle = '#361613';
      ctx.fillRect(vx, horizonY - 34, 40, 34);
      ctx.fillRect(vx + 10, horizonY - 48, 18, 18);
    }
    ctx.fillStyle = '#ff6d24';
    ctx.fillRect(0, horizonY - 8, w, 10);
    ctx.fillStyle = '#ffe066';
    const lavaShift = Math.floor(timeMs / 170) % 24;
    for (let x = -24; x < w + 24; x += 24) {
      ctx.fillRect(x + lavaShift, horizonY - 5, 10, 3);
    }
  } else if (exp.biome === 'abyss') {
    ctx.fillStyle = '#fff3ad';
    ctx.fillRect(w - 58, 16, 18, 18);
    ctx.fillStyle = pal.skyTop;
    ctx.fillRect(w - 52, 14, 14, 14);
    for (let i = 0; i < 24; i += 1) {
      const sx = ((i * 53 - farShift) % w + w) % w;
      const sy = (i * 29 + 8) % (horizonY - 10);
      ctx.fillStyle = i % 3 === 0 ? '#7ce8ff' : '#fff5c2';
      ctx.globalAlpha = 0.35 + ((Math.sin(timeMs / 320 + i) + 1) / 2) * 0.65;
      ctx.fillRect(sx, sy, i % 4 === 0 ? 3 : 2, i % 4 === 0 ? 3 : 2);
    }
    ctx.globalAlpha = 1;
  }

  // Scrolling ground corridor
  ctx.fillStyle = pal.groundPrimary;
  ctx.fillRect(0, horizonY, w, h - horizonY);
  ctx.fillStyle = pal.groundSecondary;
  const tileW = 32;
  for (let i = -1; i < Math.ceil(w / tileW) + 2; i += 1) {
    const gx = i * tileW - (midShift % tileW);
    ctx.fillRect(gx, horizonY + 8, 16, 10);
    ctx.fillRect(gx + 14, horizonY + 26, 16, 10);
    ctx.fillRect(gx + 4, horizonY + 46, 16, 10);
  }
  ctx.fillStyle = 'rgba(0,0,0,0.32)';
  ctx.fillRect(0, horizonY, w, 3);
}

export function renderExpeditionScene(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  exp: ExpeditionState,
  save: GameSave,
  timeMs: number,
  scrollRef: { offset: number },
): void {
  ctx.imageSmoothingEnabled = false;

  const isMarching = !exp.inVillage && Date.now() < exp.marchUntilMs;
  if (isMarching) {
    scrollRef.offset += 2.6;
  }

  if (exp.inVillage) {
    drawVillageBackdrop(ctx, width, height, timeMs);
  } else {
    drawDungeonParallax(ctx, exp, width, height, timeMs, scrollRef.offset);
  }

  // Draw the Party marching / standing in warm 16-bit formation!
  const partyUnits = save.partyIds
    .map((id) => save.roster[id])
    .filter((u): u is NonNullable<typeof u> => Boolean(u));

  const groundY = Math.round(height * 0.72);
  const startX = exp.inVillage
    ? Math.round(width * 0.5 - ((partyUnits.length - 1) * 56) / 2)
    : Math.round(width * 0.16);
  const spacing = exp.inVillage ? 56 : 44;

  partyUnits.forEach((unit, idx) => {
    const sp = getSpecies(unit.speciesId);
    // In dungeon, Hero leads in front (rightmost of left group) facing right!
    const drawIdx = exp.inVillage ? idx : partyUnits.length - 1 - idx;
    const cx = startX + drawIdx * spacing;
    const cy = groundY + (idx % 2 === 0 ? -4 : 6);
    const bounceSpeed = isMarching ? 95 : 230;
    const bounceAmp = isMarching ? 4 : 2;
    const bob = Math.round(Math.sin(timeMs / bounceSpeed + idx * 1.4) * bounceAmp);

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(cx - 14, cy + 16, 28, 6);

    const sprite = getSpriteCanvas(sp.spriteKey, 3, false);
    ctx.drawImage(sprite, Math.round(cx - sprite.width / 2), Math.round(cy - sprite.height / 2 + bob));
  });

  // In Dungeon: show preview landmark ahead on the right road (Boss / Gold Chest / Stairs / Monster)
  if (!exp.inVillage && exp.choices.length > 0) {
    const featured =
      exp.choices.find((c) => c.kind === 'boss') ??
      exp.choices.find((c) => c.kind === 'stairs') ??
      exp.choices.find((c) => c.kind === 'gold_chest') ??
      exp.choices[0]!;
    const fx = Math.round(width * 0.8);
    const fy = groundY - 2;
    const scale = featured.kind === 'boss' ? 4 : 3;
    const fSprite = getSpriteCanvas(featured.spriteKey, scale, true);
    const fBob = Math.round(Math.sin(timeMs / 210) * 2.5);

    // Subtle beacon aura
    if (featured.kind === 'boss') {
      ctx.strokeStyle = 'rgba(255, 86, 86, 0.8)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(fx, fy + 6, 28 + Math.sin(timeMs / 160) * 3, 0, Math.PI * 2);
      ctx.stroke();
    } else if (featured.kind === 'gold_chest' || featured.kind === 'stairs') {
      ctx.strokeStyle = 'rgba(255, 224, 92, 0.8)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(fx, fy + 6, 22 + Math.sin(timeMs / 180) * 2, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.fillStyle = 'rgba(0,0,0,0.32)';
    ctx.fillRect(fx - 18, fy + 18, 36, 6);
    ctx.drawImage(
      fSprite,
      Math.round(fx - fSprite.width / 2),
      Math.round(fy - fSprite.height / 2 + fBob),
    );
  }

  // Ambient biome particles
  const pColor = BIOMES[exp.biome].palette.particle;
  ctx.fillStyle = pColor;
  for (let i = 0; i < 12; i += 1) {
    const px = ((i * 79 + Math.floor(timeMs * 0.018 * ((i % 3) + 1))) % (width + 20)) - 10;
    const py =
      ((i * 43 + (exp.biome === 'volcano' ? -timeMs * 0.025 : timeMs * 0.01)) % (height + 20) +
        height +
        20) %
        (height + 20) -
      10;
    ctx.globalAlpha = 0.28 + ((Math.sin(timeMs / 320 + i) + 1) / 2) * 0.45;
    ctx.fillRect(Math.round(px), Math.round(py), 2, 2);
  }
  ctx.globalAlpha = 1;

  // Top-right Floor Step Progress Pill inside Dungeon
  if (!exp.inVillage) {
    const badgeW = 108;
    const badgeH = 28;
    const bx = width - badgeW - 8;
    const by = 8;
    ctx.fillStyle = 'rgba(18, 17, 28, 0.82)';
    ctx.fillRect(bx, by, badgeW, badgeH);
    ctx.strokeStyle = 'rgba(232, 198, 118, 0.7)';
    ctx.lineWidth = 1;
    ctx.strokeRect(bx, by, badgeW, badgeH);

    ctx.font = 'bold 10px "DotGothic16", sans-serif';
    ctx.fillStyle = '#ffe570';
    ctx.textAlign = 'center';
    const stepText =
      exp.step >= exp.maxSteps && !exp.bossDefeated
        ? 'BOSS 決戦!'
        : `進行 STEP ${Math.min(exp.step, exp.maxSteps)}/${exp.maxSteps}`;
    ctx.fillText(stepText, bx + badgeW / 2, by + 13);

    // Step pips
    const pipW = 18;
    const gap = 4;
    const startPipX = bx + (badgeW - (exp.maxSteps * pipW + (exp.maxSteps - 1) * gap)) / 2;
    for (let s = 1; s <= exp.maxSteps; s += 1) {
      ctx.fillStyle =
        s < exp.step
          ? '#6be68a'
          : s === exp.step
            ? '#ffe570'
            : 'rgba(255,255,255,0.18)';
      ctx.fillRect(Math.round(startPipX + (s - 1) * (pipW + gap)), by + 18, pipW, 5);
    }
  }
}
