import { useEffect, useMemo, useState } from 'react'
import { animate, motion } from 'framer-motion'
import { Header, Logo, NeonButton, Page } from './ui'
import { ACH, SKINS, fmtTime, pickMsg, todayKey, type Save, type Summary } from '../game/data'
import { makeCard } from '../game/card'
import { audio } from '../game/audio'

export function Landing({ best, onStart }: { best: number; onStart: () => void }) {
  useEffect(() => {
    const go = () => onStart()
    window.addEventListener('keydown', go)
    return () => window.removeEventListener('keydown', go)
  }, [onStart])
  return (
    <div className="absolute inset-0 z-10 cursor-pointer" onClick={onStart}>
      <div className="h-full flex flex-col items-center justify-center gap-10 px-4">
        <Logo />
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }} className="text-white/70 text-lg text-center">Dodge the red. Grab the gold. Chain it.</motion.p>
        <motion.div animate={{ opacity: [0.35, 1, 0.35] }} transition={{ duration: 1.6, repeat: Infinity }} className="font-display font-bold tracking-[.3em] text-neon-cyan text-sm">TAP OR PRESS ANY KEY</motion.div>
        {best > 0 && <div className="text-white/50 text-sm">Your best: <span className="text-white">{best.toLocaleString()}</span></div>}
      </div>
    </div>
  )
}

export function Menu({ save, onPlay, onDaily, onSkins, onBoard }: { save: Save; onPlay: () => void; onDaily: () => void; onSkins: () => void; onBoard: () => void }) {
  const day = todayKey(), db = save.dailyBest[day]
  const stat = (k: string, v: string) => <div className="glass !rounded-2xl px-4 py-2 text-center flex-1"><div className="font-display font-bold text-neon-cyan">{v}</div><div className="text-[11px] text-white/50">{k}</div></div>
  return (
    <Page>
      <Logo size="sm" />
      <motion.div className="glass w-full max-w-sm p-5 space-y-3" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}>
        <NeonButton onClick={onPlay}>▶ PLAY</NeonButton>
        <NeonButton variant="purple" onClick={onDaily} sub={db ? `Today's best: ${db.toLocaleString()}` : `Same obstacles for everyone · ${day}`}>DAILY CHALLENGE</NeonButton>
        <div className="grid grid-cols-2 gap-3">
          <NeonButton variant="pink" onClick={onSkins}>SKINS</NeonButton>
          <NeonButton variant="ghost" onClick={onBoard}>SCORES</NeonButton>
        </div>
      </motion.div>
      <div className="flex gap-3 w-full max-w-sm">{stat('Best', save.best.toLocaleString())}{stat('Coins', save.totalCoins.toLocaleString())}{stat('Runs', String(save.runs))}</div>
      <p className="text-xs text-white/40 text-center">WASD / arrows or drag to move · P to pause</p>
    </Page>
  )
}

export function Leaderboard({ save, onBack, onPlay }: { save: Save; onBack: () => void; onPlay: () => void }) {
  const [tab, setTab] = useState<'all' | 'daily'>('all')
  const day = todayKey()
  const rows = save.scores.filter(r => (tab === 'all' ? true : r.daily && r.day === day)).slice(0, 10)
  return (
    <Page>
      <Header title="PERSONAL BESTS" onBack={onBack} />
      <div className="glass w-full max-w-md p-4">
        <div className="flex gap-2 mb-3">
          {(['all', 'daily'] as const).map(t => (
            <button key={t} onClick={() => { audio.click(); setTab(t) }} className={`flex-1 rounded-xl py-2 font-display text-xs font-bold tracking-widest ${tab === t ? 'bg-neon-cyan/15 text-neon-cyan border border-neon-cyan/50' : 'text-white/50 border border-transparent'}`}>{t === 'all' ? 'ALL RUNS' : "TODAY'S DAILY"}</button>
          ))}
        </div>
        {rows.length === 0 ? (
          <div className="text-center py-8 space-y-4"><p className="text-white/60">{tab === 'all' ? 'No runs yet. Your top 10 will show up here.' : 'No daily run yet today.'}</p><NeonButton onClick={onPlay}>PLAY NOW</NeonButton></div>
        ) : rows.map((r, i) => (
          <motion.div key={r.ts} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }} className={`flex items-center gap-3 py-2.5 px-2 border-b border-white/10 last:border-0 ${i === 0 ? 'text-[#ffd84d]' : ''}`}>
            <div className="w-7 font-display font-black">{i + 1}</div>
            <div className="flex-1 font-display font-bold text-lg">{r.score.toLocaleString()}</div>
            <div className="text-xs text-white/50 text-right">{fmtTime(r.time)} · 🪙{r.coins}<br />{new Date(r.ts).toLocaleDateString()}{r.daily ? ' · daily' : ''}</div>
          </motion.div>
        ))}
      </div>
    </Page>
  )
}

