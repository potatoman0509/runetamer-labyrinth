/**
 * High-Resolution 32x32 8-Frame Fluid Pixel Art Engine (DQ6 / Late-SFC Style)
 * Strict integer-snapped pixel grid with automatic 1px SNES dark outlines,
 * directional 5-tone shading, specular highlights, and smooth 8-frame articulated motion.
 */

export const ANIM_FRAME_COUNT = 8;

class PixelGrid {
  readonly size: number;
  readonly buf: (string | null)[];

  constructor(size = 32) {
    this.size = size;
    this.buf = new Array<string | null>(size * size).fill(null);
  }

  px(x: number, y: number, color: string): void {
    const ix = Math.round(x);
    const iy = Math.round(y);
    if (ix < 0 || ix >= this.size || iy < 0 || iy >= this.size) return;
    this.buf[iy * this.size + ix] = color;
  }

  get(x: number, y: number): string | null {
    if (x < 0 || x >= this.size || y < 0 || y >= this.size) return null;
    return this.buf[y * this.size + x] ?? null;
  }

  rect(x: number, y: number, w: number, h: number, color: string): void {
    const x0 = Math.round(x);
    const y0 = Math.round(y);
    const x1 = Math.round(x + w);
    const y1 = Math.round(y + h);
    for (let py = y0; py < y1; py += 1) {
      for (let px = x0; px < x1; px += 1) {
        this.px(px, py, color);
      }
    }
  }

  ellipse(
    cx: number,
    cy: number,
    rx: number,
    ry: number,
    base: string,
    shade?: string,
    highlight?: string,
  ): void {
    const minX = Math.floor(cx - rx - 1);
    const maxX = Math.ceil(cx + rx + 1);
    const minY = Math.floor(cy - ry - 1);
    const maxY = Math.ceil(cy + ry + 1);
    for (let py = minY; py <= maxY; py += 1) {
      for (let px = minX; px <= maxX; px += 1) {
        const nx = (px - cx) / Math.max(0.5, rx);
        const ny = (py - cy) / Math.max(0.5, ry);
        const d = nx * nx + ny * ny;
        if (d <= 1.0) {
          let col = base;
          if (highlight && nx < -0.15 && ny < -0.15 && d < 0.72) {
            col = highlight;
          } else if (shade && (nx > 0.35 || ny > 0.42)) {
            col = shade;
          }
          this.px(px, py, col);
        }
      }
    }
  }

  line(x0: number, y0: number, x1: number, y1: number, color: string, thick = 1): void {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy))));
    for (let i = 0; i <= steps; i += 1) {
      const t = i / steps;
      const px = Math.round(x0 + dx * t);
      const py = Math.round(y0 + dy * t);
      this.px(px, py, color);
      if (thick >= 2) {
        this.px(px + 1, py, color);
        this.px(px, py + 1, color);
      }
    }
  }

  /**
   * Adds a crisp 1px SNES dark outline around every opaque pixel.
   */
  outline(outlineColor = '#171421'): void {
    const toOutline: [number, number][] = [];
    const dirs = [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ];
    for (let y = 0; y < this.size; y += 1) {
      for (let x = 0; x < this.size; x += 1) {
        if (this.get(x, y) !== null) continue;
        for (const [dx, dy] of dirs) {
          if (this.get(x + dx!, y + dy!) !== null) {
            toOutline.push([x, y]);
            break;
          }
        }
      }
    }
    for (const [x, y] of toOutline) {
      this.px(x, y, outlineColor);
    }
  }
}

function drawSlime(
  g: PixelGrid,
  phase: number,
  colors: {
    base: string;
    shade: string;
    light: string;
    spec: string;
    accent: string;
    accentLight: string;
    outline: string;
  },
  hasCrown: boolean,
): void {
  // Smooth DQ6-style liquid squash & stretch across 8 frames!
  const squash = Math.sin(phase);
  const rx = 10.5 + squash * 1.4;
  const ry = 8.4 - squash * 1.3;
  const cy = 20.5 + squash * 1.2;

  // Dome body with ripple contour
  for (let y = 9; y <= 29; y += 1) {
    for (let x = 3; x <= 28; x += 1) {
      const ny = (y - cy) / ry;
      const ripple = Math.sin(phase + y * 0.45) * 0.05;
      const widthBias = ny > 0 ? 1 + ny * 0.22 : 1 - Math.abs(ny) * 0.12;
      const nx = (x - 15.5) / (rx * widthBias + ripple * 6);
      const d = nx * nx + ny * ny;
      if (d <= 1.0 && y <= 28) {
        let col = colors.base;
        if (ny > 0.48 || nx > 0.55) col = colors.shade;
        else if (ny < -0.15 && nx < 0.15) col = colors.light;
        // Subtle 16-bit checkerboard dither band
        if (ny > 0.3 && ny <= 0.48 && (x + y) % 2 === 0) col = colors.shade;
        g.px(x, y, col);
      }
    }
  }

  // Sliding specular bubble highlight (moves smoothly with phase!)
  const glintShift = Math.round(Math.cos(phase) * 1.2);
  g.ellipse(11 + glintShift, cy - 4, 2.2, 1.6, colors.spec);
  g.px(13 + glintShift, cy - 2, colors.spec);

  // Expressive DQ-style shiny eyes (blink briefly on frame 7!)
  const blinking = Math.sin(phase) > 0.92;
  const eyeY = Math.round(cy + 0.5);
  if (blinking) {
    g.rect(11, eyeY + 1, 3, 1, '#1a1a24');
    g.rect(18, eyeY + 1, 3, 1, '#1a1a24');
  } else {
    g.rect(11, eyeY - 1, 3, 4, '#ffffff');
    g.rect(18, eyeY - 1, 3, 4, '#ffffff');
    g.rect(12, eyeY, 2, 3, '#171926');
    g.rect(19, eyeY, 2, 3, '#171926');
    g.px(12, eyeY, '#ffffff');
    g.px(19, eyeY, '#ffffff');
  }
  // Happy smile
  g.line(14, eyeY + 4, 17, eyeY + 4, '#1a2e22');

  // Top Leaf sprout or Golden Sparkle Crown!
  const topY = Math.round(cy - ry - 1);
  if (hasCrown) {
    g.rect(12, topY - 3, 8, 4, '#f5c23b');
    g.px(12, topY - 5, '#fff5b8');
    g.px(15, topY - 6, '#fff5b8');
    g.px(16, topY - 6, '#ffe059');
    g.px(19, topY - 5, '#fff5b8');
    g.px(15, topY - 2, '#ff4d6a');
    g.px(16, topY - 2, '#ff4d6a');
    // Twinkling gold stars orbiting
    const sx = Math.round(15.5 + Math.cos(phase) * 12);
    const sy = Math.round(12 + Math.sin(phase) * 4);
    g.px(sx, sy, '#fff9cc');
    g.px(sx + 1, sy, '#ffe059');
  } else {
    const leafSway = Math.round(Math.sin(phase) * 1.5);
    g.line(15, topY + 1, 15 + leafSway, topY - 3, colors.shade);
    g.ellipse(12 + leafSway, topY - 3, 3.2, 1.8, colors.accent, colors.shade, colors.accentLight);
    g.ellipse(19 + leafSway, topY - 4, 2.8, 1.6, colors.accent, colors.shade, colors.accentLight);
  }

  g.outline(colors.outline);
}

