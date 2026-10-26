import * as fs from 'fs';
import * as path from 'path';
import type { FeedLicense, GeoJSONFeature, GTFSAttribution } from '../types';
import { ODBL_1_0, ODBL_1_0_URL } from './odbl-1.0';

// Every feed this tool builds is a derivative database of OpenStreetMap, so
// it has to carry the ODbL license chain: an attribution to the OSM
// contributors (the ODbL requires it however the derivative is licensed)
// and, by default, the ODbL itself for the feed. Both travel INSIDE the
// GTFS: `attributions.txt` is the GTFS file for exactly this, and the
// `LICENSE` file is written next to the .txt files so that it lands in
// the zip too. See https://www.openstreetmap.org/copyright and the OSMF
// attribution guidelines (https://osmfoundation.org/wiki/Licence/Attribution_Guidelines).

/**
 * The columns of `attributions.txt`, in the order of the GTFS reference
 * (https://gtfs.org/documentation/schedule/reference/#attributionstxt).
 */
export const ATTRIBUTION_COLUMNS = [
  'attribution_id',
  'agency_id',
  'route_id',
  'trip_id',
  'organization_name',
  'is_producer',
  'is_operator',
  'is_authority',
  'attribution_url',
  'attribution_email',
  'attribution_phone',
] as const;

/**
 * The row every feed starts with. `attribution_id` `osm` is reserved for
 * it; the attribution text follows the OSMF guidelines ("OpenStreetMap
 * contributors") and the URL is where the license and the origin of the
 * data are explained.
 */
export const OSM_ATTRIBUTION: Readonly<GTFSAttribution> = Object.freeze({
  attribution_id: 'osm',
  organization_name: 'OpenStreetMap contributors',
  is_producer: 1 as const,
  attribution_url: 'https://www.openstreetmap.org/copyright',
});

export interface LicenseText {
  /** Full name, e.g. for a README. */
  name: string;
  /** SPDX identifier (https://spdx.org/licenses/), what feed catalogs ask for. */
  spdx: string;
  /** Human-readable home of the license. */
  url: string;
  /** The full text written to the LICENSE file. */
  text: string;
}

/** The licenses the builder can write in full. */
export const LICENSES: Record<FeedLicense, LicenseText> = {
  'ODbL-1.0': {
    name: 'Open Data Commons Open Database License (ODbL) v1.0',
    spdx: 'ODbL-1.0',
    url: ODBL_1_0_URL,
    text: ODBL_1_0,
  },
};

export const DEFAULT_LICENSE: FeedLicense = 'ODbL-1.0';

/** Name of the license file written next to the GTFS .txt files. */
export const LICENSE_FILENAME = 'LICENSE';

/**
 * Resolves `gtfsOptions.license`: `undefined` is the default (ODbL 1.0),
 * `false` is "write no license file", anything else must be a known
 * license — a typo throws, as a config bug.
 */
export function resolveLicense(license: FeedLicense | false | undefined): LicenseText | false {
  if (license === undefined) license = DEFAULT_LICENSE;
  if (license === false) return false;
  const known = LICENSES[license as FeedLicense];
  if (!known) {
    throw new Error(
      `license: unknown license ${JSON.stringify(license)}; ` +
        `use one of ${Object.keys(LICENSES).join(', ')}, or false to write no LICENSE file`,
    );
  }
  return known;
}

const ROLE_COLUMNS = ['is_producer', 'is_operator', 'is_authority'] as const;
const SCOPE_COLUMNS = ['agency_id', 'route_id', 'trip_id'] as const;

function isEmpty(value: unknown): boolean {
  return value === undefined || value === null || value === '';
}

/**
 * Checks one row against the GTFS reference. A bad row throws: the rows
 * come from the city config, so a problem there is a config bug — not
 * something to drop silently and discover in a validator report.
 */
