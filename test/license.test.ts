import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import JSZip from 'jszip';
import { osmToGtfs, OSM_ATTRIBUTION, ODBL_1_0 } from '../src/index';
import gtfsDefaultBuilders from '../src/geojson_to_gtfs/gtfsBuilders';
import {
  ATTRIBUTION_COLUMNS,
  attributionsBuilder,
  resolveLicense,
  validateAttributions,
  writeLicense,
} from '../src/geojson_to_gtfs/license';
import { licenseSection } from '../src/osm_to_geojson/readme_generator';
import type { GTFSAttribution, IOSMDataGetter, OsmToGtfsConfig } from '../src/types';

/** The row the Trufi Association would add as the publisher of a feed. */
const PUBLISHER: GTFSAttribution = {
  attribution_id: 'trufi',
  organization_name: 'Trufi Association',
  is_producer: 1,
  attribution_url: 'https://www.trufi-association.org/',
  attribution_email: 'info@trufi-association.org',
};

const OSM_HEADER = 'attribution_id,organization_name,is_producer,attribution_url';
const OSM_ROW = 'osm,OpenStreetMap contributors,1,https://www.openstreetmap.org/copyright';

function csvRows(file: string): string[] {
  return fs.readFileSync(file, 'utf8').trim().split('\n');
}

describe('attributionsBuilder', () => {
  it('is wired as a default builder', () => {
    assert.equal(gtfsDefaultBuilders.attributionsBuilder, attributionsBuilder);
  });

  it('always starts with the OpenStreetMap contributors row, and only its own columns', () => {
    const rows = attributionsBuilder([]);
    assert.deepEqual(rows, [
      {
        attribution_id: 'osm',
        organization_name: 'OpenStreetMap contributors',
        is_producer: 1,
        attribution_url: 'https://www.openstreetmap.org/copyright',
      },
    ]);
    assert.deepEqual(rows[0], { ...OSM_ATTRIBUTION });
    assert.deepEqual(attributionsBuilder([], undefined), rows);
  });

  it('appends the config rows in order and gives every row the same cells, in reference order', () => {
    const operator: GTFSAttribution = {
      organization_name: ' Mi Teleférico ',
      is_operator: 1,
      route_id: 'teleferico',
      attribution_phone: '+591 2 2179300',
    };
    const rows = attributionsBuilder([], [PUBLISHER, operator]);
    assert.equal(rows.length, 3);
    const columns = Object.keys(rows[0]);
    assert.deepEqual(columns, [
      'attribution_id',
      'route_id',
      'organization_name',
      'is_producer',
      'is_operator',
      'attribution_url',
      'attribution_email',
      'attribution_phone',
    ]);
    for (const row of rows) assert.deepEqual(Object.keys(row), columns, 'every row has the same cells');
    // Reference order, whatever the config order was.
    const reference = ATTRIBUTION_COLUMNS.filter((c) => columns.includes(c));
    assert.deepEqual(columns, reference);
    assert.deepEqual(rows[0], {
      attribution_id: 'osm',
      route_id: '',
      organization_name: 'OpenStreetMap contributors',
      is_producer: 1,
      is_operator: '',
      attribution_url: 'https://www.openstreetmap.org/copyright',
      attribution_email: '',
      attribution_phone: '',
    });
    assert.equal(rows[1].attribution_id, 'trufi');
    assert.equal(rows[1].attribution_email, 'info@trufi-association.org');
    assert.deepEqual(rows[2], {
      attribution_id: '',
      route_id: 'teleferico',
      organization_name: 'Mi Teleférico',
      is_producer: '',
      is_operator: 1,
      attribution_url: '',
      attribution_email: '',
      attribution_phone: '+591 2 2179300',
    });
  });

  it('does not touch the config rows', () => {
    const row = { ...PUBLISHER };
    attributionsBuilder([], [row]);
    assert.deepEqual(row, PUBLISHER);
  });

  it('throws on a row the GTFS reference would reject: a config bug is not written', () => {
    const bad: Array<[string, any]> = [
      ['no organization_name', { is_producer: 1 }],
      ['empty organization_name', { organization_name: '  ', is_producer: 1 }],
      ['no role', { organization_name: 'X' }],
      ['roles all 0', { organization_name: 'X', is_producer: 0, is_operator: 0 }],
      ['role outside 0|1', { organization_name: 'X', is_producer: 2 }],
      ['role as string', { organization_name: 'X', is_producer: '1' }],
      ['two scopes', { organization_name: 'X', is_operator: 1, agency_id: 1, route_id: 2 }],
      ['three scopes', { organization_name: 'X', is_operator: 1, agency_id: 1, route_id: 2, trip_id: 3 }],
      ['reserved id', { attribution_id: 'osm', organization_name: 'X', is_producer: 1 }],
      ['blank id', { attribution_id: '   ', organization_name: 'X', is_producer: 1 }],
      ['numeric id', { attribution_id: 7, organization_name: 'X', is_producer: 1 }],
      ['relative url', { organization_name: 'X', is_producer: 1, attribution_url: 'www.example.com' }],
      ['url with spaces', { organization_name: 'X', is_producer: 1, attribution_url: 'https://exa mple.com' }],
      ['unknown field', { organization_name: 'X', is_producer: 1, licence: 'ODbL' }],
      ['not an object', 'Trufi Association'],
      ['null', null],
    ];
    for (const [what, row] of bad) {
      assert.throws(() => attributionsBuilder([], [row]), /^Error: attributions: gtfsOptions\.attributions\[0\]/, what);
    }
    assert.throws(
      () => attributionsBuilder([], [PUBLISHER, { ...PUBLISHER, organization_name: 'Twice' }]),
      /attribution_id "trufi" is used twice/,
    );
    assert.throws(() => validateAttributions({} as any), /must be an array/);
  });

  it('accepts what the reference allows: no id, a single scope, 0 flags next to a 1', () => {
    assert.doesNotThrow(() => attributionsBuilder([], [{ organization_name: 'X', is_authority: 1 }]));
    assert.doesNotThrow(() => attributionsBuilder([], [{ organization_name: 'X', is_operator: 1, trip_id: 42 }]));
    assert.doesNotThrow(() => attributionsBuilder([], [{ organization_name: 'X', is_producer: 0, is_operator: 1 }]));
    assert.doesNotThrow(() => attributionsBuilder([], [{ organization_name: 'X', is_producer: 1, attribution_url: 'http://x.y' }]));
    // An empty attribution_id is the same as none: the field is optional.
    assert.equal(attributionsBuilder([], [{ attribution_id: '', organization_name: 'X', is_producer: 1 }])[1].attribution_id, '');
    assert.deepEqual(validateAttributions([PUBLISHER]), [PUBLISHER]);
    assert.deepEqual(validateAttributions(undefined), []);
  });
});

