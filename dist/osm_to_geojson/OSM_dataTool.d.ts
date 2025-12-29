import type { OSMData, OSMRelation, GeojsonToGtfsResult } from '../types';
export default function convertGeoJSON({ routes, ways, stops, skipRoute, }: OSMData & {
    skipRoute: (route: OSMRelation) => boolean;
}): GeojsonToGtfsResult;
//# sourceMappingURL=OSM_dataTool.d.ts.map