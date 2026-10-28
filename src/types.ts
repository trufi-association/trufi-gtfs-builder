// Types and interfaces for GTFS Builder

export interface Bounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface OSMTags {
  [key: string]: string;
}

export interface OSMElement {
  id: number;
  tags: OSMTags;
  [key: string]: any;
}

export interface OSMNode extends OSMElement {
  type: 'node';
  lat: number;
  lon: number;
}

export interface OSMWay extends OSMElement {
  type: 'way';
  nodes: number[];
  refs?: number[];
  geometry: Array<{ lat: number; lon: number }>;
  info?: any;
}

export interface OSMRelationMember {
  type: 'way' | 'node' | 'relation';
  ref: number;
  id?: number;
  role?: string;
}

export interface OSMRelation extends OSMElement {
  type: 'relation';
  members: OSMRelationMember[];
}

export interface OSMData {
  routes: { [id: number]: OSMRelation };
  ways: { [id: number]: OSMWay };
  stops: { [id: number]: OSMNode };
}

export interface GeoJSONCoordinate extends Array<number> {
  0: number; // longitude
  1: number; // latitude
}

export interface GeoJSONGeometry {
  type: string;
  coordinates: GeoJSONCoordinate[] | GeoJSONCoordinate;
  nodes?: number[];
}

export interface GeoJSONFeature {
  type: 'Feature';
  properties: any;
  geometry: GeoJSONGeometry & { nodes?: number[]; coordinates: GeoJSONCoordinate[] };
  gtfs?: GTFSFeatureData;
}

export interface GeoJSONFeatureCollection {
  type: 'FeatureCollection';
  features: GeoJSONFeature[];
}

export interface ForcedEndpointStop {
  stop_id: number;
  stop_name: string;
  position: 'first' | 'last';
}

export interface GTFSFeatureData {
  agency_id: number;
  route_id: number;
  services: GTFSService[];
  filteredStops?: {
    nodes: number[];
    coordinates: GeoJSONCoordinate[];
  };
  forcedEndpointStops?: ForcedEndpointStop[];
}

export interface GTFSService {
  service_id: string;
  startTime: string;
  endTime: string;
  trip_id?: number;
  /** Expanded trips for schedule-based GTFS (useFrequencies=false) */
  expandedTrips?: Array<{ trip_id: number; departureTime: string }>;
}

export interface GTFSAgency {
  agency_id: number;
  agency_name: string;
  agency_timezone: string;
  agency_url: string;
}

export interface GTFSCalendar {
  service_id: string;
  monday: number;
  tuesday: number;
  wednesday: number;
  thursday: number;
  friday: number;
  saturday: number;
  sunday: number;
  start_date: string;
  end_date: string;
}

export interface GTFSRoute {
  route_id: string | number;
  agency_id: number;
  route_short_name: string;
  route_long_name: string;
  route_color: string;
  route_type: string;
  /** GTFS `continuous_pickup`: 0 = riders board anywhere along the route,
      1 = only at stops. Present on every route when
      `GTFSOptions.continuousStops` is on (`true` or a function; the CSV
      writer takes its columns from the first row), absent otherwise. */
  continuous_pickup?: number;
  /** GTFS `continuous_drop_off`, same values as `continuous_pickup`. */
  continuous_drop_off?: number;
}

export interface GTFSTrip {
  trip_id: number;
  route_id: string | number;
  service_id: string;
  shape_id: number;
  trip_headsign?: string;
  direction_id?: number;
}

export interface GTFSFrequency {
  trip_id: number;
  start_time: string;
  end_time: string;
  headway_secs: number;
  exact_times: number;
}

export interface GTFSStop {
  stop_id: number;
  stop_name: string;
  stop_lat: number;
  stop_lon: number;
  stop_desc?: string;
}

export interface GTFSStopTime {
  trip_id: number;
  stop_sequence: string | number;
  stop_id: number;
  arrival_time: string;
  departure_time: string;
  timepoint: number;
}

export interface GTFSShape {
  shape_id: number;
  shape_pt_lat: number;
  shape_pt_lon: number;
  shape_pt_sequence: string | number;
}

export interface GTFSFareAttribute {
  agency_id: number;
  fare_id: number;
  price: number;
  currency_type: string;
  payment_method: number;
  /** 0 | 1 | 2 transfers, or '' (GTFS empty value = unlimited). Required column. */
  transfers: number | '';
}

