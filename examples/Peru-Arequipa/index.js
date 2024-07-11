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
    }, gtfsOptions: {
        fakeStops: (routeFeature) => [].includes(routeFeature.properties.id),
        stopNameBuilder: (stops) => {
            if (!stops || stops.length == 0) {
                stops = ["innominada"]
            }
            return stops.join(" y ")
        },
    }
}).catch(error => console.error(error))
