export const formatTime = (line: string): string => {
  const trimedLine = line.trim();
  return trimedLine
    .replace(/\s*\-\s*/gm, '-')
    .replace(/\s*\:\s*/gm, ':')
    .replace(/\d[ ]+\d/gm, (triChar) => triChar.replace(/[ ]+/gm, ''))
    .replace(/[^\d]\d[^\d]/gm, (singleNum) => singleNum.replace(/\d/gm, (num) => `0${num}`))
    .replace(/[ ]+/gm, ' ');
};

export default formatTime;
