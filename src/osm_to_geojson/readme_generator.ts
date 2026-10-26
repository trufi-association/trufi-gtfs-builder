import type { FeedLicense, GTFSAttribution, LogEntry } from '../types';
import { resolveLicense } from '../geojson_to_gtfs/license';

export default function readmeGenerator(data: { log: LogEntry[] }): string {
  let route_with_error = 0;
  let out_file = `
| Id | Name | Ref | From | To | State |
| -- | ---- | --- | ---- | -- | ----- |`;
  data.log.forEach((element) => {
    const tags = element.tags;
    if (element.error) route_with_error++;
    const state = element.error
      ? element.error.extractor_error
        ? `[${element.error.extractor_error}](${element.error.uri})`
        : element.error
      : '✅';
    out_file += `\n[${element.id}](https://www.openstreetmap.org/relation/${element.id}) | ${tags.name} | ${tags.ref} | ${tags.from} | ${tags.to} | ${state}`;
  });
  const response = `### Count
**Total**: ${data.log.length}  **Correct**: ${data.log.length - route_with_error}  **With error**: ${route_with_error}

${out_file}`;
  return response;
}

/**
 * The "License" section of the generated README: the ODbL chain (OSM
 * data → this feed), where the LICENSE and attributions.txt files are,
 * and the organisations of `attributions.txt` as a table.
 */
export function licenseSection(
  license: FeedLicense | false | undefined,
  attributions: GTFSAttribution[],
): string {
  const resolved = resolveLicense(license);
  let section = `\n\n### License\n\n`;
  section +=
    `Data © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors, ` +
    `licensed under the Open Data Commons Open Database License (ODbL) v1.0. ` +
    `This feed is a derivative database of OpenStreetMap`;
  if (resolved) {
    const under = resolved.spdx === 'ODbL-1.0' ? 'the same license' : `the ${resolved.name}`;
    section +=
      `, published under ${under} (<${resolved.url}>): the full text is in ` +
      `\`LICENSE\` next to the GTFS files and inside the zip.`;
  } else {
    section +=
      `. No \`LICENSE\` file was written (\`gtfsOptions.license\` is \`false\`): ` +
      `the publisher states the license of this feed elsewhere.`;
  }
  section += ` The organisations behind the data are listed in \`attributions.txt\`:\n\n`;
  section += `| Organization | Role | Applies to | URL |\n| ------------ | ---- | ---------- | --- |\n`;
  for (const row of attributions) {
    const roles = (['producer', 'operator', 'authority'] as const)
      .filter((role) => row[`is_${role}` as 'is_producer' | 'is_operator' | 'is_authority'] === 1)
      .join(', ');
    // Ids are compared against '' and undefined, not truthiness: this
    // builder numbers agencies from 0.
    const set = (value: unknown): boolean => value !== undefined && value !== null && value !== '';
    const scope = set(row.agency_id)
      ? `agency ${row.agency_id}`
      : set(row.route_id)
        ? `route ${row.route_id}`
        : set(row.trip_id)
          ? `trip ${row.trip_id}`
          : 'whole feed';
    section += `| ${row.organization_name} | ${roles} | ${scope} | ${row.attribution_url || ''} |\n`;
  }
  return section;
}
