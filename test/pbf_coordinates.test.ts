import { test } from 'node:test';
import assert from 'node:assert/strict';
import { roundCoordinate } from '../src/osm_to_geojson/osm_getter/pbf_reader';

test('PBF coordinates are rounded to the 7 decimals OSM uses, like Overpass output', () => {
  // Values as osm-pbf-parser produces them (nanodegrees / 1e9) next to what Overpass prints.
  assert.equal(roundCoordinate(-16.404259500000002), -16.4042595);
  assert.equal(roundCoordinate(-71.55216510000001), -71.5521651);
  assert.equal(String(roundCoordinate(-71.55216510000001)), '-71.5521651');
  // Exact values stay exact.
  assert.equal(roundCoordinate(-16.3377434), -16.3377434);
  assert.equal(roundCoordinate(0), 0);
});
