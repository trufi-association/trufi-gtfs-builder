import type { OSMRelation, OSMWay, OSMNode, RouteExtractorResult } from '../types';
import extractor_error from './extractor_error';

const reverseWay = (current_way: OSMWay): void => {
  current_way.geometry = current_way.geometry.reverse();
  current_way.nodes = current_way.nodes.reverse();
};

// A way that is `oneway=yes` for general traffic may still be legally
// traversable in both directions for public transport when OSM marks the
// exception with `oneway:psv=no` or a mode-specific `oneway:<mode>=no`
// (e.g. `oneway:bus=no`). See:
//   https://wiki.openstreetmap.org/wiki/Key:oneway:bus
//   https://wiki.openstreetmap.org/wiki/Tag:oneway:psv=no
const isReversibleForRoute = (way: OSMWay, routeMode: string): boolean => {
  if (way.tags.oneway !== 'yes') return true;
  if (way.tags['oneway:psv'] === 'no') return true;
  if (routeMode && way.tags[`oneway:${routeMode}`] === 'no') return true;
  return false;
};

const normalizecurrentWay = (lastWay: OSMWay, currentWay: OSMWay, routeMode: string): boolean => {
  const checkConnection = (a: OSMWay, b: OSMWay): boolean => a.nodes[a.nodes.length - 1] === b.nodes[0];
  let response = checkConnection(lastWay, currentWay);
  if (!response && isReversibleForRoute(currentWay, routeMode)) {
    reverseWay(currentWay);
    response = checkConnection(lastWay, currentWay);
  }
  return response;
};

const checkFirstWay = (lastWay: OSMWay, currentWay: OSMWay, routeMode: string): boolean => {
  const checkConnection = (a: OSMWay, b: OSMWay): boolean => a.nodes[a.nodes.length - 1] === b.nodes[0];
  // a -> b == b -> c
  let response = checkConnection(lastWay, currentWay);
  if (response) return response;

  if (isReversibleForRoute(currentWay, routeMode)) {
    reverseWay(currentWay);
    // a -> b == c -> b
    response = checkConnection(lastWay, currentWay);
  }
  if (response) return response;

  if (isReversibleForRoute(lastWay, routeMode)) {
    reverseWay(lastWay);
    // b -> a == c -> b
    response = checkConnection(lastWay, currentWay);
  }
  if (response) return response;

  if (isReversibleForRoute(currentWay, routeMode)) {
    reverseWay(currentWay);
    // b -> a == b -> c
    response = checkConnection(lastWay, currentWay);
  }

  return response;
};

export default function routeExtractor(
  route_elements: OSMRelation,
  ways: { [id: number]: OSMWay },
  stops: { [id: number]: OSMNode }
): RouteExtractorResult {
  const routeWays: OSMWay[] = [];
  const routeStops: OSMNode[] = [];
  for (const element of route_elements.members) {
    if (element.type === 'way' && !element.role) {
      const current_way = ways[element.ref];
      if (current_way == null) {
        throw {
          extractor_error: extractor_error.way_not_exist,
          uri: `https://overpass-turbo.eu/?Q=${encodeURI(
            `//${extractor_error.way_not_exist}\nrel(${route_elements.id});out geom;way(${element.ref});out geom;`
          )}&R`,
        };
      }
      routeWays.push({
        type: 'way',
        id: current_way.id,
        tags: { ...current_way.tags },
        info: { ...current_way.info },
        nodes: [...current_way.nodes],
        geometry: [...current_way.geometry],
      });
    } else if (element.type === 'node') {
      const currentStop = stops[element.ref];
      if (currentStop && currentStop.tags) {
        const pt = currentStop.tags['public_transport'];
        if (pt === 'stop_position' || pt === 'platform') {
          routeStops.push(currentStop);
        }
      }
    }
  }
  if (routeWays.length === 0) {
    throw {
      extractor_error: extractor_error.route_with_empty_ways,
      uri: `https://overpass-turbo.eu/?Q=${encodeURI(
        `//${extractor_error.route_with_empty_ways}\nrel(${route_elements.id});out geom;`
      )}&R`,
    };
  }

  const routeMode = route_elements.tags.route || '';
  for (let index = 1; index < routeWays.length; index++) {
    const lastWay = routeWays[index - 1];
    const currentWay = routeWays[index];
    const checkCurrentWay = index === 1
      ? checkFirstWay(lastWay, currentWay, routeMode)
      : normalizecurrentWay(lastWay, currentWay, routeMode);
    if (!checkCurrentWay) {
      throw {
        extractor_error: extractor_error.not_next,
        uri: `https://overpass-turbo.eu/?Q=${encodeURI(
          `//${extractor_error.not_next}\nrel(${route_elements.id});out geom;\nway(${lastWay.id});out geom;\nway(${currentWay.id});out geom;`
        )}&R`,
      };
    }
  }

  let tmp_nodes: number[] = [];
  let tmp_stops: { [id: number]: string[] } = {};
  let tmp_pointss: number[][] = [];
  routeWays.forEach((element) => {
    for (const node_id of element.nodes) {
      const stop_id = Number(node_id);
      const stop_name = (element.tags && element.tags.name) || '';

      if (!tmp_stops[stop_id]) {
        tmp_stops[stop_id] = [stop_name];
      } else {
        tmp_stops[stop_id].push(stop_name);
      }
    }
    tmp_nodes = tmp_nodes.concat(element.nodes);
    tmp_pointss = tmp_pointss.concat(element.geometry.map((point) => [point.lon, point.lat]));
  });
  return {
    nodes: tmp_nodes,
    stops: tmp_stops,
    points: tmp_pointss as any,
    routeStops,
  };
}
