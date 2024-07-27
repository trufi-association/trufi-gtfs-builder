
function geojsonToGtfs(features, inputStops, gtfsConfig, gtfsBuilders) {

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
    stopTimesBuilder
  } = gtfsBuilders
  features = Object.entries(features).map(element => element[1].features)

  const agencies = agencyBuilder(features, {
    agency_timezone: gtfsConfig.agencyTimezone,
    agency_url: gtfsConfig.agencyUrl,
  })
  const calendar = calendarBuilder(features, gtfsConfig.defaultCalendar)
  const routes = routeBuilder(features)
  const fare = fareBuilder(features, gtfsConfig.defaultFares)
  const feeds = feedBuilder(gtfsConfig.feed)
  const trips = tripBuilder(features);
  const frequencies = frequenciesBuilder(features, gtfsConfig.frequencyHeadway);
  const stops = stopsBuilder(
    features,
    inputStops,
    gtfsConfig.skipStopsWithinDistance,
    gtfsConfig.stopNameBuilder,
    gtfsConfig.fakeStops
  );
  const shapePoints = shapesBuilder(features)
  const stopTimes = stopTimesBuilder(features, gtfsConfig.vehicleSpeed);

  return {
    "agency": agencies,
    "calendar": calendar,
    "routes": routes,
    "trips": trips,
    "frequencies": frequencies,
    "stops": stops,
    'stop_times': stopTimes,
    "shapes": shapePoints,
    "fare_attributes": fare.attributes,
    "fare_rules": fare.rules,
    "feed_info": feeds
  };
};

module.exports = geojsonToGtfs
