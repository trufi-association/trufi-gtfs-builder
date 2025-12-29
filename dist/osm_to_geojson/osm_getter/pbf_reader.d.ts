import type { OSMRelation, OSMWay, OSMNode, IOSMDataGetter } from '../../types';
export default class OSMPBFReader implements IOSMDataGetter {
    pbfPath: string;
    constructor(pbfPath: string);
    getRoutes: (transformTypes: string[]) => Promise<{
        [id: number]: OSMRelation;
    }>;
    getWays: () => Promise<{
        [id: number]: OSMWay;
    }>;
    getStops: () => Promise<{
        [id: number]: OSMNode;
    }>;
    loadData: (filter: (item: any) => boolean) => Promise<any[]>;
    getAllNodes: () => Promise<{
        [id: number]: any;
    }>;
    indexElementsById: (response: any[]) => {
        [id: number]: any;
    };
}
//# sourceMappingURL=pbf_reader.d.ts.map