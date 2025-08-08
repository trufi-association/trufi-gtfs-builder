import 'osm_models.dart';
import 'route_extractor.dart';
import '../readme_generator.dart';

/// Enum para tipos de geometría GeoJSON
enum GeoJsonGeometryType {
  point,
  lineString,
  polygon,
}

extension GeoJsonGeometryTypeExtension on GeoJsonGeometryType {
  String get name {
    switch (this) {
      case GeoJsonGeometryType.point:
        return "Point";
      case GeoJsonGeometryType.lineString:
        return "LineString";
      case GeoJsonGeometryType.polygon:
        return "Polygon";
    }
  }

  static GeoJsonGeometryType fromString(String value) {
    switch (value) {
      case "Point":
        return GeoJsonGeometryType.point;
      case "LineString":
        return GeoJsonGeometryType.lineString;
      case "Polygon":
        return GeoJsonGeometryType.polygon;
      default:
        throw ArgumentError("Unknown GeoJsonGeometryType: $value");
    }
  }
}

/// Enum para tipo de objeto GeoJSON (en este caso, siempre "Feature")
enum GeoJsonFeatureType {
  feature,
}

extension GeoJsonFeatureTypeExtension on GeoJsonFeatureType {
  String get name => "Feature";

  static GeoJsonFeatureType fromString(String value) {
    if (value == "Feature") return GeoJsonFeatureType.feature;
    throw ArgumentError("Unknown GeoJsonFeatureType: $value");
  }
}

/// Modelo de geometría GeoJSON
class GeoJsonGeometry {
  final GeoJsonGeometryType type;
  final List<dynamic> coordinates;
  final List<dynamic>? nodes;

  GeoJsonGeometry({
    required this.type,
    required this.coordinates,
    this.nodes,
  });

  factory GeoJsonGeometry.fromJson(Map<String, dynamic> json) {
    return GeoJsonGeometry(
      type: GeoJsonGeometryTypeExtension.fromString(json['type']),
      coordinates: json['coordinates'],
      nodes: json['nodes'],
    );
  }

  Map<String, dynamic> toJson() => {
        'type': type.name,
        'coordinates': coordinates,
        if (nodes != null) 'nodes': nodes,
      };
}

/// Modelo de Feature GeoJSON
class GeoJsonFeature {
  final GeoJsonFeatureType type;
  final Map<String, dynamic> properties;
  final GeoJsonGeometry geometry;

  GeoJsonFeature({
    required this.type,
    required this.properties,
    required this.geometry,
  });

  factory GeoJsonFeature.fromJson(Map<String, dynamic> json) {
    return GeoJsonFeature(
      type: GeoJsonFeatureTypeExtension.fromString(json['type']),
      properties: Map<String, dynamic>.from(json['properties']),
      geometry: GeoJsonGeometry.fromJson(json['geometry']),
    );
  }

  Map<String, dynamic> toJson() => {
        'type': type.name,
        'properties': properties,
        'geometry': geometry.toJson(),
      };
}

/// Modelo de colección de Features
class GeoJsonFeatureCollection {
  final String type;
  final List<GeoJsonFeature> features;

  GeoJsonFeatureCollection({
    required this.type,
    required this.features,
  });

  factory GeoJsonFeatureCollection.fromJson(Map<String, dynamic> json) {
    return GeoJsonFeatureCollection(
      type: json['type'],
      features: (json['features'] as List)
          .map((f) => GeoJsonFeature.fromJson(f))
          .toList(),
    );
  }

  Map<String, dynamic> toJson() => {
        'type': type,
        'features': features.map((f) => f.toJson()).toList(),
      };
}

/// Resultado principal con metadata + geojson + stops
class OsmDataResult {
  final Map<String, GeoJsonFeatureCollection> geojsonFeatures;
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

/// Función principal para procesar rutas, ways y stops
OsmDataResult osmDataTool({
  required Map<int, OsmRelation> routes,
  required Map<int, OsmWay> ways,
  required Map<int, OsmStop> stops,
  required bool Function(OsmRelation) skipRoute,
}) {
  final mainStops = <String, List<String>>{};
  final geojsonFeatures = <String, GeoJsonFeatureCollection>{};
  final logFile = <Map<String, dynamic>>[];

  for (var entry in routes.entries) {
    final currentRoute = entry.value;
    try {
      if (skipRoute(currentRoute)) continue;

      if (!currentRoute.tags.containsKey("ref")) {
        throw {
          "extractor_error": ExtractorError.noRefDefined,
          "uri":
              "https://overpass-turbo.eu/?Q=//${ExtractorError.noRefDefined}%0Arel(${currentRoute.id});out geom;&R",
        };
      }

      final data = RouteExtractor.extract(currentRoute, ways, stops);
      logFile.add({"id": currentRoute.id, "tags": currentRoute.tags});

      geojsonFeatures["${currentRoute.id}"] = GeoJsonFeatureCollection(
        type: "FeatureCollection",
        features: [
          GeoJsonFeature(
            type: GeoJsonFeatureType.feature,
            properties: {...currentRoute.tags, "id": currentRoute.id},
            geometry: GeoJsonGeometry(
              type: GeoJsonGeometryType.lineString,
              coordinates: data.points,
              nodes: data.nodes,
            ),
          ),
          ...data.routeStops.map(
            (stop) => GeoJsonFeature(
              type: GeoJsonFeatureType.feature,
              properties: {...stop.tags, "id": stop.id},
              geometry: GeoJsonGeometry(
                type: GeoJsonGeometryType.point,
                coordinates: [stop.lon, stop.lat],
              ),
            ),
          ),
        ],
      );

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
