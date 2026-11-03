import { useCallback, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Backdrop } from './components/ui'
import GameCanvas from './components/GameCanvas'
import { GameOver, Landing, Leaderboard, Menu, Skins } from './components/screens'
import { SKINS, applyRun, load, persist, todayKey, type Save, type Summary } from './game/data'
import type { RunResult } from './game/engine'

type Screen = 'landing' | 'menu' | 'play' | 'over' | 'leaderboard' | 'skins'

export default function App() {
  const [save, setSave] = useState<Save>(load)
  const saveRef = useRef(save); saveRef.current = save
  const [screen, setScreen] = useState<Screen>('landing')
  const [daily, setDaily] = useState(false)
  const [summary, setSummary] = useState<Summary | null>(null)

  const patch = (p: Partial<Save>) => setSave(s => { const n = { ...s, ...p }; persist(n); return n })

  const play = (d: boolean) => { setDaily(d); setScreen('play') }
  const finish = useCallback((r: RunResult) => {
    const out = applyRun(saveRef.current, r); persist(out.next); setSave(out.next); setSummary(out); setScreen('over')
  }, [])
  
  const menu = useCallback(() => setScreen('menu'), [])
  const begin = useCallback(() => setScreen('menu'), [])
  const skin = SKINS.find(k => k.id === save.skin && k.unlock(save)) || SKINS[0]

  return (
    <div className="fixed inset-0 overflow-hidden font-body">
      {screen !== 'play' && <Backdrop />}
      <AnimatePresence mode="wait">
        <motion.div key={screen} className="absolute inset-0" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.02 }} transition={{ duration: 0.22 }}>
          {screen === 'landing' && <Landing best={save.best} onStart={begin} />}
          {screen === 'menu' && <Menu save={save} onPlay={() => play(false)} onDaily={() => play(true)} onSkins={() => setScreen('skins')} onBoard={() => setScreen('leaderboard')} />}
          {screen === 'play' && <GameCanvas daily={daily} day={todayKey()} skin={skin} onEnd={finish} onQuit={menu} />}
          {screen === 'over' && summary && <GameOver s={summary} onAgain={() => play(summary.result.daily)} onMenu={menu} />}
          {screen === 'leaderboard' && <Leaderboard save={save} onBack={menu} onPlay={() => play(false)} />}
          {screen === 'skins' && <Skins save={save} onBack={menu} onPick={id => patch({ skin: id })} />}
        </motion.div>
      </AnimatePresence>
      <div className="vignette" />
    </div>
  )
}
