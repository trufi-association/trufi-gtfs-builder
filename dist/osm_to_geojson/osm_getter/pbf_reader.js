"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("fs"));
const through = __importStar(require("through2"));
const parseOSM = require('osm-pbf-parser');
class OSMPBFReader {
    constructor(pbfPath) {
        this.getRoutes = (transformTypes) => {
            return this.loadData((item) => {
                return (item.type === 'relation' &&
                    item.tags.type === 'route' &&
                    transformTypes.indexOf(item.tags.route) !== -1);
            })
                .then((routes) => {
                for (const route of routes) {
                    for (const member of route.members) {
                        member.ref = member.id;
                    }
                }
                return routes;
            })
                .then(this.indexElementsById);
        };
        this.getWays = () => {
            return this.loadData((item) => {
                return item.type === 'way';
            })
                .then((ways) => {
                return this.getAllNodes().then((nodes) => {
                    for (const way of ways) {
                        way.nodes = [];
                        way.geometry = [];
                        for (const ref of way.refs) {
                            const node = nodes[ref];
                            if (node == null) {
                                delete way.nodes;
                                delete way.geometry;
                                break;
                            }
                            way.nodes.push(node.id);
                            way.geometry.push({
                                lat: node.lat,
                                lon: node.lon,
                            });
                        }
                    }
                    return ways;
                });
            })
                .then(this.indexElementsById);
        };
        this.getStops = () => {
            return this.loadData((item) => {
                return item.type === 'node' && item.tags && item.tags['public_transport'];
            }).then(this.indexElementsById);
        };
        this.loadData = (filter) => {
            return new Promise((resolve, reject) => {
                const response = [];
                const stream = fs
                    .createReadStream(this.pbfPath)
                    .pipe(parseOSM())
                    .pipe(through.obj((items, enc, next) => {
                    items.forEach(function (item) {
                        if (filter(item)) {
                            response.push(item);
                        }
                    });
                    next();
                }));
                stream.on('finish', () => resolve(response));
                stream.on('error', reject);
            });
        };
        this.getAllNodes = () => {
            return this.loadData((item) => {
                return item.type === 'node';
            }).then(this.indexElementsById);
        };
        this.indexElementsById = (response) => {
            const map = {};
            for (const element of response) {
                map[element.id] = element;
            }
            return map;
        };
        this.pbfPath = pbfPath;
    }
}
exports.default = OSMPBFReader;
//# sourceMappingURL=pbf_reader.js.map