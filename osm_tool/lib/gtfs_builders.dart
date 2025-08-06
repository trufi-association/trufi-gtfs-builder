import 'models/osm_models.dart';
import 'models/gtfs_models.dart';

class GtfsBuilders {
  static List<GtfsAgency> buildAgencies(List<OsmFeature> features, String tz, String url) {
    final agencies = <String, GtfsAgency>{};

    for (var f in features) {
      final name = f.tags['operator'] ?? 'default';
      agencies.putIfAbsent(name, () {
        return GtfsAgency(
          id: name,
          name: name,
          timezone: tz,
          url: url,
        );
      });
    }

    return agencies.values.toList();
  }

  static List<GtfsRoute> buildRoutes(List<OsmFeature> features, String defaultAgency) {
    return features.map((f) {
      return GtfsRoute(
        id: f.id,
        agencyId: f.tags['operator'] ?? defaultAgency,
        shortName: f.tags['ref'] ?? f.tags['name'] ?? '',
        longName: f.tags['name'] ?? '',
        color: (f.tags['colour'] ?? '').replaceAll('#', ''),
        routeType: '3',
      );
    }).toList();
  }

  static List<GtfsStop> buildStops(List<OsmFeature> features, Map<String, dynamic> stops) {
    final result = <GtfsStop>[];
    final seen = <String>{};

    for (var f in features) {
      final coords = f.coordinates;
      final nodes = f.nodes;

      if (coords.isEmpty || nodes == null) continue;

      for (int i = 0; i < nodes.length; i++) {
        final id = nodes[i].toString();
        if (seen.contains(id)) continue;
        seen.add(id);

        final coord = List<double>.from(coords[i]);
        final stopName = stops[id]?['name'] ?? 'unnamed';

        result.add(GtfsStop(
          id: id,
          name: stopName,
          lat: coord[1],
          lon: coord[0],
        ));
      }
    }

    return result;
  }
}
