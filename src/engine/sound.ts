/**
 * Symphonic Orchestra Web Audio Synthesizer Engine (Zero External Assets)
 * Renders lush multi-section orchestral BGM (Strings Ensemble, Solo Violin with vibrato,
 * French Horn/Trumpet Brass, Concert Flute/Woodwind, Concert Harp, Contrabass,
 * Pitched Timpani, Orchestral Snare & Cymbal) through a Concert Hall ambience bus,
 * plus crisp RPG sound effects with safe browser autoplay handling and instant mute toggle.
 */

export type BgmTrack =
  | 'none'
  | 'village'
  | 'forest'
  | 'ruins'
  | 'volcano'
  | 'abyss'
  | 'glacier'
  | 'sanctum'
  | 'dungeon'
  | 'battle'
  | 'boss';

export type SynthFallbackTrack = 'village' | 'dungeon' | 'battle' | 'boss';

export const PREGENERATED_BGM_FILES: Record<Exclude<BgmTrack, 'none'>, string> = {
  village: './audio/village.mp3',
  forest: './audio/forest.mp3',
  ruins: './audio/ruins.mp3',
  volcano: './audio/volcano.mp3',
  abyss: './audio/abyss.mp3',
  glacier: './audio/glacier.mp3',
  sanctum: './audio/sanctum.mp3',
  dungeon: './audio/forest.mp3',
  battle: './audio/battle.mp3',
  boss: './audio/boss.mp3',
};

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

export type OrchestraInstrument =
  | 'strings'
  | 'violin'
  | 'brass'
  | 'woodwind'
  | 'harp'
  | 'contrabass'
  | 'timpani'
  | 'percussion';

export interface OrchestraTrackDef {
  title: string;
  style: 'orchestra';
  instruments: OrchestraInstrument[];
  tempoMs: number;
  steps: number;
  leadKind: 'woodwind' | 'violin' | 'brass';
  leadVol: number;
  lead: number[]; // MIDI note per step (0 = rest)
  counterKind?: 'violin' | 'brass' | 'woodwind';
  counterVol?: number;
  counter?: number[];
  chords: Record<number, number[]>; // step -> chord MIDI notes for Strings Ensemble
  chordVol: number;
  chordSteps: number; // how many steps each chord sustains
  harp?: number[]; // Concert Harp arpeggio MIDI notes
  harpVol?: number;
  bass: number[]; // Cello / Contrabass MIDI notes
  bassVol: number;
  timpani?: number[]; // Pitched Timpani MIDI notes
  timpaniVol?: number;
  snare?: number[]; // 1 = accent, 0.5 = light hit
  cymbal?: number[]; // 1 = suspended cymbal crash
}

