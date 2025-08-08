import 'package:osm_gtfs_tool/osm/osm_data_tool.dart';

class OsmStop {
  final String id;
  final String name;
  final double lat;
  final double lon;

  OsmStop({
    required this.id,
    required this.name,
    required this.lat,
    required this.lon,
  });

  factory OsmStop.fromJson(Map<String, dynamic> json) {
    return OsmStop(
      id: json['id'].toString(),
      name: json['tags']?['name'] ?? 'unnamed',
      lat: (json['lat'] as num).toDouble(),
      lon: (json['lon'] as num).toDouble(),
    );
  }

  Map<String, dynamic> toCsv() => {
    'stop_id': id,
    'stop_name': name,
    'stop_lat': lat,
    'stop_lon': lon,
  };
}

class OsmFeature {
  final String id;
  final Map<String, dynamic> tags;
  final String geometryType;
  final List<List<double>>? lineCoordinates;
  final List<double>? pointCoordinates;
  final List<String>? nodes;

  OsmFeature({
    required this.id,
    required this.tags,
    required this.geometryType,
    this.lineCoordinates,
    this.pointCoordinates,
    this.nodes,
  });
  factory OsmFeature.fromGeoJson(Map<String, dynamic> json) {
    final geom = json['geometry'];
    final type = geom['type'];

    if (type == 'LineString') {
      return OsmFeature(
        id: json['properties']['id'].toString(),
        tags: Map<String, dynamic>.from(json['properties']),
        geometryType: type,
        lineCoordinates: (geom['coordinates'] as List)
            .map<List<double>>(
              (c) => [(c[0] as num).toDouble(), (c[1] as num).toDouble()],
            )
            .toList(),
        nodes: (geom['nodes'] as List?)?.map((n) => n.toString()).toList(),
      );
    } else if (type == 'Point') {
      final coords = (geom['coordinates'] as List);
      return OsmFeature(
        id: json['properties']['id'].toString(),
        tags: Map<String, dynamic>.from(json['properties']),
        geometryType: type,
        pointCoordinates: [
          (coords[0] as num).toDouble(),
          (coords[1] as num).toDouble(),
        ],
      );
    } else {
      throw UnsupportedError("Geometry type $type no soportado");
    }
  }
  factory OsmFeature.fromGeoJsonModel(GeoJsonFeature feature) {
    final geometry = feature.geometry;
    final type = geometry.type;

    switch (type) {
      case GeoJsonGeometryType.lineString:
        return OsmFeature(
          id: feature.properties['id'].toString(),
          tags: feature.properties,
          geometryType: type.name,
          lineCoordinates: (geometry.coordinates as List)
              .map<List<double>>(
                (c) => [(c[0] as num).toDouble(), (c[1] as num).toDouble()],
              )
              .toList(),
          nodes: geometry.nodes?.map((n) => n.toString()).toList(),
        );

      case GeoJsonGeometryType.point:
        final coords = geometry.coordinates;
        return OsmFeature(
          id: feature.properties['id'].toString(),
          tags: feature.properties,
          geometryType: type.name,
          pointCoordinates: [
            (coords[0] as num).toDouble(),
            (coords[1] as num).toDouble(),
          ],
        );

      default:
        throw UnsupportedError("Geometry type ${type.name} no soportado");
    }
  }
}