describe('license file', () => {
  it('resolves undefined to ODbL 1.0, keeps false, rejects anything else', () => {
    const odbl = resolveLicense(undefined);
    assert.ok(odbl);
    assert.equal(odbl && odbl.spdx, 'ODbL-1.0');
    assert.equal(odbl && odbl.url, 'https://opendatacommons.org/licenses/odbl/1-0/');
    assert.equal(odbl && odbl.text, ODBL_1_0);
    assert.deepEqual(resolveLicense('ODbL-1.0'), odbl);
    assert.equal(resolveLicense(false), false);
    for (const bad of ['odbl', 'ODbL', 'CC-BY-4.0', true, null, 1]) {
      assert.throws(() => resolveLicense(bad as any), /license: unknown license/, JSON.stringify(bad));
    }
  });

  it('embeds the ODbL 1.0 text as published by Open Data Commons', () => {
    assert.ok(ODBL_1_0.startsWith('## ODC Open Database License (ODbL)\n\n### Preamble\n'));
    assert.match(ODBL_1_0, /### 4\.0 Conditions of Use/);
    assert.match(ODBL_1_0, /4\.3 Notice for using output \(Contents\)/);
    assert.match(ODBL_1_0, /10\.4 Choice of law\./);
    assert.ok(ODBL_1_0.length > 25000, `full text, not a summary (${ODBL_1_0.length} chars)`);
  });

  it('writes LICENSE with the full text, or nothing when the option is false', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'trufi-gtfs-builder-'));
    try {
      assert.equal(writeLicense(dir, false), null);
      assert.deepEqual(fs.readdirSync(dir), []);
      const file = writeLicense(dir, undefined);
      assert.equal(file, path.join(dir, 'LICENSE'));
      assert.equal(fs.readFileSync(file as string, 'utf8'), ODBL_1_0);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('licenseSection (generated README)', () => {
  it('states the ODbL chain, the LICENSE file and lists the attributions', () => {
    const section = licenseSection(undefined, attributionsBuilder([], [PUBLISHER]));
    assert.ok(section.startsWith('\n\n### License\n\n'));
    assert.match(section, /© \[OpenStreetMap\]\(https:\/\/www\.openstreetmap\.org\/copyright\) contributors/);
    assert.match(section, /licensed under the Open Data Commons Open Database License \(ODbL\) v1\.0\. This feed is a derivative database of OpenStreetMap, published under the same license/);
    assert.match(section, /<https:\/\/opendatacommons\.org\/licenses\/odbl\/1-0\/>/);
    assert.match(section, /`LICENSE` next to the GTFS files and inside the zip/);
    assert.match(section, /\| OpenStreetMap contributors \| producer \| whole feed \| https:\/\/www\.openstreetmap\.org\/copyright \|/);
    assert.match(section, /\| Trufi Association \| producer \| whole feed \| https:\/\/www\.trufi-association\.org\/ \|/);
  });

  it('says so when no LICENSE file is written, and still attributes OSM', () => {
    const section = licenseSection(false, attributionsBuilder([], [{ organization_name: 'Op', is_operator: 1, route_id: 7 }]));
    assert.match(section, /No `LICENSE` file was written/);
    assert.doesNotMatch(section, /published under/);
    assert.match(section, /© \[OpenStreetMap\]/);
    assert.match(section, /\| Op \| operator \| route 7 \|  \|/);
  });

  it('scopes by agency 0 too: ids are not truthiness-tested', () => {
    const section = licenseSection(undefined, attributionsBuilder([], [
      { organization_name: 'Muni', is_authority: 1, agency_id: 0 },
      { organization_name: 'Line', is_operator: 1, trip_id: '0' },
    ]));
    assert.match(section, /\| Muni \| authority \| agency 0 \|  \|/);
    assert.match(section, /\| Line \| operator \| trip 0 \|  \|/);
  });
});

describe('osmToGtfs (end to end, in-memory OSM data)', () => {
  /** One bus relation over a three-node way on the equator. */
  const nodes = [100, 101, 102];
  const geometry = [[0, 0], [0.01, 0], [0.02, 0]].map(([lon, lat]) => ({ lat, lon }));
  const osm: IOSMDataGetter = {
    getRoutes: async () => ({
      1: { type: 'relation', id: 1, tags: { type: 'route', route: 'bus', ref: 'T', name: 'Test' }, members: [{ type: 'way', ref: 10 }] },
    }),
    getWays: async () => ({ 10: { type: 'way', id: 10, tags: {}, nodes, geometry } }),
    getStops: async () => ({}),
  };

  async function zipEntries(file: string): Promise<Record<string, string>> {
    const zip = await JSZip.loadAsync(fs.readFileSync(file));
    const entries: Record<string, string> = {};
    for (const name of Object.keys(zip.files).sort()) entries[name] = await zip.files[name].async('string');
    return entries;
  }

  async function build(gtfsOptions: OsmToGtfsConfig['gtfsOptions'], outputFiles: OsmToGtfsConfig['outputFiles'] = {}) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'trufi-gtfs-builder-'));
    const out = path.join(dir, 'out');
    await osmToGtfs({
      outputFiles: { outputDir: out, gtfs: true, gtfsZip: true, gtfsExpandedZip: true, readme: true, ...outputFiles },
      geojsonOptions: { osmDataGetter: osm },
      gtfsOptions: { stopsConfig: () => ({ mode: 'fakeStops' }), cityName: 'test', ...gtfsOptions },
    });
    return { dir, out, cleanup: () => fs.rmSync(dir, { recursive: true, force: true }) };
  }

  it('writes attributions.txt and LICENSE next to the GTFS files, inside both zips, and a License section in the README', async () => {
    const { out, cleanup } = await build({});
    try {
      assert.deepEqual(csvRows(path.join(out, 'gtfs', 'attributions.txt')), [OSM_HEADER, OSM_ROW]);
      assert.equal(fs.readFileSync(path.join(out, 'gtfs', 'LICENSE'), 'utf8'), ODBL_1_0);

      const zip = await zipEntries(path.join(out, 'test.gtfs.zip'));
      assert.deepEqual(
        Object.keys(zip),
        ['LICENSE', 'agency.txt', 'attributions.txt', 'calendar.txt', 'feed_info.txt', 'frequencies.txt', 'routes.txt', 'shapes.txt', 'stop_times.txt', 'stops.txt', 'trips.txt'],
      );
      assert.equal(zip['LICENSE'], ODBL_1_0);
      assert.equal(zip['attributions.txt'], `${OSM_HEADER}\n${OSM_ROW}\n`);

      const expanded = await zipEntries(path.join(out, 'test.expanded.gtfs.zip'));
      assert.ok('LICENSE' in expanded && 'attributions.txt' in expanded, 'expanded zip carries both files');
      assert.ok(!('frequencies.txt' in expanded), 'still the schedule-based variant');
      assert.equal(expanded['LICENSE'], ODBL_1_0);
      assert.equal(expanded['attributions.txt'], zip['attributions.txt']);
      assert.ok(!fs.existsSync(path.join(out, '_gtfs-expanded')), 'temporary expanded dir is cleaned up');

      const readme = fs.readFileSync(path.join(out, 'README.md'), 'utf8');
      assert.match(readme, /\n### License\n/);
      assert.match(readme, /published under the same license \(<https:\/\/opendatacommons\.org\/licenses\/odbl\/1-0\/>\)/);
      assert.match(readme, /\| OpenStreetMap contributors \| producer \| whole feed \|/);
    } finally {
      cleanup();
    }
  });

  it('with license: false writes no LICENSE anywhere, but attributions.txt stays', async () => {
    const { out, cleanup } = await build({ license: false });
    try {
      assert.ok(!fs.existsSync(path.join(out, 'gtfs', 'LICENSE')));
      assert.deepEqual(csvRows(path.join(out, 'gtfs', 'attributions.txt')), [OSM_HEADER, OSM_ROW]);
      const zip = await zipEntries(path.join(out, 'test.gtfs.zip'));
      assert.ok(!('LICENSE' in zip));
      assert.ok('attributions.txt' in zip);
      const expanded = await zipEntries(path.join(out, 'test.expanded.gtfs.zip'));
      assert.ok(!('LICENSE' in expanded));
      assert.ok('attributions.txt' in expanded);
      const readme = fs.readFileSync(path.join(out, 'README.md'), 'utf8');
      assert.match(readme, /No `LICENSE` file was written/);
      assert.match(readme, /© \[OpenStreetMap\]/);
    } finally {
      cleanup();
    }
  });

  it('adds the configured rows after the OSM one, with a header that covers every column in use', async () => {
    const { out, cleanup } = await build({ attributions: [PUBLISHER] });
    try {
      assert.deepEqual(csvRows(path.join(out, 'gtfs', 'attributions.txt')), [
        'attribution_id,organization_name,is_producer,attribution_url,attribution_email',
        'osm,OpenStreetMap contributors,1,https://www.openstreetmap.org/copyright,',
        'trufi,Trufi Association,1,https://www.trufi-association.org/,info@trufi-association.org',
      ]);
      const readme = fs.readFileSync(path.join(out, 'README.md'), 'utf8');
      assert.match(readme, /\| Trufi Association \| producer \| whole feed \| https:\/\/www\.trufi-association\.org\/ \|/);
    } finally {
      cleanup();
    }
  });

  it('quotes a name with a comma the way the other GTFS files do', async () => {
    const { out, cleanup } = await build({
      attributions: [{ organization_name: 'Gobierno Autónomo Municipal de Cochabamba, Movilidad Urbana', is_authority: 1 }],
    });
    try {
      const rows = csvRows(path.join(out, 'gtfs', 'attributions.txt'));
      assert.equal(rows[0], 'attribution_id,organization_name,is_producer,is_authority,attribution_url');
      assert.equal(rows[2], ',"Gobierno Autónomo Municipal de Cochabamba, Movilidad Urbana",,1,');
    } finally {
      cleanup();
    }
  });

  it('README-only runs (no GTFS) still carry the License section', async () => {
    const { out, cleanup } = await build({}, { gtfs: false, gtfsZip: false, gtfsExpandedZip: false });
    try {
      assert.ok(!fs.existsSync(path.join(out, 'gtfs')));
      const readme = fs.readFileSync(path.join(out, 'README.md'), 'utf8');
      assert.match(readme, /\n### License\n/);
      assert.match(readme, /\| OpenStreetMap contributors \| producer \| whole feed \|/);
    } finally {
      cleanup();
    }
  });

  it('rejects a bad license or attribution before reading any OSM data', async () => {
    let read = 0;
    const counting: IOSMDataGetter = {
      getRoutes: async () => { read++; return osm.getRoutes([]); },
      getWays: async () => { read++; return osm.getWays(); },
      getStops: async () => { read++; return osm.getStops(); },
    };
    const config = (gtfsOptions: OsmToGtfsConfig['gtfsOptions']): OsmToGtfsConfig => ({
      outputFiles: { outputDir: null },
      geojsonOptions: { osmDataGetter: counting },
      gtfsOptions: { stopsConfig: () => ({ mode: 'fakeStops' }), ...gtfsOptions },
    });
    await assert.rejects(osmToGtfs(config({ license: 'CC-BY-4.0' as any })), /license: unknown license "CC-BY-4.0"/);
    await assert.rejects(osmToGtfs(config({ attributions: [{ organization_name: 'X' }] })), /needs at least one of is_producer/);
    assert.equal(read, 0, 'no OSM read happened');
  });
});
