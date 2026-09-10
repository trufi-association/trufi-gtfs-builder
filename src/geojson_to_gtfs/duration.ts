/**
 * Travel times of a trip: OSM `duration=*` on the route relation, an
 * optional per-route resolver, or the `vehicleSpeed` fallback.
 *
 * OSM wiki, Key:duration — recommended `hh:mm`; also accepted `hh:mm:ss`,
 * plain minutes (`mm`, "discouraged" because it is ambiguous with `hh`) and
 * ISO 8601 (`PT1H30M`, rare). On route relations the value is "the running
 * time of the bus route as stated in official documents" (Tag:route=bus),
 * excluding waiting time: https://wiki.openstreetmap.org/wiki/Key:duration
 * and https://wiki.openstreetmap.org/wiki/Tag:route%3Dbus.
 */

import type { GeoJSONFeature, TripDurationResolver } from '../types';

/**
 * Speed applied when a route has no usable duration and the config does not
 * set `vehicleSpeed`: 20 km/h, the commercial speed of a bus in mixed
 * traffic (Cochabamba's Dirección de Tráfico y Vialidad measured 10–11 km/h
 * in congestion and calls 25 km/h satisfactory). Rail, ferries and cable
 * cars should set their own value per route type (see README).
 */
export const DEFAULT_VEHICLE_SPEED_KMH = 20;

/**
 * A running time whose implied average speed falls below this is treated as
 * a tagging error (slower than walking over the whole route) and ignored.
 */
export const MIN_PLAUSIBLE_SPEED_KMH = 3;

/**
 * Upper bounds per OSM `route=*` value, in km/h. The figures are the
 * `fast_travel_between_consecutive_stops` thresholds of MobilityData's
 * gtfs-validator (`StopTimeTravelSpeedValidator.getMaxVehicleSpeedKph`):
 * light rail 100, rail 500, subway / bus 150, ferry 80, aerial lift 50,
 * anything else 200 — a duration that implies more than that would be
 * flagged by the validator anyway.
 */
const MAX_PLAUSIBLE_SPEED_KMH: Record<string, number> = {
  tram: 100,
  light_rail: 100,
  train: 500,
  subway: 150,
  monorail: 150,
  bus: 150,
  trolleybus: 150,
  minibus: 150,
  share_taxi: 150,
  ferry: 80,
  aerialway: 50,
  funicular: 50,
};
const MAX_PLAUSIBLE_SPEED_DEFAULT_KMH = 200;

export function maxPlausibleSpeedKmh(osmRouteType: unknown): number {
  return MAX_PLAUSIBLE_SPEED_KMH[String(osmRouteType)] ?? MAX_PLAUSIBLE_SPEED_DEFAULT_KMH;
}

const HMS = /^(\d{1,3}):([0-5]\d)(?::([0-5]\d))?$/;
const MINUTES = /^\d{1,5}$/;
const ISO_8601 = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/;

/**
 * Parse an OSM `duration=*` value into seconds.
 *
 * Accepts the wiki forms `hh:mm`, `h:mm`, `hh:mm:ss`, plain minutes (`32`)
 * and ISO 8601 (`PT45M`, `PT1H30M`, `P1DT2H`). Only strings are parsed:
 * both readers deliver every tag value as a string (`osm-pbf-parser` takes
 * them from the block's string table, Overpass JSON has no other type), so
 * a non-string here is not an OSM tag. Returns `undefined` for anything
 * else: empty values, out-of-range fields (`00:60`), negative numbers,
 * units (`30 min`, `1h30`), `;`-separated lists.
 */
export function parseOsmDuration(value: unknown): number | undefined {
  if (typeof value !== 'string') return undefined;
  const text = value.trim();
  if (text === '') return undefined;

  const hms = HMS.exec(text);
  if (hms) {
    const hours = parseInt(hms[1], 10);
    const minutes = parseInt(hms[2], 10);
    const seconds = hms[3] === undefined ? 0 : parseInt(hms[3], 10);
    return hours * 3600 + minutes * 60 + seconds;
  }
  if (MINUTES.test(text)) {
    return parseInt(text, 10) * 60;
  }
  const iso = ISO_8601.exec(text);
  if (iso) {
    const [, days, hours, minutes, seconds] = iso;
    if (days === undefined && hours === undefined && minutes === undefined && seconds === undefined) {
      return undefined;
    }
    return (
      (parseInt(days ?? '0', 10) * 24 + parseInt(hours ?? '0', 10)) * 3600 +
      parseInt(minutes ?? '0', 10) * 60 +
      parseInt(seconds ?? '0', 10)
    );
  }
  return undefined;
}

export interface ResolvedTripDuration {
  /** End-to-end running time of the trip, in seconds. */
  seconds: number;
  /** `osm` for the relation's `duration=*`, `tripDuration` for the resolver. */
  source: 'osm' | 'tripDuration';
}

