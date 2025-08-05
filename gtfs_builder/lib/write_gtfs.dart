import 'dart:io';

void writeGtfs(Map<String, List<Map<String, dynamic>>> data, String outputPath) {
  for (var entry in data.entries) {
    final name = entry.key;
    final values = entry.value;
    if (values.isEmpty) continue;

    final keys = values.first.keys.toList();
    final file = File('$outputPath/$name.txt');
    final sink = file.openWrite();

    sink.writeln(keys.join(','));
    for (var row in values) {
      final csvRow = keys.map((k) {
        final value = row[k]?.toString() ?? '';
        return value.contains(',') ? '"${value.replaceAll('"', "'")}"' : value;
      }).join(',');
      sink.writeln(csvRow);
    }

    sink.close();
  }
}
