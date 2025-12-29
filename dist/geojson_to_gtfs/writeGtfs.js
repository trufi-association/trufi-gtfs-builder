"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = writeGtfs;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
function toCsv(entries, writeLine) {
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
function writeGtfs(data, outputPath) {
    Object.keys(data).forEach((name) => {
        const filename = `${name}.txt`;
        const dataArray = data[name];
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
//# sourceMappingURL=writeGtfs.js.map