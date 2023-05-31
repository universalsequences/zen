const fs = require('fs');
const path = require('path');

const inputPath = path.join(__dirname, './dist/library.min.js');

const outputPath = path.join(__dirname, 'solidity-library.js');

fs.readFile(inputPath, 'utf8', (err, data) => {
  if (err) {
    console.error(`Error reading file: ${err}`);
    return;
  }

    const formattedData = data.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + ";window.ZEN_LIB = zen; Object.keys(ZEN_LIB).forEach(key => window[key] = ZEN_LIB[key]);";

  fs.writeFile(outputPath, formattedData, 'utf8', (err) => {
    if (err) {
      console.error(`Error writing file: ${err}`);
      return;
    }

    console.log(`Formatted library saved to: ${outputPath}`);
  });
});
