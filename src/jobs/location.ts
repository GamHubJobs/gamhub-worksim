/**
 * "Use my approximate location", for finding jobs nearby. Only when the player
 * asks: the browser then asks them for permission. The position is rounded to
 * about 10 km before it leaves the device, and is sent to one place only,
 * BigDataCloud's free lookup for browser apps (api.bigdatacloud.net), to learn
 * the country and town. Neither the position nor the answer is kept: the
 * player sees the country and town and can change them.
 */
import { getJson } from './feeds'
import { oneLine } from './text'

export interface Approximate {
  country: string
  place: string
}

export class LocationError extends Error {}

function position(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    const geo = globalThis.navigator?.geolocation
    if (!geo) return reject(new LocationError('This browser cannot share a location.'))
    geo.getCurrentPosition(
      resolve,
      (e) =>
        reject(
          new LocationError(
            e.code === e.PERMISSION_DENIED
              ? 'Location was not shared. You can type your country and town instead.'
              : 'Your location could not be found. You can type your country and town instead.',
          ),
        ),
      { enableHighAccuracy: false, timeout: 15_000, maximumAge: 30 * 60_000 },
    )
  })
}

/** Rounded to one decimal place: about 10 km, enough for a town, not a street. */
export const rough = (n: number) => Math.round(n * 10) / 10

export async function approximateLocation(doFetch?: typeof fetch): Promise<Approximate> {
  const { coords } = await position()
  const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${rough(coords.latitude)}&longitude=${rough(coords.longitude)}&localityLanguage=en`
  let body: unknown
  try {
    body = await getJson(url, 15_000, doFetch)
  } catch {
    throw new LocationError(
      'The country for your location could not be looked up. You can choose it instead.',
    )
  }
  const b = body as { countryCode?: unknown; city?: unknown; locality?: unknown }
  const country =
    typeof b.countryCode === 'string' && /^[A-Z]{2}$/i.test(b.countryCode)
      ? b.countryCode.toUpperCase()
      : ''
  if (!country)
    throw new LocationError(
      'No country was found for your location. You can choose it instead.',
    )
  return { country, place: oneLine(b.city) || oneLine(b.locality) }
}
