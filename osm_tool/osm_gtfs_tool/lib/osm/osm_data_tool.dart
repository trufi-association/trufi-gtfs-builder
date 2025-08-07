import 'dart:collection';
import 'osm_models.dart';
import 'route_extractor.dart';
import '../extractor_error.dart';
import '../readme_generator.dart';

class OsmDataResult {
  final Map<String, dynamic> geojsonFeatures;
  final Map<String, List<String>> stops;
  final List<Map<String, dynamic>> log;
  final String readme;

  OsmDataResult({
    required this.geojsonFeatures,
    required this.stops,
    required this.log,
    required this.readme,
  });
}

OsmDataResult osmDataTool({
  required Map<int, OsmRelation> routes,
  required Map<int, OsmWay> ways,
  required Map<int, OsmStop> stops,
  required bool Function(OsmRelation) skipRoute,
}) {
  final mainStops = <String, List<String>>{};
  final geojsonFeatures = <String, dynamic>{};
  final logFile = <Map<String, dynamic>>[];

  for (var entry in routes.entries) {
    final currentRoute = entry.value;
    try {
      if (skipRoute(currentRoute)) {
        continue;
      }

      if (!currentRoute.tags.containsKey("ref")) {
        throw {
          "extractor_error": ExtractorError.noRefDefined,
          "uri":
              "https://overpass-turbo.eu/?Q=//${ExtractorError.noRefDefined}%0Arel(${currentRoute.id});out geom;&R"
        };
      }

      final data = RouteExtractor.extract(currentRoute, ways, stops);
      logFile.add({"id": currentRoute.id, "tags": currentRoute.tags});

      geojsonFeatures["${currentRoute.id}"] = {
        "type": "FeatureCollection",
        "features": [
          {
            "type": "Feature",
            "properties": {...currentRoute.tags, "id": currentRoute.id},
            "geometry": {
              "type": "LineString",
              "coordinates": data.points,
              "nodes": data.nodes,
            }
          },
          ...data.routeStops.map((stop) => {
                "type": "Feature",
                "properties": {...stop.tags, "id": stop.id},
                "geometry": {
                  "type": "Point",
                  "coordinates": [stop.lon, stop.lat]
                }
              })
        ]
      };

      data.stops.forEach((stopId, names) {
        mainStops.putIfAbsent(stopId, () => []).addAll(names);
      });
    } catch (error) {
      logFile.add({
        "id": currentRoute.id,
        "error": error,
        "tags": currentRoute.tags,
      });
    }
  }

  return OsmDataResult(
    geojsonFeatures: geojsonFeatures,
    stops: mainStops,
    log: logFile,
    readme: readmeGenerator({"log": logFile}),
  );
}
