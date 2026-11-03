import { audio } from './audio'

export interface Hud { score: number; coins: number; health: number; combo: number; mult: number; time: number; shield: number; slow: number; magnet: number; comboT: number; paused: boolean }
export interface RunResult { score: number; time: number; coins: number; maxCombo: number; daily: boolean; seed: number; day: string }
export interface Opts { daily: boolean; seed: number; day: string; c1: string; c2: string; prism: boolean; onHud: (h: Hud) => void; onEnd: (r: RunResult) => void }

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))
/** Seeded PRNG: the daily challenge uses the same seed for everyone. */
export function mulberry(seed: number) {
  let a = seed >>> 0
  return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
}

interface Ob { x: number; y: number; vx: number; vy: number; kind: 'orb' | 'bar'; r: number; w: number; h: number; rot: number }
interface Warn { x: number; y: number; t: number; ob: Ob; ang: number }
interface Coin { x: number; y: number; life: number; ph: number }
type PowType = 'shield' | 'slow' | 'magnet'
interface Pow { x: number; y: number; type: PowType; life: number }
interface Part { x: number; y: number; vx: number; vy: number; life: number; max: number; size: number; color: string }
interface Txt { x: number; y: number; life: number; text: string; color: string; size: number }
const PCOL: Record<PowType, string> = { shield: '#4dffb8', slow: '#8f7bff', magnet: '#ffd84d' }
const PLET: Record<PowType, string> = { shield: 'S', slow: 'T', magnet: 'M' }
const MOVE = new Set(['arrowleft', 'arrowright', 'arrowup', 'arrowdown', 'a', 'd', 'w', 's'])
const FOE = '#ff3d6e'

export class Game {
  private ctx: CanvasRenderingContext2D
  private W = 0; private H = 0; private u = 1; private dpr = 1
  private rnd: () => number
  private raf = 0; private last = 0; private ro: ResizeObserver
  private t = 0; private paused = false; private over = false; private overT = 0; private ended = false
  private px = 0; private py = 0; private pr = 11; private placed = false
  private keys = new Set<string>(); private target: { x: number; y: number } | null = null; private drag = false
  private obs: Ob[] = []; private warns: Warn[] = []; private cns: Coin[] = []; private pows: Pow[] = []
  private parts: Part[] = []; private texts: Txt[] = []
  private stars = Array.from({ length: 70 }, () => ({ x: Math.random(), y: Math.random(), z: 0.2 + Math.random() * 0.8 }))
  private health = 3; private coins = 0; private coinScore = 0; private combo = 0; private maxCombo = 0; private comboT = 0
  private shield = 0; private slow = 0; private magnet = 0; private invuln = 0; private shake = 0; private flash = 0; private cflash = 0
  private spawnT = 1.4; private coinT = 0.2; private powT = 9; private hudT = 0; private grid = 0

  constructor(private cv: HTMLCanvasElement, private o: Opts) {
    this.ctx = cv.getContext('2d')!
    this.rnd = mulberry(o.seed)
    this.ro = new ResizeObserver(() => this.resize()); this.ro.observe(cv)
  }

  private get mult() { return Math.min(8, 1 + Math.floor(this.combo / 3)) }
  private get score() { return Math.floor(this.t * 12) + this.coinScore }

  start() {
    window.addEventListener('keydown', this.kd); window.addEventListener('keyup', this.ku); window.addEventListener('blur', this.bl)
    document.addEventListener('visibilitychange', this.vc)
    const c = this.cv
    c.addEventListener('pointerdown', this.pd); c.addEventListener('pointermove', this.pm); c.addEventListener('pointerup', this.pu); c.addEventListener('pointercancel', this.pu)
    this.resize(); this.last = performance.now(); this.raf = requestAnimationFrame(this.loop); this.emit()
  }
  destroy() {
    cancelAnimationFrame(this.raf); this.ro.disconnect()
    window.removeEventListener('keydown', this.kd); window.removeEventListener('keyup', this.ku); window.removeEventListener('blur', this.bl)
    document.removeEventListener('visibilitychange', this.vc)
    const c = this.cv
    c.removeEventListener('pointerdown', this.pd); c.removeEventListener('pointermove', this.pm); c.removeEventListener('pointerup', this.pu); c.removeEventListener('pointercancel', this.pu)
  }
  pause(force?: boolean) { if (this.over) return; this.paused = force ?? !this.paused; this.keys.clear(); this.drag = false; this.emit() }

