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

class GtfsTrip {
  final String id;
  final String routeId;
  final String serviceId;
  final String shapeId;

  GtfsTrip({
    required this.id,
    required this.routeId,
    required this.serviceId,
    required this.shapeId,
  });

  Map<String, dynamic> toCsv() => {
        'trip_id': id,
        'route_id': routeId,
        'service_id': serviceId,
        'shape_id': shapeId,
      };
}

class GtfsStopTime {
  final String tripId;
  final String stopId;
  final String arrivalTime;
  final String departureTime;
  final int stopSequence;

  GtfsStopTime({
    required this.tripId,
    required this.stopId,
    required this.arrivalTime,
    required this.departureTime,
    required this.stopSequence,
  });

  Map<String, dynamic> toCsv() => {
        'trip_id': tripId,
        'stop_id': stopId,
        'arrival_time': arrivalTime,
        'departure_time': departureTime,
        'stop_sequence': stopSequence,
      };
}

class GtfsShape {
  final String id;
  final double lat;
  final double lon;
  final int sequence;

  GtfsShape({
    required this.id,
    required this.lat,
    required this.lon,
    required this.sequence,
  });

  Map<String, dynamic> toCsv() => {
        'shape_id': id,
        'shape_pt_lat': lat,
        'shape_pt_lon': lon,
        'shape_pt_sequence': sequence,
      };
}
