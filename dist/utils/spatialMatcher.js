"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.findNearestStop = findNearestStop;
exports.distanceBetweenCoords = distanceBetweenCoords;
exports.stopIdToNumber = stopIdToNumber;
const distance_1 = __importDefault(require("@turf/distance"));
/**
 * Find the nearest custom stop to a given coordinate
 *
 * @param stops - Array of custom stops to search
 * @param lat - Latitude of the point to match
 * @param lon - Longitude of the point to match
 * @param maxDistanceMeters - Maximum search radius in meters
 * @returns The nearest stop and distance, or null if none within radius
 */
function findNearestStop(stops, lat, lon, maxDistanceMeters) {
    let nearestStop = null;
    let nearestDistance = Infinity;
    const point = [lon, lat]; // GeoJSON order: [lng, lat]
    for (const stop of stops) {
        const stopPoint = [stop.stop_lon, stop.stop_lat];
        const distanceKm = (0, distance_1.default)(point, stopPoint, { units: 'kilometers' });
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
function distanceBetweenCoords(lat1, lon1, lat2, lon2) {
    const point1 = [lon1, lat1];
    const point2 = [lon2, lat2];
    const distanceKm = (0, distance_1.default)(point1, point2, { units: 'kilometers' });
    return distanceKm * 1000;
}
/**
 * Convert a string stop_id to a numeric ID for GTFS compatibility
 * Uses a hash function to generate a deterministic numeric ID
 */
function stopIdToNumber(stopId) {
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
exports.default = { findNearestStop, stopIdToNumber, distanceBetweenCoords };
//# sourceMappingURL=spatialMatcher.js.map