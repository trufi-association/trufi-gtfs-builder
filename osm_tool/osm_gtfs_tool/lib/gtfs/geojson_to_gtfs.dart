import '../models/osm_models.dart';
import '../models/gtfs_models.dart';
import 'gtfs_builders.dart';

Map<String, List<Map<String, dynamic>>> geojsonToGtfs(
  Map<String, dynamic> featuresByRouteId,
  Map<String, dynamic> inputStops,
  Map<String, dynamic> config,
) {
  // Convertir cada feature a un OsmFeature
  final allFeatures = featuresByRouteId.values
      .expand((e) => (e['features'] as List)
          .map((f) => OsmFeature.fromGeoJson(f as Map<String, dynamic>)))
      .toList();

  // Construcción de entidades GTFS
  final agencies = GtfsBuilders.buildAgencies(
    allFeatures,
    config['agencyTimezone'],
    config['agencyUrl'],
  );

  final routes = GtfsBuilders.buildRoutes(
    allFeatures,
    config['defaultAgency'],
  );

  final stops = GtfsBuilders.buildStops(
    allFeatures,
    inputStops,
  );

  final trips = GtfsBuilders.buildTrips(allFeatures);

  final shapes = GtfsBuilders.buildShapes(allFeatures);

  final stopTimes = GtfsBuilders.buildStopTimes(trips, stops);

  // Calendario simple: todos los días activo
  final calendar = [
    {
      'service_id': 'service_1',
      'monday': 1,
      'tuesday': 1,
      'wednesday': 1,
      'thursday': 1,
      'friday': 1,
      'saturday': 1,
      'sunday': 1,
      'start_date': config['feed']['feed_start_date'],
      'end_date': config['feed']['feed_end_date'],
    }
  ];

  // Info del feed
  final feedInfo = [
    {
      'feed_publisher_name': config['feed']['feed_publisher_name'],
      'feed_publisher_url': config['feed']['feed_publisher_url'],
      'feed_lang': config['feed']['feed_lang'],
      'feed_version': config['feed']['feed_version'],
      'feed_start_date': config['feed']['feed_start_date'],
      'feed_end_date': config['feed']['feed_end_date'],
      'feed_id': config['feed']['feed_id'],
    }
  ];

  // Retornar dataset GTFS completo
  return {
    'agency': agencies.map((a) => a.toCsv()).toList(),
    'routes': routes.map((r) => r.toCsv()).toList(),
    'stops': stops.map((s) => s.toCsv()).toList(),
    'trips': trips.map((t) => t.toCsv()).toList(),
    'shapes': shapes.map((s) => s.toCsv()).toList(),
    'stop_times': stopTimes.map((s) => s.toCsv()).toList(),
    'calendar': calendar,
    'feed_info': feedInfo,
  };
}
