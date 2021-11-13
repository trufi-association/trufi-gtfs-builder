class BusRoute {
    constructor(id, name, stops, from, to, coordinates) {
        this.id = id
        this.name = name || "indefinido"
        // this.description = description
        this.stops = stops
        this.from = from
        this.to = to
        this.connections = []
        this.distances = [0]
        for (var i = 1; i < coordinates.length; i++) {
            let partialDistance = this.calDistance(coordinates[i - 1], coordinates[i])
            let partialTotal = this.distances[i - 1] + partialDistance
            this.distances.push(partialTotal)
        }
    }
    isConnected(route) {
        for (let i = 0; i < this.stops.length; i++) {
            const mine_stop = this.stops[i]
            const other_stop = route.stops.indexOf(mine_stop)
            if (other_stop >= 0) {
                this.connections.push({ other_route: route.id, mine: i, other: other_stop })
                // console.log(this.name, " -> ", route.name)
                break;
            }
        }
    }
    degreesToRadians(degrees) {
        return degrees * Math.PI / 180;
    }

    calDistance(origin, detin) {
        let lat1 = origin[1];
        let lon1 = origin[0];
        let lat2 = detin[1];
        let lon2 = detin[0];
        let earthRadiusKm = 6371000;

        let dLat = this.degreesToRadians(lat2 - lat1);
        let dLon = this.degreesToRadians(lon2 - lon1);

        lat1 = this.degreesToRadians(lat1);
        lat2 = this.degreesToRadians(lat2);

        let a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
        let c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return earthRadiusKm * c;
    }
}
module.exports = BusRoute