import type { GeoJSONFeatureCollection, TrufiTPData } from '../types';
declare function geojsonToTrufiTPData(features: {
    [key: string]: GeoJSONFeatureCollection;
}, inputStops: {
    [id: number]: string[];
}): TrufiTPData;
export default geojsonToTrufiTPData;
//# sourceMappingURL=index.d.ts.map