import type { GeoJSONFeature, GeoJSONFeatureCollection, GTFSData, GTFSBuilders, GTFSOptions, GTFSStopTime, GTFSStop } from '../types';
import gtfsDefaultBuilders, { mergeNearbyStops } from './gtfsBuilders';
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

  const featuresArray: GeoJSONFeature[][] = Object.entries(features).map((element) => element[1].features);

  // Prepare config subset for builders
  const builderConfig = {
    useFrequencies: gtfsConfig.useFrequencies ?? true,
    frequencyHeadway: gtfsConfig.frequencyHeadway,
  };

  const agencies = agencyBuilder(featuresArray, {
    agency_timezone: gtfsConfig.agencyTimezone,
    agency_url: gtfsConfig.agencyUrl,
  });
  const calendar = calendarBuilder(featuresArray, gtfsConfig.defaultCalendar);
  const routes = routeBuilder(featuresArray);
  const fare = fareBuilder(featuresArray, gtfsConfig.defaultFares || { currencyType: 'USD' });
  const feeds = feedBuilder(gtfsConfig.feed || {
    publisherUrl: '',
    publisherName: '',
    lang: 'en',
    version: '1.0',
    contactEmail: '',
    contactUrl: '',
    startDate: '20000101',
    endDate: '21000101',
    id: '1',
  });
  const trips = tripBuilder(featuresArray, builderConfig);
  const frequencies = frequenciesBuilder(featuresArray, gtfsConfig.frequencyHeadway, builderConfig);
  let stops = stopsBuilder(
    featuresArray,
    inputStops,
    gtfsConfig.stopNameBuilder,
    gtfsConfig.stopsConfig ?? gtfsConfig.customStops
  );
  const shapePoints = shapesBuilder(featuresArray);
  let stopTimes = stopTimesBuilder(featuresArray, gtfsConfig.vehicleSpeed, builderConfig);

  // Post-process: merge nearby stops if configured
  if (gtfsConfig.mergeNearbyStops && gtfsConfig.mergeNearbyStops > 0) {
    const merged = mergeNearbyStops(stops, stopTimes, trips, gtfsConfig.mergeNearbyStops);
    stops = merged.stops;
    stopTimes = merged.stopTimes;
  }

  // Add route names list to each stop's stop_desc
  const tripToRoute: Map<number, string | number> = new Map();
  for (const trip of trips) {
    tripToRoute.set(trip.trip_id, trip.route_id);
  }
  const stopRoutes: Map<number | string, Set<string | number>> = new Map();
  for (const st of stopTimes) {
    const routeId = tripToRoute.get(st.trip_id);
    if (routeId === undefined) continue;
    if (!stopRoutes.has(st.stop_id)) {
      stopRoutes.set(st.stop_id, new Set());
    }
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

  // Merge segment intermediate stops: keep only endpoints where route sets are subset/superset
  const isSubsetOrEqual = (a: Set<string | number>, b: Set<string | number>): boolean => {
    if (a.size <= b.size) {
      for (const v of a) { if (!b.has(v)) return false; }
      return true;
    }
    for (const v of b) { if (!a.has(v)) return false; }
    return true;
  };

  const tripStopTimesMap: Map<number, GTFSStopTime[]> = new Map();
  for (const st of stopTimes) {
    if (!tripStopTimesMap.has(st.trip_id)) tripStopTimesMap.set(st.trip_id, []);
    tripStopTimesMap.get(st.trip_id)!.push(st);
  }
  // Save original ordered stops per trip (before merge) for gap-fill restoration
  const originalTripStops: Map<number, GTFSStopTime[]> = new Map();
  for (const [tripId, tripSts] of tripStopTimesMap) {
    tripSts.sort((a, b) => Number(a.stop_sequence) - Number(b.stop_sequence));
    originalTripStops.set(tripId, [...tripSts]);
  }

  const emptySet: Set<string | number> = new Set();
  const mergedStopTimes: GTFSStopTime[] = [];
  for (const [, tripSts] of tripStopTimesMap) {
    const kept: GTFSStopTime[] = [];
    let segStart = 0;

    for (let i = 1; i <= tripSts.length; i++) {
      const prevRoutes = stopRoutes.get(tripSts[i - 1].stop_id) ?? emptySet;
      const currRoutes = i < tripSts.length ? (stopRoutes.get(tripSts[i].stop_id) ?? emptySet) : null;

      const sameSegment = currRoutes !== null && isSubsetOrEqual(prevRoutes, currRoutes);

      if (!sameSegment || i === tripSts.length) {
        kept.push(tripSts[segStart]);
        if (i - 1 > segStart) kept.push(tripSts[i - 1]);
        segStart = i;
      }
    }

    for (let i = 0; i < kept.length; i++) {
      mergedStopTimes.push({ ...kept[i], stop_sequence: i });
    }
  }

  const beforeCount = stops.length;
  const stopById: Map<number | string, GTFSStop> = new Map();
  for (const stop of stops) {
    stopById.set(stop.stop_id, stop);
  }

  // Gap-fill: restore intermediate stops when distance between kept stops > threshold
  const gapThreshold = 500; // meters
  const gapFilledStopTimes: GTFSStopTime[] = [];
  // Group merged stop_times by trip
  const mergedByTrip: Map<number, GTFSStopTime[]> = new Map();
  for (const st of mergedStopTimes) {
    if (!mergedByTrip.has(st.trip_id)) mergedByTrip.set(st.trip_id, []);
    mergedByTrip.get(st.trip_id)!.push(st);
  }

  let restoredCount = 0;
  for (const [tripId, keptSts] of mergedByTrip) {
    keptSts.sort((a, b) => Number(a.stop_sequence) - Number(b.stop_sequence));
    const original = originalTripStops.get(tripId) ?? [];
    // Build index: stop_id → original index
    const origIndexOf: Map<number, number> = new Map();
    for (let i = 0; i < original.length; i++) {
      origIndexOf.set(original[i].stop_id, i);
    }

    const filled: GTFSStopTime[] = [];
    for (let k = 0; k < keptSts.length; k++) {
      filled.push(keptSts[k]);

      if (k < keptSts.length - 1) {
        const stopA = stopById.get(keptSts[k].stop_id);
        const stopB = stopById.get(keptSts[k + 1].stop_id);
        if (!stopA || !stopB) continue;

        const dist = distanceBetweenCoords(stopA.stop_lat, stopA.stop_lon, stopB.stop_lat, stopB.stop_lon);
        if (dist <= gapThreshold) continue;

        // Find original stops between these two
        const origIdxA = origIndexOf.get(keptSts[k].stop_id) ?? -1;
        const origIdxB = origIndexOf.get(keptSts[k + 1].stop_id) ?? -1;
        if (origIdxA < 0 || origIdxB < 0 || origIdxB <= origIdxA + 1) continue;

        const intermediates = original.slice(origIdxA + 1, origIdxB);
        if (intermediates.length === 0) continue;

        // How many stops to restore to keep gaps under threshold
        const needed = Math.ceil(dist / gapThreshold) - 1;
        let toRestore: GTFSStopTime[];
        if (needed >= intermediates.length) {
          toRestore = intermediates;
        } else {
          // Pick evenly spaced
          const step = intermediates.length / (needed + 1);
          toRestore = Array.from({ length: needed }, (_, i) =>
            intermediates[Math.round(step * (i + 1)) - 1]
          );
        }

        filled.push(...toRestore);
        restoredCount += toRestore.length;
      }
    }

    // Re-sequence
    for (let i = 0; i < filled.length; i++) {
      gapFilledStopTimes.push({ ...filled[i], stop_sequence: i });
    }
  }

  const survivingIds = new Set(gapFilledStopTimes.map(st => st.stop_id));
  stops = stops.filter(s => survivingIds.has(s.stop_id));
  stopTimes = gapFilledStopTimes;
  console.log(`Segment merge: ${beforeCount} → ${stops.length} stops (-${beforeCount - stops.length}) | restored ${restoredCount} for gap-fill (threshold: ${gapThreshold}m)`);

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