export const ORCHESTRA_TRACKS: Record<SynthFallbackTrack, OrchestraTrackDef> = {
  // 始まりの村：牧歌的な弦楽合奏＋フルート＋コンサートハープのワルツ風オーケストラ
  village: {
    title: '始まりの村・弦楽とフルートの調べ',
    style: 'orchestra',
    instruments: ['strings', 'woodwind', 'violin', 'harp', 'contrabass'],
    tempoMs: 255,
    steps: 32,
    leadKind: 'woodwind',
    leadVol: 0.062,
    lead: [
      72, 0, 76, 79, 76, 0, 74, 72,
      69, 0, 72, 76, 74, 0, 0, 0,
      77, 0, 76, 74, 72, 0, 74, 76,
      74, 0, 71, 67, 72, 0, 0, 0,
    ],
    counterKind: 'violin',
    counterVol: 0.036,
    counter: [
      0, 0, 0, 0, 64, 0, 67, 0,
      69, 0, 67, 0, 65, 0, 67, 0,
      69, 0, 72, 0, 67, 0, 64, 0,
      65, 0, 62, 0, 64, 0, 0, 0,
    ],
    chords: {
      0: [60, 64, 67], // C
      4: [59, 64, 67], // Em/B
      8: [57, 60, 64], // Am
      12: [55, 59, 62], // G
      16: [53, 57, 60], // F
      20: [52, 55, 60], // C/E
      24: [50, 53, 57], // Dm
      28: [55, 59, 62, 65], // G7
    },
    chordVol: 0.028,
    chordSteps: 4,
    harp: [
      60, 64, 67, 72, 59, 64, 67, 71,
      57, 60, 64, 69, 55, 59, 62, 67,
      53, 57, 60, 65, 52, 55, 60, 64,
      50, 53, 57, 62, 55, 59, 62, 67,
    ],
    harpVol: 0.036,
    bass: [
      48, 0, 0, 0, 47, 0, 0, 0,
      45, 0, 0, 0, 43, 0, 0, 0,
      41, 0, 0, 0, 40, 0, 0, 0,
      38, 0, 0, 0, 43, 0, 43, 0,
    ],
    bassVol: 0.068,
  },

  // 迷宮探索：神秘的な弦楽＋ホルンの呼びかけ＋ハープとティンパニの鼓動
  dungeon: {
    title: '迷宮の深淵・弦楽とホルンの夜想曲',
    style: 'orchestra',
    instruments: ['strings', 'violin', 'brass', 'harp', 'contrabass', 'timpani'],
    tempoMs: 230,
    steps: 32,
    leadKind: 'violin',
    leadVol: 0.056,
    lead: [
      69, 0, 72, 74, 76, 0, 74, 72,
      71, 0, 69, 67, 69, 0, 0, 0,
      65, 0, 69, 72, 71, 0, 69, 68,
      69, 0, 72, 71, 69, 0, 0, 0,
    ],
    counterKind: 'brass',
    counterVol: 0.042,
    counter: [
      0, 0, 0, 0, 57, 0, 0, 0,
      0, 0, 0, 0, 55, 57, 59, 0,
      0, 0, 0, 0, 53, 0, 52, 0,
      0, 0, 57, 59, 60, 0, 59, 0,
    ],
    chords: {
      0: [57, 60, 64], // Am
      4: [53, 57, 60, 64], // Fmaj7
      8: [50, 53, 57], // Dm
      12: [52, 56, 59], // E
      16: [53, 57, 60], // F
      20: [55, 59, 62], // G
      24: [57, 60, 64], // Am
      28: [52, 56, 59, 62], // E7
    },
    chordVol: 0.03,
    chordSteps: 4,
    harp: [
      57, 0, 64, 60, 53, 0, 60, 57,
      50, 0, 57, 53, 52, 0, 59, 56,
      53, 0, 60, 57, 55, 0, 62, 59,
      57, 0, 64, 60, 52, 0, 59, 56,
    ],
    harpVol: 0.028,
    bass: [
      45, 0, 0, 45, 41, 0, 0, 41,
      38, 0, 0, 38, 40, 0, 43, 0,
      41, 0, 0, 41, 43, 0, 0, 43,
      45, 0, 40, 0, 40, 0, 0, 0,
    ],
    bassVol: 0.072,
    timpani: [
      45, 0, 0, 0, 0, 0, 0, 0,
      38, 0, 0, 0, 40, 0, 0, 0,
      41, 0, 0, 0, 43, 0, 0, 0,
      45, 0, 0, 0, 40, 0, 40, 0,
    ],
    timpaniVol: 0.055,
  },

  // 通常戦闘：勇壮なバイオリン主旋律＋金管ファンファーレ＋弦楽刻み＋ティンパニ＆スネア行進曲
  battle: {
    title: '剣とルーンの交響曲・オーケストラ戦闘曲',
    style: 'orchestra',
    instruments: ['strings', 'violin', 'brass', 'contrabass', 'timpani', 'percussion'],
    tempoMs: 165,
    steps: 32,
    leadKind: 'violin',
    leadVol: 0.064,
    lead: [
      62, 65, 69, 0, 74, 72, 70, 69,
      67, 69, 70, 0, 69, 67, 65, 64,
      62, 65, 69, 72, 74, 0, 76, 77,
      76, 74, 72, 69, 70, 69, 67, 69,
    ],
    counterKind: 'brass',
    counterVol: 0.052,
    counter: [
      50, 0, 57, 0, 62, 0, 0, 0,
      58, 0, 55, 0, 57, 0, 52, 0,
      50, 0, 57, 0, 65, 0, 64, 0,
      60, 0, 57, 0, 58, 0, 57, 0,
    ],
    chords: {
      0: [50, 53, 57], // Dm
      4: [50, 53, 57], // Dm
      8: [46, 50, 53], // Bb
      12: [45, 49, 52], // A
      16: [50, 53, 57], // Dm
      20: [53, 57, 60], // F
      24: [48, 52, 55], // C
      28: [45, 49, 52, 55], // A7
    },
    chordVol: 0.032,
    chordSteps: 4,
    bass: [
      38, 0, 45, 38, 38, 0, 45, 38,
      34, 0, 41, 34, 33, 0, 40, 33,
      38, 0, 45, 38, 41, 0, 48, 41,
      36, 0, 43, 36, 33, 40, 45, 40,
    ],
    bassVol: 0.08,
    timpani: [
      38, 0, 0, 0, 38, 0, 45, 0,
      34, 0, 0, 0, 33, 0, 40, 33,
      38, 0, 0, 0, 41, 0, 0, 0,
      36, 0, 0, 0, 33, 0, 33, 45,
    ],
    timpaniVol: 0.078,
    snare: [
      0, 0, 0.6, 0, 0, 0.5, 0.9, 0.5,
      0, 0, 0.6, 0, 0, 0.5, 0.9, 0.7,
      0, 0, 0.6, 0, 0, 0.5, 0.9, 0.5,
      0, 0.5, 0.7, 0.5, 1, 0, 0.8, 0.8,
    ],
    cymbal: [
      1, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0,
      1, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0,
    ],
  },

  // ボス戦：重厚な金管ファンファーレ＋疾走する弦楽＋雷鳴のティンパニ＆シンバル大交響曲
  boss: {
    title: '覇王決戦・フルオーケストラ交響曲',
    style: 'orchestra',
    instruments: ['strings', 'violin', 'brass', 'contrabass', 'timpani', 'percussion'],
    tempoMs: 145,
    steps: 32,
    leadKind: 'brass',
    leadVol: 0.068,
    lead: [
      62, 0, 62, 65, 69, 0, 68, 65,
      62, 65, 69, 70, 69, 0, 67, 64,
      62, 0, 65, 69, 74, 0, 73, 70,
      69, 67, 65, 64, 62, 0, 61, 0,
    ],
    counterKind: 'violin',
    counterVol: 0.056,
    counter: [
      74, 72, 70, 69, 74, 76, 77, 76,
      74, 70, 69, 67, 69, 73, 76, 73,
      74, 72, 70, 69, 81, 79, 77, 76,
      74, 70, 69, 67, 69, 73, 76, 79,
    ],
    chords: {
      0: [50, 53, 57], // Dm
      4: [46, 50, 53, 57], // Bbmaj7
      8: [43, 46, 50, 53], // Gm7
      12: [45, 49, 52, 58], // A7b9
      16: [50, 53, 57], // Dm
      20: [51, 55, 58], // Eb
      24: [43, 46, 50], // Gm
      28: [45, 49, 52, 55], // A7
    },
    chordVol: 0.036,
    chordSteps: 4,
    bass: [
      38, 38, 45, 38, 34, 34, 41, 34,
      43, 43, 38, 43, 33, 33, 40, 33,
      38, 38, 45, 38, 39, 39, 46, 39,
      43, 43, 38, 34, 33, 40, 45, 33,
    ],
    bassVol: 0.088,
    timpani: [
      38, 0, 38, 0, 34, 0, 34, 0,
      43, 0, 0, 38, 33, 0, 33, 33,
      38, 0, 38, 0, 39, 0, 39, 0,
      43, 0, 38, 0, 33, 33, 45, 33,
    ],
    timpaniVol: 0.095,
    snare: [
      1, 0, 0.6, 0.5, 1, 0, 0.7, 0.6,
      1, 0, 0.6, 0.5, 1, 0.6, 0.8, 0.9,
      1, 0, 0.6, 0.5, 1, 0, 0.7, 0.6,
      1, 0.6, 0.7, 0.8, 1, 0.8, 0.9, 1,
    ],
    cymbal: [
      1, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 1, 0, 0, 0,
      1, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 1, 0, 0, 0,
    ],
  },
};

