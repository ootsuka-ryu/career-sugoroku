/**
 * Sound system — Web Audio API, zero external files.
 *
 * Quality targets:
 *  - Dice   : wood-block "tok" with body resonance
 *  - Land   : layered bass thud with warmth
 *  - Stat+  : Karplus-Strong pluck (guitar/marimba quality)
 *  - Reveal : two-note orchestral chime
 *  - Fanfare: 4-note major arpeggio with sustain
 */

// ─── Audio system ─────────────────────────────────────────────────────────────

interface Sys {
  ctx: AudioContext;
  out: DynamicsCompressorNode;
  rev: ConvolverNode;
  revGain: GainNode;
}

let _sys: Sys | null = null;

function buildReverb(ctx: AudioContext): AudioBuffer {
  const sr  = ctx.sampleRate;
  const len = Math.floor(sr * 2.2);
  const buf = ctx.createBuffer(2, len, sr);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) {
      // Diffuse exponential decay — more natural-sounding room
      const t  = i / sr;
      const env = Math.exp(-t * 2.8);
      // Mix of noise and some tonal content for warmth
      d[i] = (Math.random() * 2 - 1) * env * 0.6
           + Math.sin(i * 0.003) * env * 0.08;
    }
  }
  return buf;
}

function sys(): Sys | null {
  if (typeof window === "undefined") return null;
  if (!_sys) {
    const ctx  = new AudioContext();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.knee.value      = 10;
    comp.ratio.value     = 3.5;
    comp.attack.value    = 0.004;
    comp.release.value   = 0.30;
    comp.connect(ctx.destination);

    const rev = ctx.createConvolver();
    rev.buffer = buildReverb(ctx);
    const revGain = ctx.createGain();
    revGain.gain.value = 0.20;
    rev.connect(revGain);
    revGain.connect(comp);

    _sys = { ctx, out: comp, rev, revGain };
  }
  if (_sys.ctx.state === "suspended") _sys.ctx.resume();
  return _sys;
}

// ─── Primitive generators ──────────────────────────────────────────────────────

/** Pure sine tone with linear attack + exponential decay */
function sine(
  freq: number, start: number, gain: number, decay: number,
  wet = 0.20, attack = 0.008
) {
  const s = sys(); if (!s) return;
  const { ctx, out, rev } = s;
  const osc = ctx.createOscillator();
  const g   = ctx.createGain();
  osc.type = "sine";
  osc.frequency.value = freq;
  g.gain.setValueAtTime(0, start);
  g.gain.linearRampToValueAtTime(gain, start + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, start + decay);
  osc.connect(g); g.connect(out);
  if (wet > 0) {
    const ws = ctx.createGain(); ws.gain.value = wet;
    g.connect(ws); ws.connect(rev);
  }
  osc.start(start); osc.stop(start + decay + 0.05);
}

/**
 * Karplus-Strong string synthesis.
 * Produces a guitar/marimba-quality pluck — far richer than a plain oscillator.
 */
function pluck(freq: number, start: number, gain: number) {
  const s = sys(); if (!s) return;
  const { ctx, out, rev } = s;
  const sr  = ctx.sampleRate;
  const N   = Math.max(2, Math.round(sr / freq));
  const dur = 2.5;
  const len = Math.floor(sr * dur);
  const buf = ctx.createBuffer(1, len, sr);
  const d   = buf.getChannelData(0);

  // Seed: gaussian noise for realistic excitation
  for (let i = 0; i < N; i++) {
    const u1 = Math.random() || 1e-9;
    const u2 = Math.random();
    d[i] = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2) * 0.5;
  }

  // Karplus-Strong averaging + slight decay
  const decay_factor = 0.9985;
  for (let i = N; i < len; i++) {
    const prev = i - N >= 0 ? d[i - N] : 0;
    const prev1 = i - N + 1 >= 0 && i - N + 1 < N ? d[i - N + 1] : (i - N + 1 >= N ? d[i - N + 1] : 0);
    d[i] = 0.5 * (prev + prev1) * decay_factor;
  }

  const src = ctx.createBufferSource();
  src.buffer = buf;
  const g = ctx.createGain();
  g.gain.setValueAtTime(gain, start);
  src.connect(g); g.connect(out);

  // Send some to reverb for spatial feel
  const ws = ctx.createGain(); ws.gain.value = 0.28;
  src.connect(ws); ws.connect(rev);

  src.start(start);
}

