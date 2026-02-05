"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.gtfsDefaultBuilders = void 0;
const gtfsBuilders_1 = __importStar(require("./gtfsBuilders"));
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
    let stops = stopsBuilder(featuresArray, inputStops, gtfsConfig.skipStopsWithinDistance, gtfsConfig.stopNameBuilder, gtfsConfig.stopsConfig ?? gtfsConfig.customStops);
    const shapePoints = shapesBuilder(featuresArray);
    let stopTimes = stopTimesBuilder(featuresArray, gtfsConfig.vehicleSpeed, builderConfig);
    // Post-process: merge nearby stops if configured
    if (gtfsConfig.mergeNearbyStops && gtfsConfig.mergeNearbyStops > 0) {
        const merged = (0, gtfsBuilders_1.mergeNearbyStops)(stops, stopTimes, gtfsConfig.mergeNearbyStops);
        stops = merged.stops;
        stopTimes = merged.stopTimes;
    }
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