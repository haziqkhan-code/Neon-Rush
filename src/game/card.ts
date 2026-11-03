/** Draws a 1080x1080 shareable score card to a PNG blob (no external services). */
export async function makeCard(o: { score: number; time: string; coins: number; combo: number; best: number; day: string | null; c1: string; msg: string }): Promise<Blob> {
  try { await document.fonts?.load('900 100px Orbitron') } catch { /* fallback font is fine */ }
  const S = 1080, cv = document.createElement('canvas'); cv.width = S; cv.height = S
  const x = cv.getContext('2d')!, F = 'Orbitron, system-ui, sans-serif'
  const g = x.createLinearGradient(0, 0, S, S); g.addColorStop(0, '#05060f'); g.addColorStop(0.6, '#150a35'); g.addColorStop(1, '#06223a')
  x.fillStyle = g; x.fillRect(0, 0, S, S)
  x.strokeStyle = 'rgba(34,243,255,.08)'; x.lineWidth = 2
  for (let i = 0; i <= S; i += 60) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, S); x.moveTo(0, i); x.lineTo(S, i); x.stroke() }
  const r = x.createRadialGradient(S / 2, 470, 0, S / 2, 470, 460); r.addColorStop(0, o.c1); r.addColorStop(1, 'rgba(0,0,0,0)')
  x.globalAlpha = 0.28; x.fillStyle = r; x.fillRect(0, 0, S, S); x.globalAlpha = 1
  x.textAlign = 'center'; x.textBaseline = 'middle'
  const t = (s: string, y: number, size: number, col: string, glow = 0) => { x.font = `900 ${size}px ${F}`; x.fillStyle = col; x.shadowColor = col; x.shadowBlur = glow; x.fillText(s, S / 2, y); x.shadowBlur = 0 }
  t('NEON RUSH', 150, 96, '#22f3ff', 30)
  if (o.day) t('DAILY CHALLENGE ' + o.day, 235, 34, '#c9a8ff')
  t('SCORE', 380, 40, '#8f9bd6')
  t(o.score.toLocaleString(), 540, o.score >= 100000 ? 170 : 220, '#ffffff', 40)
  x.font = `italic 500 38px ${F}`; x.fillStyle = '#e8ecff'; x.fillText(o.msg.length > 46 ? o.msg.slice(0, 45) + '…' : o.msg, S / 2, 680)
  const cols: [string, string][] = [['TIME', o.time], ['COINS', String(o.coins)], ['MAX CHAIN', String(o.combo)], ['BEST', o.best.toLocaleString()]]
  cols.forEach(([k, v], i) => { const cx = 135 + i * 270; x.textAlign = 'center'; x.font = `500 26px ${F}`; x.fillStyle = '#8f9bd6'; x.fillText(k, cx, 800); x.font = `900 46px ${F}`; x.fillStyle = '#22f3ff'; x.fillText(v, cx, 858) })
  t('CAN YOU BEAT ME?', 975, 58, '#ff3d9a', 24)
  x.font = `500 28px ${F}`; x.fillStyle = '#8f9bd6'; x.fillText(location.host, S / 2, 1038)
  return new Promise((res, rej) => cv.toBlob(b => (b ? res(b) : rej(new Error('card failed'))), 'image/png'))
}
