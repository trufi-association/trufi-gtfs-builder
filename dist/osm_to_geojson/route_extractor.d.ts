import type { OSMRelation, OSMWay, OSMNode, RouteExtractorResult } from '../types';
export default function routeExtractor(route_elements: OSMRelation, ways: {
    [id: number]: OSMWay;
}, stops: {
    [id: number]: OSMNode;
}): RouteExtractorResult;
//# sourceMappingURL=route_extractor.d.ts.map