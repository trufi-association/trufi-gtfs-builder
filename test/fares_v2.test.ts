import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { osmToGtfs } from '../src/index';
import { fareBuilder } from '../src/geojson_to_gtfs/gtfsBuilders';
import { osmRouteFare, riderCategoryId } from '../src/geojson_to_gtfs/fares';
import { buildFaresV2, currencyMinorUnits, formatCurrencyAmount } from '../src/geojson_to_gtfs/faresV2';
import { datasetGtfsOptions, datasetOsm, MI_TREN_ROJA, TRUFI_130 } from './fixtures/fares_dataset';
import type { GeoJSONFeature, OsmToGtfsConfig, RouteFare } from '../src/types';

// What `main` (16291a1, before Fares V2) wrote for `fixtures/fares_dataset.ts`.
const FIXTURE = path.join(__dirname, 'fixtures', 'fares-v1');
const BOB = { currencyType: 'BOB' };
const BOB3 = { currencyType: 'BOB', price: 3 };

/** A route relation as `geojsonToGtfs` sees it after routeBuilder ran. */
function relation(id: number, tags: Record<string, any>, gtfs: { agency_id: number; route_id: number }): GeoJSONFeature[] {
  const feature: any = {
    type: 'Feature',
    properties: { ...tags, id },
    geometry: { type: 'LineString', coordinates: [] },
    gtfs: { ...gtfs, services: [] },
  };
  return [feature];
}

function csvRows(file: string): string[] {
  return fs.readFileSync(file, 'utf8').trim().split('\n');
}

describe('riderCategoryId', () => {
  it('turns the OSM unit text into a printable-ASCII id', () => {
    assert.equal(riderCategoryId('estudiante primaria'), 'estudiante_primaria');
    assert.equal(riderCategoryId('Adulto Mayor'), 'adulto_mayor');
    assert.equal(riderCategoryId('niño'), 'nino');
    assert.equal(riderCategoryId(' interparadas '), 'interparadas');
    assert.equal(riderCategoryId('persona discapacitada'), 'persona_discapacitada');
    assert.equal(riderCategoryId('---'), '');
  });
});

describe('osmRouteFare rider categories', () => {
  it('reads every further charge value with a /<unit> as a rider category, in the fare currency', () => {
    assert.deepEqual(osmRouteFare({ id: 1, charge: MI_TREN_ROJA }, ''), {
      price: 3.5,
      currency: 'BOB',
      source: 'osm',
      riderCategories: [
        { id: 'interparadas', name: 'interparadas', price: 2.5 },
        { id: 'preferencial', name: 'preferencial', price: 2 },
        { id: 'estudiante', name: 'estudiante', price: 1 },
      ],
    });
    const trufi130 = osmRouteFare({ id: 2, charge: TRUFI_130 }, '');
    assert.deepEqual(
      trufi130!.riderCategories!.map((c) => [c.id, c.price]),
      [['estudiante_primaria', 1], ['estudiante_secundaria', 2], ['estudiante_universitario', 2], ['persona_discapacitada', 2.5], ['adulto_mayor', 1.5]],
    );
    // bare amounts inherit the currency of the fare
    assert.deepEqual(osmRouteFare({ id: 3, charge: '3/persona;1/estudiante' }, 'BOB')!.riderCategories, [
      { id: 'estudiante', name: 'estudiante', price: 1 },
    ]);
  });

  it('sets no riderCategories at all for a single value or fee=no (V1 compares fares as plain objects)', () => {
    assert.deepEqual(osmRouteFare({ id: 1, charge: '3 BOB/persona' }, ''), { price: 3, currency: 'BOB', source: 'osm' });
    assert.deepEqual(osmRouteFare({ id: 2, fee: 'no' }, 'BOB'), { price: 0, currency: 'BOB', source: 'osm' });
  });

  it('skips, with a warning, a value without a unit, in another currency, repeating a unit, or with an empty id', (t) => {
    const warn = t.mock.method(console, 'warn', () => {});
    const cases: Array<[string, RegExp]> = [
      ['3 BOB/persona;2 BOB', /"2 BOB" on .*relation\/9 has no \/<unit>; not a rider category/],
      ['3 BOB/persona;1 USD/estudiante', /"1 USD\/estudiante" .* is in USD while the fare is in BOB/],
      ['3 BOB/persona;2 BOB/persona', /"2 BOB\/persona" .* repeats the unit "persona"/],
      ['3 BOB/persona;1 BOB/estudiante;1.50 BOB/Estudiante', /"1.50 BOB\/Estudiante" .* repeats the unit "Estudiante"/],
      ['3 BOB/persona;1 BOB/***', /"1 BOB\/\*\*\*" .* has a unit with no letters or digits/],
    ];
    for (const [charge, message] of cases) {
      warn.mock.resetCalls();
      const fare = osmRouteFare({ id: 9, charge }, 'BOB');
      assert.equal(fare!.price, 3);
      assert.equal(warn.mock.callCount(), 1, charge);
      assert.match(String(warn.mock.calls[0].arguments[0]), message);
    }
    // the fourth case keeps the first `estudiante`
    assert.deepEqual(osmRouteFare({ id: 9, charge: cases[3][0] }, 'BOB')!.riderCategories, [
      { id: 'estudiante', name: 'estudiante', price: 1 },
    ]);
  });
});

