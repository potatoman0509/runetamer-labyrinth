/**
 * 16-bit Chiptune Web Audio Synthesizer Engine (Zero External Assets)
 * Provides crisp SFC/DQ-style sound effects and subtle looping BGM tracks
 * with safe browser autoplay handling and instant mute toggle.
 */

export type BgmTrack = 'none' | 'village' | 'dungeon' | 'battle' | 'boss';

export type SfxKind =
  | 'click'
  | 'attack'
  | 'crit'
  | 'weak'
  | 'heal'
  | 'shield'
  | 'buff'
  | 'break'
  | 'boss_charge'
  | 'victory'
  | 'defeat'
  | 'levelup'
  | 'mythic'
  | 'forge'
  | 'quest_claim';

interface TrackDef {
  tempoMs: number;
  leadWave: OscillatorType;
  bassWave: OscillatorType;
  leadVol: number;
  bassVol: number;
  lead: number[]; // MIDI notes (0 = rest)
  bass: number[];
}

const TRACKS: Record<Exclude<BgmTrack, 'none'>, TrackDef> = {
  village: {
    tempoMs: 280,
    leadWave: 'triangle',
    bassWave: 'sine',
    leadVol: 0.045,
    bassVol: 0.035,
    lead: [64, 67, 72, 71, 69, 67, 64, 0, 62, 65, 69, 67, 65, 64, 62, 0],
    bass: [48, 0, 55, 0, 53, 0, 48, 0, 50, 0, 55, 0, 53, 0, 55, 0],
  },
  dungeon: {
    tempoMs: 240,
    leadWave: 'triangle',
    bassWave: 'triangle',
    leadVol: 0.04,
    bassVol: 0.04,
    lead: [57, 0, 60, 62, 64, 0, 62, 60, 59, 0, 57, 55, 57, 0, 0, 0],
    bass: [45, 45, 0, 48, 45, 0, 43, 0, 40, 40, 0, 43, 45, 0, 40, 0],
  },
  battle: {
    tempoMs: 150,
    leadWave: 'square',
    bassWave: 'triangle',
    leadVol: 0.03,
    bassVol: 0.045,
    lead: [64, 67, 69, 67, 71, 72, 71, 67, 69, 67, 64, 62, 64, 67, 69, 0],
    bass: [45, 52, 45, 52, 48, 55, 48, 55, 50, 57, 50, 57, 45, 52, 43, 50],
  },
  boss: {
    tempoMs: 132,
    leadWave: 'sawtooth',
    bassWave: 'square',
    leadVol: 0.028,
    bassVol: 0.032,
    lead: [62, 65, 68, 69, 68, 65, 62, 61, 62, 69, 70, 69, 65, 64, 62, 0],
    bass: [38, 38, 45, 38, 41, 41, 48, 41, 40, 40, 47, 40, 38, 45, 43, 41],
  },
};

