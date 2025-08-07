import 'dart:convert';
import 'package:http/http.dart' as http;

import 'osm_models.dart';

class OSMOverpassDownloader {
  final String bbox;

  OSMOverpassDownloader({required Map<String, double> bounds})
      : bbox =
            "${bounds['south']},${bounds['west']},${bounds['north']},${bounds['east']}";

  Future<Map<String, dynamic>> _overpassRequest(String query) async {
    final uri = Uri.https("www.overpass-api.de", "/api/interpreter");
    final response = await http.post(uri, body: query);
    if (response.statusCode != 200) {
      throw Exception("Overpass request failed: ${response.body}");
    }
    return jsonDecode(response.body);
  }

  Map<int, T> _mapElementsById<T>(Map<String, dynamic> response, T Function(Map<String, dynamic>) fromJson) {
    final map = <int, T>{};
    for (var element in response['elements']) {
      final id = element['id'];
      map[id] = fromJson(element);
    }
    return map;
  }

  Future<Map<int, OsmWay>> getWays() async {
    final query = '[out:json];rel["type"="route"]($bbox);way(r);out geom;';
    final resp = await _overpassRequest(query);
    return _mapElementsById(resp, OsmWay.fromJson);
  }

  Future<Map<int, OsmStop>> getStops() async {
    final query = '[out:json];rel["type"="route"]($bbox);node(r);out geom;';
    final resp = await _overpassRequest(query);
    return _mapElementsById(resp, OsmStop.fromJson);
  }

Future<Map<int, OsmRelation>> getRoutes(List<RouteType> types) async {
  var routesFilter = "";
  if (types.isNotEmpty) {
    final joined = types.map((e) => e.value).join("|");
    routesFilter = '["route"~"$joined"]';
  }
  final query =
      '[out:json];rel["type"="route"]$routesFilter($bbox);out body;';
  final resp = await _overpassRequest(query);
  return _mapElementsById(resp, OsmRelation.fromJson);
}

}
