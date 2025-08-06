import '../extractor_error.dart';

class RouteExtractor {
  static void _reverseWay(Map<String, dynamic> way) {
    way['geometry'] = List.from(way['geometry'].reversed);
    way['nodes'] = List.from(way['nodes'].reversed);
  }

  static bool _checkConnection(Map<String, dynamic> a, Map<String, dynamic> b) {
    return a['nodes'].last == b['nodes'].first;
  }

  static bool _normalizeCurrentWay(
    Map<String, dynamic> lastWay,
    Map<String, dynamic> currentWay,
  ) {
    var response = _checkConnection(lastWay, currentWay);
    if (!response && (currentWay['tags']?['oneway'] != "yes")) {
      _reverseWay(currentWay);
      response = _checkConnection(lastWay, currentWay);
    }
    return response;
  }

  static bool _checkFirstWay(
    Map<String, dynamic> lastWay,
    Map<String, dynamic> currentWay,
  ) {
    var response = _checkConnection(lastWay, currentWay);
    if (response) return true;

    if (currentWay['tags']?['oneway'] != "yes") {
      _reverseWay(currentWay);
      response = _checkConnection(lastWay, currentWay);
    }
    if (response) return true;

    if (lastWay['tags']?['oneway'] != "yes") {
      _reverseWay(lastWay);
      response = _checkConnection(lastWay, currentWay);
    }
    if (response) return true;

    if (currentWay['tags']?['oneway'] != "yes") {
      _reverseWay(currentWay);
      response = _checkConnection(lastWay, currentWay);
    }

    return response;
  }

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
                "https://overpass-turbo.eu/?Q=//${ExtractorError.wayNotExist}%0Arel(${routeElements['id']});out geom;way(${element['ref']});out geom;&R",
          };
        }
        // Clonar el way para evitar modificar el original
        routeWays.add({
          "id": currentWay['id'],
          "tags": Map<String, dynamic>.from(currentWay['tags'] ?? {}),
          "nodes": List<int>.from(currentWay['nodes'] ?? []),
          "geometry": List<Map<String, dynamic>>.from(
            currentWay['geometry'] ?? [],
          ),
        });
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
            "https://overpass-turbo.eu/?Q=//${ExtractorError.routeWithEmptyWays}%0Arel(${routeElements['id']});out geom;&R",
      };
    }

    for (var i = 1; i < routeWays.length; i++) {
      final lastWay = routeWays[i - 1];
      final currentWay = routeWays[i];
      final connected = (i == 1)
          ? _checkFirstWay(lastWay, currentWay)
          : _normalizeCurrentWay(lastWay, currentWay);

      if (!connected) {
        throw {
          "extractor_error": ExtractorError.notNext,
          "uri":
              "https://overpass-turbo.eu/?Q=//${ExtractorError.notNext}%0Arel(${routeElements['id']});out geom;\nway(${lastWay['id']});out geom;\nway(${currentWay['id']});out geom;&R",
        };
      }
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
      tmpPoints.addAll(
        (element['geometry'] as List).map(
          (pt) => [pt['lon'] as double, pt['lat'] as double],
        ),
      );
    }

    return {
      'nodes': tmpNodes,
      'stops': tmpStops,
      'points': tmpPoints,
      'routeStops': routeStops,
    };
  }
}
