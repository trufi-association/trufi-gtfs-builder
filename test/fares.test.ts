import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { fareBuilder, routeBuilder } from '../src/geojson_to_gtfs/gtfsBuilders';
import { osmRouteFare, parseCharge, parseChargeEntries } from '../src/geojson_to_gtfs/fares';
import type { GeoJSONFeature, RouteFare } from '../src/types';

// Real `charge=*` values from Cochabamba relations (OSM, 2026-09).
const MI_TREN_ROJA = '3.50 BOB/persona;2.50 BOB/interparadas;2 BOB/preferencial;1 BOB/estudiante';
const TRUFI_130 =
  '3 BOB/persona;1 BOB/estudiante primaria;2 BOB/estudiante secundaria;2 BOB/estudiante universitario;2.50 BOB/persona discapacitada;1.50 BOB/adulto mayor';

/** A route relation as `geojsonToGtfs` sees it after routeBuilder ran. */
function relation(
  id: number,
  tags: Record<string, any>,
  gtfs?: { agency_id: number; route_id: number },
): GeoJSONFeature[] {
  const feature: any = {
    type: 'Feature',
    properties: { ...tags, id },
    geometry: { type: 'LineString', coordinates: [] },
  };
  if (gtfs) feature.gtfs = { ...gtfs, services: [] };
  return [feature];
}

describe('parseChargeEntries', () => {
  it('parses the documented "<amount> <ISO 4217>/<unit>" form', () => {
    assert.deepEqual(parseChargeEntries('3 BOB/person'), [
      { price: 3, currency: 'BOB', unit: 'person', raw: '3 BOB/person' },
    ]);
  });

  it('keeps every ;-separated value in order (rider categories for Fares V2)', () => {
    const entries = parseChargeEntries(MI_TREN_ROJA);
    assert.deepEqual(
      entries.map((e) => [e.price, e.currency, e.unit]),
      [
        [3.5, 'BOB', 'persona'],
        [2.5, 'BOB', 'interparadas'],
        [2, 'BOB', 'preferencial'],
        [1, 'BOB', 'estudiante'],
      ],
    );
    const trufi130 = parseChargeEntries(TRUFI_130);
    assert.equal(trufi130.length, 6);
    assert.deepEqual(trufi130[0], { price: 3, currency: 'BOB', unit: 'persona', raw: '3 BOB/persona' });
    assert.equal(trufi130[4].unit, 'persona discapacitada');
  });

  it('tolerates comma decimals, no space, currency-first, lower case and bare amounts', () => {
    assert.deepEqual(parseChargeEntries('3,50 BOB')[0], { price: 3.5, currency: 'BOB', unit: undefined, raw: '3,50 BOB' });
    assert.equal(parseChargeEntries('3BOB')[0].currency, 'BOB');
    assert.deepEqual(parseChargeEntries('BOB 3')[0], { price: 3, currency: 'BOB', unit: undefined, raw: 'BOB 3' });
    assert.equal(parseChargeEntries('bob 3.5')[0].currency, 'BOB');
    assert.deepEqual(parseChargeEntries('3')[0], { price: 3, currency: undefined, unit: undefined, raw: '3' });
    assert.equal(parseChargeEntries(' 3 BOB ; 5 BOB ').length, 2);
  });

  it('rejects currency signs, local abbreviations, words, negatives and non-strings', () => {
    for (const bad of ['Bs 3', '$3', '3 Bs', 'free', 'yes', '-3 BOB', '', '   ', undefined, null, 3]) {
      assert.deepEqual(parseChargeEntries(bad), [], `should reject ${JSON.stringify(bad)}`);
    }
  });

  it('skips unparseable values inside a list', () => {
    assert.deepEqual(
      parseChargeEntries('3 BOB;garbage;5 BOB/student').map((e) => e.price),
      [3, 5],
    );
  });
});

