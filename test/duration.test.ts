import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import distanceBetween from '@turf/distance';
import { stopTimesBuilder } from '../src/geojson_to_gtfs/gtfsBuilders';
import {
  DEFAULT_VEHICLE_SPEED_KMH,
  MIN_PLAUSIBLE_SPEED_KMH,
  maxPlausibleSpeedKmh,
  parseOsmDuration,
  resolveTripDuration,
  stopOffsetsSeconds,
} from '../src/geojson_to_gtfs/duration';
import type { GeoJSONFeature, GeoJSONCoordinate } from '../src/types';

/** Collect `console.warn` output while `fn` runs. */
function withWarnings<T>(fn: () => T): { result: T; warnings: string[] } {
  const warnings: string[] = [];
  const original = console.warn;
  console.warn = (...args: unknown[]) => warnings.push(args.map(String).join(' '));
  try {
    return { result: fn(), warnings };
  } finally {
    console.warn = original;
  }
}

/** Four stops on the equator, 0.01° (≈ 1113 m) apart: three equal segments. */
const EQUAL_STOPS: GeoJSONCoordinate[] = [[0, 0], [0.01, 0], [0.02, 0], [0.03, 0]] as GeoJSONCoordinate[];
/** Unequal segments: ≈ 1113 m, ≈ 3340 m, ≈ 557 m. */
const UNEQUAL_STOPS: GeoJSONCoordinate[] = [[0, 0], [0.01, 0], [0.04, 0], [0.045, 0]] as GeoJSONCoordinate[];

function metersBetween(a: GeoJSONCoordinate, b: GeoJSONCoordinate): number {
  return distanceBetween(a, b, { units: 'kilometers' }) * 1000;
}

/** A route relation as `stopTimesBuilder` sees it after `stopsBuilder` ran. */
function relation(
  id: number,
  tags: Record<string, any>,
  coordinates: GeoJSONCoordinate[],
  services: any[] = [{ service_id: 'all', startTime: '06:00', endTime: '22:00', trip_id: id }],
): GeoJSONFeature[] {
  const feature: any = {
    type: 'Feature',
    properties: { route: 'bus', ...tags, id },
    geometry: { type: 'LineString', coordinates },
    gtfs: {
      agency_id: 0,
      route_id: 0,
      services,
      filteredStops: { nodes: coordinates.map((_, i) => 100 + i), coordinates },
    },
  };
  return [feature];
}

function hms(time: string): number {
  const [h, m, s] = time.split(':').map(Number);
  return h * 3600 + m * 60 + s;
}

describe('parseOsmDuration', () => {
  it('parses the wiki forms hh:mm, h:mm and hh:mm:ss', () => {
    assert.equal(parseOsmDuration('00:32'), 32 * 60);
    assert.equal(parseOsmDuration('0:32'), 32 * 60);
    assert.equal(parseOsmDuration('01:15'), 75 * 60);
    assert.equal(parseOsmDuration('00:32:00'), 32 * 60);
    assert.equal(parseOsmDuration('00:32:30'), 32 * 60 + 30);
    assert.equal(parseOsmDuration('1:05:09'), 3600 + 5 * 60 + 9);
    assert.equal(parseOsmDuration('100:00'), 100 * 3600); // long ferry routes
    assert.equal(parseOsmDuration(' 00:51 '), 51 * 60);
  });

  it('reads a bare integer as minutes', () => {
    assert.equal(parseOsmDuration('32'), 32 * 60);
    assert.equal(parseOsmDuration('2'), 120);
    assert.equal(parseOsmDuration('0'), 0);
  });

  it('accepts ISO 8601 durations', () => {
    assert.equal(parseOsmDuration('PT45M'), 45 * 60);
    assert.equal(parseOsmDuration('PT1H30M'), 90 * 60);
    assert.equal(parseOsmDuration('PT1H'), 3600);
    assert.equal(parseOsmDuration('P1DT2H'), 26 * 3600);
    assert.equal(parseOsmDuration('PT90S'), 90);
  });

  it('rejects malformed values, and anything that is not a string', () => {
    // OSM readers (PBF and Overpass) deliver every tag as a string; a number
    // can only come from a hand-built feature, and is not parsed.
    for (const bad of [
      '', ' ', 'abc', '00:60', '1:5', '12:', ':30', '-5', '1.5', '30 min', '1h30', '00:45;01:00',
      '02:00:00:00', 'P', 'PT', 'PT1.5H', null, undefined, 0, 45, 1.5, NaN, -1, Infinity, {}, [],
    ]) {
      assert.equal(parseOsmDuration(bad), undefined, `should reject ${JSON.stringify(bad)}`);
    }
  });
});

