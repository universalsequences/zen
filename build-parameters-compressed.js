
const fs = require('fs');
const { exec } = require('child_process');
const path = require('path');
const pako = require("pako");
const {compress} = require('./compress-onchain.js');

function buf2hex(buffer) {
    return Array.prototype.map
        .call(new Uint8Array(buffer), (x) => ("00" + x.toString(16)).slice(-2))
        .join("");
}
const replaceAll = (target, search, repl) => {
    return target.split(search).join(repl);
};


// Replace with the path to your minified library file
const arg = process.argv[2];
let inputFile = fs.readFileSync(arg, "utf-8");
const { parameterNames, parameterValues } = JSON.parse(inputFile);
console.log("parameter names.length=%s", parameterNames.length);
console.log("parameter values length=%", Object.keys(parameterValues).map(x => parameterValues[x].length));

let names = parameterNames.join(",");
let values = parameterValues.map(x => x.join(",")).join(";");

compress(names, "CompressedParameterNames", "CompressedParameterNames.sol");
compress(values, "CompressedParameterValues", "CompressedParameterValues.sol");
