const fs = require('fs');
const path = require('path');

// Replace with the path to your minified library file
const inputPath = path.join(__dirname, './dist/library.min.js');

// Replace with the path to the output file
const outputPath = path.join(__dirname, 'formattedLibrary.txt');

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