function midiToHz(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

interface OrchestraBus {
  dry: GainNode;
  reverb: GainNode;
  noiseBuffer: AudioBuffer;
}

declare const __STANDALONE_ARTIFACT__: boolean | undefined;

function toSynthFallbackTrack(track: Exclude<BgmTrack, 'none'>): SynthFallbackTrack {
  if (track === 'village' || track === 'battle' || track === 'boss') return track;
  return 'dungeon';
}

class OrchestralSoundEngine {
  private ctx: AudioContext | null = null;
  private bus: OrchestraBus | null = null;
  private muted = false;
  private bgmVolume = 0.75;
  private seVolume = 0.85;
  private currentTrack: BgmTrack = 'none';
  private stepIdx = 0;
  private timer: number | null = null;
  private unlocked = false;
  private audioEl: HTMLAudioElement | null = null;
  private audioTrack: BgmTrack = 'none';
  private useSynthFallback =
    typeof __STANDALONE_ARTIFACT__ !== 'undefined' && Boolean(__STANDALONE_ARTIFACT__);

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const Ctor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      try {
        this.ctx = new Ctor();
        this.bus = this.createOrchestraBus(this.ctx);
      } catch {
        return null;
      }
    }
    if (this.ctx.state !== 'running') {
      this.ctx
        .resume()
        .then(() => {
          if (this.useSynthFallback && !this.muted && this.unlocked && this.currentTrack !== 'none') {
            if (this.timer === null) {
              this.startSynthLoop();
            } else if (this.stepIdx === 0) {
              this.tickBgm();
            }
          }
        })
        .catch(() => {});
    }
    return this.ctx;
  }

  private primeIosAudio(ctx: AudioContext): void {
    try {
      const buf = ctx.createBuffer(1, 1, ctx.sampleRate);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const zeroGain = ctx.createGain();
      zeroGain.gain.value = 0;
      src.connect(zeroGain);
      zeroGain.connect(ctx.destination);
      src.start(0);
    } catch {
      // Ignore in restricted environments
    }
  }

  private createOrchestraBus(ctx: AudioContext): OrchestraBus {
    const masterGain = ctx.createGain();
    masterGain.gain.value = 0.88 * this.seVolume;

    const warmthFilter = ctx.createBiquadFilter();
    warmthFilter.type = 'lowpass';
    warmthFilter.frequency.value = 7200;
    warmthFilter.Q.value = 0.5;

    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -16;
    compressor.knee.value = 18;
    compressor.ratio.value = 4;
    compressor.attack.value = 0.008;
    compressor.release.value = 0.16;

    masterGain.connect(warmthFilter);
    warmthFilter.connect(compressor);
    compressor.connect(ctx.destination);

    // Lightweight stereo concert-hall ambience network (2 damped delay taps)
    const reverbIn = ctx.createGain();
    reverbIn.gain.value = 1;

    const damp = ctx.createBiquadFilter();
    damp.type = 'lowpass';
    damp.frequency.value = 2400;

    const delayA = ctx.createDelay(0.2);
    delayA.delayTime.value = 0.043;
    const delayB = ctx.createDelay(0.2);
    delayB.delayTime.value = 0.067;

    const fbA = ctx.createGain();
    fbA.gain.value = 0.28;
    const fbB = ctx.createGain();
    fbB.gain.value = 0.26;

    const wetOut = ctx.createGain();
    wetOut.gain.value = 0.24;

    reverbIn.connect(damp);
    damp.connect(delayA);
    damp.connect(delayB);
    delayA.connect(fbA);
    fbA.connect(delayB);
    delayB.connect(fbB);
    fbB.connect(delayA);
    delayA.connect(wetOut);
    delayB.connect(wetOut);
    wetOut.connect(masterGain);

    // Cached white-noise buffer for orchestral snare & cymbal percussion
    const bufLen = Math.floor(ctx.sampleRate * 0.55);
    const noiseBuffer = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufLen; i += 1) {
      data[i] = Math.random() * 2 - 1;
    }

    return { dry: masterGain, reverb: reverbIn, noiseBuffer };
  }

  private startPreGeneratedBgm(): void {
    if (
      this.muted ||
      !this.unlocked ||
      this.currentTrack === 'none' ||
      typeof window === 'undefined' ||
      typeof Audio === 'undefined'
    ) {
      return;
    }

    if (this.useSynthFallback) {
      this.startSynthLoop();
      return;
    }

    const srcUrl = PREGENERATED_BGM_FILES[this.currentTrack];
    if (!this.audioEl) {
      this.audioEl = new Audio();
      this.audioEl.loop = true;
      this.audioEl.preload = 'auto';
      this.audioEl.addEventListener('error', () => {
        // Fallback cleanly to built-in orchestral synth if MP3 fails to load
        this.useSynthFallback = true;
        if (!this.muted && this.unlocked && this.currentTrack !== 'none') {
          this.startSynthLoop();
        }
      });
    }

    if (this.audioTrack !== this.currentTrack) {
      this.audioTrack = this.currentTrack;
      this.audioEl.src = srcUrl;
      this.audioEl.currentTime = 0;
    }

    this.audioEl.volume = Math.max(0, Math.min(1, this.bgmVolume));
    this.audioEl.muted = this.muted;
    const playPromise = this.audioEl.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(() => {
        // Autoplay may still be pending until next user gesture
      });
    }
  }

  private stopPreGeneratedBgm(): void {
    if (this.audioEl) {
      try {
        this.audioEl.pause();
      } catch {
        // Ignore pause errors in headless/test DOM
      }
    }
  }

  tryAutoStart(): void {
    if (this.muted || typeof navigator === 'undefined') return;
    const ua = (navigator as { userActivation?: { hasBeenActive?: boolean } }).userActivation;
    if (ua?.hasBeenActive) {
      this.unlock();
    }
  }

  unlock(): void {
    this.unlocked = true;
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (ctx && ctx.state !== 'running') {
      this.primeIosAudio(ctx);
      ctx.resume().catch(() => {});
    }
    if (this.currentTrack !== 'none') {
      if (this.useSynthFallback) {
        if (this.timer === null) this.startSynthLoop();
      } else if (!this.audioEl || this.audioEl.paused || this.audioTrack !== this.currentTrack) {
        this.startPreGeneratedBgm();
      }
    }
  }

  resumeIfNeeded(): void {
    if (!this.unlocked || this.muted) return;
    const ctx = this.ensureContext();
    if (ctx && ctx.state !== 'running') {
      ctx.resume().catch(() => {});
    }
    if (this.currentTrack !== 'none') {
      if (this.useSynthFallback) {
        if (this.timer === null) this.startSynthLoop();
      } else if (!this.audioEl || this.audioEl.paused) {
        this.startPreGeneratedBgm();
      }
    }
  }

  setBgmVolume(vol: number): void {
    this.bgmVolume = Math.max(0, Math.min(1, Number.isFinite(vol) ? vol : 0.75));
    if (this.audioEl) {
      this.audioEl.volume = this.bgmVolume;
    }
  }

  getBgmVolume(): number {
    return this.bgmVolume;
  }

  setSeVolume(vol: number): void {
    this.seVolume = Math.max(0, Math.min(1, Number.isFinite(vol) ? vol : 0.85));
    if (this.bus) {
      this.bus.dry.gain.value = 0.88 * this.seVolume;
    }
  }

  getSeVolume(): number {
    return this.seVolume;
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (muted) {
      this.stopLoop();
      this.stopPreGeneratedBgm();
    } else if (this.unlocked && this.currentTrack !== 'none') {
      this.ensureContext();
      this.startPreGeneratedBgm();
    }
  }

  isMuted(): boolean {
    return this.muted;
  }

  getCurrentTrack(): BgmTrack {
    return this.currentTrack;
  }

  setBgm(track: BgmTrack): void {
    if (this.currentTrack === track) return;
    this.currentTrack = track;
    this.stepIdx = 0;
    this.stopLoop();
    if (track === 'none') {
      this.stopPreGeneratedBgm();
      this.audioTrack = 'none';
      return;
    }
    if (!this.muted && this.unlocked) {
      this.startPreGeneratedBgm();
    }
  }

  private stopLoop(): void {
    if (this.timer !== null && typeof window !== 'undefined') {
      window.clearInterval(this.timer);
      this.timer = null;
    }
  }

  private tickBgm(): void {
    if (this.muted || !this.unlocked || this.currentTrack === 'none') return;
    const ctx = this.ensureContext();
    if (!ctx || !this.bus || ctx.state !== 'running') return;
    const def = ORCHESTRA_TRACKS[toSynthFallbackTrack(this.currentTrack)];
    const now = ctx.currentTime + 0.01;
    const idx = this.stepIdx % def.steps;
    const stepSec = def.tempoMs / 1000;
    const bgmGainScale = Math.max(0.05, this.bgmVolume);

    // 1. Lush Bowed Strings Ensemble Pad Chords
    const chord = def.chords[idx];
    if (chord && chord.length > 0) {
      this.playStringsChord(ctx, chord, now, stepSec * def.chordSteps * 1.02, def.chordVol * bgmGainScale);
    }

    // 2. Main Orchestral Melody (Violin / Woodwind Flute / Brass Fanfare)
    const leadMidi = def.lead[idx] ?? 0;
    if (leadMidi > 0) {
      let holdSteps = 1;
      while (holdSteps < 3 && (def.lead[(idx + holdSteps) % def.steps] ?? 0) === 0) {
        holdSteps += 1;
      }
      const leadDur = stepSec * Math.min(holdSteps, 2.2) * 0.94;
      if (def.leadKind === 'woodwind') {
        this.playWoodwind(ctx, leadMidi, now, leadDur, def.leadVol * bgmGainScale);
      } else if (def.leadKind === 'brass') {
        this.playBrass(ctx, leadMidi, now, leadDur, def.leadVol * bgmGainScale);
      } else {
        this.playViolinLead(ctx, leadMidi, now, leadDur, def.leadVol * bgmGainScale);
      }
    }

    // 3. Counter-Melody (French Horn / Second Violin)
    if (def.counter && def.counterKind) {
      const cMidi = def.counter[idx] ?? 0;
      if (cMidi > 0) {
        const cVol = (def.counterVol ?? 0.04) * bgmGainScale;
        const cDur = stepSec * 1.45;
        if (def.counterKind === 'brass') {
          this.playBrass(ctx, cMidi, now, cDur, cVol);
        } else if (def.counterKind === 'woodwind') {
          this.playWoodwind(ctx, cMidi, now, cDur, cVol);
        } else {
          this.playViolinLead(ctx, cMidi, now, cDur, cVol);
        }
      }
    }

    // 4. Concert Harp Arpeggios
    if (def.harp) {
      const hMidi = def.harp[idx] ?? 0;
      if (hMidi > 0) {
        this.playHarp(ctx, hMidi, now, Math.max(0.55, stepSec * 2.4), (def.harpVol ?? 0.032) * bgmGainScale);
      }
    }

    // 5. Cello & Contrabass Foundation
    const bassMidi = def.bass[idx] ?? 0;
    if (bassMidi > 0) {
      this.playContrabass(ctx, bassMidi, now, stepSec * 1.35, def.bassVol * bgmGainScale);
    }

    // 6. Pitched Concert Timpani
    if (def.timpani) {
      const tMidi = def.timpani[idx] ?? 0;
      if (tMidi > 0) {
        this.playTimpani(ctx, tMidi, now, 0.36, (def.timpaniVol ?? 0.07) * bgmGainScale);
      }
    }

    // 7. Orchestral Snare & Suspended Cymbal
    if (def.snare) {
      const sAmp = def.snare[idx] ?? 0;
      if (sAmp > 0) {
        this.playOrchestralPerc(ctx, 'snare', now, 0.036 * sAmp * bgmGainScale);
      }
    }
    if (def.cymbal && (def.cymbal[idx] ?? 0) > 0) {
      this.playOrchestralPerc(ctx, 'cymbal', now, 0.032 * bgmGainScale);
    }

    this.stepIdx += 1;
  }

  private startSynthLoop(): void {
    this.stopLoop();
    if (this.currentTrack === 'none' || this.muted || typeof window === 'undefined') return;
    const def = ORCHESTRA_TRACKS[toSynthFallbackTrack(this.currentTrack)];
    this.tickBgm();
    this.timer = window.setInterval(() => {
      this.tickBgm();
    }, def.tempoMs);
  }

  private routeToHall(node: AudioNode, sendAmount: number): void {
    if (!this.bus || !this.ctx) return;
    node.connect(this.bus.dry);
    const send = this.ctx.createGain();
    send.gain.value = sendAmount;
    node.connect(send);
    send.connect(this.bus.reverb);
  }

  /** Multi-voice bowed Strings Ensemble (detuned sawtooth pair per note + warm lowpass bow envelope) */
  private playStringsChord(
    ctx: AudioContext,
    midis: number[],
    start: number,
    dur: number,
    volume: number,
  ): void {
    try {
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1450, start);
      filter.frequency.linearRampToValueAtTime(2150, start + Math.min(0.22, dur * 0.4));
      filter.frequency.linearRampToValueAtTime(1550, start + dur);
      filter.Q.value = 0.8;

      const env = ctx.createGain();
      const perVoiceVol = volume / Math.max(1, Math.sqrt(midis.length));
      const atk = Math.min(0.11, dur * 0.28);
      const rel = 0.24;
      env.gain.setValueAtTime(0.0001, start);
      env.gain.linearRampToValueAtTime(perVoiceVol, start + atk);
      env.gain.setValueAtTime(perVoiceVol * 0.9, start + Math.max(atk, dur - 0.06));
      env.gain.exponentialRampToValueAtTime(0.0001, start + dur + rel);

      filter.connect(env);
      this.routeToHall(env, 0.72);

      for (const midi of midis) {
        const hz = midiToHz(midi);
        for (const detune of [-5.5, 5.5]) {
          const osc = ctx.createOscillator();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(hz, start);
          osc.detune.setValueAtTime(detune, start);
          osc.connect(filter);
          osc.start(start);
          osc.stop(start + dur + rel + 0.03);
        }
      }
    } catch {
      // Ignore scheduling errors in restricted environments
    }
  }

  /** Singing First Violin Section with expressive vibrato LFO */
  private playViolinLead(
    ctx: AudioContext,
    midi: number,
    start: number,
    dur: number,
    volume: number,
  ): void {
    try {
      const hz = midiToHz(midi);
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2700, start);
      filter.Q.value = 1.3;

      const env = ctx.createGain();
      const atk = Math.min(0.048, dur * 0.25);
      const rel = 0.14;
      env.gain.setValueAtTime(0.0001, start);
      env.gain.linearRampToValueAtTime(volume, start + atk);
      env.gain.setValueAtTime(volume * 0.85, start + Math.max(atk, dur * 0.78));
      env.gain.exponentialRampToValueAtTime(0.0001, start + dur + rel);

      // Expressive violin vibrato LFO
      const vib = ctx.createOscillator();
      const vibGain = ctx.createGain();
      vib.type = 'sine';
      vib.frequency.setValueAtTime(5.4, start);
      vibGain.gain.setValueAtTime(0.5, start);
      vibGain.gain.linearRampToValueAtTime(7.5, start + Math.min(0.14, dur * 0.5));
      vib.connect(vibGain);

      filter.connect(env);
      this.routeToHall(env, 0.65);

      for (const detune of [-4, 4]) {
        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(hz, start);
        osc.detune.setValueAtTime(detune, start);
        vibGain.connect(osc.detune);
        osc.connect(filter);
        osc.start(start);
        osc.stop(start + dur + rel + 0.03);
      }

      vib.start(start);
      vib.stop(start + dur + rel + 0.03);
    } catch {
      // Ignore scheduling errors
    }
  }

  /** French Horn / Orchestral Brass with resonant brass filter swell */
  private playBrass(
    ctx: AudioContext,
    midi: number,
    start: number,
    dur: number,
    volume: number,
  ): void {
    try {
      const hz = midiToHz(midi);
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(380, start);
      filter.frequency.exponentialRampToValueAtTime(2300, start + Math.min(0.065, dur * 0.35));
      filter.frequency.exponentialRampToValueAtTime(1050, start + dur);
      filter.Q.value = 1.75;

      const env = ctx.createGain();
      const atk = Math.min(0.032, dur * 0.22);
      const rel = 0.14;
      env.gain.setValueAtTime(0.0001, start);
      env.gain.linearRampToValueAtTime(volume, start + atk);
      env.gain.setValueAtTime(volume * 0.82, start + Math.max(atk, dur * 0.72));
      env.gain.exponentialRampToValueAtTime(0.0001, start + dur + rel);

      filter.connect(env);
      this.routeToHall(env, 0.58);

      const osc1 = ctx.createOscillator();
      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(hz, start);
      osc1.detune.setValueAtTime(-3, start);

      const osc2 = ctx.createOscillator();
      osc2.type = 'sawtooth';
      osc2.frequency.setValueAtTime(hz, start);
      osc2.detune.setValueAtTime(3, start);

      osc1.connect(filter);
      osc2.connect(filter);
      osc1.start(start);
      osc2.start(start);
      osc1.stop(start + dur + rel + 0.03);
      osc2.stop(start + dur + rel + 0.03);
    } catch {
      // Ignore scheduling errors
    }
  }

  /** Concert Flute / Woodwind pastoral lead */
  private playWoodwind(
    ctx: AudioContext,
    midi: number,
    start: number,
    dur: number,
    volume: number,
  ): void {
    try {
      const hz = midiToHz(midi);
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(3200, start);

      const env = ctx.createGain();
      const atk = Math.min(0.04, dur * 0.25);
      const rel = 0.15;
      env.gain.setValueAtTime(0.0001, start);
      env.gain.linearRampToValueAtTime(volume, start + atk);
      env.gain.setValueAtTime(volume * 0.86, start + Math.max(atk, dur * 0.75));
      env.gain.exponentialRampToValueAtTime(0.0001, start + dur + rel);

      const vib = ctx.createOscillator();
      const vibGain = ctx.createGain();
      vib.type = 'sine';
      vib.frequency.setValueAtTime(5.0, start);
      vibGain.gain.setValueAtTime(4.5, start);
      vib.connect(vibGain);

      const fundamental = ctx.createOscillator();
      fundamental.type = 'sine';
      fundamental.frequency.setValueAtTime(hz, start);
      vibGain.connect(fundamental.detune);

      const overtone = ctx.createOscillator();
      const overtoneGain = ctx.createGain();
      overtone.type = 'triangle';
      overtone.frequency.setValueAtTime(hz * 2, start);
      overtoneGain.gain.setValueAtTime(0.18, start);

      fundamental.connect(filter);
      overtone.connect(overtoneGain);
      overtoneGain.connect(filter);
      filter.connect(env);
      this.routeToHall(env, 0.72);

      fundamental.start(start);
      overtone.start(start);
      vib.start(start);
      fundamental.stop(start + dur + rel + 0.03);
      overtone.stop(start + dur + rel + 0.03);
      vib.stop(start + dur + rel + 0.03);
    } catch {
      // Ignore scheduling errors
    }
  }

  /** Concert Harp sparkling pluck */
  private playHarp(
    ctx: AudioContext,
    midi: number,
    start: number,
    dur: number,
    volume: number,
  ): void {
    try {
      const hz = midiToHz(midi);
      const env = ctx.createGain();
      env.gain.setValueAtTime(0.0001, start);
      env.gain.linearRampToValueAtTime(volume, start + 0.006);
      env.gain.exponentialRampToValueAtTime(0.0001, start + dur);

      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(hz, start);

      const chime = ctx.createOscillator();
      const chimeGain = ctx.createGain();
      chime.type = 'sine';
      chime.frequency.setValueAtTime(hz * 2, start);
      chimeGain.gain.setValueAtTime(volume * 0.28, start);
      chimeGain.gain.exponentialRampToValueAtTime(0.0001, start + Math.min(0.18, dur * 0.4));

      osc.connect(env);
      chime.connect(chimeGain);
      chimeGain.connect(env);
      this.routeToHall(env, 0.78);

      osc.start(start);
      chime.start(start);
      osc.stop(start + dur + 0.03);
      chime.stop(start + dur + 0.03);
    } catch {
      // Ignore scheduling errors
    }
  }

  /** Deep Cello / Contrabass foundation */
  private playContrabass(
    ctx: AudioContext,
    midi: number,
    start: number,
    dur: number,
    volume: number,
  ): void {
    try {
      const hz = midiToHz(midi);
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(480, start);
      filter.Q.value = 0.7;

      const env = ctx.createGain();
      const atk = Math.min(0.035, dur * 0.2);
      const rel = 0.14;
      env.gain.setValueAtTime(0.0001, start);
      env.gain.linearRampToValueAtTime(volume, start + atk);
      env.gain.exponentialRampToValueAtTime(0.0001, start + dur + rel);

      const sub = ctx.createOscillator();
      sub.type = 'triangle';
      sub.frequency.setValueAtTime(hz, start);

      const bow = ctx.createOscillator();
      const bowGain = ctx.createGain();
      bow.type = 'sawtooth';
      bow.frequency.setValueAtTime(hz, start);
      bowGain.gain.value = 0.45;

      sub.connect(filter);
      bow.connect(bowGain);
      bowGain.connect(filter);
      filter.connect(env);
      this.routeToHall(env, 0.32);

      sub.start(start);
      bow.start(start);
      sub.stop(start + dur + rel + 0.03);
      bow.stop(start + dur + rel + 0.03);
    } catch {
      // Ignore scheduling errors
    }
  }

  /** Pitched Concert Timpani kettle-drum hit */
  private playTimpani(
    ctx: AudioContext,
    midi: number,
    start: number,
    dur: number,
    volume: number,
  ): void {
    try {
      const hz = midiToHz(midi);
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(340, start);

      const env = ctx.createGain();
      env.gain.setValueAtTime(0.0001, start);
      env.gain.linearRampToValueAtTime(volume, start + 0.008);
      env.gain.exponentialRampToValueAtTime(0.0001, start + dur);

      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(hz * 1.14, start);
      osc.frequency.exponentialRampToValueAtTime(Math.max(32, hz), start + 0.048);

      const body = ctx.createOscillator();
      const bodyGain = ctx.createGain();
      body.type = 'triangle';
      body.frequency.setValueAtTime(hz * 1.5, start);
      bodyGain.gain.setValueAtTime(0.28, start);
      bodyGain.gain.exponentialRampToValueAtTime(0.001, start + 0.14);

      osc.connect(filter);
      body.connect(bodyGain);
      bodyGain.connect(filter);
      filter.connect(env);
      this.routeToHall(env, 0.42);

      osc.start(start);
      body.start(start);
      osc.stop(start + dur + 0.03);
      body.stop(start + dur + 0.03);
    } catch {
      // Ignore scheduling errors
    }
  }

  /** Orchestral Snare hit & Suspended Cymbal shimmer */
  private playOrchestralPerc(
    ctx: AudioContext,
    kind: 'snare' | 'cymbal',
    start: number,
    volume: number,
  ): void {
    if (!this.bus) return;
    try {
      const src = ctx.createBufferSource();
      src.buffer = this.bus.noiseBuffer;

      const filter = ctx.createBiquadFilter();
      const env = ctx.createGain();
      const dur = kind === 'cymbal' ? 0.52 : 0.095;

      if (kind === 'cymbal') {
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(4800, start);
        env.gain.setValueAtTime(0.0001, start);
        env.gain.linearRampToValueAtTime(volume, start + 0.025);
        env.gain.exponentialRampToValueAtTime(0.0001, start + dur);
      } else {
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1850, start);
        filter.Q.value = 1.2;
        env.gain.setValueAtTime(0.0001, start);
        env.gain.linearRampToValueAtTime(volume, start + 0.004);
        env.gain.exponentialRampToValueAtTime(0.0001, start + dur);
      }

      src.connect(filter);
      filter.connect(env);
      this.routeToHall(env, kind === 'cymbal' ? 0.8 : 0.35);

      src.start(start);
      src.stop(start + dur + 0.02);
    } catch {
      // Ignore scheduling errors
    }
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
      if (this.bus) {
        gain.connect(this.bus.dry);
      } else {
        gain.connect(ctx.destination);
      }
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
        this.tone(ctx, 680, t, 0.045, 'triangle', 0.045, 880);
        break;
      case 'attack':
        this.tone(ctx, 320, t, 0.08, 'sawtooth', 0.06, 110);
        break;
      case 'crit':
        this.tone(ctx, 520, t, 0.07, 'sawtooth', 0.07, 220);
        this.playBrass(ctx, 76, t + 0.03, 0.14, 0.06);
        break;
      case 'weak':
        this.tone(ctx, 660, t, 0.065, 'triangle', 0.065, 990);
        this.playHarp(ctx, 84, t + 0.04, 0.18, 0.065);
        break;
      case 'heal':
        [72, 76, 79, 84].forEach((m, i) => {
          this.playHarp(ctx, m, t + i * 0.055, 0.34, 0.055);
        });
        break;
      case 'shield':
        this.playBrass(ctx, 62, t, 0.14, 0.05);
        this.playHarp(ctx, 74, t + 0.06, 0.24, 0.05);
        break;
      case 'buff':
        this.playBrass(ctx, 64, t, 0.11, 0.048);
        this.playBrass(ctx, 69, t + 0.06, 0.16, 0.052);
        break;
      case 'boss_charge':
        this.playTimpani(ctx, 38, t, 0.32, 0.09);
        this.playBrass(ctx, 50, t + 0.04, 0.28, 0.065);
        break;
      case 'break':
        this.playTimpani(ctx, 45, t, 0.28, 0.095);
        this.playBrass(ctx, 74, t + 0.05, 0.22, 0.07);
        this.playOrchestralPerc(ctx, 'cymbal', t + 0.04, 0.045);
        break;
      case 'forge':
        this.tone(ctx, 920, t, 0.05, 'triangle', 0.07, 1480);
        this.playHarp(ctx, 81, t + 0.05, 0.26, 0.065);
        break;
      case 'levelup':
      case 'quest_claim':
        [72, 76, 79, 84].forEach((m, i) => {
          this.playBrass(ctx, m, t + i * 0.07, i === 3 ? 0.28 : 0.11, 0.052);
          this.playHarp(ctx, m + 12, t + i * 0.07, 0.3, 0.032);
        });
        break;
      case 'victory':
        [72, 76, 79, 76, 84].forEach((m, i) => {
          this.playBrass(ctx, m, t + i * 0.085, i === 4 ? 0.42 : 0.11, 0.058);
        });
        this.playStringsChord(ctx, [60, 64, 67, 72], t + 0.34, 0.48, 0.045);
        break;
      case 'mythic':
        [74, 78, 81, 86, 90].forEach((m, i) => {
          this.playHarp(ctx, m, t + i * 0.07, 0.45, 0.06);
          this.playBrass(ctx, m - 12, t + i * 0.07, i === 4 ? 0.45 : 0.12, 0.052);
        });
        this.playOrchestralPerc(ctx, 'cymbal', t + 0.26, 0.04);
        break;
      case 'defeat':
        [62, 60, 58, 57].forEach((m, i) => {
          this.playStringsChord(ctx, [m - 12, m], t + i * 0.14, 0.26, 0.05);
        });
        break;
    }
  }
}

export const soundEngine = new OrchestralSoundEngine();
