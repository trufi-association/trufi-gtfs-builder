import { point } from '@turf/helpers';
import isEqual from '@turf/boolean-equal';
import routeExtractor from './route_extractor';
import extractor_error from './extractor_error';
import type { OSMData, OSMRelation, GeojsonToGtfsResult, GeoJSONFeatureCollection } from '../types';

export default function convertGeoJSON({
  routes,
  ways,
  stops,
  skipRoute,
}: OSMData & { skipRoute: (route: OSMRelation) => boolean }): GeojsonToGtfsResult {
  const mainStops: { [id: number]: string[] } = {};
  const geojson_features: { [key: string]: GeoJSONFeatureCollection } = {};
  const log_file: any[] = [];

  for (const key in routes) {
    const current_route = routes[key];

    try {
      if (!skipRoute(current_route))
        continue
        // throw {
        //   extractor_error: extractor_error.route_skipped,
        //   uri: `https://overpass-turbo.eu/?Q=${encodeURI(
        //     `//${extractor_error.route_skipped}\nrel(${current_route.id});out geom;`
        //   )}&R`,
        // };
      if (!current_route.tags['ref'])
        throw {
          extractor_error: extractor_error.no_ref_defined,
          uri: `https://overpass-turbo.eu/?Q=${encodeURI(
            `//${extractor_error.no_ref_defined}\nrel(${current_route.id});out geom;`
          )}&R`,
        };

      const data = routeExtractor(current_route, ways, stops);
      log_file.push({ id: current_route.id, tags: current_route.tags });

      const tmp_filter = filterPointsAndNodes(data.points, data.nodes);
      data.points = tmp_filter.points as any;
      data.nodes = tmp_filter.nodes;
      geojson_features[`${current_route.id}`] = {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: { ...current_route.tags, id: current_route.id },
            geometry: {
              type: 'LineString',
              coordinates: data.points as any,
              nodes: data.nodes,
            },
          } as any,
          ...data.routeStops.map((element) => {
            return {
              type: 'Feature' as const,
              properties: { ...element.tags, id: element.id },
              geometry: {
                type: 'Point' as const,
                coordinates: [element.lon, element.lat],
              },
            } as any;
          }),
        ],
      };

      // Merge stop names
      Object.keys(data.stops).forEach((stop_id) => {
        const stopIdNum = Number(stop_id);
        if (mainStops[stopIdNum]) {
          mainStops[stopIdNum] = mainStops[stopIdNum].concat(data.stops[stopIdNum]);
        } else {
          mainStops[stopIdNum] = data.stops[stopIdNum];
        }
      });
    } catch (error: any) {
      log_file.push({
        id: current_route.id,
        error: error.extractor_error ? error : `${error}`,
        tags: current_route.tags,
      });
    }
  }

  log_file.sort((a, b) => {
    let aRef = a.tags.ref || '0a';
    let bRef = b.tags.ref || '0a';
    let aIsNumber = !isNaN(aRef as any);
    let bIsNumber = !isNaN(bRef as any);
    if (aIsNumber && bIsNumber) {
      return parseInt(aRef) - parseInt(bRef);
    } else if (aIsNumber || bIsNumber) {
      return aIsNumber ? 1 : -1;
    } else {
      return aRef.localeCompare(bRef);
    }
  });

  const formatted_stops = filter_stops(mainStops);

  return {
    geojsonFeatures: geojson_features,
    stops: formatted_stops,
    log: log_file,
  };
}

function filter_stops(stops: { [id: number]: string[] }): { [id: number]: string[] } {
  const result: { [id: number]: string[] } = {};

  Object.keys(stops).forEach((stop_id) => {
    const stopIdNum = Number(stop_id);
    const stop_names = stops[stopIdNum];
    const stop_names_filtered = stop_names
      .filter((value, index, self) => self.indexOf(value) === index)
      .filter((value) => value !== '');

    result[stopIdNum] = stop_names_filtered;
  });

  return result;
}

function filterPointsAndNodes(
  points: number[][],
  nodes: number[]
): { points: number[][]; nodes: number[] } {
  const result: { points: number[][]; nodes: number[] } = { points: [], nodes: [] };
  let last: number[] | null = null;

  for (let i = 0; i < points.length; i++) {
    const cur = points[i];

    if (last && isEqual(point(last), point(cur))) {
      continue;
    }

    last = cur;
    result.points.push(cur);
    result.nodes.push(nodes[i]);
  }

  return result;
}
