import "babel-polyfill";

import Web3 from 'web3';

import Contracts from "./contracts";


console.log("\r");

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

var web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));
Contracts.init(web3);

(async () => {
  /*
   * compiling contracts
   */

  var accounts = await web3.eth.personal.getAccounts();

  console.log("Compiling ClaimHolder...");

  var jsonClaimHolder = Contracts.compileClaimHolder();
  var jsonCrowdsale = Contracts.compileCrowdsale();


  /*
   * FractalId deploys own ClaimHolder contract
   */

  console.log("Deploying Fractal's ClaimHolder...");

  var fractalIdClaimHolder = await Contracts.deploy(
    "ClaimHolder",
    jsonClaimHolder,
    accounts[0],
  );


  /*
   * FractalId adds claim key on its ClaimHolder
   */

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


  /*
   * Investor deploys their ClaimHolder contract
   */

  console.log("Deploying Investor's ClaimHolder...");

  var investorClaimHolder = await Contracts.deploy(
    "ClaimHolder",
    jsonClaimHolder,
    accounts[2],
  );


  /*
   * FractalId signs a KYC claim for Investor to add to their ClaimHolder
   */

  console.log("Signing FractalId's KYC claim...");

  var hexedData = web3.utils.asciiToHex("Yea no, this guy is totes legit");
  var hashedDataToSign = web3.utils.soliditySha3(
    investorClaimHolder.options.address,
    CLAIM_TYPES.KYC,
    hexedData,
  );
  var signature = await web3.eth.sign(hashedDataToSign, accounts[0]);


  /*
   * Investor adds FractalId's claim to own ClaimHolder
   */

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

  // XXX comment this out to see the whole thing fail
  // (Investor's subsequent balance will be 0)
  await investorClaimHolder.methods.execute(
    investorClaimHolder.options.address,
    0,
    addClaimABI,
  ).send({
    gas: 4612388,
    from: accounts[2],
  });

  // FractalLp checks for claim
  // FIXME why doesn't this work?
  //var fractalIdKYCclaimId = web3.utils.keccak256(claimIssuer, CLAIM_TYPES.KYC);
  //console.log(await investorClaimHolder.methods.getClaim(fractalIdKYCclaimId).call());
  // FIXME but this does?
  //console.log("Claim", await investorClaimHolder.methods.getClaimIdsByType(CLAIM_TYPES.KYC).call());


  /*
   * FractalLp deploys token and crowdsale
   */

  console.log("FractalLp deploying token and crowdsale contracts...");
  var veryGoodCoin = await Contracts.deploy(
    "VeryGoodCoin",
    jsonCrowdsale,
    accounts[0],
  );

  var veryGoodCrowdsale = await Contracts.deploy(
    "VeryGoodCrowdsale",
    jsonCrowdsale,
    accounts[0],
    [10, accounts[0], veryGoodCoin.options.address, fractalIdClaimHolder.options.address],
  );

  await veryGoodCoin.methods.transferOwnership(
    veryGoodCrowdsale.options.address
  ).send({
    from: accounts[0]
  });


  /*
   * Investor makes transfer
   */
  
  console.log("Investor participating in crowdsale, which will check for the claim...");
  console.log(
    "\t",
    "Investor initial balance:",
    await veryGoodCoin.methods.balanceOf(accounts[2]).call()
  );

  var investABI = await veryGoodCrowdsale.methods.buyTokens(
    investorClaimHolder.options.address
  ).encodeABI();

  var investmentAmount = web3.utils.toWei("1", "ether");
  await investorClaimHolder.methods.execute(
    veryGoodCrowdsale.options.address,
    investmentAmount,
    investABI,
  ).send({
    gas: 4612388,
    from: accounts[2],
    value: investmentAmount,
  });

  console.log(
    "\t",
    "Investor's subsequent balance:",
    await veryGoodCoin.methods.balanceOf(
      investorClaimHolder.options.address
    ).call()
  );
})()
