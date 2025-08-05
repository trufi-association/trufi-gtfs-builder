import 'dart:convert';
import 'dart:io';
import '../lib/osm_data_tool.dart';
import '../lib/overpass_downloader.dart';

Future<void> main(List<String> args) async {
  final downloader = OSMOverpassDownloader(
    bounds: {"north": -16.45, "south": -16.55, "east": -68.10, "west": -68.20},
  );

  print("Descargando rutas...");
  final routes = await downloader.getRoutes(["bus"]);
  print("Total de rutas: ${routes.length}");

  print("Descargando ways...");
  final ways = await downloader.getWays();
  print("Total de ways: ${ways.length}");

  print("Descargando paradas...");
  final stops = await downloader.getStops();
  print("Total de paradas: ${stops.length}");

  print("Procesando datos...");
  final data = osmDataTool(
    routes: routes,
    ways: ways,
    stops: stops,
    skipRoute: (route) => true, // Aquí puedes filtrar rutas
  );

  print("Generando README...");
  File("README.md").writeAsStringSync(data['readme']);

  print("Exportando a GeoJSON...");
  final geojsonFile = File("output.geojson");
  geojsonFile.writeAsStringSync(
    const JsonEncoder.withIndent("  ").convert(data['geojsonFeatures']),
  );
  print("✅ Proceso finalizado. Revisa README.md");
}
