import 'dart:collection';
import 'osm_models.dart';
import 'route_extractor.dart';
import '../extractor_error.dart';
import '../readme_generator.dart';

Map<String, dynamic> osmDataTool({
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
              "coordinates": data['points'],
              "nodes": data['nodes'],
            }
          },
          ...data['routeStops'].map((element) => {
                "type": "Feature",
                "properties": {...element['tags'], "id": element['id']},
                "geometry": {
                  "type": "Point",
                  "coordinates": [element['lon'], element['lat']]
                }
              })
        ]
      };

      data['stops'].forEach((stopId, names) {
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

  return {
    "geojsonFeatures": geojsonFeatures,
    "stops": mainStops,
    "log": logFile,
    "readme": readmeGenerator({"log": logFile}),
  };
}
