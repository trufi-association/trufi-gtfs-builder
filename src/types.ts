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
}

export interface GTFSFareRule {
  fare_id: number;
  route_id: number;
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

export interface GTFSBuilders {
  agencyBuilder: (features: GeoJSONFeature[][], defaultAgencyInfo: Partial<GTFSAgency>) => GTFSAgency[];
  calendarBuilder: (features: GeoJSONFeature[][], defaultCalendar: (feature: GeoJSONFeature) => string) => GTFSCalendar[];
  routeBuilder: (features: GeoJSONFeature[][], options?: { routePerRelation?: boolean }) => GTFSRoute[];
  fareBuilder: (features: GeoJSONFeature[][], defaultFares: DefaultFaresConfig) => { attributes: GTFSFareAttribute[]; rules: GTFSFareRule[] };
  feedBuilder: (feed: FeedConfig) => GTFSFeedInfo[];
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
    gtfsConfig?: { useFrequencies?: boolean }
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
  vehicleSpeed: (feature: GeoJSONFeature) => number;
  stopNameBuilder: (stops?: string[]) => string;
  defaultFares?: DefaultFaresConfig;
  feed?: FeedConfig;
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
   * @deprecated Use `outputFiles.gtfsExpandedZip` instead. Selects
   * frequency-based vs schedule-based GTFS. Default true.
   */
  useFrequencies?: boolean;
}

export interface DefaultFaresConfig {
  currencyType: string;
}

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
