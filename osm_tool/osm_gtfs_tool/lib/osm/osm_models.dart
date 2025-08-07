
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

class OsmMember {
  final String type;
  final int ref;
  final String? role;

  OsmMember({required this.type, required this.ref, this.role});

  factory OsmMember.fromJson(Map<String, dynamic> json) => OsmMember(
        type: json['type'],
        ref: json['ref'],
        role: json['role'],
      );

  Map<String, dynamic> toJson() => {
        'type': type,
        'ref': ref,
        if (role != null) 'role': role,
      };
}

class OsmRelation {
  final String type;
  final int id;
  final List<OsmMember> members;
  final Map<String, dynamic> tags;

  OsmRelation({
    required this.type,
    required this.id,
    required this.members,
    required this.tags,
  });

  factory OsmRelation.fromJson(Map<String, dynamic> json) => OsmRelation(
        type: json['type'],
        id: json['id'],
        members: (json['members'] as List)
            .map((m) => OsmMember.fromJson(m))
            .toList(),
        tags: Map<String, dynamic>.from(json['tags'] ?? {}),
      );

  Map<String, dynamic> toJson() => {
        'type': type,
        'id': id,
        'members': members.map((m) => m.toJson()).toList(),
        'tags': tags,
      };
}


class OsmStop {
  final String type;
  final int id;
  final double lat;
  final double lon;
  final Map<String, dynamic> tags;

  OsmStop({
    required this.type,
    required this.id,
    required this.lat,
    required this.lon,
    required this.tags,
  });

  factory OsmStop.fromJson(Map<String, dynamic> json) => OsmStop(
        type: json['type'],
        id: json['id'],
        lat: json['lat'],
        lon: json['lon'],
        tags: Map<String, dynamic>.from(json['tags'] ?? {}),
      );

  Map<String, dynamic> toJson() => {
        'type': type,
        'id': id,
        'lat': lat,
        'lon': lon,
        'tags': tags,
      };
}

class OsmWay {
  final String type;
  final int id;
   List<int> nodes;
   List<Map<String, dynamic>> geometry;
  final Map<String, dynamic> tags;

  OsmWay({
    required this.type,
    required this.id,
    required this.nodes,
    required this.geometry,
    required this.tags,
  });

  factory OsmWay.fromJson(Map<String, dynamic> json) => OsmWay(
        type: json['type'],
        id: json['id'],
        nodes: List<int>.from(json['nodes'] ?? []),
        geometry: List<Map<String, dynamic>>.from(json['geometry'] ?? []),
        tags: Map<String, dynamic>.from(json['tags'] ?? {}),
      );

  Map<String, dynamic> toJson() => {
        'type': type,
        'id': id,
        'nodes': nodes,
        'geometry': geometry,
        'tags': tags,
      };
}