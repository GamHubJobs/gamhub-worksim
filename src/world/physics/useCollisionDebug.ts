/** Development only: F8 in a 3D view turns the collision debug view on or off (kept for the tab). */
import { useEffect, useState } from 'react'

const KEY = 'worksim.debug.collision'

export function useCollisionDebug(): boolean {
  const [on, setOn] = useState(
    () => import.meta.env.DEV && window.sessionStorage?.getItem(KEY) === '1',
  )
  useEffect(() => {
    if (!import.meta.env.DEV) return
    const key = (e: KeyboardEvent) => {
      if (e.code !== 'F8') return
      setOn((was) => {
        window.sessionStorage?.setItem(KEY, was ? '0' : '1')
        return !was
      })
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [])
  return on
}
