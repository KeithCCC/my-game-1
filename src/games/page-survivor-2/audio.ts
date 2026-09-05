import type { SoundEvent } from './model';

export type AudioSettings = { music: number; effects: number; muted: boolean };
/** Original procedural soundtrack. No network assets or third-party recordings. */
export class AstraAudio {
  private context?: AudioContext;
  private music?: GainNode;
  private effects?: GainNode;
  private master?: GainNode;
  private timer?: ReturnType<typeof setInterval>;
  private nextBeat = 0;
  private step = 0;
  private boss = false;
  private enabled = false;
  private closed = false;
  private lastEffect = new Map<string, number>();
  private voices = 0;
  settings: AudioSettings;
  available = true;

  constructor(settings: AudioSettings) { this.settings = settings; }

  async start(): Promise<void> {
    if (this.closed) return;
    try {
      if (!this.context) {
        this.context = new AudioContext();
        this.master = this.context.createGain();
        this.music = this.context.createGain();
        this.effects = this.context.createGain();
        const limiter = this.context.createDynamicsCompressor();
        limiter.threshold.value = -16;
        limiter.ratio.value = 8;
        this.music.connect(this.master); this.effects.connect(this.master);
        this.master.connect(limiter); limiter.connect(this.context.destination);
        this.applySettings();
        this.timer = setInterval(() => this.schedule(), 60);
      }
      this.enabled = true;
      await this.context.resume();
      this.nextBeat = this.context.currentTime + .04;
    } catch { this.available = false; }
  }
  setBoss(boss: boolean): void { this.boss = boss; }
  setSettings(settings: AudioSettings): void { this.settings = settings; this.applySettings(); }
  private applySettings(): void {
    if (!this.context) return;
    const t = this.context.currentTime;
    this.master?.gain.setTargetAtTime(this.settings.muted ? 0 : .65, t, .03);
    this.music?.gain.setTargetAtTime(this.settings.music, t, .03);
    this.effects?.gain.setTargetAtTime(this.settings.effects, t, .03);
  }
  pause(): void {
    this.enabled = false;
    void this.context?.suspend().catch(() => {});
  }
  dispose(): void {
    this.closed = true; this.enabled = false;
    if (this.timer) clearInterval(this.timer);
    void this.context?.close().catch(() => {});
  }
  private tone(freq: number, end: number, time: number, length: number, volume: number, shape: OscillatorType, bus: GainNode): void {
    if (!this.context || this.voices > 48) return;
    const osc = this.context.createOscillator(), amp = this.context.createGain();
    this.voices++;
    osc.type = shape;
    osc.frequency.setValueAtTime(freq, time);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, end), time + length);
    amp.gain.setValueAtTime(.0001, time);
    amp.gain.exponentialRampToValueAtTime(volume, time + .006);
    amp.gain.exponentialRampToValueAtTime(.0001, time + length);
    osc.connect(amp); amp.connect(bus);
    osc.onended = () => { osc.disconnect(); amp.disconnect(); this.voices--; };
    osc.start(time); osc.stop(time + length + .02);
  }
  private schedule(): void {
    if (!this.enabled || !this.context || this.context.state !== 'running' || !this.music) return;
    const now = this.context.currentTime;
    if (this.nextBeat < now - .3) this.nextBeat = now + .02;
    const beat = 60 / (this.boss ? 142 : 112) / 4;
    while (this.nextBeat < now + .14) {
      const step = this.step++, t = this.nextBeat;
      const roots = [45, 41, 48, 43];
      const root = roots[Math.floor(step / 32) % roots.length];
      const hz = (midi: number): number => 440 * 2 ** ((midi - 69) / 12);
      if (step % 4 === 0) this.tone(140, 40, t, .16, .4, 'sine', this.music);
      if (step % 8 === 4) this.tone(190, 65, t, .09, .14, 'triangle', this.music);
      if (step % 2 === 0) this.tone(6200, 2400, t, .026, .024, 'square', this.music);
      if (step % 4 === 0 || (this.boss && step % 4 === 3)) this.tone(hz(root - 12), hz(root - 12), t, beat * 2.8, .22, 'triangle', this.music);
      const motif = [0, 7, 12, 10, 7, 3, 10, 7, 0, 7, 15, 12, 10, 7, 3, 7];
      if (step % 2 === 0) {
        const note = hz(root + 12 + motif[Math.floor(step / 2) % 16]);
        this.tone(note, note, t, beat * 2.6, this.boss ? .055 : .065, this.boss ? 'square' : 'triangle', this.music);
      }
      if (step % 16 === 0) for (const interval of [0, 3, 7]) this.tone(hz(root + interval), hz(root + interval), t, beat * 14, .045, 'sine', this.music);
      this.nextBeat += beat;
    }
  }
  play(event: SoundEvent): void {
    if (!this.context || !this.effects || !this.enabled || this.context.state !== 'running') return;
    const t = this.context.currentTime;
    const interval = event === 'shot' || event === 'pickup' ? .085 : .15;
    if (t - (this.lastEffect.get(event) ?? -10) < interval) return;
    this.lastEffect.set(event, t);
    const tone = (f: number, end: number, length: number, vol: number, type: OscillatorType = 'sine', offset = 0): void => this.tone(f, end, t + offset, length, vol, type, this.effects!);
    if (event === 'shot') tone(700, 220, .07, .045, 'triangle');
    else if (event === 'pickup') tone(1100 + (this.step % 3) * 130, 1550, .055, .045);
    else if (event === 'hurt' || event === 'lose') { tone(170, 40, .22, .17, 'sawtooth'); if (event === 'lose') tone(120, 30, .8, .12, 'triangle', .25); }
    else if (event === 'dash') tone(180, 1000, .14, .07, 'triangle');
    else if (event === 'warning' || event === 'boss') { tone(220, 220, .13, .10, 'square'); tone(event === 'boss' ? 165 : 330, 200, .25, .09, 'triangle', .18); }
    else if (event === 'burst') tone(180, 35, .3, .1, 'triangle');
    else if (event === 'upgrade' || event === 'evolve' || event === 'win' || event === 'heal') {
      const notes = event === 'win' ? [523, 659, 784, 1046, 1318] : event === 'evolve' ? [440, 554, 659, 880] : [660, 880, 1108];
      notes.forEach((f, i) => tone(f, f, .25, .08, 'triangle', i * .095));
    }
  }
}
