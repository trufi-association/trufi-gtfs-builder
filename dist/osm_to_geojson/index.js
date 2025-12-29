"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OSMPBFReader = exports.OSMOverpassDownloader = void 0;
exports.osmToGeojson = osmToGeojson;
const overpass_downloader_1 = __importDefault(require("./osm_getter/overpass_downloader"));
exports.OSMOverpassDownloader = overpass_downloader_1.default;
const pbf_reader_1 = __importDefault(require("./osm_getter/pbf_reader"));
exports.OSMPBFReader = pbf_reader_1.default;
const readme_generator_1 = __importDefault(require("./readme_generator"));
const OSM_dataTool_1 = __importDefault(require("./OSM_dataTool"));
async function osmToGeojson(options) {
    const { transformTypes, osmDataGetter, skipRoute } = options;
    if (options.osmDataGetter == null) {
        throw new Error('osmDataGetter missing');
    }
    const routes = await osmDataGetter.getRoutes(transformTypes);
    const ways = await osmDataGetter.getWays();
    const stops = await osmDataGetter.getStops();
    const data = (0, OSM_dataTool_1.default)({ routes, ways, stops, skipRoute });
    const readme = (0, readme_generator_1.default)(data);
    data['readme'] = readme;
    return data;
}
exports.default = { osmToGeojson, OSMOverpassDownloader: overpass_downloader_1.default, OSMPBFReader: pbf_reader_1.default };
//# sourceMappingURL=index.js.map