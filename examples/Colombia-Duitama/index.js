const { osmToGtfs, OSMPBFReader } = require('../../')
const path = require('path')

osmToGtfs({
    outputFiles: { outputDir: __dirname + '/out', trufiTPData: true, gtfs: true },
    geojsonOptions: {
        osmDataGetter: new OSMPBFReader(path.join(__dirname, "duitama.osm.pbf"))
    }, gtfsOptions: {
        agencyTimezone: "America/Bogota",
        stopNameBuilder: (stops) => {
            if (!stops || stops.length == 0) {
                stops = ["innominada"]
            }
            return stops.join(" y ")
        },
    }
}).catch(error => console.error(error))