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

/**
 * Determine if a point is on the right side of a directed line segment.
 * Uses the cross product to determine which side of the line the point is on.
 *
 * @param lineStart - Start point of the line segment [lon, lat]
 * @param lineEnd - End point of the line segment [lon, lat]
 * @param point - The point to check [lon, lat]
 * @returns true if point is on the right side, false if on the left or exactly on the line
 */
export function isPointOnRightSide(
  lineStart: [number, number],
  lineEnd: [number, number],
  point: [number, number]
): boolean {
  // Vector from lineStart to lineEnd
  const dx = lineEnd[0] - lineStart[0];
  const dy = lineEnd[1] - lineStart[1];

  // Vector from lineStart to point
  const px = point[0] - lineStart[0];
  const py = point[1] - lineStart[1];

  // Cross product: if negative, point is on the right side
  // (In a coordinate system where Y increases upward, negative cross product = right side)
  // For lat/lon where lat increases northward, this holds true
  const crossProduct = dx * py - dy * px;

  return crossProduct < 0;
}

export default { findNearestStop, stopIdToNumber, distanceBetweenCoords, isPointOnRightSide };
