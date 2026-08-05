import distanceBetween from '@turf/distance';
import formatTime from './time/formater';
import { loadCustomStops } from '../utils/customStopsLoader';
import { findNearestStop, stopIdToNumber, distanceBetweenCoords, isPointOnRightSide } from '../utils/spatialMatcher';
import { expandSchedule, timeToSeconds, secondsToTime } from './scheduleExpander';
import type {
  GeoJSONFeature,
  GTFSAgency,
  GTFSCalendar,
  GTFSRoute,
  GTFSTrip,
  GTFSFrequency,
  GTFSStop,
  GTFSShape,
  GTFSStopTime,
  GTFSFareAttribute,
  GTFSFareRule,
  GTFSFeedInfo,
  DefaultFaresConfig,
  FeedConfig,
  GeoJSONCoordinate,
  CustomStop,
  CustomStopsModeConfig,
  StopsConfigResolver,
} from '../types';

const CSS_COLORS: Record<string, string> = {
  aliceblue: 'F0F8FF', antiquewhite: 'FAEBD7', aqua: '00FFFF', aquamarine: '7FFFD4',
  azure: 'F0FFFF', beige: 'F5F5DC', bisque: 'FFE4C4', black: '000000',
  blanchedalmond: 'FFEBCD', blue: '0000FF', blueviolet: '8A2BE2', brown: 'A52A2A',
  burlywood: 'DEB887', cadetblue: '5F9EA0', chartreuse: '7FFF00', chocolate: 'D2691E',
  coral: 'FF7F50', cornflowerblue: '6495ED', cornsilk: 'FFF8DC', crimson: 'DC143C',
  cyan: '00FFFF', darkblue: '00008B', darkcyan: '008B8B', darkgoldenrod: 'B8860B',
  darkgray: 'A9A9A9', darkgreen: '006400', darkkhaki: 'BDB76B', darkmagenta: '8B008B',
  darkolivegreen: '556B2F', darkorange: 'FF8C00', darkorchid: '9932CC', darkred: '8B0000',
  darksalmon: 'E9967A', darkseagreen: '8FBC8F', darkslateblue: '483D8B', darkslategray: '2F4F4F',
  darkturquoise: '00CED1', darkviolet: '9400D3', deeppink: 'FF1493', deepskyblue: '00BFFF',
  dimgray: '696969', dodgerblue: '1E90FF', firebrick: 'B22222', floralwhite: 'FFFAF0',
  forestgreen: '228B22', fuchsia: 'FF00FF', gainsboro: 'DCDCDC', ghostwhite: 'F8F8FF',
  gold: 'FFD700', goldenrod: 'DAA520', gray: '808080', green: '008000',
  greenyellow: 'ADFF2F', honeydew: 'F0FFF0', hotpink: 'FF69B4', indianred: 'CD5C5C',
  indigo: '4B0082', ivory: 'FFFFF0', khaki: 'F0E68C', lavender: 'E6E6FA',
  lavenderblush: 'FFF0F5', lawngreen: '7CFC00', lemonchiffon: 'FFFACD', lightblue: 'ADD8E6',
  lightcoral: 'F08080', lightcyan: 'E0FFFF', lightgoldenrodyellow: 'FAFAD2', lightgray: 'D3D3D3',
  lightgreen: '90EE90', lightpink: 'FFB6C1', lightsalmon: 'FFA07A', lightseagreen: '20B2AA',
  lightskyblue: '87CEFA', lightslategray: '778899', lightsteelblue: 'B0C4DE', lightyellow: 'FFFFE0',
  lime: '00FF00', limegreen: '32CD32', linen: 'FAF0E6', magenta: 'FF00FF',
  maroon: '800000', mediumaquamarine: '66CDAA', mediumblue: '0000CD', mediumorchid: 'BA55D3',
  mediumpurple: '9370DB', mediumseagreen: '3CB371', mediumslateblue: '7B68EE', mediumspringgreen: '00FA9A',
  mediumturquoise: '48D1CC', mediumvioletred: 'C71585', midnightblue: '191970', mintcream: 'F5FFFA',
  mistyrose: 'FFE4E1', moccasin: 'FFE4B5', navajowhite: 'FFDEAD', navy: '000080',
  oldlace: 'FDF5E6', olive: '808000', olivedrab: '6B8E23', orange: 'FFA500',
  orangered: 'FF4500', orchid: 'DA70D6', palegoldenrod: 'EEE8AA', palegreen: '98FB98',
  paleturquoise: 'AFEEEE', palevioletred: 'DB7093', papayawhip: 'FFEFD5', peachpuff: 'FFDAB9',
  peru: 'CD853F', pink: 'FFC0CB', plum: 'DDA0DD', powderblue: 'B0E0E6',
  purple: '800080', rebeccapurple: '663399', red: 'FF0000', rosybrown: 'BC8F8F',
  royalblue: '4169E1', saddlebrown: '8B4513', salmon: 'FA8072', sandybrown: 'F4A460',
  seagreen: '2E8B57', seashell: 'FFF5EE', sienna: 'A0522D', silver: 'C0C0C0',
  skyblue: '87CEEB', slateblue: '6A5ACD', slategray: '708090', snow: 'FFFAFA',
  springgreen: '00FF7F', steelblue: '4682B4', tan: 'D2B48C', teal: '008080',
  thistle: 'D8BFD8', tomato: 'FF6347', turquoise: '40E0D0', violet: 'EE82EE',
  wheat: 'F5DEB3', white: 'FFFFFF', whitesmoke: 'F5F5F5', yellow: 'FFFF00',
  yellowgreen: '9ACD32',
};

