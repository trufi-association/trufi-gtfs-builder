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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.stopIdToNumber = exports.findNearestStop = exports.loadCustomStops = exports.OSMPBFReader = exports.OSMOverpassDownloader = void 0;
exports.osmToGtfs = osmToGtfsFunc;
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const archiver_1 = __importDefault(require("archiver"));
const gtfsBuilders_1 = __importDefault(require("./geojson_to_gtfs/gtfsBuilders"));
const writeGtfs_1 = __importDefault(require("./geojson_to_gtfs/writeGtfs"));
const osm_to_geojson_1 = require("./osm_to_geojson");
Object.defineProperty(exports, "OSMOverpassDownloader", { enumerable: true, get: function () { return osm_to_geojson_1.OSMOverpassDownloader; } });
Object.defineProperty(exports, "OSMPBFReader", { enumerable: true, get: function () { return osm_to_geojson_1.OSMPBFReader; } });
const geojson_to_gtfs_1 = __importDefault(require("./geojson_to_gtfs"));
const geojson_to_trufi_tp_data_1 = __importDefault(require("./geojson_to_trufi_tp_data"));
const customStopsLoader_1 = require("./utils/customStopsLoader");
Object.defineProperty(exports, "loadCustomStops", { enumerable: true, get: function () { return customStopsLoader_1.loadCustomStops; } });
const spatialMatcher_1 = require("./utils/spatialMatcher");
Object.defineProperty(exports, "findNearestStop", { enumerable: true, get: function () { return spatialMatcher_1.findNearestStop; } });
Object.defineProperty(exports, "stopIdToNumber", { enumerable: true, get: function () { return spatialMatcher_1.stopIdToNumber; } });
const defaultGeojsonOptions = {
    osmDataGetter: null,
    transformTypes: ['bus', 'share_taxi', 'aerialway', 'train', 'subway', 'monorail', 'tram', 'trolleybus', 'ferry', 'light_rail'],
    skipRoute: () => true,
};
const defaultGtfsOptions = {
    agencyTimezone: 'America/La_Paz',
    agencyUrl: 'https://www.example.com/',
    defaultCalendar: () => 'Mo-Su 06:00-23:00',
    frequencyHeadway: () => 300,
    vehicleSpeed: () => 50,
    fakeStops: () => false,
    stopNameBuilder: (stops) => {
        if (!stops) {
            stops = ['unnamed'];
        }
        return stops.join(' and ');
    },
};
const defaultOutFiles = {
    outputDir: null,
    routes: false,
    log: false,
    stops: false,
    readme: true,
    gtfs: false,
    gtfsZip: false,
    gtfsExpandedZip: false,
    trufiTPData: false,
};
async function osmToGtfsFunc(config) {
    const outputFiles = Object.assign({}, defaultOutFiles, config.outputFiles || {});
    const geojsonOptions = Object.assign({}, defaultGeojsonOptions, config.geojsonOptions || {});
    const gtfsOptions = Object.assign({}, defaultGtfsOptions, config.gtfsOptions || {});
    const gtfsBuilders = Object.assign({}, gtfsBuilders_1.default, config.gtfsBuilders || {});
    const { outputDir } = outputFiles;
    // Validation: gtfsZip requires gtfs to be true
    if (outputFiles.gtfsZip && !outputFiles.gtfs) {
        throw new Error('gtfsZip option requires gtfs option to be true');
    }
    if (outputDir && !fs.existsSync(path.dirname(outputDir))) {
        throw new Error('Output directory does not exist');
    }
    const geojson = await (0, osm_to_geojson_1.osmToGeojson)(geojsonOptions);
    const needsGtfs = outputFiles.gtfs || outputFiles.gtfsZip || outputFiles.gtfsExpandedZip;
    const gtfs = needsGtfs
        ? await (0, geojson_to_gtfs_1.default)(geojson.geojsonFeatures, geojson.stops, gtfsOptions, gtfsBuilders)
        : null;
    const trufiTPData = outputFiles.trufiTPData
        ? await (0, geojson_to_trufi_tp_data_1.default)(geojson.geojsonFeatures, geojson.stops)
        : null;
    if (outputDir) {
        if (fs.existsSync(path.join(outputDir))) {
            fs.rmSync(path.join(outputDir), { recursive: true, force: true });
        }
        fs.mkdirSync(path.join(outputDir));
        if (outputFiles.routes) {
            fs.mkdirSync(path.join(outputDir, `routes`));
            for (const key in geojson.geojsonFeatures) {
                const feature = geojson.geojsonFeatures[key];
                fs.writeFileSync(path.join(outputDir, `/routes/${key}.geojson`), JSON.stringify(feature));
            }
        }
        if (outputFiles.log)
            fs.writeFileSync(path.join(outputDir, 'log.json'), JSON.stringify(geojson.log));
        if (outputFiles.stops)
            fs.writeFileSync(path.join(outputDir, 'stops.json'), JSON.stringify(geojson.stops));
        if (outputFiles.readme)
            fs.writeFileSync(path.join(outputDir, 'README.md'), geojson.readme || '');
        if (outputFiles.gtfs && gtfs) {
            fs.mkdirSync(path.join(outputDir, `gtfs`));
            (0, writeGtfs_1.default)(gtfs, path.join(outputDir, 'gtfs'));
        }
        if (outputFiles.gtfsZip && gtfs) {
            const gtfsDir = path.join(outputDir, 'gtfs');
            if (!fs.existsSync(gtfsDir)) {
                fs.mkdirSync(gtfsDir);
                (0, writeGtfs_1.default)(gtfs, gtfsDir);
            }
            const cityName = gtfsOptions.cityName || 'city';
            const zipFileName = `${cityName}.gtfs.zip`;
            await new Promise((resolve, reject) => {
                const output = fs.createWriteStream(path.join(outputDir, zipFileName));
                const archive = (0, archiver_1.default)('zip', { zlib: { level: 9 } });
                output.on('close', () => {
                    console.log(`GTFS ZIP created: ${zipFileName} (${archive.pointer()} total bytes)`);
                    resolve();
                });
                archive.on('error', (err) => {
                    reject(err);
                });
                archive.pipe(output);
                archive.directory(gtfsDir, false);
                archive.finalize();
            });
        }
        if (outputFiles.gtfsExpandedZip) {
            // Generate schedule-based GTFS (expanded trips, no frequencies.txt)
            const expandedGtfsOptions = { ...gtfsOptions, useFrequencies: false };
            const expandedGtfs = await (0, geojson_to_gtfs_1.default)(geojson.geojsonFeatures, geojson.stops, expandedGtfsOptions, gtfsBuilders);
            const expandedDir = path.join(outputDir, '_gtfs-expanded');
            fs.mkdirSync(expandedDir);
            (0, writeGtfs_1.default)(expandedGtfs, expandedDir);
            const cityName = gtfsOptions.cityName || 'city';
            const zipFileName = `${cityName}.expanded.gtfs.zip`;
            await new Promise((resolve, reject) => {
                const output = fs.createWriteStream(path.join(outputDir, zipFileName));
                const archive = (0, archiver_1.default)('zip', { zlib: { level: 9 } });
                output.on('close', () => {
                    console.log(`GTFS Expanded ZIP created: ${zipFileName} (${archive.pointer()} total bytes)`);
                    resolve();
                });
                archive.on('error', (err) => {
                    reject(err);
                });
                archive.pipe(output);
                archive.directory(expandedDir, false);
                archive.finalize();
            });
            // Clean up temporary directory
            fs.rmSync(expandedDir, { recursive: true, force: true });
        }
        if (outputFiles.trufiTPData && trufiTPData) {
            fs.mkdirSync(path.join(outputDir, `trufiTPData`));
            fs.writeFileSync(path.join(outputDir, 'trufiTPData', 'routes.json'), JSON.stringify(trufiTPData.routes));
            fs.writeFileSync(path.join(outputDir, 'trufiTPData', 'stops.json'), JSON.stringify(trufiTPData.stops));
            fs.writeFileSync(path.join(outputDir, 'trufiTPData', 'search.json'), JSON.stringify(geojson.stops));
        }
    }
}
exports.default = { osmToGtfs: osmToGtfsFunc, OSMOverpassDownloader: osm_to_geojson_1.OSMOverpassDownloader, OSMPBFReader: osm_to_geojson_1.OSMPBFReader, loadCustomStops: customStopsLoader_1.loadCustomStops, findNearestStop: spatialMatcher_1.findNearestStop, stopIdToNumber: spatialMatcher_1.stopIdToNumber };
//# sourceMappingURL=index.js.map