function midiToHz(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

class ChiptuneSoundEngine {
  private ctx: AudioContext | null = null;
  private muted = false;
  private currentTrack: BgmTrack = 'none';
  private stepIdx = 0;
  private timer: number | null = null;
  private unlocked = false;

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const Ctor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      try {
        this.ctx = new Ctor();
      } catch {
        return null;
      }
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  unlock(): void {
    this.unlocked = true;
    if (!this.muted) {
      this.ensureContext();
      if (this.currentTrack !== 'none' && this.timer === null) {
        this.startLoop();
      }
    }
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (muted) {
      this.stopLoop();
    } else if (this.unlocked && this.currentTrack !== 'none') {
      this.ensureContext();
      this.startLoop();
    }
  }

  isMuted(): boolean {
    return this.muted;
  }

  setBgm(track: BgmTrack): void {
    if (this.currentTrack === track) return;
    this.currentTrack = track;
    this.stepIdx = 0;
    this.stopLoop();
    if (track !== 'none' && !this.muted && this.unlocked) {
      this.startLoop();
    }
  }

  private stopLoop(): void {
    if (this.timer !== null && typeof window !== 'undefined') {
      window.clearInterval(this.timer);
      this.timer = null;
    }
  }

  private startLoop(): void {
    this.stopLoop();
    if (this.currentTrack === 'none' || this.muted || typeof window === 'undefined') return;
    const def = TRACKS[this.currentTrack];
    this.timer = window.setInterval(() => {
      if (this.muted || !this.unlocked || this.currentTrack === 'none') return;
      const ctx = this.ensureContext();
      if (!ctx || ctx.state !== 'running') return;
      const now = ctx.currentTime;
      const idx = this.stepIdx % def.lead.length;
      const leadMidi = def.lead[idx] ?? 0;
      const bassMidi = def.bass[idx] ?? 0;
      const dur = (def.tempoMs / 1000) * 0.82;
      if (leadMidi > 0) {
        this.tone(ctx, midiToHz(leadMidi), now, dur, def.leadWave, def.leadVol);
      }
      if (bassMidi > 0) {
        this.tone(ctx, midiToHz(bassMidi), now, dur, def.bassWave, def.bassVol);
      }
      this.stepIdx += 1;
    }, def.tempoMs);
  }

  private tone(
    ctx: AudioContext,
    freq: number,
    startTime: number,
    duration: number,
    type: OscillatorType,
    volume: number,
    endFreq?: number,
  ): void {
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, startTime);
      if (endFreq && endFreq !== freq) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(30, endFreq), startTime + duration);
      }
      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.linearRampToValueAtTime(volume, startTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + duration + 0.02);
    } catch {
      // Ignore audio scheduling errors in restricted environments
    }
  }

  playSfx(kind: SfxKind): void {
    if (this.muted) return;
    this.unlocked = true;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const t = ctx.currentTime;

    switch (kind) {
      case 'click':
        this.tone(ctx, 680, t, 0.045, 'square', 0.04, 880);
        break;
      case 'attack':
        this.tone(ctx, 320, t, 0.07, 'sawtooth', 0.06, 110);
        break;
      case 'crit':
        this.tone(ctx, 520, t, 0.06, 'square', 0.075, 220);
        this.tone(ctx, 880, t + 0.04, 0.11, 'square', 0.07, 1320);
        break;
      case 'weak':
        this.tone(ctx, 660, t, 0.06, 'square', 0.065, 990);
        this.tone(ctx, 990, t + 0.05, 0.09, 'triangle', 0.075, 1320);
        break;
      case 'heal':
        this.tone(ctx, 523, t, 0.08, 'triangle', 0.065);
        this.tone(ctx, 659, t + 0.06, 0.08, 'triangle', 0.065);
        this.tone(ctx, 784, t + 0.12, 0.14, 'triangle', 0.07);
        break;
      case 'shield':
        this.tone(ctx, 420, t, 0.09, 'triangle', 0.065, 640);
        this.tone(ctx, 640, t + 0.07, 0.11, 'sine', 0.06, 840);
        break;
      case 'buff':
        this.tone(ctx, 440, t, 0.06, 'square', 0.05);
        this.tone(ctx, 587, t + 0.05, 0.09, 'square', 0.055);
        break;
      case 'boss_charge':
        this.tone(ctx, 180, t, 0.24, 'sawtooth', 0.075, 420);
        break;
      case 'break':
        this.tone(ctx, 220, t, 0.08, 'sawtooth', 0.085, 880);
        this.tone(ctx, 880, t + 0.07, 0.14, 'square', 0.08, 1760);
        break;
      case 'forge':
        this.tone(ctx, 920, t, 0.05, 'square', 0.07, 1480);
        this.tone(ctx, 1180, t + 0.06, 0.12, 'triangle', 0.07, 880);
        break;
      case 'levelup':
      case 'quest_claim':
        [523, 659, 784, 1046].forEach((hz, i) => {
          this.tone(ctx, hz, t + i * 0.065, 0.11, 'square', 0.055);
        });
        break;
      case 'victory':
        [523, 659, 784, 659, 1046].forEach((hz, i) => {
          this.tone(ctx, hz, t + i * 0.08, i === 4 ? 0.26 : 0.09, 'square', 0.055);
        });
        break;
      case 'mythic':
        [587, 740, 880, 1174, 1480].forEach((hz, i) => {
          this.tone(ctx, hz, t + i * 0.075, i === 4 ? 0.34 : 0.1, 'triangle', 0.08);
          this.tone(ctx, hz * 0.5, t + i * 0.075, 0.1, 'square', 0.035);
        });
        break;
      case 'defeat':
        [392, 349, 311, 261].forEach((hz, i) => {
          this.tone(ctx, hz, t + i * 0.12, 0.16, 'sawtooth', 0.055);
        });
        break;
    }
  }
}

export const soundEngine = new ChiptuneSoundEngine();