function drawHero(g: PixelGrid, phase: number): void {
  const breath = Math.round(Math.sin(phase) * 0.9);
  const capeWave = Math.sin(phase);
  const swordGlow = Math.cos(phase);

  // Flowing crimson cape behind (3-segment silky wave!)
  for (let i = 0; i < 10; i += 1) {
    const waveX = Math.round(Math.sin(phase - i * 0.45) * 1.8);
    g.rect(6 + waveX - Math.floor(i * 0.2), 14 + i + breath, 7, 2, i > 6 ? '#8f2424' : '#c93c38');
  }
  g.rect(8 + Math.round(capeWave), 15 + breath, 4, 5, '#eb5b4e');

  // Boots & legs (subtle stance)
  g.rect(11, 24, 3, 5, '#3b573f');
  g.rect(17, 24, 3, 5, '#3b573f');
  g.rect(10, 27, 4, 3, '#5c3c24');
  g.rect(17, 27, 4, 3, '#5c3c24');
  g.px(11, 27, '#94633e');
  g.px(18, 27, '#94633e');

  // Emerald Tunic & Gold Belt
  g.rect(10, 14 + breath, 11, 10, '#2a8754');
  g.rect(11, 15 + breath, 4, 7, '#4ec278');
  g.rect(17, 15 + breath, 3, 8, '#1d5e3a');
  g.rect(10, 21 + breath, 11, 2, '#f2c144');
  g.rect(14, 21 + breath, 3, 2, '#fff2b0');
  // Scarf collar
  g.rect(10, 13 + breath, 11, 2, '#d9453b');

  // Head & expressive hair
  g.ellipse(15.5, 9 + breath, 5, 4.8, '#f7cfa7', '#d9a47c', '#ffe8cf');
  // Hair bangs + windswept tuft
  const hairTip = Math.round(Math.sin(phase + 0.6));
  g.ellipse(15.5, 6 + breath, 5.6, 3.2, '#8c4e27', '#5c3016', '#c97e42');
  g.rect(9 + hairTip, 6 + breath, 3, 5, '#8c4e27');
  g.rect(20, 6 + breath, 2, 4, '#5c3016');
  g.px(11 + hairTip, 3 + breath, '#c97e42');
  g.px(12 + hairTip, 4 + breath, '#8c4e27');

  // Eyes (looking forward)
  g.rect(13, 9 + breath, 2, 2, '#1c3266');
  g.rect(17, 9 + breath, 2, 2, '#1c3266');
  g.px(13, 9 + breath, '#ffffff');
  g.px(17, 9 + breath, '#ffffff');

  // Glowing Rune Blade raised on right!
  const sy = Math.round(Math.sin(phase) * 1.4);
  g.line(22, 19 + breath + sy, 28, 7 + sy, '#63d9ff', 2);
  g.line(22, 18 + breath + sy, 27, 8 + sy, '#ebfcff', 1);
  // Hilt & gold crossguard
  g.rect(20, 18 + breath + sy, 4, 2, '#f5c749');
  g.rect(20, 20 + breath + sy, 2, 3, '#6e4024');
  // Blade gleam spark
  if (swordGlow > 0.2) {
    g.px(27, 6 + sy, '#ffffff');
    g.px(29, 8 + sy, '#8ae8ff');
  }

  g.outline('#181524');
}

function drawQuadruped(
  g: PixelGrid,
  phase: number,
  pal: {
    body: string;
    shade: string;
    light: string;
    belly: string;
    accent: string;
    accentLight: string;
    eye: string;
    outline: string;
  },
  variant: 'fox' | 'pup' | 'wolf' | 'boar',
): void {
  const breath = Math.sin(phase);
  const by = Math.round(breath * 0.9);
  const tailWag = Math.round(Math.sin(phase * 1.0) * 2.4);

  // Tail behind (wagging fluidly!)
  if (variant !== 'boar') {
    const tx = 24;
    const ty = 15 + tailWag;
    g.line(20, 20 + by, tx, ty, pal.body, 2);
    g.ellipse(tx + 1, ty - 1, 3.5, 2.8, pal.accent, pal.shade, pal.accentLight);
  }

  // Legs (subtle alternating prance!)
  const legLift = Math.round(Math.sin(phase) * 1.2);
  g.rect(8, 22, 3, 6 + Math.max(0, legLift), pal.shade);
  g.rect(12, 23, 3, 5, pal.body);
  g.rect(18, 22, 3, 6 - Math.max(0, legLift), pal.shade);
  g.rect(21, 23, 3, 5, pal.body);

  // Body
  if (variant === 'boar') {
    g.ellipse(16, 19 + by, 9, 6.5, pal.body, pal.shade, pal.light);
    // Acorn armor cap on back!
    g.ellipse(16, 13 + by, 8.5, 4.2, pal.accent, pal.shade, pal.accentLight);
    g.rect(15, 7 + by, 2, 3, pal.shade);
    // Snout & tusks
    g.ellipse(6.5, 19 + by, 3, 2.5, '#e89588', '#b8655c', '#ffbfb5');
    g.px(5, 19 + by, '#3b1d1c');
    g.px(7, 19 + by, '#3b1d1c');
    g.line(6, 22 + by, 4, 19 + by, '#fff5db');
  } else {
    g.ellipse(16, 20 + by, 7.5, 4.6, pal.body, pal.shade, pal.light);
    g.ellipse(15, 22 + by, 5, 2.4, pal.belly);
    // Head
    const hx = 10;
    const hy = 13 + by;
    g.ellipse(hx, hy, 5.2, 4.6, pal.body, pal.shade, pal.light);
    g.ellipse(hx - 2.5, hy + 1.5, 2.8, 2, pal.belly);
    g.px(hx - 5, hy + 1, '#1a151c'); // nose
    // Pointy ears (twitch slightly!)
    const earTwitch = Math.round(Math.cos(phase) * 0.8);
    g.line(hx - 3, hy - 3, hx - 4 + earTwitch, hy - 8, pal.body, 2);
    g.line(hx + 2, hy - 3, hx + 4 - earTwitch, hy - 8, pal.body, 2);
    g.px(hx - 3 + earTwitch, hy - 6, pal.accentLight);
    g.px(hx + 3 - earTwitch, hy - 6, pal.accentLight);
    // Mane / Moss collar / Flame collar
    g.ellipse(hx + 2, hy + 4, 4.2, 2.5, pal.accent, pal.shade, pal.accentLight);
  }

  // Glowing Eye
  const ex = variant === 'boar' ? 10 : 8;
  const ey = variant === 'boar' ? 16 + by : 12 + by;
  g.rect(ex, ey, 2, 2, pal.eye);
  g.px(ex, ey, '#ffffff');

  g.outline(pal.outline);
}

