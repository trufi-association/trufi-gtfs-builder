import 'extractor_error.dart';

String readmeGenerator(Map<String, dynamic> data) {
  int routesWithError = 0;

  String outFile = '''
| Id | Name | Ref | From | To | State |
| -- | ---- | --- | ---- | -- | ----- |''';

  for (var element in data['log'] ?? []) {
    final tags = element['tags'] ?? {};
    final id = element['id'] ?? 'unknown';

    if (element['error'] != null) routesWithError++;

    final state = () {
      if (element['error'] != null) {
        final err = element['error'];
        if (err is Map && err['extractor_error'] != null) {
          final errorType = err['extractor_error'] as ExtractorError;
          final uri = err['uri'] ?? '#';
          return '[${errorType.name}]($uri)';
        }
        return err.toString();
      }
      return '✅';
    }();

    outFile +=
        '\n[$id](https://www.openstreetmap.org/relation/$id) | ${tags['name'] ?? ''} | ${tags['ref'] ?? ''} | ${tags['from'] ?? ''} | ${tags['to'] ?? ''} | $state';
  }

  final total = (data['log'] as List?)?.length ?? 0;
  final correct = total - routesWithError;

  final response = '''
### Count
**Total**: $total  **Correct**: $correct  **With error**: $routesWithError

$outFile''';

  return response;
}
