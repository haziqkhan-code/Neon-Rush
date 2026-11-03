// Only the coin chime and the obstacle-hit thud make sound. Everything else is a silent no-op (no music, no ambience).
let ctx: AudioContext | null = null
const noop = (..._args: unknown[]) => {}

function ac(): AudioContext {
  if (!ctx) { const C = window.AudioContext || (window as any).webkitAudioContext; ctx = new C() }
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}
function tone(f: number, d: number, v: number, at = 0) {
  const ctx = ac()
  const t = ctx.currentTime + at, o = ctx.createOscillator(), g = ctx.createGain()
  o.type = 'sine'; o.frequency.setValueAtTime(f, t)
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + d)
  o.connect(g); g.connect(ctx.destination); o.start(t); o.stop(t + d + 0.02)
}

export const audio = {
  unlock: noop, setSfx: noop, setMusic: noop, musicStart: noop, click: noop, power: noop, shield: noop, gameover: noop,
  /** Short crunchy impact: a noise burst plus a low thud that sweeps downward. */
  hit() {
    const c = ac(), t = c.currentTime, n = Math.floor(c.sampleRate * 0.22)
    const b = c.createBuffer(1, n, c.sampleRate), a = b.getChannelData(0)
    for (let i = 0; i < n; i++) a[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2)
    const s = c.createBufferSource(), lp = c.createBiquadFilter(), ng = c.createGain()
    s.buffer = b; lp.type = 'lowpass'; lp.frequency.value = 1800; ng.gain.value = 0.35
    s.connect(lp); lp.connect(ng); ng.connect(c.destination); s.start(t)
    const o = c.createOscillator(), g = c.createGain()
    o.type = 'triangle'; o.frequency.setValueAtTime(170, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.3)
    g.gain.setValueAtTime(0.4, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.32)
    o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + 0.34)
  },
  /** Soft two-note chime; pitch climbs with the combo. */
  coin(combo: number) {
    const f = 988 * Math.pow(2, Math.min(combo, 12) / 12)
    tone(f, 0.18, 0.16); tone(f * 1.5, 0.28, 0.12, 0.07)
  },
}
