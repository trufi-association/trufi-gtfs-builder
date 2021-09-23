const fs = require('fs');
const jszip = require('jszip');

function toCsv(entries) {
  const firstRow = entries[0];
  const keys = Object.keys(firstRow)
    .filter(key => key[0] !== '_')
    .filter(key => firstRow[key] != null);
  const headRow = keys.join(',');
  const rows = [headRow];

  entries.forEach(entry => {
    const row = keys.map(key => entry[key]);
    const quotedRow = row.map(d => {
      if (d && d.match && d.match(/,/)) {
        return `"${d}"`;
      }

      return d;
    });
    rows.push(quotedRow.join(','));
  });

  return rows.join('\n');
}

module.exports = function writeGtfs(data, outputPath, zipCompressionLevel = 1, zipComment = undefined) {
  const zip = new jszip();

  Object.keys(data).forEach(name => {
    const filename = `${name}.txt`;
    zip.file(filename, toCsv(data[name]));
  });

  zip.generateNodeStream({
    type: 'nodebuffer',
    streamFiles: true,
    compression: zipCompressionLevel > 0 ? 'DEFLATE' : 'STORE',
    compressionOptions: {
      level: zipCompressionLevel
    },
    comment: zipComment,
  })
    .pipe(fs.createWriteStream(outputPath))
    .on('finish', () => { })
    .on('error', (error) => {
      throw error;
    });
};
