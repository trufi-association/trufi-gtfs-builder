import '../extractor_error.dart';

class RouteExtractor {
  static Map<String, dynamic> extract(
    Map<String, dynamic> routeElements,
    Map<int, dynamic> ways,
    Map<int, dynamic> stops,
  ) {
    final routeWays = <Map<String, dynamic>>[];
    final routeStops = <Map<String, dynamic>>[];

    for (var element in routeElements['members']) {
      if (element['type'] == "way" &&
          (element['role'] == null || element['role'] == "")) {
        final currentWay = ways[element['ref']];
        if (currentWay == null) {
          throw {
            "extractor_error": ExtractorError.wayNotExist,
            "uri":
                "https://overpass-turbo.eu/?Q=//${ExtractorError.wayNotExist}%0Arel(${routeElements['id']});out geom;way(${element['ref']});out geom;&R"
          };
        }
        routeWays.add(currentWay);
      } else if (element['type'] == "node") {
        final currentStop = stops[element['ref']];
        if (currentStop != null &&
            currentStop['tags']?['public_transport'] == "stop_position") {
          routeStops.add(currentStop);
        }
      }
    }

    if (routeWays.isEmpty) {
      throw {
        "extractor_error": ExtractorError.routeWithEmptyWays,
        "uri":
            "https://overpass-turbo.eu/?Q=//${ExtractorError.routeWithEmptyWays}%0Arel(${routeElements['id']});out geom;&R"
      };
    }

    final tmpNodes = <int>[];
    final tmpStops = <String, List<String>>{};
    final tmpPoints = <List<double>>[];

    for (var element in routeWays) {
      for (var nodeId in element['nodes']) {
        final stopId = nodeId.toString();
        final stopName = element['tags']?['name'] ?? "";
        tmpStops.putIfAbsent(stopId, () => []).add(stopName);
      }
      tmpNodes.addAll(List<int>.from(element['nodes']));
      tmpPoints.addAll((element['geometry'] as List)
          .map((pt) => [pt['lon'] as double, pt['lat'] as double]));
    }

    return {
      'nodes': tmpNodes,
      'stops': tmpStops,
      'points': tmpPoints,
      'routeStops': routeStops,
    };
  }
}
