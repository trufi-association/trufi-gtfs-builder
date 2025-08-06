String formatTime(String line) {
  final trimmedLine = line.trim();
  return trimmedLine
      .replaceAll(RegExp(r'\\s*-\\s*'), '-') // normaliza guiones
      .replaceAll(RegExp(r'\\s*:\\s*'), ':') // normaliza horas
      .replaceAllMapped(RegExp(r'\\d[ ]+\\d'), (match) {
        return match.group(0)!.replaceAll(RegExp(r'[ ]+'), '');
      })
      .replaceAllMapped(RegExp(r'[^\\d]\\d[^\\d]'), (match) {
        return match.group(0)!.replaceAllMapped(RegExp(r'\\d'), (m) => '0${m.group(0)}');
      })
      .replaceAll(RegExp(r'[ ]+'), ' ');
}
