// 📁 Archivo: lib/models/gtfs_config.dart

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