describe('stopOffsetsSeconds', () => {
  it('spreads the duration in proportion to distance and lands exactly on it', () => {
    assert.deepEqual(stopOffsetsSeconds([0, 1000, 3000, 500], 4500, 40), [0, 1000, 4000, 4500]);
  });

  it('rounds cumulatively: never decreasing, last stop exact', () => {
    const segments = [0, 333, 333, 334, 1, 1, 1, 998];
    const offsets = stopOffsetsSeconds(segments, 1000, 40);
    assert.equal(offsets[0], 0);
    assert.equal(offsets[offsets.length - 1], 1000);
    for (let i = 1; i < offsets.length; i++) {
      assert.ok(offsets[i] >= offsets[i - 1], `offset ${i} decreased`);
      assert.ok(Number.isInteger(offsets[i]));
    }
    // Sum of the rounded segments equals the total (no drift).
    assert.equal(offsets[offsets.length - 1], 1000);
  });

  it('gives every stop offset 0 when the route has no length', () => {
    assert.deepEqual(stopOffsetsSeconds([0, 0, 0], 600, 40), [0, 0, 0]);
    assert.deepEqual(stopOffsetsSeconds([0, 0, 0], undefined, 40), [0, 0, 0]);
  });

  it('falls back to ceil(distance / speed) per segment — the historical formula', () => {
    // 40 km/h = 11.11 m/s: 1000 m → 90.00000000000001 s → ceil 91, 3000 m → 271, 500 m → 46.
    // (The float artefact is part of the historical output and is kept on purpose.)
    assert.deepEqual(stopOffsetsSeconds([0, 1000, 3000, 500], undefined, 40), [0, 91, 362, 408]);
    // Every non-empty segment costs at least one second, so times strictly increase.
    assert.deepEqual(stopOffsetsSeconds([0, 1, 1], undefined, 40), [0, 1, 2]);
  });
});

