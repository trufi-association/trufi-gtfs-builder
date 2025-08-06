class GtfsAgency {
  final String id;
  final String name;
  final String timezone;
  final String url;

  GtfsAgency({
    required this.id,
    required this.name,
    required this.timezone,
    required this.url,
  });

  Map<String, dynamic> toCsv() => {
        'agency_id': id,
        'agency_name': name,
        'agency_timezone': timezone,
        'agency_url': url,
      };
}

class GtfsRoute {
  final String id;
  final String agencyId;
  final String shortName;
  final String longName;
  final String routeType;
  final String color;

  GtfsRoute({
    required this.id,
    required this.agencyId,
    required this.shortName,
    required this.longName,
    required this.routeType,
    required this.color,
  });

  Map<String, dynamic> toCsv() => {
        'route_id': id,
        'agency_id': agencyId,
        'route_short_name': shortName,
        'route_long_name': longName,
        'route_type': routeType,
        'route_color': color,
      };
}

class GtfsStop {
  final String id;
  final String name;
  final double lat;
  final double lon;

  GtfsStop({
    required this.id,
    required this.name,
    required this.lat,
    required this.lon,
  });

  Map<String, dynamic> toCsv() => {
        'stop_id': id,
        'stop_name': name,
        'stop_lat': lat,
        'stop_lon': lon,
      };
}
