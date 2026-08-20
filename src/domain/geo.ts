import type { Coordinates } from './types'

const EARTH_RADIUS_M = 6_371_000

const toRadians = (degrees: number): number => (degrees * Math.PI) / 180

/**
 * Great-circle distance between two points, in metres.
 *
 * @example
 * distanceInMetres({ lat: 20.3549, lng: 85.8168 }, { lat: 20.3560, lng: 85.8170 })
 * // => 123.4
 */
export function distanceInMetres(from: Coordinates, to: Coordinates): number {
  const deltaLat = toRadians(to.lat - from.lat)
  const deltaLng = toRadians(to.lng - from.lng)

  const haversine =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(toRadians(from.lat)) * Math.cos(toRadians(to.lat)) * Math.sin(deltaLng / 2) ** 2

  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(haversine))
}

/**
 * Arithmetic-mean centroid. At campus scale (< 1 km) the error versus proper
 * spherical averaging is millimetres, so the simple mean wins on readability.
 *
 * @example
 * centroidOf([{ lat: 20.35, lng: 85.81 }, { lat: 20.36, lng: 85.82 }])
 * // => { lat: 20.355, lng: 85.815 }
 */
export function centroidOf(points: readonly Coordinates[]): Coordinates {
  if (points.length === 0) return { lat: 0, lng: 0 }

  const sum = points.reduce(
    (acc, point) => ({ lat: acc.lat + point.lat, lng: acc.lng + point.lng }),
    { lat: 0, lng: 0 },
  )

  return { lat: sum.lat / points.length, lng: sum.lng / points.length }
}

/**
 * Mean distance from each point to the shared centroid — the "spread" of an
 * incident. A tight spread means many people are describing one physical spot.
 *
 * @example
 * meanDistanceToCentroid([{ lat: 20.3536, lng: 85.8195 }, { lat: 20.3538, lng: 85.8195 }])
 * // => 11.1
 */
export function meanDistanceToCentroid(points: readonly Coordinates[]): number {
  if (points.length === 0) return 0

  const centre = centroidOf(points)
  const total = points.reduce((sum, point) => sum + distanceInMetres(point, centre), 0)

  return total / points.length
}
