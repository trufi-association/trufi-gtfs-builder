const { osmToGeojson, OSMOverpassDownloader } = require('../../')
const fs = require('fs')
const path = require('path')
osmToGeojson({
    outputDir: __dirname + '/out',
    mapProperties: (tags) => ({
        ...tags,
        stroke: '#164154',
        "stroke-width": 5,
    }),
    stopNameSeparator: ' and ',
    stopNameFallback: 'unnamed',
    osmDataGetter: new OSMOverpassDownloader({
        south: 17.958761,
        west: -16.025151,
        north: 18.192123,
        east: -15.874505,
    })
})
    .catch(error => console.error(error))