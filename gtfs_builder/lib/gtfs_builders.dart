import 'dart:math';
import 'formater.dart';

String secondsToTime(int seconds) {
  final hh = (seconds ~/ 3600).toString().padLeft(2, '0');
  final mm = ((seconds % 3600) ~/ 60).toString().padLeft(2, '0');
  final ss = (seconds % 60).toString().padLeft(2, '0');
  return "$hh:$mm:$ss";
}

class GtfsBuilders {
  static List<Map<String, dynamic>> agencyBuilder(
      List<List<Map<String, dynamic>>> features,
      Map<String, String> defaultAgencyInfo) {
    final agencies = <Map<String, dynamic>>[];
    for (var featureGroup in features) {
      final feature = featureGroup.first;
      final agencyName = feature['properties']['operator'] ?? 'default';
      var agency = agencies.firstWhere(
        (a) => a['agency_name'] == agencyName,
        orElse: () => {},
      );
      if (agency.isEmpty) {
        agency = {
          'agency_id': agencies.length,
          'agency_name': agencyName,
          ...defaultAgencyInfo,
        };
        agencies.add(agency);
      }
      feature['gtfs'] = {'agency_id': agency['agency_id'], 'services': []};
    }
    return agencies;
  }

  static List<Map<String, dynamic>> calendarBuilder(
      List<List<Map<String, dynamic>>> features,
      String Function(Map<String, dynamic>) defaultCalendar) {
    final days = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
    final services = <Map<String, dynamic>>[];
    for (var featureGroup in features) {
      final feature = featureGroup.first;
      final openingHours =
          feature['properties']['opening_hours'] ?? defaultCalendar(feature);
      final times = openingHours.split(';').map(formatTime).toList();

      for (var time in times) {
        final match = RegExp(
                r'^(Mo|Tu|We|Th|Fr|Sa|Su)-(Mo|Tu|We|Th|Fr|Sa|Su) (\d{2}:\d{2})-(\d{2}:\d{2})$')
            .firstMatch(time);
        if (match != null) {
          final startDay = days.indexOf(match.group(1)!);
          final endDay = days.indexOf(match.group(2)!);
          final serviceId = match.group(1)! + "-" + match.group(2)!;
          var service = services.firstWhere(
            (s) => s['service_id'] == serviceId,
            orElse: () => {},
          );
          if (service.isEmpty) {
            service = {
              'service_id': serviceId,
              for (var i = 0; i < 7; i++)
                days[i].toLowerCase(): (startDay <= i && i <= endDay) ? 1 : 0,
              'start_date': '20000101',
              'end_date': '21000101',
            };
            services.add(service);
          }
          feature['gtfs']['services'].add({
            'service_id': serviceId,
            'startTime': match.group(3),
            'endTime': match.group(4),
          });
        }
      }
    }
    return services;
  }

  static List<Map<String, dynamic>> routeBuilder(
      List<List<Map<String, dynamic>>> features) {
    final routes = <Map<String, dynamic>>[];
    for (var featureGroup in features) {
      final feature = featureGroup.first;
      var routeColor = feature['properties']['colour'] ?? '';
      routeColor = routeColor.replaceAll('#', '');
      routes.add({
        'route_id': feature['properties']['id'],
        'agency_id': feature['gtfs']['agency_id'],
        'route_short_name':
            feature['properties']['ref'] ?? feature['properties']['name'],
        'route_long_name': feature['properties']['name'],
        'route_color': routeColor,
        'route_type': '3',
      });
      feature['gtfs']['route_id'] = feature['properties']['id'];
    }
    return routes;
  }

  static Map<String, dynamic> fareBuilder(
      List<List<Map<String, dynamic>>> features, Map<String, dynamic> defaultFares) {
    final fare = {'attributes': <Map<String, dynamic>>[], 'rules': <Map<String, dynamic>>[]};
    for (var featureGroup in features) {
      final feature = featureGroup.first;
      final fareId = fare['attributes']!.length;
      final price = double.tryParse(feature['properties']['fee'] ?? '0') ?? 0.0;

      fare['attributes']!.add({
        'agency_id': feature['gtfs']['agency_id'],
        'fare_id': fareId,
        'price': price,
        'currency_type': defaultFares['currencyType'],
        'payment_method': feature['properties']['paymentMethod'] ?? 0,
      });
      fare['rules']!.add({'fare_id': fareId, 'route_id': feature['properties']['id']});
    }
    return fare;
  }

