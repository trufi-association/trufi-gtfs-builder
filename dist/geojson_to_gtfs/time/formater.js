"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatTime = void 0;
const formatTime = (line) => {
    const trimedLine = line.trim();
    return trimedLine
        .replace(/\s*\-\s*/gm, '-')
        .replace(/\s*\:\s*/gm, ':')
        .replace(/\d[ ]+\d/gm, (triChar) => triChar.replace(/[ ]+/gm, ''))
        .replace(/[^\d]\d[^\d]/gm, (singleNum) => singleNum.replace(/\d/gm, (num) => `0${num}`))
        .replace(/[ ]+/gm, ' ');
};
exports.formatTime = formatTime;
exports.default = exports.formatTime;
//# sourceMappingURL=formater.js.map