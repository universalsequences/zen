
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
        let last = ";window.ZEN_LIB = zen; Object.keys(ZEN_LIB).forEach(key => window[key] = ZEN_LIB[key]);";
        const inputFile = data ;//data.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + 

        const MAX_SIZE = 18000;
        let chunks = Math.ceil(inputFile.length / MAX_SIZE);
        
        for (let chunk=0; chunk < chunks; chunk++) {
            let libChunk = inputFile.slice(chunk*MAX_SIZE, (chunk+1)*MAX_SIZE);
            libChunk = libChunk.replace(/\\/g, '\\\\').replace(/"/g, '\\"'); 
            if (chunk === chunks - 1) {
                libChunk += last;
            }

            const solidity = `
pragma solidity ^0.8.20;

contract ZenLibrary${chunk} {
    string public data;

    constructor() {
        data = "${libChunk}";
    }

    function getData() public view returns  (string memory) {
        return data;
    }
}
`;
            
            const written = fs.writeFileSync(`ZenLibrary${chunk}.sol`, solidity, "utf-8");
            console.log(`Wrote compressed library at ZenLibrary${chunk}.sol size=%s KB`, libChunk.length / 1000);
        }
    });

});
