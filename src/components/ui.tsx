import { motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { audio } from '../game/audio'

export const Backdrop = () => (
  <div className="fixed inset-0 overflow-hidden bg-ink pointer-events-none">
    <motion.div className="absolute -top-40 -left-40 w-[28rem] h-[28rem] rounded-full bg-neon-purple/30 blur-[110px]" animate={{ x: [0, 80, 0], y: [0, 60, 0] }} transition={{ duration: 14, repeat: Infinity }} />
    <motion.div className="absolute -bottom-40 -right-40 w-[30rem] h-[30rem] rounded-full bg-neon-blue/30 blur-[120px]" animate={{ x: [0, -80, 0], y: [0, -40, 0] }} transition={{ duration: 16, repeat: Infinity }} />
    <div className="bg-grid" />
  </div>
)

export const Page = ({ children }: { children: ReactNode }) => (
  <div className="absolute inset-0 overflow-y-auto z-10">
    <div className="min-h-full flex flex-col items-center justify-center gap-6 px-4 py-14">{children}</div>
  </div>
)

export function Logo({ size = 'lg' }: { size?: 'lg' | 'sm' }) {
  const word = (w: string, cls: string, d: number) => w.split('').map((ch, i) => (
    <motion.span key={w + i} className={cls} initial={{ opacity: 0, y: -30, filter: 'blur(10px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} transition={{ delay: d + i * 0.09, duration: 0.6 }}>{ch}</motion.span>
  ))
  const big = size === 'lg'
  return (
    <div className={`logo-glow font-display font-black select-none leading-[.95] text-center ${big ? 'text-6xl sm:text-8xl tracking-[.12em]' : 'text-4xl sm:text-5xl tracking-[.1em]'}`}>
      <div className="text-neon-cyan" style={{ textShadow: '0 0 18px #22f3ff, 0 0 48px rgba(34,243,255,.5)' }}>{word('NEON', '', 0)}</div>
      <div className="text-neon-pink" style={{ textShadow: '0 0 18px #ff3d9a, 0 0 48px rgba(162,75,255,.7)' }}>{word('RUSH', '', 0.4)}</div>
    </div>
  )
}

type V = 'cyan' | 'purple' | 'pink' | 'ghost'
const VS: Record<V, string> = {
  cyan: 'border-neon-cyan/70 bg-neon-cyan/10 text-neon-cyan shadow-[0_0_24px_rgba(34,243,255,.35)]',
  purple: 'border-neon-purple/70 bg-neon-purple/15 text-[#cfa8ff] shadow-[0_0_24px_rgba(162,75,255,.35)]',
  pink: 'border-neon-pink/70 bg-neon-pink/10 text-neon-pink shadow-[0_0_24px_rgba(255,61,154,.35)]',
  ghost: 'border-white/20 bg-white/5 text-white/85',
}
export function NeonButton({ children, onClick, variant = 'cyan', sub, className = '' }: { children: ReactNode; onClick: () => void; variant?: V; sub?: string; className?: string }) {
  return (
    <motion.button whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.96 }} onClick={() => { audio.click(); onClick() }}
      className={`w-full rounded-2xl border px-5 py-4 font-display font-bold tracking-[.18em] text-sm sm:text-base backdrop-blur ${VS[variant]} ${className}`}>
      {children}
      {sub && <span className="block text-[11px] font-body font-medium tracking-wide opacity-70 mt-1">{sub}</span>}
    </motion.button>
  )
}

export function Header({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div className="w-full max-w-md flex items-center gap-3">
      <button aria-label="Back" onClick={() => { audio.click(); onBack() }} className="h-10 w-10 shrink-0 rounded-full glass text-lg">←</button>
      <h2 className="font-display font-black tracking-[.2em] text-xl text-neon-cyan">{title}</h2>
    </div>
  )
}