export interface GTFSFareRule {
  fare_id: number;
  route_id: string | number;
}

/*
 * GTFS-Fares V2 rows, written only with `GTFSOptions.faresV2`. Field names
 * and presence follow the GTFS reference, Fares V2 section
 * (https://gtfs.org/documentation/schedule/reference/#fare_productstxt).
 * Optional columns the builder never fills (`fare_media_id`,
 * `network_name`, `leg_group_id`, `eligibility_url`…) are not declared.
 */
export interface GTFSFareProduct {
  /** `<currency>_<amount>` for a general fare, `<currency>_<amount>_<rider_category_id>` for a category. */
  fare_product_id: string;
  /** Non-empty: OpenTripPlanner 2.x requires a name (`FareProduct.of`). */
  fare_product_name: string;
  /** '' = eligible for any rider (the GTFS empty value). */
  rider_category_id: string;
  /** Formatted with the ISO 4217 minor units of `currency` ("3.00", "200"). */
  amount: string;
  currency: string;
}

export interface GTFSRiderCategory {
  rider_category_id: string;
  rider_category_name: string;
  /** Required column; 0 = not the default category. */
  is_default_fare_category: 0 | 1;
}

export interface GTFSFareLegRule {
  network_id: string;
  fare_product_id: string;
}

export interface GTFSNetwork {
  network_id: string;
}

export interface GTFSRouteNetwork {
  network_id: string;
  route_id: string | number;
}

export interface GTFSFeedInfo {
  feed_publisher_url: string;
  feed_publisher_name: string;
  feed_lang: string;
  feed_version: string;
  feed_contact_email: string;
  feed_contact_url: string;
  feed_start_date: string;
  feed_end_date: string;
  feed_id: string;
}

/**
 * One row of `attributions.txt` — the fields of the GTFS reference
 * (https://gtfs.org/documentation/schedule/reference/#attributionstxt).
 * `organization_name` is required; at least one of `is_producer`,
 * `is_operator`, `is_authority` must be `1`; at most one of `agency_id`,
 * `route_id`, `trip_id` may be set (none = the whole dataset).
 */
export interface GTFSAttribution {
  /** Unique within the file. `osm` is reserved for the OpenStreetMap row. */
  attribution_id?: string;
  agency_id?: string | number;
  route_id?: string | number;
  trip_id?: string | number;
  organization_name: string;
  is_producer?: 0 | 1;
  is_operator?: 0 | 1;
  is_authority?: 0 | 1;
  /** Fully qualified: `http://` or `https://`. */
  attribution_url?: string;
  attribution_email?: string;
  attribution_phone?: string;
}

/** The licenses the builder can write in full as a `LICENSE` file. */
export type FeedLicense = 'ODbL-1.0';

export interface GTFSData {
  agency: GTFSAgency[];
  calendar: GTFSCalendar[];
  routes: GTFSRoute[];
  trips: GTFSTrip[];
  frequencies: GTFSFrequency[];
  stops: GTFSStop[];
  stop_times: GTFSStopTime[];
  shapes: GTFSShape[];
  fare_attributes: GTFSFareAttribute[];
  fare_rules: GTFSFareRule[];
  feed_info: GTFSFeedInfo[];
  attributions: GTFSAttribution[];
  /** Fares V2, present only with `GTFSOptions.faresV2` (a file is written per non-empty array). */
  fare_products?: GTFSFareProduct[];
  rider_categories?: GTFSRiderCategory[];
  fare_leg_rules?: GTFSFareLegRule[];
  networks?: GTFSNetwork[];
  route_networks?: GTFSRouteNetwork[];
}

export interface GeojsonToGtfsResult {
  geojsonFeatures: { [key: string]: GeoJSONFeatureCollection };
  stops: { [id: number]: string[] };
  log: LogEntry[];
  readme?: string;
}

export interface LogEntry {
  id: number;
  tags: OSMTags;
  error?: any;
}

export interface FareBuilderOptions {
  /** Also derive the Fares V2 rows from the resolved fares (see `GTFSOptions.faresV2`). */
  faresV2?: boolean;
}

export interface FareBuilderResult {
  attributes: GTFSFareAttribute[];
  rules: GTFSFareRule[];
  /** Present only when `FareBuilderOptions.faresV2` was requested. */
  fare_products?: GTFSFareProduct[];
  rider_categories?: GTFSRiderCategory[];
  fare_leg_rules?: GTFSFareLegRule[];
  networks?: GTFSNetwork[];
  route_networks?: GTFSRouteNetwork[];
}

