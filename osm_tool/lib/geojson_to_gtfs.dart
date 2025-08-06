import 'models/osm_models.dart';
import 'models/gtfs_models.dart';
import 'gtfs_builders.dart';

Map<String, List<Map<String, dynamic>>> geojsonToGtfs(
  Map<String, dynamic> featuresByRouteId,
  Map<String, dynamic> inputStops,
  Map<String, dynamic> config,
) {
  final allFeatures = featuresByRouteId.values
      .expand((e) => (e['features'] as List).map((f) => OsmFeature.fromGeoJson(f)))
      .toList();

  final agencies = GtfsBuilders.buildAgencies(
    allFeatures,
    config['agencyTimezone'],
    config['agencyUrl'],
  );

  final routes = GtfsBuilders.buildRoutes(
    allFeatures,
    config['defaultAgency'] ?? 'default',
  );

  final stops = GtfsBuilders.buildStops(
    allFeatures,
    inputStops,
  );

  return {
    'agency': agencies.map((a) => a.toCsv()).toList(),
    'routes': routes.map((r) => r.toCsv()).toList(),
    'stops': stops.map((s) => s.toCsv()).toList(),
  };
}
