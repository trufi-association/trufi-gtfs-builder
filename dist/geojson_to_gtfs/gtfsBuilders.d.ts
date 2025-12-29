import type { GeoJSONFeature, GTFSAgency, GTFSCalendar, GTFSRoute, GTFSTrip, GTFSFrequency, GTFSStop, GTFSShape, GTFSStopTime, GTFSFareAttribute, GTFSFareRule, GTFSFeedInfo, DefaultFaresConfig, FeedConfig } from '../types';
export declare function agencyBuilder(features: GeoJSONFeature[][], defaultAgencyInfo: Partial<GTFSAgency>): GTFSAgency[];
export declare function calendarBuilder(features: GeoJSONFeature[][], defaultCalendar: (feature: GeoJSONFeature) => string): GTFSCalendar[];
export declare function routeBuilder(features: GeoJSONFeature[][]): GTFSRoute[];
export declare function fareBuilder(features: GeoJSONFeature[][], defaultFares: DefaultFaresConfig): {
    attributes: GTFSFareAttribute[];
    rules: GTFSFareRule[];
};
export declare function feedBuilder(feed: FeedConfig): GTFSFeedInfo[];
export declare function tripBuilder(features: GeoJSONFeature[][]): GTFSTrip[];
export declare function frequenciesBuilder(features: GeoJSONFeature[][], frequencyHeadwaySecs: (feature: GeoJSONFeature) => number): GTFSFrequency[];
export declare function stopsBuilder(features: GeoJSONFeature[][], inputStops: {
    [id: number]: string[];
}, maxStopsDistance: number, stopNameBuilder: (stops?: string[]) => string, fakeStops: (feature: GeoJSONFeature) => boolean): GTFSStop[];
export declare function shapesBuilder(features: GeoJSONFeature[][]): GTFSShape[];
export declare function stopTimesBuilder(features: GeoJSONFeature[][], vehicleSpeed: (feature: GeoJSONFeature) => number): GTFSStopTime[];
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
};
export default _default;
//# sourceMappingURL=gtfsBuilders.d.ts.map