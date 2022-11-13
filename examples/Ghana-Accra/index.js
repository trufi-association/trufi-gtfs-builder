const { osmToGtfs, OSMPBFReader, OSMOverpassDownloader } = require('../../')
const path = require('path')

osmToGtfs({
    outputFiles: { outputDir: __dirname + '/out', trufiTPData: true, gtfs: true, },
    geojsonOptions: {
        // osmDataGetter: new OSMPBFReader(path.join(__dirname, "Ghana-Accra.osm.pbf")),
        osmDataGetter: new OSMOverpassDownloader({
            west: -0.467963,
            south: 5.488591,
            east: 0.036037,
            north: 5.833565
        }),
        skipRoute: (route) => {
            return ![14019708,14435104,14435107].includes(route.id)
        }
    }, gtfsOptions: {
        agencyTimezone: "Africa/Accra",
        fakeStops: () => true,
        stopNameBuilder: (stops) => {
            if (!stops || stops.length == 0) {
                stops = ["innominada"]
            }
            return stops.join(" y ")
        },
    }
}).catch(error => console.error(error))