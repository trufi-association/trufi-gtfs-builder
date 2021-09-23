const path = require("path")
const gtfsDefaultBuilders = require('./src/geojson_to_gtfs/gtfsBuilders')
const writeGtfs = require('./src/geojson_to_gtfs/writeGtfs')
const fs = require('fs')
const {
    osmToGeojson,
    OSMOverpassDownloader,
    OSMPBFReader
} = require('./src/osm_to_geojson')
const geojsonToGtfs = require('./src/geojson_to_gtfs')

const defaultGeojsonOptions = {
    osmDataGetter: null,
    transformTypes: ["bus", "share_taxi", "aerialway", "train", "subway", "monorail", "tram", "trolleybus", "ferry"]
}
const defatulgtfsOptions = {
    agencyTimezone: "America/La_Paz",
    agencyUrl: "https://www.example.com/",
    defaultCalendar: () => "Mo-Su 00:00-24:00",
    frequencyHeadwaySecs: 300, // every 10 minutes
    vehicleSpeed: () => 50,
    skipStopsWithinDistance: 100,
    stopNameBuilder: (stops) => {
        if (!stops) {
            stops = ["unnamed"]
        }
        return stops.join(" and ")
    },

}
async function osmToGtfs(outputDir = null, config) {

    const geojsonOptions = Object.assign({}, defaultGeojsonOptions, config.geojsonOptions || {})
    const gtfsOptions = Object.assign({}, defatulgtfsOptions, config.gtfsOptions || {})
    const gtfsBuilders = Object.assign({}, gtfsDefaultBuilders, config.gtfsBuilders || {})

    if (outputDir && !fs.existsSync(path.dirname(outputDir))) {
        throw new Error('Output directory does not exist')
    }

    const geojson = await osmToGeojson(geojsonOptions)
    const gtfs = await geojsonToGtfs(geojson.geojsonFeatures, geojson.stops, gtfsOptions, gtfsBuilders)

    if (outputDir) {
        if (fs.existsSync(path.join(outputDir))) {
            fs.rmdirSync(path.join(outputDir), { recursive: true })
        }
        fs.mkdirSync(path.join(outputDir));
        fs.mkdirSync(path.join(outputDir, `routes`));
        for (const key in geojson.geojsonFeatures) {
            const feature = geojson.geojsonFeatures[key]
            fs.writeFileSync(path.join(outputDir, `/routes/${key}.geojson`), JSON.stringify(feature))
        }
        fs.writeFileSync(path.join(outputDir, 'log.json'), JSON.stringify(geojson.log))
        fs.writeFileSync(path.join(outputDir, 'stops.json'), JSON.stringify(geojson.stops))
        fs.writeFileSync(path.join(outputDir, 'README.md'), geojson.readme)

        writeGtfs(gtfs, path.join(outputDir, 'gtfs.zip'), gtfsOptions.zipCompressionLevel, gtfsOptions.zipComment);
    }
}

module.exports = {
    osmToGtfs,
    OSMOverpassDownloader,
    OSMPBFReader
}