describe('currency amounts', () => {
  it('knows the ISO 4217 minor units', () => {
    assert.equal(currencyMinorUnits('BOB'), 2);
    assert.equal(currencyMinorUnits('JPY'), 0);
    assert.equal(currencyMinorUnits('KWD'), 3);
    assert.equal(currencyMinorUnits('CLF'), 4);
    assert.equal(currencyMinorUnits('XYZ'), 2);
  });

  it('writes amounts with exactly the currency decimals, and warns when it has to round', (t) => {
    const warn = t.mock.method(console, 'warn', () => {});
    assert.equal(formatCurrencyAmount(3, 'BOB'), '3.00');
    assert.equal(formatCurrencyAmount(3.5, 'BOB'), '3.50');
    assert.equal(formatCurrencyAmount(0, 'BOB'), '0.00');
    assert.equal(formatCurrencyAmount(200, 'JPY'), '200');
    assert.equal(formatCurrencyAmount(1.5, 'KWD'), '1.500');
    assert.equal(warn.mock.callCount(), 0);
    assert.match(formatCurrencyAmount(3.505, 'BOB'), /^3\.5[01]$/);
    assert.equal(warn.mock.callCount(), 1);
    assert.match(String(warn.mock.calls[0].arguments[0]), /amount 3.505 BOB rounded to 3\.5[01] \(BOB has 2 decimal places\)/);
  });
});

