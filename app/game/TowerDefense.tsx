'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'

// ── Constants ─────────────────────────────────────────────────────────────────
const CELL = 40
const COLS = 20
const ROWS = 12
const W    = COLS * CELL   // 800
const H    = ROWS * CELL   // 480

// Path waypoints in pixel space (enemy center track)
const WAYPOINTS: [number, number][] = [
  [-CELL,       100],
  [180,         100],
  [180,         340],
  [420,         340],
  [420,         100],
  [660,         100],
  [660,         380],
  [W + CELL,    380],
]

// Grid cells the path occupies (towers cannot be placed here)
const PATH_SET = new Set([
  '0,2','1,2','2,2','3,2','4,2',
  '4,3','4,4','4,5','4,6','4,7','4,8',
  '5,8','6,8','7,8','8,8','9,8','10,8',
  '10,7','10,6','10,5','10,4','10,3','10,2',
  '11,2','12,2','13,2','14,2','15,2','16,2',
  '16,3','16,4','16,5','16,6','16,7','16,8','16,9',
  '17,9','18,9','19,9',
])

const WAVES = [
  { count:  8, hp:  50, speed:  55, interval: 1400, reward:  8 },
  { count: 10, hp:  75, speed:  65, interval: 1200, reward: 10 },
  { count: 14, hp: 110, speed:  72, interval: 1000, reward: 12 },
  { count: 18, hp: 160, speed:  82, interval:  900, reward: 15 },
  { count: 22, hp: 220, speed:  92, interval:  800, reward: 18 },
  { count: 28, hp: 320, speed: 105, interval:  650, reward: 22 },
]

type Phase = 'prep' | 'wave' | 'gameover' | 'victory'

interface Enemy {
  id: number; x: number; y: number; wpIdx: number
  hp: number; maxHp: number; speed: number
  reached: boolean; dead: boolean; reward: number
}
interface Tower {
  id: number; gx: number; gy: number; cx: number; cy: number
  range: number; damage: number; fireRate: number; lastFire: number; angle: number
}
interface Bullet {
  id: number; x: number; y: number; targetId: number; speed: number; damage: number
}
interface GState {
  enemies: Enemy[]; towers: Tower[]; bullets: Bullet[]
  gold: number; lives: number; score: number
  wave: number; phase: Phase
  spawnTimer: number; spawnCount: number
  spawnDef: typeof WAVES[0] | null
  nextId: number
}