function drawWinged(
  g: PixelGrid,
  phase: number,
  pal: {
    body: string;
    shade: string;
    light: string;
    belly: string;
    wing: string;
    wingLight: string;
    accent: string;
    eye: string;
    outline: string;
  },
  style: 'owl' | 'bat' | 'phoenix' | 'dragon' | 'sprite',
): void {
  const hover = Math.round(Math.sin(phase) * 1.8);
  const flap = Math.sin(phase); // -1..1 full wing stroke!
  const cy = 17 + hover;

  // Fluid 8-frame flapping wings (Left & Right)
  const wingTipY = Math.round(cy - 3 + flap * 7);
  const wingMidY = Math.round(cy - 1 + flap * 3.5);
  const wingSpan = style === 'dragon' ? 13 : style === 'bat' ? 12 : 10;

  // Left Wing
  g.line(12, cy, 12 - wingSpan, wingTipY, pal.wing, 2);
  g.line(12, cy + 2, 13 - wingSpan, wingTipY + 4, pal.shade, 2);
  g.ellipse(12 - wingSpan * 0.55, wingMidY, wingSpan * 0.45, 3, pal.wing, pal.shade, pal.wingLight);

  // Right Wing
  g.line(19, cy, 19 + wingSpan, wingTipY, pal.wing, 2);
  g.line(19, cy + 2, 18 + wingSpan, wingTipY + 4, pal.shade, 2);
  g.ellipse(19 + wingSpan * 0.55, wingMidY, wingSpan * 0.45, 3, pal.wing, pal.shade, pal.wingLight);

  if (style === 'dragon') {
    // Fierce Crimson Wyrm torso, horns, tail & glowing belly!
    g.ellipse(15.5, cy + 3, 6.2, 6.8, pal.body, pal.shade, pal.light);
    g.ellipse(15.5, cy + 4, 3.6, 5, pal.belly);
    // Neck & Snouted Head
    g.ellipse(15.5, cy - 5, 5.2, 4.2, pal.body, pal.shade, pal.light);
    // Horns
    g.line(12, cy - 8, 9, cy - 13, pal.accent, 2);
    g.line(19, cy - 8, 22, cy - 13, pal.accent, 2);
    // Fire embers floating off jaws
    if (Math.cos(phase) > 0) {
      g.px(15, cy - 1, '#ffe566');
      g.px(16, cy - 2, '#ff7333');
    }
    // Fierce eyes
    g.rect(12, cy - 6, 2, 2, pal.eye);
    g.rect(17, cy - 6, 2, 2, pal.eye);
    g.px(12, cy - 6, '#ffffff');
    g.px(17, cy - 6, '#ffffff');
  } else if (style === 'sprite') {
    // Flower crown & dress
    g.ellipse(15.5, cy + 3, 4.5, 5.5, pal.body, pal.shade, pal.light);
    g.ellipse(15.5, cy - 4, 4.2, 4, '#fce0c5', '#deb28e', '#fff2e3');
    // Flower crown
    g.ellipse(12, cy - 8, 2.2, 2.2, pal.accent, '#b83562', '#ffb8d0');
    g.ellipse(19, cy - 8, 2.2, 2.2, pal.accent, '#b83562', '#ffb8d0');
    g.ellipse(15.5, cy - 9, 2.4, 2.4, '#ffe36e', '#d9a426', '#fff8bd');
    g.rect(13, cy - 4, 2, 2, pal.eye);
    g.rect(17, cy - 4, 2, 2, pal.eye);
  } else if (style === 'bat') {
    g.ellipse(15.5, cy, 5.2, 5.6, pal.body, pal.shade, pal.light);
    g.line(12, cy - 4, 10, cy - 10, pal.wingLight, 2);
    g.line(19, cy - 4, 21, cy - 10, pal.wingLight, 2);
    g.rect(13, cy - 1, 2, 2, pal.eye);
    g.rect(17, cy - 1, 2, 2, pal.eye);
    // Fangs
    g.px(14, cy + 3, '#ffffff');
    g.px(17, cy + 3, '#ffffff');
  } else {
    // Owl / Phoenix
    g.ellipse(15.5, cy + 1, 5.8, 6.8, pal.body, pal.shade, pal.light);
    g.ellipse(15.5, cy + 3, 3.8, 4.4, pal.belly);
    // Crest / Wizard hat
    if (style === 'owl') {
      g.rect(10, cy - 7, 11, 2, pal.accent);
      g.ellipse(15.5, cy - 9, 4.5, 2.5, pal.wing, pal.shade, pal.wingLight);
    } else {
      // Flame crest for Phoenix Chick
      const flameTip = Math.round(Math.sin(phase * 2) * 1.4);
      g.line(15.5, cy - 5, 15.5 + flameTip, cy - 12, '#ffe159', 2);
      g.px(14 + flameTip, cy - 10, '#ff6d24');
      g.px(17 + flameTip, cy - 10, '#ff6d24');
    }
    // Big wise eyes + golden beak
    g.rect(12, cy - 3, 3, 3, '#ffffff');
    g.rect(17, cy - 3, 3, 3, '#ffffff');
    g.rect(13, cy - 2, 2, 2, pal.eye);
    g.rect(18, cy - 2, 2, 2, pal.eye);
    g.rect(15, cy, 2, 2, '#f5c23b');
  }

  g.outline(pal.outline);
}

