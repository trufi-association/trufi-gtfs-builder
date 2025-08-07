import 'dart:io';
import 'dart:convert';

import '../lib/osm/overpass_downloader.dart';
import '../lib/osm/osm_data_tool.dart';
import '../lib/gtfs/geojson_to_gtfs.dart';
import '../lib/gtfs/write_gtfs.dart';
import '../lib/readme_generator.dart';
import '../lib/osm/osm_models.dart';

Future<void> main(List<String> args) async {
  print("=== 🚍 OSM → GTFS Generator ===");

  final downloader = OSMOverpassDownloader(
    bounds: {
      "north": -17.31828,
      "south": -17.505838,
      "east": -65.941028,
      "west": -66.330903,
    },
  );

  print("🔄 Descargando rutas desde Overpass...");
  final routes = await downloader.getRoutes([RouteType.bus, RouteType.tram]);
  final ways = await downloader.getWays();
  final stops = await downloader.getStops();

  final outputDir = Directory('gtfs_output');
  if (!outputDir.existsSync()) outputDir.createSync();

  final rawOutputDir = Directory('${outputDir.path}/raw_osm');
  if (!rawOutputDir.existsSync()) rawOutputDir.createSync(recursive: true);

  final routesJson = routes.map((k, v) => MapEntry(k.toString(), v.toJson()));
  final routesFile = File('${rawOutputDir.path}/routes.json');
  routesFile.writeAsStringSync(jsonEncode(routesJson));
  print("✅ Rutas guardadas en ${routesFile.path}");

  final waysJson = ways.map((k, v) => MapEntry(k.toString(), v.toJson()));
  final waysFile = File('${rawOutputDir.path}/ways.json');
  waysFile.writeAsStringSync(jsonEncode(waysJson));
  print("✅ Ways guardadas en ${waysFile.path}");

  final stopsJson = stops.map((k, v) => MapEntry(k.toString(), v.toJson()));
  final stopsFile = File('${rawOutputDir.path}/stops.json');
  stopsFile.writeAsStringSync(jsonEncode(stopsJson));
  print("✅ Paradas guardadas en ${stopsFile.path}");

  print("🧩 Procesando datos OSM...");
  final osmData = osmDataTool(
    routes: routes,
    ways: ways,
    stops: stops,
    skipRoute: (route) => ![9085564, 9118342].contains(route.id),
  );

  final geojsonFile = File("${outputDir.path}/output.geojson");
  geojsonFile.writeAsStringSync(jsonEncode(osmData.geojsonFeatures));
  print("✅ GeoJSON guardado en ${geojsonFile.path}");

  final config = {
    'agencyTimezone': 'America/La_Paz',
    'agencyUrl': 'https://nexion.com.bo',
    'defaultAgency': 'Nexion',
    'vehicleSpeed': 30.0,
    'defaultFares': {'currencyType': 'BOB'},
    'feed': {
      'feed_publisher_name': 'Nexion GTFS Tool',
      'feed_publisher_url': 'https://nexion.com.bo',
      'feed_lang': 'es',
      'feed_version': '1.0.0',
      'feed_start_date': '20250101',
      'feed_end_date': '20251231',
      'feed_id': 'nexion_feed',
    },
  };

  print("🛠️ Generando archivos GTFS...");
  final gtfsData = geojsonToGtfs(
    osmData.geojsonFeatures,
    osmData.stops,
    config,
  );

  final gtfsDir = Directory('${outputDir.path}/gtfs');
  if (!gtfsDir.existsSync()) gtfsDir.createSync(recursive: true);
  writeGtfs(gtfsData, gtfsDir.path);

  final readmeText = osmData.readme;
  File('${outputDir.path}/README.md').writeAsStringSync(readmeText);

  print("✅ Archivos GTFS generados en: ${gtfsDir.path}");
}
