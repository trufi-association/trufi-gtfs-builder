import type { GeoJSONFeature, GeoJSONFeatureCollection, GTFSData, GTFSBuilders, GTFSOptions } from '../types';
import gtfsDefaultBuilders, { mergeNearbyStops } from './gtfsBuilders';

function geojsonToGtfs(
  features: { [key: string]: GeoJSONFeatureCollection },
  inputStops: { [id: number]: string[] },
  gtfsConfig: GTFSOptions,
  gtfsBuilders: GTFSBuilders
): GTFSData {
  const {
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
  } = gtfsBuilders;

  const featuresArray: GeoJSONFeature[][] = Object.entries(features).map((element) => element[1].features);

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
  let stops = stopsBuilder(
    featuresArray,
    inputStops,
    gtfsConfig.skipStopsWithinDistance,
    gtfsConfig.stopNameBuilder,
    gtfsConfig.stopsConfig ?? gtfsConfig.customStops
  );
  const shapePoints = shapesBuilder(featuresArray);
  let stopTimes = stopTimesBuilder(featuresArray, gtfsConfig.vehicleSpeed, builderConfig);

  // Post-process: merge nearby stops if configured
  if (gtfsConfig.mergeNearbyStops && gtfsConfig.mergeNearbyStops > 0) {
    const merged = mergeNearbyStops(stops, stopTimes, gtfsConfig.mergeNearbyStops);
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

export default geojsonToGtfs;
export { gtfsDefaultBuilders };