function relationUrl(feature: GeoJSONFeature): string {
  return `https://www.osm.org/relation/${feature.properties.id}`;
}

/**
 * Decide the running time of one route relation.
 *
 * Order: `duration=*` parsed from the relation (malformed → warning), then
 * the optional `tripDuration` resolver, whose answer is final: a number of
 * seconds to use, or `undefined` to fall back to `vehicleSpeed`. Whatever
 * is chosen must imply an average speed between `MIN_PLAUSIBLE_SPEED_KMH`
 * and the per-mode maximum over `lengthMeters`; otherwise it is ignored
 * with a warning and the caller falls back to `vehicleSpeed`. A resolver
 * that returns something that is not a positive finite number throws — it
 * is a config bug, like an invalid `defaultCalendar`.
 *
 * Returns `undefined` when the trip should be timed from `vehicleSpeed`.
 */
export function resolveTripDuration(
  feature: GeoJSONFeature,
  lengthMeters: number,
  resolver?: TripDurationResolver,
): ResolvedTripDuration | undefined {
  const raw = feature.properties.duration;
  let osmSeconds: number | undefined;
  if (raw !== undefined && raw !== null && raw !== '') {
    osmSeconds = parseOsmDuration(raw);
    if (osmSeconds === undefined) {
      console.warn(
        `duration="${raw}" on ${relationUrl(feature)} is not a valid OSM duration ` +
          `(expected hh:mm, hh:mm:ss, minutes or ISO 8601); timing the trip from vehicleSpeed instead`,
      );
    } else if (osmSeconds <= 0) {
      console.warn(
        `duration="${raw}" on ${relationUrl(feature)} is not a positive running time; ` +
          `timing the trip from vehicleSpeed instead`,
      );
      osmSeconds = undefined;
    }
  }

  let candidate: ResolvedTripDuration | undefined;
  if (resolver) {
    const answer = resolver(feature, osmSeconds, lengthMeters);
    if (answer === undefined) return undefined;
    if (typeof answer !== 'number' || !Number.isFinite(answer) || answer <= 0) {
      throw new Error(
        `tripDuration returned ${JSON.stringify(answer)} for ${relationUrl(feature)}; ` +
          `it must return the running time in seconds (a positive number) or undefined`,
      );
    }
    candidate = { seconds: answer, source: 'tripDuration' };
  } else if (osmSeconds !== undefined) {
    candidate = { seconds: osmSeconds, source: 'osm' };
  }
  if (!candidate) return undefined;

  if (lengthMeters > 0) {
    const impliedKmh = (lengthMeters / candidate.seconds) * 3.6;
    const maxKmh = maxPlausibleSpeedKmh(feature.properties.route);
    if (impliedKmh < MIN_PLAUSIBLE_SPEED_KMH || impliedKmh > maxKmh) {
      const label =
        candidate.source === 'osm' ? `duration="${raw}"` : `tripDuration=${candidate.seconds}s`;
      console.warn(
        `${label} on ${relationUrl(feature)} implies ${impliedKmh.toFixed(1)} km/h over ` +
          `${(lengthMeters / 1000).toFixed(2)} km (plausible: ${MIN_PLAUSIBLE_SPEED_KMH}–${maxKmh} km/h ` +
          `for route=${feature.properties.route}); ignoring it and timing the trip from vehicleSpeed`,
      );
      return undefined;
    }
  }
  return candidate;
}

/**
 * Arrival offset of every stop of a trip, in seconds from departure.
 *
 * With a resolved duration the offsets grow in proportion to the straight-
 * line distance between consecutive stops (cumulative rounding: the last
 * stop lands exactly on the duration, times never decrease). Without one,
 * every segment takes `ceil(distance / speed)` seconds at `speedKmh`, the
 * historical behaviour of the builder.
 */
export function stopOffsetsSeconds(
  segmentMeters: number[],
  durationSeconds: number | undefined,
  speedKmh: number,
): number[] {
  const offsets: number[] = new Array(segmentMeters.length);
  if (durationSeconds !== undefined) {
    const total = segmentMeters.reduce((sum, m) => sum + m, 0);
    let cumulative = 0;
    for (let i = 0; i < segmentMeters.length; i++) {
      cumulative += segmentMeters[i];
      offsets[i] = total > 0 ? Math.round((durationSeconds * cumulative) / total) : 0;
    }
    return offsets;
  }
  const speed = (speedKmh / 60 / 60) * 1000; // m/s, same arithmetic as before
  let seconds = 0;
  for (let i = 0; i < segmentMeters.length; i++) {
    if (i > 0) seconds += Math.ceil(segmentMeters[i] / speed);
    offsets[i] = seconds;
  }
  return offsets;
}
