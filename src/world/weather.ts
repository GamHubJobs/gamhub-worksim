/**
 * The weather: on some days it rains (decided from the day, so it is the same
 * for everyone and in every test), unless the player has chosen always dry in
 * Sound & graphics. Kept on this device.
 */
import { useSyncExternalStore } from 'react'

export type WeatherSetting = 'forecast' | 'dry'

export const WEATHER_KEY = 'worksim.weather.v1'

const listeners = new Set<() => void>()

function read(): WeatherSetting {
  try {
    return typeof window !== 'undefined' &&
      window.localStorage.getItem(WEATHER_KEY) === 'dry'
      ? 'dry'
      : 'forecast'
  } catch {
    return 'forecast'
  }
}

let current: WeatherSetting = read()

export function setWeatherSetting(setting: WeatherSetting): void {
  current = setting
  try {
    window.localStorage.setItem(WEATHER_KEY, setting)
  } catch {
    // Storage blocked: the choice still applies until the page closes.
  }
  for (const listener of listeners) listener()
}

export function useWeatherSetting(): WeatherSetting {
  return useSyncExternalStore(
    (change) => {
      listeners.add(change)
      return () => listeners.delete(change)
    },
    () => current,
  )
}

/** Whether it rains on a day (about one day in three), before the player's setting. */
export function rainsOn(day: number): boolean {
  // A small, fixed scramble of the day number.
  const k = Math.sin(day * 12.9898 + 4.1414) * 43758.5453
  return k - Math.floor(k) < 0.33
}

export function isRaining(day: number, setting: WeatherSetting): boolean {
  return setting === 'forecast' && rainsOn(day)
}
