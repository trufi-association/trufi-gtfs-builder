"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.gtfsDefaultBuilders = void 0;
const gtfsBuilders_1 = __importDefault(require("./gtfsBuilders"));
exports.gtfsDefaultBuilders = gtfsBuilders_1.default;
function geojsonToGtfs(features, inputStops, gtfsConfig, gtfsBuilders) {
    const { agencyBuilder, calendarBuilder, routeBuilder, fareBuilder, feedBuilder, tripBuilder, frequenciesBuilder, stopsBuilder, shapesBuilder, stopTimesBuilder, } = gtfsBuilders;
    const featuresArray = Object.entries(features).map((element) => element[1].features);
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
    const stops = stopsBuilder(featuresArray, inputStops, gtfsConfig.skipStopsWithinDistance, gtfsConfig.stopNameBuilder, gtfsConfig.stopsConfig ?? gtfsConfig.customStops);
    const shapePoints = shapesBuilder(featuresArray);
    const stopTimes = stopTimesBuilder(featuresArray, gtfsConfig.vehicleSpeed, builderConfig);
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
exports.default = geojsonToGtfs;
//# sourceMappingURL=index.js.map