function drawArmoredOrGolem(
  g: PixelGrid,
  phase: number,
  pal: {
    armor: string;
    shade: string;
    light: string;
    trim: string;
    glow: string;
    accent: string;
    outline: string;
  },
  style: 'knight' | 'astral' | 'golem' | 'treant' | 'imp' | 'crab' | 'witch',
): void {
  const breath = Math.round(Math.sin(phase) * 1.1);
  const sway = Math.round(Math.cos(phase) * 1.2);

  if (style === 'treant') {
    // Massive canopy swaying gently in breeze!
    g.ellipse(15.5 + sway, 9, 11, 6.5, '#2b7d3b', '#1b5227', '#5ec963');
    g.ellipse(10 + sway, 10, 6, 4.5, '#3fa34d', '#246632', '#95eb6e');
    g.ellipse(21 + sway, 10, 6, 4.5, '#3fa34d', '#246632', '#95eb6e');
    // Ancient gnarled trunk & roots
    g.rect(10, 14, 11, 13, '#7d5030');
    g.rect(11, 15, 3, 11, '#a87046');
    g.rect(17, 15, 4, 11, '#52321c');
    g.line(10, 26, 6, 29, '#5c3820', 2);
    g.line(20, 26, 25, 29, '#5c3820', 2);
    // Branch arms waving
    g.line(10, 18, 4, 15 + breath, '#6e4426', 2);
    g.line(21, 18, 27, 15 - breath, '#6e4426', 2);
    // Glowing golden eyes
    g.rect(12, 18, 2, 2, '#ffe463');
    g.rect(17, 18, 2, 2, '#ffe463');
    g.outline('#161f16');
    return;
  }

  if (style === 'crab') {
    const sc = Math.round(Math.sin(phase) * 1.5);
    // Molten carapace
    g.ellipse(15.5, 19 + breath, 9.5, 6.2, pal.armor, pal.shade, pal.light);
    // Glowing magma cracks
    g.line(11, 17 + breath, 15, 20 + breath, pal.glow);
    g.line(20, 17 + breath, 16, 20 + breath, pal.glow);
    // Giant snapping pincers!
    g.ellipse(6, 11 + sc, 4, 3.8, pal.armor, pal.shade, pal.glow);
    g.ellipse(25, 11 - sc, 4, 3.8, pal.armor, pal.shade, pal.glow);
    g.rect(6, 9 + sc, 2, 3, '#171421'); // claw gap
    g.rect(23, 9 - sc, 2, 3, '#171421');
    // Legs
    for (let i = 0; i < 3; i += 1) {
      g.line(8 + i * 2, 24, 5 + i * 2, 28 + (i % 2 === 0 ? sc : -sc), pal.shade, 1);
      g.line(23 - i * 2, 24, 26 - i * 2, 28 - (i % 2 === 0 ? sc : -sc), pal.shade, 1);
    }
    g.rect(12, 16 + breath, 2, 2, '#ffe66b');
    g.rect(17, 16 + breath, 2, 2, '#ffe66b');
    g.outline(pal.outline);
    return;
  }

  if (style === 'witch') {
    const staffBob = Math.round(Math.sin(phase) * 1.4);
    // Flowing dark-ash cloak with crimson trim
    g.ellipse(15.5, 22 + breath, 7, 7, pal.armor, pal.shade, pal.light);
    g.rect(9, 26, 13, 3, pal.accent);
    // Face
    g.ellipse(15.5, 14 + breath, 4.2, 3.6, '#f7d2b5', '#cfa180');
    g.rect(13, 14 + breath, 2, 2, '#ffe459');
    g.rect(17, 14 + breath, 2, 2, '#ffe459');
    // Pointy Witch Hat
    g.rect(7, 10 + breath, 17, 2, pal.accent);
    g.line(10, 10 + breath, 16 + sway, 3 + breath, pal.armor, 3);
    g.line(20, 10 + breath, 16 + sway, 3 + breath, pal.shade, 2);
    // Floating Ember Staff
    g.line(25, 27, 25, 10 + staffBob, '#6e4226', 2);
    g.ellipse(25, 8 + staffBob, 2.8, 2.8, '#ff7333', '#c93824', '#ffe566');
    g.outline(pal.outline);
    return;
  }

  if (style === 'golem') {
    // Floating heavy stone core with orbiting cyan rune stones!
    const floatY = Math.round(Math.sin(phase) * 1.5);
    // Heavy legs
    g.rect(9, 23, 5, 6, pal.shade);
    g.rect(18, 23, 5, 6, pal.shade);
    // Massive torso & shoulders
    g.rect(8, 11 + floatY, 16, 13, pal.armor);
    g.rect(9, 12 + floatY, 5, 10, pal.light);
    g.rect(19, 12 + floatY, 4, 11, pal.shade);
    // Arms swinging slightly
    g.rect(3, 13 + floatY + sway, 5, 11, pal.armor);
    g.rect(24, 13 + floatY - sway, 5, 11, pal.shade);
    // Head
    g.rect(11, 5 + floatY, 10, 6, pal.light);
    // Pulsing Cyan Rune Core & Visor
    const pulse = Math.sin(phase) > 0 ? '#d9fcff' : pal.glow;
    g.rect(13, 7 + floatY, 6, 2, pulse);
    g.rect(14, 14 + floatY, 4, 5, pulse);
    // Orbiting Rune Crystal
    const ox = Math.round(15.5 + Math.cos(phase) * 13);
    const oy = Math.round(11 + Math.sin(phase) * 3);
    g.rect(ox - 1, oy - 1, 3, 3, pal.glow);
    g.px(ox, oy, '#ffffff');
    g.outline(pal.outline);
    return;
  }

  if (style === 'imp') {
    const hop = Math.round(Math.abs(Math.sin(phase)) * -2);
    g.ellipse(15.5, 19 + hop, 5.5, 6, pal.armor, pal.shade, pal.light);
    g.ellipse(15.5, 11 + hop, 5, 4.5, pal.armor, pal.shade, pal.light);
    g.line(11, 8 + hop, 8, 4 + hop, pal.light, 2);
    g.line(20, 8 + hop, 23, 4 + hop, pal.light, 2);
    g.rect(13, 10 + hop, 2, 2, pal.glow);
    g.rect(17, 10 + hop, 2, 2, pal.glow);
    // Stone club
    g.line(22, 19 + hop, 27, 13 + hop + sway, pal.shade, 2);
    g.ellipse(27, 12 + hop + sway, 2.5, 2.5, pal.light, pal.shade);
    g.rect(11, 24 + hop, 3, 4, pal.shade);
    g.rect(17, 24 + hop, 3, 4, pal.shade);
    g.outline(pal.outline);
    return;
  }

  // Knight / Astral Knight
  const plumeSway = Math.round(Math.sin(phase) * 1.5);
  // Plume
  g.line(15, 5 + breath, 12 + plumeSway, 2 + breath, pal.trim, 2);
  // Legs
  g.rect(11, 23, 4, 6, pal.shade);
  g.rect(17, 23, 4, 6, pal.shade);
  // Torso
  g.rect(10, 13 + breath, 12, 11, pal.armor);
  g.rect(11, 14 + breath, 4, 8, pal.light);
  g.rect(14, 15 + breath, 4, 6, pal.trim);
  // Helmet
  g.ellipse(16, 9 + breath, 5, 4.5, pal.armor, pal.shade, pal.light);
  g.rect(12, 9 + breath, 8, 2, '#171926');
  g.rect(13, 9 + breath, 2, 2, pal.glow);
  g.rect(17, 9 + breath, 2, 2, pal.glow);
  // Tower Shield (left)
  g.rect(4, 14 + breath, 7, 10, pal.accent);
  g.rect(5, 15 + breath, 5, 8, pal.trim);
  g.rect(6, 16 + breath, 3, 6, pal.accent);
  // Weapon (right)
  g.line(23, 19 + breath, 28, 8 + breath - sway, style === 'astral' ? '#8ae8ff' : '#dce8fa', 2);
  g.rect(21, 18 + breath, 4, 2, pal.trim);
  g.outline(pal.outline);
}

