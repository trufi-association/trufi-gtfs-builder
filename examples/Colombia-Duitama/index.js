const { osmToGeojson, OSMPBFReader } = require('../../')
const path = require('path')

osmToGeojson({
    outputDir: __dirname + '/out',
    mapProperties: (tags) => ({
        ...tags,
        stroke: '#164154',
        "stroke-width": 5,
    }),
    stopNameSeparator: ' y ',
    stopNameFallback: 'innominada',
    osmDataGetter: new OSMPBFReader(path.join(__dirname, "duitama.osm.pbf"))
}).catch(error => console.error(error))
