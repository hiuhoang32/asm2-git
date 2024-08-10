const Web3 = require('web3');
const contract = require('@truffle/contract');

const provider = new Web3.providers.HttpProvider("http://localhost:7545");
const TourNFTArtifact = require('../build/contracts/TourNFT.json');

const web3 = new Web3(provider);

const TourNFT = contract(TourNFTArtifact);
TourNFT.setProvider(web3.currentProvider);


module.exports = {
    TourNFT,
    web3
};