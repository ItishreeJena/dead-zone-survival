/**
 * Procedural Web Audio System for DEAD ZONE: SURVIVAL
 * Synthesizes all game sound effects and ambient atmospheric drones in real-time.
 * Completely standalone with zero external audio assets.
 */

class SoundSystem {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private ambientGain: GainNode | null = null;
  private isMuted: boolean = false;
  private ambientNodes: { osc1: OscillatorNode; osc2: OscillatorNode; filter: BiquadFilterNode } | null = null;
  private heartbeatInterval: number | null = null;
  private currentIsNight: boolean = false;

  constructor() {
    // Initialized on first user interaction to comply with autoplay policies
  }

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.7, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
      this.startAmbientDrone();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(muted ? 0 : 0.7, this.ctx.currentTime, 0.05);
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public toggleMute(): boolean {
    this.setMuted(!this.isMuted);
    return this.isMuted;
  }

  private startAmbientDrone() {
    if (!this.ctx || !this.masterGain || this.ambientNodes) return;
    try {
      const t = this.ctx.currentTime;
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      this.ambientGain = this.ctx.createGain();

      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(55, t); // A1 bass drone

      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(58.27, t); // subtle beating dissonance (Bb1)

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(140, t);
      filter.Q.setValueAtTime(3.5, t);

      this.ambientGain.gain.setValueAtTime(0.12, t);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(this.ambientGain);
      this.ambientGain.connect(this.masterGain);

      osc1.start();
      osc2.start();

      this.ambientNodes = { osc1, osc2, filter };
    } catch {
      // Audio node failure fallback
    }
  }

  public updateAmbience(isNight: boolean) {
    if (this.currentIsNight === isNight || !this.ctx || !this.ambientNodes) return;
    this.currentIsNight = isNight;
    const t = this.ctx.currentTime;

    if (isNight) {
      // Darker, colder howling wind at night
      this.ambientNodes.filter.frequency.setTargetAtTime(110, t, 3.0);
      this.ambientNodes.osc1.frequency.setTargetAtTime(48, t, 3.0);
      if (this.ambientGain) {
        this.ambientGain.gain.setTargetAtTime(0.16, t, 2.0);
      }
    } else {
      // Calmer daylight wind
      this.ambientNodes.filter.frequency.setTargetAtTime(160, t, 3.0);
      this.ambientNodes.osc1.frequency.setTargetAtTime(55, t, 3.0);
      if (this.ambientGain) {
        this.ambientGain.gain.setTargetAtTime(0.10, t, 2.0);
      }
    }
  }

