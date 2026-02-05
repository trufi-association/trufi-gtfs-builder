import type { GeoJSONFeature, GTFSAgency, GTFSCalendar, GTFSRoute, GTFSTrip, GTFSFrequency, GTFSStop, GTFSShape, GTFSStopTime, GTFSFareAttribute, GTFSFareRule, GTFSFeedInfo, DefaultFaresConfig, FeedConfig, CustomStopsConfig } from '../types';
export declare function agencyBuilder(features: GeoJSONFeature[][], defaultAgencyInfo: Partial<GTFSAgency>): GTFSAgency[];
export declare function calendarBuilder(features: GeoJSONFeature[][], defaultCalendar: (feature: GeoJSONFeature) => string): GTFSCalendar[];
export declare function routeBuilder(features: GeoJSONFeature[][]): GTFSRoute[];
export declare function fareBuilder(features: GeoJSONFeature[][], defaultFares: DefaultFaresConfig): {
    attributes: GTFSFareAttribute[];
    rules: GTFSFareRule[];
};
export declare function feedBuilder(feed: FeedConfig): GTFSFeedInfo[];
export declare function tripBuilder(features: GeoJSONFeature[][], gtfsConfig?: {
    useFrequencies?: boolean;
    frequencyHeadway?: (feature: GeoJSONFeature) => number;
}): GTFSTrip[];
export declare function frequenciesBuilder(features: GeoJSONFeature[][], frequencyHeadwaySecs: (feature: GeoJSONFeature) => number, gtfsConfig?: {
    useFrequencies?: boolean;
}): GTFSFrequency[];
export declare function stopsBuilder(features: GeoJSONFeature[][], inputStops: {
    [id: number]: string[];
}, maxStopsDistance: number, stopNameBuilder: (stops?: string[]) => string, stopsConfig?: CustomStopsConfig): GTFSStop[];
export declare function shapesBuilder(features: GeoJSONFeature[][]): GTFSShape[];
export declare function stopTimesBuilder(features: GeoJSONFeature[][], vehicleSpeed: (feature: GeoJSONFeature) => number, gtfsConfig?: {
    useFrequencies?: boolean;
}): GTFSStopTime[];
/**
 * Post-processing: Merge stops that are within a given distance of each other
 * AND share at least one common route/trip.
 * This reduces duplicate stops without merging unrelated stops.
 */
export declare function mergeNearbyStops(stops: GTFSStop[], stopTimes: GTFSStopTime[], maxDistanceMeters: number): {
    stops: GTFSStop[];
    stopTimes: GTFSStopTime[];
    mergedCount: number;
};
declare const _default: {
    agencyBuilder: typeof agencyBuilder;
    calendarBuilder: typeof calendarBuilder;
    routeBuilder: typeof routeBuilder;
    fareBuilder: typeof fareBuilder;
    feedBuilder: typeof feedBuilder;
    tripBuilder: typeof tripBuilder;
    frequenciesBuilder: typeof frequenciesBuilder;
    stopsBuilder: typeof stopsBuilder;
    shapesBuilder: typeof shapesBuilder;
    stopTimesBuilder: typeof stopTimesBuilder;
    mergeNearbyStops: typeof mergeNearbyStops;
};
export default _default;
//# sourceMappingURL=gtfsBuilders.d.ts.map