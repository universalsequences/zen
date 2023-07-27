const fs = require('fs');
const { exec } = require('child_process');
const path = require('path');
const pako = require("pako");

function buf2hex(buffer) {
  return Array.prototype.map
    .call(new Uint8Array(buffer), (x) => ("00" + x.toString(16)).slice(-2))
    .join("");
}



// Replace with the path to your minified library file
const inputPath = path.join(__dirname, './dist/library.min.js');

// Replace with the path to the output file
const outputPath = path.join(__dirname, 'formattedLibrary.txt');

exec(`npx webpack`, (stderr, stdout) => {
fs.readFile(inputPath, 'utf8', (err, data) => {
  if (err) {
      console.error(`Error reading file: ${err}`);
      return;
  }
    
    //const formattedData = data.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + ";window.ZEN_LIB = zen; Object.keys(ZEN_LIB).forEach(key => window[key] = ZEN_LIB[key]);";
    const formattedData = data + ";window.ZEN_LIB = zen; Object.keys(ZEN_LIB).forEach(key => window[key] = ZEN_LIB[key]);";
    fs.writeFile(outputPath, formattedData, 'utf8', (err) => {
      if (err) {
      console.error(`Error writing file: ${err}`);
        return;
    }

        const arg = "formattedLibrary.txt";
      console.log(`Formatted library saved to: ${outputPath}`);
        const inputFile = fs.readFileSync(arg, "utf-8");
        const input = new Uint8Array(new TextEncoder("ASCII").encode(inputFile));
        
        const compressed = pako.deflateRaw(input, { level: 9 });

        const compressedHex = buf2hex(compressed.buffer);
        const inputLength = input.length;

        const solidity = `
pragma solidity ^0.8.20;
import "./InflateLib.sol";

contract CompressedLibrary {
    bytes public data;

    constructor() {
        data = hex"${compressedHex}";
    }

    function uncompress()
        external
        view
        returns (string memory)
    {
        (InflateLib.ErrorCode err, bytes memory mem) = InflateLib.puff(data, ${inputLength});

        if (err == InflateLib.ErrorCode.ERR_NONE) {
            return string(mem);
        }
        return "";
    }
}
`;
              
        const written = fs.writeFileSync("CompressedLibrary.sol", solidity, "utf-8");
        console.log("Wrote compressed library at CompressedLibrary.sol size=%s KB", compressed.length / 1000);
  });
});

});
