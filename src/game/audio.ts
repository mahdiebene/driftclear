/**
 * Realistic Snow-Plowing Foley & Always-On Soothing Alpine Music Engine for Driftclear
 *
 * Design principles:
 * 1. ZERO repetitive beeps or chimes when plowing regular snow or drifts!
 * 2. Real 3-layer physical snow-plowing foley:
 *    - Granular packed-snow crystal crunch (clump-modulated filtered pink noise)
 *    - Heavy steel-blade snow-push whoosh & soft rumble (warm low-mid filtered noise)
 *    - Muffled winter cab / tire-on-snow purr (silent when parked)
 *    - Soft powder-burst whoosh when cutting through deep snowdrifts
 * 3. Always-on soothing alpine background music in F Major:
 *    - Warm Rhodes / felt-piano slow chord pads (Fmaj7 -> Dm9 -> Bbmaj7 -> C6/9)
 *    - Delicate sparse felt-piano melody notes with cozy room echo
 *    - Whisper-quiet winter mountain breeze bed
 *    - Smooth master warmth filter + soft compressor (zero ear fatigue, zero clipping)
 */

interface ChordVoicing {
  pad: number[];
  melody: number[];
}

// Cozy F-Major / D-Minor alpine winter progression (warm mid-register, never shrill)
const WINTER_PROGRESSION: ChordVoicing[] = [
  // Bar 1: Fmaj7 (F2, C3, E3, A3)
  { pad: [87.31, 130.81, 164.81, 220.0], melody: [261.63, 349.23, 329.63, 293.66] },
  // Bar 2: Dm9 (D2, A2, E3, F3, A3)
  { pad: [73.42, 110.0, 164.81, 174.61], melody: [293.66, 329.63, 349.23, 261.63] },
  // Bar 3: Bbmaj7 (Bb2, F3, A3, D4)
  { pad: [116.54, 174.61, 220.0, 293.66], melody: [349.23, 392.0, 440.0, 349.23] },
  // Bar 4: C6/9 (C3, G3, A3, D4)
  { pad: [130.81, 196.0, 220.0, 293.66], melody: [392.0, 349.23, 329.63, 261.63] },
  // Bar 5: Am7 (A2, E3, G3, C4)
  { pad: [110.0, 164.81, 196.0, 261.63], melody: [329.63, 392.0, 440.0, 329.63] },
  // Bar 6: Dm7 (D2, A2, C3, F3)
  { pad: [73.42, 110.0, 130.81, 174.61], melody: [349.23, 293.66, 261.63, 220.0] },
  // Bar 7: Gm9 (G2, D3, A3, Bb3)
  { pad: [98.0, 146.83, 220.0, 233.08], melody: [293.66, 349.23, 392.0, 293.66] },
  // Bar 8: C9sus4 -> resolve gently back to Fmaj7
  { pad: [130.81, 174.61, 196.0, 293.66], melody: [349.23, 329.63, 293.66, 261.63] },
];

export class CozySynthAudio {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;

  // Separate buses so soothing music stays warm & lush while real snow foley stays natural & crisp
  private sfxBus: BiquadFilterNode | null = null;
  private musicBus: GainNode | null = null;
  private musicWarmth: BiquadFilterNode | null = null;
  private musicDelay: DelayNode | null = null;
  private musicDelayFeedback: GainNode | null = null;

  // Real physical snow-plowing continuous foley layers
  private brownBuffer: AudioBuffer | null = null;
  private snowCrunchBuffer: AudioBuffer | null = null;

  private engineSource: AudioBufferSourceNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;
  private engineGain: GainNode | null = null;

  private pushSource: AudioBufferSourceNode | null = null;
  private pushFilter: BiquadFilterNode | null = null;
  private pushGain: GainNode | null = null;

  private crunchSource: AudioBufferSourceNode | null = null;
  private crunchFilter: BiquadFilterNode | null = null;
  private crunchGain: GainNode | null = null;

  // Always-on soothing winter wind bed & generative chord/melody scheduler
  private breezeSource: AudioBufferSourceNode | null = null;
  private breezeFilter: BiquadFilterNode | null = null;
  private breezeGain: GainNode | null = null;
  private breezeLfo: OscillatorNode | null = null;

