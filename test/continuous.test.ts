import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { routeBuilder } from '../src/geojson_to_gtfs/gtfsBuilders';
import type { GeoJSONFeature } from '../src/types';

/** A route relation as `geojsonToGtfs` sees it. */
function relation(id: number, tags: Record<string, any>): GeoJSONFeature[] {
  const feature: any = {
    type: 'Feature',
    properties: { id, route: 'bus', ...tags },
    geometry: { type: 'LineString', coordinates: [] },
    gtfs: { agency_id: 0, services: [] },
  };
  return [feature];
}

// Issue #11: say in routes.txt that riders board anywhere, instead of only
// approximating it with fake stops.
describe('continuousStops', () => {
  const features = [relation(1, { ref: '130', name: 'Trufi 130' }), relation(2, { ref: 'A', name: 'Linea A' })];

  it('is off by default: the columns are not written', () => {
    const routes = routeBuilder(features);
    for (const r of routes) {
      assert.equal(r.continuous_pickup, undefined);
      assert.equal(r.continuous_drop_off, undefined);
    }
  });

  it('false is the same as leaving it out: the columns are not written', () => {
    const routes = routeBuilder(features, { continuousStops: false });
    for (const r of routes) {
      assert.equal(r.continuous_pickup, undefined);
      assert.equal(r.continuous_drop_off, undefined);
    }
  });

  it('true marks every route as board-anywhere (0)', () => {
    const routes = routeBuilder(features, { continuousStops: true });
    assert.equal(routes.length, 2);
    for (const r of routes) {
      assert.equal(r.continuous_pickup, 0);
      assert.equal(r.continuous_drop_off, 0);
    }
  });

  it('a resolver decides per route; the others get 1 so the columns stay aligned', () => {
    const routes = routeBuilder(features, {
      continuousStops: (f) => f.properties.ref === '130',
    });
    const byRef = Object.fromEntries(routes.map((r) => [r.route_short_name, r]));
    assert.equal(byRef['130'].continuous_pickup, 0);
    assert.equal(byRef['130'].continuous_drop_off, 0);
    assert.equal(byRef['A'].continuous_pickup, 1);
    assert.equal(byRef['A'].continuous_drop_off, 1);
  });

  it('grouped relations: the resolver sees every variant, one true marks the route', () => {
    // Relations 1 and 3 share ref 130 and collapse into one route.
    const grouped = [...features, relation(3, { ref: '130', name: 'Trufi 130 (vuelta)' })];
    const seen: number[] = [];
    const warnings: string[] = [];
    const warn = console.warn;
    console.warn = (msg: string) => warnings.push(msg);
    try {
      const routes = routeBuilder(grouped, {
        continuousStops: (f) => {
          seen.push(f.properties.id);
          return f.properties.id === 3;
        },
      });
      assert.equal(routes.length, 2);
      const byRef = Object.fromEntries(routes.map((r) => [r.route_short_name, r]));
      assert.deepEqual(seen, [1, 2, 3]);
      assert.equal(byRef['130'].continuous_pickup, 0);
      assert.equal(byRef['130'].continuous_drop_off, 0);
      assert.equal(byRef['A'].continuous_pickup, 1);
      assert.equal(warnings.length, 1);
      assert.match(warnings[0], /route 130 .* relation 3 says true/);
    } finally {
      console.warn = warn;
    }
  });

  it('a resolver that returns something else is a config bug', () => {
    assert.throws(
      () => routeBuilder(features, { continuousStops: (() => 'yes') as any }),
      /continuousStops returned "yes" for route 130/
    );
  });
});
