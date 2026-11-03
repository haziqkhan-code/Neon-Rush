import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Game, type Hud, type RunResult } from '../game/engine'
import { dailySeed, type Skin } from '../game/data'
import { NeonButton } from './ui'

const H0: Hud = { score: 0, coins: 0, health: 3, combo: 0, mult: 1, time: 0, shield: 0, slow: 0, magnet: 0, comboT: 0, paused: false }

export default function GameCanvas({ daily, day, skin, onEnd, onQuit }: { daily: boolean; day: string; skin: Skin; onEnd: (r: RunResult) => void; onQuit: () => void }) {
  const cv = useRef<HTMLCanvasElement>(null)
  const game = useRef<Game | null>(null)
  const endRef = useRef(onEnd); endRef.current = onEnd
  const [hud, setHud] = useState<Hud>(H0)
  const [run, setRun] = useState(0)

  useEffect(() => {
    const seed = daily ? dailySeed(day) : (Math.random() * 2 ** 31) | 0
    const g = new Game(cv.current!, { daily, seed, day, c1: skin.c1, c2: skin.c2, prism: !!skin.prism, onHud: setHud, onEnd: r => endRef.current(r) })
    game.current = g; g.start()
    return () => g.destroy()
  }, [run]) // eslint-disable-line react-hooks/exhaustive-deps

  const chips: [string, number, string][] = [['SHIELD', hud.shield, '#4dffb8'], ['SLOW-MO', hud.slow, '#8f7bff'], ['MAGNET', hud.magnet, '#ffd84d']]
  return (
    <div className="fixed inset-0 bg-ink">
      <canvas ref={cv} className="absolute inset-0 w-full h-full" />
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 px-3 sm:px-6" style={{ paddingTop: 'max(.75rem, env(safe-area-inset-top))' }}>
        <div className="w-28 sm:w-40">
          <div className="text-2xl sm:text-3xl tracking-wider">
            {[0, 1, 2].map(i => <span key={i} className={i < hud.health ? 'text-neon-pink drop-shadow-[0_0_8px_#ff3d9a]' : 'text-white/15'}>♥</span>)}
          </div>
          <div className="mt-1 flex flex-col gap-1">
            {chips.filter(c => c[1] > 0).map(([n, v, col]) => (
              <div key={n} className="glass !rounded-full px-3 py-0.5 text-[11px] font-display font-bold w-fit" style={{ color: col }}>{n} {Math.ceil(v)}s</div>
            ))}
          </div>
        </div>
        <div className="text-center">
          <div className="font-display font-black text-3xl sm:text-5xl text-white" style={{ textShadow: '0 0 20px rgba(34,243,255,.8)' }}>{hud.score.toLocaleString()}</div>
          {daily && <div className="text-[11px] text-neon-purple font-display tracking-widest">DAILY {day}</div>}
          {hud.combo >= 2 && (
            <div className="mt-1 flex flex-col items-center">
              <motion.div key={hud.mult} initial={{ scale: 1.7 }} animate={{ scale: 1 }} className="font-display font-black text-2xl text-neon-cyan" style={{ textShadow: '0 0 14px #22f3ff' }}>x{hud.mult}</motion.div>
              <div className="text-[11px] opacity-70">{hud.combo} chain</div>
              <div className="h-1 w-24 rounded bg-white/10 overflow-hidden"><div className="h-full bg-neon-cyan" style={{ width: `${Math.min(100, (hud.comboT / 2.2) * 100)}%` }} /></div>
            </div>
          )}
        </div>
        <div className="w-28 sm:w-40 flex items-start justify-end gap-2">
          <div className="text-right font-display font-bold text-[#ffd84d] text-lg sm:text-xl leading-10">🪙 {hud.coins}</div>
          <button aria-label="Pause" onClick={() => game.current?.pause()} className="pointer-events-auto h-10 w-10 rounded-full glass text-sm">❚❚</button>
        </div>
      </div>
      {hud.time < 5 && !hud.paused && <div className="pointer-events-none absolute bottom-8 inset-x-0 text-center text-sm text-white/60 animate-pulse">WASD / arrows to move · or drag anywhere · grab coins, dodge red</div>}
      <AnimatePresence>
        {hud.paused && (
          <motion.div className="absolute inset-0 z-20 flex items-center justify-center bg-ink/70 backdrop-blur-sm p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="glass w-full max-w-xs p-6 space-y-3" initial={{ scale: 0.9 }} animate={{ scale: 1 }}>
              <div className="font-display font-black text-2xl text-center tracking-widest mb-2">PAUSED</div>
              <NeonButton onClick={() => game.current?.pause(false)}>RESUME</NeonButton>
              <NeonButton variant="purple" onClick={() => { setRun(r => r + 1) }}>RESTART</NeonButton>
              <NeonButton variant="ghost" onClick={onQuit}>QUIT TO MENU</NeonButton>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
