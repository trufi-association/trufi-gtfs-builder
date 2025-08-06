import 'dart:convert';
import 'package:http/http.dart' as http;

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

  Map<int, dynamic> _indexElementsById(Map<String, dynamic> response) {
    final map = <int, dynamic>{};
    for (var element in response['elements']) {
      map[element['id']] = element;
    }
    return map;
  }

  Future<Map<int, dynamic>> getWays() async {
    final query = '[out:json];rel["type"="route"]($bbox);way(r);out geom;';
    final resp = await _overpassRequest(query);
    return _indexElementsById(resp);
  }

  Future<Map<int, dynamic>> getStops() async {
    final query = '[out:json];rel["type"="route"]($bbox);node(r);out geom;';
    final resp = await _overpassRequest(query);
    return _indexElementsById(resp);
  }

  Future<Map<int, dynamic>> getRoutes(List<String> transformTypes) async {
    var routesFilter = "";
    if (transformTypes.isNotEmpty) {
      routesFilter = '["route"~"${transformTypes.join("|")}"]';
    }
    final query =
        '[out:json];rel["type"="route"]$routesFilter($bbox);out body;';
    final resp = await _overpassRequest(query);
    return _indexElementsById(resp);
  }
}
