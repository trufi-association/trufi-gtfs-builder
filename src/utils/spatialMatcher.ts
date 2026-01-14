import distanceBetween from '@turf/distance';
import type { CustomStop } from '../types';

export interface NearestStopResult {
  stop: CustomStop;
  distanceMeters: number;
}

/**
 * Find the nearest custom stop to a given coordinate
 *
 * @param stops - Array of custom stops to search
 * @param lat - Latitude of the point to match
 * @param lon - Longitude of the point to match
 * @param maxDistanceMeters - Maximum search radius in meters
 * @returns The nearest stop and distance, or null if none within radius
 */
export function findNearestStop(
  stops: CustomStop[],
  lat: number,
  lon: number,
  maxDistanceMeters: number
): NearestStopResult | null {
  let nearestStop: CustomStop | null = null;
  let nearestDistance = Infinity;

  const point = [lon, lat]; // GeoJSON order: [lng, lat]

  for (const stop of stops) {
    const stopPoint = [stop.stop_lon, stop.stop_lat];
    const distanceKm = distanceBetween(point, stopPoint, { units: 'kilometers' });
    const distanceMeters = distanceKm * 1000;

    if (distanceMeters < nearestDistance && distanceMeters <= maxDistanceMeters) {
      nearestDistance = distanceMeters;
      nearestStop = stop;
    }
  }

  if (nearestStop) {
    return { stop: nearestStop, distanceMeters: nearestDistance };
  }

  return null;
}

/**
 * Calculate distance between two coordinates in meters
 */
export function distanceBetweenCoords(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const point1 = [lon1, lat1];
  const point2 = [lon2, lat2];
  const distanceKm = distanceBetween(point1, point2, { units: 'kilometers' });
  return distanceKm * 1000;
}

/**
 * Convert a string stop_id to a numeric ID for GTFS compatibility
 * Uses a hash function to generate a deterministic numeric ID
 */
export function stopIdToNumber(stopId: string): number {
  // If already numeric, parse and return
  const parsed = parseInt(stopId, 10);
  if (!isNaN(parsed) && String(parsed) === stopId) {
    return parsed;
  }

  // Hash the string to a number
  let hash = 0;
  for (let i = 0; i < stopId.length; i++) {
    const char = stopId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

export default { findNearestStop, stopIdToNumber, distanceBetweenCoords };