  public playFootstep(isSprinting: boolean = false) {
    this.initContext();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(isSprinting ? 90 : 75, t);
    osc.frequency.exponentialRampToValueAtTime(30, t + 0.08);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(isSprinting ? 320 : 240, t);

    const vol = isSprinting ? 0.28 : 0.16;
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.1);
  }

  public playFlashlight() {
    this.initContext();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(1800, t);
    osc.frequency.exponentialRampToValueAtTime(800, t + 0.03);

    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.035);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.04);
  }

  public playSwing() {
    this.initContext();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(380, t);
    osc.frequency.exponentialRampToValueAtTime(90, t + 0.15);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(450, t);
    filter.Q.setValueAtTime(1.5, t);

    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.2);
  }

  public playGunshot() {
    this.initContext();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    const t = this.ctx.currentTime;

    // 1. High frequency explosive crack (noise burst)
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.25);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.03));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(2200, t);
    noiseFilter.frequency.exponentialRampToValueAtTime(450, t + 0.2);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.85, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.masterGain);

    // 2. Heavy low-end thump / body punch
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, t);
    osc.frequency.exponentialRampToValueAtTime(45, t + 0.18);

    oscGain.gain.setValueAtTime(0.7, t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);

    osc.connect(oscGain);
    oscGain.connect(this.masterGain);

    // 3. Mechanical bolt slide click
    const boltOsc = this.ctx.createOscillator();
    const boltGain = this.ctx.createGain();
    boltOsc.type = 'square';
    boltOsc.frequency.setValueAtTime(950, t + 0.05);
    boltOsc.frequency.exponentialRampToValueAtTime(320, t + 0.1);
    boltGain.gain.setValueAtTime(0.2, t + 0.05);
    boltGain.gain.exponentialRampToValueAtTime(0.001, t + 0.11);

    boltOsc.connect(boltGain);
    boltGain.connect(this.masterGain);

    noise.start(t);
    osc.start(t);
    boltOsc.start(t + 0.05);
    noise.stop(t + 0.26);
    osc.stop(t + 0.23);
    boltOsc.stop(t + 0.12);
  }

  public playReload() {
    this.initContext();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    const t = this.ctx.currentTime;

    // Stage 1: Mag release & slide out (t + 0.1s)
    const click1 = this.ctx.createOscillator();
    const g1 = this.ctx.createGain();
    click1.type = 'sawtooth';
    click1.frequency.setValueAtTime(700, t + 0.1);
    click1.frequency.exponentialRampToValueAtTime(200, t + 0.18);
    g1.gain.setValueAtTime(0.3, t + 0.1);
    g1.gain.exponentialRampToValueAtTime(0.001, t + 0.19);
    click1.connect(g1);
    g1.connect(this.masterGain);
    click1.start(t + 0.1);
    click1.stop(t + 0.2);

    // Stage 2: Mag insertion slap (t + 0.75s)
    const click2 = this.ctx.createOscillator();
    const g2 = this.ctx.createGain();
    click2.type = 'triangle';
    click2.frequency.setValueAtTime(340, t + 0.75);
    click2.frequency.exponentialRampToValueAtTime(120, t + 0.88);
    g2.gain.setValueAtTime(0.45, t + 0.75);
    g2.gain.exponentialRampToValueAtTime(0.001, t + 0.9);
    click2.connect(g2);
    g2.connect(this.masterGain);
    click2.start(t + 0.75);
    click2.stop(t + 0.91);

    // Stage 3: Bolt release snap (t + 1.3s)
    const click3 = this.ctx.createOscillator();
    const g3 = this.ctx.createGain();
    click3.type = 'square';
    click3.frequency.setValueAtTime(1400, t + 1.3);
    click3.frequency.exponentialRampToValueAtTime(450, t + 1.38);
    g3.gain.setValueAtTime(0.4, t + 1.3);
    g3.gain.exponentialRampToValueAtTime(0.001, t + 1.4);
    click3.connect(g3);
    g3.connect(this.masterGain);
    click3.start(t + 1.3);
    click3.stop(t + 1.42);
  }

  public playDryFire() {
    this.initContext();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(1200, t);
    osc.frequency.exponentialRampToValueAtTime(600, t + 0.04);

    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.06);
  }

  public playAmmoPickup() {
    this.initContext();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    const t = this.ctx.currentTime;
    // Metallic cartridge rattle
    const freqs = [587.33, 880, 1174.66]; // D minor chords
    freqs.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t + idx * 0.05);
      gain.gain.setValueAtTime(0.3, t + idx * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.05 + 0.2);
      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start(t + idx * 0.05);
      osc.stop(t + idx * 0.05 + 0.22);
    });
  }

  public playHitZombie() {
    this.initContext();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    const t = this.ctx.currentTime;
    // Punchy impact tone
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(160, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.12);
    oscGain.gain.setValueAtTime(0.4, t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);

    // Crunch noise
    const bufferSize = this.ctx.sampleRate * 0.1;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(700, t);
    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.35, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

    osc.connect(oscGain);
    oscGain.connect(this.masterGain);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.15);
    noise.start(t);
    noise.stop(t + 0.1);
  }

  public updateListener(
    pos: { x: number; y: number; z: number },
    fwd: { x: number; y: number; z: number },
    up: { x: number; y: number; z: number }
  ) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const l = this.ctx.listener;
    try {
      if ('positionX' in l) {
        l.positionX.setTargetAtTime(pos.x, t, 0.03);
        l.positionY.setTargetAtTime(pos.y, t, 0.03);
        l.positionZ.setTargetAtTime(pos.z, t, 0.03);
        l.forwardX.setTargetAtTime(fwd.x, t, 0.03);
        l.forwardY.setTargetAtTime(fwd.y, t, 0.03);
        l.forwardZ.setTargetAtTime(fwd.z, t, 0.03);
        l.upX.setTargetAtTime(up.x, t, 0.03);
        l.upY.setTargetAtTime(up.y, t, 0.03);
        l.upZ.setTargetAtTime(up.z, t, 0.03);
      } else {
        (l as any).setPosition(pos.x, pos.y, pos.z);
        (l as any).setOrientation(fwd.x, fwd.y, fwd.z, up.x, up.y, up.z);
      }
    } catch {
      // Audio listener update fallback
    }
  }

  private createSpatialPanner(
    x: number,
    y: number,
    z: number,
    refDist: number = 2.5,
    maxDist: number = 34,
    rolloff: number = 1.4
  ): PannerNode | null {
    if (!this.ctx || !this.masterGain) return null;
    try {
      const panner = this.ctx.createPanner();
      panner.panningModel = 'HRTF';
      panner.distanceModel = 'inverse';
      panner.refDistance = refDist;
      panner.maxDistance = maxDist;
      panner.rolloffFactor = rolloff;
      panner.coneInnerAngle = 360;

      const t = this.ctx.currentTime;
      if ('positionX' in panner) {
        panner.positionX.setValueAtTime(x, t);
        panner.positionY.setValueAtTime(y, t);
        panner.positionZ.setValueAtTime(z, t);
      } else {
        (panner as any).setPosition(x, y, z);
      }

      panner.connect(this.masterGain);
      return panner;
    } catch {
      return null;
    }
  }

  // Spatial Zombie Moan: Scales in intensity, throat resonance, and guttural volume as distance closes
  public playSpatialZombieMoan(
    pos: { x: number; y: number; z: number },
    distance: number,
    pitchVariation: number = 1.0,
    isAggro: boolean = false
  ) {
    this.initContext();
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    if (distance > 32) return;

    // Intensity curve: 0.0 at 32m to 1.0 at point blank
    const normDist = Math.min(1, Math.max(0, distance / 32));
    const intensity = Math.pow(1 - normDist, 1.35);
    if (intensity < 0.03) return;

    const t = this.ctx.currentTime;
    const panner = this.createSpatialPanner(pos.x, pos.y + 1.5, pos.z, 2.5, 34, 1.4);
    const destNode: AudioNode = panner || this.masterGain;

    const osc = this.ctx.createOscillator();
    const mod = this.ctx.createOscillator();
    const modGain = this.ctx.createGain();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    // FM synthesis parameters scale with proximity
    const modRate = (18 + intensity * 14) * pitchVariation;
    mod.type = isAggro ? 'square' : 'sawtooth';
    mod.frequency.setValueAtTime(modRate, t);

    // Guttural modulation depth increases when close
    const modDepth = (45 + intensity * 75) * (isAggro ? 1.4 : 1.0);
    modGain.gain.setValueAtTime(modDepth, t);

    // Carrier frequency
    const carrierBase = (isAggro ? 140 : 105) * pitchVariation;
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(carrierBase, t);
    osc.frequency.exponentialRampToValueAtTime(
      Math.max(40, carrierBase * (isAggro ? 0.75 : 0.65)),
      t + (isAggro ? 0.75 : 1.1)
    );

    mod.connect(modGain);
    modGain.connect(osc.frequency);

    // Filter opens up as distance decreases, revealing terrifying high vocal formants
    filter.type = isAggro ? 'bandpass' : 'lowpass';
    const cutoff = (260 + intensity * 500) * (isAggro ? 1.4 : 1.0);
    filter.frequency.setValueAtTime(cutoff, t);
    filter.Q.setValueAtTime(3.5 + intensity * 2.0, t);

    // Overall volume scaled by proximity
    const baseVol = isAggro ? 0.5 : 0.32;
    const finalVol = baseVol * (0.15 + 0.85 * intensity);
    gain.gain.setValueAtTime(0.01, t);
    gain.gain.linearRampToValueAtTime(finalVol, t + 0.15);
    gain.gain.exponentialRampToValueAtTime(0.001, t + (isAggro ? 0.8 : 1.15));

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(destNode);

    mod.start(t);
    osc.start(t);
    const dur = isAggro ? 0.85 : 1.2;
    mod.stop(t + dur);
    osc.stop(t + dur);

    // If close proximity (< 7m), add sub-bass chest rattle layer
    if (intensity > 0.75) {
      const subOsc = this.ctx.createOscillator();
      const subGain = this.ctx.createGain();
      subOsc.type = 'triangle';
      subOsc.frequency.setValueAtTime(52, t);
      subOsc.frequency.exponentialRampToValueAtTime(30, t + 0.6);
      subGain.gain.setValueAtTime(0.28 * intensity, t);
      subGain.gain.exponentialRampToValueAtTime(0.001, t + 0.65);
      subOsc.connect(subGain);
      subGain.connect(destNode);
      subOsc.start(t);
      subOsc.stop(t + 0.7);
    }
  }

  // Spatial Zombie Shuffling / Footstep Scrapes: Dragging undead gait on ground
  public playSpatialZombieShuffle(pos: { x: number; y: number; z: number }, distance: number) {
    this.initContext();
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    if (distance > 24) return;

    const normDist = Math.min(1, Math.max(0, distance / 24));
    const intensity = Math.pow(1 - normDist, 1.5);
    if (intensity < 0.05) return;

    const t = this.ctx.currentTime;
    const panner = this.createSpatialPanner(pos.x, pos.y + 0.1, pos.z, 1.8, 26, 1.5);
    const destNode: AudioNode = panner || this.masterGain;

    // Synthesized friction scuff
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.18);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.05));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(650, t);
    filter.frequency.exponentialRampToValueAtTime(260, t + 0.16);
    filter.Q.setValueAtTime(1.8, t);

    const gain = this.ctx.createGain();
    const vol = (0.08 + 0.28 * intensity);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(destNode);

    // Subtle low thud of heavy boot dragging
    const thud = this.ctx.createOscillator();
    const thudGain = this.ctx.createGain();
    thud.type = 'triangle';
    thud.frequency.setValueAtTime(85, t);
    thud.frequency.exponentialRampToValueAtTime(35, t + 0.12);
    thudGain.gain.setValueAtTime(0.2 * intensity, t);
    thudGain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);

    thud.connect(thudGain);
    thudGain.connect(destNode);

    noise.start(t);
    thud.start(t);
    noise.stop(t + 0.2);
    thud.stop(t + 0.15);
  }

  public playZombieGroan(pitchVariation: number = 1.0) {
    this.initContext();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const mod = this.ctx.createOscillator();
    const modGain = this.ctx.createGain();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    mod.type = 'sawtooth';
    mod.frequency.setValueAtTime(18 * pitchVariation, t);
    modGain.gain.setValueAtTime(60, t);

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(110 * pitchVariation, t);
    osc.frequency.exponentialRampToValueAtTime(70 * pitchVariation, t + 0.8);

    mod.connect(modGain);
    modGain.connect(osc.frequency);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(350, t);
    filter.Q.setValueAtTime(4.0, t);

    gain.gain.setValueAtTime(0.01, t);
    gain.gain.linearRampToValueAtTime(0.25, t + 0.2);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.85);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    mod.start(t);
    osc.start(t);
    mod.stop(t + 0.9);
    osc.stop(t + 0.9);
  }

  public playZombieAggro() {
    this.initContext();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const mod = this.ctx.createOscillator();
    const modGain = this.ctx.createGain();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    mod.type = 'square';
    mod.frequency.setValueAtTime(32, t);
    modGain.gain.setValueAtTime(140, t);

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.linearRampToValueAtTime(260, t + 0.25);
    osc.frequency.exponentialRampToValueAtTime(120, t + 0.7);

    mod.connect(modGain);
    modGain.connect(osc.frequency);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(650, t);
    filter.Q.setValueAtTime(3.0, t);

    gain.gain.setValueAtTime(0.05, t);
    gain.gain.linearRampToValueAtTime(0.35, t + 0.15);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.75);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    mod.start(t);
    osc.start(t);
    mod.stop(t + 0.8);
    osc.stop(t + 0.8);
  }

  public playPlayerDamage() {
    this.initContext();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(120, t);
    osc.frequency.exponentialRampToValueAtTime(35, t + 0.25);

    gain.gain.setValueAtTime(0.45, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.3);
  }

  public playPickup(type: string) {
    this.initContext();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    if (type === 'ammo') {
      this.playAmmoPickup();
      return;
    }

    const t = this.ctx.currentTime;
    if (type === 'food') {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(240, t);
      osc.frequency.setValueAtTime(320, t + 0.08);
      osc.frequency.setValueAtTime(210, t + 0.16);
      gain.gain.setValueAtTime(0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.26);
    } else if (type === 'water') {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(380, t);
      osc.frequency.exponentialRampToValueAtTime(540, t + 0.1);
      osc.frequency.exponentialRampToValueAtTime(290, t + 0.22);
      gain.gain.setValueAtTime(0.35, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.24);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.25);
    } else {
      const freqs = [440, 554.37, 659.25]; // A major
      freqs.forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t + idx * 0.06);
        gain.gain.setValueAtTime(0.25, t + idx * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.06 + 0.35);
        osc.connect(gain);
        gain.connect(this.masterGain!);
        osc.start(t + idx * 0.06);
        osc.stop(t + idx * 0.06 + 0.36);
      });
    }
  }

  public updateHeartbeat(health: number) {
    if (health <= 25 && health > 0 && !this.heartbeatInterval) {
      this.heartbeatInterval = window.setInterval(() => {
        this.playHeartbeat();
      }, 1100);
    } else if ((health > 25 || health <= 0) && this.heartbeatInterval) {
      window.clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private playHeartbeat() {
    this.initContext();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    const t = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(65, t);
    osc1.frequency.exponentialRampToValueAtTime(40, t + 0.12);
    gain1.gain.setValueAtTime(0.4, t);
    gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
    osc1.connect(gain1);
    gain1.connect(this.masterGain);
    osc1.start(t);
    osc1.stop(t + 0.15);

    const osc2 = this.ctx.createOscillator();
    const gain2 = this.ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(55, t + 0.18);
    osc2.frequency.exponentialRampToValueAtTime(35, t + 0.32);
    gain2.gain.setValueAtTime(0.3, t + 0.18);
    gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.34);
    osc2.connect(gain2);
    gain2.connect(this.masterGain);
    osc2.start(t + 0.18);
    osc2.stop(t + 0.35);
  }

  public dispose() {
    if (this.heartbeatInterval) {
      window.clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
    }
  }
}

export const sound = new SoundSystem();
