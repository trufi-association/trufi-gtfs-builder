import * as fs from 'fs';
import * as through from 'through2';
const parseOSM = require('osm-pbf-parser');
import type { OSMRelation, OSMWay, OSMNode, IOSMDataGetter } from '../../types';

export default class OSMPBFReader implements IOSMDataGetter {
  pbfPath: string;

  constructor(pbfPath: string) {
    this.pbfPath = pbfPath;
  }

  getRoutes = (transformTypes: string[]): Promise<{ [id: number]: OSMRelation }> => {
    return this.loadData((item: any) => {
      return (
        item.type === 'relation' &&
        item.tags.type === 'route' &&
        transformTypes.indexOf(item.tags.route) !== -1
      );
    })
      .then((routes: any[]) => {
        for (const route of routes) {
          for (const member of route.members) {
            member.ref = member.id;
          }
        }
        return routes;
      })
      .then(this.indexElementsById);
  };

  getWays = (): Promise<{ [id: number]: OSMWay }> => {
    return this.loadData((item: any) => {
      return item.type === 'way';
    })
      .then((ways: any[]) => {
        return this.getAllNodes().then((nodes) => {
          for (const way of ways) {
            way.nodes = [];
            way.geometry = [];
            for (const ref of way.refs) {
              const node = nodes[ref];
              if (node == null) {
                delete way.nodes;
                delete way.geometry;
                break;
              }
              way.nodes.push(node.id);
              way.geometry.push({
                lat: node.lat,
                lon: node.lon,
              });
            }
          }
          return ways;
        });
      })
      .then(this.indexElementsById);
  };

  getStops = (): Promise<{ [id: number]: OSMNode }> => {
    return this.loadData((item: any) => {
      return item.type === 'node' && item.tags && item.tags['public_transport'];
    }).then(this.indexElementsById);
  };

  loadData = (filter: (item: any) => boolean): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const response: any[] = [];
      const stream = fs
        .createReadStream(this.pbfPath)
        .pipe(parseOSM())
        .pipe(
          through.obj((items: any[], enc, next) => {
            items.forEach(function (item) {
              if (filter(item)) {
                response.push(item);
              }
            });
            next();
          })
        );
      stream.on('finish', () => resolve(response));

      stream.on('error', reject);
    });
  };

  getAllNodes = (): Promise<{ [id: number]: any }> => {
    return this.loadData((item: any) => {
      return item.type === 'node';
    }).then(this.indexElementsById);
  };

  indexElementsById = (response: any[]): { [id: number]: any } => {
    const map: { [id: number]: any } = {};
    for (const element of response) {
      map[element.id] = element;
    }
    return map;
  };
}
