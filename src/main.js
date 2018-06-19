import "babel-polyfill";

import Web3 from 'web3';
import ganache from "ganache-cli";
import solc from "solc";
import fs from "fs";

const KEY_PURPOSES = {
  "MANAGEMENT" : 1,
  "CLAIM" : 3,
};
const KEY_TYPES = {
  "ECDSA" : 1
};
const CLAIM_SCHEMES = {
  "ECDSA" : 1
};
const CLAIM_TYPES = {
  "KYC" : 7
};

var web3 = new Web3(new Web3.providers.HttpProvider('http://localhost:8545'));
var accounts;

var compileClaimHolder = () => {
  var findImportsPath = function(prefix) {
    return function findImports(path) {
        return {
          contents: fs.readFileSync(prefix + path).toString()
        }
    }
  }

  var compileOptions = JSON.stringify({
    sources: {
      //"ERC725.sol": {
      //  content: fs.readFileSync("contracts/ERC725.sol", "utf8").toString()
      //},
      //"ERC735.sol": {
      //  content: fs.readFileSync("contracts/ERC735.sol", "utf8").toString()
      //},
      //"KeyHolder.sol": {
      //  content: fs.readFileSync("contracts/KeyHolder.sol", "utf8").toString()
      //},
      "ClaimHolder.sol": {
        content: fs.readFileSync("contracts/ClaimHolder.sol", "utf8").toString()
      },
      //"ClaimVerifier.sol": {
      //  content: fs.readFileSync("contracts/ClaimVerifier.sol", "utf8").toString()
      //},
    },
    language: 'Solidity',
    settings: {
      metadata: { useLiteralContent: true },
      outputSelection: {
        '*': {
          '*': ['abi', 'evm.bytecode.object']
        }
      }
    }
  });

  var compileOutput = solc.compileStandardWrapper(
    compileOptions,
    findImportsPath("contracts/")
  );

  var jsonOutput = JSON.parse(compileOutput);

  console.log(jsonOutput.errors);

  return jsonOutput;
};

var deployClaimHolder = async (jsonClaimHolder, account) => {
  var abi = jsonClaimHolder.contracts["ClaimHolder.sol"].ClaimHolder.abi;
  var bytecode = jsonClaimHolder.contracts["ClaimHolder.sol"].ClaimHolder.evm.bytecode.object;

  var ClaimHolder = new web3.eth.Contract(abi);
  var claimHolder = await ClaimHolder.deploy({
    data: bytecode
  }).send({
    from: account,
    gas: 3000000,
  });

  return claimHolder;
};

(async () => {
  accounts = await web3.eth.personal.getAccounts();

  console.log("Compiling ClaimHolder...");

  var jsonClaimHolder = compileClaimHolder();

  // fractalId deploys claim holder
  console.log("Deploying Fractal's ClaimHolder...");

  var fractalIdClaimHolder = await deployClaimHolder(
    jsonClaimHolder,
    accounts[0]
  );

  // fractalId adds claim key
  console.log("Adding a claim key to Fractal's ClaimHolder...");

  var fractalIdClaimKey = web3.utils.keccak256(accounts[1]);
  await fractalIdClaimHolder.methods.addKey(
    fractalIdClaimKey,
    KEY_PURPOSES.CLAIM,
    KEY_TYPES.ECDSA,
  ).send({
    from: accounts[0],
    gas: 4612388,
  });

  // investor deploys claim holder
  console.log("Deploying Investor's ClaimHolder...");

  var investorClaimHolder = await deployClaimHolder(
    jsonClaimHolder,
    accounts[2],
  );

  // fractalId signs a KYC claim
  console.log("Signing FractalId's KYC claim...");

  var hexedData = web3.utils.asciiToHex("Yea no, this guy is totes legit");
  var hashedDataToSign = web3.utils.soliditySha3(
    investorClaimHolder.options.address,
    CLAIM_TYPES.KYC,
    hexedData,
  );
  var signature = await web3.eth.sign(hashedDataToSign, accounts[0]);

  // Investor adds FractalId's claim to Investor's ClaimHolder
  console.log("Adding FractalId's KYC claim on Investor's ClaimHolder...");

  var claimIssuer = fractalIdClaimHolder.options.address;
  var addClaimABI = await investorClaimHolder.methods
    .addClaim(
      CLAIM_TYPES.KYC,
      CLAIM_SCHEMES.ECDSA,
      claimIssuer,
      signature,
      hexedData,
      "",
    ).encodeABI();

  await investorClaimHolder.methods.execute(
    investorClaimHolder.options.address,
    0,
    addClaimABI,
  ).send({
    gas: 4612388,
    from: accounts[2],
  });

  // FractalLp checks for claim
  console.log("FractalLp checking for claim...");

  // FIXME why doesn't this work?
  //var fractalIdKYCclaimId = web3.utils.keccak256(claimIssuer, CLAIM_TYPES.KYC);
  //console.log(await investorClaimHolder.methods.getClaim(fractalIdKYCclaimId).call());

  console.log(await investorClaimHolder.methods.getClaimIdsByType(CLAIM_TYPES.KYC).call());
})()
