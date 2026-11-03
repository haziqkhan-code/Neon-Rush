import type { RunResult } from './engine'

export interface RunRec { score: number; time: number; coins: number; maxCombo: number; ts: number; day: string; daily: boolean; skin: string }
export interface Save {
  best: number; bestTime: number; totalCoins: number; runs: number; maxCombo: number; dailyDone: number
  skin: string; ach: string[]; scores: RunRec[]; dailyBest: Record<string, number>; sfx: boolean; music: boolean
}
const KEY = 'neonrush:v1'
const DEF: Save = { best: 0, bestTime: 0, totalCoins: 0, runs: 0, maxCombo: 0, dailyDone: 0, skin: 'cyan', ach: [], scores: [], dailyBest: {}, sfx: true, music: true }
export const load = (): Save => { try { return { ...DEF, ...JSON.parse(localStorage.getItem(KEY) || '{}') } } catch { return { ...DEF } } }
export const persist = (s: Save) => { try { localStorage.setItem(KEY, JSON.stringify(s)) } catch { /* storage full/blocked */ } }

export const todayKey = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
export const dailySeed = (key: string) => (parseInt(key.replace(/-/g, ''), 10) * 7919) % 2147483647
export const fmtTime = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

export interface Skin { id: string; name: string; c1: string; c2: string; prism?: boolean; hint: string; unlock: (s: Save) => boolean }
export const SKINS: Skin[] = [
  { id: 'cyan', name: 'Pulse', c1: '#22f3ff', c2: '#ffffff', hint: 'Default', unlock: () => true },
  { id: 'violet', name: 'Nebula', c1: '#a24bff', c2: '#e9d5ff', hint: 'Collect 50 coins total', unlock: s => s.totalCoins >= 50 },
  { id: 'pink', name: 'Hot Wire', c1: '#ff6bd6', c2: '#ffe0f6', hint: 'Score 1,000 in one run', unlock: s => s.best >= 1000 },
  { id: 'gold', name: 'Solar', c1: '#ffd84d', c2: '#fff7cc', hint: 'Reach a 15-coin combo', unlock: s => s.maxCombo >= 15 },
  { id: 'ghost', name: 'Ghost', c1: '#e8ecff', c2: '#7a86ff', hint: 'Finish a Daily Challenge', unlock: s => s.dailyDone >= 1 },
  { id: 'prism', name: 'Prism', c1: '#ffffff', c2: '#ffffff', prism: true, hint: 'Collect 500 coins total', unlock: s => s.totalCoins >= 500 },
]
export interface Ach { id: string; name: string; desc: string; icon: string; check: (s: Save, r: RunResult) => boolean }
export const ACH: Ach[] = [
  { id: 'first', name: 'First Spark', desc: 'Finish your first run', icon: '⚡', check: () => true },
  { id: 'coin50', name: 'Pocket Change', desc: 'Collect 50 coins total', icon: '🪙', check: s => s.totalCoins >= 50 },
  { id: 'coin500', name: 'Coin Hoarder', desc: 'Collect 500 coins total', icon: '💰', check: s => s.totalCoins >= 500 },
  { id: 't30', name: 'Half Minute', desc: 'Survive 30 seconds', icon: '⏱️', check: (_s, r) => r.time >= 30 },
  { id: 't60', name: 'One Minute Club', desc: 'Survive 60 seconds', icon: '🔥', check: (_s, r) => r.time >= 60 },
  { id: 's1000', name: 'Four Digits', desc: 'Score 1,000', icon: '🚀', check: (_s, r) => r.score >= 1000 },
  { id: 's3000', name: 'Neon Legend', desc: 'Score 3,000', icon: '👑', check: (_s, r) => r.score >= 3000 },
  { id: 'c15', name: 'Chain Reaction', desc: 'Reach a 15-coin combo', icon: '🔗', check: (_s, r) => r.maxCombo >= 15 },
  { id: 'daily', name: 'Daily Driver', desc: 'Finish a Daily Challenge', icon: '📅', check: (_s, r) => r.daily },
  { id: 'runs25', name: 'Just One More', desc: 'Play 25 runs', icon: '♻️', check: s => s.runs >= 25 },
]

const MSG: [number, string[]][] = [
  [100, ['Did you even blink? The obstacles are offended.', 'That was a warm-up… right?', 'Your couch called. It wants you back.']],
  [400, ['Not bad for a human.', 'The neon was too bright, we get it.', 'Respectable. Mildly.']],
  [900, ['Okay okay, we see you cooking!', 'Reflexes loading… 80%.', 'Getting spicy in here.']],
  [1800, ['Certified neon menace.', 'Your thumbs deserve a raise.', "Dodging like it's a lifestyle."]],
  [3500, ['Absolute unit of reflexes.', 'Are you an AI? Asking for a friend.', 'The obstacles filed a complaint.']],
  [Infinity, ['LEGEND. Screenshot this immediately.', 'Touch grass? Never. Touch neon.', 'Gamer-god detected. Share it. Now.']],
]
export const pickMsg = (score: number) => { const m = MSG.find(([max]) => score < max)![1]; return m[Math.floor(Math.random() * m.length)] }

export interface Summary { next: Save; isBest: boolean; newAch: Ach[]; newSkins: Skin[]; result: RunResult }
export function applyRun(s: Save, r: RunResult): Summary {
  const rec: RunRec = { score: r.score, time: r.time, coins: r.coins, maxCombo: r.maxCombo, ts: Date.now(), day: r.day, daily: r.daily, skin: s.skin }
  const n: Save = {
    ...s, best: Math.max(s.best, r.score), bestTime: Math.max(s.bestTime, r.time), totalCoins: s.totalCoins + r.coins, runs: s.runs + 1,
    maxCombo: Math.max(s.maxCombo, r.maxCombo), dailyDone: s.dailyDone + (r.daily ? 1 : 0),
    scores: [...s.scores, rec].sort((a, b) => b.score - a.score).slice(0, 50),
    dailyBest: r.daily ? { ...s.dailyBest, [r.day]: Math.max(s.dailyBest[r.day] || 0, r.score) } : s.dailyBest,
  }
  const newAch = ACH.filter(a => !s.ach.includes(a.id) && a.check(n, r))
  n.ach = [...s.ach, ...newAch.map(a => a.id)]
  const newSkins = SKINS.filter(k => !k.unlock(s) && k.unlock(n))
  return { next: n, isBest: r.score > s.best, newAch, newSkins, result: r }
}
