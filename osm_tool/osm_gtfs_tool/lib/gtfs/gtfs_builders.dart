import 'dart:math';

import '../models/gtfs_config.dart';
import '../models/osm_models.dart';
import '../models/gtfs_models.dart';

class GtfsBuilders {
  static List<GtfsAgency> buildAgencies(
    List<OsmFeature> features,
    String tz,
    String url,
  ) {
    final agencies = <String, GtfsAgency>{};

    for (var f in features) {
      final name = f.tags['operator'] ?? 'default';
      if (!agencies.containsKey(name)) {
        agencies[name] = GtfsAgency(
          id: "agency_${agencies.length.toString()}",
          name: name,
          timezone: tz,
          url: url,
        );
      }
      f.tags['agency_id'] = agencies[name]!.id;
    }

    return agencies.values.toList();
  }

  static List<GtfsCalendar> buildCalendar() {
    return [
      GtfsCalendar(
        serviceId: 'Mo-Su',
        monday: 1,
        tuesday: 1,
        wednesday: 1,
        thursday: 1,
        friday: 1,
        saturday: 1,
        sunday: 1,
        startDate: '20250101',
        endDate: '20251231',
      ),
    ];
  }

  static List<GtfsRoute> buildRoutes(
    List<OsmFeature> features,
    String defaultAgency,
  ) {
    return features.map((f) {
      return GtfsRoute(
        id: f.id,
        agencyId: f.tags['agency_id'],
        shortName: f.tags['ref'] ?? f.tags['name'] ?? '',
        longName: f.tags['name'] ?? '',
        color: (f.tags['colour'] ?? '').replaceAll('#', ''),
        routeType: _getRouteType(f.tags['route']),
      );
    }).toList();
  }

  static String _getRouteType(String? route) {
    switch (route) {
      case 'tram':
      case 'light_rail':
        return '0';
      case 'subway':
        return '1';
      case 'train':
        return '2';
      case 'bus':
      case 'share_taxi':
        return '3';
      case 'ferry':
        return '4';
      case 'aerialway':
        return '6';
      default:
        return '3';
    }
  }

static List<GtfsStop> buildStops(
  List<OsmFeature> features,
  Map<String, List<String>> stops, // ✅ Tipado fuerte aquí
) {
  final result = <GtfsStop>[];
  final seen = <String>{};

  for (var f in features) {
    if (f.geometryType == 'LineString' &&
        f.lineCoordinates != null &&
        f.nodes != null) {
      for (int i = 0; i < f.nodes!.length; i++) {
        final id = f.nodes![i];
        if (seen.contains(id)) continue;
        seen.add(id);

        final coord = f.lineCoordinates![i];
        final stopNames = stops[id];
        final stopName = (stopNames != null && stopNames.isNotEmpty)
            ? stopNames.first
            : 'unnamed';

        result.add(
          GtfsStop(
            id: id,
            name: stopName,
            lat: coord[1],
            lon: coord[0],
          ),
        );
      }
    }
  }

  return result;
}


  static List<GtfsTrip> buildTrips(List<OsmFeature> features) {
    final trips = <GtfsTrip>[];

    for (int i = 0; i < features.length; i++) {
      final f = features[i];
      trips.add(
        GtfsTrip(
          id: 'trip_$i',
          routeId: f.id,
          serviceId: 'Mo-Su',
          shapeId: f.id,
        ),
      );
    }

    return trips;
  }

  static List<GtfsShape> buildShapes(List<OsmFeature> features) {
    final shapes = <GtfsShape>[];

    for (var f in features) {
      if (f.geometryType == 'LineString' && f.lineCoordinates != null) {
        for (int i = 0; i < f.lineCoordinates!.length; i++) {
          final c = f.lineCoordinates![i];
          shapes.add(GtfsShape(id: f.id, lat: c[1], lon: c[0], sequence: i));
        }
      } else if (f.geometryType == 'Point' && f.pointCoordinates != null) {
        final c = f.pointCoordinates!;
        shapes.add(GtfsShape(id: f.id, lat: c[1], lon: c[0], sequence: 0));
      }
    }

    return shapes;
  }

