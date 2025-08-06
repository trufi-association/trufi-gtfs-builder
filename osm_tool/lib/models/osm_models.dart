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
      lat: json['lat']?.toDouble() ?? 0.0,
      lon: json['lon']?.toDouble() ?? 0.0,
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
  final List<dynamic> coordinates;
  final List<dynamic>? nodes;

  OsmFeature({
    required this.id,
    required this.tags,
    required this.geometryType,
    required this.coordinates,
    this.nodes,
  });

  factory OsmFeature.fromGeoJson(Map<String, dynamic> json) {
    return OsmFeature(
      id: json['properties']['id'].toString(),
      tags: Map<String, dynamic>.from(json['properties']),
      geometryType: json['geometry']['type'],
      coordinates: json['geometry']['coordinates'],
      nodes: json['geometry']['nodes'],
    );
  }
}