  private musicTimerId: number | null = null;
  private musicStep = 0;

  private muted = false;
  private unlocked = false;
  private disposed = false;
  private lastDriftWhooshTime = 0;

  public isMuted(): boolean {
    return this.muted;
  }

  public unlock(): void {
    if (typeof window === 'undefined' || this.disposed) return;

    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;

      try {
        this.ctx = new AudioCtx();

        // Soft studio master compressor -> master gain -> speakers
        this.compressor = this.ctx.createDynamicsCompressor();
        this.compressor.threshold.value = -16;
        this.compressor.knee.value = 20;
        this.compressor.ratio.value = 3.5;
        this.compressor.attack.value = 0.012;
        this.compressor.release.value = 0.22;

        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = this.muted ? 0 : 0.62;

        this.compressor.connect(this.masterGain);
        this.masterGain.connect(this.ctx.destination);

        // 1. Snow-plowing SFX bus: gentle 2500 Hz warm roll-off (crisp snow texture, zero ear-piercing hiss)
        this.sfxBus = this.ctx.createBiquadFilter();
        this.sfxBus.type = 'lowpass';
        this.sfxBus.frequency.value = 2500;
        this.sfxBus.Q.value = 0.5;
        this.sfxBus.connect(this.compressor);

        // 2. Always-on Soothing Music bus: warm 1050 Hz lowpass + cozy room echo
        this.musicBus = this.ctx.createGain();
        this.musicBus.gain.value = 0.38;

        this.musicWarmth = this.ctx.createBiquadFilter();
        this.musicWarmth.type = 'lowpass';
        this.musicWarmth.frequency.value = 1050;
        this.musicWarmth.Q.value = 0.45;

        this.musicDelay = this.ctx.createDelay(1.0);
        this.musicDelay.delayTime.value = 0.44;
        const delayTone = this.ctx.createBiquadFilter();
        delayTone.type = 'lowpass';
        delayTone.frequency.value = 740;
        this.musicDelayFeedback = this.ctx.createGain();
        this.musicDelayFeedback.gain.value = 0.28;
        const delayWet = this.ctx.createGain();
        delayWet.gain.value = 0.24;

        this.musicBus.connect(this.musicWarmth);
        this.musicWarmth.connect(this.compressor);
        // Subtle lush fireplace-room echo send
        this.musicWarmth.connect(this.musicDelay);
        this.musicDelay.connect(delayTone);
        delayTone.connect(this.musicDelayFeedback);
        this.musicDelayFeedback.connect(this.musicDelay);
        delayTone.connect(delayWet);
        delayWet.connect(this.compressor);

        this.buildNoiseBuffers();
        this.setupRealSnowPlowLoops();
        this.setupAmbientBreeze();
        this.startSoothingMusicLoop();
      } catch {
        return;
      }
    }

    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    this.unlocked = true;
  }

  private buildNoiseBuffers(): void {
    if (!this.ctx) return;
    const sr = this.ctx.sampleRate;

    // 1. Seamless warm brown-pink noise (4s) for heavy snow push, cab rumble & breeze
    const brownLen = sr * 4;
    const brown = this.ctx.createBuffer(1, brownLen, sr);
    const bData = brown.getChannelData(0);
    let last = 0;
    for (let i = 0; i < brownLen; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.032 * white) / 1.032;
      bData[i] = last * 3.1;
    }
    this.crossfadeLoop(bData, Math.min(2048, Math.floor(brownLen * 0.05)));
    this.brownBuffer = brown;

    // 2. Seamless realistic granular packed-snow crunch buffer (3.5s)
    // Uses soft pink noise modulated by random natural snow-crystal micro-envelopes so it sounds
    // genuinely like real snow compressing & shearing under a steel plow blade!
    const crunchLen = Math.floor(sr * 3.5);
    const crunch = this.ctx.createBuffer(1, crunchLen, sr);
    const cData = crunch.getChannelData(0);

    // Paul Kellet 3-stage pink noise + natural grainy snow-clump amplitude texture
    let b0 = 0;
    let b1 = 0;
    let b2 = 0;
    let grainEnv = 0.45;
    let grainTarget = 0.55;
    let grainCountdown = 0;

    for (let i = 0; i < crunchLen; i++) {
      if (grainCountdown <= 0) {
        // Organic snow clump clusters (each crystal shear lasts ~14-52ms)
        grainCountdown = Math.floor(sr * (0.014 + Math.random() * 0.038));
        grainTarget = 0.25 + Math.pow(Math.random(), 1.6) * 0.95;
      }
      grainCountdown--;
      grainEnv += (grainTarget - grainEnv) * 0.008;

      const white = Math.random() * 2 - 1;
      b0 = 0.99765 * b0 + white * 0.099046;
      b1 = 0.96300 * b1 + white * 0.2965164;
      b2 = 0.57000 * b2 + white * 1.0526913;
      const pink = (b0 + b1 + b2 + white * 0.1848) * 0.14;

      cData[i] = Math.max(-0.95, Math.min(0.95, pink * grainEnv * 1.65));
    }
    this.crossfadeLoop(cData, Math.min(2048, Math.floor(crunchLen * 0.05)));
    this.snowCrunchBuffer = crunch;
  }

  private crossfadeLoop(data: Float32Array, fadeSamples: number): void {
    const len = data.length;
    for (let i = 0; i < fadeSamples; i++) {
      const t = i / fadeSamples;
      data[len - fadeSamples + i] = data[len - fadeSamples + i] * (1 - t) + data[i] * t;
    }
  }

  private setupRealSnowPlowLoops(): void {
    if (!this.ctx || !this.sfxBus || !this.brownBuffer || !this.snowCrunchBuffer) return;

    // Layer A: Soft muffled winter truck engine / tire-on-snow roll (silent when stopped)
    this.engineSource = this.ctx.createBufferSource();
    this.engineSource.buffer = this.brownBuffer;
    this.engineSource.loop = true;

    this.engineFilter = this.ctx.createBiquadFilter();
    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.value = 110;
    this.engineFilter.Q.value = 0.7;

    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.value = 0;

    this.engineSource.connect(this.engineFilter);
    this.engineFilter.connect(this.engineGain);
    this.engineGain.connect(this.sfxBus);
    this.engineSource.start();

    // Layer B: Real curved steel blade pushing heavy snow (warm low-mid snow displacement whoosh)
    this.pushSource = this.ctx.createBufferSource();
    this.pushSource.buffer = this.brownBuffer;
    this.pushSource.loop = true;

    this.pushFilter = this.ctx.createBiquadFilter();
    this.pushFilter.type = 'bandpass';
    this.pushFilter.frequency.value = 300;
    this.pushFilter.Q.value = 0.65;

    this.pushGain = this.ctx.createGain();
    this.pushGain.gain.value = 0;

    this.pushSource.connect(this.pushFilter);
    this.pushFilter.connect(this.pushGain);
    this.pushGain.connect(this.sfxBus);
    this.pushSource.start(0, 1.3);

    // Layer C: Authentic granular packed-snow crystal crunch shearing along the blade
    this.crunchSource = this.ctx.createBufferSource();
    this.crunchSource.buffer = this.snowCrunchBuffer;
    this.crunchSource.loop = true;

    this.crunchFilter = this.ctx.createBiquadFilter();
    this.crunchFilter.type = 'bandpass';
    this.crunchFilter.frequency.value = 1080;
    this.crunchFilter.Q.value = 0.8;

    this.crunchGain = this.ctx.createGain();
    this.crunchGain.gain.value = 0;

    this.crunchSource.connect(this.crunchFilter);
    this.crunchFilter.connect(this.crunchGain);
    this.crunchGain.connect(this.sfxBus);
    this.crunchSource.start(0, 0.4);
  }

  private setupAmbientBreeze(): void {
    if (!this.ctx || !this.musicBus || !this.brownBuffer) return;

    this.breezeSource = this.ctx.createBufferSource();
    this.breezeSource.buffer = this.brownBuffer;
    this.breezeSource.loop = true;

    this.breezeFilter = this.ctx.createBiquadFilter();
    this.breezeFilter.type = 'bandpass';
    this.breezeFilter.frequency.value = 230;
    this.breezeFilter.Q.value = 0.9;

    // Ultra-slow gentle mountain wind breathing LFO (0.11 Hz)
    this.breezeLfo = this.ctx.createOscillator();
    this.breezeLfo.type = 'sine';
    this.breezeLfo.frequency.value = 0.11;
    const lfoDepth = this.ctx.createGain();
    lfoDepth.gain.value = 65;
    this.breezeLfo.connect(lfoDepth);
    lfoDepth.connect(this.breezeFilter.frequency);

    this.breezeGain = this.ctx.createGain();
    this.breezeGain.gain.value = 0.022;

    this.breezeSource.connect(this.breezeFilter);
    this.breezeFilter.connect(this.breezeGain);
    this.breezeGain.connect(this.musicBus);

    this.breezeSource.start(0, 2.2);
    this.breezeLfo.start();
  }

  /**
   * Always-on generative soothing winter soundtrack (slow F-major felt-piano & warm Rhodes pad).
   * Plays continuously across title, gameplay, garage, and pause whenever unmuted.
   */
  private startSoothingMusicLoop(): void {
    if (this.musicTimerId !== null) return;

    const triggerBar = () => {
      if (this.disposed || !this.ctx || !this.musicBus) return;
      if (this.ctx.state !== 'running' || this.muted) return;

      const bar = WINTER_PROGRESSION[this.musicStep % WINTER_PROGRESSION.length];
      this.musicStep += 1;

      const barSec = 4.4;
      // 1. Lush warm Rhodes / alpine pad chord with slow 1.15s velvet swell
      bar.pad.forEach((freq, idx) => {
        this.schedulePadVoice(freq, idx * 0.09, barSec + 0.65, idx === 0 ? 0.082 : 0.048);
      });

      // 2. Delicate, unhurried felt-piano winter melody (2-3 soft notes spaced gently across 4.4s)
      const note1 = bar.melody[0];
      const note2 = bar.melody[(this.musicStep % 2) + 1];
      const note3 = bar.melody[3];

      this.scheduleMusicFeltNote(note1, 0.55, 2.1, 0.068);
      this.scheduleMusicFeltNote(note2, 2.15, 2.0, 0.056);
      if (this.musicStep % 2 === 0) {
        this.scheduleMusicFeltNote(note3, 3.25, 1.8, 0.045);
      }
    };

    // Start the very first cozy chord after a 150ms soft fade-in, then every 4.4s
    window.setTimeout(triggerBar, 150);
    this.musicTimerId = window.setInterval(triggerBar, 4400);
  }

  private schedulePadVoice(freq: number, delaySec: number, durationSec: number, peakGain: number): void {
    if (!this.ctx || !this.musicBus) return;
    const t0 = this.ctx.currentTime + delaySec;

    // Warm slightly detuned twin sines emulate an organic electric piano / soft string pad
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'sine';
    osc2.type = 'triangle';
    osc1.frequency.setValueAtTime(freq, t0);
    osc2.frequency.setValueAtTime(freq * 1.0018, t0); // subtle cozy warmth chorus

    const osc2Mix = this.ctx.createGain();
    osc2Mix.gain.value = 0.14;

    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.linearRampToValueAtTime(peakGain, t0 + 1.15);
    gain.gain.setTargetAtTime(peakGain * 0.65, t0 + 1.35, 1.2);
    gain.gain.exponentialRampToValueAtTime(0.0005, t0 + durationSec);

    osc1.connect(gain);
    osc2.connect(osc2Mix);
    osc2Mix.connect(gain);
    gain.connect(this.musicBus);

    osc1.start(t0);
    osc2.start(t0);
    osc1.stop(t0 + durationSec + 0.08);
    osc2.stop(t0 + durationSec + 0.08);
  }

  private scheduleMusicFeltNote(
    freq: number,
    delaySec: number,
    durationSec: number,
    peakGain: number
  ): void {
    if (!this.ctx || !this.musicBus) return;
    const t0 = this.ctx.currentTime + delaySec;

    const osc = this.ctx.createOscillator();
    const overtone = this.ctx.createOscillator();
    const ovGain = this.ctx.createGain();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    overtone.type = 'sine';
    osc.frequency.setValueAtTime(freq, t0);
    overtone.frequency.setValueAtTime(freq * 2, t0);
    ovGain.gain.value = 0.05; // ultra-soft felt hammer warmth

    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.linearRampToValueAtTime(peakGain, t0 + 0.038);
    gain.gain.exponentialRampToValueAtTime(0.0005, t0 + durationSec);

    osc.connect(gain);
    overtone.connect(ovGain);
    ovGain.connect(gain);
    gain.connect(this.musicBus);

    osc.start(t0);
    overtone.start(t0);
    osc.stop(t0 + durationSec + 0.08);
    overtone.stop(t0 + durationSec + 0.08);
  }

  public setMuted(mute: boolean): void {
    this.muted = mute;
    if (this.ctx && this.masterGain) {
      const now = this.ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setTargetAtTime(mute ? 0 : 0.62, now, 0.05);
    }
  }

  public toggleMute(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  /**
   * Smoothly drives real snow-plowing foley layers (granular snow crunch, steel blade snow-push whoosh,
   * and quiet cab/tire roll) + gently ducks background music only slightly when paused.
   */
  public updateContinuous(
    activePlaying: boolean,
    speedRatio: number,
    plowingIntensity: number,
    isBoosting: boolean
  ): void {
    if (
      !this.ctx ||
      !this.unlocked ||
      !this.engineGain ||
      !this.engineFilter ||
      !this.pushGain ||
      !this.pushFilter ||
      !this.crunchGain ||
      !this.crunchFilter ||
      !this.musicBus
    ) {
      return;
    }

    const now = this.ctx.currentTime;

    // Keep soothing music gently playing all the time (slightly softer when paused/in garage)
    this.musicBus.gain.setTargetAtTime(activePlaying ? 0.40 : 0.30, now, 0.25);

    if (!activePlaying || this.muted) {
      this.engineGain.gain.setTargetAtTime(0, now, 0.12);
      this.pushGain.gain.setTargetAtTime(0, now, 0.10);
      this.crunchGain.gain.setTargetAtTime(0, now, 0.09);
      return;
    }

    const s = Math.max(0, Math.min(1.5, speedRatio));
    const p = Math.max(0, Math.min(1, plowingIntensity));

    // 1. Cozy muffled cab & tire-on-snow hum (silent when parked)
    const targetEngine = s < 0.04 ? 0 : Math.min(0.09, s * 0.058 + (isBoosting ? 0.025 : 0));
    this.engineFilter.frequency.setTargetAtTime(95 + s * 68 + (isBoosting ? 38 : 0), now, 0.12);
    this.engineGain.gain.setTargetAtTime(targetEngine, now, 0.12);

    // 2. Real steel-blade snow-push whoosh (swells smoothly while blade is pushing snow)
    const speedFactor = 0.45 + Math.min(1.0, s) * 0.55;
    const targetPush = p * speedFactor * (isBoosting ? 0.28 : 0.21);
    this.pushFilter.frequency.setTargetAtTime(220 + s * 165 + p * 85, now, 0.09);
    this.pushGain.gain.setTargetAtTime(targetPush, now, 0.08);

    // 3. Authentic granular packed-snow crystal crunch (tactile, realistic, never harsh)
    const targetCrunch = p * speedFactor * (isBoosting ? 0.18 : 0.145);
    this.crunchFilter.frequency.setTargetAtTime(860 + s * 390 + (isBoosting ? 180 : 0), now, 0.09);
    this.crunchGain.gain.setTargetAtTime(targetCrunch, now, 0.08);
  }

  /**
   * Smoothly modulates the warm lowpass-filtered mountain wind bed in response to
   * dynamic weather (calm hush under Clear Skies -> cozy swell during Heavy Blizzard).
   */
  public setWeatherBreeze(intensity: number): void {
    if (!this.ctx || !this.unlocked || !this.breezeGain || !this.breezeFilter || !this.breezeLfo) {
      return;
    }
    const clamped = Math.max(0, Math.min(1, intensity));
    const now = this.ctx.currentTime;
    const targetGain = this.muted ? 0 : 0.010 + clamped * 0.056;
    const targetFreq = 195 + clamped * 195;
    const targetLfo = 0.09 + clamped * 0.17;
    this.breezeGain.gain.setTargetAtTime(targetGain, now, 0.35);
    this.breezeFilter.frequency.setTargetAtTime(targetFreq, now, 0.35);
    this.breezeLfo.frequency.setTargetAtTime(targetLfo, now, 0.45);
  }

  /**
   * Real snow-plowing impact foley:
   * - Regular snow: ZERO beeps or chimes (handled continuously by the silky snow-crunch & blade-push layers!)
   * - Heavy snowdrift: Authentic muffled powder-burst whoosh + soft snowbank cushion thud
   */
  public playSnowChime(_comboCount: number, isDrift: boolean): void {
    if (!isDrift) return; // Never play repetitive notes/beeps when plowing normal snow!
    if (!this.ctx || !this.sfxBus || !this.snowCrunchBuffer || this.muted || !this.unlocked) return;

    const now = this.ctx.currentTime;
    if (now - this.lastDriftWhooshTime < 0.22) return;
    this.lastDriftWhooshTime = now;

    // Authentic heavy snowdrift powder-burst whoosh (filtered granular noise swell, zero oscillators)
    const src = this.ctx.createBufferSource();
    src.buffer = this.snowCrunchBuffer;
    const offset = Math.random() * 2.2;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(520, now);
    filter.frequency.exponentialRampToValueAtTime(240, now + 0.24);
    filter.Q.value = 0.7;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.19, now + 0.035);
    gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.26);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxBus);
    src.start(now, offset, 0.30);

    // Subtle soft snowbank cushion thump underneath the powder spray
    this.playCushionThud(76, 38, 0.085, 0.13);
  }

  public playGoldenDrift(): void {
    if (!this.ctx || !this.musicBus || this.muted || !this.unlocked) return;
    // Gentle warm F-major harp shimmer (harmonizes softly with the background music)
    const notes = [349.23, 440.0, 523.25];
    notes.forEach((freq, i) => {
      this.scheduleMusicFeltNote(freq, i * 0.08, 0.85, 0.10);
    });
  }

  public playComboTierUp(multiplier: number): void {
    if (!this.ctx || !this.musicBus || this.muted || !this.unlocked) return;
    // Very subtle single warm harmonic chime in F major (never intrusive)
    const tierFreqs = [349.23, 392.0, 440.0, 523.25];
    const freq = tierFreqs[Math.min(tierFreqs.length - 1, Math.max(0, multiplier - 2))];
    this.scheduleMusicFeltNote(freq, 0, 0.9, 0.085);
  }

  public playBoostBurst(): void {
    if (!this.ctx || !this.sfxBus || !this.brownBuffer || this.muted || !this.unlocked) return;
    const now = this.ctx.currentTime;
    // Real warm rushing-air / snow-spray turbo whoosh (no piercing synth sweep)
    const src = this.ctx.createBufferSource();
    src.buffer = this.brownBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(180, now);
    filter.frequency.exponentialRampToValueAtTime(480, now + 0.22);
    filter.Q.value = 0.8;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.16, now + 0.06);
    gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.34);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxBus);
    src.start(now, Math.random() * 2.0, 0.38);
  }

  public playUpgradePurchase(): void {
    if (!this.ctx || !this.musicBus || this.muted || !this.unlocked) return;
    // Cozy warm F-major-9 acoustic chord strum
    const chord = [261.63, 349.23, 440.0];
    chord.forEach((f, i) => this.scheduleMusicFeltNote(f, i * 0.07, 0.95, 0.11));
  }

  public playLevelUp(): void {
    if (!this.ctx || !this.musicBus || this.muted || !this.unlocked) return;
    // Warm uplifting F-major felt-piano arpeggio
    const notes = [
      { f: 261.63, t: 0.0, d: 0.75 },
      { f: 349.23, t: 0.1, d: 0.8 },
      { f: 440.0, t: 0.2, d: 0.9 },
      { f: 523.25, t: 0.32, d: 1.3 },
    ];
    notes.forEach((n) => this.scheduleMusicFeltNote(n.f, n.t, n.d, 0.11));
  }

  public playVictoryFanfare(): void {
    if (!this.ctx || !this.musicBus || this.muted || !this.unlocked) return;
    const melody = [
      { f: 261.63, t: 0.0, d: 0.7 },
      { f: 349.23, t: 0.15, d: 0.75 },
      { f: 440.0, t: 0.3, d: 0.85 },
      { f: 523.25, t: 0.48, d: 1.4 },
      { f: 349.23, t: 0.48, d: 1.4 },
    ];
    melody.forEach((m) => this.scheduleMusicFeltNote(m.f, m.t, m.d, 0.12));
  }

  public playShiftOverSting(): void {
    if (!this.ctx || !this.musicBus || this.muted || !this.unlocked) return;
    const notes = [
      { f: 349.23, t: 0.0, d: 0.7 },
      { f: 293.66, t: 0.2, d: 0.75 },
      { f: 261.63, t: 0.4, d: 1.0 },
    ];
    notes.forEach((n) => this.scheduleMusicFeltNote(n.f, n.t, n.d, 0.10));
  }

  public playBump(): void {
    if (!this.ctx || !this.sfxBus || this.muted || !this.unlocked) return;
    this.playCushionThud(72, 34, 0.10, 0.11);
  }

  private lastSaltSoundTime = 0;
  private lastIceSkidTime = 0;

  public playSaltSprinkle(): void {
    if (!this.ctx || !this.sfxBus || !this.snowCrunchBuffer || this.muted || !this.unlocked) return;
    const now = this.ctx.currentTime;
    if (now - this.lastSaltSoundTime < 0.14) return;
    this.lastSaltSoundTime = now;

    const src = this.ctx.createBufferSource();
    src.buffer = this.snowCrunchBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1850;
    filter.Q.value = 1.2;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.085, now + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.14);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxBus);
    src.start(now, Math.random() * 2.2, 0.16);
  }

  public playIceSkid(): void {
    if (!this.ctx || !this.sfxBus || !this.snowCrunchBuffer || this.muted || !this.unlocked) return;
    const now = this.ctx.currentTime;
    if (now - this.lastIceSkidTime < 0.45) return;
    this.lastIceSkidTime = now;

    const src = this.ctx.createBufferSource();
    src.buffer = this.snowCrunchBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1450, now);
    filter.frequency.exponentialRampToValueAtTime(920, now + 0.25);
    filter.Q.value = 2.2;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.075, now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.28);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxBus);
    src.start(now, Math.random() * 1.8, 0.3);
  }

  public playIceMelt(): void {
    if (!this.ctx || !this.musicBus || this.muted || !this.unlocked) return;
    // Soft crystalline melt resolution (A4 -> C5)
    this.scheduleMusicFeltNote(440.0, 0, 0.55, 0.095);
    this.scheduleMusicFeltNote(523.25, 0.08, 0.72, 0.095);
  }

  public playCarHorn(): void {
    if (!this.ctx || !this.sfxBus || this.muted || !this.unlocked) return;
    const now = this.ctx.currentTime;
    // Cheerful warm double-toot alpine compact horn (F4 + A4 soft triangle)
    const scheduleToot = (offset: number, dur: number) => {
      if (!this.ctx || !this.sfxBus) return;
      for (const freq of [349.23, 440.0]) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + offset);
        gain.gain.setValueAtTime(0.0001, now + offset);
        gain.gain.linearRampToValueAtTime(0.042, now + offset + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0008, now + offset + dur);
        osc.connect(gain);
        gain.connect(this.sfxBus);
        osc.start(now + offset);
        osc.stop(now + offset + dur + 0.04);
      }
    };
    scheduleToot(0, 0.13);
    scheduleToot(0.17, 0.16);
  }

  public playMissionComplete(): void {
    if (!this.ctx || !this.musicBus || this.muted || !this.unlocked) return;
    const notes = [
      { f: 349.23, t: 0.0, d: 0.7 },
      { f: 440.0, t: 0.09, d: 0.75 },
      { f: 523.25, t: 0.18, d: 0.9 },
      { f: 698.46, t: 0.28, d: 1.25 },
    ];
    notes.forEach((n) => this.scheduleMusicFeltNote(n.f, n.t, n.d, 0.11));
  }

  public playAchievementUnlock(): void {
    if (!this.ctx || !this.musicBus || this.muted || !this.unlocked) return;
    const notes = [
      { f: 261.63, t: 0.0, d: 0.7 },
      { f: 329.63, t: 0.08, d: 0.75 },
      { f: 392.0, t: 0.16, d: 0.85 },
      { f: 523.25, t: 0.26, d: 1.3 },
    ];
    notes.forEach((n) => this.scheduleMusicFeltNote(n.f, n.t, n.d, 0.105));
  }

  public playThermalBlast(): void {
    if (!this.ctx || !this.sfxBus || !this.snowCrunchBuffer || this.muted || !this.unlocked) return;
    const now = this.ctx.currentTime;
    // Deep satisfying warm sub-bass thermal punch
    this.playCushionThud(118, 34, 0.24, 0.34);

    // Pressurized wide snow-spray shockwave whoosh
    const src = this.ctx.createBufferSource();
    src.buffer = this.snowCrunchBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1400, now);
    filter.frequency.exponentialRampToValueAtTime(220, now + 0.55);
    filter.Q.value = 0.65;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.28, now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.62);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxBus);
    src.start(now, Math.random() * 1.6, 0.66);

    // Shimmering F-major harmonic burst
    this.scheduleMusicFeltNote(349.23, 0.02, 0.85, 0.11);
    this.scheduleMusicFeltNote(523.25, 0.08, 0.95, 0.10);
  }

  public playAmbulanceSiren(): void {
    if (!this.ctx || !this.sfxBus || this.muted || !this.unlocked) return;
    const now = this.ctx.currentTime;
    // Soft European two-tone alpine rescue chime (A4 -> F4, smooth sine/triangle, warm & never harsh)
    const tones = [
      { f: 440.0, t: 0.0, d: 0.26 },
      { f: 349.23, t: 0.28, d: 0.30 },
    ];
    for (const tone of tones) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(tone.f, now + tone.t);
      gain.gain.setValueAtTime(0.0001, now + tone.t);
      gain.gain.linearRampToValueAtTime(0.044, now + tone.t + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0008, now + tone.t + tone.d);
      osc.connect(gain);
      gain.connect(this.sfxBus);
      osc.start(now + tone.t);
      osc.stop(now + tone.t + tone.d + 0.04);
    }
  }

  public playAvalancheRumble(): void {
    if (!this.ctx || !this.sfxBus || !this.brownBuffer || this.muted || !this.unlocked) return;
    const now = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.brownBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(160, now);
    filter.frequency.linearRampToValueAtTime(340, now + 0.65);
    filter.frequency.exponentialRampToValueAtTime(95, now + 1.35);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.22, now + 0.35);
    gain.gain.exponentialRampToValueAtTime(0.0008, now + 1.45);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxBus);
    src.start(now, Math.random() * 1.5, 1.5);
  }

  public playAvalancheImpact(): void {
    if (!this.ctx || !this.sfxBus || this.muted || !this.unlocked) return;
    this.playCushionThud(86, 28, 0.24, 0.32);
  }

  public playPickupCollect(): void {
    if (!this.ctx || !this.musicBus || this.muted || !this.unlocked) return;
    this.scheduleMusicFeltNote(392.0, 0.0, 0.55, 0.10);
    this.scheduleMusicFeltNote(523.25, 0.07, 0.72, 0.11);
  }

  public playCameraSwitch(): void {
    if (!this.ctx || !this.sfxBus || this.muted || !this.unlocked) return;
    this.playCushionThud(220, 140, 0.055, 0.06);
  }

  private playCushionThud(
    startFreq: number,
    endFreq: number,
    peakGain: number,
    duration: number
  ): void {
    if (!this.ctx || !this.sfxBus) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(endFreq, now + duration);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(peakGain, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0008, now + duration + 0.03);

    osc.connect(gain);
    gain.connect(this.sfxBus);
    osc.start(now);
    osc.stop(now + duration + 0.05);
  }

  public dispose(): void {
    this.disposed = true;
    if (this.musicTimerId !== null) {
      window.clearInterval(this.musicTimerId);
      this.musicTimerId = null;
    }
    try {
      this.engineSource?.stop();
      this.pushSource?.stop();
      this.crunchSource?.stop();
      this.breezeSource?.stop();
      this.breezeLfo?.stop();
      this.ctx?.close();
    } catch {
      // Ignore already-stopped audio nodes
    }
    this.ctx = null;
  }
}
