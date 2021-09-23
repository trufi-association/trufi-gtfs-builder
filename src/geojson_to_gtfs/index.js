
function geojsonToGtfs(features, inputStops, gtfsConfig, gtfsBuilders) {

  const {
    agencyBuilder,
    calendarBuilder,
    routeBuilder,
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
  const trips = tripBuilder(features);
  const frequencies = frequenciesBuilder(features, gtfsConfig.frequencyHeadwaySecs);
  const stops = stopsBuilder(
    features,
    inputStops,
    gtfsConfig.skipStopsWithinDistance,
    gtfsConfig.stopNameBuilder
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
  };
};

module.exports = geojsonToGtfs