function drawCosmic(
  g: PixelGrid,
  phase: number,
  style: 'jelly' | 'devourer' | 'herald',
): void {
  const floatY = Math.round(Math.sin(phase) * 2.2);

  if (style === 'jelly') {
    const pulse = Math.sin(phase);
    const rx = 8.5 + pulse * 1.2;
    const ry = 6.2 - pulse * 0.9;
    const cy = 13 + floatY;
    // Undulating sinusoidal pixel tentacles (DQ6 water-like motion!)
    for (let t = 0; t < 4; t += 1) {
      const bx = 9 + t * 4.5;
      for (let i = 0; i < 11; i += 1) {
        const tx = bx + Math.sin(phase - i * 0.55 + t) * 2.1;
        g.px(tx, cy + 5 + i, i % 3 === 0 ? '#b5f0ff' : '#58a8ff');
        g.px(tx + 1, cy + 5 + i, '#325ea8');
      }
    }
    // Glowing umbrella dome
    g.ellipse(15.5, cy, rx, ry, '#56a8ff', '#2c539e', '#c9f6ff');
    g.px(12, cy - 1, '#ffe66b');
    g.px(19, cy - 1, '#ffe66b');
    g.px(15, cy - 3, '#ffffff');
    g.outline('#111833');
    return;
  }

  if (style === 'herald') {
    const cy = 15 + floatY;
    // Back cosmic halo
    const ringX = Math.round(Math.cos(phase) * 11);
    const ringY = Math.round(Math.sin(phase) * 3);
    g.px(15 + ringX, cy - 5 + ringY, '#ffe159');
    g.px(16 - ringX, cy - 5 - ringY, '#7ce8ff');
    // Flowing celestial robe
    g.ellipse(15.5, cy + 5, 7, 8, '#38458a', '#1d2452', '#6479cf');
    g.rect(13, cy, 5, 11, '#f5c749');
    // Hooded void face + glowing starlight core
    g.ellipse(15.5, cy - 5, 5.5, 5, '#1d2452', '#101430', '#4859a8');
    g.ellipse(15.5, cy - 5, 3, 2.5, '#7ce8ff', '#4898e6', '#ffffff');
    // Golden Crown
    g.rect(11, cy - 11, 9, 2, '#ffe159');
    g.px(12, cy - 13, '#fff9cc');
    g.px(15, cy - 14, '#fff9cc');
    g.px(19, cy - 13, '#fff9cc');
    g.outline('#0d1024');
    return;
  }

  // Star Devourer (Ultimate Abyss Boss — orbiting planetary ring + blazing nebula eyes!)
  const cy = 16 + floatY;
  // Back half of orbiting star ring
  for (let i = 0; i < 16; i += 1) {
    const ang = phase + (i / 16) * Math.PI * 2;
    if (Math.sin(ang) < 0) {
      const rx = 15.5 + Math.cos(ang) * 13.5;
      const ry = cy + Math.sin(ang) * 4.2;
      g.px(rx, ry, i % 2 === 0 ? '#ffe159' : '#7ce8ff');
    }
  }
  // Cosmic beast body & horns
  g.ellipse(15.5, cy, 8.8, 8.2, '#2a3773', '#141b40', '#5373cf');
  g.line(9, cy - 6, 5, cy - 12, '#7ce8ff', 2);
  g.line(22, cy - 6, 26, cy - 12, '#7ce8ff', 2);
  // Void maw & glowing golden eyes
  g.ellipse(15.5, cy + 2, 4.5, 2.5, '#0c0f24');
  g.rect(10, cy - 3, 3, 3, '#ffe159');
  g.rect(18, cy - 3, 3, 3, '#ffe159');
  g.px(11, cy - 2, '#ffffff');
  g.px(19, cy - 2, '#ffffff');
  // Front half of orbiting star ring (creates awesome 3D pixel depth!)
  for (let i = 0; i < 16; i += 1) {
    const ang = phase + (i / 16) * Math.PI * 2;
    if (Math.sin(ang) >= 0) {
      const rx = 15.5 + Math.cos(ang) * 13.5;
      const ry = cy + Math.sin(ang) * 4.2;
      g.rect(rx, ry, 2, 1, i % 2 === 0 ? '#fff5b8' : '#7ce8ff');
    }
  }
  g.outline('#0b0e1f');
}

function drawPropOrEvent(g: PixelGrid, key: string, phase: number): void {
  const glow = Math.sin(phase);
  if (key === 'mimic') {
    const chomp = Math.round((Math.sin(phase) + 1) * 2); // 0..4 jaw open!
    // Base chest
    g.rect(6, 17, 20, 10, '#8a5229');
    g.rect(6, 20, 20, 2, '#f5c749');
    // Chomp mouth with fangs & wagging pink tongue!
    g.rect(7, 13 - chomp, 18, 5 + chomp, '#2b1218');
    for (let x = 8; x <= 22; x += 4) {
      g.rect(x, 13 - chomp, 2, 2, '#fff7e6');
      g.rect(x + 1, 16, 2, 2, '#fff7e6');
    }
    const tongueX = Math.round(Math.cos(phase) * 2);
    g.ellipse(15.5 + tongueX, 17, 3.5, 2.2, '#ff5e7e', '#b82a49', '#ffa3b5');
    // Lid + glowing red eyes
    g.rect(6, 8 - chomp, 20, 6, '#bd753c');
    g.rect(6, 8 - chomp, 20, 2, '#f5c749');
    g.rect(10, 10 - chomp, 3, 2, '#ff3b4f');
    g.rect(19, 10 - chomp, 3, 2, '#ff3b4f');
    g.px(11, 10 - chomp, '#ffffff');
    g.px(20, 10 - chomp, '#ffffff');
    g.outline('#1c1114');
    return;
  }

  if (key === 'chest' || key === 'gold_chest') {
    const isGold = key === 'gold_chest';
    const base = isGold ? '#e0a024' : '#965a2c';
    const light = isGold ? '#ffe36b' : '#c78144';
    const trim = isGold ? '#fff7c2' : '#f5c749';
    g.rect(6, 12, 20, 14, base);
    g.rect(7, 13, 18, 4, light);
    g.rect(6, 17, 20, 2, trim);
    g.rect(14, 16, 4, 5, isGold ? '#e64545' : trim);
    if (isGold && glow > 0) {
      g.px(15, 7, '#fff9cc');
      g.px(26, 10, '#ffe36b');
    }
    g.outline('#21150e');
    return;
  }

  if (key === 'shrine' || key === 'curse_altar' || key === 'altar' || key === 'fountain') {
    const floatY = Math.round(Math.sin(phase) * 1.5);
    const isCurse = key === 'curse_altar';
    const isAltar = key === 'altar';
    const isFountain = key === 'fountain';
    // Stone pedestal
    g.rect(7, 21, 18, 7, isCurse ? '#4c3e54' : '#7f899e');
    g.rect(9, 16, 14, 6, isCurse ? '#6a5675' : '#b2bdd4');
    if (isFountain) {
      g.ellipse(15.5, 19, 8, 3, '#3b9be8', '#2567a8', '#8ae8ff');
      g.line(15.5, 18, 15.5, 9 + floatY, '#8ae8ff', 2);
      g.px(12, 12 - floatY, '#e8fcff');
      g.px(19, 12 + floatY, '#e8fcff');
    } else {
      const c1 = isCurse ? '#e62e4f' : isAltar ? '#f5c749' : '#4ce0ff';
      const c2 = isCurse ? '#ff94a8' : isAltar ? '#fff5b8' : '#e6fcff';
      g.ellipse(15.5, 10 + floatY, 4.2, 5.2, c1, isCurse ? '#8c162c' : '#2d7ea8', c2);
    }
    g.outline('#181524');
    return;
  }

  if (key === 'merchant' || key === 'blacksmith') {
    const breath = Math.round(Math.sin(phase) * 0.9);
    const isSmith = key === 'blacksmith';
    // Body
    g.rect(10, 14 + breath, 12, 13, isSmith ? '#7d4429' : '#35609e');
    g.rect(11, 15 + breath, 4, 10, isSmith ? '#a85f3b' : '#588fd9');
    g.rect(10, 21 + breath, 12, 2, '#f5c749');
    // Head
    g.ellipse(16, 10 + breath, 4.5, 4.2, '#f5cfa6', '#cfa07a');
    g.rect(11, 5 + breath, 10, 3, isSmith ? '#c94c38' : '#35609e');
    g.rect(14, 10 + breath, 2, 2, '#1c1926');
    g.rect(18, 10 + breath, 2, 2, '#1c1926');
    // Hammer or Gold Sack
    if (isSmith) {
      const swing = Math.round(Math.sin(phase) * 2);
      g.line(23, 20, 27, 11 + swing, '#6e4024', 2);
      g.rect(24, 9 + swing, 6, 4, '#9eb0c7');
      if (glow > 0.3) g.px(27, 7 + swing, '#ffe566');
    } else {
      g.ellipse(7, 18 + breath, 4.5, 5.5, '#9c6234', '#693d1d', '#cf894e');
      g.rect(14, 17 + breath, 4, 4, '#ffe159');
    }
    g.outline('#1c1514');
    return;
  }
}

