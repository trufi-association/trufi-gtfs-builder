enum RouteType {
  bus,
  tram,
  trolleybus,
  train,
  subway,
  ferry,
  lightRail,
}

extension RouteTypeExtension on RouteType {
  String get value {
    switch (this) {
      case RouteType.bus:
        return 'bus';
      case RouteType.tram:
        return 'tram';
      case RouteType.trolleybus:
        return 'trolleybus';
      case RouteType.train:
        return 'train';
      case RouteType.subway:
        return 'subway';
      case RouteType.ferry:
        return 'ferry';
      case RouteType.lightRail:
        return 'light_rail';
    }
  }
}

enum OsmElementType { node, way, relation }

extension OsmElementTypeParser on OsmElementType {
  static OsmElementType fromString(String value) {
    switch (value) {
      case 'node':
        return OsmElementType.node;
      case 'way':
        return OsmElementType.way;
      case 'relation':
        return OsmElementType.relation;
      default:
        throw ArgumentError('Unknown element type: $value');
    }
  }
}

class OsmMember {
  final OsmElementType elementType;
  final int ref;
  final String? role;

  OsmMember({required this.elementType, required this.ref, this.role});

  factory OsmMember.fromJson(Map<String, dynamic> json) => OsmMember(
        elementType: OsmElementTypeParser.fromString(json['type']),
        ref: json['ref'],
        role: json['role'],
      );

  Map<String, dynamic> toJson() => {
        'type': elementType.name,
        'ref': ref,
        if (role != null) 'role': role,
      };
}

class OsmRelation {
  final OsmElementType elementType = OsmElementType.relation;
  final int id;
  final List<OsmMember> members;
  final Map<String, String> tags;

  OsmRelation({
    required this.id,
    required this.members,
    required this.tags,
  });

  factory OsmRelation.fromJson(Map<String, dynamic> json) => OsmRelation(
        id: json['id'],
        members: (json['members'] as List)
            .map((m) => OsmMember.fromJson(m))
            .toList(),
        tags: Map<String, String>.from(json['tags'] ?? {}),
      );

  Map<String, dynamic> toJson() => {
        'type': elementType.name,
        'id': id,
        'members': members.map((m) => m.toJson()).toList(),
        'tags': tags,
      };
}

class RouteStop {
  final int id;
  final double lat;
  final double lon;
  final Map<String, String> tags;

  RouteStop({
    required this.id,
    required this.lat,
    required this.lon,
    required this.tags,
  });

  factory RouteStop.fromOsmStop(OsmStop stop) => RouteStop(
        id: stop.id,
        lat: stop.lat,
        lon: stop.lon,
        tags: stop.tags,
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'lat': lat,
        'lon': lon,
        'tags': tags,
      };
}

class OsmStop {
  final OsmElementType elementType = OsmElementType.node;
  final int id;
  final double lat;
  final double lon;
  final Map<String, String> tags;

  OsmStop({
    required this.id,
    required this.lat,
    required this.lon,
    required this.tags,
  });

  factory OsmStop.fromJson(Map<String, dynamic> json) => OsmStop(
        id: json['id'],
        lat: json['lat'],
        lon: json['lon'],
        tags: Map<String, String>.from(json['tags'] ?? {}),
      );

  Map<String, dynamic> toJson() => {
        'type': elementType.name,
        'id': id,
        'lat': lat,
        'lon': lon,
        'tags': tags,
      };

  bool get isStopPosition => tags['public_transport'] == 'stop_position';
}

class OsmWay {
  final OsmElementType elementType = OsmElementType.way;
  final int id;
  List<int> nodes;
  List<Map<String, double>> geometry;
  final Map<String, String> tags;

  OsmWay({
    required this.id,
    required this.nodes,
    required this.geometry,
    required this.tags,
  });

  factory OsmWay.fromJson(Map<String, dynamic> json) => OsmWay(
        id: json['id'],
        nodes: List<int>.from(json['nodes'] ?? []),
        geometry: (json['geometry'] as List)
            .map((e) => Map<String, double>.from(e))
            .toList(),
        tags: Map<String, String>.from(json['tags'] ?? {}),
      );

  Map<String, dynamic> toJson() => {
        'type': elementType.name,
        'id': id,
        'nodes': nodes,
        'geometry': geometry,
        'tags': tags,
      };

  bool get isOneway => tags['oneway'] == 'yes';
}