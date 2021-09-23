const fs = require('fs');
const through = require('through2');
const parseOSM = require('osm-pbf-parser');

module.exports = class OSMPBFReader {
    pbfPath
    constructor(pbfPath) {
        this.pbfPath = pbfPath
    }

    getRoutes = (transformTypes) => {
        return this.loadData((item) => {
            return item.type == "relation" && item.tags.type == "route" && transformTypes.indexOf(item.tags.route) != -1
        }).then((routes) => {
            for (const route of routes) {
                for (const member of route.members) {
                    member.ref = member.id;
                }
            }
            return routes
        }).then(this.indexElementsById);
    }
    getWays = () => {
        return this.loadData((item) => {
            return item.type == "way"
        }).then((ways) => {
            return this.getAllNodes().then((nodes) => {
                for (const way of ways) {
                    way.nodes = []
                    way.geometry = []
                    for (const ref of way.refs) {
                        const node = nodes[ref]
                        if (node == null) {
                            delete way.nodes
                            delete way.geometry
                            break
                        }
                        way.nodes.push(node.id)
                        way.geometry.push({
                            "lat": node.lat,
                            "lon": node.lon
                        })
                    }
                }
                return ways;
            })
        }).then(this.indexElementsById);
    }
    getStops = () => {
        return this.loadData((item) => {
            return item.type == "node" && item.tags && item.tags["public_transport"]
        }).then(this.indexElementsById);
    }
    loadData = (filter) => {
        return new Promise((resolve, reject) => {
            const response = []
            const stream = fs.createReadStream(this.pbfPath)
                .pipe(parseOSM())
                .pipe(through.obj((items, enc, next) => {
                    items.forEach(function (item) {
                        if (filter(item)) {
                            response.push(item)
                        }
                    });
                    next();
                }));
            stream.on('finish', () =>
                resolve(response)
            );

            stream.on('error', reject);
        });
    }
    getAllNodes = () => {
        return this.loadData((item) => {
            return item.type == "node"
        }).then(this.indexElementsById);
    }
    indexElementsById = (response) => {
        const map = {};
        for (const element of response) {
            map[element.id] = element;
        }
        return map;
    }
}