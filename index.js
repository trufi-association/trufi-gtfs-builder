const OSMOverpassDownloader = require('./src/osm_getter/overpass_downloader')
const OSMPBFReader = require('./src/osm_getter/pbf_reader')
const readmeGenerator = require('./src/readme_generator')
const convertGeoJSON = require('./src/OSM_dataTool')
const fs = require('fs')
const path = require('path')

const defaultOptions = {
    outputDir: null,
    geojsonFilename: 'routes.geojson',
    logFilename: 'log.json',
    stopsFilename: 'stops.json',
    readmeFilename: 'README.md',
    stopNameSeparator: ' and ',
    stopNameFallback: 'Unnamed Street',
    formatStopName: function (names) { return names.join(this.stopNameSeparator) || this.stopNameFallback },
    mapProperties: function (tags) { return tags },
    osmDataGetter: null,
    transformTypes: ["bus", "share_taxi", "aerialway", "train", "subway", "monorail", "tram", "trolleybus", "ferry"]
}


async function osmToGeojson(options = {}) {
    options = Object.assign({}, defaultOptions, options)

    // Rebind functions to new options object
    Object.keys(options).forEach(key => {
        if (typeof options[key] === "function") {
            options[key] = options[key].bind(options)
        }
    });
    const {
        outputDir,
        geojsonFilename,
        logFilename,
        stopsFilename,
        readmeFilename,
        formatStopName,
        mapProperties,
        transformTypes,
        osmDataGetter
    } = options;

    if (options.osmDataGetter == null) {
        throw new Error('osmDataGetter missing')
    }

    if (outputDir !== null && typeof outputDir !== "string") {
        throw new Error('Invalid outputDir');
    }

    if (outputDir && !fs.existsSync(path.dirname(outputDir))) {
        throw new Error('Output directory does not exist')
    }

    const routes = await osmDataGetter.getRoutes(transformTypes)
    const ways = await osmDataGetter.getWays()
    const stops = await osmDataGetter.getStops()
    const data = convertGeoJSON({ routes, ways, stops })
    const readme = readmeGenerator(data)

    if (outputDir) {
        if (fs.existsSync(path.join(outputDir))) {
            fs.rmdirSync(path.join(outputDir), { recursive: true })
        }
        fs.mkdirSync(path.join(outputDir));
        fs.mkdirSync(path.join(outputDir, `routes`));
        for (const key in data.geojsonFeatures) {
            const feature = data.geojsonFeatures[key]
            fs.writeFileSync(path.join(outputDir, `/routes/${key}.geojson`), JSON.stringify(feature))
        }
        fs.writeFileSync(path.join(outputDir, logFilename), JSON.stringify(data.log))
        fs.writeFileSync(path.join(outputDir, stopsFilename), JSON.stringify(data.stops))
        fs.writeFileSync(path.join(outputDir, readmeFilename), readme)
    }

    return data
}

module.exports = {
    osmToGeojson,
    OSMOverpassDownloader,
    OSMPBFReader
}
