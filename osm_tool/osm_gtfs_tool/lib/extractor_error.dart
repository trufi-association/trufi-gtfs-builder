enum ExtractorError {
  noRefDefined,
  wayNotExist,
  routeWithEmptyWays,
  routeSkipped,
}

extension ExtractorErrorExtension on ExtractorError {
  String get message {
    switch (this) {
      case ExtractorError.noRefDefined:
        return "La ruta no tiene definido el ref.";
      case ExtractorError.wayNotExist:
        return "Un way asociado a la ruta no existe.";
      case ExtractorError.routeWithEmptyWays:
        return "La ruta no tiene ways asociados.";
      case ExtractorError.routeSkipped:
        return "La ruta fue omitida por la configuración.";
    }
  }
}