  static List<Map<String, dynamic>> tripBuilder(
      List<List<Map<String, dynamic>>> features) {
    final trips = <Map<String, dynamic>>[];
    for (var featureGroup in features) {
      final feature = featureGroup.first;
      for (var service in feature['gtfs']['services']) {
        final trip = {
          'trip_id': trips.length,
          'route_id': feature['gtfs']['route_id'],
          'service_id': service['service_id'],
          'shape_id': feature['properties']['id'],
        };
        trips.add(trip);
        service['trip_id'] = trip['trip_id'].toString();
      }
    }
    return trips;
  }

  static List<Map<String, dynamic>> frequenciesBuilder(
      List<List<Map<String, dynamic>>> features,
      int Function(Map<String, dynamic>) frequencyHeadway) {
    final frequencies = <Map<String, dynamic>>[];
    for (var featureGroup in features) {
      final feature = featureGroup.first;
      for (var service in feature['gtfs']['services']) {
        frequencies.add({
          'trip_id': service['trip_id'],
          'start_time': '${service['startTime']}:00',
          'end_time': '${service['endTime']}:00',
          'headway_secs': frequencyHeadway(feature),
          'exact_times': 1,
        });
      }
    }
    return frequencies;
  }

  static List<Map<String, dynamic>> stopsBuilder(
      List<List<Map<String, dynamic>>> features,
      Map<String, dynamic> inputStops,
      String Function(dynamic) stopNameBuilder) {
    final stops = <Map<String, dynamic>>[];
    final seen = <String>{};
    for (var featureGroup in features) {
      final feature = featureGroup.first;
      final geometry = feature['geometry'];
      final coords = geometry['coordinates'] as List;
      final nodes = geometry['nodes'] as List;
      final filteredStops = {'nodes': <String>[], 'coordinates': <List<double>>[]};
      for (var i = 0; i < nodes.length; i++) {
        final stopId = nodes[i].toString();
        final stopCoords = List<double>.from(coords[i]);
        if (!seen.contains(stopId)) {
          seen.add(stopId);
          final stopName = stopNameBuilder(inputStops[stopId]);
          stops.add({
            'stop_id': stopId,
            'stop_name': stopName.isNotEmpty ? stopName : 'unnamed',
            'stop_lat': stopCoords[1],
            'stop_lon': stopCoords[0],
          });
        }
        filteredStops['nodes']!.add(stopId);
        filteredStops['coordinates']!.add(stopCoords);
      }
      feature['gtfs']['filteredStops'] = filteredStops;
    }
    return stops;
  }

  static List<Map<String, dynamic>> shapesBuilder(
      List<List<Map<String, dynamic>>> features) {
    final shapes = <Map<String, dynamic>>[];
    for (var featureGroup in features) {
      final feature = featureGroup.first;
      final shapeId = feature['properties']['id'];
      final coords = feature['geometry']['coordinates'] as List;
      for (var i = 0; i < coords.length; i++) {
        final c = coords[i];
        shapes.add({
          'shape_id': shapeId,
          'shape_pt_lat': c[1],
          'shape_pt_lon': c[0],
          'shape_pt_sequence': i,
        });
      }
    }
    return shapes;
  }

  static List<Map<String, dynamic>> stopTimesBuilder(
      List<List<Map<String, dynamic>>> features,
      int Function(Map<String, dynamic>) vehicleSpeed) {
    final stopTimes = <Map<String, dynamic>>[];
    for (var featureGroup in features) {
      final feature = featureGroup.first;
      final speed = vehicleSpeed(feature) / 3.6; // m/s
      for (var service in feature['gtfs']['services']) {
        double distance = 0;
        int seconds = 0;
        List<double>? previousCoords;
        final nodes = feature['gtfs']['filteredStops']['nodes'] as List;
        final coords = feature['gtfs']['filteredStops']['coordinates'] as List;
        for (var i = 0; i < nodes.length; i++) {
          final coord = List<double>.from(coords[i]);
          if (previousCoords != null) {
            final dx = coord[0] - previousCoords[0];
            final dy = coord[1] - previousCoords[1];
            final dist = sqrt(dx * dx + dy * dy) * 111000; // rough meters
            seconds += (dist / speed).ceil();
          }
          stopTimes.add({
            'trip_id': service['trip_id'],
            'stop_sequence': i,
            'stop_id': nodes[i],
            'arrival_time': secondsToTime(seconds),
            'departure_time': secondsToTime(seconds),
            'timepoint': 0,
          });
          previousCoords = coord;
        }
      }
    }
    return stopTimes;
  }
}
