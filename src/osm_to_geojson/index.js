const OSMOverpassDownloader = require('./osm_getter/overpass_downloader')
const OSMPBFReader = require('./osm_getter/pbf_reader')
const readmeGenerator = require('./readme_generator')
const convertGeoJSON = require('./OSM_dataTool')
const fs = require('fs')
const path = require('path')

const defaultOptions = {
    outputDir: null,
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
    data["readme"] = readme

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
        fs.writeFileSync(path.join(outputDir, 'log.json'), JSON.stringify(data.log))
        fs.writeFileSync(path.join(outputDir, 'stops.json'), JSON.stringify(data.stops))
        fs.writeFileSync(path.join(outputDir, 'README.md'), data.readme)
    }

    return data
}

module.exports = {
    osmToGeojson,
    OSMOverpassDownloader,
    OSMPBFReader
}