// ── Canvas helpers ────────────────────────────────────────────────────────────
function rrect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y); ctx.arcTo(x + w, y, x + w, y + r, r)
  ctx.lineTo(x + w, y + h - r); ctx.arcTo(x + w, y + h, x + w - r, y + h, r)
  ctx.lineTo(x + r, y + h); ctx.arcTo(x, y + h, x, y + h - r, r)
  ctx.lineTo(x, y + r); ctx.arcTo(x, y, x + r, y, r)
  ctx.closePath()
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function TowerDefense() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const hovRef    = useRef<{ gx: number; gy: number } | null>(null)
  const G         = useRef<GState>({
    enemies: [], towers: [], bullets: [],
    gold: 150, lives: 20, score: 0,
    wave: 0, phase: 'prep',
    spawnTimer: 0, spawnCount: 0, spawnDef: null,
    nextId: 0,
  })

  const [phase, setPhase] = useState<Phase>('prep')
  const [gold,  setGold]  = useState(150)
  const [lives, setLives] = useState(20)
  const [score, setScore] = useState(0)
  const [wave,  setWave]  = useState(0)

  // ── Handlers ────────────────────────────────────────────────────────────────
  function startWave() {
    const g = G.current
    if (g.phase !== 'prep' || g.wave >= WAVES.length) return
    const def = WAVES[g.wave]
    g.spawnDef = def; g.spawnCount = 0; g.spawnTimer = 0
    g.phase = 'wave'; g.wave++
    setPhase('wave'); setWave(g.wave)
  }

  function handleClick(e: React.MouseEvent<HTMLCanvasElement>) {
    const g = G.current
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    const px = (e.clientX - rect.left) * (W / rect.width)
    const py = (e.clientY - rect.top)  * (H / rect.height)
    const gx = Math.floor(px / CELL)
    const gy = Math.floor(py / CELL)
    if (gx < 0 || gx >= COLS || gy < 0 || gy >= ROWS) return
    if (PATH_SET.has(`${gx},${gy}`)) return
    if (g.towers.some(t => t.gx === gx && t.gy === gy)) return
    if (g.gold < 50) return
    g.towers.push({
      id: g.nextId++, gx, gy,
      cx: gx * CELL + CELL / 2, cy: gy * CELL + CELL / 2,
      range: 120, damage: 25, fireRate: 800, lastFire: 0, angle: -Math.PI / 2,
    })
    g.gold -= 50
    setGold(g.gold)
  }

  function handleMove(e: React.MouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    const px = (e.clientX - rect.left) * (W / rect.width)
    const py = (e.clientY - rect.top)  * (H / rect.height)
    const gx = Math.floor(px / CELL)
    const gy = Math.floor(py / CELL)
    hovRef.current = (gx >= 0 && gx < COLS && gy >= 0 && gy < ROWS) ? { gx, gy } : null
  }

  // ── Game loop ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const g   = G.current
    let lastTs = 0
    let rafId  = 0

    function draw() {
      const hov = hovRef.current

      // Background
      ctx.fillStyle = '#f8f5f0'
      ctx.fillRect(0, 0, W, H)

      // Path fill
      ctx.fillStyle = '#dedad2'
      for (const key of PATH_SET) {
        const [gx, gy] = key.split(',').map(Number)
        ctx.fillRect(gx * CELL, gy * CELL, CELL, CELL)
      }

      // Hatching on path (ink texture)
      ctx.save()
      ctx.strokeStyle = 'rgba(0,0,0,0.07)'
      ctx.lineWidth = 0.8
      for (const key of PATH_SET) {
        const [gx, gy] = key.split(',').map(Number)
        const x0 = gx * CELL, y0 = gy * CELL
        for (let d = -CELL + 8; d < CELL * 2; d += 10) {
          ctx.beginPath()
          ctx.moveTo(x0 + Math.max(0, d),        y0 + Math.max(0, -d))
          ctx.lineTo(x0 + Math.min(CELL, d+CELL), y0 + Math.min(CELL, CELL-d))
          ctx.stroke()
        }
      }
      ctx.restore()

      // Grid lines
      ctx.strokeStyle = 'rgba(0,0,0,0.07)'
      ctx.lineWidth = 0.5
      for (let c = 0; c <= COLS; c++) {
        ctx.beginPath(); ctx.moveTo(c * CELL, 0); ctx.lineTo(c * CELL, H); ctx.stroke()
      }
      for (let r = 0; r <= ROWS; r++) {
        ctx.beginPath(); ctx.moveTo(0, r * CELL); ctx.lineTo(W, r * CELL); ctx.stroke()
      }

      // Hover highlight + range preview
      if (hov) {
        const onPath   = PATH_SET.has(`${hov.gx},${hov.gy}`)
        const occupied = g.towers.some(t => t.gx === hov.gx && t.gy === hov.gy)
        const ok       = !onPath && !occupied && g.gold >= 50
        ctx.fillStyle = ok ? 'rgba(34,197,94,0.22)' : 'rgba(239,68,68,0.18)'
        ctx.fillRect(hov.gx * CELL, hov.gy * CELL, CELL, CELL)
        if (ok) {
          ctx.strokeStyle = 'rgba(0,0,0,0.18)'
          ctx.lineWidth = 1
          ctx.setLineDash([3, 4])
          ctx.beginPath()
          ctx.arc(hov.gx * CELL + CELL / 2, hov.gy * CELL + CELL / 2, 120, 0, Math.PI * 2)
          ctx.stroke()
          ctx.setLineDash([])
        }
      }

      // Towers
      for (const t of g.towers) {
        const { cx, cy, angle } = t

        // Range ring
        ctx.strokeStyle = 'rgba(0,0,0,0.05)'
        ctx.lineWidth = 1
        ctx.setLineDash([2, 5])
        ctx.beginPath(); ctx.arc(cx, cy, t.range, 0, Math.PI * 2); ctx.stroke()
        ctx.setLineDash([])

        // Drop shadow
        ctx.fillStyle = 'rgba(0,0,0,0.12)'
        rrect(ctx, cx - CELL * 0.31 + 2, cy - CELL * 0.31 + 3, CELL * 0.62, CELL * 0.62, 5)
        ctx.fill()

        // Base plate
        const bs = CELL * 0.62
        ctx.fillStyle = '#fcfaf6'; ctx.strokeStyle = '#111'; ctx.lineWidth = 2
        rrect(ctx, cx - bs / 2, cy - bs / 2, bs, bs, 5)
        ctx.fill(); ctx.stroke()

        // Decorative rivets (four corners)
        ctx.fillStyle = '#111'
        const rv = bs / 2 - 5
        for (const [rx, ry] of [[-rv,-rv],[rv,-rv],[-rv,rv],[rv,rv]]) {
          ctx.beginPath(); ctx.arc(cx + rx, cy + ry, 2, 0, Math.PI * 2); ctx.fill()
        }

        // Turret disc
        ctx.fillStyle = '#f0ece4'; ctx.strokeStyle = '#111'; ctx.lineWidth = 2
        ctx.beginPath(); ctx.arc(cx, cy, CELL * 0.21, 0, Math.PI * 2); ctx.fill(); ctx.stroke()

        // Barrel
        ctx.strokeStyle = '#111'; ctx.lineWidth = 4; ctx.lineCap = 'round'
        ctx.beginPath()
        ctx.moveTo(cx + Math.cos(angle) * 5, cy + Math.sin(angle) * 5)
        ctx.lineTo(cx + Math.cos(angle) * CELL * 0.42, cy + Math.sin(angle) * CELL * 0.42)
        ctx.stroke()
        ctx.lineCap = 'butt'
      }

      // Enemies
      for (const e of g.enemies) {
        const r = 11

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.09)'
        ctx.beginPath()
        ctx.ellipse(e.x + 1, e.y + r - 1, r * 0.82, r * 0.28, 0, 0, Math.PI * 2)
        ctx.fill()

        // Body
        ctx.fillStyle = '#fff'; ctx.strokeStyle = '#111'; ctx.lineWidth = 2.5
        ctx.beginPath(); ctx.arc(e.x, e.y, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke()

        // X mark
        const m = r * 0.52
        ctx.strokeStyle = '#111'; ctx.lineWidth = 1.8
        ctx.beginPath()
        ctx.moveTo(e.x - m, e.y - m); ctx.lineTo(e.x + m, e.y + m)
        ctx.moveTo(e.x + m, e.y - m); ctx.lineTo(e.x - m, e.y + m)
        ctx.stroke()

        // HP bar
        const bw = 26, bh = 4, barX = e.x - bw / 2, barY = e.y - r - 9
        const pct = Math.max(0, e.hp / e.maxHp)
        ctx.fillStyle = '#ccc'; ctx.fillRect(barX, barY, bw, bh)
        ctx.fillStyle = pct > 0.5 ? '#16a34a' : pct > 0.25 ? '#d97706' : '#dc2626'
        ctx.fillRect(barX, barY, pct * bw, bh)
        ctx.strokeStyle = '#111'; ctx.lineWidth = 0.75; ctx.strokeRect(barX, barY, bw, bh)
      }

      // Bullets
      ctx.fillStyle = '#111'
      for (const b of g.bullets) {
        ctx.beginPath(); ctx.arc(b.x, b.y, 3.5, 0, Math.PI * 2); ctx.fill()
      }

      // Entry / exit labels
      ctx.font = 'bold 9px monospace'
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.fillStyle = '#15803d'
      ctx.fillText('START', 20, 100)
      ctx.fillStyle = '#b91c1c'
      ctx.fillText('END', W - 20, 380)
    }

    function loop(ts: number) {
      if (!lastTs) lastTs = ts
      const dt = Math.min((ts - lastTs) / 1000, 0.05)
      lastTs = ts

      if (g.phase !== 'gameover' && g.phase !== 'victory') {
        // Spawn enemies
        if (g.phase === 'wave' && g.spawnDef && g.spawnCount < g.spawnDef.count) {
          g.spawnTimer += dt * 1000
          while (g.spawnTimer >= g.spawnDef.interval && g.spawnCount < g.spawnDef.count) {
            g.spawnTimer -= g.spawnDef.interval
            g.enemies.push({
              id: g.nextId++,
              x: WAYPOINTS[0][0], y: WAYPOINTS[0][1],
              wpIdx: 0, hp: g.spawnDef.hp, maxHp: g.spawnDef.hp,
              speed: g.spawnDef.speed, reached: false, dead: false, reward: g.spawnDef.reward,
            })
            g.spawnCount++
          }
        }

        // Move enemies along waypoints
        for (const e of g.enemies) {
          if (e.dead || e.reached) continue
          if (e.wpIdx >= WAYPOINTS.length - 1) { e.reached = true; continue }
          const [tx, ty] = WAYPOINTS[e.wpIdx + 1]
          const dx = tx - e.x, dy = ty - e.y
          const dist = Math.hypot(dx, dy)
          const step = e.speed * dt
          if (dist <= step) {
            e.x = tx; e.y = ty; e.wpIdx++
            if (e.wpIdx >= WAYPOINTS.length - 1) {
              e.reached = true
              g.lives = Math.max(0, g.lives - 1)
              setLives(g.lives)
              if (g.lives <= 0) { g.phase = 'gameover'; setPhase('gameover') }
            }
          } else {
            e.x += (dx / dist) * step
            e.y += (dy / dist) * step
          }
        }

        // Tower firing — target enemy furthest along path
        for (const t of g.towers) {
          if (ts - t.lastFire < t.fireRate) continue
          let best: Enemy | null = null, bestProg = -1
          for (const e of g.enemies) {
            if (e.dead || e.reached) continue
            if ((e.x - t.cx) ** 2 + (e.y - t.cy) ** 2 > t.range * t.range) continue
            const [wx, wy]   = WAYPOINTS[e.wpIdx]
            const [wnx, wny] = WAYPOINTS[e.wpIdx + 1] ?? WAYPOINTS[e.wpIdx]
            const segLen = Math.hypot(wnx - wx, wny - wy) || 1
            const prog   = e.wpIdx * 10000 + Math.hypot(e.x - wx, e.y - wy) / segLen * 1000
            if (prog > bestProg) { bestProg = prog; best = e }
          }
          if (best) {
            t.angle    = Math.atan2(best.y - t.cy, best.x - t.cx)
            t.lastFire = ts
            g.bullets.push({ id: g.nextId++, x: t.cx, y: t.cy, targetId: best.id, speed: 320, damage: t.damage })
          }
        }

        // Move bullets (homing)
        for (const b of g.bullets) {
          const tgt = g.enemies.find(e => e.id === b.targetId)
          if (!tgt || tgt.dead || tgt.reached) { b.targetId = -1; continue }
          const dx = tgt.x - b.x, dy = tgt.y - b.y
          const dist = Math.hypot(dx, dy)
          if (dist <= b.speed * dt + 8) {
            tgt.hp -= b.damage; b.targetId = -1
            if (tgt.hp <= 0) {
              tgt.dead = true
              g.gold  += tgt.reward
              g.score += 10 + tgt.reward
              setGold(g.gold); setScore(g.score)
            }
          } else {
            b.x += (dx / dist) * b.speed * dt
            b.y += (dy / dist) * b.speed * dt
          }
        }

        // Cleanup
        g.enemies = g.enemies.filter(e => !e.dead && !e.reached)
        g.bullets = g.bullets.filter(b => b.targetId !== -1)

        // Wave complete?
        if (g.phase === 'wave' && g.spawnDef && g.spawnCount >= g.spawnDef.count && g.enemies.length === 0) {
          if (g.wave >= WAVES.length) {
            g.phase = 'victory'; setPhase('victory')
          } else {
            g.gold += 40; g.phase = 'prep'
            setGold(g.gold); setPhase('prep')
          }
        }
      }

      draw()
      rafId = requestAnimationFrame(loop)
    }

    rafId = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafId)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const canAfford = gold >= 50

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col items-center py-6 gap-4 px-4">
      <div className="flex items-center gap-4 w-full max-w-[800px]">
        <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-900">← Back</Link>
        <h1 className="font-bold text-zinc-900 tracking-tight">Tower Defense</h1>
        <div className="ml-auto flex items-center gap-4 text-sm font-mono">
          <span className={canAfford ? 'text-yellow-700 font-semibold' : 'text-red-500 font-semibold'}>
            ◈ {gold}
          </span>
          <span className="text-zinc-700">♥ {lives}</span>
          <span className="text-zinc-500">Score {score}</span>
          <span className="text-zinc-400 text-xs">Wave {wave}/{WAVES.length}</span>
        </div>
      </div>

      <div className="relative w-full max-w-[800px]">
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          className="w-full block border-2 border-zinc-300 rounded-lg cursor-crosshair"
          onClick={handleClick}
          onMouseMove={handleMove}
          onMouseLeave={() => { hovRef.current = null }}
        />

        {phase === 'prep' && (
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2">
            <button
              onClick={startWave}
              className="px-8 py-2.5 bg-zinc-900 text-white text-sm font-bold rounded-lg shadow-lg hover:bg-zinc-700 transition-colors"
            >
              {wave === 0 ? 'Start Wave 1' : `Start Wave ${wave + 1}`}
            </button>
          </div>
        )}

        {(phase === 'gameover' || phase === 'victory') && (
          <div className="absolute inset-0 bg-white/82 flex flex-col items-center justify-center gap-4 rounded-lg">
            <p className="text-5xl font-black text-zinc-900 tracking-tight">
              {phase === 'victory' ? 'Victory!' : 'Game Over'}
            </p>
            <p className="text-zinc-500 font-mono">Score: {score}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-8 py-2.5 bg-zinc-900 text-white text-sm font-bold rounded-lg hover:bg-zinc-700"
            >
              Play Again
            </button>
          </div>
        )}
      </div>

      <p className="text-xs text-zinc-400 max-w-[800px] w-full">
        Click any open cell to build a tower (50 ◈) · Towers auto-aim at the furthest enemy in range · +40 ◈ bonus after each wave
      </p>
    </div>
  )
}
