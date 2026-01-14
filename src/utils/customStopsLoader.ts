import * as fs from 'fs';
import * as path from 'path';
import type { CustomStop } from '../types';

interface GeoJSONPointFeature {
  type: 'Feature';
  properties: {
    stop_id?: string | number;
    stop_name?: string;
    [key: string]: any;
  };
  geometry: {
    type: string;
    coordinates: [number, number];
  };
}

interface GeoJSONFeatureCollection {
  type: 'FeatureCollection';
  features: GeoJSONPointFeature[];
}

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
export function loadCustomStops(filePath: string): CustomStop[] {
  const absolutePath = path.resolve(filePath);

  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Custom stops file not found: ${absolutePath}`);
  }

  const content = fs.readFileSync(absolutePath, 'utf-8');
  let geojson: GeoJSONFeatureCollection;

  try {
    geojson = JSON.parse(content);
  } catch (e) {
    throw new Error(`Invalid JSON in custom stops file: ${(e as Error).message}`);
  }

  if (geojson.type !== 'FeatureCollection' || !Array.isArray(geojson.features)) {
    throw new Error('Custom stops file must be a GeoJSON FeatureCollection');
  }

  const stops: CustomStop[] = [];

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

export default { loadCustomStops };
