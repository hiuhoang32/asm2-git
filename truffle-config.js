// truffle-config.js

module.exports = {
    // Specify the networks for deployment
    networks: {
        // Development network, typically Ganache
        development: {
            host: "13.229.181.97", // Localhost (default: none)
            port: 8545, // Standard Ganache port (default: none)
            network_id: "*", // Match any network id
        },
    },
};
