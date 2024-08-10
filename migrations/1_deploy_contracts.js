// const HelloWorld = artifacts.require("./HelloWorld");

// module.exports = function(deployer) {
//     deployer.deploy(HelloWorld);
// };

const TourNFT = artifacts.require("TourNFT");

module.exports = function(deployer) {
    deployer.deploy(TourNFT);
};