function drawEquipIcon24(g: PixelGrid, key: string): void {
  if (key === 'sword' || key === 'dagger') {
    const len = key === 'dagger' ? 11 : 15;
    g.line(6, 18, 6 + len, 18 - len, '#9cb0c9', 2);
    g.line(7, 17, 6 + len, 18 - len, '#f0f8ff', 1);
    g.line(6, 14, 11, 19, '#f5c749', 2);
    g.line(4, 20, 7, 17, '#7d4927', 2);
    g.px(4, 20, '#f5c749');
  } else if (key === 'staff') {
    g.line(5, 20, 15, 10, '#8f5932', 2);
    g.line(6, 19, 15, 10, '#c7834a', 1);
    g.ellipse(17, 7, 4, 4, '#58d6ff', '#2c7ec9', '#ebfcff');
    g.rect(13, 9, 4, 2, '#f5c749');
  } else if (key === 'axe') {
    g.line(6, 20, 16, 6, '#87522e', 2);
    g.ellipse(17, 8, 5, 4, '#95a5bd', '#5e6b80', '#eef6ff');
    g.rect(18, 6, 3, 5, '#d9483b');
  } else if (key === 'armor' || key === 'plate' || key === 'robe') {
    const c1 = key === 'plate' ? '#9eb0c7' : key === 'robe' ? '#487ec9' : '#a8693b';
    const c2 = key === 'plate' ? '#637185' : key === 'robe' ? '#2c4f8a' : '#693c1e';
    const c3 = key === 'plate' ? '#eef6ff' : key === 'robe' ? '#85b8ff' : '#d6955e';
    g.rect(5, 6, 14, 13, c1);
    g.rect(6, 7, 5, 10, c3);
    g.rect(14, 7, 5, 11, c2);
    g.rect(3, 6, 4, 6, c1);
    g.rect(17, 6, 4, 6, c2);
    g.rect(9, 10, 6, 2, '#f5c749');
    g.rect(10, 6, 4, 3, '#1b1922');
  } else if (key === 'amulet') {
    g.ellipse(12, 8, 4.5, 4, '#f5c749');
    g.ellipse(12, 8, 2.5, 2.2, '#1b1922');
    g.ellipse(12, 15, 5, 5.5, '#f5c749', '#b8821d', '#fff0a6');
    g.ellipse(12, 15, 3, 3.5, '#4ee08a', '#248f50', '#ccffe0');
  } else if (key === 'compass') {
    g.ellipse(12, 12, 7.5, 7.5, '#e8b339', '#9e6c14', '#fff0a6');
    g.ellipse(12, 12, 5.2, 5.2, '#f5eed6', '#d6cba8');
    g.line(12, 12, 15, 8, '#e0483d', 2);
    g.line(12, 12, 9, 16, '#3d7be0', 2);
  } else if (key === 'chalice') {
    g.rect(6, 5, 12, 7, '#f5c749');
    g.rect(8, 6, 8, 4, '#e03a4b');
    g.px(9, 7, '#ffa3ae');
    g.rect(10, 12, 4, 6, '#d99824');
    g.rect(7, 18, 10, 2, '#f5c749');
  } else {
    // Runes
    const glow =
      key === 'rune_red'
        ? '#ff5d47'
        : key === 'rune_blue'
          ? '#48c8ff'
          : '#54db68';
    const hi =
      key === 'rune_red'
        ? '#ffd070'
        : key === 'rune_blue'
          ? '#dcf8ff'
          : '#dcff9c';
    g.ellipse(12, 12, 7.2, 8.2, '#7c8499', '#4a5061', '#b5bed4');
    g.line(12, 6, 12, 18, glow, 2);
    g.line(8, 10, 16, 10, glow, 1);
    g.line(9, 14, 15, 14, hi, 1);
    g.px(12, 10, hi);
  }
  g.outline('#181524');
}

const EQUIP_ICON_KEYS = new Set([
  'sword',
  'staff',
  'axe',
  'dagger',
  'armor',
  'plate',
  'robe',
  'amulet',
  'compass',
  'chalice',
  'rune_red',
  'rune_blue',
  'rune_green',
]);