describe('fareBuilder with faresV2', () => {
  const features = () => [
    relation(1, { ref: '10' }, { agency_id: 0, route_id: 0 }),
    relation(2, { ref: '11' }, { agency_id: 1, route_id: 1 }),
    relation(3, { ref: 'F', fee: 'no' }, { agency_id: 2, route_id: 2 }),
    relation(4, { ref: '130', charge: TRUFI_130 }, { agency_id: 3, route_id: 3 }),
    relation(5, { ref: 'X', fee: 'yes' }, { agency_id: 3, route_id: 4 }),
  ];

  it('is off by default, and the option does not change the V1 rows', () => {
    const off = fareBuilder(features(), BOB3);
    assert.deepEqual(Object.keys(off), ['attributes', 'rules']);
    assert.deepEqual(Object.keys(fareBuilder(features(), BOB3, undefined, { faresV2: false })), ['attributes', 'rules']);
    const on = fareBuilder(features(), BOB3, undefined, { faresV2: true });
    assert.deepEqual(on.attributes, off.attributes);
    assert.deepEqual(on.rules, off.rules);
    assert.deepEqual(Object.keys(on), ['attributes', 'rules', 'fare_products', 'rider_categories', 'fare_leg_rules', 'networks', 'route_networks']);
  });

  it('one product per amount/currency/category, one network per fare shared across agencies, nothing for an unknown fare', () => {
    // Like the Cochabamba config: OSM first, Bs 3 everywhere except the route the resolver does not know.
    const resolver = (route: GeoJSONFeature, osmFare: RouteFare | undefined): RouteFare | undefined =>
      osmFare ?? (route.properties.ref === 'X' ? undefined : { price: 3, currency: 'BOB' });
    const v2 = fareBuilder(features(), BOB, resolver, { faresV2: true });
    assert.deepEqual(v2.fare_products, [
      { fare_product_id: 'BOB_3.00', fare_product_name: '3.00 BOB', rider_category_id: '', amount: '3.00', currency: 'BOB' },
      { fare_product_id: 'BOB_0.00', fare_product_name: '0.00 BOB', rider_category_id: '', amount: '0.00', currency: 'BOB' },
      { fare_product_id: 'BOB_1.00_estudiante_primaria', fare_product_name: '1.00 BOB (estudiante primaria)', rider_category_id: 'estudiante_primaria', amount: '1.00', currency: 'BOB' },
      { fare_product_id: 'BOB_2.00_estudiante_secundaria', fare_product_name: '2.00 BOB (estudiante secundaria)', rider_category_id: 'estudiante_secundaria', amount: '2.00', currency: 'BOB' },
      { fare_product_id: 'BOB_2.00_estudiante_universitario', fare_product_name: '2.00 BOB (estudiante universitario)', rider_category_id: 'estudiante_universitario', amount: '2.00', currency: 'BOB' },
      { fare_product_id: 'BOB_2.50_persona_discapacitada', fare_product_name: '2.50 BOB (persona discapacitada)', rider_category_id: 'persona_discapacitada', amount: '2.50', currency: 'BOB' },
      { fare_product_id: 'BOB_1.50_adulto_mayor', fare_product_name: '1.50 BOB (adulto mayor)', rider_category_id: 'adulto_mayor', amount: '1.50', currency: 'BOB' },
    ]);
    assert.deepEqual(v2.rider_categories, [
      { rider_category_id: 'estudiante_primaria', rider_category_name: 'estudiante primaria', is_default_fare_category: 0 },
      { rider_category_id: 'estudiante_secundaria', rider_category_name: 'estudiante secundaria', is_default_fare_category: 0 },
      { rider_category_id: 'estudiante_universitario', rider_category_name: 'estudiante universitario', is_default_fare_category: 0 },
      { rider_category_id: 'persona_discapacitada', rider_category_name: 'persona discapacitada', is_default_fare_category: 0 },
      { rider_category_id: 'adulto_mayor', rider_category_name: 'adulto mayor', is_default_fare_category: 0 },
    ]);
    // two agencies at 3 BOB share fare_0; Trufi 130 is also 3 BOB but its categories make another fare
    assert.deepEqual(v2.networks, [{ network_id: 'fare_0' }, { network_id: 'fare_1' }, { network_id: 'fare_2' }]);
    assert.deepEqual(v2.route_networks, [
      { network_id: 'fare_0', route_id: 0 },
      { network_id: 'fare_0', route_id: 1 },
      { network_id: 'fare_1', route_id: 2 },
      { network_id: 'fare_2', route_id: 3 },
    ]);
    assert.deepEqual(v2.fare_leg_rules, [
      { leg_group_id: 'fare_0_legs', network_id: 'fare_0', fare_product_id: 'BOB_3.00' },
      { leg_group_id: 'fare_1_legs', network_id: 'fare_1', fare_product_id: 'BOB_0.00' },
      { leg_group_id: 'fare_2_legs', network_id: 'fare_2', fare_product_id: 'BOB_3.00' },
      { leg_group_id: 'fare_2_legs', network_id: 'fare_2', fare_product_id: 'BOB_1.00_estudiante_primaria' },
      { leg_group_id: 'fare_2_legs', network_id: 'fare_2', fare_product_id: 'BOB_2.00_estudiante_secundaria' },
      { leg_group_id: 'fare_2_legs', network_id: 'fare_2', fare_product_id: 'BOB_2.00_estudiante_universitario' },
      { leg_group_id: 'fare_2_legs', network_id: 'fare_2', fare_product_id: 'BOB_2.50_persona_discapacitada' },
      { leg_group_id: 'fare_2_legs', network_id: 'fare_2', fare_product_id: 'BOB_1.50_adulto_mayor' },
    ]);
    // V1 keeps one fare row per agency; V2 does not know agencies
    assert.deepEqual(v2.attributes.map((a) => [a.agency_id, a.fare_id, a.price]), [[0, 0, 3], [1, 1, 3], [2, 2, 0], [3, 3, 3]]);
  });

  it('writes no rider categories when no fare has any', () => {
    const v2 = fareBuilder([features()[0], features()[1]], BOB3, undefined, { faresV2: true });
    assert.deepEqual(v2.rider_categories, []);
    assert.equal(v2.fare_products!.length, 1);
    assert.deepEqual(v2.fare_leg_rules, [{ leg_group_id: 'fare_0_legs', network_id: 'fare_0', fare_product_id: 'BOB_3.00' }]);
  });

  it('a category id written by two routes is one row, named as first seen; the products are shared too', () => {
    const v2 = fareBuilder(
      [
        relation(1, { ref: 'A', charge: '3 BOB/persona;1 BOB/Estudiante' }, { agency_id: 0, route_id: 0 }),
        relation(2, { ref: 'B', charge: '3.50 BOB/persona;1 BOB/estudiante' }, { agency_id: 1, route_id: 1 }),
      ],
      BOB,
      undefined,
      { faresV2: true },
    );
    assert.deepEqual(v2.rider_categories, [{ rider_category_id: 'estudiante', rider_category_name: 'Estudiante', is_default_fare_category: 0 }]);
    assert.deepEqual(v2.fare_products!.map((p) => [p.fare_product_id, p.fare_product_name]), [
      ['BOB_3.00', '3.00 BOB'],
      ['BOB_1.00_estudiante', '1.00 BOB (Estudiante)'],
      ['BOB_3.50', '3.50 BOB'],
    ]);
    assert.deepEqual(v2.fare_leg_rules, [
      { leg_group_id: 'fare_0_legs', network_id: 'fare_0', fare_product_id: 'BOB_3.00' },
      { leg_group_id: 'fare_0_legs', network_id: 'fare_0', fare_product_id: 'BOB_1.00_estudiante' },
      { leg_group_id: 'fare_1_legs', network_id: 'fare_1', fare_product_id: 'BOB_3.50' },
      { leg_group_id: 'fare_1_legs', network_id: 'fare_1', fare_product_id: 'BOB_1.00_estudiante' },
    ]);
  });

  it('the fare resolver is final for the categories too: a new fare has none, a pass-through or a spread keeps them', () => {
    const trufi = () => [relation(1, { ref: '130', charge: TRUFI_130 }, { agency_id: 0, route_id: 0 })];
    const run = (resolver: (route: GeoJSONFeature, osmFare: RouteFare | undefined) => RouteFare | undefined) =>
      fareBuilder(trufi(), BOB, resolver, { faresV2: true });
    assert.deepEqual(run(() => ({ price: 3, currency: 'BOB' })).rider_categories, []);
    assert.equal(run((_, osmFare) => osmFare).rider_categories!.length, 5);
    const spread = run((_, osmFare) => ({ ...osmFare!, price: 2 }));
    assert.equal(spread.rider_categories!.length, 5);
    assert.equal(spread.fare_leg_rules![0].fare_product_id, 'BOB_2.00');
    assert.equal(spread.attributes[0].price, 2);
  });

  it('throws on invalid rider categories from a resolver: a config bug is not written', () => {
    const base = [relation(1, { ref: '1' }, { agency_id: 0, route_id: 0 })];
    const build = (riderCategories: any) => () =>
      fareBuilder(base, BOB, () => ({ price: 3, currency: 'BOB', riderCategories }), { faresV2: true });
    assert.throws(build('estudiante'), /riderCategories that is not an array/);
    assert.throws(build([{ name: 'Estudiante', price: 1 }]), /a rider category without an id/);
    assert.throws(build([{ id: 'estudiante', price: 1 }]), /a rider category "estudiante" without a name/);
    assert.throws(build([{ id: 'estudiante', name: 'Estudiante', price: -1 }]), /whose price is not a non-negative number/);
    assert.throws(build([{ id: 'e', name: 'E', price: 1 }, { id: 'e', name: 'E2', price: 2 }]), /the rider category "e" twice/);
    // the same shapes are fine without the option: V1 does not read them, but a config bug is still a bug
    assert.throws(() => fareBuilder(base, BOB, () => ({ price: 3, currency: 'BOB', riderCategories: 'x' as any })), /not an array/);
    const ok = fareBuilder(base, BOB, () => ({ price: 3, currency: 'BOB', riderCategories: [{ id: ' e ', name: ' E ', price: 1 }] }), { faresV2: true });
    assert.deepEqual(ok.rider_categories, [{ rider_category_id: 'e', rider_category_name: 'E', is_default_fare_category: 0 }]);
  });

  it('variants of one route: the one with categories wins whatever the order, V1 is unchanged, and the disagreement is logged only with faresV2', (t) => {
    const warn = t.mock.method(console, 'warn', () => {});
    const withCategories = { ref: '20', charge: '3 BOB/persona;1 BOB/estudiante' };
    const plain = { ref: '20', charge: '3 BOB' };
    const ab = () => [relation(1, withCategories, { agency_id: 0, route_id: 0 }), relation(2, plain, { agency_id: 0, route_id: 0 })];
    const ba = () => [relation(2, plain, { agency_id: 0, route_id: 0 }), relation(1, withCategories, { agency_id: 0, route_id: 0 })];
    const off = fareBuilder(ab(), BOB);
    assert.equal(warn.mock.callCount(), 0);
    for (const order of [ab, ba]) {
      warn.mock.resetCalls();
      const on = fareBuilder(order(), BOB, undefined, { faresV2: true });
      assert.deepEqual(on.attributes, off.attributes);
      assert.deepEqual(on.rules, off.rules);
      assert.deepEqual(on.fare_leg_rules!.map((r) => r.fare_product_id), ['BOB_3.00', 'BOB_1.00_estudiante']);
      assert.equal(warn.mock.callCount(), 1);
      assert.match(String(warn.mock.calls[0].arguments[0]), /route 20 \(route_id 0\) has variants with different rider categories; using those of relation 1/);
    }
    assert.deepEqual(fareBuilder(ba(), BOB).attributes, off.attributes);
  });

  it('warns once that payment_method and transfers are not expressed in V2', (t) => {
    const warn = t.mock.method(console, 'warn', () => {});
    fareBuilder(features().slice(0, 2), { ...BOB3, transfers: null }, undefined, { faresV2: true });
    assert.equal(warn.mock.callCount(), 1);
    assert.match(String(warn.mock.calls[0].arguments[0]), /2 route fare\(s\) have payment_method or transfers other than 0; the Fares V2 files express neither/);
    warn.mock.resetCalls();
    fareBuilder(features().slice(0, 2), BOB3, undefined, { faresV2: true });
    assert.equal(warn.mock.callCount(), 0);
  });

  it('buildFaresV2 is deterministic: ids follow the fares and the route order only', () => {
    const fare = (price: number, riderCategories: Array<{ id: string; name: string; price: number }> = []) => ({
      price, currency: 'BOB', paymentMethod: 0 as const, transfers: 0 as const, source: 'osm', riderCategories,
    });
    const a = buildFaresV2([{ routeId: 'r1', fare: fare(3) }, { routeId: 'r2', fare: fare(3, [{ id: 'e', name: 'E', price: 1 }]) }]);
    const b = buildFaresV2([{ routeId: 'r1', fare: fare(3) }, { routeId: 'r2', fare: fare(3, [{ id: 'e', name: 'E', price: 1 }]) }]);
    assert.deepEqual(a, b);
    assert.deepEqual(a.networks, [{ network_id: 'fare_0' }, { network_id: 'fare_1' }]);
  });
});

