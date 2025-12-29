import type { Bounds, OSMRelation, OSMWay, OSMNode, IOSMDataGetter } from '../../types';
export default class OSMOverpassDownloader implements IOSMDataGetter {
    bbox: string;
    constructor(bounds: Bounds);
    overpassRequest: (query: string) => Promise<any>;
    indexElementsById: (response: any) => {
        [id: number]: any;
    };
    getWays: () => Promise<{
        [id: number]: OSMWay;
    }>;
    getStops: () => Promise<{
        [id: number]: OSMNode;
    }>;
    getRoutes: (transformTypes: string[]) => Promise<{
        [id: number]: OSMRelation;
    }>;
}
//# sourceMappingURL=overpass_downloader.d.ts.map