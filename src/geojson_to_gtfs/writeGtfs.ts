import * as fs from 'fs';
import * as path from 'path';
import type { GTFSData } from '../types';

function toCsv(entries: any[], writeLine: (line: string) => void): void {
  const firstRow = entries[0];
  const keys = Object.keys(firstRow)
    .filter((key) => key[0] !== '_')
    .filter((key) => firstRow[key] != null);
  const headRow = keys.join(',');
  writeLine(headRow);
  entries.forEach((entry) => {
    const row = keys.map((key) => entry[key]);
    const quotedRow = row.map((d) => {
      if (d && d.match && d.match(/,/)) {
        return `"${d.replace(/\"/gm, "'")}"`;
      }
      return d;
    });
    writeLine(quotedRow.join(','));
  });
}

export default function writeGtfs(data: GTFSData, outputPath: string): void {
  Object.keys(data).forEach((name) => {
    const filename = `${name}.txt`;
    const dataArray = (data as any)[name];
    if (dataArray && dataArray.length > 0) {
      toCsv(dataArray, (line) => {
        fs.writeFileSync(path.join(outputPath, filename), `${line}\n`, {
          encoding: 'utf8',
          flag: 'a+',
          mode: 0o666,
        });
      });
    }
  });
}