describe('osmToGtfs with faresV2 (fixture written by main, 16291a1)', () => {
  async function build(gtfsOptions: OsmToGtfsConfig['gtfsOptions'] = {}) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'trufi-gtfs-builder-fares-'));
    const out = path.join(dir, 'out');
    await osmToGtfs({
      outputFiles: { outputDir: out, gtfs: true, readme: false },
      geojsonOptions: { osmDataGetter: datasetOsm },
      gtfsOptions: { ...datasetGtfsOptions, ...gtfsOptions },
    });
    const gtfs = path.join(out, 'gtfs');
    const files = fs.readdirSync(gtfs).filter((f) => f.endsWith('.txt')).sort();
    return { gtfs, files, cleanup: () => fs.rmSync(dir, { recursive: true, force: true }) };
  }
  const fixtureFiles = fs.readdirSync(FIXTURE).sort();

  function assertBytesEqualToFixture(gtfs: string, files: string[]) {
    for (const name of files) {
      const actual = fs.readFileSync(path.join(gtfs, name));
      const expected = fs.readFileSync(path.join(FIXTURE, name));
      assert.ok(actual.equals(expected), `${name} differs from what main wrote:\n${actual.toString('utf8')}`);
    }
  }

  it('off (the default): every GTFS file is byte for byte what main wrote', async () => {
    const { gtfs, files, cleanup } = await build();
    try {
      assert.deepEqual(files, fixtureFiles);
      assertBytesEqualToFixture(gtfs, fixtureFiles);
    } finally {
      cleanup();
    }
  });

  it('on: the V1 files are still byte for byte what main wrote, and the five V2 files appear', async () => {
    const { gtfs, files, cleanup } = await build({ faresV2: true });
    try {
      assert.deepEqual(files, [...fixtureFiles, 'fare_leg_rules.txt', 'fare_products.txt', 'networks.txt', 'rider_categories.txt', 'route_networks.txt'].sort());
      assertBytesEqualToFixture(gtfs, fixtureFiles);
      assert.deepEqual(csvRows(path.join(gtfs, 'fare_products.txt')), [
        'fare_product_id,fare_product_name,rider_category_id,amount,currency',
        'BOB_3.00,3.00 BOB,,3.00,BOB',
        'BOB_0.00,0.00 BOB,,0.00,BOB',
        'BOB_6.00,6.00 BOB,,6.00,BOB',
        'BOB_1.00_estudiante_primaria,1.00 BOB (estudiante primaria),estudiante_primaria,1.00,BOB',
        'BOB_2.00_estudiante_secundaria,2.00 BOB (estudiante secundaria),estudiante_secundaria,2.00,BOB',
        'BOB_2.00_estudiante_universitario,2.00 BOB (estudiante universitario),estudiante_universitario,2.00,BOB',
        'BOB_2.50_persona_discapacitada,2.50 BOB (persona discapacitada),persona_discapacitada,2.50,BOB',
        'BOB_1.50_adulto_mayor,1.50 BOB (adulto mayor),adulto_mayor,1.50,BOB',
        'BOB_3.50,3.50 BOB,,3.50,BOB',
        'BOB_2.50_interparadas,2.50 BOB (interparadas),interparadas,2.50,BOB',
        'BOB_2.00_preferencial,2.00 BOB (preferencial),preferencial,2.00,BOB',
        'BOB_1.00_estudiante,1.00 BOB (estudiante),estudiante,1.00,BOB',
      ]);
      assert.deepEqual(csvRows(path.join(gtfs, 'rider_categories.txt')), [
        'rider_category_id,rider_category_name,is_default_fare_category',
        'estudiante_primaria,estudiante primaria,0',
        'estudiante_secundaria,estudiante secundaria,0',
        'estudiante_universitario,estudiante universitario,0',
        'persona_discapacitada,persona discapacitada,0',
        'adulto_mayor,adulto mayor,0',
        'interparadas,interparadas,0',
        'preferencial,preferencial,0',
        'estudiante,estudiante,0',
      ]);
      assert.deepEqual(csvRows(path.join(gtfs, 'networks.txt')), ['network_id', 'fare_0', 'fare_1', 'fare_2', 'fare_3', 'fare_4']);
      // route 3 (the 233, "unknown") is in no network; A and B (different agencies, Bs 3) share fare_0
      assert.deepEqual(csvRows(path.join(gtfs, 'route_networks.txt')), [
        'network_id,route_id',
        'fare_0,0',
        'fare_0,1',
        'fare_1,2',
        'fare_2,4',
        'fare_3,5',
        'fare_4,6',
      ]);
      assert.deepEqual(csvRows(path.join(gtfs, 'fare_leg_rules.txt')), [
        'leg_group_id,network_id,fare_product_id',
        'fare_0_legs,fare_0,BOB_3.00',
        'fare_1_legs,fare_1,BOB_0.00',
        'fare_2_legs,fare_2,BOB_6.00',
        'fare_3_legs,fare_3,BOB_3.00',
        'fare_3_legs,fare_3,BOB_1.00_estudiante_primaria',
        'fare_3_legs,fare_3,BOB_2.00_estudiante_secundaria',
        'fare_3_legs,fare_3,BOB_2.00_estudiante_universitario',
        'fare_3_legs,fare_3,BOB_2.50_persona_discapacitada',
        'fare_3_legs,fare_3,BOB_1.50_adulto_mayor',
        'fare_4_legs,fare_4,BOB_3.50',
        'fare_4_legs,fare_4,BOB_2.50_interparadas',
        'fare_4_legs,fare_4,BOB_2.00_preferencial',
        'fare_4_legs,fare_4,BOB_1.00_estudiante',
      ]);
    } finally {
      cleanup();
    }
  });

  it('on, with a flat fare everywhere: no rider_categories.txt, one product, one network', async () => {
    const { gtfs, files, cleanup } = await build({ faresV2: true, fare: () => ({ price: 3, currency: 'BOB' }) });
    try {
      assert.deepEqual(files, [...fixtureFiles, 'fare_leg_rules.txt', 'fare_products.txt', 'networks.txt', 'route_networks.txt'].sort());
      assert.deepEqual(csvRows(path.join(gtfs, 'fare_products.txt')), [
        'fare_product_id,fare_product_name,rider_category_id,amount,currency',
        'BOB_3.00,3.00 BOB,,3.00,BOB',
      ]);
      assert.deepEqual(csvRows(path.join(gtfs, 'networks.txt')), ['network_id', 'fare_0']);
      assert.equal(csvRows(path.join(gtfs, 'route_networks.txt')).length, 8);
    } finally {
      cleanup();
    }
  });
});
