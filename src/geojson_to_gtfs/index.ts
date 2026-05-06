import type {
  GeoJSONFeature,
  GeoJSONFeatureCollection,
  GTFSData,
  GTFSBuilders,
  GTFSOptions,
  GTFSStopTime,
  GTFSStop,
  GTFSTrip,
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
  const routes = routeBuilder(featuresArray);
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
  let stopTimes = stopTimesBuilder(
    featuresArray,
    gtfsConfig.vehicleSpeed,
    builderConfig,
  );

  // Build a stop_id → set of route_ids index. Used both for the
  // user-facing `stop_desc` (e.g. "5(1-2-3-4-5)") and for the
  // segment-merge that follows.
  const tripToRoute: Map<number, string | number> = new Map();
  for (const trip of trips) {
    tripToRoute.set(trip.trip_id, trip.route_id);
  }
  const stopRoutes: Map<number | string, Set<string | number>> = new Map();
  for (const st of stopTimes) {
    const routeId = tripToRoute.get(st.trip_id);
    if (routeId === undefined) continue;
    if (!stopRoutes.has(st.stop_id)) stopRoutes.set(st.stop_id, new Set());
    stopRoutes.get(st.stop_id)!.add(routeId);
  }
  for (const stop of stops) {
    const routeIds = stopRoutes.get(stop.stop_id);
    if (routeIds && routeIds.size > 0) {
      const ids = Array.from(routeIds).sort().join('-');
      stop.stop_desc = `${routeIds.size}(${ids})`;
    } else {
      stop.stop_desc = '0()';
    }
  }

  // Build trip_id → route feature lookup so the segment-merge can ask
  // each trip's stops config (only fakeStops trips get post-processed).
  const featureByRouteId: Map<string | number, GeoJSONFeature> = new Map();
  for (const feature of featuresArray) {
    const f = feature[0];
    if (f.gtfs?.route_id !== undefined) {
      featureByRouteId.set(f.gtfs.route_id, f);
    }
  }
  const featureByTripId: Map<number, GeoJSONFeature> = new Map();
  for (const trip of trips) {
    const f = featureByRouteId.get(trip.route_id);
    if (f) featureByTripId.set(trip.trip_id, f);
  }
  const isFakeStopsTrip = (tripId: number): boolean => {
    const f = featureByTripId.get(tripId);
    if (!f) return false;
    return stopsConfig(f).mode === 'fakeStops';
  };

  // Group stop_times by trip so we can process each trip independently.
  const tripStopTimesMap: Map<number, GTFSStopTime[]> = new Map();
  for (const st of stopTimes) {
    if (!tripStopTimesMap.has(st.trip_id)) tripStopTimesMap.set(st.trip_id, []);
    tripStopTimesMap.get(st.trip_id)!.push(st);
  }
  for (const [, tripSts] of tripStopTimesMap) {
    tripSts.sort((a, b) => Number(a.stop_sequence) - Number(b.stop_sequence));
  }

  // Quick exit: if no trip is in fakeStops mode, the segment-merge has
  // nothing to do. Pass through unchanged.
  const anyFakeStops = Array.from(tripStopTimesMap.keys()).some(isFakeStopsTrip);
  if (!anyFakeStops) {
    console.log('Segment merge: skipped (no fakeStops trips)');
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

  // Per-trip segment-merge + gap-fill, applied only to fakeStops trips.
  // Other trips pass through with their stop_times intact, so a feed
  // can mix modes safely.
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

  const gapThreshold = gtfsConfig.fakeStopsGapThreshold ?? 100;
  const stopById: Map<number | string, GTFSStop> = new Map();
  for (const stop of stops) stopById.set(stop.stop_id, stop);

  const emptySet: Set<string | number> = new Set();
  const finalStopTimes: GTFSStopTime[] = [];
  let beforeKeptCount = 0;
  let afterKeptCount = 0;
  let restoredCount = 0;

  for (const [tripId, tripSts] of tripStopTimesMap) {
    if (!isFakeStopsTrip(tripId)) {
      // osmStops / customStops trip: keep stop_times unchanged.
      for (const st of tripSts) finalStopTimes.push(st);
      continue;
    }

    beforeKeptCount += tripSts.length;

    // Step 1: segment-merge — group consecutive stops whose route sets
    // form a subset/superset relationship; keep only segment endpoints.
    const kept: GTFSStopTime[] = [];
    let segStart = 0;
    for (let i = 1; i <= tripSts.length; i++) {
      const prevRoutes = stopRoutes.get(tripSts[i - 1].stop_id) ?? emptySet;
      const currRoutes =
        i < tripSts.length ? (stopRoutes.get(tripSts[i].stop_id) ?? emptySet) : null;
      const sameSegment =
        currRoutes !== null && isSubsetOrEqual(prevRoutes, currRoutes);
      if (!sameSegment || i === tripSts.length) {
        kept.push(tripSts[segStart]);
        if (i - 1 > segStart) kept.push(tripSts[i - 1]);
        segStart = i;
      }
    }

    // Step 2: gap-fill — when two kept stops are farther apart than
    // `gapThreshold`, restore evenly-spaced intermediates from the
    // pre-merge sequence so density stays bounded. The pick is
    // deterministic given the same intermediates list, so trips that
    // share a segment (and therefore see the same intermediates and
    // boundaries) land on the same restored stop ids — necessary for
    // shared transfers.
    const origIndexOf: Map<number, number> = new Map();
    for (let i = 0; i < tripSts.length; i++) {
      origIndexOf.set(tripSts[i].stop_id, i);
    }
    const filled: GTFSStopTime[] = [];
    for (let k = 0; k < kept.length; k++) {
      filled.push(kept[k]);
      if (k < kept.length - 1) {
        const stopA = stopById.get(kept[k].stop_id);
        const stopB = stopById.get(kept[k + 1].stop_id);
        if (!stopA || !stopB) continue;
        const dist = distanceBetweenCoords(
          stopA.stop_lat,
          stopA.stop_lon,
          stopB.stop_lat,
          stopB.stop_lon,
        );
        if (dist <= gapThreshold) continue;
        const origIdxA = origIndexOf.get(kept[k].stop_id) ?? -1;
        const origIdxB = origIndexOf.get(kept[k + 1].stop_id) ?? -1;
        if (origIdxA < 0 || origIdxB < 0 || origIdxB <= origIdxA + 1) continue;
        const intermediates = tripSts.slice(origIdxA + 1, origIdxB);
        if (intermediates.length === 0) continue;
        const needed = Math.ceil(dist / gapThreshold) - 1;
        const toRestore =
          needed >= intermediates.length
            ? intermediates
            : Array.from(
                { length: needed },
                (_, i) =>
                  intermediates[
                    Math.round((intermediates.length / (needed + 1)) * (i + 1)) - 1
                  ],
              );
        filled.push(...toRestore);
        restoredCount += toRestore.length;
      }
    }

    // Re-sequence and emit.
    for (let i = 0; i < filled.length; i++) {
      finalStopTimes.push({ ...filled[i], stop_sequence: i });
    }
    afterKeptCount += filled.length;
  }

  const survivingIds = new Set(finalStopTimes.map((st) => st.stop_id));
  stops = stops.filter((s) => survivingIds.has(s.stop_id));
  stopTimes = finalStopTimes;
  console.log(
    `Segment merge: ${beforeKeptCount} → ${afterKeptCount} stop_times across fakeStops trips ` +
      `(restored ${restoredCount} via gap-fill, threshold ${gapThreshold}m)`,
  );

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
