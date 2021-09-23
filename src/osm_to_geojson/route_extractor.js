const extractor_error = require('./extractor_error')
const reverseWay = (current_way) => {
    current_way.geometry = current_way.geometry.reverse()
    current_way.nodes = current_way.nodes.reverse()
}
const normalizecurrentWay = (lastWay, currentWay) => {
    const checkConnection = (a, b) => a.nodes[a.nodes.length - 1] == b.nodes[0]
    let response = checkConnection(lastWay, currentWay)
    if (!response && currentWay.tags.oneway != "yes") {
        reverseWay(currentWay)
        response = checkConnection(lastWay, currentWay)
    }
    return response
}
const checkFirstWay = (lastWay, currentWay) => {
    const checkConnection = (a, b) => a.nodes[a.nodes.length - 1] == b.nodes[0]
    // a -> b == b -> c
    let response = checkConnection(lastWay, currentWay)
    if (response) return response

    if (currentWay.tags.oneway != "yes") {
        reverseWay(currentWay)
        // a -> b == c -> b
        response = checkConnection(lastWay, currentWay)
    }
    if (response) return response

    if (lastWay.tags.oneway != "yes") {
        reverseWay(lastWay)
        // b -> a == c -> b
        response = checkConnection(lastWay, currentWay)
    }
    if (response) return response

    if (currentWay.tags.oneway != "yes") {
        reverseWay(currentWay)
        // b -> a == b -> c
        response = checkConnection(lastWay, currentWay)
    }

    return response
}
module.exports = function (route_elements, ways, stops) {

    const routeWays = []
    const routeStops = []
    for (const element of route_elements.members) {
        if (element.type == "way") {
            const current_way = ways[element.ref]
            if (current_way == null) {
                throw { extractor_error: extractor_error.way_not_exist, uri: `https://overpass-turbo.eu/?Q=${encodeURI(`//${extractor_error.way_not_exist}\nrel(${route_elements.id});out geom;way(${element.ref});out geom;`)}&R` }
            }
            routeWays.push({
                "type": "way",
                "id": current_way.id,
                "tags": { ...current_way.tags },
                "info": { ...current_way.info },
                "nodes": [...current_way.nodes],
                "geometry": [...current_way.geometry]
            })
        } else {
            const currentStop = stops[element.ref]
            if (currentStop && currentStop.tags && currentStop.tags["public_transport"] == "stop_position")
                routeStops.push(currentStop)
        }
    }
    if (routeWays.length == 0) {
        throw { extractor_error: extractor_error.route_with_empty_ways, uri: `https://overpass-turbo.eu/?Q=${encodeURI(`//${extractor_error.route_with_empty_ways}\nrel(${route_elements.id});out geom;`)}&R` }
    }

    for (let index = 1; index < routeWays.length; index++) {
        const lastWay = routeWays[index - 1]
        const currentWay = routeWays[index]
        const checkCurrentWay = (index == 1) ? checkFirstWay(lastWay, currentWay) : normalizecurrentWay(lastWay, currentWay)
        if (!checkCurrentWay) {
            throw { extractor_error: extractor_error.not_next, uri: `https://overpass-turbo.eu/?Q=${encodeURI(`//${extractor_error.not_next}\nrel(${route_elements.id});out geom;\nway(${lastWay.id});out geom;\nway(${currentWay.id});out geom;`)}&R` }
        }
    }

    let tmp_nodes = []
    let tmp_stops = {}
    let tmp_pointss = []
    routeWays.forEach(element => {
        for (const node_id of element.nodes) {
            const stop_id = String(node_id)
            const stop_name = element.tags && element.tags.name || ""

            if (!tmp_stops[stop_id]) {
                tmp_stops[stop_id] = [stop_name]
            } else {
                tmp_stops[stop_id].push(stop_name)
            }
        }
        tmp_nodes = tmp_nodes.concat(element.nodes)
        tmp_pointss = tmp_pointss.concat(element.geometry.map(point => ([point.lon, point.lat])))
    })
    return {
        nodes: tmp_nodes,
        stops: tmp_stops,
        points: tmp_pointss,
        routeStops
    }
}