export interface GTFSBuilders {
  agencyBuilder: (features: GeoJSONFeature[][], defaultAgencyInfo: Partial<GTFSAgency>) => GTFSAgency[];
  calendarBuilder: (features: GeoJSONFeature[][], defaultCalendar: (feature: GeoJSONFeature) => string) => GTFSCalendar[];
  routeBuilder: (
    features: GeoJSONFeature[][],
    options?: { routePerRelation?: boolean; continuousStops?: ContinuousStopsConfig }
  ) => GTFSRoute[];
  fareBuilder: (
    features: GeoJSONFeature[][],
    defaultFares: DefaultFaresConfig,
    fareResolver?: FareResolver,
    options?: FareBuilderOptions
  ) => FareBuilderResult;
  feedBuilder: (feed: FeedConfig) => GTFSFeedInfo[];
  attributionsBuilder: (features: GeoJSONFeature[][], attributions?: GTFSAttribution[]) => GTFSAttribution[];
  tripBuilder: (
    features: GeoJSONFeature[][],
    gtfsConfig?: { useFrequencies?: boolean; frequencyHeadway?: (feature: GeoJSONFeature) => number }
  ) => GTFSTrip[];
  frequenciesBuilder: (
    features: GeoJSONFeature[][],
    frequencyHeadway: (feature: GeoJSONFeature) => number,
    gtfsConfig?: { useFrequencies?: boolean }
  ) => GTFSFrequency[];
  stopsBuilder: (
    features: GeoJSONFeature[][],
    inputStops: { [id: number]: string[] },
    stopNameBuilder: (stops?: string[]) => string,
    stopsConfig: StopsConfigResolver
  ) => GTFSStop[];
  shapesBuilder: (features: GeoJSONFeature[][]) => GTFSShape[];
  stopTimesBuilder: (
    features: GeoJSONFeature[][],
    vehicleSpeed: (feature: GeoJSONFeature) => number,
    gtfsConfig?: { useFrequencies?: boolean; tripDuration?: TripDurationResolver }
  ) => GTFSStopTime[];
}

export interface GeojsonOptions {
  osmDataGetter: IOSMDataGetter | null;
  transformTypes: string[];
  skipRoute: (route: OSMRelation) => boolean;
}

export interface CustomStop {
  stop_id: string;
  stop_name: string;
  stop_lat: number;
  stop_lon: number;
}

/**
 * How stops are derived for a single route.
 *
 * - `fakeStops`: emit a stop at every node of the route's OSM way
 *   geometry, then post-process via segment-merge + gap-fill. Use this
 *   for cities where physical stops aren't mapped — buses stop wherever
 *   passengers wave them down (e.g. Cochabamba minibuses).
 * - `osmStops`: use the route's `stop_position` / `platform` members
 *   from the OSM relation. Stop ids come straight from those nodes; no
 *   merging is applied.
 * - `customStops`: match the route's geometry against an externally
 *   curated list of stops (passed inline or as a GeoJSON file).
 *
 * Modes never share stop ids automatically. A route in `osmStops` and
 * one in `fakeStops` only share a stop id when OSM marks the same node
 * as both a way member and a stop_position. For mixed-mode feeds where
 * each mode covers disjoint physical corridors this works naturally.
 */
/** See `GTFSOptions.continuousStops`. */
export type ContinuousStopsConfig = boolean | ((routeFeature: GeoJSONFeature) => boolean);

export interface FakeStopsConfig {
  mode: 'fakeStops';
  // No per-route options. Density is controlled globally via
  // `GTFSOptions.fakeStopsGapThreshold` so all fakeStops trips land on
  // the same gap-filled stops — required for transfers to find shared
  // stop ids on segments where multiple routes coincide.
}

export interface OsmStopsConfig {
  mode: 'osmStops';
  /** Force a stop at the first and last point of the route geometry
      when OSM doesn't have a stop near those endpoints. Default false. */
  forceEndpointStops?: boolean;
}

