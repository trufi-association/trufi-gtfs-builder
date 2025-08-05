String readmeGenerator(Map<String, dynamic> data) {
  int routeWithError = 0;
  var outFile = """
| Id | Name | Ref | From | To | State |
| -- | ---- | --- | ---- | -- | ----- |""";

  for (var element in data['log']) {
    final tags = element['tags'] ?? {};
    if (element.containsKey('error')) routeWithError++;
    final state = element['error'] != null
        ? (element['error']['extractor_error'] != null
            ? "[${element['error']['extractor_error']}](${element['error']['uri']})"
            : element['error'].toString())
        : "✅";
    outFile +=
        "\n[${element['id']}](https://www.openstreetmap.org/relation/${element['id']}) | ${tags['name'] ?? ''} | ${tags['ref'] ?? ''} | ${tags['from'] ?? ''} | ${tags['to'] ?? ''} | $state";
  }

  return """
### Count
**Total**: ${data['log'].length}  **Correct**: ${data['log'].length - routeWithError}  **With error**: $routeWithError

$outFile
""";
}
