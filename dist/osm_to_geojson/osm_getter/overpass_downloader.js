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
const https = __importStar(require("https"));
class OSMOverpassDownloader {
    constructor(bounds) {
        this.overpassRequest = async (query, retries = 3) => {
            for (let attempt = 1; attempt <= retries; attempt++) {
                try {
                    const result = await this._doRequest(query);
                    return result;
                }
                catch (err) {
                    if (attempt < retries && (err.message?.includes('429') || err.message?.includes('504'))) {
                        const waitTime = attempt * 15000;
                        console.log(`Overpass API rate limited (429). Waiting ${waitTime / 1000}s before retry ${attempt + 1}/${retries}...`);
                        await new Promise(r => setTimeout(r, waitTime));
                    }
                    else {
                        throw err;
                    }
                }
            }
        };
        this._doRequest = (query) => {
            return new Promise((resolve, reject) => {
                const postData = `data=${encodeURIComponent(query)}`;
                const request = https.request({
                    method: 'POST',
                    host: 'www.overpass-api.de',
                    path: '/api/interpreter',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'Content-Length': Buffer.byteLength(postData),
                    },
                }, (response) => {
                    response.setEncoding('utf8');
                    let data = '';
                    response.on('data', (chunk) => {
                        data += chunk;
                    });
                    response.on('end', () => {
                        try {
                            const parsedData = JSON.parse(data);
                            resolve(parsedData);
                        }
                        catch (e) {
                            reject(new Error(`Overpass API returned non-JSON response (HTTP ${response.statusCode}): ${data.substring(0, 200)}`));
                        }
                    });
                });
                request.on('error', reject);
                request.write(postData);
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
            const query = `[out:json][timeout:180];rel["type"="route"](${this.bbox});way(r);out geom;`;
            return this.overpassRequest(query).then(this.indexElementsById);
        };
        this.getStops = () => {
            const query = `[out:json][timeout:180];rel["type"="route"](${this.bbox});node(r);out geom;`;
            return this.overpassRequest(query).then(this.indexElementsById);
        };
        this.getRoutes = (transformTypes) => {
            let routesFilter = '';
            if (transformTypes.length > 0) {
                routesFilter = `["route"~"${transformTypes.join('|')}"]`;
            }
            const query = `[out:json][timeout:180];rel["type"="route"]${routesFilter}(${this.bbox});out body;`;
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