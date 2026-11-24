import { BIOMES } from '../game/data/biomes';
import type { ExpeditionState } from '../game/expedition';
import { getSpecies } from '../game/data/monsters';
import type { GameSave } from '../game/types';
import { ANIM_FRAME_COUNT, getSpriteCanvas } from './pixelSprites';

function drawVillageBackdrop(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  timeMs: number,
): void {
  const horizonY = Math.round(h * 0.5);

  const skyColors = ['#58a6e0', '#77bdf0', '#9cd4fa', '#c4e9ff'];
  const bandH = Math.ceil(horizonY / skyColors.length);
  skyColors.forEach((c, i) => {
    ctx.fillStyle = c;
    ctx.fillRect(0, i * bandH, w, bandH + 1);
  });

  ctx.fillStyle = '#fff5b8';
  ctx.fillRect(w - 58, 16, 20, 20);
  ctx.fillStyle = '#ffe166';
  ctx.fillRect(w - 54, 20, 12, 12);

  const cloudShift = Math.floor(timeMs * 0.009) % (w + 80);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  const drawCloud = (cx: number, cy: number) => {
    const x = ((cx + cloudShift) % (w + 80)) - 40;
    ctx.fillRect(x, cy, 34, 7);
    ctx.fillRect(x + 6, cy - 5, 22, 5);
  };
  drawCloud(20, 24);
  drawCloud(180, 38);
  drawCloud(310, 20);

  ctx.fillStyle = '#498f46';
  for (let x = -12; x < w + 32; x += 48) {
    ctx.fillRect(x, horizonY - 22, 42, 24);
    ctx.fillStyle = '#5eb054';
    ctx.fillRect(x + 8, horizonY - 28, 26, 14);
    ctx.fillStyle = '#498f46';
  }

  const drawHouse = (hx: number, hy: number, roofColor: string) => {
    ctx.fillStyle = '#f2e3c2';
    ctx.fillRect(hx + 4, hy, 42, 26);
    ctx.fillStyle = '#7d4d2a';
    ctx.fillRect(hx + 4, hy, 4, 26);
    ctx.fillRect(hx + 42, hy, 4, 26);
    ctx.fillRect(hx + 18, hy + 10, 10, 16);
    ctx.fillStyle = '#ffe580';
    ctx.fillRect(hx + 32, hy + 8, 8, 8);
    ctx.fillStyle = roofColor;
    ctx.fillRect(hx, hy - 10, 50, 12);
    ctx.fillRect(hx + 6, hy - 17, 38, 7);
    ctx.fillRect(hx + 14, hy - 21, 22, 4);
  };
  drawHouse(14, horizonY - 22, '#c44d38');
  drawHouse(w - 70, horizonY - 22, '#3e7a4c');

  ctx.fillStyle = '#5da145';
  ctx.fillRect(0, horizonY, w, h - horizonY);
  ctx.fillStyle = '#4e8f3a';
  ctx.fillRect(0, horizonY, w, 5);

  const roadY = Math.round(h * 0.62);
  const roadH = Math.round(h * 0.28);
  ctx.fillStyle = '#d4b483';
  ctx.fillRect(0, roadY, w, roadH);
  ctx.fillStyle = '#be9b68';
  for (let x = 4; x < w; x += 24) {
    ctx.fillRect(x, roadY + 6, 14, 7);
    ctx.fillRect(x + 10, roadY + 18, 14, 7);
  }

  const propFrame = Math.floor(timeMs / 130) % ANIM_FRAME_COUNT;
  const fountain = getSpriteCanvas('fountain', 1, false, false, propFrame);
  const altar = getSpriteCanvas('altar', 1, false, false, propFrame);
  ctx.drawImage(fountain, Math.round(w * 0.25), horizonY - 12);
  ctx.drawImage(altar, Math.round(w * 0.66), horizonY - 12);
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

  const bands = 6;
  for (let i = 0; i < bands; i += 1) {
    ctx.fillStyle = i < 3 ? pal.skyTop : pal.skyBottom;
    ctx.globalAlpha = i < 3 ? 1 - i * 0.08 : 0.7 + (i - 3) * 0.09;
    const by = Math.round((horizonY / bands) * i);
    ctx.fillRect(0, by, w, Math.ceil(horizonY / bands) + 1);
  }
  ctx.globalAlpha = 1;

  const farShift = Math.floor(scrollPx * 0.35);
  const midShift = Math.floor(scrollPx * 0.78);

  if (exp.biome === 'forest') {
    const sway = Math.round(Math.sin(timeMs / 650) * 2);
    for (let i = -1; i < Math.ceil(w / 40) + 2; i += 1) {
      const tx = i * 40 - (farShift % 40);
      ctx.fillStyle = '#205230';
      ctx.fillRect(tx, horizonY - 34, 30, 36);
      ctx.fillStyle = '#388547';
      ctx.fillRect(tx + 5 + sway, horizonY - 44, 20, 22);
      ctx.fillStyle = '#5c3c24';
      ctx.fillRect(tx + 12, horizonY - 12, 7, 14);
    }
    ctx.fillStyle = 'rgba(255, 248, 184, 0.11)';
    ctx.fillRect(w * 0.22, 0, 20, horizonY + 35);
    ctx.fillRect(w * 0.68, 0, 14, horizonY + 25);
  } else if (exp.biome === 'ruins') {
    for (let i = -1; i < Math.ceil(w / 64) + 2; i += 1) {
      const px = i * 64 - (midShift % 64);
      ctx.fillStyle = '#404759';
      ctx.fillRect(px, 8, 18, horizonY - 6);
      ctx.fillStyle = '#657087';
      ctx.fillRect(px + 2, 8, 4, horizonY - 8);
      // Flickering torch
      const fl = Math.floor(timeMs / 110 + i) % 3;
      ctx.fillStyle = '#ff8526';
      ctx.fillRect(px + 16, 26 - fl, 5, 6 + fl);
      ctx.fillStyle = '#ffe86b';
      ctx.fillRect(px + 17, 28 - fl, 3, 3);
      ctx.fillStyle = '#6beeff';
      ctx.globalAlpha = 0.55 + Math.sin(timeMs / 360 + i) * 0.3;
      ctx.fillRect(px + 8, 22, 2, 14);
      ctx.globalAlpha = 1;
    }
  } else if (exp.biome === 'volcano') {
    for (let i = -1; i < Math.ceil(w / 48) + 2; i += 1) {
      const vx = i * 48 - (farShift % 48);
      ctx.fillStyle = '#331411';
      ctx.fillRect(vx, horizonY - 32, 38, 32);
      ctx.fillRect(vx + 10, horizonY - 46, 16, 16);
    }
    ctx.fillStyle = '#ff6524';
    ctx.fillRect(0, horizonY - 8, w, 10);
    ctx.fillStyle = '#ffe066';
    const lavaShift = Math.floor(timeMs / 150) % 24;
    for (let x = -24; x < w + 24; x += 24) {
      ctx.fillRect(x + lavaShift, horizonY - 5, 10, 2);
    }
  } else if (exp.biome === 'abyss') {
    ctx.fillStyle = '#fff3ad';
    ctx.fillRect(w - 54, 14, 16, 16);
    ctx.fillStyle = pal.skyTop;
    ctx.fillRect(w - 48, 12, 12, 12);
    for (let i = 0; i < 28; i += 1) {
      const sx = (((i * 49 - farShift) % w) + w) % w;
      const sy = (i * 25 + 6) % (horizonY - 8);
      ctx.fillStyle = i % 3 === 0 ? '#7ce8ff' : '#fff5c2';
      ctx.globalAlpha = 0.32 + ((Math.sin(timeMs / 280 + i) + 1) / 2) * 0.68;
      ctx.fillRect(sx, sy, i % 4 === 0 ? 2 : 1, i % 4 === 0 ? 2 : 1);
    }
    ctx.globalAlpha = 1;
  }

  ctx.fillStyle = pal.groundPrimary;
  ctx.fillRect(0, horizonY, w, h - horizonY);
  ctx.fillStyle = pal.groundSecondary;
  const tileW = 28;
  for (let i = -1; i < Math.ceil(w / tileW) + 2; i += 1) {
    const gx = i * tileW - (midShift % tileW);
    ctx.fillRect(gx, horizonY + 8, 14, 8);
    ctx.fillRect(gx + 12, horizonY + 24, 14, 8);
    ctx.fillRect(gx + 4, horizonY + 42, 14, 8);
  }
  ctx.fillStyle = 'rgba(0,0,0,0.32)';
  ctx.fillRect(0, horizonY, w, 2);
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
    scrollRef.offset += 2.8;
  }

  if (exp.inVillage) {
    drawVillageBackdrop(ctx, width, height, timeMs);
  } else {
    drawDungeonParallax(ctx, exp, width, height, timeMs, scrollRef.offset);
  }

  const partyUnits = save.partyIds
    .map((id) => save.roster[id])
    .filter((u): u is NonNullable<typeof u> => Boolean(u));

  const groundY = Math.round(height * 0.72);
  // 32x32 HD sprites at crisp 2x (64x64 px) — silky DQ6 8-frame animations!
  const spriteScale = width < 310 ? 1 : 2;
  const spacing = exp.inVillage
    ? Math.min(54, Math.floor((width - 44) / Math.max(4, partyUnits.length)))
    : Math.min(42, Math.floor((width * 0.56) / Math.max(3, partyUnits.length)));
  const startX = exp.inVillage
    ? Math.round(width * 0.5 - ((partyUnits.length - 1) * spacing) / 2)
    : Math.round(width * 0.14);

  const frameMs = isMarching ? 68 : 95;

  partyUnits.forEach((unit, idx) => {
    const sp = getSpecies(unit.speciesId);
    const drawIdx = exp.inVillage ? idx : partyUnits.length - 1 - idx;
    const cx = startX + drawIdx * spacing;
    const cy = groundY + (idx % 2 === 0 ? -3 : 5);
    const frameIdx = (Math.floor(timeMs / frameMs) + idx * 2) % ANIM_FRAME_COUNT;

    const sprite = getSpriteCanvas(sp.spriteKey, spriteScale, false, false, frameIdx);
    ctx.fillStyle = 'rgba(0,0,0,0.34)';
    ctx.fillRect(
      Math.round(cx - sprite.width * 0.28),
      Math.round(cy + sprite.height * 0.36),
      Math.round(sprite.width * 0.56),
      5,
    );
    ctx.drawImage(sprite, Math.round(cx - sprite.width / 2), Math.round(cy - sprite.height / 2));
  });

  // Animated upcoming landmark / Boss ahead on the dungeon corridor!
  if (!exp.inVillage && exp.choices.length > 0) {
    const featured =
      exp.choices.find((c) => c.kind === 'boss') ??
      exp.choices.find((c) => c.kind === 'rare_encounter') ??
      exp.choices.find((c) => c.kind === 'stairs') ??
      exp.choices.find((c) => c.kind === 'gold_chest') ??
      exp.choices[0]!;
    const fx = Math.round(width * 0.82);
    const fy = groundY - 2;
    const scale = featured.kind === 'boss' ? (width < 360 ? 2 : 3) : spriteScale;
    const fFrame = Math.floor(timeMs / 90) % ANIM_FRAME_COUNT;
    const fSprite = getSpriteCanvas(featured.spriteKey, scale, true, false, fFrame);

    if (featured.kind === 'boss') {
      ctx.strokeStyle = 'rgba(255, 76, 86, 0.85)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(fx, fy + 4, 28 + Math.sin(timeMs / 140) * 3, 0, Math.PI * 2);
      ctx.stroke();
    } else if (
      featured.kind === 'gold_chest' ||
      featured.kind === 'stairs' ||
      featured.kind === 'rare_encounter'
    ) {
      ctx.strokeStyle = 'rgba(255, 224, 92, 0.85)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(fx, fy + 4, 22 + Math.sin(timeMs / 160) * 2, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.fillStyle = 'rgba(0,0,0,0.32)';
    ctx.fillRect(fx - 18, fy + 22, 36, 5);
    ctx.drawImage(
      fSprite,
      Math.round(fx - fSprite.width / 2),
      Math.round(fy - fSprite.height / 2),
    );
  }

  // Ambient biome particles
  const pColor = BIOMES[exp.biome].palette.particle;
  ctx.fillStyle = pColor;
  for (let i = 0; i < 14; i += 1) {
    const px = ((i * 79 + Math.floor(timeMs * 0.018 * ((i % 3) + 1))) % (width + 20)) - 10;
    const py =
      ((i * 43 + (exp.biome === 'volcano' ? -timeMs * 0.025 : timeMs * 0.01)) % (height + 20) +
        height +
        20) %
        (height + 20) -
      10;
    ctx.globalAlpha = 0.28 + ((Math.sin(timeMs / 300 + i) + 1) / 2) * 0.45;
    ctx.fillRect(Math.round(px), Math.round(py), 2, 2);
  }
  ctx.globalAlpha = 1;

  // Floor progress pill inside Dungeon
  if (!exp.inVillage) {
    const badgeW = 108;
    const badgeH = 28;
    const bx = width - badgeW - 8;
    const by = 8;
    ctx.fillStyle = 'rgba(18, 17, 28, 0.84)';
    ctx.fillRect(bx, by, badgeW, badgeH);
    ctx.strokeStyle = 'rgba(232, 198, 118, 0.72)';
    ctx.lineWidth = 1;
    ctx.strokeRect(bx, by, badgeW, badgeH);

    ctx.font = 'bold 10px "DotGothic16", sans-serif';
    ctx.fillStyle = '#ffe570';
    ctx.textAlign = 'center';
    const stepText =
      exp.step >= exp.maxSteps && !exp.bossDefeated
        ? '☠ BOSS決戦!'
        : `進行 STEP ${Math.min(exp.step, exp.maxSteps)}/${exp.maxSteps}`;
    ctx.fillText(stepText, bx + badgeW / 2, by + 13);

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
