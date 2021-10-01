const fs = require('fs');
const path = require('path')

function toCsv(entries, writeLine) {
  const firstRow = entries[0];
  const keys = Object.keys(firstRow)
    .filter(key => key[0] !== '_')
    .filter(key => firstRow[key] != null);
  const headRow = keys.join(',');
  writeLine(headRow)
  entries.forEach(entry => {
    const row = keys.map(key => entry[key]);
    const quotedRow = row.map(d => {
      if (d && d.match && d.match(/,/)) {
        return `"${d}"`;
      }
      return d;
    });
    writeLine(quotedRow.join(','))
  });
}

module.exports = function writeGtfs(data, outputPath) {
  Object.keys(data).forEach(name => {
    const filename = `${name}.txt`;
    toCsv(data[name], (line) => {
      fs.writeFileSync(path.join(outputPath, filename),
        `${line}\n`,
        {
          encoding: "utf8",
          flag: "a+",
          mode: 0o666
        });
    });
  });
};
