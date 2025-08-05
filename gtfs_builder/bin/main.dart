import 'dart:convert';
import 'dart:io';
import '../lib/geojson_to_gtfs.dart';
import '../lib/write_gtfs.dart';

Future<void> main(List<String> args) async {
  final geojsonFile = File('output.geojson'); // ✅ ya está en gtfs_builder

  if (!geojsonFile.existsSync()) {
    print("❌ No se encontró el archivo output.geojson en esta carpeta");
    exit(1);
  }

  final geojson = jsonDecode(await geojsonFile.readAsString());

  final config = {
    'agencyTimezone': 'America/La_Paz',
    'agencyUrl': 'https://nexion.com.bo',
    'defaultCalendar': (Map<String, dynamic> f) => 'Mo-Su 05:00-21:00',
    'defaultFares': {'currencyType': 'BOB'},
    'frequencyHeadway': (Map<String, dynamic> f) => 600, // 10 minutos
    'stopNameBuilder': (dynamic stop) => (stop?['name'] ?? '') as String,
    'vehicleSpeed': (Map<String, dynamic> f) => 30 * 1000 ~/ 3600, // 30 km/h
    'feed': {
      'feed_publisher_url': 'https://nexion.com.bo',
      'feed_publisher_name': 'Nexion Transport',
      'feed_lang': 'es',
      'feed_version': '1.0',
      'feed_contact_email': 'soporte@nexion.com.bo',
      'feed_contact_url': 'https://nexion.com.bo/contacto',
      'feed_start_date': '20250101',
      'feed_end_date': '20251231',
      'feed_id': 'nexion_feed',
    },
  };

  print("Procesando GTFS desde output.geojson...");
  final gtfsData = geojsonToGtfs(geojson, {}, config);

  final outputDir = Directory('gtfs_output');
  if (!outputDir.existsSync()) outputDir.createSync();

  writeGtfs(gtfsData, outputDir.path);

  print("✅ Archivos GTFS generados en: ${outputDir.path}");
}