export interface CustomStopsModeConfig {
  mode: 'customStops';
  /** Custom stops data — pass `stops` inline or `filePath` to a GeoJSON. */
  stops?: CustomStop[];
  /** Path to a GeoJSON file with custom stops. */
  filePath?: string;
  /** Maximum distance (meters) to match a custom stop to a route point. Default 200. */
  maxMatchDistance?: number;
  /** Minimum distance (meters) between consecutive stops; closer ones skipped. Default 0. */
  minDistanceBetweenStops?: number;
  /** Behavior when no custom stop is found near a route point. Default 'warning'. */
  fallbackBehavior?: 'error' | 'warning';
  /** Only keep stops on the right side of the route direction. Default false. */
  rightSideOnly?: boolean;
  /** Force a stop at the first and last point of the route geometry. Default false. */
  forceEndpointStops?: boolean;
}

export type StopsConfig =
  | FakeStopsConfig
  | OsmStopsConfig
  | CustomStopsModeConfig;

/**
 * Resolves the stop generation config for a single route. Called once
 * per route during `stopsBuilder`. For uniform feeds, return the same
 * config every time. For mixed feeds, dispatch on `routeFeature.properties`.
 */
export type StopsConfigResolver = (
  routeFeature: GeoJSONFeature,
) => StopsConfig;

export interface GTFSOptions {
  agencyTimezone: string;
  agencyUrl: string;
  cityName?: string;
  defaultCalendar: (feature: GeoJSONFeature) => string;
  frequencyHeadway: (feature: GeoJSONFeature) => number;
  /**
   * Average speed, in km/h, used to time the stops of a route that has no
   * usable running time (no `duration=*` on the OSM relation, no
   * `tripDuration` answer). Called once per route with its feature, so a
   * city can vary it by `properties.route` (bus vs light_rail vs
   * aerialway), by `ref`, by operator… Must return a positive number.
   * @default () => 50 — a placeholder; set the real speed(s) of your city
   */
  vehicleSpeed: (feature: GeoJSONFeature) => number;
  /**
   * Per-route running time override. Receives the route feature, the
   * running time parsed from the relation's OSM `duration=*` tag (seconds;
   * `undefined` when absent or malformed) and the route length in meters.
   * Its answer is final: the trip's end-to-end running time in seconds, or
   * `undefined` to time the trip from `vehicleSpeed`. Without a resolver
   * the OSM duration is used whenever it is present and plausible.
   */
  tripDuration?: TripDurationResolver;
  stopNameBuilder: (stops?: string[]) => string;
  /**
   * Fares V1 defaults: the currency assumed for `charge=*` values without
   * an ISO code, for `fee=no` and for `price`; the price used when OSM has
   * no `charge=*`. With no `price` and no OSM fare a route gets NO fare
   * row. There is no implicit currency: without `currencyType`, a bare
   * `charge` amount or a `fee=no` is ignored with a warning — only values
   * that carry their own ISO code become rows.
   * @default none
   */
  defaultFares?: DefaultFaresConfig;
  /**
   * Per-route fare override. Receives the route feature and the fare
   * derived from OSM (`charge=*` / `fee=no`), if any; its return value is
   * final: a `RouteFare` to emit, or `undefined` to emit no fare for that
   * route. When set, `defaultFares.price` is not applied automatically —
   * return it yourself where it holds.
   */
  fare?: FareResolver;
  /**
   * Also write GTFS-Fares V2 next to the V1 files, derived from the same
   * resolved fares: `fare_products.txt` (one product per distinct amount,
   * currency and rider category), `rider_categories.txt` (only when some
   * `charge=*` carries further `/<unit>` values, e.g. `1 BOB/estudiante`),
   * `networks.txt` + `route_networks.txt` (one network per distinct fare,
   * so routes with the same fare share it whatever their agency) and
   * `fare_leg_rules.txt` (one row per network and product). V1 stays what
   * it was, byte for byte: the reference allows both in one dataset and
   * recommends that consumers prefer V2. Not written: `fare_media.txt`,
   * `fare_transfer_rules.txt`, `timeframes.txt`, `areas.txt` — the data
   * has no media, transfer, time or zone pricing. No consumer of the
   * Trufi stack reads V2 yet (README, "Fares V2"): this enables an
   * output, it does not switch one.
   * @default false
   */
  faresV2?: boolean;
  feed?: FeedConfig;
  /**
   * Extra rows of `attributions.txt`, e.g. the organisation that publishes
   * the feed (`is_producer`) or the operator of a route (`is_operator` +
   * `route_id`). The OpenStreetMap contributors row (`attribution_id`
   * `osm`, `is_producer` 1) is always written first and cannot be removed:
   * every feed this tool builds is derived from OSM, whose license requires
   * the attribution. Rows are checked against the GTFS reference; a bad
   * one throws, as a config bug.
   * @default []
   */
  attributions?: GTFSAttribution[];
  /**
   * License written in full as a `LICENSE` file next to the GTFS .txt
   * files, and therefore inside the zips. `false` writes no LICENSE file —
   * the OSM attribution is still written, the ODbL requires it however
   * the derivative is licensed; it is then up to the publisher to state
   * the feed's license elsewhere. See "Licensing of the output" in the
   * README.
   * @default 'ODbL-1.0'
   */
  license?: FeedLicense | false;
  /**
   * Per-route stop generation. Required — no implicit default. Receives
   * the route feature and returns the `StopsConfig` to apply for that
   * route. Uniform feeds return the same config every time.
   */
  stopsConfig: StopsConfigResolver;
  /**
   * Maximum gap (meters) between consecutive stops kept by the
   * fakeStops segment-merge post-process. Smaller = more stops kept.
   * Single global value: routes that share a segment must land on the
   * same gap-filled stops to keep their stop ids in common (transfers
   * depend on shared ids).
   * @default 100
   */
  fakeStopsGapThreshold?: number;
  /**
   * Emit one GTFS route per OSM relation instead of grouping relations
   * that share (agency_id, route_short_name/ref). Useful for informal
   * networks where many distinct lines reuse a handful of refs (e.g.
   * Sana'a: 157 relations share ref "7"). route_id becomes the OSM
   * relation id (stable across runs, matches trip_id/shape_id);
   * route_short_name stays ref→name→id; route_long_name uses the
   * relation's own name (fallback: short name) so each variant keeps
   * its identity in route lists.
   * @default false
   */
  routePerRelation?: boolean;
  /**
   * Declare in `routes.txt` that riders board and alight anywhere along
   * the route (`continuous_pickup` / `continuous_drop_off` = 0), the GTFS
   * way to say what `fakeStops` approximates with a stop every ~100 m.
   * `true` for every route, or a function of the route feature (return
   * `true`/`false` per route; routes that return `false` get 1, "only at
   * stops"). With routes grouped by agency + ref the function sees every
   * relation of the group: one `true` marks the route, a disagreement is
   * logged. The stops themselves are unchanged, and no consumer routes
   * with these columns yet: OpenTripPlanner 2.x drops them from
   * `routes.txt` (its route model has no such field; the `stop_times.txt`
   * ones it reads only to flag an invalid Flex combination, continuous
   * routing itself is an unmerged draft, opentripplanner/OpenTripPlanner#3457)
   * and trufi-core's offline planner boards at `stops.txt` only, so keep
   * `fakeStops` where riders wave the bus down. Off by default (absent or
   * `false`): the two columns are not written at all.
   */
  continuousStops?: ContinuousStopsConfig;
  /**
   * @deprecated Use `outputFiles.gtfsExpandedZip` instead. Selects
   * frequency-based vs schedule-based GTFS. Default true.
   */
  useFrequencies?: boolean;
}