/** Bell: fundamental + inharmonic overtone (like a real bell/chime) */
function bell(freq: number, start: number, gain: number, decay: number) {
  sine(freq,        start,        gain,        decay,        0.38, 0.006);
  sine(freq * 2.756, start,       gain * 0.26, decay * 0.38, 0.12, 0.004);
}

// ─── Public API ────────────────────────────────────────────────────────────────

/**
 * Dice rolling — wood-block quality.
 * Each "tok" = sine burst with body resonance overtone.
 * Timing decelerates to simulate dice tumbling to rest.
 */
export function playDiceRoll(): void {
  const s = sys(); if (!s) return;
  const t = s.ctx.currentTime;

  // Deceleration curve: fast → slow (total ~1.4s)
  const offsets = [
    0, 0.050, 0.095, 0.135, 0.175, 0.220,
    0.270, 0.325, 0.390, 0.460, 0.545, 0.645,
  ];
  offsets.forEach((dt) => {
    // Body thud (low, short)
    const f1 = 480 + (Math.random() - 0.5) * 120;
    sine(f1,       t + dt, 0.14,  0.030, 0.04, 0.002);
    // Overtone click (high, ultra-short)
    sine(f1 * 2.4, t + dt, 0.06,  0.014, 0.02, 0.002);
    // Sub thud for weight
    sine(f1 * 0.5, t + dt, 0.10,  0.040, 0, 0.002);
  });
}

/**
 * Piece landing — layered bass punch.
 * Sub-bass body + mid presence + attack transient.
 */
export function playLand(): void {
  const s = sys(); if (!s) return;
  const t = s.ctx.currentTime;
  sine(75,  t, 0.40, 0.45, 0,    0.003);  // Sub bass
  sine(150, t, 0.25, 0.32, 0.30, 0.005);  // Mid body
  sine(320, t, 0.12, 0.18, 0.40, 0.006);  // Presence click
}

/**
 * Stat increase — Karplus-Strong pluck on pentatonic scale.
 * Sounds like marimba/guitar: noticeably more musical than oscillators.
 */
export function playStatUp(index: number): void {
  const penta = [523.25, 659.25, 783.99, 880.0, 1046.5, 1174.66, 1318.51];
  const freq  = penta[index % penta.length];
  const s = sys(); if (!s) return;
  const t = s.ctx.currentTime;
  pluck(freq, t, 0.14);
  // Sub octave for warmth
  sine(freq / 2, t, 0.06, 0.50, 0.15, 0.012);
}

/**
 * Stat decrease — descending two-note minor figure.
 */
export function playStatDown(index: number): void {
  const s = sys(); if (!s) return;
  const t = s.ctx.currentTime;
  const base = 440 - index * 18;
  sine(base,       t,        0.09, 0.30, 0.25, 0.007);
  sine(base * 0.749, t + 0.14, 0.07, 0.26, 0.20, 0.006);
}

/** Move tick — soft wooden click, ascending with each step */
export function playMoveTick(step: number): void {
  const s = sys(); if (!s) return;
  const t = s.ctx.currentTime;
  const f = 640 + step * 28;
  sine(f,       t, 0.055, 0.050, 0.06, 0.004);
  sine(f * 2.2, t, 0.022, 0.022, 0.02, 0.003);
}

/**
 * Event card reveal — two orchestral chime tones (major third).
 * Bell quality from the overtone synthesis.
 */
export function playEventReveal(): void {
  const s = sys(); if (!s) return;
  const t = s.ctx.currentTime;
  bell(523.25, t,        0.11, 0.55);
  bell(659.25, t + 0.14, 0.10, 0.52);
}

/**
 * Fanfare — four-note major arpeggio with sustain and warmth.
 * C4-E4-G4-C5 (C major chord ascending).
 */
export function playFanfare(): void {
  const s = sys(); if (!s) return;
  const t = s.ctx.currentTime;
  const chord = [523.25, 659.25, 783.99, 1046.50];
  chord.forEach((freq, i) => {
    const dt = i * 0.15;
    bell(freq, t + dt, 0.12, 0.70);
    // Bass support on root and octave
    if (i === 0 || i === 3) sine(freq / 2, t + dt, 0.06, 0.55, 0.22, 0.012);
  });
}
