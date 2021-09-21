const http = require('http');
module.exports = class OSMOverpassDownloader {
    bbox
    constructor(bounds) {
        if (!bounds) {
            throw new Error('Missing bounds')
        }

        if (typeof bounds !== "object" || bounds.north < bounds.south || bounds.east < bounds.west) {
            throw new Error('Invalid bounds')
        }

        this.bbox = `${bounds.south},${bounds.west},${bounds.north},${bounds.east}`
    }
    overpassRequest = (query) => {
        return new Promise((resolve, reject) => {
            const request = http.request({
                method: 'POST',
                host: 'www.overpass-api.de',
                path: '/api/interpreter',
            }, response => {
                response.setEncoding('utf8');

                let data = '';

                response.on('data', (chunk) => {
                    data += chunk;
                });

                response.on('end', () => {
                    const parsedData = JSON.parse(data);
                    resolve(parsedData);
                });
            });

            request.on('error', reject);
            request.write(query);
            request.end();
        });
    }

    indexElementsById = (response) => {
        const map = {};

        response.elements.forEach(element => {
            map[element.id] = element;
        });

        return map;
    }

    getWays = () => {
        const query = `[out:json];rel["type"="route"](${this.bbox});way(r);out geom;`;
        return this.overpassRequest(query).then(this.indexElementsById);
    }
    
    getStops = () => {
        const query = `[out:json];rel["type"="route"](${this.bbox});node(r);out geom;`;
        return this.overpassRequest(query).then(this.indexElementsById);
    }

    getRoutes = (transformTypes) => {
        let routesFilter = ""
        if (transformTypes.length > 0) {
            routesFilter = `["route"~"${transformTypes.join("|")}"]`
        }
        const query = `[out:json];rel["type"="route"]${routesFilter}(${this.bbox});out body;`;
        return this.overpassRequest(query).then(this.indexElementsById);
    }
}
