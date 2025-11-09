import * as http from 'http';
import type { Bounds, OSMRelation, OSMWay, OSMNode, IOSMDataGetter } from '../../types';

export default class OSMOverpassDownloader implements IOSMDataGetter {
  bbox: string;

  constructor(bounds: Bounds) {
    if (!bounds) {
      throw new Error('Missing bounds');
    }

    if (
      typeof bounds !== 'object' ||
      bounds.north < bounds.south ||
      bounds.east < bounds.west
    ) {
      throw new Error('Invalid bounds');
    }

    this.bbox = `${bounds.south},${bounds.west},${bounds.north},${bounds.east}`;
  }

  overpassRequest = (query: string): Promise<any> => {
    return new Promise((resolve, reject) => {
      const request = http.request(
        {
          method: 'POST',
          host: 'www.overpass-api.de',
          path: '/api/interpreter',
        },
        (response) => {
          response.setEncoding('utf8');

          let data = '';

          response.on('data', (chunk) => {
            data += chunk;
          });

          response.on('end', () => {
            const parsedData = JSON.parse(data);
            resolve(parsedData);
          });
        }
      );

      request.on('error', reject);
      request.write(query);
      request.end();
    });
  };

  indexElementsById = (response: any): { [id: number]: any } => {
    const map: { [id: number]: any } = {};

    response.elements.forEach((element: any) => {
      map[element.id] = element;
    });

    return map;
  };

  getWays = (): Promise<{ [id: number]: OSMWay }> => {
    const query = `[out:json];rel["type"="route"](${this.bbox});way(r);out geom;`;
    return this.overpassRequest(query).then(this.indexElementsById);
  };

  getStops = (): Promise<{ [id: number]: OSMNode }> => {
    const query = `[out:json];rel["type"="route"](${this.bbox});node(r);out geom;`;
    return this.overpassRequest(query).then(this.indexElementsById);
  };

  getRoutes = (transformTypes: string[]): Promise<{ [id: number]: OSMRelation }> => {
    let routesFilter = '';
    if (transformTypes.length > 0) {
      routesFilter = `["route"~"${transformTypes.join('|')}"]`;
    }
    const query = `[out:json];rel["type"="route"]${routesFilter}(${this.bbox});out body;`;
    return this.overpassRequest(query).then(this.indexElementsById);
  };
}
