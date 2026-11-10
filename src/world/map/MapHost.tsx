/**
 * The world map and what keeps the maps up to date (at the top of the desk):
 * M opens and closes the map (not while typing); the route to the destination
 * is worked out again every second by the street's walking grid; places are
 * found by walking past them; and the destination is cleared on arriving.
 */
import { useEffect, useRef } from 'react'
import type { ProfileData } from '../../game/career'
import { arrived, foundNear, setDestination, withFound } from '../../game/nav'
import { standAt } from '../../city/streets'
import { audio } from '../../audio/manager'
import { keymap } from '../keys'
import { routeTo, setRoute, toggleMap, useMap } from './store'
import { WorldMap } from './WorldMap'

type Act = (change: (p: ProfileData) => ProfileData) => unknown

export function MapHost({ profile, act }: { profile: ProfileData; act: Act }) {
  const { open, pose } = useMap()
  const nav = profile.work.life.nav
  // M: the map (the key can be changed with the others).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)))
        return
      if (keymap().map.includes(e.code) && !e.repeat) {
        e.preventDefault()
        audio.play(open ? 'close' : 'open')
        toggleMap()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])
  // The route, again every second while there is somewhere to go.
  const dest = nav.destination
  const latest = useRef(pose)
  useEffect(() => {
    latest.current = pose
  })
  useEffect(() => {
    if (!dest) {
      setRoute([])
      return
    }
    const update = () => {
      if (!latest.current) return setRoute([])
      const [x, z] = standAt(dest)
      setRoute(routeTo({ x, z }) ?? [])
    }
    update()
    const t = window.setInterval(update, 1000)
    return () => window.clearInterval(t)
  }, [dest])
  // Places found by walking past them.
  const px = pose ? Math.round(pose.x / 4) : null
  useEffect(() => {
    if (!pose) return
    const found = foundNear(nav.found, pose.x, pose.z)
    if (found !== nav.found)
      void act((p) => withFound(p, foundNear(p.work.life.nav.found, pose.x, pose.z)))
    // Only as the player moves along (every few metres).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [px])
  // Going in somewhere finds it too.
  const life = profile.work.life
  const inside = life.phase !== 'work' && life.city.inside ? life.city.at : null
  useEffect(() => {
    if (inside && !nav.found.includes(inside))
      void act((p) =>
        p.work.life.nav.found.includes(inside)
          ? p
          : withFound(p, [...p.work.life.nav.found, inside]),
      )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inside])
  // There: the destination is done with.
  const there = arrived(profile)
  useEffect(() => {
    if (there) void act((p) => (arrived(p) ? setDestination(p, null) : p))
  }, [there, act])
  return open ? <WorldMap profile={profile} act={act} /> : null
}
