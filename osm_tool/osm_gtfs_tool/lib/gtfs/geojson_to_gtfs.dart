import 'gtfs_models.dart';
import '../osm/osm_data_tool.dart';
import '../osm/osm_models.dart';
import 'gtfs_builders.dart';

class GtfsExport {
  final List<GtfsAgency> agencies;
  final List<GtfsCalendar> calendar;
  final List<GtfsRoute> routes;
  final List<GtfsFareAttribute> fareAttributes;
  final List<GtfsFareRule> fareRules;
  final GtfsFeedInfo feedInfo;
  final List<GtfsTrip> trips;
  final List<GtfsFrequency> frequencies;
  final List<GtfsStop> stops;
  final List<GtfsStopTime> stopTimes;
  final List<GtfsShape> shapes;

  GtfsExport({
    required this.agencies,
    required this.calendar,
    required this.routes,
    required this.fareAttributes,
    required this.fareRules,
    required this.feedInfo,
    required this.trips,
    required this.frequencies,
    required this.stops,
    required this.stopTimes,
    required this.shapes,
  });

  Map<String, List<Map<String, dynamic>>> toCsvMap() {
    return {
      'agency': agencies.map((a) => a.toCsv()).toList(),
      'calendar': calendar.map((c) => c.toCsv()).toList(),
      'routes': routes.map((r) => r.toCsv()).toList(),
      'fare_attributes': fareAttributes.map((f) => f.toCsv()).toList(),
      'fare_rules': fareRules.map((f) => f.toCsv()).toList(),
      'feed_info': [feedInfo.toCsv()],
      'trips': trips.map((t) => t.toCsv()).toList(),
      'frequencies': frequencies.map((f) => f.toCsv()).toList(),
      'stops': stops.map((s) => s.toCsv()).toList(),
      'stop_times': stopTimes.map((s) => s.toCsv()).toList(),
      'shapes': shapes.map((s) => s.toCsv()).toList(),
    };
  }
}
class GtfsFeed {
  final String feedPublisherName;
  final String feedPublisherUrl;
  final String feedLang;
  final String feedVersion;
  final String feedStartDate;
  final String feedEndDate;
  final String feedId;

  GtfsFeed({
    required this.feedPublisherName,
    required this.feedPublisherUrl,
    required this.feedLang,
    required this.feedVersion,
    required this.feedStartDate,
    required this.feedEndDate,
    required this.feedId,
  });

  factory GtfsFeed.fromMap(Map<String, dynamic> map) => GtfsFeed(
        feedPublisherName: map['feed_publisher_name'],
        feedPublisherUrl: map['feed_publisher_url'],
        feedLang: map['feed_lang'],
        feedVersion: map['feed_version'],
        feedStartDate: map['feed_start_date'],
        feedEndDate: map['feed_end_date'],
        feedId: map['feed_id'],
      );

  Map<String, dynamic> toMap() => {
        'feed_publisher_name': feedPublisherName,
        'feed_publisher_url': feedPublisherUrl,
        'feed_lang': feedLang,
        'feed_version': feedVersion,
        'feed_start_date': feedStartDate,
        'feed_end_date': feedEndDate,
        'feed_id': feedId,
      };
}

class GtfsFareDefaults {
  final String currencyType;

  GtfsFareDefaults({required this.currencyType});

  factory GtfsFareDefaults.fromMap(Map<String, dynamic> map) {
    return GtfsFareDefaults(
      currencyType: map['currencyType'] ?? 'BOB',
    );
  }

  Map<String, dynamic> toMap() => {
        'currencyType': currencyType,
      };
}

class GtfsConfig {
  final String agencyTimezone;
  final String agencyUrl;
  final String defaultAgency;
  final double vehicleSpeed;
  final GtfsFareDefaults defaultFares;
  final GtfsFeed feed;

  GtfsConfig({
    required this.agencyTimezone,
    required this.agencyUrl,
    required this.defaultAgency,
    required this.vehicleSpeed,
    required this.defaultFares,
    required this.feed,
  });

  factory GtfsConfig.fromMap(Map<String, dynamic> map) => GtfsConfig(
        agencyTimezone: map['agencyTimezone'],
        agencyUrl: map['agencyUrl'],
        defaultAgency: map['defaultAgency'],
        vehicleSpeed: map['vehicleSpeed']?.toDouble() ?? 0.0,
        defaultFares: GtfsFareDefaults.fromMap(map['defaultFares'] ?? {}),
        feed: GtfsFeed.fromMap(map['feed'] ?? {}),
      );

  Map<String, dynamic> toMap() => {
        'agencyTimezone': agencyTimezone,
        'agencyUrl': agencyUrl,
        'defaultAgency': defaultAgency,
        'vehicleSpeed': vehicleSpeed,
        'defaultFares': defaultFares.toMap(),
        'feed': feed.toMap(),
      };
}
GtfsExport geojsonToGtfs(
  Map<String, GeoJsonFeatureCollection> featuresByRouteId,
  Map<String, List<String>> inputStops,
  GtfsConfig config, // ✅ Usamos el modelo aquí
) {
  final groupedFeatures = featuresByRouteId.values
      .map(
        (fc) => fc.features.map((f) => OsmFeature.fromGeoJsonModel(f)).toList(),
      )
      .toList();

  final allFeatures = groupedFeatures.expand((f) => f).toList();

  final agencies = GtfsBuilders.buildAgencies(
    allFeatures,
    config.agencyTimezone,
    config.agencyUrl,
  );

  final calendar = GtfsBuilders.buildCalendar();

  final routes = GtfsBuilders.buildRoutes(allFeatures, config.defaultAgency);

  final fareResult = GtfsBuilders.buildFare(
    groupedFeatures,
    config.defaultFares,
  );

  final fareAttributes = fareResult.attributes;
  final fareRules = fareResult.rules;

  final feedInfo = GtfsBuilders.buildFeedInfo(config.feed);

  final trips = GtfsBuilders.buildTrips(allFeatures);

  final frequencies = GtfsBuilders.buildFrequencies(trips);

  final stops = GtfsBuilders.buildStops(allFeatures, inputStops);

  final shapes = GtfsBuilders.buildShapes(allFeatures);

  final stopTimes = GtfsBuilders.buildStopTimes(
    trips,
    stops,
    config.vehicleSpeed,
  );

  return GtfsExport(
    agencies: agencies,
    calendar: calendar,
    routes: routes,
    fareAttributes: fareAttributes,
    fareRules: fareRules,
    feedInfo: feedInfo,
    trips: trips,
    frequencies: frequencies,
    stops: stops,
    stopTimes: stopTimes,
    shapes: shapes,
  );
}
