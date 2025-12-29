"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = convertGeoJSON;
const helpers_1 = require("@turf/helpers");
const boolean_equal_1 = __importDefault(require("@turf/boolean-equal"));
const route_extractor_1 = __importDefault(require("./route_extractor"));
const extractor_error_1 = __importDefault(require("./extractor_error"));
function convertGeoJSON({ routes, ways, stops, skipRoute, }) {
    const mainStops = {};
    const geojson_features = {};
    const log_file = [];
    for (const key in routes) {
        const current_route = routes[key];
        try {
            if (!skipRoute(current_route))
                continue;
            // throw {
            //   extractor_error: extractor_error.route_skipped,
            //   uri: `https://overpass-turbo.eu/?Q=${encodeURI(
            //     `//${extractor_error.route_skipped}\nrel(${current_route.id});out geom;`
            //   )}&R`,
            // };
            if (!current_route.tags['ref'])
                throw {
                    extractor_error: extractor_error_1.default.no_ref_defined,
                    uri: `https://overpass-turbo.eu/?Q=${encodeURI(`//${extractor_error_1.default.no_ref_defined}\nrel(${current_route.id});out geom;`)}&R`,
                };
            const data = (0, route_extractor_1.default)(current_route, ways, stops);
            log_file.push({ id: current_route.id, tags: current_route.tags });
            const tmp_filter = filterPointsAndNodes(data.points, data.nodes);
            data.points = tmp_filter.points;
            data.nodes = tmp_filter.nodes;
            geojson_features[`${current_route.id}`] = {
                type: 'FeatureCollection',
                features: [
                    {
                        type: 'Feature',
                        properties: { ...current_route.tags, id: current_route.id },
                        geometry: {
                            type: 'LineString',
                            coordinates: data.points,
                            nodes: data.nodes,
                        },
                    },
                    ...data.routeStops.map((element) => {
                        return {
                            type: 'Feature',
                            properties: { ...element.tags, id: element.id },
                            geometry: {
                                type: 'Point',
                                coordinates: [element.lon, element.lat],
                            },
                        };
                    }),
                ],
            };
            // Merge stop names
            Object.keys(data.stops).forEach((stop_id) => {
                const stopIdNum = Number(stop_id);
                if (mainStops[stopIdNum]) {
                    mainStops[stopIdNum] = mainStops[stopIdNum].concat(data.stops[stopIdNum]);
                }
                else {
                    mainStops[stopIdNum] = data.stops[stopIdNum];
                }
            });
        }
        catch (error) {
            log_file.push({
                id: current_route.id,
                error: error.extractor_error ? error : `${error}`,
                tags: current_route.tags,
            });
        }
    }
    log_file.sort((a, b) => {
        let aRef = a.tags.ref || '0a';
        let bRef = b.tags.ref || '0a';
        let aIsNumber = !isNaN(aRef);
        let bIsNumber = !isNaN(bRef);
        if (aIsNumber && bIsNumber) {
            return parseInt(aRef) - parseInt(bRef);
        }
        else if (aIsNumber || bIsNumber) {
            return aIsNumber ? 1 : -1;
        }
        else {
            return aRef.localeCompare(bRef);
        }
    });
    const formatted_stops = filter_stops(mainStops);
    return {
        geojsonFeatures: geojson_features,
        stops: formatted_stops,
        log: log_file,
    };
}
function filter_stops(stops) {
    const result = {};
    Object.keys(stops).forEach((stop_id) => {
        const stopIdNum = Number(stop_id);
        const stop_names = stops[stopIdNum];
        const stop_names_filtered = stop_names
            .filter((value, index, self) => self.indexOf(value) === index)
            .filter((value) => value !== '');
        result[stopIdNum] = stop_names_filtered;
    });
    return result;
}
function filterPointsAndNodes(points, nodes) {
    const result = { points: [], nodes: [] };
    let last = null;
    for (let i = 0; i < points.length; i++) {
        const cur = points[i];
        if (last && (0, boolean_equal_1.default)((0, helpers_1.point)(last), (0, helpers_1.point)(cur))) {
            continue;
        }
        last = cur;
        result.points.push(cur);
        result.nodes.push(nodes[i]);
    }
    return result;
}
//# sourceMappingURL=OSM_dataTool.js.map