describe('parseCharge', () => {
  it('returns the first value; the tag currency beats the config default', () => {
    assert.deepEqual(parseCharge('3 BOB/person', 'USD'), { price: 3, currency: 'BOB' });
    assert.deepEqual(parseCharge(MI_TREN_ROJA, 'USD'), { price: 3.5, currency: 'BOB' });
  });

  it('uses the default currency only for bare amounts', () => {
    assert.deepEqual(parseCharge('3', 'BOB'), { price: 3, currency: 'BOB' });
    assert.equal(parseCharge('3', ''), undefined);
  });

  it('returns undefined when nothing parses', () => {
    assert.equal(parseCharge('garbage', 'BOB'), undefined);
    assert.equal(parseCharge(undefined, 'BOB'), undefined);
  });
});

describe('osmRouteFare', () => {
  it('charge=* wins over fee, fee=no means free, fee=yes alone is unknown', () => {
    assert.deepEqual(osmRouteFare({ fee: 'yes', charge: '6 BOB/persona' }, 'USD'), {
      price: 6, currency: 'BOB', source: 'osm',
    });
    assert.deepEqual(osmRouteFare({ fee: 'no' }, 'BOB'), { price: 0, currency: 'BOB', source: 'osm' });
    assert.equal(osmRouteFare({ fee: 'yes' }, 'BOB'), undefined);
    assert.equal(osmRouteFare({}, 'BOB'), undefined);
  });

  it('warns and ignores an unparseable charge', (t) => {
    const warn = t.mock.method(console, 'warn', () => {});
    assert.equal(osmRouteFare({ id: 42, charge: 'Bs 3' }, 'BOB'), undefined);
    assert.equal(warn.mock.callCount(), 1);
    assert.match(String(warn.mock.calls[0].arguments[0]), /charge="Bs 3".*relation\/42/);
  });
});