describe('resolveTripDuration', () => {
  const bus = (tags: Record<string, any>) => relation(1, tags, EQUAL_STOPS)[0];
  const length = 3 * metersBetween(EQUAL_STOPS[0], EQUAL_STOPS[1]); // ≈ 3340 m

  it('uses the relation duration when it is present and plausible', () => {
    const { result, warnings } = withWarnings(() => resolveTripDuration(bus({ duration: '00:15' }), length));
    assert.deepEqual(result, { seconds: 900, source: 'osm' });
    assert.deepEqual(warnings, []);
  });

  it('returns undefined (→ vehicleSpeed) when the relation has no duration', () => {
    const { result, warnings } = withWarnings(() => resolveTripDuration(bus({}), length));
    assert.equal(result, undefined);
    assert.deepEqual(warnings, []);
  });

  it('warns and falls back on a malformed duration', () => {
    const { result, warnings } = withWarnings(() => resolveTripDuration(bus({ duration: '45 min' }), length));
    assert.equal(result, undefined);
    assert.equal(warnings.length, 1);
    assert.match(warnings[0], /duration="45 min" on https:\/\/www\.osm\.org\/relation\/1 is not a valid OSM duration/);
    assert.match(warnings[0], /vehicleSpeed/);
  });

  it('warns and falls back on a zero duration', () => {
    const { result, warnings } = withWarnings(() => resolveTripDuration(bus({ duration: '00:00' }), length));
    assert.equal(result, undefined);
    assert.match(warnings[0], /not a positive running time/);
  });

  it('warns and falls back when the duration implies less than 3 km/h (Teleférico duration=02:00 over 760 m)', () => {
    const { result, warnings } = withWarnings(() =>
      resolveTripDuration(bus({ route: 'aerialway', duration: '02:00' }), 760),
    );
    assert.equal(result, undefined);
    assert.equal(warnings.length, 1);
    assert.match(warnings[0], /duration="02:00" on https:\/\/www\.osm\.org\/relation\/1 implies 0\.4 km\/h over 0\.76 km/);
    assert.match(warnings[0], /plausible: 3–50 km\/h for route=aerialway/);
  });

  it('warns and falls back when the duration implies more than the mode maximum', () => {
    // 3.34 km in one minute = 200 km/h > 150 km/h for buses.
    const tooFast = withWarnings(() => resolveTripDuration(bus({ duration: '1' }), length));
    assert.equal(tooFast.result, undefined);
    assert.match(tooFast.warnings[0], /implies 200\.\d km\/h/);
    assert.match(tooFast.warnings[0], /plausible: 3–150 km\/h for route=bus/);
    // Light rail caps at 100 km/h: 3.34 km in 2 minutes is 100.2 km/h.
    const rail = withWarnings(() => resolveTripDuration(bus({ route: 'light_rail', duration: '2' }), length));
    assert.equal(rail.result, undefined);
    assert.match(rail.warnings[0], /3–100 km\/h for route=light_rail/);
    // The same two minutes are fine for a bus (150 km/h cap).
    assert.deepEqual(resolveTripDuration(bus({ duration: '2' }), length), { seconds: 120, source: 'osm' });
  });

  it('per-mode maxima follow gtfs-validator, unknown modes get 200', () => {
    assert.equal(maxPlausibleSpeedKmh('bus'), 150);
    assert.equal(maxPlausibleSpeedKmh('light_rail'), 100);
    assert.equal(maxPlausibleSpeedKmh('train'), 500);
    assert.equal(maxPlausibleSpeedKmh('ferry'), 80);
    assert.equal(maxPlausibleSpeedKmh('aerialway'), 50);
    assert.equal(maxPlausibleSpeedKmh('hovercraft'), 200);
    assert.equal(maxPlausibleSpeedKmh(undefined), 200);
    assert.equal(MIN_PLAUSIBLE_SPEED_KMH, 3);
  });

  it('skips the plausibility check for a route without length', () => {
    assert.deepEqual(resolveTripDuration(bus({ duration: '02:00' }), 0), { seconds: 7200, source: 'osm' });
  });

  it('tripDuration resolver: receives feature, OSM seconds and length; its answer is final', () => {
    const calls: any[] = [];
    const feature = bus({ duration: '00:15', ref: 'H' });
    const result = resolveTripDuration(feature, length, (f, osm, len) => {
      calls.push([f.properties.ref, osm, len]);
      return 1200;
    });
    assert.deepEqual(result, { seconds: 1200, source: 'tripDuration' });
    assert.deepEqual(calls, [['H', 900, length]]);
    // undefined from the resolver means vehicleSpeed, even when OSM had a value.
    assert.equal(resolveTripDuration(feature, length, () => undefined), undefined);
    // Passing the OSM value through works.
    assert.deepEqual(resolveTripDuration(feature, length, (_f, osm) => osm), { seconds: 900, source: 'tripDuration' });
    // Malformed OSM value reaches the resolver as undefined (after the warning).
    const { result: fromResolver, warnings } = withWarnings(() =>
      resolveTripDuration(bus({ duration: 'soon' }), length, (_f, osm) => (osm === undefined ? 600 : 1)),
    );
    assert.deepEqual(fromResolver, { seconds: 600, source: 'tripDuration' });
    assert.equal(warnings.length, 1);
  });

  it('tripDuration resolver: invalid answers throw, implausible ones warn and fall back', () => {
    const feature = bus({});
    for (const bad of [0, -1, NaN, Infinity, '600', null]) {
      assert.throws(
        () => resolveTripDuration(feature, length, () => bad as any),
        /tripDuration returned .* for https:\/\/www\.osm\.org\/relation\/1; it must return the running time in seconds/,
        `should throw for ${JSON.stringify(bad)}`,
      );
    }
    const { result, warnings } = withWarnings(() => resolveTripDuration(feature, length, () => 7 * 3600));
    assert.equal(result, undefined);
    assert.match(warnings[0], /tripDuration=25200s on https:\/\/www\.osm\.org\/relation\/1 implies 0\.5 km\/h over 3\.34 km/);
  });
});

