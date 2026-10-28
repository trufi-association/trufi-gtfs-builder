/**
 * In-memory OSM dataset shared by `test/fares_v2.test.ts` and by the
 * generator of `test/fixtures/fares-v1/` — the GTFS files that `main`
 * (`16291a1`, before Fares V2 existed) wrote for it. The Fares V2 tests
 * compare against those files byte for byte, so the dataset must not
 * change without regenerating the fixture.
 *
 * `charge=*` values are real Cochabamba relations (OSM, 2026-09); the
 * config mirrors the Cochabamba example (OSM first, then a city-wide
 * Bs 3 except for the intermunicipal 233).
 */
import type { IOSMDataGetter, OsmToGtfsConfig } from '../../src/types';

export const TRUFI_130 =
  '3 BOB/persona;1 BOB/estudiante primaria;2 BOB/estudiante secundaria;2 BOB/estudiante universitario;2.50 BOB/persona discapacitada;1.50 BOB/adulto mayor';
export const MI_TREN_ROJA = '3.50 BOB/persona;2.50 BOB/interparadas;2 BOB/preferencial;1 BOB/estudiante';

const relations: Array<{ id: number; tags: Record<string, string> }> = [
  // Two directions of one route: same ref + operator → one route_id, one fare.
  { id: 9715360, tags: { type: 'route', route: 'bus', ref: '130', name: 'Trufi 130: Quillacollo → Cochabamba', operator: 'Sindicato 130', charge: TRUFI_130 } },
  { id: 9717256, tags: { type: 'route', route: 'bus', ref: '130', name: 'Trufi 130: Cochabamba → Quillacollo', operator: 'Sindicato 130', charge: TRUFI_130 } },
  // Light rail with its own general fare and three extra charge entries.
  { id: 11678428, tags: { type: 'route', route: 'light_rail', ref: 'Roja', name: 'Mi Tren Roja: Sipe Sipe → Cochabamba', operator: 'Mi Tren', charge: MI_TREN_ROJA } },
  // Two operators without charge=*: the city-wide Bs 3 (two V1 rows, one V2 network).
  { id: 101, tags: { type: 'route', route: 'bus', ref: 'A', name: 'Micro A: Norte → Sur', operator: 'Sindicato A' } },
  { id: 102, tags: { type: 'route', route: 'bus', ref: 'B', name: 'Micro B: Este → Oeste', operator: 'Sindicato B' } },
  // fee=no: an explicit free ride.
  { id: 103, tags: { type: 'route', route: 'bus', ref: 'F', name: 'Bus gratuito', operator: 'Municipio', fee: 'no' } },
  // Intermunicipal: the resolver answers "unknown" → no fare at all.
  { id: 104, tags: { type: 'route', route: 'bus', ref: '233', name: 'Minibus 233: Sacaba → Cochabamba', operator: 'Sindicato Sacaba' } },
  // Same operator as Micro A, different fare, no rider categories.
  { id: 105, tags: { type: 'route', route: 'bus', ref: 'LD', name: 'Trufi LD: Cochabamba → Punata', operator: 'Sindicato A', charge: '6 BOB' } },
];

/** One three-node way per relation, each on its own parallel of latitude. */
export const datasetOsm: IOSMDataGetter = {
  getRoutes: async () =>
    Object.fromEntries(
      relations.map((r, i) => [r.id, { type: 'relation', id: r.id, tags: r.tags, members: [{ type: 'way', ref: 10 + i }] }]),
    ),
  getWays: async () =>
    Object.fromEntries(
      relations.map((_, i) => {
        const nodes = [1000 + 3 * i, 1001 + 3 * i, 1002 + 3 * i];
        const lat = 0.01 * i;
        const geometry = [[0, lat], [0.01, lat], [0.02, lat]].map(([lon, la]) => ({ lat: la, lon }));
        return [10 + i, { type: 'way', id: 10 + i, tags: {}, nodes, geometry }];
      }),
    ),
  getStops: async () => ({}),
};

export const datasetGtfsOptions: OsmToGtfsConfig['gtfsOptions'] = {
  stopsConfig: () => ({ mode: 'fakeStops' }),
  cityName: 'fares',
  defaultFares: { currencyType: 'BOB' },
  fare: (route, osmFare) => {
    if (osmFare) return osmFare;
    if (route.properties.ref === '233') return undefined;
    return { price: 3, currency: 'BOB' };
  },
};
