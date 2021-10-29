const OSMOverpassDownloader = require('./osm_getter/overpass_downloader')
const OSMPBFReader = require('./osm_getter/pbf_reader')
const readmeGenerator = require('./readme_generator')
const convertGeoJSON = require('./OSM_dataTool')

async function osmToGeojson(options) {
    const {
        transformTypes,
        osmDataGetter,
        skipRoute,
    } = options;

    if (options.osmDataGetter == null) {
        throw new Error('osmDataGetter missing')
    }

    const routes = await osmDataGetter.getRoutes(transformTypes)
    const ways = await osmDataGetter.getWays()
    const stops = await osmDataGetter.getStops()
    const data = convertGeoJSON({ routes, ways, stops, skipRoute })
    const readme = readmeGenerator(data)
    data["readme"] = readme

    return data
}

module.exports = {
    osmToGeojson,
    OSMOverpassDownloader,
    OSMPBFReader
}
