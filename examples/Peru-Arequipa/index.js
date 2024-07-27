const { osmToGtfs, OSMOverpassDownloader } = require('../..')

osmToGtfs({
    outputFiles: { outputDir: __dirname + '/out', trufiTPData: true, gtfs: true, },
    geojsonOptions: {
        osmDataGetter: new OSMOverpassDownloader({
            south: -16.489732,
            west: -71.622936,
            north: -16.303314,
            east: -71.453334,
        }), skipRoute: (route) => {
            return ![2084702].includes(route.id)
        }
    },
    gtfsOptions: {
        fakeStops: (routeFeature) => [].includes(routeFeature.properties.id),
        stopNameBuilder: (stops) => {
            if (!stops || stops.length == 0) {
                stops = ["Innominada"]
            }
            return stops.join(" y ")
        },
        agencyTimezone: "America/Lima",
        agencyUrl: "https://arequipabus.app/",
        defaultFares: { currencyType: "PEN" },
        feed: {
            publisherUrl: "https://arequipabus.app",
            publisherName: "Arequipa Bus",
            lang: "es",
            version: new Date().toUTCString(),
            contactEmail: "email@arequipabus.app",
            contactUrl: "http://support.arequipabus.app",
            startDate: "20000101",
            endDate: "21000101",
            id: "arequipa-pe"
        }
    }
}).catch(error => console.error(error))
