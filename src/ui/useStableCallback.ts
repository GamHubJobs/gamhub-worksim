import { useCallback, useLayoutEffect, useRef } from 'react'

/**
 * The same function every render, always calling the latest `fn`.
 *
 * For handing to the 3D places: each one skips redrawing when nothing it is
 * given has changed (React.memo), and a function made afresh on every render
 * (an inline arrow, or one that depends on the save) counts as a change, so the
 * whole place was redrawn on every game minute. These are called from events
 * and frames, never while rendering, so they always see the latest `fn`.
 */
export function useStableCallback<A extends unknown[], R>(
  fn: (...args: A) => R,
): (...args: A) => R {
  const latest = useRef(fn)
  useLayoutEffect(() => {
    latest.current = fn
  })
  return useCallback((...args: A) => latest.current(...args), [])
}
