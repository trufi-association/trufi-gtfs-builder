enum ExtractorError {
  notNext,
  noRefDefined,
  wayNotExist,
  routeWithEmptyWays,
  routeSkipped,
}

extension ExtractorErrorExtension on ExtractorError {
  String get message {
    switch (this) {
      case ExtractorError.notNext:
        return "Las calles de la ruta no son secuenciales.";
      case ExtractorError.noRefDefined:
        return "La ruta no tiene definido el ref.";
      case ExtractorError.wayNotExist:
        return "Un way asociado a la ruta no existe o está fuera del bounding box.";
      case ExtractorError.routeWithEmptyWays:
        return "La ruta no tiene ways asociados.";
      case ExtractorError.routeSkipped:
        return "La ruta fue omitida por la configuración.";
    }
  }
}
