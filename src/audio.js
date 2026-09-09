// Small synthesized command and combat sounds; no downloads or audio assets.
export class BattlefieldAudio {
  constructor() { this.enabled = true; this.last = new Map(); }
  unlock() { if (!this.context) { const Audio = window.AudioContext || window.webkitAudioContext; if (Audio) this.context = new Audio(); } if (this.context?.state === 'suspended') this.context.resume(); }
  play(kind, volume = .15) {
    if (!this.enabled || !this.context || this.context.state !== 'running') return;
    const ctx = this.context, now = ctx.currentTime; if (now - (this.last.get(kind) || -1) < .12) return; this.last.set(kind, now);
    const gain = ctx.createGain(); gain.connect(ctx.destination); gain.gain.setValueAtTime(volume, now);
    const osc = ctx.createOscillator(); osc.connect(gain);
    const settings = { select: [550, 720, .08, 'sine'], order: [430, 620, .11, 'triangle'], queue: [310, 490, .14, 'sine'], ready: [640, 980, .24, 'sine'], unit: [520, 780, .16, 'sine'], shell: [100, 28, .27, 'sawtooth'], torpedo: [130, 70, .18, 'triangle'], bullet: [190, 55, .055, 'square'], error: [170, 120, .17, 'triangle'] };
    const [from, to, duration, wave] = settings[kind] || settings.order;
    osc.type = wave; osc.frequency.setValueAtTime(from, now); osc.frequency.exponentialRampToValueAtTime(to, now + duration); gain.gain.exponentialRampToValueAtTime(.001, now + duration); osc.start(now); osc.stop(now + duration);
  }
}