export interface DefaultFaresConfig {
  /** ISO 4217 code — three upper-case letters, e.g. 'BOB' (the code list
      itself is not checked). Used for `price`, for `fee=no` and for
      `charge=*` values that carry no currency. Empty = no currency known. */
  currencyType: string;
  /** Fare applied to routes without a `charge=*` tag. Omit it when the
      city-wide fare is unknown: no row is better than a false `0`. */
  price?: number;
  /** GTFS `payment_method`: 0 = paid on board (default), 1 = before boarding. */
  paymentMethod?: 0 | 1;
  /** GTFS `transfers`: 0 (default), 1, 2, or `null` for unlimited. */
  transfers?: 0 | 1 | 2 | null;
}

/** The fare of one route, as returned by OSM parsing or a `fare` resolver. */
export interface RouteFare {
  /** Non-negative; 0 means the ride is free. */
  price: number;
  /** ISO 4217 code — three upper-case letters, e.g. 'BOB'. */
  currency: string;
  /** Defaults to `defaultFares.paymentMethod`, then 0. */
  paymentMethod?: 0 | 1;
  /** Defaults to `defaultFares.transfers`, then 0. `null` = unlimited. */
  transfers?: 0 | 1 | 2 | null;
  /** Where the fare came from ('osm' when parsed from `charge=*`). Used to
      prefer OSM-sourced fares when a route's variants disagree. */
  source?: string;
  /**
   * Rider-category prices of the route, Fares V2 only (V1 has no such
   * concept and ignores them). Parsed from the further `;`-separated
   * values of `charge=*`: `3 BOB/persona;1 BOB/estudiante` gives one
   * category `estudiante` at 1 BOB, in the fare's currency. A `fare`
   * resolver may pass them through, drop or edit them.
   */
  riderCategories?: RiderCategoryFare[];
}

