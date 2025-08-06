import '../models/osm_models.dart';
import '../models/gtfs_models.dart';

class GtfsBuilders {
  /// Construye las agencias GTFS a partir de las rutas OSM
  static List<GtfsAgency> buildAgencies(
    List<OsmFeature> features,
    String tz,
    String url,
  ) {
    final agencies = <String, GtfsAgency>{};

    for (var f in features) {
      final name = f.tags['operator'] ?? 'default';
      agencies.putIfAbsent(name, () {
        return GtfsAgency(
          id: agencies.length.toString(),
          name: name,
          timezone: tz,
          url: url,
        );
      });
    }

    return agencies.values.toList();
  }

  /// Construye las rutas GTFS a partir de las features
  static List<GtfsRoute> buildRoutes(
    List<OsmFeature> features,
    String defaultAgency,
  ) {
    return features.map((f) {
      return GtfsRoute(
        id: f.id,
        agencyId: f.tags['operator'] ?? defaultAgency,
        shortName: f.tags['ref'] ?? f.tags['name'] ?? '',
        longName: f.tags['name'] ?? '',
        color: (f.tags['colour'] ?? '').replaceAll('#', ''),
        routeType: '3', // bus por defecto
      );
    }).toList();
  }

  /// Construye las paradas GTFS
  static List<GtfsStop> buildStops(
    List<OsmFeature> features,
    Map<String, dynamic> stops,
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

          final stopNames = stops[id] as List<String>?;
          final stopName = (stopNames != null && stopNames.isNotEmpty)
              ? stopNames.first
              : 'unnamed';

          result.add(GtfsStop(
            id: id,
            name: stopName,
            lat: coord[1],
            lon: coord[0],
          ));
        }
      }
    }
    return result;
  }

  /// Construye los viajes GTFS
  static List<GtfsTrip> buildTrips(List<OsmFeature> features) {
    final trips = <GtfsTrip>[];
    int count = 0;

    for (var f in features) {
      trips.add(GtfsTrip(
        id: 'trip_$count',
        routeId: f.id,
        serviceId: 'service_1', // ID fijo para calendario simple
        shapeId: f.id,
      ));
      count++;
    }

    return trips;
  }

  /// Construye las shapes GTFS (trazados de rutas)
  static List<GtfsShape> buildShapes(List<OsmFeature> features) {
    final shapes = <GtfsShape>[];

    for (var f in features) {
      if (f.geometryType == 'LineString' && f.lineCoordinates != null) {
        for (int i = 0; i < f.lineCoordinates!.length; i++) {
          final c = f.lineCoordinates![i];
          shapes.add(GtfsShape(
            id: f.id,
            lat: c[1],
            lon: c[0],
            sequence: i,
          ));
        }
      } else if (f.geometryType == 'Point' && f.pointCoordinates != null) {
        final c = f.pointCoordinates!;
        shapes.add(GtfsShape(
          id: f.id,
          lat: c[1],
          lon: c[0],
          sequence: 0,
        ));
      }
    }

    return shapes;
  }

  /// Construye las paradas intermedias por viaje
  static List<GtfsStopTime> buildStopTimes(
    List<GtfsTrip> trips,
    List<GtfsStop> stops,
  ) {
    final stopTimes = <GtfsStopTime>[];

    for (var trip in trips) {
      int seconds = 8 * 3600; // todos empiezan a las 08:00
      for (int i = 0; i < stops.length; i++) {
        final arrival = _secondsToTime(seconds);

        stopTimes.add(GtfsStopTime(
          tripId: trip.id,
          stopId: stops[i].id,
          arrivalTime: arrival,
          departureTime: arrival,
          stopSequence: i,
        ));

        seconds += 300; // 5 minutos entre paradas
      }
    }

    return stopTimes;
  }

  /// Helper para convertir segundos en formato HH:mm:ss
  static String _secondsToTime(int seconds) {
    final hh = (seconds ~/ 3600).toString().padLeft(2, '0');
    final mm = ((seconds % 3600) ~/ 60).toString().padLeft(2, '0');
    final ss = (seconds % 60).toString().padLeft(2, '0');
    return '$hh:$mm:$ss';
  }
}