describe('fareBuilder', () => {
  const USD = { currencyType: 'USD' };
  const BOB3 = { currencyType: 'BOB', price: 3 };

  it('emits NO rows for a route whose price nobody knows (never a 0)', () => {
    const features = [
      relation(1, { ref: '10', fee: 'yes' }, { agency_id: 0, route_id: 0 }),
      relation(2, { ref: '11' }, { agency_id: 0, route_id: 1 }),
    ];
    const { attributes, rules } = fareBuilder(features, USD);
    assert.deepEqual(attributes, []);
    assert.deepEqual(rules, []);
  });

  it('fee=no is an explicit free ride: price 0 is emitted', () => {
    const { attributes, rules } = fareBuilder(
      [relation(1, { ref: 'F', fee: 'no' }, { agency_id: 0, route_id: 0 })],
      USD,
    );
    assert.equal(attributes.length, 1);
    assert.equal(attributes[0].price, 0);
    assert.deepEqual(rules, [{ fare_id: 0, route_id: 0 }]);
  });

  it('takes the currency from charge=*, not from the config default', () => {
    const { attributes } = fareBuilder(
      [relation(11678428, { ref: 'Roja', fee: 'yes', charge: '3 BOB/person' }, { agency_id: 7, route_id: 30 })],
      USD,
    );
    assert.deepEqual(attributes, [
      { agency_id: 7, fare_id: 0, price: 3, currency_type: 'BOB', payment_method: 0, transfers: 0 },
    ]);
  });

  it('applies defaultFares.price to routes without charge=*', () => {
    const { attributes, rules } = fareBuilder(
      [relation(1, { ref: '10' }, { agency_id: 3, route_id: 5 })],
      BOB3,
    );
    assert.deepEqual(attributes, [
      { agency_id: 3, fare_id: 0, price: 3, currency_type: 'BOB', payment_method: 0, transfers: 0 },
    ]);
    assert.deepEqual(rules, [{ fare_id: 0, route_id: 5 }]);
  });

  it('one fare per route_id: variants and directions collapse into one rule', () => {
    const features = [
      relation(9715360, { ref: '130', fee: 'yes', charge: TRUFI_130 }, { agency_id: 24, route_id: 60 }),
      relation(9717256, { ref: '130', fee: 'yes', charge: TRUFI_130 }, { agency_id: 24, route_id: 60 }),
      relation(9717257, { ref: '130' }, { agency_id: 24, route_id: 60 }),
    ];
    const { attributes, rules } = fareBuilder(features, BOB3);
    assert.equal(attributes.length, 1);
    assert.deepEqual(rules, [{ fare_id: 0, route_id: 60 }]);
  });

  it('routes of one agency with the same fare share a fare_attributes row', () => {
    const features = [
      relation(1, { ref: '10' }, { agency_id: 0, route_id: 0 }),
      relation(2, { ref: '11' }, { agency_id: 0, route_id: 1 }),
      relation(3, { ref: '12' }, { agency_id: 1, route_id: 2 }),
    ];
    const { attributes, rules } = fareBuilder(features, BOB3);
    assert.deepEqual(attributes.map((a) => [a.agency_id, a.fare_id]), [[0, 0], [1, 1]]);
    assert.deepEqual(rules, [
      { fare_id: 0, route_id: 0 },
      { fare_id: 0, route_id: 1 },
      { fare_id: 1, route_id: 2 },
    ]);
  });

  it('when variants disagree: OSM beats the config default, then the lowest price wins, and it warns', (t) => {
    const warn = t.mock.method(console, 'warn', () => {});
    const features = [
      // route 0: one variant tagged 6 BOB, the other untagged (default 3) → 6 (OSM)
      relation(1, { ref: '20', charge: '6 BOB/persona' }, { agency_id: 0, route_id: 0 }),
      relation(2, { ref: '20' }, { agency_id: 0, route_id: 0 }),
      // route 1: two OSM values → the lowest
      relation(3, { ref: '21', charge: '6 BOB' }, { agency_id: 0, route_id: 1 }),
      relation(4, { ref: '21', charge: '3.50 BOB' }, { agency_id: 0, route_id: 1 }),
      // same input in reverse order must give the same answer
      relation(5, { ref: '22', charge: '3.50 BOB' }, { agency_id: 0, route_id: 2 }),
      relation(6, { ref: '22', charge: '6 BOB' }, { agency_id: 0, route_id: 2 }),
    ];
    const { attributes, rules } = fareBuilder(features, BOB3);
    const priceOf = (routeId: number) =>
      attributes.find((a) => a.fare_id === rules.find((r) => r.route_id === routeId)!.fare_id)!.price;
    assert.equal(priceOf(0), 6);
    assert.equal(priceOf(1), 3.5);
    assert.equal(priceOf(2), 3.5);
    assert.equal(rules.length, 3);
    assert.equal(warn.mock.callCount(), 3);
    assert.match(String(warn.mock.calls[0].arguments[0]), /route 20 \(route_id 0\).*6 BOB \[relation 1, osm\].*3 BOB \[relation 2, config\].*using 6 BOB/);
  });

  it('a known fare beats unknown variants of the same route, with a warning', (t) => {
    const warn = t.mock.method(console, 'warn', () => {});
    const features = [
      relation(1, { ref: 'Q', network: 'BO:C:Cochabamba;BO:C:Quillacollo' }, { agency_id: 0, route_id: 0 }),
      relation(2, { ref: 'Q' }, { agency_id: 0, route_id: 0 }),
      relation(3, { ref: 'Q' }, { agency_id: 0, route_id: 0 }),
    ];
    const { attributes, rules } = fareBuilder(features, { currencyType: 'BOB' }, (route) =>
      /Quillacollo/.test(route.properties.network || '') ? undefined : { price: 3, currency: 'BOB' },
    );
    assert.deepEqual(rules, [{ fare_id: 0, route_id: 0 }]);
    assert.equal(attributes[0].price, 3);
    assert.equal(warn.mock.callCount(), 1);
    assert.match(String(warn.mock.calls[0].arguments[0]), /route Q \(route_id 0\) has 1 variant\(s\) without a known fare \(relation 1\)/);
  });

  it('the fare resolver is final: undefined → no row, override → used, pass-through keeps OSM', () => {
    const seen: Array<[number, RouteFare | undefined]> = [];
    const resolver = (route: GeoJSONFeature, osmFare: RouteFare | undefined): RouteFare | undefined => {
      seen.push([route.properties.id, osmFare]);
      if (osmFare) return osmFare;
      if (route.properties.operator === 'Sindicato Sacaba') return undefined;
      return { price: 3, currency: 'BOB' };
    };
    const features = [
      relation(1, { ref: '233', operator: 'Sindicato Sacaba' }, { agency_id: 0, route_id: 0 }),
      relation(2, { ref: '10', operator: 'Urbano' }, { agency_id: 1, route_id: 1 }),
      relation(3, { ref: 'Roja', charge: '3.50 BOB/persona' }, { agency_id: 2, route_id: 2 }),
    ];
    const { attributes, rules } = fareBuilder(features, { currencyType: 'BOB', price: 99 }, resolver);
    assert.deepEqual(rules, [
      { fare_id: 0, route_id: 1 },
      { fare_id: 1, route_id: 2 },
    ]);
    assert.deepEqual(attributes.map((a) => [a.price, a.currency_type]), [[3, 'BOB'], [3.5, 'BOB']]);
    // defaultFares.price is not applied behind the resolver's back
    assert.ok(!attributes.some((a) => a.price === 99));
    assert.deepEqual(seen.map(([id, osm]) => [id, osm?.price]), [[1, undefined], [2, undefined], [3, 3.5]]);
  });

  it('payment_method and transfers: fare > defaultFares > 0; null transfers → empty cell', () => {
    const features = [
      relation(1, { ref: '1' }, { agency_id: 0, route_id: 0 }),
      relation(2, { ref: '2' }, { agency_id: 0, route_id: 1 }),
    ];
    const resolver = (route: GeoJSONFeature): RouteFare =>
      route.properties.ref === '2'
        ? { price: 3, currency: 'BOB', paymentMethod: 1, transfers: 1 }
        : { price: 3, currency: 'BOB' };
    const unlimited = fareBuilder(features, { currencyType: 'BOB', transfers: null }, resolver);
    assert.deepEqual(
      unlimited.attributes.map((a) => [a.payment_method, a.transfers]),
      [[0, ''], [1, 1]],
    );
    const plain = fareBuilder(features, { currencyType: 'BOB', price: 3 });
    assert.deepEqual(plain.attributes.map((a) => [a.payment_method, a.transfers]), [[0, 0]]);
  });

  it('rejects an invalid fare from a resolver instead of writing it', (t) => {
    const warn = t.mock.method(console, 'warn', () => {});
    const { attributes } = fareBuilder(
      [relation(1, { ref: '1' }, { agency_id: 0, route_id: 0 })],
      { currencyType: 'BOB' },
      () => ({ price: -1, currency: 'BOB' }),
    );
    assert.deepEqual(attributes, []);
    assert.equal(warn.mock.callCount(), 1);
  });

  it('skips features that never got a route_id', () => {
    const { attributes, rules } = fareBuilder([relation(1, { ref: '1', charge: '3 BOB' })], USD);
    assert.deepEqual(attributes, []);
    assert.deepEqual(rules, []);
  });

  it('works on top of routeBuilder: variants grouped by (agency, ref) get one fare', () => {
    const features = [
      relation(1, { ref: '130', route: 'bus', name: 'Trufi 130: A → B', charge: TRUFI_130 }),
      relation(2, { ref: '130', route: 'bus', name: 'Trufi 130: B → A', charge: TRUFI_130 }),
      relation(3, { ref: '131', route: 'bus', name: 'Trufi 131: C → D' }),
      relation(4, { ref: '233', route: 'bus', name: 'MiniBus 233: E → F', fee: 'yes' }),
    ];
    const routes = routeBuilder(features);
    assert.equal(routes.length, 3);
    const { attributes, rules } = fareBuilder(features, { currencyType: 'BOB' }, (route, osmFare) => {
      if (osmFare) return osmFare;
      return route.properties.ref === '233' ? undefined : { price: 3, currency: 'BOB' };
    });
    assert.deepEqual(rules, [
      { fare_id: 0, route_id: features[0][0].gtfs!.route_id },
      { fare_id: 0, route_id: features[2][0].gtfs!.route_id },
    ]);
    assert.equal(attributes.length, 1);
    assert.equal(attributes[0].currency_type, 'BOB');
  });
});
