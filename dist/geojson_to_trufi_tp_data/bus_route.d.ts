import type { GeoJSONCoordinate } from '../types';
export default class BusRoute {
    id: number;
    name: string;
    stops: number[];
    from: string;
    to: string;
    connections: Array<{
        other_route: number;
        mine: number;
        other: number;
    }>;
    distances: number[];
    constructor(id: number, name: string, stops: number[], from: string, to: string, coordinates: GeoJSONCoordinate[]);
    isConnected(route: BusRoute): void;
    degreesToRadians(degrees: number): number;
    calDistance(origin: GeoJSONCoordinate, detin: GeoJSONCoordinate): number;
}
//# sourceMappingURL=bus_route.d.ts.map