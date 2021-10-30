const { point } = require('@turf/helpers')
const isEqual = require('@turf/boolean-equal').default
const routeExtractor = require('./route_extractor')
const extractor_error = require('./extractor_error')

module.exports = function ({ routes, ways, stops, skipRoute }) {
    const mainStops = {}
    const geojson_features = {}
    const log_file = []

    for (const key in routes) {
        const current_route = routes[key]

        try {
            if (!skipRoute(current_route))
                throw { extractor_error: extractor_error.route_skipped, uri: `https://overpass-turbo.eu/?Q=${encodeURI(`//${extractor_error.route_skipped}\nrel(${current_route.id});out geom;`)}&R` }
            if (!current_route.tags["ref"])
                throw { extractor_error: extractor_error.no_ref_defined, uri: `https://overpass-turbo.eu/?Q=${encodeURI(`//${extractor_error.no_ref_defined}\nrel(${current_route.id});out geom;`)}&R` }

            const data = routeExtractor(current_route, ways, stops)
            log_file.push({ id: current_route.id, tags: current_route.tags })

            const tmp_filter = filterPointsAndNodes(data.points, data.nodes)
            data.points = tmp_filter.points
            data.nodes = tmp_filter.nodes
            geojson_features[`${current_route.id}`] = {
                "type": "FeatureCollection",
                "features": [
                    {
                        "type": "Feature",
                        "properties": { ...current_route.tags, id: current_route.id },
                        "geometry": {
                            "type": "LineString",
                            "coordinates": data.points,
                            "nodes": data.nodes,
                        }
                    },
                    ...data.routeStops.map(element => {
                        return {
                            "type": "Feature",
                            "properties": { ...element.tags, id: element.id },
                            "geometry": {
                                "type": "Point",
                                "coordinates": [
                                    element.lon,
                                    element.lat
                                ]
                            }
                        }
                    })
                ]
            }

            // Merge stop names
            Object.keys(data.stops).forEach(stop_id => {
                if (mainStops[stop_id]) {
                    mainStops[stop_id] = mainStops[stop_id].concat(data.stops[stop_id])
                } else {
                    mainStops[stop_id] = data.stops[stop_id]
                }
            })
        } catch (error) {
            log_file.push({
                id: current_route.id,
                error: error.extractor_error ? error : `${error}`,
                tags: current_route.tags
            })
        }
    }

    log_file.sort((a, b) => {
        a = a.tags.ref || "0a"
        b = b.tags.ref || "0a"
        let aIsNumber = !isNaN(a)
        let bIsNumber = !isNaN(b)
        if (aIsNumber && bIsNumber) {
            return parseInt(a) - parseInt(b)
        } else if (aIsNumber || bIsNumber) {
            return aIsNumber ? 1 : -1
        } else {
            return a.localeCompare(b)
        }
    })

    const formatted_stops = filter_stops(mainStops)

    return {
        geojsonFeatures: geojson_features,
        stops: formatted_stops,
        log: log_file,
    }
}

function filter_stops(stops) {
    const result = {}

    Object.keys(stops).forEach(stop_id => {
        const stop_names = stops[stop_id]
        const stop_names_filtered = stop_names
            .filter((value, index, self) => self.indexOf(value) === index)
            .filter(value => value !== "")

        result[stop_id] = stop_names_filtered
    })

    return result
}

function filterPointsAndNodes(points, nodes) {
    const result = { points: [], nodes: [] }
    let last = null

    for (let i = 0; i < points.length; i++) {
        const cur = points[i]

        if (last && isEqual(point(last), point(cur))) {
            continue
        }

        last = cur
        result.points.push(cur)
        result.nodes.push(nodes[i])
    }

    return result
}
