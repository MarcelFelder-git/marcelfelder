/**
 * Web-Audio-Engine – ein gefilterter Drone-Synthesizer.
 *
 * Signalfluss:
 *   3x Oscillator (detuned) -> voiceGain -> BiquadFilter (LP) -> +Delay-Bus
 *                                                             -> masterGain
 *                                                             -> Analyser -> Destination
 *
 * Der AudioContext wird bewusst erst bei der ersten User-Geste erzeugt:
 * Browser blockieren Autoplay, und ein suspendierter Context kostet trotzdem
 * Ressourcen. Die Klasse ist ein Singleton, damit Canvas, ControlBar und
 * Command-Palette denselben Graphen teilen.
 */

export type ParamKey = "level" | "cutoff" | "resonance" | "drift" | "space";

/** Alle Parameter sind normalisiert auf 0..1 – das Mapping lebt hier drin. */
export const DEFAULT_PARAMS: Record<ParamKey, number> = {
  level: 0.45,
  cutoff: 0.46,
  resonance: 0.3,
  drift: 0.25,
  space: 0.35,
};

/** Grundton A2 plus Quinte und Oktave – ein offener, ruhiger Akkord. */
const VOICES = [110, 164.81, 220];

const FFT_SIZE = 512;

class AudioEngine {
  private ctx: AudioContext | null = null;
  private oscillators: OscillatorNode[] = [];
  private voiceGain: GainNode | null = null;
  private filter: BiquadFilterNode | null = null;
  private delay: DelayNode | null = null;
  private feedback: GainNode | null = null;
  private wet: GainNode | null = null;
  private master: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private lfo: OscillatorNode | null = null;
  private lfoGain: GainNode | null = null;

  private params: Record<ParamKey, number> = { ...DEFAULT_PARAMS };
  private spectrum = new Uint8Array(FFT_SIZE / 2);
  private running = false;

  get isRunning() {
    return this.running;
  }

  /** Erzeugt den Graphen (idempotent) und faded den Master sanft ein. */
  async start() {
    if (typeof window === "undefined") return;

    if (!this.ctx) this.build();
    const ctx = this.ctx!;

    if (ctx.state === "suspended") await ctx.resume();

    this.running = true;
    // Rampe statt Sprung: ein harter Gain-Wechsel klickt hoerbar.
    this.master!.gain.cancelScheduledValues(ctx.currentTime);
    this.master!.gain.setValueAtTime(this.master!.gain.value, ctx.currentTime);
    this.master!.gain.linearRampToValueAtTime(
      this.params.level * 0.5,
      ctx.currentTime + 0.8,
    );
  }

  /** Faded aus und suspendiert – der Graph bleibt fuer schnellen Neustart stehen. */
  async stop() {
    if (!this.ctx || !this.master) return;
    const ctx = this.ctx;

    this.running = false;
    this.master.gain.cancelScheduledValues(ctx.currentTime);
    this.master.gain.setValueAtTime(this.master.gain.value, ctx.currentTime);
    this.master.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.4);

    window.setTimeout(() => {
      if (!this.running) void this.ctx?.suspend();
    }, 500);
  }

  toggle() {
    return this.running ? this.stop() : this.start();
  }

  setParam(key: ParamKey, value: number) {
    this.params[key] = value;
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    // 60 ms Glide auf jedem Parameter: Fader-Bewegungen sollen sich
    // wie ein Mischpult anfuehlen, nicht wie ein Schalter.
    const glide = 0.06;

    switch (key) {
      case "level":
        if (this.running) {
          this.master!.gain.setTargetAtTime(value * 0.5, t, glide);
        }
        break;
      case "cutoff":
        // Exponentiell, weil Tonhoehe logarithmisch wahrgenommen wird.
        this.filter!.frequency.setTargetAtTime(
          120 * Math.pow(2, value * 7),
          t,
          glide,
        );
        break;
      case "resonance":
        this.filter!.Q.setTargetAtTime(0.7 + value * 14, t, glide);
        break;
      case "drift":
        this.oscillators.forEach((osc, i) => {
          const spread = (i - 1) * value * 22;
          osc.detune.setTargetAtTime(spread, t, 0.2);
        });
        this.lfoGain!.gain.setTargetAtTime(value * 900, t, 0.2);
        break;
      case "space":
        this.wet!.gain.setTargetAtTime(value * 0.6, t, glide);
        this.feedback!.gain.setTargetAtTime(value * 0.5, t, glide);
        break;
    }
  }

  getParams() {
    return { ...this.params };
  }

  /** Frequenzspektrum fuer den Signal-Mode. Reused Buffer, kein Alloc pro Frame. */
  getSpectrum(): Uint8Array {
    if (!this.analyser || !this.running) {
      this.spectrum.fill(0);
      return this.spectrum;
    }
    this.analyser.getByteFrequencyData(this.spectrum);
    return this.spectrum;
  }

  /** Grober Pegel 0..1 – treibt das UI-Glow. */
  getLevel(): number {
    const data = this.getSpectrum();
    let sum = 0;
    for (let i = 0; i < data.length; i++) sum += data[i];
    return sum / data.length / 255;
  }

  private build() {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    const ctx = new Ctor();
    this.ctx = ctx;

    this.master = ctx.createGain();
    this.master.gain.value = 0.0001;

    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = FFT_SIZE;
    // Glaettung: ohne sie flackern die Balken im 3D-Viewport unruhig.
    this.analyser.smoothingTimeConstant = 0.82;

    this.filter = ctx.createBiquadFilter();
    this.filter.type = "lowpass";
    this.filter.frequency.value = 120 * Math.pow(2, this.params.cutoff * 7);
    this.filter.Q.value = 0.7 + this.params.resonance * 14;

    this.voiceGain = ctx.createGain();
    this.voiceGain.gain.value = 0.28;

    // Delay-Bus als billiger Raum-Ersatz (echter Convolver braucht ein IR-File).
    this.delay = ctx.createDelay(1.5);
    this.delay.delayTime.value = 0.42;
    this.feedback = ctx.createGain();
    this.feedback.gain.value = this.params.space * 0.5;
    this.wet = ctx.createGain();
    this.wet.gain.value = this.params.space * 0.6;

    // LFO auf dem Cutoff: minimale Bewegung, damit der Drone nicht steht.
    this.lfo = ctx.createOscillator();
    this.lfo.frequency.value = 0.06;
    this.lfoGain = ctx.createGain();
    this.lfoGain.gain.value = this.params.drift * 900;
    this.lfo.connect(this.lfoGain).connect(this.filter.frequency);
    this.lfo.start();

    this.oscillators = VOICES.map((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = i === 2 ? "triangle" : "sawtooth";
      osc.frequency.value = freq;
      osc.detune.value = (i - 1) * this.params.drift * 22;
      osc.connect(this.voiceGain!);
      osc.start();
      return osc;
    });

    this.voiceGain.connect(this.filter);
    this.filter.connect(this.master);
    this.filter.connect(this.delay);
    this.delay.connect(this.feedback);
    this.feedback.connect(this.delay); // Feedback-Schleife
    this.delay.connect(this.wet);
    this.wet.connect(this.master);

    this.master.connect(this.analyser);
    this.analyser.connect(ctx.destination);
  }
}

export const audioEngine = new AudioEngine();
