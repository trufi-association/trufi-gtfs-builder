import '../models/osm_models.dart';
import '../models/gtfs_models.dart';
import '../models/gtfs_config.dart'; // ✅ Nuevo import para el modelo
import '../osm/osm_data_tool.dart';
import 'gtfs_builders.dart';

Map<String, List<Map<String, dynamic>>> geojsonToGtfs(
  Map<String, GeoJsonFeatureCollection> featuresByRouteId,
  Map<String, List<String>> inputStops,
  GtfsConfig config, // ✅ Usamos el modelo aquí
) {
  final groupedFeatures = featuresByRouteId.values
      .map(
        (fc) => fc.features.map((f) => OsmFeature.fromGeoJsonModel(f)).toList(),
      )
      .toList();

  final allFeatures = groupedFeatures.expand((f) => f).toList();

  final agencies = GtfsBuilders.buildAgencies(
    allFeatures,
    config.agencyTimezone,
    config.agencyUrl,
  );

  final calendar = GtfsBuilders.buildCalendar();

  final routes = GtfsBuilders.buildRoutes(allFeatures, config.defaultAgency);

  final fareResult = GtfsBuilders.buildFare(
    groupedFeatures,
    config.defaultFares,
  );

  final fareAttributes = fareResult['attributes']!.cast<GtfsFareAttribute>();
  final fareRules = fareResult['rules']!.cast<GtfsFareRule>();

  final feed = GtfsBuilders.buildFeedInfo(config.feed);

  final trips = GtfsBuilders.buildTrips(allFeatures);

  final frequencies = GtfsBuilders.buildFrequencies(trips);

  final stops = GtfsBuilders.buildStops(allFeatures, inputStops);

  final shapes = GtfsBuilders.buildShapes(allFeatures);

  final stopTimes = GtfsBuilders.buildStopTimes(
    trips,
    stops,
    config.vehicleSpeed,
  );

  return {
    'agency': agencies.map((a) => a.toCsv()).toList(),
    'calendar': calendar.map((c) => c.toCsv()).toList(),
    'routes': routes.map((r) => r.toCsv()).toList(),
    'fare_attributes': fareAttributes.map((f) => f.toCsv()).toList(),
    'fare_rules': fareRules.map((f) => f.toCsv()).toList(),
    'feed_info': [feed.toCsv()],
    'trips': trips.map((t) => t.toCsv()).toList(),
    'frequencies': frequencies.map((f) => f.toCsv()).toList(),
    'stops': stops.map((s) => s.toCsv()).toList(),
    'stop_times': stopTimes.map((s) => s.toCsv()).toList(),
    'shapes': shapes.map((s) => s.toCsv()).toList(),
  };
}
