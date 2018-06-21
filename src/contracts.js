import "babel-polyfill";

import solc from "solc";
import fs from "fs";


var web3;

var findImportsPath = function(prefix) {
  return function findImports(path) {
      return {
        contents: fs.readFileSync(prefix + path).toString()
      }
  }
};

var compile = (filenames, importsPath) => {
  var compileOptions = JSON.stringify({
    sources: filenames.reduce((acc, filename) => {
      acc[filename] = {
        content: fs.readFileSync("contracts/" + filename, "utf8").toString()
      }
      return acc;
    }, {}),
    language: "Solidity",
    settings: {
      metadata: {useLiteralContent: true},
      outputSelection: {
        "*": {
          "*": ["abi", "evm.bytecode.object"]
        }
      }
    }
  });

  var compileOutput = solc.compileStandardWrapper(
    compileOptions,
    findImportsPath(importsPath)
  );

  var jsonOutput = JSON.parse(compileOutput);

  //if (jsonOutput.errors) { console.log(jsonOutput.errors); }

  return jsonOutput;
};

module.exports = {
  init: (_web3) => (web3 = _web3),
  compileCrowdsale: () => (
    compile([
      "ERC725.sol",
      "ERC735.sol",
      "KeyHolder.sol",
      "ClaimHolder.sol",
      "VeryGoodCoin.sol",
      "VeryGoodCrowdsale.sol",
    ], "node_modules/")
  ),
  compileClaimHolder: () => (
    compile([
      "ClaimHolder.sol",
    ], "contracts/")
  ),
  deploy: async (contractName, jsonCompileOutput, from, constructorArgs) => {
    var {abi, evm: {bytecode: {object: bytecode}}} = jsonCompileOutput.contracts[contractName + ".sol"][contractName];

    var Contract = new web3.eth.Contract(abi);
    var contract = await Contract.deploy({
      data: bytecode,
      arguments: constructorArgs,
    }).send({
      from,
      gas: 3000000,
    });

    return contract;
  },
};
