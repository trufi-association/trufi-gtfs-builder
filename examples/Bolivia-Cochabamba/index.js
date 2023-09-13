const { osmToGtfs, OSMOverpassDownloader } = require('../../')

osmToGtfs({
    outputFiles: { outputDir: __dirname + '/out', trufiTPData: true, gtfs: true, },
    geojsonOptions: {
        osmDataGetter: new OSMOverpassDownloader({
            south: -17.709721,
            west: -66.440262,
            north: -17.261759,
            east: -65.577835,
        }), skipRoute: (route) => {
            return ![2084702].includes(route.id)
        }
    }, gtfsOptions: {
        fakeStops: (route) => ![9083839, 14576927, 9074378, 14576926].includes(route.id),
        stopNameBuilder: (stops) => {
            if (!stops || stops.length == 0) {
                stops = ["innominada"]
            }
            return stops.join(" y ")
        },
    }
}).catch(error => console.error(error))
