import type { CustomStop } from '../types';
export interface NearestStopResult {
    stop: CustomStop;
    distanceMeters: number;
}
export declare function findNearestStop(stops: CustomStop[], lat: number, lon: number, maxDistanceMeters: number): NearestStopResult | null;
export declare function printPM89Debug(): void;
/**
 * Calculate distance between two coordinates in meters
 */
export declare function distanceBetweenCoords(lat1: number, lon1: number, lat2: number, lon2: number): number;
/**
 * Convert a string stop_id to a numeric ID for GTFS compatibility
 * Uses a hash function to generate a deterministic numeric ID
 */
export declare function stopIdToNumber(stopId: string): number;
/**
 * Determine if a point is on the right side of a directed line segment.
 * Uses the cross product to determine which side of the line the point is on.
 *
 * @param lineStart - Start point of the line segment [lon, lat]
 * @param lineEnd - End point of the line segment [lon, lat]
 * @param point - The point to check [lon, lat]
 * @returns true if point is on the right side, false if on the left or exactly on the line
 */
export declare function isPointOnRightSide(lineStart: [number, number], lineEnd: [number, number], point: [number, number]): boolean;
declare const _default: {
    findNearestStop: typeof findNearestStop;
    stopIdToNumber: typeof stopIdToNumber;
    distanceBetweenCoords: typeof distanceBetweenCoords;
    isPointOnRightSide: typeof isPointOnRightSide;
};
export default _default;
//# sourceMappingURL=spatialMatcher.d.ts.map