describe('stopTimesBuilder', () => {
  const equalSegment = metersBetween(EQUAL_STOPS[0], EQUAL_STOPS[1]);

  it('times the stops from vehicleSpeed when the relation has no duration (historical behaviour)', () => {
    const speed = (kmh: number) => (kmh / 60 / 60) * 1000;
    const { result: stopTimes, warnings } = withWarnings(() =>
      stopTimesBuilder([relation(7, {}, UNEQUAL_STOPS)], () => 40),
    );
    assert.deepEqual(warnings, []);
    assert.equal(stopTimes.length, 4);
    let expected = 0;
    for (let i = 0; i < 4; i++) {
      if (i > 0) expected += Math.ceil(metersBetween(UNEQUAL_STOPS[i - 1], UNEQUAL_STOPS[i]) / speed(40));
      assert.equal(stopTimes[i].trip_id, 7);
      assert.equal(String(stopTimes[i].stop_sequence), String(i));
      assert.equal(stopTimes[i].stop_id, 100 + i);
      assert.equal(hms(stopTimes[i].arrival_time), expected);
      assert.equal(stopTimes[i].departure_time, stopTimes[i].arrival_time);
      assert.equal(stopTimes[i].timepoint, 0);
    }
    // Sanity on the numbers themselves: ≈ 1113 m, 3340 m, 557 m at 11.1 m/s.
    assert.deepEqual(stopTimes.map((st) => st.arrival_time), ['00:00:00', '00:01:41', '00:06:42', '00:07:33']);
  });

  it('spreads an OSM duration over the stops in proportion to distance', () => {
    const { result: stopTimes, warnings } = withWarnings(() =>
      stopTimesBuilder([relation(7, { duration: '00:30' }, EQUAL_STOPS)], () => 40),
    );
    assert.deepEqual(warnings, []);
    assert.deepEqual(stopTimes.map((st) => st.arrival_time), ['00:00:00', '00:10:00', '00:20:00', '00:30:00']);

    const unequal = stopTimesBuilder([relation(8, { duration: '00:45' }, UNEQUAL_STOPS)], () => 40);
    const cum1 = metersBetween(UNEQUAL_STOPS[0], UNEQUAL_STOPS[1]);
    const cum2 = cum1 + metersBetween(UNEQUAL_STOPS[1], UNEQUAL_STOPS[2]);
    const total = cum2 + metersBetween(UNEQUAL_STOPS[2], UNEQUAL_STOPS[3]);
    assert.equal(hms(unequal[1].arrival_time), Math.round((2700 * cum1) / total));
    assert.equal(hms(unequal[2].arrival_time), Math.round((2700 * cum2) / total));
    assert.equal(unequal[3].arrival_time, '00:45:00');
  });

  it('vehicleSpeed is not consulted when a duration applies, and receives the feature when it is', () => {
    const seen: any[] = [];
    const speed = (f: GeoJSONFeature) => {
      seen.push(f.properties.ref);
      return f.properties.route === 'light_rail' ? 32 : 20;
    };
    stopTimesBuilder(
      [
        relation(1, { ref: 'V', route: 'light_rail', duration: '00:51' }, EQUAL_STOPS),
        relation(2, { ref: 'H' }, EQUAL_STOPS),
        relation(3, { ref: 'A', route: 'light_rail' }, EQUAL_STOPS),
      ],
      speed,
    );
    assert.deepEqual(seen, ['H', 'A']);
  });

  it('falls back to vehicleSpeed on a malformed or implausible duration, with one warning per relation', () => {
    const { result: stopTimes, warnings } = withWarnings(() =>
      stopTimesBuilder(
        [
          relation(1, { duration: 'bogus' }, EQUAL_STOPS),
          relation(2, { route: 'aerialway', duration: '02:00' }, EQUAL_STOPS),
          relation(3, {}, EQUAL_STOPS),
        ],
        () => 40,
      ),
    );
    assert.equal(warnings.length, 2);
    assert.match(warnings[0], /relation\/1 is not a valid OSM duration/);
    assert.match(warnings[1], /relation\/2 implies/);
    const perTrip = [1, 2, 3].map((id) => stopTimes.filter((st) => st.trip_id === id).map((st) => st.arrival_time));
    assert.deepEqual(perTrip[0], perTrip[2]);
    assert.deepEqual(perTrip[1], perTrip[2]);
    assert.equal(hms(perTrip[2][3]), 3 * Math.ceil(equalSegment / ((40 / 60 / 60) * 1000)));
  });

  it('tripDuration resolver overrides OSM and vehicleSpeed per route', () => {
    const stopTimes = stopTimesBuilder(
      [
        relation(1, { ref: 'H', duration: '00:30' }, EQUAL_STOPS),
        relation(2, { ref: 'Q' }, EQUAL_STOPS),
      ],
      () => 40,
      {
        tripDuration: (f, osm) => (f.properties.ref === 'H' ? 3600 : osm),
      },
    );
    assert.equal(stopTimes.find((st) => st.trip_id === 1 && st.stop_sequence == 3)!.arrival_time, '01:00:00');
    // Q: resolver returned undefined (no OSM value) → vehicleSpeed.
    assert.equal(
      hms(stopTimes.find((st) => st.trip_id === 2 && st.stop_sequence == 3)!.arrival_time),
      3 * Math.ceil(equalSegment / ((40 / 60 / 60) * 1000)),
    );
  });

  it('throws when vehicleSpeed is needed and does not return a positive number', () => {
    for (const bad of [0, -20, NaN, undefined, '20']) {
      assert.throws(
        () => stopTimesBuilder([relation(9, {}, EQUAL_STOPS)], () => bad as any),
        /vehicleSpeed returned .* for https:\/\/www\.osm\.org\/relation\/9; it must return km\/h/,
        `should throw for ${JSON.stringify(bad)}`,
      );
    }
    // Not consulted (and so not validated) when a duration applies.
    assert.doesNotThrow(() => stopTimesBuilder([relation(9, { duration: '00:30' }, EQUAL_STOPS)], () => 0));
  });

  it('schedule-based trips add the same offsets to every expanded departure', () => {
    const services = [
      {
        service_id: 'all',
        startTime: '06:00',
        endTime: '07:00',
        expandedTrips: [
          { trip_id: 10, departureTime: '06:00:00' },
          { trip_id: 11, departureTime: '06:30:00' },
        ],
      },
    ];
    const withDuration = stopTimesBuilder(
      [relation(5, { duration: '00:30' }, EQUAL_STOPS, services)],
      () => 40,
      { useFrequencies: false },
    );
    assert.deepEqual(
      withDuration.map((st) => [st.trip_id, st.arrival_time]),
      [
        [10, '06:00:00'], [10, '06:10:00'], [10, '06:20:00'], [10, '06:30:00'],
        [11, '06:30:00'], [11, '06:40:00'], [11, '06:50:00'], [11, '07:00:00'],
      ],
    );
    const withSpeed = stopTimesBuilder([relation(5, {}, EQUAL_STOPS, services)], () => 40, { useFrequencies: false });
    const step = Math.ceil(equalSegment / ((40 / 60 / 60) * 1000));
    assert.equal(hms(withSpeed[3].arrival_time), hms('06:00:00') + 3 * step);
    assert.equal(hms(withSpeed[7].arrival_time), hms('06:30:00') + 3 * step);
  });

  it('a route whose stops all share one point gets 00:00:00 everywhere, with or without duration', () => {
    const point: GeoJSONCoordinate[] = [[0, 0], [0, 0], [0, 0]] as GeoJSONCoordinate[];
    for (const tags of [{}, { duration: '00:30' }]) {
      const times = stopTimesBuilder([relation(4, tags, point)], () => 40).map((st) => st.arrival_time);
      assert.deepEqual(times, ['00:00:00', '00:00:00', '00:00:00']);
    }
  });

  it('the library default speed is 20 km/h', () => {
    assert.equal(DEFAULT_VEHICLE_SPEED_KMH, 20);
  });
});