  private kd = (e: KeyboardEvent) => {
    const k = e.key.toLowerCase()
    if (MOVE.has(k)) { this.keys.add(k); e.preventDefault() } else if ((k === 'p' || k === 'escape') && !e.repeat) this.pause()
  }
  private ku = (e: KeyboardEvent) => { this.keys.delete(e.key.toLowerCase()) }
  private bl = () => { this.keys.clear(); this.pause(true) }
  private vc = () => { if (document.hidden) this.pause(true) }
  private pt(e: PointerEvent) { const r = this.cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top - (e.pointerType === 'touch' ? 40 * this.u : 0) } }
  private pd = (e: PointerEvent) => { if (this.paused) return; this.drag = true; this.cv.setPointerCapture(e.pointerId); this.target = this.pt(e) }
  private pm = (e: PointerEvent) => { if (this.drag && !this.paused) this.target = this.pt(e) }
  private pu = () => { this.drag = false }

  private resize() {
    const w = this.cv.clientWidth, h = this.cv.clientHeight
    if (!w || !h) return
    this.dpr = Math.min(2, window.devicePixelRatio || 1)
    this.cv.width = Math.round(w * this.dpr); this.cv.height = Math.round(h * this.dpr)
    if (this.placed) { this.px *= w / this.W; this.py *= h / this.H } else { this.px = w / 2; this.py = h * 0.6; this.placed = true }
    this.W = w; this.H = h; this.u = clamp(Math.min(w, h) / 640, 0.65, 1.25); this.pr = 11 * this.u
  }
  private emit() {
    this.o.onHud({ score: this.score, coins: this.coins, health: this.health, combo: this.combo, mult: this.mult, time: this.t, shield: this.shield, slow: this.slow, magnet: this.magnet, comboT: this.comboT, paused: this.paused })
  }
  private loop = (ts: number) => {
    this.raf = requestAnimationFrame(this.loop)
    const dt = Math.min(0.05, (ts - this.last) / 1000 || 0); this.last = ts
    if (!this.paused && this.W) this.update(dt)
    this.draw()
  }

  // ---------- spawning (uses the seeded rng so Daily runs are identical for everyone) ----------
  private spawnWarn() {
    const r = this.rnd, u = this.u, W = this.W, H = this.H, m = 40 * u
    const side = Math.floor(r() * 4)
    let x = 0, y = 0
    if (side === 0) { x = r() * W; y = -m } else if (side === 1) { x = W + m; y = r() * H } else if (side === 2) { x = r() * W; y = H + m } else { x = -m; y = r() * H }
    const kind: 'orb' | 'bar' = r() < 0.55 ? 'orb' : 'bar'
    const aim = r() < 0.55
    const tx = aim ? this.px + (r() - 0.5) * 120 * u : r() * W, ty = aim ? this.py + (r() - 0.5) * 120 * u : r() * H
    let dx = tx - x, dy = ty - y; const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d
    const sp = (165 + Math.min(this.t, 120) * 3.4) * u * (0.85 + r() * 0.5)
    const horiz = Math.abs(dx) > Math.abs(dy), long = (60 + r() * 90) * u, rr = (12 + r() * 14) * u
    const ob: Ob = { x, y, vx: dx * sp, vy: dy * sp, kind, r: rr, w: kind === 'orb' ? 0 : horiz ? 14 * u : long, h: kind === 'orb' ? 0 : horiz ? long : 14 * u, rot: 0 }
    this.warns.push({ x: clamp(x, 18, W - 18), y: clamp(y, 18, H - 18), t: 0.75, ob, ang: Math.atan2(dy, dx) })
  }
  private spawnCoin() {
    const u = this.u, r = this.rnd; let x = 0, y = 0
    for (let i = 0; i < 6; i++) { x = 50 * u + r() * (this.W - 100 * u); y = 100 * u + r() * (this.H - 160 * u); if (Math.hypot(x - this.px, y - this.py) > 110 * u) break }
    this.cns.push({ x, y, life: 7, ph: r() * 6 })
  }
  private spawnPow() {
    const u = this.u, r = this.rnd, types: PowType[] = ['shield', 'slow', 'magnet']
    this.pows.push({ x: 60 * u + r() * (this.W - 120 * u), y: 110 * u + r() * (this.H - 170 * u), type: types[Math.floor(r() * 3)], life: 9 })
  }

  // ---------- helpers ----------
  private burst(x: number, y: number, color: string, n: number, sp: number) {
    for (let i = 0; i < n && this.parts.length < 500; i++) {
      const a = Math.random() * 6.283, s = sp * (0.3 + Math.random() * 0.7) * this.u, life = 0.5 + Math.random() * 0.5
      this.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life, max: life, size: (1.5 + Math.random() * 3) * this.u, color })
    }
  }
  private text(x: number, y: number, text: string, color: string, size: number) { this.texts.push({ x, y, life: 0.9, text, color, size: size * this.u }) }
  private hits(o: Ob) {
    const pr = this.pr * 0.85
    if (o.kind === 'orb') return Math.hypot(o.x - this.px, o.y - this.py) < o.r + pr
    const cx = clamp(this.px, o.x - o.w / 2, o.x + o.w / 2), cy = clamp(this.py, o.y - o.h / 2, o.y + o.h / 2)
    return Math.hypot(cx - this.px, cy - this.py) < pr
  }
  private hurt() {
    if (this.shield > 0) { this.shield = 0; this.invuln = 0.7; this.burst(this.px, this.py, PCOL.shield, 30, 260); audio.shield(); this.shake = 6; return }
    this.health--; this.combo = 0; this.invuln = 1.4; this.shake = 16; this.flash = 1
    this.burst(this.px, this.py, FOE, 36, 300); audio.hit()
    if (navigator.vibrate) navigator.vibrate(60)
    if (this.health <= 0) this.die()
  }
  private die() {
    this.over = true; this.overT = 0; this.shake = 30; audio.gameover()
    this.burst(this.px, this.py, '#ffffff', 60, 420); this.burst(this.px, this.py, this.o.c1, 50, 320)
  }
  private collect(x: number, y: number) {
    this.combo++; this.maxCombo = Math.max(this.maxCombo, this.combo); this.comboT = 2.2; this.coins++
    const pts = 10 * this.mult; this.coinScore += pts
    audio.coin(this.combo); this.burst(x, y, '#ffd84d', 12, 180); this.text(x, y - 16 * this.u, '+' + pts, '#ffd84d', 18)
    if (this.combo % 3 === 0) { this.text(this.px, this.py - 44 * this.u, 'COMBO x' + this.mult + '!', '#22f3ff', 24); this.cflash = 0.5 }
  }
  private takePow(p: Pow) {
    audio.power(); this.burst(p.x, p.y, PCOL[p.type], 24, 240); this.text(p.x, p.y - 20 * this.u, p.type.toUpperCase() + '!', PCOL[p.type], 20)
    if (p.type === 'shield') this.shield = 10; else if (p.type === 'slow') this.slow = 5; else this.magnet = 8
  }

  // ---------- simulation ----------
  private update(dt: number) {
    const u = this.u, W = this.W, H = this.H, r = this.rnd
    if (!this.over) {
      this.t += dt
      let ax = 0, ay = 0; const k = this.keys
      if (k.has('arrowleft') || k.has('a')) ax--; if (k.has('arrowright') || k.has('d')) ax++
      if (k.has('arrowup') || k.has('w')) ay--; if (k.has('arrowdown') || k.has('s')) ay++
      const S = 340 * u
      if (ax || ay) { const l = Math.hypot(ax, ay); this.px += (ax / l) * S * dt; this.py += (ay / l) * S * dt; this.target = null }
      else if (this.target) {
        const f = Math.min(1, 14 * dt); let dx = (this.target.x - this.px) * f, dy = (this.target.y - this.py) * f
        const l = Math.hypot(dx, dy), cap = S * 2.4 * dt; if (l > cap) { dx *= cap / l; dy *= cap / l }
        this.px += dx; this.py += dy
      }
      this.px = clamp(this.px, this.pr, W - this.pr); this.py = clamp(this.py, this.pr, H - this.pr)
      this.invuln = Math.max(0, this.invuln - dt); this.shield = Math.max(0, this.shield - dt); this.slow = Math.max(0, this.slow - dt)
      this.magnet = Math.max(0, this.magnet - dt); this.flash = Math.max(0, this.flash - dt * 3); this.cflash = Math.max(0, this.cflash - dt * 3)
      if (this.combo > 0) { this.comboT -= dt; if (this.comboT <= 0) this.combo = 0 }
      const od = dt * (this.slow > 0 ? 0.5 : 1)
      this.grid += od * (40 + this.t * 1.5)

      this.spawnT -= od
      if (this.spawnT <= 0) { this.spawnWarn(); if (this.t > 25 && r() < 0.3) this.spawnWarn(); this.spawnT = Math.max(0.28, 1.05 - this.t * 0.011) * (0.8 + r() * 0.4) }
      this.coinT -= dt; if (this.coinT <= 0) { this.coinT = 0.9; if (this.cns.length < 5) this.spawnCoin() }
      this.powT -= dt; if (this.powT <= 0) { this.powT = 10 + r() * 6; if (this.pows.length < 1) this.spawnPow() }

      for (let i = this.warns.length - 1; i >= 0; i--) { const w = this.warns[i]; w.t -= od; if (w.t <= 0) { this.obs.push(w.ob); this.warns.splice(i, 1) } }
      for (let i = this.obs.length - 1; i >= 0; i--) {
        const o = this.obs[i]; o.x += o.vx * od; o.y += o.vy * od; o.rot += od * 3
        if (o.x < -140 || o.x > W + 140 || o.y < -140 || o.y > H + 140) { this.obs.splice(i, 1); continue }
        if (this.invuln <= 0 && !this.over && this.hits(o)) { this.obs.splice(i, 1); this.hurt() }
      }
      for (let i = this.cns.length - 1; i >= 0; i--) {
        const c = this.cns[i]; c.life -= dt; c.ph += dt * 5
        if (this.magnet > 0) { const dx = this.px - c.x, dy = this.py - c.y, d = Math.hypot(dx, dy); if (d < 230 * u && d > 1) { c.x += (dx / d) * 420 * u * dt; c.y += (dy / d) * 420 * u * dt } }
        if (Math.hypot(c.x - this.px, c.y - this.py) < this.pr + 10 * u) { this.cns.splice(i, 1); this.collect(c.x, c.y); continue }
        if (c.life <= 0) this.cns.splice(i, 1)
      }
      for (let i = this.pows.length - 1; i >= 0; i--) {
        const p = this.pows[i]; p.life -= dt
        if (Math.hypot(p.x - this.px, p.y - this.py) < this.pr + 14 * u) { this.pows.splice(i, 1); this.takePow(p); continue }
        if (p.life <= 0) this.pows.splice(i, 1)
      }
      if (this.parts.length < 500) this.parts.push({ x: this.px, y: this.py, vx: (Math.random() - 0.5) * 30, vy: (Math.random() - 0.5) * 30, life: 0.55, max: 0.55, size: this.pr * 0.9, color: this.o.prism ? `hsl(${(this.t * 160) % 360},100%,60%)` : this.o.c1 })
      this.hudT -= dt; if (this.hudT <= 0) { this.hudT = 0.1; this.emit() }
    } else {
      this.overT += dt
      if (this.overT > 0.9 && !this.ended) { this.ended = true; this.emit(); this.o.onEnd({ score: this.score, time: this.t, coins: this.coins, maxCombo: this.maxCombo, daily: this.o.daily, seed: this.o.seed, day: this.o.day }) }
    }
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const p = this.parts[i]; p.life -= dt
      if (p.life <= 0) { this.parts.splice(i, 1); continue }
      p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 1 - 2 * dt; p.vy *= 1 - 2 * dt
    }
    for (let i = this.texts.length - 1; i >= 0; i--) { const t = this.texts[i]; t.life -= dt; t.y -= 34 * u * dt; if (t.life <= 0) this.texts.splice(i, 1) }
    this.shake = Math.max(0, this.shake - 60 * dt)
  }

  // ---------- rendering ----------
  private draw() {
    const c = this.ctx, W = this.W, H = this.H, u = this.u
    if (!W) return
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)
    c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1; c.shadowBlur = 0
    c.fillStyle = '#05060f'; c.fillRect(0, 0, W, H)
    const g = c.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * 0.7)
    g.addColorStop(0, this.slow > 0 ? 'rgba(90,70,220,.4)' : 'rgba(60,30,140,.32)'); g.addColorStop(1, 'rgba(5,6,15,0)')
    c.fillStyle = g; c.fillRect(0, 0, W, H)
    const orb = (x: number, y: number, r: number, col: string) => { const q = c.createRadialGradient(x, y, 0, x, y, r); q.addColorStop(0, col); q.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = q; c.fillRect(x - r, y - r, r * 2, r * 2) }
    const big = Math.max(W, H) * 0.5
    orb(W * (0.25 + 0.1 * Math.sin(this.t * 0.3)), H * (0.3 + 0.1 * Math.cos(this.t * 0.25)), big, 'rgba(140,70,255,.28)')
    orb(W * (0.75 + 0.1 * Math.cos(this.t * 0.2)), H * (0.7 + 0.1 * Math.sin(this.t * 0.35)), big, 'rgba(20,150,255,.24)')
    c.save()
    if (this.shake > 0) c.translate((Math.random() - 0.5) * this.shake, (Math.random() - 0.5) * this.shake)
    const sp = 56 * u, ox = this.grid % sp, oy = (this.grid * 0.6) % sp
    c.strokeStyle = 'rgba(90,210,255,.13)'; c.lineWidth = 1; c.beginPath()
    for (let x = -sp + ox; x < W + sp; x += sp) { c.moveTo(x, 0); c.lineTo(x, H) }
    for (let y = -sp + oy; y < H + sp; y += sp) { c.moveTo(0, y); c.lineTo(W, y) }
    c.stroke()
    c.fillStyle = '#9fb4ff'
    for (const s of this.stars) { s.x -= s.z * 0.0004 * (1 + this.t * 0.02); if (s.x < 0) s.x += 1; c.globalAlpha = s.z * 0.6; c.fillRect(s.x * W, s.y * H, 1.5 * s.z * u + 0.5, 1.5 * s.z * u + 0.5) }
    c.globalAlpha = 1
    c.strokeStyle = 'rgba(150,120,255,.6)'; c.shadowColor = '#a24bff'; c.shadowBlur = 14; c.lineWidth = 2; c.strokeRect(2, 2, W - 4, H - 4); c.shadowBlur = 0

    for (const w of this.warns) {
      c.save(); c.translate(w.x, w.y); c.rotate(w.ang); c.globalAlpha = 0.45 + 0.55 * Math.abs(Math.sin(w.t * 22))
      c.fillStyle = FOE; c.shadowColor = FOE; c.shadowBlur = 14
      c.beginPath(); c.moveTo(12 * u, 0); c.lineTo(-8 * u, -9 * u); c.lineTo(-8 * u, 9 * u); c.closePath(); c.fill(); c.restore()
    }
    for (const k of this.cns) {
      if (k.life < 1.5 && Math.floor(k.life * 8) % 2) continue
      const s = 1 + Math.sin(k.ph) * 0.12
      c.shadowColor = '#ffd84d'; c.shadowBlur = 14; c.fillStyle = '#ffd84d'
      c.beginPath(); c.ellipse(k.x, k.y, 9 * u * Math.abs(Math.cos(k.ph * 0.5)) * s + 1.5, 9 * u * s, 0, 0, 6.283); c.fill()
    }
    for (const p of this.pows) {
      const col = PCOL[p.type]
      c.save(); c.translate(p.x, p.y); c.rotate(Math.PI / 4 + Math.sin(this.t * 3) * 0.15)
      c.shadowColor = col; c.shadowBlur = 18; c.strokeStyle = col; c.lineWidth = 3 * u; c.fillStyle = 'rgba(5,6,15,.8)'
      c.beginPath(); c.roundRect(-12 * u, -12 * u, 24 * u, 24 * u, 5 * u); c.fill(); c.stroke(); c.restore()
      c.shadowBlur = 0; c.fillStyle = col; c.font = `900 ${14 * u}px Orbitron, system-ui, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(PLET[p.type], p.x, p.y + 1)
    }
    c.shadowColor = FOE; c.shadowBlur = 16; c.strokeStyle = FOE; c.lineWidth = 3 * u
    for (const o of this.obs) {
      if (o.kind === 'orb') {
        c.fillStyle = '#2a0a1c'; c.beginPath(); c.arc(o.x, o.y, o.r, 0, 6.283); c.fill(); c.stroke()
        c.fillStyle = FOE; c.beginPath(); c.arc(o.x, o.y, o.r * 0.35, 0, 6.283); c.fill()
      } else { c.fillStyle = FOE; c.beginPath(); c.roundRect(o.x - o.w / 2, o.y - o.h / 2, o.w, o.h, 5 * u); c.fill() }
    }
    c.shadowBlur = 0
    if (this.magnet > 0 && !this.over) { c.strokeStyle = 'rgba(255,216,77,.25)'; c.setLineDash([6, 8]); c.lineWidth = 1.5; c.beginPath(); c.arc(this.px, this.py, 230 * u, 0, 6.283); c.stroke(); c.setLineDash([]) }
    c.globalCompositeOperation = 'lighter'
    for (const p of this.parts) { c.globalAlpha = Math.max(0, p.life / p.max); c.fillStyle = p.color; c.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size) }
    c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1
    if (!this.over) {
      const col = this.o.prism ? `hsl(${(this.t * 160) % 360},100%,60%)` : this.o.c1
      c.globalAlpha = this.invuln > 0 && Math.floor(this.invuln * 18) % 2 ? 0.35 : 1
      c.shadowColor = col; c.shadowBlur = 24; c.fillStyle = col
      c.beginPath(); c.arc(this.px, this.py, this.pr, 0, 6.283); c.fill()
      c.shadowBlur = 0; c.fillStyle = this.o.prism ? '#fff' : this.o.c2; c.beginPath(); c.arc(this.px, this.py, this.pr * 0.5, 0, 6.283); c.fill()
      c.strokeStyle = col; c.lineWidth = 2 * u; c.beginPath(); c.arc(this.px, this.py, this.pr * 1.7, this.t * 3, this.t * 3 + 3.8); c.stroke()
      if (this.shield > 0 && (this.shield > 2 || Math.floor(this.shield * 8) % 2)) { c.strokeStyle = PCOL.shield; c.shadowColor = PCOL.shield; c.shadowBlur = 16; c.lineWidth = 3 * u; c.globalAlpha = 0.7 + 0.3 * Math.sin(this.t * 8); c.beginPath(); c.arc(this.px, this.py, this.pr * 2.4, 0, 6.283); c.stroke() }
      c.globalAlpha = 1; c.shadowBlur = 0
    }
    c.textAlign = 'center'; c.textBaseline = 'middle'
    for (const t of this.texts) { c.globalAlpha = Math.min(1, t.life * 2); c.fillStyle = t.color; c.font = `900 ${t.size}px Orbitron, system-ui, sans-serif`; c.fillText(t.text, t.x, t.y) }
    c.globalAlpha = 1
    c.restore()
    if (this.flash > 0) { c.fillStyle = `rgba(255,40,90,${this.flash * 0.28})`; c.fillRect(0, 0, W, H) }
    if (this.cflash > 0) { c.fillStyle = `rgba(34,243,255,${this.cflash * 0.12})`; c.fillRect(0, 0, W, H) }
  }
}
