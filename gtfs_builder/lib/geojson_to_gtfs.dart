import 'gtfs_builders.dart';

Map<String, List<Map<String, dynamic>>> geojsonToGtfs(
  Map<String, dynamic> features,
  Map<String, dynamic> inputStops,
  Map<String, dynamic> gtfsConfig,
) {
  final featureGroups = features.entries
      .map((e) => (e.value['features'] as List)
          .map((f) => f as Map<String, dynamic>)
          .toList())
      .toList();

  final agencies = GtfsBuilders.agencyBuilder(
      featureGroups, {
        'agency_timezone': gtfsConfig['agencyTimezone'],
        'agency_url': gtfsConfig['agencyUrl']
      });

  final calendar = GtfsBuilders.calendarBuilder(
      featureGroups, gtfsConfig['defaultCalendar']);
  final routes = GtfsBuilders.routeBuilder(featureGroups);
  final fare = GtfsBuilders.fareBuilder(featureGroups, gtfsConfig['defaultFares']);
  final trips = GtfsBuilders.tripBuilder(featureGroups);
  final frequencies =
      GtfsBuilders.frequenciesBuilder(featureGroups, gtfsConfig['frequencyHeadway']);
  final stops = GtfsBuilders.stopsBuilder(
      featureGroups, inputStops, gtfsConfig['stopNameBuilder']);
  final shapes = GtfsBuilders.shapesBuilder(featureGroups);
  final stopTimes =
      GtfsBuilders.stopTimesBuilder(featureGroups, gtfsConfig['vehicleSpeed']);

  return {
    'agency': agencies,
    'calendar': calendar,
    'routes': routes,
    'trips': trips,
    'frequencies': frequencies,
    'stops': stops,
    'stop_times': stopTimes,
    'shapes': shapes,
    'fare_attributes': fare['attributes'],
    'fare_rules': fare['rules'],
    'feed_info': [gtfsConfig['feed']],
  };
}
