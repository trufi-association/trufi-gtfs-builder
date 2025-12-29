"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const bus_route_1 = __importDefault(require("./bus_route"));
function geojsonToTrufiTPData(features, inputStops) {
    const map_routes = [];
    const stops_list = {};
    for (const feature in features) {
        const element = features[feature].features[0];
        const ref = element.properties.ref;
        const route = element.properties.id;
        map_routes.push(new bus_route_1.default(route, ref, element.geometry.nodes || [], element.properties.from, element.properties.to, element.geometry.coordinates));
        const nodes = element.geometry.nodes || [];
        const coordinates = element.geometry.coordinates;
        for (let i in nodes) {
            const node = nodes[i];
            const coordinate = coordinates[i];
            let tmp_node_stop = stops_list[node];
            if (!tmp_node_stop) {
                tmp_node_stop = {
                    id: node,
                    lng: coordinate[0],
                    lat: coordinate[1],
                    routes: [],
                };
                stops_list[node] = tmp_node_stop;
            }
            tmp_node_stop.routes.push({ route: route, index: parseInt(i) });
        }
    }
    console.time('finding');
    for (let i in map_routes) {
        const current_route = map_routes[i];
        for (let j in map_routes) {
            if (i !== j) {
                current_route.isConnected(map_routes[j]);
            }
        }
    }
    map_routes.sort((a, b) => {
        let aName = a.name;
        let bName = b.name;
        let aIsNumber = !isNaN(aName);
        let bIsNumber = !isNaN(bName);
        if (aIsNumber && bIsNumber) {
            return parseInt(aName) - parseInt(bName);
        }
        else if (aIsNumber || bIsNumber) {
            return aIsNumber ? 1 : -1;
        }
        else {
            return aName.localeCompare(bName);
        }
    });
    console.timeEnd('finding');
    return {
        routes: map_routes,
        stops: stops_list,
    };
}
exports.default = geojsonToTrufiTPData;
//# sourceMappingURL=index.js.map