function paintSprite(key: string, frameIndex: number): PixelGrid {
  if (EQUIP_ICON_KEYS.has(key)) {
    const g = new PixelGrid(24);
    drawEquipIcon24(g, key);
    return g;
  }

  const g = new PixelGrid(32);
  const phase = ((frameIndex % ANIM_FRAME_COUNT) / ANIM_FRAME_COUNT) * Math.PI * 2;

  switch (key) {
    case 'hero':
      drawHero(g, phase);
      break;
    case 'leaf_slime':
      drawSlime(
        g,
        phase,
        {
          base: '#4dc95e',
          shade: '#267d39',
          light: '#8cf084',
          spec: '#e8ffdc',
          accent: '#3ca848',
          accentLight: '#b5fa91',
          outline: '#142919',
        },
        false,
      );
      break;
    case 'gold_slime':
      drawSlime(
        g,
        phase,
        {
          base: '#f5be36',
          shade: '#b37212',
          light: '#ffe873',
          spec: '#ffffff',
          accent: '#ffdf59',
          accentLight: '#fff8cc',
          outline: '#2b1d0b',
        },
        true,
      );
      break;
    case 'acorn_boar':
      drawQuadruped(
        g,
        phase,
        {
          body: '#7d543f',
          shade: '#4f3122',
          light: '#ad7a5e',
          belly: '#d6b094',
          accent: '#9c6032',
          accentLight: '#d49459',
          eye: '#fff2d6',
          outline: '#211510',
        },
        'boar',
      );
      break;
    case 'moss_fox':
      drawQuadruped(
        g,
        phase,
        {
          body: '#e07b38',
          shade: '#9e4d1e',
          light: '#faad64',
          belly: '#fff2d9',
          accent: '#46ab51',
          accentLight: '#96ed7e',
          eye: '#ffe459',
          outline: '#1e241a',
        },
        'fox',
      );
      break;
    case 'ember_pup':
      drawQuadruped(
        g,
        phase,
        {
          body: '#e6552e',
          shade: '#9c2614',
          light: '#ff8f52',
          belly: '#ffde73',
          accent: '#ff962e',
          accentLight: '#fff296',
          eye: '#ffe66b',
          outline: '#261210',
        },
        'pup',
      );
      break;
    case 'lunar_wolf':
      drawQuadruped(
        g,
        phase,
        {
          body: '#8ea6cf',
          shade: '#4f648f',
          light: '#cadbf7',
          belly: '#edf5ff',
          accent: '#ffe159',
          accentLight: '#fff9cc',
          eye: '#ffe159',
          outline: '#13182b',
        },
        'wolf',
      );
      break;
    case 'thorn_sprite':
      drawWinged(
        g,
        phase,
        {
          body: '#4bb558',
          shade: '#277035',
          light: '#8cf086',
          belly: '#c9ffb8',
          wing: '#a8f7c8',
          wingLight: '#ebfff4',
          accent: '#eb598a',
          eye: '#265c3b',
          outline: '#1d1826',
        },
        'sprite',
      );
      break;
    case 'owl_sage':
      drawWinged(
        g,
        phase,
        {
          body: '#a8805c',
          shade: '#6e4e35',
          light: '#d9b38c',
          belly: '#f7ebd9',
          wing: '#4674b8',
          wingLight: '#7ab0fa',
          accent: '#f2c44e',
          eye: '#5ce8ff',
          outline: '#1b1826',
        },
        'owl',
      );
      break;
    case 'nebula_owl':
      drawWinged(
        g,
        phase,
        {
          body: '#486ec4',
          shade: '#263a75',
          light: '#80adff',
          belly: '#a3ebff',
          wing: '#5c8ce6',
          wingLight: '#c4f4ff',
          accent: '#ffe159',
          eye: '#ffe159',
          outline: '#12152b',
        },
        'owl',
      );
      break;
    case 'crystal_bat':
      drawWinged(
        g,
        phase,
        {
          body: '#4f9fe0',
          shade: '#2a5a94',
          light: '#9ce6ff',
          belly: '#dbf8ff',
          wing: '#69c9ff',
          wingLight: '#e0faff',
          accent: '#7ce8ff',
          eye: '#ff5275',
          outline: '#171a2e',
        },
        'bat',
      );
      break;
    case 'phoenix_chick':
      drawWinged(
        g,
        phase,
        {
          body: '#ff8a30',
          shade: '#c73a24',
          light: '#ffe159',
          belly: '#fff5c2',
          wing: '#ff6d24',
          wingLight: '#ffe66b',
          accent: '#ffe159',
          eye: '#241210',
          outline: '#261410',
        },
        'phoenix',
      );
      break;
    case 'crimson_wyrm':
      drawWinged(
        g,
        phase,
        {
          body: '#d93626',
          shade: '#8c1814',
          light: '#ff704d',
          belly: '#ffd566',
          wing: '#b8251d',
          wingLight: '#ff8c42',
          accent: '#ffe159',
          eye: '#ffe459',
          outline: '#210e0e',
        },
        'dragon',
      );
      break;
    case 'ancient_treant':
      drawArmoredOrGolem(
        g,
        phase,
        {
          armor: '#7d5030',
          shade: '#4f311c',
          light: '#a87046',
          trim: '#4bb551',
          glow: '#ffe463',
          accent: '#2b7d3b',
          outline: '#161f16',
        },
        'treant',
      );
      break;
    case 'stone_imp':
      drawArmoredOrGolem(
        g,
        phase,
        {
          armor: '#8c96ab',
          shade: '#565e70',
          light: '#c4cde0',
          trim: '#6beeff',
          glow: '#6beeff',
          accent: '#464d5e',
          outline: '#1a1d26',
        },
        'imp',
      );
      break;
    case 'shield_knight':
      drawArmoredOrGolem(
        g,
        phase,
        {
          armor: '#aebbd1',
          shade: '#68768c',
          light: '#ebf3ff',
          trim: '#f0be48',
          glow: '#78f0ff',
          accent: '#376eb5',
          outline: '#181c26',
        },
        'knight',
      );
      break;
    case 'astral_knight':
      drawArmoredOrGolem(
        g,
        phase,
        {
          armor: '#4e7fd4',
          shade: '#274280',
          light: '#a6ccff',
          trim: '#ffd859',
          glow: '#fff5b8',
          accent: '#22386e',
          outline: '#12172e',
        },
        'astral',
      );
      break;
    case 'rune_golem':
      drawArmoredOrGolem(
        g,
        phase,
        {
          armor: '#7e889e',
          shade: '#4a5163',
          light: '#bcc6db',
          trim: '#4ce8ff',
          glow: '#4ce8ff',
          accent: '#6beeff',
          outline: '#161821',
        },
        'golem',
      );
      break;
    case 'magma_crab':
      drawArmoredOrGolem(
        g,
        phase,
        {
          armor: '#d94526',
          shade: '#7d1e15',
          light: '#ff8a42',
          trim: '#ffe66b',
          glow: '#ffe059',
          accent: '#ff6d24',
          outline: '#21100e',
        },
        'crab',
      );
      break;
    case 'ash_witch':
      drawArmoredOrGolem(
        g,
        phase,
        {
          armor: '#595066',
          shade: '#342e3d',
          light: '#887c99',
          trim: '#ff9638',
          glow: '#ffe66b',
          accent: '#c93c2b',
          outline: '#1a141c',
        },
        'witch',
      );
      break;
    case 'star_jelly':
      drawCosmic(g, phase, 'jelly');
      break;
    case 'void_herald':
      drawCosmic(g, phase, 'herald');
      break;
    case 'star_devourer':
      drawCosmic(g, phase, 'devourer');
      break;
    // ===== v10 NEW MONSTERS (12) =====
    case 'frost_slime':
      drawSlime(
        g,
        phase,
        {
          base: '#5cd6ff',
          shade: '#277bb8',
          light: '#b8f4ff',
          spec: '#ffffff',
          accent: '#8cf0ff',
          accentLight: '#eefcff',
          outline: '#102238',
        },
        true,
      );
      break;
    case 'ice_wolf':
      drawQuadruped(
        g,
        phase,
        {
          body: '#8ad8f5',
          shade: '#3e7ca6',
          light: '#d6f6ff',
          belly: '#f2fcff',
          accent: '#4ec6ff',
          accentLight: '#ffffff',
          eye: '#4cf0ff',
          outline: '#102033',
        },
        'wolf',
      );
      break;
    case 'glacier_golem':
      drawArmoredOrGolem(
        g,
        phase,
        {
          armor: '#6ec6e8',
          shade: '#2f658f',
          light: '#c9f4ff',
          trim: '#ffffff',
          glow: '#7cf4ff',
          accent: '#3e92c9',
          outline: '#101d30',
        },
        'golem',
      );
      break;
    case 'snow_valkyrie':
      drawArmoredOrGolem(
        g,
        phase,
        {
          armor: '#cde9ff',
          shade: '#5a8bbd',
          light: '#ffffff',
          trim: '#7ce8ff',
          glow: '#e6fcff',
          accent: '#3970b5',
          outline: '#122036',
        },
        'astral',
      );
      break;
    case 'fenrir_lord': {
      drawQuadruped(
        g,
        phase,
        {
          body: '#589ce0',
          shade: '#21457d',
          light: '#b8e8ff',
          belly: '#e8f9ff',
          accent: '#7ce8ff',
          accentLight: '#ffffff',
          eye: '#ffe559',
          outline: '#0d182e',
        },
        'wolf',
      );
      // Bespoke Frost Crown + Crystal Mane Spikes
      const bob = Math.round(Math.sin(phase) * 1);
      g.rect(11, 5 + bob, 9, 2, '#7ce8ff');
      g.px(12, 3 + bob, '#ffffff');
      g.px(15, 2 + bob, '#ffe559');
      g.px(18, 3 + bob, '#ffffff');
      g.outline('#0d182e');
      break;
    }
    case 'cherub_spark': {
      drawWinged(
        g,
        phase,
        {
          body: '#fff0c2',
          shade: '#d4a657',
          light: '#ffffff',
          belly: '#fff9e6',
          wing: '#ffe680',
          wingLight: '#ffffff',
          accent: '#7ce8ff',
          eye: '#3b6cc9',
          outline: '#2b1e10',
        },
        'sprite',
      );
      // Floating golden halo
      const hb = Math.round(Math.sin(phase) * 1.2);
      g.rect(12, 3 + hb, 8, 2, '#ffe559');
      g.px(15, 3 + hb, '#ffffff');
      break;
    }
    case 'golden_paladin':
      drawArmoredOrGolem(
        g,
        phase,
        {
          armor: '#f2c74b',
          shade: '#a67417',
          light: '#fff5b8',
          trim: '#ffffff',
          glow: '#7ce8ff',
          accent: '#d9534f',
          outline: '#261a0c',
        },
        'knight',
      );
      break;
    case 'prism_sphinx': {
      drawQuadruped(
        g,
        phase,
        {
          body: '#ebb74d',
          shade: '#9c6b1c',
          light: '#ffe896',
          belly: '#fff7d6',
          accent: '#6beeff',
          accentLight: '#ffffff',
          eye: '#7ce8ff',
          outline: '#24180c',
        },
        'fox',
      );
      const sb = Math.round(Math.sin(phase) * 1);
      g.rect(12, 5 + sb, 7, 2, '#ffe559');
      g.px(15, 4 + sb, '#6beeff');
      break;
    }
    case 'solar_phoenix':
      drawWinged(
        g,
        phase,
        {
          body: '#ffb830',
          shade: '#c94318',
          light: '#fff5a6',
          belly: '#ffffff',
          wing: '#ff7b24',
          wingLight: '#ffe86b',
          accent: '#ffe86b',
          eye: '#ffffff',
          outline: '#29130b',
        },
        'phoenix',
      );
      break;
    case 'seraph_omega': {
      // Bespoke 6-Winged Radiant Sanctum Boss!
      const cy = 16 + Math.round(Math.sin(phase) * 1.8);
      const flap = Math.round(Math.sin(phase) * 3);
      // 3 pairs of animated golden-white seraph wings
      g.line(15, cy - 2, 3, cy - 10 + flap, '#ffe675', 3);
      g.line(16, cy - 2, 28, cy - 10 + flap, '#ffe675', 3);
      g.line(15, cy + 1, 2, cy + 1 - flap, '#fff8cc', 3);
      g.line(16, cy + 1, 29, cy + 1 - flap, '#fff8cc', 3);
      g.line(15, cy + 4, 5, cy + 10 + flap, '#7ce8ff', 2);
      g.line(16, cy + 4, 26, cy + 10 + flap, '#7ce8ff', 2);
      // Radiant white-gold celestial robe
      g.ellipse(15.5, cy + 4, 6.2, 7.5, '#fff5d1', '#c7972e', '#ffffff');
      g.rect(14, cy - 1, 3, 11, '#f5c749');
      // Glowing angelic core & twin cyan eyes
      g.ellipse(15.5, cy - 5, 4.5, 4.2, '#ffffff', '#e8c45a', '#ffffff');
      g.rect(13, cy - 6, 2, 2, '#4ce8ff');
      g.rect(17, cy - 6, 2, 2, '#4ce8ff');
      // Double floating golden halo
      g.rect(10, cy - 12, 11, 2, '#ffe559');
      g.px(15, cy - 13, '#ffffff');
      g.outline('#261a0c');
      break;
    }
    case 'crystal_dragon': {
      drawWinged(
        g,
        phase,
        {
          body: '#8ae8ff',
          shade: '#3b7fc4',
          light: '#ebfcff',
          belly: '#ffffff',
          wing: '#b89eff',
          wingLight: '#f0e8ff',
          accent: '#ffe875',
          eye: '#ff66b2',
          outline: '#161b33',
        },
        'dragon',
      );
      // Prismatic sparkle pixels
      if (Math.sin(phase) > 0) {
        g.px(15, 4, '#ffffff');
        g.px(25, 9, '#ffe875');
      }
      break;
    }
    case 'eclipse_reaper': {
      drawCosmic(g, phase, 'herald');
      // Gleaming Crimson-Violet Eclipse Scythe!
      const sway = Math.round(Math.sin(phase) * 2);
      g.line(23, 25, 25, 6 + sway, '#9c59d1', 2);
      g.line(25, 6 + sway, 17, 4 + sway, '#ff4d6d', 2);
      g.line(17, 4 + sway, 14, 7 + sway, '#ffa3b5', 2);
      g.outline('#120c1c');
      break;
    }
    default:
      drawPropOrEvent(g, key, phase);
      break;
  }

  return g;
}

