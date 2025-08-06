import 'dart:io';

/// Escribe los datos GTFS en archivos CSV (.txt)
void writeGtfs(Map<String, List<Map<String, dynamic>>> data, String outputPath) {
  for (var entry in data.entries) {
    final name = entry.key;
    final values = entry.value;

    if (values.isEmpty) continue;

    final keys = values.first.keys.toList();
    final file = File('$outputPath/$name.txt');
    final sink = file.openWrite();

    // encabezados
    sink.writeln(keys.join(','));

    // filas
    for (var row in values) {
      final csvRow = keys.map((k) {
        final value = row[k]?.toString() ?? '';
        // proteger comas con comillas dobles
        return value.contains(',')
            ? '"${value.replaceAll('"', "'")}"'
            : value;
      }).join(',');
      sink.writeln(csvRow);
    }

    sink.close();
  }
}
