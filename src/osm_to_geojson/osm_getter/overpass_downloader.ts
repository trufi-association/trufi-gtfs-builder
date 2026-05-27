import * as https from 'https';
import type { Bounds, OSMRelation, OSMWay, OSMNode, IOSMDataGetter } from '../../types';

export interface OSMOverpassDownloaderOptions {
  /**
   * Overpass API host (without protocol or path). Defaults to
   * `www.overpass-api.de`. Use this to point at a mirror when the default
   * is overloaded — e.g. `overpass.kumi.systems`, `overpass.osm.ch`.
   */
  host?: string;
}

export default class OSMOverpassDownloader implements IOSMDataGetter {
  bbox: string;
  host: string;

  constructor(bounds: Bounds, options: OSMOverpassDownloaderOptions = {}) {
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
    this.host = options.host ?? 'www.overpass-api.de';
  }

  overpassRequest = async (query: string, retries = 3): Promise<any> => {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const result = await this._doRequest(query);
        return result;
      } catch (err: any) {
        if (attempt < retries && (err.message?.includes('429') || err.message?.includes('504'))) {
          const waitTime = attempt * 15000;
          console.log(`Overpass API rate limited (429). Waiting ${waitTime / 1000}s before retry ${attempt + 1}/${retries}...`);
          await new Promise(r => setTimeout(r, waitTime));
        } else {
          throw err;
        }
      }
    }
  };

  private _doRequest = (query: string): Promise<any> => {
    return new Promise((resolve, reject) => {
      const postData = `data=${encodeURIComponent(query)}`;
      const request = https.request(
        {
          method: 'POST',
          host: this.host,
          path: '/api/interpreter',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': Buffer.byteLength(postData),
            'User-Agent': 'trufi-gtfs-builder',
            'Accept': 'application/json',
          },
        },
        (response) => {
          response.setEncoding('utf8');

          let data = '';

          response.on('data', (chunk) => {
            data += chunk;
          });

          response.on('end', () => {
            try {
              const parsedData = JSON.parse(data);
              resolve(parsedData);
            } catch (e) {
              reject(new Error(`Overpass API returned non-JSON response (HTTP ${response.statusCode}): ${data.substring(0, 200)}`));
            }
          });
        }
      );

      request.on('error', reject);
      request.write(postData);
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
    const query = `[out:json][timeout:180];rel["type"="route"](${this.bbox});way(r);out geom;`;
    return this.overpassRequest(query).then(this.indexElementsById);
  };

  getStops = (): Promise<{ [id: number]: OSMNode }> => {
    const query = `[out:json][timeout:180];rel["type"="route"](${this.bbox});node(r);out geom;`;
    return this.overpassRequest(query).then(this.indexElementsById);
  };

  getRoutes = (transformTypes: string[]): Promise<{ [id: number]: OSMRelation }> => {
    let routesFilter = '';
    if (transformTypes.length > 0) {
      routesFilter = `["route"~"${transformTypes.join('|')}"]`;
    }
    const query = `[out:json][timeout:180];rel["type"="route"]${routesFilter}(${this.bbox});out body;`;
    return this.overpassRequest(query).then(this.indexElementsById);
  };
}
