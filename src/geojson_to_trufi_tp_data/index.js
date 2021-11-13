const BusRoute = require('./bus_route')
function geojsonToTrufiTPData(features, inputStops) {
  const map_routes = []
  const stops_list = {}
  for (const feature in features) {
    const element = features[feature].features[0]
    const ref = element.properties.ref
    const route = element.properties.id

    map_routes.push(new BusRoute(route, ref, element.geometry.nodes, element.properties.from, element.properties.to, element.geometry.coordinates))

    for (let i in element.geometry.nodes) {

      const node = element.geometry.nodes[i]
      const coordinate = element.geometry.coordinates[i]

      let tmp_node_stop = stops_list[node]
      if (!tmp_node_stop) {
        tmp_node_stop = {
          id: node,
          lng: coordinate[0],
          lat: coordinate[1],
          routes: []
        }
        stops_list[node] = tmp_node_stop
      }
      tmp_node_stop.routes.push({ route: route, index: parseInt(i) })
    }
  }
  console.time("finding")
  for (let i in map_routes) {
    const current_route = map_routes[i]
    for (let j in map_routes) {
      if (i != j) {
        current_route.isConnected(map_routes[j])
      }
    }
  }
  map_routes.sort((a, b) => {
    a = a.name
    b = b.name
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
  console.timeEnd("finding")
  return {
    "routes": map_routes,
    "stops": stops_list,
  };
};

module.exports = geojsonToTrufiTPData
