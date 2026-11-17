/**
 * The team board on the wall, written up from the save (workBoard.ts): the
 * team's name, the work in hand (in progress, to redo, next) and the last
 * tasks done, ticked off, and how many of the career's tasks are done. When a
 * task is handed in in the Tasks app, the board changes with it. Drawn on a
 * canvas, in marker colours on white.
 */
import { useEffect, useState } from 'react'
import { CanvasTexture, SRGBColorSpace } from 'three'
import type { Board, BoardState } from './workBoard'

const MARK: Record<BoardState, { sign: string; colour: string }> = {
  doing: { sign: '▶', colour: '#2563eb' },
  redo: { sign: '↺', colour: '#dc2626' },
  next: { sign: '○', colour: '#475569' },
  done: { sign: '✓', colour: '#16a34a' },
}

function makeBoard() {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 320
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  return { canvas, texture }
}

/** Writes the board up (the canvas and its texture, together). */
function write(
  surface: { canvas: HTMLCanvasElement; texture: CanvasTexture },
  board: Board,
) {
  const g = surface.canvas.getContext('2d')
  surface.texture.needsUpdate = true
  if (!g) return
  const { width: w, height: h } = surface.canvas
  g.fillStyle = '#ffffff'
  g.fillRect(0, 0, w, h)
  g.fillStyle = '#1e3a8a'
  g.font = 'bold 30px sans-serif'
  g.fillText(board.team, 18, 38, w - 36)
  g.fillStyle = '#64748b'
  g.font = '18px sans-serif'
  g.fillText(`This week · ${board.done} of ${board.total} tasks done`, 18, 64, w - 36)
  // The project in hand, in its own colour, across the bottom.
  if (board.project) {
    g.fillStyle = '#c2410c'
    g.font = 'bold 18px sans-serif'
    g.fillText(board.project, 18, h - 16, w - 36)
  }
  g.strokeStyle = '#cbd5e1'
  g.beginPath()
  g.moveTo(18, 76)
  g.lineTo(w - 18, 76)
  g.stroke()
  board.items.forEach((item, i) => {
    const y = 108 + i * 36
    const mark = MARK[item.state]
    g.fillStyle = mark.colour
    g.font = 'bold 22px sans-serif'
    g.fillText(mark.sign, 18, y)
    g.font = item.state === 'done' ? '21px sans-serif' : 'bold 22px sans-serif'
    g.fillStyle = item.state === 'done' ? '#64748b' : '#0f172a'
    g.fillText(item.title, 50, y, w - 70)
    if (item.state === 'done') {
      const width = Math.min(g.measureText(item.title).width, w - 70)
      g.fillRect(50, y - 7, width, 2)
    }
  })
  if (board.items.length === 0) {
    g.fillStyle = '#475569'
    g.font = '20px sans-serif'
    g.fillText('Nothing on the board yet.', 18, 110)
  }
}

/** The board's face, w × h, written up from `board` (JSON of a Board). */
export function TeamBoard({ board, w, h }: { board: string; w: number; h: number }) {
  const [surface] = useState(makeBoard)
  useEffect(() => {
    try {
      write(surface, JSON.parse(board) as Board)
    } catch {
      // Nothing to write: the board stays as it was.
    }
  }, [board, surface])
  useEffect(() => () => surface.texture.dispose(), [surface])
  return (
    <mesh>
      <planeGeometry args={[w, h]} />
      <meshStandardMaterial map={surface.texture} roughness={0.35} />
    </mesh>
  )
}