/** A rider-category price of a route, e.g. `1 BOB/estudiante` (Fares V2). */
export interface RiderCategoryFare {
  /** `rider_category_id`: the OSM unit text as ASCII (`estudiante primaria`
      → `estudiante_primaria`), shared by every route that writes the same
      text. Must be unique within the fare. */
  id: string;
  /** `rider_category_name`, as written in OSM. */
  name: string;
  /** Non-negative, in the currency of the route fare. */
  price: number;
}

/**
 * Resolves the fare of a single route relation. `osmFare` is what
 * `charge=*` / `fee=no` on the relation say (undefined when they say
 * nothing; its `riderCategories` are the further `charge=*` values, see
 * `RouteFare`). Return a fare to emit it, or `undefined` for "unknown" — the
 * route then gets no `fare_attributes` / `fare_rules` rows. A fare that
 * GTFS cannot take (negative price, currency not `[A-Z]{3}`,
 * `paymentMethod` outside 0 | 1, `transfers` outside 0 | 1 | 2 | null)
 * throws: it is a config bug — and so does an invalid `riderCategories`
 * (ids missing or repeated, names missing, negative prices).
 */
export type FareResolver = (
  routeFeature: GeoJSONFeature,
  osmFare: RouteFare | undefined,
) => RouteFare | undefined;

/**
 * Resolves the running time of a single route relation. `osmDurationSeconds`
 * is what `duration=*` on the relation says (undefined when absent or
 * malformed); `routeLengthMeters` is the sum of straight-line distances
 * between consecutive stops. Return seconds to use them, or `undefined` to
 * fall back to `vehicleSpeed`. Anything that is not a positive finite
 * number throws: it is a config bug. A value that implies an average speed
 * outside the plausible range for the mode (below 3 km/h or above the
 * gtfs-validator threshold, e.g. 150 km/h for buses) is ignored with a
 * warning.
 */
export type TripDurationResolver = (
  routeFeature: GeoJSONFeature,
  osmDurationSeconds: number | undefined,
  routeLengthMeters: number,
) => number | undefined;

export interface FeedConfig {
  publisherUrl: string;
  publisherName: string;
  lang: string;
  version: string;
  contactEmail: string;
  contactUrl: string;
  startDate: string;
  endDate: string;
  id: string;
}

export interface OutputFiles {
  outputDir: string | null;
  routes: boolean;
  log: boolean;
  stops: boolean;
  readme: boolean;
  gtfs: boolean;
  gtfsZip: boolean;
  /** Generate an additional zip with schedule-based GTFS (expanded trips, no frequencies.txt) */
  gtfsExpandedZip: boolean;
  trufiTPData: boolean;
}

export interface OsmToGtfsConfig {
  outputFiles?: Partial<OutputFiles>;
  geojsonOptions?: Partial<GeojsonOptions>;
  gtfsOptions?: Partial<GTFSOptions>;
  gtfsBuilders?: Partial<GTFSBuilders>;
}

export interface IOSMDataGetter {
  getRoutes(transformTypes: string[]): Promise<{ [id: number]: OSMRelation }>;
  getWays(): Promise<{ [id: number]: OSMWay }>;
  getStops(): Promise<{ [id: number]: OSMNode }>;
}

export interface TrufiTPRoute {
  id: number;
  name: string;
  stops: number[];
  from: string;
  to: string;
  connections: Array<{ other_route: number; mine: number; other: number }>;
  distances: number[];
}

export interface TrufiTPStop {
  id: number;
  lng: number;
  lat: number;
  routes: Array<{ route: number; index: number }>;
}

export interface TrufiTPData {
  routes: TrufiTPRoute[];
  stops: { [id: number]: TrufiTPStop };
}

export interface RouteExtractorResult {
  nodes: number[];
  stops: { [id: number]: string[] };
  points: GeoJSONCoordinate[];
  routeStops: OSMNode[];
}
