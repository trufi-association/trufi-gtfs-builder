import type {
  GeoJSONFeature,
  GeoJSONFeatureCollection,
  GTFSData,
  GTFSBuilders,
  GTFSOptions,
  StopsConfigResolver,
} from '../types';
import gtfsDefaultBuilders from './gtfsBuilders';
import { distanceBetweenCoords } from '../utils/spatialMatcher';

function geojsonToGtfs(
  features: { [key: string]: GeoJSONFeatureCollection },
  inputStops: { [id: number]: string[] },
  gtfsConfig: GTFSOptions,
  gtfsBuilders: GTFSBuilders
): GTFSData {
  const {
    agencyBuilder,
    calendarBuilder,
    routeBuilder,
    fareBuilder,
    feedBuilder,
    tripBuilder,
    frequenciesBuilder,
    stopsBuilder,
    shapesBuilder,
    stopTimesBuilder,
  } = gtfsBuilders;

  const featuresArray: GeoJSONFeature[][] = Object.entries(features).map(
    (element) => element[1].features,
  );

  const builderConfig = {
    useFrequencies: gtfsConfig.useFrequencies ?? true,
    frequencyHeadway: gtfsConfig.frequencyHeadway,
  };

  const stopsConfig: StopsConfigResolver = gtfsConfig.stopsConfig;

  const agencies = agencyBuilder(featuresArray, {
    agency_timezone: gtfsConfig.agencyTimezone,
    agency_url: gtfsConfig.agencyUrl,
  });
  const calendar = calendarBuilder(featuresArray, gtfsConfig.defaultCalendar);
  const routes = routeBuilder(featuresArray, {
    routePerRelation: gtfsConfig.routePerRelation ?? false,
  });
  const fare = fareBuilder(
    featuresArray,
    gtfsConfig.defaultFares || { currencyType: 'USD' },
  );
  const feeds = feedBuilder(
    gtfsConfig.feed || {
      publisherUrl: '',
      publisherName: '',
      lang: 'en',
      version: '1.0',
      contactEmail: '',
      contactUrl: '',
      startDate: '20000101',
      endDate: '21000101',
      id: '1',
    },
  );
  const trips = tripBuilder(featuresArray, builderConfig);
  const frequencies = frequenciesBuilder(
    featuresArray,
    gtfsConfig.frequencyHeadway,
    builderConfig,
  );
  let stops = stopsBuilder(
    featuresArray,
    inputStops,
    gtfsConfig.stopNameBuilder,
    stopsConfig,
  );
  const shapePoints = shapesBuilder(featuresArray);

  // ──────────────────────────────────────────────────────────────────────
  // Robust ordering: finalize each route's stop list (segment-merge +
  // gap-fill) BEFORE deriving stop_times. Times are then computed ONCE,
  // directly from the final list, so they are monotonic by construction —
  // no recompute, no stale times dragged through a reorder.
  //
  // This is what previously broke OTP 2.x on loop routes: stop_times were
  // computed first and then the gap-fill reinserted a stop out of travel
  // order (a stop visited twice was looked up by stop_id, which is
  // ambiguous), so an arrival_time went backwards. Working on the stop list
  // first removes that whole class of bug.
  // ──────────────────────────────────────────────────────────────────────

  // stop_id → set of route_ids, taken from each route's (pre-merge) stop list.
  const stopRoutes: Map<number | string, Set<string | number>> = new Map();
  for (const feature of featuresArray) {
    const mf = feature[0];
    const routeId = mf.gtfs?.route_id;
    const fs = mf.gtfs?.filteredStops;
    if (routeId === undefined || !fs) continue;
    for (const node of fs.nodes) {
      if (!stopRoutes.has(node)) stopRoutes.set(node, new Set());
      stopRoutes.get(node)!.add(routeId);
    }
  }

  // User-facing stop_desc (e.g. "5(1-2-3-4-5)").
  for (const stop of stops) {
    const routeIds = stopRoutes.get(stop.stop_id);
    if (routeIds && routeIds.size > 0) {
      const ids = Array.from(routeIds).sort().join('-');
      stop.stop_desc = `${routeIds.size}(${ids})`;
    } else {
      stop.stop_desc = '0()';
    }
  }

  const isSubsetOrEqual = (
    a: Set<string | number>,
    b: Set<string | number>,
  ): boolean => {
    if (a.size <= b.size) {
      for (const v of a) if (!b.has(v)) return false;
      return true;
    }
    for (const v of b) if (!a.has(v)) return false;
    return true;
  };

  // Segment-merge + gap-fill, applied to the STOP LIST of each fakeStops
  // route. osmStops / customStops routes keep their stop list untouched.
  const gapThreshold = gtfsConfig.fakeStopsGapThreshold ?? 100;
  const emptySet: Set<string | number> = new Set();
  let beforeKeptCount = 0;
  let afterKeptCount = 0;
  let restoredCount = 0;

  for (const feature of featuresArray) {
    const mf = feature[0];
    const fs = mf.gtfs?.filteredStops;
    if (!fs || stopsConfig(mf).mode !== 'fakeStops') continue;

    const nodes = fs.nodes;
    const coords = fs.coordinates;
    beforeKeptCount += nodes.length;

    // Step 1: segment-merge — keep only the endpoints of each run of stops
    // whose route sets form a subset/superset relationship. `kept` holds
    // indices into `nodes`, so a stop visited twice keeps its real position.
    const kept: number[] = [];
    let segStart = 0;
    for (let i = 1; i <= nodes.length; i++) {
      const prevRoutes = stopRoutes.get(nodes[i - 1]) ?? emptySet;
      const currRoutes =
        i < nodes.length ? (stopRoutes.get(nodes[i]) ?? emptySet) : null;
      const sameSegment =
        currRoutes !== null && isSubsetOrEqual(prevRoutes, currRoutes);
      if (!sameSegment || i === nodes.length) {
        kept.push(segStart);
        if (i - 1 > segStart) kept.push(i - 1);
        segStart = i;
      }
    }

    // Step 2: gap-fill — when two kept stops are farther apart than
    // `gapThreshold`, restore evenly-spaced intermediates, picked by their
    // ORIGINAL index so the sequence stays in travel order (this is the fix
    // for loop routes). Deterministic given the same nodes/boundaries, so
    // routes sharing a segment restore the same stop ids (shared transfers).
    const filledIdx: number[] = [];
    for (let k = 0; k < kept.length; k++) {
      const a = kept[k];
      filledIdx.push(a);
      if (k < kept.length - 1) {
        const b = kept[k + 1];
        const ca = coords[a];
        const cb = coords[b];
        const dist = distanceBetweenCoords(ca[1], ca[0], cb[1], cb[0]);
        if (dist <= gapThreshold) continue;
        const interCount = b - a - 1;
        if (interCount <= 0) continue;
        const needed = Math.ceil(dist / gapThreshold) - 1;
        if (needed >= interCount) {
          for (let j = a + 1; j < b; j++) filledIdx.push(j);
          restoredCount += interCount;
        } else {
          for (let n = 0; n < needed; n++) {
            filledIdx.push(
              a + Math.round((interCount / (needed + 1)) * (n + 1)),
            );
          }
          restoredCount += needed;
        }
      }
    }

    // Replace the route's stop list with the merged + gap-filled one.
    fs.nodes = filledIdx.map((i) => nodes[i]);
    fs.coordinates = filledIdx.map((i) => coords[i]);
    afterKeptCount += filledIdx.length;
  }

  console.log(
    `Segment merge: ${beforeKeptCount} → ${afterKeptCount} stops across fakeStops routes ` +
      `(restored ${restoredCount} via gap-fill, threshold ${gapThreshold}m)`,
  );

  // Derive stop_times ONCE, directly from the finalized per-route stop lists.
  const stopTimes = stopTimesBuilder(
    featuresArray,
    gtfsConfig.vehicleSpeed,
    builderConfig,
  );

  // Drop stops no longer referenced by any trip.
  const survivingIds = new Set(stopTimes.map((st) => st.stop_id));
  stops = stops.filter((s) => survivingIds.has(s.stop_id));

  return {
    agency: agencies,
    calendar: calendar,
    routes: routes,
    trips: trips,
    frequencies: frequencies,
    stops: stops,
    stop_times: stopTimes,
    shapes: shapePoints,
    fare_attributes: fare.attributes,
    fare_rules: fare.rules,
    feed_info: feeds,
  };
}

export default geojsonToGtfs;
export { gtfsDefaultBuilders };
