import type { GeoJSONFeature, GeoJSONFeatureCollection, GTFSData, GTFSBuilders, GTFSOptions } from '../types';
import gtfsDefaultBuilders from './gtfsBuilders';

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
  const trips = tripBuilder(featuresArray);
  const frequencies = frequenciesBuilder(featuresArray, gtfsConfig.frequencyHeadway);
  const stops = stopsBuilder(
    featuresArray,
    inputStops,
    gtfsConfig.skipStopsWithinDistance,
    gtfsConfig.stopNameBuilder,
    gtfsConfig.fakeStops
  );
  const shapePoints = shapesBuilder(featuresArray);
  const stopTimes = stopTimesBuilder(featuresArray, gtfsConfig.vehicleSpeed);

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
