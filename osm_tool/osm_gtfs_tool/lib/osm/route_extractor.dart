import '../extractor_error.dart';
import 'osm_models.dart';

class RouteData {
  final List<int> nodes;
  final Map<String, List<String>> stops;
  final List<List<double>> points;
  final List<RouteStop> routeStops;

  RouteData({
    required this.nodes,
    required this.stops,
    required this.points,
    required this.routeStops,
  });
}

class RouteExtractor {
  static void _reverseWay(OsmWay way) {
    way.geometry = List.from(way.geometry.reversed);
    way.nodes = List.from(way.nodes.reversed);
  }

  static bool _checkConnection(OsmWay a, OsmWay b) {
    return a.nodes.last == b.nodes.first;
  }

  static bool _normalizeCurrentWay(OsmWay lastWay, OsmWay currentWay) {
    var response = _checkConnection(lastWay, currentWay);
    if (!response && !currentWay.isOneway) {
      _reverseWay(currentWay);
      response = _checkConnection(lastWay, currentWay);
    }
    return response;
  }

  static bool _checkFirstWay(OsmWay lastWay, OsmWay currentWay) {
    var response = _checkConnection(lastWay, currentWay);
    if (response) return true;

    if (!currentWay.isOneway) {
      _reverseWay(currentWay);
      response = _checkConnection(lastWay, currentWay);
    }
    if (response) return true;

    if (!lastWay.isOneway) {
      _reverseWay(lastWay);
      response = _checkConnection(lastWay, currentWay);
    }
    if (response) return true;

    if (!currentWay.isOneway) {
      _reverseWay(currentWay);
      response = _checkConnection(lastWay, currentWay);
    }

    return response;
  }

  static RouteData extract(
    OsmRelation route,
    Map<int, OsmWay> ways,
    Map<int, OsmStop> stops,
  ) {
    final routeWays = <OsmWay>[];
    final routeStops = <RouteStop>[];

    for (var member in route.members) {
      if (member.elementType == OsmElementType.way &&
          (member.role == null || member.role!.isEmpty)) {
        final currentWay = ways[member.ref];
        if (currentWay == null) {
          throw {
            "extractor_error": ExtractorError.wayNotExist,
            "uri":
                "https://overpass-turbo.eu/?Q=//${ExtractorError.wayNotExist}%0Arel(${route.id});out geom;way(${member.ref});out geom;&R",
          };
        }
        routeWays.add(OsmWay(
          id: currentWay.id,
          tags: Map<String, String>.from(currentWay.tags),
          nodes: List<int>.from(currentWay.nodes),
          geometry: List<Map<String, double>>.from(currentWay.geometry),
        ));
      } else if (member.elementType == OsmElementType.node) {
        final currentStop = stops[member.ref];
        if (currentStop != null && currentStop.isStopPosition) {
          routeStops.add(RouteStop.fromOsmStop(currentStop));
        }
      }
    }

    if (routeWays.isEmpty) {
      throw {
        "extractor_error": ExtractorError.routeWithEmptyWays,
        "uri":
            "https://overpass-turbo.eu/?Q=//${ExtractorError.routeWithEmptyWays}%0Arel(${route.id});out geom;&R",
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
              "https://overpass-turbo.eu/?Q=//${ExtractorError.notNext}%0Arel(${route.id});out geom;way(${lastWay.id});out geom;way(${currentWay.id});out geom;&R",
        };
      }
    }

    final tmpNodes = <int>[];
    final tmpStops = <String, List<String>>{};
    final tmpPoints = <List<double>>[];

    for (var way in routeWays) {
      for (var nodeId in way.nodes) {
        final stopId = nodeId.toString();
        final stopName = way.tags['name'] ?? "";
        tmpStops.putIfAbsent(stopId, () => []).add(stopName);
      }
      tmpNodes.addAll(way.nodes);
      tmpPoints.addAll(
        way.geometry.map((pt) => [pt['lon']!, pt['lat']!]),
      );
    }

    return RouteData(
      nodes: tmpNodes,
      stops: tmpStops,
      points: tmpPoints,
      routeStops: routeStops,
    );
  }
}
