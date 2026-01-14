"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadCustomStops = loadCustomStops;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
/**
 * Load custom stops from a GeoJSON file
 *
 * Expected format:
 * {
 *   "type": "FeatureCollection",
 *   "features": [
 *     {
 *       "type": "Feature",
 *       "properties": {
 *         "stop_id": "STOP001",
 *         "stop_name": "Station Name"
 *       },
 *       "geometry": {
 *         "type": "Point",
 *         "coordinates": [longitude, latitude]
 *       }
 *     }
 *   ]
 * }
 */
function loadCustomStops(filePath) {
    const absolutePath = path.resolve(filePath);
    if (!fs.existsSync(absolutePath)) {
        throw new Error(`Custom stops file not found: ${absolutePath}`);
    }
    const content = fs.readFileSync(absolutePath, 'utf-8');
    let geojson;
    try {
        geojson = JSON.parse(content);
    }
    catch (e) {
        throw new Error(`Invalid JSON in custom stops file: ${e.message}`);
    }
    if (geojson.type !== 'FeatureCollection' || !Array.isArray(geojson.features)) {
        throw new Error('Custom stops file must be a GeoJSON FeatureCollection');
    }
    const stops = [];
    for (let i = 0; i < geojson.features.length; i++) {
        const feature = geojson.features[i];
        const featureIndex = i + 1;
        if (feature.type !== 'Feature') {
            throw new Error(`Feature ${featureIndex}: type must be "Feature"`);
        }
        if (!feature.geometry || feature.geometry.type !== 'Point') {
            throw new Error(`Feature ${featureIndex}: geometry must be of type "Point"`);
        }
        if (!Array.isArray(feature.geometry.coordinates) || feature.geometry.coordinates.length < 2) {
            throw new Error(`Feature ${featureIndex}: geometry.coordinates must be [longitude, latitude]`);
        }
        if (!feature.properties?.stop_id) {
            throw new Error(`Feature ${featureIndex}: properties.stop_id is required`);
        }
        const [lon, lat] = feature.geometry.coordinates;
        if (typeof lat !== 'number' || lat < -90 || lat > 90) {
            throw new Error(`Feature ${featureIndex}: invalid latitude ${lat}`);
        }
        if (typeof lon !== 'number' || lon < -180 || lon > 180) {
            throw new Error(`Feature ${featureIndex}: invalid longitude ${lon}`);
        }
        stops.push({
            stop_id: String(feature.properties.stop_id),
            stop_name: feature.properties.stop_name || 'unnamed',
            stop_lon: lon,
            stop_lat: lat,
        });
    }
    console.log(`Loaded ${stops.length} custom stops from ${filePath}`);
    return stops;
}
exports.default = { loadCustomStops };
//# sourceMappingURL=customStopsLoader.js.map