function cssColorToHex(name: string): string {
  return CSS_COLORS[name.toLowerCase()] ?? '';
}

export function agencyBuilder(
  features: GeoJSONFeature[][],
  defaultAgencyInfo: Partial<GTFSAgency>
): GTFSAgency[] {
  const agencies: GTFSAgency[] = [];
  for (let feature of features) {
    const mainFeature = feature[0];
    const agencyName = mainFeature.properties.operator || 'default';
    let agency = agencies.find((value) => value.agency_name === agencyName);
    if (!agency) {
      agency = {
        agency_id: agencies.length,
        agency_name: agencyName,
        agency_timezone: defaultAgencyInfo.agency_timezone || 'America/La_Paz',
        agency_url: defaultAgencyInfo.agency_url || 'https://www.example.com/',
      };
      agencies.push(agency);
    }
    if (!mainFeature.gtfs) {
      mainFeature.gtfs = {
        agency_id: agency.agency_id,
        route_id: 0,
        services: [],
      };
    } else {
      mainFeature.gtfs.agency_id = agency.agency_id;
    }
  }
  return agencies;
}

// eslint-disable-next-line @typescript-eslint/no-require-imports
const OpeningHours = require('opening_hours');

const DAY_LABELS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

// Reference week we query against `opening_hours.js`. Picked as a regular
// mid-year Monday-to-Monday (2024-04-01 to 2024-04-08) to avoid the major
// seasonal selectors most feeds use — Dec/Jan in particular, which is
// when transit operators frequently advertise extended hours via
// `Dec-Jan: ...` overrides. Querying inside that range would surface the
// special schedule as if it ran all year. April has neither northern
// summer nor southern winter holiday selectors triggering, so the
// intervals match each feed's "normal" service.
const REF_WEEK_START = new Date(2024, 3, 1, 0, 0, 0, 0);
const REF_WEEK_END = new Date(2024, 3, 8, 0, 0, 0, 0);

/**
 * Strip holiday selectors (PH = Public Holidays, SH = School Holidays) from
 * an OSM `opening_hours` value before parsing.
 *
 * Reasoning: GTFS `calendar.txt` only models the weekly Mo-Su pattern, with
 * specific holiday exceptions handled separately via `calendar_dates.txt`.
 * `opening_hours.js` refuses to parse PH/SH selectors without a country
 * code to resolve actual holiday dates — but we don't need those dates at
 * all for the weekly schedule. Stripping them lets the parser focus on
 * weekday rules without any geographic coupling.
 *
 * Two cases:
 *   - Combined selector "Mo-Su,PH 07:00-19:00" → drop ",PH" → "Mo-Su 07:00-19:00"
 *   - Standalone holiday rule "PH 09:00-18:00" or "PH off" → drop the rule
 */
export function stripHolidaySelectors(value: string): string {
  return value
    .split(';')
    .map((part) => {
      let t = part.trim();
      if (!t) return null;
      // Drop rules that start with a holiday selector.
      if (/^(PH|SH)\b/i.test(t)) return null;
      // Strip ",PH" / ",SH" from combined day selectors.
      t = t.replace(/,\s*(PH|SH)(?=[\s,])/gi, '');
      return t;
    })
    .filter((s): s is string => Boolean(s))
    .join('; ');
}