export function Skins({ save, onBack, onPick }: { save: Save; onBack: () => void; onPick: (id: string) => void }) {
  return (
    <Page>
      <Header title="SKINS" onBack={onBack} />
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full max-w-md">
        {SKINS.map(k => {
          const open = k.unlock(save), on = save.skin === k.id
          return (
            <motion.button key={k.id} whileHover={open ? { y: -3 } : {}} whileTap={{ scale: 0.95 }} disabled={!open} onClick={() => { audio.click(); onPick(k.id) }}
              className={`glass !rounded-2xl p-4 flex flex-col items-center gap-2 ${on ? '!border-neon-cyan' : ''} ${open ? '' : 'opacity-50'}`}>
              <div className="h-14 w-14 rounded-full" style={{ background: k.prism ? 'conic-gradient(#22f3ff,#a24bff,#ff3d9a,#ffd84d,#22f3ff)' : `radial-gradient(circle at 50% 50%, ${k.c2} 0 22%, ${k.c1} 24%)`, boxShadow: `0 0 26px ${k.prism ? '#a24bff' : k.c1}` }} />
              <div className="font-display font-bold text-sm">{k.name}</div>
              <div className="text-[11px] text-white/55 text-center min-h-[2rem]">{open ? (on ? 'Equipped' : 'Tap to equip') : '🔒 ' + k.hint}</div>
            </motion.button>
          )
        })}
      </div>
      <div className="glass w-full max-w-md p-4">
        <div className="font-display font-bold tracking-widest text-neon-purple mb-3 text-sm">ACHIEVEMENTS {save.ach.length}/{ACH.length}</div>
        <div className="space-y-2">
          {ACH.map(a => { const got = save.ach.includes(a.id); return (
            <div key={a.id} className={`flex items-center gap-3 ${got ? '' : 'opacity-40'}`}><div className="text-2xl w-8 text-center">{got ? a.icon : '🔒'}</div><div><div className="font-bold text-sm">{a.name}</div><div className="text-xs text-white/60">{a.desc}</div></div></div>
          ) })}
        </div>
      </div>
    </Page>
  )
}

export function GameOver({ s, onAgain, onMenu }: { s: Summary; onAgain: () => void; onMenu: () => void }) {
  const r = s.result, save = s.next, skin = SKINS.find(k => k.id === save.skin) || SKINS[0]
  const [shown, setShown] = useState(0), [toast, setToast] = useState('')
  const msg = useMemo(() => pickMsg(r.score), [r.score])
  useEffect(() => { const c = animate(0, r.score, { duration: 1.2, ease: 'easeOut', onUpdate: v => setShown(Math.round(v)) }); return () => c.stop() }, [r.score])
  useEffect(() => {
    const t0 = Date.now()
    const kd = (e: KeyboardEvent) => {
      if (Date.now() - t0 < 700) return
      const k = e.key.toLowerCase()
      if (k === 'enter' || k === ' ' || k === 'r') { e.preventDefault(); onAgain() } else if (k === 'escape') onMenu()
    }
    window.addEventListener('keydown', kd)
    return () => window.removeEventListener('keydown', kd)
  }, [onAgain, onMenu])

  const note = (t: string) => { setToast(t); setTimeout(() => setToast(''), 2500) }
  const card = () => makeCard({ score: r.score, time: fmtTime(r.time), coins: r.coins, combo: r.maxCombo, best: save.best, day: r.daily ? r.day : null, c1: skin.prism ? '#22f3ff' : skin.c1, msg })
  const text = `⚡ NEON RUSH${r.daily ? ' Daily ' + r.day : ''}: I scored ${r.score.toLocaleString()} (${fmtTime(r.time)}, ${r.coins} coins). Think you can beat me? ${location.origin}`
  const share = async () => {
    try {
      const nav: any = navigator, file = new File([await card()], 'neon-rush-score.png', { type: 'image/png' })
      if (nav.canShare?.({ files: [file] })) { await nav.share({ files: [file], text }); return }
      if (nav.share) { await nav.share({ text, url: location.origin }); return }
      await navigator.clipboard.writeText(text); note('Score copied. Paste it anywhere!')
    } catch (e) {
      if ((e as Error).name === 'AbortError') return
      try { await navigator.clipboard.writeText(text); note('Score copied. Paste it anywhere!') } catch { note('Sharing is not available here. Try Save card.') }
    }
  }
  const download = async () => { const b = await card(), a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'neon-rush-score.png'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); note('Score card saved') }
  const stat = (k: string, v: string) => <div className="flex-1 text-center"><div className="font-display font-bold text-neon-cyan">{v}</div><div className="text-[11px] text-white/50">{k}</div></div>

  return (
    <Page>
      <motion.div className="glass w-full max-w-sm p-6 text-center space-y-4" initial={{ opacity: 0, scale: 0.85, y: 40 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ type: 'spring', damping: 16 }}>
        <div className="font-display font-black tracking-[.3em] text-neon-pink text-sm">{s.isBest && r.score > 0 ? '★ NEW PERSONAL BEST ★' : 'RUN OVER'}</div>
        <div className="font-display font-black text-6xl text-white" style={{ textShadow: '0 0 30px rgba(34,243,255,.8)' }}>{shown.toLocaleString()}</div>
        <p className="text-white/80 italic">{msg}</p>
        <div className="flex gap-2 py-2 border-y border-white/10">{stat('Time', fmtTime(r.time))}{stat('Coins', String(r.coins))}{stat('Max chain', String(r.maxCombo))}{stat('Best', save.best.toLocaleString())}</div>
        {(s.newAch.length > 0 || s.newSkins.length > 0) && (
          <div className="space-y-1 text-sm">
            {s.newAch.map(a => <motion.div key={a.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 1 }} className="text-[#ffd84d]">{a.icon} Achievement: {a.name}</motion.div>)}
            {s.newSkins.map(k => <motion.div key={k.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 1.3 }} className="text-neon-purple">🎨 Skin unlocked: {k.name}</motion.div>)}
          </div>
        )}
        <NeonButton onClick={onAgain} sub="or press Enter / Space / R">↻ PLAY AGAIN</NeonButton>
        <div className="grid grid-cols-2 gap-3"><NeonButton variant="pink" onClick={share}>SHARE</NeonButton><NeonButton variant="purple" onClick={download}>SAVE CARD</NeonButton></div>
        <NeonButton variant="ghost" onClick={onMenu}>MENU</NeonButton>
      </motion.div>
      {toast && <div className="fixed bottom-16 left-1/2 -translate-x-1/2 glass !rounded-full px-5 py-2 text-sm z-50">{toast}</div>}
    </Page>
  )
}
