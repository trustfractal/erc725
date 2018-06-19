"use strict";

var _regenerator = require("babel-runtime/regenerator");

var _regenerator2 = _interopRequireDefault(_regenerator);

var _asyncToGenerator2 = require("babel-runtime/helpers/asyncToGenerator");

var _asyncToGenerator3 = _interopRequireDefault(_asyncToGenerator2);

require("babel-polyfill");

var _web = require("web3");

var _web2 = _interopRequireDefault(_web);

var _ganacheCli = require("ganache-cli");

var _ganacheCli2 = _interopRequireDefault(_ganacheCli);

var _solc = require("solc");

var _solc2 = _interopRequireDefault(_solc);

var _fs = require("fs");

var _fs2 = _interopRequireDefault(_fs);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var KEY_PURPOSES = {
  "MANAGEMENT": 1,
  "CLAIM": 3
};
var KEY_TYPES = {
  "ECDSA": 1
};
var CLAIM_SCHEMES = {
  "ECDSA": 1
};
var CLAIM_TYPES = {
  "KYC": 7
};

var web3 = new _web2.default(new _web2.default.providers.HttpProvider('http://localhost:8545'));
var accounts;

var compileClaimHolder = function compileClaimHolder() {
  var findImportsPath = function findImportsPath(prefix) {
    return function findImports(path) {
      return {
        contents: _fs2.default.readFileSync(prefix + path).toString()
      };
    };
  };

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
        content: _fs2.default.readFileSync("contracts/ClaimHolder.sol", "utf8").toString()
      }
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

  var compileOutput = _solc2.default.compileStandardWrapper(compileOptions, findImportsPath("contracts/"));

  var jsonOutput = JSON.parse(compileOutput);

  console.log(jsonOutput.errors);

  return jsonOutput;
};

var deployClaimHolder = function () {
  var _ref = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee(jsonClaimHolder, account) {
    var abi, bytecode, ClaimHolder, claimHolder;
    return _regenerator2.default.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            abi = jsonClaimHolder.contracts["ClaimHolder.sol"].ClaimHolder.abi;
            bytecode = jsonClaimHolder.contracts["ClaimHolder.sol"].ClaimHolder.evm.bytecode.object;
            ClaimHolder = new web3.eth.Contract(abi);
            _context.next = 5;
            return ClaimHolder.deploy({
              data: bytecode
            }).send({
              from: account,
              gas: 3000000
            });

          case 5:
            claimHolder = _context.sent;
            return _context.abrupt("return", claimHolder);

          case 7:
          case "end":
            return _context.stop();
        }
      }
    }, _callee, undefined);
  }));

  return function deployClaimHolder(_x, _x2) {
    return _ref.apply(this, arguments);
  };
}();

(0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee2() {
  var jsonClaimHolder, fractalIdClaimHolder, fractalIdClaimKey, investorClaimHolder, hexedData, hashedDataToSign, signature, claimIssuer, addClaimABI;
  return _regenerator2.default.wrap(function _callee2$(_context2) {
    while (1) {
      switch (_context2.prev = _context2.next) {
        case 0:
          _context2.next = 2;
          return web3.eth.personal.getAccounts();

        case 2:
          accounts = _context2.sent;


          console.log("Compiling ClaimHolder...");

          jsonClaimHolder = compileClaimHolder();

          // fractalId deploys claim holder

          console.log("Deploying Fractal's ClaimHolder...");

          _context2.next = 8;
          return deployClaimHolder(jsonClaimHolder, accounts[0]);

        case 8:
          fractalIdClaimHolder = _context2.sent;


          // fractalId adds claim key
          console.log("Adding a claim key to Fractal's ClaimHolder...");

          fractalIdClaimKey = web3.utils.keccak256(accounts[1]);
          _context2.next = 13;
          return fractalIdClaimHolder.methods.addKey(fractalIdClaimKey, KEY_PURPOSES.CLAIM, KEY_TYPES.ECDSA).send({
            from: accounts[0],
            gas: 4612388
          });

        case 13:

          // investor deploys claim holder
          console.log("Deploying Investor's ClaimHolder...");

          _context2.next = 16;
          return deployClaimHolder(jsonClaimHolder, accounts[2]);

        case 16:
          investorClaimHolder = _context2.sent;


          // fractalId signs a KYC claim
          console.log("Signing FractalId's KYC claim...");

          hexedData = web3.utils.asciiToHex("Yea no, this guy is totes legit");
          hashedDataToSign = web3.utils.soliditySha3(investorClaimHolder.options.address, CLAIM_TYPES.KYC, hexedData);
          _context2.next = 22;
          return web3.eth.sign(hashedDataToSign, accounts[0]);

        case 22:
          signature = _context2.sent;


          // Investor adds FractalId's claim to Investor's ClaimHolder
          console.log("Adding FractalId's KYC claim on Investor's ClaimHolder...");

          claimIssuer = fractalIdClaimHolder.options.address;
          _context2.next = 27;
          return investorClaimHolder.methods.addClaim(CLAIM_TYPES.KYC, CLAIM_SCHEMES.ECDSA, claimIssuer, signature, hexedData, "").encodeABI();

        case 27:
          addClaimABI = _context2.sent;
          _context2.next = 30;
          return investorClaimHolder.methods.execute(investorClaimHolder.options.address, 0, addClaimABI).send({
            gas: 4612388,
            from: accounts[2]
          });

        case 30:

          // FractalLp checks for claim
          console.log("FractalLp checking for claim...");

          // FIXME why doesn't this work?
          //var fractalIdKYCclaimId = web3.utils.keccak256(claimIssuer, CLAIM_TYPES.KYC);
          //console.log(await investorClaimHolder.methods.getClaim(fractalIdKYCclaimId).call());

          _context2.t0 = console;
          _context2.next = 34;
          return investorClaimHolder.methods.getClaimIdsByType(CLAIM_TYPES.KYC).call();

        case 34:
          _context2.t1 = _context2.sent;

          _context2.t0.log.call(_context2.t0, _context2.t1);

        case 36:
        case "end":
          return _context2.stop();
      }
    }
  }, _callee2, undefined);
}))();