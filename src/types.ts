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

export interface GTFSFeatureData {
  agency_id: number;
  route_id: number;
  services: GTFSService[];
  filteredStops?: {
    nodes: number[];
    coordinates: GeoJSONCoordinate[];
  };
}

export interface GTFSService {
  service_id: string;
  startTime: string;
  endTime: string;
  trip_id?: number;
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
  route_id: number;
  agency_id: number;
  route_short_name: string;
  route_long_name: string;
  route_color: string;
  route_type: string;
}

export interface GTFSTrip {
  trip_id: number;
  route_id: number;
  service_id: string;
  shape_id: number;
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
  routeBuilder: (features: GeoJSONFeature[][]) => GTFSRoute[];
  fareBuilder: (features: GeoJSONFeature[][], defaultFares: DefaultFaresConfig) => { attributes: GTFSFareAttribute[]; rules: GTFSFareRule[] };
  feedBuilder: (feed: FeedConfig) => GTFSFeedInfo[];
  tripBuilder: (features: GeoJSONFeature[][]) => GTFSTrip[];
  frequenciesBuilder: (features: GeoJSONFeature[][], frequencyHeadway: (feature: GeoJSONFeature) => number) => GTFSFrequency[];
  stopsBuilder: (
    features: GeoJSONFeature[][],
    inputStops: { [id: number]: string[] },
    skipStopsWithinDistance: number,
    stopNameBuilder: (stops?: string[]) => string,
    fakeStops: (feature: GeoJSONFeature) => boolean
  ) => GTFSStop[];
  shapesBuilder: (features: GeoJSONFeature[][]) => GTFSShape[];
  stopTimesBuilder: (features: GeoJSONFeature[][], vehicleSpeed: (feature: GeoJSONFeature) => number) => GTFSStopTime[];
}

export interface GeojsonOptions {
  osmDataGetter: IOSMDataGetter | null;
  transformTypes: string[];
  skipRoute: (route: OSMRelation) => boolean;
}

export interface GTFSOptions {
  agencyTimezone: string;
  agencyUrl: string;
  cityName?: string;
  defaultCalendar: (feature: GeoJSONFeature) => string;
  frequencyHeadway: (feature: GeoJSONFeature) => number;
  vehicleSpeed: (feature: GeoJSONFeature) => number;
  fakeStops: (feature: GeoJSONFeature) => boolean;
  skipStopsWithinDistance: number;
  stopNameBuilder: (stops?: string[]) => string;
  defaultFares?: DefaultFaresConfig;
  feed?: FeedConfig;
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
