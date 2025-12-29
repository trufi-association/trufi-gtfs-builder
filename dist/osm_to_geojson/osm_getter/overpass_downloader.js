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
const http = __importStar(require("http"));
class OSMOverpassDownloader {
    constructor(bounds) {
        this.overpassRequest = (query) => {
            return new Promise((resolve, reject) => {
                const request = http.request({
                    method: 'POST',
                    host: 'www.overpass-api.de',
                    path: '/api/interpreter',
                }, (response) => {
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
        };
        this.indexElementsById = (response) => {
            const map = {};
            response.elements.forEach((element) => {
                map[element.id] = element;
            });
            return map;
        };
        this.getWays = () => {
            const query = `[out:json];rel["type"="route"](${this.bbox});way(r);out geom;`;
            return this.overpassRequest(query).then(this.indexElementsById);
        };
        this.getStops = () => {
            const query = `[out:json];rel["type"="route"](${this.bbox});node(r);out geom;`;
            return this.overpassRequest(query).then(this.indexElementsById);
        };
        this.getRoutes = (transformTypes) => {
            let routesFilter = '';
            if (transformTypes.length > 0) {
                routesFilter = `["route"~"${transformTypes.join('|')}"]`;
            }
            const query = `[out:json];rel["type"="route"]${routesFilter}(${this.bbox});out body;`;
            return this.overpassRequest(query).then(this.indexElementsById);
        };
        if (!bounds) {
            throw new Error('Missing bounds');
        }
        if (typeof bounds !== 'object' ||
            bounds.north < bounds.south ||
            bounds.east < bounds.west) {
            throw new Error('Invalid bounds');
        }
        this.bbox = `${bounds.south},${bounds.west},${bounds.north},${bounds.east}`;
    }
}
exports.default = OSMOverpassDownloader;
//# sourceMappingURL=overpass_downloader.js.map