function validateAttribution(row: GTFSAttribution, index: number): GTFSAttribution {
  const where = index === 0 ? 'the OpenStreetMap row' : `gtfsOptions.attributions[${index - 1}]`;
  const fail = (what: string): never => {
    throw new Error(`attributions: ${where} ${what}: ${JSON.stringify(row)}`);
  };
  if (!row || typeof row !== 'object' || Array.isArray(row)) fail('is not an object');
  const unknown = Object.keys(row).filter((key) => !(ATTRIBUTION_COLUMNS as readonly string[]).includes(key));
  if (unknown.length > 0) fail(`has fields that are not in attributions.txt (${unknown.join(', ')})`);
  if (typeof row.organization_name !== 'string' || row.organization_name.trim() === '') {
    fail('needs organization_name');
  }
  for (const role of ROLE_COLUMNS) {
    const value = row[role];
    if (!isEmpty(value) && value !== 0 && value !== 1) fail(`has ${role} outside 0 | 1`);
  }
  if (!ROLE_COLUMNS.some((role) => row[role] === 1)) {
    fail('needs at least one of is_producer, is_operator, is_authority set to 1');
  }
  const scopes = SCOPE_COLUMNS.filter((scope) => !isEmpty(row[scope]));
  if (scopes.length > 1) {
    fail(`sets ${scopes.join(' and ')}: only one of agency_id, route_id, trip_id may be set`);
  }
  if (!isEmpty(row.attribution_id) && (typeof row.attribution_id !== 'string' || row.attribution_id.trim() === '')) {
    fail('has an attribution_id that is not a non-empty string');
  }
  if (index > 0 && row.attribution_id === OSM_ATTRIBUTION.attribution_id) {
    fail(`reuses attribution_id "${OSM_ATTRIBUTION.attribution_id}", reserved for the OpenStreetMap row`);
  }
  if (!isEmpty(row.attribution_url) && !/^https?:\/\/\S+$/.test(String(row.attribution_url))) {
    fail('has an attribution_url that is not a fully qualified http(s) URL');
  }
  for (const column of ['attribution_email', 'attribution_phone'] as const) {
    if (!isEmpty(row[column]) && typeof row[column] !== 'string') fail(`has a ${column} that is not a string`);
  }
  return { ...row, organization_name: row.organization_name.trim() };
}

/**
 * Validates the extra rows of a config without building anything, so a
 * bad row fails before the OSM data is read. Returns the rows untouched.
 */
export function validateAttributions(attributions: GTFSAttribution[] = []): GTFSAttribution[] {
  if (!Array.isArray(attributions)) {
    throw new Error(`attributions: gtfsOptions.attributions must be an array: ${JSON.stringify(attributions)}`);
  }
  attributionsBuilder([], attributions);
  return attributions;
}

/**
 * Builds `attributions.txt`: the OpenStreetMap contributors row first, then
 * the rows of `gtfsOptions.attributions` in config order. Every row gets the
 * same cells — the union of the columns in use, in reference order, with
 * `''` where a row has nothing — because the CSV writer takes the header
 * from the first row. `features` is unused here; it is passed so a custom
 * builder can derive rows from the routes (e.g. one operator per route).
 */
export function attributionsBuilder(
  features: GeoJSONFeature[][],
  attributions: GTFSAttribution[] = [],
): GTFSAttribution[] {
  const rows = [OSM_ATTRIBUTION, ...attributions].map(validateAttribution);
  const seen = new Set<string>();
  for (const row of rows) {
    if (isEmpty(row.attribution_id)) continue;
    if (seen.has(row.attribution_id)) {
      throw new Error(`attributions: attribution_id "${row.attribution_id}" is used twice`);
    }
    seen.add(row.attribution_id);
  }
  const columns = ATTRIBUTION_COLUMNS.filter((column) => rows.some((row) => !isEmpty(row[column])));
  return rows.map((row) => {
    const out: Record<string, string | number> = {};
    for (const column of columns) out[column] = isEmpty(row[column]) ? '' : (row[column] as string | number);
    return out as unknown as GTFSAttribution;
  });
}

/**
 * Writes the LICENSE file into a GTFS directory. Returns its path, or
 * `null` when the config asked for no license file.
 */
export function writeLicense(outputPath: string, license: FeedLicense | false | undefined): string | null {
  const resolved = resolveLicense(license);
  if (!resolved) return null;
  const file = path.join(outputPath, LICENSE_FILENAME);
  fs.writeFileSync(file, resolved.text, { encoding: 'utf8' });
  return file;
}
