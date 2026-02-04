"use strict";
/**
 * Example: Bolivia - Cochabamba
 *
 * This example demonstrates how to generate GTFS data for Cochabamba, Bolivia.
 * It supports two data sources:
 * - Overpass API: Downloads data from OpenStreetMap (requires internet)
 * - PBF file: Uses a local OSM PBF file (faster, works offline)
 */
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
const index_1 = require("../../dist/index");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
// Set to 'overpass' to download from Overpass API, or 'pbf' to use local PBF file
const DATA_SOURCE = 'overpass';
// PBF file path (only used when DATA_SOURCE is 'pbf')
const PBF_FILE = path.join(__dirname, 'cochabamba.osm.pbf');
// Bounding box for Overpass API (only used when DATA_SOURCE is 'overpass')
const BOUNDING_BOX = {
    south: -17.709721,
    west: -66.440262,
    north: -17.261759,
    east: -65.577835,
};
function getOsmDataGetter() {
    if (DATA_SOURCE === 'pbf') {
        if (!fs.existsSync(PBF_FILE)) {
            throw new Error(`PBF file not found: ${PBF_FILE}\nDownload it from https://download.geofabrik.de/ or switch to 'overpass' mode.`);
        }
        return new index_1.OSMPBFReader(PBF_FILE);
    }
    return new index_1.OSMOverpassDownloader(BOUNDING_BOX);
}
async function main() {
    console.log(`Starting GTFS generation for Cochabamba, Bolivia (${DATA_SOURCE})...`);
    try {
        await (0, index_1.osmToGtfs)({
            outputFiles: {
                outputDir: path.join(__dirname, 'out'),
                trufiTPData: true,
                gtfs: true,
                readme: true,
                routes: true,
                log: true,
                stops: true,
                gtfsZip: true,
            },
            geojsonOptions: {
                osmDataGetter: getOsmDataGetter(),
                transformTypes: ['bus', 'share_taxi', 'minibus', 'aerialway', 'light_rail'],
                skipRoute: (route) => {
                    // Skip specific problematic routes
                    return ![2084702, 16533147, 17193322, 16648003, 17193322].includes(route.id);
                },
            },
            gtfsOptions: {
                agencyTimezone: 'America/La_Paz',
                agencyUrl: 'https://www.cochabamba.bo/',
                cityName: 'cochabamba',
                defaultCalendar: () => 'Mo-Su 06:00-22:00',
                frequencyHeadway: () => 300, // 5 minutes
                vehicleSpeed: () => 40, // 40 km/h average speed in city
                skipStopsWithinDistance: 100, // 100 meters between stops
                fakeStops: (routeFeature) => {
                    // Some routes need fake stops generated
                    return [11678428, 19604339, 9083839, 14576927, 9074378, 14576926, 6925236, , 6925237].includes(routeFeature.properties.id);
                },
                stopNameBuilder: (stops) => {
                    if (!stops || stops.length === 0) {
                        stops = ['Innominada'];
                    }
                    return stops.join(' y ');
                },
            },
        });
        console.log('✅ GTFS generation completed successfully!');
        console.log(`📁 Output files are in: ${path.join(__dirname, 'out')}`);
    }
    catch (error) {
        console.error('❌ Error generating GTFS:', error);
        process.exit(1);
    }
}
// Run the example
main();
//# sourceMappingURL=index.js.map