
const fs = require('fs');
const { exec } = require('child_process');
const path = require('path');
const pako = require("pako");

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
inputFile = replaceAll(inputFile, "  ", "");
inputFile = replaceAll(inputFile, "(\n", "(");
inputFile = replaceAll(inputFile, "( ", "(");
inputFile = replaceAll(inputFile, ",\n", ",");
inputFile = replaceAll(inputFile, " (", "(");
inputFile = replaceAll(inputFile, " )", ")");
inputFile = replaceAll(inputFile, ") ", ")");
inputFile = replaceAll(inputFile, " = ", "=");
const input = new Uint8Array(new TextEncoder("ASCII").encode(inputFile));

const compressed = pako.deflateRaw(input, { level: 9 });

const compressedHex = buf2hex(compressed.buffer);
const inputLength = input.length;

const solidity = `
pragma solidity ^0.8.20;
import "./InflateLib.sol";

contract CompressedDSP {
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

const written = fs.writeFileSync("CompressedDSP.sol", solidity, "utf-8");
console.log("Wrote compressed dsp at CompressedLibrary.sol");

