import 'dart:convert';
import 'dart:io';
import '../lib/geojson_to_gtfs.dart';
import '../lib/write_gtfs.dart';

Future<void> main() async {
  final geojsonFile = File('output.geojson');
  if (!geojsonFile.existsSync()) {
    print("❌ output.geojson no encontrado.");
    exit(1);
  }

  final geojson = jsonDecode(await geojsonFile.readAsString());

  final config = {
    'agencyTimezone': 'America/La_Paz',
    'agencyUrl': 'https://nexion.com.bo',
    'defaultAgency': 'Nexion',
  };

  final gtfsData = geojsonToGtfs(geojson, {}, config);

  final outputDir = Directory('gtfs_output');
  if (!outputDir.existsSync()) outputDir.createSync();

  writeGtfs(gtfsData, outputDir.path);

  print("✅ GTFS generado en: ${outputDir.path}");
}