  static List<GtfsFrequency> buildFrequencies(List<GtfsTrip> trips) {
    return trips.map((trip) {
      return GtfsFrequency(
        tripId: trip.id,
        startTime: '08:00:00',
        endTime: '18:00:00',
        headwaySecs: 600,
        exactTimes: 1,
      );
    }).toList();
  }

  static List<GtfsStopTime> buildStopTimes(
    List<GtfsTrip> trips,
    List<GtfsStop> stops,
    double vehicleSpeedKph,
  ) {
    final stopTimes = <GtfsStopTime>[];
    final speedMps = vehicleSpeedKph * 1000 / 3600;

    for (var trip in trips) {
      int seconds = 8 * 3600;
      for (int i = 0; i < stops.length; i++) {
        if (i > 0) {
          final dist = _calculateDistance(
            [stops[i - 1].lon, stops[i - 1].lat],
            [stops[i].lon, stops[i].lat],
          );
          seconds += (dist / speedMps).round();
        }

        final arrival = _secondsToTime(seconds);

        stopTimes.add(
          GtfsStopTime(
            tripId: trip.id,
            stopId: stops[i].id,
            arrivalTime: arrival,
            departureTime: arrival,
            stopSequence: i,
          ),
        );
      }
    }
    return stopTimes;
  }

static ({List<GtfsFareAttribute> attributes, List<GtfsFareRule> rules}) buildFare(
  List<List<OsmFeature>> features,
  GtfsFareDefaults defaultFares,
) {
  final attributes = <GtfsFareAttribute>[];
  final rules = <GtfsFareRule>[];
  int fareIdCounter = 0;

  for (var routeFeatures in features) {
    if (routeFeatures.isEmpty) continue;
    final main = routeFeatures.first;
    final fareId = 'fare_${fareIdCounter++}';
    final price = double.tryParse(main.tags['fee'] ?? '') ?? 0;

    attributes.add(
      GtfsFareAttribute(
        id: fareId,
        agencyId: main.tags['operator'] ?? '',
        price: price,
        currencyType: defaultFares.currencyType,
        paymentMethod: main.tags['paymentMethod'] != null
            ? int.tryParse(main.tags['paymentMethod']) ?? 0
            : 0,
      ),
    );

    rules.add(GtfsFareRule(fareId: fareId, routeId: main.id));
  }

  return (attributes: attributes, rules: rules);
}



static GtfsFeedInfo buildFeedInfo(GtfsFeed config) {
  return GtfsFeedInfo(
    id: config.feedId,
    publisherName: config.feedPublisherName,
    publisherUrl: config.feedPublisherUrl,
    language: config.feedLang,
    version: config.feedVersion,
    startDate: config.feedStartDate,
    endDate: config.feedEndDate,
  );
}


  static String _secondsToTime(int seconds) {
    final hh = (seconds ~/ 3600).toString().padLeft(2, '0');
    final mm = ((seconds % 3600) ~/ 60).toString().padLeft(2, '0');
    final ss = (seconds % 60).toString().padLeft(2, '0');
    return '$hh:$mm:$ss';
  }

  static double _calculateDistance(List<double> from, List<double> to) {
    const R = 6371000;
    final dLat = _degToRad(to[1] - from[1]);
    final dLon = _degToRad(to[0] - from[0]);
    final a =
        sin(dLat / 2) * sin(dLat / 2) +
        cos(_degToRad(from[1])) *
            cos(_degToRad(to[1])) *
            sin(dLon / 2) *
            sin(dLon / 2);
    final c = 2 * atan2(sqrt(a), sqrt(1 - a));
    return R * c;
  }

  static double _degToRad(double deg) => deg * pi / 180;
}
