const { osmToGtfs, OSMPBFReader } = require('../../')
const path = require('path')

osmToGtfs(
    __dirname + '/out', {
    geojsonOptions: {
        osmDataGetter: new OSMPBFReader(path.join(__dirname, "cochabamba.osm.pbf"))
    }, gtfsOptions: {
        stopNameBuilder: (stops) => {
            if (!stops || stops.length == 0) {
                stops = ["innominada"]
            }
            return stops.join(" y ")
        },
    }
}).catch(error => console.error(error))
