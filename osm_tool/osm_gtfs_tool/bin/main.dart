import 'dart:io';
import 'dart:convert';

import '../lib/osm/overpass_downloader.dart';
import '../lib/osm/osm_data_tool.dart';
import '../lib/gtfs/geojson_to_gtfs.dart';
import '../lib/gtfs/write_gtfs.dart';
import '../lib/readme_generator.dart';

Future<void> main(List<String> args) async {
  print("=== 🚍 OSM → GTFS Generator ===");

  // 📦 Bounding box (ejemplo: La Paz, Bolivia)
  final downloader = OSMOverpassDownloader(
    bounds: {
      "north": -17.31828,
      "south": -17.505838,
      "east": -65.941028,
      "west": -66.330903,
    },
  );

  print("🔄 Descargando rutas desde Overpass...");
  final routes = await downloader.getRoutes(["bus"]);
  final ways = await downloader.getWays();
  final stops = await downloader.getStops();

  print("🧩 Procesando datos OSM...");
  final osmData = osmDataTool(
    routes: routes,
    ways: ways,
    stops: stops,
    skipRoute: (route) => [9085564, 9118342].contains(route["id"]),
  );

  final outputDir = Directory('gtfs_output');
  if (!outputDir.existsSync()) outputDir.createSync();

  // Guardar archivo GeoJSON (opcional)
  final geojsonFile = File("${outputDir.path}/output.geojson");
  geojsonFile.writeAsStringSync(jsonEncode(osmData['geojsonFeatures']));
  print("✅ GeoJSON guardado en output.geojson");

  // Configuración GTFS
  final config = {
    'agencyTimezone': 'America/La_Paz',
    'agencyUrl': 'https://nexion.com.bo',
    'defaultAgency': 'Nexion',
    'vehicleSpeed': 30.0, // km/h por defecto
    'defaultFares': {
      'currencyType': 'BOB',
    },
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
    osmData['geojsonFeatures'],
    osmData['stops'],
    config,
  );

  final gtfsDir = Directory('${outputDir.path}/gtfs');
  if (!gtfsDir.existsSync()) gtfsDir.createSync(recursive: true);

  writeGtfs(gtfsData, gtfsDir.path); // escribe los archivos .txt

  // Crear README opcional
  final readmeText = readmeGenerator(osmData);
  File('${outputDir.path}/README.md').writeAsStringSync(readmeText);

  print("✅ Archivos GTFS generados en: ${outputDir.path}/gtfs");
}