const frameCanvasCache = new Map<string, HTMLCanvasElement>();
const staticUrlCache = new Map<string, string>();

export function getHdSpriteCanvas(
  key: string,
  scale = 2,
  flipX = false,
  silhouette = false,
  frameIndex = 0,
): HTMLCanvasElement {
  const f = EQUIP_ICON_KEYS.has(key) ? 0 : ((frameIndex % ANIM_FRAME_COUNT) + ANIM_FRAME_COUNT) % ANIM_FRAME_COUNT;
  const cacheKey = `${key}_${scale}_${flipX ? 1 : 0}_${silhouette ? 1 : 0}_${f}`;
  const cached = frameCanvasCache.get(cacheKey);
  if (cached) return cached;

  const grid = paintSprite(key, f);
  const pxScale = Math.max(1, Math.round(scale));
  const canvas = document.createElement('canvas');
  canvas.width = grid.size * pxScale;
  canvas.height = grid.size * pxScale;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  ctx.imageSmoothingEnabled = false;
  for (let y = 0; y < grid.size; y += 1) {
    for (let x = 0; x < grid.size; x += 1) {
      const col = grid.get(x, y);
      if (!col) continue;
      ctx.fillStyle = silhouette ? '#222030' : col;
      const dx = flipX ? (grid.size - 1 - x) * pxScale : x * pxScale;
      ctx.fillRect(dx, y * pxScale, pxScale, pxScale);
    }
  }

  frameCanvasCache.set(cacheKey, canvas);
  return canvas;
}

export function getHdSpriteDataUrl(
  key: string,
  scale = 2,
  silhouette = false,
): string {
  const cacheKey = `${key}_${scale}_${silhouette ? 1 : 0}`;
  const cached = staticUrlCache.get(cacheKey);
  if (cached) return cached;
  if (typeof document === 'undefined') return '';
  const canvas = getHdSpriteCanvas(key, scale, false, silhouette, 0);
  const url = canvas.toDataURL();
  staticUrlCache.set(cacheKey, url);
  return url;
}