function timeToHHMM(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** Mo=0, Tu=1 … Su=6, matching DAY_LABELS. */
function dayOfWeekIndex(d: Date): number {
  return (d.getDay() + 6) % 7;
}

/**
 * Compose a stable, human-readable service_id from the set of days
 * the service runs:
 *   - 7 days → "Mo-Su"
 *   - contiguous range → "Mo-Fr"
 *   - sparse set → "Mo-We-Fr"
 */
function buildServiceId(days: ReadonlySet<number>): string {
  const sorted = [...days].sort((a, b) => a - b);
  if (sorted.length === 7) return 'Mo-Su';
  const isContiguous =
    sorted.length > 1 && sorted[sorted.length - 1] - sorted[0] === sorted.length - 1;
  if (isContiguous) return `${DAY_LABELS[sorted[0]]}-${DAY_LABELS[sorted[sorted.length - 1]]}`;
  return sorted.map((d) => DAY_LABELS[d]).join('-');
}

export function calendarBuilder(
  features: GeoJSONFeature[][],
  defaultCalendar: (feature: GeoJSONFeature) => string
): GTFSCalendar[] {
  const services: GTFSCalendar[] = [];

  for (const feature of features) {
    const mainFeature = feature[0];
    if (!mainFeature.gtfs) {
      mainFeature.gtfs = {
        agency_id: 0,
        route_id: 0,
        services: [],
      };
    }
    mainFeature.gtfs.services = [];

    const rawOpeningHours =
      mainFeature.properties.opening_hours || defaultCalendar(mainFeature);
    const cleaned = stripHolidaySelectors(formatTime(rawOpeningHours));
    if (!cleaned) continue;

    // Parse and enumerate open intervals across a reference Mo-Su week.
    // `opening_hours.js` handles every standard OSM construct: ranges
    // (Mo-Fr), unions (Mo,We,Fr), multiple time slots per day
    // (08:00-12:00,14:00-18:00), seasonal prefixes (Apr-Sep: ...),
    // overrides via ; — anything the OSM wiki documents.
    let intervals: [Date, Date, boolean, string | undefined][];
    try {
      const oh = new OpeningHours(cleaned, undefined, 0);
      intervals = oh.getOpenIntervals(REF_WEEK_START, REF_WEEK_END);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      throw new Error(
        `Failed to parse opening_hours "${rawOpeningHours}" for https://www.osm.org/relation/${mainFeature.properties.id}: ${msg}`
      );
    }
    if (!intervals.length) continue;

    // Group intervals by (startTime, endTime). Days that share an
    // identical time window collapse into one GTFS service whose
    // monday-sunday flags reflect the union of their days.
    type Group = { startTime: string; endTime: string; days: Set<number> };
    const groups = new Map<string, Group>();
    for (const interval of intervals) {
      const [start, end] = interval;
      const startTime = timeToHHMM(start);
      let endTime = timeToHHMM(end);
      // Overnight interval — end is on the next day. GTFS represents
      // this with hour ≥ 24 (e.g. "26:30" for 02:30 the following day).
      if (start.getDate() !== end.getDate()) {
        const endHour = end.getHours() + 24;
        endTime = `${String(endHour).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}`;
      }
      const key = `${startTime}-${endTime}`;
      let group = groups.get(key);
      if (!group) {
        group = { startTime, endTime, days: new Set() };
        groups.set(key, group);
      }
      group.days.add(dayOfWeekIndex(start));
    }

    for (const { startTime, endTime, days } of groups.values()) {
      const serviceId = buildServiceId(days);

      let service = services.find((s) => s.service_id === serviceId);
      if (!service) {
        service = {
          service_id: serviceId,
          monday: days.has(0) ? 1 : 0,
          tuesday: days.has(1) ? 1 : 0,
          wednesday: days.has(2) ? 1 : 0,
          thursday: days.has(3) ? 1 : 0,
          friday: days.has(4) ? 1 : 0,
          saturday: days.has(5) ? 1 : 0,
          sunday: days.has(6) ? 1 : 0,
          start_date: '20000101',
          end_date: '21000101',
        };
        services.push(service);
      }
      mainFeature.gtfs!.services.push({ service_id: serviceId, startTime, endTime });
    }
  }
  return services;
}

export function routeBuilder(
  features: GeoJSONFeature[][],
  options?: { routePerRelation?: boolean }
): GTFSRoute[] {
  const perRelation = options?.routePerRelation ?? false;
  const getRouteType = (feature: GeoJSONFeature): string => {
    const route = feature.properties.route;
    let response = '';
    if (route === 'tram' || route === 'light_rail') {
      response = '0';
    } else if (route === 'subway') {
      response = '1';
    } else if (route === 'train') {
      response = '2';
    } else if (route === 'bus' || route === 'share_taxi' || route === 'minibus') {
      response = '3';
    } else if (route === 'ferry') {
      response = '4';
    } else if (route === 'aerialway') {
      response = '6';
    } else {
      throw new Error(
        `No correct route type for https://www.osm.org/relation/${feature.properties.id}`
      );
    }
    return response;
  };
  const routes: GTFSRoute[] = [];
  const routeMap = new Map<string, number>(); // Maps routeKey to route_id
  let routeIdCounter = 0;

  for (let feature of features) {
    const mainFeature = feature[0];
    // route_short_name: prefer 'ref' (route code like "M-01 C")
    const routeShortName = mainFeature.properties.ref || mainFeature.properties.name || mainFeature.properties.id.toString();
    // route_long_name: a non-directional corridor identifier. A single
    // route_id collapses many OSM relations with different endpoints
    // (variants, sub-branches, opposite directions); picking the first
    // relation's full `name` was misleading because it reads as
    // "<from> → <to>" of just one variant. Per-trip destination and
    // variant are conveyed by `trip_headsign` instead.
    //
    // Three OSM `name` shapes are normalized:
    //   1. "<type> <ref>: <from> → <to>"   → keep "<type> <ref>"
    //      (e.g. "Trufi 134: Av X → Calle Y" → "Trufi 134"). Common in
    //      Cochabamba and other feeds that prefix the relation name
    //      with the vehicle type and route code.
    //   2. "<from> → <to>"                  → leave empty
    //      No corridor descriptor is present, so any extraction is just
    //      a directional half. Per Google best practice, leaving
    //      route_long_name empty when only route_short_name is
    //      meaningful is preferred over duplicating one direction.
    //   3. anything else                    → use the name as-is
    const rawName = (mainFeature.properties.name || '').trim();
    const colonIdx = rawName.indexOf(':');
    const hasDirectionalArrow = /→|->|⟵|←/.test(rawName);
    let routeLongName: string;
    if (perRelation) {
      // One route per relation: the relation's own (directional) name IS
      // the route identity users look for in route lists.
      routeLongName = rawName || routeShortName;
    } else if (colonIdx > 0) {
      routeLongName = rawName.slice(0, colonIdx).trim();
    } else if (hasDirectionalArrow) {
      routeLongName = '';
    } else {
      routeLongName = rawName || routeShortName;
    }
    const routeKey = perRelation
      ? `rel_${mainFeature.properties.id}`
      : `${mainFeature.gtfs?.agency_id || 0}_${routeShortName}`;

    // Check if this route already exists (by agency + short name)
    let routeId = routeMap.get(routeKey);

    if (routeId === undefined) {
      // Create new route: sequential ID, or the OSM relation id when
      // routePerRelation is on (stable across runs, matches trip_id).
      routeId = perRelation ? mainFeature.properties.id : routeIdCounter++;
      routeMap.set(routeKey, routeId);

      let route_color = mainFeature.properties.colour || '';
      route_color = route_color.replace('#', '');
      // Convert CSS color names to hex
      if (route_color && !/^[0-9a-fA-F]{3,6}$/.test(route_color)) {
        route_color = cssColorToHex(route_color);
      }

      const route: GTFSRoute = {
        route_id: routeId,
        agency_id: mainFeature.gtfs?.agency_id || 0,
        route_short_name: routeShortName,
        route_long_name: routeLongName,
        route_color: route_color,
        route_type: getRouteType(mainFeature),
      };
      routes.push(route);
    }

    // Assign the shared route_id to this feature
    if (!mainFeature.gtfs) {
      mainFeature.gtfs = {
        agency_id: 0,
        route_id: routeId,
        services: [],
      };
    } else {
      mainFeature.gtfs.route_id = routeId;
    }
  }
  return routes;
}

export function fareBuilder(
  features: GeoJSONFeature[][],
  defaultFares: DefaultFaresConfig
): { attributes: GTFSFareAttribute[]; rules: GTFSFareRule[] } {
  const fare: { attributes: GTFSFareAttribute[]; rules: GTFSFareRule[] } = {
    attributes: [],
    rules: [],
  };
  for (let feature of features) {
    const mainFeature = feature[0];

    let fareId = fare.attributes.length;
    let price = mainFeature.properties.fee === "yes" ? parseFloat(mainFeature.properties.charge) : 0

    fare.attributes.push({
      agency_id: mainFeature.gtfs?.agency_id || 0,
      fare_id: fareId,
      price: price || 0,
      currency_type: defaultFares.currencyType,
      payment_method: mainFeature.properties.paymentMethod || 0,
    });

    fare.rules.push({ fare_id: fareId, route_id: mainFeature.gtfs?.route_id });
  }
  return fare;
}

export function feedBuilder(feed: FeedConfig): GTFSFeedInfo[] {
  const feeds: GTFSFeedInfo[] = [];

  feeds.push({
    feed_publisher_url: feed.publisherUrl,
    feed_publisher_name: feed.publisherName,
    feed_lang: feed.lang,
    feed_version: feed.version,
    feed_contact_email: feed.contactEmail,
    feed_contact_url: feed.contactUrl,
    feed_start_date: feed.startDate,
    feed_end_date: feed.endDate,
    feed_id: feed.id,
  });

  return feeds;
}

export function tripBuilder(
  features: GeoJSONFeature[][],
  gtfsConfig?: { useFrequencies?: boolean; frequencyHeadway?: (feature: GeoJSONFeature) => number }
): GTFSTrip[] {
  const trips: GTFSTrip[] = [];
  const useFrequencies = gtfsConfig?.useFrequencies ?? true;

  // Determine which OSM `to` value gets `direction_id=0` for each ref.
  // Within a single ref, the `to` that the most relations target is
  // treated as the terminal (direction_id=0); every other `to` is the
  // opposite direction (direction_id=1). Ties are broken
  // lexicographically so the assignment is deterministic between runs.
  //
  // Why this matters: previously direction_id alternated 0/1/0/1 in the
  // order relations were processed, so two trips going to the same `to`
  // could end up with different direction_ids — making
  // direction_id-based filtering useless for any route with > 2
  // variants. OSM has no native field for "this is direction 0", so any
  // mapping is heuristic; this one yields consistent values that
  // respect the `to` tag.
  const refDirZeroTo = new Map<string, string>();
  {
    const refToCounts = new Map<string, Map<string, number>>();
    for (const feature of features) {
      const ref = (feature[0].properties.ref || '').toString();
      const to = (feature[0].properties.to || '').trim();
      if (!ref || !to) continue;
      let counts = refToCounts.get(ref);
      if (!counts) { counts = new Map(); refToCounts.set(ref, counts); }
      counts.set(to, (counts.get(to) ?? 0) + 1);
    }
    for (const [ref, counts] of refToCounts) {
      let bestTo = '';
      let bestCount = -1;
      for (const [to, count] of counts) {
        if (count > bestCount || (count === bestCount && to < bestTo)) {
          bestTo = to;
          bestCount = count;
        }
      }
      refDirZeroTo.set(ref, bestTo);
    }
  }

  for (let feature of features) {
    const mainFeature = feature[0];
    if (!mainFeature.gtfs) continue;

    // Build trip_headsign with this preference order:
    //   1. OSM `description` tag — when present this carries the route
    //      variant ("Verde", "Bandera Roja", etc.). Same headsign for
    //      both directions of the same variant is fine; `direction_id`
    //      differentiates them. See #875.
    //   2. OSM `to` tag — the dedicated destination tag, more reliable
    //      than parsing the relation `name`.
    //   3. Regex over `name` (`… → DESTINATION`) — legacy fallback for
    //      relations missing both tags.
    const routeName = mainFeature.properties.name || '';
    const routeRef = (mainFeature.properties.ref || '').toString();
    const variant = (mainFeature.properties.description || '').trim();
    const toTag = (mainFeature.properties.to || '').trim();
    const toMatch = routeName.match(/(?:→|->|⟵|←)\s*(.+?)$/i);
    const destinationFromName = toMatch ? toMatch[1].trim() : '';
    const tripHeadsign = variant || toTag || destinationFromName;

    // direction_id: 0 for trips heading to the ref's terminal `to`
    // (the most-targeted destination within the ref), 1 otherwise.
    // Trips with no `to` or no `ref` default to 0.
    let directionId: number = 0;
    if (routeRef && toTag) {
      const dir0To = refDirZeroTo.get(routeRef);
      directionId = dir0To && toTag !== dir0To ? 1 : 0;
    }

    if (useFrequencies) {
      // FREQUENCY-BASED: One trip per service (for use with frequencies.txt)
      const services = mainFeature.gtfs.services;
      for (let i = 0; i < services.length; i++) {
        const service = services[i];
        // Make trip_id unique when multiple services exist
        const tripId = services.length > 1
          ? mainFeature.properties.id * 100 + i
          : mainFeature.properties.id;
        const trip: GTFSTrip = {
          trip_id: tripId,
          route_id: mainFeature.gtfs.route_id,
          service_id: service.service_id,
          shape_id: mainFeature.properties.id,
          trip_headsign: tripHeadsign,
          direction_id: directionId,
        };
        trips.push(trip);
        service.trip_id = tripId;
      }
    } else {
      // SCHEDULE-BASED: Expand into individual scheduled trips
      const baseRouteId = mainFeature.properties.id;
      const headwaySecs = gtfsConfig?.frequencyHeadway?.(mainFeature) ?? 300;

      for (const service of mainFeature.gtfs.services) {
        const departureTimes = expandSchedule(service.startTime, service.endTime, headwaySecs);
        const expandedTrips: Array<{ trip_id: number; departureTime: string }> = [];

        departureTimes.forEach((departureTime, index) => {
          const trip_id = baseRouteId * 1000000 + index;
          const trip: GTFSTrip = {
            trip_id: trip_id,
            route_id: mainFeature.gtfs!.route_id,
            service_id: service.service_id,
            shape_id: baseRouteId,
            trip_headsign: tripHeadsign,
            direction_id: directionId,
          };
          trips.push(trip);
          expandedTrips.push({ trip_id, departureTime });
        });

        service.expandedTrips = expandedTrips;
      }
    }
  }
  return trips;
}

export function frequenciesBuilder(
  features: GeoJSONFeature[][],
  frequencyHeadwaySecs: (feature: GeoJSONFeature) => number,
  gtfsConfig?: { useFrequencies?: boolean }
): GTFSFrequency[] {
  const useFrequencies = gtfsConfig?.useFrequencies ?? true;

  // If not using frequencies, return empty array (frequencies.txt won't be generated)
  if (!useFrequencies) {
    return [];
  }

  // FREQUENCY-BASED: Generate frequencies.txt
  const frequencies: GTFSFrequency[] = [];
  for (let feature of features) {
    const mainFeature = feature[0];
    if (!mainFeature.gtfs) continue;
    for (const service of mainFeature.gtfs.services) {
      const frequency: GTFSFrequency = {
        trip_id: service.trip_id!,
        start_time: service.startTime + ':00',
        end_time: service.endTime + ':00',
        headway_secs: frequencyHeadwaySecs(mainFeature),
        exact_times: 1,
      };
      frequencies.push(frequency);
    }
  }
  return frequencies;
}

export function stopsBuilder(
  features: GeoJSONFeature[][],
  inputStops: { [id: number]: string[] },
  stopNameBuilder: (stops?: string[]) => string,
  stopsConfig: StopsConfigResolver
): GTFSStop[] {
  const stops: GTFSStop[] = [];
  const checkList: { [id: string | number]: boolean } = {};

  // Cache `customStops` data per (filePath | inline ref) so we don't
  // reload the same source file once per route. Inline arrays are keyed
  // by reference identity.
  const customStopsCache = new WeakMap<object, CustomStop[]>();
  const customStopsByPath = new Map<string, CustomStop[]>();

  function resolveCustomStops(cfg: CustomStopsModeConfig): CustomStop[] {
    if (cfg.stops && cfg.stops.length > 0) {
      const key = cfg.stops as unknown as object;
      const cached = customStopsCache.get(key);
      if (cached) return cached;
      customStopsCache.set(key, cfg.stops);
      console.log(`Using ${cfg.stops.length} custom stops (provided directly)`);
      return cfg.stops;
    }
    if (cfg.filePath) {
      const cached = customStopsByPath.get(cfg.filePath);
      if (cached) return cached;
      const loaded = loadCustomStops(cfg.filePath);
      customStopsByPath.set(cfg.filePath, loaded);
      console.log(`Loaded ${loaded.length} custom stops from file`);
      return loaded;
    }
    throw new Error('customStops mode requires either stops array or filePath');
  }

  for (const feature of features) {
    const routeFeature = feature[0];
    if (!routeFeature.gtfs) {
      routeFeature.gtfs = {
        agency_id: 0,
        route_id: 0,
        services: [],
        filteredStops: { nodes: [], coordinates: [] },
      };
    }

    const cfg = stopsConfig(routeFeature);

    // Per-mode option fallbacks (only relevant for the active mode).
    const maxMatchDistance =
      cfg.mode === 'customStops' ? (cfg.maxMatchDistance ?? 200) : 200;
    const minDistanceBetweenStops =
      cfg.mode === 'customStops' ? (cfg.minDistanceBetweenStops ?? 0) : 0;
    const fallbackBehavior =
      cfg.mode === 'customStops' ? (cfg.fallbackBehavior ?? 'warning') : 'warning';
    const rightSideOnly =
      cfg.mode === 'customStops' ? (cfg.rightSideOnly ?? false) : false;

    if (cfg.mode === 'osmStops') {
      // OSM stops mode: use stop_position/platform nodes from the OSM relation
      const filteredStops: { nodes: number[]; coordinates: GeoJSONCoordinate[] } = { nodes: [], coordinates: [] };
      const forceEndpoints = cfg.forceEndpointStops ?? false;
      const { nodes, coordinates } = routeFeature.geometry;
      const forcedEndpointStops: { stop_id: number; stop_name: string; position: 'first' | 'last' }[] = [];

      // Helper to add a geometry-based endpoint stop
      const addEndpointStop = (nodeId: number, coord: number[], position: 'first' | 'last') => {
        const [lon, lat] = coord;
        const stopName = stopNameBuilder(inputStops[nodeId]) || 'unnamed';
        if (!checkList[nodeId]) {
          checkList[nodeId] = true;
          stops.push({
            stop_id: nodeId,
            stop_name: stopName,
            stop_lat: lat,
            stop_lon: lon,
          });
        }
        filteredStops.nodes.push(nodeId);
        filteredStops.coordinates.push(coord as GeoJSONCoordinate);
        forcedEndpointStops.push({ stop_id: nodeId, stop_name: stopName, position });
      };

      // Force first stop if enabled and no OSM stop near the start
      if (forceEndpoints && nodes && nodes.length > 0) {
        const firstCoord = coordinates[0] as number[];
        let hasNearbyFirst = false;
        for (let i = 1; i < feature.length; i++) {
          const stopCoords = Array.isArray(feature[i].geometry.coordinates[0])
            ? (feature[i].geometry.coordinates as number[][])[0]
            : (feature[i].geometry.coordinates as number[]);
          if (distanceBetweenCoords(firstCoord[1], firstCoord[0], stopCoords[1], stopCoords[0]) < 5) {
            hasNearbyFirst = true;
            break;
          }
        }
        if (!hasNearbyFirst) {
          addEndpointStop(nodes[0], firstCoord, 'first');
        }
      }

      for (let i = 1; i < feature.length; i++) {
        const { geometry, properties } = feature[i];
        if (!checkList[properties.id]) {
          checkList[properties.id] = true;
          const coords = Array.isArray(geometry.coordinates[0])
            ? (geometry.coordinates as number[][])[0]
            : (geometry.coordinates as number[]);
          stops.push({
            stop_id: properties.id,
            stop_name: properties.name || 'unnamed',
            stop_lat: coords[1],
            stop_lon: coords[0],
          });
        }
        filteredStops.nodes.push(properties.id);
        const coords = Array.isArray(geometry.coordinates[0])
          ? (geometry.coordinates as number[][])[0]
          : (geometry.coordinates as number[]);
        filteredStops.coordinates.push(coords as GeoJSONCoordinate);
      }

      // Force last stop if enabled and no OSM stop near the end
      if (forceEndpoints && nodes && nodes.length > 0) {
        const lastCoord = coordinates[coordinates.length - 1] as number[];
        let hasNearbyLast = false;
        for (let i = 1; i < feature.length; i++) {
          const stopCoords = Array.isArray(feature[i].geometry.coordinates[0])
            ? (feature[i].geometry.coordinates as number[][])[0]
            : (feature[i].geometry.coordinates as number[]);
          if (distanceBetweenCoords(lastCoord[1], lastCoord[0], stopCoords[1], stopCoords[0]) < 5) {
            hasNearbyLast = true;
            break;
          }
        }
        if (!hasNearbyLast) {
          addEndpointStop(nodes[nodes.length - 1], lastCoord, 'last');
        }
      }

      routeFeature.gtfs.filteredStops = filteredStops;
      if (forcedEndpointStops.length > 0) {
        routeFeature.gtfs.forcedEndpointStops = forcedEndpointStops;
      }
    } else if (cfg.mode === 'customStops') {
      // Custom stops mode: use ONLY the provided custom stops
      const customStops = resolveCustomStops(cfg);
      const { nodes, coordinates } = routeFeature.geometry;
      const filteredStops: { nodes: number[]; coordinates: GeoJSONCoordinate[] } = { nodes: [], coordinates: [] };

      // Track last added stop for this route (to avoid consecutive duplicates and distance filtering)
      let lastStopId: string | null = null;
      let lastStopLat: number | null = null;
      let lastStopLon: number | null = null;

      // Helper function to add OSM-based stop for first/last points
      const addOsmStop = (nodeId: number, coords: number[]) => {
        const [lon, lat] = coords;
        if (!checkList[nodeId]) {
          checkList[nodeId] = true;
          const stopName = stopNameBuilder(inputStops[nodeId]);
          stops.push({
            stop_id: nodeId,
            stop_name: stopName || 'unnamed',
            stop_lat: lat,
            stop_lon: lon,
          });
        }
        filteredStops.nodes.push(nodeId);
        filteredStops.coordinates.push(coords as GeoJSONCoordinate);
        lastStopId = String(nodeId);
        lastStopLat = lat;
        lastStopLon = lon;
      };

      // Check if first point needs OSM stop
      const firstCoords = coordinates[0] as number[];
      const firstMatch = findNearestStop(customStops, firstCoords[1], firstCoords[0], maxMatchDistance);
      if (!firstMatch) {
        // No custom stop for first point - create from OSM
        addOsmStop(nodes![0], firstCoords);
      }

      for (let index = 0; index < nodes!.length; index++) {
        const coords = coordinates[index];
        const [lon, lat] = coords;
        const isLastPoint = index === nodes!.length - 1;
        const isFirstPoint = index === 0;

        const match = findNearestStop(customStops, lat, lon, maxMatchDistance);

        if (match) {
          const customStop = match.stop;
          const numericStopId = stopIdToNumber(customStop.stop_id);

          // Debug log for PM89
          if (customStop.stop_id === 'PM89') {
            console.log(`[DEBUG PM89] Found match for route ${routeFeature.properties.ref || routeFeature.properties.id}, distance: ${match.distanceMeters.toFixed(2)}m`);
          }

          // Skip if this is the same stop as the last one (avoid consecutive duplicates)
          if (lastStopId === customStop.stop_id) {
            if (customStop.stop_id === 'PM89') {
              console.log(`[DEBUG PM89] Skipped: same as last stop`);
            }
            continue;
          }

          // Check if stop is on the right side of the route (if rightSideOnly is enabled)
          if (rightSideOnly && !isFirstPoint && !isLastPoint) {
            // Get the line segment: previous point -> current point -> next point
            // Use the segment from previous to next to determine direction
            const prevCoords = coordinates[index - 1];
            const nextCoords = coordinates[index + 1];
            const lineStart: [number, number] = [prevCoords[0], prevCoords[1]];
            const lineEnd: [number, number] = [nextCoords[0], nextCoords[1]];
            const stopPoint: [number, number] = [customStop.stop_lon, customStop.stop_lat];

            if (!isPointOnRightSide(lineStart, lineEnd, stopPoint)) {
              // Stop is on the left side, skip it
              if (customStop.stop_id === 'PM89') {
                console.log(`[DEBUG PM89] Skipped: on left side of route ${routeFeature.properties.ref || routeFeature.properties.id}`);
              }
              continue;
            }
          }

          // Check minimum distance between consecutive stops
          if (minDistanceBetweenStops > 0 && lastStopLat !== null && lastStopLon !== null) {
            const distToLast = distanceBetweenCoords(lastStopLat, lastStopLon, customStop.stop_lat, customStop.stop_lon);
            if (distToLast < minDistanceBetweenStops) {
              // Skip this stop - too close to the previous one
              // But if it's the last point, we need to add it anyway
              if (!isLastPoint) {
                continue;
              }
            }
          }

          // Add stop to global stops list if not already added
          if (!checkList[customStop.stop_id]) {
            checkList[customStop.stop_id] = true;
            stops.push({
              stop_id: numericStopId,
              stop_name: customStop.stop_name,
              stop_lat: customStop.stop_lat,
              stop_lon: customStop.stop_lon,
            });
            if (customStop.stop_id === 'PM89') {
              console.log(`[DEBUG PM89] Added to global stops list`);
            }
          }

          // Use custom stop for this route point
          filteredStops.nodes.push(numericStopId);
          filteredStops.coordinates.push([customStop.stop_lon, customStop.stop_lat] as GeoJSONCoordinate);
          if (customStop.stop_id === 'PM89') {
            console.log(`[DEBUG PM89] Included in route ${routeFeature.properties.ref || routeFeature.properties.id}`);
          }

          // Update last stop tracking
          lastStopId = customStop.stop_id;
          lastStopLat = customStop.stop_lat;
          lastStopLon = customStop.stop_lon;
        } else if (isLastPoint) {
          // No custom stop for last point - create from OSM
          const nodeId = nodes![index];
          if (lastStopId !== String(nodeId)) {
            addOsmStop(nodeId, coords);
          }
        } else {
          // No custom stop found within range (not first or last)
          if (fallbackBehavior === 'error') {
            throw new Error(
              `Route ${routeFeature.properties.id}: No custom stop found within ${maxMatchDistance}m of point [${lat}, ${lon}]`
            );
          }
          // fallbackBehavior === 'warning': just skip this point silently
        }
      }
      routeFeature.gtfs.filteredStops = filteredStops;
    } else {
      // fakeStops mode: generate a stop at every OSM way node.
      // The dense raw output is reduced afterwards by segment-merge +
      // gap-fill in `geojson_to_gtfs/index.ts`, controlled globally by
      // `GTFSOptions.fakeStopsGapThreshold`.
      const { nodes, coordinates } = routeFeature.geometry;
      const filteredStops: { nodes: number[]; coordinates: GeoJSONCoordinate[] } = { nodes: [], coordinates: [] };
      for (let index = 0; index < nodes!.length; index++) {
        const stopId = nodes![index];
        const coords = coordinates[index];
        // Generate a stop at every node (no distance filtering)
        if (!checkList[stopId]) {
          checkList[stopId] = true;
          const stopName = stopNameBuilder(inputStops[stopId]);
          stops.push({
            stop_id: stopId,
            stop_name: stopName || 'unnamed',
            stop_lat: coords[1],
            stop_lon: coords[0],
          });
        }
        filteredStops.nodes.push(stopId);
        filteredStops.coordinates.push(coords as GeoJSONCoordinate);
      }
      routeFeature.gtfs.filteredStops = filteredStops;
    }
  }
  return stops;
}

export function shapesBuilder(features: GeoJSONFeature[][]): GTFSShape[] {
  const shapes: GTFSShape[] = [];
  for (let feature of features) {
    const mainFeature = feature[0];
    const shapeId = mainFeature.properties.id;
    const geometry = mainFeature.geometry;
    for (const index in geometry.coordinates) {
      const coordinates = geometry.coordinates[index];
      shapes.push({
        shape_id: shapeId,
        shape_pt_lat: coordinates[1],
        shape_pt_lon: coordinates[0],
        shape_pt_sequence: index,
      });
    }
  }
  return shapes;
}

export function stopTimesBuilder(
  features: GeoJSONFeature[][],
  vehicleSpeed: (feature: GeoJSONFeature) => number,
  gtfsConfig?: { useFrequencies?: boolean }
): GTFSStopTime[] {
  const stopTimes: GTFSStopTime[] = [];
  const useFrequencies = gtfsConfig?.useFrequencies ?? true;

  for (let feature of features) {
    const mainFeature = feature[0];
    if (!mainFeature.gtfs || !mainFeature.gtfs.filteredStops) continue;
    const speed = (vehicleSpeed(mainFeature) / 60 / 60) * 1000;

    for (const service of mainFeature.gtfs.services) {
      if (useFrequencies) {
        // FREQUENCY-BASED: Relative times from 00:00:00
        let previousCoords: number[] | undefined;
        let distance = 0;
        let seconds = 0;
        const { nodes, coordinates } = mainFeature.gtfs.filteredStops;
        for (const index in nodes) {
          const coords = coordinates[index];
          if (previousCoords) {
            distance = distanceBetween(previousCoords, coords, { units: 'kilometers' });
            seconds += Math.ceil((distance * 1000) / speed);
          }
          previousCoords = coords;
          const arrival_time = secondsToTime(seconds);
          stopTimes.push({
            trip_id: service.trip_id!,
            stop_sequence: index,
            stop_id: nodes[index],
            arrival_time: arrival_time,
            departure_time: arrival_time,
            timepoint: 0,
          });
        }
      } else {
        // SCHEDULE-BASED: Specific times for each expanded trip
        const expandedTrips = service.expandedTrips;
        if (!expandedTrips || expandedTrips.length === 0) {
          console.warn(`No expanded trips found for service ${service.service_id}`);
          continue;
        }

        // Calculate travel times between stops (same for all trips)
        const travelTimesSeconds: number[] = [];
        let previousCoords: number[] | undefined;
        const { nodes, coordinates } = mainFeature.gtfs.filteredStops;

        for (const index in nodes) {
          if (previousCoords) {
            const coords = coordinates[index];
            const distance = distanceBetween(previousCoords, coords, { units: 'kilometers' });
            const travelSeconds = Math.ceil((distance * 1000) / speed);
            travelTimesSeconds.push(travelSeconds);
          } else {
            travelTimesSeconds.push(0); // First stop has 0 travel time
          }
          previousCoords = coordinates[index];
        }

        // Generate stop times for each expanded trip
        for (const expandedTrip of expandedTrips) {
          const departureSecs = timeToSeconds(expandedTrip.departureTime.substring(0, 5));
          let cumulativeSeconds = 0;

          for (const index in nodes) {
            cumulativeSeconds += travelTimesSeconds[index];
            const stopArrivalSecs = departureSecs + cumulativeSeconds;
            const arrival_time = secondsToTime(stopArrivalSecs);

            stopTimes.push({
              trip_id: expandedTrip.trip_id,
              stop_sequence: index,
              stop_id: nodes[index],
              arrival_time: arrival_time,
              departure_time: arrival_time,
              timepoint: 0,
            });
          }
        }
      }
    }
  }
  return stopTimes;
}

export default {
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
};
